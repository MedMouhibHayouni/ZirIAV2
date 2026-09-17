import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { WorkerProfile } from './entities/worker-profile.entity';
import { JobOffer, JobOfferStatus } from './entities/job-offer.entity';
import { JobApplication, ApplicationStatus } from './entities/job-application.entity';
import { WorkerCertification, CertificationStatus } from './entities/worker-certification.entity';
import { WorkerEarnings } from './entities/worker-earnings.entity';
import { Parcel } from '../parcels/entities/parcel.entity';
import { NotificationService } from '../notifications/notification.service';
import { NotificationGateway } from '../notifications/notification.gateway';
import { PaginatedResult } from '../common/dto/paginated.dto';
import { WalletService } from '../finance/wallet.service';
import { MissionContract } from '../contracts/entities/mission-contract.entity';
import { MissionContractService } from '../contracts/mission-contract.service';
import { ContractType } from '../contracts/entities/contract-type.enum';
import { TUNISIA_GOVERNORATES } from '../common/constants/governorates';

@Injectable()
export class WorkersService {
  private readonly logger = new Logger(WorkersService.name);

  constructor(
    @InjectRepository(WorkerProfile)
    private readonly workerRepo: Repository<WorkerProfile>,
    @InjectRepository(JobOffer)
    private readonly offerRepo: Repository<JobOffer>,
    @InjectRepository(JobApplication)
    private readonly applicationRepo: Repository<JobApplication>,
    @InjectRepository(WorkerCertification)
    private readonly certRepo: Repository<WorkerCertification>,
    @InjectRepository(WorkerEarnings)
    private readonly earningsRepo: Repository<WorkerEarnings>,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
    private readonly dataSource: DataSource,
    private readonly walletService: WalletService,
    private readonly contractService: MissionContractService,
    @InjectRepository(MissionContract)
    private readonly missionContractRepo: Repository<MissionContract>,
  ) {}

  // ─── WORKER PROFILES ─────────────────────────────────────────────────────────

  async upsertProfile(userId: string, dto: Partial<WorkerProfile>): Promise<WorkerProfile> {
    try {
      this.logger.log(`[DEBUG] Upserting profile for user ${userId} with dto keys: ${Object.keys(dto).join(', ')}`);

      // 1. Update user name/phone if passed in sub-object
      if (dto && dto.user) {
        const uName = dto.user.name;
        const uPhone = dto.user.phone;
        await this.dataSource.query(
          `UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone) WHERE id = $3`,
          [uName || null, uPhone || null, userId]
        );
        delete dto.user;
      }

      // 2. Strip read-only, primary keys or nested relations to avoid TypeORM save bypasses/failures
      delete (dto as any).ratings;
      delete (dto as any).certifications;
      delete (dto as any).id;
      delete (dto as any).user_id;

      // FIX 6 (Phase 3) — garde-fou : governorate doit appartenir à la liste
      // canonique des 24 gouvernorats (texte libre interdit : ex. "Kasserine, Sidi Bouzid").
      if (dto.governorate !== undefined && dto.governorate !== null) {
        const gov = String(dto.governorate).trim();
        if (!(TUNISIA_GOVERNORATES as readonly string[]).includes(gov)) {
          throw new BadRequestException(
            `Gouvernorat invalide : "${String(dto.governorate)}". Sélectionnez un gouvernorat dans la liste officielle.`
          );
        }
        dto.governorate = gov;
      }

      // 3. Upsert profile
      let profile = await this.workerRepo.findOne({ where: { user_id: userId } });
      if (profile) {
        Object.assign(profile, dto, { user_id: userId });
        await this.workerRepo.save(profile);
      } else {
        const created = this.workerRepo.create({ ...dto, user_id: userId });
        await this.workerRepo.save(created);
      }

      // 4. Return fully loaded profile
      const savedProfile = await this.findMyProfile(userId);
      if (!savedProfile) {
        throw new NotFoundException("Profil introuvable après enregistrement.");
      }
      return savedProfile;
    } catch (err) {
      this.logger.error(`[ERROR] Error in upsertProfile: ${err.message}`, err.stack);
      throw err;
    }
  }

  async findMyProfile(userId: string): Promise<WorkerProfile | null> {
    return this.workerRepo.findOne({
      where: { user_id: userId },
      relations: ['user']
    });
  }

  async findAvailableWorkers(governorate?: string, skill?: string): Promise<WorkerProfile[]> {
    const qb = this.workerRepo.createQueryBuilder('wp')
      .leftJoinAndSelect('wp.user', 'u')
      .where('wp.is_available = true');
    if (governorate) qb.andWhere('wp.governorate = :governorate', { governorate });
    if (skill) qb.andWhere(':skill = ANY(wp.skills)', { skill });
    return qb.orderBy('wp.rating', 'DESC').getMany();
  }

  /** Spatial query: Workers within radius_km of a job offer location */
  async findWorkersNearLocation(lat: number, lng: number, radiusKm = 15): Promise<WorkerProfile[]> {
    return this.dataSource.query(`
      SELECT wp.*, u.name, u.phone, u.fcm_token
      FROM worker_profiles wp
      LEFT JOIN users u ON u.id = wp.user_id
      WHERE wp.is_available = true
        AND wp.location IS NOT NULL
        AND ST_DWithin(
          wp.location,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
          $3 * 1000
        )
      ORDER BY rating DESC
    `, [lat, lng, radiusKm]);
  }

  // ─── JOB OFFERS ──────────────────────────────────────────────────────────────

  async createJobOffer(employerId: string, dto: Partial<JobOffer>): Promise<JobOffer> {
    const offer = this.offerRepo.create({ ...dto, employer_id: employerId });
    if (dto.parcel_id) {
      const parcel = await this.dataSource.getRepository(Parcel).findOne({ where: { id: dto.parcel_id } });
      if (parcel) {
        offer.lat = parcel.center_lat ?? parcel.lat ?? null;
        offer.lng = parcel.center_lng ?? parcel.lng ?? null;
      }
    }
    let saved: JobOffer;
    try {
      saved = await this.offerRepo.save(offer);
    } catch (e) {
      this.logger.error(`Failed to save job offer: ${e.message}`, e.stack);
      throw new BadRequestException(`Database error: ${e.message}`);
    }

    // Notify nearby workers (async, non-blocking)
    if (saved.lat && saved.lng) {
      this.notifyNearbyWorkers(saved).catch(e => this.logger.warn(`Spatial notify failed: ${e.message}`));
    }
    return saved;
  }

  private async notifyNearbyWorkers(offer: JobOffer): Promise<void> {
    if (!offer.lat || !offer.lng) return;
    const workers = await this.findWorkersNearLocation(offer.lat, offer.lng, 15);
    this.logger.log(`[Spatial] Notifying ${workers.length} workers near job offer ${offer.id}`);
    for (const w of workers) {
      if ((w as any).fcm_token) {
        await this.notificationService.sendPushToUser(w.user_id, {
          title: `Nouvelle offre de travail — ${offer.task_type}`,
          message: `${offer.daily_pay_tnd} TND/jour · ${offer.duration_days} jours · Début: ${offer.start_date}`,
          payload: { type: 'JOB_OFFER', job_offer_id: offer.id },
        }).catch(() => {/* ignore individual FCM errors */});
      }
    }
  }

  async findJobOffers(governorate?: string, taskType?: string, fromDate?: string, page = 1, limit = 10): Promise<PaginatedResult<JobOffer>> {
    const qb = this.offerRepo.createQueryBuilder('jo')
      .leftJoinAndSelect('jo.employer', 'u')
      .leftJoinAndSelect('jo.parcel', 'p')
      .where('jo.status = :status', { status: JobOfferStatus.OPEN });
    if (governorate) qb.andWhere('jo.governorate ILIKE :governorate', { governorate: `%${governorate}%` });
    if (taskType) qb.andWhere('jo.task_type ILIKE :taskType', { taskType: `%${taskType}%` });
    if (fromDate) qb.andWhere('jo.start_date >= :fromDate', { fromDate });
    
    qb.orderBy('jo.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    
    return {
      items,
      total,
      page,
      limit,
      hasNext: (page * limit) < total
    };
  }

  async findJobOffersNearLocation(lat: number, lng: number, radiusKm = 30): Promise<JobOffer[]> {
    return this.dataSource.query(`
      SELECT jo.*, u.name as employer_name, u.phone as employer_phone
      FROM job_offers jo
      LEFT JOIN users u ON u.id = jo.employer_id
      WHERE jo.status = 'OPEN'
        AND jo.location IS NOT NULL
        AND ST_DWithin(
          jo.location,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
          $3 * 1000
        )
      ORDER BY jo.created_at DESC
    `, [lat, lng, radiusKm]);
  }

  async findJobOfferById(id: string): Promise<JobOffer> {
    const offer = await this.offerRepo.findOne({ where: { id }, relations: ['employer', 'parcel'] });
    if (!offer) throw new NotFoundException(`Offre d'emploi ${id} introuvable`);
    return offer;
  }

  async updateJobOfferStatus(id: string, employerId: string, status: JobOfferStatus): Promise<JobOffer> {
    const offer = await this.findJobOfferById(id);
    if (offer.employer_id !== employerId) throw new ForbiddenException('Accès refusé');
    offer.status = status;
    return this.offerRepo.save(offer);
  }

  async updateJobOffer(id: string, employerId: string, dto: Partial<JobOffer>): Promise<JobOffer> {
    const offer = await this.findJobOfferById(id);
    if (offer.employer_id !== employerId) throw new ForbiddenException('Accès refusé');
    if (offer.status !== JobOfferStatus.OPEN) throw new BadRequestException('Seules les offres OPEN peuvent être modifiées');
    
    // Only allow updating certain fields
    if (dto.task_type) offer.task_type = dto.task_type;
    if (dto.description !== undefined) offer.description = dto.description;
    if (dto.start_date) offer.start_date = dto.start_date;
    if (dto.duration_days) offer.duration_days = dto.duration_days;
    if (dto.workers_needed) offer.workers_needed = dto.workers_needed;
    if (dto.daily_pay_tnd) offer.daily_pay_tnd = dto.daily_pay_tnd;
    if (dto.governorate) offer.governorate = dto.governorate;

    if (dto.parcel_id !== undefined) {
      offer.parcel_id = dto.parcel_id || null;
      if (dto.parcel_id) {
        const parcel = await this.dataSource.getRepository(Parcel).findOne({ where: { id: dto.parcel_id } });
        if (parcel) {
          offer.lat = parcel.center_lat ?? parcel.lat ?? null;
          offer.lng = parcel.center_lng ?? parcel.lng ?? null;
        }
      } else {
        offer.lat = null;
        offer.lng = null;
      }
    }

    return this.offerRepo.save(offer);
  }

  async deleteJobOffer(offerId: string, employerId: string): Promise<void> {
    const offer = await this.findJobOfferById(offerId);
    if (offer.employer_id !== employerId) throw new ForbiddenException('Accès refusé — cette offre ne vous appartient pas');
    if (offer.status !== JobOfferStatus.OPEN) throw new BadRequestException('Seules les offres OPEN peuvent être supprimées');
    // Soft-delete: preserve history and related applications
    offer.status = JobOfferStatus.CANCELLED;
    await this.offerRepo.save(offer);
  }

  async getMyJobOffers(employerId: string): Promise<JobOffer[]> {
    return this.offerRepo.find({
      where: { employer_id: employerId },
      order: { created_at: 'DESC' },
    });
  }

  // ─── JOB APPLICATIONS ────────────────────────────────────────────────────────

  async applyToJob(workerId: string, jobOfferId: string, coverMessage?: string, proposedDailyRate?: number): Promise<JobApplication> {
    const profile = await this.workerRepo.findOne({ where: { user_id: workerId } });
    if (!profile) throw new BadRequestException('Créez votre profil travailleur avant de postuler');

    const offer = await this.findJobOfferById(jobOfferId);
    if (offer.status !== JobOfferStatus.OPEN) throw new BadRequestException('Cette offre est fermée');

    // Prevent duplicate application
    const existing = await this.applicationRepo.findOne({
      where: { job_offer_id: jobOfferId, worker_profile_id: profile.id },
    });
    if (existing) throw new BadRequestException('Vous avez déjà postulé à cette offre');

    const app = this.applicationRepo.create({
      job_offer_id: jobOfferId,
      worker_profile_id: profile.id,
      cover_message: coverMessage,
      proposed_daily_rate_tnd: proposedDailyRate ?? (Number(profile.daily_rate_tnd) || null),
    });
    const saved = await this.applicationRepo.save(app);

    // Notify employer — push notification
    await this.notificationService.sendToUsers(
      [offer.employer_id],
      '👷 Nouvelle candidature reçue',
      `Un travailleur a postulé à votre offre "${offer.task_type}". Consultez les candidatures dans votre tableau de bord.`,
      { type: 'NEW_APPLICATION', job_offer_id: jobOfferId, application_id: saved.id, task_type: offer.task_type }
    ).catch(() => {});

    // Sprint 1: Real-time WS event to employer — update HR panel without page refresh
    this.notificationGateway.sendToUser(offer.employer_id, 'job_application_new', {
      application_id: saved.id,
      worker_name: profile.user?.name || 'Travailleur',
      worker_profile_id: profile.id,
      worker_rating: profile.rating,
      worker_skills: profile.skills,
      job_offer_id: jobOfferId,
      task_type: offer.task_type,
      cover_message: coverMessage ?? null,
      applied_at: saved.applied_at,
    });

    return saved;
  }

  // Sprint 1: Accept application — emit real-time WS event to worker with full mission context
  async acceptApplication(applicationId: string, employerId: string): Promise<JobApplication> {
    const app = await this.applicationRepo.findOne({
      where: { id: applicationId },
      relations: ['jobOffer', 'jobOffer.parcel', 'jobOffer.employer', 'workerProfile', 'workerProfile.user'],
    });
    if (!app) throw new NotFoundException(`Candidature ${applicationId} introuvable`);
    if (app.jobOffer.employer_id !== employerId) throw new ForbiddenException('Accès refusé');

    const offer = app.jobOffer;
    const parcel = offer.parcel;
    const parcelLat = parcel?.center_lat ?? parcel?.lat ?? offer.lat ?? null;
    const parcelLng = parcel?.center_lng ?? parcel?.lng ?? offer.lng ?? null;
    const estimatedTotalTnd = Number(offer.daily_pay_tnd) * Number(offer.duration_days);

    const navigationDeepLink = (parcelLat !== null && parcelLng !== null)
      ? `geo:${parcelLat},${parcelLng}?q=${parcelLat},${parcelLng}(Parcelle ZirIA)`
      : null;

    app.status = ApplicationStatus.ACCEPTED;
    app.navigation_deep_link = navigationDeepLink;
    app.mission_context_snapshot = {
      parcel_name: parcel?.name ?? 'N/A',
      surface_ha: parcel?.surface_ha ? Number(parcel.surface_ha) : null,
      center_gps: (parcelLat !== null && parcelLng !== null) ? { lat: Number(parcelLat), lng: Number(parcelLng) } : null,
      boundary_geojson: parcel?.boundary ?? null,
      crop_type: parcel?.crop_type ?? 'N/A',
      task_type: offer.task_type,
      description: offer.description ?? '',
      daily_pay_tnd: Number(offer.daily_pay_tnd),
      duration_days: Number(offer.duration_days),
      estimated_total_earnings_tnd: estimatedTotalTnd,
      start_date: offer.start_date,
      employer_name: offer.employer?.name ?? 'Employeur',
      employer_phone: offer.employer?.phone ?? null,
      navigation_deep_link: navigationDeepLink,
    };

    const saved = await this.applicationRepo.save(app);

    // Push notification
    await this.notificationService.sendToUsers(
      [app.workerProfile.user_id],
      '✅ Candidature acceptée',
      `Félicitations! Votre candidature pour "${offer.task_type}" a été acceptée.`,
      { type: 'APPLICATION_ACCEPTED', application_id: applicationId, job_offer_id: app.job_offer_id, task_type: offer.task_type }
    ).catch(() => {});

    // Sprint 1: Real-time WS event to worker — update status badge instantly
    this.notificationGateway.sendToUser(app.workerProfile.user_id, 'job_application_status_changed', {
      application_id: applicationId,
      status: ApplicationStatus.ACCEPTED,
      job_offer_id: app.job_offer_id,
      job_offer_title: offer.task_type,
      employer_name: offer.employer?.name ?? 'Employeur',
      parcel_lat: parcelLat,
      parcel_lng: parcelLng,
      daily_pay_tnd: offer.daily_pay_tnd,
      duration_days: offer.duration_days,
      estimated_total_tnd: estimatedTotalTnd.toFixed(3),
      start_date: offer.start_date,
    });

    // Sprint 4: Create JOB mission contract
    const commissionRate = 0.08; // 8% platform commission for jobs
    const grossAmount = estimatedTotalTnd;
    const commissionAmount = grossAmount * commissionRate;
    
    const computedEndDate = new Date(offer.start_date);
    computedEndDate.setDate(computedEndDate.getDate() + Number(offer.duration_days));

    await this.contractService.createContract({
      contract_type: ContractType.JOB_MISSION,
      reference_id: saved.id,
      initiator_id: employerId,
      counterparty_id: app.workerProfile.user_id,
      total_amount_tnd: grossAmount,
      commission_amount_tnd: commissionAmount,
      navigation_deep_link: navigationDeepLink,
      terms_snapshot: {
        initiator_name: offer.employer?.name ?? 'Employeur',
        counterparty_name: app.workerProfile.user?.name ?? 'Travailleur',
        task_type: offer.task_type,
        crop_type: offer.parcel?.crop_type ?? 'N/A',
        daily_rate_tnd: offer.daily_pay_tnd,
        duration_days: offer.duration_days,
        start_date: offer.start_date,
        end_date: computedEndDate.toISOString().split('T')[0],
        notes: offer.description,
      },
    }).catch(e => this.logger.warn(`Contract creation failed: ${e.message}`));

    return saved;
  }

  // Sprint 1: Reject application — emit real-time WS event to worker
  async rejectApplication(applicationId: string, employerId: string): Promise<JobApplication> {
    const app = await this.applicationRepo.findOne({
      where: { id: applicationId },
      relations: ['jobOffer', 'jobOffer.employer', 'workerProfile'],
    });
    if (!app) throw new NotFoundException(`Candidature ${applicationId} introuvable`);
    if (app.jobOffer.employer_id !== employerId) throw new ForbiddenException('Accès refusé');
    app.status = ApplicationStatus.REJECTED;
    const saved = await this.applicationRepo.save(app);

    await this.notificationService.sendToUsers(
      [app.workerProfile.user_id],
      '❌ Candidature non retenue',
      `Votre candidature pour "${app.jobOffer.task_type}" n'a pas été retenue cette fois-ci. Continuez à postuler!`,
      { type: 'APPLICATION_REJECTED', application_id: applicationId, job_offer_id: app.job_offer_id, task_type: app.jobOffer.task_type }
    ).catch(() => {});

    // Sprint 1: Real-time WS event to worker
    this.notificationGateway.sendToUser(app.workerProfile.user_id, 'job_application_status_changed', {
      application_id: applicationId,
      status: ApplicationStatus.REJECTED,
      job_offer_id: app.job_offer_id,
      job_offer_title: app.jobOffer.task_type,
      employer_name: app.jobOffer.employer?.name ?? 'Employeur',
    });

    return saved;
  }

  // Sprint 6: Farmer gets their job offers with embedded applications (HR panel)
  async getMyOffersWithApplications(employerId: string): Promise<any[]> {
    const offers = await this.offerRepo.find({
      where: { employer_id: employerId },
      relations: ['parcel'],
      order: { created_at: 'DESC' },
    });
    const result = await Promise.all(offers.map(async (offer) => {
      const applications = await this.dataSource.query(`
        SELECT ja.id, ja.status, ja.applied_at, ja.cover_message,
               wp.id as worker_profile_id, wp.skills, wp.rating, wp.total_jobs_done,
               wp.bio, wp.daily_rate_tnd, wp.governorate as worker_governorate,
               u.name as worker_name, u.phone as worker_phone, u.id as worker_user_id
        FROM job_applications ja
        JOIN worker_profiles wp ON wp.id = ja.worker_profile_id
        JOIN users u ON u.id = wp.user_id
        WHERE ja.job_offer_id = $1
        ORDER BY ja.applied_at DESC
      `, [offer.id]);

      const applicationsWithCerts = await Promise.all(applications.map(async (app) => {
        const certs = await this.dataSource.query(`
          SELECT id, certification_name, issuing_organization, issued_date, verification_status, document_url
          FROM worker_certifications
          WHERE worker_profile_id = $1
          ORDER BY issued_date DESC
        `, [app.worker_profile_id]);
        return { ...app, certifications: certs };
      }));

      return { ...offer, applications: applicationsWithCerts };
    }));
    return result;
  }

  async getMyApplications(workerId: string): Promise<JobApplication[]> {
    const profile = await this.workerRepo.findOne({ where: { user_id: workerId } });
    if (!profile) return [];
    return this.applicationRepo.find({
      where: { worker_profile_id: profile.id },
      relations: ['jobOffer', 'jobOffer.employer'],
      order: { applied_at: 'DESC' },
    });
  }

  async getApplicationsForOffer(jobOfferId: string, employerId: string): Promise<any[]> {
    const offer = await this.findJobOfferById(jobOfferId);
    if (offer.employer_id !== employerId) throw new ForbiddenException('Accès refusé');
    const apps = await this.applicationRepo.find({
      where: { job_offer_id: jobOfferId },
      relations: ['workerProfile', 'workerProfile.user'],
      order: { applied_at: 'DESC' },
    });
    return apps.map(a => ({
      id: a.id,
      offer_id: a.job_offer_id,
      worker_id: a.workerProfile?.user_id,
      worker_profile_id: a.worker_profile_id,
      user: a.workerProfile ? {
        id: a.workerProfile.user_id,
        name: a.workerProfile.user?.name,
        phone: a.workerProfile.user?.phone,
        avatar_url: null,
        governorate: a.workerProfile.governorate,
        rating: Number(a.workerProfile.rating) || 0,
      } : undefined,
      competencies: a.workerProfile?.skills || [],
      proposed_daily_rate_tnd: Number(a.proposed_daily_rate_tnd) || 0,
      cover_message: a.cover_message || '',
      status: a.status,
      created_at: a.applied_at,
    }));
  }

  async updateApplicationStatus(
    applicationId: string,
    employerId: string,
    status: ApplicationStatus,
  ): Promise<JobApplication> {
    const app = await this.applicationRepo.findOne({
      where: { id: applicationId },
      relations: ['jobOffer', 'workerProfile', 'workerProfile.user'],
    });
    if (!app) throw new NotFoundException(`Candidature ${applicationId} introuvable`);
    if (app.jobOffer.employer_id !== employerId) throw new ForbiddenException('Accès refusé');
    app.status = status;
    const saved = await this.applicationRepo.save(app);

    if (status === ApplicationStatus.COMPLETED) {
      await this.recordEarning(applicationId).catch(err => {
        this.logger.error(`Failed to record earning for application ${applicationId}: ${err.message}`, err.stack);
      });

      await this.walletService.releaseToAvailable(
        app.workerProfile.user_id,
        applicationId,
        this.dataSource.manager
      );

      await this.notificationService.sendToUsers(
        [app.workerProfile.user_id],
        '🎉 Mission complétée !',
        `Votre mission "${app.jobOffer.task_type}" a été marquée comme terminée. Bravo !`,
        {
          type: 'MISSION_COMPLETED',
          applicationId,
          navigateTo: '/dashboard/worker/missions',
        }
      ).catch(() => {});
    }

    return saved;
  }

  async rateWorker(
    applicationId: string,
    employerId: string,
    rating: number,
    notes?: string,
  ): Promise<JobApplication> {
    const app = await this.applicationRepo.findOne({
      where: { id: applicationId },
      relations: ['jobOffer', 'workerProfile'],
    });
    if (!app) throw new NotFoundException('Candidature introuvable');
    if (app.jobOffer.employer_id !== employerId) throw new ForbiddenException('Accès refusé');
    if (app.status !== ApplicationStatus.COMPLETED) {
      throw new BadRequestException('La mission doit être complétée avant notation');
    }

    app.employer_rating = rating;
    app.employer_notes = notes ?? null;
    await this.applicationRepo.save(app);

    // Recalculate worker average rating
    const allRated = await this.applicationRepo.find({
      where: { worker_profile_id: app.worker_profile_id },
    });
    const ratings = allRated.filter(a => a.employer_rating !== null).map(a => Number(a.employer_rating));
    if (ratings.length > 0) {
      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      await this.workerRepo.update(app.worker_profile_id, {
        rating: Math.round(avg * 100) / 100,
        total_jobs_done: allRated.filter(a => a.status === ApplicationStatus.COMPLETED).length,
      });
    }
    return app;
  }

  // ─── CERTIFICATIONS (NOUVEAU) ──────────────────────────────────────────────

  async addCertification(userId: string, dto: any): Promise<WorkerCertification> {
    const profile = await this.workerRepo.findOne({
      where: { user_id: userId },
      relations: ['user'],
    });
    if (!profile) {
      throw new BadRequestException("Profil travailleur inexistant. Veuillez d'abord créer votre profil.");
    }

    // FIX 1 (Phase 3) — garantir un governorate exploitable avant insert :
    // worker_profiles.governorate n'est jamais auto-copié dans upsertProfile,
    // donc on le repeuple depuis users.governorate (relation déjà chargée).
    // Si les deux sont null → rejet explicite plutôt qu'une donnée inexploitable.
    let workerGov: string | null =
      typeof profile.governorate === 'string' && profile.governorate.trim() !== ''
        ? profile.governorate.trim()
        : null;
    if (!workerGov) {
      const userGov: string | null =
        profile.user && typeof (profile.user as any).governorate === 'string' &&
        (profile.user as any).governorate.trim() !== ''
          ? (profile.user as any).governorate.trim()
          : null;
      if (!userGov) {
        throw new BadRequestException(
          'Complétez votre gouvernorat dans le profil avant de soumettre une certification.'
        );
      }
      workerGov = userGov;
      profile.governorate = userGov;
      await this.workerRepo.save(profile);
    }

    const cert = this.certRepo.create({
      ...dto,
      worker_profile_id: profile.id,
      verification_status: CertificationStatus.PENDING,
    });
    const saved = (await this.certRepo.save(cert as any)) as unknown as WorkerCertification;

    // Notify ambassadors of the same governorate (normalized: trim + lowercase)
    if (workerGov) {
      const ambassadors = await this.dataSource.query(`
        SELECT id FROM users
        WHERE role = 'FARMER_AMBASSADOR' AND TRIM(LOWER(governorate)) = TRIM(LOWER($1))
      `, [workerGov]);

      const ambassadorIds = ambassadors.map(a => a.id);
      if (ambassadorIds.length > 0) {
        const workerName = profile.user?.name || 'Un travailleur';
        await this.notificationService.sendToUsers(
          ambassadorIds,
          '🎓 Nouvelle certification à valider',
          `Le travailleur ${workerName} a soumis une certification : ${dto.certification_name}`,
          {
            type: 'CERTIFICATION_PENDING',
            certificationId: saved.id,
            workerProfileId: profile.id,
          }
        ).catch(() => {});
      }
    }
    return saved;
  }

  async getMyCertifications(userId: string): Promise<WorkerCertification[]> {
    const profile = await this.workerRepo.findOne({ where: { user_id: userId } });
    if (!profile) return [];

    return this.certRepo.createQueryBuilder('c')
      .where('c.worker_profile_id = :profileId', { profileId: profile.id })
      .orderBy(`CASE c.verification_status
        WHEN 'VERIFIED' THEN 1
        WHEN 'PENDING' THEN 2
        WHEN 'REJECTED' THEN 3
        ELSE 4
      END`, 'ASC')
      .addOrderBy('c.created_at', 'DESC')
      .getMany();
  }

  async deleteCertification(userId: string, certificationId: string): Promise<{ success: boolean }> {
    const profile = await this.workerRepo.findOne({ where: { user_id: userId } });
    if (!profile) throw new ForbiddenException('Accès refusé');

    const cert = await this.certRepo.findOne({ where: { id: certificationId } });
    if (!cert) throw new NotFoundException('Certification introuvable');
    if (cert.worker_profile_id !== profile.id) throw new ForbiddenException('Accès refusé');
    if (cert.verification_status !== CertificationStatus.PENDING) {
      throw new BadRequestException('Seules les certifications en attente de validation peuvent être supprimées.');
    }

    await this.certRepo.remove(cert);
    return { success: true };
  }

  async verifyCertification(
    ambassadorUserId: string,
    certificationId: string,
    approved: boolean,
    rejectionReason?: string,
  ): Promise<WorkerCertification> {
    const cert = await this.certRepo.findOne({
      where: { id: certificationId },
      relations: ['workerProfile', 'workerProfile.user'],
    });
    if (!cert) throw new NotFoundException('Certification introuvable');

    const ambassador = await this.dataSource.query(`
      SELECT id, role, governorate FROM users WHERE id = $1
    `, [ambassadorUserId]);
    if (!ambassador || ambassador.length === 0) throw new ForbiddenException('Utilisateur introuvable');
    const amb = ambassador[0];

    if (amb.role !== 'FARMER_AMBASSADOR' && amb.role !== 'ADMIN') {
      throw new ForbiddenException('Seuls les ambassadeurs ou les administrateurs peuvent valider les certifications.');
    }

    // FIX 2 (Phase 3) — comparaison normalisée (trim + lowercase des deux côtés).
    // Pas de liste canonique des 24 gouvernorats côté backend (seed.ts = données
    // de référence uniquement, pas d'enum/validateur) → pas de validation ajoutée (hors scope).
    const normAmbGov =
      typeof amb.governorate === 'string' ? amb.governorate.trim().toLowerCase() : '';
    const normWorkerGov =
      cert.workerProfile && typeof cert.workerProfile.governorate === 'string'
        ? cert.workerProfile.governorate.trim().toLowerCase()
        : '';
    if (amb.role === 'FARMER_AMBASSADOR' && normAmbGov !== normWorkerGov) {
      throw new ForbiddenException('Vous ne pouvez valider que les certifications des travailleurs de votre gouvernorat.');
    }

    cert.verification_status = approved ? CertificationStatus.VERIFIED : CertificationStatus.REJECTED;
    cert.is_verified_by_ambassador = approved;
    cert.verified_by_id = ambassadorUserId;
    cert.verified_at = new Date();
    cert.rejection_reason = approved ? null : (rejectionReason || null);

    const saved = await this.certRepo.save(cert);

    // Phase 3 : le profil Worker reflète le statut — badge "certifié" une fois VALIDATED.
    if (approved && cert.workerProfile && !cert.workerProfile.is_ambassador_validated) {
      cert.workerProfile.is_ambassador_validated = true;
      await this.workerRepo.save(cert.workerProfile);
    }

    // Notify worker
    const workerUserId = cert.workerProfile.user_id;
    if (approved) {
      await this.notificationService.sendToUsers(
        [workerUserId],
        '✅ Certification validée !',
        `Votre certification "${cert.certification_name}" a été vérifiée et approuvée par l'ambassadeur de votre région.`,
        {
          type: 'CERTIFICATION_VERIFIED',
          certificationId: cert.id,
          navigateTo: '/dashboard/worker/profile',
        }
      ).catch(() => {});
    } else {
      await this.notificationService.sendToUsers(
        [workerUserId],
        '❌ Certification non validée',
        `Votre certification "${cert.certification_name}" n'a pas pu être validée. Motif : ${rejectionReason || 'Non spécifié'}`,
        {
          type: 'CERTIFICATION_REJECTED',
          certificationId: cert.id,
          navigateTo: '/dashboard/worker/profile',
        }
      ).catch(() => {});
    }

    return saved;
  }

  // ─── RATINGS ───────────────────────────────────────────────────────────────

  async getMyRatings(userId: string): Promise<any[]> {
    const profile = await this.workerRepo.findOne({ where: { user_id: userId } });
    if (!profile) return [];

    const ratings = await this.applicationRepo.createQueryBuilder('ja')
      .leftJoinAndSelect('ja.jobOffer', 'jo')
      .leftJoinAndSelect('jo.employer', 'u')
      .where('ja.worker_profile_id = :profileId', { profileId: profile.id })
      .andWhere('ja.employer_rating IS NOT NULL')
      .orderBy('ja.updated_at', 'DESC')
      .getMany();

    return ratings.map(r => ({
      application_id: r.id,
      task_type: r.jobOffer.task_type,
      employer_name: r.jobOffer.employer?.name || 'Employeur',
      employer_governorate: r.jobOffer.employer?.governorate || '',
      rating: Number(r.employer_rating),
      notes: r.employer_notes,
      mission_date: r.jobOffer.start_date,
    }));
  }

  // ─── REVENUS (NOUVEAU) ─────────────────────────────────────────────────────

  async recordEarning(applicationId: string): Promise<WorkerEarnings> {
    const existing = await this.earningsRepo.findOne({ where: { job_application_id: applicationId } });
    if (existing) return existing;

    const app = await this.applicationRepo.findOne({
      where: { id: applicationId },
      relations: ['jobOffer'],
    });
    if (!app) throw new NotFoundException(`Candidature ${applicationId} introuvable`);

    const dailyPay = Number(app.jobOffer.daily_pay_tnd);
    const duration = Number(app.jobOffer.duration_days);
    const totalEarned = dailyPay * duration;

    const earning = this.earningsRepo.create({
      worker_profile_id: app.worker_profile_id,
      job_application_id: applicationId,
      job_offer_id: app.job_offer_id,
      employer_id: app.jobOffer.employer_id,
      task_type: app.jobOffer.task_type,
      duration_days: duration,
      daily_pay_tnd: dailyPay,
      total_earned_tnd: totalEarned,
      governorate: app.jobOffer.governorate,
      work_start_date: app.jobOffer.start_date,
    });

    return this.earningsRepo.save(earning);
  }

  async getMyEarnings(userId: string): Promise<any> {
    const profile = await this.workerRepo.findOne({ where: { user_id: userId } });
    if (!profile) {
      return {
        earnings: [],
        stats: {
          total_earned_all_time: 0,
          total_earned_this_month: 0,
          total_missions_completed: 0,
          average_daily_rate: 0,
        },
      };
    }

    const earnings = await this.earningsRepo.find({
      where: { worker_profile_id: profile.id },
      order: { work_start_date: 'DESC' },
    });

    const totalAllTime = earnings.reduce((sum, e) => sum + Number(e.total_earned_tnd), 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const totalThisMonth = earnings
      .filter(e => new Date(e.completed_at || e.work_start_date) >= startOfMonth)
      .reduce((sum, e) => sum + Number(e.total_earned_tnd), 0);

    const totalMissions = earnings.length;
    const avgDailyRate = totalMissions > 0
      ? earnings.reduce((sum, e) => sum + Number(e.daily_pay_tnd), 0) / totalMissions
      : 0;

    return {
      earnings,
      stats: {
        total_earned_all_time: Math.round(totalAllTime * 100) / 100,
        total_earned_this_month: Math.round(totalThisMonth * 100) / 100,
        total_missions_completed: totalMissions,
        average_daily_rate: Math.round(avgDailyRate * 100) / 100,
      },
    };
  }

  // ─── PROFIL PUBLIC (NOUVEAU) ────────────────────────────────────────────────

  async getWorkerPublicProfile(workerProfileId: string): Promise<any> {
    const profile = await this.workerRepo.findOne({
      where: { id: workerProfileId },
      relations: ['user'],
    });
    if (!profile) throw new NotFoundException('Profil travailleur introuvable');

    const certifications = await this.certRepo.find({
      where: { worker_profile_id: workerProfileId, verification_status: CertificationStatus.VERIFIED },
      order: { created_at: 'DESC' },
    });

    const ratings = await this.getMyRatings(profile.user_id);
    const latestRatings = ratings.slice(0, 5);

    return {
      profile: {
        id: profile.id,
        user_id: profile.user_id,
        name: profile.user?.name,
        phone: profile.user?.phone,
        governorate: profile.governorate,
        skills: profile.skills,
        rating: profile.rating,
        total_jobs_done: profile.total_jobs_done,
        bio: profile.bio,
        daily_rate_tnd: profile.daily_rate_tnd,
        is_available: profile.is_available,
      },
      certifications,
      ratings: latestRatings,
    };
  }

  async getWorkerAvailability(workerProfileId: string, year: number, month: number): Promise<{ date: string; available: boolean }[]> {
    const profile = await this.workerRepo.findOne({ where: { id: workerProfileId } });
    if (!profile) throw new NotFoundException('Profil travailleur introuvable');

    const daysInMonth = new Date(year, month, 0).getDate();
    const days: { date: string; available: boolean }[] = [];

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month - 1, daysInMonth);

    const activeContracts = await this.missionContractRepo.find({
      where: {
        provider_id: profile.user_id,
        status: 'IN_PROGRESS' as any,
      },
    });

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d);
      const dateStr = date.toISOString().split('T')[0];
      let available = true;

      if (profile.availability_status === 'UNAVAILABLE_UNTIL' && profile.unavailable_until_date) {
        if (date <= new Date(profile.unavailable_until_date)) available = false;
      }
      if (profile.availability_status === 'AVAILABLE_FROM' && profile.available_from_date) {
        if (date < new Date(profile.available_from_date)) available = false;
      }
      if (profile.availability_status === 'ON_MISSION') available = false;

      for (const contract of activeContracts) {
        if (contract.start_date && contract.end_date) {
          const s = new Date(contract.start_date);
          const e = new Date(contract.end_date);
          if (date >= s && date <= e) {
            available = false;
            break;
          }
        }
      }

      days.push({ date: dateStr, available });
    }

    return days;
  }

  async getMissionContext(applicationId: string, userId: string): Promise<any> {
    const app = await this.applicationRepo.findOne({
      where: { id: applicationId },
      relations: ['workerProfile'],
    });
    if (!app) throw new NotFoundException('Candidature introuvable');
    if (app.workerProfile.user_id !== userId) throw new ForbiddenException('Accès refusé');
    return app.mission_context_snapshot;
  }

  // ─── TRUSTED WORKERS ──────────────────────────────────────────────────────────

  async getTrustedWorkers(employerId: string): Promise<any[]> {
    const rows = await this.dataSource.query(`
      SELECT
        wp.id,
        wp.user_id,
        u.name,
        wp.rating,
        COUNT(ja.id)::int AS missions_count,
        u.phone,
        wp.governorate
      FROM job_applications ja
      JOIN job_offers jo ON jo.id = ja.job_offer_id
      JOIN worker_profiles wp ON wp.id = ja.worker_profile_id
      JOIN users u ON u.id = wp.user_id
      WHERE jo.employer_id = $1
        AND ja.status = 'COMPLETED'
      GROUP BY wp.id, wp.user_id, u.name, wp.rating, u.phone, wp.governorate
      ORDER BY missions_count DESC, wp.rating DESC
    `, [employerId]);

    return rows;
  }

  // ─── CONTRACT INTEGRATION ───────────────────────────────────────────────────

  async getWorkerContracts(userId: string): Promise<MissionContract[]> {
    return this.missionContractRepo.find({
      where: { provider_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  async startWorkerMission(contractId: string, userId: string): Promise<MissionContract> {
    return this.contractService.startMission(contractId, userId);
  }

  async completeWorkerMission(contractId: string, userId: string): Promise<MissionContract> {
    return this.contractService.completeMission(contractId, userId);
  }

  async searchWorkersSmart(farmerLat: number, farmerLng: number, competencies: string[]): Promise<any[]> {
    const workers = await this.dataSource.query(`
      SELECT wp.*, u.name, u.phone, u.fcm_token
      FROM worker_profiles wp
      LEFT JOIN users u ON u.id = wp.user_id
      WHERE wp.is_available = true
        AND wp.location IS NOT NULL
        AND ST_DWithin(
          wp.location,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
          wp.action_radius_km * 1000
        )
      ORDER BY wp.rating DESC
    `, [farmerLat, farmerLng]);

    return workers.map((w: any) => {
      const workerSkills: string[] = w.skills || [];
      const matchCount = competencies.filter(c =>
        workerSkills.some(s => s.toLowerCase() === c.toLowerCase())
      ).length;
      const matchPercentage = competencies.length > 0
        ? Math.round((matchCount / competencies.length) * 100)
        : 0;

      return {
        ...w,
        competency_match_percentage: matchPercentage,
        match_score: (Number(w.rating || 0) * 0.6) + (matchPercentage * 0.4),
      };
    }).sort((a: any, b: any) => b.match_score - a.match_score);
  }
}
