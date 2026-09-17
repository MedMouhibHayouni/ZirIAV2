import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { Role } from '../common/enums/role.enum';
import { UserSubscription, SubscriptionStatus } from '../subscriptions/entities/user-subscription.entity';

@Injectable()
export class AuthService {
  // In-memory store for refresh tokens: Map<userId, Set<token>>
  private readonly refreshTokensStore = new Map<string, Set<string>>();

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Inscription : hash du mot de passe + création du compte.
   * Vérifie l'unicité email/phone avant insertion.
   */
  async register(dto: RegisterDto): Promise<{ access_token: string; refresh_token: string; user: Partial<User> }> {
    // Normalise: empty strings already transformed to undefined by DTO, but defensive trim + lower-case
    const email = dto.email?.trim().toLowerCase() || undefined;
    const phone = dto.phone?.trim() || undefined;
    const governorate = dto.governorate?.trim() || undefined;
    const name = dto.name?.trim();

    if (!email && !phone) {
      throw new BadRequestException('Un email ou un numéro de téléphone est requis');
    }

    // Vérification unicité (case-insensitive for email)
    if (email) {
      const existingEmail = await this.usersRepository
        .createQueryBuilder('u')
        .where('LOWER(u.email) = LOWER(:email)', { email })
        .getOne();
      if (existingEmail) throw new ConflictException('Email déjà utilisé');
    }
    if (phone) {
      const existingPhone = await this.usersRepository.findOne({ where: { phone } });
      if (existingPhone) throw new ConflictException('Numéro de téléphone déjà utilisé');
    }

    const password_hash = await bcrypt.hash(dto.password, 12);

    const user: any = (this.usersRepository as any).create({
      name,
      email: email || null,
      phone: phone || null,
      governorate: governorate || null,
      role: dto.role,
      password_hash,
      verified: false,
    });

    let savedUser: User;
    try {
      savedUser = await this.usersRepository.save(user);
    } catch (err) {
      if (err?.code === '23505') {
        throw new ConflictException('Email ou numéro déjà utilisé');
      }
      throw err;
    }
    const plan = await this.getUserPlan(savedUser.id);
    const tokens = this.generateTokens(savedUser, plan);

    const responseUser = {
      id: savedUser.id,
      name: savedUser.name,
      email: savedUser.email,
      role: savedUser.role,
      governorate: savedUser.governorate,
      plan: plan,
      activity_type: (savedUser as any).activity_type || 'CROP',
      expert_type: savedUser.expert_type || null,
      equipment_type: savedUser.equipment_type || null,
    };

    return { ...tokens, user: responseUser };
  }

  /**
   * Connexion : récupère l'utilisateur par email ou phone,
   * vérifie le hash bcrypt et retourne les tokens.
   */
  async login(dto: LoginDto): Promise<{ access_token: string; refresh_token: string; user: Partial<User> }> {
    const email = dto.email?.trim().toLowerCase() || undefined;
    const phone = dto.phone?.trim() || undefined;

    if (!email && !phone) {
      throw new BadRequestException('Email ou téléphone requis');
    }

    let user: User | null;
    if (email) {
      user = await this.usersRepository
        .createQueryBuilder('u')
        .where('LOWER(u.email) = LOWER(:email)', { email })
        .getOne();
    } else {
      user = await this.usersRepository.findOne({ where: { phone } });
    }

    if (!user) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    console.log(`[AuthService] login attempt email=${email} phone=${phone} foundUser=${!!user} hashPrefix=${user.password_hash?.substring(0,7)} pwdLen=${dto.password?.length}`);
    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
    console.log(`[AuthService] bcrypt compare for ${email || phone} => ${isPasswordValid}`);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    const plan = await this.getUserPlan(user.id);
    console.log(`[AuthService] User ${user.email} plan: ${plan}`);
    const tokens = this.generateTokens(user, plan);

    const responseUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      governorate: user.governorate,
      plan: plan,
      activity_type: (user as any).activity_type || null,
      expert_type: user.expert_type || null,
      equipment_type: user.equipment_type || null,
    };

    return { ...tokens, user: responseUser };
  }

  /** Génère un JWT court et un Refresh Token long */
  private generateTokens(user: User, plan: string = 'FREE'): { access_token: string; refresh_token: string } {
    const payload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      name: user.name,
      governorate: user.governorate,
      plan,
      activity_type: (user as any).activity_type || null,
      expert_type: user.expert_type || null,
      equipment_type: user.equipment_type || null,
    };
    
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // Store the refresh token
    if (!this.refreshTokensStore.has(user.id)) {
      this.refreshTokensStore.set(user.id, new Set<string>());
    }
    this.refreshTokensStore.get(user.id)!.add(refreshToken);
    
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  private async getUserPlan(userId: string): Promise<string> {
    try {
      const subRepo = this.dataSource.getRepository(UserSubscription);
      const sub = await subRepo.findOne({
        where: { user_id: userId, status: SubscriptionStatus.ACTIVE },
        relations: ['plan'],
      });
      
      const planCode = sub?.plan?.code || 'FREE';
      console.log(`[AuthService] Plan lookup for ${userId}: ${planCode}`);
      return planCode;
    } catch (e) {
      console.error(`[AuthService] Error fetching plan for ${userId}:`, e);
      return 'FREE';
    }
  }

  /**
   * Rafraîchir un token JWT (rotation).
   */
  async refreshToken(userId: string, oldRefreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
    try {
      this.jwtService.verify(oldRefreshToken);
    } catch (e) {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }

    const userTokens = this.refreshTokensStore.get(userId);
    if (!userTokens || !userTokens.has(oldRefreshToken)) {
      // Possible token reuse attack or simply logged out
      throw new UnauthorizedException('Refresh token non reconnu. Veuillez vous reconnecter.');
    }

    // Invalidate old token
    userTokens.delete(oldRefreshToken);

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const plan = await this.getUserPlan(user.id);
    return this.generateTokens(user, plan);
  }

  /**
   * Déconnexion complète : vide tous les refresh tokens de l'utilisateur.
   */
  logout(userId: string) {
    this.refreshTokensStore.delete(userId);
  }

  /**
   * GET /auth/me — Profil enrichi selon le rôle.
   * Charge les relations : cooperative, worker_profile, driver_profile.
   */
  async getMe(userId: string): Promise<any> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['cooperative'],
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const { password_hash, ...safeUser } = user;
    const plan = await this.getUserPlan(userId);
    const profile: any = { ...safeUser, plan };

    // Rôle WORKER → charger le worker_profile
    if (user.role === Role.WORKER || user.role === Role.AGRI_WORKER) {
      const workerProfile = await this.dataSource.query(
        `SELECT * FROM worker_profiles WHERE user_id = $1 LIMIT 1`,
        [userId],
      );
      profile.worker_profile = workerProfile[0] || null;
    }

    // Rôle DRIVER → charger le driver_profile
    if (user.role === Role.DRIVER) {
      const driverProfile = await this.dataSource.query(
        `SELECT * FROM driver_profiles WHERE user_id = $1 LIMIT 1`,
        [userId],
      );
      profile.driver_profile = driverProfile[0] || null;
    }

    // Rôle COOP_PRESIDENT → cooperative_id déjà chargé via la relation
    return profile;
  }
}
