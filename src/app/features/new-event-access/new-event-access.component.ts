import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AlbumAssetModel, EventAccessSession, GuestModel, SongRequestModel, SongRequestStatus } from '../../core/models';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';

@Component({
  selector: 'app-new-event-access',
  templateUrl: './new-event-access.component.html'
})
export class NewEventAccessComponent implements OnInit {
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
  showScanner = false;

  openScanner(): void {
    this.showScanner = true;
  }

  closeScanner(): void {
    this.showScanner = false;
  }

  onQrScanned(scannedCode: string): void {
    this.code = scannedCode;
    this.checkIn();
  }

  // Check-in filter & toast state
  guestStatusFilter: 'all' | 'checkedIn' | 'confirmed' | 'pending' | 'declined' = 'all';

  showSuccess(text: string): void {
    this.message = text;
    setTimeout(() => { this.message = ''; }, 3500);
  }

  showError(text: string): void {
    this.error = text;
    setTimeout(() => { this.error = ''; }, 4000);
  }

  // DJ tab / section state
  songFilter: 'all' | 'pending' | 'approved' | 'played' | 'rejected' = 'all';
  songSearch = '';

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private confirmDialog: ConfirmDialogService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (!this.token) {
      this.error = 'No se proporcionó un token de acceso.';
      return;
    }
    this.loading = true;
    this.error = '';
    this.api.getEventAccessSession(this.token).subscribe({
      next: (session) => {
        if (session && session.songRequests) {
          session.songRequests.sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
        }
        this.session = session;
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Link no disponible o expirado.';
        this.loading = false;
      }
    });
  }

  async checkIn(codeOverride?: string, autoConfirm = false): Promise<void> {
    const code = (codeOverride || this.code).trim();
    if (!code) return;

    let codeToSend = code;
    const candidate = this.findGuestByCode(code);
    if (candidate) {
      codeToSend = candidate.checkInCode || candidate.qrCode || candidate.invitationToken || this.getGuestId(candidate);
      const ok = await this.confirmCheckIn(candidate, autoConfirm);
      if (!ok) return;
    }

    this.checking = true;
    this.api.eventAccessCheckIn(this.token, codeToSend).subscribe({
      next: ({ guest }) => {
        if (this.session) {
          this.session.guests = this.session.guests.map((item) =>
            this.getGuestId(item) === this.getGuestId(guest) ? guest : item
          );
        }
        this.showSuccess(`${guest.name} registrado con éxito ✅`);
        this.code = '';
        this.checking = false;
      },
      error: (error) => {
        this.showError(error.error?.message || 'No se pudo registrar la entrada.');
        this.checking = false;
      }
    });
  }

  checkInDirectly(guest: GuestModel): void {
    const code = guest.checkInCode || guest.qrCode || guest.invitationToken || this.getGuestId(guest);
    if (code) {
      this.checkIn(code, true);
    }
  }

  updateAlbum(asset: AlbumAssetModel, status: AlbumAssetModel['status']): void {
    const assetId = asset._id || asset.id || '';
    if (!assetId) return;
    this.api.updateEventAccessAlbum(this.token, assetId, status).subscribe({
      next: ({ asset: updated }) => {
        if (this.session) {
          this.session.albumAssets = this.session.albumAssets.map((item) =>
            (item._id || item.id) === assetId ? updated : item
          );
        }
        this.showSuccess('Estado de foto en álbum actualizado.');
      },
      error: (error) => this.showError(error.error?.message || 'No se pudo actualizar el álbum.')
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

  updateSongRequest(request: SongRequestModel, status: SongRequestStatus): void {
    const requestId = request._id || request.id || '';
    if (!requestId) return;

    if (status === 'played') {
      this.playSong(request);
    }

    this.api.updateEventAccessSongRequest(this.token, requestId, status).subscribe({
      next: ({ songRequest: updated }) => {
        if (this.session && this.session.songRequests) {
          this.session.songRequests = this.session.songRequests.map((item) =>
            (item._id || item.id) === requestId ? updated : item
          );
        }
        this.message = `Solicitud "${request.title}" ${this.getSongStatusActionText(status)}.`;
      },
      error: (err) => {
        // Optimistic fallback for frontend presentation
        if (this.session && this.session.songRequests) {
          this.session.songRequests = this.session.songRequests.map((item) =>
            (item._id || item.id) === requestId ? { ...item, status } : item
          );
        }
        this.message = `Estado actualizado a ${status}.`;
      }
    });
  }

  addSong(payload: { title: string; artist: string; sourceUrl: string; dedication: string }): void {
    if (!this.token) return;
    this.api.addEventAccessSong(this.token, {
      title: payload.title,
      artist: payload.artist,
      sourceUrl: payload.sourceUrl,
      dedication: payload.dedication,
      requesterName: 'DJ (Cabina)'
    }).subscribe({
      next: ({ songRequest }) => {
        if (this.session) {
          this.session.songRequests = [songRequest, ...(this.session.songRequests || [])];
        }
        this.showSuccess(`Canción "${songRequest.title}" agregada a la lista ✅`);
      },
      error: (error) => this.showError(error.error?.message || 'No se pudo agregar la canción.')
    });
  }

  updateSong(songRequest: SongRequestModel, status: SongRequestStatus): void {
    this.updateSongRequest(songRequest, status);
  }

  hasPermission(permission: string): boolean {
    if (!this.session) return false;
    const role = this.session.role;
    const perms = this.session.permissions || [];

    if (permission === 'dj' || permission === 'song_requests' || permission === 'song_review') {
      return role === 'dj' || perms.includes('dj') || perms.includes('song_requests') || perms.includes('song_review') || perms.includes('manage_songs');
    }
    if (permission === 'check_in') {
      return role === 'check_in' || perms.includes('check_in');
    }
    if (permission === 'album_review' || permission === 'review_album') {
      return role === 'album_review' || perms.includes('album_review') || perms.includes('review_album');
    }
    if (permission === 'client_view') {
      return role === 'client_view' || perms.includes('client_view');
    }
    if (permission === 'guest_ops' || permission === 'manage_guests') {
      return role === 'guest_ops' || perms.includes('guest_ops') || perms.includes('manage_guests');
    }
    return perms.includes(permission) || role === permission;
  }

  get filteredGuests(): GuestModel[] {
    const query = this.search.toLowerCase().trim();
    let guests = this.session?.guests || [];

    if (this.guestStatusFilter === 'checkedIn') {
      guests = guests.filter((g) => g.checkedIn);
    } else if (this.guestStatusFilter === 'confirmed') {
      guests = guests.filter((g) => !g.checkedIn && g.status === 'confirmed');
    } else if (this.guestStatusFilter === 'pending') {
      guests = guests.filter((g) => !g.checkedIn && (g.status === 'pending' || !g.status));
    } else if (this.guestStatusFilter === 'declined') {
      guests = guests.filter((g) => !g.checkedIn && g.status === 'declined');
    }

    if (!query) return guests;
    return guests.filter((guest) =>
      [guest.name, guest.group, guest.tableName, guest.checkInCode, guest.qrCode, guest.invitationToken].some((value) =>
        (value || '').toLowerCase().includes(query)
      )
    );
  }

  get guestConfirmedCount(): number {
    return (this.session?.guests || []).filter((g) => !g.checkedIn && g.status === 'confirmed').length;
  }

  get guestPendingCount(): number {
    return (this.session?.guests || []).filter((g) => !g.checkedIn && (g.status === 'pending' || !g.status)).length;
  }

  get guestDeclinedCount(): number {
    return (this.session?.guests || []).filter((g) => !g.checkedIn && g.status === 'declined').length;
  }

  get filteredSongRequests(): SongRequestModel[] {
    const songRequests = this.session?.songRequests || [];
    const query = this.songSearch.toLowerCase().trim();

    return songRequests.filter((song) => {
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
    return (this.session?.songRequests || []).filter((s) => s.status === 'pending').length;
  }

  get songApprovedCount(): number {
    return (this.session?.songRequests || []).filter((s) => s.status === 'approved').length;
  }

  get songPlayedCount(): number {
    return (this.session?.songRequests || []).filter((s) => s.status === 'played').length;
  }

  get songRejectedCount(): number {
    return (this.session?.songRequests || []).filter((s) => s.status === 'rejected').length;
  }

  get checkedInCount(): number {
    return (this.session?.guests || []).filter((guest) => guest.checkedIn).length;
  }

  getGuestName(guestRef: string | Partial<GuestModel> | undefined, fallbackName?: string): string {
    if (typeof guestRef === 'object' && guestRef?.name) return guestRef.name;
    return fallbackName || 'Invitado';
  }

  getGuestId(guest: GuestModel): string {
    return guest._id || guest.id || '';
  }

  getSongStatusActionText(status: SongRequestStatus): string {
    switch (status) {
      case 'approved': return 'aprobada';
      case 'played': return 'reproducida';
      case 'rejected': return 'rechazada';
      default: return 'actualizada';
    }
  }

  statusLabel(guest: GuestModel): string {
    if (guest.checkedIn) return 'Ya registrado';
    if (guest.status === 'confirmed') return 'Confirmado';
    if (guest.status === 'declined') return 'Rechazado';
    return 'Pendiente';
  }

  private findGuestByCode(code: string): GuestModel | undefined {
    const normalized = code.trim().toLowerCase();
    return (this.session?.guests || []).find((guest) =>
      [guest.checkInCode, guest.qrCode, guest.invitationToken, guest._id, guest.id].some(
        (value) => (value || '').toLowerCase() === normalized
      )
    );
  }

  private async confirmCheckIn(guest: GuestModel, autoConfirm = false): Promise<boolean> {
    if (guest.checkedIn) {
      return this.confirmDialog.confirm({
        title: '⚠️ Ya registrado',
        message: `${guest.name} ya aparece registrado. ¿Registrar de nuevo de todos modos?`,
        confirmText: 'Registrar de nuevo',
        cancelText: 'Cancelar',
        type: 'warning'
      });
    }
    if (guest.status !== 'confirmed') {
      return this.confirmDialog.confirm({
        title: '⚠️ RSVP no confirmado',
        message: `${guest.name} tiene RSVP "${this.statusLabel(guest)}". ¿Confirmas registrar su entrada?`,
        confirmText: 'Confirmar entrada',
        cancelText: 'Cancelar',
        type: 'warning'
      });
    }
    if (autoConfirm) {
      return true;
    }
    return this.confirmDialog.confirm({
      title: 'Confirmar entrada',
      message: `¿Confirmas registrar la entrada de ${guest.name}${guest.tableName ? ` en la mesa ${guest.tableName}` : ''}?`,
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      type: 'info'
    });
  }

  moveSong(songRequest: SongRequestModel, direction: -1 | 1): void {
    const songRequestId = songRequest._id || songRequest.id || '';
    if (!songRequestId || !this.session?.songRequests?.length) return;

    const list = [...this.session.songRequests];
    const idx = list.findIndex(item => (item._id || item.id) === songRequestId);
    if (idx === -1) return;

    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    // Swap items in local array instantly
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;

    // Assign sequential sortOrder values
    list.forEach((item, i) => item.sortOrder = i + 1);
    this.session.songRequests = list;

    const newOrder = list[targetIdx].sortOrder;
    this.api.updateEventAccessSong(this.token, songRequestId, { sortOrder: newOrder }).subscribe({
      next: () => {
        this.message = 'Orden de canción actualizado.';
      },
      error: (err) => this.error = err.error?.message || 'Error al cambiar orden.'
    });
  }

  private get token(): string {
    return this.route.snapshot.paramMap.get('token') || '';
  }
}
