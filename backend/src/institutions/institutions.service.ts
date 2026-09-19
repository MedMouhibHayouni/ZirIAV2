import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Institution } from './entities/institution.entity';
import { InstitutionMember } from './entities/institution-member.entity';
import { ProjectCall } from './entities/project-call.entity';
import { InstitutionAppointment } from './entities/institution-appointment.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';
import { CreateInstitutionDto, CreateInstitutionMemberDto, UpdateOfficeMemberDto } from './dto/institutions.dto';
import { InstitutionLevel, OfficeRole } from './enums/institution.enums';

@Injectable()
export class InstitutionsService {
  constructor(
    @InjectRepository(Institution)
    private readonly instRepo: Repository<Institution>,
    @InjectRepository(InstitutionMember)
    private readonly memberRepo: Repository<InstitutionMember>,
    @InjectRepository(ProjectCall)
    private readonly projectCallRepo: Repository<ProjectCall>,
    @InjectRepository(InstitutionAppointment)
    private readonly appointmentRepo: Repository<InstitutionAppointment>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async createOffice(dto: CreateInstitutionDto): Promise<Institution> {
    if (dto.level === InstitutionLevel.REGIONAL && !dto.governorate) {
      throw new BadRequestException('Un bureau régional doit obligatoirement être associé à un gouvernorat');
    }

    const office = this.instRepo.create({
      type: dto.type,
      level: dto.level,
      governorate: dto.level === InstitutionLevel.REGIONAL ? dto.governorate : null,
      name: dto.name,
      address: dto.address || null,
      phone: dto.phone || null,
      email: dto.email || null,
      openingHours: dto.openingHours || null,
      location: dto.location || null,
      isActive: true,
    });

    return await this.instRepo.save(office);
  }

  async getOffices(type?: any, governorate?: string): Promise<Institution[]> {
    const qb = this.instRepo.createQueryBuilder('inst')
      .where('inst.isActive = :active', { active: true });

    if (type) {
      qb.andWhere('inst.type = :type', { type });
    }
    if (governorate) {
      qb.andWhere('LOWER(inst.governorate) = LOWER(:gov)', { gov: governorate });
    }

    return await qb.getMany();
  }

  async getOfficeById(id: string): Promise<Institution> {
    const office = await this.instRepo.findOne({
      where: { id },
      relations: ['members', 'members.user'],
    });
    if (!office) throw new NotFoundException('Bureau introuvable');
    return office;
  }

  async deactivateOffice(id: string): Promise<Institution> {
    const office = await this.getOfficeById(id);
    office.isActive = false;
    return await this.instRepo.save(office);
  }

  async addMember(dto: CreateInstitutionMemberDto): Promise<InstitutionMember> {
    const office = await this.instRepo.findOne({ where: { id: dto.institutionId } });
    if (!office) throw new NotFoundException('Bureau introuvable');

    const email = dto.email.trim().toLowerCase();
    const existingUser = await this.userRepo.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Un utilisateur existe déjà avec cet email');
    }

    // Default password for generated institution accounts (changeable via profile)
    const tempPassword = process.env.DEFAULT_INSTITUTION_PASSWORD || 'ZirIA_Inst_2026!';
    const password_hash = await bcrypt.hash(tempPassword, 12);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = queryRunner.manager.create(User, {
        name: dto.name,
        email,
        phone: dto.phone || undefined,
        governorate: office.governorate || undefined,
        role: Role.INSTITUTION,
        password_hash,
        verified: true,
      });
      const savedUser = await queryRunner.manager.save(User, user);

      const member = queryRunner.manager.create(InstitutionMember, {
        userId: savedUser.id,
        institutionId: office.id,
        officeRole: dto.officeRole,
        isActive: true,
      });
      const savedMember = await queryRunner.manager.save(InstitutionMember, member);

      await queryRunner.commitTransaction();
      return savedMember;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateMember(
    memberId: string,
    dto: UpdateOfficeMemberDto,
    requestingUser: any,
  ): Promise<InstitutionMember> {
    const member = await this.memberRepo.findOne({
      where: { id: memberId },
      relations: ['institution'],
    });
    if (!member) throw new NotFoundException('Membre introuvable');

    // Permission check: Admin OR Director of the SAME office
    if (requestingUser.role !== Role.ADMIN) {
      const reqMember = requestingUser.institutionMember;
      if (
        !reqMember ||
        reqMember.institutionId !== member.institutionId ||
        reqMember.officeRole !== OfficeRole.DIRECTOR
      ) {
        throw new ForbiddenException('Seul le directeur du bureau ou un administrateur peut modifier un membre');
      }
    }

    if (dto.officeRole !== undefined) member.officeRole = dto.officeRole;
    if (dto.isActive !== undefined) member.isActive = dto.isActive;

    return await this.memberRepo.save(member);
  }

  async getOfficeMembers(officeId: string): Promise<InstitutionMember[]> {
    return await this.memberRepo.find({
      where: { institutionId: officeId },
      relations: ['user'],
    });
  }

  async getProjectCalls(institutionId?: string): Promise<ProjectCall[]> {
    const where: any = {};
    if (institutionId) where.institutionId = institutionId;
    return this.projectCallRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async createProjectCall(data: Partial<ProjectCall>): Promise<ProjectCall> {
    const call = this.projectCallRepo.create(data);
    return this.projectCallRepo.save(call);
  }

  async getAppointments(institutionId: string): Promise<InstitutionAppointment[]> {
    return this.appointmentRepo.find({
      where: { institutionId },
      order: { date: 'ASC' },
    });
  }

  async createAppointment(data: Partial<InstitutionAppointment>): Promise<InstitutionAppointment> {
    const appt = this.appointmentRepo.create(data);
    return this.appointmentRepo.save(appt);
  }
}
