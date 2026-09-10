import {
  Component,
  NgZone,
  signal,
  WritableSignal,
  inject,
  ViewChild,
  ElementRef,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { LayoutService } from '../service/layout.service';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ChipModule } from 'primeng/chip';
import { SearchService } from '../../../core/services/search.service';
import { AutoCompleteModule, AutoCompleteSelectEvent, AutoComplete } from 'primeng/autocomplete';
import { SelectModule } from 'primeng/select';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { PopoverModule } from 'primeng/popover';
import { BadgeModule } from 'primeng/badge';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { KeyboardShortcutService } from '../../../core/services/keyboard-shortcut';
import { AuthService } from '../../../core/services/auth/auth.service';
import { APP_CONFIG } from '../../../core/services/config/config.token';
import { OfflineTranslationService } from '../../../core/services/offline-translation.service';

interface SearchItem {
  label: string;
  icon: string;
  route: string;
  keywords: string[];
}

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    RouterModule,
    CommonModule,
    StyleClassModule,
    ButtonModule,
    TooltipModule,
    ChipModule,
    AutoCompleteModule,
    SelectModule,
    InputGroupModule,
    InputGroupAddonModule,
    IconFieldModule,
    InputIconModule,
    PopoverModule,
    BadgeModule,
    FormsModule,
  ],
  template: `
    <div class="layout-topbar">
      <div class="layout-topbar-left">
        <button
          pTooltip="Menu"
          tooltipPosition="bottom"
          class="layout-menu-button layout-topbar-action"
          (click)="layoutService.onMenuToggle()"
        >
          <i class="pi pi-bars"></i>
        </button>
        <a class="layout-topbar-logo" routerLink="/">
          <!-- <img src="assets/images/logos/kredpool_logo.png" class="topbar-logo-img"> -->
          <span class="bank-name">{{ config.bank_name || 'The Kurla Nagrik Sahakari Bank Ltd' }}</span>
        </a>
      </div>

        <div class="layout-topbar-actions">

            <p-select
              [options]="languages"
              [(ngModel)]="selectedLanguage"
              (ngModelChange)="onLanguageChange($event)"
              optionLabel="label"
              optionValue="value"
              appendTo="body"
              class="hide-on-small"
            >
              <ng-template pTemplate="selectedItem">
                <div class="flex align-items-center gap-2" *ngIf="selectedLanguage">
                  <i class="pi pi-language"></i>
                  <span>{{ selectedLanguage === 'en' ? 'English' : (selectedLanguage === 'mr' ? 'मराठी' : selectedLanguage) }}</span>
                </div>
              </ng-template>
            </p-select>

        <!-- Dark/Light Theme Button -->
        <p-button
          class="layout-topbar-action hide-on-small"
          [icon]="layoutService.layoutConfig().darkTheme ? 'pi pi-moon' : 'pi pi-sun'"
          severity="secondary"
          (click)="toggleTheme()"
          pTooltip="Toggle Dark/Light Mode"
          tooltipPosition="bottom"
        ></p-button>

        <div class="notification-container hide-on-small" #notifBtnContainer (click)="op.toggle($event, notifBtnContainer)">
          <p-button
            icon="pi pi-bell"
            pTooltip="Notification"
            tooltipPosition="bottom"
            severity="secondary"
          >
          </p-button>
          <span *ngIf="unreadCount() > 0" class="notification-badge animate-fadein">
            {{ unreadCount() }}
          </span>
        </div>

        <p-popover #op appendTo="body" [style]="{ width: '380px', padding: '0' }" styleClass="notification-popover-panel">
          <div class="notification-dropdown-card">
            
            <!-- Sticky Header -->
            <div class="notification-dropdown-header">
              <div class="flex align-items-center gap-2" style="display: flex; align-items: center; gap: 0.5rem;">
                <span class="notification-header-title">Notifications</span>
                <span *ngIf="unreadCount() > 0" class="unread-badge">
                  {{ unreadCount() }} new
                </span>
              </div>
              <button 
                *ngIf="unreadCount() > 0"
                pButton 
                type="button" 
                label="Mark all as read" 
                class="p-button-text p-button-sm mark-all-btn"
                (click)="markAllAsRead($event)"
              ></button>
            </div>

            <!-- Scrollable Content -->
            <div class="notification-list-container">
              
              <!-- Empty State -->
              <div *ngIf="notifications.length === 0" class="notification-empty-state">
                <i class="pi pi-bell muted-bell-icon"></i>
                <p class="empty-title">You're all caught up!</p>
                <p class="empty-subtitle">No notifications to display at this time.</p>
              </div>

              <!-- Notifications Loop -->
              <div 
                *ngFor="let n of notifications" 
                class="notification-item-row"
                [ngClass]="{'unread-item': !n.is_read}"
                (click)="markAsRead(n)"
              >
                <!-- Left Icon Indicator -->
                <div class="item-icon-wrapper" [class]="getNotificationSeverityClass(n)">
                  <i [class]="getNotificationIcon(n)"></i>
                </div>

                <!-- Main Content -->
                <div class="item-content-body">
                  <div class="item-title-text" [class.text-semibold]="!n.is_read">
                    {{ n.title || 'Notification' }}
                  </div>
                  <div class="item-message-text">
                    {{ n.message }}
                  </div>
                  <div class="item-meta-row">
                    <span class="item-time">{{ getRelativeTime(n.created_at) }}</span>
                  </div>
                </div>

                <!-- Unread Indicator Dot -->
                <div *ngIf="!n.is_read" class="unread-indicator-dot"></div>
              </div>

            </div>

            <!-- Sticky Footer -->
            <div class="notification-dropdown-footer">
              <a 
                routerLink="/notifications" 
                (click)="op.hide()" 
                class="view-all-link"
              >
                View All Notifications <i class="pi pi-arrow-right ml-1"></i>
              </a>
            </div>

          </div>
        </p-popover>

        <div
          class="topbar-profile flex align-items-center gap-3 hide-on-small"
          (click)="logout()"
          tooltipPosition="bottom"
          style="padding: 0.35rem 0.75rem; margin-right: 0.5rem; border-radius: 8px; cursor: pointer; transition: all 0.2s ease-in-out; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08);"
          onmouseover="this.style.background='rgba(255, 255, 255, 0.08)'; this.style.borderColor='rgba(255, 255, 255, 0.16)';"
          onmouseout="this.style.background='rgba(255, 255, 255, 0.04)'; this.style.borderColor='rgba(255, 255, 255, 0.08)';"
        >
          <div
            class="profile-avatar flex align-items-center justify-content-center"
            style="width: 2.25rem; height: 2.25rem; border-radius: 50%; background: linear-gradient(135deg, #eaf1f8, #cbe0f2); color: #173a59; font-weight: 700; font-size: 0.95rem; border: 2px solid rgba(255, 255, 255, 0.4); box-shadow: 0 4px 6px rgba(0, 0, 0, 0.08); transition: transform 0.2s;"
            onmouseover="this.style.transform='scale(1.05)';"
            onmouseout="this.style.transform='scale(1)';"
            (click)="$event.stopPropagation()"
          >
            {{ getAvatarInitial() }}
          </div>
          <div class="flex flex-column text-left" style="line-height: 1.25;">
            <span
              class="profile-name"
              style="font-weight: 600; font-size: 0.85rem; color: #ffffff; letter-spacing: 0.02em;"
              >{{ userName }}</span
            >
            <span
              class="profile-role"
              style="font-size: 0.68rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; color: rgba(255, 255, 255, 0.65);"
              *ngIf="userDesignation"
              >{{ userDesignation }}</span
            >
          </div>
        </div>

        <div class="window-controls">
          <p-button
            icon="pi pi-power-off"
            pTooltip="Logout"
            tooltipPosition="bottom"
            styleClass="hide-on-small"
            severity="danger"
            (click)="logout()"
          ></p-button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .topbar-search-wrapper {
        margin-right: 0.25rem;
        width: 240px;
        flex: none;
      }

      :host ::ng-deep {
        // .topbar-search-autocomplete {
        //     width: 100%;
        // }

        .topbar-search-autocomplete .p-autocomplete-input {
          // width: 100%;
          background-color: var(--surface-card) !important;
          color: var(--text-color) !important;
          border: 1px solid var(--surface-border);
          border-radius: 4px;
          padding-left: 2.5rem !important; /* Make room for icon */
          height: 2.25rem;
        }

        /* Remove the complex focus/border logic since IconField handles it */

        .topbar-search-autocomplete .p-autocomplete-panel {
          background: white;
          color: #333;
          border-radius: 4px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
          margin-top: 0.5rem;
        }

        .topbar-search-autocomplete .p-autocomplete-item {
          padding: 0.75rem 1rem;
          color: #333;
        }

        .topbar-search-autocomplete .p-autocomplete-item:hover {
          background: #f0f0f0;
        }

        .notification-container {
          position: relative;
          display: inline-flex;
          align-items: center;
        }

        .notification-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background-color: #ef4444;
          color: #ffffff;
          font-size: 0.65rem;
          font-weight: 700;
          border-radius: 9999px;
          min-width: 1rem;
          height: 1rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          border: 1.5px solid #0f2942; /* matches topbar header background color nicely */
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
          pointer-events: none;
          z-index: 10;
        }

        /* Old notification styles removed to place globally below */

        .layout-topbar-actions .p-button {
          width: 2.25rem;
          height: 2.25rem;
          border-radius: 4px;
          box-shadow: none;
        }


        .layout-topbar-actions .p-button.p-button-secondary {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }

        .layout-topbar-actions .p-button.p-button-secondary .p-button-icon {
          color: #ffffff;
        }

        .layout-topbar-actions .p-button.p-button-secondary:hover {
          background: rgba(255, 255, 255, 0.16);
          border-color: rgba(255, 255, 255, 0.28);
        }

        .layout-topbar-actions .p-select {
          height: 2.25rem;
          border-radius: 4px;
          align-items: center;
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }

        .layout-topbar-actions .p-select-label {
          display: flex;
          align-items: center;
          padding-top: 0;
          padding-bottom: 0;
          font-size: 0.875rem;
          color: #ffffff;
        }

        .layout-topbar-actions .p-select-dropdown {
          color: #ffffff;
        }
      }

      /* Search Item Styles */
      .search-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .item-icon {
        font-size: 1.1rem;
        color: var(--primary-color);
      }

      .item-details {
        display: flex;
        flex-direction: column;
      }

      .item-label {
        font-weight: 600;
        font-size: 0.9rem;
      }

      .item-route {
        font-size: 0.75rem;
        color: #777;
      }

      /* Windows-style Controls */
      .window-controls {
        display: flex;
        align-items: center;
        height: 100%;
        -webkit-app-region: no-drag;
      }
      /* ... rest of existing styles ... */
      .win-btn {
        background: transparent;
        border: none;
        color: white;
        width: 46px;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.2s;
        outline: none;
      }

      .win-btn i {
        font-size: 14px;
      }

      .win-btn:hover {
        background-color: rgba(255, 255, 255, 0.12);
      }

      .win-btn.win-close:hover {
        background-color: #e81123;
      }

      .win-btn:active {
        background-color: rgba(255, 255, 255, 0.16);
      }

      /* Separator */
      .controls-separator {
        display: inline-block;
        width: 1px;
        height: 2.5rem;
        background: rgba(255, 255, 255, 0.18);
        margin: 0 8px;
        align-self: center;
      }

      /* ── Premium Notification Overlay Card Styles (Global overrides for body appends) ── */
      ::ng-deep .notification-popover-panel {
        position: fixed !important;
        top: 3.75rem !important;
        right: 1.5rem !important;
        left: auto !important;
        transform: none !important;
        width: 380px !important;
        max-width: calc(100vw - 2rem) !important;
        border-radius: 12px !important;
        overflow: hidden !important;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
        border: 1px solid var(--surface-border) !important;
        background: var(--surface-card) !important;
        margin: 0 !important;
      }

      ::ng-deep .notification-popover-panel::before,
      ::ng-deep .notification-popover-panel::after,
      ::ng-deep .notification-popover-panel .p-popover-arrow {
        display: none !important;
      }

      ::ng-deep .notification-popover-panel .p-popover-content {
        padding: 0 !important;
      }

      ::ng-deep .notification-dropdown-card {
        display: flex;
        flex-direction: column;
        background: var(--surface-card);
        border-radius: 12px;
        overflow: hidden;
      }

      ::ng-deep .notification-dropdown-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.85rem 1.25rem;
        border-bottom: 1px solid var(--surface-border);
        background: var(--surface-card);
        position: sticky;
        top: 0;
        z-index: 10;
      }

      ::ng-deep .notification-header-title {
        font-weight: 700;
        font-size: 1rem;
        color: var(--text-color, #111827);
      }

      ::ng-deep .unread-badge {
        background: rgba(59, 130, 246, 0.1);
        color: #2563eb;
        font-size: 0.72rem;
        font-weight: 700;
        padding: 0.15rem 0.5rem;
        border-radius: 9999px;
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }

      ::ng-deep .mark-all-btn {
        font-size: 0.78rem !important;
        font-weight: 600 !important;
        padding: 0 !important;
        color: #2563eb !important;
        height: auto !important;
        width: auto !important;
      }
      ::ng-deep .mark-all-btn:hover {
        background: transparent !important;
        text-decoration: underline !important;
      }

      ::ng-deep .notification-list-container {
        overflow-y: auto;
        overflow-x: hidden;
        max-height: 380px;
        background: var(--surface-card);
      }

      /* Modern Custom Scrollbar */
      ::ng-deep .notification-list-container::-webkit-scrollbar {
        width: 6px;
      }
      ::ng-deep .notification-list-container::-webkit-scrollbar-track {
        background: transparent;
      }
      ::ng-deep .notification-list-container::-webkit-scrollbar-thumb {
        background: var(--surface-300);
        border-radius: 99px;
      }
      ::ng-deep .notification-list-container::-webkit-scrollbar-thumb:hover {
        background: var(--surface-400);
      }

      ::ng-deep .notification-item-row {
        display: flex;
        align-items: flex-start;
        gap: 0.85rem;
        padding: 0.9rem 1.25rem;
        border-bottom: 1px solid var(--surface-border);
        cursor: pointer;
        transition: background-color 0.2s ease-in-out;
        position: relative;
      }
      ::ng-deep .notification-item-row:last-child {
        border-bottom: none;
      }
      ::ng-deep .notification-item-row:hover {
        background-color: var(--surface-hover);
      }
      ::ng-deep .notification-item-row.unread-item {
        background-color: rgba(59, 130, 246, 0.04);
      }

      ::ng-deep .item-icon-wrapper {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2.15rem;
        height: 2.15rem;
        border-radius: 8px;
        flex-shrink: 0;
      }
      ::ng-deep .item-icon-wrapper i {
        font-size: 0.95rem;
      }

      ::ng-deep .item-content-body {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        min-width: 0;
      }

      ::ng-deep .item-title-text {
        font-size: 0.85rem;
        color: var(--text-color, #111827);
        font-weight: 700;
        line-height: 1.3;
      }

      ::ng-deep .item-message-text {
        font-size: 0.8rem;
        color: var(--text-color-secondary, #64748b);
        line-height: 1.4;
        word-wrap: break-word;
      }

      ::ng-deep .item-meta-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.15rem;
      }
      ::ng-deep .item-time {
        font-size: 0.72rem;
        color: var(--text-color-secondary, #94a3b8);
      }

      ::ng-deep .unread-indicator-dot {
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 50%;
        background-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
        align-self: center;
        flex-shrink: 0;
      }

      ::ng-deep .notification-dropdown-footer {
        border-top: 1px solid var(--surface-border);
        background: var(--surface-card);
        padding: 0.75rem 1.25rem;
        text-align: center;
        position: sticky;
        bottom: 0;
        z-index: 10;
      }

      ::ng-deep .view-all-link {
        font-size: 0.825rem;
        font-weight: 600;
        color: #2563eb;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        padding: 0.25rem 0;
        transition: color 0.2s;
      }
      ::ng-deep .view-all-link:hover {
        color: #1d4ed8;
        text-decoration: underline;
      }

      /* Dark Mode Specific Overrides */
      :root[class*='app-dark'] ::ng-deep,
      .app-dark ::ng-deep {
        .notification-dropdown-card,
        .notification-dropdown-header,
        .notification-list-container,
        .notification-dropdown-footer {
          background: #1e293b !important;
          border-color: #334155 !important;
        }

        .notification-header-title,
        .item-title-text,
        .empty-title {
          color: #f8fafc !important;
        }

        .item-message-text,
        .empty-subtitle {
          color: #94a3b8 !important;
        }

        .item-time {
          color: #64748b !important;
        }

        .notification-item-row {
          border-color: #334155 !important;

          &:hover {
            background-color: #273549 !important;
          }

          &.unread-item {
            background-color: rgba(59, 130, 246, 0.08) !important;
          }
        }

        .unread-badge {
          background: rgba(59, 130, 246, 0.2) !important;
          color: #93c5fd !important;
        }

        .mark-all-btn,
        .view-all-link {
          color: #60a5fa !important;
        }

        .item-icon-wrapper.bg-green-50 {
          background-color: rgba(34, 197, 94, 0.15) !important;
          color: #4ade80 !important;
          border-color: rgba(34, 197, 94, 0.3) !important;
        }
        .item-icon-wrapper.bg-red-50 {
          background-color: rgba(239, 68, 68, 0.15) !important;
          color: #f87171 !important;
          border-color: rgba(239, 68, 68, 0.3) !important;
        }
        .item-icon-wrapper.bg-amber-50 {
          background-color: rgba(245, 158, 11, 0.15) !important;
          color: #fbbf24 !important;
          border-color: rgba(245, 158, 11, 0.3) !important;
        }
        .item-icon-wrapper.bg-blue-50 {
          background-color: rgba(59, 130, 246, 0.15) !important;
          color: #60a5fa !important;
          border-color: rgba(59, 130, 246, 0.3) !important;
        }
      }

      /* Empty State */
      ::ng-deep .notification-empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem 1.5rem;
        text-align: center;
      }
      ::ng-deep .muted-bell-icon {
        font-size: 2.25rem;
        color: var(--text-color-secondary);
        opacity: 0.5;
        margin-bottom: 0.75rem;
      }
      ::ng-deep .empty-title {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--text-color);
        margin: 0 0 0.25rem 0;
      }
      ::ng-deep .empty-subtitle {
        font-size: 0.78rem;
        color: var(--text-color-secondary);
        margin: 0;
      }
    `,
  ],
})
export class AppTopbar implements OnInit, OnDestroy {
  searchService = inject(SearchService);
  router = inject(Router);
  authService = inject(AuthService);
  config = inject(APP_CONFIG);
  layoutService = inject(LayoutService);

  @ViewChild('searchInput') searchInput!: AutoComplete;
  private searchSubscription?: Subscription;

  userName = 'User';
  userDesignation = '';
  branchId: number | null = null;

  toggleTheme() {
    this.layoutService.layoutConfig.update((state) => ({ ...state, darkTheme: !state.darkTheme }));
  }

  // Notifications State
  notifications: any[] = [];
  unreadCount = signal(0);
  private notificationInterval: any;
  http = inject(HttpClient);

  cdr = inject(ChangeDetectorRef);

  // Role and Language Data
  languages = [
    { label: 'English', value: 'en' },
    { label: 'मराठी (Marathi)', value: 'mr' }
  ];

  translationService = inject(OfflineTranslationService);
  selectedLanguage = this.translationService.getCurrentLanguage();

  onLanguageChange(lang: string) {
    this.translationService.setLanguage(lang);
  }

  suggestions: SearchItem[] = [];
  selectedItem: any;
  private items: SearchItem[] = [];

  constructor(
    private zone: NgZone,
  ) { }

  ngOnInit() {
    let user: any = {};
    try {
      user = JSON.parse(localStorage.getItem('user') || '{}');
    } catch (e) {
      console.warn('Invalid user JSON in topbar:', e);
    }
    this.userName = user.full_name || user.fullName || user.name || 'User';
    this.userDesignation = user.role || user.designation || this.getUserRoleName(user.user_type_id);
    this.branchId = Number(user.branch_id || user.branchId || 0) || 1;

    setTimeout(() => {
      this.loadNotifications();
    }, 0);
    // Poll every 30 seconds
    this.notificationInterval = setInterval(() => this.loadNotifications(), 30000);

    // Subscribe to search focus requests
    this.searchSubscription = this.searchService.searchFocus$.subscribe(() => {
      if (this.searchInput) {
        const input = this.searchInput.el.nativeElement.querySelector('input');
        if (input) {
          input.focus();
        }
      }
    });
  }

  ngOnDestroy(): void {
    // Unsubscribe from search
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
    }
  }

  loadNotifications() {
    // No branch_id param needed — backend reads identity from the JWT Bearer token
    this.http.get<any[]>(`${this.config.apiUrl}/notifications`).subscribe({
      next: (data) => {
        this.notifications = data;
        this.unreadCount.set(data.filter(n => !n.is_read).length);
        this.cdr.detectChanges();
      },
      error: () => {} // silently ignore — topbar should not break on notification errors
    });
  }


  markAsRead(n: any) {
    if (n.is_read) return;
    this.http.put(`${this.config.apiUrl}/notifications/${n.id}/read`, {}).subscribe(() => {
      n.is_read = true;
      this.unreadCount.set(this.notifications.filter(x => !x.is_read).length);
      this.cdr.detectChanges();
    });
  }

  markAllAsRead(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.http.put(`${this.config.apiUrl}/notifications/read-all`, {}).subscribe({
      next: () => {
        this.notifications.forEach(n => n.is_read = true);
        this.unreadCount.set(0);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to mark all as read:', err);
      }
    });
  }

  getNotificationIcon(n: any): string {
    const title = String(n.title || '').toLowerCase();
    const msg = String(n.message || '').toLowerCase();
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
    
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
  }

  // Search Methods
  search(event: any) {
    const query = event.query.toLowerCase();

    // If query is empty, show all items
    if (!query || query.trim() === '') {
      this.suggestions = [...this.items];
      return;
    }

    // Helper to check if any word in text starts with query
    const matchesRequest = (text: string) => {
      if (!text) return false;
      return text
        .toLowerCase()
        .split(' ')
        .some((word) => word.startsWith(query));
    };

    const filtered = this.items.filter((item) => {
      return (
        matchesRequest(item.label) ||
        matchesRequest(item.route) ||
        item.keywords.some((k) => matchesRequest(k))
      );
    });

    this.suggestions = filtered.sort((a, b) => {
      const aLabel = a.label.toLowerCase();
      const bLabel = b.label.toLowerCase();

      // Priority 1: Exact match
      if (aLabel === query && bLabel !== query) return -1;
      if (bLabel === query && aLabel !== query) return 1;

      // Priority 2: Label Starts with
      const aStarts = aLabel.startsWith(query);
      const bStarts = bLabel.startsWith(query);
      if (aStarts && !bStarts) return -1;
      if (bStarts && !aStarts) return 1;

      // Priority 3: Alphanumeric Sort
      return a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' });
    });
  }

  onSelect(event: AutoCompleteSelectEvent) {
    const item = event.value as SearchItem;
    this.router.navigate([item.route]);
    this.selectedItem = null; // Clear selection
  }

  onClear() {
    this.selectedItem = null;
    this.suggestions = [];
  }

  logout() {
    this.authService.logout();
  }

  getAvatarInitial(): string {
    return (this.userName || 'User').charAt(0).toUpperCase();
  }

  getUserRoleName(userTypeId: any): string {
    const typeId = Number(userTypeId);
    switch (typeId) {
      case 1:
        return 'Admin';
      case 2:
        return 'Auditor';
      case 3:
        return 'Employee';
      case 4:
        return 'Reviewer';
      case 5:
        return 'Top Level Management';
      default:
        return '';
    }
  }
}
