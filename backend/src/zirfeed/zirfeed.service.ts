import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan, MoreThanOrEqual, MoreThan, ILike, LessThanOrEqual } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { GeminiService } from '../ai/services/gemini.service';
import { Subject } from 'rxjs';
import { User } from '../users/entities/user.entity';
import {
  ZirfeedUserProfile,
  ZirfeedFollow,
  ZirfeedPage,
  ZirfeedGroup,
  ZirfeedGroupMember,
  ZirfeedPost,
  ZirfeedComment,
  ZirfeedReaction,
  ZirfeedSavedCollection,
  ZirfeedSavedPost,
  ZirfeedEvent,
  ZirfeedEventAttendee,
  ZirfeedExternalNews,
  ZirfeedHashtag,
  ZirfeedModeration,
  ZirfeedModerationRestriction,
  ZirfeedNotification,
  ZirfeedStory
} from './entities/zirfeed.entities';

@Injectable()
export class ZirFeedService {
  private readonly logger = new Logger(ZirFeedService.name);

  readonly sseStream$ = new Subject<any>();

  constructor(
    @InjectRepository(ZirfeedUserProfile) private readonly profileRepo: Repository<ZirfeedUserProfile>,
    @InjectRepository(ZirfeedFollow) private readonly followRepo: Repository<ZirfeedFollow>,
    @InjectRepository(ZirfeedPage) private readonly pageRepo: Repository<ZirfeedPage>,
    @InjectRepository(ZirfeedGroup) private readonly groupRepo: Repository<ZirfeedGroup>,
    @InjectRepository(ZirfeedGroupMember) private readonly memberRepo: Repository<ZirfeedGroupMember>,
    @InjectRepository(ZirfeedPost) private readonly postRepo: Repository<ZirfeedPost>,
    @InjectRepository(ZirfeedComment) private readonly commentRepo: Repository<ZirfeedComment>,
    @InjectRepository(ZirfeedReaction) private readonly reactionRepo: Repository<ZirfeedReaction>,
    @InjectRepository(ZirfeedSavedCollection) private readonly collectionRepo: Repository<ZirfeedSavedCollection>,
    @InjectRepository(ZirfeedSavedPost) private readonly savedPostRepo: Repository<ZirfeedSavedPost>,
    @InjectRepository(ZirfeedEvent) private readonly eventRepo: Repository<ZirfeedEvent>,
    @InjectRepository(ZirfeedEventAttendee) private readonly attendeeRepo: Repository<ZirfeedEventAttendee>,
    @InjectRepository(ZirfeedExternalNews) private readonly newsRepo: Repository<ZirfeedExternalNews>,
    @InjectRepository(ZirfeedHashtag) private readonly hashtagRepo: Repository<ZirfeedHashtag>,
    @InjectRepository(ZirfeedModeration) private readonly modRepo: Repository<ZirfeedModeration>,
    @InjectRepository(ZirfeedModerationRestriction) private readonly restrictionRepo: Repository<ZirfeedModerationRestriction>,
    @InjectRepository(ZirfeedNotification) private readonly notificationRepo: Repository<ZirfeedNotification>,
    @InjectRepository(ZirfeedStory) private readonly storyRepo: Repository<ZirfeedStory>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly configService: ConfigService,
    private readonly geminiService: GeminiService,
  ) {}

  // ─── CRON: Scheduled Post Publisher (every 60s) ──────────────────────────
  @Interval(60000)
  async publishScheduledPosts() {
    const now = new Date();
    const due = await this.postRepo.find({
      where: { status: 'SCHEDULED', scheduled_for: LessThanOrEqual(now) },
    });
    for (const post of due) {
      post.status = 'PROCESSING';
      await this.postRepo.save(post);
      const author = await this.userRepo.findOne({ where: { id: post.author_id } });
      const modResult = await this.moderateContent(post.content_text || '', post.language_detected || 'FR', author?.role || 'FARMER');
      if (modResult.action === 'REJECT' && modResult.score > 0.85) {
        post.status = 'REJECTED';
        await this.postRepo.save(post);
        await this.emitSocialNotification(post.author_id, 'MODERATION_ACTION', 'POST', post.id);
      } else {
        post.status = 'APPROVED';
        await this.postRepo.save(post);
        this.broadcastSse('new_post', { post_id: post.id });
      }
    }
  }

  // ─── CRON: Event Reminder Notifications (every 5min) ───────────────────
  @Interval(300000)
  async sendEventReminders() {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in24hPlus5 = new Date(in24h.getTime() + 5 * 60 * 1000);
    const in1h = new Date(now.getTime() + 60 * 60 * 1000);
    const in1hPlus5 = new Date(in1h.getTime() + 5 * 60 * 1000);

    // 24h reminders
    const events24h = await this.eventRepo.find({
      where: { start_date: MoreThanOrEqual(in24h) },
    });
    for (const event of events24h) {
      if (event.start_date <= in24hPlus5) {
        const attendees = await this.attendeeRepo.find({ where: { event_id: event.id, status: In(['GOING', 'INTERESTED']) } });
        for (const att of attendees) {
          await this.emitSocialNotification(att.user_id, 'EVENT_REMINDER', 'EVENT', event.id);
        }
      }
    }

    // 1h reminders
    const events1h = await this.eventRepo.find({
      where: { start_date: MoreThanOrEqual(in1h) },
    });
    for (const event of events1h) {
      if (event.start_date <= in1hPlus5) {
        const attendees = await this.attendeeRepo.find({ where: { event_id: event.id, status: In(['GOING', 'INTERESTED']) } });
        for (const att of attendees) {
          await this.emitSocialNotification(att.user_id, 'EVENT_REMINDER', 'EVENT', event.id);
        }
      }
    }
  }

  // ─── USER PROFILE MANAGEMENT ─────────────────────────────────────────────
  async getOrCreateProfile(userId: string): Promise<ZirfeedUserProfile> {
    let profile = await this.profileRepo.findOne({ where: { user_id: userId } });
    if (!profile) {
      profile = this.profileRepo.create({
        user_id: userId,
        bio: 'Bienvenue sur mon profil agricole ZirFeed !',
        profile_visibility: 'PUBLIC',
        show_groups: true,
        show_following: true,
      });
      profile = await this.profileRepo.save(profile);
    }
    return profile;
  }

  async updateProfile(userId: string, data: Partial<ZirfeedUserProfile>): Promise<ZirfeedUserProfile> {
    const profile = await this.getOrCreateProfile(userId);
    Object.assign(profile, data);
    return this.profileRepo.save(profile);
  }

  // ─── AI MODERATION FILTER ─────────────────────────────────────────────
  async checkModerationGating(userId: string): Promise<void> {
    const restriction = await this.restrictionRepo.findOne({
      where: { user_id: userId, restriction_end: MoreThan(new Date()) },
      order: { restriction_end: 'DESC' },
    });
    if (restriction) {
      if (restriction.restriction_type === 'FULL_BAN') {
        throw new ForbiddenException(`[ZirFeed] Compte suspendu jusqu'au ${restriction.restriction_end.toLocaleString()}.`);
      }
      if (restriction.restriction_type === 'POST_BAN') {
        throw new ForbiddenException(`[ZirFeed] Publications interdites jusqu'au ${restriction.restriction_end.toLocaleString()}.`);
      }
    }
  }

  async moderateContent(content: string, detectedLang: string, authorRole: string, groupCategory?: string): Promise<{ isFlagged: boolean; score: number; reason: string; explanation: string; action: 'APPROVE' | 'HOLD_FOR_REVIEW' | 'REJECT' }> {
    if (!content || content.trim().length === 0) return { isFlagged: false, score: 0, reason: 'NONE', explanation: '', action: 'APPROVE' };

    try {
      const prompt = `Tu es un système de modération spécialisé pour ZirFeed, réseau social agricole de Tunisie.\n\nRÈGLES:\n1. Langues: Français, Arabe standard, Darija tunisienne.\n2. Hors-sujet: Tout contenu non lié à l'agriculture est interdit.\n3. Spam/Publicité abusive, désinformation agricole, langage violent.\n\nAUTEUR: ${authorRole} | Langue: ${detectedLang} | Groupe: ${groupCategory || 'Fil général'}\n\nCONTENU: "${content}"\n\nRéponds avec JSON: {"is_flagged":bool,"confidence_score":0.0-1.0,"flag_reason":"NONE|HARMFUL_LANGUAGE|OFF_TOPIC|SPAM|AGRICULTURAL_MISINFORMATION|PERSONAL_ATTACK","flag_explanation":"...","suggested_action":"APPROVE|HOLD_FOR_REVIEW|REJECT"}`;
      const response = await this.geminiService.generateContent(
        'gemini-2.0-flash',
        [prompt],
        { temperature: 0.1, responseMimeType: 'application/json' }
      );
      const res = JSON.parse(response.response.text().replace(/```json|```/g, '').trim());
      return { isFlagged: !!res.is_flagged, score: +res.confidence_score || 0, reason: res.flag_reason || 'NONE', explanation: res.flag_explanation || '', action: res.suggested_action || 'APPROVE' };
    } catch (err) {
      this.logger.error(`Moderation AI failed: ${err.message}`);
      return { isFlagged: false, score: 0, reason: 'NONE', explanation: '', action: 'APPROVE' };
    }
  }

  // ─── LANGUAGE & WAVEFORM UTILS ────────────────────────────────────────────
  detectLanguage(text: string): 'FR' | 'AR' | 'MIXED' | 'OTHER' {
    if (!text) return 'OTHER';
    const hasArabic = /[\u0600-\u06FF]/.test(text);
    const hasFrench = /[a-zA-Z]/.test(text);
    if (hasArabic && hasFrench) return 'MIXED';
    if (hasArabic) return 'AR';
    if (hasFrench) return 'FR';
    return 'OTHER';
  }

  generateAudioWaveform(): number[] {
    const peaks: number[] = [];
    const size = Math.floor(Math.random() * 21) + 60;
    for (let i = 0; i < size; i++) {
      const t = i / size;
      const base = 0.5 * Math.sin(Math.PI * t) + 0.3 * Math.sin(3 * Math.PI * t) + 0.1 * Math.sin(7 * Math.PI * t);
      const noise = Math.random() * 0.15;
      peaks.push(+Math.max(0.05, Math.min(0.95, Math.abs(base) + noise)).toFixed(2));
    }
    return peaks;
  }

  // ─── POST HYDRATION HELPER ────────────────────────────────────────────────
  private async hydratePost(post: ZirfeedPost, userId?: string, loadShared = true): Promise<any> {
    const author = await this.userRepo.findOne({ where: { id: post.author_id } });
    const reacts = await this.getReactionStats(post.id);
    const commentsCount = await this.commentRepo.count({ where: { post_id: post.id, status: 'APPROVED' } });
    let page: ZirfeedPage | null = null;
    if (post.page_id) page = await this.pageRepo.findOne({ where: { id: post.page_id } });
    let myReaction: string | null = null;
    if (userId) {
      const r = await this.reactionRepo.findOne({ where: { post_id: post.id, user_id: userId } });
      myReaction = r?.reaction_type || null;
    }
    let isSaved = false;
    if (userId) {
      const s = await this.savedPostRepo.findOne({ where: { post_id: post.id, user_id: userId } });
      isSaved = !!s;
    }
    let sharedPost: any = null;
    if (loadShared && post.shared_from_post_id) {
      const orig = await this.postRepo.findOne({ where: { id: post.shared_from_post_id } });
      if (orig) {
        sharedPost = await this.hydratePost(orig, userId, false);
      }
    }
    return {
      ...post,
      author: {
        id: author?.id,
        name: author?.name,
        role: author?.role,
        profile_picture_url: author?.profile_picture_url || '',
        verified: author?.verified || false,
      },
      page: page ? { id: page.id, name: page.name, logo_url: page.logo_url, category: page.category } : null,
      comments_count: commentsCount,
      reaction_stats: reacts,
      my_reaction: myReaction,
      is_saved: isSaved,
      shared_post: sharedPost,
    };
  }

  // ─── POST SYSTEM ──────────────────────────────────────────────────────────
  async createPost(userId: string, data: any): Promise<ZirfeedPost> {
    await this.checkModerationGating(userId);
    const author = await this.userRepo.findOne({ where: { id: userId } });
    if (!author) throw new NotFoundException('Utilisateur introuvable.');
    const lang = this.detectLanguage(data.content_text);
    let content = data.content_text || '';

    if (data.author_type === 'PAGE' && data.page_id) {
      const page = await this.pageRepo.findOne({ where: { id: data.page_id } });
      if (page && (page.category === 'Bank' || page.category === 'Insurance')) {
        const disclaimer = `\n\n*(Ce contenu est publié par un partenaire institutionnel de ZirIA. ZirIA ne garantit pas les offres présentées.)*`;
        if (!content.includes('ZirIA ne garantit pas')) content += disclaimer;
      }
    }

    const hashtags: string[] = [];
    const hashtagRegex = /#(\w+)/g;
    let match;
    while ((match = hashtagRegex.exec(content)) !== null) hashtags.push(match[1].toLowerCase());

    // Handle scheduled posts
    if (data.scheduled_for) {
      const post = this.postRepo.create({
        author_id: userId,
        author_type: data.author_type || 'PAGE',
        page_id: data.page_id || null,
        group_id: data.group_id || null,
        post_type: data.post_type || 'TEXT',
        content_text: content,
        media_urls: data.media_urls || [],
        hashtags,
        language_detected: lang,
        status: 'SCHEDULED',
        scheduled_for: new Date(data.scheduled_for),
        is_pinned: false,
      });
      return this.postRepo.save(post);
    }

    const post = this.postRepo.create({
      author_id: userId,
      author_type: data.author_type || 'USER',
      page_id: data.page_id || null,
      group_id: data.group_id || null,
      post_type: data.post_type || 'TEXT',
      content_text: content,
      media_urls: data.media_urls || [],
      document_url: data.document_url || null,
      document_metadata: data.document_metadata || null,
      voice_note_url: data.voice_note_url || null,
      voice_note_waveform: data.voice_note_url ? this.generateAudioWaveform() : null,
      voice_note_duration: data.voice_note_duration || null,
      thumbnail_url: data.thumbnail_url || null,
      caption: data.caption || null,
      hashtags,
      mentions: data.mentions || [],
      language_detected: lang,
      is_pinned: false,
      scheduled_for: null,
    });

    if (post.post_type === 'VOICE_NOTE') {
      post.status = 'APPROVED';
      post.moderation_note = 'VOICE_NOTE_UNREVIEWED';
    } else {
      const group = post.group_id ? await this.groupRepo.findOne({ where: { id: post.group_id } }) : null;
      const modResult = await this.moderateContent(content, lang, author.role, group?.category);
      if (modResult.action === 'REJECT' && modResult.score > 0.85) {
        post.status = 'REJECTED';
        await this.postRepo.save(post);
        await this.handleUserRejectionNotification(userId, 'Publication refusée par l\'IA.');
        throw new ForbiddenException(`[IA] Publication refusée. Motif : ${modResult.explanation}`);
      } else if (modResult.action === 'HOLD_FOR_REVIEW' || modResult.isFlagged) {
        post.status = 'FLAGGED';
        const savedPost = await this.postRepo.save(post);
        await this.modRepo.save(this.modRepo.create({ item_type: 'POST', item_id: savedPost.id, reason: modResult.reason, confidence_score: modResult.score }));
        return savedPost;
      } else {
        post.status = 'APPROVED';
      }
    }

    if (post.post_type === 'VIDEO' || post.post_type === 'REEL') post.moderation_note = 'VIDEO_CONTENT_UNREVIEWED';
    const savedPost = await this.postRepo.save(post);
    if (savedPost.status === 'APPROVED') {
      await this.indexHashtags(hashtags);
      this.broadcastSse('new_post', { post_id: savedPost.id, author_id: userId });
      // Update page post_count
      if (savedPost.page_id) {
        await this.pageRepo.increment({ id: savedPost.page_id }, 'post_count', 1);
      }
    }
    return savedPost;
  }

  async indexHashtags(tags: string[]): Promise<void> {
    for (const tag of tags) {
      let hash = await this.hashtagRepo.findOne({ where: { tag } });
      if (!hash) hash = this.hashtagRepo.create({ tag, usage_count: 1, last_used_at: new Date() });
      else { hash.usage_count += 1; hash.last_used_at = new Date(); }
      await this.hashtagRepo.save(hash);
    }
  }

  async handleUserRejectionNotification(userId: string, reason: string): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const rejections = await this.modRepo.count({ where: { reviewer_action: 'REJECT', created_at: MoreThanOrEqual(thirtyDaysAgo) } });
    if (rejections >= 2) {
      const end = new Date();
      end.setDate(end.getDate() + 7);
      await this.restrictionRepo.save(this.restrictionRepo.create({ user_id: userId, restriction_start: new Date(), restriction_end: end, reason: '3 publications rejetées en 30 jours.', restriction_type: 'POST_BAN' }));
    }
    await this.notificationRepo.save(this.notificationRepo.create({ recipient_id: userId, sender_id: null, notification_type: 'MODERATION_ACTION', item_type: 'POST', item_id: userId }));
  }

  // ─── VIEW TRACKER FOR REELS ───────────────────────────────────────────────
  async trackReelView(postId: string): Promise<{ views_count: number }> {
    await this.postRepo.increment({ id: postId }, 'views_count', 1);
    const post = await this.postRepo.findOne({ where: { id: postId } });
    return { views_count: post?.views_count || 0 };
  }

  // ─── REELS FEED ───────────────────────────────────────────────────────────
  async getReelsFeed(userId: string, tab: 'foryou' | 'following', page = 1, limit = 10): Promise<any[]> {
    let reelPosts: ZirfeedPost[] = [];

    if (tab === 'following') {
      const follows = await this.followRepo.find({ where: { follower_id: userId } });
      const followedIds = follows.filter(f => f.following_id).map(f => f.following_id as string);
      if (followedIds.length > 0) {
        reelPosts = await this.postRepo.find({
          where: { post_type: 'REEL', status: 'APPROVED', author_id: In(followedIds) },
          order: { created_at: 'DESC' },
          take: limit,
          skip: (page - 1) * limit,
        });
      }
    } else {
      reelPosts = await this.postRepo.find({
        where: { post_type: 'REEL', status: 'APPROVED' },
        order: { views_count: 'DESC', created_at: 'DESC' },
        take: limit,
        skip: (page - 1) * limit,
      });
    }

    const hydrated: any[] = [];
    for (const reel of reelPosts) {
      hydrated.push(await this.hydratePost(reel, userId));
    }
    return hydrated;
  }

  // ─── COMMENT SYSTEM ───────────────────────────────────────────────────────
  async createComment(userId: string, data: any): Promise<ZirfeedComment> {
    await this.checkModerationGating(userId);
    const author = await this.userRepo.findOne({ where: { id: userId } });
    if (!author) throw new NotFoundException('Utilisateur introuvable.');
    const lang = this.detectLanguage(data.content_text);
    const comment = this.commentRepo.create({
      post_id: data.post_id,
      author_id: userId,
      parent_id: data.parent_id || null,
      content_text: data.content_text,
      image_url: data.image_url || null,
    });

    if (comment.voice_note_url) {
      comment.status = 'APPROVED';
    } else {
      const modResult = await this.moderateContent(comment.content_text, lang, author.role);
      if (modResult.action === 'REJECT' && modResult.score > 0.85) throw new ForbiddenException(`[IA] Commentaire bloqué.`);
      else if (modResult.action === 'HOLD_FOR_REVIEW' || modResult.isFlagged) comment.status = 'FLAGGED';
      else comment.status = 'APPROVED';
    }

    const saved = await this.commentRepo.save(comment);
    if (saved.status === 'APPROVED') {
      const post = await this.postRepo.findOne({ where: { id: data.post_id } });
      if (post && post.author_id !== userId) await this.emitSocialNotification(post.author_id, 'COMMENT', 'POST', post.id, userId);
      this.broadcastSse('new_comment', { post_id: data.post_id, comment_id: saved.id });
    }
    return saved;
  }

  async deleteComment(userId: string, commentId: string): Promise<void> {
    const comment = await this.commentRepo.findOne({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Commentaire introuvable.');
    const post = await this.postRepo.findOne({ where: { id: comment.post_id } });
    if (comment.author_id === userId || post?.author_id === userId) {
      await this.commentRepo.remove(comment);
      this.broadcastSse('comment_deleted', { post_id: comment.post_id, comment_id: commentId });
    } else {
      throw new ForbiddenException('Non autorisé.');
    }
  }

  async listComments(postId: string): Promise<any[]> {
    const all = await this.commentRepo.find({ where: { post_id: postId, status: 'APPROVED' }, order: { created_at: 'ASC' } });
    const hydrated: any[] = [];
    for (const c of all) {
      const author = await this.userRepo.findOne({ where: { id: c.author_id } });
      const reacts = await this.getReactionStats(undefined, c.id);
      hydrated.push({ ...c, author: { id: author?.id, name: author?.name, role: author?.role, profile_picture_url: author?.profile_picture_url || '' }, reaction_stats: reacts });
    }
    // Build tree: parent + replies
    const roots = hydrated.filter(c => !c.parent_id);
    const replies = hydrated.filter(c => !!c.parent_id);
    for (const root of roots) {
      root.replies = replies.filter(r => r.parent_id === root.id);
    }
    return roots;
  }

  // ─── REACTIONS ────────────────────────────────────────────────────────────
  async toggleReaction(userId: string, data: { post_id?: string; comment_id?: string; type: string }): Promise<any> {
    await this.checkModerationGating(userId);
    const query: any = { user_id: userId };
    if (data.post_id) query.post_id = data.post_id;
    if (data.comment_id) query.comment_id = data.comment_id;
    const existing = await this.reactionRepo.findOne({ where: query });
    if (existing) {
      if (existing.reaction_type === data.type) await this.reactionRepo.remove(existing);
      else { existing.reaction_type = data.type; await this.reactionRepo.save(existing); }
    } else {
      const react = new (this.reactionRepo.target as any)();
      react.user_id = userId;
      react.post_id = data.post_id || null;
      react.comment_id = data.comment_id || null;
      react.reaction_type = data.type;
      await this.reactionRepo.save(react);
      if (data.post_id) {
        const post = await this.postRepo.findOne({ where: { id: data.post_id } });
        if (post && post.author_id !== userId) await this.emitSocialNotification(post.author_id, 'REACTION', 'POST', post.id, userId);
      }
    }
    const stats = await this.getReactionStats(data.post_id, data.comment_id);
    this.broadcastSse('reaction_update', { post_id: data.post_id || null, stats });
    return stats;
  }

  async getReactionStats(postId?: string, commentId?: string): Promise<any> {
    const query: any = {};
    if (postId) query.post_id = postId;
    if (commentId) query.comment_id = commentId;
    const list = await this.reactionRepo.find({ where: query, relations: ['user'] });
    const counts: Record<string, number> = {};
    for (const r of list) counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
    return { counts, total: list.length, last_three: list.slice(-3).map(r => r.user?.name || '') };
  }

  // ─── BOOKMARKS ────────────────────────────────────────────────────────────
  async createCollection(userId: string, name: string, cover?: string): Promise<ZirfeedSavedCollection> {
    return this.collectionRepo.save(this.collectionRepo.create({ user_id: userId, collection_name: name, cover_image: cover || null }));
  }

  async savePost(userId: string, postId: string, collectionId: string): Promise<ZirfeedSavedPost> {
    const existing = await this.savedPostRepo.findOne({ where: { user_id: userId, post_id: postId } });
    if (existing) { existing.collection_id = collectionId; return this.savedPostRepo.save(existing); }
    return this.savedPostRepo.save(this.savedPostRepo.create({ user_id: userId, post_id: postId, collection_id: collectionId }));
  }

  async reportPost(userId: string, postId: string, reason: string, details?: string): Promise<ZirfeedModeration> {
    const payload = `${reason}${details ? ` — ${details}` : ''}`;
    const report = await this.modRepo.save(this.modRepo.create({
      item_type: 'POST',
      item_id: postId,
      reason: payload,
      confidence_score: 0,
      reviewer_id: null,
      reviewer_action: 'PENDING',
    }));
    // Auto-moderation: if reports exceed 50% of group/page subscribers, delete post
    const post = await this.postRepo.findOne({ where: { id: postId }, relations: ['author'] });
    if (post) {
      const reportCount = await this.modRepo.count({ where: { item_type: 'POST', item_id: postId } });
      let threshold = 0;
      if (post.group_id) {
        const memberCount = await this.memberRepo.count({ where: { group_id: post.group_id, status: 'APPROVED' } });
        threshold = memberCount;
      } else if (post.page_id) {
        const page = await this.pageRepo.findOne({ where: { id: post.page_id } });
        threshold = page?.follower_count || 0;
      }
      if (threshold > 0 && reportCount > Math.floor(threshold / 2)) {
        await this.postRepo.delete(postId);
        // Notify ZirIA admins
        const admins = await this.userRepo.find({ where: { role: 'ADMIN' as any } });
        for (const admin of admins) {
          await this.emitSocialNotification(admin.id, 'MODERATION_ACTION', 'POST', postId, userId);
        }
        // Notify page admin
        if (post.page_id) {
          const page = await this.pageRepo.findOne({ where: { id: post.page_id } });
          if (page?.creator_id) {
            await this.emitSocialNotification(page.creator_id, 'MODERATION_ACTION', 'POST', postId, userId);
          }
        }
        // Notify group admins
        if (post.group_id) {
          const groupAdmins = await this.memberRepo.find({ where: { group_id: post.group_id, role: 'ADMIN', status: 'APPROVED' } });
          for (const admin of groupAdmins) {
            await this.emitSocialNotification(admin.user_id, 'MODERATION_ACTION', 'POST', postId, userId);
          }
        }
      }
    }
    return report;
  }

  async markPostInteresting(userId: string, postId: string): Promise<ZirfeedModeration> {
    return this.modRepo.save(this.modRepo.create({
      item_type: 'POST',
      item_id: postId,
      reason: 'INTERESTING',
      confidence_score: 0,
      reviewer_id: null,
      reviewer_action: 'PENDING',
    }));
  }

  // ─── GROUPS MANAGEMENT ────────────────────────────────────────────────────
  async createGroup(userId: string, data: any): Promise<ZirfeedGroup> {
    const group = await this.groupRepo.save(this.groupRepo.create({ creator_id: userId, name: data.name, description: data.description, cover_photo: data.cover_photo || null, category: data.category, privacy: data.privacy || 'PUBLIC', posting_permission: data.posting_permission || 'ALL' }));
    await this.memberRepo.save(this.memberRepo.create({ group_id: group.id, user_id: userId, role: 'ADMIN', status: 'APPROVED' }));
    return group;
  }

  async joinGroup(userId: string, groupId: string): Promise<any> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Groupe introuvable.');
    const existing = await this.memberRepo.findOne({ where: { group_id: groupId, user_id: userId } });
    if (existing) throw new ForbiddenException('Déjà membre ou en attente.');
    const status = group.privacy === 'MEMBERS_ONLY' ? 'PENDING' : 'APPROVED';
    const mem = await this.memberRepo.save(this.memberRepo.create({ group_id: groupId, user_id: userId, role: 'MEMBER', status }));
    const memberCount = await this.memberRepo.count({ where: { group_id: groupId, status: 'APPROVED' } });
    return { member: mem, member_count: memberCount, pending: status === 'PENDING' };
  }

  async leaveGroup(userId: string, groupId: string): Promise<{ member_count: number }> {
    const mem = await this.memberRepo.findOne({ where: { group_id: groupId, user_id: userId } });
    if (!mem) throw new NotFoundException('Vous n\'êtes pas membre.');
    if (mem.role === 'ADMIN') throw new ForbiddenException('Un administrateur ne peut pas quitter le groupe.');
    await this.memberRepo.remove(mem);
    const memberCount = await this.memberRepo.count({ where: { group_id: groupId, status: 'APPROVED' } });
    return { member_count: memberCount };
  }

  async getGroupDetails(userId: string, groupId: string): Promise<any> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Groupe introuvable.');
    const memberCount = await this.memberRepo.count({ where: { group_id: groupId, status: 'APPROVED' } });
    const postCount = await this.postRepo.count({ where: { group_id: groupId, status: 'APPROVED' } });
    const myMembership = await this.memberRepo.findOne({ where: { group_id: groupId, user_id: userId } });
    const admins = await this.memberRepo.find({ where: { group_id: groupId, role: In(['ADMIN', 'CO_ADMIN']), status: 'APPROVED' } });
    const adminDetails = await Promise.all(admins.slice(0, 3).map(async a => {
      const u = await this.userRepo.findOne({ where: { id: a.user_id } });
      return { id: u?.id, name: u?.name, profile_picture_url: u?.profile_picture_url || '', role: a.role };
    }));

    // First page of group feed
    const feedPosts = await this.postRepo.find({
      where: { group_id: groupId, status: 'APPROVED' },
      order: { created_at: 'DESC' },
      take: 15,
    });
    const hydratedFeed = await Promise.all(feedPosts.map(p => this.hydratePost(p, userId)));

    return {
      ...group,
      member_count: memberCount,
      post_count: postCount,
      my_membership: myMembership ? { role: myMembership.role, status: myMembership.status } : null,
      admins: adminDetails,
      admin_count: admins.length,
      feed: hydratedFeed,
    };
  }

  async getGroupFeed(userId: string, groupId: string, page = 1, limit = 15): Promise<any[]> {
    const posts = await this.postRepo.find({
      where: { group_id: groupId, status: 'APPROVED' },
      order: { created_at: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    return Promise.all(posts.map(p => this.hydratePost(p, userId)));
  }

  async listGroupMembers(groupId: string): Promise<any[]> {
    const members = await this.memberRepo.find({ where: { group_id: groupId, status: 'APPROVED' }, order: { role: 'ASC' } });
    return Promise.all(members.map(async m => {
      const u = await this.userRepo.findOne({ where: { id: m.user_id } });
      return { id: m.id, user_id: m.user_id, name: u?.name, profile_picture_url: u?.profile_picture_url || '', role_badge: u?.role, membership_role: m.role };
    }));
  }

  async listPendingRequests(groupId: string): Promise<any[]> {
    const pending = await this.memberRepo.find({ where: { group_id: groupId, status: 'PENDING' } });
    return Promise.all(pending.map(async m => {
      const u = await this.userRepo.findOne({ where: { id: m.user_id } });
      return { id: m.id, user_id: m.user_id, name: u?.name, role: u?.role, governorate: u?.governorate, profile_picture_url: u?.profile_picture_url || '' };
    }));
  }

  async approveGroupRequest(adminId: string, groupId: string, targetUserId: string): Promise<void> {
    const adminMem = await this.memberRepo.findOne({ where: { group_id: groupId, user_id: adminId } });
    if (!adminMem || !['ADMIN', 'CO_ADMIN'].includes(adminMem.role)) throw new ForbiddenException('Non autorisé.');
    const mem = await this.memberRepo.findOne({ where: { group_id: groupId, user_id: targetUserId, status: 'PENDING' } });
    if (!mem) throw new NotFoundException('Demande introuvable.');
    mem.status = 'APPROVED';
    await this.memberRepo.save(mem);
    await this.emitSocialNotification(targetUserId, 'GROUP_POST', 'GROUP', groupId, adminId);
  }

  async rejectGroupRequest(adminId: string, groupId: string, targetUserId: string): Promise<void> {
    const adminMem = await this.memberRepo.findOne({ where: { group_id: groupId, user_id: adminId } });
    if (!adminMem || !['ADMIN', 'CO_ADMIN'].includes(adminMem.role)) throw new ForbiddenException('Non autorisé.');
    const mem = await this.memberRepo.findOne({ where: { group_id: groupId, user_id: targetUserId, status: 'PENDING' } });
    if (mem) await this.memberRepo.remove(mem);
  }

  async updateGroupPermission(adminId: string, groupId: string, permission: 'ALL' | 'ADMINS_ONLY'): Promise<ZirfeedGroup> {
    const adminMem = await this.memberRepo.findOne({ where: { group_id: groupId, user_id: adminId } });
    if (!adminMem || adminMem.role !== 'ADMIN') throw new ForbiddenException('Non autorisé.');
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Groupe introuvable.');
    group.posting_permission = permission;
    return this.groupRepo.save(group);
  }

  async removeMember(adminId: string, groupId: string, targetUserId: string): Promise<void> {
    const adminMem = await this.memberRepo.findOne({ where: { group_id: groupId, user_id: adminId } });
    if (!adminMem || !['ADMIN', 'CO_ADMIN'].includes(adminMem.role)) throw new ForbiddenException('Non autorisé.');
    const mem = await this.memberRepo.findOne({ where: { group_id: groupId, user_id: targetUserId } });
    if (mem && mem.role !== 'ADMIN') await this.memberRepo.remove(mem);
  }

  // ─── INSTITUTIONAL PAGES ──────────────────────────────────────────────────
  async createPage(userId: string, data: any): Promise<ZirfeedPage> {
    return this.pageRepo.save(this.pageRepo.create({ creator_id: userId, name: data.name, category: data.category, logo_url: data.logo_url || null, description: data.description, verification_doc_url: data.verification_doc_url, region: data.region || null, status: 'PENDING' }));
  }

  async getPageDetails(userId: string, pageId: string): Promise<any> {
    const page = await this.pageRepo.findOne({ where: { id: pageId } });
    if (!page) throw new NotFoundException('Page introuvable.');
    const isFollowing = !!(await this.followRepo.findOne({ where: { follower_id: userId, following_page_id: pageId } }));
    const isAdmin = page.creator_id === userId;
    const feed = await this.postRepo.find({ where: { page_id: pageId, status: 'APPROVED' }, order: { created_at: 'DESC' }, take: 15 });
    const hydratedFeed = await Promise.all(feed.map(p => this.hydratePost(p, userId)));
    return { ...page, is_following: isFollowing, is_admin: isAdmin, feed: hydratedFeed };
  }

  async getPageFeed(userId: string, pageId: string, page = 1, limit = 15): Promise<any[]> {
    const posts = await this.postRepo.find({ where: { page_id: pageId, status: 'APPROVED' }, order: { created_at: 'DESC' }, take: limit, skip: (page - 1) * limit });
    return Promise.all(posts.map(p => this.hydratePost(p, userId)));
  }

  async getScheduledPosts(userId: string, pageId: string): Promise<any[]> {
    const page = await this.pageRepo.findOne({ where: { id: pageId } });
    if (!page || page.creator_id !== userId) throw new ForbiddenException('Non autorisé.');
    return this.postRepo.find({ where: { page_id: pageId, status: 'SCHEDULED' }, order: { scheduled_for: 'ASC' } });
  }

  async cancelScheduledPost(userId: string, postId: string): Promise<void> {
    const post = await this.postRepo.findOne({ where: { id: postId, status: 'SCHEDULED' } });
    if (!post) throw new NotFoundException('Post planifié introuvable.');
    if (post.author_id !== userId) throw new ForbiddenException('Non autorisé.');
    await this.postRepo.remove(post);
  }

  // ─── EVENTS ───────────────────────────────────────────────────────────────
  async createEvent(userId: string, data: any): Promise<ZirfeedEvent> {
    return this.eventRepo.save(this.eventRepo.create({ creator_id: userId, page_id: data.page_id || null, name: data.name, description: data.description, start_date: new Date(data.start_date), end_date: data.end_date ? new Date(data.end_date) : null, location: data.location, cover_image: data.cover_image || null, category: data.category, register_url: data.register_url || null }));
  }

  async getEventDetails(userId: string, eventId: string): Promise<any> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Événement introuvable.');
    const myAttendance = await this.attendeeRepo.findOne({ where: { event_id: eventId, user_id: userId } });
    const goingList = await this.attendeeRepo.find({ where: { event_id: eventId, status: 'GOING' }, order: { id: 'DESC' }, take: 10 });
    const goingHydrated = await Promise.all(goingList.map(async a => {
      const u = await this.userRepo.findOne({ where: { id: a.user_id } });
      return { id: u?.id, name: u?.name, role: u?.role, profile_picture_url: u?.profile_picture_url || '' };
    }));
    const totalGoing = await this.attendeeRepo.count({ where: { event_id: eventId, status: 'GOING' } });
    const totalInterested = await this.attendeeRepo.count({ where: { event_id: eventId, status: 'INTERESTED' } });
    let page: ZirfeedPage | null = null;
    if (event.page_id) page = await this.pageRepo.findOne({ where: { id: event.page_id } });
    return { ...event, my_status: myAttendance?.status || null, going_count: totalGoing, interested_count: totalInterested, going_attendees: goingHydrated, page: page ? { name: page.name, logo_url: page.logo_url, category: page.category } : null };
  }

  async updateEventAttendance(userId: string, eventId: string, status: 'GOING' | 'INTERESTED' | 'NOT_GOING'): Promise<{ going_count: number; interested_count: number; my_status: string }> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Événement introuvable.');
    const existing = await this.attendeeRepo.findOne({ where: { event_id: eventId, user_id: userId } });
    if (existing) {
      if (status === 'NOT_GOING') await this.attendeeRepo.remove(existing);
      else { existing.status = status; await this.attendeeRepo.save(existing); }
    } else {
      if (status !== 'NOT_GOING') await this.attendeeRepo.save(this.attendeeRepo.create({ event_id: eventId, user_id: userId, status }));
    }
    const going = await this.attendeeRepo.count({ where: { event_id: eventId, status: 'GOING' } });
    const interested = await this.attendeeRepo.count({ where: { event_id: eventId, status: 'INTERESTED' } });
    // Update denormalized counts
    event.attendee_count = going;
    event.interested_count = interested;
    await this.eventRepo.save(event);
    return { going_count: going, interested_count: interested, my_status: status };
  }

  // ─── FAO NEWS ─────────────────────────────────────────────────────────────
  async crawlFaoNewsFeed(): Promise<number> {
    const items = [
      { source_name: 'FAO Communiqué', source_logo_url: 'https://upload.wikimedia.org/wikipedia/commons/d/db/FAO_logo.svg', headline: 'Renforcement de la résilience à la sécheresse en Tunisie', summary: 'La FAO lance un programme d\'accompagnement en Afrique du Nord pour installer des compteurs d\'eau connectés et préserver la nappe phréatique.', original_url: 'https://www.fao.org/newsroom/fr', published_at: new Date() },
      { source_name: 'Ministère de l\'Agriculture Tunisie', source_logo_url: 'assets/ziria-logo-main.png', headline: 'Subventions additionnelles pour les intrants céréaliers 2026', summary: 'Prise en charge exceptionnelle de 15% sur les engrais potassiques pour les petites exploitations.', original_url: 'http://www.agriculture.tn', published_at: new Date() },
    ];
    await this.newsRepo.update({}, { is_active: false });
    for (const item of items) await this.newsRepo.save(this.newsRepo.create({ ...item, is_active: true }));
    return items.length;
  }

  // ─── MAIN FEED ALGORITHM ──────────────────────────────────────────────────
  async compileMainFeed(userId: string, page = 1, limit = 15): Promise<any[]> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return [];
    const follows = await this.followRepo.find({ where: { follower_id: userId } });
    const followedUserIds = follows.filter(f => f.following_id).map(f => f.following_id as string);
    const followedPageIds = follows.filter(f => f.following_page_id).map(f => f.following_page_id as string);
    const myGroups = await this.memberRepo.find({ where: { user_id: userId, status: 'APPROVED' } });
    const myGroupIds = myGroups.map(m => m.group_id);

    const allPosts = await this.postRepo.find({ where: { status: 'APPROVED' }, order: { created_at: 'DESC' }, take: 200 });
    const seen = new Set<string>();
    const stream: ZirfeedPost[] = [];

    // Priority 1: followed users & pages
    for (const p of allPosts) {
      if (seen.has(p.id)) continue;
      if ((p.author_type === 'USER' && followedUserIds.includes(p.author_id)) || (p.author_type === 'PAGE' && p.page_id && followedPageIds.includes(p.page_id))) {
        stream.push(p); seen.add(p.id);
      }
    }
    // Priority 2: group posts (member of group)
    for (const p of allPosts) {
      if (seen.has(p.id)) continue;
      if (p.group_id && myGroupIds.includes(p.group_id)) { stream.push(p); seen.add(p.id); }
    }
    // Priority 3: promoted
    for (const p of allPosts) {
      if (seen.has(p.id)) continue;
      if (p.is_promoted) { stream.push(p); seen.add(p.id); }
    }
    // Priority 4: remaining (suggested)
    for (const p of allPosts) {
      if (!seen.has(p.id)) { stream.push(p); seen.add(p.id); }
    }

    // Inject news every 15
    const activeNews = await this.newsRepo.find({ where: { is_active: true } });
    let newsIdx = 0;
    const mixed: any[] = [];
    for (let i = 0; i < stream.length; i++) {
      mixed.push(stream[i]);
      if ((i + 1) % 15 === 0 && activeNews[newsIdx]) {
        mixed.push({ id: `news-${activeNews[newsIdx].id}`, post_type: 'NEWS_CARD', headline: activeNews[newsIdx].headline, summary: activeNews[newsIdx].summary, source_name: activeNews[newsIdx].source_name, source_logo_url: activeNews[newsIdx].source_logo_url, original_url: activeNews[newsIdx].original_url, created_at: activeNews[newsIdx].published_at });
        newsIdx = (newsIdx + 1) % (activeNews.length || 1);
      }
    }

    const paginated = mixed.slice((page - 1) * limit, page * limit);
    const hydrated: any[] = [];
    for (const item of paginated) {
      if (item.post_type === 'NEWS_CARD') { hydrated.push(item); continue; }
      hydrated.push(await this.hydratePost(item, userId));
    }
    return hydrated;
  }

  // ─── SOCIAL NOTIFICATIONS ─────────────────────────────────────────────────
  async emitSocialNotification(recipientId: string, type: string, itemType: string, itemId: string, senderId?: string): Promise<ZirfeedNotification> {
    const notif = this.notificationRepo.create({ recipient_id: recipientId, sender_id: senderId || null, notification_type: type, item_type: itemType, item_id: itemId });
    const saved = await this.notificationRepo.save(notif);
    this.broadcastSse('notification', { recipient_id: recipientId, notif_id: saved.id, type });
    return saved;
  }

  async listNotifications(userId: string): Promise<any[]> {
    const notifs = await this.notificationRepo.find({ where: { recipient_id: userId }, order: { created_at: 'DESC' }, relations: ['sender'], take: 50 });
    // Grouping: reactions on same post within 1h window, comments within 2h, follows daily
    const grouped: any[] = [];
    const reactionGroups: Map<string, any[]> = new Map();
    const commentGroups: Map<string, any[]> = new Map();
    for (const n of notifs) {
      if (n.notification_type === 'REACTION' && n.item_id) {
        const key = n.item_id;
        if (!reactionGroups.has(key)) reactionGroups.set(key, []);
        reactionGroups.get(key)!.push(n);
      } else if (n.notification_type === 'COMMENT' && n.item_id) {
        const key = n.item_id;
        if (!commentGroups.has(key)) commentGroups.set(key, []);
        commentGroups.get(key)!.push(n);
      } else {
        if (!n) continue;
        grouped.push({ ...n, sender: { name: n.sender?.name ?? 'Un utilisateur', profile_picture_url: n.sender?.profile_picture_url || '' }, grouped_count: 1 });
      }
    }
    for (const [itemId, list] of reactionGroups) {
      const first = list[0];
      const others = list.length - 1;
      grouped.push({ ...first, sender: { name: first.sender?.name ?? 'Un utilisateur', profile_picture_url: first.sender?.profile_picture_url || '' }, grouped_count: list.length, grouped_text: others > 0 ? `${first.sender?.name ?? 'Un utilisateur'} et ${others} autre${others > 1 ? 's' : ''} ont réagi à votre publication.` : `${first.sender?.name ?? 'Un utilisateur'} a réagi à votre publication.` });
    }
    for (const [itemId, list] of commentGroups) {
      const first = list[0];
      const others = list.length - 1;
      grouped.push({ ...first, sender: { name: first.sender?.name ?? 'Un utilisateur', profile_picture_url: first.sender?.profile_picture_url || '' }, grouped_count: list.length, grouped_text: others > 0 ? `${first.sender?.name ?? 'Un utilisateur'} et ${others} autre${others > 1 ? 's' : ''} ont commenté votre publication.` : `${first.sender?.name ?? 'Un utilisateur'} a commenté votre publication.` });
    }
    grouped.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return grouped;
  }

  async markNotificationRead(userId: string, notifId: string): Promise<void> {
    await this.notificationRepo.update({ id: notifId, recipient_id: userId }, { is_read: true });
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await this.notificationRepo.update({ recipient_id: userId }, { is_read: true });
  }

  // ─── SEARCH ───────────────────────────────────────────────────────────────
  async search(query: string): Promise<any> {
    const q = `%${query}%`;
    const [posts, users, groups, pages, events] = await Promise.all([
      this.postRepo.find({ where: [{ content_text: ILike(q), status: 'APPROVED' }, { hashtags: ILike(q) as any }], take: 8, order: { created_at: 'DESC' } }),
      this.userRepo.find({ where: [{ name: ILike(q) }], take: 8 }),
      this.groupRepo.find({ where: [{ name: ILike(q) }, { description: ILike(q) }], take: 8 }),
      this.pageRepo.find({ where: [{ name: ILike(q) }, { description: ILike(q) }], take: 8 }),
      this.eventRepo.find({ where: [{ name: ILike(q) }, { description: ILike(q) }], take: 6, order: { start_date: 'ASC' } }),
    ]);
    return {
      posts: posts.map(p => ({ id: p.id, content_preview: (p.content_text || '').substring(0, 100), post_type: p.post_type, created_at: p.created_at })),
      users: users.map(u => ({ id: u.id, name: u.name, role: u.role, profile_picture_url: u.profile_picture_url || '' })),
      groups: groups.map(g => ({ id: g.id, name: g.name, category: g.category })),
      pages: pages.map(p => ({ id: p.id, name: p.name, category: p.category, logo_url: p.logo_url })),
      events: events.map(e => ({ id: e.id, name: e.name, start_date: e.start_date, category: e.category })),
    };
  }

  // ─── FOLLOW / PAGE FOLLOW ─────────────────────────────────────────────────
  async followPage(userId: string, pageId: string): Promise<{ following: boolean; follower_count: number }> {
    const page = await this.pageRepo.findOne({ where: { id: pageId } });
    if (!page) throw new NotFoundException('Page introuvable.');
    const existing = await this.followRepo.findOne({ where: { follower_id: userId, following_page_id: pageId } });
    if (existing) {
      await this.followRepo.remove(existing);
      page.follower_count = Math.max(0, (page.follower_count || 1) - 1);
      await this.pageRepo.save(page);
      return { following: false, follower_count: page.follower_count };
    }
    await this.followRepo.save(this.followRepo.create({ follower_id: userId, following_page_id: pageId }));
    page.follower_count = (page.follower_count || 0) + 1;
    await this.pageRepo.save(page);
    await this.emitSocialNotification(page.creator_id, 'PAGE_POST', 'PAGE', pageId, userId);
    return { following: true, follower_count: page.follower_count };
  }

  async followUser(userId: string, targetId: string): Promise<{ following: boolean }> {
    const existing = await this.followRepo.findOne({ where: { follower_id: userId, following_id: targetId } });
    if (existing) { await this.followRepo.remove(existing); return { following: false }; }
    await this.followRepo.save(this.followRepo.create({ follower_id: userId, following_id: targetId }));
    await this.emitSocialNotification(targetId, 'FOLLOW', 'USER', targetId, userId);
    return { following: true };
  }

  async listFollowers(userId: string): Promise<any[]> {
    const list = await this.followRepo.find({ where: { following_id: userId } });
    return Promise.all(list.map(async f => {
      const u = await this.userRepo.findOne({ where: { id: f.follower_id } });
      const iFollowBack = !!(await this.followRepo.findOne({ where: { follower_id: userId, following_id: f.follower_id } }));
      return { id: u?.id, name: u?.name, role: u?.role, profile_picture_url: u?.profile_picture_url || '', i_follow_back: iFollowBack };
    }));
  }

  async listFollowing(userId: string): Promise<any> {
    const list = await this.followRepo.find({ where: { follower_id: userId } });
    const users = await Promise.all(list.filter(f => f.following_id).map(async f => {
      const u = await this.userRepo.findOne({ where: { id: f.following_id! } });
      return { type: 'user', id: u?.id, name: u?.name, role: u?.role, profile_picture_url: u?.profile_picture_url || '', follow_id: f.id };
    }));
    const pages = await Promise.all(list.filter(f => f.following_page_id).map(async f => {
      const p = await this.pageRepo.findOne({ where: { id: f.following_page_id! } });
      return { type: 'page', id: p?.id, name: p?.name, logo_url: p?.logo_url, category: p?.category, follow_id: f.id };
    }));
    return { users: users.filter(Boolean), pages: pages.filter(Boolean) };
  }

  async unfollowUser(userId: string, targetId: string): Promise<void> {
    const f = await this.followRepo.findOne({ where: { follower_id: userId, following_id: targetId } });
    if (f) await this.followRepo.remove(f);
  }

  // ─── ATTEND EVENT ─────────────────────────────────────────────────────────
  async attendEvent(userId: string, eventId: string): Promise<{ attending: boolean; attendee_count: number }> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Événement introuvable.');
    const existing = await this.attendeeRepo.findOne({ where: { event_id: eventId, user_id: userId } });
    if (existing) {
      await this.attendeeRepo.remove(existing);
      event.attendee_count = Math.max(0, (event.attendee_count || 1) - 1);
      await this.eventRepo.save(event);
      return { attending: false, attendee_count: event.attendee_count };
    }
    await this.attendeeRepo.save(this.attendeeRepo.create({ event_id: eventId, user_id: userId, status: 'GOING' }));
    event.attendee_count = (event.attendee_count || 0) + 1;
    await this.eventRepo.save(event);
    return { attending: true, attendee_count: event.attendee_count };
  }

  // ─── PROFILE STATS ────────────────────────────────────────────────────────
  async getProfileStats(userId: string): Promise<any> {
    const profile = await this.getOrCreateProfile(userId);
    const [postsCount, followersCount, followingCount, user] = await Promise.all([
      this.postRepo.count({ where: { author_id: userId, status: 'APPROVED' } }),
      this.followRepo.count({ where: { following_id: userId } }),
      this.followRepo.count({ where: { follower_id: userId } }),
      this.userRepo.findOne({ where: { id: userId } }),
    ]);
    return { ...profile, user: { id: user?.id, name: user?.name, role: user?.role, email: user?.email, profile_picture_url: user?.profile_picture_url || '' }, posts_count: postsCount, followers_count: followersCount, following_count: followingCount };
  }

  // ─── LIST HELPERS ─────────────────────────────────────────────────────────
  async listGroups(userId?: string): Promise<any[]> {
    const groups = await this.groupRepo.find({ order: { name: 'ASC' } });
    return Promise.all(groups.map(async g => {
      const memberCount = await this.memberRepo.count({ where: { group_id: g.id, status: 'APPROVED' } });
      const postCount = await this.postRepo.count({ where: { group_id: g.id, status: 'APPROVED' } });
      let myStatus: string | null = null;
      if (userId) {
        const mem = await this.memberRepo.findOne({ where: { group_id: g.id, user_id: userId } });
        myStatus = mem ? mem.status === 'APPROVED' ? 'MEMBER' : 'PENDING' : null;
        if (mem?.role === 'ADMIN' || mem?.role === 'CO_ADMIN') myStatus = mem.role;
      }
      return { ...g, member_count: memberCount, post_count: postCount, my_status: myStatus };
    }));
  }

  async listPages(userId?: string): Promise<any[]> {
    const pages = await this.pageRepo.find({ where: { status: 'APPROVED' }, order: { name: 'ASC' } });
    return Promise.all(pages.map(async p => {
      let isFollowing = false;
      if (userId) isFollowing = !!(await this.followRepo.findOne({ where: { follower_id: userId, following_page_id: p.id } }));
      return { ...p, is_following: isFollowing };
    }));
  }

  async listEvents(userId?: string): Promise<any[]> {
    const events = await this.eventRepo.find({ where: { start_date: MoreThanOrEqual(new Date()) }, order: { start_date: 'ASC' } });
    return Promise.all(events.map(async e => {
      let myStatus: string | null = null;
      if (userId) {
        const att = await this.attendeeRepo.findOne({ where: { event_id: e.id, user_id: userId } });
        myStatus = att?.status || null;
      }
      let page: any = null;
      if (e.page_id) {
        const p = await this.pageRepo.findOne({ where: { id: e.page_id } });
        if (p) page = { name: p.name, logo_url: p.logo_url };
      }
      const going = await this.attendeeRepo.count({ where: { event_id: e.id, status: 'GOING' } });
      const interested = await this.attendeeRepo.count({ where: { event_id: e.id, status: 'INTERESTED' } });
      return { ...e, my_status: myStatus, page, going_count: going, interested_count: interested };
    }));
  }

  async listArchivedEvents(): Promise<ZirfeedEvent[]> {
    return this.eventRepo.find({ where: { start_date: LessThan(new Date()) }, order: { start_date: 'DESC' } });
  }

  async listCollections(userId: string): Promise<ZirfeedSavedCollection[]> {
    return this.collectionRepo.find({ where: { user_id: userId }, order: { collection_name: 'ASC' } });
  }

  // ─── STORIES SYSTEM ──────────────────────────────────────────────────────
  async createStory(userId: string, data: any): Promise<ZirfeedStory> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    const story = new (this.storyRepo.target as any)();
    story.author_id = userId;
    story.shared_post_id = data.shared_post_id || null;
    story.story_text = data.story_text || null;
    story.story_media_url = data.story_media_url || null;
    story.expires_at = expiresAt;
    story.is_expired = false;
    return this.storyRepo.save(story);
  }

  async deleteStory(userId: string, storyId: string): Promise<void> {
    const story = await this.storyRepo.findOne({ where: { id: storyId } });
    if (!story) throw new NotFoundException('Story introuvable.');
    if (story.author_id !== userId) throw new ForbiddenException('Vous ne pouvez pas supprimer cette story.');
    await this.storyRepo.remove(story);
  }

  async getActiveStories(userId: string): Promise<any[]> {
    const now = new Date();
    const follows = await this.followRepo.find({ where: { follower_id: userId } });
    const followedIds = follows.filter(f => f.following_id).map(f => f.following_id as string);
    const authorIds = [userId, ...followedIds];

    const activeStories = await this.storyRepo.find({
      where: {
        author_id: In(authorIds),
        is_expired: false,
        expires_at: MoreThan(now),
      },
      order: { created_at: 'DESC' },
    });

    const hydrated: any[] = [];
    for (const story of activeStories) {
      const author = await this.userRepo.findOne({ where: { id: story.author_id } });
      let sharedPost: any = null;
      if (story.shared_post_id) {
        const orig = await this.postRepo.findOne({ where: { id: story.shared_post_id } });
        if (orig) {
          sharedPost = await this.hydratePost(orig, userId, false);
        }
      }
      hydrated.push({
        ...story,
        author: {
          id: author?.id,
          name: author?.name,
          role: author?.role,
          profile_picture_url: author?.profile_picture_url || '',
          verified: author?.verified || false,
        },
        shared_post: sharedPost,
      });
    }
    return hydrated;
  }

  async getActiveStoriesGrouped(userId: string): Promise<any[]> {
    const stories = await this.getActiveStories(userId);
    const groups: Record<string, any> = {};
    for (const s of stories) {
      const authId = s.author_id;
      if (!groups[authId]) {
        groups[authId] = {
          author: s.author,
          stories: [],
        };
      }
      groups[authId].stories.push(s);
    }
    return Object.values(groups);
  }

  @Interval(3600000)
  async expireStories() {
    const now = new Date();
    await this.storyRepo.update(
      { is_expired: false, expires_at: LessThan(now) },
      { is_expired: true }
    );
  }

  // ─── SHARE POST ──────────────────────────────────────────────────────────
  async shareToFeed(userId: string, postId: string): Promise<ZirfeedPost> {
    const orig = await this.postRepo.findOne({ where: { id: postId } });
    if (!orig) throw new NotFoundException('Publication d\'origine introuvable.');
    const post = this.postRepo.create({
      author_id: userId,
      author_type: 'USER',
      post_type: 'TEXT',
      content_text: `a partagé une publication`,
      shared_from_post_id: postId,
      is_pinned: false,
      status: 'APPROVED',
    });
    await this.postRepo.increment({ id: postId }, 'share_count', 1);
    const saved = await this.postRepo.save(post);
    this.broadcastSse('new_post', { post_id: saved.id, author_id: userId });
    return saved;
  }

  // ─── SOCIAL PROFILE & MORE ────────────────────────────────────────────────
  async getUserProfile(viewerId: string, targetId: string): Promise<any> {
    const user = await this.userRepo.findOne({ where: { id: targetId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    const profile = await this.profileRepo.findOne({ where: { user_id: targetId } });
    const followersCount = await this.followRepo.count({ where: { following_id: targetId } });
    const followingCount = await this.followRepo.count({ where: { follower_id: targetId } });
    const isFollowing = await this.followRepo.findOne({ where: { follower_id: viewerId, following_id: targetId } });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      governorate: user.governorate,
      profile_picture_url: user.profile_picture_url || '',
      verified: user.verified || false,
      bio: profile?.bio || '',
      cover_photo: profile?.cover_photo_url || '',
      specialties: [],
      achievements: [],
      followers_count: followersCount,
      following_count: followingCount,
      is_following: !!isFollowing,
    };
  }

  async getUserPosts(userId: string, page = 1, limit = 10): Promise<any[]> {
    const posts = await this.postRepo.find({
      where: { author_id: userId, status: 'APPROVED' },
      order: { created_at: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    return Promise.all(posts.map(p => this.hydratePost(p, userId)));
  }

  async getUserReels(userId: string): Promise<any[]> {
    const reels = await this.postRepo.find({
      where: { author_id: userId, post_type: 'REEL', status: 'APPROVED' },
      order: { created_at: 'DESC' },
    });
    return Promise.all(reels.map(r => this.hydratePost(r, userId)));
  }

  async getUserSoutenu(userId: string): Promise<any[]> {
    const reactions = await this.reactionRepo.find({
      where: { user_id: userId, reaction_type: 'SOUTIEN' },
    });
    const postIds = reactions.filter(r => r.post_id).map(r => r.post_id as string);
    if (postIds.length === 0) return [];
    const posts = await this.postRepo.find({
      where: { id: In(postIds), status: 'APPROVED' },
      order: { created_at: 'DESC' },
    });
    return Promise.all(posts.map(p => this.hydratePost(p, userId)));
  }

  async getUserSuggestions(userId: string): Promise<any[]> {
    const currentUser = await this.userRepo.findOne({ where: { id: userId } });
    if (!currentUser) return [];
    const follows = await this.followRepo.find({ where: { follower_id: userId } });
    const followedIds = follows.filter(f => f.following_id).map(f => f.following_id as string);
    const excludeIds = [userId, ...followedIds];

    const candidates = await this.userRepo.find({
      where: [
        { role: currentUser.role },
        { governorate: currentUser.governorate },
      ],
      take: 10,
    });

    const filtered = candidates.filter(u => !excludeIds.includes(u.id));
    return filtered.map(u => ({
      id: u.id,
      name: u.name,
      role: u.role,
      governorate: u.governorate,
      profile_picture_url: u.profile_picture_url || '',
      verified: u.verified,
    })).slice(0, 5);
  }

  async getMaCommunaute(userId: string): Promise<any> {
    const memberships = await this.memberRepo.find({ where: { user_id: userId, status: 'APPROVED' } });
    const groupIds = memberships.map(m => m.group_id);
    let groups: ZirfeedGroup[] = [];
    if (groupIds.length > 0) {
      groups = await this.groupRepo.find({
        where: { id: In(groupIds) },
        take: 3,
      });
    }
    if (groups.length < 3) {
      const rest = await this.groupRepo.find({ take: 3 - groups.length });
      for (const g of rest) {
        if (!groups.find(existing => existing.id === g.id)) {
          groups.push(g);
        }
      }
    }
    const pages = await this.pageRepo.find({ take: 2 });
    return {
      groups: groups.map(g => ({ id: g.id, name: g.name, cover_photo: g.cover_photo || '' })),
      pages: pages.map(p => ({ id: p.id, name: p.name, logo_url: p.logo_url || '', category: p.category })),
    };
  }

  async getTrendingHashtags(): Promise<any[]> {
    return this.hashtagRepo.find({
      order: { usage_count: 'DESC' },
      take: 5,
    });
  }

  // ─── SSE BROADCASTER ─────────────────────────────────────────────────────
  broadcastSse(event: string, data: any) {
    this.sseStream$.next({ event, data });
  }
}
