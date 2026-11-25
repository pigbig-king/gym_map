import { Module } from '@nestjs/common'
import { NotificationsModule } from '../notifications/notifications.module'
import { GymsController } from './gyms.controller'
import { GymsService } from './gyms.service'

@Module({
  imports: [NotificationsModule],
  controllers: [GymsController],
  providers: [GymsService],
  exports: [GymsService],
})
export class GymsModule {}
