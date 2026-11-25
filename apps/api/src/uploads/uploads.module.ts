import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ServeStaticModule } from '@nestjs/serve-static'
import { join, resolve } from 'node:path'
import { UploadsController } from './uploads.controller'
import { UploadsService } from './uploads.service'

@Module({
  imports: [
    ServeStaticModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [{
        rootPath: resolve(config.get<string>('UPLOAD_DIR') ?? join(process.cwd(), 'uploads')),
        serveRoot: '/uploads',
        serveStaticOptions: {
          index: false,
          dotfiles: 'deny',
          setHeaders: (res) => {
            res.setHeader('X-Content-Type-Options', 'nosniff')
            res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox")
          },
        },
      }],
    }),
  ],
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}
