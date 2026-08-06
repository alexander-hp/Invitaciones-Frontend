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
}
