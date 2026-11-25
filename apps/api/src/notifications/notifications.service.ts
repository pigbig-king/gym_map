import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

export type NotificationType = 'gym_approved' | 'gym_rejected'

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  notify(userId: string, type: NotificationType, actorId: string | null, targetType: string, targetId: string, client: Pick<PrismaService, 'notification'> = this.prisma) {
    if (userId === actorId) return Promise.resolve(null)
    return client.notification.create({
      data: { userId, type, actorId, targetType, targetId },
    })
  }

  async list(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: [{ read: 'asc' }, { createdAt: 'desc' }],
      take: 50,
    })
    const actorIds = [...new Set(notifications.map((n) => n.actorId).filter(Boolean))] as string[]
    const actors = actorIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, nickname: true, avatarUrl: true },
        })
      : []
    const actorMap = new Map(actors.map((a) => [a.id, a]))
    const unreadCount = await this.prisma.notification.count({ where: { userId, read: false } })
    return {
      unreadCount,
      items: notifications.map((n) => ({ ...n, actor: n.actorId ? actorMap.get(n.actorId) ?? null : null })),
    }
  }

  async markRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({ where: { id, userId }, data: { read: true } })
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } })
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, read: false } })
  }
}
