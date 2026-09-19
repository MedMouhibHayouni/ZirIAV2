import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '../../common/enums/role.enum';
import { InstitutionLevel } from '../enums/institution.enums';

@Injectable()
export class InstitutionScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }

    if (user.role === Role.ADMIN) {
      return true;
    }

    if (user.role !== Role.INSTITUTION) {
      throw new ForbiddenException('Accès réservé aux comptes institutionnels');
    }

    const member = user.institutionMember;
    if (!member || !member.isActive || !member.institution || !member.institution.isActive) {
      throw new ForbiddenException('Compte membre institutionnel inactif ou non rattaché');
    }

    // Attach explicit scope properties for handlers to consume
    request.institutionScope = {
      institutionId: member.institution.id,
      type: member.institution.type,
      level: member.institution.level,
      governorate: member.institution.governorate,
      officeRole: member.officeRole,
    };

    return true;
  }

  /**
   * Utility helper method to verify regional governorate matching.
   * Throws ForbiddenException if a regional office tries to access another region's data.
   */
  static verifyRegionAccess(userScope: any, targetGovernorate: string): void {
    if (userScope.level === InstitutionLevel.NATIONAL) {
      return; // National viewer handles cross-region aggregates
    }

    if (!userScope.governorate || !targetGovernorate) {
      throw new ForbiddenException('Accès refusé : périmètre régional non défini');
    }

    if (userScope.governorate.trim().toLowerCase() !== targetGovernorate.trim().toLowerCase()) {
      throw new ForbiddenException(
        `Accès refusé : la ressource (${targetGovernorate}) est hors de votre gouvernorat (${userScope.governorate})`,
      );
    }
  }
}
