const API_BASE = '/api'

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  token?: string | null
}

async function readError(res: Response): Promise<string> {
  try {
    const data: unknown = await res.json()
    if (data && typeof data === 'object') {
      const msg = (data as { message?: unknown }).message
      if (typeof msg === 'string') return msg
      if (Array.isArray(msg)) return msg.join('；')
    }
  } catch {
    // 忽略非 JSON 响应
  }
  return `请求失败（HTTP ${res.status}）`
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.token) headers.Authorization = `Bearer ${options.token}`

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (!res.ok) {
    throw new Error(await readError(res))
  }

  return (await res.json()) as T
}

export async function uploadImage(file: File, token: string | null): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_BASE}/uploads`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  if (!res.ok) {
    throw new Error(await readError(res))
  }
  const data = (await res.json()) as { url: string }
  return data.url
}
