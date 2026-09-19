import { ForbiddenException } from '@nestjs/common';
import { InstitutionScopeGuard } from '../guards/institution-scope.guard';
import { InstitutionLevel, InstitutionType, OfficeRole } from '../enums/institution.enums';
import { Role } from '../../common/enums/role.enum';
import { AuthService } from '../../auth/auth.service';

describe('Sprint 1 — Institutions Identity & Scoping Audit', () => {
  describe('InstitutionScopeGuard — Regional Scoping', () => {
    it('should ALLOW access when agent governorate matches target resource governorate', () => {
      const scope = {
        institutionId: 'inst-kas-uuid',
        type: InstitutionType.APIA,
        level: InstitutionLevel.REGIONAL,
        governorate: 'Kasserine',
        officeRole: OfficeRole.AGENT,
      };

      expect(() => {
        InstitutionScopeGuard.verifyRegionAccess(scope, 'Kasserine');
      }).not.toThrow();
    });

    it('should REJECT access (ForbiddenException) when APIA agent of Kasserine accesses Sidi Bouzid resource', () => {
      const scope = {
        institutionId: 'inst-kas-uuid',
        type: InstitutionType.APIA,
        level: InstitutionLevel.REGIONAL,
        governorate: 'Kasserine',
        officeRole: OfficeRole.AGENT,
      };

      expect(() => {
        InstitutionScopeGuard.verifyRegionAccess(scope, 'Sidi Bouzid');
      }).toThrow(ForbiddenException);
    });

    it('should ALLOW cross-region access for NATIONAL level viewers', () => {
      const scope = {
        institutionId: 'inst-nat-uuid',
        type: InstitutionType.APIA,
        level: InstitutionLevel.NATIONAL,
        governorate: null,
        officeRole: OfficeRole.VIEWER,
      };

      expect(() => {
        InstitutionScopeGuard.verifyRegionAccess(scope, 'Sidi Bouzid');
      }).not.toThrow();
    });
  });

  describe('AuthService — Public Signup Protection', () => {
    it('should REJECT public registration with INSTITUTION role', async () => {
      const mockUserRepo: any = {
        createQueryBuilder: jest.fn(),
        findOne: jest.fn(),
      };
      const mockJwtService: any = {};
      const mockDataSource: any = {};

      const authService = new AuthService(mockUserRepo, mockJwtService, mockDataSource);

      const dto: any = {
        name: 'Tentative Institution',
        email: 'hacker@institution.tn',
        password: 'Password123!',
        role: Role.INSTITUTION,
      };

      await expect(authService.register(dto)).rejects.toThrow(ForbiddenException);
    });
  });
});
