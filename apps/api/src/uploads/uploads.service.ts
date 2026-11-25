import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import sharp from 'sharp'

@Injectable()
export class UploadsService {
  constructor(private readonly config: ConfigService) {}

  async saveImage(input: Buffer) {
    let output: Buffer
    try {
      const image = sharp(input, { limitInputPixels: 20000000, failOn: 'warning' })
      const metadata = await image.metadata()
      if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages ?? 1) > 1) {
        throw new Error('Unsupported image')
      }
      // Decode and re-encode: discard original names, embedded scripts and EXIF/location data.
      output = await image.rotate().resize(2048, 2048, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer()
    } catch {
      throw new BadRequestException('请上传有效的 JPG、PNG 或静态 WebP 图片（最多 2000 万像素）')
    }
    const directory = resolve(this.config.get<string>('UPLOAD_DIR') ?? join(process.cwd(), 'uploads'))
    await mkdir(directory, { recursive: true })
    const filename = `${randomUUID()}.webp`
    await writeFile(join(directory, filename), output, { flag: 'wx' })
    return { url: `/uploads/${filename}` }
  }
}
