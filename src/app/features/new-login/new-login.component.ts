import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { GoogleAuthService } from '../../core/google-auth.service';
import { LandingDraftService } from '../../core/landing-draft.service';

@Component({
  selector: 'app-new-login',
  templateUrl: './new-login.component.html',
  styleUrls: ['./new-login.component.css']
})
export class NewLoginComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('googleBtnContainer') googleBtnContainer?: ElementRef<HTMLDivElement>;
  private sub?: Subscription;

  form = { email: 'demo@invitaciones.mx', password: 'Password123' };
  loading = false;
  error = '';
  showPassword = false;
  hasPendingDraft = false;
  draftSummary = '';
  draftEventTitle = '';
  creatingEventFromDraft = false;

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

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private googleAuth: GoogleAuthService,
    private landingDraft: LandingDraftService
  ) {}

  ngOnInit(): void {
    const intentSave = this.route.snapshot.queryParamMap.get('intent') === 'save-draft';
    if (this.landingDraft.hasPendingSave() || (intentSave && this.landingDraft.hasDraft())) {
      this.hasPendingDraft = true;
      this.draftSummary = this.landingDraft.getDraftSummaryLabel();
      this.draftEventTitle = this.landingDraft.getDraft()?.event?.title || '';
    }

    // Rotar testimonios automáticamente cada 5 segundos
    this.carouselInterval = setInterval(() => {
      this.nextTestimonial();
    }, 5000);

    this.sub = this.googleAuth.credential$.subscribe((idToken) => {
      this.handleGoogleSignIn(idToken);
    });
  }

  ngAfterViewInit(): void {
    if (this.googleBtnContainer?.nativeElement) {
      this.googleAuth.renderHiddenButton(this.googleBtnContainer.nativeElement);
    }
  }

  ngOnDestroy(): void {
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
    }
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  private finalizeAuthNavigation(): void {
    if (this.hasPendingDraft || this.landingDraft.hasPendingSave()) {
      this.creatingEventFromDraft = true;
      this.loading = true;
      this.landingDraft.materializeDraftToAccount().subscribe({
        next: ({ redirectCommands }) => {
          this.creatingEventFromDraft = false;
          this.router.navigate(redirectCommands);
        },
        error: (err) => {
          this.creatingEventFromDraft = false;
          this.loading = false;
          this.error = err?.error?.message || 'Tu sesión inició, pero hubo un detalle al guardar el borrador. Intenta de nuevo.';
        }
      });
      return;
    }
    this.router.navigate(['/new/dashboard']);
  }

  handleGoogleSignIn(idToken: string): void {
    this.loading = true;
    this.error = '';
    this.auth.socialLogin({
      provider: 'google',
      idToken,
      accountType: 'client',
      role: 'client'
    }).subscribe({
      next: () => this.finalizeAuthNavigation(),
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Error al autenticar con Google.';
      }
    });
  }

  submit(): void {
    this.loading = true;
    this.error = '';
    this.auth.login(this.form).subscribe({
      next: () => this.finalizeAuthNavigation(),
      error: (error) => {
        if (error.status === 0) {
          this.error = `No se pudo conectar al servidor backend en ${this.auth.apiUrl}. Revisa que tu PC y celular estén en la misma red y que el Firewall permita el puerto 4000.`;
        } else {
          this.error = error.error?.message || 'No se pudo iniciar sesión. Verifica tus credenciales.';
        }
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
    if (provider === 'Google') {
      if (!this.googleAuth.isConfigured()) {
        this.error = 'Inicio con Google pendiente de configuración. Se requiere configurar GOOGLE_CLIENT_ID en environment.';
        return;
      }
      this.googleAuth.prompt();
      return;
    }
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
      next: () => this.finalizeAuthNavigation(),
      error: (error) => {
        this.error = error.error?.message || `No se pudo iniciar con ${provider}.`;
        this.loading = false;
      }
    });
  }
}
