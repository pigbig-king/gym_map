import { Transform, Type } from 'class-transformer'
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  ArrayMaxSize,
  Max,
  MaxLength,
  Matches,
} from 'class-validator'

export const Trim = () => Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)

export class GymEquipmentDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  professionalName?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialLabel?: string

  @IsInt()
  @Min(1)
  @Max(1000)
  quantity: number

  @IsOptional()
  @IsIn(['NORMAL', 'DAMAGED', 'MAINTENANCE'])
  status?: string
}

export class CreateGymDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  address: string

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  district?: string

  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  environment?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  price?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  hours?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  phone?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Matches(/^\/uploads\/[a-zA-Z0-9-]+\.(?:webp|png|jpe?g)$/i, { each: true, message: '图片必须使用本站上传接口返回的地址' })
  images?: string[]

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => GymEquipmentDto)
  equipment: GymEquipmentDto[]
}
