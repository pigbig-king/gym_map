import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsIn, ValidateIf, ValidateNested } from 'class-validator'
import { GymEquipmentDto } from './create-gym.dto'

export class UpdateGymDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  status?: 'PENDING' | 'APPROVED' | 'REJECTED'

  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => GymEquipmentDto)
  equipment?: GymEquipmentDto[]
}
