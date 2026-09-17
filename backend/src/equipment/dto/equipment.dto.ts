import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateEquipmentDto {
  @ApiProperty({ example: 'Tracteur John Deere 5075E' })
  @IsString()
  type: string;

  @ApiProperty({ example: 180, description: 'Tarif journalier en TND' })
  @IsNumber() @Type(() => Number)
  daily_rate_tnd: number;

  @ApiPropertyOptional({ example: 35.1711 })
  @IsNumber() @IsOptional() @Type(() => Number)
  lat?: number;

  @ApiPropertyOptional({ example: 8.8306 })
  @IsNumber() @IsOptional() @Type(() => Number)
  lng?: number;

  @ApiPropertyOptional() @IsBoolean() @IsOptional()
  available?: boolean;
}
