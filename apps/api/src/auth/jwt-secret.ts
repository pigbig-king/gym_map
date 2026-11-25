import { ConfigService } from '@nestjs/config'

export function jwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET')?.trim()
  if (!secret || secret.length < 32 || /change-me|your-secret|replace-me/i.test(secret)) {
    throw new Error('JWT_SECRET 必须设置为至少 32 位的随机密钥，不能使用示例值')
  }
  return secret
}
