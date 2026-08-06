import { Component, Input, Output, EventEmitter } from '@angular/core';
import { EventAccessSession, GuestModel } from '../../../core/models';

@Component({
  selector: 'app-access-guestops-view',
  templateUrl: './access-guestops-view.component.html'
})
export class AccessGuestopsViewComponent {
  @Input() session!: EventAccessSession;
  @Input() search = '';
  @Input() guestStatusFilter: 'all' | 'checkedIn' | 'confirmed' | 'pending' | 'declined' = 'all';

  @Output() searchChange = new EventEmitter<string>();
  @Output() guestStatusFilterChange = new EventEmitter<'all' | 'checkedIn' | 'confirmed' | 'pending' | 'declined'>();

  onSearchInput(val: string): void {
    this.searchChange.emit(val);
  }

  setFilter(filter: 'all' | 'checkedIn' | 'confirmed' | 'pending' | 'declined'): void {
    this.guestStatusFilter = filter;
    this.guestStatusFilterChange.emit(filter);
  }

  get filteredGuests(): GuestModel[] {
    const query = this.search.toLowerCase().trim();
    let guests = this.session?.guests || [];

    if (this.guestStatusFilter === 'checkedIn') {
      guests = guests.filter((g: GuestModel) => g.checkedIn);
    } else if (this.guestStatusFilter === 'confirmed') {
      guests = guests.filter((g: GuestModel) => !g.checkedIn && g.status === 'confirmed');
    } else if (this.guestStatusFilter === 'pending') {
      guests = guests.filter((g: GuestModel) => !g.checkedIn && (g.status === 'pending' || !g.status));
    } else if (this.guestStatusFilter === 'declined') {
      guests = guests.filter((g: GuestModel) => !g.checkedIn && g.status === 'declined');
    }

    if (!query) return guests;
    return guests.filter((guest: GuestModel) =>
      [guest.name, guest.group, guest.tableName, guest.checkInCode, guest.qrCode, guest.invitationToken].some((value) =>
        (value || '').toLowerCase().includes(query)
      )
    );
  }

  get checkedInCount(): number {
    return (this.session?.guests || []).filter((guest: GuestModel) => guest.checkedIn).length;
  }

  get guestConfirmedCount(): number {
    return (this.session?.guests || []).filter((g: GuestModel) => !g.checkedIn && g.status === 'confirmed').length;
  }

  get guestPendingCount(): number {
    return (this.session?.guests || []).filter((g: GuestModel) => !g.checkedIn && (g.status === 'pending' || !g.status)).length;
  }

  get guestDeclinedCount(): number {
    return (this.session?.guests || []).filter((g: GuestModel) => !g.checkedIn && g.status === 'declined').length;
  }
}
