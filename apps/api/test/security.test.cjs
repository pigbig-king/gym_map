const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { randomBytes } = require('node:crypto')
const { mkdtemp, readdir, readFile, rm } = require('node:fs/promises')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
require('reflect-metadata')
const { Test } = require('@nestjs/testing')
const sharp = require('sharp')
const { jwtSecret } = require('../dist/auth/jwt-secret')
const { todayISO } = require('../dist/common/date')

let app, base, uploadDir, jwt, ordinaryToken, adminToken
let savedGym, savedEquipment, blockedEquipment = false, createdUsers = []
const users = {
  ordinary: { id: 'ordinary', email: 'user@example.com', role: 'USER' },
  admin: { id: 'admin', email: 'admin@example.com', role: 'ADMIN' },
}
const gym = { id: 'gym', status: 'APPROVED', submittedById: 'ordinary', equipment: [], reviews: [], _count: { checkIns: 0, reviews: 0 } }
const checkIns = new Set()
const db = {
  user: {
    findUnique: async ({ where }) => users[where.id] ?? null,
    create: async ({ data }) => { createdUsers.push(data); return { id: 'new', role: 'USER', ...data } },
  },
  gym: {
    count: async () => 1,
    findMany: async () => [gym],
    findUnique: async () => gym,
    create: async ({ data }) => { savedGym = data; return { id: 'new-gym', ...data } },
    update: async ({ data }) => ({ ...gym, ...data }),
  },
  gymEquipment: {
    findUnique: async () => ({ id: 'equipment', gymId: 'gym' }),
    findFirst: async () => blockedEquipment ? null : ({ id: 'equipment', gymId: 'gym' }),
    create: async ({ data }) => { savedEquipment = data; return data },
    update: async ({ data }) => data,
    delete: async () => ({}),
  },
  gymEquipmentReview: { upsert: async ({ create }) => create },
  gymReview: { findUnique: async () => null },
  gymCheckIn: {
    upsert: async ({ create }) => { checkIns.add(JSON.stringify(create)); return create },
    deleteMany: async () => { checkIns.clear(); return { count: 1 } },
    count: async () => checkIns.size,
    findUnique: async () => null,
  },
  notification: { create: async ({ data }) => data },
  $transaction: async (callback) => callback(db),
}
const validGym = { name: ' 测试健身房 ', address: '测试地址', city: '合肥', district: '蜀山区', lat: 31.85, lng: 117.23, environment: '通风良好', equipment: [] }
async function request(path, { token, body, method = 'GET' } = {}) {
  return fetch(`${base}/api${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
}

before(async () => {
  uploadDir = await mkdtemp(join(tmpdir(), 'gym-map-security-'))
  process.env.JWT_SECRET = randomBytes(48).toString('hex')
  process.env.UPLOAD_DIR = uploadDir
  process.env.CORS_ORIGINS = 'https://allowed.example'
  const { AppModule } = require('../dist/app.module')
  const { PrismaService } = require('../dist/prisma/prisma.service')
  const { configureApp } = require('../dist/configure-app')
  const { JwtService } = require('@nestjs/jwt')
  const { HttpAdapterHost } = require('@nestjs/core')
  const { ExpressAdapter } = require('@nestjs/platform-express')
  const adapter = new ExpressAdapter()
  const adapterHost = new HttpAdapterHost()
  adapterHost.httpAdapter = adapter
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService).useValue(db)
    .overrideProvider(HttpAdapterHost).useValue(adapterHost)
    .compile()
  app = module.createNestApplication(adapter, { logger: false })
  configureApp(app)
  await app.listen(0, '127.0.0.1')
  base = await app.getUrl()
  jwt = app.get(JwtService)
  ordinaryToken = jwt.sign({ sub: 'ordinary', role: 'USER' })
  adminToken = jwt.sign({ sub: 'admin', role: 'ADMIN' })
})

after(async () => {
  if (app) await app.close()
  if (uploadDir && uploadDir.startsWith(join(tmpdir(), 'gym-map-security-'))) await rm(uploadDir, { recursive: true, force: true })
})

test('missing, short and example JWT secrets fail closed', () => {
  for (const value of [undefined, '', 'short', 'change-me-to-a-random-secret-longer-than-32']) {
    assert.throws(() => jwtSecret({ get: () => value }))
  }
})

test('API sets security headers, disables caching, and restricts CORS', async () => {
  const response = await fetch(`${base}/api/gyms`, { headers: { Origin: 'https://evil.example' } })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(response.headers.get('access-control-allow-origin'), null)
  const allowed = await fetch(`${base}/api/gyms`, { headers: { Origin: 'https://allowed.example' } })
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://allowed.example')
})

test('anonymous users cannot upload or change equipment', async () => {
  assert.equal((await request('/uploads', { method: 'POST' })).status, 401)
  assert.equal((await request('/gyms/gym/equipment', { method: 'POST', body: { name: '跑步机' } })).status, 401)
})

test('ordinary users cannot add, update or delete equipment', async () => {
  for (const [method, path, body] of [
    ['POST', '/gyms/gym/equipment', { name: '跑步机' }],
    ['PATCH', '/gyms/gym/equipment/equipment', { status: 'DAMAGED' }],
    ['DELETE', '/gyms/gym/equipment/equipment'],
  ]) assert.equal((await request(path, { method, body, token: ordinaryToken })).status, 403)
})

test('role changes and account deletion take effect even with an old token', async () => {
  const forgedRole = jwt.sign({ sub: 'ordinary', role: 'ADMIN' })
  assert.equal((await request('/gyms/gym/equipment', { method: 'POST', token: forgedRole, body: { name: '跑步机' } })).status, 403)
  const removed = jwt.sign({ sub: 'removed', role: 'ADMIN' })
  assert.equal((await request('/gyms/gym/equipment', { method: 'POST', token: removed, body: { name: '跑步机' } })).status, 401)
})

test('administrators can maintain equipment', async () => {
  assert.equal((await request('/gyms/gym/equipment', { method: 'POST', token: adminToken, body: { name: ' 深蹲架 ', quantity: 2 } })).status, 201)
  assert.equal(savedEquipment.name, '深蹲架')
  assert.equal((await request('/gyms/gym/equipment/equipment', { method: 'PATCH', token: adminToken, body: { status: 'MAINTENANCE' } })).status, 200)
  assert.equal((await request('/gyms/gym/equipment/equipment', { method: 'DELETE', token: adminToken })).status, 200)
})

test('submission keeps environment and remains pending despite injected approval', async () => {
  const result = await request('/gyms', { method: 'POST', token: ordinaryToken, body: { ...validGym, status: 'APPROVED', submittedById: 'admin' } })
  assert.equal(result.status, 201)
  assert.equal(savedGym.environment, '通风良好')
  assert.equal(savedGym.name, '测试健身房')
  assert.equal(savedGym.status, 'PENDING')
  assert.equal(savedGym.submittedById, 'ordinary')
})

test('invalid coordinates, blank names, excessive arrays and external images are rejected', async () => {
  for (const change of [
    { lat: 91 }, { lng: -181 }, { name: '   ' },
    { images: ['https://evil.example/track.png'] },
    { images: ['/uploads/../evil.svg'] },
    { equipment: Array.from({ length: 101 }, () => ({ name: '跑步机', quantity: 1 })) },
  ]) assert.equal((await request('/gyms', { method: 'POST', token: ordinaryToken, body: { ...validGym, ...change } })).status, 400)
})

test('invalid pagination does not reach Prisma as NaN or a negative offset', async () => {
  for (const query of ['page=nope', 'page=-1', 'page=1.5', 'page=2x', 'pageSize=101', 'pageSize=0']) {
    assert.equal((await request(`/gyms?${query}`)).status, 400)
  }
})

test('null and blank equipment edits are rejected instead of causing database errors', async () => {
  for (const body of [{ name: null }, { name: '  ' }, { status: null }, { quantity: null }, { quantity: 0 }]) {
    assert.equal((await request('/gyms/gym/equipment/equipment', { method: 'PATCH', token: adminToken, body })).status, 400)
  }
})

test('repeat check-in and cancellation requests are idempotent', async () => {
  const responses = await Promise.all(Array.from({ length: 4 }, () => request('/gyms/gym/check-in', { method: 'POST', token: ordinaryToken })))
  for (const response of responses) assert.equal((await response.json()).checkedIn, true)
  assert.equal(checkIns.size, 1)
  for (let i = 0; i < 2; i++) assert.equal((await request('/gyms/gym/check-in', { method: 'DELETE', token: ordinaryToken })).status, 200)
  assert.equal(checkIns.size, 0)
})

test('unapproved or mismatched equipment cannot receive reviews', async () => {
  blockedEquipment = true
  try {
    assert.equal((await request('/gyms/gym/equipment/hidden/review', { method: 'POST', token: ordinaryToken, body: { rating: 5 } })).status, 404)
  } finally { blockedEquipment = false }
})

test('bulk replacement of approved equipment is blocked to preserve reviews', async () => {
  assert.equal((await request('/gyms/gym', { method: 'PATCH', token: adminToken, body: { equipment: [{ name: '替代器械', quantity: 1 }] } })).status, 400)
})

test('upload rejects executable payloads, SVG and oversized files before writing', async () => {
  for (const [bytes, type, filename, expected] of [
    [Buffer.from('<script>alert(1)</script>'), 'image/png', 'fake.png', 400],
    [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'image/svg+xml', 'unsafe.svg', 400],
    [Buffer.alloc(5 * 1024 * 1024 + 1), 'image/png', 'large.png', 413],
  ]) {
    const form = new FormData()
    form.append('file', new Blob([bytes], { type }), filename)
    const response = await fetch(`${base}/api/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${ordinaryToken}` }, body: form })
    assert.equal(response.status, expected)
  }
  assert.deepEqual(await readdir(uploadDir), [])
})

test('valid image bytes are re-encoded with a safe name regardless of filename or MIME', async () => {
  const input = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#ff0000' } }).png().toBuffer()
  const form = new FormData()
  form.append('file', new Blob([input], { type: 'text/html' }), '../../payload.html')
  const response = await fetch(`${base}/api/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${ordinaryToken}` }, body: form })
  assert.equal(response.status, 201)
  const { url } = await response.json()
  assert.match(url, /^\/uploads\/[\da-f-]+\.webp$/)
  const metadata = await sharp(await readFile(join(uploadDir, url.split('/').pop()))).metadata()
  assert.equal(metadata.format, 'webp')
  assert.equal(metadata.exif, undefined)
  const downloaded = await fetch(`${base}${url}`)
  assert.equal(downloaded.status, 200)
  assert.equal(downloaded.headers.get('content-type'), 'image/webp')
  assert.match(downloaded.headers.get('content-security-policy'), /sandbox/)
})

test('same email prefix at different domains no longer collides on nickname', async () => {
  const { AuthService } = require('../dist/auth/auth.service')
  const service = app.get(AuthService)
  await service.register({ email: 'same@one.example', password: 'test-password-123' })
  await service.register({ email: 'same@two.example', password: 'test-password-123' })
  assert.notEqual(createdUsers[0].nickname, createdUsers[1].nickname)
})

test('new passwords cannot exceed bcrypt UTF-8 byte limit', async () => {
  assert.equal((await request('/auth/register', { method: 'POST', body: { email: 'new@example.com', password: '密'.repeat(25) } })).status, 400)
})

test('login limits requests by connection IP and ignores spoofed forwarding headers', async () => {
  for (let i = 0; i < 10; i++) {
    const response = await fetch(`${base}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `192.0.2.${i}` },
      body: JSON.stringify({ email: 'unknown@example.com', password: 'bad-password' }),
    })
    assert.equal(response.status, 401)
  }
  const limited = await request('/auth/login', { method: 'POST', body: { email: 'unknown@example.com', password: 'bad-password' } })
  assert.equal(limited.status, 429)
  assert.ok(Number(limited.headers.get('retry-after')) > 0)
})

test('check-in day follows Shanghai time regardless of server timezone', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.UTC(2026, 10, 25, 16, 30) })
  assert.equal(todayISO(), '2026-11-26')
})
