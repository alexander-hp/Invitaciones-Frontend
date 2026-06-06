import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({ selector: 'app-register', templateUrl: './register.component.html' })
export class RegisterComponent {
  form = { name: 'Demo Organizador', email: 'demo@invitaciones.mx', password: 'Password123', role: 'client' as 'client' | 'organizer' };
  loading = false;
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  submit(): void {
    this.loading = true;
    this.error = '';
    this.auth.register(this.form).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (error) => {
        this.error = error.error?.message || 'No se pudo crear la cuenta.';
        this.loading = false;
      }
    });
  }
}
