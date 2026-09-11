import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { APP_CONFIG } from '../config/config.token';

export interface User {
  id: string;
  username: string;
  full_name?: string;
  fullName?: string;
  name?: string;
  role?: string;
  designation?: string;
  branch_id?: string | number | null;
  branchId?: string | number | null;
  branch_name?: string;
  branchName?: string;
  roleId?: string | null;
  user_type_id?: string | number | null;
  managed_branch_ids?: number[];
  managedBranchIds?: number[];
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private config = inject(APP_CONFIG);
  private apiUrl = `${this.config.apiUrl}/auth`;

  /** Signal to track login status reactively */
  isLoggedIn = signal<boolean>(this.checkToken());

  /** Signal to store current user details */
  currentUser = signal<User | null>(this.getUserFromStorage());

  constructor() {}

  login(credentials: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => {
        if (res && !res.requires2fa) {
          localStorage.setItem('token', res.access_token);
          const user = this.normalizeUser(res.user);
          localStorage.setItem('user', JSON.stringify(user));
          this.isLoggedIn.set(true);
          this.currentUser.set(user);
        }
      })
    );
  }

  verify2fa(username: string, code: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/verify-2fa`, { username, code }).pipe(
      tap(res => {
        localStorage.setItem('token', res.access_token);
        const user = this.normalizeUser(res.user);
        localStorage.setItem('user', JSON.stringify(user));
        this.isLoggedIn.set(true);
        this.currentUser.set(user);
      })
    );
  }

  logout(): void {
    const user = this.currentUser();
    if (user && user.id) {
      this.http.post(`${this.apiUrl}/logout`, { employee_id: Number(user.id) }).subscribe({
        next: () => this.clearSessionAndRedirect(),
        error: () => this.clearSessionAndRedirect()
      });
    } else {
      this.clearSessionAndRedirect();
    }
  }

  private clearSessionAndRedirect(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.isLoggedIn.set(false);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  private checkToken(): boolean {
    return !!localStorage.getItem('token');
  }

  private getUserFromStorage(): User | null {
    const userJson = localStorage.getItem('user');
    if (!userJson) return null;
    try {
      return this.normalizeUser(JSON.parse(userJson));
    } catch (e) {
      console.warn('Failed to parse user from localStorage:', e);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      return null;
    }
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  private normalizeUser(user: any): User | null {
    if (!user) return null;
    return {
      ...user,
      full_name: user.full_name ?? user.fullName ?? user.name ?? '',
      fullName: user.fullName ?? user.full_name ?? user.name ?? '',
      name: user.name ?? user.full_name ?? user.fullName ?? '',
      role: user.role ?? user.designation ?? '',
      designation: user.designation ?? user.role ?? '',
      branch_id: user.branch_id ?? user.branchId ?? null,
      branchId: user.branchId ?? user.branch_id ?? null,
      branch_name: user.branch_name ?? user.branchName ?? '',
      branchName: user.branchName ?? user.branch_name ?? '',
      managed_branch_ids: user.managed_branch_ids ?? user.managedBranchIds ?? [],
      managedBranchIds: user.managed_branch_ids ?? user.managedBranchIds ?? []
    } as User;
  }
}
