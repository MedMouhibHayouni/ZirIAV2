import { ForbiddenException } from '@nestjs/common';
import { PrivacyService } from '../privacy.service';
import { ConsentScope, ConsentStatus } from '../entities/data-sharing-consent.entity';

describe('Sprint 2 — Privacy Engine & Consent Center Audit (Rules 2.2 - 2.8)', () => {
  let mockConsentRepo: any;
  let mockLogRepo: any;
  let mockUserRepo: any;
  let mockDataSource: any;
  let service: PrivacyService;

  beforeEach(() => {
    mockConsentRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn((entity) => Promise.resolve({ id: 'consent-uuid-1', ...entity })),
      create: jest.fn((dto) => dto),
    };
    mockLogRepo = {
      find: jest.fn(),
      save: jest.fn((entity) => Promise.resolve({ id: 'log-uuid-1', ...entity })),
      create: jest.fn((dto) => dto),
    };
    mockUserRepo = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
    };
    mockDataSource = {};

    service = new PrivacyService(mockConsentRepo, mockLogRepo, mockUserRepo, mockDataSource);
  });

  describe('Rule 2.2 & 2.4 — Immediate Effect of Consent Revocation', () => {
    it('should IMMEDIATELY BLOCK access when consent is REVOKED', async () => {
      // Setup mock findOne to return null or status REVOKED
      mockConsentRepo.findOne.mockResolvedValue(null);

      await expect(
        service.verifyAndLogAccess(
          'inst-kas-uuid',
          'agent-1-uuid',
          'farmer-1-uuid',
          ConsentScope.IDENTITY,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should ALLOW access and log to DataAccessLog when active consent exists', async () => {
      mockConsentRepo.findOne.mockResolvedValue({
        id: 'consent-active-1',
        farmerId: 'farmer-1-uuid',
        institutionId: 'inst-kas-uuid',
        status: ConsentStatus.ACTIVE,
        scopes: [ConsentScope.IDENTITY, ConsentScope.PARCELLE],
      });

      const allowed = await service.verifyAndLogAccess(
        'inst-kas-uuid',
        'agent-1-uuid',
        'farmer-1-uuid',
        ConsentScope.IDENTITY,
        'record-123',
        'READ',
      );

      expect(allowed).toBe(true);
      expect(mockLogRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'agent-1-uuid',
          institutionId: 'inst-kas-uuid',
          farmerId: 'farmer-1-uuid',
          scope: ConsentScope.IDENTITY,
          action: 'READ',
        }),
      );
    });
  });

  describe('Rule 2.8 — Control Group Privacy Isolation Test', () => {
    it('should REJECT all institution access attempts for control group farmers with zero consent', async () => {
      // Control group farmer has no consent record
      mockConsentRepo.findOne.mockResolvedValue(null);

      const scopesToTest = [
        ConsentScope.IDENTITY,
        ConsentScope.PARCELLE,
        ConsentScope.CROP_DECLARATIONS,
        ConsentScope.DIAGNOSTICS,
        ConsentScope.DOSSIER_DOCUMENTS,
      ];

      for (const scope of scopesToTest) {
        await expect(
          service.verifyAndLogAccess(
            'inst-kas-uuid',
            'agent-1-uuid',
            'control-group-farmer-uuid',
            scope,
          ),
        ).rejects.toThrow(ForbiddenException);
      }
    });
  });

  describe('Rule 2.3 — Aggregation Cohort Threshold & Differencing Protection', () => {
    it('should return INSUFFICIENT_DATA when cohort size is below threshold (e.g. < 10)', async () => {
      const countQuery = jest.fn().mockResolvedValue(4); // Below threshold 10
      const dataQuery = jest.fn().mockResolvedValue([{ avg_yield: 45 }]);

      const result = await service.getCohortAggregate(countQuery, dataQuery, 10);

      expect(result.status).toBe('INSUFFICIENT_DATA');
      expect(result.data).toBeNull();
      expect(dataQuery).not.toHaveBeenCalled();
    });

    it('should return SUCCESS with data when cohort size equals or exceeds threshold (>= 10)', async () => {
      const countQuery = jest.fn().mockResolvedValue(15);
      const dataQuery = jest.fn().mockResolvedValue([{ avg_yield: 52 }]);

      const result = await service.getCohortAggregate(countQuery, dataQuery, 10);

      expect(result.status).toBe('SUCCESS');
      expect(result.data).toEqual([{ avg_yield: 52 }]);
      expect(dataQuery).toHaveBeenCalled();
    });
  });
});
