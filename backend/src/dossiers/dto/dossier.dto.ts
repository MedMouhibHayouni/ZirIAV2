import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsArray,
  IsDateString,
  Min,
} from 'class-validator';
import { DossierType, InvestmentStatus } from '../entities/dossier.entity';
import { DocumentReviewStatus } from '../entities/dossier-document.entity';
import { CreditStatus } from '../entities/credit-details.entity';
import { InstallmentStatus } from '../entities/repayment-installment.entity';
import { MilestoneStatus } from '../entities/project-milestone.entity';

export class CreateDossierDto {
  @IsEnum(DossierType)
  type: DossierType;

  @IsUUID()
  institutionId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  programName: string;

  @IsNumber()
  requestedAmountTnd: number;

  @IsString()
  @IsOptional()
  projectSummary?: string;
}

export class UpdateDossierStatusDto {
  @IsEnum(InvestmentStatus)
  status: InvestmentStatus;

  @IsString()
  @IsOptional()
  note?: string;

  @IsNumber()
  @IsOptional()
  approvedAmountTnd?: number;
}

export class ReviewDocumentDto {
  @IsEnum(DocumentReviewStatus)
  reviewStatus: DocumentReviewStatus;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}

export class AssignAgentDto {
  @IsUUID()
  agentId: string;
}

export class AddInternalNoteDto {
  @IsString()
  @IsNotEmpty()
  note: string;
}

// ─── Sprint 4 DTOs: Credit, Repayment, Milestone & Visit ─────────────────────

export class CreateCreditDetailsDto {
  @IsUUID()
  dossierId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  financingInstitution: string;

  @IsNumber()
  @Min(1)
  requestedAmountTnd: number;

  @IsNumber()
  @IsOptional()
  approvedAmountTnd?: number;

  @IsNumber()
  @IsOptional()
  interestRatePct?: number;

  @IsNumber()
  @IsOptional()
  durationMonths?: number;

  @IsString()
  @IsOptional()
  guaranteesDescription?: string;

  @IsString()
  @IsOptional()
  bankContactName?: string;

  @IsString()
  @IsOptional()
  bankContactPhone?: string;

  @IsString()
  @IsOptional()
  bankContactEmail?: string;

  @IsString()
  @IsOptional()
  bankDecisionLetterUrl?: string;
}

export class UpdateCreditStatusDto {
  @IsEnum(CreditStatus)
  status: CreditStatus;
}

export class RecordDisbursementDto {
  @IsNumber()
  @Min(1)
  amountTnd: number;

  @IsDateString()
  disbursementDate: string;

  @IsString()
  @IsOptional()
  transactionReference?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class GenerateScheduleDto {
  @IsNumber()
  @Min(1)
  installmentsCount: number;

  @IsDateString()
  firstDueDate: string;
}

export class DeclarePaymentDto {
  @IsString()
  paymentProofUrl: string;

  @IsString()
  @IsOptional()
  farmerDeclarationNote?: string;
}

export class ConfirmPaymentDto {
  @IsString()
  @IsOptional()
  note?: string;
}

export class ProposeReschedulingDto {
  @IsDateString()
  newDueDate: string;

  @IsString()
  @IsNotEmpty()
  proposalNote: string;
}

export class CreateMilestoneDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  targetDate: string;
}

export class UpdateMilestoneDto {
  @IsEnum(MilestoneStatus)
  @IsOptional()
  status?: MilestoneStatus;

  @IsDateString()
  @IsOptional()
  actualDate?: string;
}

export class CreateFieldVisitDto {
  @IsDateString()
  visitDate: string;

  @IsNumber()
  @IsOptional()
  gpsLatitude?: number;

  @IsNumber()
  @IsOptional()
  gpsLongitude?: number;

  @IsString()
  @IsNotEmpty()
  reportText: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  photoUrls?: string[];

  @IsString()
  @IsOptional()
  outcome?: string;
}
