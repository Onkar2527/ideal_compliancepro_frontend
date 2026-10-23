import { Injectable, effect, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';
import { updatePrimaryPalette } from '@primeuix/themes';

export interface AppColorTheme {
    key: string;
    name: string;
    label: string;
    primary: string;
    primaryHover: string;
    primaryDark: string;
    topbarBg: string;
    topbarBorder: string;
    heroGradient: string;
    pageBg: string;
    sidebarBg: string;
    menuActiveBg: string;
    menuActiveColor: string;
    menuActiveBorder: string;
    lightTintRgba: string;
    palette: Record<string, string>;
}

export interface layoutConfig {
    preset?: string;
    primary?: string;
    surface?: string | undefined | null;
    darkTheme?: boolean;
    menuMode?: string;
    colorTheme?: string;
}

interface LayoutState {
    staticMenuDesktopInactive?: boolean;
    overlayMenuActive?: boolean;
    configSidebarVisible?: boolean;
    staticMenuMobileActive?: boolean;
    menuHoverActive?: boolean;
}

interface MenuChangeEvent {
    key: string;
    routeEvent?: boolean;
    parentKey?: string;
}

export const APP_COLOR_THEMES: AppColorTheme[] = [
    {
        key: 'ocean',
        name: 'Sky Ocean',
        label: 'Sky Blue',
        primary: '#0284c7',
        primaryHover: '#0369a1',
        primaryDark: '#075985',
        topbarBg: 'linear-gradient(135deg, #133b5c 0%, #1a4f7c 100%)',
        topbarBorder: 'rgba(255, 255, 255, 0.15)',
        heroGradient: 'linear-gradient(110deg, #0369a1 0%, #0284c7 50%, #38bdf8 100%)',
        pageBg: '#f0f8ff',
        sidebarBg: '#f0f6fa',
        menuActiveBg: '#e0f2fe',
        menuActiveColor: '#0369a1',
        menuActiveBorder: '#0284c7',
        lightTintRgba: 'rgba(2, 132, 199, 0.15)',
        palette: {
            50: '#f0f9ff',
            100: '#e0f2fe',
            200: '#bae6fd',
            300: '#7dd3fc',
            400: '#38bdf8',
            500: '#0ea5e9',
            600: '#0284c7',
            700: '#0369a1',
            800: '#075985',
            900: '#0c4a6e',
            950: '#082f49'
        }
    },
    {
        key: 'emerald',
        name: 'Emerald Mint',
        label: 'Fresh Mint',
        primary: '#059669',
        primaryHover: '#047857',
        primaryDark: '#065f46',
        topbarBg: 'linear-gradient(135deg, #0e4432 0%, #165b44 100%)',
        topbarBorder: 'rgba(255, 255, 255, 0.15)',
        heroGradient: 'linear-gradient(110deg, #065f46 0%, #059669 50%, #34d399 100%)',
        pageBg: '#f0fdf4',
        sidebarBg: '#eefbf2',
        menuActiveBg: '#dcfce7',
        menuActiveColor: '#15803d',
        menuActiveBorder: '#16a34a',
        lightTintRgba: 'rgba(5, 150, 105, 0.15)',
        palette: {
            50: '#f0fdf4',
            100: '#dcfce7',
            200: '#bbf7d0',
            300: '#86efac',
            400: '#4ade80',
            500: '#22c55e',
            600: '#16a34a',
            700: '#15803d',
            800: '#166534',
            900: '#14532d',
            950: '#052e16'
        }
    },
    {
        key: 'indigo',
        name: 'Royal Indigo',
        label: 'Royal Indigo',
        primary: '#4f46e5',
        primaryHover: '#4338ca',
        primaryDark: '#3730a3',
        topbarBg: 'linear-gradient(135deg, #2b2760 0%, #3a3782 100%)',
        topbarBorder: 'rgba(255, 255, 255, 0.15)',
        heroGradient: 'linear-gradient(110deg, #3730a3 0%, #4f46e5 50%, #818cf8 100%)',
        pageBg: '#f5f3ff',
        sidebarBg: '#f3f2fa',
        menuActiveBg: '#ede9fe',
        menuActiveColor: '#4338ca',
        menuActiveBorder: '#4f46e5',
        lightTintRgba: 'rgba(79, 70, 229, 0.15)',
        palette: {
            50: '#eef2ff',
            100: '#e0e7ff',
            200: '#c7d2fe',
            300: '#a5b4fc',
            400: '#818cf8',
            500: '#6366f1',
            600: '#4f46e5',
            700: '#4338ca',
            800: '#3730a3',
            900: '#312e81',
            950: '#1e1b4b'
        }
    },
    {
        key: 'violet',
        name: 'Violet Purple',
        label: 'Soft Violet',
        primary: '#7c3aed',
        primaryHover: '#6d28d9',
        primaryDark: '#5b21b6',
        topbarBg: 'linear-gradient(135deg, #3d1c63 0%, #512782 100%)',
        topbarBorder: 'rgba(255, 255, 255, 0.15)',
        heroGradient: 'linear-gradient(110deg, #5b21b6 0%, #7c3aed 50%, #a78bfa 100%)',
        pageBg: '#faf5ff',
        sidebarBg: '#f7f2fa',
        menuActiveBg: '#f3e8ff',
        menuActiveColor: '#6d28d9',
        menuActiveBorder: '#7c3aed',
        lightTintRgba: 'rgba(124, 58, 237, 0.15)',
        palette: {
            50: '#faf5ff',
            100: '#f3e8ff',
            200: '#e9d5ff',
            300: '#d8b4fe',
            400: '#c084fc',
            500: '#a855f7',
            600: '#9333ea',
            700: '#7e22ce',
            800: '#6b21a8',
            900: '#581c87',
            950: '#3b0764'
        }
    },
    {
        key: 'teal',
        name: 'Fresh Teal',
        label: 'Teal Lagoon',
        primary: '#0d9488',
        primaryHover: '#0f766e',
        primaryDark: '#115e59',
        topbarBg: 'linear-gradient(135deg, #104240 0%, #165a57 100%)',
        topbarBorder: 'rgba(255, 255, 255, 0.15)',
        heroGradient: 'linear-gradient(110deg, #115e59 0%, #0d9488 50%, #2dd4bf 100%)',
        pageBg: '#f0fdfa',
        sidebarBg: '#edf7f6',
        menuActiveBg: '#ccfbf1',
        menuActiveColor: '#0f766e',
        menuActiveBorder: '#0d9488',
        lightTintRgba: 'rgba(13, 148, 136, 0.15)',
        palette: {
            50: '#f0fdfa',
            100: '#ccfbf1',
            200: '#99f6e4',
            300: '#5eead4',
            400: '#2dd4bf',
            500: '#14b8a6',
            600: '#0d9488',
            700: '#0f766e',
            800: '#115e59',
            900: '#134e4a',
            950: '#042f2e'
        }
    },
    {
        key: 'rose',
        name: 'Rose Coral',
        label: 'Rose Blossom',
        primary: '#e11d48',
        primaryHover: '#be123c',
        primaryDark: '#9f1239',
        topbarBg: 'linear-gradient(135deg, #541726 0%, #731f34 100%)',
        topbarBorder: 'rgba(255, 255, 255, 0.15)',
        heroGradient: 'linear-gradient(110deg, #9f1239 0%, #e11d48 50%, #fb7185 100%)',
        pageBg: '#fff1f2',
        sidebarBg: '#fbf2f3',
        menuActiveBg: '#ffe4e6',
        menuActiveColor: '#be123c',
        menuActiveBorder: '#e11d48',
        lightTintRgba: 'rgba(225, 29, 72, 0.15)',
        palette: {
            50: '#fff1f2',
            100: '#ffe4e6',
            200: '#fecdd3',
            300: '#fda4af',
            400: '#fb7185',
            500: '#f43f5e',
            600: '#e11d48',
            700: '#be123c',
            800: '#9f1239',
            900: '#881337',
            950: '#4c0519'
        }
    },
    {
        key: 'amber',
        name: 'Sunset Amber',
        label: 'Sunset Gold',
        primary: '#d97706',
        primaryHover: '#b45309',
        primaryDark: '#92400e',
        topbarBg: 'linear-gradient(135deg, #4f2d0a 0%, #6b3e10 100%)',
        topbarBorder: 'rgba(255, 255, 255, 0.15)',
        heroGradient: 'linear-gradient(110deg, #92400e 0%, #d97706 50%, #fbbf24 100%)',
        pageBg: '#fffbeb',
        sidebarBg: '#faf7ed',
        menuActiveBg: '#fef3c7',
        menuActiveColor: '#b45309',
        menuActiveBorder: '#d97706',
        lightTintRgba: 'rgba(217, 119, 6, 0.15)',
        palette: {
            50: '#fffbeb',
            100: '#fef3c7',
            200: '#fde68a',
            300: '#fcd34d',
            400: '#fbbf24',
            500: '#f59e0b',
            600: '#d97706',
            700: '#b45309',
            800: '#92400e',
            900: '#78350f',
            950: '#451a03'
        }
    },
    {
        key: 'cyan',
        name: 'Arctic Cyan',
        label: 'Arctic Ice',
        primary: '#0891b2',
        primaryHover: '#0e7490',
        primaryDark: '#155e75',
        topbarBg: 'linear-gradient(135deg, #113f4e 0%, #185669 100%)',
        topbarBorder: 'rgba(255, 255, 255, 0.15)',
        heroGradient: 'linear-gradient(110deg, #155e75 0%, #0891b2 50%, #22d3ee 100%)',
        pageBg: '#ecfeff',
        sidebarBg: '#eaf7f8',
        menuActiveBg: '#cffafe',
        menuActiveColor: '#0e7490',
        menuActiveBorder: '#0891b2',
        lightTintRgba: 'rgba(8, 145, 178, 0.15)',
        palette: {
            50: '#ecfeff',
            100: '#cffafe',
            200: '#a5f3fc',
            300: '#67e8f9',
            400: '#22d3ee',
            500: '#06b6d4',
            600: '#0891b2',
            700: '#0e7490',
            800: '#155e75',
            900: '#164e63',
            950: '#083344'
        }
    },
    {
        key: 'navy',
        name: 'Classic Navy',
        label: 'Banking Navy',
        primary: '#0f2942',
        primaryHover: '#153554',
        primaryDark: '#0b1d2e',
        topbarBg: 'linear-gradient(135deg, #0f2942 0%, #163d63 100%)',
        topbarBorder: 'rgba(255, 255, 255, 0.15)',
        heroGradient: 'linear-gradient(110deg, #0f2942 0%, #0f2942 50%, #142f4e 75%, #183d6b 100%)',
        pageBg: '#e5eaf0',
        sidebarBg: '#f0f4f8',
        menuActiveBg: '#e0f2fe',
        menuActiveColor: '#0369a1',
        menuActiveBorder: '#0284c7',
        lightTintRgba: 'rgba(15, 41, 66, 0.15)',
        palette: {
            50: '#f0f4f8',
            100: '#d9e2ec',
            200: '#bcccdc',
            300: '#9fb3c8',
            400: '#627d98',
            500: '#486581',
            600: '#334e68',
            700: '#243b53',
            800: '#102a43',
            900: '#0f2942',
            950: '#071624'
        }
    }
];

@Injectable({
    providedIn: 'root'
})
export class LayoutService {
    colorThemes = APP_COLOR_THEMES;

    private getInitialColorTheme(): AppColorTheme {
        const savedKey = typeof localStorage !== 'undefined' ? localStorage.getItem('app_color_theme') : null;
        if (savedKey) {
            const found = this.colorThemes.find(t => t.key === savedKey);
            if (found) return found;
        }
        return this.colorThemes[0]; // Default to Sky Ocean
    }

    currentColorTheme = signal<AppColorTheme>(this.getInitialColorTheme());

    _config: layoutConfig = {
        preset: 'Aura',
        primary: this.getInitialColorTheme().primary,
        surface: null,
        darkTheme: typeof localStorage !== 'undefined' ? localStorage.getItem('darkTheme') === 'true' : false,
        menuMode: 'static',
        colorTheme: this.getInitialColorTheme().key
    };

    _state: LayoutState = {
        staticMenuDesktopInactive: false,
        overlayMenuActive: false,
        configSidebarVisible: false,
        staticMenuMobileActive: false,
        menuHoverActive: false,
    };

    layoutConfig = signal<layoutConfig>(this._config);

    layoutState = signal<LayoutState>(this._state);

    private configUpdate = new Subject<layoutConfig>();

    private overlayOpen = new Subject<any>();

    private menuSource = new Subject<MenuChangeEvent>();

    private resetSource = new Subject();

    menuSource$ = this.menuSource.asObservable();

    resetSource$ = this.resetSource.asObservable();

    configUpdate$ = this.configUpdate.asObservable();

    overlayOpen$ = this.overlayOpen.asObservable();

    theme = computed(() => (this.layoutConfig()?.darkTheme ? 'light' : 'dark'));

    isSidebarActive = computed(() => this.layoutState().overlayMenuActive || this.layoutState().staticMenuMobileActive);

    isDarkTheme = computed(() => this.layoutConfig().darkTheme);

    getPrimary = computed(() => this.layoutConfig().primary);

    getSurface = computed(() => this.layoutConfig().surface);

    isOverlay = computed(() => this.layoutConfig().menuMode === 'overlay');

    transitionComplete = signal<boolean>(false);

    isSidebarResizing = signal<boolean>(false);

    private initialized = false;

    constructor() {
        effect(() => {
            const config = this.layoutConfig();
            if (config) {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('darkTheme', String(!!config.darkTheme));
                }
                this.onConfigUpdate();
            }
        });

        effect(() => {
            const config = this.layoutConfig();
            if (!config) return;

            if (!this.initialized) {
                this.initialized = true;
                this.toggleDarkMode(config);
            } else {
                this.handleDarkModeTransition(config);
            }
        });

        // Initialize active color theme
        this.applyColorTheme(this.currentColorTheme().key);
    }

    applyColorTheme(themeKey: string): void {
        const theme = this.colorThemes.find(t => t.key === themeKey) || this.colorThemes[0];
        this.currentColorTheme.set(theme);

        this.layoutConfig.update(state => ({
            ...state,
            primary: theme.primary,
            colorTheme: theme.key
        }));

        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('app_color_theme', theme.key);
        }

        try {
            updatePrimaryPalette(theme.palette);
        } catch (err) {
            console.warn('Could not update PrimeNG primary palette:', err);
        }

        if (typeof document !== 'undefined') {
            const root = document.documentElement;
            root.setAttribute('data-color-theme', theme.key);
            root.style.setProperty('--primary-color', theme.primary);
            root.style.setProperty('--primary-color-hover', theme.primaryHover);
            root.style.setProperty('--primary-color-dark', theme.primaryDark);
            root.style.setProperty('--topbar-bg', theme.topbarBg);
            root.style.setProperty('--topbar-border', theme.topbarBorder);
            root.style.setProperty('--topbar-text', '#ffffff');
            root.style.setProperty('--topbar-text-secondary', 'rgba(255, 255, 255, 0.75)');
            root.style.setProperty('--topbar-action-bg', 'rgba(255, 255, 255, 0.12)');
            root.style.setProperty('--topbar-action-border', 'rgba(255, 255, 255, 0.2)');
            root.style.setProperty('--topbar-action-hover', 'rgba(255, 255, 255, 0.22)');
            root.style.setProperty('--hero-gradient', theme.heroGradient);
            root.style.setProperty('--ap-page-bg', theme.pageBg);
            root.style.setProperty('--sidebar-bg', theme.sidebarBg);
            root.style.setProperty('--menu-active-bg', theme.menuActiveBg);
            root.style.setProperty('--menu-active-color', theme.menuActiveColor);
            root.style.setProperty('--menu-active-border', theme.menuActiveBorder);
            root.style.setProperty('--primary-light-rgba', theme.lightTintRgba);
            root.style.setProperty('--bg-gradient', `linear-gradient(135deg, ${theme.pageBg} 0%, #ffffff 100%)`);
            root.style.setProperty('--p-primary-color', theme.primary);
            root.style.setProperty('--p-primary-contrast-color', '#ffffff');
            root.style.setProperty('--p-primary-hover-color', theme.primaryHover);
            root.style.setProperty('--p-primary-active-color', theme.primaryDark);
        }
    }

    private handleDarkModeTransition(config: layoutConfig): void {
        if ((document as any).startViewTransition) {
            this.startViewTransition(config);
        } else {
            this.toggleDarkMode(config);
            this.onTransitionEnd();
        }
    }

    private startViewTransition(config: layoutConfig): void {
        const transition = (document as any).startViewTransition(() => {
            this.toggleDarkMode(config);
        });

        transition.ready
            .then(() => {
                this.onTransitionEnd();
            })
            .catch(() => { });
    }

    toggleDarkMode(config?: layoutConfig): void {
        const _config = config || this.layoutConfig();
        if (_config.darkTheme) {
            document.documentElement.classList.add('app-dark');
        } else {
            document.documentElement.classList.remove('app-dark');
        }
    }

    private onTransitionEnd() {
        this.transitionComplete.set(true);
        setTimeout(() => {
            this.transitionComplete.set(false);
        });
    }

    onMenuToggle() {
        if (this.isOverlay()) {
            this.layoutState.update((prev) => ({ ...prev, overlayMenuActive: !this.layoutState().overlayMenuActive }));

            if (this.layoutState().overlayMenuActive) {
                this.overlayOpen.next(null);
            }
        }

        if (this.isDesktop()) {
            this.layoutState.update((prev) => ({ ...prev, staticMenuDesktopInactive: !this.layoutState().staticMenuDesktopInactive }));
        } else {
            this.layoutState.update((prev) => ({ ...prev, staticMenuMobileActive: !this.layoutState().staticMenuMobileActive }));

            if (this.layoutState().staticMenuMobileActive) {
                this.overlayOpen.next(null);
            }
        }
    }

    isDesktop() {
        return window.innerWidth > 991;
    }

    isMobile() {
        return !this.isDesktop();
    }

    onConfigUpdate() {
        this._config = { ...this.layoutConfig() };
        this.configUpdate.next(this.layoutConfig());
    }

    onMenuStateChange(event: MenuChangeEvent) {
        this.menuSource.next(event);
    }

    reset() {
        this.resetSource.next(true);
    }
}
