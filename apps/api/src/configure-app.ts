import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { NestExpressApplication } from '@nestjs/platform-express'
import helmet from 'helmet'

export function configureApp(app: NestExpressApplication) {
  const config = app.get(ConfigService)
  // Only trust explicitly configured proxies. Never trust arbitrary X-Forwarded-For.
  const proxies = config.get<string>('TRUST_PROXY')?.split(',').map((value) => value.trim()).filter(Boolean)
  if (proxies?.length) app.set('trust proxy', proxies)
  app.use(helmet())
  app.setGlobalPrefix('api')
  const origins = config.get<string>('CORS_ORIGINS')?.split(',').map((value) => value.trim()).filter(Boolean)
  if (origins?.length) app.enableCors({ origin: origins })
  app.use('/api', (_req: unknown, res: { setHeader: (name: string, value: string) => void }, next: () => void) => {
    res.setHeader('Cache-Control', 'no-store')
    next()
  })
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
}
