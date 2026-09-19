import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PrivacyService } from './privacy.service';
import { GrantConsentDto } from './dto/privacy.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Confidentialité & Consentement')
@ApiBearerAuth()
@Controller('privacy')
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  @Get('consents')
  @UseGuards(JwtAuthGuard)
  async getFarmerConsents(@Req() req: any) {
    return await this.privacyService.getFarmerConsents(req.user.id);
  }

  @Post('consents')
  @UseGuards(JwtAuthGuard)
  async grantConsent(@Req() req: any, @Body() dto: GrantConsentDto) {
    return await this.privacyService.grantConsent(req.user.id, dto);
  }

  @Post('consents/:id/revoke')
  @UseGuards(JwtAuthGuard)
  async revokeConsent(@Req() req: any, @Param('id') id: string) {
    return await this.privacyService.revokeConsent(req.user.id, id);
  }

  @Get('audit-log')
  @UseGuards(JwtAuthGuard)
  async getAuditTrail(@Req() req: any) {
    return await this.privacyService.getFarmerAuditTrail(req.user.id);
  }

  @Get('discovery/lookup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTITUTION, Role.ADMIN)
  async lookupFarmer(@Query('query') query: string) {
    return await this.privacyService.lookupFarmer(query);
  }

  @Get('institution/access-logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTITUTION, Role.ADMIN)
  async getInstitutionAccessLogs(@Req() req: any) {
    const institutionId = req.user?.institutionMember?.institutionId;
    if (!institutionId) return [];
    return await this.privacyService.getInstitutionAuditTrail(institutionId);
  }
}
