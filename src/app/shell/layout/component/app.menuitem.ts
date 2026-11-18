import { Component, HostBinding, Input } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { RippleModule } from 'primeng/ripple';
import { MenuItem } from 'primeng/api';
import { LayoutService } from '../service/layout.service';

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: '[app-menuitem]',
    imports: [CommonModule, RouterModule, RippleModule],
    template: `
        <ng-container>
            <div *ngIf="root && item.visible !== false" class="layout-menuitem-root-text">{{ item.label }}</div>
            <a *ngIf="(!item.routerLink || item.items) && item.visible !== false" [attr.href]="item.url" (click)="itemClick($event)" [ngClass]="item.styleClass" [attr.target]="item.target" tabindex="0" pRipple>
                <i [ngClass]="item.icon" class="layout-menuitem-icon"></i>
                <span class="layout-menuitem-copy">
                    <span class="layout-menuitem-label-row">
                        <span class="layout-menuitem-text">{{ item.label }}</span>
                        <span
                            *ngIf="item['badgeClass'] === 'live-compliance-pending'"
                            class="live-compliance-indicator"
                            [title]="item['livePendingLabel'] || 'Manager response pending with Auditor'"
                        >
                            {{ item['livePendingCount'] || '' }}
                        </span>
                    </span>
                    <small *ngIf="item['meta']" class="layout-menuitem-meta">{{ item['meta'] }}</small>
                </span>
                <span
                    *ngIf="item['badge']"
                    class="route-count-badge"
                >
                    {{ item['badge'] }}
                </span>
                <i class="pi pi-fw pi-angle-down layout-submenu-toggler" *ngIf="item.items"></i>
            </a>
            <a
                *ngIf="item.routerLink && !item.items && item.visible !== false"
                (click)="itemClick($event)"
                [ngClass]="item.styleClass"
                [routerLink]="item.routerLink"
                routerLinkActive="active-route"
                [routerLinkActiveOptions]="item.routerLinkActiveOptions || { paths: 'exact', queryParams: 'ignored', matrixParams: 'ignored', fragment: 'ignored' }"
                [fragment]="item.fragment"
                [queryParamsHandling]="item.queryParamsHandling"
                [preserveFragment]="item.preserveFragment"
                [skipLocationChange]="item.skipLocationChange"
                [replaceUrl]="item.replaceUrl"
                [state]="item.state"
                [queryParams]="item.queryParams"
                [attr.target]="item.target"
                tabindex="0"
                pRipple
            >
                <i [ngClass]="item.icon" class="layout-menuitem-icon"></i>
                <span class="layout-menuitem-copy">
                    <span class="layout-menuitem-label-row">
                        <span class="layout-menuitem-text">{{ item.label }}</span>
                        <span
                            *ngIf="item['badgeClass'] === 'live-compliance-pending'"
                            class="live-compliance-indicator"
                            [title]="item['livePendingLabel'] || 'Manager response pending with Auditor'"
                        >
                            {{ item['livePendingCount'] || '' }}
                        </span>
                    </span>
                    <small *ngIf="item['meta']" class="layout-menuitem-meta">{{ item['meta'] }}</small>
                </span>
                <span
                    *ngIf="item['badge']"
                    class="route-count-badge"
                >
                    {{ item['badge'] }}
                </span>
                <i class="pi pi-fw pi-angle-down layout-submenu-toggler" *ngIf="item.items"></i>
            </a>

            <ul *ngIf="item.items && item.visible !== false" [@children]="submenuAnimation">
                <ng-template ngFor let-child let-i="index" [ngForOf]="item.items">
                    <li app-menuitem [item]="child" [index]="i" [parentKey]="key" [class]="child['badgeClass'] === 'live-compliance-pending' ? 'live-compliance-pending' : ''"></li>
                </ng-template>
            </ul>
        </ng-container>
    `,
    animations: [
        trigger('children', [
            state(
                'collapsed',
                style({
                    height: '0'
                })
            ),
            state(
                'expanded',
                style({
                    height: '*'
                })
            ),
            transition('collapsed <=> expanded', animate('400ms cubic-bezier(0.86, 0, 0.07, 1)'))
        ])
    ],
    styles: [`
        .layout-menuitem-copy {
            display: flex;
            min-width: 0;
            flex: 1;
            flex-direction: column;
        }

        .layout-menuitem-label-row {
            display: flex;
            min-width: 0;
            align-items: center;
            gap: .35rem;
        }

        .layout-menuitem-text {
            font-size: 0.83rem;
            line-height: 1.25;
            letter-spacing: -0.01em;
        }

        .live-compliance-indicator {
            display: inline-flex;
            min-width: 1.1rem;
            height: 1.1rem;
            padding: 0 .28rem;
            flex: 0 0 auto;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            background: var(--red-500, #ef4444);
            color: #fff;
            font-size: .62rem;
            font-weight: 700;
            line-height: 1;
            animation: liveCompliancePulse 1.35s ease-in-out infinite;
        }

        @keyframes liveCompliancePulse {
            0%, 100% {
                opacity: 1;
                box-shadow: 0 0 0 0 rgba(239, 68, 68, .35);
            }
            50% {
                opacity: .72;
                box-shadow: 0 0 0 4px rgba(239, 68, 68, 0);
            }
        }

        .route-count-badge {
            margin-left: auto;
            flex-shrink: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 1.25rem;
            height: 1.25rem;
            padding: 0 0.32rem;
            border-radius: 999px;
            background-color: #ef4444;
            color: #ffffff;
            font-size: 0.68rem;
            font-weight: 700;
            line-height: 1;
            box-shadow: 0 1px 3px rgba(239, 68, 68, 0.35);
        }

        .layout-menuitem-meta {
            margin-top: .15rem;
            color: var(--text-color-secondary);
            font-size: .68rem;
            font-weight: 500;
            line-height: 1.2;
        }
    `]
})
export class AppMenuitem {
    @Input() item!: MenuItem;

    @Input() index!: number;

    @Input() @HostBinding('class.layout-root-menuitem') root!: boolean;

    @Input() parentKey!: string;

    active = false;

    menuSourceSubscription: Subscription;

    menuResetSubscription: Subscription;

    key: string = '';

    constructor(
        public router: Router,
        private layoutService: LayoutService
    ) {
        this.menuSourceSubscription = this.layoutService.menuSource$.subscribe((value) => {
            Promise.resolve(null).then(() => {
                if (value.routeEvent) {
                    this.active = value.key === this.key || value.key.startsWith(this.key + '-') ? true : false;
                } else {
                    // Accordion behavior: Close sibling parent menus when one is opened
                    if (value.parentKey !== undefined &&
                        this.parentKey === value.parentKey &&
                        this.item.items &&
                        value.key !== this.key) {
                        this.active = false;
                    }
                    // Original behavior: close if the event is not for this menu or its children
                    else if (value.key !== this.key && !value.key.startsWith(this.key + '-')) {
                        this.active = false;
                    }
                }
            });
        });

        this.menuResetSubscription = this.layoutService.resetSource$.subscribe(() => {
            this.active = false;
        });

        this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((params) => {
            if (this.item.routerLink) {
                this.updateActiveStateFromRoute();
            }
        });
    }

    ngOnInit() {
        this.key = this.parentKey ? this.parentKey + '-' + this.index : String(this.index);

        if (this.item.routerLink) {
            this.updateActiveStateFromRoute();
        }
    }

    updateActiveStateFromRoute() {
        const urlTree =
            this.router.createUrlTree(
                Array.isArray(this.item.routerLink)
                    ? this.item.routerLink
                    : [
                        this.item.routerLink,
                    ],
                {
                    queryParams:
                        this.item.queryParams,
                    fragment:
                        this.item.fragment,
                },
            );

        const activeRoute =
            this.router.isActive(
                urlTree,
                {
                    paths:
                        'exact',
                    queryParams:
                        this.item.queryParams
                            ? 'exact'
                            : 'ignored',
                    matrixParams:
                        'ignored',
                    fragment:
                        'ignored',
                },
            );

        if (activeRoute) {
            this.layoutService.onMenuStateChange({ key: this.key, routeEvent: true });
        }
    }

    itemClick(event: Event) {
        // avoid processing disabled items
        if (this.item.disabled) {
            event.preventDefault();
            return;
        }

        // execute command
        if (this.item.command) {
            this.item.command({ originalEvent: event, item: this.item });
        }

        // toggle active state
        if (this.item.items) {
            this.active = !this.active;

            // If opening a parent menu, close all siblings
            if (this.active) {
                this.layoutService.onMenuStateChange({ key: this.key, parentKey: this.parentKey });
            } else {
                this.layoutService.onMenuStateChange({ key: this.key });
            }
        } else {
            this.layoutService.onMenuStateChange({ key: this.key });
        }
    }

    get submenuAnimation() {
        return this.root ? 'expanded' : this.active ? 'expanded' : 'collapsed';
    }

    @HostBinding('class.active-menuitem')
    get activeClass() {
        return this.active && !this.root;
    }

    ngOnDestroy() {
        if (this.menuSourceSubscription) {
            this.menuSourceSubscription.unsubscribe();
        }

        if (this.menuResetSubscription) {
            this.menuResetSubscription.unsubscribe();
        }
    }
}
