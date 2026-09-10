import { Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-footer',
  styles: [`
    :host {
      display: block;
      background: transparent;
    }
    .layout-footer {
      background: transparent;
      border-top: 1px solid var(--surface-border, #e2e8f0);
      color: var(--text-color-secondary, #64748b);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem 0;
      gap: 0.5rem;
    }
    :host-context(.app-dark) .layout-footer img {
      filter: brightness(0) invert(0.8) !important;
    }
  `],
  template: `<div class="layout-footer text-xs md:text-sm">
                <img src="assets/images/logos/kredpool_logo.png" alt="Logo" height="24px" class="mr-2" style="opacity: 0.8; filter: grayscale(100%) brightness(0.85);" />
                <span>© {{ currentYear }} <b>KredPool Solutions Pvt Ltd.</b> All rights reserved.</span>
            </div>`
})
export class AppFooter {
  readonly currentYear = new Date().getFullYear();
}
