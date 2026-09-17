import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryStorageFacilityDto {
  @IsString()
  @IsOptional()
  governorate?: string;

  @IsString()
  @IsOptional()
  room_type?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  min_capacity?: number;

  @IsDateString()
  @IsOptional()
  start_date?: string;

  @IsDateString()
  @IsOptional()
  end_date?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number = 10;
}
