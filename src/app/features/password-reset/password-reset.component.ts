import { Component } from '@angular/core';
import { ApiService } from '../../core/api.service';

@Component({ selector: 'app-password-reset', templateUrl: './password-reset.component.html' })
export class PasswordResetComponent {
  form = { email: '' };
  loading = false;
  success = '';
  error = '';

  constructor(private api: ApiService) {}

  submit(): void {
    this.loading = true;
    this.success = '';
    this.error = '';

    this.api.requestPasswordReset(this.form).subscribe({
      next: (response) => {
        this.success = response.message;
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo solicitar la recuperacion.';
        this.loading = false;
      }
    });
  }
}
