import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { ApiService } from '../../../../core/api.service';
import { ConfirmDialogService } from '../../../../core/confirm-dialog.service';
import {
  GuestModel, GuestPayload, EventTableModel, InvitationModel, GuestCommunicationStatus
} from '../../../../core/models';

@Component({
  selector: 'app-event-guests-tab',
  templateUrl: './event-guests-tab.component.html'
})
export class EventGuestsTabComponent implements OnInit, OnChanges {
  @Input() eventId!: string;
  @Input() tables: EventTableModel[] = [];
  @Output() guestsUpdated = new EventEmitter<void>();

  guests: GuestModel[] = [];
  invitations: InvitationModel[] = [];
  guestsLoading = false;
  guestSaving = false;
  exportingGuests = false;
  importing = false;

  guestMessage = '';
  guestError = '';

  guestSearch = '';
  guestStatusFilter = '';
  guestCommunicationFilter = '';
  guestGroupFilter = '';

  // Guest Form
  showGuestForm = false;
  editingGuest?: GuestModel;
  countrySearchQuery = '';
  showCountryDropdown = false;

  guestFormSections = {
    organization: false,
    roles: false,
    companions: false
  };

  companionList: Array<{ name: string }> = [];

  countryCodes = [
    { code: '+52', country: '🇲🇽 México (+52)' },
    { code: '+1', country: '🇺🇸 EE.UU. / 🇨🇦 Canadá (+1)' },
    { code: '+54', country: '🇦🇷 Argentina (+54)' },
    { code: '+56', country: '🇨🇱 Chile (+56)' },
    { code: '+57', country: '🇨🇴 Colombia (+57)' },
    { code: '+593', country: '🇪🇨 Ecuador (+593)' },
    { code: '+34', country: '🇪🇸 España (+34)' },
    { code: '+502', country: '🇬🇹 Guatemala (+502)' },
    { code: '+51', country: '🇵🇪 Perú (+51)' },
    { code: '+506', country: '🇨🇷 Costa Rica (+506)' },
    { code: '+503', country: '🇸🇻 El Salvador (+503)' },
    { code: '+504', country: '🇭🇳 Honduras (+504)' },
    { code: '+595', country: '🇵🇾 Paraguay (+595)' },
    { code: '+598', country: '🇺🇾 Uruguay (+598)' },
    { code: '+58', country: '🇻🇪 Venezuela (+58)' }
  ];

  guestForm = {
    name: '',
    email: '',
    phoneCountryCode: '+52',
    phoneLocalNumber: '',
    group: '',
    tableId: '',
    seatLabel: '',
    allowedCompanions: 0,
    tagsText: '',
    roleKey: '',
    dietaryRestrictions: '',
    menuOption: '',
    notes: '',
    sendPassViaWhatsapp: true
  };

  companionNames = '';

  importFile?: File;
  importMessage = '';
  showImportMappingModal = false;
  importCsvHeaders: string[] = [];
  importRawRows: any[][] = [];
  importDuplicateOption: 'skip' | 'update' | 'allow' = 'skip';
  importColumnMapping: Record<string, string> = {
    name: '',
    email: '',
    phone: '',
    group: '',
    table: '',
    companions: '',
    companionNames: '',
    role: '',
    dietary: '',
    notes: '',
    tags: ''
  };

  checkInCode = '';
  checkInLink = '';
  showScanner = false;

  constructor(
    private apiService: ApiService,
    private confirmDialogService: ConfirmDialogService
  ) {}

  ngOnInit(): void {
    if (this.eventId) {
      this.loadGuests();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['eventId'] && !changes['eventId'].firstChange && this.eventId) {
      this.loadGuests();
    }
  }

  loadGuests(): void {
    this.guestsLoading = true;
    this.apiService.listGuests(this.eventId).subscribe({
      next: res => {
        this.guests = res.guests || [];
        this.guestsLoading = false;
      },
      error: err => {
        this.guestError = err?.error?.message || 'Error al cargar invitados';
        this.guestsLoading = false;
      }
    });
  }

  get guestGroups(): string[] {
    const groups = new Set<string>();
    for (const g of this.guests) {
      if (g.group) groups.add(g.group);
    }
    return Array.from(groups).sort();
  }

  get filteredGuests(): GuestModel[] {
    return this.guests.filter(g => {
      if (this.guestStatusFilter && g.status !== this.guestStatusFilter) return false;
      if (this.guestGroupFilter && g.group !== this.guestGroupFilter) return false;
      if (this.guestCommunicationFilter) {
        const commStatus = g.communicationStatus || 'pending';
        if (commStatus !== this.guestCommunicationFilter) return false;
      }
      if (this.guestSearch.trim()) {
        const q = this.guestSearch.toLowerCase().trim();
        const nameMatch = g.name.toLowerCase().includes(q);
        const emailMatch = g.email?.toLowerCase().includes(q) || false;
        const phoneMatch = g.phone?.includes(q) || false;
        const groupMatch = g.group?.toLowerCase().includes(q) || false;
        return nameMatch || emailMatch || phoneMatch || groupMatch;
      }
      return true;
    });
  }

  get filteredCountryCodes(): Array<{ code: string; country: string }> {
    if (!this.countrySearchQuery.trim()) return this.countryCodes;
    const query = this.countrySearchQuery.toLowerCase().trim();
    return this.countryCodes.filter(c => c.country.toLowerCase().includes(query) || c.code.toLowerCase().includes(query));
  }

  selectCountryCode(code: string): void {
    this.guestForm.phoneCountryCode = code;
    this.showCountryDropdown = false;
    this.countrySearchQuery = '';
  }

  getSelectedCountryLabel(): string {
    const found = this.countryCodes.find(c => c.code === this.guestForm.phoneCountryCode);
    return found ? found.country : `${this.guestForm.phoneCountryCode || '+52'}`;
  }

  toggleGuestFormSection(section: 'organization' | 'roles' | 'companions'): void {
    this.guestFormSections[section] = !this.guestFormSections[section];
  }

  expandAllGuestFormSections(expand: boolean): void {
    this.guestFormSections.organization = expand;
    this.guestFormSections.roles = expand;
    this.guestFormSections.companions = expand;
  }

  onCompanionsCountChange(): void {
    const targetCount = Math.max(0, Math.floor(Number(this.guestForm.allowedCompanions || 0)));
    this.guestForm.allowedCompanions = targetCount;
    while (this.companionList.length < targetCount) {
      this.companionList.push({ name: '' });
    }
    if (this.companionList.length > targetCount) {
      this.companionList = this.companionList.slice(0, targetCount);
    }
    this.syncCompanionNamesText();
  }

  onCompanionNameChange(): void {
    this.syncCompanionNamesText();
  }

  addCompanionRow(): void {
    this.companionList.push({ name: '' });
    this.guestForm.allowedCompanions = this.companionList.length;
    this.syncCompanionNamesText();
  }

  removeCompanionRow(index: number): void {
    if (index >= 0 && index < this.companionList.length) {
      this.companionList.splice(index, 1);
      this.guestForm.allowedCompanions = this.companionList.length;
      this.syncCompanionNamesText();
    }
  }

  syncCompanionNamesText(): void {
    this.companionNames = this.companionList
      .map(c => (c.name || '').trim())
      .filter(Boolean)
      .join('\n');
  }

  openGuestForm(guest?: GuestModel): void {
    this.guestError = '';
    this.guestMessage = '';
    if (guest) {
      this.editingGuest = guest;
      let code = '+52';
      let localNum = guest.phone || '';
      for (const c of this.countryCodes) {
        if (localNum.startsWith(c.code)) {
          code = c.code;
          localNum = localNum.slice(c.code.length).trim();
          break;
        }
      }
      this.guestForm = {
        name: guest.name || '',
        email: guest.email || '',
        phoneCountryCode: code,
        phoneLocalNumber: localNum,
        group: guest.group || '',
        tableId: '',
        seatLabel: guest.seatLabel || '',
        allowedCompanions: guest.allowedCompanions || 0,
        tagsText: (guest.tags || []).join(', '),
        roleKey: (guest.roles && guest.roles[0]) || '',
        dietaryRestrictions: '',
        menuOption: '',
        notes: '',
        sendPassViaWhatsapp: true
      };
      this.companionList = (guest.companions || []).map(c => ({ name: c.name || '' }));
      this.syncCompanionNamesText();
      this.expandAllGuestFormSections(true);
    } else {
      this.editingGuest = undefined;
      this.guestForm = {
        name: '', email: '', phoneCountryCode: '+52', phoneLocalNumber: '',
        group: '', tableId: '', seatLabel: '', allowedCompanions: 0,
        tagsText: '', roleKey: '', dietaryRestrictions: '', menuOption: '',
        notes: '', sendPassViaWhatsapp: true
      };
      this.companionList = [];
      this.companionNames = '';
      this.expandAllGuestFormSections(false);
    }
    this.showGuestForm = true;
  }

  saveGuest(keepContext = false): void {
    if (!this.guestForm.name.trim()) {
      this.guestError = 'El nombre del invitado es obligatorio.';
      return;
    }
    this.guestSaving = true;
    this.guestError = '';

    const fullPhone = this.guestForm.phoneLocalNumber.trim()
      ? `${this.guestForm.phoneCountryCode}${this.guestForm.phoneLocalNumber.trim()}`
      : undefined;

    const companionsArray = this.companionList
      .map(c => ({ name: c.name.trim() }))
      .filter(c => !!c.name);

    const payload: GuestPayload = {
      event: this.eventId,
      name: this.guestForm.name.trim(),
      email: this.guestForm.email.trim() || undefined,
      phone: fullPhone,
      group: this.guestForm.group.trim() || undefined,
      seatLabel: this.guestForm.seatLabel.trim() || undefined,
      allowedCompanions: Number(this.guestForm.allowedCompanions || 0),
      companions: companionsArray,
      roles: this.guestForm.roleKey ? [this.guestForm.roleKey] : undefined,
      tags: this.guestForm.tagsText.split(',').map(t => t.trim()).filter(Boolean)
    };

    if (this.editingGuest) {
      const gId = (this.editingGuest._id || this.editingGuest.id)!;
      this.apiService.updateGuest(gId, payload).subscribe({
        next: res => {
          const updated = res.guest;
          const idx = this.guests.findIndex(g => (g._id || g.id) === gId);
          if (idx !== -1) this.guests[idx] = updated;
          this.guestSaving = false;
          this.showGuestForm = false;
          this.guestMessage = `Invitado ${updated.name} actualizado.`;
          this.guestsUpdated.emit();
        },
        error: err => {
          this.guestError = err?.error?.message || 'Error al actualizar invitado';
          this.guestSaving = false;
        }
      });
    } else {
      this.apiService.createGuest(payload).subscribe({
        next: res => {
          const created = res.guest;
          this.guests.push(created);
          this.guestSaving = false;
          this.guestsUpdated.emit();
          if (keepContext) {
            this.guestMessage = `¡Invitado ${created.name} guardado! Puedes agregar otro.`;
            this.guestForm.name = '';
            this.guestForm.email = '';
            this.guestForm.phoneLocalNumber = '';
            this.guestForm.allowedCompanions = 0;
            this.companionList = [];
            this.companionNames = '';
          } else {
            this.showGuestForm = false;
            this.guestMessage = `Invitado ${created.name} agregado con éxito.`;
          }
        },
        error: err => {
          this.guestError = err?.error?.message || 'Error al agregar invitado';
          this.guestSaving = false;
        }
      });
    }
  }

  deleteGuest(guest: GuestModel): void {
    const gId = (guest._id || guest.id)!;
    this.confirmDialogService.confirm({
      title: 'Eliminar invitado',
      message: `¿Estás seguro de eliminar a ${guest.name}?`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    }).then(confirmed => {
      if (!confirmed) return;
      this.apiService.deleteGuest(gId).subscribe({
        next: () => {
          this.guests = this.guests.filter(g => (g._id || g.id) !== gId);
          this.guestMessage = `Invitado ${guest.name} eliminado.`;
          this.guestsUpdated.emit();
        },
        error: err => {
          this.guestError = err?.error?.message || 'Error al eliminar invitado';
        }
      });
    });
  }

  selectImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.importFile = input.files[0];
      this.processImport();
    }
  }

  processImport(): void {
    if (!this.importFile) return;
    this.importing = true;
    this.apiService.importGuests(this.eventId, this.importFile).subscribe({
      next: res => {
        this.importing = false;
        this.importFile = undefined;
        this.guestMessage = `¡Importación completada! Se procesaron los invitados correctamente.`;
        this.loadGuests();
        this.guestsUpdated.emit();
      },
      error: err => {
        this.importing = false;
        this.guestError = err?.error?.message || 'Error al importar archivo';
      }
    });
  }

  exportGuests(): void {
    this.exportingGuests = true;
    this.apiService.exportGuests(this.eventId).subscribe({
      next: blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invitados-evento-${this.eventId}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.exportingGuests = false;
      },
      error: () => {
        this.exportingGuests = false;
      }
    });
  }

  openScanner(): void { this.showScanner = true; }
  closeScanner(): void { this.showScanner = false; }

  onQrScanned(code: string): void {
    this.checkInCode = code;
    this.checkInGuest();
  }

  checkInGuest(): void {
    if (!this.checkInCode.trim()) return;
    this.apiService.checkInGuest(this.checkInCode.trim()).subscribe({
      next: res => {
        this.guestMessage = `Check-in exitoso para ${res.guest?.name || 'invitado'}`;
        this.checkInCode = '';
        this.showScanner = false;
        this.loadGuests();
        this.guestsUpdated.emit();
      },
      error: err => {
        this.guestError = err?.error?.message || 'Error en check-in';
      }
    });
  }
}
