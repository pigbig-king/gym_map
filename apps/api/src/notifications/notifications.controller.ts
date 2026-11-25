import { Controller, Get, Param, Post } from '@nestjs/common'
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator'
import { NotificationsService } from './notifications.service'

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.notificationsService.list(user.id)
  }

  @Post(':id/read')
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notificationsService.markRead(user.id, id)
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notificationsService.markAllRead(user.id)
  }
}
