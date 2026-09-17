import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ExpertProfile } from '../../expert/entities/expert-profile.entity';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class ExpertProfileCompletedGuard implements CanActivate {
  constructor(private dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    if (user.role !== Role.EXPERT) {
      return true;
    }

    if (request.url.includes('/expert/profile/complete')) {
      return true;
    }

    const repo = this.dataSource.getRepository(ExpertProfile);
    const profile = await repo.findOne({ where: { user_id: user.id } });

    if (!profile || !profile.is_profile_completed) {
      throw new ForbiddenException(
        "Accès bloqué. Vous devez compléter votre profil d'expert via PATCH /expert/profile/complete"
      );
    }

    return true;
  }
}
