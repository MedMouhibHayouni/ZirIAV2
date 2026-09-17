import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, IsEnum } from 'class-validator';
import { StoragePricingUnit } from '../entities/storage-room.entity';

export class CreateStorageReservationDto {
  @IsString()
  @IsNotEmpty()
  room_id: string;

  @IsNumber()
  @IsNotEmpty()
  occupied_capacity: number;

  @IsEnum(StoragePricingUnit)
  @IsOptional()
  occupied_unit?: StoragePricingUnit;

  @IsDateString()
  @IsNotEmpty()
  start_date: string;

  @IsDateString()
  @IsOptional()
  end_date?: string;

  @IsString()
  @IsOptional()
  initial_occupant_label?: string;

  @IsString()
  @IsOptional()
  client_name?: string;

  @IsString()
  @IsOptional()
  client_phone?: string;
}
