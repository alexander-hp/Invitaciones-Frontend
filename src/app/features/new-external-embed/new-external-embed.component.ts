import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AlbumAssetModel, DedicationModel, EventModel, GuestAccessResponse, RsvpResponse, SongRequestModel } from '../../core/models';

@Component({
  selector: 'app-new-external-embed',
  templateUrl: './new-external-embed.component.html',
  styleUrls: ['./new-external-embed.component.css']
})
export class NewExternalEmbedComponent implements OnInit, OnDestroy {
  activePlayingSong?: {
    title: string;
    artist?: string;
    thumbnailUrl?: string;
    sourceUrl?: string;
    embedUrl?: SafeResourceUrl | null;
    previewUrl?: string;
    isDirectAudio?: boolean;
    isSpotify?: boolean;
  };

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

  constructor(private route: ActivatedRoute, private api: ApiService, private sanitizer: DomSanitizer) {}

  playSong(request?: Partial<SongRequestModel> | SongRequestModel): void {
    if (!request) return;
    const sourceUrl = request.sourceUrl || '';
    const previewUrl = request.previewUrl || '';
    const { embedUrl, isDirectAudio, isSpotify } = this.parseSongEmbedUrl(sourceUrl, previewUrl);
    this.activePlayingSong = {
      title: request.title || 'Canción',
      artist: request.artist || '',
      thumbnailUrl: request.thumbnailUrl || '',
      sourceUrl,
      previewUrl,
      embedUrl,
      isDirectAudio,
      isSpotify
    };
  }

  closePlayer(): void {
    this.activePlayingSong = undefined;
  }

  private parseSongEmbedUrl(sourceUrl?: string, previewUrl?: string): { embedUrl: SafeResourceUrl | null; isDirectAudio: boolean; isSpotify: boolean } {
    const url = sourceUrl || previewUrl || '';
    if (!url) return { embedUrl: null, isDirectAudio: false, isSpotify: false };

    if (/\.(mp3|wav|ogg|m4a)(\?.*)?$/i.test(url) || (previewUrl && !sourceUrl)) {
      return { embedUrl: this.sanitizer.bypassSecurityTrustResourceUrl(url), isDirectAudio: true, isSpotify: false };
    }

    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
    if (ytMatch && ytMatch[1]) {
      const embedStr = `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&enablejsapi=1`;
      return { embedUrl: this.sanitizer.bypassSecurityTrustResourceUrl(embedStr), isDirectAudio: false, isSpotify: false };
    }

    const spMatch = url.match(/spotify\.com\/(?:intl-[a-z]+\/)?track\/([a-zA-Z0-9]+)/i);
    if (spMatch && spMatch[1]) {
      const embedStr = `https://open.spotify.com/embed/track/${spMatch[1]}?utm_source=generator&theme=0`;
      return { embedUrl: this.sanitizer.bypassSecurityTrustResourceUrl(embedStr), isDirectAudio: false, isSpotify: true };
    }

    if (/^https?:\/\//i.test(url)) {
      return { embedUrl: this.sanitizer.bypassSecurityTrustResourceUrl(url), isDirectAudio: false, isSpotify: false };
    }

    return { embedUrl: null, isDirectAudio: false, isSpotify: false };
  }

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
        if (['dedications', 'full-details', 'full-portal'].includes(this.widget)) {
          this.loadDedications();
          this.startDedicationPolling();
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
      this.error = 'Identifícate antes de confirmar.';
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
        this.message = 'Respuesta registrada correctamente.';
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
        this.message = 'Foto enviada para revisión.';
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
        this.message = 'Canción solicitada.';
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
    this.api.createExternalDedication(this.portalSlug, {
      guest: this.guest?.id,
      publicName: this.dedication.publicName || this.guest?.name,
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
        this.message = 'Canción identificada. Revisa y solicita.';
        this.sending = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo identificar la canción.';
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

  loadDedications(): void {
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

  get showIdentity(): boolean {
    return ['rsvp', 'guest-pass', 'song-requests', 'dedications', 'full-portal'].includes(this.widget);
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
