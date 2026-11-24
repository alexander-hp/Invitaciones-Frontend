import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AccessScreenTemplateOption } from '../../core/access-screen-templates';

@Component({
  selector: 'app-access-styles-modal',
  styleUrls: ['./visual-invitation-editor.library.css'],
  styles: [`
    .access-styles-dialog {
      max-width: 860px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
    }
    .access-styles-modal-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
      padding: 20px 24px 28px;
      overflow-y: auto;
      max-height: calc(85vh - 150px);
    }
    @media (max-width: 680px) {
      .access-styles-modal-grid {
        grid-template-columns: 1fr;
      }
    }
    .access-style-modal-card {
      display: flex;
      flex-direction: column;
      background: #ffffff;
      border: 1.5px solid var(--nw-border, #eadecc);
      border-radius: 14px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      text-align: left;
    }
    .access-style-modal-card:hover {
      border-color: var(--nw-accent, #c59b6c);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(46, 37, 33, 0.1);
    }
    .access-style-modal-card.is-selected {
      border-color: var(--nw-accent, #c59b6c);
      box-shadow: 0 0 0 2px rgba(197, 155, 108, 0.35);
    }
    .style-modal-mini-stage {
      height: 170px;
      padding: 18px 20px;
      box-sizing: border-box;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .style-modal-tag-pill {
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(6px);
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.4px;
      padding: 3px 8px;
      border-radius: 99px;
    }
    .style-modal-active-badge {
      position: absolute;
      top: 10px;
      right: 10px;
      background: #16a34a;
      color: #ffffff;
      font-size: 10.5px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 12px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    }
    .mini-artboard-card {
      width: 175px;
      padding: 12px 14px;
      border: 1px solid rgba(197, 155, 108, 0.5);
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      backdrop-filter: blur(8px);
    }
    .mini-badge {
      font-size: 7px;
      font-weight: 700;
      letter-spacing: 1px;
      padding: 2px 6px;
      border: 1px solid;
      border-radius: 99px;
      max-width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .mini-title {
      font-size: 13px;
      font-weight: 700;
      line-height: 1.15;
      text-align: center;
      max-width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .mini-input {
      width: 100%;
      height: 16px;
      border: 1px solid;
      border-radius: 5px;
      opacity: 0.45;
      background: rgba(255, 255, 255, 0.2);
    }
    .mini-btn {
      width: 100%;
      padding: 4px 6px;
      font-size: 7.5px;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-align: center;
      text-transform: uppercase;
    }
    .style-modal-card-info {
      padding: 12px 14px 14px;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .style-modal-card-info strong {
      font-size: 14px;
      font-weight: 700;
      color: var(--nw-text, #2e2621);
      margin-bottom: 4px;
      display: block;
    }
    .style-modal-card-info small {
      font-size: 11.5px;
      color: var(--nw-text-2, #6e6157);
      line-height: 1.4;
      flex: 1;
      margin-bottom: 10px;
      display: block;
    }
    .style-modal-card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-top: auto;
      padding-top: 8px;
      border-top: 1px solid rgba(46, 37, 33, 0.08);
    }
    .style-includes-pill {
      font-size: 10.5px;
      font-weight: 600;
      color: #15803d;
      background: rgba(22, 163, 74, 0.1);
      padding: 3px 8px;
      border-radius: 99px;
    }
    .style-modal-card-apply {
      font-size: 11.5px;
      font-weight: 700;
      color: var(--nw-accent, #c59b6c);
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: transform 0.2s;
    }
    .access-style-modal-card:hover .style-modal-card-apply {
      transform: translateX(3px);
      color: var(--nw-accent-dark, #8a6747);
    }
  `],
  template: `
    <div class="design-library-backdrop access-styles-backdrop" (click)="closed.emit()">
      <section class="design-library-dialog access-styles-dialog" role="dialog" aria-modal="true"
        aria-labelledby="accessStylesTitle" (click)="$event.stopPropagation()">
        <header class="design-library-heading">
          <div class="catalog-title-col">
            <div class="catalog-eyebrow">
              <span>4 Diseños Profesionales · Acceso + Auto-registro</span>
            </div>
            <h1 id="accessStylesTitle">Plantillas de Pantalla de Acceso y Auto-registro</h1>
            <p>Cada diseño incluye todas las capas funcionales listas para usar y editar tanto en la vista de ingreso
              como en el formulario de auto-registro.</p>
          </div>
          <div class="catalog-header-actions">
            <button type="button" class="btn-publish-from-catalog" (click)="useTemplateStyle.emit()">
              <lucide-icon name="sparkles" [strokeWidth]="1.8"></lucide-icon> Usar Estilo de la Plantilla
            </button>
            <button type="button" class="close-catalog-btn" title="Cerrar" (click)="closed.emit()">
              <lucide-icon name="x" [strokeWidth]="2"></lucide-icon>
            </button>
          </div>
        </header>

        <div class="access-styles-modal-grid access-styles-grid-4">
          <div *ngFor="let p of presets" class="access-style-modal-card"
            [class.is-selected]="p.key === activeKey"
            (click)="selectPreset.emit(p.key)">
            <div class="style-modal-card-preview style-modal-mini-stage" [style.background]="p.previewBg">
              <span class="style-modal-tag-pill">{{ p.tag }}</span>
              <span *ngIf="p.key === activeKey" class="style-modal-active-badge">✓ Aplicado</span>
              <div class="mini-artboard-card"
                [style.background]="p.previewCardBg"
                [style.border-color]="p.previewAccent"
                [style.border-radius.px]="p.cardRadius > 16 ? 12 : p.cardRadius">
                <span class="mini-badge" [style.color]="p.previewAccent" [style.border-color]="p.previewAccent">{{ p.badgeText }}</span>
                <span class="mini-title" [style.color]="p.previewText" [style.font-family]="p.headingFont">{{ p.defaultTitle }}</span>
                <span class="mini-input" [style.border-color]="p.previewAccent"></span>
                <span class="mini-btn" [style.background]="p.buttonBgColor" [style.color]="p.buttonTextColor"
                  [style.border-radius.px]="p.buttonRadius > 14 ? 14 : p.buttonRadius">{{ p.buttonText }}</span>
              </div>
            </div>
            <div class="style-modal-card-info">
              <div class="style-modal-title-row">
                <strong>{{ p.name }}</strong>
              </div>
              <small>{{ p.description }}</small>
              <div class="style-modal-card-footer">
                <span class="style-includes-pill">✓ Acceso + Auto-registro</span>
                <span class="style-modal-card-apply">Aplicar →</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  `
})
export class AccessStylesModalComponent {
  @Input() presets: AccessScreenTemplateOption[] = [];
  @Input() activeKey?: string;
  @Output() selectPreset = new EventEmitter<string>();
  @Output() useTemplateStyle = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();
}
