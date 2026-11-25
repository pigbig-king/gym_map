import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'
import { Trim } from './create-gym.dto'

export class CreateEquipmentDto {
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

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  quantity?: number

  @IsOptional()
  @IsIn(['NORMAL', 'DAMAGED', 'MAINTENANCE'])
  status?: string
}
