import { Controller, Post, Body, UseGuards, Get, Delete, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AgentService } from './agent.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('IA - Agent Conversationnel')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('message')
  @ApiOperation({ summary: 'Envoyer un message à l\'Agent IA (Gemini 1.5 Flash)' })
  @ApiResponse({ status: 201, description: 'Réponse de l\'agent avec extraction d\'intention JSON.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        session_id: { type: 'string', nullable: true },
        text: { type: 'string', nullable: true },
        audio_url: { type: 'string', nullable: true },
      }
    }
  })
  async sendMessage(
    @Body() body: { session_id?: string; text?: string; audio_url?: string },
    @CurrentUser() user: any
  ) {
    return this.agentService.processMessage(user.id, body.session_id, body.text, body.audio_url, user);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Liste des sessions de conversation' })
  async getConversations(@CurrentUser() user: any) {
    return this.agentService.getConversations(user.id);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Messages d\'une session' })
  async getMessages(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.agentService.getMessages(user.id, id, page || 1, limit || 20);
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Supprimer une session (soft delete)' })
  async deleteConversation(
    @CurrentUser() user: any,
    @Param('id') id: string
  ) {
    return this.agentService.deleteConversation(user.id, id);
  }
}
