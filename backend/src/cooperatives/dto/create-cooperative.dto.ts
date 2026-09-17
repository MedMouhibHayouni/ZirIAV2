import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCooperativeDto {
  @ApiProperty({ example: 'SMSA Jebel Chambi' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'TN-KAS-2024-001' })
  @IsString()
  @IsOptional()
  smsa_code?: string;

  @ApiPropertyOptional({ example: 35.1711 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  location_lat?: number;

  @ApiPropertyOptional({ example: 8.8306 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  location_lng?: number;
}
