import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PassTemplateSetOption } from './pass-template-sets';

@Component({
  selector: 'app-pass-styles-modal',
  styleUrls: ['./visual-invitation-editor.library.css'],
  styles: [`
    .pass-styles-dialog {
      max-width: 880px;
      max-height: 86vh;
      display: flex;
      flex-direction: column;
    }
    .pass-styles-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
      padding: 20px 24px 28px;
      overflow-y: auto;
      max-height: calc(86vh - 140px);
    }
    @media (max-width: 680px) {
      .pass-styles-grid {
        grid-template-columns: 1fr;
      }
    }
    .pass-style-card {
      display: flex;
      flex-direction: column;
      background: #ffffff;
      border: 1.5px solid var(--nw-border, #eadecc);
      border-radius: 14px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
    }
    .pass-style-card:hover {
      border-color: var(--nw-accent, #c59b6c);
      transform: translateY(-2px);
      box-shadow: 0 10px 26px rgba(46, 37, 33, 0.12);
    }
    .pass-style-card.is-selected {
      border-color: var(--nw-accent, #c59b6c);
      box-shadow: 0 0 0 2px rgba(197, 155, 108, 0.35);
    }
    .pass-mini-stage {
      height: 195px;
      padding: 16px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
    }
    .pass-tag-pill {
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(6px);
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      padding: 3px 9px;
      border-radius: 99px;
    }
    .pass-active-badge {
      position: absolute;
      top: 10px;
      right: 10px;
      background: #16a34a;
      color: #ffffff;
      font-size: 10.5px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 99px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    }
    .mini-pass-ticket {
      width: 122px;
      height: 166px;
      padding: 10px 10px 8px;
      border: 1.5px solid;
      border-radius: 12px;
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      box-sizing: border-box;
      position: relative;
    }
    .mini-pass-ticket.is-arch {
      border-top-left-radius: 56px;
      border-top-right-radius: 56px;
    }
    .mini-pass-eyebrow {
      font-size: 5.5px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      opacity: 0.9;
    }
    .mini-pass-title {
      font-size: 11px;
      font-weight: 700;
      text-align: center;
      line-height: 1.1;
    }
    .mini-pass-qr {
      width: 52px;
      height: 58px;
      background: #ffffff;
      border: 2px solid;
      border-radius: 7px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 4px 4px 0;
      box-sizing: border-box;
      overflow: hidden;
    }
    .mini-qr-grid {
      width: 34px;
      height: 34px;
      background-image:
        linear-gradient(90deg, #18181b 25%, transparent 25%, transparent 50%, #18181b 50%, #18181b 75%, transparent 75%),
        linear-gradient(#18181b 25%, transparent 25%, transparent 50%, #18181b 50%, #18181b 75%, transparent 75%);
      background-size: 10px 10px;
      opacity: 0.85;
    }
    .mini-qr-banner {
      width: calc(100% + 8px);
      height: 10px;
      font-size: 4.5px;
      font-weight: 800;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      letter-spacing: 0.4px;
    }
    .mini-pass-guest {
      font-size: 8.5px;
      font-weight: 700;
      text-align: center;
    }
    .mini-pass-pill {
      font-size: 5.5px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 99px;
      border: 1px solid;
      opacity: 0.85;
    }
    .pass-card-info {
      padding: 13px 15px 15px;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .pass-card-info strong {
      font-size: 14px;
      font-weight: 700;
      color: var(--nw-text, #2e2621);
      margin-bottom: 4px;
      display: block;
    }
    .pass-card-info small {
      font-size: 11.5px;
      color: var(--nw-text-2, #6e6157);
      line-height: 1.4;
      flex: 1;
      margin-bottom: 10px;
      display: block;
    }
    .pass-card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding-top: 8px;
      border-top: 1px solid rgba(46, 37, 33, 0.08);
    }
    .pass-includes-pill {
      font-size: 10.5px;
      font-weight: 600;
      color: #15803d;
      background: rgba(22, 163, 74, 0.1);
      padding: 3px 8px;
      border-radius: 99px;
    }
    .pass-apply-link {
      font-size: 11.5px;
      font-weight: 700;
      color: var(--nw-accent, #c59b6c);
    }
  `],
  template: `
    <div class="design-library-backdrop" (click)="closed.emit()">
      <section class="design-library-dialog pass-styles-dialog" role="dialog" aria-modal="true"
        aria-labelledby="passStylesTitle" (click)="$event.stopPropagation()">
        <header class="design-library-heading">
          <div class="catalog-title-col">
            <div class="catalog-eyebrow">
              <span>Sets de Pase VIP · Frente + Reverso · Campos Dinámicos</span>
            </div>
            <h1 id="passStylesTitle">Plantillas de Pase VIP Personalizado</h1>
            <p>Cada set incluye Frente y Reverso completamente editables, código QR estilizado y campos dinámicos
              que se llenan automáticamente con los datos de cada invitado.</p>
          </div>
          <div class="catalog-header-actions">
            <button type="button" class="close-catalog-btn" title="Cerrar" (click)="closed.emit()">
              <lucide-icon name="x" [strokeWidth]="2"></lucide-icon>
            </button>
          </div>
        </header>

        <div class="pass-styles-grid">
          <div *ngFor="let p of presets" class="pass-style-card"
            [class.is-selected]="p.key === activeKey"
            (click)="selectPreset.emit(p.key)">
            <div class="pass-mini-stage" [style.background]="p.previewBg">
              <span class="pass-tag-pill">{{ p.tag }}</span>
              <span *ngIf="p.key === activeKey" class="pass-active-badge">✓ Aplicado</span>
              <div class="mini-pass-ticket"
                [class.is-arch]="p.previewIsArch"
                [style.background]="p.previewCardBg"
                [style.border-color]="p.previewAccent">
                <span class="mini-pass-eyebrow" [style.color]="p.previewAccent">PASE VIP</span>
                <span class="mini-pass-title" [style.color]="p.previewText" [style.font-family]="p.headingFont">Ana &amp; Carlos</span>
                <div class="mini-pass-qr" [style.border-color]="p.qrAccent">
                  <div class="mini-qr-grid"></div>
                  <div class="mini-qr-banner" [style.background]="p.qrAccent">ESCANEAR</div>
                </div>
                <span class="mini-pass-guest" [style.color]="p.previewText" [style.font-family]="p.headingFont">Invitado VIP</span>
                <span class="mini-pass-pill" [style.color]="p.previewAccent" [style.border-color]="p.previewAccent">Mesa 5 · 2 pases</span>
              </div>
            </div>
            <div class="pass-card-info">
              <strong>{{ p.name }}</strong>
              <small>{{ p.description }}</small>
              <div class="pass-card-footer">
                <span class="pass-includes-pill">✓ Frente + Reverso · VIP</span>
                <span class="pass-apply-link">Aplicar set →</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  `
})
export class PassStylesModalComponent {
  @Input() presets: PassTemplateSetOption[] = [];
  @Input() activeKey?: string;
  @Output() selectPreset = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();
}
