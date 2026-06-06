import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { EventModel, GuestModel, InvitationModel, RsvpModel } from '../../core/models';

@Component({ selector: 'app-event-detail', templateUrl: './event-detail.component.html' })
export class EventDetailComponent implements OnInit {
  event?: EventModel;
  invitations: InvitationModel[] = [];
  guests: GuestModel[] = [];
  rsvps: RsvpModel[] = [];
  loading = false;
  saving = false;
  guestSaving = false;
  guestsLoading = false;
  rsvpsLoading = false;
  importing = false;
  selectedImportFile?: File;
  error = '';
  guestError = '';
  rsvpError = '';
  guestMessage = '';
  importMessage = '';
  guestForm = { name: '', email: '', phone: '', group: '', allowedCompanions: 0 };

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

  createGuest(): void {
    const eventId = this.getEventId();
    if (!eventId) return;
    this.guestSaving = true;
    this.guestError = '';
    this.guestMessage = '';
    this.api.createGuest({
      event: eventId,
      name: this.guestForm.name,
      email: this.guestForm.email || undefined,
      phone: this.guestForm.phone || undefined,
      group: this.guestForm.group || undefined,
      allowedCompanions: Number(this.guestForm.allowedCompanions || 0)
    }).subscribe({
      next: ({ guest }) => {
        this.guests = [guest, ...this.guests].sort((a, b) => a.name.localeCompare(b.name));
        this.guestForm = { name: '', email: '', phone: '', group: '', allowedCompanions: 0 };
        this.guestMessage = 'Invitado agregado.';
        this.guestSaving = false;
      },
      error: (error) => {
        this.guestError = error.error?.message || 'No se pudo agregar el invitado.';
        this.guestSaving = false;
      }
    });
  }

  selectImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedImportFile = input.files?.[0] || undefined;
    this.importMessage = this.selectedImportFile ? this.selectedImportFile.name : '';
  }

  importGuests(): void {
    const eventId = this.getEventId();
    if (!eventId || !this.selectedImportFile) return;
    this.importing = true;
    this.guestError = '';
    this.importMessage = '';
    this.api.importGuests(eventId, this.selectedImportFile).subscribe({
      next: (result) => {
        this.guests = [...result.guests, ...this.guests].sort((a, b) => a.name.localeCompare(b.name));
        this.importMessage = `Importados: ${result.imported}. Filas invalidas: ${result.invalidRows}.`;
        this.selectedImportFile = undefined;
        this.importing = false;
      },
      error: (error) => {
        this.guestError = error.error?.message || 'No se pudo importar el archivo.';
        this.importing = false;
      }
    });
  }

  getEventId(): string {
    return this.event?._id || this.event?.id || '';
  }

  getInvitationId(invitation: InvitationModel): string {
    return invitation._id || invitation.id || '';
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

  private slugify(value: string): string {
    return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
}
