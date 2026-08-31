import { Component, OnInit, OnDestroy } from '@angular/core';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-new-password-reset',
  templateUrl: './new-password-reset.component.html',
  styleUrls: ['./new-password-reset.component.css']
})
export class NewPasswordResetComponent implements OnInit, OnDestroy {
  form = { email: '' };
  loading = false;
  success = '';
  error = '';

  testimonials = [
    {
      quote: "Recuperar el acceso a tu cuenta es rápido y seguro para mantener tu evento siempre al día.",
      author: "Atención y Seguridad",
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

  constructor(private api: ApiService) {}

  ngOnInit(): void {
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

  submit(): void {
    if (!this.form.email) return;
    this.loading = true;
    this.success = '';
    this.error = '';

    this.api.requestPasswordReset(this.form).subscribe({
      next: (response) => {
        this.success = response.message || 'Se ha enviado un enlace de restauración a tu correo electrónico.';
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo solicitar la recuperación de contraseña.';
        this.loading = false;
      }
    });
  }
}
