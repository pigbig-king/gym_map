import { Controller, Get, Query } from '@nestjs/common'
import { Public } from '../auth/public.decorator'
import { GeoService } from './geo.service'

@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Public()
  @Get('search')
  search(@Query('q') q?: string) {
    return this.geoService.search(q ?? '')
  }
}
