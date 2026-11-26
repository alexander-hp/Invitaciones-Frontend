import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-publish-template-modal',
  styleUrls: ['./visual-invitation-editor.component.css', './visual-invitation-editor.library.css'],
  template: `
    <div class="publish-template-backdrop" (click)="closed.emit()">
      <section class="publish-template-dialog" role="dialog" aria-modal="true" aria-labelledby="publishTemplateTitle"
        (click)="$event.stopPropagation()">
        <header class="publish-template-heading">
          <div class="publish-eyebrow">
            <span>Ecosistema de Creadores Canva-Style</span>
            <span class="gold-badge">
              <lucide-icon name="sparkles" [strokeWidth]="1.8"></lucide-icon> 5% Comisión
            </span>
          </div>
          <h1 id="publishTemplateTitle">Publicar mi Diseño como Plantilla</h1>
          <p>Comparte tu creación en el catálogo de la comunidad. Otros usuarios podrán usarla para sus eventos y tú
            generarás ingresos automáticamente.</p>
          <button type="button" class="close-publish-btn" title="Cerrar modal" aria-label="Cerrar modal"
            (click)="closed.emit()">
            <lucide-icon name="x" [strokeWidth]="2"></lucide-icon>
          </button>
        </header>

        <div class="publish-template-body">
          <div class="creator-earnings-banner">
            <div class="banner-icon">
              <lucide-icon name="sparkles" [strokeWidth]="1.8"></lucide-icon>
            </div>
            <div class="banner-text">
              <strong>¡Gana el 5% cada vez que alguien use tu diseño!</strong>
              <p>Por cada usuario que seleccione tu plantilla y active su evento o pase premium, recibirás automáticamente
                el <strong>5% del costo</strong> acumulado en tu saldo de creador.</p>
            </div>
          </div>

          <div class="publish-form-grid" *ngIf="form">
            <div class="form-group full-width">
              <label>Nombre de la Plantilla *</label>
              <input type="text" [(ngModel)]="form.name"
                placeholder="Ej. Boda Jardín Toscana · Gala Nocturna" />
            </div>

            <div class="form-group">
              <label>Categoría / Tipo de Evento</label>
              <select [(ngModel)]="form.eventType">
                <option value="boda">Boda</option>
                <option value="xv">XV Años</option>
                <option value="bautizo">Bautizo</option>
                <option value="graduacion">Graduación</option>
                <option value="cumpleanos">Cumpleaños</option>
                <option value="otro">Otro / General</option>
              </select>
            </div>

            <div class="form-group">
              <label>Nombre del Creador / Autor</label>
              <input type="text" [(ngModel)]="form.authorName" placeholder="Tu nombre o firma artística" />
            </div>

            <div class="form-group full-width">
              <label>Descripción del Estilo</label>
              <textarea [(ngModel)]="form.description" rows="2"
                placeholder="Describe los colores, tipografía, estilo visual e inspiración del diseño..."></textarea>
            </div>

            <div class="form-group full-width">
              <label>Etiquetas (separadas por comas)</label>
              <input type="text" [(ngModel)]="form.tags"
                placeholder="Ej. floral, oro, minimalista, acuarela, noche" />
            </div>

            <div class="form-group full-width inclusions-group">
              <label>¿Qué secciones deseas incluir en la plantilla pública?</label>
              <div class="inclusions-row">
                <label class="inc-checkbox">
                  <input type="checkbox" [(ngModel)]="form.includesInvitation" />
                  <div class="inc-checkbox-card">
                    <span class="inc-icon">
                      <lucide-icon name="smartphone" [strokeWidth]="1.8"></lucide-icon>
                    </span>
                    <strong>Invitación Digital</strong>
                    <small>{{ sectionsCount }} secciones con capas y elementos</small>
                  </div>
                </label>

                <label class="inc-checkbox">
                  <input type="checkbox" [(ngModel)]="form.includesPass" />
                  <div class="inc-checkbox-card">
                    <span class="inc-icon">
                      <lucide-icon name="ticket" [strokeWidth]="1.8"></lucide-icon>
                    </span>
                    <strong>Pase VIP</strong>
                    <small>{{ passSheetsCount }} hojas (Frente/Reverso) con QR</small>
                  </div>
                </label>

                <label class="inc-checkbox">
                  <input type="checkbox" [(ngModel)]="form.includesAccess" />
                  <div class="inc-checkbox-card">
                    <span class="inc-icon">
                      <lucide-icon name="lock-keyhole" [strokeWidth]="1.8"></lucide-icon>
                    </span>
                    <strong>Pantalla de Acceso</strong>
                    <small>Bienvenida y validación NIP</small>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <footer class="publish-template-footer">
          <button type="button" class="secondary" [disabled]="publishing"
            (click)="closed.emit()">Cancelar</button>
          <button type="button" class="primary btn-publish-confirm" [disabled]="publishing"
            (click)="submitted.emit()">
            <lucide-icon name="cloud-upload" [strokeWidth]="1.8"></lucide-icon>
            <span>{{ publishing ? 'Publicando plantilla...' : 'Publicar en la Comunidad (+5%)' }}</span>
          </button>
        </footer>
      </section>
    </div>
  `
})
export class PublishTemplateModalComponent {
  @Input() form: any;
  @Input() publishing = false;
  @Input() sectionsCount = 0;
  @Input() passSheetsCount = 0;
  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<void>();
}
