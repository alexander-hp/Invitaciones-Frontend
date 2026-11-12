import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { InvitationModel } from '../../../../core/models';
import { InvitationPaletteColors, validPaletteColor } from '../../visual-palette';

@Component({
  selector: 'app-editor-style-tab',
  templateUrl: './editor-style-tab.component.html'
})
export class EditorStyleTabComponent implements OnInit, OnChanges {
  @Input() invitation!: InvitationModel;
  @Input() palettePresets: Array<{ name: string; primary: string; secondary: string; accent: string }> = [];
  @Output() applyPalette = new EventEmitter<{ name: string; primary: string; secondary: string; accent: string }>();
  @Output() paletteChange = new EventEmitter<InvitationPaletteColors>();

  defaultPresets = [
    { name: 'Imperial & Oro', primary: '#1a1612', secondary: '#fdfbf7', accent: '#d4af37' },
    { name: 'Jardín Esmeralda', primary: '#0d3b2e', secondary: '#f4f9f6', accent: '#c8963e' },
    { name: 'Zafiro & Noche', primary: '#0a192f', secondary: '#f0f4f8', accent: '#3b82f6' },
    { name: 'Borgoña Elegante', primary: '#4a0e17', secondary: '#fdf4f5', accent: '#e0a96d' },
    { name: 'Terracota & Eucalipto', primary: '#a0522d', secondary: '#f8f6f0', accent: '#5f8575' }
  ];

  ngOnInit(): void {
    this.ensurePalette();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.ensurePalette();
  }

  private ensurePalette(): void {
    if (!this.palettePresets || this.palettePresets.length === 0) {
      this.palettePresets = [...this.defaultPresets];
    }
    if (!this.invitation) return;
    if (!this.invitation.content) {
      this.invitation.content = {};
    }
    if (!this.invitation.content.palette) {
      this.invitation.content.palette = {
        primary: '#1f2a44',
        secondary: '#f7f2ea',
        accent: '#b67b4b'
      };
    } else {
      if (!this.invitation.content.palette.primary) this.invitation.content.palette.primary = '#1f2a44';
      if (!this.invitation.content.palette.secondary) this.invitation.content.palette.secondary = '#f7f2ea';
      if (!this.invitation.content.palette.accent) this.invitation.content.palette.accent = '#b67b4b';
    }
  }

  get palette(): InvitationPaletteColors {
    if (this.invitation?.content?.palette) {
      return this.invitation.content.palette as InvitationPaletteColors;
    }
    return { primary: '#1f2a44', secondary: '#f7f2ea', accent: '#b67b4b' };
  }

  onPaletteFieldChange(field: keyof InvitationPaletteColors, value: string): void {
    this.ensurePalette();
    const pal = this.palette;
    pal[field] = value;
    if (this.invitation?.content) {
      this.invitation.content.palette = { ...pal };
    }
    if (pal.primary && pal.secondary && pal.accent &&
      [pal.primary, pal.secondary, pal.accent].every(validPaletteColor)) {
      this.paletteChange.emit(pal);
    }
  }

  onApplyPalette(preset: { name: string; primary: string; secondary: string; accent: string }): void {
    this.ensurePalette();
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
