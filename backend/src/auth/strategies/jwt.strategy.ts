import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

import { DataSource } from 'typeorm';
import { InstitutionMember } from '../../institutions/entities/institution-member.entity';
import { Role } from '../../common/enums/role.enum';

export interface JwtPayload {
  sub: string;    // User UUID
  email: string;
  phone: string;
  role: string;
  name: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private dataSource: DataSource,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub) {
      throw new UnauthorizedException('Token invalide');
    }

    // IMPORTANT: On vérifie que l'utilisateur existe encore en base (cas de re-seed)
    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable. Veuillez vous reconnecter.');
    }

    let institutionMember: any = null;
    if (user.role === Role.INSTITUTION) {
      const memberRepo = this.dataSource.getRepository(InstitutionMember);
      institutionMember = await memberRepo.findOne({
        where: { userId: user.id, isActive: true },
        relations: ['institution'],
      });
    }

    return {
      id: payload.sub,
      sub: payload.sub, // Ensure sub is available for controllers using req.user.sub
      email: payload.email,
      phone: payload.phone,
      role: payload.role,
      name: payload.name,
      governorate: user.governorate,
      institutionMember,
    };
  }
}

