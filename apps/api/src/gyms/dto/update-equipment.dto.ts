import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator'
import { Trim } from './create-gym.dto'

export class UpdateEquipmentDto {
  @ValidateIf((_object, value) => value !== undefined)
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  professionalName?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialLabel?: string

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(1000)
  quantity?: number

  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['NORMAL', 'DAMAGED', 'MAINTENANCE'])
  status?: string
}
