import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AlbumAssetModel, EventModel, GuestAccessResponse, RsvpResponse, SongRequestModel } from '../../core/models';

@Component({ selector: 'app-external-embed', templateUrl: './external-embed.component.html' })
export class ExternalEmbedComponent implements OnInit, OnDestroy {
  event?: EventModel;
  albumAssets: AlbumAssetModel[] = [];
  myAlbumUploads: AlbumAssetModel[] = [];
  mySongRequests: SongRequestModel[] = [];
  guest?: GuestAccessResponse['guest'];
  guestSessionToken = '';
  identifier = '';
  identifierMode: 'email' | 'phone' | 'token' = 'email';
  companionNamesText = '';
  song = { query: '', title: '', artist: '', dedication: '', sourceUrl: '' };
  songPreview?: Partial<SongRequestModel>;
  rsvp = { response: 'confirmed' as RsvpResponse, companions: 0, mealPreference: '', dietaryRestrictions: '', menuSelection: '', message: '' };
  selectedAlbumFile?: File;
  loading = false;
  sending = false;
  error = '';
  message = '';
  private albumTimer?: ReturnType<typeof setInterval>;
  private statusTimer?: ReturnType<typeof setInterval>;

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  load(): void {
    this.loading = true;
    this.api.getExternalConfig(this.portalSlug).subscribe({
      next: ({ event }) => {
        this.event = event;
        this.loadToken();
        if (['album', 'gallery', 'full-portal'].includes(this.widget)) {
          this.loadAlbum();
          this.startAlbumPolling();
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Widget no disponible.';
        this.loading = false;
      }
    });
  }

  identify(): void {
    const value = this.identifier.trim();
    if (!value) return;
    this.error = '';
    const payload = this.identifierMode === 'email' ? { email: value } : this.identifierMode === 'phone' ? { phone: value } : { token: value };
    this.api.identifyExternalGuest(this.portalSlug, payload).subscribe({
      next: ({ guest, guestSessionToken }) => {
        this.guest = guest;
        this.guestSessionToken = guestSessionToken || '';
        this.message = `Hola ${guest.name}.`;
        this.loadMyStatus();
        this.startStatusPolling();
      },
      error: (error) => this.error = error.error?.message || 'No pudimos identificarte.'
    });
  }

  submitRsvp(): void {
    if (!this.guest) {
      this.error = 'Identificate antes de confirmar.';
      return;
    }
    this.sending = true;
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
        this.message = 'Respuesta registrada.';
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
    this.api.uploadPublicExternalAlbumPhoto(this.portalSlug, {
      file: this.selectedAlbumFile,
      name: this.guest?.name,
      email: this.guest?.email,
      guest: this.guest?.id,
      guestSessionToken: this.guestSessionToken
    }).subscribe({
      next: ({ asset }) => {
        this.message = 'Foto enviada para revision.';
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
    this.api.createExternalSongRequest(this.portalSlug, {
      guest: this.guest?.id,
      requesterName: this.guest?.name,
      requesterEmail: this.guest?.email,
      title: this.song.title || this.songPreview?.title,
      artist: this.song.artist,
      query: this.song.query,
      sourceUrl: this.song.sourceUrl || this.songPreview?.sourceUrl,
      dedication: this.song.dedication
    }).subscribe({
      next: ({ songRequest }) => {
        this.message = 'Cancion solicitada.';
        this.mySongRequests = [songRequest, ...this.mySongRequests.filter((item) => item.id !== songRequest.id && item._id !== songRequest._id)];
        this.song = { query: '', title: '', artist: '', dedication: '', sourceUrl: '' };
        this.songPreview = undefined;
        this.sending = false;
        this.loadMyStatus();
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo solicitar la cancion.';
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
        this.message = 'Cancion identificada. Revisa y solicita.';
        this.sending = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo identificar la cancion.';
        this.sending = false;
      }
    });
  }

  loadAlbum(): void {
    this.api.listPublicExternalAlbum(this.portalSlug).subscribe({
      next: ({ assets }) => this.albumAssets = assets,
      error: () => this.albumAssets = []
    });
  }

  loadMyStatus(): void {
    if (!this.guestSessionToken) return;
    this.api.getExternalGuestStatus(this.portalSlug, this.guestSessionToken).subscribe({
      next: ({ guest, rsvp, albumUploads, songRequests }) => {
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

  get showIdentity(): boolean {
    return ['rsvp', 'guest-pass', 'song-requests', 'full-portal'].includes(this.widget);
  }

  get locations(): any[] {
    return this.event?.externalContent?.locations || [];
  }

  get widget(): string {
    return this.route.snapshot.paramMap.get('widget') || 'full-portal';
  }

  get portalSlug(): string {
    return this.route.snapshot.paramMap.get('portalSlug') || '';
  }

  get qrUrl(): string {
    const value = this.guest?.checkInCode || this.guest?.qrCode || '';
    return value ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(value)}` : '';
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

  private stopStatusPolling(): void {
    if (this.statusTimer) clearInterval(this.statusTimer);
    this.statusTimer = undefined;
  }

  private stopPolling(): void {
    if (this.albumTimer) clearInterval(this.albumTimer);
    this.albumTimer = undefined;
    this.stopStatusPolling();
  }
}
