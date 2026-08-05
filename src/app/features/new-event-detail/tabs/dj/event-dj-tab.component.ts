import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiService } from '../../../../core/api.service';
import { SongRequestModel, SongRequestStatus } from '../../../../core/models';

@Component({
  selector: 'app-event-dj-tab',
  templateUrl: './event-dj-tab.component.html'
})
export class EventDjTabComponent implements OnInit, OnChanges {
  @Input() eventId!: string;

  songRequests: SongRequestModel[] = [];
  loadingDj = false;
  djError = '';
  djMessage = '';

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

  constructor(
    private apiService: ApiService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    if (this.eventId) {
      this.loadSongRequests();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['eventId'] && !changes['eventId'].firstChange && this.eventId) {
      this.loadSongRequests();
    }
  }

  loadSongRequests(): void {
    this.loadingDj = true;
    this.apiService.listSongRequests(this.eventId).subscribe({
      next: res => {
        this.songRequests = res.songRequests || [];
        this.loadingDj = false;
      },
      error: err => {
        this.djError = err?.error?.message || 'Error al cargar solicitudes de DJ';
        this.loadingDj = false;
      }
    });
  }

  updateSongRequest(sr: SongRequestModel, status: SongRequestStatus): void {
    const srId = (sr._id || sr.id)!;
    this.apiService.updateSongRequest(this.eventId, srId, status).subscribe({
      next: res => {
        sr.status = res.songRequest.status;
        this.djMessage = `Canción "${sr.title}" marcada como ${status}`;
      },
      error: err => {
        this.djError = err?.error?.message || 'Error al actualizar estado de la canción';
      }
    });
  }

  moveSongRequest(sr: SongRequestModel, direction: number): void {
    const idx = this.songRequests.indexOf(sr);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= this.songRequests.length) return;

    const temp = this.songRequests[idx];
    this.songRequests[idx] = this.songRequests[newIdx];
    this.songRequests[newIdx] = temp;
  }

  playSong(sr: SongRequestModel): void {
    const isSpotify = sr.sourceUrl?.includes('spotify.com') || false;
    let embedUrl: SafeResourceUrl | null = null;
    let isDirectAudio = false;

    if (sr.previewUrl || (sr.sourceUrl && (sr.sourceUrl.endsWith('.mp3') || sr.sourceUrl.endsWith('.wav')))) {
      isDirectAudio = true;
    } else if (sr.sourceUrl?.includes('youtube.com/watch')) {
      const videoId = sr.sourceUrl.split('v=')[1]?.split('&')[0];
      if (videoId) {
        embedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${videoId}?autoplay=1`);
      }
    } else if (isSpotify && sr.sourceUrl) {
      const parts = sr.sourceUrl.split('track/');
      if (parts[1]) {
        const trackId = parts[1].split('?')[0];
        embedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`https://open.spotify.com/embed/track/${trackId}`);
      }
    }

    this.activePlayingSong = {
      title: sr.title,
      artist: sr.artist,
      thumbnailUrl: sr.thumbnailUrl,
      sourceUrl: sr.sourceUrl,
      embedUrl: embedUrl,
      previewUrl: sr.previewUrl,
      isDirectAudio: isDirectAudio,
      isSpotify: isSpotify
    };
  }

  closePlayer(): void {
    this.activePlayingSong = undefined;
  }
}
