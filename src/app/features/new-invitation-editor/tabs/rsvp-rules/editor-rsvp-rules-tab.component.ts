import { Component, Input, Output, EventEmitter } from '@angular/core';
import { EventModel, GuestModel, InvitationModel } from '../../../../core/models';

@Component({
  selector: 'app-editor-rsvp-rules-tab',
  templateUrl: './editor-rsvp-rules-tab.component.html'
})
export class EditorRsvpRulesTabComponent {
  @Input() invitation!: InvitationModel;
  @Input() event?: EventModel;
  @Input() loadedGuests: GuestModel[] = [];
  @Input() customQuestionsList: Array<{
    key: string;
    label: string;
    type: 'text' | 'textarea' | 'select' | 'boolean';
    required: boolean;
    optionsText?: string;
    options?: string[];
  }> = [];
  @Input() allowedRolesText = '';
  @Input() allowedGroupsText = '';
  @Input() allowedEmailsText = '';
  @Input() allowedPhonesText = '';

  @Output() allowedRolesTextChange = new EventEmitter<string>();
  @Output() allowedGroupsTextChange = new EventEmitter<string>();
  @Output() allowedEmailsTextChange = new EventEmitter<string>();
  @Output() allowedPhonesTextChange = new EventEmitter<string>();

  @Output() toggleIdentityMethod = new EventEmitter<{ method: 'email' | 'phone'; checked: boolean }>();
  @Output() addCustomQuestion = new EventEmitter<void>();
  @Output() removeCustomQuestion = new EventEmitter<number>();
  @Output() addQuestionPreset = new EventEmitter<'song' | 'diet' | 'menu' | 'transport'>();
  @Output() syncQuestions = new EventEmitter<void>();
  @Output() toggleSectionActive = new EventEmitter<{ key: string; active: boolean }>();

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

  isSectionActive(key: string): boolean {
    if (!this.invitation?.content.sectionSettings) return true;
    const settings = this.invitation.content.sectionSettings as any;
    if (key === 'rsvp_rules' || key === 'rsvp') return settings.rsvp !== false;
    return settings[key] !== false;
  }

  parseOptionsText(text?: string): string[] {
    if (!text) return [];
    return text.split(';').map(s => s.trim()).filter(Boolean);
  }

  ensureOptionsArray(q: any): string[] {
    if (!q.options || !q.options.length) {
      q.options = this.parseOptionsText(q.optionsText);
    }
    return q.options;
  }

  addQuestionOption(q: any, defaultText = 'Nueva opción'): void {
    if (!q.options) q.options = [];
    q.options.push(defaultText);
    q.optionsText = q.options.join('; ');
    this.syncQuestions.emit();
  }

  removeQuestionOption(q: any, index: number): void {
    if (!q.options) return;
    q.options.splice(index, 1);
    q.optionsText = q.options.join('; ');
    this.syncQuestions.emit();
  }

  onOptionRowChange(q: any): void {
    if (q.options) {
      q.optionsText = q.options.join('; ');
    }
    this.syncQuestions.emit();
  }

  getOptionValue(q: any, idx: number): string {
    return q.options && q.options[idx] !== undefined ? q.options[idx] : '';
  }

  setOptionValue(q: any, idx: number, val: string): void {
    if (!q.options) q.options = [];
    q.options[idx] = val;
    q.optionsText = q.options.join('; ');
    this.syncQuestions.emit();
  }

  trackByIndex(index: number): number {
    return index;
  }

  get reminderNotice(): { text: string; dateFormatted: string; detail?: string } | null {
    const rsvp = this.invitation?.rsvpSettings;
    if (!rsvp) return null;

    const days = rsvp.reminderDaysBeforeDeadline !== undefined && rsvp.reminderDaysBeforeDeadline !== null
      ? Number(rsvp.reminderDaysBeforeDeadline)
      : 3;

    if (isNaN(days) || days < 0) return null;

    // Base date priority: deadline > event date
    const deadlineRaw = rsvp.deadline;
    const eventDateRaw = this.event?.date || (typeof this.invitation?.event === 'object' ? (this.invitation.event as EventModel)?.date : '');

    let baseDate: Date | null = null;
    let baseLabel = '';

    if (deadlineRaw) {
      baseDate = this.parseLocalDate(deadlineRaw);
      if (baseDate) {
        baseLabel = 'de la fecha límite de respuesta';
      }
    }

    if (!baseDate && eventDateRaw) {
      baseDate = this.parseLocalDate(eventDateRaw);
      if (baseDate) {
        baseLabel = 'del día del evento';
      }
    }

    if (!baseDate) {
      return {
        text: 'Aviso de recordatorio automático:',
        dateFormatted: `${days} día${days === 1 ? '' : 's'} antes`,
        detail: 'Define la fecha límite o la fecha del evento para ver el día calendario exacto.'
      };
    }

    // Calculate reminder date: baseDate - days
    const reminderDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() - days);

    // Format in Spanish
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };

    let formatted = reminderDate.toLocaleDateString('es-ES', options);
    formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);

    const baseShort = `${baseDate.getDate().toString().padStart(2, '0')}/${(baseDate.getMonth() + 1).toString().padStart(2, '0')}/${baseDate.getFullYear()}`;
    const reminderShort = `${reminderDate.getDate().toString().padStart(2, '0')}/${(reminderDate.getMonth() + 1).toString().padStart(2, '0')}`;

    if (days === 0) {
      return {
        text: 'El recordatorio se enviará el mismo día:',
        dateFormatted: `${formatted} (${reminderShort})`,
        detail: `Coincide con el día programado (${baseLabel}: ${baseShort}).`
      };
    }

    return {
      text: 'El recordatorio se enviará el:',
      dateFormatted: `${formatted} (${reminderShort})`,
      detail: `${days} día${days === 1 ? '' : 's'} antes ${baseLabel} (${baseShort}).`
    };
  }

  private parseLocalDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    try {
      if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        const parts = dateStr.split('T')[0].split('-').map(Number);
        if (parts.length === 3) {
          return new Date(parts[0], parts[1] - 1, parts[2]);
        }
      }
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
    } catch {
      return null;
    }
  }
}
