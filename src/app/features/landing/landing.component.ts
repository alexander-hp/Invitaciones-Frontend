import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import {
  LANDING_TEMPLATES_CATALOG,
  LandingDraftService,
  LandingDraftState,
  LandingTemplateMeta
} from '../../core/landing-draft.service';
import { EventType, InvitationLocation } from '../../core/models';
import { TemplateTextOverlayService } from '../../core/template-text-overlay.service';

type StudioTab = 'main' | 'story' | 'schedule' | 'inline';
type CatalogFilter = 'featured' | 'all' | 'boda' | 'xv' | 'graduacion';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent implements OnInit, OnDestroy {
  readonly brandName = 'Velisse';
  @ViewChild('studioIframe') studioIframe?: ElementRef<HTMLIFrameElement>;
  @ViewChild('previewIframe') previewIframe?: ElementRef<HTMLIFrameElement>;

  mobileMenuOpen = false;
  catalogFilter: CatalogFilter = 'all';

  readonly templates: LandingTemplateMeta[] = LANDING_TEMPLATES_CATALOG;
  readonly featuredTemplates: LandingTemplateMeta[] = LANDING_TEMPLATES_CATALOG.filter(
    (t) => t.featured
  );

  readonly platformFeatures = [
    {
      badge: 'Invitaciones Vivientes',
      title: 'Diseño Editorial & Música Integrada',
      description:
        'Sobres interactivos, melodías románticas por sección, cuenta regresiva en vivo, mapas con Google Maps y Waze, código de vestimenta y mesa de regalos.'
    },
    {
      badge: 'Control de Accesos',
      title: 'Confirmación RSVP & Pases VIP con QR',
      description:
        'Asigna lugares exactos por familia, recibe confirmaciones con preferencias de menú o alergias y valida pases digitales con escáner QR en puerta.'
    },
    {
      badge: 'Logística Inteligente',
      title: 'Croquis de Mesas & Auto-Asignación',
      description:
        'Diseña el plano real de tu salón, organiza grupos familiares y deja que el asistente distribuya asientos sin sobrecupo.'
    },
    {
      badge: 'Comunicación Directa',
      title: 'Envíos por WhatsApp y Correo',
      description:
        'Comparte invitaciones personalizadas, pases QR individuales y recordatorios automáticos con métricas de apertura y entrega.'
    },
    {
      badge: 'Fiesta Interactiva',
      title: 'Álbum en Vivo, DJ & Dedicatorias',
      description:
        'Tus invitados suben sus fotos durante la celebración, piden canciones al DJ desde su celular y firman el muro de buenos deseos.'
    },
    {
      badge: 'Colaboración Segura',
      title: 'Accesos por Rol para tu Equipo',
      description:
        'Genera enlaces dedicados para tu Wedding Planner, staff de recepción, DJ o fotógrafo sin compartir tu contraseña principal.'
    }
  ];

  readonly workflowSteps = [
    {
      step: '01',
      title: 'Explora y elige tu estilo sin registrarte',
      description:
        'Descubre nuestras plantillas exclusivas como Elegancia Rústica (Girasoles) o Navy Blue & Gold, o abre directamente el Editor Visual por capas.'
    },
    {
      step: '02',
      title: 'Personaliza datos y textos en tiempo real',
      description:
        'Edita los nombres, fecha, ubicaciones, itinerario o haz clic sobre cualquier texto de la plantilla para adaptarla exactamente a tu evento.'
    },
    {
      step: '03',
      title: 'Guarda, crea tu cuenta y conserva todo',
      description:
        'Al presionar Guardar, inicia sesión o registra tu usuario gratis: Velisse crea automáticamente tu evento e invitación con todos tus cambios intactos.'
    }
  ];

  readonly faqs = [
    {
      q: '¿Puedo probar y editar las plantillas antes de crear una cuenta?',
      a: '¡Sí! Puedes abrir cualquier plantilla o el Editor Visual aquí mismo, personalizar nombres, fecha, sedes, itinerario y textos en vivo. Nada se pierde cuando decides guardar y crear tu cuenta.',
      open: true
    },
    {
      q: '¿Qué pasa con mis cambios cuando hago clic en Guardar?',
      a: 'Tu borrador queda respaldado automáticamente. Te llevamos al inicio de sesión / registro para que crees tu usuario y el sistema genera al instante tu evento con la plantilla y todos los datos que editaste.',
      open: false
    },
    {
      q: '¿Qué diferencia hay entre editar una plantilla y el Editor Visual?',
      a: 'Las plantillas temáticas (como Elegancia Rústica de Girasoles o Navy Blue & Gold) tienen animaciones, música y estructura curada lista para llenar tus datos y textos. El Editor Visual te ofrece un lienzo libre tipo Canva para mover capas, marcos, fotos, pases QR y pantallas de acceso.',
      open: false
    },
    {
      q: '¿Sirve para Bodas, XV Años, Graduaciones y otros eventos?',
      a: 'Totalmente. Velisse se adapta a bodas, XV años, bautizos, graduaciones, aniversarios, cumpleaños y galas corporativas, gestionando invitados, mesas y pases QR desde un solo panel.',
      open: false
    }
  ];

  // Quick Preview Modal State
  previewModalOpen = false;
  previewTemplate?: LandingTemplateMeta;
  previewDevice: 'mobile' | 'desktop' = 'mobile';
  previewSafeUrl: SafeResourceUrl | null = null;
  previewIframeLoading = false;

  // Interactive Template Studio Modal State
  studioOpen = false;
  studioTab: StudioTab = 'main';
  studioViewport: 'mobile' | 'desktop' = 'desktop';
  studioTemplateKey = 'boda-girasoles';
  studioSafeUrl: SafeResourceUrl | null = null;
  studioIframeLoaded = false;
  inlineTextMode = false;
  savingAndCreating = false;
  studioToast = '';

  draftState?: LandingDraftState | null;
  hostsText = '';

  private mutationObserver?: MutationObserver;
  private iframeInputListener?: () => void;
  private iframeInputTarget?: HTMLElement;
  private baselineTexts: Record<string, string> = {};
  private baselineHeroTitle = '';
  private baselineHeroSubtitle = '';
  private baselineStoryBody = '';
  private toastTimer?: ReturnType<typeof setTimeout>;
  private liveSyncTimer?: ReturnType<typeof setTimeout>;
  private inlineSyncTimer?: ReturnType<typeof setTimeout>;

  constructor(
    public auth: AuthService,
    public landingDraft: LandingDraftService,
    private textOverlay: TemplateTextOverlayService,
    private sanitizer: DomSanitizer,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.draftState = this.landingDraft.getDraft();
  }

  ngOnDestroy(): void {
    this.detachIframeInputListener();
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (this.liveSyncTimer) clearTimeout(this.liveSyncTimer);
    if (this.inlineSyncTimer) clearTimeout(this.inlineSyncTimer);
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.previewModalOpen) {
      this.closeQuickPreview();
    } else if (this.studioOpen && !this.savingAndCreating) {
      this.closeTemplateStudio();
    }
  }

  get hasSavedDraft(): boolean {
    return this.landingDraft.hasDraft() && Boolean(this.landingDraft.getDraft()?.hasUserEdits);
  }

  get savedDraftSummary(): string {
    return this.landingDraft.getDraftSummaryLabel();
  }

  get filteredTemplates(): LandingTemplateMeta[] {
    if (this.catalogFilter === 'featured') {
      return this.templates.filter((t) => t.featured);
    }
    if (this.catalogFilter === 'all') {
      return this.templates;
    }
    return this.templates.filter((t) => t.category === this.catalogFilter);
  }

  get activeStudioMeta(): LandingTemplateMeta | undefined {
    return this.landingDraft.getTemplateMeta(this.studioTemplateKey);
  }

  get editedTextsCount(): number {
    const map = this.draftState?.invitation?.content?.editedTexts;
    return map ? Object.keys(map).length : 0;
  }

  scrollToSection(sectionId: string): void {
    this.mobileMenuOpen = false;
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  goToLogin(): void {
    this.mobileMenuOpen = false;
    this.router.navigate(['/new/login']);
  }

  goToRegister(): void {
    this.mobileMenuOpen = false;
    this.router.navigate(['/new/register']);
  }

  goToDashboard(): void {
    this.mobileMenuOpen = false;
    this.router.navigate(['/new/dashboard']);
  }

  resumeExistingDraft(): void {
    const draft = this.landingDraft.getDraft();
    if (!draft) {
      this.openTemplateStudio('boda-girasoles');
      return;
    }
    if (draft.mode === 'visual') {
      this.openVisualEditor(draft.visualPresetKey);
    } else {
      this.openTemplateStudio(draft.templateKey || 'boda-girasoles');
    }
  }

  openVisualEditor(presetKey?: string): void {
    this.mobileMenuOpen = false;
    if (this.studioOpen) {
      this.captureInlineEditsFromStudioIframe();
      this.persistStudioFormToDraft();
      this.studioOpen = false;
    }
    if (this.previewModalOpen) {
      this.previewModalOpen = false;
    }
    this.landingDraft.ensureDraftForVisualEditor(presetKey);
    this.router.navigate(['/new/demo/visual-editor'], {
      queryParams: presetKey ? { preset: presetKey } : undefined
    });
  }

  openQuickPreview(tpl: LandingTemplateMeta): void {
    this.previewTemplate = tpl;
    this.previewDevice = 'mobile';
    this.previewIframeLoading = true;
    this.landingDraft.ensureDraftForTemplate(tpl.id);
    const url = `/new/i/landing-draft?guestDraft=true&tpl=${encodeURIComponent(tpl.id)}&preview=true&_v=${Date.now()}`;
    this.previewSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.previewModalOpen = true;
  }

  closeQuickPreview(): void {
    this.previewModalOpen = false;
    this.previewSafeUrl = null;
  }

  editFromPreview(): void {
    const key = this.previewTemplate?.id || 'boda-girasoles';
    this.closeQuickPreview();
    this.openTemplateStudio(key);
  }

  openTemplateStudio(templateKey: string): void {
    this.mobileMenuOpen = false;
    this.studioTemplateKey = templateKey;
    this.studioTab = 'main';
    this.inlineTextMode = false;
    this.studioIframeLoaded = false;
    this.baselineTexts = {};

    const state = this.landingDraft.ensureDraftForTemplate(templateKey);
    this.draftState = JSON.parse(JSON.stringify(state));
    this.hostsText = (this.draftState?.event?.hosts || []).join(', ');
    this.ensureDraftArrays();
    this.refreshStudioIframeUrl();
    this.studioOpen = true;
  }

  switchStudioTemplate(templateKey: string): void {
    if (templateKey === this.studioTemplateKey) return;
    this.captureInlineEditsFromStudioIframe();
    this.persistStudioFormToDraft();
    this.studioTemplateKey = templateKey;
    this.inlineTextMode = false;
    this.studioIframeLoaded = false;
    this.baselineTexts = {};

    const switched = this.landingDraft.ensureDraftForTemplate(templateKey);
    this.draftState = JSON.parse(JSON.stringify(switched));
    this.hostsText = (this.draftState?.event?.hosts || []).join(', ');
    this.ensureDraftArrays();
    this.refreshStudioIframeUrl();
    this.showStudioToast(`Plantilla cambiada a ${this.activeStudioMeta?.shortName || templateKey}`);
  }

  closeTemplateStudio(): void {
    this.captureInlineEditsFromStudioIframe();
    this.persistStudioFormToDraft();
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    this.studioOpen = false;
    this.studioSafeUrl = null;
  }

  private ensureDraftArrays(): void {
    if (!this.draftState) return;
    if (!this.draftState.invitation.content) {
      this.draftState.invitation.content = {};
    }
    if (!this.draftState.invitation.content.locations) {
      this.draftState.invitation.content.locations = [];
    }
    if (!this.draftState.invitation.content.itinerary) {
      this.draftState.invitation.content.itinerary = [];
    }
    if (!this.draftState.event.venue) {
      this.draftState.event.venue = {};
    }
  }

  refreshStudioIframeUrl(): void {
    const url = `/new/i/landing-draft?guestDraft=true&tpl=${encodeURIComponent(this.studioTemplateKey)}&preview=true&_v=${Date.now()}`;
    this.studioSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  onEventTitleManualChange(): void {
    if (!this.draftState) return;
    this.draftState.customEventTitle = Boolean((this.draftState.event.title || '').trim());
    this.onStudioFieldChange();
  }

  onHeadlineFieldChange(): void {
    if (!this.draftState?.invitation?.content) return;
    const headline = (this.draftState.invitation.content.headline || '').trim();
    if (headline && !this.draftState.customEventTitle) {
      this.draftState.event.title = this.landingDraft.formatEventTitleFromHeadline(
        headline,
        this.draftState.event.type || 'boda'
      );
    }
    this.onStudioFieldChange();
  }

  onStudioFieldChange(): void {
    if (!this.draftState) return;
    this.draftState.event.hosts = this.hostsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const primaryLoc = this.draftState.invitation.content?.locations?.[1] || this.draftState.invitation.content?.locations?.[0];
    if (primaryLoc) {
      this.draftState.event.venue = {
        name: primaryLoc.name || '',
        address: primaryLoc.address || '',
        mapUrl: primaryLoc.mapUrl || ''
      };
    }

    if (this.liveSyncTimer) clearTimeout(this.liveSyncTimer);
    this.liveSyncTimer = setTimeout(() => {
      this.persistStudioFormToDraft();
      this.pushDraftUpdateToIframe();
    }, 120);
  }

  onEventTypeChange(newType: EventType): void {
    if (!this.draftState) return;
    this.draftState.event.type = newType;
    this.onStudioFieldChange();
  }

  addLocation(): void {
    if (!this.draftState?.invitation?.content) return;
    this.draftState.invitation.content.locations = this.draftState.invitation.content.locations || [];
    const nextLoc: InvitationLocation = {
      type: 'Evento / Recepción',
      name: 'Nueva ubicación',
      address: 'Dirección del lugar',
      mapUrl: ''
    };
    this.draftState.invitation.content.locations.push(nextLoc);
    this.onStudioFieldChange();
  }

  removeLocation(index: number): void {
    if (!this.draftState?.invitation?.content?.locations) return;
    this.draftState.invitation.content.locations.splice(index, 1);
    this.onStudioFieldChange();
  }

  addItineraryItem(): void {
    if (!this.draftState?.invitation?.content) return;
    this.draftState.invitation.content.itinerary = this.draftState.invitation.content.itinerary || [];
    this.draftState.invitation.content.itinerary.push({
      time: '21:00',
      title: 'Momento especial',
      description: 'Descripción breve'
    });
    this.onStudioFieldChange();
  }

  removeItineraryItem(index: number): void {
    if (!this.draftState?.invitation?.content?.itinerary) return;
    this.draftState.invitation.content.itinerary.splice(index, 1);
    this.onStudioFieldChange();
  }

  private persistStudioFormToDraft(): void {
    if (!this.draftState) return;
    this.draftState = this.landingDraft.saveDraft(
      {
        mode: 'template',
        templateKey: this.studioTemplateKey,
        event: this.draftState.event,
        invitation: this.draftState.invitation
      },
      true
    );
  }

  private pushDraftUpdateToIframe(): void {
    const win = this.studioIframe?.nativeElement?.contentWindow;
    if (!win || !this.draftState) return;
    try {
      win.postMessage(
        {
          type: 'LANDING_DRAFT_UPDATE',
          draft: this.draftState
        },
        window.location.origin
      );
    } catch {}
  }

  onStudioIframeLoad(iframe: HTMLIFrameElement): void {
    this.studioIframeLoaded = true;
    setTimeout(() => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;
        this.textOverlay.tagEditableElements(doc);
        if (Object.keys(this.baselineTexts).length === 0) {
          this.baselineTexts = this.textOverlay.extractTexts(doc);
          this.baselineHeroTitle = this.readHeroTitleFromDoc(doc);
          this.baselineHeroSubtitle = this.readHeroSubtitleFromDoc(doc);
          this.baselineStoryBody = this.readStoryBodyFromDoc(doc);
        }
        const savedEdits = this.draftState?.invitation?.content?.editedTexts;
        if (savedEdits && Object.keys(savedEdits).length > 0) {
          this.textOverlay.applyTexts(doc.body || doc.documentElement, savedEdits);
        }
        if (this.inlineTextMode) {
          this.applyContentEditableToIframe(doc, true);
        }
      } catch {}
    }, 350);
  }

  toggleInlineTextMode(enable?: boolean): void {
    const next = enable !== undefined ? enable : !this.inlineTextMode;
    if (!next && this.inlineTextMode) {
      this.captureInlineEditsFromStudioIframe();
      this.persistStudioFormToDraft();
    }
    this.inlineTextMode = next;
    const iframe = this.studioIframe?.nativeElement;
    const doc = iframe?.contentDocument || iframe?.contentWindow?.document;
    if (doc) {
      this.applyContentEditableToIframe(doc, this.inlineTextMode);
    }
    if (this.inlineTextMode) {
      this.showStudioToast('Haz clic sobre cualquier título o párrafo en la vista previa para editarlo directamente.');
    }
  }

  selectStudioTab(tab: StudioTab): void {
    this.studioTab = tab;
    if (tab === 'inline' && !this.inlineTextMode) {
      this.toggleInlineTextMode(true);
    }
  }

  resetInlineTexts(): void {
    if (!this.draftState?.invitation?.content) return;
    this.draftState.invitation.content.editedTexts = {};
    this.baselineTexts = {};
    this.persistStudioFormToDraft();
    this.studioIframeLoaded = false;
    this.refreshStudioIframeUrl();
    this.showStudioToast('Textos directos restablecidos a la plantilla original.');
  }

  private applyContentEditableToIframe(doc: Document, enabled: boolean): void {
    const styleId = 'velisse-landing-inline-edit-style';
    if (enabled && !doc.getElementById(styleId)) {
      const style = doc.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        [contenteditable="true"] {
          outline: 1.5px dashed rgba(212, 175, 55, 0.55) !important;
          border-radius: 6px !important;
          cursor: text !important;
          transition: all 0.15s ease !important;
        }
        [contenteditable="true"]:hover {
          outline: 2px dashed #d4af37 !important;
          background: rgba(212, 175, 55, 0.12) !important;
        }
        [contenteditable="true"]:focus {
          outline: 2px solid #d4af37 !important;
          background: rgba(212, 175, 55, 0.18) !important;
          box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.22) !important;
        }
      `;
      doc.head.appendChild(style);
    }

    const markElements = () => {
      this.textOverlay.tagEditableElements(doc);
      if (Object.keys(this.baselineTexts).length === 0) {
        this.baselineTexts = this.textOverlay.extractTexts(doc);
        this.baselineHeroTitle = this.readHeroTitleFromDoc(doc);
        this.baselineHeroSubtitle = this.readHeroSubtitleFromDoc(doc);
        this.baselineStoryBody = this.readStoryBodyFromDoc(doc);
      }
      const selectors = [
        'h1', 'h2', 'h3', 'h4', 'p', 'span:not(.cd-val):not(.cd-sep)',
        'blockquote', '.girasoles-hero-title', '.girasoles-hero-subtitle',
        '.navy-hero-title', '.navy-hero-subtitle', '.section-title', '.story-paragraph'
      ].join(', ');

      doc.querySelectorAll(selectors).forEach((el) => {
        if (
          el.tagName === 'BUTTON' ||
          el.tagName === 'INPUT' ||
          el.closest('button') ||
          el.closest('svg') ||
          el.closest('app-universal-rsvp-form')
        ) {
          return;
        }
        if (enabled) {
          el.setAttribute('contenteditable', 'true');
          el.setAttribute('spellcheck', 'false');
        } else {
          el.removeAttribute('contenteditable');
        }
      });
    };

    markElements();
    this.detachIframeInputListener();

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    if (enabled && doc.body) {
      this.iframeInputTarget = doc.body;
      this.iframeInputListener = () => {
        if (this.inlineSyncTimer) clearTimeout(this.inlineSyncTimer);
        this.inlineSyncTimer = setTimeout(() => {
          this.captureInlineEditsFromStudioIframe();
          this.persistStudioFormToDraft();
        }, 180);
      };
      doc.body.addEventListener('input', this.iframeInputListener, true);
      doc.body.addEventListener('blur', this.iframeInputListener, true);

      this.mutationObserver = new MutationObserver(() => markElements());
      this.mutationObserver.observe(doc.body, { childList: true, subtree: true });
    }
  }

  private detachIframeInputListener(): void {
    if (this.iframeInputTarget && this.iframeInputListener) {
      try {
        this.iframeInputTarget.removeEventListener('input', this.iframeInputListener, true);
        this.iframeInputTarget.removeEventListener('blur', this.iframeInputListener, true);
      } catch {}
    }
    this.iframeInputTarget = undefined;
    this.iframeInputListener = undefined;
  }

  private readHeroTitleFromDoc(doc: Document): string {
    const el = doc.querySelector(
      '.girasoles-hero-title, .navy-hero-title, .nw-pub-headline, .headline-modern, .env-title, header h1, main h1, h1'
    );
    return (el?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  private readHeroSubtitleFromDoc(doc: Document): string {
    const el = doc.querySelector(
      '.girasoles-hero-subtitle, .navy-hero-subtitle, .nw-pub-subheadline, .env-sub'
    );
    return (el?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  private readStoryBodyFromDoc(doc: Document): string {
    const el = doc.querySelector('.story-paragraph, [data-section-key="story"] p');
    return (el?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  private captureInlineEditsFromStudioIframe(): void {
    if (!this.draftState?.invitation?.content) return;
    try {
      const iframe = this.studioIframe?.nativeElement;
      const doc = iframe?.contentDocument || iframe?.contentWindow?.document;
      if (!doc) return;

      this.textOverlay.tagEditableElements(doc);
      const currentTexts = this.textOverlay.extractTexts(doc);
      if (Object.keys(this.baselineTexts).length > 0) {
        const diff = this.textOverlay.diffTexts(this.baselineTexts, currentTexts);
        if (Object.keys(diff).length > 0) {
          this.draftState.invitation.content.editedTexts = {
            ...(this.draftState.invitation.content.editedTexts || {}),
            ...diff
          };
        }
      }

      // Sync direct cover title / subtitle / story edits back into structured content & event title
      const liveHeroTitle = this.readHeroTitleFromDoc(doc);
      if (
        liveHeroTitle &&
        ((this.baselineHeroTitle && liveHeroTitle !== this.baselineHeroTitle) ||
          !this.landingDraft.isDefaultPlaceholderHeadline(liveHeroTitle))
      ) {
        this.draftState.invitation.content.headline = liveHeroTitle;
        if (!this.draftState.customEventTitle) {
          this.draftState.event.title = this.landingDraft.formatEventTitleFromHeadline(
            liveHeroTitle,
            this.draftState.event.type || 'boda'
          );
        }
      }

      const liveHeroSub = this.readHeroSubtitleFromDoc(doc);
      if (liveHeroSub && this.baselineHeroSubtitle && liveHeroSub !== this.baselineHeroSubtitle) {
        this.draftState.invitation.content.subheadline = liveHeroSub;
      }

      const liveStory = this.readStoryBodyFromDoc(doc);
      if (liveStory && this.baselineStoryBody && liveStory !== this.baselineStoryBody) {
        this.draftState.invitation.content.storyBody = liveStory;
        this.draftState.invitation.content.message = liveStory;
      }
    } catch {}
  }

  saveTemplateAndProceed(): void {
    if (this.savingAndCreating) return;
    this.captureInlineEditsFromStudioIframe();
    this.persistStudioFormToDraft();
    this.landingDraft.markPendingSave('template');

    if (this.auth.isAuthenticated) {
      this.savingAndCreating = true;
      this.landingDraft.materializeDraftToAccount().subscribe({
        next: ({ redirectCommands }) => {
          this.savingAndCreating = false;
          this.studioOpen = false;
          this.router.navigate(redirectCommands);
        },
        error: () => {
          this.savingAndCreating = false;
          this.showStudioToast('No se pudo crear el evento en este momento. Intenta nuevamente.');
        }
      });
      return;
    }

    this.studioOpen = false;
    this.router.navigate(['/new/login'], { queryParams: { intent: 'save-draft' } });
  }

  toggleFaq(index: number): void {
    this.faqs[index].open = !this.faqs[index].open;
  }

  private showStudioToast(msg: string): void {
    this.studioToast = msg;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.studioToast = '';
    }, 4000);
  }
}
