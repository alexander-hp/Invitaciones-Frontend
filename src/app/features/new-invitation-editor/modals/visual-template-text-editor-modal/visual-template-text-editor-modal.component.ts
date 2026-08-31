import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiService } from '../../../../core/api.service';
import { TemplateTextOverlayService } from '../../../../core/template-text-overlay.service';
import { InvitationModel, EventModel, CustomTemplateSubmission } from '../../../../core/models';

@Component({
  selector: 'app-visual-template-text-editor-modal',
  templateUrl: './visual-template-text-editor-modal.component.html',
  styleUrls: ['./visual-template-text-editor-modal.component.css']
})
export class VisualTemplateTextEditorModalComponent implements OnInit, OnChanges, OnDestroy {
  @Input() invitation?: InvitationModel;
  @Input() event?: EventModel;
  @Input() templateKey = '';
  @Input() editingSubmission?: CustomTemplateSubmission;
  @Input() cleanBase = false;

  @Output() close = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<void>();

  @ViewChild('iframeElement') iframeElement?: ElementRef<HTMLIFrameElement>;

  // View state
  previewViewport: 'desktop' | 'mobile' = 'desktop';
  previewUrl: SafeResourceUrl = '';
  saving = false;
  iframeLoaded = false;

  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimeout?: any;
  private mutationObserver?: any;
  private originalTexts: Record<string, string> = {};

  constructor(
    private sanitizer: DomSanitizer,
    private apiService: ApiService,
    private textOverlay: TemplateTextOverlayService
  ) {}

  ngOnInit(): void {
    this.setupPreviewUrl();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['invitation'] || changes['templateKey'] || changes['editingSubmission'] || changes['cleanBase']) {
      this.setupPreviewUrl();
    }
  }

  ngOnDestroy(): void {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
  }

  get templateDisplayName(): string {
    if (this.editingSubmission?.name) {
      return this.editingSubmission.name;
    }
    const names: Record<string, string> = {
      'envelope-cards': 'Sobre Interactivo & Cards Deslizables',
      'classic-vertical': 'Clásica Editorial Vertical',
      'modern-minimal': 'Glamour Moderno & Minimal',
      'template-3': 'Glamour Moderno & Minimal'
    };
    return names[this.templateKey] || this.templateKey || 'Plantilla';
  }

  private setupPreviewUrl(): void {
    if (this.invitation?.slug) {
      let url = `${window.location.origin}/new/i/${this.invitation.slug}?tpl=${this.templateKey}&editMode=true`;
      if (this.cleanBase) {
        url += '&clean=1';
      } else if (this.editingSubmission?.id || this.editingSubmission?._id) {
        url += `&subId=${this.editingSubmission.id || this.editingSubmission._id}`;
      }
      this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
  }

  /**
   * When iframe loads, inject contenteditable styling and enable inline editing
   * on all text elements so the user can click and write directly like in Word.
   * Also tags elements with data-text-key for tracking changes.
   */
  onIframeLoad(iframe: HTMLIFrameElement): void {
    this.iframeLoaded = true;
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;

      // 1. Inject styling for inline editing
      const styleId = 'vte-inline-edit-styles';
      if (!doc.getElementById(styleId)) {
        const style = doc.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          [contenteditable="true"] {
            outline: 1px dashed transparent !important;
            transition: all 0.15s ease !important;
            cursor: text !important;
            border-radius: 4px !important;
            min-height: 1em !important;
          }
          [contenteditable="true"]:hover {
            outline: 2px dashed #b67b4b !important;
            background: rgba(182, 123, 75, 0.09) !important;
          }
          [contenteditable="true"]:focus {
            outline: 2px solid #b67b4b !important;
            background: rgba(182, 123, 75, 0.16) !important;
            box-shadow: 0 0 10px rgba(182, 123, 75, 0.3) !important;
          }
        `;
        doc.head.appendChild(style);
      }

      // 2. Tag elements with data-text-key and make them editable
      const makeTextsEditable = () => {
        // First tag elements with stable keys using the overlay service
        this.textOverlay.tagEditableElements(doc);

        const selectors = [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'p', 'span:not(.nw-dot):not(.nw-pill)', 'li',
          'blockquote', 'strong', 'em',
          '.nw-pub-headline', '.nw-pub-subheadline',
          '.nw-sec-card-title', '.nw-sec-card-desc',
          '.card-title', '.card-body',
          '.env-title', '.env-sub',
          '.headline-modern', '.title-modern',
          '.timeline-content h4', '.timeline-content p'
        ].join(', ');

        const elements = doc.querySelectorAll(selectors);
        elements.forEach(el => {
          if (
            el.tagName !== 'BUTTON' &&
            el.tagName !== 'INPUT' &&
            el.tagName !== 'SELECT' &&
            el.tagName !== 'TEXTAREA' &&
            !el.closest('button') &&
            !el.closest('svg') &&
            !el.classList.contains('nw-pill') &&
            !el.classList.contains('vte-pill-tag')
          ) {
            el.setAttribute('contenteditable', 'true');
            el.setAttribute('spellcheck', 'false');
          }
        });
      };

      makeTextsEditable();

      // Capture original texts after tagging (for diffing later)
      setTimeout(() => {
        this.originalTexts = this.textOverlay.extractTexts(doc);
        console.log('test edit: [TextEditor] captured originalTexts:', Object.keys(this.originalTexts).length, 'keys');
      }, 200);

      // Prevent link navigation on editable text click
      doc.addEventListener('click', (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target && target.isContentEditable && target.tagName === 'A') {
          e.preventDefault();
        }
      }, true);

      // 3. Observe mutations
      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
      }
      this.mutationObserver = new MutationObserver(() => {
        makeTextsEditable();
      });
      if (doc.body) {
        this.mutationObserver.observe(doc.body, { childList: true, subtree: true });
      }

    } catch (err) {
      console.warn('Iframe inline edit setup:', err);
    }
  }

  onClose(): void {
    this.close.emit();
  }

  /**
   * Extracts only the edited texts (not the full HTML) and sends for review.
   * This preserves the original Angular template with all its interactivity.
   */
  submitForReview(): void {
    if (!this.invitation) return;
    this.saving = true;

    let editedTexts: Record<string, string> = {};
    let htmlCode = '';
    let cssCode = '';

    try {
      const iframe = document.querySelector('.vte-iframe') as HTMLIFrameElement;
      const doc = iframe?.contentDocument || iframe?.contentWindow?.document;
      if (doc) {
        // Extract current texts from tagged elements
        const currentTexts = this.textOverlay.extractTexts(doc);
        console.log('test edit: [TextEditor] submitForReview - currentTexts count:', Object.keys(currentTexts).length);
        console.log('test edit: [TextEditor] submitForReview - originalTexts count:', Object.keys(this.originalTexts).length);

        // Diff against original to get only changes
        editedTexts = this.textOverlay.diffTexts(this.originalTexts, currentTexts);
        console.log('test edit: [TextEditor] submitForReview - editedTexts diff:', Object.keys(editedTexts).length, editedTexts);

        // Also capture full HTML as fallback (for preview in admin panel)
        const clone = doc.documentElement.cloneNode(true) as HTMLElement;
        const editStyle = clone.querySelector('#vte-inline-edit-styles');
        if (editStyle) editStyle.remove();
        clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
        clone.querySelectorAll('[spellcheck]').forEach(el => el.removeAttribute('spellcheck'));
        clone.querySelectorAll('script').forEach(s => s.remove());
        clone.querySelectorAll('[src]').forEach(el => {
          const src = el.getAttribute('src');
          if (src && src.startsWith('unsafe:')) {
            el.setAttribute('src', src.replace(/^unsafe:/, ''));
          }
        });
        htmlCode = (clone.outerHTML || '')
          .replace(/unsafe:data:image\/svg\+xml/gi, 'data:image/svg+xml');
      }
    } catch (e) {
      console.warn('test edit: [TextEditor] Could not extract iframe snapshot:', e);
    }

    if (!htmlCode) {
      htmlCode = `<!-- Edición de textos en vivo: ${this.templateDisplayName} -->`;
    }

    const invId = this.invitation._id || this.invitation.id || '';
    const eventObj = this.event;

    let submissionName = this.editingSubmission?.name;
    if (!submissionName) {
      const timeStr = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      submissionName = `Edición — ${this.templateDisplayName} (${timeStr})`;
    }

    const payload: Partial<CustomTemplateSubmission> = {
      ...(this.editingSubmission || {}),
      id: this.editingSubmission?.id || (this.editingSubmission as any)?._id,
      eventId: typeof this.invitation.event === 'string' ? this.invitation.event : (this.invitation.event as any)?._id,
      eventTitle: eventObj?.title || 'Evento Especial',
      eventSlug: this.invitation.slug,
      eventType: eventObj?.type || 'otro',
      invitationId: invId,
      name: submissionName,
      description: `Edición visual de textos en vivo directamente sobre la plantilla "${this.templateDisplayName}".`,
      htmlCode,
      cssCode,
      notes: `Plantilla base: ${this.templateKey}. Editada en modo Word interactivo.`,
      sourceTemplateKey: this.templateKey,
      editedTexts: Object.keys(editedTexts).length > 0 ? editedTexts : (this.editingSubmission?.editedTexts || undefined),
      status: 'pending'
    };

    console.log('test edit: [TextEditor] submitForReview - FULL PAYLOAD:', JSON.stringify({
      id: payload.id,
      name: payload.name,
      sourceTemplateKey: payload.sourceTemplateKey,
      editedTextsCount: payload.editedTexts ? Object.keys(payload.editedTexts).length : 0,
      editedTexts: payload.editedTexts,
      htmlCodeLength: payload.htmlCode?.length
    }, null, 2));

    this.apiService.submitCustomTemplate(payload).subscribe({
      next: () => {
        this.saving = false;
        this.showToast('¡Edición guardada y enviada a revisión con éxito!');
        setTimeout(() => {
          this.submitted.emit();
          this.close.emit();
        }, 1800);
      },
      error: (err) => {
        this.saving = false;
        this.showToast(err?.message || 'Error al enviar la edición a revisión.', 'error');
      }
    });
  }

  private showToast(message: string, type: 'success' | 'error' = 'success'): void {
    this.toastMessage = message;
    this.toastType = type;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toastMessage = '';
    }, 3800);
  }
}
