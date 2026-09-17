import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/**
 * Contrôleur d'authentification ZirIA.
 * Endpoints publics + GET /auth/me (JWT requis).
 */
@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/register
   */
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Créer un compte ZirIA' })
  @ApiResponse({ status: 201, description: 'Compte créé avec succès' })
  @ApiResponse({ status: 409, description: 'Email ou téléphone déjà utilisé' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * POST /auth/login
   */
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Se connecter à ZirIA' })
  @ApiResponse({ status: 200, description: 'JWT retourné avec profil utilisateur' })
  @ApiResponse({ status: 401, description: 'Identifiants incorrects' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * GET /auth/me
   * Profil enrichi : cooperative, worker_profile ou driver_profile selon le rôle.
   */
  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Profil enrichi de l\'utilisateur connecté' })
  @ApiResponse({ status: 200, description: 'Profil complet avec sous-profil selon le rôle' })
  getMe(@Request() req) {
    return this.authService.getMe(req.user.sub);
  }

  /**
   * POST /auth/refresh
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtenir une nouvelle paire de tokens via le refresh token' })
  @ApiResponse({ status: 200, description: 'Nouveaux tokens générés' })
  refreshToken(@Request() req, @Body('refresh_token') oldToken: string) {
    return this.authService.refreshToken(req.user.sub, oldToken);
  }

  /**
   * POST /auth/logout
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Déconnecter l\'utilisateur (invalide les tokens)' })
  logout(@Request() req) {
    this.authService.logout(req.user.sub);
    return { success: true, message: 'Déconnecté avec succès' };
  }
}
