import { IsString, IsNumber, IsDateString, IsPositive, MaxLength } from 'class-validator';

export class CreateSubsidyProgramDto {
  @IsString() @MaxLength(150)
  name: string;

  @IsString()
  criteria: string;

  @IsNumber() @IsPositive()
  totalBudgetTnd: number;

  @IsDateString()
  applicationWindowStart: string;

  @IsDateString()
  applicationWindowEnd: string;
}

export class ApplySubsidyDto {
  @IsString() @MaxLength(36)
  programId: string;

  @IsString()
  justification: string;

  @IsNumber() @IsPositive()
  requestedAmountTnd: number;
}
