import { Component, OnInit, signal, computed, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { APP_CONFIG } from '../../core/services/config/config.token';
import { DocumentNotificationService } from '../../core/services/notification/document-notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    ToastModule
  ],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>
    <div class="card">
      
      <!-- Card Header -->
      <div class="flex align-items-center justify-content-between mb-4">
        <h5 class="m-0 text-xl font-semibold">Notifications Log</h5>
        <div class="flex gap-2">
          <button 
            *ngIf="unreadCount() > 0"
            pButton 
            type="button" 
            label="Mark all as read" 
            icon="pi pi-check-all" 
            class="p-button-outlined p-button-secondary h-2.5rem flex align-items-center"
            (click)="markAllAsRead()"
          ></button>
          <button 
            pButton 
            type="button" 
            icon="pi pi-refresh" 
            class="p-button-outlined p-button-secondary h-2.5rem flex align-items-center"
            (click)="loadNotifications()"
          ></button>
        </div>
      </div>

      <!-- Toolbar Row -->
      <div class="flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <!-- Filter Tabs -->
        <div class="flex gap-2">
          <button 
            *ngFor="let tab of filterTabs"
            pButton 
            type="button" 
            [label]="tab.label" 
            [class]="activeTab() === tab.value ? 'p-button-primary' : 'p-button-text p-button-secondary'"
            class="h-2.5rem flex align-items-center font-semibold"
            (click)="activeTab.set(tab.value)"
          ></button>
        </div>

        <!-- Search Input -->
        <div class="w-20rem">
          <p-iconField iconPosition="left" class="w-full">
            <p-inputIcon class="pi pi-search" />
            <input 
              pInputText 
              type="text" 
              placeholder="Search notifications..." 
              class="w-full h-2.5rem"
              [(ngModel)]="searchQuery"
            />
          </p-iconField>
        </div>
      </div>

      <!-- Notifications List (Bordered and rounded list layout) -->
      <div class="border-round border-1 surface-border overflow-hidden">
        
        <!-- Empty State -->
        <div *ngIf="filteredNotifications().length === 0" class="flex flex-column align-items-center justify-content-center py-8 text-center bg-card">
          <i class="pi pi-bell text-500 text-4xl mb-3 opacity-50"></i>
          <p class="font-semibold text-900 m-0">No notifications found</p>
          <p class="text-sm text-600 m-0 mt-1">We couldn't find any notifications matching your filters.</p>
        </div>

        <!-- Notification List -->
        <div class="flex flex-column" *ngIf="filteredNotifications().length > 0">
          <div 
            *ngFor="let n of filteredNotifications()" 
            class="notification-item flex align-items-start gap-3 p-4 border-bottom-1 surface-border cursor-pointer transition-colors"
            [class.unread-row]="!n.is_read"
            (click)="markAsRead(n)"
          >
            <!-- Severity Micro Icon -->
            <div class="row-icon-wrapper flex align-items-center justify-content-center border-round flex-shrink-0" [class]="getNotificationSeverityClass(n)" style="width: 2.5rem; height: 2.5rem;">
              <i [class]="getNotificationIcon(n)" class="text-xl"></i>
            </div>

            <!-- Content Body -->
            <div class="flex-1 min-w-0">
              <div class="flex justify-content-between align-items-center flex-wrap gap-2">
                <span class="font-bold text-gray-900" style="font-size: 0.95rem;">{{ n.title || 'Notification' }}</span>
                <span class="text-sm text-500">{{ getRelativeTime(n.created_at) }}</span>
              </div>
              <p class="text-sm text-700 m-0 mt-2 line-height-3">{{ n.message }}</p>
            </div>

            <!-- Unread Status Dot -->
            <div *ngIf="!n.is_read" class="align-self-center flex-shrink-0 border-circle bg-blue-500" style="width: 0.6rem; height: 0.6rem; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);"></div>
          </div>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .unread-row {
      background-color: rgba(59, 130, 246, 0.02) !important;
    }
    .unread-row:hover {
      background-color: var(--surface-hover) !important;
    }
    .notification-item:hover {
      background-color: var(--surface-hover);
    }
    .notification-item:last-child {
      border-bottom: none !important;
    }

    /* Colors and States */
    .bg-green-50 { background-color: #f0fdf4; }
    .text-green-600 { color: #16a34a; }
    .border-green-100 { border-color: #dcfce7; }

    .bg-amber-50 { background-color: #fffbeb; }
    .text-amber-600 { color: #d97706; }
    .border-amber-100 { border-color: #fef3c7; }

    .bg-red-50 { background-color: #fef2f2; }
    .text-red-600 { color: #dc2626; }
    .border-red-100 { border-color: #fee2e2; }

    .bg-blue-50 { background-color: #eff6ff; }
    .text-blue-600 { color: #2563eb; }
    .border-blue-100 { border-color: #dbeafe; }
  `]
})
export class NotificationsComponent implements OnInit {
  notifications = signal<any[]>([]);
  activeTab = signal<'ALL' | 'UNREAD' | 'READ'>('ALL');
  searchQuery = '';

  filterTabs = [
    { label: 'All Alerts', value: 'ALL' },
    { label: 'Unread Only', value: 'UNREAD' },
    { label: 'Read Archive', value: 'READ' }
  ] as const;

  private http = inject(HttpClient);
  private config = inject(APP_CONFIG);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);
  private docNotificationService = inject(DocumentNotificationService);

  ngOnInit() {
    this.loadNotifications();
  }

  loadNotifications() {
    this.http.get<any[]>(`${this.config.apiUrl}/notifications`).subscribe({
      next: (data) => {
        let currentUserId = '';
        let currentUsername = '';
        try {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          currentUserId = user.id ? String(user.id) : '';
          currentUsername = user.username ? String(user.username) : '';
        } catch {}

        const serverList = (Array.isArray(data) ? data : []).filter(n => {
          const createdBy = String(n.created_by || n.createdBy || '');
          if (!createdBy) return true;
          return createdBy !== currentUserId && createdBy !== currentUsername;
        });

        const local = this.docNotificationService.getLocalNotifications();
        const combined = [...serverList];

        for (const loc of local) {
          const exists = combined.some(m => m.id === loc.id || (m.title === loc.title && Math.abs(new Date(m.created_at).getTime() - new Date(loc.created_at).getTime()) < 60000));
          if (!exists) {
            combined.push(loc);
          }
        }
        combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        this.notifications.set(combined);
        this.cdr.detectChanges();
      },
      error: (err) => {
        const local = this.docNotificationService.getLocalNotifications();
        if (local.length > 0) {
          this.notifications.set(local);
          this.cdr.detectChanges();
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load notifications list: ' + (err.message || err.statusText)
          });
        }
      }
    });
  }

  unreadCount = computed(() => this.notifications().filter(n => !n.is_read).length);

  filteredNotifications = computed(() => {
    let list = this.notifications();
    
    // Tab filter
    const tab = this.activeTab();
    if (tab === 'UNREAD') {
      list = list.filter(n => !n.is_read);
    } else if (tab === 'READ') {
      list = list.filter(n => n.is_read);
    }

    // Search filter
    const query = this.searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter(n => 
        (n.title && n.title.toLowerCase().includes(query)) ||
        (n.message && n.message.toLowerCase().includes(query))
      );
    }

    return list;
  });

  markAsRead(n: any) {
    if (n.is_read) return;
    this.docNotificationService.markLocalAsRead(n.id);
    this.http.put(`${this.config.apiUrl}/notifications/${n.id}/read`, {}).subscribe({
      next: () => {},
      error: () => {}
    });
    this.notifications.update(list => 
      list.map(x => x.id === n.id ? { ...x, is_read: true } : x)
    );
    this.cdr.detectChanges();
  }

  markAllAsRead() {
    this.docNotificationService.markAllLocalAsRead();
    this.http.put(`${this.config.apiUrl}/notifications/read-all`, {}).subscribe({
      next: () => {},
      error: (err) => {
        console.error('Failed to mark all as read on server:', err);
      }
    });
    this.notifications.update(list => 
      list.map(x => ({ ...x, is_read: true }))
    );
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'All notifications marked as read.'
    });
    this.cdr.detectChanges();
  }

  getNotificationIcon(n: any): string {
    const title = String(n.title || '').toLowerCase();
    const msg = String(n.message || '').toLowerCase();
    if (title.includes('circular') || title.includes('doc') || msg.includes('document')) {
      return 'pi pi-file';
    }
    if (title.includes('reject') || msg.includes('reject')) {
      return 'pi pi-times-circle';
    }
    if (title.includes('escalat') || msg.includes('escalat')) {
      return 'pi pi-exclamation-triangle';
    }
    if (title.includes('submit') || msg.includes('submit')) {
      return 'pi pi-check-circle';
    }
    return 'pi pi-bell';
  }

  getNotificationSeverityClass(n: any): string {
    const title = String(n.title || '').toLowerCase();
    const msg = String(n.message || '').toLowerCase();
    if (title.includes('circular') || title.includes('doc') || msg.includes('document')) {
      return 'bg-blue-50 text-blue-600 border border-blue-100';
    }
    if (title.includes('reject') || msg.includes('reject')) {
      return 'bg-red-50 text-red-600 border border-red-100';
    }
    if (title.includes('escalat') || msg.includes('escalat')) {
      return 'bg-amber-50 text-amber-600 border border-amber-100';
    }
    if (title.includes('submit') || msg.includes('submit')) {
      return 'bg-green-50 text-green-600 border border-green-100';
    }
    return 'bg-blue-50 text-blue-600 border border-blue-100';
  }

  getRelativeTime(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
  }
}
