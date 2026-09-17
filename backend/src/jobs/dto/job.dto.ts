import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { JobStatus } from '../entities/job.entity';

export class CreateJobDto {
  @ApiProperty({ example: 'Récolte de piments' })
  @IsString()
  task_type: string;

  @ApiProperty({ example: 35, description: 'Salaire journalier en TND' })
  @IsNumber() @Type(() => Number)
  daily_pay_tnd: number;

  @ApiPropertyOptional() @IsNumber() @IsOptional() @Type(() => Number)
  lat?: number;

  @ApiPropertyOptional() @IsNumber() @IsOptional() @Type(() => Number)
  lng?: number;
}

export class UpdateJobStatusDto {
  @ApiProperty({ enum: JobStatus })
  @IsEnum(JobStatus)
  status: JobStatus;
}
