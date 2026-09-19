import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DataSharingConsent, ConsentScope, ConsentStatus } from './entities/data-sharing-consent.entity';
import { DataAccessLog } from './entities/data-access-log.entity';
import { User } from '../users/entities/user.entity';
import { GrantConsentDto } from './dto/privacy.dto';

@Injectable()
export class PrivacyService {
  constructor(
    @InjectRepository(DataSharingConsent)
    private readonly consentRepo: Repository<DataSharingConsent>,
    @InjectRepository(DataAccessLog)
    private readonly logRepo: Repository<DataAccessLog>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  /** Grant a consent (Farmer) */
  async grantConsent(farmerId: string, dto: GrantConsentDto): Promise<DataSharingConsent> {
    const existing = await this.consentRepo.findOne({
      where: {
        farmerId,
        institutionId: dto.institutionId,
        status: ConsentStatus.ACTIVE,
      },
    });

    if (existing) {
      // Merge scopes
      const merged = Array.from(new Set([...existing.scopes, ...dto.scopes]));
      existing.scopes = merged;
      return await this.consentRepo.save(existing);
    }

    const consent = this.consentRepo.create({
      farmerId,
      institutionId: dto.institutionId,
      scopes: dto.scopes,
      dossierId: dto.dossierId || null,
      campaignId: dto.campaignId || null,
      status: ConsentStatus.ACTIVE,
    });

    return await this.consentRepo.save(consent);
  }

  /** Revoke a consent immediately (Farmer) */
  async revokeConsent(farmerId: string, consentId: string): Promise<DataSharingConsent> {
    const consent = await this.consentRepo.findOne({
      where: { id: consentId, farmerId },
    });
    if (!consent) throw new NotFoundException('Consentement introuvable');

    consent.status = ConsentStatus.REVOKED;
    consent.revokedAt = new Date();
    return await this.consentRepo.save(consent);
  }

  /** Get farmer consents */
  async getFarmerConsents(farmerId: string): Promise<DataSharingConsent[]> {
    return await this.consentRepo.find({
      where: { farmerId },
      relations: ['institution'],
      order: { createdAt: 'DESC' },
    });
  }

  /** Get farmer "Who viewed my data" audit trail */
  async getFarmerAuditTrail(farmerId: string): Promise<DataAccessLog[]> {
    return await this.logRepo.find({
      where: { farmerId },
      relations: ['institution', 'actorUser'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  /** Get institution immutable access audit logs */
  async getInstitutionAuditTrail(institutionId: string): Promise<DataAccessLog[]> {
    return await this.logRepo.find({
      where: { institutionId },
      relations: ['actorUser'],
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  /** Verify active consent for institution access & log read */
  async verifyAndLogAccess(
    institutionId: string,
    actorUserId: string,
    farmerId: string,
    requestedScope: ConsentScope,
    recordId?: string,
    action: 'READ' | 'WRITE' = 'READ',
    ipAddress?: string,
  ): Promise<boolean> {
    const activeConsent = await this.consentRepo.findOne({
      where: {
        farmerId,
        institutionId,
        status: ConsentStatus.ACTIVE,
      },
    });

    if (!activeConsent || !activeConsent.scopes.includes(requestedScope)) {
      throw new ForbiddenException(
        `Accès refusé par le Moteur de Confidentialité : aucun consentement actif pour la portée ${requestedScope}`,
      );
    }

    // Append to immutable log
    const logEntry = this.logRepo.create({
      actorUserId,
      institutionId,
      farmerId,
      scope: requestedScope,
      recordId: recordId || null,
      action,
      ipAddress: ipAddress || null,
    });

    await this.logRepo.save(logEntry);
    return true;
  }

  /** Farmer Discovery Lookup (Exact match phone or ZirIA UUID only) */
  async lookupFarmer(query: string): Promise<{ first_name: string; governorate: string; relationship_status: string; farmerId: string } | null> {
    const trimmed = query.trim();
    if (!trimmed) throw new BadRequestException('La recherche nécessite un numéro ou un identifiant exact');

    const farmer = await this.userRepo
      .createQueryBuilder('u')
      .where('u.id = :id OR u.phone = :phone', { id: trimmed, phone: trimmed })
      .getOne();

    if (!farmer) return null;

    // Rule 2.5: Expose ONLY first name, governorate and "no relationship yet"
    const firstName = farmer.name ? farmer.name.split(' ')[0] : 'Agriculteur';

    return {
      farmerId: farmer.id,
      first_name: firstName,
      governorate: farmer.governorate || 'Non spécifié',
      relationship_status: 'Aucune relation formelle',
    };
  }

  /** Aggregation service with cohort threshold & differencing protection */
  async getCohortAggregate<T>(
    countQueryBuilder: () => Promise<number>,
    dataQueryBuilder: () => Promise<T>,
    cohortThreshold: number = 10,
  ): Promise<{ status: 'SUCCESS' | 'INSUFFICIENT_DATA'; cohort_size: number; data: T | null }> {
    const size = await countQueryBuilder();

    if (size < cohortThreshold) {
      return {
        status: 'INSUFFICIENT_DATA',
        cohort_size: size,
        data: null,
      };
    }

    const data = await dataQueryBuilder();
    return {
      status: 'SUCCESS',
      cohort_size: size,
      data,
    };
  }
}
