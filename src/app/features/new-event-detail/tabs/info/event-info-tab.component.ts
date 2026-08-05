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

  memberForm = {
    email: '',
    name: '',
    role: 'staff' as EventMemberRole,
    permissions: [] as EventPermission[]
  };

  memberRoles: Array<{ value: EventMemberRole; label: string }> = [
    { value: 'organizer', label: 'Organizador' },
    { value: 'client', label: 'Cliente' },
    { value: 'staff', label: 'Staff' },
    { value: 'vendor', label: 'Proveedor' },
    { value: 'dj', label: 'DJ' },
    { value: 'photographer', label: 'Fotógrafo' }
  ];

  rolePermissions: Record<string, EventPermission[]> = {};

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

    this.apiService.listInvitations().subscribe({
      next: res => {
        this.invitations = (res.invitations || []).filter(i => {
          const invEvId = typeof i.event === 'string' ? i.event : (i.event?._id || i.event?.id);
          return invEvId === id;
        });
      },
      error: () => {}
    });

    this.apiService.listEventMembers(id).subscribe({
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

    this.apiService.listEventAccessLinks(id).subscribe({
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
        this.eventUpdated.emit();
      },
      error: err => {
        this.error = err?.error?.message || 'Error al cambiar estado';
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
        },
        error: err => {
          this.error = err?.error?.message || 'Error al borrar invitación';
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
    const id = (this.event._id || this.event.id)!;
    return this.payments.some(p => p.package === planCode && p.status === 'pending' && p.event === id);
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
        this.error = err?.error?.message || 'Error al iniciar checkout';
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
      },
      error: err => {
        this.error = err?.error?.message || 'Error al agregar miembro';
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
      },
      error: err => {
        this.error = err?.error?.message || 'Error al actualizar rol';
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
        },
        error: err => {
          this.error = err?.error?.message || 'Error al desactivar miembro';
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
      },
      error: err => {
        this.error = err?.error?.message || 'Error al generar enlace';
      }
    });
  }

  revokeAccessLink(link: EventAccessLinkModel): void {
    const id = (this.event._id || this.event.id)!;
    const lId = (link._id || link.id)!;
    this.apiService.revokeEventAccessLink(id, lId).subscribe({
      next: () => {
        link.revokedAt = new Date().toISOString();
      },
      error: err => {
        this.error = err?.error?.message || 'Error al revocar enlace';
      }
    });
  }

  getNewAccessUrl(link: EventAccessLinkModel): string {
    return link.url || `/new/external-access/${link._id || link.id}`;
  }
}
