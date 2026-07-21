import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AlbumAssetModel, DedicationModel, EventModel, GuestAccessResponse, RsvpResponse, SongRequestModel } from '../../core/models';

@Component({
  selector: 'app-new-external-portal',
  templateUrl: './new-external-portal.component.html',
  styleUrls: ['./new-external-portal.component.css']
})
export class NewExternalPortalComponent implements OnInit, OnDestroy {
  event?: EventModel;
  albumAssets: AlbumAssetModel[] = [];
  myAlbumUploads: AlbumAssetModel[] = [];
  mySongRequests: SongRequestModel[] = [];
  dedications: DedicationModel[] = [];
  myDedications: DedicationModel[] = [];
  guest?: GuestAccessResponse['guest'];
  guestSessionToken = '';
  identifier = '';
  identifierMode: 'email' | 'phone' | 'token' = 'email';
  companionNamesText = '';
  song = { query: '', title: '', artist: '', dedication: '', sourceUrl: '' };
  dedication = { publicName: '', message: '', type: 'dedication' };
  songPreview?: Partial<SongRequestModel>;
  rsvp = { response: 'confirmed' as RsvpResponse, companions: 0, mealPreference: '', dietaryRestrictions: '', menuSelection: '', message: '' };
  selectedAlbumFile?: File;
  loading = false;
  sending = false;
  error = '';
  message = '';
  private albumTimer?: ReturnType<typeof setInterval>;
  private statusTimer?: ReturnType<typeof setInterval>;
  private dedicationTimer?: ReturnType<typeof setInterval>;

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.api.getExternalConfig(this.portalSlug).subscribe({
      next: ({ event }) => {
        this.event = event;
        this.loadToken();
        
        // Load public data initially
        this.loadAlbum();
        this.loadDedications();
        
        // Start polling for real-time updates
        this.startAlbumPolling();
        this.startDedicationPolling();
        
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Portal no disponible.';
        this.loading = false;
      }
    });
  }

  identify(): void {
    const value = this.identifier.trim();
    if (!value) return;
    this.error = '';
    this.message = '';
    const payload = this.identifierMode === 'email' ? { email: value } : this.identifierMode === 'phone' ? { phone: value } : { token: value };
    this.api.identifyExternalGuest(this.portalSlug, payload).subscribe({
      next: ({ guest, guestSessionToken }) => {
        this.guest = guest;
        this.guestSessionToken = guestSessionToken || '';
        this.message = `¡Hola ${guest.name}! Te has identificado correctamente.`;
        this.loadMyStatus();
        this.startStatusPolling();
      },
      error: (error) => this.error = error.error?.message || 'No pudimos identificarte en la lista de invitados.'
    });
  }

  submitRsvp(): void {
    if (!this.guest) {
      this.error = 'Identifícate antes de confirmar.';
      return;
    }
    this.sending = true;
    this.error = '';
    this.message = '';
    this.api.submitExternalApiRsvp(this.portalSlug, {
      guest: this.guest.id,
      name: this.guest.name,
      email: this.guest.email,
      response: this.rsvp.response,
      companions: this.rsvp.response === 'confirmed' ? Number(this.rsvp.companions || 0) : 0,
      companionNames: this.rsvp.response === 'confirmed' ? this.companionNames : [],
      mealPreference: this.rsvp.mealPreference,
      dietaryRestrictions: this.rsvp.dietaryRestrictions,
      menuSelection: this.rsvp.menuSelection,
      message: this.rsvp.message
    }).subscribe({
      next: () => {
        this.message = 'Respuesta de RSVP registrada correctamente.';
        this.sending = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo confirmar.';
        this.sending = false;
      }
    });
  }

  selectAlbumFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedAlbumFile = input.files?.[0] || undefined;
  }

  uploadAlbum(): void {
    if (!this.selectedAlbumFile) return;
    this.sending = true;
    this.error = '';
    this.message = '';
    this.api.uploadPublicExternalAlbumPhoto(this.portalSlug, {
      file: this.selectedAlbumFile,
      name: this.guest?.name || 'Invitado Anónimo',
      email: this.guest?.email,
      guest: this.guest?.id,
      guestSessionToken: this.guestSessionToken
    }).subscribe({
      next: ({ asset }) => {
        this.message = 'Foto enviada para revisión de los anfitriones.';
        this.myAlbumUploads = [asset, ...this.myAlbumUploads.filter((item) => item.id !== asset.id && item._id !== asset._id)];
        this.selectedAlbumFile = undefined;
        this.sending = false;
        this.loadMyStatus();
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo subir la foto.';
        this.sending = false;
      }
    });
  }

  requestSong(): void {
    if (!this.song.title.trim() && !this.song.query.trim() && !this.song.sourceUrl.trim()) return;
    this.sending = true;
    this.error = '';
    this.message = '';
    this.api.createExternalSongRequest(this.portalSlug, {
      guest: this.guest?.id,
      requesterName: this.guest?.name || 'Invitado',
      requesterEmail: this.guest?.email,
      title: this.song.title || this.songPreview?.title,
      artist: this.song.artist,
      query: this.song.query,
      sourceUrl: this.song.sourceUrl || this.songPreview?.sourceUrl,
      dedication: this.song.dedication
    }).subscribe({
      next: ({ songRequest }) => {
        this.message = 'Canción solicitada correctamente al DJ.';
        this.mySongRequests = [songRequest, ...this.mySongRequests.filter((item) => item.id !== songRequest.id && item._id !== songRequest._id)];
        this.song = { query: '', title: '', artist: '', dedication: '', sourceUrl: '' };
        this.songPreview = undefined;
        this.sending = false;
        this.loadMyStatus();
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo solicitar la canción.';
        this.sending = false;
      }
    });
  }

  submitDedication(): void {
    const message = this.dedication.message.trim();
    if (!message) return;
    this.sending = true;
    this.error = '';
    this.message = '';
    this.api.createExternalDedication(this.portalSlug, {
      guest: this.guest?.id,
      publicName: this.dedication.publicName || this.guest?.name || 'Invitado',
      email: this.guest?.email,
      message,
      type: this.dedication.type
    }, this.guestSessionToken).subscribe({
      next: ({ dedication }) => {
        this.message = 'Dedicatoria enviada para revisión.';
        this.myDedications = [dedication, ...this.myDedications.filter((item) => item.id !== dedication.id && item._id !== dedication._id)];
        this.dedication = { publicName: '', message: '', type: 'dedication' };
        this.sending = false;
        this.loadMyStatus();
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo enviar la dedicatoria.';
        this.sending = false;
      }
    });
  }

  lookupSong(): void {
    const value = this.song.query.trim();
    const sourceUrl = /^https?:\/\//i.test(value) ? value : this.song.sourceUrl.trim();
    const query = sourceUrl ? '' : value;
    if (!sourceUrl && !query && !this.song.title.trim()) return;
    this.sending = true;
    this.error = '';
    this.message = '';
    this.api.lookupExternalSong(this.portalSlug, {
      query,
      url: sourceUrl || undefined,
      title: this.song.title,
      artist: this.song.artist
    }).subscribe({
      next: ({ song }) => {
        this.songPreview = song;
        this.song.title = song.title || this.song.title;
        this.song.artist = song.artist || this.song.artist;
        this.song.sourceUrl = song.sourceUrl || sourceUrl;
        this.message = 'Canción identificada. Haz clic en "Solicitar" para enviarla.';
        this.sending = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo identificar la canción.';
        this.sending = false;
      }
    });
  }

  loadAlbum(): void {
    if (this.event?.externalPortalSettings?.albumEnabled === false) return;
    this.api.listPublicExternalAlbum(this.portalSlug).subscribe({
      next: ({ assets }) => this.albumAssets = assets,
      error: () => this.albumAssets = []
    });
  }

  loadDedications(): void {
    if (this.event?.externalContent?.dedicationSettings?.enabled === false) return;
    this.api.listExternalDedications(this.portalSlug).subscribe({
      next: ({ dedications }) => this.dedications = dedications,
      error: () => this.dedications = []
    });
  }

  loadMyStatus(): void {
    if (!this.guestSessionToken) return;
    this.api.getExternalGuestStatus(this.portalSlug, this.guestSessionToken).subscribe({
      next: ({ guest, rsvp, albumUploads, songRequests, dedications }) => {
        this.guest = guest;
        if (rsvp) {
          this.rsvp.response = rsvp.response;
          this.rsvp.companions = rsvp.companions || 0;
          this.companionNamesText = (rsvp.companionNames || []).join('\n');
          this.rsvp.mealPreference = rsvp.mealPreference || '';
          this.rsvp.dietaryRestrictions = rsvp.dietaryRestrictions || '';
          this.rsvp.menuSelection = rsvp.menuSelection || '';
          this.rsvp.message = rsvp.message || '';
        }
        this.myAlbumUploads = albumUploads || [];
        this.mySongRequests = songRequests || [];
        this.myDedications = dedications || [];
      },
      error: () => {
        this.stopStatusPolling();
      }
    });
  }

  statusLabel(status?: string): string {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      approved: 'Aprobado',
      rejected: 'Rechazado',
      played: 'Tocada'
    };
    return labels[status || ''] || status || '';
  }

  get companionNames(): string[] {
    return this.companionNamesText.split('\n').map((name) => name.trim()).filter(Boolean);
  }

  get locations(): any[] {
    return this.event?.externalContent?.locations || [];
  }

  get portalSlug(): string {
    return this.route.snapshot.paramMap.get('portalSlug') || '';
  }

  get portalUrl(): string {
    return `${window.location.origin}/new/e/${this.portalSlug}`;
  }

  get qrUrl(): string {
    const value = this.guest?.checkInCode || this.guest?.qrCode || '';
    return value ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(value)}` : '';
  }

  get calendarUrl(): string {
    if (!this.event?.date) return '';
    const start = new Date(this.event.date);
    if (Number.isNaN(start.getTime())) return '';
    const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
    const format = (date: Date) => date.toISOString().replace(/[-:]|\.\d{3}/g, '');
    const location = [this.event.venue?.name, this.event.venue?.address].filter(Boolean).join(' - ');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(this.event.title)}&dates=${format(start)}/${format(end)}&details=${encodeURIComponent(this.portalUrl)}&location=${encodeURIComponent(location)}`;
  }

  private loadToken(): void {
    const token = this.route.snapshot.queryParamMap.get('t');
    if (!token) return;
    this.identifier = token;
    this.identifierMode = 'token';
    this.identify();
  }

  private startAlbumPolling(): void {
    if (this.albumTimer) return;
    this.albumTimer = setInterval(() => this.loadAlbum(), 15000);
  }

  private startStatusPolling(): void {
    if (this.statusTimer) return;
    this.statusTimer = setInterval(() => this.loadMyStatus(), 10000);
  }

  private startDedicationPolling(): void {
    if (this.dedicationTimer) return;
    this.dedicationTimer = setInterval(() => this.loadDedications(), 15000);
  }

  private stopStatusPolling(): void {
    if (this.statusTimer) clearInterval(this.statusTimer);
    this.statusTimer = undefined;
  }

  private stopPolling(): void {
    if (this.albumTimer) clearInterval(this.albumTimer);
    this.albumTimer = undefined;
    if (this.dedicationTimer) clearInterval(this.dedicationTimer);
    this.dedicationTimer = undefined;
    this.stopStatusPolling();
  }
}
