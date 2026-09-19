import {
  IsString,
  IsEnum,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsUUID,
  IsObject,
} from 'class-validator';
import { InstitutionType, InstitutionLevel, OfficeRole } from '../enums/institution.enums';

export class CreateInstitutionDto {
  @IsEnum(InstitutionType)
  type: InstitutionType;

  @IsEnum(InstitutionLevel)
  level: InstitutionLevel;

  @IsOptional()
  @IsString()
  governorate?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  openingHours?: string;

  @IsOptional()
  @IsObject()
  location?: any;
}

export class CreateInstitutionMemberDto {
  @IsUUID()
  institutionId: string;

  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(OfficeRole)
  officeRole: OfficeRole;
}

export class UpdateOfficeMemberDto {
  @IsOptional()
  @IsEnum(OfficeRole)
  officeRole?: OfficeRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
