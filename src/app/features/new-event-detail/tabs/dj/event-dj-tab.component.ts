import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../../../core/api.service';
import { SongRequestModel, SongRequestStatus } from '../../../../core/models';

export interface YouTubeSearchResult {
  title: string;
  artist: string;
  sourceUrl: string;
  videoId?: string;
  thumbnailUrl: string;
  previewUrl?: string;
}

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

  // Search & Filter state
  searchQuery = '';
  searching = false;
  searchResults: YouTubeSearchResult[] = [];

  songFilter: 'all' | 'pending' | 'approved' | 'played' | 'rejected' = 'all';
  songSearch = '';

  newSong = {
    title: '',
    artist: '',
    sourceUrl: '',
    dedication: ''
  };

  get filteredSongRequests(): SongRequestModel[] {
    const requests = this.songRequests || [];
    const query = this.songSearch.toLowerCase().trim();

    return requests.filter((song: SongRequestModel) => {
      if (this.songFilter !== 'all' && song.status !== this.songFilter) {
        return false;
      }
      if (!query) return true;
      const requesterName = typeof song.guest === 'object' ? song.guest?.name : song.requesterName;
      return [song.title, song.artist, song.dedication, requesterName].some((val) =>
        (val || '').toLowerCase().includes(query)
      );
    });
  }

  get songPendingCount(): number {
    return (this.songRequests || []).filter((s: SongRequestModel) => s.status === 'pending').length;
  }

  get songApprovedCount(): number {
    return (this.songRequests || []).filter((s: SongRequestModel) => s.status === 'approved').length;
  }

  get songPlayedCount(): number {
    return (this.songRequests || []).filter((s: SongRequestModel) => s.status === 'played').length;
  }

  get songRejectedCount(): number {
    return (this.songRequests || []).filter((s: SongRequestModel) => s.status === 'rejected').length;
  }

  setFilter(filter: 'all' | 'pending' | 'approved' | 'played' | 'rejected'): void {
    this.songFilter = filter;
  }

  getYouTubeVideoId(url: string): string {
    if (!url) return '';
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
    return match ? match[1] : '';
  }

  getYouTubeThumbnail(url: string): string {
    const videoId = this.getYouTubeVideoId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';
  }

  searchYouTube(): void {
    const query = this.searchQuery.trim();
    if (!query) return;

    this.searching = true;
    this.searchResults = [];
    this.djError = '';
    this.djMessage = '';

    const ytId = this.getYouTubeVideoId(query);
    if (ytId) {
      this.fetchOembedByVideoId(ytId);
      return;
    }

    // Search via iTunes Search API to get exact Song Title, Artist Name, Cover Art & 30s Audio Preview
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=8`;
    this.http.get<any>(itunesUrl).subscribe({
      next: (res) => {
        const items = res?.results || [];
        const results: YouTubeSearchResult[] = items.map((item: any) => {
          const title = item.trackName || query;
          const artist = item.artistName || '';
          const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(artist + ' ' + title)}`;
          const artwork = item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '300x300bb') : '';
          return {
            title,
            artist,
            sourceUrl: ytSearchUrl,
            thumbnailUrl: artwork,
            previewUrl: item.previewUrl
          };
        });

        if (results.length > 0) {
          this.searchResults = results;
          this.selectSearchResult(results[0]);
          this.searching = false;
          // Resolve exact YouTube video URL in the background for selected song
          this.resolveYouTubeVideoUrl(results[0]);
        } else {
          this.fallbackSearch(query);
        }
      },
      error: () => {
        this.fallbackSearch(query);
      }
    });
  }

  resolveYouTubeVideoUrl(song: YouTubeSearchResult): void {
    if (!song.title) return;
    const searchTerm = `${song.artist} ${song.title}`.trim();
    
    // First try via backend lookup
    this.apiService.lookupYouTubeVideo(this.eventId, searchTerm).subscribe({
      next: (res) => {
        if (res?.video?.sourceUrl) {
          song.videoId = res.video.videoId;
          song.sourceUrl = res.video.sourceUrl;
          if (this.newSong.title === song.title) {
            this.newSong.sourceUrl = song.sourceUrl;
          }
          return;
        }
        // Fallback to Piped API
        this.resolveViaPiped(song, searchTerm);
      },
      error: () => {
        this.resolveViaPiped(song, searchTerm);
      }
    });
  }

  private resolveViaPiped(song: YouTubeSearchResult, searchTerm: string): void {
    const searchUrl = `https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(searchTerm)}&filter=all`;
    this.http.get<any>(searchUrl).subscribe({
      next: (res) => {
        const items = res?.items || [];
        const streamItem = items.find((item: any) => item.type === 'stream' || item.url?.includes('/watch?v='));
        if (streamItem && streamItem.url) {
          const vId = streamItem.url.replace('/watch?v=', '');
          song.videoId = vId;
          song.sourceUrl = `https://www.youtube.com/watch?v=${vId}`;
          if (this.newSong.title === song.title) {
            this.newSong.sourceUrl = song.sourceUrl;
          }
        }
      },
      error: () => {}
    });
  }

  resolveFormYouTubeUrl(): void {
    const searchTerm = `${this.newSong.artist} ${this.newSong.title}`.trim();
    if (!searchTerm) return;
    const tempSong: YouTubeSearchResult = {
      title: this.newSong.title,
      artist: this.newSong.artist,
      sourceUrl: '',
      thumbnailUrl: ''
    };
    this.resolveYouTubeVideoUrl(tempSong);
  }

  fetchOembedByVideoId(videoId: string): void {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;

    this.http.get<any>(oembedUrl).subscribe({
      next: (data) => {
        let rawTitle = data.title || 'Canción de YouTube';
        let artist = data.author_name || '';

        // Clean up common YouTube title tags like (Official Video) or [HD]
        let cleanTitle = rawTitle.replace(/\s*\([^)]*(?:official|video|audio|hd|4k|lyric|remastered)[^)]*\)/gi, '').trim();
        cleanTitle = cleanTitle.replace(/\s*\[[^\]]*(?:official|video|audio|hd|4k|lyric|remastered)[^\]]*\]/gi, '').trim();

        let title = cleanTitle;
        if (cleanTitle.includes(' - ')) {
          const parts = cleanTitle.split(' - ');
          artist = parts[0].trim();
          title = parts.slice(1).join(' - ').trim();
        } else if (cleanTitle.includes(' – ')) {
          const parts = cleanTitle.split(' – ');
          artist = parts[0].trim();
          title = parts.slice(1).join(' – ').trim();
        }

        const song: YouTubeSearchResult = {
          title,
          artist,
          sourceUrl: videoUrl,
          videoId,
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        };

        this.searchResults = [song];
        this.selectSearchResult(song);
        this.searching = false;
      },
      error: () => {
        const song: YouTubeSearchResult = {
          title: 'Canción de YouTube',
          artist: '',
          sourceUrl: videoUrl,
          videoId,
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        };
        this.searchResults = [song];
        this.selectSearchResult(song);
        this.searching = false;
      }
    });
  }

  fallbackSearch(query: string): void {
    const song: YouTubeSearchResult = {
      title: query,
      artist: '',
      sourceUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      videoId: '',
      thumbnailUrl: ''
    };
    this.searchResults = [song];
    this.selectSearchResult(song);
    this.searching = false;
  }

  selectSearchResult(song: YouTubeSearchResult): void {
    this.newSong.title = song.title;
    this.newSong.artist = song.artist;
    this.newSong.sourceUrl = song.sourceUrl;
    this.showAddForm = true;

    if (!song.videoId) {
      this.resolveYouTubeVideoUrl(song);
    }
  }

  onSourceUrlChange(): void {
    const ytId = this.getYouTubeVideoId(this.newSong.sourceUrl);
    if (ytId) {
      this.fetchOembedByVideoId(ytId);
    }
  }

  addSongDirectly(song: YouTubeSearchResult): void {
    this.selectSearchResult(song);
    this.addSongInternal();
  }

  private djMessageTimer: any;
  private djErrorTimer: any;

  showSuccessToast(msg: string): void {
    this.djMessage = msg;
    if (this.djMessageTimer) clearTimeout(this.djMessageTimer);
    this.djMessageTimer = setTimeout(() => this.djMessage = '', 3500);
  }

  showErrorToast(err: string): void {
    this.djError = err;
    if (this.djErrorTimer) clearTimeout(this.djErrorTimer);
    this.djErrorTimer = setTimeout(() => this.djError = '', 4000);
  }

  addSongInternal(): void {
    const title = this.newSong.title.trim();
    if (!title) {
      this.showErrorToast('Por favor ingresa el título de la canción.');
      return;
    }
    this.adding = true;
    this.djError = '';
    this.djMessage = '';

    const sourceUrl = this.newSong.sourceUrl ? this.newSong.sourceUrl.trim() : '';
    const artist = this.newSong.artist ? this.newSong.artist.trim() : '';

    const payload = {
      title,
      artist,
      sourceUrl: sourceUrl || undefined,
      dedication: this.newSong.dedication ? this.newSong.dedication.trim() : undefined,
      requesterName: 'DJ (Interno)',
      status: 'approved' as SongRequestStatus
    };

    this.apiService.createSongRequest(this.eventId, payload).subscribe({
      next: (res) => {
        this.songRequests = [res.songRequest, ...this.songRequests];
        this.showSuccessToast(`Canción "${res.songRequest.title}" agregada a la lista`);
        this.newSong = { title: '', artist: '', sourceUrl: '', dedication: '' };
        this.searchResults = [];
        this.searchQuery = '';
        this.showAddForm = false;
        this.adding = false;
      },
      error: (err) => {
        this.showErrorToast(err?.error?.message || 'Error al guardar la canción');
        this.adding = false;
      }
    });
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
    private sanitizer: DomSanitizer,
    private http: HttpClient
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
        this.showErrorToast(err?.error?.message || 'Error al cargar solicitudes de DJ');
        this.loadingDj = false;
      }
    });
  }

  updateSongRequest(sr: SongRequestModel, status: SongRequestStatus): void {
    const srId = (sr._id || sr.id)!;
    this.apiService.updateSongRequest(this.eventId, srId, status).subscribe({
      next: res => {
        sr.status = res.songRequest.status;
        const labels: Record<string, string> = { approved: 'aprobada 👍', played: 'reproducida 🎵', rejected: 'rechazada ✕', pending: 'pendiente ⏳' };
        this.showSuccessToast(`Canción "${sr.title}" marcada como ${labels[status] || status}`);
      },
      error: err => {
        this.showErrorToast(err?.error?.message || 'Error al actualizar estado de la canción');
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

  playSong(sr: SongRequestModel | YouTubeSearchResult): void {
    const sourceUrl = sr.sourceUrl || '';
    const isSpotify = sourceUrl.includes('spotify.com');
    let embedUrl: SafeResourceUrl | null = null;
    let isDirectAudio = false;

    const previewUrl = (sr as SongRequestModel).previewUrl;
    if (previewUrl || sourceUrl.endsWith('.mp3') || sourceUrl.endsWith('.wav')) {
      isDirectAudio = true;
    } else {
      const videoId = this.getYouTubeVideoId(sourceUrl);
      if (videoId) {
        embedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${videoId}?autoplay=1`);
      } else if (isSpotify && sourceUrl) {
        const parts = sourceUrl.split('track/');
        if (parts[1]) {
          const trackId = parts[1].split('?')[0];
          embedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`https://open.spotify.com/embed/track/${trackId}`);
        }
      }
    }

    this.activePlayingSong = {
      title: sr.title,
      artist: sr.artist,
      thumbnailUrl: sr.thumbnailUrl || (sr.sourceUrl ? this.getYouTubeThumbnail(sr.sourceUrl) : undefined),
      sourceUrl,
      embedUrl,
      previewUrl,
      isDirectAudio,
      isSpotify
    };
  }

  closePlayer(): void {
    this.activePlayingSong = undefined;
  }
}

