import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator'

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  nickname?: string

  @IsOptional()
  @IsString()
  avatarUrl?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  bio?: string

  @IsOptional()
  @IsNumber()
  height?: number
}
