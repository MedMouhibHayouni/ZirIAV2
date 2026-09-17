import { IsString, IsNumber, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateParcelDto {
  @ApiPropertyOptional({ description: 'ID de la coopérative (optionnel)' })
  @IsUUID() @IsOptional()
  cooperative_id?: string;

  @ApiPropertyOptional({ example: 'Champ Nord' })
  @IsString() @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: '#2D6A4F' })
  @IsString() @IsOptional()
  color_hex?: string;

  @ApiProperty({ description: 'GeoJSON Polygon pour la bordure de la parcelle' })
  @IsOptional()
  boundary_geojson?: any;

  @ApiPropertyOptional({ example: 'blé dur' })
  @IsString() @IsOptional()
  crop_type?: string;

  @ApiPropertyOptional({ example: 2.5, description: 'Surface en hectares (ignoré si boundary est fourni)' })
  @IsNumber() @Type(() => Number) @IsOptional()
  surface_ha?: number;

  @ApiPropertyOptional({ example: 35.1711 })
  @IsNumber() @Type(() => Number) @IsOptional()
  lat?: number;

  @ApiPropertyOptional({ example: 8.8306 })
  @IsNumber() @Type(() => Number) @IsOptional()
  lng?: number;
}
