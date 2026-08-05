import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import {
  DedicationSettings,
  EventModel,
  ExternalContent,
  GiftSettings,
  InvitationContent,
  InvitationModel,
  SectionSettings,
  SongRequestSettings
} from '../../core/models';

@Component({
  selector: 'app-new-invitation-sections',
  templateUrl: './new-invitation-sections.component.html'
})
export class NewInvitationSectionsComponent implements OnInit {
  invitation?: InvitationModel;
  event?: EventModel;
  loading = true;
  saving = false;
  error = '';
  message = '';

  sectionSettings: SectionSettings = {
    story: true,
    locations: true,
    itinerary: true,
    dressCode: true,
    rsvp: true,
    giftRegistry: true,
    digitalEnvelope: false,
    lodging: false,
    gallery: true,
    guestAlbum: true,
    dedications: true
  };

  giftSettings: GiftSettings = {
    enabled: true,
    showRegistry: true,
    showEnvelope: false,
    introText: 'Tu presencia es nuestro mejor regalo, pero si deseas hacer un detalle:'
  };

  dedicationSettings: DedicationSettings = {
    enabled: true,
    requireApproval: true,
    introText: 'Escríbenos un mensaje para recordar este día especial.'
  };

  songRequestSettings: SongRequestSettings = {
    enabled: true,
    maxRequestsPerGuest: 3,
    allowDedications: true,
    requireApproval: true
  };

  readonly allSectionsList = [
    { key: 'story', icon: '📖', title: 'Historia (Story)', description: 'Historia de los festejados / novios.' },
    { key: 'locations', icon: '📍', title: 'Mapas y Ubicaciones', description: 'Ubicación de Ceremonia, Recepción, etc.' },
    { key: 'itinerary', icon: '📅', title: 'Itinerario / Cronograma', description: 'Agenda y horarios de las actividades.' },
    { key: 'dressCode', icon: '👔', title: 'Código de Vestimenta', description: 'Instrucciones de vestuario para los invitados.' },
    { key: 'rsvp', icon: '💌', title: 'Confirmación de Asistencia (RSVP)', description: 'Formulario para confirmación de invitados.' },
    { key: 'giftRegistry', icon: '🎁', title: 'Mesa de Regalos', description: 'Sección con catálogo de regalos y enlaces.' },
    { key: 'digitalEnvelope', icon: '✉️', title: 'Sobre Digital / Transferencias', description: 'Datos bancarios o QR para regalo en efectivo.' },
    { key: 'lodging', icon: '🏨', title: 'Hospedaje y Hoteles', description: 'Recomendaciones de alojamiento cercano.' },
    { key: 'gallery', icon: '🖼️', title: 'Galería Fotográfica', description: 'Galería oficial de fotos del evento.' },
    { key: 'guestAlbum', icon: '📸', title: 'Álbum Interactivo de Invitados', description: 'Permite a los invitados subir sus propias fotos.' },
    { key: 'dedications', icon: '💬', title: 'Dedicatorias y Libro de Visitas', description: 'Libro de firmas y felicitaciones para los novios.' },
    { key: 'songRequests', icon: '🎵', title: 'Música / Pedir Canciones', description: 'Permite a los invitados recomendar canciones para el DJ.' }
  ];

  isSectionActive(key: string): boolean {
    if (key === 'songRequests') {
      return Boolean(this.songRequestSettings.enabled);
    }
    return Boolean((this.sectionSettings as any)[key]);
  }

  toggleSection(key: string): void {
    if (key === 'songRequests') {
      this.songRequestSettings.enabled = !this.songRequestSettings.enabled;
      return;
    }
    const current = Boolean((this.sectionSettings as any)[key]);
    const newValue = !current;
    (this.sectionSettings as any)[key] = newValue;

    if (key === 'giftRegistry') {
      this.giftSettings.enabled = newValue;
      this.giftSettings.showRegistry = newValue;
    } else if (key === 'digitalEnvelope') {
      this.giftSettings.showEnvelope = newValue;
    } else if (key === 'dedications') {
      this.dedicationSettings.enabled = newValue;
    } else if (key === 'guestAlbum') {
      if (this.invitation?.content) {
        this.invitation.content.privateAlbumEnabled = newValue;
      }
    }
  }

  get activeSections() {
    return this.allSectionsList.filter(sec => this.isSectionActive(sec.key));
  }

  get inactiveSections() {
    return this.allSectionsList.filter(sec => !this.isSectionActive(sec.key));
  }

  eventTypeIcon(type?: string): string {
    switch (type) {
      case 'boda': return '💍';
      case 'xv': return '👑';
      case 'bautizo': return '🕊️';
      case 'cumpleanos': return '🎂';
      case 'graduacion': return '🎓';
      case 'baby_shower': return '🍼';
      case 'corporativo': return '💼';
      default: return '🎉';
    }
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.loading = true;
    this.error = '';

    this.api.listInvitations().subscribe({
      next: ({ invitations }) => {
        this.invitation = invitations.find(item => this.getInvitationId(item) === id);
        if (!this.invitation) {
          this.error = 'Invitación no encontrada.';
          this.loading = false;
          return;
        }

        // Hydrate Section Settings
        if (this.invitation.content?.sectionSettings) {
          this.sectionSettings = { ...this.sectionSettings, ...this.invitation.content.sectionSettings };
        }

        // Hydrate Gift Settings
        if (this.invitation.content?.giftSettings) {
          this.giftSettings = { ...this.giftSettings, ...this.invitation.content.giftSettings };
        }

        // Hydrate Dedication Settings
        if (this.invitation.content?.dedicationSettings) {
          this.dedicationSettings = { ...this.dedicationSettings, ...this.invitation.content.dedicationSettings };
        }

        const eventId = typeof this.invitation.event === 'string'
          ? this.invitation.event
          : (this.invitation.event?._id || this.invitation.event?.id);

        if (eventId) {
          this.api.getEvent(eventId).subscribe({
            next: ({ event }) => {
              this.event = event;
              if (event.externalContent?.songRequestSettings) {
                this.songRequestSettings = { ...this.songRequestSettings, ...event.externalContent.songRequestSettings };
              }
              this.loading = false;
            },
            error: () => {
              this.loading = false;
            }
          });
        } else {
          this.loading = false;
        }
      },
      error: err => {
        this.error = err.error?.message || 'Error al cargar la invitación.';
        this.loading = false;
      }
    });
  }

  getInvitationId(invitation?: InvitationModel): string {
    return invitation?._id || invitation?.id || '';
  }

  getEventId(): string {
    if (!this.invitation) return '';
    if (typeof this.invitation.event === 'string') return this.invitation.event;
    return this.invitation.event?._id || this.invitation.event?.id || '';
  }

  private sanitizePayload<T>(obj: T): T {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizePayload(item)) as unknown as T;
    }
    if (obj !== null && typeof obj === 'object') {
      const cleaned: Record<string, unknown> = {};
      for (const key of Object.keys(obj as Record<string, unknown>)) {
        if (key !== '_id' && key !== 'id') {
          cleaned[key] = this.sanitizePayload((obj as Record<string, unknown>)[key]);
        }
      }
      return cleaned as T;
    }
    return obj;
  }

  save(): void {
    if (!this.invitation) return;
    const invId = this.getInvitationId(this.invitation);
    if (!invId) return;

    this.saving = true;
    this.error = '';
    this.message = '';

    const rawContent: InvitationContent = {
      ...this.invitation.content,
      sectionSettings: { ...this.sectionSettings },
      giftSettings: { ...this.giftSettings },
      dedicationSettings: { ...this.dedicationSettings }
    };

    const sanitizedContent = this.sanitizePayload(rawContent);

    this.api.updateInvitation(invId, { content: sanitizedContent }).subscribe({
      next: ({ invitation }) => {
        this.invitation = invitation;
        const eventId = this.getEventId();

        if (eventId) {
          const rawExternalContent: ExternalContent = {
            ...(this.event?.externalContent || {}),
            songRequestSettings: { ...this.songRequestSettings }
          };

          const sanitizedExternalContent = this.sanitizePayload(rawExternalContent);

          this.api.updateEvent(eventId, { externalContent: sanitizedExternalContent }).subscribe({
            next: ({ event }) => {
              this.event = event;
              this.saving = false;
              this.message = 'Secciones y configuraciones guardadas con éxito.';
            },
            error: err => {
              this.saving = false;
              this.error = err.error?.message || 'Error al actualizar la configuración del evento.';
            }
          });
        } else {
          this.saving = false;
          this.message = 'Secciones guardadas con éxito.';
        }
      },
      error: err => {
        this.saving = false;
        if (err.error?.details?.fieldErrors?.body) {
          this.error = `Error de validación: ${JSON.stringify(err.error.details.fieldErrors.body)}`;
        } else {
          this.error = err.error?.message || 'Error al actualizar la invitación.';
        }
      }
    });
  }

  goBack(): void {
    if (this.invitation) {
      this.router.navigate(['/new/invitations', this.getInvitationId(this.invitation), 'editor']);
    } else {
      this.router.navigate(['/new/events']);
    }
  }
}
