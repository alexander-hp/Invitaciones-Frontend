import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormGroup, FormControl, FormArray } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { EventModel, GuestModel, GuestPayload, InvitationModel, RsvpModel, EventTableModel, EventStatus } from '../../core/models';

type Tab = 'info' | 'guests' | 'tables' | 'rsvps' | 'integration';

@Component({ selector: 'app-new-event-detail', templateUrl: './new-event-detail.component.html' })
export class NewEventDetailComponent implements OnInit {
  Math = Math;
  activeTab: Tab = 'info';
  event?: EventModel;
  invitations: InvitationModel[] = [];
  guests: GuestModel[] = [];
  rsvps: RsvpModel[] = [];
  tables: EventTableModel[] = [];

  externalSaving = false;
  externalError = '';
  externalSuccess = '';
  externalAssetUploading = '';
  externalForm = new FormGroup({
    externalSiteUrl: new FormControl(''),
    externalSiteLabel: new FormControl(''),
    externalPortalEnabled: new FormControl(true),
    welcomeMessage: new FormControl(''),
    brandLabel: new FormControl(''),
    coverImageUrl: new FormControl(''),
    heroImageUrl: new FormControl(''),
    musicUrl: new FormControl(''),
    carousel: new FormArray([]),
    gallery: new FormArray([])
  });

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
        if (event.mode === 'external_dashboard') {
          this.initExternalForm(event);
        }
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

  changeStatus(newStatus: EventStatus): void {
    if (!this.eventId || !this.event) return;
    this.saving = true;
    this.error = '';
    this.api.updateEvent(this.eventId, { status: newStatus }).subscribe({
      next: ({ event }) => {
        this.event = event;
        this.saving = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'No se pudo cambiar el estado del evento';
        this.saving = false;
      }
    });
  }

  // ── External Integration Methods ──

  get carouselItems(): FormArray {
    return this.externalForm.get('carousel') as FormArray;
  }

  get galleryItems(): FormArray {
    return this.externalForm.get('gallery') as FormArray;
  }

  initExternalForm(event: EventModel): void {
    const content = event.externalContent || {};
    this.carouselItems.clear();
    this.galleryItems.clear();

    if (content.carousel) {
      content.carousel.forEach(url => this.carouselItems.push(new FormControl(url)));
    }
    if (content.gallery) {
      content.gallery.forEach(url => this.galleryItems.push(new FormControl(url)));
    }

    this.externalForm.patchValue({
      externalSiteUrl: event.externalSiteUrl || '',
      externalSiteLabel: event.externalSiteLabel || '',
      externalPortalEnabled: event.externalPortalEnabled !== false,
      welcomeMessage: event.externalPortalSettings?.welcomeMessage || '',
      brandLabel: event.externalPortalSettings?.brandLabel || '',
      coverImageUrl: content.coverImageUrl || '',
      heroImageUrl: content.heroImageUrl || '',
      musicUrl: content.musicUrl || ''
    });
  }

  addUrlItem(arrayName: 'carousel' | 'gallery'): void {
    (this.externalForm.get(arrayName) as FormArray).push(new FormControl(''));
  }

  removeArrayItem(arrayName: 'carousel' | 'gallery', index: number): void {
    (this.externalForm.get(arrayName) as FormArray).removeAt(index);
  }

  cleanStringList(values: any[] = []): string[] {
    return (values || []).map(val => String(val || '').trim()).filter(Boolean);
  }

  saveExternalConfig(): void {
    if (!this.eventId || !this.event) return;
    this.externalSaving = true;
    this.externalError = '';
    this.externalSuccess = '';

    const formValue: any = this.externalForm.value;
    const externalContent: any = {
      ...(this.event.externalContent || {}),
      coverImageUrl: formValue.coverImageUrl || undefined,
      heroImageUrl: formValue.heroImageUrl || undefined,
      carousel: this.cleanStringList(formValue.carousel),
      gallery: this.cleanStringList(formValue.gallery),
      musicUrl: formValue.musicUrl || undefined
    };

    this.api.updateEvent(this.eventId, {
      externalSiteUrl: formValue.externalSiteUrl || undefined,
      externalSiteLabel: formValue.externalSiteLabel || undefined,
      externalPortalEnabled: Boolean(formValue.externalPortalEnabled),
      externalPortalSettings: {
        welcomeMessage: formValue.welcomeMessage || undefined,
        brandLabel: formValue.brandLabel || undefined
      },
      externalContent
    }).subscribe({
      next: ({ event }) => {
        this.event = event;
        this.externalSuccess = 'Configuración de integración externa guardada.';
        this.externalSaving = false;
      },
      error: (error) => {
        this.externalError = error.error?.message || 'No se pudo guardar la configuración.';
        this.externalSaving = false;
      }
    });
  }

  uploadExternalAsset(event: Event, target: 'cover' | 'hero' | 'music' | 'carousel' | 'gallery', index?: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.eventId) return;

    const isMusic = target === 'music';
    const folder = isMusic ? 'music' : (target === 'cover' || target === 'hero' ? 'covers' : 'gallery');

    // Basic client-side validation
    const allowedTypes = isMusic ? new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav']) : new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    const maxSize = isMusic ? 10 * 1024 * 1024 : 5 * 1024 * 1024;

    if (!allowedTypes.has(file.type)) {
      this.externalError = isMusic ? 'Formato de audio no soportado. Usa MP3 o WAV.' : 'Formato de imagen no soportado. Usa JPG, PNG, WEBP o GIF.';
      input.value = '';
      return;
    }
    if (file.size > maxSize) {
      this.externalError = isMusic ? 'El audio no debe exceder 10MB.' : 'La imagen no debe exceder 5MB.';
      input.value = '';
      return;
    }

    const uploadKey = `${target}-${index ?? 'main'}`;
    this.externalAssetUploading = uploadKey;
    this.externalError = '';
    this.externalSuccess = '';

    this.api.createUploadUrl({ fileName: file.name, contentType: file.type, folder, event: this.eventId, size: file.size }).subscribe({
      next: (upload) => {
        this.api.uploadAsset(upload.uploadUrl, file).subscribe({
          next: () => {
            this.applyExternalAssetUrl(target, upload.publicUrl, index);
            this.externalSuccess = 'Archivo subido correctamente. Guarda los cambios para publicarlo.';
            this.externalAssetUploading = '';
            input.value = '';
          },
          error: () => {
            this.externalError = 'No se pudo subir el archivo de manera directa al servidor.';
            this.externalAssetUploading = '';
            input.value = '';
          }
        });
      },
      error: () => {
        this.externalError = 'No se pudo generar la URL de subida.';
        this.externalAssetUploading = '';
        input.value = '';
      }
    });
  }

  applyExternalAssetUrl(target: 'cover' | 'hero' | 'music' | 'carousel' | 'gallery', url: string, index?: number): void {
    if (target === 'cover') this.externalForm.patchValue({ coverImageUrl: url });
    if (target === 'hero') this.externalForm.patchValue({ heroImageUrl: url });
    if (target === 'music') this.externalForm.patchValue({ musicUrl: url });
    if (target === 'carousel' && index !== undefined) this.carouselItems.at(index)?.setValue(url);
    if (target === 'gallery' && index !== undefined) this.galleryItems.at(index)?.setValue(url);
  }
}
