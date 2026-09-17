import {
  IsString, IsNumber, IsOptional, IsUUID, IsEnum,
  IsBoolean, IsEmail, IsArray, IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { ListingStatus, ListingCategory, EquipmentCondition } from '../entities/marketplace-listing.entity';

export class CreatePublicListingDto {
  @ApiProperty({ enum: ListingCategory, example: ListingCategory.FRESH_PRODUCE })
  @IsEnum(ListingCategory)
  category: ListingCategory;

  @ApiProperty({ example: 'Lot de tomates Rio Grande — 2 tonnes' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Tomates fraîches, calibre A, récoltées cette semaine.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'Tomate' })
  @IsString()
  @IsOptional()
  crop_type?: string;

  @ApiPropertyOptional({ example: 2.5, description: 'Quantité (valeur générique)' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  quantity_value?: number;

  @ApiPropertyOptional({ example: 'tonnes', description: 'Unité: kg, tonnes, têtes, ha, unité...' })
  @IsString()
  @IsOptional()
  quantity_unit?: string;

  @ApiPropertyOptional({ example: 1.85, description: 'Prix en TND' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  price_tnd?: number;

  @ApiPropertyOptional({ description: 'Si true, prix non affiché ("Prix sur demande")' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  price_on_request?: boolean;

  @ApiPropertyOptional({ example: 'Kasserine, Foussana' })
  @IsString()
  @IsOptional()
  location_label?: string;

  @ApiPropertyOptional({ example: '+216 98 123 456' })
  @IsString()
  @IsOptional()
  contact_phone?: string;

  @ApiPropertyOptional({ example: 'vendeur@email.com' })
  @IsEmail()
  @IsOptional()
  contact_email?: string;

  // ─── LIVESTOCK fields ───────────────────────────────────────────────────────
  @ApiPropertyOptional({ example: 'Mouton', description: 'Type d\'animal (LIVESTOCK only)' })
  @IsString()
  @IsOptional()
  livestock_type?: string;

  // ─── EQUIPMENT fields ───────────────────────────────────────────────────────
  @ApiPropertyOptional({ enum: EquipmentCondition })
  @IsEnum(EquipmentCondition)
  @IsOptional()
  equipment_condition?: EquipmentCondition;

  // ─── LAND fields ────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ example: 5.5 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  land_size_ha?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  land_water_access?: boolean;

  @ApiPropertyOptional({ example: 'Argilo-calcaire' })
  @IsString()
  @IsOptional()
  land_soil_type?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  land_open_for_bidding?: boolean;

  // ─── Traceability fields (Sprint 5) ─────────────────────────────────────────
  @ApiPropertyOptional({ example: 'Thym', description: 'Origine florale pour le miel' })
  @IsString()
  @IsOptional()
  floral_origin?: string;

  @ApiPropertyOptional({ description: 'Conformité sanitaire' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  sanitary_cert?: boolean;

  @ApiPropertyOptional({ example: 'Plein air', description: 'Méthode d\'élevage' })
  @IsString()
  @IsOptional()
  breeding_method?: string;

  @ApiPropertyOptional({ example: 'uuid', description: 'Référence traçabilité apiary/herd' })
  @IsString()
  @IsOptional()
  traceability_ref_id?: string;

  // ─── Inventory link ─────────────────────────────────────────────────────────
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  linked_to_stock?: boolean;

  // ─── Legacy B2B fields (backward compat) ────────────────────────────────────
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  parcel_id?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  quantity_tonnes?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  price_per_kg?: number;
}

/** Alias for backward compatibility */
export class CreateListingDto extends CreatePublicListingDto {}

/** DTO pour modifier les détails d'une annonce existante (toutes les propriétés sont optionnelles) */
export class UpdateListingDto {
  @ApiPropertyOptional({ enum: ListingCategory })
  @IsEnum(ListingCategory)
  @IsOptional()
  category?: ListingCategory;

  @ApiPropertyOptional({ example: 'Lot de tomates — 2 tonnes' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  crop_type?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  quantity_value?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  quantity_unit?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  price_tnd?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  price_on_request?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  location_label?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contact_phone?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  contact_email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  livestock_type?: string;

  @ApiPropertyOptional({ enum: EquipmentCondition })
  @IsEnum(EquipmentCondition)
  @IsOptional()
  equipment_condition?: EquipmentCondition;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  land_size_ha?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  land_water_access?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  land_soil_type?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  land_open_for_bidding?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  floral_origin?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  sanitary_cert?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  breeding_method?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  traceability_ref_id?: string;
}

export class UpdateListingStatusDto {
  @ApiProperty({ enum: ListingStatus, example: ListingStatus.SOLD })
  @IsEnum(ListingStatus)
  status: ListingStatus;
}

export class ExpressInterestDto {
  @ApiPropertyOptional({ example: 'Je suis intéressé par 10 tonnes.' })
  @IsString()
  @IsOptional()
  message?: string;
}

export class RespondToInterestDto {
  @ApiProperty({ enum: ['CONFIRM', 'REJECT'], example: 'CONFIRM' })
  @IsIn(['CONFIRM', 'REJECT'])
  action: 'CONFIRM' | 'REJECT';
}

export class SubmitInquiryDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  @IsString()
  listing_id: string;

  @ApiProperty({ example: 'Ahmed Ben Salah' })
  @IsString()
  inquirer_name: string;

  @ApiProperty({ example: 'ahmed@email.com' })
  @IsEmail()
  inquirer_email: string;

  @ApiPropertyOptional({ example: '+216 98 111 222' })
  @IsString()
  @IsOptional()
  inquirer_phone?: string;

  @ApiProperty({ example: 'Bonjour, je suis intéressé par votre annonce...' })
  @IsString()
  message: string;
}
