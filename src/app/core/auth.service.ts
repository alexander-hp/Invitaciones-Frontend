import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { AuthResponse, SocialLoginPayload, User } from './models';

const TOKEN_KEY = 'invitaciones_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userSubject = new BehaviorSubject<User | null>(null);
  readonly user$ = this.userSubject.asObservable();

  constructor(private api: ApiService, private router: Router) {}

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  get currentUser(): User | null {
    return this.userSubject.value;
  }

  get isAuthenticated(): boolean {
    return Boolean(this.token);
  }

  login(payload: { email: string; password: string }): Observable<AuthResponse> {
    return this.api.login(payload).pipe(tap((response) => this.saveSession(response)));
  }

  register(payload: { name: string; email: string; password: string; role?: User['role']; accountType?: User['accountType'] }): Observable<AuthResponse> {
    return this.api.register(payload).pipe(tap((response) => this.saveSession(response)));
  }

  socialLogin(payload: SocialLoginPayload): Observable<AuthResponse> {
    return this.api.socialLogin(payload).pipe(tap((response) => this.saveSession(response)));
  }

  loadCurrentUser(): void {
    if (!this.token) return;
    this.api.me().subscribe({
      next: ({ user }) => this.userSubject.next(user),
      error: () => this.logout(false)
    });
  }

  logout(redirect = true): void {
    localStorage.removeItem(TOKEN_KEY);
    this.userSubject.next(null);
    if (redirect) this.router.navigate(['/login']);
  }

  private saveSession(response: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, response.token);
    this.userSubject.next(response.user);
  }
}
