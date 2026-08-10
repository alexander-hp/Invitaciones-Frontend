import { Component, Input, Output, EventEmitter } from '@angular/core';
import { InvitationModel } from '../../../../core/models';

@Component({
  selector: 'app-editor-rsvp-rules-tab',
  templateUrl: './editor-rsvp-rules-tab.component.html'
})
export class EditorRsvpRulesTabComponent {
  @Input() invitation!: InvitationModel;
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
}
