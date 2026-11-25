import { Type } from 'class-transformer'
import { IsArray, IsIn, IsOptional, ValidateNested } from 'class-validator'
import { GymEquipmentDto } from './create-gym.dto'

export class UpdateGymDto {
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  status?: 'PENDING' | 'APPROVED' | 'REJECTED'

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GymEquipmentDto)
  equipment?: GymEquipmentDto[]
}
