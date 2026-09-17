import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Job, JobStatus } from './entities/job.entity';
import { WorkerProfile } from '../workers/entities/worker-profile.entity';
import { JobApplication, ApplicationStatus } from '../workers/entities/job-application.entity';
import { CreateJobDto, UpdateJobStatusDto } from './dto/job.dto';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(WorkerProfile)
    private readonly workerRepo: Repository<WorkerProfile>,
    @InjectRepository(JobApplication)
    private readonly applicationRepo: Repository<JobApplication>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── CRUD METHODS RE-IMPLEMENTED ──────────────────────────────────────────

  async create(dto: CreateJobDto, employerId: string): Promise<Job> {
    const job = this.jobRepo.create({
      ...dto,
      employer_id: employerId,
      status: JobStatus.OPEN,
    });
    return this.jobRepo.save(job);
  }

  async findAll(): Promise<Job[]> {
    return this.jobRepo.find({
      where: { status: JobStatus.OPEN },
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Job> {
    const job = await this.jobRepo.findOne({ where: { id } });
    if (!job) throw new NotFoundException('Offre d\'emploi non trouvée');
    return job;
  }

  async updateStatus(id: string, dto: UpdateJobStatusDto): Promise<Job> {
    const job = await this.findOne(id);
    job.status = dto.status;
    return this.jobRepo.save(job);
  }

  async remove(id: string): Promise<void> {
    const job = await this.findOne(id);
    await this.jobRepo.remove(job);
  }

  // ─── SPRINT 4 MATCHING ENGINE ─────────────────────────────────────────────

  async findMatchingWorkers(jobOfferId: string) {
    const offer = await this.jobRepo.findOne({ where: { id: jobOfferId } });
    if (!offer) throw new BadRequestException('Job offer not found');
    if (!offer.lat || !offer.lng) throw new BadRequestException('Job offer has no GPS coordinates');

    // Moteur Combiné : Spatial (20km) + GIN (Skills)
    const requiredSkill = offer.task_type;
    
    const qb = this.workerRepo.createQueryBuilder('worker')
      .where('worker.is_available = true')
      .andWhere('ST_DWithin(worker.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, 20000)') // 20km radius
      .andWhere(':skill = ANY(worker.skills)') 
      .setParameter('lng', offer.lng)
      .setParameter('lat', offer.lat)
      .setParameter('skill', requiredSkill)
      .orderBy('worker.rating', 'DESC');

    return qb.getMany();
  }

  async applyForJob(jobOfferId: string, workerProfileId: string) {
     const queryRunner = this.dataSource.createQueryRunner();
     await queryRunner.connect();
     await queryRunner.startTransaction();

     try {
        const offer = await queryRunner.manager.findOne(Job, {
           where: { id: jobOfferId },
           lock: { mode: 'pessimistic_write' }
        });

        if (!offer) throw new BadRequestException('Job offer not found');
        if (offer.status !== JobStatus.OPEN) throw new BadRequestException('Job is not open');

        const existingApp = await queryRunner.manager.findOne(JobApplication, {
           where: { job_offer_id: jobOfferId, worker_profile_id: workerProfileId }
        });
        
        if (existingApp) {
           throw new BadRequestException('Worker has already applied to this job');
        }

        const application = queryRunner.manager.create(JobApplication, {
           job_offer_id: jobOfferId,
           worker_profile_id: workerProfileId,
           status: ApplicationStatus.PENDING
        });

        await queryRunner.manager.save(application);

        await queryRunner.commitTransaction();
        return application;
     } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
     } finally {
        await queryRunner.release();
     }
  }
}
