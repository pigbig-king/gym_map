import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { UpdateMeDto } from './dto/update-me.dto'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } })
    if (!user) {
      throw new NotFoundException('用户不存在')
    }
    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }

  async updateMe(id: string, dto: UpdateMeDto) {
    const user = await this.prisma.user.findUnique({ where: { id } })
    if (!user) {
      throw new NotFoundException('用户不存在')
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        nickname: dto.nickname !== undefined ? dto.nickname : undefined,
        avatarUrl: dto.avatarUrl !== undefined ? dto.avatarUrl : undefined,
        bio: dto.bio !== undefined ? dto.bio : undefined,
        height: dto.height !== undefined ? dto.height : undefined,
      },
    })
    return {
      id: updated.id,
      email: updated.email,
      nickname: updated.nickname,
      avatarUrl: updated.avatarUrl,
      bio: updated.bio,
      height: updated.height,
      role: updated.role,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    }
  }
}
