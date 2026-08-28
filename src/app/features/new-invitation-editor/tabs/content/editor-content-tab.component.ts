import { Component, Input, Output, EventEmitter } from '@angular/core';
import { GuestModel, InvitationModel } from '../../../../core/models';

@Component({
  selector: 'app-editor-content-tab',
  templateUrl: './editor-content-tab.component.html'
})
export class EditorContentTabComponent {
  @Input() invitation!: InvitationModel;
  @Input() loadedGuests: GuestModel[] = [];
  @Input() canUseWhiteLabel = false;
  @Input() allowedRolesText = '';
  @Input() allowedGroupsText = '';
  @Input() allowedEmailsText = '';
  @Input() allowedPhonesText = '';

  @Output() allowedRolesTextChange = new EventEmitter<string>();
  @Output() allowedGroupsTextChange = new EventEmitter<string>();
  @Output() allowedEmailsTextChange = new EventEmitter<string>();
  @Output() allowedPhonesTextChange = new EventEmitter<string>();
  @Output() applyTextVariant = new EventEmitter<'formal' | 'warm' | 'brief'>();

  newCustomRole = '';
  newCustomGroup = '';

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

  onApplyVariant(variant: 'formal' | 'warm' | 'brief'): void {
    this.applyTextVariant.emit(variant);
  }
}
