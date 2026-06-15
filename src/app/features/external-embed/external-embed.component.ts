import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AlbumAssetModel, EventModel, GuestAccessResponse, RsvpResponse } from '../../core/models';

@Component({ selector: 'app-external-embed', templateUrl: './external-embed.component.html' })
export class ExternalEmbedComponent implements OnInit {
  event?: EventModel;
  albumAssets: AlbumAssetModel[] = [];
  guest?: GuestAccessResponse['guest'];
  identifier = '';
  identifierMode: 'email' | 'phone' | 'token' = 'email';
  companionNamesText = '';
  song = { title: '', artist: '', dedication: '' };
  rsvp = { response: 'confirmed' as RsvpResponse, companions: 0, mealPreference: '', dietaryRestrictions: '', menuSelection: '', message: '' };
  selectedAlbumFile?: File;
  loading = false;
  sending = false;
  error = '';
  message = '';

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.getExternalConfig(this.portalSlug).subscribe({
      next: ({ event }) => {
        this.event = event;
        this.loadToken();
        if (['album', 'gallery', 'full-portal'].includes(this.widget)) this.loadAlbum();
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
      next: ({ guest }) => {
        this.guest = guest;
        this.message = `Hola ${guest.name}.`;
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
      guest: this.guest?.id
    }).subscribe({
      next: () => {
        this.message = 'Foto enviada para revision.';
        this.selectedAlbumFile = undefined;
        this.sending = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo subir la foto.';
        this.sending = false;
      }
    });
  }

  requestSong(): void {
    if (!this.song.title.trim()) return;
    this.sending = true;
    this.api.createExternalSongRequest(this.portalSlug, {
      guest: this.guest?.id,
      requesterName: this.guest?.name,
      requesterEmail: this.guest?.email,
      title: this.song.title,
      artist: this.song.artist,
      dedication: this.song.dedication
    }).subscribe({
      next: () => {
        this.message = 'Cancion solicitada.';
        this.song = { title: '', artist: '', dedication: '' };
        this.sending = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo solicitar la cancion.';
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
}
