import { Type } from 'class-transformer'
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
} from 'class-validator'

export class GymEquipmentDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsOptional()
  @IsString()
  professionalName?: string

  @IsOptional()
  @IsString()
  serialLabel?: string

  @IsInt()
  @Min(1)
  quantity: number

  @IsOptional()
  @IsIn(['NORMAL', 'DAMAGED', 'MAINTENANCE'])
  status?: string
}

export class CreateGymDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsNotEmpty()
  address: string

  @IsString()
  @IsNotEmpty()
  city: string

  @IsOptional()
  @IsString()
  district?: string

  @IsNumber()
  lat: number

  @IsNumber()
  lng: number

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  price?: string

  @IsOptional()
  @IsString()
  hours?: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[]

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GymEquipmentDto)
  equipment: GymEquipmentDto[]
}
