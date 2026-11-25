import { IsEmail, IsString, MinLength } from 'class-validator'

export class RegisterDto {
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string

  @IsString()
  @MinLength(8, { message: '密码至少 8 位' })
  password: string
}
