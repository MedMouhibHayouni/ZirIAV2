import { IsString, IsEnum, IsOptional, IsDateString, IsArray, IsInt, Min, MaxLength } from 'class-validator';
import { CampaignType } from '../entities/crda-campaign.entity';

export class CreateCampaignDto {
  @IsString() @MaxLength(150)
  title: string;

  @IsEnum(CampaignType)
  type: CampaignType;

  @IsOptional() @IsString()
  description?: string;

  @IsString() @MaxLength(100)
  targetCropOrLivestock: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsArray() @IsString({ each: true })
  targetDelegations: string[];

  @IsOptional() @IsInt() @Min(0)
  targetParticipantsCount?: number;
}
