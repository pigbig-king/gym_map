import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { CurrentUser, CurrentUserOptional, type AuthUser } from '../auth/current-user.decorator'
import { OptionalAuthGuard } from '../auth/optional-auth.guard'
import { Public } from '../auth/public.decorator'
import { Roles } from '../auth/roles.decorator'
import { CreateGymDto } from './dto/create-gym.dto'
import { CreateEquipmentDto } from './dto/create-equipment.dto'
import { CreateEquipmentReviewDto } from './dto/create-equipment-review.dto'
import { CreateReviewDto } from './dto/create-review.dto'
import { UpdateEquipmentDto } from './dto/update-equipment.dto'
import { UpdateGymDto } from './dto/update-gym.dto'
import { GymsService } from './gyms.service'

@Controller('gyms')
export class GymsController {
  constructor(private readonly gymsService: GymsService) {}

  @Public()
  @Get()
  list(
    @Query('city') city?: string,
    @Query('district') district?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.gymsService.list({
      city,
      district,
      q,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    })
  }

  @Public()
  @Get('stats')
  stats(@Query('city') city?: string) {
    return this.gymsService.stats(city ?? '')
  }

  @Public()
  @Get('heatmap')
  heatmap(@Query('city') city?: string) {
    return this.gymsService.heatmap(city ?? '')
  }

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.gymsService.mine(user.id)
  }

  @Roles('ADMIN')
  @Get('pending')
  pending() {
    return this.gymsService.pending()
  }

  @Public()
  @UseGuards(OptionalAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUserOptional() viewer: AuthUser | null) {
    return this.gymsService.findOne(id, viewer)
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateGymDto) {
    return this.gymsService.create(user.id, dto)
  }

  @Post(':id/check-in')
  checkIn(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.gymsService.checkIn(user.id, id)
  }

  @Delete(':id/check-in')
  removeCheckIn(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.gymsService.removeCheckIn(user.id, id)
  }

  @Post(':id/review')
  review(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CreateReviewDto) {
    return this.gymsService.review(user.id, id, dto)
  }

  @Post(':gymId/equipment/:equipmentId/review')
  reviewEquipment(
    @CurrentUser() user: AuthUser,
    @Param('gymId') gymId: string,
    @Param('equipmentId') equipmentId: string,
    @Body() dto: CreateEquipmentReviewDto,
  ) {
    return this.gymsService.reviewEquipment(user.id, gymId, equipmentId, dto)
  }

  @Post(':id/equipment')
  addEquipment(@Param('id') id: string, @Body() dto: CreateEquipmentDto) {
    return this.gymsService.addEquipment(id, dto)
  }

  @Patch(':id/equipment/:equipmentId')
  updateEquipment(@Param('id') id: string, @Param('equipmentId') equipmentId: string, @Body() dto: UpdateEquipmentDto) {
    return this.gymsService.updateEquipment(id, equipmentId, dto)
  }

  @Delete(':id/equipment/:equipmentId')
  removeEquipment(@Param('id') id: string, @Param('equipmentId') equipmentId: string) {
    return this.gymsService.removeEquipment(id, equipmentId)
  }

  @Roles('ADMIN')
  @Patch(':id')
  approve(@Param('id') id: string, @Body() dto: UpdateGymDto) {
    return this.gymsService.approve(id, dto)
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.gymsService.remove(id)
  }
}
