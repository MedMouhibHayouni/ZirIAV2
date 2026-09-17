import {
  Controller, Post, Get, Body, UseGuards, Request, HttpCode, HttpStatus, Param
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZirpulseService } from './zirpulse.service';

@ApiTags('ZirPulse (Audio IA)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('zirpulse')
export class ZirpulseController {
  constructor(private readonly zirpulseService: ZirpulseService) {}

  @Post('posts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Soumettre un post vocal ZirPulse pour analyse (Gemini)' })
  async createAudioPost(
    @Request() req,
    @Body('audio_url') audioUrl: string,
    @Body('lat') lat?: number,
    @Body('lng') lng?: number,
  ) {
    return this.zirpulseService.processAudioPost(req.user.sub, audioUrl, lat, lng);
  }

  @Get('posts/me')
  @ApiOperation({ summary: 'Voir l\'historique de mes posts vocaux' })
  getMyPosts(@Request() req) {
    return this.zirpulseService.findMyPosts(req.user.sub);
  }

  @Get('posts')
  @ApiOperation({ summary: 'Voir le fil public ZirPulse' })
  findAll() {
    return this.zirpulseService.findAll();
  }

  @Post('posts/:id/like')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liker un post ZirPulse' })
  likePost(@Param('id') id: string) {
    return this.zirpulseService.likePost(id);
  }
}
