import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { APP_CONFIG } from '../config/config.token';

export interface DocumentNotificationPayload {
  id?: number;
  document_name: string;
  document_number?: string | null;
  department_id?: number | null;
  department_name?: string | null;
  user_id?: number | string | null;
  user_name?: string | null;
  access_level?: string;
  created_at?: string;
  created_by_user_id?: number | string | null;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentNotificationService {
  private http = inject(HttpClient);
  private config = inject(APP_CONFIG);

  private readonly STORAGE_KEY = 'compliancepro_doc_notification_count';
  private readonly LOCAL_NOTIF_KEY = 'compliancepro_local_doc_notifications';
  private readonly ACK_KEY = 'compliancepro_acknowledged_doc_notifs';

  // Badge count for the "Internal Circular / Docs" route in sidebar
  docBadgeCount = signal<number>(this.getInitialBadgeCount());

  // Stream to notify components (e.g. AppTopbar, NotificationsComponent) to reload notifications immediately
  refreshNotifications$ = new Subject<void>();

  constructor() {
    // If currently on documents page or if creator, clear badge immediately
    if (typeof window !== 'undefined' && window.location.hash.includes('/admin/documents')) {
      this.clearDocBadge();
    }
  }

  private getCurrentUserId(): string | null {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.id ? String(user.id) : (user.username ? String(user.username) : null);
    } catch {
      return null;
    }
  }

  private getInitialBadgeCount(): number {
    try {
      if (typeof window !== 'undefined' && window.location.hash.includes('/admin/documents')) {
        localStorage.removeItem(this.STORAGE_KEY);
        return 0;
      }
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored !== null) {
        const parsed = parseInt(stored, 10);
        return isNaN(parsed) ? 0 : Math.max(0, parsed);
      }
    } catch {
      // ignore
    }
    return 0;
  }

  /**
   * Get set of acknowledged notification IDs/keys
   */
  getAcknowledgedDocIds(): Set<string> {
    try {
      const data = localStorage.getItem(this.ACK_KEY);
      return data ? new Set(JSON.parse(data)) : new Set();
    } catch {
      return new Set();
    }
  }

  /**
   * Mark all document notifications as acknowledged when the user visits the documents page
   */
  acknowledgeDocumentNotifications(notifications?: any[]): void {
    const ackSet = this.getAcknowledgedDocIds();
    const notifs = notifications || [];

    for (const n of notifs) {
      const title = String(n.title || '').toLowerCase();
      const msg = String(n.message || '').toLowerCase();
      if (title.includes('circular') || title.includes('doc') || msg.includes('public document')) {
        const idKey = n.id ? String(n.id) : (n.title || '');
        ackSet.add(idKey);
        if (n.id && typeof n.id === 'number') {
          this.http.put(`${this.config.apiUrl}/notifications/${n.id}/read`, {}).pipe(
            catchError(() => of(null))
          ).subscribe();
        }
      }
    }

    this.markAllLocalAsRead();

    try {
      localStorage.setItem(this.ACK_KEY, JSON.stringify(Array.from(ackSet)));
    } catch {
      // ignore
    }

    this.clearDocBadge();
  }

  /**
   * Publishes notification when a document is added as public (or assigned).
   * Note: The CREATOR who adds the document is EXCLUDED from receiving this notification.
   * Only target recipient users / other staff members will receive the notification and badge.
   */
  publishDocumentNotification(doc: DocumentNotificationPayload, creatorId?: string | number | null): void {
    const currentUserId = creatorId ? String(creatorId) : this.getCurrentUserId();
    const docTitle = doc.document_name || 'Document';
    const docRef = doc.document_number ? `(${doc.document_number})` : '';
    const deptInfo = doc.department_name ? ` for ${doc.department_name}` : ' for all branches';
    const userInfo = doc.user_name ? ` (Assigned: ${doc.user_name})` : '';

    const title = `New Public Circular / Doc: ${docTitle}`;
    const message = `A new public document "${docTitle}" ${docRef} has been published${deptInfo}${userInfo}.`;

    const postPayload = {
      branch_id: doc.department_id || null,
      user_id: doc.user_id ? String(doc.user_id) : null,
      title,
      message,
      type: 'DOCUMENT_PUBLIC',
      created_by: currentUserId || null
    };

    // 1. Send to backend notifications API so OTHER users receive it
    this.http.post(`${this.config.apiUrl}/notifications`, postPayload).pipe(
      catchError(err => {
        console.warn('Backend notification publish skipped/failed:', err);
        return of(null);
      })
    ).subscribe(() => {
      // Trigger topbar reload for any other open view
      this.refreshNotifications$.next();
    });

    // 2. Clear badge for creator since creator is right here adding it!
    this.clearDocBadge();

    // 3. Trigger reactive reload
    this.refreshNotifications$.next();
  }

  /**
   * Synchronize route badge with unread notifications from server/local list,
   * strictly excluding notifications created by the current user, already acknowledged,
   * and deduplicating so multiple notification events for the same document only count once.
   */
  syncWithNotifications(notifications: any[]): void {
    if (typeof window !== 'undefined' && window.location.hash.includes('/admin/documents')) {
      this.acknowledgeDocumentNotifications(notifications);
      return;
    }

    let currentUserId = '';
    let currentUsername = '';
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      currentUserId = u.id ? String(u.id).toLowerCase() : '';
      currentUsername = (u.username || u.name || '').toLowerCase();
    } catch {}

    const ackSet = this.getAcknowledgedDocIds();

    const unreadDocNotifs = (notifications || []).filter(n => {
      if (n.is_read) return false;

      const idKey = n.id ? String(n.id) : '';
      if (idKey && ackSet.has(idKey)) {
        return false; // Already viewed / acknowledged
      }

      const createdBy = String(n.created_by || n.createdBy || '').toLowerCase();
      if (createdBy && (createdBy === currentUserId || createdBy === currentUsername)) {
        return false; // Exclude notifications created by current user
      }
      const title = String(n.title || '').toLowerCase();
      const msg = String(n.message || '').toLowerCase();
      return title.includes('circular') || title.includes('doc') || msg.includes('public document');
    });

    // Deduplicate by document title / topic so multiple test alerts or edits for the same doc count as 1
    const uniqueTitles = new Set<string>();
    const uniqueNotifs: any[] = [];
    for (const n of unreadDocNotifs) {
      const key = (n.title || n.message || '').toLowerCase().trim();
      if (!uniqueTitles.has(key)) {
        uniqueTitles.add(key);
        uniqueNotifs.push(n);
      }
    }

    this.setDocBadgeCount(uniqueNotifs.length);
  }

  /**
   * Local storage notifications for offline resilience (excludes creator)
   */
  getLocalNotifications(): any[] {
    try {
      const data = localStorage.getItem(this.LOCAL_NOTIF_KEY);
      const list: any[] = data ? JSON.parse(data) : [];
      let currentUserId = '';
      let currentUsername = '';
      try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        currentUserId = u.id ? String(u.id).toLowerCase() : '';
        currentUsername = (u.username || u.name || '').toLowerCase();
      } catch {}

      return list.filter(n => {
        const createdBy = String(n.created_by || n.createdBy || '').toLowerCase();
        if (createdBy && (createdBy === currentUserId || createdBy === currentUsername)) {
          return false;
        }
        return true;
      });
    } catch {
      return [];
    }
  }

  markLocalAsRead(id: number): void {
    try {
      const existing = this.getLocalNotifications();
      const updated = existing.map(n => n.id === id ? { ...n, is_read: true } : n);
      localStorage.setItem(this.LOCAL_NOTIF_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  markAllLocalAsRead(): void {
    try {
      const existing = this.getLocalNotifications();
      const updated = existing.map(n => ({ ...n, is_read: true }));
      localStorage.setItem(this.LOCAL_NOTIF_KEY, JSON.stringify(updated));
      this.clearDocBadge();
    } catch {
      // ignore
    }
  }

  /**
   * Set route badge notification count
   */
  setDocBadgeCount(count: number): void {
    const val = Math.max(0, count);
    this.docBadgeCount.set(val);
    try {
      if (val === 0) {
        localStorage.removeItem(this.STORAGE_KEY);
      } else {
        localStorage.setItem(this.STORAGE_KEY, String(val));
      }
    } catch {
      // ignore
    }
  }

  /**
   * Clear route badge when documents are acknowledged / marked as read
   */
  clearDocBadge(): void {
    this.setDocBadgeCount(0);
  }
}
