import { IsString, IsOptional, IsDate, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCropZoneDto {
  @ApiProperty({ example: 'tomate' })
  @IsString()
  crop_type: string;

  @ApiPropertyOptional({ example: '2026-05-01' })
  @IsDate() @Type(() => Date) @IsOptional()
  planted_at?: Date;

  @ApiProperty({ description: 'GeoJSON Polygon' })
  @IsObject()
  boundary_geojson: any;

  @ApiPropertyOptional({ example: 'Zone avec système goutte à goutte' })
  @IsString() @IsOptional()
  notes?: string;
}
