import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { Router, RouterOutlet, NavigationStart, Event as RouterEvent } from '@angular/router';
import { updatePreset } from '@primeuix/themes';
import { APP_CONFIG } from './core/services/config/config.token';
import { KeyboardShortcutService } from './core/services/keyboard-shortcut';
import { SearchService } from './core/services/search.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('audit_frontend_local');
  private config = inject(APP_CONFIG);

  // @ViewChild('appSearch') appSearch!: AppSearch; // Removed: Using service instead

  constructor(private router: Router) {
    this.router.events.subscribe((event: RouterEvent) => {
      if (event instanceof NavigationStart) {
        // Aggressively clear any PrimeNG overlays, masks and overlays on navigation
        document.querySelectorAll('.p-menu, .p-menu-overlay, .p-popover, .p-tooltip, [data-pc-name="menu"], .p-drawer-mask, .p-sidebar-mask, .p-dialog-mask, .p-component-overlay, .p-overlay-mask').forEach(el => {
          try {
            if (el && el.parentNode === document.body) {
              el.parentNode.removeChild(el);
            }
          } catch(e) {}
        });
        // Restore scroll and interaction states on the body and html tags
        try {
          document.body.classList.remove('blocked-scroll', 'p-overflow-hidden');
          document.documentElement.classList.remove('p-overflow-hidden');
          document.body.style.overflow = '';
          document.body.style.pointerEvents = '';
          document.documentElement.style.overflow = '';
          document.documentElement.style.pointerEvents = '';
        } catch(e) {}
      }
    });

    // Global MutationObserver to clean up stranded PrimeNG masks when any overlay is hidden or closed
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(() => {
        const masks = document.querySelectorAll('.p-drawer-mask, .p-sidebar-mask, .p-dialog-mask, .p-component-overlay, .p-overlay-mask');
        if (masks.length > 0) {
          // Check if any drawer or dialog is actively visible to the user in the viewport
          const activeOverlays = Array.from(document.querySelectorAll('.p-drawer, .p-dialog')).some(el => {
            const rect = el.getBoundingClientRect();
            // Check if it has dimensions AND is positioned within screen boundaries (i.e. not translated off-screen)
            return rect.width > 0 && rect.height > 0 && rect.left < window.innerWidth && rect.right > 0;
          });
          
          // If no active overlays are open, remove any lingering masks from the body
          if (!activeOverlays) {
            // Temporarily disconnect to prevent feedback loops when removing elements/attributes
            observer.disconnect();
            
            try {
              masks.forEach(el => {
                try {
                  if (el && el.parentNode === document.body) {
                    el.parentNode.removeChild(el);
                  }
                } catch(e) {}
              });
              try {
                document.body.classList.remove('blocked-scroll', 'p-overflow-hidden');
                document.documentElement.classList.remove('p-overflow-hidden');
                document.body.style.overflow = '';
                document.body.style.pointerEvents = '';
                document.documentElement.style.overflow = '';
                document.documentElement.style.pointerEvents = '';
              } catch(e) {}
            } finally {
              // Re-enable observation after modification is complete
              observer.observe(document.body, {
                childList: true,
                subtree: false
              });
            }
          }
        }
      });

      // Only observe direct children (since PrimeNG masks are direct children of body) and don't watch attributes/subtree
      observer.observe(document.body, {
        childList: true,
        subtree: false
      });
    }
  }

  ngOnInit(): void {
    console.log(this.config);

    // Initialize theme with banking navy primary color (matching layout shell)
    const bankingNavyPalette = {
      50: '#f0f4f8',
      100: '#cbd5e1',
      200: '#94a3b8',
      300: '#64748b',
      400: '#475569',
      500: '#0f2942', // Match Topbar Banking Navy
      600: '#153554', // Lighter hover navy
      700: '#1a4166',
      800: '#204d78',
      900: '#25598a',
      950: '#0b1d2e'
    };

    updatePreset({
      semantic: {
        primary: bankingNavyPalette,
        surface: "ocean",

        /* ------------------------------------------------------
         * COLOR SCHEMES
         * ------------------------------------------------------*/
        colorScheme: {
          light: {
            surface: {
              ground: '#ffffff',
              section: '#f8f9fd',
              card: '#ffffff',
              border: 'rgba(0,0,0,0.08)',
              hover: '{primary.50}'
            },

            text: {
              color: '#1f2937',
              secondaryColor: '#4b5563',
              mutedColor: '#6b7280'
            },

            primary: {
              color: '{primary.500}',
              contrastColor: '#ffffff',
              hoverColor: '{primary.600}',
              activeColor: '{primary.700}'
            },

            highlight: {
              background: '{primary.50}',
              focusBackground: '{primary.100}',
              color: '{primary.700}',
              focusColor: '{primary.800}'
            }
          },

          dark: {
            surface: {
              ground: '{primary.950}',
              section: '{primary.900}',
              card: '{primary.900}',
              border: 'rgba(255,255,255,0.08)',
              hover: 'rgba(255,255,255,0.04)'
            },

            text: {
              color: 'rgba(255,255,255,0.87)',
              secondaryColor: 'rgba(255,255,255,0.6)',
              mutedColor: 'rgba(255,255,255,0.45)'
            },

            primary: {
              color: '{primary.400}',
              contrastColor: '#ffffff',
              hoverColor: '{primary.300}',
              activeColor: '{primary.200}'
            },

            highlight: {
              background: 'color-mix(in srgb, {primary.400}, transparent 82%)',
              focusBackground: 'color-mix(in srgb, {primary.400}, transparent 70%)',
              color: '#ffffff',
              focusColor: '#ffffff'
            }
          }
        },

        /* ------------------------------------------------------
         * COMPONENT TUNING
         * ------------------------------------------------------*/
        components: {

          /* BUTTON */
          button: {
            borderRadius: '8px',
            paddingX: '1rem',
            paddingY: '0.6rem',
            fontWeight: '500',
            shadow:
              '0 2px 6px color-mix(in srgb, {primary.500}, transparent 70%)',
            focusRing: {
              width: '2px',
              style: 'solid',
              color: '{primary.400}'
            }
          },

          /* INPUT / TEXTBOX */
          inputtext: {
            borderRadius: '8px',
            paddingX: '0.75rem',
            paddingY: '0.55rem',
            borderColor: '{surface.border}',
            focusBorderColor: '{primary.400}',
            hoverBorderColor: '{primary.300}'
          },

          /* DROPDOWN / SELECT */
          dropdown: {
            borderRadius: '8px',
            borderColor: '{surface.border}',
            focusBorderColor: '{primary.400}',
            itemHoverBackground: '{highlight.background}',
            itemActiveBackground: '{highlight.focusBackground}'
          },

          /* MULTISELECT */
          multiselect: {
            borderRadius: '8px',
            chipBackground: '{primary.100}',
            chipColor: '{primary.800}'
          },

          /* CHECKBOX */
          checkbox: {
            borderRadius: '4px',
            checkedBackground: '{primary.500}',
            checkedBorderColor: '{primary.500}'
          },

          /* RADIO */
          radiobutton: {
            checkedBackground: '{primary.500}',
            checkedBorderColor: '{primary.500}'
          },

          /* TOGGLE */
          toggleswitch: {
            checkedBackground: '{primary.500}'
          },

          /* TABLE */
          datatable: {
            headerBackground: '{surface.section}',
            headerTextColor: '{text.color}',
            rowHoverBackground: '{surface.hover}',
            rowSelectedBackground:
              'color-mix(in srgb, {primary.500}, transparent 88%)',
            borderColor: '{surface.border}'
          },

          /* PAGINATOR */
          paginator: {
            buttonHoverBackground: '{highlight.background}',
            buttonActiveBackground: '{highlight.focusBackground}',
            borderRadius: '8px'
          },

          /* CARD */
          card: {
            borderRadius: '12px',
            shadow: '0 8px 24px rgba(0,0,0,0.08)',
            background: '{surface.card}'
          },

          /* DIALOG / MODAL */
          dialog: {
            borderRadius: '14px',
            headerBackground: '{surface.section}',
            contentBackground: '{surface.card}',
            shadow: '0 24px 64px rgba(0,0,0,0.35)'
          },

          /* MENU / SIDEBAR */
          menu: {
            itemHoverBackground: '{highlight.background}',
            itemActiveBackground: '{highlight.focusBackground}',
            itemBorderRadius: '6px'
          },

          /* TABVIEW */
          tabview: {
            inkBarColor: '{primary.500}',
            headerHoverBackground: '{highlight.background}',
            headerActiveColor: '{primary.600}'
          },

          /* TOAST */
          toast: {
            borderRadius: '10px',
            shadow: '0 12px 40px rgba(0,0,0,0.25)'
          },

          /* TOOLTIP */
          tooltip: {
            background: '{surface.card}',
            textColor: '{text.color}',
            borderRadius: '6px',
            shadow: '0 8px 24px rgba(0,0,0,0.25)'
          },

          /* PROGRESSBAR */
          progressbar: {
            valueBackground: '{primary.500}',
            height: '6px',
            borderRadius: '999px'
          }
        }
      }
    });

  }



}
