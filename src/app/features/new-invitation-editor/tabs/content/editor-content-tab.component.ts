import { Component, Input, Output, EventEmitter } from '@angular/core';
import { GuestModel, InvitationModel } from '../../../../core/models';

type BrandAssetTarget = 'horizontal' | 'monogram' | 'pass';

@Component({
  selector: 'app-editor-content-tab',
  templateUrl: './editor-content-tab.component.html'
})
export class EditorContentTabComponent {
  @Input() invitation!: InvitationModel;
  @Input() loadedGuests: GuestModel[] = [];
  @Input() canUseWhiteLabel = false;
  @Input() assetUploading = false;
  @Input() allowedRolesText = '';
  @Input() allowedGroupsText = '';
  @Input() allowedEmailsText = '';
  @Input() allowedPhonesText = '';

  @Output() allowedRolesTextChange = new EventEmitter<string>();
  @Output() allowedGroupsTextChange = new EventEmitter<string>();
  @Output() allowedEmailsTextChange = new EventEmitter<string>();
  @Output() allowedPhonesTextChange = new EventEmitter<string>();
  @Output() applyTextVariant = new EventEmitter<'formal' | 'warm' | 'brief'>();
  @Output() uploadBrandAsset = new EventEmitter<{ target: BrandAssetTarget; files: File[] }>();
  @Output() removeBrandAsset = new EventEmitter<BrandAssetTarget>();

  newCustomRole = '';
  newCustomGroup = '';
  showExternalLogoInput = false;
  externalBrandLogoUrl = '';
  externalLogoError = '';

  get availableRoleOptions(): Array<{ value: string; label: string }> {
    const defaults = [
      { value: 'staff', label: 'Staff' }
    ];
    const map = new Map<string, { value: string; label: string }>();
    defaults.forEach(d => map.set(d.value.toLowerCase(), d));

    (this.loadedGuests || []).forEach(g => {
      (g.roles || []).forEach(r => {
        const clean = String(r || '').trim();
        if (clean && !map.has(clean.toLowerCase())) {
          map.set(clean.toLowerCase(), { value: clean.toLowerCase(), label: clean });
        }
      });
    });

    const currentSaved = (this.allowedRolesText || '').split('\n').map(l => l.trim()).filter(Boolean);
    currentSaved.forEach(r => {
      if (r && !map.has(r.toLowerCase())) {
        map.set(r.toLowerCase(), { value: r.toLowerCase(), label: r });
      }
    });

    return Array.from(map.values());
  }

  get availableGroupOptions(): Array<{ value: string; label: string }> {
    const map = new Map<string, { value: string; label: string }>();

    (this.loadedGuests || []).forEach(g => {
      const groupName = String(g.group || g.visibilityGroup || '').trim();
      if (groupName && !map.has(groupName.toLowerCase())) {
        map.set(groupName.toLowerCase(), { value: groupName, label: groupName });
      }
    });

    const currentSaved = (this.allowedGroupsText || '').split('\n').map(l => l.trim()).filter(Boolean);
    currentSaved.forEach(g => {
      if (g && !map.has(g.toLowerCase())) {
        map.set(g.toLowerCase(), { value: g, label: g });
      }
    });

    const defaults = ['Mesa VIP'];
    defaults.forEach(d => {
      if (!map.has(d.toLowerCase())) {
        map.set(d.toLowerCase(), { value: d, label: d });
      }
    });

    return Array.from(map.values());
  }

  isRoleSelected(roleValue: string): boolean {
    const lines = (this.allowedRolesText || '').split('\n').map(l => l.trim().toLowerCase());
    return lines.includes(roleValue.toLowerCase());
  }

  toggleRole(roleValue: string): void {
    const lines = (this.allowedRolesText || '').split('\n').map(l => l.trim()).filter(Boolean);
    const lower = roleValue.toLowerCase();
    const idx = lines.findIndex(l => l.toLowerCase() === lower);
    if (idx >= 0) {
      lines.splice(idx, 1);
    } else {
      lines.push(roleValue);
    }
    const updated = lines.join('\n');
    this.allowedRolesText = updated;
    this.allowedRolesTextChange.emit(updated);
  }

  addCustomRole(): void {
    const val = (this.newCustomRole || '').trim();
    if (!val) return;
    this.toggleRole(val);
    this.newCustomRole = '';
  }

  isGroupSelected(groupValue: string): boolean {
    const lines = (this.allowedGroupsText || '').split('\n').map(l => l.trim().toLowerCase());
    return lines.includes(groupValue.toLowerCase());
  }

  toggleGroup(groupValue: string): void {
    const lines = (this.allowedGroupsText || '').split('\n').map(l => l.trim()).filter(Boolean);
    const lower = groupValue.toLowerCase();
    const idx = lines.findIndex(l => l.toLowerCase() === lower);
    if (idx >= 0) {
      lines.splice(idx, 1);
    } else {
      lines.push(groupValue);
    }
    const updated = lines.join('\n');
    this.allowedGroupsText = updated;
    this.allowedGroupsTextChange.emit(updated);
  }

  addCustomGroup(): void {
    const val = (this.newCustomGroup || '').trim();
    if (!val) return;
    this.toggleGroup(val);
    this.newCustomGroup = '';
  }

  guestSearchTerm = '';

  get allowedGuestIds(): string[] {
    return (this.invitation?.rsvpSettings?.allowedGuestIds || []).map((id: any) =>
      typeof id === 'object' ? (id?._id || id?.id || String(id)) : String(id)
    );
  }

  get selectedGuestCount(): number {
    return this.allowedGuestIds.length;
  }

  get filteredLoadedGuests(): GuestModel[] {
    if (!this.guestSearchTerm?.trim()) {
      return this.loadedGuests || [];
    }
    const term = this.guestSearchTerm.toLowerCase().trim();
    return (this.loadedGuests || []).filter(g => {
      const name = (g.name || '').toLowerCase();
      const email = (g.email || '').toLowerCase();
      const phone = (g.phone || '').toLowerCase();
      const group = (g.group || g.visibilityGroup || '').toLowerCase();
      const table = (g.tableName || '').toLowerCase();
      const roles = (g.roles || []).join(' ').toLowerCase();
      return name.includes(term) || email.includes(term) || phone.includes(term) || group.includes(term) || table.includes(term) || roles.includes(term);
    });
  }

  getGuestId(guest: GuestModel): string {
    return String(guest._id || guest.id || '');
  }

  isGuestSelected(guestId: string): boolean {
    return this.allowedGuestIds.includes(guestId);
  }

  toggleGuest(guestId: string): void {
    if (!this.invitation) return;
    if (!this.invitation.rsvpSettings) {
      this.invitation.rsvpSettings = {};
    }
    const current = [...this.allowedGuestIds];
    const idx = current.indexOf(guestId);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(guestId);
    }
    this.invitation.rsvpSettings.allowedGuestIds = current;
  }

  selectAllGuests(): void {
    if (!this.invitation) return;
    if (!this.invitation.rsvpSettings) {
      this.invitation.rsvpSettings = {};
    }
    this.invitation.rsvpSettings.allowedGuestIds = (this.loadedGuests || [])
      .map(g => this.getGuestId(g))
      .filter(Boolean);
  }

  deselectAllGuests(): void {
    if (!this.invitation) return;
    if (!this.invitation.rsvpSettings) {
      this.invitation.rsvpSettings = {};
    }
    this.invitation.rsvpSettings.allowedGuestIds = [];
  }

  getGuestMeta(g: GuestModel): string {
    const parts: string[] = [];
    if (g.group || g.visibilityGroup) parts.push(g.group || g.visibilityGroup || '');
    if (g.roles?.length) parts.push(g.roles.join(', '));
    if (g.tableName) parts.push(`Mesa: ${g.tableName}`);
    if (g.email) parts.push(g.email);
    else if (g.phone) parts.push(g.phone);
    if (g.allowedCompanions) parts.push(`+${g.allowedCompanions} acompañante(s)`);
    return parts.join(' • ');
  }

  onApplyVariant(variant: 'formal' | 'warm' | 'brief'): void {
    this.applyTextVariant.emit(variant);
  }

  onBrandAssetSelected(target: BrandAssetTarget, files: File[]): void {
    this.uploadBrandAsset.emit({ target, files });
  }

  onRemoveBrandAsset(target: BrandAssetTarget): void {
    this.removeBrandAsset.emit(target);
  }

  toggleExternalLogoInput(): void {
    this.showExternalLogoInput = !this.showExternalLogoInput;
    this.externalBrandLogoUrl = '';
    this.externalLogoError = '';
  }

  applyExternalBrandLogoUrl(): void {
    const url = this.externalBrandLogoUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      this.externalLogoError = 'Ingresa un enlace válido que comience con http:// o https://.';
      return;
    }

    this.invitation.content.brandLogoUrl = url;
    this.externalBrandLogoUrl = '';
    this.externalLogoError = '';
    this.showExternalLogoInput = false;
  }
}
