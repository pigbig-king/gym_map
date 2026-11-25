import { Injectable } from '@nestjs/common'

@Injectable()
export class AppService {
  getHello(): string {
    return '健身地图 API 已就绪'
  }
}
