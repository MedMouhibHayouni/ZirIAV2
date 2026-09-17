import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

// ─── USER PROFILE FOR ZIRFEED ──────────────────────────────────────────────
@Entity('zirfeed_user_profile')
export class ZirfeedUserProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', unique: true })
  user_id: string;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'varchar', nullable: true })
  cover_photo_url: string | null;

  @Column({ type: 'varchar', length: 20, default: 'PUBLIC' })
  profile_visibility: 'PUBLIC' | 'PRIVATE';

  @Column({ default: true })
  show_groups: boolean;

  @Column({ default: true })
  show_following: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}

// ─── FOLLOWS ───────────────────────────────────────────────────────────────
@Entity('zirfeed_follows')
export class ZirfeedFollow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'follower_id' })
  follower: User;

  @Column({ name: 'follower_id' })
  follower_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'following_id' })
  following: User | null;

  @Column({ name: 'following_id', nullable: true })
  following_id: string | null;

  @Column({ name: 'following_page_id', type: 'uuid', nullable: true })
  following_page_id: string | null;

  @Column({ name: 'following_group_id', type: 'uuid', nullable: true })
  following_group_id: string | null;
}

// ─── PAGES (OFFICIAL INSTITUTIONS) ─────────────────────────────────────────
@Entity('zirfeed_pages')
export class ZirfeedPage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @Column({ name: 'creator_id' })
  creator_id: string;

  @Column()
  name: string;

  @Column()
  category: string; // 'Bank' | 'Insurance' | 'Brand' | 'Government' | 'Cooperative' | 'Business'

  @Column({ type: 'varchar', nullable: true })
  logo_url: string | null;

  @Column({ type: 'text' })
  description: string;

  @Column()
  verification_doc_url: string;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: 'PENDING' | 'APPROVED' | 'REJECTED';

  @Column({ type: 'jsonb', nullable: true })
  contact_info: {
    website?: string;
    phone?: string;
    email?: string;
  } | null;

  @Column({ default: 0 })
  follower_count: number;

  @Column({ default: 0 })
  post_count: number;

  @Column({ default: false })
  is_promoted: boolean;

  @Column({ type: 'varchar', nullable: true })
  region: string | null; // e.g. Tunisian governorates

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}

// ─── GROUPS (COMMUNITIES) ──────────────────────────────────────────────────
@Entity('zirfeed_groups')
export class ZirfeedGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @Column({ name: 'creator_id' })
  creator_id: string;

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', nullable: true })
  cover_photo: string | null;

  @Column()
  category: string; // 'Cereal Farming' | 'Olive Cultivation' | 'Livestock' | ...

  @Column({ type: 'varchar', length: 20, default: 'PUBLIC' })
  privacy: 'PUBLIC' | 'MEMBERS_ONLY';

  @Column({ type: 'varchar', length: 20, default: 'ALL' })
  posting_permission: 'ALL' | 'ADMINS_ONLY';

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}

@Entity('zirfeed_group_members')
export class ZirfeedGroupMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ZirfeedGroup, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: ZirfeedGroup;

  @Column({ name: 'group_id' })
  group_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  user_id: string;

  @Column({ type: 'varchar', length: 20, default: 'MEMBER' })
  role: 'ADMIN' | 'CO_ADMIN' | 'MEMBER';

  @Column({ type: 'varchar', length: 20, default: 'APPROVED' })
  status: 'PENDING' | 'APPROVED';
}

// ─── POSTS ─────────────────────────────────────────────────────────────────
@Entity('zirfeed_posts')
export class ZirfeedPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ name: 'author_id' })
  author_id: string;

  @Column({ type: 'varchar', length: 10, default: 'USER' })
  author_type: 'USER' | 'PAGE';

  @ManyToOne(() => ZirfeedPage, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'page_id' })
  page: ZirfeedPage | null;

  @Column({ name: 'page_id', type: 'uuid', nullable: true })
  page_id: string | null;

  @ManyToOne(() => ZirfeedGroup, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'group_id' })
  group: ZirfeedGroup | null;

  @Column({ name: 'group_id', type: 'uuid', nullable: true })
  group_id: string | null;

  @Column({ type: 'varchar', length: 20, default: 'TEXT' })
  post_type: 'TEXT' | 'PHOTO' | 'VIDEO' | 'VOICE_NOTE' | 'REEL' | 'DOCUMENT' | 'MIXED';

  @Column({ type: 'text', nullable: true })
  content_text: string | null;

  @Column({ type: 'jsonb', default: [] })
  media_urls: string[]; // up to 6 images/videos

  @Column({ type: 'varchar', nullable: true })
  document_url: string | null;

  @Column({ type: 'jsonb', nullable: true })
  document_metadata: {
    title: string;
    pageCount: number;
  } | null;

  @Column({ type: 'varchar', nullable: true })
  voice_note_url: string | null;

  @Column({ type: 'jsonb', nullable: true })
  voice_note_waveform: number[] | null; // peak amplitudes array

  @Column({ type: 'int', nullable: true })
  voice_note_duration: number | null;

  @Column({ type: 'varchar', nullable: true })
  thumbnail_url: string | null; // Reel or video thumbnail

  @Column({ type: 'text', nullable: true })
  caption: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  hashtags: string[];

  @Column({ type: 'uuid', array: true, default: '{}' })
  mentions: string[];

  @Column({ type: 'varchar', length: 20, default: 'PROCESSING' })
  status: 'PROCESSING' | 'APPROVED' | 'FLAGGED' | 'REJECTED' | 'SCHEDULED';

  @Column({ type: 'timestamp', nullable: true })
  scheduled_for: Date | null;

  @Column({ default: false })
  is_promoted: boolean;

  @Column({ default: 0 })
  views_count: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  language_detected: 'FR' | 'AR' | 'MIXED' | 'OTHER' | null;

  @Column({ default: false })
  is_pinned: boolean;

  @Column({ type: 'varchar', nullable: true })
  moderation_note: string | null; // e.g. VOICE_NOTE_UNREVIEWED, VIDEO_CONTENT_UNREVIEWED

  @Column({ name: 'shared_from_post_id', type: 'uuid', nullable: true })
  shared_from_post_id: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  post_context: 'CONSEIL' | 'ALERTE' | 'QUESTION' | 'CELEBRATION' | 'ACTUALITE' | null;

  @Column({ default: 0 })
  share_count: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}

// ─── COMMENTS ──────────────────────────────────────────────────────────────
@Entity('zirfeed_comments')
export class ZirfeedComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ZirfeedPost, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: ZirfeedPost;

  @Column({ name: 'post_id' })
  post_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ name: 'author_id' })
  author_id: string;

  @ManyToOne(() => ZirfeedComment, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: ZirfeedComment | null;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parent_id: string | null;

  @Column({ type: 'text' })
  content_text: string;

  @Column({ type: 'varchar', nullable: true })
  image_url: string | null;

  @Column({ type: 'varchar', nullable: true })
  voice_note_url: string | null;

  @Column({ type: 'int', nullable: true })
  voice_note_duration: number | null;

  @Column({ type: 'varchar', length: 20, default: 'APPROVED' })
  status: 'APPROVED' | 'FLAGGED' | 'REJECTED';

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}

// ─── REACTIONS ─────────────────────────────────────────────────────────────
@Entity('zirfeed_reactions')
export class ZirfeedReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ZirfeedPost, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'post_id' })
  post: ZirfeedPost | null;

  @Column({ name: 'post_id', type: 'uuid', nullable: true })
  post_id: string | null;

  @ManyToOne(() => ZirfeedComment, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'comment_id' })
  comment: ZirfeedComment | null;

  @Column({ name: 'comment_id', type: 'uuid', nullable: true })
  comment_id: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  user_id: string;

  @Column()
  reaction_type: string; // 'ADMIRE' | 'THINKING' | 'COLLABORATE' | 'INSIGHTFUL' | 'AGREE'
}

// ─── SAVED COLLECTIONS & SAVED POSTS ───────────────────────────────────────
@Entity('zirfeed_saved_collections')
export class ZirfeedSavedCollection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  user_id: string;

  @Column()
  collection_name: string;

  @Column({ type: 'varchar', nullable: true })
  cover_image: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}

@Entity('zirfeed_saved_posts')
export class ZirfeedSavedPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  user_id: string;

  @ManyToOne(() => ZirfeedSavedCollection, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'collection_id' })
  collection: ZirfeedSavedCollection;

  @Column({ name: 'collection_id' })
  collection_id: string;

  @ManyToOne(() => ZirfeedPost, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'post_id' })
  post: ZirfeedPost | null;

  @Column({ name: 'post_id', type: 'uuid', nullable: true })
  post_id: string | null;

  @ManyToOne(() => ZirfeedPost, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'reel_id' })
  reel: ZirfeedPost | null;

  @Column({ name: 'reel_id', type: 'uuid', nullable: true })
  reel_id: string | null;

  @Column({ name: 'event_id', type: 'uuid', nullable: true })
  event_id: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}

// ─── EVENTS ────────────────────────────────────────────────────────────────
@Entity('zirfeed_events')
export class ZirfeedEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @Column({ name: 'creator_id' })
  creator_id: string;

  @ManyToOne(() => ZirfeedPage, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'page_id' })
  page: ZirfeedPage | null;

  @Column({ name: 'page_id', type: 'uuid', nullable: true })
  page_id: string | null;

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'timestamp' })
  start_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  end_date: Date | null;

  @Column()
  location: string; // online link or physical address

  @Column({ type: 'varchar', nullable: true })
  cover_image: string | null;

  @Column()
  category: string; // 'Agricultural Fair' | 'Training Workshop' | 'Investment Forum' | 'Field Day' | 'Market Day'

  @Column({ default: 0 })
  attendee_count: number;

  @Column({ default: 0 })
  interested_count: number;

  @Column({ type: 'varchar', nullable: true })
  register_url: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}

@Entity('zirfeed_event_attendees')
export class ZirfeedEventAttendee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ZirfeedEvent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: ZirfeedEvent;

  @Column({ name: 'event_id' })
  event_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  user_id: string;

  @Column({ type: 'varchar', length: 20 })
  status: 'GOING' | 'INTERESTED' | 'NOT_GOING';
}

// ─── EXTERNAL NEWS (FAO CRAWLER CACHE) ──────────────────────────────────────
@Entity('zirfeed_external_news')
export class ZirfeedExternalNews {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  source_name: string;

  @Column({ type: 'varchar', nullable: true })
  source_logo_url: string | null;

  @Column()
  headline: string;

  @Column({ type: 'text' })
  summary: string;

  @Column()
  original_url: string;

  @Column({ type: 'timestamp' })
  published_at: Date;

  @CreateDateColumn({ name: 'fetched_at' })
  fetched_at: Date;

  @Column({ default: true })
  is_active: boolean;
}

// ─── HASHTAG TRACKING ──────────────────────────────────────────────────────
@Entity('zirfeed_hashtags')
export class ZirfeedHashtag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  tag: string;

  @Column({ default: 0 })
  usage_count: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  last_used_at: Date;
}

// ─── MODERATION QUEUE & RESTRICTIONS ───────────────────────────────────────
@Entity('zirfeed_moderation')
export class ZirfeedModeration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  item_type: 'POST' | 'COMMENT';

  @Column({ type: 'uuid' })
  item_id: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'decimal', precision: 5, scale: 4 })
  confidence_score: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: User | null;

  @Column({ name: 'reviewer_id', type: 'uuid', nullable: true })
  reviewer_id: string | null;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  reviewer_action: 'PENDING' | 'APPROVE' | 'REJECT' | 'ESCALATE';

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}

@Entity('zirfeed_moderation_restrictions')
export class ZirfeedModerationRestriction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  user_id: string;

  @Column({ type: 'timestamp' })
  restriction_start: Date;

  @Column({ type: 'timestamp' })
  restriction_end: Date;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'varchar', length: 20 })
  restriction_type: 'POST_BAN' | 'FULL_BAN';
}

// ─── SOCIAL NOTIFICATIONS ──────────────────────────────────────────────────
@Entity('zirfeed_notifications')
export class ZirfeedNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

  @Column({ name: 'recipient_id' })
  recipient_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'sender_id' })
  sender: User | null;

  @Column({ name: 'sender_id', nullable: true })
  sender_id: string | null;

  @Column()
  notification_type: string; // 'FOLLOW' | 'REACTION' | 'COMMENT' | 'REPLY' | 'MENTION' | 'GROUP_POST' | 'PAGE_POST' | 'EVENT_REMINDER' | 'MODERATION_ACTION'

  @Column()
  item_type: string; // 'POST' | 'COMMENT' | 'EVENT' | 'GROUP' | 'PAGE'

  @Column({ type: 'uuid' })
  item_id: string;

  @Column({ default: false })
  is_read: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}

// ─── STORIES (24H EPHEMERAL) ───────────────────────────────────────────────
@Entity('zirfeed_stories')
export class ZirfeedStory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ name: 'author_id' })
  author_id: string;

  @ManyToOne(() => ZirfeedPost, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'shared_post_id' })
  shared_post: ZirfeedPost | null;

  @Column({ name: 'shared_post_id', type: 'uuid', nullable: true })
  shared_post_id: string | null;

  @Column({ type: 'text', nullable: true })
  story_text: string | null;

  @Column({ type: 'text', nullable: true })
  story_media_url: string | null;

  @Column({ default: false })
  is_expired: boolean;

  @Column({ type: 'timestamp', nullable: true })
  expires_at: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
