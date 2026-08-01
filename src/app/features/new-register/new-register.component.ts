import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { AccountType, UserRole } from '../../core/models';

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
    accountType: 'organizer' as AccountType,
    role: 'organizer' as UserRole
  };
  loading = false;
  error = '';
  showPassword = false;

  accountTypes: Array<{ value: AccountType; label: string; role: UserRole }> = [
    { value: 'client', label: 'Cliente / anfitrión', role: 'client' },
    { value: 'organizer', label: 'Organizador de eventos', role: 'organizer' },
    { value: 'planner', label: 'Planner profesional', role: 'organizer' },
    { value: 'venue_owner', label: 'Dueño de salón / venue', role: 'venue_owner' },
    { value: 'vendor', label: 'Proveedor', role: 'vendor' },
    { value: 'staff', label: 'Staff operativo', role: 'vendor' }
  ];

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
    const selected = this.accountTypes.find((item) => item.value === this.form.accountType);
    this.form.role = selected?.role || 'client';
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

  setRole(role: any): void {
    this.form.role = role;
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
    const selected = this.accountTypes.find((item) => item.value === this.form.accountType);
    const role = selected?.role || 'client';
    const accountType = this.form.accountType || 'client';

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
      accountType,
      role: role as Exclude<UserRole, 'admin'>
    }).subscribe({
      next: () => this.router.navigate(['/new/dashboard']),
      error: (error) => {
        this.error = error.error?.message || `No se pudo registrar con ${provider}.`;
        this.loading = false;
      }
    });
  }
}
