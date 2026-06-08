import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AlbumAssetModel, EventModel, EventTableModel, GuestCommunicationStatus, GuestMessageChannel, GuestMessageType, GuestModel, GuestPayload, InvitationModel, RsvpModel } from '../../core/models';

interface MessageTemplateOption {
  value: GuestMessageType;
  label: string;
}

@Component({ selector: 'app-event-detail', templateUrl: './event-detail.component.html' })
export class EventDetailComponent implements OnInit {
  event?: EventModel;
  invitations: InvitationModel[] = [];
  guests: GuestModel[] = [];
  rsvps: RsvpModel[] = [];
  tables: EventTableModel[] = [];
  albumAssets: AlbumAssetModel[] = [];
  loading = false;
  saving = false;
  guestSaving = false;
  guestsLoading = false;
  rsvpsLoading = false;
  importing = false;
  exportingGuests = false;
  exportingRsvps = false;
  selectedImportFile?: File;
  error = '';
  guestError = '';
  rsvpError = '';
  albumError = '';
  checkInCode = '';
  checkInLink = '';
  guestMessage = '';
  tableMessage = '';
  albumMessage = '';
  importMessage = '';
  importDuplicateDetails: string[] = [];
  editingGuest?: GuestModel;
  guestForm = { name: '', email: '', phone: '', group: '', tableName: '', seatLabel: '', allowedCompanions: 0 };
  companionNames = '';
  tableForm = { name: '', capacity: 10, notes: '', order: 0 };
  guestFilters = { search: '', status: '', communicationStatus: '', group: '' };
  selectedMessageType: GuestMessageType = 'invitation';
  messageTemplates: MessageTemplateOption[] = [
    { value: 'invitation', label: 'Invitacion' },
    { value: 'reminder', label: 'Recordatorio RSVP' },
    { value: 'location_change', label: 'Cambio de ubicacion' },
    { value: 'thanks', label: 'Agradecimiento' }
  ];

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
        this.loadInvitations(id);
        this.loadGuests(id);
        this.loadRsvps(id);
        this.loadTables(id);
        this.loadAlbum(id);
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo cargar el evento.';
        this.loading = false;
      }
    });
  }

  createInvitation(): void {
    if (!this.event) return;
    this.saving = true;
    this.error = '';
    const eventId = this.getEventId();
    this.api.createInvitation({
      event: eventId,
      slug: this.slugify(this.event.title),
      accessMode: 'guest_list',
      content: {
        headline: this.event.title,
        subheadline: 'Nos encantaria que nos acompanes',
        message: 'Confirma tu asistencia y comparte este dia especial con nosotros.',
        palette: { primary: '#1f2a44', secondary: '#f7f2ea', accent: '#b67b4b' },
        gallery: []
      }
    }).subscribe({
      next: ({ invitation }) => this.router.navigate(['/invitations', this.getInvitationId(invitation), 'editor']),
      error: (error) => {
        this.error = error.error?.message || 'No se pudo crear la invitacion.';
        this.saving = false;
      }
    });
  }

  saveGuest(): void {
    const eventId = this.getEventId();
    if (!eventId) return;
    const duplicate = this.findDuplicateGuest(this.editingGuest ? this.getGuestId(this.editingGuest) : undefined);
    if (duplicate) {
      this.guestError = `Ese ${duplicate.field === 'email' ? 'correo' : 'telefono'} ya pertenece a ${duplicate.guest.name}. Puedes editar ese invitado en la lista.`;
      return;
    }

    this.guestSaving = true;
    this.guestError = '';
    this.guestMessage = '';
    const wasEditing = Boolean(this.editingGuest);
    const guestData: Omit<GuestPayload, 'event'> = {
      name: this.guestForm.name,
      email: this.guestForm.email || undefined,
      phone: this.guestForm.phone || undefined,
      group: this.guestForm.group || undefined,
      tableName: this.guestForm.tableName || undefined,
      seatLabel: this.guestForm.seatLabel || undefined,
      allowedCompanions: Number(this.guestForm.allowedCompanions || 0)
    };
    const companions = this.companionNames.split('\n').map((name) => name.trim()).filter(Boolean).map((name) => ({ name, tableName: this.guestForm.tableName || undefined }));
    if (companions.length) guestData.companions = companions;
    const request = this.editingGuest
      ? this.api.updateGuest(this.getGuestId(this.editingGuest), guestData)
      : this.api.createGuest({ event: eventId, ...guestData });

    request.subscribe({
      next: ({ guest }) => {
        this.guests = this.editingGuest
          ? this.guests.map((item) => this.getGuestId(item) === this.getGuestId(guest) ? guest : item).sort((a, b) => a.name.localeCompare(b.name))
          : [guest, ...this.guests].sort((a, b) => a.name.localeCompare(b.name));
        this.resetGuestForm();
        this.guestMessage = wasEditing ? 'Invitado actualizado.' : 'Invitado agregado.';
        this.guestSaving = false;
      },
      error: (error) => {
        this.guestError = this.buildGuestError(error, this.editingGuest ? 'No se pudo actualizar el invitado.' : 'No se pudo agregar el invitado.');
        this.guestSaving = false;
      }
    });
  }

  startEditGuest(guest: GuestModel): void {
    this.editingGuest = guest;
    this.guestError = '';
    this.guestMessage = '';
    this.guestForm = {
      name: guest.name,
      email: guest.email || '',
      phone: guest.phone || '',
      group: guest.group || '',
      tableName: guest.tableName || '',
      seatLabel: guest.seatLabel || '',
      allowedCompanions: guest.allowedCompanions || 0
    };
    this.companionNames = (guest.companions || []).map((companion) => companion.name || '').filter(Boolean).join('\n');
  }

  cancelEditGuest(): void {
    this.resetGuestForm();
    this.guestError = '';
  }

  deleteGuest(guest: GuestModel): void {
    const guestId = this.getGuestId(guest);
    if (!guestId || !window.confirm(`Eliminar a ${guest.name} de la lista de invitados?`)) return;
    this.guestSaving = true;
    this.guestError = '';
    this.guestMessage = '';
    this.api.deleteGuest(guestId).subscribe({
      next: () => {
        this.guests = this.guests.filter((item) => this.getGuestId(item) !== guestId);
        if (this.editingGuest && this.getGuestId(this.editingGuest) === guestId) this.resetGuestForm();
        this.guestMessage = 'Invitado eliminado.';
        this.guestSaving = false;
      },
      error: (error) => {
        this.guestError = error.error?.message || 'No se pudo eliminar el invitado.';
        this.guestSaving = false;
      }
    });
  }

  selectImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedImportFile = input.files?.[0] || undefined;
    this.importMessage = this.selectedImportFile ? this.selectedImportFile.name : '';
    this.importDuplicateDetails = [];
  }

  importGuests(): void {
    const eventId = this.getEventId();
    if (!eventId || !this.selectedImportFile) return;
    this.importing = true;
    this.guestError = '';
    this.importMessage = '';
    this.importDuplicateDetails = [];
    this.api.importGuests(eventId, this.selectedImportFile).subscribe({
      next: (result) => {
        this.guests = [...result.guests, ...this.guests].sort((a, b) => a.name.localeCompare(b.name));
        const duplicateRows = result.duplicateRows || 0;
        const created = result.created ?? result.imported;
        const skipped = result.skipped ?? ((result.invalidRows || 0) + duplicateRows);
        this.importMessage = `Creados: ${created}. Actualizados: ${result.updated || 0}. Omitidos: ${skipped}. Filas invalidas: ${result.invalidRows}. Duplicados: ${duplicateRows}.`;
        this.importDuplicateDetails = (result.duplicates || []).slice(0, 5).map((duplicate) => {
          if (duplicate.field === 'plan') return `Fila ${duplicate.row}: omitida por limite de ${duplicate.value} invitados del plan.`;
          return `Fila ${duplicate.row}: ${duplicate.field === 'email' ? 'email' : 'telefono'} ${duplicate.value} ya pertenece a ${duplicate.guestName}.`;
        });
        this.selectedImportFile = undefined;
        this.importing = false;
      },
      error: (error) => {
        this.guestError = error.error?.message || 'No se pudo importar el archivo.';
        this.importing = false;
      }
    });
  }

  checkInGuest(): void {
    const code = this.checkInCode.trim();
    if (!code) return;
    this.guestError = '';
    this.api.checkInGuest(code).subscribe({
      next: ({ guest }) => {
        this.guests = this.guests.map((item) => this.getGuestId(item) === this.getGuestId(guest) ? guest : item);
        this.guestMessage = `${guest.name} marcado como registrado.`;
        this.checkInCode = '';
      },
      error: (error) => {
        this.guestError = error.error?.message || 'No se pudo registrar el check-in.';
      }
    });
  }

  createTable(): void {
    const eventId = this.getEventId();
    if (!eventId || !this.tableForm.name) return;
    this.tableMessage = '';
    this.api.createTable(eventId, {
      name: this.tableForm.name,
      capacity: Number(this.tableForm.capacity || 1),
      notes: this.tableForm.notes || undefined,
      order: Number(this.tableForm.order || 0)
    }).subscribe({
      next: () => {
        this.tableForm = { name: '', capacity: 10, notes: '', order: 0 };
        this.tableMessage = 'Mesa creada.';
        this.loadTables(eventId);
      },
      error: (error) => {
        this.guestError = error.error?.message || 'No se pudo crear la mesa.';
      }
    });
  }

  deleteTable(table: EventTableModel): void {
    const eventId = this.getEventId();
    const tableId = this.getTableId(table);
    if (!eventId || !tableId || !window.confirm(`Eliminar mesa ${table.name}?`)) return;
    this.api.deleteTable(eventId, tableId).subscribe({
      next: () => {
        this.tableMessage = 'Mesa eliminada.';
        this.loadTables(eventId);
      },
      error: (error) => {
        this.guestError = error.error?.message || 'No se pudo eliminar la mesa.';
      }
    });
  }

  createCheckInLink(): void {
    const eventId = this.getEventId();
    if (!eventId) return;
    this.api.createCheckInLink(eventId, { label: 'Entrada', days: 7 }).subscribe({
      next: ({ url }) => {
        this.checkInLink = url;
        this.guestMessage = 'Link de staff generado.';
      },
      error: (error) => {
        this.guestError = error.error?.message || 'No se pudo generar el link de staff.';
      }
    });
  }

  updateAlbumAsset(asset: AlbumAssetModel, status: AlbumAssetModel['status']): void {
    const eventId = this.getEventId();
    const assetId = asset._id || asset.id || '';
    if (!eventId || !assetId) return;
    this.api.updateAlbumAsset(eventId, assetId, status).subscribe({
      next: ({ asset: updated }) => {
        this.albumAssets = this.albumAssets.map((item) => (item._id || item.id) === assetId ? updated : item);
        this.albumMessage = 'Album actualizado.';
      },
      error: (error) => {
        this.albumError = error.error?.message || 'No se pudo actualizar la foto.';
      }
    });
  }

  get filteredGuests(): GuestModel[] {
    const search = this.normalizeSearch(this.guestFilters.search);
    return this.guests.filter((guest) => {
      const matchesSearch = !search || [guest.name, guest.email, guest.phone, guest.group].some((value) => this.normalizeSearch(value).includes(search));
      const matchesStatus = !this.guestFilters.status || guest.status === this.guestFilters.status;
      const matchesCommunication = !this.guestFilters.communicationStatus || this.getCommunicationStatus(guest) === this.guestFilters.communicationStatus;
      const matchesGroup = !this.guestFilters.group || (guest.group || 'General') === this.guestFilters.group;
      return matchesSearch && matchesStatus && matchesCommunication && matchesGroup;
    });
  }

  get guestGroups(): string[] {
    return Array.from(new Set(this.guests.map((guest) => guest.group || 'General'))).sort((a, b) => a.localeCompare(b));
  }

  get pendingGuests(): number {
    return this.guests.filter((guest) => guest.status === 'pending').length;
  }

  get confirmedGuests(): number {
    return this.guests.filter((guest) => guest.status === 'confirmed').length;
  }

  get declinedGuests(): number {
    return this.guests.filter((guest) => guest.status === 'declined').length;
  }

  get checkedInGuests(): number {
    return this.guests.filter((guest) => guest.checkedIn).length;
  }

  get pendingCommunicationGuests(): number {
    return this.guests.filter((guest) => this.getCommunicationStatus(guest) === 'pending').length;
  }

  get sentCommunicationGuests(): number {
    return this.guests.filter((guest) => this.getCommunicationStatus(guest) === 'sent').length;
  }

  get confirmedCommunicationGuests(): number {
    return this.guests.filter((guest) => this.getCommunicationStatus(guest) === 'confirmed').length;
  }

  get pendingAlbumAssets(): number {
    return this.albumAssets.filter((asset) => asset.status === 'pending').length;
  }

  get primaryInvitation(): InvitationModel | undefined {
    return this.invitations.find((invitation) => invitation.status === 'published') || this.invitations[0];
  }

  exportGuests(): void {
    const eventId = this.getEventId();
    if (!eventId) return;
    this.exportingGuests = true;
    this.guestError = '';
    this.api.exportGuests(eventId, this.guestFilters).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, `invitados-${eventId}.csv`);
        this.exportingGuests = false;
      },
      error: (error) => {
        this.guestError = error.error?.message || 'No se pudo exportar la lista de invitados.';
        this.exportingGuests = false;
      }
    });
  }

  exportRsvps(): void {
    const eventId = this.getEventId();
    if (!eventId) return;
    this.exportingRsvps = true;
    this.rsvpError = '';
    this.api.exportRsvps(eventId).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, `rsvps-${eventId}.csv`);
        this.exportingRsvps = false;
      },
      error: (error) => {
        this.rsvpError = error.error?.message || 'No se pudo exportar RSVP.';
        this.exportingRsvps = false;
      }
    });
  }

  showPendingReminders(): void {
    this.guestFilters.status = 'pending';
    this.guestFilters.communicationStatus = '';
    this.selectedMessageType = 'reminder';
  }

  getWhatsappLink(guest: GuestModel): string {
    const phone = this.toWhatsappPhone(guest.phone);
    const message = this.buildMessage(guest, this.selectedMessageType);
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  getEmailLink(guest: GuestModel): string {
    const subject = this.getMessageSubject(this.selectedMessageType);
    const body = this.buildMessage(guest, this.selectedMessageType);
    return `mailto:${encodeURIComponent(guest.email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  canWhatsappGuest(guest: GuestModel): boolean {
    return Boolean(this.toWhatsappPhone(guest.phone) && this.primaryInvitation);
  }

  canEmailGuest(guest: GuestModel): boolean {
    return Boolean(guest.email && this.primaryInvitation);
  }

  getQrImageUrl(guest: GuestModel): string {
    const value = guest.checkInCode || guest.qrCode || this.getGuestId(guest);
    return `https://api.qrserver.com/v1/create-qr-code/?size=96x96&data=${encodeURIComponent(value)}`;
  }

  markMessageSent(guest: GuestModel, channel: GuestMessageChannel): void {
    const guestId = this.getGuestId(guest);
    if (!guestId) return;
    this.api.markGuestCommunication(guestId, {
      communicationStatus: 'sent',
      messageType: this.selectedMessageType,
      channel
    }).subscribe({
      next: ({ guest: updatedGuest }) => {
        this.guests = this.guests.map((item) => this.getGuestId(item) === guestId ? updatedGuest : item);
      },
      error: (error) => {
        this.guestError = error.error?.message || 'No se pudo marcar el mensaje como enviado.';
      }
    });
  }

  setCommunicationStatus(guest: GuestModel, communicationStatus: GuestCommunicationStatus): void {
    const guestId = this.getGuestId(guest);
    if (!guestId) return;
    this.api.markGuestCommunication(guestId, { communicationStatus }).subscribe({
      next: ({ guest: updatedGuest }) => {
        this.guests = this.guests.map((item) => this.getGuestId(item) === guestId ? updatedGuest : item);
      },
      error: (error) => {
        this.guestError = error.error?.message || 'No se pudo actualizar el seguimiento.';
      }
    });
  }

  getCommunicationStatus(guest: GuestModel): GuestCommunicationStatus {
    return guest.communicationStatus || (guest.status === 'confirmed' ? 'confirmed' : 'pending');
  }

  getMessageTypeLabel(messageType?: GuestMessageType): string {
    return this.messageTemplates.find((template) => template.value === messageType)?.label || 'Sin mensaje';
  }

  getEventId(): string {
    return this.event?._id || this.event?.id || '';
  }

  getInvitationId(invitation: InvitationModel): string {
    return invitation._id || invitation.id || '';
  }

  getGuestId(guest: GuestModel): string {
    return guest._id || guest.id || '';
  }

  getTableId(table: EventTableModel): string {
    return table._id || table.id || '';
  }

  private resetGuestForm(): void {
    this.editingGuest = undefined;
    this.guestForm = { name: '', email: '', phone: '', group: '', tableName: '', seatLabel: '', allowedCompanions: 0 };
    this.companionNames = '';
  }

  private normalizeEmail(email?: string): string {
    return (email || '').toLowerCase().trim();
  }

  private normalizePhone(phone?: string): string {
    return (phone || '').trim().replace(/[\s().-]/g, '');
  }

  private normalizeSearch(value?: string): string {
    return (value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  private toWhatsappPhone(phone?: string): string {
    const normalized = this.normalizePhone(phone).replace(/^\+/, '');
    if (!normalized) return '';
    return normalized.length === 10 ? `52${normalized}` : normalized;
  }

  private getMessageSubject(messageType: GuestMessageType): string {
    const title = this.event?.title || 'Invitacion';
    if (messageType === 'reminder') return `Recordatorio RSVP - ${title}`;
    if (messageType === 'location_change') return `Actualizacion de ubicacion - ${title}`;
    if (messageType === 'thanks') return `Gracias por confirmar - ${title}`;
    return `Invitacion - ${title}`;
  }

  private buildMessage(guest: GuestModel, messageType: GuestMessageType): string {
    const eventTitle = this.event?.title || 'nuestro evento';
    const date = this.event?.date ? new Date(this.event.date).toLocaleDateString() : '';
    const venue = this.event?.venue?.name || '';
    const address = this.event?.venue?.address || '';
    const publicUrl = this.primaryInvitation ? `${window.location.origin}/i/${this.primaryInvitation.slug}` : '';
    const locationLine = [venue, address].filter(Boolean).join(' - ');

    if (messageType === 'reminder') {
      return [
        `Hola ${guest.name}, te recordamos confirmar tu asistencia a ${eventTitle}.`,
        date ? `Fecha: ${date}` : '',
        publicUrl,
        'Tu confirmacion nos ayuda a organizar mejor el evento.'
      ].filter(Boolean).join('\n\n');
    }

    if (messageType === 'location_change') {
      return [
        `Hola ${guest.name}, tenemos una actualizacion de ubicacion para ${eventTitle}.`,
        locationLine ? `Nueva ubicacion: ${locationLine}` : '',
        publicUrl,
        'Te recomendamos revisar el enlace antes del evento.'
      ].filter(Boolean).join('\n\n');
    }

    if (messageType === 'thanks') {
      return [
        `Hola ${guest.name}, gracias por confirmar tu asistencia a ${eventTitle}.`,
        date ? `Nos vemos el ${date}.` : '',
        locationLine ? `Lugar: ${locationLine}` : '',
        'Nos encantara verte ahi.'
      ].filter(Boolean).join('\n\n');
    }

    return [
      `Hola ${guest.name}, te comparto tu invitacion digital para ${eventTitle}.`,
      date ? `Fecha: ${date}` : '',
      locationLine ? `Lugar: ${locationLine}` : '',
      publicUrl,
      'Por favor confirma tu asistencia desde el enlace.'
    ].filter(Boolean).join('\n\n');
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private findDuplicateGuest(excludeGuestId?: string): { guest: GuestModel; field: 'email' | 'phone' } | undefined {
    const email = this.normalizeEmail(this.guestForm.email);
    const phone = this.normalizePhone(this.guestForm.phone);
    return this.guests.reduce((found: { guest: GuestModel; field: 'email' | 'phone' } | undefined, guest) => {
      if (found || this.getGuestId(guest) === excludeGuestId) return found;
      if (email && this.normalizeEmail(guest.email) === email) return { guest, field: 'email' };
      if (phone && this.normalizePhone(guest.phone) === phone) return { guest, field: 'phone' };
      return undefined;
    }, undefined);
  }

  private buildGuestError(error: any, fallback: string): string {
    if (error.status === 409 && error.error?.details?.guestName) {
      const field = error.error.details.field === 'phone' ? 'telefono' : 'correo';
      return `Ese ${field} ya pertenece a ${error.error.details.guestName}. Puedes editar ese invitado en la lista.`;
    }
    return error.error?.message || fallback;
  }

  private loadInvitations(eventId: string): void {
    this.api.listInvitations().subscribe({
      next: ({ invitations }) => {
        this.invitations = invitations.filter((invitation) => {
          const eventRef = typeof invitation.event === 'string' ? invitation.event : invitation.event._id || invitation.event.id;
          return eventRef === eventId;
        });
        this.loading = false;
      },
      error: () => {
        this.invitations = [];
        this.loading = false;
      }
    });
  }

  private loadGuests(eventId: string): void {
    this.guestsLoading = true;
    this.api.listGuests(eventId).subscribe({
      next: ({ guests }) => {
        this.guests = guests;
        this.guestsLoading = false;
      },
      error: (error) => {
        this.guestError = error.error?.message || 'No se pudieron cargar los invitados.';
        this.guestsLoading = false;
      }
    });
  }

  private loadRsvps(eventId: string): void {
    this.rsvpsLoading = true;
    this.rsvpError = '';
    this.api.listRsvps(eventId).subscribe({
      next: ({ rsvps }) => {
        this.rsvps = rsvps;
        this.rsvpsLoading = false;
      },
      error: (error) => {
        this.rsvpError = error.error?.message || 'No se pudieron cargar las respuestas RSVP.';
        this.rsvpsLoading = false;
      }
    });
  }

  private loadTables(eventId: string): void {
    this.api.listTables(eventId).subscribe({
      next: ({ tables }) => this.tables = tables,
      error: () => this.tables = []
    });
  }

  private loadAlbum(eventId: string): void {
    this.albumError = '';
    this.api.listAlbum(eventId).subscribe({
      next: ({ assets }) => this.albumAssets = assets,
      error: () => this.albumAssets = []
    });
  }

  private slugify(value: string): string {
    return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
}
