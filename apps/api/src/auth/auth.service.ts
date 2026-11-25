import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../prisma/prisma.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { randomUUID } from 'node:crypto'
import { Prisma } from '@prisma/client'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (existing) {
      throw new ConflictException('该邮箱已注册')
    }

    const passwordHash = await bcrypt.hash(dto.password, 10)
    const nickname = `${dto.email.split('@')[0].slice(0, 16)}-${randomUUID().slice(0, 8)}`

    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash, nickname },
    }).catch((error: unknown) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('该邮箱或昵称已被使用，请重试')
      }
      throw error
    })

    return { id: user.id, email: user.email, nickname: user.nickname, role: user.role }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误')
    }

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash)
    if (!passwordOk) {
      throw new UnauthorizedException('邮箱或密码错误')
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    })

    return { accessToken, provider: 'email' }
  }
}
