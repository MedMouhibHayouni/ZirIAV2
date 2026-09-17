import { IsEmail, IsOptional, IsString, MinLength, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Role } from '../../common/enums/role.enum';

function EmptyToUndefined({ value }: { value: unknown }) {
  if (typeof value === 'string') {
    const v = value.trim();
    return v === '' ? undefined : v;
  }
  return value;
}

export class RegisterDto {
  @ApiProperty({ example: 'Mohamed Ali Ben Salah', description: 'Nom complet' })
  @IsString()
  @Transform(EmptyToUndefined)
  name: string;

  @ApiPropertyOptional({ example: 'mohamed@example.com' })
  @IsEmail()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() || undefined : value))
  email?: string;

  @ApiPropertyOptional({ example: '+21698765432' })
  @IsString()
  @IsOptional()
  @Transform(EmptyToUndefined)
  phone?: string;

  @ApiPropertyOptional({ example: 'Kasserine' })
  @IsString()
  @IsOptional()
  @Transform(EmptyToUndefined)
  governorate?: string;

  @ApiProperty({ enum: Role, example: Role.FARMER_AMBASSADOR })
  @IsEnum(Role)
  role: Role;

  @ApiProperty({ example: 'motDePasseSecure123', minLength: 8 })
  @IsString()
  @MinLength(8)
  // Do NOT trim password - spaces may be intentional; only keep as-is
  password: string;

  // Frontend sends coopName for COOP_PRESIDENT; whitelisted to avoid 400
  @ApiPropertyOptional({ example: 'SMSA Ennajah' })
  @IsOptional()
  @IsString()
  @Transform(EmptyToUndefined)
  coopName?: string;
}

export class LoginDto {
  @ApiPropertyOptional({ example: 'mohamed@example.com' })
  @IsEmail()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() || undefined : value))
  email?: string;

  @ApiPropertyOptional({ example: '+21698765432' })
  @IsString()
  @IsOptional()
  @Transform(EmptyToUndefined)
  phone?: string;

  @ApiProperty({ example: 'motDePasseSecure123' })
  @IsString()
  password: string;
}
