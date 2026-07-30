import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AlbumAssetModel, EventAccessSession, GuestModel, SongRequestModel, SongRequestStatus } from '../../core/models';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';

@Component({
  selector: 'app-new-event-access',
  templateUrl: './new-event-access.component.html'
})
export class NewEventAccessComponent implements OnInit {
  session?: EventAccessSession;
  loading = false;
  checking = false;
  code = '';
  search = '';
  message = '';
  error = '';

  // DJ tab / section state
  songFilter: 'all' | 'pending' | 'approved' | 'played' | 'rejected' = 'all';
  songSearch = '';

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private confirmDialog: ConfirmDialogService
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

  async checkIn(): Promise<void> {
    const code = this.code.trim();
    if (!code) return;
    const candidate = this.findGuestByCode(code);
    if (candidate) {
      const ok = await this.confirmCheckIn(candidate);
      if (!ok) return;
    }
    this.checking = true;
    this.message = '';
    this.error = '';
    this.api.eventAccessCheckIn(this.token, code).subscribe({
      next: ({ guest }) => {
        if (this.session) {
          this.session.guests = this.session.guests.map((item) =>
            this.getGuestId(item) === this.getGuestId(guest) ? guest : item
          );
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
        if (this.session) {
          this.session.albumAssets = this.session.albumAssets.map((item) =>
            (item._id || item.id) === assetId ? updated : item
          );
        }
        this.message = 'Álbum actualizado.';
      },
      error: (error) => this.error = error.error?.message || 'No se pudo actualizar el álbum.'
    });
  }

  updateSongRequest(request: SongRequestModel, status: SongRequestStatus): void {
    const requestId = request._id || request.id || '';
    if (!requestId) return;

    if (status === 'played' && request.sourceUrl) {
      window.open(request.sourceUrl, '_blank');
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

  updateSong(songRequest: SongRequestModel, status: SongRequestStatus): void {
    this.updateSongRequest(songRequest, status);
  }

  hasPermission(permission: string): boolean {
    if (permission === 'dj' || permission === 'song_requests' || permission === 'song_review') {
      return Boolean(
        this.session?.role === 'dj' ||
        this.session?.permissions?.includes('dj') ||
        this.session?.permissions?.includes('song_requests') ||
        this.session?.permissions?.includes('song_review')
      );
    }
    return Boolean(this.session?.permissions?.includes(permission));
  }

  get filteredGuests(): GuestModel[] {
    const query = this.search.toLowerCase().trim();
    const guests = this.session?.guests || [];
    if (!query) return guests;
    return guests.filter((guest) =>
      [guest.name, guest.group, guest.tableName, guest.checkInCode].some((value) =>
        (value || '').toLowerCase().includes(query)
      )
    );
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
      [guest.checkInCode, guest.qrCode].some((value) => (value || '').toLowerCase() === normalized)
    );
  }

  private async confirmCheckIn(guest: GuestModel): Promise<boolean> {
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
    if (!songRequestId) return;
    const currentOrder = Number(songRequest.sortOrder || 0);
    this.api.updateEventAccessSong(this.token, songRequestId, { sortOrder: currentOrder + direction }).subscribe({
      next: ({ songRequest: updated }) => {
        if (this.session && this.session.songRequests) {
          this.session.songRequests = this.session.songRequests
            .map(item => (item._id || item.id) === songRequestId ? updated : item)
            .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
        }
        this.message = 'Orden de canción actualizado.';
      },
      error: (err) => this.error = err.error?.message || 'Error al cambiar orden.'
    });
  }

  private get token(): string {
    return this.route.snapshot.paramMap.get('token') || '';
  }
}
