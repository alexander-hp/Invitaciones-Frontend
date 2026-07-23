import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-new-register',
  templateUrl: './new-register.component.html',
  styleUrls: ['./new-register.component.css']
})
export class NewRegisterComponent implements OnInit, OnDestroy {
  form = {
    name: 'Demo Organizador',
    email: 'demo@invitaciones.mx',
    password: 'Password123',
    role: 'client' as 'client' | 'organizer'
  };
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
    this.auth.register(this.form).subscribe({
      next: () => this.router.navigate(['/new/dashboard']),
      error: (error) => {
        this.error = error.error?.message || 'No se pudo crear la cuenta. Verifica tus datos.';
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

  setRole(role: 'client' | 'organizer'): void {
    this.form.role = role;
  }

  // Métodos mock para los botones de inicio de sesión social
  socialLogin(provider: string): void {
    console.log(`Social signup initiated with ${provider}`);
    this.error = `El registro con ${provider} está en modo de demostración.`;
  }
}
