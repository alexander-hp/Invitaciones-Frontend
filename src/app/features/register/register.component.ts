import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { AccountType, UserRole } from '../../core/models';

@Component({ selector: 'app-register', templateUrl: './register.component.html' })
export class RegisterComponent {
  form = { name: 'Demo Organizador', email: 'demo@invitaciones.mx', password: 'Password123', accountType: 'organizer' as AccountType, role: 'organizer' as UserRole };
  loading = false;
  error = '';

  accountTypes: Array<{ value: AccountType; label: string; role: UserRole }> = [
    { value: 'client', label: 'Cliente / anfitrión', role: 'client' },
    { value: 'organizer', label: 'Organizador de eventos', role: 'organizer' },
    { value: 'planner', label: 'Planner profesional', role: 'organizer' },
    { value: 'venue_owner', label: 'Dueño de salón / venue', role: 'venue_owner' },
    { value: 'vendor', label: 'Proveedor', role: 'vendor' },
    { value: 'staff', label: 'Staff operativo', role: 'vendor' }
  ];

  constructor(private auth: AuthService, private router: Router) {}

  submit(): void {
    this.loading = true;
    this.error = '';
    const selected = this.accountTypes.find((item) => item.value === this.form.accountType);
    this.form.role = selected?.role || 'client';
    this.auth.register(this.form).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (error) => {
        this.error = error.error?.message || 'No se pudo crear la cuenta.';
        this.loading = false;
      }
    });
  }
}
