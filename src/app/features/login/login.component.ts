import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { AuthProvider } from '../../core/models';

@Component({ selector: 'app-login', templateUrl: './login.component.html' })
export class LoginComponent {
  form = { email: 'qqq@invitaciones.mx', password: 'Password123' };
  loading = false;
  socialLoading: AuthProvider | '' = '';
  error = '';

  constructor(private auth: AuthService, private router: Router) { }

  submit(): void {
    this.loading = true;
    this.error = '';
    this.auth.login(this.form).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (error) => {
        this.error = error.error?.message || 'No se pudo iniciar sesion.';
        this.loading = false;
      }
    });
  }

  socialLogin(provider: Exclude<AuthProvider, 'password'>): void {
    const email = prompt(`Email de ${provider} para prueba/dev`);
    if (!email) return;
    const name = prompt('Nombre publico de la cuenta') || email;
    this.socialLoading = provider;
    this.error = '';
    this.auth.socialLogin({
      provider,
      profile: {
        email,
        name,
        providerUserId: `${provider}:${email}`
      },
      accountType: 'client',
      role: 'client'
    }).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (error) => {
        this.error = error.error?.message || `No se pudo iniciar con ${provider}.`;
        this.socialLoading = '';
      }
    });
  }
}
