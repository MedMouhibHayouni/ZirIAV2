import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PhotoItemDto {
  @IsString()
  @IsNotEmpty()
  type: 'photo';

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsNumber()
  position: number;
}

export class CreateStorageFacilityDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  governorate: string;

  @IsString()
  @IsOptional()
  delegation?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PhotoItemDto)
  photos?: PhotoItemDto[];
}
