import { Component, Input, Output, EventEmitter } from '@angular/core';
import { InvitationModel, EventModel } from '../../../../core/models';

@Component({
  selector: 'app-editor-locations-tab',
  templateUrl: './editor-locations-tab.component.html'
})
export class EditorLocationsTabComponent {
  @Input() invitation!: InvitationModel;
  @Input() event?: EventModel;
  @Input() locationSearchResults: Record<number, Array<{ name: string; address: string; lat: number; lon: number; mapUrl: string; wazeUrl: string }>> = {};
  @Input() locationSearchLoading: Record<number, boolean> = {};
  @Input() locationExtractLoading: Record<number, boolean> = {};

  @Output() addLocation = new EventEmitter<void>();
  @Output() removeLocation = new EventEmitter<number>();
  @Output() searchLocation = new EventEmitter<{ index: number; query: string }>();
  @Output() selectSearchResult = new EventEmitter<{ index: number; result: any }>();
  @Output() extractMapInfo = new EventEmitter<number>();
  @Output() toggleSectionActive = new EventEmitter<{ key: string; active: boolean }>();

  isSectionActive(key: string): boolean {
    if (!this.invitation?.content.sectionSettings) return true;
    const settings = this.invitation.content.sectionSettings as any;
    return settings[key] !== false;
  }
}
