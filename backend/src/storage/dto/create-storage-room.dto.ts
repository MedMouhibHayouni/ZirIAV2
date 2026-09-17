import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsArray } from 'class-validator';
import { StoragePricingMode, StoragePricingUnit, ElectricityBillingMode } from '../entities/storage-room.entity';

export class CreateStorageRoomDto {
  @IsString()
  @IsNotEmpty()
  facility_id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  room_type: string;

  @IsNumber()
  @IsNotEmpty()
  capacity_m3: number;

  @IsNumber()
  @IsOptional()
  total_capacity?: number;

  @IsEnum(StoragePricingUnit)
  @IsOptional()
  pricing_unit?: StoragePricingUnit;

  @IsNumber()
  @IsOptional()
  unit_price?: number;

  @IsNumber()
  @IsOptional()
  capacity_tonnes?: number;

  @IsEnum(StoragePricingMode)
  @IsOptional()
  pricing_mode?: StoragePricingMode;

  @IsNumber()
  @IsOptional()
  price_per_m3_day?: number;

  @IsNumber()
  @IsOptional()
  flat_price?: number;

  @IsEnum(ElectricityBillingMode)
  @IsOptional()
  electricity_billing_mode?: ElectricityBillingMode;

  @IsNumber()
  @IsOptional()
  electricity_rate?: number;

  @IsNumber()
  @IsOptional()
  compressor_power_kw?: number;

  @IsString()
  @IsOptional()
  color_hex?: string;

  @IsArray()
  @IsOptional()
  equipment_badges?: string[];

  @IsNumber()
  @IsOptional()
  grid_order?: number;

  @IsString()
  @IsOptional()
  initial_occupant_label?: string;

  @IsString()
  @IsOptional()
  client_phone?: string;

  @IsNumber()
  @IsOptional()
  initial_occupied_capacity?: number;
}
