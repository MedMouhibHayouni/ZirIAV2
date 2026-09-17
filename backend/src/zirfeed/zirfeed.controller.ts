import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, Req, UseGuards, Sse, HttpCode, HttpStatus
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZirFeedService } from './zirfeed.service';
import { Observable, fromEvent, map } from 'rxjs';

@Controller('zirfeed')
export class ZirFeedController {
  constructor(private readonly svc: ZirFeedService) {}

  // ─── SSE ──────────────────────────────────────────────────────────────────
  @Sse('stream')
  stream(): Observable<MessageEvent> {
    return this.svc.sseStream$.pipe(
      map(data => ({ data: JSON.stringify(data) }) as MessageEvent)
    );
  }

  // ─── PROFILE ──────────────────────────────────────────────────────────────
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: any) {
    return this.svc.getProfileStats(req.user.sub);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(@Req() req: any, @Body() body: any) {
    return this.svc.updateProfile(req.user.sub, body);
  }

  @Get('profile/followers')
  @UseGuards(JwtAuthGuard)
  listFollowers(@Req() req: any) {
    return this.svc.listFollowers(req.user.sub);
  }

  @Get('profile/following')
  @UseGuards(JwtAuthGuard)
  listFollowing(@Req() req: any) {
    return this.svc.listFollowing(req.user.sub);
  }

  // ─── POSTS ────────────────────────────────────────────────────────────────
  @Get('feed')
  @UseGuards(JwtAuthGuard)
  getFeed(
    @Req() req: any,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.svc.compileMainFeed(req.user.sub, +(page || 1), +(limit || 15));
  }

  @Post('posts')
  @UseGuards(JwtAuthGuard)
  createPost(@Req() req: any, @Body() body: any) {
    return this.svc.createPost(req.user.sub, body);
  }

  @Delete('posts/:id/scheduled')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  cancelScheduledPost(@Req() req: any, @Param('id') postId: string) {
    return this.svc.cancelScheduledPost(req.user.sub, postId);
  }

  // ─── COMMENTS ─────────────────────────────────────────────────────────────
  @Post('comments')
  @UseGuards(JwtAuthGuard)
  createComment(@Req() req: any, @Body() body: any) {
    return this.svc.createComment(req.user.sub, body);
  }

  @Get('posts/:postId/comments')
  @UseGuards(JwtAuthGuard)
  listComments(@Param('postId') postId: string) {
    return this.svc.listComments(postId);
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteComment(@Req() req: any, @Param('id') id: string) {
    return this.svc.deleteComment(req.user.sub, id);
  }

  // ─── REACTIONS ────────────────────────────────────────────────────────────
  @Post('reactions')
  @UseGuards(JwtAuthGuard)
  toggleReaction(@Req() req: any, @Body() body: { post_id?: string; comment_id?: string; type: string }) {
    return this.svc.toggleReaction(req.user.sub, body);
  }
  // ─── STORIES ───────────────────────────────────────────────────────────────
  @Get('stories')
  @UseGuards(JwtAuthGuard)
  getStories(@Req() req: any) {
    return this.svc.getActiveStoriesGrouped(req.user.sub);
  }

  @Post('stories')
  @UseGuards(JwtAuthGuard)
  createStory(@Req() req: any, @Body() body: any) {
    return this.svc.createStory(req.user.sub, body);
  }

  @Delete('stories/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteStory(@Req() req: any, @Param('id') id: string) {
    return this.svc.deleteStory(req.user.sub, id);
  }
  // ─── BOOKMARKS ────────────────────────────────────────────────────────────
  @Get('collections')
  @UseGuards(JwtAuthGuard)
  listCollections(@Req() req: any) {
    return this.svc.listCollections(req.user.sub);
  }

  @Post('collections')
  @UseGuards(JwtAuthGuard)
  createCollection(@Req() req: any, @Body() body: { name: string; cover?: string }) {
    return this.svc.createCollection(req.user.sub, body.name, body.cover);
  }

  @Post('collections/:id/save')
  @UseGuards(JwtAuthGuard)
  savePost(@Req() req: any, @Param('id') colId: string, @Body() body: { post_id: string }) {
    return this.svc.savePost(req.user.sub, body.post_id, colId);
  }

  @Post('posts/:id/report')
  @UseGuards(JwtAuthGuard)
  reportPost(@Req() req: any, @Param('id') postId: string, @Body() body: { reason: string; details?: string }) {
    return this.svc.reportPost(req.user.sub, postId, body.reason, body.details);
  }

  @Post('posts/:id/interesting')
  @UseGuards(JwtAuthGuard)
  markPostInteresting(@Req() req: any, @Param('id') postId: string) {
    return this.svc.markPostInteresting(req.user.sub, postId);
  }

  // ─── REELS ────────────────────────────────────────────────────────────────
  @Get('reels')
  @UseGuards(JwtAuthGuard)
  getReels(
    @Req() req: any,
    @Query('tab') tab: 'foryou' | 'following',
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.svc.getReelsFeed(req.user.sub, tab || 'foryou', +(page || 1), +(limit || 10));
  }

  @Post('reels/:id/view')
  @UseGuards(JwtAuthGuard)
  trackReelView(@Param('id') id: string) {
    return this.svc.trackReelView(id);
  }

  // ─── GROUPS ───────────────────────────────────────────────────────────────
  @Get('groups')
  @UseGuards(JwtAuthGuard)
  listGroups(@Req() req: any) {
    return this.svc.listGroups(req.user.sub);
  }

  @Post('groups')
  @UseGuards(JwtAuthGuard)
  createGroup(@Req() req: any, @Body() body: any) {
    return this.svc.createGroup(req.user.sub, body);
  }

  @Get('groups/:id')
  @UseGuards(JwtAuthGuard)
  getGroupDetails(@Req() req: any, @Param('id') id: string) {
    return this.svc.getGroupDetails(req.user.sub, id);
  }

  @Get('groups/:id/feed')
  @UseGuards(JwtAuthGuard)
  getGroupFeed(
    @Req() req: any,
    @Param('id') id: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.svc.getGroupFeed(req.user.sub, id, +(page || 1), +(limit || 15));
  }

  @Post('groups/:id/join')
  @UseGuards(JwtAuthGuard)
  joinGroup(@Req() req: any, @Param('id') id: string) {
    return this.svc.joinGroup(req.user.sub, id);
  }

  @Post('groups/:id/leave')
  @UseGuards(JwtAuthGuard)
  leaveGroup(@Req() req: any, @Param('id') id: string) {
    return this.svc.leaveGroup(req.user.sub, id);
  }

  @Get('groups/:id/members')
  @UseGuards(JwtAuthGuard)
  listGroupMembers(@Param('id') id: string) {
    return this.svc.listGroupMembers(id);
  }

  @Get('groups/:id/requests')
  @UseGuards(JwtAuthGuard)
  listPendingRequests(@Req() req: any, @Param('id') id: string) {
    return this.svc.listPendingRequests(id);
  }

  @Post('groups/:id/requests/:userId/approve')
  @UseGuards(JwtAuthGuard)
  approveRequest(@Req() req: any, @Param('id') groupId: string, @Param('userId') userId: string) {
    return this.svc.approveGroupRequest(req.user.sub, groupId, userId);
  }

  @Post('groups/:id/requests/:userId/reject')
  @UseGuards(JwtAuthGuard)
  rejectRequest(@Req() req: any, @Param('id') groupId: string, @Param('userId') userId: string) {
    return this.svc.rejectGroupRequest(req.user.sub, groupId, userId);
  }

  @Delete('groups/:id/members/:userId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(@Req() req: any, @Param('id') groupId: string, @Param('userId') userId: string) {
    return this.svc.removeMember(req.user.sub, groupId, userId);
  }

  @Patch('groups/:id/permissions')
  @UseGuards(JwtAuthGuard)
  updateGroupPermission(@Req() req: any, @Param('id') id: string, @Body() body: { permission: 'ALL' | 'ADMINS_ONLY' }) {
    return this.svc.updateGroupPermission(req.user.sub, id, body.permission);
  }

  // ─── PAGES ────────────────────────────────────────────────────────────────
  @Get('pages')
  @UseGuards(JwtAuthGuard)
  listPages(@Req() req: any) {
    return this.svc.listPages(req.user.sub);
  }

  @Post('pages')
  @UseGuards(JwtAuthGuard)
  createPage(@Req() req: any, @Body() body: any) {
    return this.svc.createPage(req.user.sub, body);
  }

  @Get('pages/:id')
  @UseGuards(JwtAuthGuard)
  getPageDetails(@Req() req: any, @Param('id') id: string) {
    return this.svc.getPageDetails(req.user.sub, id);
  }

  @Get('pages/:id/feed')
  @UseGuards(JwtAuthGuard)
  getPageFeed(
    @Req() req: any,
    @Param('id') id: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.svc.getPageFeed(req.user.sub, id, +(page || 1), +(limit || 15));
  }

  @Get('pages/:id/scheduled')
  @UseGuards(JwtAuthGuard)
  getScheduledPosts(@Req() req: any, @Param('id') id: string) {
    return this.svc.getScheduledPosts(req.user.sub, id);
  }

  @Post('pages/:id/schedule')
  @UseGuards(JwtAuthGuard)
  schedulePagePost(@Req() req: any, @Param('id') pageId: string, @Body() body: any) {
    return this.svc.createPost(req.user.sub, { ...body, page_id: pageId, author_type: 'PAGE' });
  }

  @Post('pages/:id/follow')
  @UseGuards(JwtAuthGuard)
  followPage(@Req() req: any, @Param('id') id: string) {
    return this.svc.followPage(req.user.sub, id);
  }

  // ─── EVENTS ───────────────────────────────────────────────────────────────
  @Get('events')
  @UseGuards(JwtAuthGuard)
  listEvents(@Req() req: any) {
    return this.svc.listEvents(req.user.sub);
  }

  @Post('events')
  @UseGuards(JwtAuthGuard)
  createEvent(@Req() req: any, @Body() body: any) {
    return this.svc.createEvent(req.user.sub, body);
  }

  @Get('events/archived')
  @UseGuards(JwtAuthGuard)
  listArchivedEvents() {
    return this.svc.listArchivedEvents();
  }

  @Get('events/:id')
  @UseGuards(JwtAuthGuard)
  getEventDetails(@Req() req: any, @Param('id') id: string) {
    return this.svc.getEventDetails(req.user.sub, id);
  }

  @Post('events/:id/status')
  @UseGuards(JwtAuthGuard)
  updateEventAttendance(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { status: 'GOING' | 'INTERESTED' | 'NOT_GOING' },
  ) {
    return this.svc.updateEventAttendance(req.user.sub, id, body.status);
  }

  @Post('events/:id/attend')
  @UseGuards(JwtAuthGuard)
  attendEvent(@Req() req: any, @Param('id') id: string) {
    return this.svc.attendEvent(req.user.sub, id);
  }

  // ─── USERS / FOLLOWS ─────────────────────────────────────────────────────
  @Post('users/:id/follow')
  @UseGuards(JwtAuthGuard)
  followUser(@Req() req: any, @Param('id') targetId: string) {
    return this.svc.followUser(req.user.sub, targetId);
  }

  @Post('users/:id/unfollow')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  unfollowUser(@Req() req: any, @Param('id') targetId: string) {
    return this.svc.unfollowUser(req.user.sub, targetId);
  }

  // ─── NOTIFICATIONS ────────────────────────────────────────────────────────
  @Get('notifications')
  @UseGuards(JwtAuthGuard)
  listNotifications(@Req() req: any) {
    return this.svc.listNotifications(req.user.sub);
  }

  @Patch('notifications/:id/read')
  @UseGuards(JwtAuthGuard)
  markNotifRead(@Req() req: any, @Param('id') id: string) {
    return this.svc.markNotificationRead(req.user.sub, id);
  }

  @Patch('notifications/read-all')
  @UseGuards(JwtAuthGuard)
  markAllRead(@Req() req: any) {
    return this.svc.markAllNotificationsRead(req.user.sub);
  }

  // ─── SEARCH ───────────────────────────────────────────────────────────────
  @Get('search')
  @UseGuards(JwtAuthGuard)
  search(@Query('q') q: string) {
    return this.svc.search(q || '');
  }

  // ─── NEWS ─────────────────────────────────────────────────────────────────
  @Post('admin/crawl-news')
  @UseGuards(JwtAuthGuard)
  crawlNews() {
    return this.svc.crawlFaoNewsFeed();
  }

  // ─── SHARE POST ──────────────────────────────────────────────────────────
  @Post('posts/:id/share')
  @UseGuards(JwtAuthGuard)
  sharePost(@Req() req: any, @Param('id') postId: string) {
    return this.svc.shareToFeed(req.user.sub, postId);
  }

  // ─── USER SOCIAL PROFILE TABS & SUGGESTIONS ────────────────────────────────
  @Get('users/:id/profile')
  @UseGuards(JwtAuthGuard)
  getUserProfile(@Req() req: any, @Param('id') targetId: string) {
    return this.svc.getUserProfile(req.user.sub, targetId);
  }

  @Get('users/:id/posts')
  @UseGuards(JwtAuthGuard)
  getUserPosts(@Param('id') targetId: string, @Query('page') page: string) {
    return this.svc.getUserPosts(targetId, +(page || 1));
  }

  @Get('users/:id/reels')
  @UseGuards(JwtAuthGuard)
  getUserReels(@Param('id') targetId: string) {
    return this.svc.getUserReels(targetId);
  }

  @Get('users/:id/soutenu')
  @UseGuards(JwtAuthGuard)
  getUserSoutenu(@Param('id') targetId: string) {
    return this.svc.getUserSoutenu(targetId);
  }

  @Get('users/:id/suggestions')
  @UseGuards(JwtAuthGuard)
  getUserSuggestions(@Param('id') targetId: string) {
    return this.svc.getUserSuggestions(targetId);
  }

  // ─── SIDEBAR & COMMUNITIES ────────────────────────────────────────────────
  @Get('sidebar/community')
  @UseGuards(JwtAuthGuard)
  getSidebarCommunity(@Req() req: any) {
    return this.svc.getMaCommunaute(req.user.sub);
  }

  @Get('hashtags/trending')
  @UseGuards(JwtAuthGuard)
  getTrendingHashtags() {
    return this.svc.getTrendingHashtags();
  }
}
