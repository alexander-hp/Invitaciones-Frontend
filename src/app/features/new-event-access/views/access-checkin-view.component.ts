import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { EventAccessSession, GuestModel } from '../../../core/models';

@Component({
  selector: 'app-access-checkin-view',
  templateUrl: './access-checkin-view.component.html'
})
export class AccessCheckinViewComponent implements OnChanges {
  @Input() session!: EventAccessSession;
  @Input() checking = false;
  @Input() code = '';
  @Input() search = '';
  @Input() showScanner = false;
  @Input() guestStatusFilter: 'all' | 'checkedIn' | 'confirmed' | 'pending' | 'declined' = 'all';

  @Output() codeChange = new EventEmitter<string>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() guestStatusFilterChange = new EventEmitter<'all' | 'checkedIn' | 'confirmed' | 'pending' | 'declined'>();
  @Output() checkInEvent = new EventEmitter<void>();
  @Output() directCheckInEvent = new EventEmitter<GuestModel>();
  @Output() openScannerEvent = new EventEmitter<void>();
  @Output() closeScannerEvent = new EventEmitter<void>();
  @Output() qrScannedEvent = new EventEmitter<string>();

  currentPage = 1;
  pageSize = 10;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['search'] || changes['guestStatusFilter'] || changes['session']) {
      this.currentPage = 1;
    }
  }

  registerGuestDirectly(guest: GuestModel): void {
    this.directCheckInEvent.emit(guest);
  }

  onCodeInput(val: string): void {
    this.codeChange.emit(val);
  }

  onSearchInput(val: string): void {
    this.searchChange.emit(val);
  }

  private _selectedTable = 'all';
  get selectedTable(): string {
    return this._selectedTable;
  }
  set selectedTable(val: string) {
    this._selectedTable = val;
    this.currentPage = 1;
  }

  get availableTables(): string[] {
    const tables = new Set<string>();
    (this.session?.guests || []).forEach((g: GuestModel) => {
      if (g.tableName && g.tableName.trim()) {
        tables.add(g.tableName.trim());
      }
    });
    return Array.from(tables).sort();
  }

  setFilter(filter: 'all' | 'checkedIn' | 'confirmed' | 'pending' | 'declined'): void {
    this.guestStatusFilter = filter;
    this.guestStatusFilterChange.emit(filter);
    this.currentPage = 1;
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

    if (this.selectedTable !== 'all') {
      if (this.selectedTable === 'Sin mesa') {
        guests = guests.filter((g: GuestModel) => !g.tableName || !g.tableName.trim());
      } else {
        guests = guests.filter((g: GuestModel) => (g.tableName || '').trim() === this.selectedTable);
      }
    }

    if (!query) return guests;
    return guests.filter((guest: GuestModel) =>
      [guest.name, guest.group, guest.tableName, guest.checkInCode, guest.qrCode, guest.invitationToken].some((value) =>
        (value || '').toLowerCase().includes(query)
      )
    );
  }

  get totalPages(): number {
    return Math.ceil(this.filteredGuests.length / this.pageSize) || 1;
  }

  get startIndex(): number {
    return (this.currentPage - 1) * this.pageSize;
  }

  get endIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredGuests.length);
  }

  get paginatedGuests(): GuestModel[] {
    return this.filteredGuests.slice(this.startIndex, this.endIndex);
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

  triggerCheckIn(): void {
    this.checkInEvent.emit();
  }

  openScanner(): void {
    this.openScannerEvent.emit();
  }

  closeScanner(): void {
    this.closeScannerEvent.emit();
  }

  onQrScanned(scannedCode: string): void {
    this.qrScannedEvent.emit(scannedCode);
  }
}
