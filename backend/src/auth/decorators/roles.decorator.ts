import { SetMetadata } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum';

/** Clé de métadonnée utilisée par RolesGuard */
export const ROLES_KEY = 'roles';

/**
 * Décorateur pour restreindre l'accès à un ou plusieurs rôles.
 * Usage : @Roles(Role.ADMIN, Role.COOP_PRESIDENT)
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
