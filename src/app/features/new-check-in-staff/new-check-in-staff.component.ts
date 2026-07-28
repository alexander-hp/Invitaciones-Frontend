import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { EventModel, GuestModel } from '../../core/models';

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

  constructor(private route: ActivatedRoute, private api: ApiService) {}

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

  checkIn(): void {
    const token = this.token;
    const code = this.code.trim();
    if (!token || !code) return;
    const candidate = this.findGuestByCode(code);
    if (candidate && !this.confirmCheckIn(candidate)) return;
    this.checking = true;
    this.message = '';
    this.error = '';
    this.api.staffCheckIn(token, code).subscribe({
      next: ({ guest }) => {
        this.guests = this.guests.map((item) =>
          this.getGuestId(item) === this.getGuestId(guest) ? guest : item
        );
        if (!this.guests.some((item) => this.getGuestId(item) === this.getGuestId(guest))) {
          this.guests = [guest, ...this.guests];
        }
        this.message = `${guest.name} registrado.`;
        this.code = '';
        this.checking = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo registrar la entrada.';
        this.checking = false;
      }
    });
  }

  get filteredGuests(): GuestModel[] {
    const query = this.search.toLowerCase().trim();
    if (!query) return this.guests;
    return this.guests.filter((guest) =>
      [guest.name, guest.group, guest.tableName, guest.checkInCode].some((value) =>
        (value || '').toLowerCase().includes(query)
      )
    );
  }

  get checkedInCount(): number {
    return this.guests.filter((guest) => guest.checkedIn).length;
  }

  getGuestId(guest: GuestModel): string {
    return guest._id || guest.id || '';
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
      [guest.checkInCode, guest.qrCode].some((value) => (value || '').toLowerCase() === normalized)
    );
  }

  private confirmCheckIn(guest: GuestModel): boolean {
    if (guest.checkedIn) {
      return confirm(`${guest.name} ya aparece registrado. ¿Registrar de nuevo de todos modos?`);
    }
    if (guest.status !== 'confirmed') {
      return confirm(`${guest.name} tiene RSVP "${this.statusLabel(guest)}". ¿Confirmas registrar su entrada?`);
    }
    return confirm(`Confirmar entrada de ${guest.name}${guest.tableName ? ` en ${guest.tableName}` : ''}.`);
  }

  private get token(): string {
    return this.route.snapshot.paramMap.get('token') || '';
  }
}
