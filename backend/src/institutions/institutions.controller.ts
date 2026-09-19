import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { InstitutionsService } from './institutions.service';
import { CreateInstitutionDto, CreateInstitutionMemberDto, UpdateOfficeMemberDto } from './dto/institutions.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { InstitutionType } from './enums/institution.enums';

import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Institutions')
@ApiBearerAuth()
@Controller('institutions')
export class InstitutionsController {
  constructor(private readonly instService: InstitutionsService) {}

  @Post('offices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async createOffice(@Body() dto: CreateInstitutionDto) {
    return await this.instService.createOffice(dto);
  }

  @Get()
  async getAllInstitutions(
    @Query('type') type?: InstitutionType,
    @Query('governorate') governorate?: string,
  ) {
    return await this.instService.getOffices(type, governorate);
  }

  @Get('offices')
  async getOffices(
    @Query('type') type?: InstitutionType,
    @Query('governorate') governorate?: string,
  ) {
    return await this.instService.getOffices(type, governorate);
  }

  @Get('offices/:id')
  async getOfficeById(@Param('id') id: string) {
    return await this.instService.getOfficeById(id);
  }

  @Patch('offices/:id/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async deactivateOffice(@Param('id') id: string) {
    return await this.instService.deactivateOffice(id);
  }

  @Post('members')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.INSTITUTION)
  async addMember(@Body() dto: CreateInstitutionMemberDto, @Req() req: any) {
    return await this.instService.addMember(dto);
  }

  @Patch('members/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.INSTITUTION)
  async updateMember(
    @Param('id') id: string,
    @Body() dto: UpdateOfficeMemberDto,
    @Req() req: any,
  ) {
    return await this.instService.updateMember(id, dto, req.user);
  }

  @Get('offices/:id/members')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.INSTITUTION)
  async getOfficeMembers(@Param('id') id: string) {
    return await this.instService.getOfficeMembers(id);
  }

  @Get('project-calls')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.INSTITUTION)
  async getProjectCalls(@Req() req: any) {
    const institutionId = req.user?.institutionMember?.institutionId;
    return await this.instService.getProjectCalls(institutionId);
  }

  @Post('project-calls')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.INSTITUTION)
  async createProjectCall(@Body() body: any, @Req() req: any) {
    const institutionId = req.user?.institutionMember?.institutionId;
    return await this.instService.createProjectCall({ ...body, institutionId });
  }

  @Get('appointments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.INSTITUTION)
  async getAppointments(@Req() req: any) {
    const institutionId = req.user?.institutionMember?.institutionId;
    if (!institutionId) return [];
    return await this.instService.getAppointments(institutionId);
  }

  @Post('appointments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.INSTITUTION)
  async createAppointment(@Body() body: any, @Req() req: any) {
    const institutionId = req.user?.institutionMember?.institutionId;
    return await this.instService.createAppointment({ ...body, institutionId });
  }
}
