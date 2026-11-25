import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator'
import { MaxByteLength } from '../../common/max-byte-length'

export class RegisterDto {
  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(254)
  email: string

  @IsString()
  @MinLength(8, { message: '密码至少 8 位' })
  @MaxByteLength(72)
  password: string
}
