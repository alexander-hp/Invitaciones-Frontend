import { Component, Input, Output, EventEmitter } from '@angular/core';
import { InvitationModel } from '../../../../core/models';

@Component({
  selector: 'app-editor-content-tab',
  templateUrl: './editor-content-tab.component.html'
})
export class EditorContentTabComponent {
  @Input() invitation!: InvitationModel;
  @Input() canUseWhiteLabel = false;
  @Output() applyTextVariant = new EventEmitter<'formal' | 'warm' | 'brief'>();

  onApplyVariant(variant: 'formal' | 'warm' | 'brief'): void {
    this.applyTextVariant.emit(variant);
  }
}
