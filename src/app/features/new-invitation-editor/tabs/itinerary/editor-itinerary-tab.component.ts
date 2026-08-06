import { Component, Input, Output, EventEmitter } from '@angular/core';
import { InvitationModel, EventModel } from '../../../../core/models';

@Component({
  selector: 'app-editor-itinerary-tab',
  templateUrl: './editor-itinerary-tab.component.html'
})
export class EditorItineraryTabComponent {
  @Input() invitation!: InvitationModel;
  @Input() event?: EventModel;
  @Output() addItineraryItem = new EventEmitter<void>();
  @Output() removeItineraryItem = new EventEmitter<number>();
  @Output() moveItineraryItem = new EventEmitter<{ index: number; dir: 1 | -1 }>();
  @Output() toggleSectionActive = new EventEmitter<{ key: string; active: boolean }>();

  isSectionActive(key: string): boolean {
    if (!this.invitation?.content.sectionSettings) return true;
    const settings = this.invitation.content.sectionSettings as any;
    return settings[key] !== false;
  }
}
