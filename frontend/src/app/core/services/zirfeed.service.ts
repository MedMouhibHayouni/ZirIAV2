import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ZirFeedService {
  private readonly http = inject(HttpClient);

  // ─── POSTSTREAM & FEEDS ──────────────────────────────────────────────────
  getFeed(page = 1, limit = 15): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/zirfeed/feed?page=${page}&limit=${limit}`);
  }

  createPost(data: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/zirfeed/posts`, data);
  }

  // ─── ACTIONS & REACTIONS ──────────────────────────────────────────────────
  toggleReaction(data: { post_id?: string; comment_id?: string; type: string }): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/zirfeed/reactions`, data);
  }

  // ─── COMMENTS ────────────────────────────────────────────────────────────
  createComment(data: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/zirfeed/comments`, data);
  }

  deleteComment(commentId: string): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/zirfeed/comments/${commentId}`);
  }

  // ─── SAVED & BOOKMARKS ───────────────────────────────────────────────────
  createCollection(name: string, cover?: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/zirfeed/collections`, { name, cover });
  }

  savePost(postId: string, collectionId: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/zirfeed/collections/${collectionId}/save`, { post_id: postId });
  }

  reportPost(postId: string, reason: string, details?: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/zirfeed/posts/${postId}/report`, { reason, details });
  }

  markPostInteresting(postId: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/zirfeed/posts/${postId}/interesting`, {});
  }

  getCollections(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/zirfeed/collections`);
  }

  // ─── GROUPS INTERIOR & HUBS ──────────────────────────────────────────────
  createGroup(data: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/zirfeed/groups`, data);
  }

  getGroups(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/zirfeed/groups`);
  }

  getGroup(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/zirfeed/groups/${id}`);
  }

  getGroupFeed(id: string, page = 1, limit = 15): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/zirfeed/groups/${id}/feed?page=${page}&limit=${limit}`);
  }

  joinGroup(groupId: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/zirfeed/groups/${groupId}/join`, {});
  }

  leaveGroup(groupId: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/zirfeed/groups/${groupId}/leave`, {});
  }

  getGroupMembers(groupId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/zirfeed/groups/${groupId}/members`);
  }

  getPendingRequests(groupId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/zirfeed/groups/${groupId}/requests`);
  }

  approveRequest(groupId: string, userId: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/zirfeed/groups/${groupId}/requests/${userId}/approve`, {});
  }

  rejectRequest(groupId: string, userId: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/zirfeed/groups/${groupId}/requests/${userId}/reject`, {});
  }

  updateGroupPermission(groupId: string, permission: 'ALL' | 'ADMINS_ONLY'): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/zirfeed/groups/${groupId}/permissions`, { permission });
  }

  // ─── PAGES SYSTEM & INTERIORS ────────────────────────────────────────────
  createPage(data: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/zirfeed/pages`, data);
  }

  getPages(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/zirfeed/pages`);
  }

  getPage(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/zirfeed/pages/${id}`);
  }

  getPageFeed(id: string, page = 1, limit = 15): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/zirfeed/pages/${id}/feed?page=${page}&limit=${limit}`);
  }

  getScheduledPosts(pageId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/zirfeed/pages/${pageId}/scheduled`);
  }

  schedulePost(pageId: string, data: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/zirfeed/pages/${pageId}/schedule`, data);
  }

  cancelScheduledPost(postId: string): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/zirfeed/posts/${postId}/scheduled`);
  }

  followPage(pageId: string): Observable<{ following: boolean; follower_count: number }> {
    return this.http.post<any>(`${environment.apiUrl}/zirfeed/pages/${pageId}/follow`, {});
  }

  // ─── REELS SYSTEM ─────────────────────────────────────────────────────────
  getReels(tab: 'foryou' | 'following' = 'foryou', page = 1, limit = 10): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/zirfeed/reels?tab=${tab}&page=${page}&limit=${limit}`);
  }

  trackReelView(postId: string): Observable<{ views_count: number }> {
    return this.http.post<any>(`${environment.apiUrl}/zirfeed/reels/${postId}/view`, {});
  }

  // ─── EVENTS SYSTEM & INTERIORS ───────────────────────────────────────────
  createEvent(data: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/zirfeed/events`, data);
  }

  getEvents(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/zirfeed/events`);
  }

  getEvent(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/zirfeed/events/${id}`);
  }

  attendEvent(eventId: string): Observable<{ attending: boolean; attendee_count: number }> {
    return this.http.post<any>(`${environment.apiUrl}/zirfeed/events/${eventId}/attend`, {});
  }

  updateEventStatus(eventId: string, status: 'GOING' | 'INTERESTED' | 'NOT_GOING'): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/zirfeed/events/${eventId}/status`, { status });
  }

  // ─── SEARCH SYSTEM ────────────────────────────────────────────────────────
  search(query: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/zirfeed/search?q=${encodeURIComponent(query)}`);
  }

  // ─── PROFILE & CONNECTIONS ───────────────────────────────────────────────
  getProfile(userId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/zirfeed/profile/${userId}`);
  }

  getMyProfileStats(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/zirfeed/profile`);
  }

  updateProfile(data: any): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/zirfeed/profile`, data);
  }

  getFollowers(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/zirfeed/profile/followers`);
  }

  getFollowing(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/zirfeed/profile/following`);
  }

  followUser(userId: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/zirfeed/users/${userId}/follow`, {});
  }

  unfollowUser(userId: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/zirfeed/users/${userId}/unfollow`, {});
  }

  // ─── NOTIFICATIONS ────────────────────────────────────────────────────────
  getNotifications(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/zirfeed/notifications`);
  }

  markNotificationRead(notifId: string): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/zirfeed/notifications/${notifId}/read`, {});
  }

  markAllNotificationsRead(): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/zirfeed/notifications/read-all`, {});
  }

  getComments(postId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/zirfeed/posts/${postId}/comments`);
  }

  // ─── STORIES SYSTEM ──────────────────────────────────────────────────────
  getStories(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/zirfeed/stories`);
  }

  createStory(data: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/zirfeed/stories`, data);
  }

  deleteStory(storyId: string): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/zirfeed/stories/${storyId}`);
  }

  // ─── IMAGE UPLOAD ──────────────────────────────────────────────────────
  uploadImage(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(`${environment.apiUrl}/upload/image`, formData);
  }

  // ─── SHARE POST ──────────────────────────────────────────────────────────
  sharePost(postId: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/zirfeed/posts/${postId}/share`, {});
  }

  // ─── USER PROFILE & CONNECTIONS ──────────────────────────────────────────
  getUserProfile(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/zirfeed/users/${id}/profile`);
  }

  getUserPosts(id: string, page = 1): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/zirfeed/users/${id}/posts?page=${page}`);
  }

  getUserReels(id: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/zirfeed/users/${id}/reels`);
  }

  getUserSoutenu(id: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/zirfeed/users/${id}/soutenu`);
  }

  getUserSuggestions(id: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/zirfeed/users/${id}/suggestions`);
  }

  // ─── SIDEBAR & COMMUNITIES ────────────────────────────────────────────────
  getMaCommunaute(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/zirfeed/sidebar/community`);
  }

  getTrendingHashtags(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/zirfeed/hashtags/trending`);
  }

  // ─── SERVER-SENT EVENTS (SSE) STREAMING ──────────────────────────────────
  subscribeSse(): Observable<any> {
    return new Observable<any>(observer => {
      const token = localStorage.getItem('access_token') || '';
      const sseUrl = `${environment.apiUrl}/zirfeed/stream?token=${token}`;
      const eventSource = new EventSource(sseUrl);

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          observer.next(parsed);
        } catch (err) {
          observer.next(event.data);
        }
      };

      eventSource.onerror = (error) => {
        observer.error(error);
      };

      return () => {
        eventSource.close();
      };
    });
  }
}
