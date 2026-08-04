import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AlbumAssetModel, EventAccessSession, GuestModel, SongRequestModel, SongRequestStatus } from '../../core/models';

@Component({ selector: 'app-event-access', templateUrl: './event-access.component.html' })
export class EventAccessComponent implements OnInit {
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

  session?: EventAccessSession;
  loading = false;
  checking = false;
  code = '';
  search = '';
  message = '';
  error = '';

  constructor(private route: ActivatedRoute, private api: ApiService, private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (!this.token) return;
    this.loading = true;
    this.error = '';
    this.api.getEventAccessSession(this.token).subscribe({
      next: (session) => {
        this.session = session;
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Link no disponible.';
        this.loading = false;
      }
    });
  }

  checkIn(): void {
    const code = this.code.trim();
    if (!code) return;
    this.checking = true;
    this.message = '';
    this.error = '';
    this.api.eventAccessCheckIn(this.token, code).subscribe({
      next: ({ guest }) => {
        if (this.session) {
          this.session.guests = this.session.guests.map((item) => this.getGuestId(item) === this.getGuestId(guest) ? guest : item);
        }
        this.message = `${guest.name} registrado.`;
        this.code = '';
        this.checking = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo registrar.';
        this.checking = false;
      }
    });
  }

  updateAlbum(asset: AlbumAssetModel, status: AlbumAssetModel['status']): void {
    const assetId = asset._id || asset.id || '';
    if (!assetId) return;
    this.api.updateEventAccessAlbum(this.token, assetId, status).subscribe({
      next: ({ asset: updated }) => {
        if (this.session) this.session.albumAssets = this.session.albumAssets.map((item) => (item._id || item.id) === assetId ? updated : item);
        this.message = 'Album actualizado.';
      },
      error: (error) => this.error = error.error?.message || 'No se pudo actualizar album.'
    });
  }

  playSong(request: Partial<SongRequestModel> | SongRequestModel): void {
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

  updateSong(songRequest: SongRequestModel, status: SongRequestStatus): void {
    const songRequestId = songRequest._id || songRequest.id || '';
    if (!songRequestId) return;
    if (status === 'played') {
      this.playSong(songRequest);
    }
    this.api.updateEventAccessSong(this.token, songRequestId, status).subscribe({
      next: ({ songRequest: updated }) => {
        if (this.session && this.session.songRequests) {
          this.session.songRequests = this.session.songRequests.map((item) => (item._id || item.id) === songRequestId ? updated : item);
        }
        this.message = 'Solicitud DJ actualizada.';
      },
      error: (error) => this.error = error.error?.message || 'No se pudo actualizar DJ.'
    });
  }

  hasPermission(permission: string): boolean {
    return Boolean(this.session?.permissions?.includes(permission));
  }

  get filteredGuests(): GuestModel[] {
    const query = this.search.toLowerCase().trim();
    const guests = this.session?.guests || [];
    if (!query) return guests;
    return guests.filter((guest) => [guest.name, guest.group, guest.tableName, guest.checkInCode].some((value) => (value || '').toLowerCase().includes(query)));
  }

  get checkedInCount(): number {
    return (this.session?.guests || []).filter((guest) => guest.checkedIn).length;
  }

  getGuestId(guest: GuestModel): string {
    return guest._id || guest.id || '';
  }

  private get token(): string {
    return this.route.snapshot.paramMap.get('token') || '';
  }
}
