import { IsString, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { StorageReservationStatus } from '../entities/storage-reservation.entity';

export class QueryStorageReservationDto {
  @IsString()
  @IsOptional()
  status?: StorageReservationStatus;

  @IsString()
  @IsOptional()
  facility_id?: string;

  @IsString()
  @IsOptional()
  room_id?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number = 10;
}
