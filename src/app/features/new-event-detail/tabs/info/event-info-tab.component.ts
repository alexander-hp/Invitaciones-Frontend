import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { ApiService } from '../../../../core/api.service';
import { ConfirmDialogService } from '../../../../core/confirm-dialog.service';
import {
  EventModel, DashboardMetrics, InvitationModel, PlanDefinition,
  EventMemberModel, EventPermission, EventMemberRole, EventAccessLinkModel, EventAccessRole
} from '../../../../core/models';

@Component({
  selector: 'app-event-info-tab',
  templateUrl: './event-info-tab.component.html'
})
export class EventInfoTabComponent implements OnInit, OnChanges {
  @Input() event!: EventModel;
  @Input() metrics: Partial<DashboardMetrics> = {};
  @Output() eventUpdated = new EventEmitter<void>();
  @Output() openInvitationWizard = new EventEmitter<void>();

  invitations: InvitationModel[] = [];
  eventMembers: EventMemberModel[] = [];
  eventAccessLinks: EventAccessLinkModel[] = [];
  eventPermissions: EventPermission[] = [];

  plans: PlanDefinition[] = [];
  payments: any[] = [];
  currentPlan?: PlanDefinition;
  eventPlanActive = false;
  eventPlanExpiresAt = '';
  subscriptionActive = false;
  checkoutLoading = '';

  saving = false;
  loadingData = false;
  error = '';
  message = '';

  memberForm = {
    email: '',
    name: '',
    role: 'staff' as EventMemberRole,
    permissions: [] as EventPermission[]
  };

  memberRoles: Array<{ value: EventMemberRole; label: string }> = [
    { value: 'owner', label: 'Propietario / Dueño' },
    { value: 'organizer', label: 'Organizador / Wedding Planner' },
    { value: 'client', label: 'Cliente / Anfitrión' },
    { value: 'venue_owner', label: 'Salón / Lugar del Evento' },
    { value: 'vendor', label: 'Proveedor' },
    { value: 'staff', label: 'Staff / Recepción' },
    { value: 'dj', label: 'DJ / Sonido' },
    { value: 'photographer', label: 'Fotógrafo' }
  ];

  rolePermissions: Record<string, EventPermission[]> = {};

  collapsedCards: Record<string, boolean> = {
    details: false,
    plans: false,
    invitations: false,
    team: false,
    external: false
  };

  collapsedTeamInvite = false;
  collapsedTeamList = false;

  editingMemberId: string | null = null;

  showSuccess(text: string): void {
    this.message = text;
    setTimeout(() => { this.message = ''; }, 3500);
  }

  showError(text: string): void {
    this.error = text;
    setTimeout(() => { this.error = ''; }, 4000);
  }

  toggleCard(cardKey: string): void {
    this.collapsedCards[cardKey] = !this.collapsedCards[cardKey];
  }

  toggleTeamInvite(): void {
    this.collapsedTeamInvite = !this.collapsedTeamInvite;
  }

  toggleTeamList(): void {
    this.collapsedTeamList = !this.collapsedTeamList;
  }

  accessLinkForm = {
    role: 'check_in' as EventAccessRole,
    label: '',
    days: 7
  };

  constructor(
    private apiService: ApiService,
    private confirmDialogService: ConfirmDialogService
  ) {}

  ngOnInit(): void {
    if (this.event && (this.event._id || this.event.id)) {
      this.loadTabData();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['event'] && !changes['event'].firstChange && (this.event?._id || this.event?.id)) {
      this.loadTabData();
    }
  }

  loadTabData(): void {
    const id = (this.event._id || this.event.id)!;
    this.loadingData = true;

    if (this.isOwner()) this.apiService.listInvitations().subscribe({
      next: res => {
        this.invitations = (res.invitations || []).filter(i => {
          const invEvId = typeof i.event === 'string' ? i.event : (i.event?._id || i.event?.id);
          return invEvId === id;
        });
      },
      error: () => {}
    });

    if (this.isOwner()) this.apiService.listEventMembers(id).subscribe({
      next: res => {
        this.eventMembers = res.members || [];
        this.eventPermissions = res.permissions || [];
        this.rolePermissions = res.rolePermissions || {};
        if (!this.memberForm.permissions.length && this.rolePermissions['staff']) {
          this.memberForm.permissions = [...this.rolePermissions['staff']];
        }
      },
      error: () => {}
    });

    if (this.isOwner()) this.apiService.listEventAccessLinks(id).subscribe({
      next: res => { this.eventAccessLinks = res.links || []; },
      error: () => {}
    });

    this.apiService.getPaymentStatus(id).subscribe({
      next: res => {
        this.currentPlan = res.eventPlanDefinition || res.planDefinition;
        this.eventPlanActive = res.eventPlanActive || false;
        this.eventPlanExpiresAt = res.eventPlanExpiresAt || '';
        this.subscriptionActive = res.subscriptionActive || false;
        this.payments = res.payments || [];
      },
      error: () => {}
    });

    this.apiService.listPlans().subscribe({
      next: res => { this.plans = res.plans || []; },
      error: () => {}
    });
  }

  get confirmedCount(): number { return Number(this.metrics.confirmed || 0); }
  get pendingCount(): number { return Number(this.metrics.pending || 0); }
  get declinedCount(): number { return Number(this.metrics.declined || 0); }
  get checkedInCount(): number { return Number(this.metrics.checkedIn || 0); }
  get totalSeats(): number { return Number(this.metrics.guests || 0); }
  get premiumActive(): boolean { return this.eventPlanActive || this.subscriptionActive; }
  isOwner(): boolean { return this.event?.access?.owner === true; }

  eventTypeIcon(type: string): string {
    switch (type) {
      case 'boda': return '💍';
      case 'xv': return '👑';
      case 'cumpleanos': return '🎂';
      case 'bautizo': return '🕊️';
      case 'baby_shower': return '🍼';
      case 'graduacion': return '🎓';
      case 'corporativo': return '🏢';
      default: return '🎉';
    }
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  formatShortDate(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  changeStatus(newStatus: string): void {
    const id = (this.event._id || this.event.id)!;
    if (!this.event || this.event.status === newStatus) return;
    this.saving = true;
    this.apiService.updateEvent(id, { status: newStatus as any }).subscribe({
      next: res => {
        this.event.status = res.event.status;
        this.saving = false;
        this.showSuccess('Estado del evento actualizado');
        this.eventUpdated.emit();
      },
      error: err => {
        this.showError(err?.error?.message || 'Error al cambiar estado');
        this.saving = false;
      }
    });
  }

  createInvitation(): void {
    this.openInvitationWizard.emit();
  }

  deleteInvitation(inv: InvitationModel): void {
    const invId = inv._id || inv.id;
    if (!invId) return;
    this.confirmDialogService.confirm({
      title: 'Eliminar Invitación',
      message: `¿Estás seguro de eliminar "${inv.content?.headline || inv.slug}"?`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    }).then(confirmed => {
      if (!confirmed) return;
      this.saving = true;
      this.apiService.deleteInvitation(invId).subscribe({
        next: () => {
          this.invitations = this.invitations.filter(i => (i._id || i.id) !== invId);
          this.saving = false;
          this.showSuccess('Invitación eliminada correctamente');
        },
        error: err => {
          this.showError(err?.error?.message || 'Error al borrar invitación');
          this.saving = false;
        }
      });
    });
  }

  getPlanPrice(key: string): string {
    const p = this.plans.find(x => x.key === key);
    return p ? `$${p.amount}` : '';
  }

  hasPendingPayment(planCode: string): boolean {
    if (this.premiumActive) return false;
    const id = (this.event._id || this.event.id)!;
    return this.payments.some(p => {
      if (p.package !== planCode || p.status !== 'pending') return false;
      const paymentEvent = typeof p.event === 'string' ? p.event : (p.event?._id || p.event?.id);
      return paymentEvent === id || (String(planCode).startsWith('planner_pro') && !paymentEvent);
    });
  }

  checkoutPlan(planCode: string): void {
    const id = (this.event._id || this.event.id)!;
    this.checkoutLoading = planCode;
    this.apiService.createCheckout({ package: planCode as any, event: id }).subscribe({
      next: res => {
        this.checkoutLoading = '';
        if (res.checkoutUrl) {
          window.location.href = res.checkoutUrl;
        }
      },
      error: err => {
        this.checkoutLoading = '';
        this.showError(err?.error?.message || 'Error al iniciar checkout');
      }
    });
  }

  onMemberRoleChange(): void {
    if (this.rolePermissions[this.memberForm.role]) {
      this.memberForm.permissions = [...this.rolePermissions[this.memberForm.role]];
    }
  }

  permissionLabel(perm: EventPermission): string {
    switch (perm) {
      case 'view_event': return 'Ver evento';
      case 'edit_event': return 'Editar evento';
      case 'view_metrics': return 'Ver métricas';
      case 'manage_guests': return 'Invitados';
      case 'manage_tables': return 'Mesas';
      case 'check_in': return 'Check-In';
      case 'review_album': return 'Álbum';
      case 'review_dedications': return 'Dedicatorias';
      case 'manage_songs': return 'DJ';
      case 'view_payments': return 'Pagos';
      default: return perm;
    }
  }

  memberRoleLabel(role: EventMemberRole): string {
    const found = this.memberRoles.find(r => r.value === role);
    return found ? found.label : role;
  }

  toggleMemberPermission(perm: EventPermission, checked: boolean): void {
    if (checked) {
      if (!this.memberForm.permissions.includes(perm)) {
        this.memberForm.permissions.push(perm);
      }
    } else {
      this.memberForm.permissions = this.memberForm.permissions.filter(p => p !== perm);
    }
  }

  createMember(): void {
    const id = (this.event._id || this.event.id)!;
    if (!this.memberForm.email.trim()) return;
    this.apiService.createEventMember(id, {
      email: this.memberForm.email.trim(),
      name: this.memberForm.name.trim() || undefined,
      role: this.memberForm.role,
      permissions: this.memberForm.permissions
    }).subscribe({
      next: res => {
        this.eventMembers.push(res.member);
        this.memberForm.email = '';
        this.memberForm.name = '';
        this.showSuccess('Miembro invitado al equipo correctamente');
      },
      error: err => {
        this.showError(err?.error?.message || 'Error al agregar miembro');
      }
    });
  }

  toggleEditPermissions(member: EventMemberModel): void {
    const mId = (member._id || member.id)!;
    if (this.editingMemberId === mId) {
      this.editingMemberId = null;
    } else {
      this.editingMemberId = mId;
    }
  }

  hasMemberPermission(member: EventMemberModel, perm: EventPermission): boolean {
    return Array.isArray(member.permissions) && member.permissions.includes(perm);
  }

  toggleExistingMemberPermission(member: EventMemberModel, perm: EventPermission, checked: boolean): void {
    if (!member.permissions) {
      member.permissions = [];
    }
    if (checked) {
      if (!member.permissions.includes(perm)) {
        member.permissions.push(perm);
      }
    } else {
      member.permissions = member.permissions.filter(p => p !== perm);
    }

    const id = (this.event._id || this.event.id)!;
    const mId = (member._id || member.id)!;
    this.apiService.updateEventMember(id, mId, { permissions: member.permissions }).subscribe({
      next: res => {
        member.permissions = res.member.permissions;
        this.showSuccess('Permisos actualizados');
      },
      error: err => {
        this.showError(err?.error?.message || 'Error al actualizar permisos');
      }
    });
  }

  updateMemberRole(member: EventMemberModel, newRole: EventMemberRole): void {
    const id = (this.event._id || this.event.id)!;
    const mId = (member._id || member.id)!;
    this.apiService.updateEventMember(id, mId, { role: newRole }).subscribe({
      next: res => {
        member.role = res.member.role;
        member.permissions = res.member.permissions;
        this.showSuccess('Rol actualizado correctamente');
      },
      error: err => {
        this.showError(err?.error?.message || 'Error al actualizar rol');
      }
    });
  }

  disableMember(member: EventMemberModel): void {
    const id = (this.event._id || this.event.id)!;
    const mId = (member._id || member.id)!;
    this.confirmDialogService.confirm({
      title: 'Desactivar Miembro',
      message: `¿Desactivar el acceso de ${member.name || member.email}?`,
      confirmText: 'Sí, desactivar',
      cancelText: 'Cancelar',
      type: 'danger'
    }).then(confirmed => {
      if (!confirmed) return;
      this.apiService.removeEventMember(id, mId).subscribe({
        next: () => {
          member.status = 'disabled';
          this.showSuccess('Miembro desactivado correctamente');
        },
        error: err => {
          this.showError(err?.error?.message || 'Error al desactivar miembro');
        }
      });
    });
  }

  createAccessLink(): void {
    const id = (this.event._id || this.event.id)!;
    this.apiService.createEventAccessLink(id, {
      role: this.accessLinkForm.role,
      label: this.accessLinkForm.label || undefined,
      days: this.accessLinkForm.days
    }).subscribe({
      next: res => {
        this.eventAccessLinks.unshift(res.link);
        this.accessLinkForm.label = '';
        this.showSuccess('Enlace de acceso externo creado');
      },
      error: err => {
        this.showError(err?.error?.message || 'Error al generar enlace');
      }
    });
  }

  revokeAccessLink(link: EventAccessLinkModel): void {
    const id = (this.event._id || this.event.id)!;
    const lId = (link._id || link.id)!;
    this.apiService.revokeEventAccessLink(id, lId).subscribe({
      next: () => {
        link.revokedAt = new Date().toISOString();
        this.showSuccess('Enlace revocado correctamente');
      },
      error: err => {
        this.showError(err?.error?.message || 'Error al revocar enlace');
      }
    });
  }

  getNewAccessUrl(link: EventAccessLinkModel): string {
    if (!link) return '';
    let url = link.url || `/new/external-access/${link._id || link.id}`;
    if (url.includes('/external-access/') && !url.includes('/new/external-access/')) {
      url = url.replace('/external-access/', '/new/external-access/');
    }
    return url;
  }

  copyAccessToken(link: EventAccessLinkModel): void {
    if (!link.accessToken) return;
    navigator.clipboard.writeText(link.accessToken).then(() => {
      this.showSuccess('Token de integracion copiado.');
    }).catch(() => {
      this.showError('No se pudo copiar el token.');
    });
  }
}
