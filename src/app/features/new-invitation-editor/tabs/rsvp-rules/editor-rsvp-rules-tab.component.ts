import { Component, Input, Output, EventEmitter } from '@angular/core';
import { EventModel, GuestModel, InvitationModel } from '../../../../core/models';

@Component({
  selector: 'app-editor-rsvp-rules-tab',
  templateUrl: './editor-rsvp-rules-tab.component.html',
  styleUrls: ['./editor-rsvp-rules-tab.component.css']
})
export class EditorRsvpRulesTabComponent {
  readonly questionPresets = {
    song: { key: 'cancion_preferida_para_la_fiesta', label: 'Canción preferida para la fiesta' },
    diet: { key: 'restricciones_o_alergias_alimenticias', label: 'Restricciones o alergias alimenticias' },
    menu: { key: 'opcion_de_platillo_preferido', label: 'Opción de platillo preferido' },
    transport: { key: 'requieres_transporte_del_hotel_a_la_recepcion', label: '¿Requieres transporte del hotel a la recepción?' }
  } as const;

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

  isQuestionPresetSelected(presetKey: keyof typeof this.questionPresets): boolean {
    const preset = this.questionPresets[presetKey];
    return this.customQuestionsList.some(question => {
      const questionKey = this.normalizeQuestionKey(question.key || question.label);
      return questionKey === preset.key || this.normalizeQuestionKey(question.label) === preset.key;
    });
  }

  private normalizeQuestionKey(value: unknown): string {
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  get deadlineDate(): string {
    return String(this.invitation?.rsvpSettings?.deadline || '').slice(0, 10);
  }

  get deadlineTime(): string {
    const value = String(this.invitation?.rsvpSettings?.deadline || '');
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) ? value.slice(11, 16) : '';
  }

  get deadlineMinDate(): string {
    return this.toLocalDateInput(new Date());
  }

  get deadlineMaxDate(): string {
    const eventDate = this.getEventDateTime();
    return eventDate ? this.toLocalDateInput(eventDate) : '';
  }

  get deadlineMinTime(): string {
    if (this.deadlineDate !== this.deadlineMinDate) return '00:00';
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1, 0, 0);
    return this.toLocalTimeInput(now);
  }

  get deadlineMaxTime(): string {
    if (!this.deadlineMaxDate || this.deadlineDate !== this.deadlineMaxDate) return '23:59';
    const eventDate = this.getEventDateTime();
    return eventDate ? this.toLocalTimeInput(eventDate) : '23:59';
  }

  get hasAvailableDeadlineRange(): boolean {
    const eventDate = this.getEventDateTime();
    return Boolean(eventDate && eventDate.getTime() >= this.currentMinute().getTime());
  }

  get deadlineRangeLabel(): string {
    const eventDate = this.getEventDateTime();
    if (!eventDate) return 'Primero define la fecha del evento.';
    if (!this.hasAvailableDeadlineRange) return 'El evento ya ocurrió; actualiza su fecha para recibir confirmaciones.';
    return `Puedes recibir respuestas desde hoy hasta ${this.formatLongDateTime(eventDate)}.`;
  }

  get deadlineValidationMessage(): string {
    const raw = this.invitation?.rsvpSettings?.deadline;
    if (!raw) return '';
    const deadline = this.parseDateTime(raw);
    const eventDate = this.getEventDateTime();
    if (!deadline) return 'Selecciona una fecha y hora válidas.';
    if (deadline.getTime() < this.currentMinute().getTime()) {
      return 'La fecha límite no puede estar en el pasado.';
    }
    if (eventDate && deadline.getTime() > eventDate.getTime()) {
      return 'La fecha límite no puede ser posterior al inicio del evento.';
    }
    return '';
  }

  get selectedDeadlineLabel(): string {
    const deadline = this.parseDateTime(this.invitation?.rsvpSettings?.deadline);
    return deadline && !this.deadlineValidationMessage ? this.formatLongDateTime(deadline) : '';
  }

  onDeadlineDateChange(value: string): void {
    if (!this.invitation?.rsvpSettings) return;
    if (!value) {
      this.invitation.rsvpSettings.deadline = '';
      return;
    }
    const initialTime = this.deadlineTime || this.defaultTimeForDate(value);
    this.invitation.rsvpSettings.deadline = `${value}T${this.clampTimeForDate(value, initialTime)}`;
  }

  onDeadlineTimeChange(value: string): void {
    if (!this.invitation?.rsvpSettings || !this.deadlineDate) return;
    this.invitation.rsvpSettings.deadline = `${this.deadlineDate}T${this.clampTimeForDate(this.deadlineDate, value || this.defaultTimeForDate(this.deadlineDate))}`;
  }

  clearDeadline(): void {
    if (this.invitation?.rsvpSettings) this.invitation.rsvpSettings.deadline = '';
  }

  setDeadlineDaysBeforeEvent(days: number): void {
    const eventDate = this.getEventDateTime();
    if (!eventDate || !this.invitation?.rsvpSettings) return;
    const target = new Date(eventDate);
    target.setDate(target.getDate() - days);
    target.setHours(23, 59, 0, 0);
    if (target.getTime() > eventDate.getTime()) target.setTime(eventDate.getTime());
    if (target.getTime() < this.currentMinute().getTime()) return;
    this.invitation.rsvpSettings.deadline = `${this.toLocalDateInput(target)}T${this.toLocalTimeInput(target)}`;
  }

  isQuickDeadlineDisabled(days: number): boolean {
    const eventDate = this.getEventDateTime();
    if (!eventDate) return true;
    const target = new Date(eventDate);
    target.setDate(target.getDate() - days);
    target.setHours(23, 59, 0, 0);
    return target.getTime() < this.currentMinute().getTime();
  }

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

  private getEventDateTime(): Date | null {
    const rawDate = this.event?.date || (typeof this.invitation?.event === 'object' ? (this.invitation.event as EventModel)?.date : '');
    if (!rawDate) return null;
    const datePart = /^\d{4}-\d{2}-\d{2}/.test(String(rawDate))
      ? String(rawDate).slice(0, 10)
      : this.toLocalDateInput(new Date(rawDate));
    const eventTime = this.event?.time || (typeof this.invitation?.event === 'object' ? (this.invitation.event as EventModel)?.time : '') || '23:59';
    return this.parseDateTime(`${datePart}T${String(eventTime).slice(0, 5)}`);
  }

  private parseDateTime(value?: string): Date | null {
    if (!value) return null;
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!match) return null;
    const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), 0, 0);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private currentMinute(): Date {
    const now = new Date();
    now.setSeconds(0, 0);
    return now;
  }

  private defaultTimeForDate(date: string): string {
    if (date === this.deadlineMaxDate) return this.deadlineMaxTime;
    if (date === this.deadlineMinDate) return this.deadlineMinTime;
    return '23:59';
  }

  private clampTimeForDate(date: string, time: string): string {
    let result = time;
    if (date === this.deadlineMinDate && result < this.deadlineMinTime) result = this.deadlineMinTime;
    if (date === this.deadlineMaxDate && result > this.deadlineMaxTime) result = this.deadlineMaxTime;
    return result;
  }

  private toLocalDateInput(value: Date): string {
    if (Number.isNaN(value.getTime())) return '';
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }

  private toLocalTimeInput(value: Date): string {
    return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
  }

  private formatLongDateTime(value: Date): string {
    return new Intl.DateTimeFormat('es-MX', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit'
    }).format(value);
  }
}
