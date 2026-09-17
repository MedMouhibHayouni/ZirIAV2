import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZirFeedController } from './zirfeed.controller';
import { ZirFeedService } from './zirfeed.service';
import { GeminiModule } from '../ai/services/gemini.module';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
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
    ]),
    GeminiModule,
  ],
  controllers: [ZirFeedController],
  providers: [ZirFeedService],
  exports: [ZirFeedService],
})
export class ZirFeedModule {}
