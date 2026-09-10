import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../core/services/auth/auth.service';
import { LayoutService } from '../../shell/layout/service/layout.service';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { OfflineTranslationService } from '../../core/services/offline-translation.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    Toast
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private messageService = inject(MessageService);
  layoutService = inject(LayoutService);
  translationService = inject(OfflineTranslationService);

  username = '';
  password = '';
  rememberMe = false;

  loading = signal(false);
  error = signal<string | undefined>(undefined);

  selectedLanguage = this.translationService.getCurrentLanguage();

  toggleTheme() {
    this.layoutService.layoutConfig.update((state) => ({ ...state, darkTheme: !state.darkTheme }));
  }

  async onLanguageChange(lang: string) {
    this.selectedLanguage = lang;
    await this.translationService.setLanguage(lang);
  }

  async toggleLanguage() {
    const next = this.selectedLanguage === 'en' ? 'mr' : 'en';
    await this.onLanguageChange(next);
  }

  demoUsers = [
    { label: 'CO', icon: 'pi pi-shield', username: 'co', password: 'password123', color: '#4f46e5' },
    { label: 'CCO', icon: 'pi pi-star', username: 'cco', password: 'password123', color: '#0891b2' },
    { label: 'Dept', icon: 'pi pi-building', username: 'advances_dept', password: '123456', color: '#059669' }
  ];

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.ctrlKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.quickLogin('admin', 'password123');
    }
  }

  quickLogin(username: string, password: string = 'password123') {
    this.username = username;
    this.password = password;
    this.onLogin();
  }

  onLogin() {
    if (this.loading()) return;

    if (!this.username || !this.password) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Required',
        detail: 'Please enter employee code and password'
      });
      return;
    }

    this.loading.set(true);
    this.error.set(undefined);

    this.authService.login({
      username: this.username.trim(),
      password: this.password.trim(),
      enable_2fa: false
    }).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        this.handleSuccessfulLogin();
      },
      error: (err: any) => {
        this.loading.set(false);
        const errorMessage = err?.error?.message || 'Invalid employee code or password. Please check your details and try again.';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage
        });
      }
    });
  }

  private handleSuccessfulLogin() {
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Login successful'
    });

    setTimeout(() => {
      const returnUrl = this.route.snapshot.queryParams['returnUrl'];

      if (returnUrl) {
        this.router.navigate([returnUrl]);
        return;
      }

      this.router.navigate(['/home']);
    }, 700);
  }
}
