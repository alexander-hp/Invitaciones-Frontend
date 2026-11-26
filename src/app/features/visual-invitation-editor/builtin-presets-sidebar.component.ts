import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CompleteDesignPreset } from './complete-design-library';

@Component({
  selector: 'app-builtin-presets-sidebar',
  styleUrls: ['./visual-invitation-editor.library.css'],
  template: `
    <details class="sidebar-builtin-presets" open>
      <summary>Plantillas prehechas ({{ presets.length }})</summary>
      <p>Diseños base listos para editar capa por capa o previsualizar en pantalla completa.</p>
      <div class="sidebar-preset-list">
        <div *ngFor="let preset of presets" class="sidebar-preset-card"
          (click)="previewPreset.emit(preset.key)"
          [title]="'Ver vista previa de ' + preset.name">
          <img [src]="thumbMap[preset.key] || defaultThumb" [alt]="preset.name" class="sidebar-preset-thumb" loading="lazy">
          <div class="sidebar-preset-info">
            <div class="sidebar-preset-swatches">
              <i [style.background]="preset.colors[0]"></i>
              <i [style.background]="preset.colors[1]"></i>
              <i [style.background]="preset.colors[2]"></i>
            </div>
            <strong>{{ preset.name }}</strong>
            <small>{{ preset.description }}</small>
            <div class="sidebar-preset-actions">
              <button type="button" class="btn-preset-preview" (click)="onPreviewClick(preset.key, $event)">Vista previa</button>
              <button type="button" class="btn-preset-apply" (click)="onApplyClick(preset.key, $event)">Aplicar</button>
            </div>
          </div>
        </div>
      </div>
    </details>
  `
})
export class BuiltinPresetsSidebarComponent {
  @Input() presets: CompleteDesignPreset[] = [];
  @Output() previewPreset = new EventEmitter<string>();
  @Output() applyPreset = new EventEmitter<{ key: string; event: Event }>();

  readonly defaultThumb = 'assets/templates/palazzo-orangerie/garden-portrait.webp';
  readonly thumbMap: Record<string, string> = {
    'palais-celeste': 'assets/templates/palais-celeste/preview-cover.jpg',
    'boda-jardin-imperial': 'assets/template-previews/boda-jardin-imperial.jpg',
    'boda-girasoles': 'assets/template-previews/boda-girasoles.jpg',
    'boda-navy-blue': 'assets/template-previews/boda-navy-blue.jpg',
    'palazzo-orangerie': 'assets/templates/palazzo-orangerie/garden-portrait.webp',
    'haute-couture': 'assets/template-previews/maison-dore.jpg',
    'xv-burgundy': 'assets/template-previews/xv-burgundy.jpg',
    editorial: 'assets/template-previews/boda-desktop-first.jpg',
    romantic: 'assets/template-previews/boda-rosas.jpg',
    night: 'assets/template-previews/boda-creativa-premium.jpg',
    celebration: 'assets/template-previews/template-graduacion.jpg',
    birthday: 'assets/template-previews/template-cumpleanos.jpg',
    baptism: 'assets/template-previews/template-bautizo.jpg'
  };

  onPreviewClick(key: string, ev: Event): void {
    ev.stopPropagation();
    this.previewPreset.emit(key);
  }

  onApplyClick(key: string, ev: Event): void {
    ev.stopPropagation();
    this.applyPreset.emit({ key, event: ev });
  }
}
