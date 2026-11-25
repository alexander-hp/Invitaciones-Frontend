import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import type { Driver, DriveStep, Side, Alignment } from 'driver.js';

export type TutorialSectionKey =
  | 'info'
  | 'guests'
  | 'tables'
  | 'rsvps'
  | 'communication'
  | 'dj'
  | 'dedications';

export interface TutorialSectionMeta {
  key: TutorialSectionKey;
  label: string;
  shortLabel: string;
}

interface RawTourStep {
  selectors?: string[];
  optional?: boolean;
  side?: Side;
  align?: Alignment;
  badge: string;
  title: string;
  howItWorks: string;
  whatCanYouDo?: string[];
}

export interface RunSectionTourOptions {
  availableSections?: TutorialSectionKey[];
  onSelectSection?: (section: TutorialSectionKey) => void;
}

@Injectable({
  providedIn: 'root'
})
export class EventTutorialService {
  readonly sections: TutorialSectionMeta[] = [
    { key: 'info', label: 'Información', shortLabel: 'Info' },
    { key: 'guests', label: 'Invitados', shortLabel: 'Invitados' },
    { key: 'tables', label: 'Mesas', shortLabel: 'Mesas' },
    { key: 'rsvps', label: 'RSVPs', shortLabel: 'RSVPs' },
    { key: 'communication', label: 'Comunicación', shortLabel: 'Comunicación' },
    { key: 'dj', label: 'DJ', shortLabel: 'DJ' },
    { key: 'dedications', label: 'Dedicatorias', shortLabel: 'Dedicatorias' }
  ];

  private readonly tutorialRequestSubject = new Subject<TutorialSectionKey | undefined>();
  readonly tutorialRequest$ = this.tutorialRequestSubject.asObservable();

  private readonly runningSubject = new BehaviorSubject<boolean>(false);
  readonly running$ = this.runningSubject.asObservable();

  activeEventId: string | null = null;
  activeTab: string | null = null;
  allowedSections: TutorialSectionKey[] = this.sections.map(s => s.key);

  private activeDriver: Driver | null = null;

  constructor(
    private router: Router,
    private ngZone: NgZone
  ) {}

  get isRunning(): boolean {
    return this.runningSubject.value;
  }

  isTutorialSection(tab: string | null | undefined): tab is TutorialSectionKey {
    return !!tab && this.sections.some(s => s.key === tab);
  }

  getSectionLabel(tab: string | null | undefined): string {
    const found = this.sections.find(s => s.key === tab);
    return found ? found.label : 'Información';
  }

  setEventContext(eventId: string, activeTab: string, allowedSections: TutorialSectionKey[]): void {
    this.activeEventId = eventId;
    this.activeTab = activeTab;
    this.allowedSections = allowedSections.length ? allowedSections : ['info'];
  }

  clearEventContext(eventId?: string): void {
    if (!eventId || this.activeEventId === eventId) {
      this.activeEventId = null;
      this.activeTab = null;
      this.allowedSections = this.sections.map(s => s.key);
    }
  }

  triggerFromSidebar(section?: TutorialSectionKey): void {
    if (this.activeEventId) {
      this.tutorialRequestSubject.next(section);
      return;
    }

    const url = this.router.url || '';
    const match = url.match(/\/new\/events\/([a-f0-9]{24})/i);
    if (match && match[1]) {
      this.router.navigate(['/new/events', match[1]], {
        queryParams: { tab: section || 'info', tutorial: '1' }
      });
      return;
    }

    this.runOutsideEventTour();
  }

  stopTour(): void {
    if (this.activeDriver) {
      try {
        this.activeDriver.destroy();
      } catch {
        // Ignore cleanup errors if DOM was already detached
      }
      this.activeDriver = null;
    }
    this.runningSubject.next(false);
  }

  async runOutsideEventTour(): Promise<void> {
    this.stopTour();
    const { driver } = await import('driver.js');

    const firstEventCard = this.findVisibleElement(['.nw-event-card', '[data-tour="sidebar-events-link"]']);
    const isOnEventsPage = (this.router.url || '').startsWith('/new/events');

    const step: DriveStep = {
      ...(firstEventCard ? { element: firstEventCard } : {}),
      popover: {
        title: 'Tutorial Interactivo del Evento',
        description: this.buildDescriptionHtml({
          badge: 'GUÍA PASO A PASO',
          howItWorks: isOnEventsPage
            ? 'Abre cualquiera de tus eventos (o crea uno nuevo) para iniciar el recorrido interactivo sobre cada herramienta del panel.'
            : 'Los tutoriales interactivos funcionan directamente dentro del panel de tu evento para mostrarte cada botón y tarjeta en vivo.',
          whatCanYouDo: [
            'Recorrer las 7 secciones: Información, Invitados, Mesas, RSVPs, Comunicación, DJ y Dedicatorias.',
            'Conocer cómo funciona cada módulo y qué acciones puedes realizar en cada página.'
          ]
        }),
        side: 'right',
        align: 'start',
        showButtons: isOnEventsPage ? ['close', 'next'] : ['close', 'next'],
        doneBtnText: isOnEventsPage ? 'Entendido' : 'Ir a Eventos →',
        onNextClick: () => {
          this.stopTour();
          if (!isOnEventsPage) {
            this.ngZone.run(() => {
              this.router.navigate(['/new/events']);
            });
          }
        }
      }
    };

    const instance = driver({
      animate: true,
      overlayOpacity: 0.62,
      stagePadding: 8,
      stageRadius: 14,
      allowClose: true,
      popoverClass: 'nw-driver-popover',
      closeBtnLabel: 'Cerrar tutorial',
      doneBtnText: isOnEventsPage ? 'Entendido' : 'Ir a Eventos →',
      showProgress: false,
      steps: [step],
      onDestroyed: () => {
        this.activeDriver = null;
        this.ngZone.run(() => this.runningSubject.next(false));
      }
    });

    this.activeDriver = instance;
    this.runningSubject.next(true);
    instance.drive();
  }

  async runSectionTour(section: TutorialSectionKey, options: RunSectionTourOptions = {}): Promise<void> {
    this.stopTour();
    const { driver } = await import('driver.js');

    const rawSteps = this.getSectionRawSteps(section);
    const resolvedSteps: DriveStep[] = [];

    for (const raw of rawSteps) {
      let matchedElement: HTMLElement | null = null;
      if (raw.selectors && raw.selectors.length > 0) {
        matchedElement = this.findVisibleElement(raw.selectors);
        if (!matchedElement && raw.optional) {
          continue;
        }
      }

      resolvedSteps.push({
        ...(matchedElement ? { element: matchedElement } : {}),
        scrollIntoView: { block: 'center', inline: 'nearest' },
        popover: {
          title: raw.title,
          description: this.buildDescriptionHtml(raw),
          side: raw.side || 'bottom',
          align: raw.align || 'start'
        }
      });
    }

    if (!resolvedSteps.length) {
      return;
    }

    const available = options.availableSections && options.availableSections.length
      ? options.availableSections
      : this.allowedSections;
    const otherSections = this.sections.filter(s => s.key !== section && available.includes(s.key));
    const currentIdxInAvailable = available.indexOf(section);
    const nextSectionKey = currentIdxInAvailable >= 0 && currentIdxInAvailable < available.length - 1
      ? available[currentIdxInAvailable + 1]
      : (otherSections[0]?.key || null);
    const nextSectionMeta = nextSectionKey ? this.sections.find(s => s.key === nextSectionKey) : undefined;

    const lastStepIndex = resolvedSteps.length - 1;
    if (options.onSelectSection && otherSections.length > 0) {
      const lastPopover = resolvedSteps[lastStepIndex].popover!;
      lastPopover.onPopoverRender = (popover) => {
        const navBox = document.createElement('div');
        navBox.className = 'nw-tour-jump-box';

        const label = document.createElement('span');
        label.className = 'nw-tour-jump-label';
        label.textContent = '¿Explorar el tutorial de otra sección?';
        navBox.appendChild(label);

        if (nextSectionMeta) {
          const nextBtn = document.createElement('button');
          nextBtn.type = 'button';
          nextBtn.className = 'nw-tour-next-section-btn';
          nextBtn.textContent = `Continuar con ${nextSectionMeta.label} →`;
          nextBtn.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            this.stopTour();
            this.ngZone.run(() => options.onSelectSection?.(nextSectionMeta.key));
          });
          navBox.appendChild(nextBtn);
        }

        const chipsWrap = document.createElement('div');
        chipsWrap.className = 'nw-tour-section-chips';
        for (const sec of otherSections) {
          if (nextSectionMeta && sec.key === nextSectionMeta.key) continue;
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'nw-tour-section-chip';
          chip.textContent = sec.shortLabel;
          chip.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            this.stopTour();
            this.ngZone.run(() => options.onSelectSection?.(sec.key));
          });
          chipsWrap.appendChild(chip);
        }

        if (chipsWrap.childElementCount > 0) {
          navBox.appendChild(chipsWrap);
        }

        popover.description.appendChild(navBox);
      };
    }

    const instance = driver({
      animate: true,
      smoothScroll: true,
      overlayOpacity: 0.62,
      stagePadding: 8,
      stageRadius: 14,
      popoverOffset: 12,
      allowClose: true,
      allowKeyboardControl: true,
      skipMissingElement: true,
      popoverClass: 'nw-driver-popover',
      showProgress: true,
      progressText: 'Paso {{current}} de {{total}}',
      nextBtnText: 'Siguiente →',
      prevBtnText: '← Anterior',
      doneBtnText: 'Finalizar',
      closeBtnLabel: 'Cerrar tutorial',
      steps: resolvedSteps,
      onDestroyed: () => {
        this.activeDriver = null;
        this.ngZone.run(() => this.runningSubject.next(false));
      }
    });

    this.activeDriver = instance;
    this.runningSubject.next(true);
    instance.drive();
  }

  private findVisibleElement(selectors: string[]): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    for (const selector of selectors) {
      const elements = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
      for (const el of elements) {
        if (this.isElementVisible(el)) {
          return el;
        }
      }
    }
    return null;
  }

  private isElementVisible(el: HTMLElement | null): boolean {
    if (!el || !el.isConnected) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    return el.getClientRects().length > 0;
  }

  private buildDescriptionHtml(step: Pick<RawTourStep, 'badge' | 'howItWorks' | 'whatCanYouDo'>): string {
    const itemsHtml = (step.whatCanYouDo || [])
      .map(item => `<li>${this.escapeHtml(item)}</li>`)
      .join('');

    return `
      <div class="nw-tour-body">
        <span class="nw-tour-badge">${this.escapeHtml(step.badge)}</span>
        <p class="nw-tour-lead">${this.escapeHtml(step.howItWorks)}</p>
        ${itemsHtml ? `<div class="nw-tour-subtitle">Qué puedes hacer aquí:</div><ul class="nw-tour-list">${itemsHtml}</ul>` : ''}
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

  private getSectionRawSteps(section: TutorialSectionKey): RawTourStep[] {
    switch (section) {
      case 'info':
        return [
          {
            selectors: ['[data-tour="event-tabs"]', '[data-tour="event-header"]'],
            side: 'bottom',
            align: 'start',
            badge: 'SECCIÓN: INFORMACIÓN',
            title: 'Centro general de tu evento',
            howItWorks: 'Esta es la portada administrativa de tu evento. Desde aquí controlas su configuración base, invitaciones digitales, colaboradores, accesos para proveedores y el estado general.',
            whatCanYouDo: [
              'Cambiar en cualquier momento entre Información, Invitados, Mesas, RSVPs, Comunicación, DJ y Dedicatorias.',
              'Usar el botón Guía o el buscador rápido (Ctrl + K) del encabezado para saltar directo a cualquier herramienta.'
            ]
          },
          {
            selectors: ['[data-tour="info-preparation"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'FLUJO RECOMENDADO',
            title: 'Ruta de preparación del evento',
            howItWorks: 'Funciona como un asistente inteligente que detecta qué ya configuraste y te resalta el siguiente paso sugerido para dejar listo tu evento.',
            whatCanYouDo: [
              'Revisar de un vistazo el estatus de tu invitación, lista de invitados, mesas y envíos.',
              'Hacer clic en cualquier paso para ir directamente a completarlo.'
            ]
          },
          {
            selectors: ['[data-tour="info-metrics"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'PULSO EN TIEMPO REAL',
            title: 'Resumen rápido de asistencia',
            howItWorks: 'Concentra los indicadores globales de tu evento conforme tus invitados responden o ingresan el día de la celebración.',
            whatCanYouDo: [
              'Monitorear Confirmados, Pendientes, Rechazados, Check-in en puerta y Lugares totales reservados.'
            ]
          },
          {
            selectors: ['[data-event-section="invitations"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'DISEÑO Y PUBLICACIÓN',
            title: 'Invitaciones digitales del evento',
            howItWorks: 'Aquí administras las páginas web de invitación vinculadas a tu evento (puedes crear hasta 3 versiones o diseños distintos).',
            whatCanYouDo: [
              'Crear una nueva invitación eligiendo qué secciones activarle (historia, mapas, itinerario, regalos, RSVP, álbum, etc.).',
              'Abrir el Editor para personalizar diseño y textos, ver la invitación pública, copiar el link para compartir o eliminar borradores.'
            ]
          },
          {
            selectors: ['[data-event-section="details"]'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'DATOS BASE',
            title: 'Detalles del evento',
            howItWorks: 'Almacena la información oficial (título, tipo de celebración, fecha, hora, anfitriones y sede) que alimenta automáticamente tus invitaciones, correos y pases QR.',
            whatCanYouDo: [
              'Pulsar "Editar detalles" para actualizar nombre, fecha, horario, salón o dirección.',
              'Cambiar el estado del evento entre Borrador, Publicado o Archivado.'
            ]
          },
          {
            selectors: ['[data-event-section="cover"]'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'IDENTIDAD VISUAL',
            title: 'Portada principal del evento',
            howItWorks: 'Define la imagen representativa del evento en tu panel, tarjetas de resumen y pases digitales estándar.',
            whatCanYouDo: [
              'Expandir la tarjeta para arrastrar o subir una fotografía desde tu dispositivo, o reemplazar la portada actual.'
            ]
          },
          {
            selectors: ['[data-event-section="team"]'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'COLABORACIÓN PERMANENTE',
            title: 'Equipo Interno y permisos',
            howItWorks: 'Permite sumar co-organizadores, wedding planners o familiares con cuenta propia para que te ayuden a administrar el evento de forma segura.',
            whatCanYouDo: [
              'Invitar miembros por correo electrónico asignándoles un rol.',
              'Activar o desactivar permisos específicos por persona (gestionar invitados, mesas, álbum, canciones, dedicatorias, etc.).'
            ]
          },
          {
            selectors: ['[data-event-section="external"]'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'OPERACIÓN DEL DÍA DEL EVENTO',
            title: 'Accesos Externos temporales',
            howItWorks: 'Genera enlaces seguros con fecha de expiración automática para proveedores y staff operativo, sin pedirles crear usuario ni contraseña.',
            whatCanYouDo: [
              'Crear links dedicados para Staff de Check-in (lector QR), DJ, Fotógrafo, Moderación de Álbum o Vista Cliente.',
              'Definir cuántos días durará activo el enlace, copiarlo para enviarlo por WhatsApp o revocarlo al instante.'
            ]
          },
          {
            selectors: ['[data-event-section="plans"]'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'SUSCRIPCIÓN Y COBERTURA',
            title: 'Planes y Pagos',
            howItWorks: 'Muestra la vigencia y cobertura actual de tu evento o cuenta profesional.',
            whatCanYouDo: [
              'Verificar si tu evento cuenta con plan activo y su fecha de vencimiento.',
              'Activar el pase de Evento Individual por 12 meses o una suscripción Planner Pro ilimitada.'
            ]
          }
        ];

      case 'guests':
        return [
          {
            selectors: ['[data-tour="guests-header"]'],
            side: 'bottom',
            align: 'start',
            badge: 'SECCIÓN: INVITADOS',
            title: '¿Cómo funciona la Lista de Invitados?',
            howItWorks: 'Es el padrón maestro de tu evento. Cada invitado o familia registrada aquí recibe su propio número de pases permitidos, NIP de seguridad y enlace personalizado para confirmar asistencia.',
            whatCanYouDo: [
              'Dar de alta personas o familias individualmente o cargar listas completas desde Excel.',
              'Controlar cuántos acompañantes tiene permitidos cada invitado, su grupo, contacto y estatus.'
            ]
          },
          {
            selectors: ['[data-event-section="new-guest"]'],
            optional: true,
            side: 'bottom',
            align: 'end',
            badge: 'REGISTRO INDIVIDUAL',
            title: 'Agregar Nuevo Invitado',
            howItWorks: 'Abre el formulario rápido para capturar un invitado o familia de manera manual con todos sus detalles personalizados.',
            whatCanYouDo: [
              'Registrar nombre completo, teléfono WhatsApp (con lada), correo electrónico y notas.',
              'Asignar su grupo (ej. Familia Novia, Amigos, Trabajo), cantidad de acompañantes permitidos y mesa.'
            ]
          },
          {
            selectors: ['[data-event-section="guest-import"]'],
            optional: true,
            side: 'bottom',
            align: 'end',
            badge: 'CARGA Y DESCARGA MASIVA',
            title: 'Importar y Exportar en Excel o CSV',
            howItWorks: 'Te ahorra horas de captura permitiéndote trabajar tu lista en Excel con validaciones y subirla en segundos.',
            whatCanYouDo: [
              'Descargar la plantilla oficial en Excel (.xlsx) con menús desplegables o versión simple (.csv).',
              'Subir tu archivo completado para crear decenas o cientos de invitados de golpe.',
              'Exportar tu lista actualizada de invitados a Excel o CSV cuando lo necesites.'
            ]
          },
          {
            selectors: ['[data-tour="guests-filters"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'BÚSQUEDA RÁPIDA',
            title: 'Buscador y filtros por RSVP o Grupo',
            howItWorks: 'Filtra instantáneamente la tabla sin recargar la página para trabajar sobre segmentos concretos de tu lista.',
            whatCanYouDo: [
              'Buscar por nombre, correo, teléfono o nombre de grupo.',
              'Filtrar solo Confirmados, Pendientes o Rechazados, o ver únicamente a un grupo familiar específico.'
            ]
          },
          {
            selectors: ['[data-tour="guests-list"]'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'CONTROL POR INVITADO',
            title: 'Tabla de invitados, NIP y acciones',
            howItWorks: 'Muestra el resumen operativo de cada persona: grupo, mesa asignada, respuesta RSVP, total de pases, NIP de acceso y si ya realizó Check-in.',
            whatCanYouDo: [
              'Consultar el NIP individual (o NIP general del evento) con el que el invitado ingresa a la invitación.',
              'Editar los datos de cualquier invitado, gestionar su pase o eliminarlo desde la columna de Acciones.'
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
            title: '¿Cómo funciona la Organización de Mesas?',
            howItWorks: 'Aquí distribuyes a tus invitados por mesas respetando el número total de pases de cada registro (titular + acompañantes) y vigilando la capacidad máxima de cada mesa.',
            whatCanYouDo: [
              'Crear todas las mesas de tu salón, sentar invitados de forma manual o automática y validar lugares libres.',
              'Sincronizar la mesa asignada para que aparezca automáticamente en el Pase VIP y mensajes del invitado.'
            ]
          },
          {
            selectors: ['[data-event-section="table-create"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'PASO 1 · CREAR ESPACIOS',
            title: 'Nueva Mesa o Elemento',
            howItWorks: 'Te permite dar de alta las mesas del banquete indicando su nombre o número, piso/zona y cuántos asientos tiene.',
            whatCanYouDo: [
              'Crear mesas individuales o elementos de referencia para estructurar tu salón.',
              'Definir la capacidad exacta (ej. 8, 10 o 12 personas) para recibir alertas si intentas excederla.'
            ]
          },
          {
            selectors: ['[data-event-section="table-assign"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'PASO 2 · ACOMODO EN LOTE',
            title: 'Asignar Invitados a Mesa',
            howItWorks: 'Abre un selector múltiple donde eliges la mesa destino y marcas a varios invitados sin mesa para sentarlos juntos en una sola acción.',
            whatCanYouDo: [
              'Filtrar invitados disponibles por estado RSVP (ej. solo Confirmados) o por Grupo/Familia.',
              'Ver en vivo cuántos asientos libres quedan en la mesa y detectar sobrecupo antes de guardar.'
            ]
          },
          {
            selectors: ['[data-event-section="table-auto-assign"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'ACOMODO INTELIGENTE',
            title: 'Auto-asignar mesas automáticamente',
            howItWorks: 'El asistente distribuye por ti a los invitados pendientes de asiento procurando mantener juntos a los miembros del mismo grupo o familia.',
            whatCanYouDo: [
              'Generar un primer acomodo rápido en segundos y después afinar detalles manualmente.'
            ]
          },
          {
            selectors: ['[data-event-section="table-map"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'PLANO VISUAL 2D',
            title: 'Abrir Croquis Interactivo',
            howItWorks: 'Te lleva al diseñador gráfico del salón donde puedes acomodar visualmente la posición física de las mesas, pista de baile, escenario y pisos.',
            whatCanYouDo: [
              'Arrastrar mesas en el mapa, organizar múltiples plantas/pisos y exportar el plano para recepción o catering.'
            ]
          },
          {
            selectors: ['[data-tour="tables-list"]'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'OCUPACIÓN EN VIVO',
            title: 'Tarjetas de mesas y control de lugares',
            howItWorks: 'Cada tarjeta representa una mesa con código de color según su ocupación: verde con lugares libres, ámbar cuando está llena y rojo si tiene sobrecupo.',
            whatCanYouDo: [
              'Ver exactamente quiénes están sentados en cada mesa y cuántos lugares ocupa cada familia.',
              'Sumar invitados directo en esa mesa, quitar a alguien con un clic (✕) o limpiar asignaciones.'
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
            title: '¿Cómo funciona el panel de Respuestas RSVP?',
            howItWorks: 'Cada vez que un invitado confirma o declina su asistencia desde la invitación digital, su respuesta se registra automáticamente aquí junto con sus acompañantes, opciones de menú y comentarios.',
            whatCanYouDo: [
              'Dar seguimiento puntual a las confirmaciones sin tener que anotar mensajes manualmente.',
              'Conocer el conteo exacto de platillos y lugares requeridos para tu banquete.'
            ]
          },
          {
            selectors: ['[data-tour="rsvps-kpis"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'MÉTRICAS DE ASISTENCIA',
            title: 'Indicadores de confirmados y personas reales',
            howItWorks: 'Calcula al instante tanto el número de formularios respondidos como la suma total de personas (titulares más acompañantes confirmados).',
            whatCanYouDo: [
              'Ver Total de respuestas, Confirmados (y cuántas personas asistirán en total), Rechazados y Pendientes por responder.'
            ]
          },
          {
            selectors: ['[data-event-section="rsvp-filters"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'SEGMENTACIÓN',
            title: 'Buscador y filtros de respuestas',
            howItWorks: 'Te permite cruzar criterios para revisar casos específicos dentro de todas las confirmaciones recibidas.',
            whatCanYouDo: [
              'Filtrar por estado (Confirmados, Rechazados, Pendientes) o distinguir quién asiste Con Acompañantes vs Solo.',
              'Buscar por nombre del invitado, teléfono, correo o palabras dentro de su mensaje.'
            ]
          },
          {
            selectors: ['[data-event-section="rsvp-export"]'],
            optional: true,
            side: 'bottom',
            align: 'end',
            badge: 'REPORTE DESCARGABLE',
            title: 'Exportar respuestas a CSV',
            howItWorks: 'Genera un archivo compatible con Excel con todas las respuestas recibidas hasta el momento.',
            whatCanYouDo: [
              'Descargar el listado oficial de confirmados, acompañantes y respuestas de menú/alergias para compartirlo con tu banquetera o coordinador.'
            ]
          },
          {
            selectors: ['[data-tour="rsvps-list"]'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'DETALLE DE RESPUESTAS',
            title: 'Tabla detallada de confirmaciones',
            howItWorks: 'Desglosa toda la información enviada por cada invitado en su formulario de confirmación.',
            whatCanYouDo: [
              'Revisar los nombres de sus acompañantes confirmados y la fecha exacta en que respondió.',
              'Consultar sus elecciones de menú, restricciones alimenticias o preguntas personalizadas y leer el mensaje que te dejó.'
            ]
          }
        ];

      case 'communication':
        return [
          {
            selectors: ['[data-tour="comms-header"]'],
            side: 'bottom',
            align: 'start',
            badge: 'SECCIÓN: COMUNICACIÓN',
            title: '¿Cómo funciona Comunicación y Pases VIP?',
            howItWorks: 'Es tu centro de envío multicanal (WhatsApp y Correo Electrónico) y generación de acreditaciones QR. Cada mensaje inserta automáticamente el nombre del invitado y su enlace único.',
            whatCanYouDo: [
              'Verificar arriba a la derecha si el canal de WhatsApp está conectado y listo.',
              'Enviar invitaciones, recordatorios, pases VIP con QR y dar seguimiento a quién ya abrió o leyó tu mensaje.'
            ]
          },
          {
            selectors: ['[data-tour="comms-jumps"]'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'ACCESOS RÁPIDOS',
            title: 'Barra de salto y Diseñador de Pase VIP',
            howItWorks: 'Te lleva con un clic a cada bloque de trabajo de esta página sin tener que desplazarte manualmente.',
            whatCanYouDo: [
              'Saltar directo a 1. Mensaje, 2. Destinatarios y envío, Pases especiales o Resultados.',
              'Abrir el botón "Diseñar Pase VIP" para personalizar gráficamente las entradas de tus invitados.'
            ]
          },
          {
            selectors: ['#comms-config-card'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'PASO 1 · PREPARAR MENSAJE',
            title: 'Plantilla, edición y vista previa interactiva',
            howItWorks: 'Eliges el motivo del mensaje (invitación, recordatorio de confirmación, información del evento, etc.) y revisas exactamente cómo lo recibirá cualquier invitado.',
            whatCanYouDo: [
              'Alternar entre "Ver mensaje", "Editar mensaje" (insertando variables dinámicas como NIP, mesa o pases) y "Preview interactivo".',
              'Simular la vista real de Correo Electrónico y de burbuja de WhatsApp eligiendo a cualquier invitado de ejemplo.'
            ]
          },
          {
            selectors: ['#comms-passes-banner'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'ACREDITACIONES DIGITALES',
            title: 'Editor Visual y tipo de Pase activo',
            howItWorks: 'Define qué diseño de tarjeta PNG con código QR se generará al descargar o adjuntar pases a tus invitados.',
            whatCanYouDo: [
              'Elegir entre el Pase Genérico (estándar con portada y QR) o el Pase Personalizado creado en el Editor Visual (frente/reverso, boleto, historia 9:16 o gafete).'
            ]
          },
          {
            selectors: ['#comms-passes'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'DESCARGA Y GRUPOS VIP',
            title: 'Descarga masiva (.ZIP) y Pases Especiales',
            howItWorks: 'Agrupa herramientas avanzadas para entregar pases en imagen PNG listos para imprimir o compartir a grupos selectos.',
            whatCanYouDo: [
              'Descargar en un solo archivo .ZIP todos los pases individuales de tus invitados.',
              'Activar "Imagen Adjunta para Especiales" y seleccionar por rol/grupo (ej. Familia, Padrinos, VIP) para enviarles su pase gráfico.'
            ]
          },
          {
            selectors: ['#comms-recipients-card'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'PASO 2 · SELECCIÓN Y ENVÍO',
            title: 'Destinatarios, excepciones y envío masivo',
            howItWorks: 'Muestra los invitados que recibirán el lote actual. Puedes filtrar la lista o desmarcar la casilla "Enviar" de cualquier persona para excluirla como excepción.',
            whatCanYouDo: [
              'Filtrar por estado RSVP, seguimiento (Por enviar, Fallidos, Leídos) o Grupo familiar.',
              'Lanzar "Enviar Email Masivo" o "Enviar WhatsApp Masivo" a los destinatarios activos.',
              'Usar las acciones individuales de cada fila para descargar su pase, enviarle correo, enviar auto o abrir WhatsApp directo.'
            ]
          },
          {
            selectors: ['[data-tour="comms-attach-pass"]'],
            optional: true,
            side: 'top',
            align: 'start',
            badge: 'PREFERENCIA DE ADJUNTOS',
            title: 'Adjuntar Pase VIP en mensajes generales',
            howItWorks: 'Controla si en los envíos generales por correo y WhatsApp se incluye automáticamente la imagen PNG del pase además del enlace.',
            whatCanYouDo: [
              'Encender o apagar el interruptor según prefieras enviar solo el enlace rápido o adjuntar también la tarjeta del pase.'
            ]
          },
          {
            selectors: ['#comms-results'],
            optional: true,
            side: 'bottom',
            align: 'start',
            badge: 'TRAZABILIDAD',
            title: 'Resultados y métricas de entrega',
            howItWorks: 'Despliega este panel cuando quieras auditar el rendimiento completo de tus campañas de invitación y recordatorios.',
            whatCanYouDo: [
              'Consultar cuántos correos y WhatsApps fueron enviados, entregados, leídos, abiertos o si alguno falló para reintentarlo.'
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
            title: '¿Cómo funciona el Panel de Solicitudes al DJ?',
            howItWorks: 'Aquí llegan las canciones que tus invitados sugieren desde la invitación pública, y también puedes armar tu propia playlist para el DJ o cabina de sonido.',
            whatCanYouDo: [
              'Moderar qué canciones sí se tocan en la fiesta y descartar las que no vayan con tu evento.',
              'Abrir el "Formulario Manual" para registrar canciones directamente como organizador.'
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
    }
  }
}
