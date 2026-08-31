import { Component, Input, Output, EventEmitter } from '@angular/core';
import { InvitationModel } from '../../../../core/models';

@Component({
  selector: 'app-editor-style-tab',
  templateUrl: './editor-style-tab.component.html'
})
export class EditorStyleTabComponent {
  @Input() invitation!: InvitationModel;
  @Input() palettePresets: Array<{ name: string; primary: string; secondary: string; accent: string }> = [];
  @Output() applyPalette = new EventEmitter<{ name: string; primary: string; secondary: string; accent: string }>();

  onApplyPalette(preset: { name: string; primary: string; secondary: string; accent: string }): void {
    this.applyPalette.emit(preset);
  }
}
