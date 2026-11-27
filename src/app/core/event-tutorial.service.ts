import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import type { Alignment, Driver, DriveStep, Side } from 'driver.js';

export type TutorialSectionKey =
  | 'info'
  | 'guests'
  | 'tables'
  | 'rsvps'
  | 'album'
  | 'communication'
  | 'dj'
  | 'dedications'
  | 'integration'
  | 'logs';

export type PageTourKey =
  | 'dashboard'
  | 'events'
  | 'invitation-editor'
  | 'invitation-sections'
  | 'visual-editor'
  | 'pass-editor'
  | 'seating-chart'
  | 'plan'
  | 'contact'
  | 'user-guide'
  | 'template-management';

export interface TutorialSectionMeta {
  key: TutorialSectionKey;
  label: string;
  shortLabel: string;
}

export interface PageTourOptions {
  onStepActivate?: (stepId: string) => void;
  onClosed?: () => void;
}

interface RawTourStep {
  id?: string;
  selectors?: string[];
  optional?: boolean;
  side?: Side;
  align?: Alignment;
  badge: string;
  title: string;
  howItWorks: string;
  whatCanYouDo?: string[];
}

@Injectable({ providedIn: 'root' })
export class EventTutorialService {
  readonly sections: TutorialSectionMeta[] = [
    { key: 'info', label: 'Información', shortLabel: 'Info' },
    { key: 'guests', label: 'Invitados', shortLabel: 'Invitados' },
    { key: 'tables', label: 'Mesas', shortLabel: 'Mesas' },
    { key: 'rsvps', label: 'RSVPs', shortLabel: 'RSVPs' },
    { key: 'album', label: 'Álbum', shortLabel: 'Álbum' },
    { key: 'communication', label: 'Comunicación', shortLabel: 'Envíos' },
    { key: 'dj', label: 'DJ', shortLabel: 'DJ' },
    { key: 'dedications', label: 'Dedicatorias', shortLabel: 'Dedicatorias' },
    { key: 'integration', label: 'Integración y API', shortLabel: 'API' },
    { key: 'logs', label: 'Historial de cambios', shortLabel: 'Historial' }
  ];

  readonly pageLabels: Record<PageTourKey, string> = {
    dashboard: 'Dashboard',
    events: 'Eventos',
    'invitation-editor': 'Editor',
    'invitation-sections': 'Secciones',
    'visual-editor': 'Visual',
    'pass-editor': 'Pase VIP',
    'seating-chart': 'Croquis',
    plan: 'Plan',
    contact: 'Soporte',
    'user-guide': 'Guía',
    'template-management': 'Moderación'
  };

  activeEventId: string | null = null;
  activeTab: string = 'info';
  allowedSections: TutorialSectionKey[] = this.sections.map(s => s.key);
  isRunning = false;

  private readonly tutorialRequestSubject = new Subject<TutorialSectionKey | undefined>();
  readonly tutorialRequest$ = this.tutorialRequestSubject.asObservable();

  private driverInstance: Driver | null = null;
  private boundPopoverClickHandler?: (ev: MouseEvent) => void;

  constructor(
    private router: Router,
    private ngZone: NgZone
  ) {}

  setEventContext(eventId: string | null, activeTab: string, allowedSections?: TutorialSectionKey[]): void {
    this.activeEventId = eventId;
    this.activeTab = activeTab;
    if (allowedSections && allowedSections.length) {
      this.allowedSections = allowedSections;
    } else {
      this.allowedSections = this.sections.map(s => s.key);
    }
  }

  clearEventContext(eventId?: string): void {
    if (!eventId || this.activeEventId === eventId) {
      this.activeEventId = null;
      this.activeTab = 'info';
      this.allowedSections = this.sections.map(s => s.key);
    }
  }

  isTutorialSection(tab: string): tab is TutorialSectionKey {
    return this.sections.some(s => s.key === tab);
  }

  resolvePageTourFromUrl(url: string): PageTourKey | null {
    const cleanPath = (url || '').split('?')[0].split('#')[0];
    if (/^\/new\/events\/[a-f0-9]{24}\/seating/i.test(cleanPath)) return 'seating-chart';
    if (/^\/new\/events\/[a-f0-9]{24}$/i.test(cleanPath)) {
      if ((url || '').includes('tab=guide') || this.activeTab === 'guide') return 'user-guide';
      return null;
    }
    if (/^\/new\/dashboard/i.test(cleanPath)) return 'dashboard';
    if (/^\/new\/events\/?$/i.test(cleanPath)) return 'events';
    if (/^\/new\/(?:invitations\/[^/]+\/visual-editor|demo\/visual-editor)/i.test(cleanPath)) return 'visual-editor';
    if (/^\/new\/invitations\/[^/]+\/pass-editor/i.test(cleanPath)) return 'pass-editor';
    if (/^\/new\/invitations\/[^/]+\/sections/i.test(cleanPath)) return 'invitation-sections';
    if (/^\/new\/invitations\/[^/]+\/editor/i.test(cleanPath)) return 'invitation-editor';
    if (/^\/new\/plan/i.test(cleanPath)) return 'plan';
    if (/^\/new\/contact/i.test(cleanPath)) return 'contact';
    if (/^\/new\/template-management/i.test(cleanPath)) return 'template-management';
    if (/^\/new\/guia/i.test(cleanPath)) return 'user-guide';
    return null;
  }

  getActiveBadgeForUrl(url: string): string | null {
    const cleanPath = (url || '').split('?')[0].split('#')[0];
    if (/^\/new\/events\/[a-f0-9]{24}$/i.test(cleanPath)) {
      if ((url || '').includes('tab=guide') || this.activeTab === 'guide') {
        return 'Guía';
      }
      if (this.isTutorialSection(this.activeTab)) {
        const meta = this.sections.find(s => s.key === this.activeTab);
        return meta ? meta.shortLabel : null;
      }
    }
    const pageKey = this.resolvePageTourFromUrl(url);
    return pageKey ? this.pageLabels[pageKey] : null;
  }

  triggerFromSidebar(requestedSection?: TutorialSectionKey): void {
    const url = this.router.url;
    const eventMatch = url.match(/\/new\/events\/([a-f0-9]{24})/i);
    const isDirectEventDetail = /^\/new\/events\/[a-f0-9]{24}(?:[?#]|$)/i.test(url);

    if (requestedSection) {
      if (isDirectEventDetail && this.activeEventId) {
        this.tutorialRequestSubject.next(requestedSection);
        return;
      }
      const targetEventId = (eventMatch && eventMatch[1]) || this.activeEventId;
      if (targetEventId) {
        this.router.navigate(['/new/events', targetEventId], {
          queryParams: { tab: requestedSection, tutorial: '1' }
        });
        return;
      }
      this.router.navigate(['/new/events']);
      return;
    }

    if (isDirectEventDetail && this.activeEventId) {
      if (url.includes('tab=guide') || this.activeTab === 'guide') {
        void this.runPageTour('user-guide');
        return;
      }
      this.tutorialRequestSubject.next(undefined);
      return;
    }

    const pageTour = this.resolvePageTourFromUrl(url);
    if (pageTour) {
      void this.runPageTour(pageTour);
      return;
    }

    if (eventMatch && eventMatch[1]) {
      this.router.navigate(['/new/events', eventMatch[1]], {
        queryParams: { tab: 'info', tutorial: '1' }
      });
      return;
    }

    void this.runOutsideEventTour();
  }

  stopTour(): void {
    this.detachPopoverListener();
    if (this.driverInstance) {
      const instance = this.driverInstance;
      this.driverInstance = null;
      this.isRunning = false;
      try {
        instance.destroy();
      } catch {
        // Ignore destroy errors if already torn down
      }
    } else {
      this.isRunning = false;
    }
  }

  async runOutsideEventTour(): Promise<void> {
    this.stopTour();
    const { driver } = await import('driver.js');
    const targetEl = this.findVisibleElement(['[data-tour="sidebar-events-link"]']);

    const description = this.buildDescriptionHtml({
      badge: 'TUTORIAL INTERACTIVO',
      howItWorks: 'El tutorial interactivo se adapta automáticamente a la pantalla o sección en la que te encuentres dentro de Velisse.',
      whatCanYouDo: [
        'Abre cualquier sección (Dashboard, Eventos, Editor Visual, Mesas, Plan o el panel de un evento) y pulsa "Tutorial" para recorrer sus herramientas paso a paso.',
        'Haz clic en "Ir a Eventos" aquí abajo para elegir o crear un evento.'
      ]
    }) + `
      <div class="nw-tour-jump-box">
        <button type="button" class="nw-tour-next-section-btn" data-tour-go-events="1">
          Ir a mis Eventos →
        </button>
      </div>
    `;

    this.attachPopoverListener((target) => {
      if (target.closest('[data-tour-go-events]')) {
        this.stopTour();
        this.ngZone.run(() => this.router.navigate(['/new/events']));
      }
    });

    this.isRunning = true;
    this.driverInstance = driver({
      showProgress: false,
      animate: true,
      smoothScroll: true,
      allowClose: true,
      overlayColor: 'rgba(26, 20, 16, 0.58)',
      stagePadding: 8,
      stageRadius: 14,
      popoverClass: 'nw-driver-popover',
      doneBtnText: 'Entendido',
      closeBtnLabel: 'Cerrar',
      onDestroyed: () => {
        this.detachPopoverListener();
        this.driverInstance = null;
        this.ngZone.run(() => { this.isRunning = false; });
      },
      steps: [
        {
          ...(targetEl ? { element: targetEl } : {}),
          popover: {
            title: 'Recorridos guiados en toda la suite',
            description,
            side: 'right',
            align: 'start'
          }
        }
      ]
    });

    this.driverInstance.drive();
  }

  async runPageTour(page: PageTourKey, opts?: PageTourOptions): Promise<void> {
    this.stopTour();
    const { driver } = await import('driver.js');
    const rawSteps = this.getRawStepsForPage(page);
    const steps: DriveStep[] = [];

    for (const raw of rawSteps) {
      let element: Element | undefined;
      if (raw.selectors && raw.selectors.length > 0) {
        element = this.findVisibleElement(raw.selectors);
        if (!element && raw.optional) {
          continue;
        }
      }

      const stepId = raw.id || '';
      steps.push({
        ...(element ? { element } : {}),
        ...(stepId && opts?.onStepActivate
          ? {
              onHighlightStarted: () => {
                this.ngZone.run(() => opts.onStepActivate!(stepId));
              }
            }
          : {}),
        popover: {
          title: raw.title,
          description: this.buildDescriptionHtml(raw),
          side: raw.side || 'bottom',
          align: raw.align || 'start'
        }
      });
    }

    if (!steps.length) return;

    this.isRunning = true;
    this.driverInstance = driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      allowClose: true,
      overlayColor: 'rgba(26, 20, 16, 0.58)',
      stagePadding: 8,
      stageRadius: 14,
      popoverClass: 'nw-driver-popover',
      progressText: 'Paso {{current}} de {{total}}',
      nextBtnText: 'Siguiente →',
      prevBtnText: '← Anterior',
      doneBtnText: 'Finalizar',
      closeBtnLabel: 'Cerrar tutorial',
      onDestroyed: () => {
        this.detachPopoverListener();
        this.driverInstance = null;
        this.ngZone.run(() => {
          this.isRunning = false;
          opts?.onClosed?.();
        });
      },
      steps
    });

    this.driverInstance.drive();
  }

  async runSectionTour(
    section: TutorialSectionKey,
    opts?: {
      availableSections?: TutorialSectionKey[];
      onSelectSection?: (nextSection: TutorialSectionKey) => void;
    }
  ): Promise<void> {
    this.stopTour();
    const { driver } = await import('driver.js');

    const available = opts?.availableSections?.length
      ? opts.availableSections
      : this.allowedSections;

    const rawSteps = this.getRawStepsForSection(section);
    const steps: DriveStep[] = [];

    for (const raw of rawSteps) {
      let element: Element | undefined;
      if (raw.selectors && raw.selectors.length > 0) {
        element = this.findVisibleElement(raw.selectors);
        if (!element && raw.optional) {
          continue;
        }
      }

      steps.push({
        ...(element ? { element } : {}),
        popover: {
          title: raw.title,
          description: this.buildDescriptionHtml(raw),
          side: raw.side || 'bottom',
          align: raw.align || 'start'
        }
      });
    }

    if (!steps.length) return;

    const otherSections = this.sections.filter(
      s => s.key !== section && available.includes(s.key)
    );
    if (opts?.onSelectSection && otherSections.length > 0) {
      const currentIdx = available.indexOf(section);
      const nextKey = currentIdx >= 0 && currentIdx < available.length - 1
        ? available[currentIdx + 1]
        : available[0];
      const nextMeta = this.sections.find(s => s.key === nextKey);

      const lastStep = steps[steps.length - 1];
      if (lastStep.popover) {
        const chipsHtml = otherSections
          .map(s => `<button type="button" class="nw-tour-chip" data-tour-jump="${s.key}">${this.escapeHtml(s.label)}</button>`)
          .join('');
        const nextBtnHtml = nextMeta
          ? `<button type="button" class="nw-tour-next-section-btn" data-tour-jump="${nextMeta.key}">
               Continuar con ${this.escapeHtml(nextMeta.label)} →
             </button>`
          : '';

        lastStep.popover.description = (lastStep.popover.description || '') + `
          <div class="nw-tour-jump-box">
            ${nextBtnHtml}
            <div class="nw-tour-jump-label">O salta a cualquier otra sección:</div>
            <div class="nw-tour-section-chips">${chipsHtml}</div>
          </div>
        `;
      }

      this.attachPopoverListener((target) => {
        const btn = target.closest('[data-tour-jump]') as HTMLElement | null;
        if (!btn) return;
        const jumpKey = btn.getAttribute('data-tour-jump') as TutorialSectionKey | null;
        if (jumpKey && this.isTutorialSection(jumpKey)) {
          this.stopTour();
          this.ngZone.run(() => opts.onSelectSection!(jumpKey));
        }
      });
    }

    this.isRunning = true;
    this.driverInstance = driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      allowClose: true,
      overlayColor: 'rgba(26, 20, 16, 0.58)',
      stagePadding: 8,
      stageRadius: 14,
      popoverClass: 'nw-driver-popover',
      progressText: 'Paso {{current}} de {{total}}',
      nextBtnText: 'Siguiente →',
      prevBtnText: '← Anterior',
      doneBtnText: 'Finalizar sección',
      closeBtnLabel: 'Cerrar tutorial',
      onDestroyed: () => {
        this.detachPopoverListener();
        this.driverInstance = null;
        this.ngZone.run(() => { this.isRunning = false; });
      },
      steps
    });

    this.driverInstance.drive();
  }

  private attachPopoverListener(handler: (target: HTMLElement) => void): void {
    this.detachPopoverListener();
    this.boundPopoverClickHandler = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      if (!target) return;
      if (!target.closest('.nw-driver-popover')) return;
      handler(target);
    };
    document.addEventListener('click', this.boundPopoverClickHandler, true);
  }

  private detachPopoverListener(): void {
    if (this.boundPopoverClickHandler) {
      document.removeEventListener('click', this.boundPopoverClickHandler, true);
      this.boundPopoverClickHandler = undefined;
    }
  }

  private findVisibleElement(selectors: string[]): Element | undefined {
    for (const selector of selectors) {
      const candidates = Array.from(document.querySelectorAll(selector));
      for (const el of candidates) {
        if (this.isElementVisible(el)) {
          return el;
        }
      }
    }
    return undefined;
  }

  private isElementVisible(el: Element): boolean {
    const htmlEl = el as HTMLElement;
    if (!htmlEl.isConnected) return false;
    const style = window.getComputedStyle(htmlEl);
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity || '1') === 0) {
      return false;
    }
    const rect = htmlEl.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  private buildDescriptionHtml(step: Pick<RawTourStep, 'badge' | 'howItWorks' | 'whatCanYouDo'>): string {
    const items = (step.whatCanYouDo || [])
      .map(item => `<li>${this.escapeHtml(item)}</li>`)
      .join('');

    const listBlock = items
      ? `<div class="nw-tour-subtitle">Qué puedes hacer aquí</div><ul class="nw-tour-list">${items}</ul>`
      : '';

    return `
      <div class="nw-tour-body">
        <span class="nw-tour-badge">${this.escapeHtml(step.badge)}</span>
        <p class="nw-tour-lead">${this.escapeHtml(step.howItWorks)}</p>
        ${listBlock}
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private getRawStepsForPage(page: PageTourKey): RawTourStep[] {
    switch (page) {
      case 'visual-editor':
        return [
          {
            id: 'workspace',
            selectors: ['[data-tour="ve-topbar"]'],
            side: 'bottom',
            align: 'center',
            badge: 'EDITOR VISUAL 3 EN 1',
            title: 'Tu estudio de diseño interactivo',
            howItWorks: 'Aquí diseñas con total libertad tu Invitación Digital, la Pantalla de Acceso NIP y el Pase VIP con QR en un mismo lugar: a la izquierda tienes las herramientas, al centro el lienzo en vivo y a la derecha el inspector.',
            whatCanYouDo: [
              'Usar Deshacer / Rehacer (Ctrl+Z / Ctrl+Y) en cualquier momento mientras experimentas.',
              'Trabajar con autoguardado de borrador sin alterar la invitación pública hasta que decidas publicar.'
            ]
          },
          {
            id: 'templates',
            selectors: ['[data-tour="ve-templates-btn"]'],
            optional: true,
            side: 'bottom',
            align: 'center',
            badge: 'CATÁLOGO 3 EN 1',
            title: 'Plantillas prehechas y de la comunidad',
            howItWorks: 'Abre la galería estilo Canva con las plantillas oficiales de colección y los diseños compartidos por creadores.',
            whatCanYouDo: [
              'Previsualizar la Invitación, el Pase VIP y la Pantalla de Acceso antes de aplicar.',
              'Elegir qué piezas deseas usar en tu evento sin perder tus invitados, mesas ni confirmaciones.'
            ]
          },
          {
            id: 'design',
            selectors: ['[data-tour="ve-cat-design"]'],
            optional: true,
            side: 'right',
            align: 'start',
            badge: 'ESTILO GLOBAL',
            title: '1. Diseño, colores y tipografías',
            howItWorks: 'Define la identidad visual general de tu invitación: paletas cromáticas, familias tipográficas, botones y modo de presentación.',
            whatCanYouDo: [
              'Aplicar combinaciones de colores y fuentes curadas en un clic.',
              'Guardar versiones propias en tu cuenta para reutilizarlas en otros eventos.'
            ]
          },
          {
            id: 'elements',
            selectors: ['[data-tour="ve-cat-elements"]'],
            optional: true,
            side: 'right',
            align: 'start',
            badge: 'PIEZAS GRÁFICAS',
            title: '2. Elementos, composiciones y formas',
            howItWorks: 'Contiene todos los bloques creativos que puedes arrastrar o insertar libremente sobre cualquier sección del lienzo.',
            whatCanYouDo: [
              'Agregar títulos, textos caligráficos, botones interactivos, iconos, divisores dorados, formas y marcos de recorte para fotos.'
            ]
          },
          {
            id: 'assets',
            selectors: ['[data-tour="ve-cat-assets"]'],
            optional: true,
            side: 'right',
            align: 'start',
            badge: 'MULTIMEDIA',
            title: '3. Tus archivos, fotos, video y música',
            howItWorks: 'Administra los recursos multimedia subidos a tu invitación o busca fotografías de referencia sin salir del editor.',
            whatCanYouDo: [
              'Subir imágenes, videos de fondo y pistas de música MP3.',
              'Insertar cualquier archivo como capa, portada o fondo de sección.'
            ]
          },
          {
            id: 'functions',
            selectors: ['[data-tour="ve-cat-functions"]'],
            optional: true,
            side: 'right',
            align: 'start',
            badge: 'MÓDULOS CONECTADOS',
            title: '4. Funciones reales de tu evento',
            howItWorks: 'No son simples adornos: son componentes conectados en vivo con la base de datos de tu evento.',
            whatCanYouDo: [
              'Integrar confirmación RSVP, consulta de mesa y pase QR, cuenta regresiva, mapas GPS/Waze, mesa de regalos, sobre digital, itinerario, hospedaje, álbum colectivo, dedicatorias y peticiones al DJ.'
            ]
          },
          {
            id: 'sections',
            selectors: ['[data-tour="ve-cat-sections"]'],
            optional: true,
            side: 'right',
            align: 'start',
            badge: 'ESTRUCTURA',
            title: '5. Secciones de la invitación',
            howItWorks: 'Tu invitación se compone de bandas o escenas verticales ordenadas de arriba hacia abajo (o como tarjetas).',
            whatCanYouDo: [
              'Agregar nuevas secciones en blanco o temáticas, reordenarlas arrastrando, duplicarlas, ajustar su altura u ocultarlas temporalmente.'
            ]
          },
          {
            id: 'access-pass',
            selectors: ['[data-tour="ve-cat-access"]', '[data-tour="ve-cat-pass"]'],
            optional: true,
            side: 'right',
            align: 'start',
            badge: 'ACCESO NIP Y PASE VIP',
            title: '6. Pantalla de Acceso y Pase VIP integrados',
            howItWorks: 'Desde las pestañas "Acceso" y "Pase VIP" cambias el lienzo para diseñar el sobre/portada de bienvenida con validación NIP y los boletos QR de tus invitados.',
            whatCanYouDo: [
              'Personalizar la portada de entrada, textos de validación o auto-registro.',
              'Diseñar en "Pase VIP" las hojas frente y reverso del boleto con campos dinámicos ({{guest.name}}, mesa y código QR).'
            ]
          },
          {
            id: 'canvas',
            selectors: ['[data-tour="ve-canvas-toolbar"]'],
            optional: true,
            side: 'bottom',
            align: 'center',
            badge: 'CONTROL DE PRECISIÓN',
            title: 'Barra del lienzo, guías y zoom',
            howItWorks: 'Facilita acomodar, alinear y redimensionar cada objeto con precisión editorial sobre el lienzo.',
            whatCanYouDo: [
              'Activar cuadrícula, guías de ajuste inteligente (snapping) y márgenes seguros.',
              'Copiar, cortar, pegar capas con atajos de teclado y controlar el nivel de zoom.'
            ]
          },
          {
            id: 'inspector',
            selectors: ['[data-tour="ve-inspector-tabs"]'],
            optional: true,
            side: 'left',
            align: 'start',
            badge: 'EDICIÓN DETALLADA',
            title: 'Propiedades, Capas y Versiones',
            howItWorks: 'Al hacer clic en cualquier texto, foto, botón o módulo funcional, este panel derecho muestra todos sus ajustes finos.',
            whatCanYouDo: [
              'En "Propiedades", editar tipografía, colores, bordes, sombras, enlaces o datos del módulo seleccionado.',
              'En "Capas", cambiar quién va delante o detrás, bloquear objetos o seleccionarlos fácilmente; en "Versiones", guardar y restaurar puntos de control.'
            ]
          },
          {
            id: 'devices-more',
            selectors: ['[data-tour="ve-device-switcher"]'],
            optional: true,
            side: 'bottom',
            align: 'center',
            badge: ' DISEÑO RESPONSIVO',
            title: 'Vista por Celular, Tablet y Escritorio',
            howItWorks: 'Te permite comprobar al instante cómo verán tu invitación tus invitados desde cualquier tamaño de pantalla.',
            whatCanYouDo: [
              'Alternar entre Celular, Tablet y Escritorio y ajustar tamaños por vista.',
              'Abrir el menú "Más" para comparar los 3 dispositivos lado a lado, probar formularios en vivo, importar con IA o descargar en PNG, PDF o video MP4.'
            ]
          },
          {
            id: 'save-publish',
            selectors: ['[data-tour="ve-save-publish"]'],
            optional: true,
            side: 'bottom',
            align: 'end',
            badge: 'PUBLICACIÓN Y COMUNIDAD',
            title: 'Vista previa, Guardar y Publicar',
            howItWorks: 'Separa tu trabajo en borrador de la versión oficial que reciben tus invitados.',
            whatCanYouDo: [
              'Abrir "Vista previa" para navegar la invitación tal como un invitado real.',
              'Usar "Guardar" mientras diseñas y pulsar "Publicar" para revisar la auditoría automática de calidad y actualizar el enlace oficial (o compartir tu creación en el catálogo para ganar el 5% por uso).'
            ]
          }
        ];

      case 'dashboard':
        return [
          {
            selectors: ['[data-tour="dashboard-header"]'],
            side: 'bottom',
            align: 'start',
            badge: 'PANEL PRINCIPAL',
            title: 'Bienvenido a tu Dashboard',
            howItWorks: 'Reúne el panorama global de todos tus eventos activos, invitaciones, confirmaciones y envíos en una sola vista ejecutiva.',
            whatCanYouDo: [
              'Consultar el pulso general de tu cuenta apenas inicias sesión.',
              'Pulsar "+ Nuevo evento" para crear una nueva celebración con invitación digital o dashboard externo.'
            ]
          },
          {
            selectors: ['[data-tour="dashboard-metrics"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'INDICADORES GLOBALES',
            title: 'Métricas acumuladas en tiempo real',
            howItWorks: 'Suma automáticamente la actividad de tus eventos: invitados registrados, confirmados, pendientes, acompañantes, envíos por WhatsApp/correo y check-ins QR.',
            whatCanYouDo: [
              'Monitorear vistas de invitaciones, entregas exitosas o fallidas y ocultar/mostrar las tarjetas cuando prefieras una vista compacta.'
            ]
          },
          {
            selectors: ['[data-tour="dashboard-rates"]'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'SALUD OPERATIVA',
            title: 'Tasa de confirmación y asistencia estimada',
            howItWorks: 'Calcula el porcentaje de respuesta RSVP, la efectividad de tus envíos y el total proyectado de asistentes (titulares + acompañantes).',
            whatCanYouDo: [
              'Detectar rápido si hace falta enviar un recordatorio por WhatsApp o correo para subir las confirmaciones.'
            ]
          },
          {
            selectors: ['[data-tour="dashboard-recent-events"]'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'ACCESO RÁPIDO',
            title: 'Tus eventos recientes',
            howItWorks: 'Muestra las tarjetas de tus celebraciones con portada, tipo de evento, fecha, lugar y estado de publicación.',
            whatCanYouDo: [
              'Hacer clic en cualquier tarjeta para entrar al centro de control completo de ese evento (invitados, mesas, RSVPs, DJ, álbum y envíos).'
            ]
          }
        ];

      case 'events':
        return [
          {
            selectors: ['[data-tour="events-header"]'],
            side: 'bottom',
            align: 'start',
            badge: 'MIS EVENTOS',
            title: 'Directorio completo de eventos',
            howItWorks: 'Aquí administras todas tus celebraciones pasadas, borradores en preparación y próximos eventos publicados.',
            whatCanYouDo: [
              'Abrir la "Guía para empezar" si es tu primer evento.',
              'Crear un "+ Nuevo evento" eligiendo entre Invitación digital completa o Dashboard externo.'
            ]
          },
          {
            selectors: ['[data-tour="events-filters"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'BÚSQUEDA Y FILTROS',
            title: 'Localiza cualquier evento al instante',
            howItWorks: 'Permite filtrar tu catálogo cuando manejas múltiples bodas, XV años, graduaciones o bautizos.',
            whatCanYouDo: [
              'Buscar por nombre, anfitrión o sede.',
              'Filtrar entre Próximos / Ya realizados, por tipo de celebración o por estado (Borrador, Publicado, Archivado).'
            ]
          },
          {
            selectors: ['[data-tour="events-grid"]'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'TARJETAS DE EVENTO',
            title: 'Entra a la operación de un evento',
            howItWorks: 'Cada tarjeta resume la portada, fecha, salón y estado actual del evento, ordenando primero los eventos próximos.',
            whatCanYouDo: [
              'Hacer clic en "Abrir evento →" para gestionar su invitación, lista de invitados, croquis de mesas, confirmaciones, DJ, álbum y envíos.'
            ]
          }
        ];

      case 'invitation-editor':
        return [
          {
            selectors: ['[data-tour="inv-editor-toolbar"]'],
            side: 'bottom',
            align: 'start',
            badge: 'EDITOR DE INVITACIÓN',
            title: 'Barra de guardado, publicación y vista previa',
            howItWorks: 'Controla el ciclo de vida de tu invitación digital. Tus ediciones se autoguardan en borrador para que trabajes con tranquilidad.',
            whatCanYouDo: [
              'Pulsar "Guardar cambios" manualmente o abrir "Vista previa ↗" para revisar cómo luce tu borrador.',
              'Pulsar "Publicar / Publicar cambios" cuando quieras actualizar la invitación oficial que ven tus invitados.'
            ]
          },
          {
            selectors: ['[data-tour="inv-editor-nav"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'MODOS DE EDICIÓN',
            title: 'Elige cómo prefieres editar tu invitación',
            howItWorks: 'Combina la rapidez del formulario guiado con el catálogo de 20 plantillas editoriales y el estudio libre del Editor Visual.',
            whatCanYouDo: [
              'Usar "Editar por pasos" o "Secciones" para llenar tus datos de forma estructurada, y "Ver todo" para revisarlos de corrido.',
              'Entrar a "Plantillas y plan" para elegir entre las 20 plantillas interactivas o abrir "Editor visual ↗" para diseñar capa por capa estilo Canva.'
            ]
          },
          {
            selectors: ['[data-tour="inv-editor-workspace"]'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'ÁREA DE CONTENIDO',
            title: 'Configuración detallada de tu invitación',
            howItWorks: 'Muestra los controles de la pestaña activa: textos principales, colores, pantalla de acceso NIP, ubicaciones GPS, itinerario, vestimenta, regalos, galería, música y RSVP.',
            whatCanYouDo: [
              'Activar o desactivar cada sección con un interruptor y personalizar sus textos, horarios, enlaces e imágenes.'
            ]
          }
        ];

      case 'invitation-sections':
        return [
          {
            selectors: ['[data-tour="inv-sections-metrics"]'],
            side: 'bottom',
            align: 'start',
            badge: 'ARQUITECTURA DE INVITACIÓN',
            title: 'Resumen de secciones activas y ocultas',
            howItWorks: 'Muestra cuántas secciones componen hoy tu invitación pública y cuántas permanecen desactivadas.',
            whatCanYouDo: [
              'Identificar de un vistazo las secciones obligatorias (Contenido y Estilo) y los módulos opcionales habilitados.'
            ]
          },
          {
            selectors: ['[data-tour="inv-sections-active"]'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'VISIBLES AL INVITADO',
            title: '1. Secciones activas en la invitación',
            howItWorks: 'Lista todos los bloques que tus invitados verán al abrir su enlace (Historia, Ubicaciones, Itinerario, Vestimenta, Regalos, Álbum, DJ, RSVP, etc.).',
            whatCanYouDo: [
              'Apagar con un clic cualquier sección que no necesites mostrar todavía sin borrar la información capturada.'
            ]
          },
          {
            selectors: ['[data-tour="inv-sections-inactive"]'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'MÓDULOS DISPONIBLES',
            title: '2. Secciones ocultas listas para activar',
            howItWorks: 'Agrupa las funcionalidades adicionales que puedes encender en cualquier momento según el estilo de tu celebración.',
            whatCanYouDo: [
              'Activar Sobre Digital, Hospedaje, Álbum Colaborativo, Peticiones al DJ o Libro de Dedicatorias y volver al editor para configurar sus detalles.'
            ]
          }
        ];

      case 'pass-editor':
        return [
          {
            selectors: ['[data-tour="vpe-topbar"]'],
            side: 'bottom',
            align: 'center',
            badge: 'EDITOR DE PASES VIP',
            title: 'Diseñador dedicado de boletos y gafetes QR',
            howItWorks: 'Te permite diseñar pases digitales e imprimibles personalizados para cada invitado con actualización automática de datos.',
            whatCanYouDo: [
              'Descargar el pase en PNG de alta calidad para WhatsApp o en PDF listo para impresión física.',
              'Abrir "Vista previa", guardar borrador y pulsar "Publicar Pase" para activarlo para todos tus invitados.'
            ]
          },
          {
            selectors: ['[data-tour="vpe-subbar"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'FORMATO Y SIMULACIÓN',
            title: 'Tamaño del pase y simulador de invitado real',
            howItWorks: 'Configura las medidas exactas del boleto y previsualiza cómo se reemplazan las variables dinámicas con invitados reales de tu lista.',
            whatCanYouDo: [
              'Elegir formatos predefinidos (Wallet vertical, Ticket horizontal, Gafete, Cuadrado o medidas personalizadas en píxeles).',
              'Usar "Simular con:" para comprobar cómo se ven nombres largos, mesas asignadas y acompañantes.'
            ]
          },
          {
            selectors: ['[data-tour="vpe-sheets-bar"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'FRENTE Y REVERSO',
            title: 'Hojas o caras de tu Pase VIP',
            howItWorks: 'Un pase puede tener una sola cara o múltiples hojas (por ejemplo: Frente con QR y Reverso con croquis o código de vestimenta).',
            whatCanYouDo: [
              'Agregar nuevas hojas, duplicarlas, renombrarlas o activar "Ver ambas" para diseñar frente y reverso en paralelo.'
            ]
          },
          {
            selectors: ['[data-tour="vpe-nav-rail"]'],
            optional: true,
            side: 'right',
            align: 'start',
            badge: 'HERRAMIENTAS DEL PASE',
            title: 'Campos inteligentes QR, textos, marcos y fondos',
            howItWorks: 'En la barra izquierda encuentras tanto elementos decorativos como tokens dinámicos conectados a cada invitado.',
            whatCanYouDo: [
              'Insertar en "Pase VIP" el Código QR escaneable, Nombre del invitado, Mesa/Asiento, Acompañantes y Folio Check-in.',
              'Personalizar tipografías de gala, formas, escudos, fotos con máscara, temas de lujo y orden de capas.'
            ]
          },
          {
            selectors: ['[data-tour="vpe-inspector"]'],
            optional: true,
            side: 'left',
            align: 'start',
            badge: 'AJUSTE FINO',
            title: 'Inspector de elemento y fondo de hoja',
            howItWorks: 'Al seleccionar cualquier capa sobre el boleto, aquí controlas su tipografía, alineación, color, bordes, opacidad o color de fondo de la tarjeta.',
            whatCanYouDo: [
              'Bloquear capas para no moverlas por accidente y alinear cada texto con acabado de imprenta.'
            ]
          }
        ];

      case 'seating-chart':
        return [
          {
            selectors: ['[data-tour="croquis-hero"]'],
            side: 'bottom',
            align: 'start',
            badge: 'CROQUIS INTERACTIVO 2D',
            title: 'Diseña el plano real de tu salón',
            howItWorks: 'En este estudio visual acomodas mesas, pista de baile, escenario, barra y zonas especiales a escala en metros.',
            whatCanYouDo: [
              'Pulsar "+ Nueva Mesa / Elemento" para crear mesas individuales o generar N mesas por lote.',
              'Usar "Auto-asignar" para sentar invitados automáticamente por grupo y "Exportar PDF" para entregar el plano al banquete o recepción.'
            ]
          },
          {
            selectors: ['[data-tour="croquis-canvas-topbar"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'PISOS Y NAVEGACIÓN',
            title: 'Niveles del recinto y controles de zoom',
            howItWorks: 'Permite dividir tu evento en múltiples áreas o pisos (ej. Jardín, Salón Principal, Terraza VIP) con conteo independiente de mesas.',
            whatCanYouDo: [
              'Crear niveles adicionales con "+ Agregar Nivel" y acercar, alejar o restablecer la vista del plano.'
            ]
          },
          {
            selectors: ['[data-tour="croquis-canvas"]'],
            optional: true,
            side: 'right',
            align: 'center',
            badge: 'LIENZO ARRASTRABLE',
            title: 'Acomoda mesas y edita sus propiedades',
            howItWorks: 'Cada mesa muestra en vivo sus sillas ocupadas vs. disponibles. Al hacer clic sobre una mesa se abre su tarjeta flotante de propiedades.',
            whatCanYouDo: [
              'Arrastrar cualquier mesa o elemento para ubicarlo exactamente en el salón.',
              'Cambiar forma (redonda, rectangular, cuadrada, ovalada, pista, DJ), capacidad de sillas y dimensiones en metros.'
            ]
          },
          {
            selectors: ['[data-tour="croquis-guests-panel"]'],
            optional: true,
            side: 'left',
            align: 'start',
            badge: 'DRAG & DROP DE INVITADOS',
            title: 'Asigna invitados arrastrándolos a su mesa',
            howItWorks: 'Lista todos los invitados que aún no tienen mesa asignada junto con su grupo y número de acompañantes.',
            whatCanYouDo: [
              'Buscar por nombre o filtrar solo Confirmados / por Grupo familiar.',
              'Arrastrar la tarjeta de un invitado y soltarla directamente encima de la mesa deseada en el plano.'
            ]
          }
        ];

      case 'plan':
        return [
          {
            selectors: ['[data-tour="plan-current-card"]'],
            side: 'bottom',
            align: 'start',
            badge: 'SUSCRIPCIÓN Y COBERTURA',
            title: 'Tu plan actual y límites activos',
            howItWorks: 'Detalla el nivel activo de tu cuenta (ej. Gratis, Evento Individual o Planner Pro), su vigencia y las capacidades desbloqueadas.',
            whatCanYouDo: [
              'Revisar tu límite de invitados, fotos en galería, plantillas premium, envíos por WhatsApp, Check-in QR, croquis y exportación CSV.'
            ]
          },
          {
            selectors: ['[data-tour="plan-history-card"]'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'FACTURACIÓN',
            title: 'Historial de pagos y transacciones',
            howItWorks: 'Registra cada pago procesado en tu cuenta con paquete adquirido, fecha exacta, importe y estado de confirmación.',
            whatCanYouDo: [
              'Consultar tus comprobantes históricos; recuerda que los pagos por evento individual también pueden gestionarse dentro de cada evento en Información → Plan.'
            ]
          }
        ];

      case 'contact':
        return [
          {
            selectors: ['[data-tour="contact-channels"]'],
            side: 'right',
            align: 'start',
            badge: 'ATENCIÓN DIRECTA',
            title: 'Canales oficiales y horarios de soporte',
            howItWorks: 'Te muestra nuestros tiempos de respuesta garantizados, correo directo, teléfono de atención y redes oficiales.',
            whatCanYouDo: [
              'Contactarnos directamente por correo o llamada si requieres asistencia urgente el día previo o durante tu evento.'
            ]
          },
          {
            selectors: ['[data-tour="contact-form"]'],
            optional: true,
            side: 'left',
            align: 'start',
            badge: 'MENSAJE RÁPIDO',
            title: 'Envíanos tu consulta desde la plataforma',
            howItWorks: 'Envía tu solicitud directamente al equipo de soporte técnico y diseño de Velisse sin salir de tu sesión.',
            whatCanYouDo: [
              'Describir cualquier duda sobre plantillas, pagos, dominios externos o envíos masivos y recibir respuesta en tu correo.'
            ]
          }
        ];

      case 'user-guide':
        return [
          {
            selectors: ['[data-tour="guide-hero"]'],
            side: 'bottom',
            align: 'start',
            badge: 'CENTRO DE APRENDIZAJE',
            title: 'Manual completo paso a paso',
            howItWorks: 'Complementa los recorridos interactivos con guías de lectura detalladas sobre cada flujo de trabajo de la suite.',
            whatCanYouDo: [
              'Consultar recomendaciones prácticas en cualquier momento o usar el botón "Tutorial" del menú lateral cuando quieras que te señalemos los botones reales en pantalla.'
            ]
          },
          {
            selectors: ['[data-tour="guide-nav"]'],
            optional: true,
            side: 'right',
            align: 'start',
            badge: 'TEMARIO POR MÓDULO',
            title: 'Navega por cada tema de la plataforma',
            howItWorks: 'Organiza la documentación por áreas: creación de eventos, diseño de invitación, invitados, mesas, confirmaciones, envíos y día del evento.',
            whatCanYouDo: [
              'Seleccionar cualquier tema de la columna izquierda para leer sus pasos numerados y consejos clave.'
            ]
          },
          {
            selectors: ['[data-tour="guide-content"]'],
            optional: true,
            side: 'left',
            align: 'start',
            badge: 'PASOS DETALLADOS',
            title: 'Lectura guiada y navegación secuencial',
            howItWorks: 'Presenta en orden claro qué hacer en cada etapa para que tu evento quede listo sin omitir ningún detalle.',
            whatCanYouDo: [
              'Avanzar con "Siguiente sección" al final de cada guía para recorrer todo el manual de principio a fin.'
            ]
          }
        ];

      case 'template-management':
        return [
          {
            selectors: ['[data-tour="tpl-admin-policy"]'],
            side: 'bottom',
            align: 'start',
            badge: 'ADMINISTRACIÓN GLOBAL',
            title: 'Política de publicación comunitaria',
            howItWorks: 'Controla si las nuevas plantillas creadas por usuarios se publican de inmediato en el catálogo o pasan primero por revisión manual.',
            whatCanYouDo: [
              'Activar o desactivar el interruptor "AUTO: ON / OFF" en tiempo real para todo el marketplace.'
            ]
          },
          {
            selectors: ['[data-tour="tpl-admin-sources"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: '3 ÁREAS DE GESTIÓN',
            title: 'Plantillas 3 en 1, Recompensas (5%) e Integración',
            howItWorks: 'Separa la moderación en tres bandejas especializadas.',
            whatCanYouDo: [
              'Revisar "Plantillas Comunitarias" del editor visual (Invitación + Pase VIP + Acceso).',
              'Auditar "Eventos & Pagos (5%)" para liquidar comisiones a creadores, y "Integración Externa" para diseños HTML/CSS.'
            ]
          },
          {
            selectors: ['[data-tour="tpl-admin-filters"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'MODERACIÓN ÁGIL',
            title: 'Filtros por estado, destacadas y buscador',
            howItWorks: 'Permite filtrar envíos Pendientes, Aprobados, Destacados (★ Top) o con ajustes solicitados.',
            whatCanYouDo: [
              'Previsualizar cada plantilla en vivo, aprobarla, marcarla como Destacada en el catálogo o solicitar correcciones con retroalimentación.'
            ]
          }
        ];
    }
  }

  private getRawStepsForSection(section: TutorialSectionKey): RawTourStep[] {
    switch (section) {
      case 'info':
        return [
          {
            selectors: ['[data-tour="event-header"]'],
            side: 'bottom',
            align: 'start',
            badge: 'SECCIÓN: INFORMACIÓN',
            title: '¿Cómo funciona el panel de Información?',
            howItWorks: 'Esta es la cabina central de tu evento. Desde aquí defines los datos oficiales que alimentan automáticamente tu invitación digital, los pases QR y los mensajes que recibirán tus invitados.',
            whatCanYouDo: [
              'Ver de un vistazo la fecha, estado del evento y abrir el buscador rápido (Ctrl+K) o la guía de avance.',
              'Moverte en cualquier momento entre las pestañas operativas del evento.'
            ]
          },
          {
            selectors: ['[data-tour="info-preparation"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'RUTA RECOMENDADA',
            title: 'Pasos de preparación del evento',
            howItWorks: 'Esta barra evalúa automáticamente qué partes ya completaste y cuál es el siguiente paso sugerido antes del gran día.',
            whatCanYouDo: [
              'Hacer clic en cualquiera de las tarjetas numeradas para saltar directo a crear/editar la invitación, cargar invitados, armar mesas o preparar envíos.'
            ]
          },
          {
            selectors: ['[data-tour="info-kpis"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'PULSO EN TIEMPO REAL',
            title: 'Indicadores clave del evento',
            howItWorks: 'Se actualizan solos conforme registras invitados, recibes respuestas RSVP y escaneas códigos QR el día del evento.',
            whatCanYouDo: [
              'Supervisar invitados totales, confirmados, pendientes, rechazados, acompañantes e ingresos registrados con Check-in QR.'
            ]
          },
          {
            selectors: ['[data-event-section="invitations"]', '[data-event-section="cover"]'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'DISEÑO Y PUBLICACIÓN',
            title: 'Tu Invitación Digital y Portada',
            howItWorks: 'Conecta este evento con su página de invitación interactiva (plantilla prediseñada o Editor Visual).',
            whatCanYouDo: [
              'Crear la invitación con el asistente, abrir el editor para personalizar secciones y colores, ver la vista previa o copiar el enlace público.',
              'Subir una imagen de portada representativa para identificar tu evento en el panel.'
            ]
          },
          {
            selectors: ['[data-event-section="details"]'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'DATOS OFICIALES',
            title: 'Datos del evento, lugar y programa',
            howItWorks: 'Toda modificación que guardes aquí se refleja en tu invitación y recordatorios sin tener que reescribirla en varios sitios.',
            whatCanYouDo: [
              'Editar título, tipo de celebración, fecha, hora, anfitriones y privacidad del evento.',
              'Definir el nombre del lugar, dirección con enlace a Google Maps y los horarios del programa/agenda.'
            ]
          },
          {
            selectors: ['[data-event-section="team"]', '[data-event-section="external"]', '[data-event-section="plans"]'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'EQUIPO, ACCESOS Y PLAN',
            title: 'Colaboradores, enlaces para staff y cobertura',
            howItWorks: 'Te permite delegar tareas el día del evento sin compartir tu contraseña personal.',
            whatCanYouDo: [
              'Invitar organizadores o colaboradores con permisos específicos (solo invitados, mesas, álbum o canciones).',
              'Generar enlaces temporales con QR para Recepción (escáner de boletos), DJ o Fotógrafo, y consultar los límites de tu plan.'
            ]
          }
        ];

      case 'guests':
        return [
          {
            selectors: ['[data-tour="guests-toolbar"]'],
            side: 'bottom',
            align: 'start',
            badge: 'SECCIÓN: INVITADOS',
            title: '¿Cómo funciona la Lista de Invitados?',
            howItWorks: 'Cada invitado que registras aquí obtiene automáticamente su propio código personal, cupo de acompañantes controlados y pase digital con código QR único.',
            whatCanYouDo: [
              'Pulsar "+ Nuevo Invitado" para dar de alta personas o familias individualmente.',
              'Importar cientos de invitados desde Excel/CSV con validación previa o descargar tu padrón completo.'
            ]
          },
          {
            selectors: ['[data-tour="guests-filters"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'BÚSQUEDA Y SEGMENTACIÓN',
            title: 'Filtra tu lista al instante',
            howItWorks: 'Combina búsqueda en vivo con filtros por estado de confirmación y etiquetas/grupos.',
            whatCanYouDo: [
              'Localizar a cualquier invitado por nombre, correo, teléfono o grupo (ej. Familia Novia, Amigos, Trabajo).',
              'Ver únicamente Confirmados, Pendientes o Rechazados para dar seguimiento puntual.'
            ]
          },
          {
            selectors: ['[data-tour="guests-view-controls"]'],
            optional: true,
            side: 'bottom',
            align: 'end',
            badge: 'MODO DE TRABAJO',
            title: 'Vista por Grupos o Tabla Plana',
            howItWorks: 'Adapta la visualización según prefieras revisar familias/bloques o trabajar sobre una tabla corrida.',
            whatCanYouDo: [
              'Agrupar por etiqueta familiar o ver la lista plana.',
              'Seleccionar múltiples invitados con las casillas para aplicar acciones en lote.'
            ]
          },
          {
            selectors: ['[data-tour="guests-list"]'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'CONTROL POR INVITADO',
            title: 'Ficha, invitación personalizada y Check-in',
            howItWorks: 'Cada fila concentra el estado del invitado, sus acompañantes permitidos, su mesa asignada y si ya ingresó al salón.',
            whatCanYouDo: [
              'Copiar su enlace personal de invitación o enviárselo directo por WhatsApp.',
              'Ver o descargar su Pase QR, asignarle mesa, editar sus datos o marcar su entrada (Check-in).'
            ]
          }
        ];

      case 'tables':
        return [
          {
            selectors: ['[data-tour="tables-header"]'],
            side: 'bottom',
            align: 'start',
            badge: 'SECCIÓN: MESAS',
            title: '¿Cómo funciona la organización de Mesas?',
            howItWorks: 'Te permite estructurar la capacidad del salón y distribuir a tus invitados (junto con sus acompañantes) evitando sobrecupos. Cuando asignas una mesa, aparece automáticamente en el Pase VIP del invitado.',
            whatCanYouDo: [
              'Abrir el "Croquis Interactivo" para acomodar mesas visualmente en un plano 2D.',
              'Usar "Auto-asignar" para que el sistema siente grupos completos automáticamente, o "+ Nueva Mesa" para crearlas por unidad o por lote.'
            ]
          },
          {
            selectors: ['[data-tour="tables-kpis"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'BALANCE DE LUGARES',
            title: 'Capacidad vs. ocupación real',
            howItWorks: 'Calcula en vivo cada silla ocupada sumando al invitado titular más sus acompañantes.',
            whatCanYouDo: [
              'Revisar cuántas mesas existen, cuántos lugares totales ofrece el salón, cuántos ya están ocupados y cuántos quedan libres.'
            ]
          },
          {
            selectors: ['[data-tour="tables-quick-assign"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'ASIGNACIÓN RÁPIDA',
            title: 'Sentar invitados en dos clics',
            howItWorks: 'Muestra los invitados pendientes de ubicar y las mesas que todavía cuentan con asientos disponibles.',
            whatCanYouDo: [
              'Elegir un invitado, seleccionar su mesa destino y pulsar "Asignar" sin salir de esta vista.'
            ]
          },
          {
            selectors: ['[data-tour="tables-grid"]'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'DETALLE POR MESA',
            title: 'Tarjetas de mesas y lista de comensales',
            howItWorks: 'Cada tarjeta muestra la barra de ocupación de esa mesa, su forma/capacidad y quiénes están sentados en ella.',
            whatCanYouDo: [
              'Editar el nombre o número de sillas de una mesa.',
              'Quitar a un invitado de esa mesa para reubicarlo o eliminar mesas vacías.'
            ]
          }
        ];

      case 'rsvps':
        return [
          {
            selectors: ['[data-tour="rsvps-header"]'],
            side: 'bottom',
            align: 'start',
            badge: 'SECCIÓN: RSVPs',
            title: '¿Cómo funcionan las Confirmaciones (RSVP)?',
            howItWorks: 'Concentra todas las respuestas enviadas por tus invitados desde el formulario de la invitación digital, incluyendo cuántos acompañantes llevarán, notas alimentarias y mensajes.',
            whatCanYouDo: [
              'Monitorear quién ya respondió y quién falta por confirmar.',
              'Descargar en cualquier momento el reporte completo en CSV/Excel para tu banquete o wedding planner.'
            ]
          },
          {
            selectors: ['[data-tour="rsvps-kpis"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'CONTEO DE ASISTENCIA',
            title: 'Resumen ejecutivo de respuestas',
            howItWorks: 'Desglosa las respuestas recibidas para que conozcas el aforo real confirmado.',
            whatCanYouDo: [
              'Ver el total de formularios recibidos, confirmados que sí asisten, ausencias notificadas y respuestas pendientes.'
            ]
          },
          {
            selectors: ['[data-tour="rsvps-filters"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'FILTROS DE REVISIÓN',
            title: 'Busca por invitado o filtra por respuesta',
            howItWorks: 'Filtra al instante la bandeja de confirmaciones según el estado o texto buscado.',
            whatCanYouDo: [
              'Alternar entre Todos, Confirmados, Pendientes o No asisten.',
              'Buscar por nombre, correo, alergias/restricciones alimentarias o comentarios.'
            ]
          },
          {
            selectors: ['[data-tour="rsvps-list"]'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'RESPUESTAS DETALLADAS',
            title: 'Detalle de cada confirmación recibida',
            howItWorks: 'Muestra la respuesta exacta registrada por cada invitado y la fecha en que contestó.',
            whatCanYouDo: [
              'Consultar acompañantes confirmados, restricciones alimentarias (menú infantil, vegetariano, alergias) y notas especiales.'
            ]
          }
        ];

      case 'album':
        return [
          {
            selectors: ['[data-tour="album-header"]'],
            side: 'bottom',
            align: 'start',
            badge: 'SECCIÓN: ÁLBUM COLABORATIVO',
            title: '¿Cómo funciona el Álbum de Fotos en Vivo?',
            howItWorks: 'Tus invitados y fotógrafos suben recuerdos desde la invitación o mediante un código QR en las mesas. Aquí moderas, etiquetas y organizas todas las imágenes del evento.',
            whatCanYouDo: [
              'Usar "⚡ Revisión Rápida" tipo swipe para aprobar o descartar fotos pendientes en segundos.',
              'Actualizar la galería en vivo durante la fiesta para proyectarla o publicarla en la invitación.'
            ]
          },
          {
            selectors: ['[data-event-section="album-access"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'ACCESOS EXTERNOS Y QR',
            title: 'Códigos QR para mesas, fotógrafo y pantallas',
            howItWorks: 'Genera enlaces directos sin contraseña para que cualquier invitado suba fotos escaneando un QR o para proyectar el álbum en vivo en el salón.',
            whatCanYouDo: [
              'Crear "+ Link Subir Fotos" para tarjetas de mesa o fotógrafos y "+ Link Ver Álbum" para pantallas.',
              'Ampliar el código QR para imprimirlo o copiar el enlace directo.'
            ]
          },
          {
            selectors: ['[data-tour="album-tags"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'COLECCIONES TEMÁTICAS',
            title: 'Álbumes por etiquetas y favoritas',
            howItWorks: 'Te permite clasificar las mejores tomas con reacciones rápidas (⭐ Me super encanta, ❤️ Me encanta) o etiquetas personalizadas (ej. Ceremonia, Vals, Fiesta).',
            whatCanYouDo: [
              'Filtrar por colección temática para encontrar al instante las fotos estelares del evento.'
            ]
          },
          {
            selectors: ['[data-event-section="album-filters"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'MODERACIÓN DE VISIBILIDAD',
            title: 'Filtra entre Pendientes, Aprobadas y Rechazadas',
            howItWorks: 'Controla qué fotografías son visibles públicamente en la galería compartida.',
            whatCanYouDo: [
              'Entrar a "Pendientes" para revisar las subidas recientes o consultar "Aprobadas" y "Rechazadas".'
            ]
          },
          {
            selectors: ['[data-tour="album-grid"]'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'TARJETAS DE FOTOGRAFÍA',
            title: 'Vista ampliada, reacciones y aprobación en 1 clic',
            howItWorks: 'Cada tarjeta muestra quién subió la foto, su estado actual y accesos rápidos de curaduría.',
            whatCanYouDo: [
              'Marcar favoritas (⭐ / ❤️), ampliar en alta resolución, agregar etiquetas personalizadas y aprobar o rechazar cada imagen.'
            ]
          }
        ];

      case 'communication':
        return [
          {
            selectors: ['[data-tour="comm-tabs"]'],
            side: 'bottom',
            align: 'start',
            badge: 'SECCIÓN: COMUNICACIÓN',
            title: '¿Cómo funcionan los Envíos e Historial?',
            howItWorks: 'Es tu centro de mensajería multicanal. Envía invitaciones personalizadas (con el nombre y enlace único de cada invitado), recordatorios de confirmación y pases QR.',
            whatCanYouDo: [
              'Elegir entre WhatsApp Automatizado, Correo Electrónico o consultar el Historial y Estadísticas de entrega.'
            ]
          },
          {
            selectors: ['[data-tour="comm-wa-connection"]', '[data-tour="comm-email-form"]', '[data-tour="comm-stats-kpis"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'CANAL ACTIVO',
            title: 'Conexión y redacción inteligente del mensaje',
            howItWorks: 'En WhatsApp puedes vincular tu propio número escaneando un QR para envíos directos; en Correo redactas asunto y mensaje con variables dinámicas.',
            whatCanYouDo: [
              'Insertar variables automáticas (como el nombre del invitado, fecha o su link personal de invitación).',
              'Elegir plantillas sugeridas de invitación inicial, recordatorio RSVP o agradecimiento.'
            ]
          },
          {
            selectors: ['[data-tour="comm-recipients"]', '[data-tour="comm-logs-table"]'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'DESTINATARIOS Y TRAZABILIDAD',
            title: 'Selección precisa de destinatarios y envíos',
            howItWorks: 'Antes de disparar cualquier envío masivo, eliges exactamente a qué segmento de invitados llegará y revisas la vista previa real.',
            whatCanYouDo: [
              'Filtrar destinatarios (ej. solo Pendientes que aún no han recibido mensaje o un grupo específico).',
              'Confirmar el envío seguro y auditar en Historial qué mensajes fueron enviados, abiertos o fallaron.'
            ]
          }
        ];

      case 'dj':
        return [
          {
            selectors: ['[data-tour="dj-header"]'],
            side: 'bottom',
            align: 'start',
            badge: 'SECCIÓN: DJ Y MÚSICA',
            title: '¿Cómo funciona la Cabina Musical y Peticiones?',
            howItWorks: 'Recibe las canciones que tus invitados sugieren desde la invitación digital y te permite armar, moderar y ordenar la playlist ideal para la fiesta.',
            whatCanYouDo: [
              'Pulsar "+ Agregar Canción" para sumar tus propias pistas imprescindibles.',
              'Compartir un acceso externo de cabina con tu DJ profesional para que vea la cola en vivo y marque las reproducidas.'
            ]
          },
          {
            selectors: ['[data-tour="dj-metrics"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'ESTADO DE LA CABINA',
            title: 'Métricas de la playlist en vivo',
            howItWorks: 'Resume al instante el avance musical antes y durante el evento.',
            whatCanYouDo: [
              'Ver cuántas canciones están Aprobadas listas para sonar, cuántas ya fueron Reproducidas, Pendientes por revisar y Rechazadas.'
            ]
          },
          {
            selectors: ['[data-tour="dj-youtube-search"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'BÚSQUEDA INTEGRADA',
            title: 'Buscador de canciones en YouTube',
            howItWorks: 'Te permite buscar por título, artista o pegar un enlace de YouTube para encontrar la pista exacta con portada y audio de referencia.',
            whatCanYouDo: [
              'Escuchar una vista previa ahí mismo antes de decidir.',
              'Agregar la canción directo a la playlist o pulsar "Modificar" para añadirle una nota o dedicatoria especial.'
            ]
          },
          {
            selectors: ['[data-tour="dj-filters"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'ORGANIZACIÓN RÁPIDA',
            title: 'Filtros por estado y buscador interno',
            howItWorks: 'Facilita que tú o tu DJ filtren en segundos la cola activa durante el evento.',
            whatCanYouDo: [
              'Cambiar entre Todas, Aprobadas, Reproducidas, Pendientes o Rechazadas.',
              'Escribir en el buscador para comprobar si alguien ya pidió cierta canción o artista.'
            ]
          },
          {
            selectors: ['[data-tour="dj-list"]'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'COLA MUSICAL Y REPRODUCTOR',
            title: 'Prioridad, orden y música de invitación',
            howItWorks: 'Cada tarjeta muestra quién pidió la canción, su dedicatoria y su turno en la cola automática (que intercala canciones prioritarias y normales).',
            whatCanYouDo: [
              'Cambiar el estado (Aprobar, Marcar Reproducida o Rechazar), ajustar su prioridad (Prioritaria / Normal) y subirla o bajarla de orden.',
              'Reproducirla en el reproductor flotante o pulsar "Usar en invitación" para convertir una pista aprobada en música oficial de tu invitación digital.'
            ]
          }
        ];

      case 'dedications':
        return [
          {
            selectors: ['[data-tour="dedications-header"]'],
            side: 'bottom',
            align: 'start',
            badge: 'SECCIÓN: DEDICATORIAS',
            title: '¿Cómo funciona el Libro de Dedicatorias?',
            howItWorks: 'Es el libro de firmas digital de tu evento. Aquí recibes las felicitaciones, anécdotas, buenos deseos y brindis que los invitados escriben desde tu invitación web.',
            whatCanYouDo: [
              'Revisar cada mensaje antes de que aparezca públicamente en el muro de la invitación (si activaste moderación previa).',
              'Conservar todos los mensajes de cariño de tus invitados en un solo recuerdo digital.'
            ]
          },
          {
            selectors: ['[data-tour="dedications-kpis"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'RESUMEN DEL LIBRO',
            title: 'Métricas de mensajes recibidos',
            howItWorks: 'Te indica de un vistazo si tienes nuevas dedicatorias esperando tu aprobación.',
            whatCanYouDo: [
              'Consultar el Total de mensajes, cuántos están Por Moderar, cuántos ya lucen Aprobados y cuántos están Ocultos o Rechazados.'
            ]
          },
          {
            selectors: ['[data-tour="dedications-status-pills"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'BANDEJA DE MODERACIÓN',
            title: 'Pestañas por estado de revisión',
            howItWorks: 'Clasifica los mensajes según su visibilidad pública actual.',
            whatCanYouDo: [
              'Entrar a "Por Moderar" para aprobar rápidamente los mensajes nuevos.',
              'Revisar "Aprobadas" para ver qué se está mostrando en vivo en tu invitación, o consultar "Ocultas / Rechazadas".'
            ]
          },
          {
            selectors: ['[data-tour="dedications-search"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'BÚSQUEDA Y CATEGORÍAS',
            title: 'Buscar por autor o tipo de mensaje',
            howItWorks: 'Filtra las dedicatorias por texto libre o por la categoría elegida por el invitado al escribirla.',
            whatCanYouDo: [
              'Buscar por nombre del remitente o palabras del mensaje.',
              'Filtrar entre Dedicatoria, Deseo, Recuerdo o Brindis.'
            ]
          },
          {
            selectors: ['[data-tour="dedications-list"]'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'ACCIONES EN 1 CLIC',
            title: 'Tarjetas de dedicatorias y visibilidad',
            howItWorks: 'Cada tarjeta presenta al autor, fecha, categoría, estado actual y el texto íntegro del mensaje.',
            whatCanYouDo: [
              'Pulsar "Aprobar" para publicarla inmediatamente en el muro de tu invitación.',
              'Pulsar "Ocultar" si prefieres guardarla en privado sin mostrarla en la web, o "Rechazar" para descartarla.'
            ]
          }
        ];

      case 'integration':
        return [
          {
            selectors: ['[data-tour="integration-header"]'],
            side: 'bottom',
            align: 'start',
            badge: 'SECCIÓN: INTEGRACIÓN Y API',
            title: '¿Cómo funciona el Hub de Integraciones Headless?',
            howItWorks: 'Conecta tu propio sitio web externo (WordPress, Webflow, React, HTML propio) con todos los módulos operativos de Velisse: RSVP, Pases QR, Mesas, Álbum y DJ.',
            whatCanYouDo: [
              'Generar tokens de integración o enlaces para staff.',
              'Abrir las demos en vivo para probar cómo lucen los widgets e integraciones conectados a tu evento.'
            ]
          },
          {
            selectors: ['[data-tour="integration-ai-assistant"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'PROMPT PARA IA',
            title: 'Asistente generador para ChatGPT, Claude o Copilot',
            howItWorks: 'Arma automáticamente un documento técnico con el slug real, endpoints REST y widgets de este evento (sin exponer tokens secretos).',
            whatCanYouDo: [
              'Elegir la tecnología de tu web y qué funciones deseas integrar.',
              'Copiar o descargar el prompt `.md` listo para dárselo a tu programador o asistente de IA, y guardar plantillas reutilizables.'
            ]
          },
          {
            selectors: ['[data-tour="integration-tokens"]'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'SEGURIDAD Y ACCESOS',
            title: 'Tokens de API y enlaces operativos',
            howItWorks: 'Administra credenciales con fecha de vencimiento y revocación inmediata para clientes API o personal del evento.',
            whatCanYouDo: [
              'Copiar el Token API o URL de acceso y revocar cualquier credencial en un clic cuando deje de necesitarse.'
            ]
          },
          {
            selectors: ['[data-tour="integration-portal-config"]'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'PORTAL Y WIDGETS',
            title: 'Configuración del Portal Externo, iFrames y API REST',
            howItWorks: 'Define la URL de tu dominio oficial, marca personalizada, portadas y módulos habilitados, además de darte códigos iFrame y consola REST interactiva más abajo.',
            whatCanYouDo: [
              'Personalizar la identidad del portal externo, copiar fragmentos HTML embebibles y probar peticiones reales contra tus endpoints.'
            ]
          }
        ];

      case 'logs':
        return [
          {
            selectors: ['[data-tour="logs-header"]', '[data-tour="logs-metrics"]'],
            side: 'bottom',
            align: 'start',
            badge: 'SECCIÓN: HISTORIAL DE CAMBIOS',
            title: '¿Cómo funciona la Bitácora de Actividad?',
            howItWorks: 'Registra automáticamente y en orden cronológico cada acción relevante ocurrida en tu evento, ya sea realizada por ti, tu equipo colaborador o tus propios invitados.',
            whatCanYouDo: [
              'Consultar el total de movimientos históricos, la actividad de hoy, respuestas RSVP entrantes y cambios en invitados.'
            ]
          },
          {
            selectors: ['[data-tour="logs-toolbar"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'AUDITORÍA Y FILTROS',
            title: 'Busca por persona, categoría o acción',
            howItWorks: 'Te permite rastrear en segundos quién hizo un cambio específico o revisar solo los eventos de cierta área.',
            whatCanYouDo: [
              'Escribir el nombre de un invitado, mesa o usuario en el buscador.',
              'Filtrar por categoría (RSVP, Invitados, Mesas, Álbum, Canciones, Configuración) y pulsar "Actualizar" en tiempo real.'
            ]
          },
          {
            selectors: ['[data-tour="logs-timeline"]'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'LÍNEA DE TIEMPO',
            title: 'Detalle exacto de cada movimiento',
            howItWorks: 'Cada registro indica qué ocurrió, quién lo ejecutó (Organizador, Staff o Invitado), la hora exacta y los metadatos técnicos del cambio.',
            whatCanYouDo: [
              'Hacer clic en cualquier fila con flecha desplegable para inspeccionar los valores detallados antes y después de la acción.'
            ]
          }
        ];
    }
  }
}
