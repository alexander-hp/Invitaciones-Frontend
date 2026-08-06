import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { EventModel, GuestModel } from '../../core/models';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';

@Component({
  selector: 'app-new-check-in-staff',
  templateUrl: './new-check-in-staff.component.html'
})
export class NewCheckInStaffComponent implements OnInit {
  event?: Pick<EventModel, 'title' | 'date' | 'venue'>;
  guests: GuestModel[] = [];
  code = '';
  search = '';
  expiresAt = '';
  loading = false;
  checking = false;
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
    this.checkIn(true);
  }

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private confirmDialog: ConfirmDialogService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const token = this.token;
    if (!token) return;
    this.loading = true;
    this.error = '';
    this.api.getStaffCheckInSession(token).subscribe({
      next: (session) => {
        this.event = session.event;
        this.guests = session.guests;
        this.expiresAt = session.expiresAt;
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Link de check-in no disponible.';
        this.loading = false;
      }
    });
  }

  guestStatusFilter: 'all' | 'checkedIn' | 'pending' = 'all';

  showSuccess(text: string): void {
    this.message = text;
    setTimeout(() => { this.message = ''; }, 3500);
  }

  showError(text: string): void {
    this.error = text;
    setTimeout(() => { this.error = ''; }, 4000);
  }

  async checkIn(autoConfirm = false): Promise<void> {
    const token = this.token;
    const code = this.code.trim();
    if (!token || !code) return;

    let codeToSend = code;
    const candidate = this.findGuestByCode(code);
    if (candidate) {
      codeToSend = this.getGuestCheckInCode(candidate);
      const ok = await this.confirmCheckIn(candidate, autoConfirm);
      if (!ok) return;
    }

    this.checking = true;
    this.api.staffCheckIn(token, codeToSend).subscribe({
      next: ({ guest }) => {
        this.guests = this.guests.map((item) =>
          this.getGuestId(item) === this.getGuestId(guest) ? guest : item
        );
        if (!this.guests.some((item) => this.getGuestId(item) === this.getGuestId(guest))) {
          this.guests = [guest, ...this.guests];
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

  selectedTable = 'all';

  get availableTables(): string[] {
    const tables = new Set<string>();
    (this.guests || []).forEach((g: GuestModel) => {
      if (g.tableName && g.tableName.trim()) {
        tables.add(g.tableName.trim());
      }
    });
    return Array.from(tables).sort();
  }

  get filteredGuests(): GuestModel[] {
    const query = this.search.toLowerCase().trim();
    let guests = this.guests;

    if (this.guestStatusFilter === 'checkedIn') {
      guests = guests.filter((g) => g.checkedIn);
    } else if (this.guestStatusFilter === 'pending') {
      guests = guests.filter((g) => !g.checkedIn);
    }

    if (this.selectedTable !== 'all') {
      if (this.selectedTable === 'Sin mesa') {
        guests = guests.filter((g) => !g.tableName || !g.tableName.trim());
      } else {
        guests = guests.filter((g) => (g.tableName || '').trim() === this.selectedTable);
      }
    }

    if (!query) return guests;
    return guests.filter((guest) =>
      [guest.name, guest.group, guest.tableName, guest.checkInCode, guest.qrCode, guest.invitationToken].some((value) =>
        (value || '').toLowerCase().includes(query)
      )
    );
  }

  checkInDirectly(guest: GuestModel): void {
    const code = guest.checkInCode || guest.qrCode || guest.invitationToken || this.getGuestId(guest);
    if (code) {
      this.code = code;
      this.checkIn(true);
    }
  }

  get guestPendingCount(): number {
    return this.guests.filter((g) => !g.checkedIn).length;
  }

  get checkedInCount(): number {
    return this.guests.filter((guest) => guest.checkedIn).length;
  }

  getGuestId(guest: GuestModel): string {
    return guest._id || guest.id || '';
  }

  getGuestCheckInCode(guest: GuestModel): string {
    return guest.checkInCode || guest.qrCode || guest.invitationToken || this.getGuestId(guest);
  }

  statusLabel(guest: GuestModel): string {
    if (guest.checkedIn) return 'Ya registrado';
    if (guest.status === 'confirmed') return 'Confirmado';
    if (guest.status === 'declined') return 'Rechazado';
    return 'Pendiente';
  }

  private findGuestByCode(code: string): GuestModel | undefined {
    const normalized = code.trim().toLowerCase();
    return this.guests.find((guest) =>
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

  private get token(): string {
    return this.route.snapshot.paramMap.get('token') || '';
  }
}
