import { Component, Input, Output, EventEmitter } from '@angular/core';
import { InvitationModel } from '../../../../core/models';

@Component({
  selector: 'app-editor-dedications-tab',
  templateUrl: './editor-dedications-tab.component.html'
})
export class EditorDedicationsTabComponent {
  @Input() invitation!: InvitationModel;
  @Input() activeTab = 'all';
  @Output() toggleSectionActive = new EventEmitter<{ key: string; active: boolean }>();

  isSectionActive(key: string): boolean {
    if (!this.invitation?.content.sectionSettings) return true;
    const settings = this.invitation.content.sectionSettings as any;
    if (key === 'guest_album' || key === 'guestAlbum') return Boolean(this.invitation.content.privateAlbumEnabled);
    if (key === 'dedications') return Boolean(this.invitation.content.dedicationSettings?.enabled && settings.dedications !== false);
    return settings[key] !== false;
  }
}
