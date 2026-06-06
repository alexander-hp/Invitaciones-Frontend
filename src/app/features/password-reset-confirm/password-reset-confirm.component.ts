import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';

@Component({ selector: 'app-password-reset-confirm', templateUrl: './password-reset-confirm.component.html' })
export class PasswordResetConfirmComponent implements OnInit {
  form = { token: '', password: '' };
  loading = false;
  success = '';
  error = '';

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit(): void {
    this.form.token = this.route.snapshot.queryParamMap.get('token') || '';
  }

  submit(): void {
    this.loading = true;
    this.success = '';
    this.error = '';

    this.api.confirmPasswordReset(this.form).subscribe({
      next: (response) => {
        this.success = response.message;
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo actualizar el password.';
        this.loading = false;
      }
    });
  }
}
