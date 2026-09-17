import { IsNumber, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RecordPaymentDto {
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsOptional()
  note?: string;
}
