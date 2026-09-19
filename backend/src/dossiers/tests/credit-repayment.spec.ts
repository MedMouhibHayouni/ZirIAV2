import { Test, TestingModule } from '@nestjs/testing';
import { DossiersService } from '../dossiers.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InstitutionDossier } from '../entities/dossier.entity';
import { DossierDocument } from '../entities/dossier-document.entity';
import { DossierStatusHistory } from '../entities/dossier-status-history.entity';
import { CreditDetails, CreditStatus } from '../entities/credit-details.entity';
import { CreditDisbursement } from '../entities/credit-disbursement.entity';
import { RepaymentInstallment, InstallmentStatus } from '../entities/repayment-installment.entity';
import { ProjectMilestone } from '../entities/project-milestone.entity';
import { FieldVisit } from '../entities/field-visit.entity';
import { Institution } from '../../institutions/entities/institution.entity';
import { User } from '../../users/entities/user.entity';
import { UploadService } from '../../upload/upload.service';
import { DataSource } from 'typeorm';

describe('Sprint 4 — Credit, Repayment & Project Follow-up', () => {
  let service: DossiersService;
  let installmentRepo: any;

  beforeEach(async () => {
    installmentRepo = {
      create: jest.fn().mockImplementation((i) => i),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      save: jest.fn().mockImplementation((arr) => Promise.resolve(arr)),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 3 }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DossiersService,
        { provide: getRepositoryToken(InstitutionDossier), useValue: {} },
        { provide: getRepositoryToken(DossierDocument), useValue: {} },
        { provide: getRepositoryToken(DossierStatusHistory), useValue: {} },
        { provide: getRepositoryToken(CreditDetails), useValue: {
          findOne: jest.fn().mockResolvedValue({
            id: 'credit-1',
            requestedAmountTnd: 24000,
            approvedAmountTnd: 24000,
            status: CreditStatus.PREPARATION,
          }),
          save: jest.fn().mockImplementation((c) => Promise.resolve(c)),
        }},
        { provide: getRepositoryToken(CreditDisbursement), useValue: {
          create: jest.fn().mockImplementation((d) => d),
          save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
        }},
        { provide: getRepositoryToken(RepaymentInstallment), useValue: installmentRepo },
        { provide: getRepositoryToken(ProjectMilestone), useValue: {} },
        { provide: getRepositoryToken(FieldVisit), useValue: {} },
        { provide: getRepositoryToken(Institution), useValue: {} },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: UploadService, useValue: {} },
        { provide: DataSource, useValue: {} },
      ],
    }).compile();

    service = module.get<DossiersService>(DossiersService);
  });

  describe('generateSchedule', () => {
    it('should generate N installments with equal principal division', async () => {
      const installments = await service.generateSchedule('credit-1', {
        installmentsCount: 12,
        firstDueDate: '2026-10-01T00:00:00.000Z',
      });

      expect(installments).toHaveLength(12);
      expect(installments[0].amountTnd).toBe(2000); // 24000 / 12
      expect(installments[0].status).toBe(InstallmentStatus.PENDING);
      expect(installments[11].installmentNumber).toBe(12);
    });
  });

  describe('handleDailyRepaymentJob (Scheduled Job)', () => {
    it('should be idempotent and mark past-due pending installments as LATE', async () => {
      const result = await service.handleDailyRepaymentJob();
      expect(result.markedLateCount).toBe(3);
    });
  });
});
