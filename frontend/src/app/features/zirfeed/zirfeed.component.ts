import { Component, OnInit, OnDestroy, signal, computed, inject, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideGlobe, lucideMessageSquare, lucideFlame, lucideZap, lucideCrown,
  lucideShield, lucideLock, lucideUser, lucideHistory, lucideBell,
  lucideThumbsUp, lucideSend, lucideBookmark, lucideMoreVertical,
  lucidePlus, lucidePin, lucideSun, lucideLightbulb, lucideHelpCircle,
  lucideVolume2, lucidePlay, lucidePause, lucideFileText, lucideFilter,
  lucideCalendar, lucideUserCheck, lucideMusic, lucideClock, lucideX,
  lucideCheckCircle, lucideTrash2, lucideUpload, lucideHeart, lucideChevronDown,
  lucideVolumeX, lucideUsers, lucideShare2, lucideEye
} from '@ng-icons/lucide';
import { ZirFeedService } from '../../core/services/zirfeed.service';
import { SafePipe } from '../../core/pipes/safe.pipe';
import { AuthService } from '../../core/services/auth.service';
import { Subscription, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-zirfeed',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgIconComponent, SafePipe],
  providers: [
    provideIcons({
      lucideGlobe, lucideMessageSquare, lucideFlame, lucideZap, lucideCrown,
      lucideShield, lucideLock, lucideUser, lucideHistory, lucideBell,
      lucideThumbsUp, lucideSend, lucideBookmark, lucideMoreVertical,
      lucidePlus, lucidePin, lucideSun, lucideLightbulb, lucideHelpCircle,
      lucideVolume2, lucidePlay, lucidePause, lucideFileText, lucideFilter,
      lucideCalendar, lucideUserCheck, lucideMusic, lucideClock, lucideX,
      lucideCheckCircle, lucideTrash2, lucideUpload, lucideHeart, lucideChevronDown,
      lucideVolumeX, lucideUsers, lucideShare2, lucideEye
    })
  ],
  templateUrl: './zirfeed.component.html',
  styleUrl: './zirfeed.component.scss'
})
export class ZirFeedComponent implements OnInit, OnDestroy {
  private readonly feedService = inject(ZirFeedService);
  readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  // Layout Tab State
  activeTab = signal<'feed' | 'reels' | 'groups' | 'pages' | 'events' | 'saved' | 'profile' | 'admin_mod'>('feed');

  // Sub-views for Interiors
  currentGroupDetails = signal<any>(null);
  currentPageDetails = signal<any>(null);
  currentEventDetails = signal<any>(null);

  // Overlays & Admin panels
  showGroupAdminOverlay = signal(false);
  showManagePageOverlay = signal(false);
  pendingGroupRequests = signal<any[]>([]);
  groupMembersList = signal<any[]>([]);
  scheduledPosts = signal<any[]>([]);

  // Connection modals
  followersList = signal<any[]>([]);
  followingList = signal<any>(null);
  showFollowersModal = signal(false);
  showFollowingModal = signal(false);

  // Search Subject for Debounce
  private readonly searchSubject = new Subject<string>();

  // Real-Time Notification State
  notifications = signal<any[]>([]);
  showNotifPanel = signal(false);
  unreadCount = computed(() => this.notifications().filter(n => !n.is_read).length);

  // Stories system state
  stories = signal<any[]>([]);
  showStoryViewer = signal(false);
  activeStoryUserIndex = signal(0);
  activeStoryIndex = signal(0);

  storyUploadModal = signal(false);
  storyDraftText = '';
  storyDraftFile: File | null = null;
  storyDraftPreviewUrl = '';
  storyDraftEffect: 'classic' | 'sunset' | 'neon' | 'earth' = 'classic';

  // Share dropdown state
  showShareDropdown = signal<Record<string, boolean>>({});
  showPostOptions = signal<Record<string, boolean>>({});

  // Post action modals
  showSavePostModal = signal(false);
  saveTargetPostId = signal<string | null>(null);
  selectedCollectionId = signal<string>('');
  newSaveCollectionName = '';

  showReportModal = signal(false);
  reportTargetPostId = signal<string | null>(null);
  reportReason = signal<'SPAM' | 'OFF_TOPIC' | 'MISLEADING' | 'INAPPROPRIATE' | 'OTHER' | null>(null);
  reportDetails = '';
  reportReasons = [
    { value: 'SPAM' as const, label: 'Spam ou contenu publicitaire', icon: 'lucideMegaphone' },
    { value: 'OFF_TOPIC' as const, label: 'Hors-sujet', icon: 'lucideArrowRightCircle' },
    { value: 'MISLEADING' as const, label: 'Informations trompeuses', icon: 'lucideAlertTriangle' },
    { value: 'INAPPROPRIATE' as const, label: 'Contenu inapproprié', icon: 'lucideBan' },
    { value: 'OTHER' as const, label: 'Autre', icon: 'lucideFlag' },
  ];

  showAccountModal = signal(false);
  accountInfo = signal<any>(null);

  // Context & Certifications
  selectedPostContext = signal<'CONSEIL' | 'ALERTE' | 'QUESTION' | 'CELEBRATION' | 'ACTUALITE' | null>(null);

  // Communities sidebar
  maCommunaute = signal<any>(null);
  trendingHashtags = signal<any[]>([]);

  // User Social Profile Sub-view
  currentProfileUser = signal<any>(null);
  profileActiveTab = signal<'posts' | 'reels' | 'soutenu' | 'about'>('posts');
  profilePosts = signal<any[]>([]);
  profileReels = signal<any[]>([]);
  profileSoutenu = signal<any[]>([]);
  suggestedConnections = signal<any[]>([]);

  // Main Post Feed & Composer State
  feedPosts = signal<any[]>([]);
  feedPage = 1;
  hasMoreFeed = signal(true);
  isLoadingFeed = signal(false);

  composerText = '';
  postType = signal<'TEXT' | 'PHOTO' | 'VIDEO' | 'VOICE_NOTE' | 'REEL' | 'DOCUMENT' | 'MIXED'>('TEXT');
  selectedFiles: File[] = [];
  selectedFilesPreviews: string[] = [];
  isUploading = signal(false);
  voiceDuration = signal(0);
  isRecording = signal(false);

  // Scheduled posts picker inside Page composer
  scheduledTime = '';

  // Threaded Comments State
  expandedComments = signal<Record<string, boolean>>({}); // postId -> expanded
  postComments = signal<Record<string, any[]>>({}); // postId -> comments list
  newCommentText = signal<Record<string, string>>({}); // postId -> comment text
  commentAttachment = signal<Record<string, string>>({}); // postId -> image base64 preview

  // Reels Vertical Immersive Tab
  activeReelTab = signal<'foryou' | 'following'>('foryou');
  reels = signal<any[]>([]);
  currentReelIndex = signal(0);
  isMuted = signal(true);
  reelUploadModal = signal(false);

  readonly REACTION_TYPES = [
    { type: 'ADMIRE', icon: 'lucideSun', color: 'text-orange-400', label: 'Admire' },
    { type: 'THINKING', icon: 'lucideHelpCircle', color: 'text-blue-400', label: 'Thinking' },
    { type: 'COLLABORATE', icon: 'lucideUsers', color: 'text-green-400', label: 'Collaborate' },
    { type: 'INSIGHTFUL', icon: 'lucideLightbulb', color: 'text-yellow-400', label: 'Insightful' },
    { type: 'AGREE', icon: 'lucideThumbsUp', color: 'text-emerald-400', label: 'Agree' },
  ] as const;
  showReactionPicker = signal<{ postId: string; x: number; y: number } | null>(null);
  private reactPickerTimer: any = null;
  private reactIsLongPress = false;
  reelCaption = '';
  reelTags = '';
  reelFile: File | null = null;
  reelPreviewUrl = '';
  reelDurationError = signal<string | null>(null);

  // Groups Directory State
  groups = signal<any[]>([]);
  showGroupModal = signal(false);
  groupName = '';
  groupDesc = '';
  groupCategory = 'Cereal Farming';
  groupPrivacy = 'PUBLIC';
  groupPosting = 'ALL';

  // Institutional Pages Directory State
  pages = signal<any[]>([]);
  showPageModal = signal(false);
  pageName = '';
  pageDesc = '';
  pageCategory = 'Bank';
  pageRegDoc: File | null = null;
  pageRegion = '';

  // Events Directory State
  events = signal<any[]>([]);
  showEventModal = signal(false);
  eventName = '';
  eventDesc = '';
  eventStartDate = '';
  eventEndDate = '';
  eventLocation = '';
  eventCategory = 'Agricultural Fair';
  eventRegisterUrl = '';

  // Saved Posts & Collections
  collections = signal<any[]>([]);
  showCollectionModal = signal(false);
  newCollectionName = '';

  // Admin Moderation Queue
  modQueue = signal<any[]>([]);
  activeModTab = signal<'queue' | 'restrictions' | 'voices' | 'pages' | 'news'>('queue');
  restrictions = signal<any[]>([]);
  newsCache = signal<any[]>([]);

  // Search Query
  searchQuery = '';
  searchResults = signal<any>({ posts: [], users: [], groups: [], pages: [], events: [] });
  activeSearchTab = signal<'posts' | 'users' | 'groups' | 'pages' | 'events'>('posts');
  showSearchResults = signal(false);

  // Profile Stats (live from backend)
  profileStats = signal<any>(null);
  profileLoading = signal(false);

  // Toast System for Rollbacks & Warnings
  toastMessage = signal<string | null>(null);

  // Active continuous 3s play tracker timers
  private reelPlayTimer: any = null;

  // SSE Subscription reference
  private sseSub: Subscription | null = null;

  ngOnInit() {
    this.loadFeed();
    this.setupSse();
    this.loadGroupsAndPages();
    this.loadEvents();
    this.loadSavedCollections();
    this.loadNotifications();
    this.loadStories();
    this.loadMaCommunaute();
    this.loadTrendingHashtags();

    if (this.authService.currentUser()?.role === 'ADMIN') {
      this.loadModerationQueue();
    }

    // Debounced search binding (300ms)
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(q => {
      this.executeSearch(q);
    });
  }

  ngOnDestroy() {
    this.sseSub?.unsubscribe();
    if (this.reelPlayTimer) clearTimeout(this.reelPlayTimer);
  }

  // ─── TOAST UTILITY ───────────────────────────────────────────────────────
  showToast(msg: string) {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(null), 4000);
  }

  // ─── RTL LANG AUTO PARSE ──────────────────────────────────────────────────
  isRtlText(text: string): boolean {
    if (!text) return false;
    const arabic = /[\u0600-\u06FF]/;
    return arabic.test(text);
  }

  // ─── YOUTUBE URL HELPERS ──────────────────────────────────────────────────
  isYoutubeUrl(url: string): boolean {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
  }

  getYoutubeEmbedUrl(url: string): string {
    if (!url) return '';
    // Handle youtube.com/shorts/ID
    const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
    if (shortsMatch) return `https://www.youtube-nocookie.com/embed/${shortsMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${shortsMatch[1]}&controls=0&rel=0`;
    // Handle youtu.be/ID
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (shortMatch) return `https://www.youtube-nocookie.com/embed/${shortMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${shortMatch[1]}&controls=0&rel=0`;
    // Handle youtube.com/watch?v=ID
    const watchMatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
    if (watchMatch) return `https://www.youtube-nocookie.com/embed/${watchMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${watchMatch[1]}&controls=0&rel=0`;
    return url;
  }

  getYoutubeEmbedUrlStory(url: string): string {
    if (!url) return '';
    const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
    if (shortsMatch) return `https://www.youtube-nocookie.com/embed/${shortsMatch[1]}?autoplay=1&mute=0&controls=1&rel=0`;
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (shortMatch) return `https://www.youtube-nocookie.com/embed/${shortMatch[1]}?autoplay=1&mute=0&controls=1&rel=0`;
    const watchMatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
    if (watchMatch) return `https://www.youtube-nocookie.com/embed/${watchMatch[1]}?autoplay=1&mute=0&controls=1&rel=0`;
    return url;
  }

  isVideoUrl(url: string): boolean {
    if (!url) return false;
    return url.match(/\.(mp4|webm|ogg|mov)(\?|$)/i) !== null;
  }

  // ─── SSE temps réel ───────────────────────────────────────────────────────
  private setupSse() {
    this.sseSub = this.feedService.subscribeSse().subscribe({
      next: (event: any) => {
        if (event.event === 'new_post') {
          this.loadFeed();
        } else if (event.event === 'reaction_update') {
          this.updatePostReactions(event.data);
        } else if (event.event === 'new_comment') {
          this.refreshComments(event.data.post_id);
        } else if (event.event === 'notification') {
          this.loadNotifications();
        }
      },
      error: (err) => console.warn('SSE connection disconnected. Reconnecting...', err)
    });
  }

  // ─── MAIN FEED INFINITE SCROLL ─────────────────────────────────────────────
  loadFeed(append = false) {
    if (this.isLoadingFeed()) return;
    this.isLoadingFeed.set(true);

    if (!append) this.feedPage = 1;

    this.feedService.getFeed(this.feedPage, 15).subscribe({
      next: (posts) => {
        this.isLoadingFeed.set(false);
        if (posts.length < 15) this.hasMoreFeed.set(false);
        else this.hasMoreFeed.set(true);

        if (append) {
          this.feedPosts.update(current => [...current, ...posts]);
        } else {
          this.feedPosts.set(posts);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingFeed.set(false);
        this.loadMockFeed();
      }
    });
  }

  loadNextFeedPage() {
    if (!this.hasMoreFeed() || this.isLoadingFeed()) return;
    this.feedPage++;
    this.loadFeed(true);
  }

  // ─── COMPOSER ACTION AND MEDIA PREVIEW ─────────────────────────────────────
  onFileSelect(event: any) {
    const files = event.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        if (this.selectedFilesPreviews.length >= 6) break;
        const file = files[i];
        this.selectedFiles.push(file);

        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.selectedFilesPreviews.push(e.target.result);
          this.cdr.markForCheck();
        };
        reader.readAsDataURL(file);
      }
    }
  }

  submitPost(targetType: 'USER' | 'PAGE' | 'GROUP' = 'USER', targetId?: string) {
    if (!this.composerText.trim() && this.selectedFilesPreviews.length === 0 && this.postType() !== 'VOICE_NOTE') return;

    this.isUploading.set(true);

    const postData: any = {
      author_type: targetType,
      post_type: this.postType(),
      content_text: this.composerText,
      media_urls: this.selectedFilesPreviews,
      voice_note_url: this.postType() === 'VOICE_NOTE' ? 'https://res.cloudinary.com/demo/video/upload/sample.mp3' : null,
      voice_note_duration: this.postType() === 'VOICE_NOTE' ? this.voiceDuration() : null,
      post_context: this.selectedPostContext(),
    };

    if (targetType === 'PAGE' && targetId) {
      postData.page_id = targetId;
      if (this.scheduledTime) {
        postData.scheduled_for = new Date(this.scheduledTime).toISOString();
      }
    }

    if (targetType === 'GROUP' && targetId) {
      postData.group_id = targetId;
    }

    this.feedService.createPost(postData).subscribe({
      next: () => {
        this.isUploading.set(false);
        this.composerText = '';
        this.selectedFiles = [];
        this.selectedFilesPreviews = [];
        this.postType.set('TEXT');
        this.scheduledTime = '';
        this.selectedPostContext.set(null);
        this.showToast(postData.scheduled_for ? 'Publication planifiée avec succès !' : 'Publication partagée !');

        if (targetType === 'GROUP' && targetId) {
          this.navigateToGroup(targetId);
        } else if (targetType === 'PAGE' && targetId) {
          this.navigateToPage(targetId);
        } else {
          this.loadFeed();
        }
      },
      error: (err) => {
        this.isUploading.set(false);
        this.showToast(err.error?.message || 'Contenu bloqué ou erreur de connexion.');
      }
    });
  }

  // ─── THREADED COMMENTS ACTIONS ────────────────────────────────────────────
  toggleComments(postId: string) {
    const isExpanded = this.expandedComments()[postId];
    this.expandedComments.update(v => ({ ...v, [postId]: !isExpanded }));

    if (!isExpanded) {
      this.refreshComments(postId);
    }
  }

  refreshComments(postId: string) {
    this.feedService.getComments(postId).subscribe({
      next: (comments) => {
        this.postComments.update(v => ({ ...v, [postId]: comments }));
        this.cdr.markForCheck();
      },
      error: () => this.setMockComments(postId)
    });
  }

  private setMockComments(postId: string) {
    const mockComments = [
      {
        id: 'c1',
        author: { name: 'Ahmed Lassoued', role: 'EXPERT', profile_picture_url: '', verified: true },
        content_text: 'Excellent conseil agronomique ! Les doses de potasse sont parfaitement calculées pour notre terroir tunisien.',
        created_at: new Date(Date.now() - 3600000),
        replies: []
      }
    ];
    this.postComments.update(v => ({ ...v, [postId]: mockComments }));
  }

  addComment(postId: string, parentId?: string) {
    const text = this.newCommentText()[postId];
    if (!text || !text.trim()) return;

    const data = {
      post_id: postId,
      content_text: text,
      parent_id: parentId || null,
    };

    this.feedService.createComment(data).subscribe({
      next: () => {
        this.newCommentText.update(v => ({ ...v, [postId]: '' }));
        this.refreshComments(postId);
        this.loadFeed();
      },
      error: (err) => this.showToast(err.error?.message || 'Impossible de publier le commentaire.')
    });
  }

  updateCommentText(postId: string, text: string) {
    const current = this.newCommentText();
    const updated: Record<string, string> = {};
    Object.assign(updated, current);
    updated[postId] = text;
    this.newCommentText.set(updated);
  }

  // ─── LONG-PRESS REACTION PICKER ───────────────────────────────────────────
  onReactPointerDown(postId: string, event: PointerEvent) {
    this.reactIsLongPress = false;
    clearTimeout(this.reactPickerTimer);
    this.reactPickerTimer = setTimeout(() => {
      this.reactIsLongPress = true;
      this.showReactionPicker.set({ postId, x: event.clientX, y: event.clientY });
    }, 300);
  }

  onReactPointerUp(postId: string) {
    clearTimeout(this.reactPickerTimer);
    if (!this.reactIsLongPress) {
      this.showReactionPicker.set(null);
      this.reactToPost(postId, 'ADMIRE');
    }
  }

  onReactPointerLeave() {
    clearTimeout(this.reactPickerTimer);
  }

  selectReaction(postId: string, type: string) {
    this.showReactionPicker.set(null);
    this.reactToPost(postId, type);
  }

  // ─── OPTIMISTIC REACTIONS ─────────────────────────────────────────────────
  reactToPost(postId: string, type: string) {
    const originalPosts = [...this.feedPosts()];
    const post = originalPosts.find(p => p.id === postId);
    const targetReel = !post ? this.reels().find(r => r.id === postId) : null;
    if (!post && !targetReel) return;
    const target = post || targetReel;

    // Apply Optimistic Update
    const currentReactType = target.my_reaction;
    const isRemove = currentReactType === type;
    const nextReactType = isRemove ? null : type;

    const updatedCounts = { ...(target.reaction_stats?.counts || {}) };
    if (currentReactType) {
      updatedCounts[currentReactType] = Math.max(0, (updatedCounts[currentReactType] || 1) - 1);
    }
    if (nextReactType) {
      updatedCounts[nextReactType] = (updatedCounts[nextReactType] || 0) + 1;
    }

    const totalDiff = (nextReactType ? 1 : 0) - (currentReactType ? 1 : 0);
    const updatedStats = {
      ...target.reaction_stats,
      counts: updatedCounts,
      total: Math.max(0, (target.reaction_stats?.total || 0) + totalDiff)
    };

    const patch = { my_reaction: nextReactType, reaction_stats: updatedStats };
    if (post) {
      this.feedPosts.update(posts =>
        posts.map(p => p.id === postId ? { ...p, ...patch } : p)
      );
    }
    if (targetReel) {
      this.reels.update(reels =>
        reels.map(r => r.id === postId ? { ...r, ...patch } : r)
      );
    }

    // Call API
    this.feedService.toggleReaction({ post_id: postId, type }).subscribe({
      next: (stats) => {
        this.updatePostReactions({ post_id: postId, stats });
      },
      error: () => {
        // Rollback on error
        if (post) this.feedPosts.set(originalPosts);
        if (targetReel) this.reels.update(reels =>
          reels.map(r => r.id === postId ? { ...r, my_reaction: currentReactType, reaction_stats: target.reaction_stats } : r)
        );
        this.showToast('Erreur de connexion. Réaction annulée.');
      }
    });
  }

  private updatePostReactions(data: any) {
    this.feedPosts.update(posts =>
      posts.map(p => p.id === data.post_id ? { ...p, reaction_stats: data.stats } : p)
    );
    this.reels.update(reels =>
      reels.map(r => r.id === data.post_id ? { ...r, reaction_stats: data.stats } : r)
    );
    this.cdr.markForCheck();
  }

  // ─── GROUP INTERIOR ROUTING ───────────────────────────────────────────────
  navigateToGroup(groupId: string) {
    this.currentGroupDetails.set(null);
    this.activeTab.set('groups');
    this.feedService.getGroup(groupId).subscribe({
      next: (details) => {
        this.currentGroupDetails.set(details);
        this.cdr.markForCheck();
      },
      error: () => {
        this.showToast('Erreur lors du chargement du groupe.');
      }
    });
  }

  leaveGroup(groupId: string) {
    if (!confirm('Voulez-vous vraiment quitter ce groupe ?')) return;
    this.feedService.leaveGroup(groupId).subscribe({
      next: () => {
        this.showToast('Vous avez quitté le groupe.');
        this.navigateToGroup(groupId);
        this.loadGroupsAndPages();
      }
    });
  }

  toggleGroupPostingPermission(permission: 'ALL' | 'ADMINS_ONLY') {
    const groupId = this.currentGroupDetails()?.id;
    if (!groupId) return;
    this.feedService.updateGroupPermission(groupId, permission).subscribe({
      next: (group) => {
        this.currentGroupDetails.update(curr => ({ ...curr, posting_permission: group.posting_permission }));
        this.showToast('Autorisations de publication mises à jour !');
      }
    });
  }

  openGroupAdminPanel() {
    const groupId = this.currentGroupDetails()?.id;
    if (!groupId) return;
    this.showGroupAdminOverlay.set(true);

    this.feedService.getPendingRequests(groupId).subscribe(reqs => this.pendingGroupRequests.set(reqs));
    this.feedService.getGroupMembers(groupId).subscribe(mems => this.groupMembersList.set(mems));
  }

  approveGroupRequest(userId: string) {
    const groupId = this.currentGroupDetails()?.id;
    if (!groupId) return;
    this.feedService.approveRequest(groupId, userId).subscribe({
      next: () => {
        this.pendingGroupRequests.update(list => list.filter(r => r.user_id !== userId));
        this.showToast('Demande approuvée avec succès !');
        this.feedService.getGroupMembers(groupId).subscribe(mems => this.groupMembersList.set(mems));
      }
    });
  }

  rejectGroupRequest(userId: string) {
    const groupId = this.currentGroupDetails()?.id;
    if (!groupId) return;
    this.feedService.rejectRequest(groupId, userId).subscribe({
      next: () => {
        this.pendingGroupRequests.update(list => list.filter(r => r.user_id !== userId));
        this.showToast('Demande rejetée.');
      }
    });
  }

  // ─── PAGE INTERIOR SYSTEM ─────────────────────────────────────────────────
  navigateToPage(pageId: string) {
    this.currentPageDetails.set(null);
    this.activeTab.set('pages');
    this.feedService.getPage(pageId).subscribe({
      next: (details) => {
        this.currentPageDetails.set(details);
        this.cdr.markForCheck();
      },
      error: () => this.showToast('Erreur lors du chargement de la page.')
    });
  }

  openManagePageOverlay() {
    const pageId = this.currentPageDetails()?.id;
    if (!pageId) return;
    this.showManagePageOverlay.set(true);
    this.feedService.getScheduledPosts(pageId).subscribe(posts => this.scheduledPosts.set(posts));
  }

  cancelScheduledPost(postId: string) {
    if (!confirm('Annuler la planification de ce post ?')) return;
    this.feedService.cancelScheduledPost(postId).subscribe({
      next: () => {
        this.scheduledPosts.update(list => list.filter(p => p.id !== postId));
        this.showToast('Publication planifiée annulée.');
      }
    });
  }

  // ─── REELS IMPERSONATED & 3s view tracker ─────────────────────────────────
  loadReels() {
    this.feedService.getReels(this.activeReelTab(), 1, 10).subscribe(reels => {
      this.reels.set(reels);
      this.currentReelIndex.set(0);
      if (reels.length > 0) {
        this.initReelPlayTracker(reels[0].id);
      }
      this.cdr.markForCheck();
    });
  }

  switchReelTab(tab: 'foryou' | 'following') {
    this.activeReelTab.set(tab);
    this.loadReels();
  }

  nextReel() {
    if (this.currentReelIndex() < this.reels().length - 1) {
      this.currentReelIndex.set(this.currentReelIndex() + 1);
      this.initReelPlayTracker(this.reels()[this.currentReelIndex()].id);
    }
  }

  prevReel() {
    if (this.currentReelIndex() > 0) {
      this.currentReelIndex.set(this.currentReelIndex() - 1);
      this.initReelPlayTracker(this.reels()[this.currentReelIndex()].id);
    }
  }

  private initReelPlayTracker(reelId: string) {
    if (this.reelPlayTimer) clearTimeout(this.reelPlayTimer);
    this.reelPlayTimer = setTimeout(() => {
      if (this.reels()[this.currentReelIndex()]?.id === reelId) {
        this.feedService.trackReelView(reelId).subscribe(res => {
          this.reels.update(list =>
            list.map(r => r.id === reelId ? { ...r, views_count: res.views_count } : r)
          );
        });
      }
    }, 3000);
  }

  onReelFileSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const duration = video.duration;
        if (duration < 15 || duration > 180) {
          this.reelDurationError.set('La durée du Reel doit être comprise entre 15 secondes et 3 minutes.');
          this.reelFile = null;
          this.reelPreviewUrl = '';
        } else {
          this.reelDurationError.set(null);
          this.reelFile = file;
          this.reelPreviewUrl = window.URL.createObjectURL(file);
        }
        this.cdr.markForCheck();
      };
      video.src = URL.createObjectURL(file);
    }
  }

  uploadReel() {
    if (!this.reelFile) return;
    this.isUploading.set(true);

    const formData = {
      author_type: 'USER',
      post_type: 'REEL',
      content_text: this.reelCaption,
      media_urls: ['https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4'],
      thumbnail_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400',
      caption: this.reelCaption
    };

    setTimeout(() => {
      this.feedService.createPost(formData).subscribe({
        next: () => {
          this.isUploading.set(false);
          this.reelUploadModal.set(false);
          this.reelCaption = '';
          this.reelFile = null;
          this.reelPreviewUrl = '';
          this.showToast('Reel publié avec succès !');
          this.loadReels();
        },
        error: () => {
          this.isUploading.set(false);
          this.showToast('Erreur lors du traitement de la vidéo.');
        }
      });
    }, 2000);
  }

  // ─── EVENTS ATOMIC OPTIMISTIC TOGGLE ─────────────────────────────────────
  attendEvent(eventId: string) {
    const originalEvents = [...this.events()];
    const event = originalEvents.find(e => e.id === eventId);
    if (!event) return;

    const currentlyAttending = event.my_status === 'GOING';
    const nextAttending = !currentlyAttending;

    const diff = nextAttending ? 1 : -1;
    const nextStatus = nextAttending ? 'GOING' : 'NOT_GOING';

    this.events.update(list =>
      list.map(e => e.id === eventId
        ? { ...e, my_status: nextStatus, going_count: Math.max(0, (e.going_count || 0) + diff) }
        : e
      )
    );

    this.feedService.updateEventStatus(eventId, nextStatus).subscribe({
      next: (res) => {
        this.events.update(list =>
          list.map(e => e.id === eventId
            ? { ...e, my_status: res.my_status, going_count: res.going_count, interested_count: res.interested_count }
            : e
          )
        );
        this.cdr.markForCheck();
      },
      error: () => {
        this.events.set(originalEvents);
        this.showToast('Action impossible. Vérifiez votre connexion.');
      }
    });
  }

  // ─── DUAL ATOMIC EVENT STATUS SELECTOR ──────────────────────────────────
  toggleEventStatus(eventId: string, status: 'GOING' | 'INTERESTED' | 'NOT_GOING') {
    const originalEvents = [...this.events()];
    this.feedService.updateEventStatus(eventId, status).subscribe({
      next: (res) => {
        this.events.update(list =>
          list.map(e => e.id === eventId
            ? { ...e, my_status: res.my_status, going_count: res.going_count, interested_count: res.interested_count }
            : e
          )
        );
        this.cdr.markForCheck();
      },
      error: () => {
        this.events.set(originalEvents);
        this.showToast('Échec de la mise à jour de la présence.');
      }
    });
  }

  navigateToEvent(eventId: string) {
    this.currentEventDetails.set(null);
    this.activeTab.set('events');
    this.feedService.getEvent(eventId).subscribe({
      next: (details) => {
        this.currentEventDetails.set(details);
        this.cdr.markForCheck();
      },
      error: () => this.showToast('Événement introuvable.')
    });
  }

  // ─── CONNECTION OVERLAYS & UNFOLLOWS ─────────────────────────────────────
  openFollowersModal() {
    this.showFollowersModal.set(true);
    this.feedService.getFollowers().subscribe(list => this.followersList.set(list));
  }

  openFollowingModal() {
    this.showFollowingModal.set(true);
    this.feedService.getFollowing().subscribe(list => this.followingList.set(list));
  }

  unfollowUser(userId: string) {
    if (!confirm('Ne plus suivre cet utilisateur ?')) return;
    this.feedService.unfollowUser(userId).subscribe({
      next: () => {
        if (this.followingList()) {
          this.followingList.update((curr: any) => ({
            ...curr,
            users: curr.users.filter((u: any) => u.id !== userId)
          }));
        }
        this.showToast('Vous ne suivez plus cet utilisateur.');
        this.loadProfile();
      }
    });
  }

  // ─── DEBOUNCED SEARCH EXECUTION ──────────────────────────────────────────
  onSearchQueryChange() {
    this.searchSubject.next(this.searchQuery);
  }

  private executeSearch(query: string) {
    if (!query.trim()) {
      this.showSearchResults.set(false);
      return;
    }
    this.feedService.search(query).subscribe(res => {
      this.searchResults.set(res);
      this.showSearchResults.set(true);
      this.cdr.markForCheck();
    });
  }

  // ─── DRAG DROP BOOKMARK COLLECTIONS ───────────────────────────────────────
  onDragStart(event: any, postId: string) {
    event.dataTransfer.setData('text/plain', postId);
  }

  onDrop(event: any, collectionId: string) {
    event.preventDefault();
    const postId = event.dataTransfer.getData('text/plain');
    if (postId && collectionId) {
      this.feedService.savePost(postId, collectionId).subscribe({
        next: () => {
          this.showToast('Publication enregistrée dans la collection !');
        }
      });
    }
  }

  allowDrop(event: any) {
    event.preventDefault();
  }

  savePost(postId: string, collectionId: string | undefined) {
    const targetCollection = collectionId || (this.collections().length > 0 ? this.collections()[0].id : null);
    if (!targetCollection) {
      this.showToast('Créez d\'abord une collection pour sauvegarder des posts.');
      return;
    }
    this.feedService.savePost(postId, targetCollection).subscribe({
      next: () => this.showToast('Enregistré avec succès !'),
      error: () => this.showToast('Échec de la sauvegarde.')
    });
  }

  // ─── CREATION MODALS AND SUBMITS ──────────────────────────────────────────
  triggerGroupCreate() {
    const data = {
      name: this.groupName,
      description: this.groupDesc,
      category: this.groupCategory,
      privacy: this.groupPrivacy,
      posting_permission: this.groupPosting,
    };
    this.feedService.createGroup(data).subscribe({
      next: () => {
        this.showGroupModal.set(false);
        this.groupName = '';
        this.groupDesc = '';
        this.loadGroupsAndPages();
        this.showToast('Groupe créé avec succès !');
      }
    });
  }

  triggerPageCreate() {
    const data = {
      name: this.pageName,
      description: this.pageDesc,
      category: this.pageCategory,
      verification_doc_url: 'https://res.cloudinary.com/demo/image/upload/sample.png',
      region: this.pageRegion,
    };
    this.feedService.createPage(data).subscribe({
      next: () => {
        this.showPageModal.set(false);
        this.pageName = '';
        this.pageDesc = '';
        this.loadGroupsAndPages();
        this.showToast('Demande de page envoyée pour validation !');
      }
    });
  }

  triggerEventCreate() {
    const data = {
      name: this.eventName,
      description: this.eventDesc,
      start_date: this.eventStartDate,
      end_date: this.eventEndDate || null,
      location: this.eventLocation,
      category: this.eventCategory,
      register_url: this.eventRegisterUrl || null,
    };
    this.feedService.createEvent(data).subscribe({
      next: () => {
        this.showEventModal.set(false);
        this.eventName = '';
        this.eventDesc = '';
        this.loadEvents();
        this.showToast('Événement créé avec succès !');
      }
    });
  }

  triggerCollectionCreate() {
    if (!this.newCollectionName.trim()) return;
    this.feedService.createCollection(this.newCollectionName).subscribe({
      next: () => {
        this.showCollectionModal.set(false);
        this.newCollectionName = '';
        this.loadSavedCollections();
        this.showToast('Collection créée !');
      }
    });
  }

  // ─── ADMIN MODERATION QUEUE ACTIONS ───────────────────────────────────────
  approveItem(id: string, type: 'POST' | 'COMMENT') {
    this.modQueue.update(q => q.filter(item => item.id !== id));
    this.showToast('Contenu approuvé et publié !');
  }

  rejectItem(id: string, type: 'POST' | 'COMMENT') {
    this.modQueue.update(q => q.filter(item => item.id !== id));
    this.showToast('Contenu définitivement rejeté.');
  }

  // ─── DATA LOADERS ──────────────────────────────────────────────────────────
  loadProfile() {
    this.profileLoading.set(true);
    this.feedService.getMyProfileStats().subscribe({
      next: (stats) => {
        this.profileStats.set(stats);
        this.profileLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.profileLoading.set(false);
        this.profileStats.set({
          posts_count: 0,
          followers_count: 0,
          following_count: 0,
          bio: 'Agriculteur passionné basé en Tunisie • Membre actif ZirFeed',
        });
        this.cdr.markForCheck();
      }
    });
  }

  private loadGroupsAndPages() {
    this.feedService.getGroups().subscribe(groups => this.groups.set(groups));
    this.feedService.getPages().subscribe(pages => this.pages.set(pages));
  }

  private loadEvents() {
    this.feedService.getEvents().subscribe(events => this.events.set(events));
  }

  private loadSavedCollections() {
    this.feedService.getCollections().subscribe(colls => this.collections.set(colls));
  }

  private loadModerationQueue() {
    this.modQueue.set([
      { id: 'm1', item_type: 'POST', content: 'Vente directe de blé subventionné au marché noir, contactez-moi !', reason: 'SPAM', confidence_score: 0.92, author: 'Hedi Gafsa' },
      { id: 'm2', item_type: 'COMMENT', content: 'Ce dosage de chlordécone est parfait pour traiter toutes vos olives...', reason: 'AGRICULTURAL_MISINFORMATION', confidence_score: 0.88, author: 'Moncef R.' }
    ]);
  }

  private loadNotifications() {
    this.feedService.getNotifications().subscribe(notifs => {
      this.notifications.set(notifs);
      this.cdr.markForCheck();
    });
  }

  // ─── SHARE POST ───────────────────────────────────────────────────────────
  sharePost(post: any) {
    const text = post.content_text ? post.content_text.substring(0, 120) : 'Publication ZirFeed';
    const baseUrl = window.location.origin;
    const url = post.post_type === 'REEL'
      ? `${baseUrl}/zirfeed/reel/${post.id}`
      : `${baseUrl}/zirfeed/post/${post.id}`;
    if (navigator.share) {
      navigator.share({ title: 'ZirFeed — Agriculture Tunisie', text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${text}\n${url}`).then(() => {
        this.showToast('Lien copié dans le presse-papiers !');
      });
    }
  }

  // ─── INTERACTION TRIGGERS ─────────────────────────────────────────────────
  joinGroup(groupId: string) {
    if (!groupId) return;
    this.feedService.joinGroup(groupId).subscribe({
      next: (res) => {
        this.groups.update(gs =>
          gs.map(g => g.id === groupId ? { ...g, member_count: res.member_count, my_status: res.pending ? 'PENDING' : 'MEMBER' } : g)
        );
        if (this.currentGroupDetails() && this.currentGroupDetails().id === groupId) {
          this.currentGroupDetails.update(g => ({ ...g, member_count: res.member_count, my_membership: { status: res.pending ? 'PENDING' : 'APPROVED', role: 'MEMBER' } }));
        }
        this.showToast(res.pending ? 'Demande d\'adhésion en attente !' : 'Vous avez rejoint le groupe !');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.showToast(err.error?.message || 'Vous êtes déjà membre ou en attente d\'approbation.');
      }
    });
  }

  followPage(pageId: string) {
    if (!pageId) return;
    this.feedService.followPage(pageId).subscribe({
      next: (res) => {
        this.pages.update(ps =>
          ps.map(p => p.id === pageId ? { ...p, is_following: res.following, follower_count: res.follower_count } : p)
        );
        if (this.currentPageDetails() && this.currentPageDetails().id === pageId) {
          this.currentPageDetails.update(p => ({ ...p, is_following: res.following, follower_count: res.follower_count }));
        }
        this.showToast(res.following ? 'Vous suivez cette page !' : 'Vous ne suivez plus cette page.');
        this.cdr.markForCheck();
      }
    });
  }

  switchTab(tab: 'feed' | 'reels' | 'groups' | 'pages' | 'events' | 'saved' | 'profile' | 'admin_mod') {
    this.activeTab.set(tab);
    this.currentGroupDetails.set(null);
    this.currentPageDetails.set(null);
    this.currentEventDetails.set(null);
    this.showSearchResults.set(false);

    if (tab === 'feed') this.loadFeed();
    else if (tab === 'reels') this.loadReels();
    else if (tab === 'profile') this.loadProfile();
    else if (tab === 'groups' || tab === 'pages') this.loadGroupsAndPages();
    else if (tab === 'events') this.loadEvents();
    else if (tab === 'saved') this.loadSavedCollections();
  }

  suggestedFarmers = signal<any[]>([
    { name: 'Salah Mejri', region: 'Siliana', specialty: 'Céréales', followed: false },
    { name: 'Fatma Ben Ali', region: 'Nabeul', specialty: 'Agrumes', followed: false },
    { name: 'Hedi Gafsa', region: 'Sfax', specialty: 'Oliviers', followed: false }
  ]);

  followFarmer(name: string) {
    this.suggestedFarmers.update(farmers =>
      farmers.map(f => f.name === name ? { ...f, followed: !f.followed } : f)
    );
    this.cdr.markForCheck();
  }

  markAllRead() {
    this.feedService.markAllNotificationsRead().subscribe({
      next: () => {
        this.notifications.update(ns => ns.map(n => ({ ...n, is_read: true })));
        this.showNotifPanel.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  // ─── STORIES SYSTEM ACTIONS ──────────────────────────────────────────────
  loadStories() {
    this.feedService.getStories().subscribe({
      next: (res) => {
        this.stories.set(res);
        this.cdr.markForCheck();
      },
      error: () => {
        console.warn('Failed to load stories');
      }
    });
  }

  openStoryViewer(userIdx: number, storyIdx: number) {
    this.activeStoryUserIndex.set(userIdx);
    this.activeStoryIndex.set(storyIdx);
    this.showStoryViewer.set(true);
    this.cdr.markForCheck();
  }

  closeStoryViewer() {
    this.showStoryViewer.set(false);
    this.cdr.markForCheck();
  }

  advanceStory() {
    const userIdx = this.activeStoryUserIndex();
    const storyIdx = this.activeStoryIndex();
    const currentStories = this.stories()[userIdx]?.stories || [];

    if (storyIdx < currentStories.length - 1) {
      this.activeStoryIndex.set(storyIdx + 1);
    } else if (userIdx < this.stories().length - 1) {
      this.activeStoryUserIndex.set(userIdx + 1);
      this.activeStoryIndex.set(0);
    } else {
      this.closeStoryViewer();
    }
    this.cdr.markForCheck();
  }

  prevStory() {
    const userIdx = this.activeStoryUserIndex();
    const storyIdx = this.activeStoryIndex();

    if (storyIdx > 0) {
      this.activeStoryIndex.set(storyIdx - 1);
    } else if (userIdx > 0) {
      this.activeStoryUserIndex.set(userIdx - 1);
      const prevUserStories = this.stories()[userIdx - 1]?.stories || [];
      this.activeStoryIndex.set(prevUserStories.length - 1);
    }
    this.cdr.markForCheck();
  }

  createStory(text: string, mediaUrl?: string) {
    if (!text && !mediaUrl) return;
    this.feedService.createStory({ story_text: text || undefined, story_media_url: mediaUrl || undefined }).subscribe({
      next: () => {
        this.showToast('Story publiée !');
        this.loadStories();
      },
      error: () => this.showToast('Erreur lors de la création de la story.')
    });
  }

  openStoryComposerModal() {
    this.storyUploadModal.set(true);
    this.cdr.markForCheck();
  }

  closeStoryComposerModal() {
    this.storyUploadModal.set(false);
    this.storyDraftText = '';
    this.storyDraftFile = null;
    this.storyDraftPreviewUrl = '';
    this.storyDraftEffect = 'classic';
    this.cdr.markForCheck();
  }

  onStoryFileSelect(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    this.storyDraftFile = file;
    this.storyDraftPreviewUrl = window.URL.createObjectURL(file);
    this.storyUploadModal.set(true);
    event.target.value = '';
    this.cdr.markForCheck();
  }

  createDraftStory() {
    const text = this.storyDraftText.trim();
    if (!text && !this.storyDraftFile) {
      this.showToast('Ajoutez du texte ou une image avant de publier.');
      return;
    }

    const finalize = (mediaUrl?: string) => {
      this.feedService.createStory({ story_text: text || undefined, story_media_url: mediaUrl || undefined }).subscribe({
        next: () => {
          this.showToast('Story publiée !');
          this.loadStories();
          this.closeStoryComposerModal();
        },
        error: () => {
          this.showToast('Erreur lors de la création de la story.');
        }
      });
    };

    if (this.storyDraftFile) {
      this.feedService.uploadImage(this.storyDraftFile).subscribe({
        next: (res) => finalize(res.url),
        error: () => this.showToast('Erreur lors du téléchargement de l\'image.'),
      });
      return;
    }

    finalize(undefined);
  }

  selectStoryEffect(effect: 'classic' | 'sunset' | 'neon' | 'earth') {
    this.storyDraftEffect = effect;
  }

  removeStory(storyId: string) {
    this.feedService.deleteStory(storyId).subscribe({
      next: () => {
        this.showToast('Story supprimée.');
        this.loadStories();
        this.closeStoryViewer();
      },
      error: () => this.showToast('Impossible de supprimer cette story.'),
    });
  }

  // ─── SHARE OPTIONS ───────────────────────────────────────────────────────
  toggleShareDropdown(postId: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    const current = this.showShareDropdown();
    this.showShareDropdown.set({
      ...current,
      [postId]: !current[postId]
    });
  }

  shareToFeed(postId: string) {
    this.feedService.sharePost(postId).subscribe({
      next: () => {
        this.showToast('Partagé sur votre fil d\'actualité !');
        this.showShareDropdown.set({});
        this.loadFeed();
      },
      error: () => this.showToast('Erreur lors du partage.')
    });
  }

  shareToStory(postId: string) {
    this.feedService.createStory({ shared_post_id: postId }).subscribe({
      next: () => {
        this.showToast('Partagé dans votre Story !');
        this.showShareDropdown.set({});
        this.loadStories();
      },
      error: () => this.showToast('Erreur lors du partage.')
    });
  }

  togglePostOptions(postId: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    const current = this.showPostOptions();
    this.showPostOptions.set({
      ...current,
      [postId]: !current[postId]
    });
  }

  openSavePostModal(postId: string) {
    this.showPostOptions.set({});
    this.saveTargetPostId.set(postId);
    this.loadSavedCollections();
    this.selectedCollectionId.set(this.collections()[0]?.id || '');
    this.newSaveCollectionName = '';
    this.showSavePostModal.set(true);
  }

  closeSavePostModal() {
    this.showSavePostModal.set(false);
    this.saveTargetPostId.set(null);
    this.newSaveCollectionName = '';
    this.selectedCollectionId.set(this.collections()[0]?.id || '');
  }

  savePostToCollection() {
    const postId = this.saveTargetPostId();
    if (!postId) {
      this.showToast('Aucun post sélectionné.');
      return;
    }

    const collectionId = this.selectedCollectionId();
    const newName = this.newSaveCollectionName.trim();
    if (!collectionId && !newName) {
      this.showToast('Sélectionnez une collection ou créez-en une nouvelle.');
      return;
    }

    const saveInto = (targetId: string) => {
      this.feedService.savePost(postId, targetId).subscribe({
        next: () => {
          this.showToast('Publication enregistrée dans la collection !');
          this.closeSavePostModal();
          this.loadSavedCollections();
        },
        error: () => this.showToast('Erreur lors de l\'enregistrement du post.')
      });
    };

    if (newName) {
      this.feedService.createCollection(newName).subscribe({
        next: (collection) => saveInto(collection.id),
        error: () => this.showToast('Impossible de créer la collection.')
      });
      return;
    }

    saveInto(collectionId);
  }

  openReportModal(postId: string) {
    this.showPostOptions.set({});
    this.reportTargetPostId.set(postId);
    this.reportReason.set(null);
    this.reportDetails = '';
    this.showReportModal.set(true);
  }

  closeReportModal() {
    this.showReportModal.set(false);
    this.reportTargetPostId.set(null);
    this.reportReason.set(null);
    this.reportDetails = '';
  }

  markPostInteresting(postId: string) {
    this.showPostOptions.set({});
    this.feedService.markPostInteresting(postId).subscribe({
      next: () => this.showToast('Post signalé pour recommandation.'),
      error: () => this.showToast('Impossible de marquer le post comme intéressant.')
    });
  }

  submitPostReport() {
    const postId = this.reportTargetPostId();
    const reason = this.reportReason();
    if (!postId || !reason) {
      this.showToast('Sélectionnez un motif de signalement.');
      return;
    }

    this.feedService.reportPost(postId, reason, this.reportDetails.trim()).subscribe({
      next: () => {
        this.showToast('Signalement envoyé. Merci de votre vigilance.');
        this.closeReportModal();
      },
      error: () => this.showToast('Erreur lors de l\'envoi du signalement.')
    });
  }

  openAccountModal(author: any) {
    this.showPostOptions.set({});
    this.accountInfo.set(author);
    this.showAccountModal.set(true);
  }

  closeAccountModal() {
    this.showAccountModal.set(false);
    this.accountInfo.set(null);
  }

  // ─── USER SOCIAL PROFILES ────────────────────────────────────────────────
  openUserProfile(userId: string) {
    this.currentProfileUser.set(null);
    this.profileActiveTab.set('posts');
    this.activeTab.set('profile');
    this.cdr.markForCheck();

    this.feedService.getUserProfile(userId).subscribe({
      next: (profile) => {
        this.currentProfileUser.set(profile);
        this.loadProfileTab(userId, 'posts');
        this.feedService.getUserSuggestions(userId).subscribe(sugs => {
          this.suggestedConnections.set(sugs);
        });
        this.cdr.markForCheck();
      },
      error: () => this.showToast('Profil introuvable.')
    });
  }

  loadProfileTab(userId: string, tab: 'posts' | 'reels' | 'soutenu' | 'about') {
    this.profileActiveTab.set(tab);
    if (tab === 'posts') {
      this.feedService.getUserPosts(userId).subscribe(posts => this.profilePosts.set(posts));
    } else if (tab === 'reels') {
      this.feedService.getUserReels(userId).subscribe(reels => this.profileReels.set(reels));
    } else if (tab === 'soutenu') {
      this.feedService.getUserSoutenu(userId).subscribe(posts => this.profileSoutenu.set(posts));
    }
    this.cdr.markForCheck();
  }

  followUserFromProfile(userId: string) {
    const isFollowing = this.currentProfileUser()?.is_following;
    const call = isFollowing ? this.feedService.unfollowUser(userId) : this.feedService.followUser(userId);
    call.subscribe({
      next: () => {
        this.currentProfileUser.update((curr: any) => ({
          ...curr,
          is_following: !isFollowing,
          followers_count: (curr.followers_count || 0) + (isFollowing ? -1 : 1)
        }));
        this.showToast(isFollowing ? 'Vous ne suivez plus cet utilisateur.' : 'Vous suivez cet utilisateur.');
        this.cdr.markForCheck();
      }
    });
  }

  // ─── COMMUNITIES & HASHTAGS ──────────────────────────────────────────────
  loadMaCommunaute() {
    this.feedService.getMaCommunaute().subscribe({
      next: (res) => {
        this.maCommunaute.set(res);
        this.cdr.markForCheck();
      }
    });
  }

  loadTrendingHashtags() {
    this.feedService.getTrendingHashtags().subscribe({
      next: (res) => {
        this.trendingHashtags.set(res);
        this.cdr.markForCheck();
      }
    });
  }

  // ─── MOCK DATA FALLBACK ──────────────────────────────────────────────────
  private loadMockFeed() {
    this.feedPosts.set([
      {
        id: 'post1',
        author: { name: 'Dr. Youssef Chahed', role: 'EXPERT', profile_picture_url: '', verified: true },
        author_type: 'USER',
        post_type: 'MIXED',
        content_text: 'نصائح هامة لزراعة الزيتون في تونس: يجب الانتباه لنسب الرطوبة خلال هذه الفترة ومكافحة ذبابة الزيتون بالتنسيق مع المصالح الجهوية.',
        media_urls: [],
        voice_note_url: 'https://res.cloudinary.com/demo/video/upload/sample.mp3',
        voice_note_waveform: Array.from({ length: 70 }, () => +(Math.random() * 0.8 + 0.1).toFixed(2)),
        voice_note_duration: 25,
        created_at: new Date(Date.now() - 7200000),
        is_pinned: false,
        reaction_stats: { counts: { ADMIRE: 14, INSIGHTFUL: 25, COLLABORATE: 8 }, total: 47, last_three: ['Fatma', 'Belgacem', 'Riadh'] },
        comments_count: 5
      }
    ]);
  }
}
