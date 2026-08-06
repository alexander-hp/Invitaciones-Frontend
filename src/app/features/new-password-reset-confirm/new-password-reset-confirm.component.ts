import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';

@Component({
  selector: 'app-new-password-reset-confirm',
  templateUrl: './new-password-reset-confirm.component.html',
  styleUrls: ['./new-password-reset-confirm.component.css']
})
export class NewPasswordResetConfirmComponent implements OnInit, OnDestroy {
  form = { token: '', password: '' };
  loading = false;
  success = '';
  error = '';
  showPassword = false;

  testimonials = [
    {
      quote: "Tu contraseña ha sido actualizada con éxito y con los estándares más altos de seguridad.",
      author: "Seguridad de la Cuenta",
      event: "Plataforma Invitaciones.mx"
    },
    {
      quote: "Gestiona confirmaciones (RSVP), mesas y música en un solo panel interactivo.",
      author: "Ortega Eventos",
      event: "Boda de Sofía & Alejandro"
    },
    {
      quote: "La mejor plataforma para controlar accesos y pases digitales con código QR.",
      author: "Mariana Silva, Planner",
      event: "XV Años de Isabella"
    }
  ];
  currentTestimonialIndex = 0;
  private testimonialTimer: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private confirmDialogService: ConfirmDialogService
  ) {}

  ngOnInit(): void {
    this.form.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.form.token) {
      this.error = 'El enlace de recuperación es inválido o no incluye el token de seguridad.';
    }
    this.startTestimonialTimer();
  }

  ngOnDestroy(): void {
    if (this.testimonialTimer) {
      clearInterval(this.testimonialTimer);
    }
  }

  private startTestimonialTimer(): void {
    this.testimonialTimer = setInterval(() => {
      this.nextTestimonial();
    }, 6000);
  }

  setTestimonial(index: number): void {
    this.currentTestimonialIndex = index;
  }

  nextTestimonial(): void {
    this.currentTestimonialIndex = (this.currentTestimonialIndex + 1) % this.testimonials.length;
  }

  prevTestimonial(): void {
    this.currentTestimonialIndex = (this.currentTestimonialIndex - 1 + this.testimonials.length) % this.testimonials.length;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  private formatBackendError(err: any): string {
    if (!err) return 'Ocurrió un error inesperado al actualizar la contraseña.';
    const backend = err.error || err;

    if (typeof backend === 'string') return backend;

    // Standard backend message
    if (backend.message && typeof backend.message === 'string') {
      return backend.message;
    }

    // Zod / API validation errors
    if (backend.fieldErrors && typeof backend.fieldErrors === 'object') {
      const messages: string[] = [];
      for (const field of Object.keys(backend.fieldErrors)) {
        const errorsList = backend.fieldErrors[field];
        if (Array.isArray(errorsList)) {
          for (const msg of errorsList) {
            if (typeof msg === 'string') {
              if (msg.includes('at least 8 character')) {
                messages.push('La contraseña debe tener al menos 8 caracteres.');
              } else if (msg.includes('at least 32 character') || msg.includes('token')) {
                messages.push('El token de seguridad es inválido o expiró.');
              } else {
                messages.push(msg);
              }
            }
          }
        }
      }
      if (messages.length > 0) {
        return messages.join(' ');
      }
    }

    return 'Datos inválidos. Verifica que la contraseña tenga al menos 8 caracteres.';
  }

  submit(): void {
    if (!this.form.token) {
      this.error = 'No se encontró un token válido en la solicitud.';
      return;
    }
    if (!this.form.password || this.form.password.length < 8) {
      this.error = 'La contraseña debe contener al menos 8 caracteres.';
      return;
    }

    this.loading = true;
    this.success = '';
    this.error = '';

    this.api.confirmPasswordReset(this.form).subscribe({
      next: (response) => {
        this.loading = false;
        this.success = response.message || '¡Tu contraseña ha sido actualizada correctamente!';
        
        // Show success confirmation dialog & redirect to login
        this.confirmDialogService.confirm({
          title: '¡Contraseña Actualizada!',
          message: 'Tu contraseña ha sido restablecida con éxito. Haz clic en Iniciar Sesión para acceder a tu cuenta.',
          confirmText: 'Iniciar Sesión',
          hideCancel: true,
          type: 'info',
          icon: '🎉'
        }).then(() => {
          this.router.navigate(['/new/login']);
        });
      },
      error: (err) => {
        this.loading = false;
        this.error = this.formatBackendError(err);
      }
    });
  }
}
