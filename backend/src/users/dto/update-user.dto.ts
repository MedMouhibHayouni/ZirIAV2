import { IsString, IsOptional, IsEmail, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Role } from '../../common/enums/role.enum';

export class UpdateUserDto {
  @ApiPropertyOptional() @IsString() @IsOptional() name?: string;
  @ApiPropertyOptional() @IsEmail() @IsOptional() email?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() phone?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() governorate?: string;
  @ApiPropertyOptional({ enum: Role }) @IsEnum(Role) @IsOptional() role?: Role;
  @ApiPropertyOptional() @IsOptional() verified?: boolean;
}
