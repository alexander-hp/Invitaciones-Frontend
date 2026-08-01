import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-new-login',
  templateUrl: './new-login.component.html',
  styleUrls: ['./new-login.component.css']
})
export class NewLoginComponent implements OnInit, OnDestroy {
  form = { email: 'demo@invitaciones.mx', password: 'Password123' };
  loading = false;
  error = '';
  showPassword = false;

  testimonials = [
    {
      quote: "Gestiona confirmaciones (RSVP), mesas y música en un solo panel interactivo.",
      author: "Ortega Eventos",
      event: "Boda de Sofía & Alejandro"
    },
    {
      quote: "La mejor plataforma para controlar accesos y pases digitales con código QR.",
      author: "Mariana Silva, Planner",
      event: "XV Años de Isabella"
    },
    {
      quote: "Invitaciones interactivas premium que enamoran a los invitados desde el primer clic.",
      author: "Luxury Planners",
      event: "Graduación Tec de Monterrey"
    }
  ];
  currentTestimonialIndex = 0;
  private carouselInterval: any;

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    // Rotar testimonios automáticamente cada 5 segundos
    this.carouselInterval = setInterval(() => {
      this.nextTestimonial();
    }, 5000);
  }

  ngOnDestroy(): void {
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
    }
  }

  submit(): void {
    this.loading = true;
    this.error = '';
    this.auth.login(this.form).subscribe({
      next: () => this.router.navigate(['/new/dashboard']),
      error: (error) => {
        this.error = error.error?.message || 'No se pudo iniciar sesión. Verifica tus credenciales.';
        this.loading = false;
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  nextTestimonial(): void {
    this.currentTestimonialIndex = (this.currentTestimonialIndex + 1) % this.testimonials.length;
  }

  prevTestimonial(): void {
    this.currentTestimonialIndex = 
      (this.currentTestimonialIndex - 1 + this.testimonials.length) % this.testimonials.length;
  }

  setTestimonial(index: number): void {
    this.currentTestimonialIndex = index;
  }

  showSocialModal = false;
  socialProvider = '';
  socialForm = { email: '', name: '' };

  socialLogin(provider: string): void {
    this.socialProvider = provider;
    this.socialForm = {
      email: `demo.${provider.toLowerCase()}@invitaciones.mx`,
      name: `Usuario ${provider}`
    };
    this.showSocialModal = true;
  }

  closeSocialModal(): void {
    this.showSocialModal = false;
  }

  confirmSocialLogin(): void {
    if (!this.socialForm.email) return;
    const email = this.socialForm.email.trim();
    const name = this.socialForm.name.trim() || email;
    const provider = this.socialProvider;
    this.showSocialModal = false;
    this.loading = true;
    this.error = '';
    this.auth.socialLogin({
      provider: provider.toLowerCase() as any,
      profile: {
        email,
        name,
        providerUserId: `${provider.toLowerCase()}:${email}`
      },
      accountType: 'client',
      role: 'client'
    }).subscribe({
      next: () => this.router.navigate(['/new/dashboard']),
      error: (error) => {
        this.error = error.error?.message || `No se pudo iniciar con ${provider}.`;
        this.loading = false;
      }
    });
  }
}
