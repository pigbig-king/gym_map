import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { AuthUser } from '../auth/current-user.decorator'
import { NotificationsService } from '../notifications/notifications.service'
import { PrismaService } from '../prisma/prisma.service'
import { todayISO } from '../common/date'
import { CreateGymDto } from './dto/create-gym.dto'
import { CreateEquipmentDto } from './dto/create-equipment.dto'
import { CreateEquipmentReviewDto } from './dto/create-equipment-review.dto'
import { CreateReviewDto } from './dto/create-review.dto'
import { UpdateEquipmentDto } from './dto/update-equipment.dto'
import { UpdateGymDto } from './dto/update-gym.dto'

@Injectable()
export class GymsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(query: { city?: string; district?: string; q?: string; page?: number; pageSize?: number }) {
    const page = Math.max(1, query.page ?? 1)
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20))
    const where: Prisma.GymWhereInput = { status: 'APPROVED' }
    if (query.city) where.city = query.city
    if (query.district) where.district = query.district
    if (query.q) where.name = { contains: query.q }

    const [total, items] = await Promise.all([
      this.prisma.gym.count({ where }),
      this.prisma.gym.findMany({
        where,
        include: { equipment: true, _count: { select: { checkIns: true, reviews: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])
    return { total, page, pageSize, items }
  }

  async stats(city: string) {
    const gyms = await this.prisma.gym.findMany({
      where: { status: 'APPROVED', city },
      include: { _count: { select: { checkIns: true } }, reviews: true },
    })
    const byDistrict = new Map<string, { district: string; gymCount: number; checkInCount: number; ratingSum: number; ratingCount: number }>()
    for (const g of gyms) {
      const d = g.district ?? '未分区'
      const row = byDistrict.get(d) ?? { district: d, gymCount: 0, checkInCount: 0, ratingSum: 0, ratingCount: 0 }
      row.gymCount++
      row.checkInCount += g._count.checkIns
      row.ratingSum += g.reviews.reduce((s, r) => s + r.rating, 0)
      row.ratingCount += g.reviews.length
      byDistrict.set(d, row)
    }
    return [...byDistrict.values()].map((r) => ({
      district: r.district,
      gymCount: r.gymCount,
      checkInCount: r.checkInCount,
      avgRating: r.ratingCount ? Math.round((r.ratingSum / r.ratingCount) * 10) / 10 : null,
    }))
  }

  async heatmap(city: string) {
    const gyms = await this.prisma.gym.findMany({
      where: { status: 'APPROVED', city },
      include: { _count: { select: { checkIns: true } } },
    })
    return gyms.map((g) => ({ lat: g.lat, lng: g.lng, weight: g._count.checkIns }))
  }

  async findOne(id: string, viewer: AuthUser | null) {
    const gym = await this.prisma.gym.findUnique({
      where: { id },
      include: {
        equipment: { include: { reviews: { include: { user: { select: { id: true, nickname: true, avatarUrl: true } } } } } },
        reviews: { include: { user: { select: { id: true, nickname: true, avatarUrl: true } } }, orderBy: { createdAt: 'desc' } },
        _count: { select: { checkIns: true, reviews: true } },
      },
    })
    if (!gym) throw new NotFoundException('健身房不存在')
    if (gym.status !== 'APPROVED') {
      const isAdmin = viewer?.role === 'ADMIN'
      const isSubmitter = viewer?.id === gym.submittedById
      if (!isAdmin && !isSubmitter) throw new NotFoundException('健身房不存在')
    }

    let myCheckIn = null
    let myReview = null
    if (viewer) {
      const today = todayISO()
      const checkIn = await this.prisma.gymCheckIn.findUnique({
        where: { gymId_userId_date: { gymId: id, userId: viewer.id, date: today } },
      })
      myCheckIn = Boolean(checkIn)
      const review = await this.prisma.gymReview.findUnique({
        where: { gymId_userId: { gymId: id, userId: viewer.id } },
      })
      myReview = review
    }

    const avgRating = gym.reviews.length
      ? Math.round((gym.reviews.reduce((s, r) => s + r.rating, 0) / gym.reviews.length) * 10) / 10
      : null

    return { ...gym, avgRating, myCheckIn, myReview }
  }

  create(userId: string, dto: CreateGymDto) {
    return this.prisma.gym.create({
      data: {
        name: dto.name,
        address: dto.address,
        city: dto.city,
        district: dto.district,
        lat: dto.lat,
        lng: dto.lng,
        description: dto.description,
        price: dto.price,
        hours: dto.hours,
        phone: dto.phone,
        images: dto.images ?? [],
        status: 'PENDING',
        submittedById: userId,
        equipment: { create: dto.equipment.map((e) => ({ name: e.name, professionalName: e.professionalName, serialLabel: e.serialLabel, quantity: e.quantity, status: e.status ?? 'NORMAL' })) },
      },
      include: { equipment: true },
    })
  }

  mine(userId: string) {
    return this.prisma.gym.findMany({
      where: { submittedById: userId },
      include: { equipment: true, _count: { select: { checkIns: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  pending() {
    return this.prisma.gym.findMany({
      where: { status: 'PENDING' },
      include: {
        equipment: true,
        submittedBy: { select: { id: true, nickname: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async checkIn(userId: string, gymId: string) {
    const gym = await this.prisma.gym.findUnique({ where: { id: gymId } })
    if (!gym || gym.status !== 'APPROVED') throw new NotFoundException('健身房不存在')
    const today = todayISO()
    const existing = await this.prisma.gymCheckIn.findUnique({
      where: { gymId_userId_date: { gymId, userId, date: today } },
    })
    if (existing) {
      await this.prisma.gymCheckIn.delete({ where: { id: existing.id } })
    } else {
      await this.prisma.gymCheckIn.create({ data: { gymId, userId, date: today } })
    }
    const count = await this.prisma.gymCheckIn.count({ where: { gymId } })
    return { checkedIn: !existing, count }
  }

  async removeCheckIn(userId: string, gymId: string) {
    const today = todayISO()
    const existing = await this.prisma.gymCheckIn.findUnique({
      where: { gymId_userId_date: { gymId, userId, date: today } },
    })
    if (existing) await this.prisma.gymCheckIn.delete({ where: { id: existing.id } })
    const count = await this.prisma.gymCheckIn.count({ where: { gymId } })
    return { checkedIn: false, count }
  }

  async review(userId: string, gymId: string, dto: CreateReviewDto) {
    const gym = await this.prisma.gym.findUnique({ where: { id: gymId } })
    if (!gym || gym.status !== 'APPROVED') throw new NotFoundException('健身房不存在')
    return this.prisma.gymReview.upsert({
      where: { gymId_userId: { gymId, userId } },
      update: { rating: dto.rating, comment: dto.comment },
      create: { gymId, userId, rating: dto.rating, comment: dto.comment },
    })
  }

  async approve(gymId: string, dto: UpdateGymDto) {
    const gym = await this.prisma.gym.findUnique({ where: { id: gymId } })
    if (!gym) throw new NotFoundException('健身房不存在')
    const data: Prisma.GymUpdateInput = {}
    if (dto.status !== undefined) data.status = dto.status
    if (dto.equipment !== undefined) {
      data.equipment = {
        deleteMany: {},
        create: dto.equipment.map((e) => ({ name: e.name, quantity: e.quantity })),
      }
    }
    const updated = await this.prisma.gym.update({ where: { id: gymId }, data, include: { equipment: true } })
    if (dto.status === 'APPROVED' || dto.status === 'REJECTED') {
      const type = dto.status === 'APPROVED' ? 'gym_approved' : 'gym_rejected'
      await this.notifications.notify(gym.submittedById, type, null, 'gym', gymId)
    }
    return updated
  }

  async reviewEquipment(userId: string, gymId: string, equipmentId: string, dto: CreateEquipmentReviewDto) {
    const equipment = await this.prisma.gymEquipment.findUnique({ where: { id: equipmentId } })
    if (!equipment || equipment.gymId !== gymId) throw new NotFoundException('器材不存在')
    return this.prisma.gymEquipmentReview.upsert({
      where: { equipmentId_userId: { equipmentId, userId } },
      update: { rating: dto.rating, comment: dto.comment },
      create: { equipmentId, userId, rating: dto.rating, comment: dto.comment },
    })
  }

  async addEquipment(gymId: string, dto: CreateEquipmentDto) {
    const gym = await this.prisma.gym.findUnique({ where: { id: gymId } })
    if (!gym || gym.status !== 'APPROVED') throw new NotFoundException('健身房不存在')
    if (!dto.name?.trim()) throw new BadRequestException('器械名称不能为空')
    return this.prisma.gymEquipment.create({
      data: {
        gymId,
        name: dto.name.trim(),
        professionalName: dto.professionalName?.trim() || undefined,
        serialLabel: dto.serialLabel?.trim() || undefined,
        quantity: dto.quantity ?? 1,
        status: dto.status ?? 'NORMAL',
      },
    })
  }

  async updateEquipment(gymId: string, equipmentId: string, dto: UpdateEquipmentDto) {
    const equipment = await this.prisma.gymEquipment.findUnique({ where: { id: equipmentId } })
    if (!equipment || equipment.gymId !== gymId) throw new NotFoundException('器材不存在')
    return this.prisma.gymEquipment.update({
      where: { id: equipmentId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.professionalName !== undefined ? { professionalName: dto.professionalName?.trim() || null } : {}),
        ...(dto.serialLabel !== undefined ? { serialLabel: dto.serialLabel?.trim() || null } : {}),
        ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    })
  }

  async removeEquipment(gymId: string, equipmentId: string) {
    const equipment = await this.prisma.gymEquipment.findUnique({ where: { id: equipmentId } })
    if (!equipment || equipment.gymId !== gymId) throw new NotFoundException('器材不存在')
    await this.prisma.gymEquipment.delete({ where: { id: equipmentId } })
    return { deleted: true }
  }

  async remove(gymId: string) {
    await this.prisma.gym.delete({ where: { id: gymId } })
    return { deleted: true }
  }
}
