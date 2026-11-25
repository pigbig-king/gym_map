import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator'

export class CreateEquipmentDto {
  @IsString()
  name: string

  @IsOptional()
  @IsString()
  professionalName?: string

  @IsOptional()
  @IsString()
  serialLabel?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number

  @IsOptional()
  @IsIn(['NORMAL', 'DAMAGED', 'MAINTENANCE'])
  status?: string
}
