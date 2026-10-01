import { Component, Input, Output, EventEmitter } from '@angular/core';
import { InvitationModel } from '../../../../core/models';
import { InvitationPaletteColors, validPaletteColor } from '../../visual-palette';

@Component({
  selector: 'app-editor-style-tab',
  templateUrl: './editor-style-tab.component.html'
})
export class EditorStyleTabComponent {
  @Input() invitation!: InvitationModel;
  @Input() palettePresets: Array<{ name: string; primary: string; secondary: string; accent: string }> = [];
  @Output() applyPalette = new EventEmitter<{ name: string; primary: string; secondary: string; accent: string }>();
  @Output() paletteChange = new EventEmitter<InvitationPaletteColors>();

  onPaletteFieldChange(field: keyof InvitationPaletteColors, value: string): void {
    const palette = this.invitation.content.palette;
    if (!palette) return;
    palette[field] = value;
    if (palette.primary && palette.secondary && palette.accent &&
      [palette.primary, palette.secondary, palette.accent].every(validPaletteColor)) {
      this.paletteChange.emit(palette as InvitationPaletteColors);
    }
  }

  onApplyPalette(preset: { name: string; primary: string; secondary: string; accent: string }): void {
    this.applyPalette.emit(preset);
  }

  getTextColorForBg(hexColor?: string): string {
    if (!hexColor || typeof hexColor !== 'string' || !hexColor.startsWith('#')) return '#ffffff';
    let hex = hexColor.replace('#', '').trim();
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    if (hex.length < 6) return '#ffffff';
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 165 ? '#1e293b' : '#ffffff';
  }

  getAlphaColor(hexColor?: string, opacity: number = 0.15): string {
    if (!hexColor || typeof hexColor !== 'string' || !hexColor.startsWith('#')) return `rgba(182, 123, 75, ${opacity})`;
    let hex = hexColor.replace('#', '').trim();
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    if (hex.length < 6) return `rgba(182, 123, 75, ${opacity})`;
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
}
