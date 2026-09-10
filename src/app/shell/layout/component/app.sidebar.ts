import { Component, ElementRef, OnInit, OnDestroy, Renderer2, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppMenu } from './app.menu';
import { LayoutService } from '../service/layout.service';

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [CommonModule, AppMenu],
    template: ` 
    <div class="layout-sidebar" [class.no-transition]="layoutService.isSidebarResizing()" [style.width.rem]="sidebarWidth">
        <app-menu></app-menu>
        <div class="sidebar-resize-handle" 
             (mousedown)="onResizeStart($event)"
             title="Drag to resize sidebar">
        </div>
    </div>`,
    styles: [`
        .layout-sidebar {
            position: fixed;
            height: calc(100vh - 3.5rem);
            top: 3.5rem; /* Below topbar */
            left: 0;
            width: var(--sidebar-width, 14.5rem);
            background: linear-gradient(180deg, #f4f8fc 0%, #f8fafc 42%, #f7f9fc 100%);
            border-right: 1px solid #d9e2ec;
            box-shadow: inset -1px 0 0 rgba(31, 59, 87, 0.04);
            z-index: 999;
            transition: width 0.3s;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
        }

        .layout-sidebar.no-transition {
            transition: none !important;
        }

        .sidebar-resize-handle {
            position: absolute;
            right: 0;
            top: 0;
            bottom: 0;
            width: 4px;
            cursor: ew-resize;
            background: transparent;
            transition: background-color 0.2s;
            z-index: 1000;
        }
        
        .sidebar-resize-handle:hover {
            background-color: var(--primary-color);
            opacity: 0.5;
        }
        
        .sidebar-resize-handle:active {
            background-color: var(--primary-color);
            opacity: 0.8;
        }
    `]
})
export class AppSidebar implements OnInit, OnDestroy {
    sidebarWidth: number = 14.5; // Compact sleek default for workspace
    private startX = 0;
    private startWidth = 0;
    private mouseMoveListener: (() => void) | null = null;
    private mouseUpListener: (() => void) | null = null;


    constructor(
        public el: ElementRef,
        private renderer: Renderer2,
        private cdr: ChangeDetectorRef,
        private zone: NgZone,
        public layoutService: LayoutService
    ) { }

    ngOnInit() {
        // Load saved width from localStorage
        const savedWidth = localStorage.getItem('sidebarWidth');
        const compactWidthApplied =
            localStorage.getItem('sidebarCompactWidthApplied_v2');

        if (savedWidth && compactWidthApplied) {
            const parsedWidth =
                parseFloat(savedWidth);

            if (!Number.isNaN(parsedWidth)) {
                // Always constrain the loaded width to safe bounds
                this.sidebarWidth = Math.max(11, Math.min(20, parsedWidth));
            }
        } else {
            this.sidebarWidth = 14.5;
            localStorage.setItem('sidebarCompactWidthApplied_v2', '1');
            localStorage.setItem('sidebarWidth', '14.5');
        }

        // Always update CSS variable on init for breadcrumb positioning
        document.documentElement.style.setProperty('--sidebar-width', `${this.sidebarWidth}rem`);
    }

    ngOnDestroy() {
        this.cleanup();
    }

    onResizeStart(event: MouseEvent) {
        event.preventDefault();
        this.layoutService.isSidebarResizing.set(true);
        this.startX = event.clientX;
        this.startWidth = this.sidebarWidth;

        // Add global mouse listeners
        this.mouseMoveListener = this.renderer.listen('document', 'mousemove', (e: MouseEvent) => {
            if (this.layoutService.isSidebarResizing()) {
                this.zone.run(() => {
                    this.onResize(e);
                });
            }
        });

        this.mouseUpListener = this.renderer.listen('document', 'mouseup', () => {
            this.zone.run(() => {
                this.onResizeEnd();
            });
        });

        // Prevent text selection during resize
        this.renderer.addClass(document.body, 'sidebar-resizing');
    }

    private onResize(event: MouseEvent) {
        const deltaX = event.clientX - this.startX;
        const deltaRem = deltaX / 16; // Convert pixels to rem (assuming 16px = 1rem)
        let newWidth = this.startWidth + deltaRem;

        // Constrain width between 12rem and 24rem
        newWidth = Math.max(12, Math.min(24, newWidth));

        this.sidebarWidth = newWidth;

        // Update CSS variable for main content margin
        document.documentElement.style.setProperty('--sidebar-width', `${newWidth}rem`);

        // Trigger change detection for real-time update
        this.cdr.detectChanges();
    }

    private onResizeEnd() {
        this.layoutService.isSidebarResizing.set(false);
        this.renderer.removeClass(document.body, 'sidebar-resizing');

        // Save width to localStorage
        localStorage.setItem('sidebarWidth', this.sidebarWidth.toString());

        this.cleanup();
    }

    private cleanup() {
        if (this.mouseMoveListener) {
            this.mouseMoveListener();
            this.mouseMoveListener = null;
        }
        if (this.mouseUpListener) {
            this.mouseUpListener();
            this.mouseUpListener = null;
        }
    }
}
