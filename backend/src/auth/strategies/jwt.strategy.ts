import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

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

    return {
      id: payload.sub,
      sub: payload.sub, // Ensure sub is available for controllers using req.user.sub
      email: payload.email,
      phone: payload.phone,
      role: payload.role,
      name: payload.name,
    };
  }
}
