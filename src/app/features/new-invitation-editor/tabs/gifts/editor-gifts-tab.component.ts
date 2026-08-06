import { Component, Input, Output, EventEmitter } from '@angular/core';
import { InvitationModel } from '../../../../core/models';

@Component({
  selector: 'app-editor-gifts-tab',
  templateUrl: './editor-gifts-tab.component.html'
})
export class EditorGiftsTabComponent {
  @Input() invitation!: InvitationModel;
  @Input() assetUploading = false;

  @Output() addGiftItem = new EventEmitter<void>();
  @Output() removeGiftItem = new EventEmitter<number>();
  @Output() uploadEnvelopeQr = new EventEmitter<Event>();
  @Output() toggleSectionActive = new EventEmitter<{ key: string; active: boolean }>();

  isSectionActive(key: string): boolean {
    if (!this.invitation?.content.sectionSettings) return true;
    const settings = this.invitation.content.sectionSettings as any;
    if (key === 'gifts') return Boolean(this.invitation.content.giftSettings?.enabled && settings.giftRegistry !== false);
    return settings[key] !== false;
  }
}
