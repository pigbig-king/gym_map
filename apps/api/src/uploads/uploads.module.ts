import { Module } from '@nestjs/common'
import { MulterModule } from '@nestjs/platform-express'
import { ServeStaticModule } from '@nestjs/serve-static'
import { diskStorage } from 'multer'
import { extname, join } from 'path'
import { UploadsController } from './uploads.controller'

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads'),
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname) || '.png'
          cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9).toString(36)}${ext}`)
        },
      }),
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
  ],
  controllers: [UploadsController],
})
export class UploadsModule {}
