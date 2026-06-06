import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({ selector: 'app-login', templateUrl: './login.component.html' })
export class LoginComponent {
  form = { email: 'demo@invitaciones.mx', password: 'Password123' };
  loading = false;
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

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
}
