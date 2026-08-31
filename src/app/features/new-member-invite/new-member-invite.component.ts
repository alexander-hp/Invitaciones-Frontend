import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { AccountType, EventMemberRole, EventPermission, UserRole } from '../../core/models';

interface MemberInviteView {
  email: string;
  name?: string;
  role: EventMemberRole;
  permissions: EventPermission[];
  status: string;
  acceptedAt?: string;
  hasAccount: boolean;
  event?: { id: string; title: string; date?: string };
}

@Component({
  selector: 'app-new-member-invite',
  templateUrl: './new-member-invite.component.html',
  styleUrls: ['./new-member-invite.component.css']
})
export class NewMemberInviteComponent implements OnInit {
  token = '';
  invite?: MemberInviteView;
  mode: 'login' | 'register' = 'login';
  loading = true;
  submitting = false;
  error = '';
  success = '';
  showPassword = false;

  loginForm = { email: '', password: '' };
  registerForm = {
    name: '',
    email: '',
    password: '',
    accountType: 'client' as AccountType,
    role: 'client' as UserRole
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (!this.token) {
      this.error = 'Link de invitacion invalido.';
      this.loading = false;
      return;
    }
    this.loadInvite();
  }

  loadInvite(): void {
    this.loading = true;
    this.error = '';
    this.api.getEventMemberInvite(this.token).subscribe({
      next: ({ invite }) => {
        this.invite = invite;
        this.mode = invite.hasAccount ? 'login' : 'register';
        this.loginForm.email = invite.email;
        this.registerForm.email = invite.email;
        this.registerForm.name = invite.name || '';
        this.loading = false;
      },
      error: (error) => {
        this.error = error?.error?.message || 'No se pudo cargar la invitacion.';
        this.loading = false;
      }
    });
  }

  submitLogin(): void {
    if (!this.loginForm.password || !this.invite) return;
    this.submitting = true;
    this.error = '';
    this.auth.login(this.loginForm).subscribe({
      next: () => this.acceptInvite(),
      error: (error) => {
        this.error = error?.error?.message || 'No se pudo iniciar sesion.';
        this.submitting = false;
      }
    });
  }

  submitRegister(): void {
    if (!this.registerForm.name.trim() || !this.registerForm.password || !this.invite) return;
    this.submitting = true;
    this.error = '';
    this.auth.register({
      name: this.registerForm.name.trim(),
      email: this.registerForm.email,
      password: this.registerForm.password,
      role: this.registerForm.role,
      accountType: this.registerForm.accountType
    }).subscribe({
      next: () => this.acceptInvite(),
      error: (error) => {
        this.error = error?.error?.message || 'No se pudo crear la cuenta.';
        this.submitting = false;
      }
    });
  }

  acceptInvite(): void {
    this.api.acceptEventMemberInvite(this.token).subscribe({
      next: ({ eventId }) => {
        this.success = 'Acceso activado correctamente.';
        this.submitting = false;
        this.router.navigate(['/new/events', eventId]);
      },
      error: (error) => {
        this.error = error?.error?.message || 'No se pudo aceptar la invitacion.';
        this.submitting = false;
      }
    });
  }

  roleLabel(role?: EventMemberRole): string {
    return {
      owner: 'Dueno',
      organizer: 'Organizador',
      client: 'Cliente',
      venue_owner: 'Dueno de salon / venue',
      vendor: 'Proveedor',
      staff: 'Staff / recepcion',
      dj: 'DJ',
      photographer: 'Fotografo'
    }[role || 'client'] || 'Colaborador';
  }
}
