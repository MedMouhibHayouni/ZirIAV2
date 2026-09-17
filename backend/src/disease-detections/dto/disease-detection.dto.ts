import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateDiseaseDetectionDto {
  @ApiProperty({ example: 35.22 }) @IsNumber() @Type(() => Number) lat: number;
  @ApiProperty({ example: 8.95 }) @IsNumber() @Type(() => Number) lng: number;
  @ApiProperty({ example: 'piment' }) @IsString() crop_type: string;
  @ApiProperty({ example: 'alternariose' }) @IsString() disease_name: string;
  @ApiProperty({ example: 0.9234 }) @IsNumber() @Type(() => Number) confidence_score: number;
  @ApiPropertyOptional({ example: 'Appliquer un fongicide à base de mancozèbe...' })
  @IsString() @IsOptional() recommendation_fr?: string;
  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/...' })
  @IsString() @IsOptional() photo_url?: string;
}
