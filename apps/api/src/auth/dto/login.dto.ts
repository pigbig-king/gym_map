import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator'

export class LoginDto {
  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(254)
  email: string

  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  password: string
}
