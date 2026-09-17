import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AgentConversation, ConversationLanguage } from './entities/agent-conversation.entity';
import { AgentMessage, MessageRole } from './entities/agent-message.entity';
import { AgentIntent } from './entities/agent-intent.entity';
import { AgentAction, ActionStatus } from './entities/agent-action.entity';
import { WeatherService } from '../weather/weather.service';
import { GeminiService } from './services/gemini.service';
import { User } from '../users/entities/user.entity';
import { Parcel } from '../parcels/entities/parcel.entity';
import { JobOffer, JobOfferStatus } from '../workers/entities/job-offer.entity';
import { MarketplaceService } from '../marketplace/marketplace.service';
import { WorkersService } from '../workers/workers.service';
import { ParcelsService } from '../parcels/parcels.service';
import { FinanceService } from '../finance/finance.service';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    @InjectRepository(AgentConversation)
    private readonly conversationRepo: Repository<AgentConversation>,
    @InjectRepository(AgentMessage)
    private readonly messageRepo: Repository<AgentMessage>,
    @InjectRepository(AgentIntent)
    private readonly intentRepo: Repository<AgentIntent>,
    @InjectRepository(AgentAction)
    private readonly actionRepo: Repository<AgentAction>,
    private readonly dataSource: DataSource,
    private readonly weatherService: WeatherService,
    private readonly marketplaceService: MarketplaceService,
    private readonly workersService: WorkersService,
    private readonly parcelsService: ParcelsService,
    private readonly financeService: FinanceService,
    private readonly geminiService: GeminiService,
  ) {}

  async processMessage(userId: string, sessionId?: string, content?: string, audioUrl?: string, user?: User) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Get or create conversation
      let conversation: AgentConversation | null = null;
      if (sessionId) {
        conversation = await queryRunner.manager.findOne(AgentConversation, { where: { session_id: sessionId, user_id: userId } });
      }
      if (!conversation) {
        conversation = queryRunner.manager.create(AgentConversation, {
          user_id: userId,
          session_id: sessionId || `sess_${Date.now()}_${userId.substring(0, 5)}`,
          language: ConversationLanguage.DARIJA,
          is_active: true,
        });
        await queryRunner.manager.save(conversation);
      }

      // 2. Save User Message
      const userContent = content || 'Audio message';
      const userMessage = queryRunner.manager.create(AgentMessage, {
        conversation_id: conversation.id,
        role: MessageRole.USER,
        content: userContent,
        audio_url: audioUrl,
      });
      await queryRunner.manager.save(userMessage);

      // 3. Load Context (Last 10 messages & Current Intent)
      const lastMessages = await queryRunner.manager.find(AgentMessage, {
        where: { conversation_id: conversation.id },
        order: { created_at: 'DESC' },
        take: 10,
      });
      const chatHistory = lastMessages.reverse().map(m => `[${m.role}] ${m.content}`).join('\n');

      let currentIntent = await queryRunner.manager.findOne(AgentIntent, {
        where: { conversation_id: conversation.id, status: 'COLLECTING' },
        order: { updated_at: 'DESC' }
      });

      // Load User Data Context
      const parcels = await queryRunner.manager.find(Parcel, { where: { owner_id: userId } });
      
      const systemPrompt = `Tu es ZirIA, l'assistant agricole intelligent de la plateforme ZirIA Sentinel, développée par AiKup Tech à Kasserine, Tunisie.
Tu parles Darija tunisien, Français et Arabe. Adapte ta langue à celle de l'utilisateur.

CONTEXTE UTILISATEUR :
Nom : ${user?.name || 'Agriculteur'}
Rôle : ${user?.role || 'FARMER'}
Gouvernorat : ${user?.governorate || 'Kasserine'}
Parcelles : ${JSON.stringify(parcels.map(p => ({id: p.id, type: p.crop_type, area: (p as any).area || 1})))}
Stock actuel : []
Solde du mois : 0 TND

HISTORIQUE CONVERSATION :
${chatHistory}

INTENT EN COURS (si applicable) :
Type : ${currentIntent?.intent_type || 'NONE'}
Données collectées : ${JSON.stringify(currentIntent?.collected_data || {})}
Données manquantes : ${JSON.stringify(currentIntent?.missing_fields || [])}

RÈGLES ABSOLUES :
1. Si un intent est EN COURS, continue à collecter les données manquantes. Ne change PAS de sujet.
2. Quand toutes les données sont collectées, demande confirmation AVANT d'exécuter.
3. Après exécution, montre le résultat concret.
4. Si l'utilisateur change de sujet en cours d'intent, demande "Voulez-vous annuler votre action ?"
5. Réponds TOUJOURS en moins de 3 phrases.
6. Utilise le prénom de l'utilisateur.
7. Pour les nombres, accepte les formats : "500 kg", "zuz tonne", "kilo w nus", "500"
8. Types d'actions possibles :
        - GET_WEATHER (params: { location: string })
        - GET_PARCELS (params: {})
        - GET_FINANCE (params: {})
        - MARKETPLACE_CREATE (params: { crop, quantity, price })
        - JOB_OFFER_CREATE (params: { task_type, workers_needed, duration_days, daily_pay_tnd }).
9. Si c'est le début de la conversation, fournis un titre concis et joli de 3-5 mots résumant le besoin de l'utilisateur.

FORMAT RÉPONSE JSON strict (AUCUN AUTRE TEXTE, SEULEMENT DU JSON VALIDE) :
{
  "text": "ta réponse textuelle en darija/fr",
  "language": "darija",
  "suggested_title": "Titre court (3-5 mots) résumant le besoin (ex: Vente de Tomates, Recrutement Ouvriers)",
  "intent_update": {
    "type": "SELL|BUY|RENT|DIAGNOSE|WEATHER|JOB_OFFER_CREATE|INFO|NONE",
    "status": "COLLECTING|COMPLETE|EXECUTED",
    "collected": { "crop": "...", "quantity": "...", "price": "...", "location": "...", "task_type": "...", "workers_needed": "...", "duration_days": "...", "daily_pay_tnd": "..." },
    "missing": ["price", "location", "task_type", "workers_needed", "duration_days", "daily_pay_tnd"]
  },
  "action": {
    "type": "MARKETPLACE_CREATE|JOB_OFFER_CREATE|GET_STOCK|GET_WEATHER|NONE",
    "params": {},
    "execute": false
  },
  "ui_actions": []
}`;

      const contentParts: any[] = [`Message actuel: ${userContent}`];
      
      if (audioUrl && !audioUrl.includes('placeholder')) {
        try {
          const response = await fetch(audioUrl);
          const arrayBuffer = await response.arrayBuffer();
          const base64Audio = Buffer.from(arrayBuffer).toString('base64');
          contentParts.push({
            inlineData: {
              data: base64Audio,
              mimeType: 'audio/webm'
            }
          });
        } catch (e) {
          this.logger.error('Erreur téléchargement audio pour Gemini', e.message);
        }
      }
      
      let result: any;
      try {
        result = await this.geminiService.generateContent(
          'gemini-2.0-flash',
          contentParts,
          {
            responseMimeType: 'application/json',
            systemInstruction: systemPrompt,
          }
        );
      } catch (error: any) {
        const isQuota = error?.status === 429 || (error?.message || '').includes('exhausted');
        const errMsg = isQuota
          ? "Désolé, ZirPulse a épuisé TOUTES les ressources disponibles (Quotas Google AI). Veuillez réessayer dans une heure."
          : "ZirIA est momentanément surchargé. Veuillez patienter quelques secondes ou réessayer.";

        const agentMessage = queryRunner.manager.create(AgentMessage, {
          conversation_id: conversation.id,
          role: MessageRole.AGENT,
          content: errMsg,
        });
        await queryRunner.manager.save(agentMessage);
        await queryRunner.commitTransaction();
        return {
          reply: errMsg,
          sessionId: conversation.session_id,
          intent: isQuota ? 'ERROR_QUOTA' : currentIntent?.intent_type || 'INFO',
          actionStatus: 'FAILED',
          actions: []
        };
      }
      
      const responseText = result.response.text();

      
      let geminiResponse;
      try {
        geminiResponse = JSON.parse(responseText.replace(/```json/g, '').replace(/```/g, '').trim());
      } catch (e) {
        this.logger.error('Failed to parse Gemini JSON response', responseText);
        geminiResponse = {
           text: "Désolé, je n'ai pas pu traiter la demande.",
           intent_update: { type: 'NONE', status: 'COMPLETE', collected: {}, missing: [] },
           action: { type: 'NONE', execute: false },
           ui_actions: []
        };
      }

      // Update Conversation Title if it's new
      if (!conversation.title && geminiResponse.suggested_title) {
        conversation.title = geminiResponse.suggested_title;
        await queryRunner.manager.save(conversation);
      }

      // --- STATE MACHINE LOGIC ---
      let finalActions: string[] = [];
      let replyText = geminiResponse.text;

      // Update or Create Intent
      if (geminiResponse.intent_update && geminiResponse.intent_update.type !== 'NONE') {
        if (!currentIntent) {
          currentIntent = queryRunner.manager.create(AgentIntent, {
            conversation_id: conversation.id,
            intent_type: geminiResponse.intent_update.type,
            status: geminiResponse.intent_update.status,
            collected_data: geminiResponse.intent_update.collected || {},
            missing_fields: geminiResponse.intent_update.missing || []
          });
        } else {
          currentIntent.status = geminiResponse.intent_update.status;
          currentIntent.collected_data = { ...currentIntent.collected_data, ...(geminiResponse.intent_update.collected || {}) };
          currentIntent.missing_fields = geminiResponse.intent_update.missing || [];
        }
        await queryRunner.manager.save(currentIntent);
      }

      // --- ACTION EXECUTION LOGIC ---
      if (geminiResponse.action && geminiResponse.action.execute) {
        if (geminiResponse.action.type === 'MARKETPLACE_CREATE') {
          // Use high-level service to ensure business logic/events trigger
          const quantity = parseFloat(geminiResponse.action.params.quantity || currentIntent?.collected_data?.quantity || 1);
          const price = parseFloat(geminiResponse.action.params.price || currentIntent?.collected_data?.price || 0);
          
          try {
            const listing = await this.marketplaceService.create({
              crop_type: geminiResponse.action.params.crop || currentIntent?.collected_data?.crop || 'Cultures',
              quantity_tonnes: quantity,
              price_per_kg: price,
              variety: (currentIntent?.collected_data as any)?.variety || 'Standard',
              parcel_id: (currentIntent?.collected_data as any)?.parcel_id || null,
              available_at: new Date().toISOString()
            } as any, userId);
            
            replyText += `\n\n✅ Annonce publiée avec succès ! (ID: ${listing.id.substring(0, 8)})`;
            
            if (currentIntent) {
              currentIntent.status = 'EXECUTED';
              await queryRunner.manager.save(currentIntent);
            }
          } catch (e) {
            this.logger.error(`Erreur création marketplace via Agent: ${e.message}`);
            replyText += `\n\n❌ Désolé, je n'ai pas pu publier l'annonce : ${e.message}`;
          }
        } 
        else if (geminiResponse.action.type === 'JOB_OFFER_CREATE') {
          const now = new Date();
          const dateStr = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
          
          try {
            const offer = await this.workersService.createJobOffer(userId, {
              task_type: geminiResponse.action.params.task_type || currentIntent?.collected_data?.task_type || 'Récolte',
              workers_needed: parseInt(geminiResponse.action.params.workers_needed || currentIntent?.collected_data?.workers_needed || 1, 10),
              duration_days: parseInt(geminiResponse.action.params.duration_days || currentIntent?.collected_data?.duration_days || 5, 10),
              daily_pay_tnd: parseFloat(geminiResponse.action.params.daily_pay_tnd || currentIntent?.collected_data?.daily_pay_tnd || 30),
              start_date: dateStr as any,
              governorate: user?.governorate || 'Kasserine',
              lat: user?.lat || 35.167,
              lng: user?.lng || 8.831,
            });
            
            replyText += `\n\n✅ Offre d'emploi publiée avec succès ! (Recherche de ${offer.workers_needed} ouvriers pour ${offer.task_type})`;
            
            if (currentIntent) {
              currentIntent.status = 'EXECUTED';
              await queryRunner.manager.save(currentIntent);
            }
          } catch (e) {
            this.logger.error(`Erreur création job via Agent: ${e.message}`);
            replyText += `\n\n❌ Désolé, je n'ai pas pu publier l'offre d'emploi : ${e.message}`;
          }
        }
        else if (geminiResponse.action.type === 'GET_PARCELS') {
          try {
            const parcels = await this.parcelsService.findByOwner(userId);
            if (parcels.length === 0) {
              replyText = "Vous n'avez pas encore de parcelles enregistrées sur ZirIA.";
            } else {
              replyText = `Vous avez ${parcels.length} parcelles :\n` + 
                parcels.map(p => `- ${p.name} (${p.area_ha || p.surface_ha} ha)`).join('\n');
            }
            if (currentIntent) {
              currentIntent.status = 'EXECUTED';
              await queryRunner.manager.save(currentIntent);
            }
          } catch(e) {
            this.logger.error(`Erreur GET_PARCELS via Agent: ${e.message}`);
          }
        }
        else if (geminiResponse.action.type === 'GET_FINANCE') {
          try {
            const summary = await this.financeService.getMonthlySummary(userId);
            if (summary.length === 0) {
              replyText = "Je n'ai pas trouvé d'historique financier pour votre compte.";
            } else {
              const latest = summary[0];
              replyText = `Résumé financier (${latest.month}) :\n` +
                `- Revenus : ${latest.total_income.toFixed(2)} TND\n` +
                `- Dépenses : ${latest.total_expenses.toFixed(2)} TND\n` +
                `- Solde Net : ${latest.net.toFixed(2)} TND`;
            }
            if (currentIntent) {
              currentIntent.status = 'EXECUTED';
              await queryRunner.manager.save(currentIntent);
            }
          } catch(e) {
            this.logger.error(`Erreur GET_FINANCE via Agent: ${e.message}`);
          }
        }
      }

      // Format UI Actions
      if (geminiResponse.intent_update?.type === 'DIAGNOSE') {
        finalActions.push('Aller au Diagnostic');
      }
      if (geminiResponse.ui_actions && geminiResponse.ui_actions.length > 0) {
        geminiResponse.ui_actions.forEach(a => finalActions.push(a.label || a.type));
      }

      // Save Agent Reply Message
      const agentMessage = queryRunner.manager.create(AgentMessage, {
        conversation_id: conversation.id,
        role: MessageRole.AGENT,
        content: replyText,
      });
      await queryRunner.manager.save(agentMessage);

      await queryRunner.commitTransaction();

      return {
        reply: agentMessage.content,
        sessionId: conversation.session_id,
        intent: currentIntent?.intent_type || 'INFO',
        actionStatus: currentIntent?.status || 'COMPLETE',
        actions: finalActions
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error processing agent message: ${error.message}`);
      
      if (error.status === 429) {
        return {
          reply: "Oups, j'ai reçu trop de requêtes d'un coup ! (Limite atteinte). Patientez 1 min.",
          sessionId: sessionId || 'temp_session',
          intent: 'ERROR_RATE_LIMIT',
          actionStatus: 'FAILED',
          actions: []
        };
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getConversations(userId: string): Promise<AgentConversation[]> {
    return this.conversationRepo.find({
      where: { user_id: userId, is_active: true },
      order: { updated_at: 'DESC' }
    });
  }

  async getMessages(userId: string, conversationId: string, page = 1, limit = 20) {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId, user_id: userId, is_active: true }
    });
    if (!conversation) throw new Error('Conversation not found');

    return this.messageRepo.find({
      where: { conversation_id: conversationId },
      order: { created_at: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async deleteConversation(userId: string, conversationId: string) {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId, user_id: userId }
    });
    if (!conversation) throw new NotFoundException('Conversation introuvable');

    conversation.is_active = false;
    await this.conversationRepo.save(conversation);
    return { success: true, id: conversationId };
  }
}
