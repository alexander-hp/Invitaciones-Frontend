import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { ApiService } from '../../../../core/api.service';
import { ConfirmDialogService } from '../../../../core/confirm-dialog.service';
import {
  GuestModel, GuestPayload, EventTableModel, InvitationModel
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
  private messageTimeout?: any;
  private errorTimeout?: any;

  guestSearch = '';
  guestStatusFilter = '';
  guestCommunicationFilter = '';
  guestGroupFilter = '';

  showImpExpMenu = false;

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

  unifiedGuestOptions = [
    'Familia del Novio / Anfitrión',
    'Familia de la Novia / Anfitriona',
    'Amigos Cercanos',
    'Padrinos / Madrinas',
    'Damas de Honor / Best Men',
    'Anfitriones / Novios',
    'Compañeros de Trabajo',
    'Invitados VIP',
    'Staff / Proveedores'
  ];

  roleOptions: Array<{ value: string; label: string }> = [
    { value: 'invitado', label: 'Invitado' },
    { value: 'anfitrion', label: 'Anfitrión' },
    { value: 'padrino', label: 'Padrino' },
    { value: 'dama_honor', label: 'Dama de honor' },
    { value: 'familia', label: 'Familia' },
    { value: 'graduado', label: 'Graduado' },
    { value: 'staff', label: 'Staff' },
    { value: 'vip', label: 'VIP' }
  ];

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
    phone: '',
    phoneCountryCode: '+52',
    phoneLocal: '',
    group: '',
    groupSelect: '',
    rolesText: '',
    roleSelect: '',
    tagsText: '',
    relationshipLabel: '',
    relationshipSelect: '',
    visibilityGroup: '',
    visibilitySelect: '',
    tableName: '',
    seatLabel: '',
    allowedCompanions: 0,
    checkedIn: false
  };

  companionNames = '';

  importFile?: File;
  importMessage = '';

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

  get availableUnifiedOptions(): string[] {
    const set = new Set([...this.unifiedGuestOptions, ...this.guestGroups]);
    return Array.from(set).filter(g => g && g !== 'General');
  }

  get availableGroupOptions(): string[] {
    return this.availableUnifiedOptions;
  }

  get relationshipOptions(): string[] {
    return this.availableUnifiedOptions;
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

  onGroupSelectChange(): void {
    if (this.guestForm.groupSelect !== 'otro') {
      this.guestForm.group = this.guestForm.groupSelect;
    } else {
      if (this.availableUnifiedOptions.includes(this.guestForm.group)) {
        this.guestForm.group = '';
      }
    }
    this.syncCrossFields('group', this.guestForm.group);
  }

  onRelationshipSelectChange(): void {
    if (this.guestForm.relationshipSelect !== 'otro') {
      this.guestForm.relationshipLabel = this.guestForm.relationshipSelect;
    } else {
      if (this.availableUnifiedOptions.includes(this.guestForm.relationshipLabel)) {
        this.guestForm.relationshipLabel = '';
      }
    }
    this.syncCrossFields('relationship', this.guestForm.relationshipLabel);
  }

  onVisibilitySelectChange(): void {
    if (this.guestForm.visibilitySelect !== 'otro') {
      this.guestForm.visibilityGroup = this.guestForm.visibilitySelect;
    } else {
      if (this.availableUnifiedOptions.includes(this.guestForm.visibilityGroup)) {
        this.guestForm.visibilityGroup = '';
      }
    }
    this.syncCrossFields('visibility', this.guestForm.visibilityGroup);
  }

  syncCrossFields(source: 'group' | 'relationship' | 'visibility', val: string): void {
    if (!val || val === 'otro') return;

    const selectVal = this.availableUnifiedOptions.includes(val) ? val : 'otro';

    if (source !== 'group' && (!this.guestForm.group || !this.guestForm.groupSelect)) {
      this.guestForm.group = val;
      this.guestForm.groupSelect = selectVal;
    }

    if (source !== 'relationship' && (!this.guestForm.relationshipLabel || !this.guestForm.relationshipSelect)) {
      this.guestForm.relationshipLabel = val;
      this.guestForm.relationshipSelect = selectVal;
    }

    if (source !== 'visibility' && (!this.guestForm.visibilityGroup || !this.guestForm.visibilitySelect)) {
      this.guestForm.visibilityGroup = val;
      this.guestForm.visibilitySelect = selectVal;
    }

    if (!this.guestForm.roleSelect || this.guestForm.roleSelect === 'invitado') {
      const lower = val.toLowerCase();
      if (lower.includes('padrino') || lower.includes('madrina')) {
        this.guestForm.roleSelect = 'padrino';
        this.guestForm.rolesText = 'padrino';
      } else if (lower.includes('dama') || lower.includes('best men')) {
        this.guestForm.roleSelect = 'dama_honor';
        this.guestForm.rolesText = 'dama_honor';
      } else if (lower.includes('anfitrión') || lower.includes('novio') || lower.includes('festejado')) {
        this.guestForm.roleSelect = 'anfitrion';
        this.guestForm.rolesText = 'anfitrion';
      } else if (lower.includes('staff') || lower.includes('proveedor')) {
        this.guestForm.roleSelect = 'staff';
        this.guestForm.rolesText = 'staff';
      } else if (lower.includes('vip')) {
        this.guestForm.roleSelect = 'vip';
        this.guestForm.rolesText = 'vip';
      } else if (lower.includes('familia')) {
        this.guestForm.roleSelect = 'familia';
        this.guestForm.rolesText = 'familia';
      }
    }
  }

  onRoleSelectChange(): void {
    if (this.guestForm.roleSelect !== 'otro') {
      this.guestForm.rolesText = this.guestForm.roleSelect;
    } else {
      if (this.roleOptions.some(o => o.value === this.guestForm.rolesText)) {
        this.guestForm.rolesText = '';
      }
    }

    const roleVal = this.guestForm.roleSelect;
    if (!roleVal || roleVal === 'otro') return;

    if (!this.guestForm.relationshipSelect) {
      const match = this.relationshipOptions.find(opt => {
        const lowerOpt = opt.toLowerCase();
        if (roleVal === 'padrino') return lowerOpt.includes('padrino') || lowerOpt.includes('madrina');
        if (roleVal === 'dama_honor') return lowerOpt.includes('dama');
        if (roleVal === 'anfitrion') return lowerOpt.includes('anfitrión') || lowerOpt.includes('anfitriona');
        if (roleVal === 'staff') return lowerOpt.includes('staff');
        if (roleVal === 'vip') return lowerOpt.includes('vip');
        if (roleVal === 'familia') return lowerOpt.includes('familia') || lowerOpt.includes('padres');
        if (roleVal === 'graduado') return lowerOpt.includes('graduado');
        return false;
      });
      if (match) {
        this.guestForm.relationshipSelect = match;
        this.guestForm.relationshipLabel = match;
      }
    }

    if (!this.guestForm.visibilitySelect) {
      if (['padrino', 'vip'].includes(roleVal)) {
        this.guestForm.visibilitySelect = 'vip';
        this.guestForm.visibilityGroup = 'vip';
      } else if (roleVal === 'staff') {
        this.guestForm.visibilitySelect = 'staff';
        this.guestForm.visibilityGroup = 'staff';
      } else if (roleVal === 'anfitrion') {
        this.guestForm.visibilitySelect = 'anfitriones';
        this.guestForm.visibilityGroup = 'anfitriones';
      } else if (roleVal === 'familia') {
        this.guestForm.visibilitySelect = 'familia';
        this.guestForm.visibilityGroup = 'familia';
      }
    }
  }

  parsePhoneParts(phone?: string): { countryCode: string; localNumber: string } {
    if (!phone) return { countryCode: '+52', localNumber: '' };
    const clean = phone.trim();
    const codes = ['+52', '+1', '+54', '+56', '+57', '+593', '+34', '+502', '+51', '+506', '+503', '+504', '+595', '+598', '+58'];
    for (const code of codes) {
      if (clean.startsWith(code)) {
        return { countryCode: code, localNumber: clean.substring(code.length).replace(/\D/g, '') };
      }
    }
    return { countryCode: '+52', localNumber: clean.replace(/\D/g, '') };
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

  showSuccess(msg: string): void {
    this.guestMessage = msg;
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
    this.messageTimeout = setTimeout(() => {
      this.guestMessage = '';
    }, 3500);
  }

  showError(msg: string): void {
    this.guestError = msg;
    if (this.errorTimeout) clearTimeout(this.errorTimeout);
    this.errorTimeout = setTimeout(() => {
      this.guestError = '';
    }, 4000);
  }

  clearFilters(): void {
    this.guestSearch = '';
    this.guestStatusFilter = '';
    this.guestGroupFilter = '';
    this.guestCommunicationFilter = '';
  }

  toggleImpExpMenu(event: Event): void {
    event.stopPropagation();
    this.showImpExpMenu = !this.showImpExpMenu;
  }

  openGuestForm(guest?: GuestModel): void {
    this.guestError = '';
    this.guestMessage = '';
    this.countrySearchQuery = '';
    this.showCountryDropdown = false;

    if (guest) {
      this.editingGuest = guest;
      const parsedPhone = this.parsePhoneParts(guest.phone);
      const groupVal = guest.group || '';
      const groupSel = !groupVal ? '' : (this.availableGroupOptions.includes(groupVal) ? groupVal : 'otro');

      const relVal = guest.relationshipLabel || '';
      const relSel = !relVal ? '' : (this.relationshipOptions.includes(relVal) ? relVal : 'otro');

      const visVal = guest.visibilityGroup || '';
      const visSel = !visVal ? '' : (this.availableUnifiedOptions.includes(visVal) ? visVal : 'otro');

      const rolesVal = (guest.roles || []).join(', ');
      const roleSel = !rolesVal ? '' : (this.roleOptions.some(o => o.value === rolesVal) ? rolesVal : 'otro');

      this.guestForm = {
        name: guest.name || '',
        email: guest.email || '',
        phone: guest.phone || '',
        phoneCountryCode: parsedPhone.countryCode,
        phoneLocal: parsedPhone.localNumber,
        group: groupVal,
        groupSelect: groupSel,
        rolesText: rolesVal,
        roleSelect: roleSel,
        tagsText: (guest.tags || []).join(', '),
        relationshipLabel: relVal,
        relationshipSelect: relSel,
        visibilityGroup: visVal,
        visibilitySelect: visSel,
        tableName: guest.tableName || '',
        seatLabel: guest.seatLabel || '',
        allowedCompanions: guest.allowedCompanions || 0,
        checkedIn: Boolean(guest.checkedIn || guest.checkedInAt)
      };

      const companionArr = (guest.companions || []).map(c => c.name || '').filter(Boolean);
      this.companionNames = companionArr.join('\n');
      const count = Math.max(Number(guest.allowedCompanions || 0), companionArr.length);
      this.guestForm.allowedCompanions = count;

      this.companionList = [];
      for (let i = 0; i < count; i++) {
        this.companionList.push({ name: companionArr[i] || '' });
      }

      this.guestFormSections = {
        organization: Boolean(groupVal || guest.tableName || guest.seatLabel),
        roles: Boolean(relVal || visVal || rolesVal),
        companions: Boolean(count || (guest.tags && guest.tags.length > 0))
      };
    } else {
      this.editingGuest = undefined;
      this.guestForm = {
        name: '', email: '', phone: '', phoneCountryCode: '+52', phoneLocal: '', group: '', groupSelect: '', rolesText: '', roleSelect: '', tagsText: '',
        relationshipLabel: '', relationshipSelect: '', visibilityGroup: '', visibilitySelect: '', tableName: '', seatLabel: '', allowedCompanions: 0,
        checkedIn: false
      };
      this.companionNames = '';
      this.companionList = [];
      this.guestFormSections = { organization: false, roles: false, companions: false };
    }
    this.showGuestForm = true;

    setTimeout(() => {
      const input = document.getElementById('guestNameInput') as HTMLInputElement;
      if (input) input.focus();
    }, 100);
  }

  saveGuest(keepOpen = false): void {
    const nameClean = (this.guestForm.name || '').trim();
    if (!nameClean) {
      this.showError('El nombre del invitado es obligatorio.');
      return;
    }

    const cleanLocal = (this.guestForm.phoneLocal || '').trim().replace(/\D/g, '');
    const emailClean = (this.guestForm.email || '').trim();

    if (!cleanLocal && !emailClean) {
      this.showError('Por favor ingresa al menos un medio de contacto (Teléfono o Correo electrónico).');
      return;
    }

    const fullPhone = cleanLocal ? `${this.guestForm.phoneCountryCode || '+52'}${cleanLocal}` : '';
    this.guestForm.phone = fullPhone;

    this.guestSaving = true;
    this.guestError = '';
    const wasEditing = Boolean(this.editingGuest);

    const companionsArray = this.companionList
      .map(c => ({ name: c.name.trim(), tableName: this.guestForm.tableName || undefined }))
      .filter(c => !!c.name);

    const payload: GuestPayload = {
      event: this.eventId,
      name: nameClean,
      email: emailClean || undefined,
      phone: fullPhone || undefined,
      group: this.guestForm.group || undefined,
      roles: this.splitCsv(this.guestForm.rolesText),
      tags: this.splitCsv(this.guestForm.tagsText),
      relationshipLabel: this.guestForm.relationshipLabel || undefined,
      visibilityGroup: this.guestForm.visibilityGroup || undefined,
      tableName: this.guestForm.tableName || undefined,
      seatLabel: this.guestForm.seatLabel || undefined,
      allowedCompanions: Number(this.guestForm.allowedCompanions || 0),
      companions: companionsArray,
      checkedIn: this.guestForm.checkedIn
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
          this.showSuccess(`Invitado "${updated.name}" actualizado.`);
          this.guestsUpdated.emit();
        },
        error: err => {
          this.showError(err?.error?.message || 'Error al actualizar invitado.');
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
          this.showSuccess(`¡Invitado "${created.name}" guardado exitosamente!`);

          if (keepOpen) {
            const lastGroup = this.guestForm.group;
            const lastGroupSel = this.guestForm.groupSelect;
            const lastCode = this.guestForm.phoneCountryCode;
            const lastTable = this.guestForm.tableName;
            const lastRelLabel = this.guestForm.relationshipLabel;
            const lastRelSel = this.guestForm.relationshipSelect;
            const lastRoleText = this.guestForm.rolesText;
            const lastRoleSel = this.guestForm.roleSelect;
            const lastVisGroup = this.guestForm.visibilityGroup;
            const lastVisSel = this.guestForm.visibilitySelect;

            this.guestForm.name = '';
            this.guestForm.email = '';
            this.guestForm.phoneLocal = '';
            this.companionNames = '';
            this.companionList = [];
            this.guestForm.allowedCompanions = 0;
            this.guestForm.checkedIn = false;

            this.guestForm.phoneCountryCode = lastCode || '+52';
            this.guestForm.group = lastGroup;
            this.guestForm.groupSelect = lastGroupSel;
            this.guestForm.tableName = lastTable;
            this.guestForm.relationshipLabel = lastRelLabel;
            this.guestForm.relationshipSelect = lastRelSel;
            this.guestForm.rolesText = lastRoleText;
            this.guestForm.roleSelect = lastRoleSel;
            this.guestForm.visibilityGroup = lastVisGroup;
            this.guestForm.visibilitySelect = lastVisSel;

            setTimeout(() => {
              const input = document.getElementById('guestNameInput') as HTMLInputElement;
              if (input) input.focus();
            }, 50);
          } else {
            this.showGuestForm = false;
          }
        },
        error: err => {
          this.showError(err?.error?.message || 'Error al agregar invitado.');
          this.guestSaving = false;
        }
      });
    }
  }

  private splitCsv(val?: string): string[] | undefined {
    if (!val) return undefined;
    const items = val.split(',').map(s => s.trim()).filter(Boolean);
    return items.length ? items : undefined;
  }

  deleteGuest(guest: GuestModel): void {
    const gId = (guest._id || guest.id)!;
    this.confirmDialogService.confirm({
      title: '¿Eliminar invitado?',
      message: `¿Estás seguro de que deseas eliminar a "${guest.name}"?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    }).then(confirmed => {
      if (!confirmed) return;
      this.apiService.deleteGuest(gId).subscribe({
        next: () => {
          this.guests = this.guests.filter(g => (g._id || g.id) !== gId);
          this.showSuccess(`Invitado "${guest.name}" eliminado.`);
          this.guestsUpdated.emit();
        },
        error: err => {
          this.showError(err?.error?.message || 'Error al eliminar invitado');
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
      next: () => {
        this.importing = false;
        this.importFile = undefined;
        this.showSuccess(`¡Importación completada! Se procesaron los invitados correctamente.`);
        this.loadGuests();
        this.guestsUpdated.emit();
      },
      error: err => {
        this.importing = false;
        this.showError(err?.error?.message || 'Error al importar archivo');
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
        this.showSuccess('Archivo de invitados exportado exitosamente.');
      },
      error: () => {
        this.exportingGuests = false;
        this.showError('Error al exportar la lista de invitados.');
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
        this.showSuccess(`Check-in exitoso para ${res.guest?.name || 'invitado'}`);
        this.checkInCode = '';
        this.showScanner = false;
        this.loadGuests();
        this.guestsUpdated.emit();
      },
      error: err => {
        this.showError(err?.error?.message || 'Error en check-in');
      }
    });
  }
}
