import { Component, Input, Output, EventEmitter } from '@angular/core';
import { EventAccessSession, SongRequestModel, SongRequestStatus } from '../../../core/models';

@Component({
  selector: 'app-access-dj-view',
  templateUrl: './access-dj-view.component.html'
})
export class AccessDjViewComponent {
  @Input() session!: EventAccessSession;
  @Output() playSongEvent = new EventEmitter<SongRequestModel>();
  @Output() updateSongEvent = new EventEmitter<{ song: SongRequestModel; status: SongRequestStatus }>();
  @Output() moveSongEvent = new EventEmitter<{ song: SongRequestModel; direction: -1 | 1 }>();
  @Output() addSongEvent = new EventEmitter<{ title: string; artist: string; sourceUrl: string; dedication: string }>();

  showAddForm = false;
  adding = false;
  newSong = {
    title: '',
    artist: '',
    sourceUrl: '',
    dedication: ''
  };

  songFilter: 'all' | 'pending' | 'approved' | 'played' | 'rejected' = 'all';
  songSearch = '';

  getYouTubeVideoId(url: string): string {
    if (!url) return '';
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
    return match ? match[1] : '';
  }

  getYouTubeThumbnail(url: string): string {
    const videoId = this.getYouTubeVideoId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';
  }

  submitNewSong(): void {
    if (!this.newSong.title.trim() && !this.newSong.sourceUrl.trim()) return;
    this.addSongEvent.emit({ ...this.newSong });
    this.newSong = { title: '', artist: '', sourceUrl: '', dedication: '' };
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

  playSong(song: SongRequestModel): void {
    this.playSongEvent.emit(song);
  }

  updateSongStatus(song: SongRequestModel, status: SongRequestStatus): void {
    this.updateSongEvent.emit({ song, status });
  }

  moveSong(song: SongRequestModel, direction: -1 | 1): void {
    this.moveSongEvent.emit({ song, direction });
  }
}
