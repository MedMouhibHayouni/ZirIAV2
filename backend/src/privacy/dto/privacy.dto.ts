import { IsString, IsArray, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ConsentScope } from '../entities/data-sharing-consent.entity';

export class GrantConsentDto {
  @IsUUID()
  institutionId: string;

  @IsArray()
  @IsEnum(ConsentScope, { each: true })
  scopes: ConsentScope[];

  @IsOptional()
  @IsUUID()
  dossierId?: string;

  @IsOptional()
  @IsUUID()
  campaignId?: string;
}

export class LookupFarmerDto {
  @IsString()
  query: string; // Exact phone number or user UUID
}
