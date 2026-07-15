import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { EventModel, GuestModel, GuestPayload, InvitationModel, RsvpModel, EventTableModel } from '../../core/models';

type Tab = 'info' | 'guests' | 'tables' | 'rsvps';

@Component({ selector: 'app-new-event-detail', templateUrl: './new-event-detail.component.html' })
export class NewEventDetailComponent implements OnInit {
  Math = Math;
  activeTab: Tab = 'info';
  event?: EventModel;
  invitations: InvitationModel[] = [];
  guests: GuestModel[] = [];
  rsvps: RsvpModel[] = [];
  tables: EventTableModel[] = [];

  checkoutLoading = '';
  currentPlan?: any;
  eventPlanActive = false;
  eventPlanExpiresAt = '';
  subscriptionActive = false;

  loading = true;
  saving = false;
  error = '';

  // Guest management
  guestSearch = '';
  guestStatusFilter = '';
  guestSaving = false;
  guestError = '';
  guestMessage = '';
  showGuestForm = false;
  editingGuest?: GuestModel;
  guestForm = { name: '', email: '', phone: '', group: '', tableName: '', allowedCompanions: 0 };

  // Import
  importing = false;
  importFile?: File;
  importMessage = '';

  constructor(private route: ActivatedRoute, private router: Router, private api: ApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.loading = true;
    this.error = '';
    this.api.getEvent(id).subscribe({
      next: ({ event }) => {
        this.event = event;
        this.loading = false;
        this.loadRelated(id);
      },
      error: (err) => { this.error = err.error?.message || 'Evento no encontrado'; this.loading = false; }
    });
  }

  private loadRelated(eventId: string): void {
    this.api.listInvitations().subscribe({ next: ({ invitations }) => this.invitations = invitations.filter(i => this.getRefId(i.event) === eventId), error: () => {} });
    this.loadGuests(eventId);
    this.api.listRsvps(eventId).subscribe({ next: ({ rsvps }) => this.rsvps = rsvps, error: () => {} });
    this.api.listTables(eventId).subscribe({ next: ({ tables }) => this.tables = tables, error: () => {} });
    this.loadPaymentStatus(eventId);
  }

  private loadGuests(eventId: string): void {
    this.api.listGuests(eventId).subscribe({ next: ({ guests }) => this.guests = guests, error: () => {} });
  }

  get eventId(): string { return this.event?._id || this.event?.id || ''; }

  get filteredGuests(): GuestModel[] {
    const search = this.guestSearch.toLowerCase().trim();
    return this.guests.filter(g => {
      if (search && ![g.name, g.email, g.phone, g.group].some(v => (v || '').toLowerCase().includes(search))) return false;
      if (this.guestStatusFilter && g.status !== this.guestStatusFilter) return false;
      return true;
    });
  }

  get confirmedCount(): number { return this.guests.filter(g => g.status === 'confirmed').length; }
  get pendingCount(): number { return this.guests.filter(g => g.status === 'pending').length; }
  get declinedCount(): number { return this.guests.filter(g => g.status === 'declined').length; }
  get totalSeats(): number { return this.guests.reduce((sum, g) => sum + 1 + (g.allowedCompanions || 0), 0); }
  get unassignedGuests(): GuestModel[] { return this.guests.filter(g => !g.tableName); }

  // Guest CRUD
  openGuestForm(guest?: GuestModel): void {
    this.editingGuest = guest;
    this.guestError = '';
    this.guestMessage = '';
    if (guest) {
      this.guestForm = {
        name: guest.name, email: guest.email || '', phone: guest.phone || '',
        group: guest.group || '', tableName: guest.tableName || '',
        allowedCompanions: guest.allowedCompanions || 0
      };
    } else {
      this.guestForm = { name: '', email: '', phone: '', group: '', tableName: '', allowedCompanions: 0 };
    }
    this.showGuestForm = true;
  }

  saveGuest(): void {
    if (!this.guestForm.name.trim()) { this.guestError = 'El nombre es requerido'; return; }
    this.guestSaving = true;
    this.guestError = '';
    const payload: Partial<GuestPayload> = {
      name: this.guestForm.name,
      email: this.guestForm.email || undefined,
      phone: this.guestForm.phone || undefined,
      group: this.guestForm.group || undefined,
      tableName: this.guestForm.tableName || undefined,
      allowedCompanions: Number(this.guestForm.allowedCompanions || 0)
    };

    const obs = this.editingGuest
      ? this.api.updateGuest(this.getGuestId(this.editingGuest), payload)
      : this.api.createGuest({ event: this.eventId, ...payload } as GuestPayload);

    obs.subscribe({
      next: () => {
        this.guestMessage = this.editingGuest ? 'Invitado actualizado' : 'Invitado agregado';
        this.showGuestForm = false;
        this.guestSaving = false;
        this.loadGuests(this.eventId);
      },
      error: (err) => {
        this.guestError = err.error?.message || 'Error guardando invitado';
        this.guestSaving = false;
      }
    });
  }

  deleteGuest(guest: GuestModel): void {
    if (!confirm(`¿Eliminar a ${guest.name}?`)) return;
    this.api.deleteGuest(this.getGuestId(guest)).subscribe({
      next: () => { this.guests = this.guests.filter(g => this.getGuestId(g) !== this.getGuestId(guest)); this.guestMessage = 'Invitado eliminado'; },
      error: (err) => this.guestError = err.error?.message || 'Error eliminando invitado'
    });
  }

  selectImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.importFile = input.files?.[0];
  }

  importGuests(): void {
    if (!this.importFile) return;
    this.importing = true;
    this.importMessage = '';
    this.api.importGuests(this.eventId, this.importFile).subscribe({
      next: (result) => {
        const created = result.created ?? result.imported;
        this.importMessage = `Importados: ${created}. Actualizados: ${result.updated || 0}. Inválidos: ${result.invalidRows}.`;
        this.importing = false;
        this.importFile = undefined;
        this.loadGuests(this.eventId);
      },
      error: (err) => { this.importMessage = err.error?.message || 'Error de importación'; this.importing = false; }
    });
  }

  goToSeating(): void {
    this.router.navigate(['/new/events', this.eventId, 'seating']);
  }

  // Helpers
  getGuestId(g: GuestModel): string { return (g as any)._id || (g as any).id || ''; }
  getRefId(ref: any): string {
    if (!ref) return '';
    if (typeof ref === 'string') return ref;
    return ref._id || ref.id || '';
  }

  eventTypeIcon(type: string): string {
    return ({ boda: '💍', xv: '👑', graduacion: '🎓', cumpleanos: '🎂', bautizo: '⛪', otro: '🎉' } as any)[type] || '🎉';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  formatShortDate(date: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  }

  statusPillClass(status: string): string {
    return ({ confirmed: 'success', declined: 'danger', pending: 'warning', maybe: 'info' } as any)[status] || '';
  }

  statusLabel(status: string): string {
    return ({ confirmed: 'Confirmado', declined: 'Rechazado', pending: 'Pendiente', maybe: 'Tal vez' } as any)[status] || status;
  }

  private loadPaymentStatus(eventId: string): void {
    this.api.getPaymentStatus(eventId).subscribe({
      next: ({ eventPlanDefinition, planDefinition, eventPlanActive, eventPlanExpiresAt, subscriptionActive }) => {
        this.currentPlan = eventPlanDefinition || planDefinition;
        this.eventPlanActive = Boolean(eventPlanActive);
        this.eventPlanExpiresAt = eventPlanExpiresAt || '';
        this.subscriptionActive = Boolean(subscriptionActive);
      },
      error: () => {
        this.currentPlan = undefined;
        this.eventPlanActive = false;
        this.eventPlanExpiresAt = '';
        this.subscriptionActive = false;
      }
    });
  }

  checkoutPlan(pack: string): void {
    if (!this.eventId) return;
    this.checkoutLoading = pack;
    this.guestError = '';
    this.api.createCheckout({ package: pack as any, event: this.eventId }).subscribe({
      next: ({ checkoutUrl, manualPayment, message }) => {
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
          return;
        }
        this.guestMessage = manualPayment ? (message || 'Pago manual registrado como pendiente.') : 'Solicitud de pago registrada.';
        this.checkoutLoading = '';
      },
      error: (error) => {
        this.guestError = error.error?.message || 'No se pudo iniciar el checkout.';
        this.checkoutLoading = '';
      }
    });
  }
}
