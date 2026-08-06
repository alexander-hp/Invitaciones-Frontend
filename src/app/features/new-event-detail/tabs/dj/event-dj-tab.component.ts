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
  showAddForm = false;
  adding = false;
  newSong = {
    title: '',
    artist: '',
    sourceUrl: '',
    dedication: ''
  };

  getYouTubeVideoId(url: string): string {
    if (!url) return '';
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
    return match ? match[1] : '';
  }

  getYouTubeThumbnail(url: string): string {
    const videoId = this.getYouTubeVideoId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';
  }

  addSongInternal(): void {
    if (!this.newSong.title.trim() && !this.newSong.sourceUrl.trim()) return;
    this.adding = true;
    const ytId = this.getYouTubeVideoId(this.newSong.sourceUrl);
    const sourceUrl = this.newSong.sourceUrl.trim();
    const title = this.newSong.title.trim() || (ytId ? 'Canción de YouTube' : (sourceUrl || 'Canción agregada'));
    const artist = this.newSong.artist.trim() || (ytId ? 'YouTube' : '');

    const newRequest: SongRequestModel = {
      _id: 'temp_' + Date.now(),
      event: this.eventId,
      title,
      artist,
      sourceUrl,
      sourceProvider: ytId ? 'youtube' : 'manual',
      thumbnailUrl: ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : undefined,
      dedication: this.newSong.dedication,
      requesterName: 'DJ (Interno)',
      status: 'approved',
      createdAt: new Date().toISOString()
    };

    this.songRequests = [newRequest, ...this.songRequests];
    this.djMessage = `Canción "${title}" agregada a la lista ✅`;
    this.newSong = { title: '', artist: '', sourceUrl: '', dedication: '' };
    this.showAddForm = false;
    this.adding = false;
  }

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
