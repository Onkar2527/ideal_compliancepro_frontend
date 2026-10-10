import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../core/services/auth/auth.service';
import { APP_CONFIG } from '../../core/services/config/config.token';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    Toast
  ],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>
    <div class="login-page">
      <!-- Fixed Banner -->
      <div class="top-banner">
        <div class="glow-node node-1"></div>
        <div class="glow-node node-2"></div>
        <div class="glow-node node-3"></div>
      </div>

      <!-- Background Floating Shapes -->
      <div class="bg-shape shape-1"></div>
      <div class="bg-shape shape-2"></div>
      <div class="bg-shape shape-3"></div>

      <!-- Content Section -->
      <div class="content-section">
        <!-- Brand -->
        <div class="brand-section animate-item">
          <h1>Compliance Pro</h1>
          <p>AI POWERED COMPLIANCE MANAGEMENT</p>
        </div>

        <!-- Card wrapper -->
        <div class="login-wrapper">
          <div class="login-card animate-item delay-1">
            <h2>Reset Your Password</h2>
            <div class="company-name">{{ bankName }}</div>
            <div class="divider"></div>

            <p class="login-text" style="margin-bottom: 12px; font-weight: 500;">Select Reset Password Method</p>

            <!-- Tab Selector -->
            <div class="reset-tabs animate-item delay-2">
              <button
                type="button"
                class="reset-tab-btn"
                [class.active]="resetMethod() === 'email'"
                [disabled]="loadingReset()"
                (click)="setResetMethod('email')"
              >
                <i class="pi pi-envelope" style="margin-right: 6px; font-size: 0.9rem;"></i>
                Email OTP
              </button>
              <button
                type="button"
                class="reset-tab-btn"
                [class.active]="resetMethod() === 'last_password'"
                [disabled]="loadingReset()"
                (click)="setResetMethod('last_password')"
              >
                <i class="pi pi-key" style="margin-right: 6px; font-size: 0.9rem;"></i>
                Last Password
              </button>
            </div>

            <div class="divider" style="margin-top: 14px;"></div>

            <!-- Flow 1: Email OTP -->
            <div *ngIf="resetMethod() === 'email'">
              <!-- Step 1: Request OTP -->
              <div *ngIf="!resetOtpSent()" class="animate-item">
                <form #otpRequestForm="ngForm" (ngSubmit)="sendResetOtp()" autocomplete="off">
                  <div class="input-group">
                    <label for="resetUsernameEmail">Employee Code</label>
                    <div class="input-icon-wrapper">
                      <i class="pi pi-user input-icon"></i>
                      <input
                        id="resetUsernameEmail"
                        pInputText
                        type="text"
                        [ngModel]="resetUsername()"
                        (ngModelChange)="resetUsername.set($event)"
                        name="resetUsername"
                        placeholder="Enter Employee Code"
                        class="w-full custom-input icon-indent"
                        required
                      />
                    </div>
                  </div>

                  <div class="reset-actions-container" style="margin-top: 24px;">
                    <button
                      type="button"
                      class="cancel-btn"
                      [disabled]="loadingReset()"
                      (click)="backToLogin()"
                    >
                      Back to Login
                    </button>
                    <button
                      pButton
                      type="submit"
                      [disabled]="loadingReset() || !resetUsername()"
                      [loading]="loadingReset()"
                      class="login-btn"
                    >
                      Send OTP
                    </button>
                  </div>
                </form>
              </div>

              <!-- Step 2: Verify OTP & Reset Password -->
              <div *ngIf="resetOtpSent()" class="animate-item">
                <form #emailResetForm="ngForm" (ngSubmit)="submitReset()" autocomplete="off">
                  <!-- User information summary -->
                  <div class="step-summary-bar">
                    <span class="summary-text">
                      <i class="pi pi-envelope"></i>
                      OTP sent to: <strong>{{ maskedResetEmail() }}</strong>
                    </span>
                    <a href="javascript:void(0)" (click)="resetOtpSent.set(false)" class="summary-action-btn">
                      <i class="pi pi-pencil"></i> Change Code
                    </a>
                  </div>

                  <!-- Verification Code (OTP) -->
                  <div class="input-group">
                    <label for="resetOtpCode">Verification Code (OTP)</label>
                    <div class="input-icon-wrapper">
                      <i class="pi pi-shield input-icon"></i>
                      <input
                        id="resetOtpCode"
                        pInputText
                        type="text"
                        [ngModel]="resetOtpCode()"
                        (ngModelChange)="resetOtpCode.set($event)"
                        name="resetOtpCode"
                        placeholder="Enter 6-digit OTP"
                        class="w-full custom-input icon-indent"
                        required
                        maxlength="6"
                        pattern="[0-9]{6}"
                      />
                    </div>
                  </div>

                  <!-- New Password -->
                  <div class="input-group" style="margin-top: 10px;">
                    <label for="resetNewPasswordEmail">New Password</label>
                    <div class="input-icon-wrapper">
                      <i class="pi pi-lock input-icon"></i>
                      <p-password
                        inputId="resetNewPasswordEmail"
                        [ngModel]="resetNewPassword()"
                        (ngModelChange)="onResetPasswordChange($event)"
                        name="resetNewPassword"
                        [toggleMask]="true"
                        [feedback]="false"
                        placeholder="Enter New Password"
                        styleClass="w-full"
                        inputStyleClass="w-full custom-input icon-indent"
                        (onFocus)="isNewPasswordFocused.set(true)"
                        (onBlur)="isNewPasswordFocused.set(false)"
                        required
                      >
                      </p-password>
                    </div>
                  </div>

                  <!-- Confirm Password -->
                  <div class="input-group" style="margin-top: 10px;">
                    <label for="resetConfirmPasswordEmail">Confirm Password</label>
                    <div class="input-icon-wrapper">
                      <i class="pi pi-lock input-icon"></i>
                      <p-password
                        inputId="resetConfirmPasswordEmail"
                        [ngModel]="resetConfirmPassword()"
                        (ngModelChange)="onResetConfirmPasswordChange($event)"
                        name="resetConfirmPassword"
                        [toggleMask]="true"
                        [feedback]="false"
                        placeholder="Confirm New Password"
                        styleClass="w-full"
                        inputStyleClass="w-full custom-input icon-indent"
                        required
                      >
                      </p-password>
                    </div>
                  </div>

                  <!-- Password Guidelines -->
                  <div class="policy-guidelines-modern animate-item" *ngIf="isNewPasswordFocused() || (resetNewPassword() && !isResetFormValid())">
                    <h4>Password Requirements:</h4>
                    <div class="guideline-grid">
                      <div class="guideline-badge" [class.valid]="hasMinLength()">
                        <i [class]="hasMinLength() ? 'pi pi-check-circle' : 'pi pi-circle-off'"></i>
                        <span>{{ minLength }}+ Chars</span>
                      </div>
                      <div *ngIf="uppercaseCnt > 0" class="guideline-badge" [class.valid]="hasUppercase()">
                        <i [class]="hasUppercase() ? 'pi pi-check-circle' : 'pi pi-circle-off'"></i>
                        <span>Uppercase</span>
                      </div>
                      <div *ngIf="lowercaseCnt > 0" class="guideline-badge" [class.valid]="hasLowercase()">
                        <i [class]="hasLowercase() ? 'pi pi-check-circle' : 'pi pi-circle-off'"></i>
                        <span>Lowercase</span>
                      </div>
                      <div *ngIf="numCnt > 0" class="guideline-badge" [class.valid]="hasNumbers()">
                        <i [class]="hasNumbers() ? 'pi pi-check-circle' : 'pi pi-circle-off'"></i>
                        <span>Number</span>
                      </div>
                      <div *ngIf="symbolCnt > 0" class="guideline-badge" [class.valid]="hasSymbols()">
                        <i [class]="hasSymbols() ? 'pi pi-check-circle' : 'pi pi-circle-off'"></i>
                        <span>Special Char</span>
                      </div>
                    </div>
                  </div>

                  <!-- Buttons -->
                  <div class="reset-actions-container" style="margin-top: 20px;">
                    <button
                      type="button"
                      class="cancel-btn"
                      [disabled]="loadingReset()"
                      (click)="resetOtpSent.set(false)"
                    >
                      Back
                    </button>
                    <button
                      pButton
                      type="submit"
                      [disabled]="loadingReset() || !isResetFormValid()"
                      [loading]="loadingReset()"
                      class="login-btn"
                    >
                      Reset Password
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <!-- Flow 2: Last Password Base -->
            <div *ngIf="resetMethod() === 'last_password'">
              <form #lastPassForm="ngForm" (ngSubmit)="submitReset()" autocomplete="off">
                <div class="input-group">
                  <label for="resetUsernameLast">Employee Code</label>
                  <div class="input-icon-wrapper">
                    <i class="pi pi-user input-icon"></i>
                    <input
                      id="resetUsernameLast"
                      pInputText
                      type="text"
                      [ngModel]="resetUsername()"
                      (ngModelChange)="resetUsername.set($event)"
                      name="resetUsername"
                      placeholder="Enter Employee Code"
                      class="w-full custom-input icon-indent"
                      required
                    />
                  </div>
                </div>

                <div class="input-group" style="margin-top: 10px;">
                  <label for="resetLastPassword">Last Password</label>
                  <div class="input-icon-wrapper">
                    <i class="pi pi-lock input-icon"></i>
                    <p-password
                      inputId="resetLastPassword"
                      [ngModel]="resetLastPassword()"
                      (ngModelChange)="resetLastPassword.set($event)"
                      name="resetLastPassword"
                      [toggleMask]="true"
                      [feedback]="false"
                      placeholder="Enter Last Password"
                      styleClass="w-full"
                      inputStyleClass="w-full custom-input icon-indent"
                      required
                    >
                    </p-password>
                  </div>
                </div>

                <div class="input-group" style="margin-top: 10px;">
                  <label for="resetNewPasswordLast">New Password</label>
                  <div class="input-icon-wrapper">
                    <i class="pi pi-lock input-icon"></i>
                    <p-password
                      inputId="resetNewPasswordLast"
                      [ngModel]="resetNewPassword()"
                      (ngModelChange)="onResetPasswordChange($event)"
                      name="resetNewPassword"
                      [toggleMask]="true"
                      [feedback]="false"
                      placeholder="Enter New Password"
                      styleClass="w-full"
                      inputStyleClass="w-full custom-input icon-indent"
                      (onFocus)="isNewPasswordFocused.set(true)"
                      (onBlur)="isNewPasswordFocused.set(false)"
                      required
                    >
                    </p-password>
                  </div>
                </div>

                <div class="input-group" style="margin-top: 10px;">
                  <label for="resetConfirmPasswordLast">Confirm Password</label>
                  <div class="input-icon-wrapper">
                    <i class="pi pi-lock input-icon"></i>
                    <p-password
                      inputId="resetConfirmPasswordLast"
                      [ngModel]="resetConfirmPassword()"
                      (ngModelChange)="onResetConfirmPasswordChange($event)"
                      name="resetConfirmPassword"
                      [toggleMask]="true"
                      [feedback]="false"
                      placeholder="Confirm New Password"
                      styleClass="w-full"
                      inputStyleClass="w-full custom-input icon-indent"
                      required
                    >
                    </p-password>
                  </div>
                </div>

                <!-- Password Guidelines -->
                <div class="policy-guidelines-modern animate-item" *ngIf="isNewPasswordFocused() || (resetNewPassword() && !isResetFormValid())">
                  <h4>Password Requirements:</h4>
                  <div class="guideline-grid">
                    <div class="guideline-badge" [class.valid]="hasMinLength()">
                      <i [class]="hasMinLength() ? 'pi pi-check-circle' : 'pi pi-circle-off'"></i>
                      <span>{{ minLength }}+ Chars</span>
                    </div>
                    <div *ngIf="uppercaseCnt > 0" class="guideline-badge" [class.valid]="hasUppercase()">
                      <i [class]="hasUppercase() ? 'pi pi-check-circle' : 'pi pi-circle-off'"></i>
                      <span>Uppercase</span>
                    </div>
                    <div *ngIf="lowercaseCnt > 0" class="guideline-badge" [class.valid]="hasLowercase()">
                      <i [class]="hasLowercase() ? 'pi pi-check-circle' : 'pi pi-circle-off'"></i>
                      <span>Lowercase</span>
                    </div>
                    <div *ngIf="numCnt > 0" class="guideline-badge" [class.valid]="hasNumbers()">
                      <i [class]="hasNumbers() ? 'pi pi-check-circle' : 'pi pi-circle-off'"></i>
                      <span>Number</span>
                    </div>
                    <div *ngIf="symbolCnt > 0" class="guideline-badge" [class.valid]="hasSymbols()">
                      <i [class]="hasSymbols() ? 'pi pi-check-circle' : 'pi pi-circle-off'"></i>
                      <span>Special Char</span>
                    </div>
                  </div>
                </div>

                <div class="reset-actions-container" style="margin-top: 20px;">
                  <button
                    type="button"
                    class="cancel-btn"
                    [disabled]="loadingReset()"
                    (click)="backToLogin()"
                  >
                    Back to Login
                  </button>
                  <button
                    pButton
                    type="submit"
                    [disabled]="loadingReset() || !isResetFormValid()"
                    [loading]="loadingReset()"
                    class="login-btn"
                  >
                    Reset Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./login.component.css']
})
export class ForgotPasswordComponent implements OnInit {
  private authService = inject(AuthService);
  private messageService = inject(MessageService);
  private router = inject(Router);
  private config = inject(APP_CONFIG);
  bankName = this.config.bank_name || 'KREDPOOL SOLUTIONS PVT LTD.';

  showResetScreen = signal(true);
  resetMethod = signal<'email' | 'last_password'>('email');

  resetUsername = signal('');
  resetLastPassword = signal('');
  resetNewPassword = signal('');
  resetConfirmPassword = signal('');
  resetOtpCode = signal('');

  resetOtpSent = signal(false);
  maskedResetEmail = signal('');
  loadingReset = signal(false);
  isNewPasswordFocused = signal(false);

  // Policy rules
  minLength = 8;
  numCnt = 1;
  uppercaseCnt = 1;
  lowercaseCnt = 1;
  symbolCnt = 1;

  // Validation checks
  hasMinLength = signal(false);
  hasUppercase = signal(false);
  hasLowercase = signal(false);
  hasNumbers = signal(false);
  hasSymbols = signal(false);

  isResetFormValid = computed(() => {
    const reqsPassed = this.hasMinLength() &&
      this.hasUppercase() &&
      this.hasLowercase() &&
      this.hasNumbers() &&
      this.hasSymbols() &&
      this.resetNewPassword() === this.resetConfirmPassword() &&
      this.resetNewPassword().trim().length > 0;

    if (this.resetMethod() === 'email') {
      return reqsPassed && this.resetOtpCode().trim().length === 6 && this.resetUsername().trim().length > 0 && this.resetOtpSent();
    } else {
      return reqsPassed && this.resetLastPassword().trim().length > 0 && this.resetUsername().trim().length > 0;
    }
  });

  ngOnInit() {
    this.onResetPasswordChange(this.resetNewPassword());
  }

  setResetMethod(method: 'email' | 'last_password') {
    this.resetMethod.set(method);
    this.resetOtpSent.set(false);
    this.resetOtpCode.set('');
    this.resetLastPassword.set('');
    this.resetNewPassword.set('');
    this.resetConfirmPassword.set('');
    this.onResetPasswordChange('');
  }

  onResetPasswordChange(val: string) {
    const password = val || '';
    this.resetNewPassword.set(password);
    this.hasMinLength.set(password.length >= this.minLength);
    this.hasUppercase.set((password.match(/[A-Z]/g) || []).length >= this.uppercaseCnt);
    this.hasLowercase.set((password.match(/[a-z]/g) || []).length >= this.lowercaseCnt);
    this.hasNumbers.set((password.match(/[0-9]/g) || []).length >= this.numCnt);

    const symbolMatches = password.match(/[!@#$%^&*(),.?":{}|<>_\-+=/\\[\];'`~]/g) || [];
    this.hasSymbols.set(symbolMatches.length >= this.symbolCnt);
  }

  onResetConfirmPasswordChange(val: string) {
    this.resetConfirmPassword.set(val || '');
  }

  sendResetOtp() {
    const username = this.resetUsername().trim();
    if (!username) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Required',
        detail: 'Please enter Employee Code first.'
      });
      return;
    }

    this.loadingReset.set(true);
    this.authService.sendResetPasswordOtp(username).subscribe({
      next: (res: any) => {
        this.loadingReset.set(false);
        this.resetOtpSent.set(true);
        this.maskedResetEmail.set(res.emailMasked);
        this.messageService.add({
          severity: 'info',
          summary: 'OTP Sent',
          detail: `OTP code sent to your registered email: ${res.emailMasked}`
        });
      },
      error: (err) => {
        this.loadingReset.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Failed',
          detail: err?.error?.message || 'Failed to send OTP. Please check employee code.'
        });
      }
    });
  }

  submitReset() {
    if (!this.isResetFormValid()) {
      if (this.resetNewPassword() !== this.resetConfirmPassword()) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Mismatch',
          detail: 'Passwords do not match'
        });
      }
      return;
    }

    this.loadingReset.set(true);
    const username = this.resetUsername().trim();
    const newPassword = this.resetNewPassword();

    if (this.resetMethod() === 'email') {
      const code = this.resetOtpCode().trim();
      this.authService.verifyResetPasswordOtpAndReset({ username, code, newPassword }).subscribe({
        next: () => {
          this.loadingReset.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Password reset successfully. You can now login.'
          });
          setTimeout(() => {
            this.backToLogin();
          }, 1500);
        },
        error: (err) => {
          this.loadingReset.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Reset Failed',
            detail: err?.error?.message || 'Failed to verify OTP or update password'
          });
        }
      });
    } else {
      const lastPassword = this.resetLastPassword().trim();
      this.authService.resetPasswordByLastPassword({ username, lastPassword, newPassword }).subscribe({
        next: () => {
          this.loadingReset.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Password reset successfully. You can now login.'
          });
          setTimeout(() => {
            this.backToLogin();
          }, 1500);
        },
        error: (err) => {
          this.loadingReset.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Reset Failed',
            detail: err?.error?.message || 'Invalid last password or update failed'
          });
        }
      });
    }
  }

  backToLogin() {
    this.router.navigate(['/login']);
  }
}
