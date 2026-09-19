import { IsString, IsEnum, IsUUID, MaxLength } from 'class-validator';
import { ServiceRequestType } from '../entities/crda-service-request.entity';

export class CreateServiceRequestDto {
  @IsEnum(ServiceRequestType)
  type: ServiceRequestType;

  @IsString() @MaxLength(150)
  subject: string;

  @IsString()
  description: string;
}

export class AssignAgentDto {
  @IsUUID()
  agentId: string;
}

export class ResolveRequestDto {
  @IsString()
  resolutionReport: string;
}
