import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../../core/api.service';
import { EventAccessSession, SongRequestModel, SongRequestStatus } from '../../../core/models';

export interface YouTubeSearchResult {
  title: string;
  artist: string;
  sourceUrl: string;
  videoId?: string;
  thumbnailUrl: string;
  previewUrl?: string;
}

@Component({
  selector: 'app-access-dj-view',
  templateUrl: './access-dj-view.component.html'
})
export class AccessDjViewComponent implements OnChanges {
  @Input() session!: EventAccessSession;
  @Output() playSongEvent = new EventEmitter<SongRequestModel | YouTubeSearchResult>();
  @Output() updateSongEvent = new EventEmitter<{ song: SongRequestModel; status: SongRequestStatus }>();
  @Output() moveSongEvent = new EventEmitter<{ song: SongRequestModel; direction: -1 | 1 }>();
  @Output() addSongEvent = new EventEmitter<{ title: string; artist: string; sourceUrl: string; dedication: string }>();

  showAddForm = false;
  adding = false;

  // Search & YouTube state
  searchQuery = '';
  searching = false;
  searchResults: YouTubeSearchResult[] = [];

  newSong = {
    title: '',
    artist: '',
    sourceUrl: '',
    dedication: ''
  };

  private _songFilter: 'all' | 'pending' | 'approved' | 'played' | 'rejected' = 'all';
  get songFilter(): 'all' | 'pending' | 'approved' | 'played' | 'rejected' {
    return this._songFilter;
  }
  set songFilter(val: 'all' | 'pending' | 'approved' | 'played' | 'rejected') {
    this._songFilter = val;
    this.currentPage = 1;
  }

  private _songSearch = '';
  get songSearch(): string {
    return this._songSearch;
  }
  set songSearch(val: string) {
    this._songSearch = val;
    this.currentPage = 1;
  }

  currentPage = 1;
  pageSize = 10;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['session']) {
      this.currentPage = 1;
    }
  }

  constructor(
    private http: HttpClient,
    private apiService: ApiService
  ) {}

  get eventId(): string {
    const evt = this.session?.event as any;
    return evt?._id || evt?.id || '';
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

    const ytId = this.getYouTubeVideoId(query);
    if (ytId) {
      this.fetchOembedByVideoId(ytId);
      return;
    }

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

    if (this.eventId) {
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
          this.resolveViaPiped(song, searchTerm);
        },
        error: () => {
          this.resolveViaPiped(song, searchTerm);
        }
      });
    } else {
      this.resolveViaPiped(song, searchTerm);
    }
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

  addSongInternal(): void {
    const title = this.newSong.title.trim();
    if (!title) return;

    this.addSongEvent.emit({
      title,
      artist: this.newSong.artist.trim(),
      sourceUrl: this.newSong.sourceUrl.trim(),
      dedication: this.newSong.dedication.trim()
    });

    this.newSong = { title: '', artist: '', sourceUrl: '', dedication: '' };
    this.searchResults = [];
    this.searchQuery = '';
    this.showAddForm = false;
  }

  get filteredSongRequests(): SongRequestModel[] {
    const songRequests = this.session?.songRequests || [];
    const query = this.songSearch.toLowerCase().trim();

    return songRequests.filter((song: SongRequestModel) => {
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

  get totalPages(): number {
    return Math.ceil(this.filteredSongRequests.length / this.pageSize) || 1;
  }

  get startIndex(): number {
    return (this.currentPage - 1) * this.pageSize;
  }

  get endIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredSongRequests.length);
  }

  get paginatedSongRequests(): SongRequestModel[] {
    return this.filteredSongRequests.slice(this.startIndex, this.endIndex);
  }

  get songPendingCount(): number {
    return (this.session?.songRequests || []).filter((s: SongRequestModel) => s.status === 'pending').length;
  }

  get songApprovedCount(): number {
    return (this.session?.songRequests || []).filter((s: SongRequestModel) => s.status === 'approved').length;
  }

  get songPlayedCount(): number {
    return (this.session?.songRequests || []).filter((s: SongRequestModel) => s.status === 'played').length;
  }

  get songRejectedCount(): number {
    return (this.session?.songRequests || []).filter((s: SongRequestModel) => s.status === 'rejected').length;
  }

  getGuestName(guestRef: any, fallbackName?: string): string {
    if (typeof guestRef === 'object' && guestRef?.name) return guestRef.name;
    return fallbackName || 'Invitado';
  }

  playSong(song: SongRequestModel | YouTubeSearchResult): void {
    this.playSongEvent.emit(song as any);
  }

  updateSongStatus(song: SongRequestModel, status: SongRequestStatus): void {
    this.updateSongEvent.emit({ song, status });
  }

  moveSong(song: SongRequestModel, direction: -1 | 1): void {
    const visibleList = this.filteredSongRequests;
    const currentId = song._id || song.id;
    const visibleIdx = visibleList.findIndex(s => (s._id || s.id) === currentId);
    if (visibleIdx === -1) return;

    const targetVisibleIdx = visibleIdx + direction;
    if (targetVisibleIdx < 0 || targetVisibleIdx >= visibleList.length) return;

    const targetSong = visibleList[targetVisibleIdx];
    this.moveSongEvent.emit({ song, targetSong, direction } as any);
  }
}

