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
  @Input() checking = false;
  @Input() code = '';
  @Input() showScanner = false;
  @Input() albumUploading = false;
  @Input() token = '';

  @Output() searchChange = new EventEmitter<string>();
  @Output() guestStatusFilterChange = new EventEmitter<'all' | 'checkedIn' | 'confirmed' | 'pending' | 'declined'>();
  @Output() codeChange = new EventEmitter<string>();
  @Output() checkInEvent = new EventEmitter<void>();
  @Output() directCheckInEvent = new EventEmitter<any>();
  @Output() openScannerEvent = new EventEmitter<void>();
  @Output() closeScannerEvent = new EventEmitter<void>();
  @Output() qrScannedEvent = new EventEmitter<string>();

  @Output() playSongEvent = new EventEmitter<any>();
  @Output() updateSongEvent = new EventEmitter<any>();
  @Output() moveSongEvent = new EventEmitter<any>();
  @Output() addSongEvent = new EventEmitter<any>();

  @Output() updateAlbumEvent = new EventEmitter<any>();
  @Output() bulkUpdateAlbumEvent = new EventEmitter<any>();
  @Output() uploadBatchEvent = new EventEmitter<any>();

  collapsedSections: Record<string, boolean> = {
    dj: true,
    guestsList: false,
    albumReview: true,
    albumView: true,
    integrationApi: true,
    photographer: true,
    clientView: true
  };

  toggleSection(sectionName: string): void {
    this.collapsedSections[sectionName] = !this.collapsedSections[sectionName];
  }

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
