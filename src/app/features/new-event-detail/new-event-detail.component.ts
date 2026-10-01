import { Component, ElementRef, HostListener, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import {
  EventModel, DashboardMetrics, GuestModel, EventTableModel, InvitationModel, EventPermission
} from '../../core/models';

type Tab = 'info' | 'guests' | 'tables' | 'rsvps' | 'album' | 'communication' | 'dedications' | 'dj' | 'integration' | 'logs' | 'guide';

interface WizardSectionDef {
  key: string;
  icon: string;
  label: string;
  description: string;
}

interface PreparationStep {
  key: string;
  label: string;
  status: string;
  action: 'create_invitation' | 'edit_invitation' | 'tab';
  tab?: Tab;
}

interface EventQuickLink {
  key: string;
  label: string;
  description: string;
  group: string;
  keywords: string;
  tab: Tab;
  section?: string;
}

interface EventGuideStep {
  key: string;
  title: string;
  description: string;
  instruction: string;
  status: string;
  done: boolean;
  optional?: boolean;
  tab?: Tab;
  section?: string;
  action?: 'create_invitation' | 'edit_invitation';
}

@Component({
  selector: 'app-new-event-detail',
  templateUrl: './new-event-detail.component.html'
})
export class NewEventDetailComponent implements OnInit {
  sidebarOpen = false;
  activeTab: Tab = 'info';
  selectedSection = '';
  quickSearch = '';
  showQuickSearch = false;
  showJourneyGuide = false;
  guideIndex = 0;
  @ViewChild('quickSearchInput') quickSearchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('quickSearchButton') quickSearchButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('journeyGuideButton') journeyGuideButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('journeyGuideClose') journeyGuideClose?: ElementRef<HTMLButtonElement>;
  @ViewChild('guideStepNav') guideStepNav?: ElementRef<HTMLElement>;
  @ViewChildren('guideStepButton') guideStepButtons?: QueryList<ElementRef<HTMLButtonElement>>;
  event?: EventModel;
  eventId = '';
  eventMetrics: Partial<DashboardMetrics> = {};

  loading = true;
  saving = false;
  error = '';

  guests: GuestModel[] = [];
  tables: EventTableModel[] = [];
  invitation?: InvitationModel;
  eventInvitations: InvitationModel[] = [];
  invitationsLoaded = false;
  songRequestsCount = 0;
  dedicationsCount = 0;
  rsvpsCount = 0;
  pendingAlbumAssets = 0;

  showCreateWizardModal = false;
  wizardSections: Record<string, boolean> = {
    guestAlbum: false,
    gallery: true,
    songRequests: false,
    dedications: false,
    rsvp: true,
    story: true,
    locations: true,
    itinerary: true,
    dressCode: true,
    giftRegistry: true,
    digitalEnvelope: false,
    lodging: false,
    backgroundMusic: true
  };

  wizardSectionDefinitions: WizardSectionDef[] = [
    { key: 'guestAlbum', icon: '', label: 'Álbum Interactivo de Invitados', description: 'Permite a los invitados subir sus fotos en tiempo real durante el evento.' },
    { key: 'gallery', icon: '', label: 'Galería Fotográfica Oficial', description: 'Muestra la galería con fotos del evento o sesión de los novios/festejados.' },
    { key: 'songRequests', icon: '', label: 'Música / Pedir Canciones (DJ)', description: 'Módulo interactivo para que los invitados sugieran canciones al DJ.' },
    { key: 'dedications', icon: '', label: 'Dedicatorias y Libro de Firmas', description: 'Muro de mensajes, felicitaciones y buenos deseos para los festejados.' },
    { key: 'rsvp', icon: '', label: 'Respuesta a tu Evento / Confirmación', description: 'Formulario de confirmación de asistencia, pases y acompañantes.' },
    { key: 'story', icon: '', label: 'Nuestra Historia', description: 'Reseña o historia de la pareja / festejado(a).' },
    { key: 'locations', icon: '', label: 'Mapas y Ubicaciones', description: 'Direcciones de misa/recepción con enlaces directos a Google Maps o Waze.' },
    { key: 'itinerary', icon: '', label: 'Itinerario / Cronograma', description: 'Agenda con horarios y actividades del evento.' },
    { key: 'dressCode', icon: '', label: 'Código de Vestimenta', description: 'Indicaciones de etiqueta y vestuario sugerido para los asistentes.' },
    { key: 'giftRegistry', icon: '', label: 'Mesa de Regalos', description: 'Catálogo y enlaces externos a tiendas (Amazon, Liverpool, etc.).' },
    { key: 'digitalEnvelope', icon: '', label: 'Sobre Digital / Transferencias', description: 'Datos bancarios, CLABE y código QR para obsequios en efectivo.' },
    { key: 'lodging', icon: '', label: 'Hospedaje y Hoteles', description: 'Recomendaciones de alojamiento y hoteles cercanos al evento.' },
    { key: 'backgroundMusic', icon: '', label: 'Música de Fondo', description: 'Audio principal que suena al navegar por la invitación.' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.eventId = id;
      this.restoreActiveTab();
      this.loadEvent();
    }

    this.route.queryParamMap.subscribe(params => {
      const tabParam = params.get('tab') as Tab;
      if (tabParam && this.isValidTab(tabParam) && tabParam !== this.activeTab) {
        this.activeTab = tabParam;
        if (this.eventId) {
          localStorage.setItem(`newEventDetail_tab_${this.eventId}`, tabParam);
        }
      }
      const section = params.get('section') || '';
      this.selectedSection = this.isSectionForTab(this.activeTab, section) ? section : '';
      if (this.selectedSection) this.scrollToSelectedSection(this.selectedSection);
    });
  }

  private isValidTab(tab: string): tab is Tab {
    return ['info', 'guests', 'tables', 'rsvps', 'album', 'communication', 'dedications', 'dj', 'integration', 'logs', 'guide'].includes(tab);
  }

  private isSectionForTab(tab: Tab, section: string): boolean {
    const sections: Partial<Record<Tab, string[]>> = {
      info: ['invitations', 'details', 'cover', 'team', 'external', 'plans'],
      guests: ['new-guest', 'guest-import'],
      tables: ['table-create', 'table-assign', 'table-auto-assign', 'table-map'],
      rsvps: ['rsvp-filters', 'rsvp-export'],
      album: ['album-review', 'album-access', 'album-filters'],
      communication: ['whatsapp-send', 'email-send']
    };
    return !!section && (sections[tab] || []).includes(section);
  }

  private restoreActiveTab(): void {
    const tabFromQuery = this.route.snapshot.queryParamMap.get('tab') as Tab;
    const tabFromStorage = this.eventId ? (localStorage.getItem(`newEventDetail_tab_${this.eventId}`) as Tab) : null;

    if (tabFromQuery && this.isValidTab(tabFromQuery)) {
      this.activeTab = tabFromQuery;
    } else if (tabFromStorage && this.isValidTab(tabFromStorage)) {
      this.activeTab = tabFromStorage;
    }
  }

  loadEvent(): void {
    this.loading = true;
    this.apiService.getEvent(this.eventId).subscribe({
      next: res => {
        this.event = { ...res.event, access: res.access || res.event.access };
        this.loading = false;
        if (!this.canOpenTab(this.activeTab)) this.selectTab('info');
        this.loadMetricsAndCounts();
        if (this.selectedSection) this.scrollToSelectedSection(this.selectedSection);
      },
      error: err => {
        this.error = err?.error?.message || 'Error al cargar el evento';
        this.loading = false;
      }
    });
  }

  loadMetricsAndCounts(): void {
    if (!this.eventId) return;

    if (this.can('view_metrics')) this.apiService.getEventDashboard(this.eventId).subscribe({
      next: res => {
        this.eventMetrics = res.metrics || {};
      },
      error: () => {}
    });

    if (this.can('manage_guests')) this.apiService.listGuests(this.eventId).subscribe({
      next: res => { this.guests = res.guests || []; },
      error: () => {}
    });

    if (this.can('manage_tables')) this.apiService.listTables(this.eventId).subscribe({
      next: res => { this.tables = res.tables || []; },
      error: () => {}
    });

    if (this.can('manage_songs')) this.apiService.listSongRequests(this.eventId).subscribe({
      next: res => { this.songRequestsCount = (res.songRequests || []).length; },
      error: () => {}
    });

    if (this.can('review_dedications')) this.apiService.listDedications(this.eventId).subscribe({
      next: res => { this.dedicationsCount = (res.dedications || []).length; },
      error: () => {}
    });

    if (this.can('manage_guests')) this.apiService.listRsvps(this.eventId).subscribe({
      next: res => { this.rsvpsCount = (res.rsvps || []).length; },
      error: () => {}
    });

    this.apiService.listInvitations().subscribe({
      next: res => {
        this.eventInvitations = (res.invitations || []).filter(inv => {
          const invEvId = typeof inv.event === 'string' ? inv.event : (inv.event?._id || inv.event?.id);
          return invEvId === this.eventId;
        });
        this.invitation = this.eventInvitations.find(inv => inv.status === 'published') || this.eventInvitations[0];
        this.invitationsLoaded = true;
      },
      error: () => { this.invitationsLoaded = false; }
    });

    if (this.can('review_album')) this.apiService.listAlbum(this.eventId).subscribe({
      next: res => {
        this.pendingAlbumAssets = (res.assets || []).filter(a => a.status === 'pending').length;
      },
      error: () => {}
    });
  }

  selectTab(tab: Tab, section = '', replaceUrl = true): void {
    if (!this.canOpenTab(tab)) tab = 'info';
    this.activeTab = tab;
    this.selectedSection = this.isSectionForTab(tab, section) ? section : '';
    this.showQuickSearch = false;
    this.sidebarOpen = false;
    if (this.eventId) {
      localStorage.setItem(`newEventDetail_tab_${this.eventId}`, tab);
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab, section: this.selectedSection || null },
      queryParamsHandling: 'merge',
      replaceUrl
    });
    if (this.selectedSection) this.scrollToSelectedSection(this.selectedSection);
  }

  private scrollToSelectedSection(section: string): void {
    setTimeout(() => {
      if (this.selectedSection !== section) return;
      document.querySelector(`[data-event-section="${section}"]`)?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }, 80);
  }

  get quickLinks(): EventQuickLink[] {
    if (!this.event) return [];
    const links: EventQuickLink[] = [
      { key: 'details', label: 'Datos del evento', description: 'Fecha, horario, anfitriones y lugar.', group: 'Información', keywords: 'editar fecha hora nombre dirección sede', tab: 'info', section: 'details' }
    ];
    if (this.isOwner() && this.event.mode !== 'external_dashboard') {
      links.push({ key: 'invitations', label: 'Invitaciones', description: 'Crear, editar y compartir la invitación digital.', group: 'Diseño', keywords: 'plantilla diseño editor publicar link página', tab: 'info', section: 'invitations' });
    }
    if (this.isOwner()) {
      links.push(
        { key: 'cover', label: 'Portada del evento', description: 'Cambiar la imagen principal del evento.', group: 'Diseño', keywords: 'foto imagen subir archivo principal', tab: 'info', section: 'cover' },
        { key: 'team', label: 'Equipo interno', description: 'Invitar colaboradores y ajustar permisos.', group: 'Administración', keywords: 'miembros roles organizador staff acceso', tab: 'info', section: 'team' },
        { key: 'external', label: 'Accesos externos', description: 'Crear enlaces temporales para DJ, fotografía o staff.', group: 'Administración', keywords: 'token fotógrafo enlace invitados proveedor', tab: 'info', section: 'external' }
      );
    }
    if (this.isOwner() || this.can('view_payments')) {
      links.push({ key: 'plans', label: 'Plan y pagos', description: 'Consultar la vigencia y opciones del plan.', group: 'Administración', keywords: 'suscripción premium planner pro renovar stripe', tab: 'info', section: 'plans' });
    }
    const tabs: EventQuickLink[] = [
      { key: 'guests', label: 'Invitados', description: 'Agregar, importar y organizar personas.', group: 'Operación', keywords: 'contactos grupos acompañantes', tab: 'guests' },
      { key: 'new-guest', label: 'Nuevo invitado', description: 'Ir al botón para registrar una persona.', group: 'Invitados', keywords: 'agregar crear contacto persona', tab: 'guests', section: 'new-guest' },
      { key: 'guest-import', label: 'Importar invitados CSV', description: 'Subir un CSV preparado en Excel y consultar el formato.', group: 'Invitados', keywords: 'excel plantilla archivo lista carga masiva', tab: 'guests', section: 'guest-import' },
      { key: 'tables', label: 'Mesas', description: 'Asignar invitados y revisar lugares disponibles.', group: 'Operación', keywords: 'asientos croquis distribución', tab: 'tables' },
      { key: 'table-create', label: 'Crear mesa', description: 'Ir al control para agregar mesas o elementos.', group: 'Mesas', keywords: 'nueva nombre capacidad tamaño', tab: 'tables', section: 'table-create' },
      { key: 'table-assign', label: 'Asignar invitado a mesa', description: 'Ir al control de asignación de lugares.', group: 'Mesas', keywords: 'persona asiento lugar', tab: 'tables', section: 'table-assign' },
      { key: 'table-auto-assign', label: 'Autoasignar mesas', description: 'Ir al asistente de asignación automática.', group: 'Mesas', keywords: 'distribuir invitados automáticamente', tab: 'tables', section: 'table-auto-assign' },
      { key: 'table-map', label: 'Abrir croquis', description: 'Ir al plano interactivo de mesas.', group: 'Mesas', keywords: 'mapa salon posiciones plano', tab: 'tables', section: 'table-map' },
      { key: 'rsvps', label: 'Confirmaciones', description: 'Ver quién confirmó asistencia y quién sigue pendiente.', group: 'Operación', keywords: 'rsvp respuestas asistencia pendientes', tab: 'rsvps' },
      { key: 'rsvp-filters', label: 'Filtrar confirmaciones RSVP', description: 'Buscar respuestas pendientes, confirmadas o rechazadas.', group: 'Confirmaciones', keywords: 'asistencia estado acompañantes', tab: 'rsvps', section: 'rsvp-filters' },
      { key: 'rsvp-export', label: 'Exportar respuestas RSVP', description: 'Descargar las confirmaciones en CSV cuando existan respuestas.', group: 'Confirmaciones', keywords: 'excel descargar archivo asistencia', tab: 'rsvps', section: 'rsvp-export' },
      { key: 'album', label: 'Álbum', description: 'Revisar y aprobar fotos de invitados.', group: 'Contenido', keywords: 'galería fotografías imágenes aprobar rechazar', tab: 'album' },
      { key: 'album-review', label: 'Revisar fotos pendientes', description: 'Ir a la revisión rápida de imágenes del álbum.', group: 'Álbum', keywords: 'aprobar rechazar moderar fotografías', tab: 'album', section: 'album-review' },
      { key: 'album-access', label: 'Enlaces y QR del álbum', description: 'Abrir accesos para fotógrafos y galería.', group: 'Álbum', keywords: 'compartir subir fotos código permisos', tab: 'album', section: 'album-access' },
      { key: 'album-filters', label: 'Filtrar fotos del álbum', description: 'Ver fotos pendientes, aprobadas o rechazadas.', group: 'Álbum', keywords: 'estado etiquetas galería', tab: 'album', section: 'album-filters' },
      { key: 'communication', label: 'Mensajes y recordatorios', description: 'Preparar invitaciones por WhatsApp o correo.', group: 'Comunicación', keywords: 'notificaciones plantilla', tab: 'communication' },
      { key: 'whatsapp-send', label: 'Enviar WhatsApp masivo', description: 'Revisar destinatarios y preparar el envío. Requiere WhatsApp conectado.', group: 'Comunicación', keywords: 'mensaje invitación lote', tab: 'communication', section: 'whatsapp-send' },
      { key: 'email-send', label: 'Enviar correo masivo', description: 'Revisar destinatarios y preparar el envío por email.', group: 'Comunicación', keywords: 'email mensaje invitación lote', tab: 'communication', section: 'email-send' },
      { key: 'dj', label: 'Peticiones al DJ', description: 'Revisar canciones y gestionar la cola musical.', group: 'Contenido', keywords: 'música canciones spotify youtube solicitudes', tab: 'dj' },
      { key: 'dedications', label: 'Dedicatorias', description: 'Moderación del libro de mensajes.', group: 'Contenido', keywords: 'muro deseos mensajes aprobar', tab: 'dedications' }
    ];
    if (this.event.mode === 'external_dashboard') {
      tabs.push({ key: 'integration', label: 'Integración externa', description: 'Portal, widgets y API para tu página externa.', group: 'Diseño', keywords: 'pagina web código embed iframe token', tab: 'integration' });
    }
    return links.concat(tabs.filter(link => this.canOpenTab(link.tab)));
  }

  private normalizeSearch(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  get quickSearchResults(): EventQuickLink[] {
    const query = this.normalizeSearch(this.quickSearch.trim());
    if (!query) return [];
    const terms = query.split(/\s+/);
    return this.quickLinks.filter(link => {
      const searchable = this.normalizeSearch(`${link.label} ${link.description} ${link.group} ${link.keywords}`);
      return terms.every(term => searchable.includes(term));
    }).slice(0, 7);
  }

  get quickExamples(): EventQuickLink[] {
    const examples = ['cover', 'guests', 'communication', 'plans'];
    return examples.map(key => this.quickLinks.find(link => link.key === key)).filter((link): link is EventQuickLink => !!link);
  }

  get currentLocationLabel(): string {
    if (this.selectedSection) return this.quickLinks.find(link => link.tab === this.activeTab && link.section === this.selectedSection)?.label || 'Información';
    const labels: Partial<Record<Tab, string>> = {
      guests: 'Invitados', tables: 'Mesas', rsvps: 'Confirmaciones', album: 'Álbum',
      communication: 'Comunicación', dj: 'DJ', dedications: 'Dedicatorias',
      integration: 'Integración externa', logs: 'Historial', guide: 'Guía'
    };
    return labels[this.activeTab] || 'Información';
  }

  trackQuickLink(_index: number, link: EventQuickLink): string {
    return link.key;
  }

  trackPreparationStep(_index: number, step: PreparationStep): string {
    return step.key;
  }

  openQuickLink(link: EventQuickLink): void {
    (document.activeElement as HTMLElement | null)?.blur();
    this.quickSearch = '';
    this.showQuickSearch = false;
    this.selectTab(link.tab, link.section || '', false);
    if (!link.section) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openQuickSearch(): void {
    this.showJourneyGuide = false;
    this.quickSearch = '';
    this.showQuickSearch = true;
    setTimeout(() => this.quickSearchInput?.nativeElement.focus());
  }

  closeQuickSearch(restoreFocus = true): void {
    this.showQuickSearch = false;
    this.quickSearch = '';
    if (restoreFocus) setTimeout(() => this.quickSearchButton?.nativeElement.focus());
  }

  onQuickSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeQuickSearch();
    } else if (event.key === 'Enter' && this.quickSearchResults.length) {
      event.preventDefault();
      this.openQuickLink(this.quickSearchResults[0]);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showQuickSearch) this.closeQuickSearch();
    else if (this.showJourneyGuide) this.closeJourneyGuide();
  }

  get guideSteps(): EventGuideStep[] {
    if (!this.event) return [];
    const steps: EventGuideStep[] = [];
    if (this.isOwner() || this.can('edit_event')) {
      const detailsDone = !!(this.event.title?.trim() && this.event.date && this.event.venue?.name?.trim());
      steps.push({
        key: 'details', title: 'Revisa los datos del evento',
        description: 'La fecha y el lugar aparecerán en la invitación y en los mensajes a invitados.',
        instruction: 'Comprueba el nombre, la fecha, la hora y el lugar. Guarda cualquier corrección antes de continuar.',
        status: detailsDone ? 'Datos principales completos' : 'Faltan datos principales', done: detailsDone,
        tab: 'info', section: 'details'
      });
    }
    if (this.isOwner() && this.event.mode === 'external_dashboard') {
      const done = !!this.event.externalPortalSlug;
      steps.push({
        key: 'integration', title: 'Configura el portal externo',
        description: 'Tu página externa sigue siendo la principal; el portal conecta RSVP, pases y otras funciones.',
        instruction: 'Revisa la URL de tu página y copia el enlace o los widgets que integrarás.',
        status: done ? 'Portal disponible' : 'Por configurar', done, tab: 'integration'
      });
    } else if (this.isOwner() && this.invitationsLoaded) {
      const published = this.eventInvitations.some(inv => inv.status === 'published');
      steps.push({
        key: 'invitation', title: 'Diseña y publica la invitación',
        description: 'Puedes usar una plantilla y editarla antes de compartirla.',
        instruction: 'Crea o abre la invitación, revisa su vista previa y publícala cuando esté lista.',
        status: published ? 'Publicada' : this.invitation ? 'Aún no publicada' : 'Sin crear', done: published,
        action: this.invitation ? 'edit_invitation' : 'create_invitation'
      });
    }
    if (this.can('manage_guests')) {
      const hasGuests = this.guests.length > 0;
      steps.push({
        key: 'guests', title: 'Agrega a tus invitados',
        description: 'Puedes capturarlos uno a uno o importarlos con el archivo de ejemplo.',
        instruction: 'Añade al menos un invitado con teléfono o correo; después podrás definir grupos y acompañantes.',
        status: hasGuests ? `${this.guests.length} en la lista` : 'Sin invitados', done: hasGuests,
        tab: 'guests', section: 'new-guest'
      });
    }
    if (this.can('manage_tables')) {
      const hasTables = this.tables.length > 0;
      steps.push({
        key: 'tables', title: 'Organiza las mesas',
        description: 'Este paso es opcional. Puedes hacerlo ahora o cuando conozcas las confirmaciones.',
        instruction: 'Crea mesas con su capacidad y asigna a los invitados que ya tengas registrados.',
        status: hasTables ? `${this.tables.length} creadas` : 'Opcional', done: hasTables, optional: true,
        tab: 'tables', section: 'table-create'
      });
    }
    if (this.can('manage_guests')) {
      const sent = (this.eventMetrics.emailSent || 0) + (this.eventMetrics.whatsappSent || 0);
      steps.push({
        key: 'communication', title: 'Prepara el envío',
        description: 'La invitación puede compartirse por correo o WhatsApp. Ningún mensaje se envía desde esta guía.',
        instruction: 'Revisa el mensaje, selecciona destinatarios y confirma el envío desde Comunicación.',
        status: sent ? `${sent} mensajes registrados` : 'Sin envíos registrados', done: sent > 0,
        tab: 'communication', section: 'whatsapp-send'
      });
      const hasResponses = this.rsvpsCount > 0;
      steps.push({
        key: 'rsvps', title: 'Da seguimiento a las respuestas',
        description: 'Aquí verás quién confirmó, rechazó o sigue pendiente.',
        instruction: 'Consulta los filtros de RSVP y revisa cuántos lugares quedan disponibles.',
        status: hasResponses ? `${this.rsvpsCount} respuestas` : 'Aún sin respuestas', done: hasResponses, optional: true,
        tab: 'rsvps', section: 'rsvp-filters'
      });
    }
    return steps;
  }

  get currentGuideStep(): EventGuideStep | undefined {
    return this.guideSteps[Math.min(this.guideIndex, this.guideSteps.length - 1)];
  }

  get guideProgress(): { done: number; total: number } {
    const required = this.guideSteps.filter(step => !step.optional);
    return { done: required.filter(step => step.done).length, total: required.length };
  }

  openJourneyGuide(): void {
    this.showQuickSearch = false;
    const savedValue = localStorage.getItem(`eventGuide_step_${this.eventId}`);
    const saved = savedValue === null ? -1 : Number(savedValue);
    const firstPending = this.guideSteps.findIndex(step => !step.optional && !step.done);
    this.guideIndex = Number.isInteger(saved) && saved >= 0 && saved < this.guideSteps.length
      ? saved : Math.max(0, firstPending);
    this.showJourneyGuide = true;
    setTimeout(() => {
      this.journeyGuideClose?.nativeElement.focus();
      this.scrollGuideStepIntoView();
    });
  }

  closeJourneyGuide(): void {
    this.showJourneyGuide = false;
    setTimeout(() => this.journeyGuideButton?.nativeElement.focus());
  }

  selectGuideStep(index: number): void {
    if (index < 0 || index >= this.guideSteps.length) return;
    this.guideIndex = index;
    localStorage.setItem(`eventGuide_step_${this.eventId}`, String(index));
    setTimeout(() => this.scrollGuideStepIntoView());
  }

  private scrollGuideStepIntoView(): void {
    const nav = this.guideStepNav?.nativeElement;
    const button = this.guideStepButtons?.get(this.guideIndex)?.nativeElement;
    if (!nav || !button || nav.scrollWidth <= nav.clientWidth) return;
    const offset = button.getBoundingClientRect().left - nav.getBoundingClientRect().left;
    nav.scrollTo({ left: nav.scrollLeft + offset - (nav.clientWidth - button.clientWidth) / 2, behavior: 'smooth' });
  }

  openGuideTarget(): void {
    const step = this.currentGuideStep;
    if (!step) return;
    this.showJourneyGuide = false;
    if (step.action) {
      this.openPreparationStep({ key: step.key, label: step.title, status: step.status, action: step.action });
    } else if (step.tab) {
      this.selectTab(step.tab, step.section || '', false);
    }
  }

  returnToOverview(): void {
    this.selectTab('info');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  isOwner(): boolean {
    return this.event?.access?.owner === true;
  }

  can(permission: EventPermission): boolean {
    if (this.isOwner()) return true;
    return Boolean(this.event?.access?.permissions?.includes(permission));
  }

  canOpenTab(tab: Tab): boolean {
    if (tab === 'info') return true;
    if (tab === 'guests' || tab === 'rsvps' || tab === 'communication') return this.can('manage_guests');
    if (tab === 'tables') return this.can('manage_tables');
    if (tab === 'album') return this.can('review_album');
    if (tab === 'dedications') return this.can('review_dedications');
    if (tab === 'dj') return this.can('manage_songs');
    if (tab === 'integration') return this.isOwner() && this.event?.mode === 'external_dashboard';
    if (tab === 'logs') return true;
    return false;
  }

  get preparationSteps(): PreparationStep[] {
    if (!this.event) return [];
    const steps: PreparationStep[] = [];

    if (this.isOwner() && (this.event.mode === 'external_dashboard' || this.invitationsLoaded)) {
      if (this.event.mode === 'external_dashboard') {
        steps.push({
          key: 'integration', label: 'Integración externa',
          status: this.event.externalPortalSlug ? 'Portal disponible' : 'Por configurar',
          action: 'tab', tab: 'integration'
        });
      } else {
        const published = this.eventInvitations.some(inv => inv.status === 'published');
        const editable = this.invitation;
        steps.push({
          key: 'invitation', label: 'Invitación',
          status: published ? 'Publicada' : editable?.status === 'unpublished' ? 'No publicada' : editable ? 'Borrador' : 'Sin crear',
          action: editable ? 'edit_invitation' : 'create_invitation'
        });
      }
    }

    if (this.can('manage_guests')) {
      steps.push({ key: 'guests', label: 'Invitados', status: `${this.guests.length} en lista`, action: 'tab', tab: 'guests' });
      steps.push({ key: 'communication', label: 'Comunicación', status: this.guests.length ? 'Disponible' : 'Agrega invitados primero', action: 'tab', tab: 'communication' });
    }
    if (this.can('manage_tables')) {
      const tablesStep: PreparationStep = { key: 'tables', label: 'Mesas', status: this.tables.length ? `${this.tables.length} creadas` : 'Opcional', action: 'tab', tab: 'tables' };
      const communicationIndex = steps.findIndex(step => step.key === 'communication');
      steps.splice(communicationIndex < 0 ? steps.length : communicationIndex, 0, tablesStep);
    }
    return steps;
  }

  get nextPreparationKey(): string {
    if (this.isOwner()) {
      if (this.event?.mode === 'external_dashboard' && !this.event.externalPortalSlug) return 'integration';
      if (this.event?.mode !== 'external_dashboard' && !this.invitationsLoaded) return '';
      if (this.event?.mode !== 'external_dashboard' && this.invitationsLoaded && !this.eventInvitations.some(inv => inv.status === 'published')) return 'invitation';
    }
    if (this.can('manage_guests') && !this.guests.length) return 'guests';
    if (this.can('manage_guests')) return 'communication';
    if (this.can('manage_tables')) return 'tables';
    return '';
  }

  openPreparationStep(step: PreparationStep): void {
    if (step.action === 'create_invitation') {
      this.openCreateInvitationWizard();
    } else if (step.action === 'edit_invitation') {
      const invitation = this.invitation;
      const id = invitation?._id || invitation?.id;
      if (id) this.router.navigate(['/new/invitations', id, 'editor']);
    } else if (step.tab) {
      this.selectTab(step.tab);
    }
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  getNormalizedEventType(eventObj?: EventModel | string, eventTitle?: string): string {
    let type = typeof eventObj === 'string' ? eventObj : eventObj?.type;
    let title = typeof eventObj === 'object' ? eventObj?.title : eventTitle;

    if (title) {
      const t = title.toLowerCase().trim();
      if (t.includes('boda') || t.includes('matrimonio') || t.includes('wedding')) return 'boda';
      if (t.includes('xv') || t.includes('quince') || t.includes('15')) return 'xv';
      if (t.includes('gradua')) return 'graduacion';
      if (t.includes('cumple')) return 'cumpleanos';
      if (t.includes('bautiz')) return 'bautizo';
      if (t.includes('otro') || t.includes('fiesta') || t.includes('evento')) return 'otro';
    }

    if (!type) return 'otro';
    const t = type.toLowerCase().trim();
    if (t.includes('boda') || t.includes('matrimonio') || t.includes('wedding')) return 'boda';
    if (t.includes('xv') || t.includes('quince') || t.includes('15')) return 'xv';
    if (t.includes('gradua')) return 'graduacion';
    if (t.includes('cumple')) return 'cumpleanos';
    if (t.includes('bautiz')) return 'bautizo';
    return 'otro';
  }

  eventTypeIcon(eventObj?: EventModel | string, title?: string): string {
    const norm = this.getNormalizedEventType(eventObj, title);
    const icons: Record<string, string> = { boda: '💍', xv: '👑', graduacion: '🎓', cumpleanos: '🎂', bautizo: '⛪', otro: '🎉' };
    return icons[norm] || '🎉';
  }

  eventTypeLabel(eventObj?: EventModel | string, title?: string): string {
    const norm = this.getNormalizedEventType(eventObj, title);
    const labels: Record<string, string> = { boda: 'Boda', xv: 'XV Años', graduacion: 'Graduación', cumpleanos: 'Cumpleaños', bautizo: 'Bautizo', otro: 'Otro' };
    return labels[norm] || (typeof eventObj === 'string' ? eventObj : eventObj?.type) || 'Otro';
  }

  onEventUpdated(): void {
    this.loadEvent();
  }

  onGuestsUpdated(): void {
    this.loadMetricsAndCounts();
  }

  onTablesUpdated(): void {
    this.loadMetricsAndCounts();
  }

  resetWizardSectionsToDefault(): void {
    this.wizardSections = {
      guestAlbum: false,
      gallery: true,
      songRequests: false,
      dedications: false,
      rsvp: true,
      story: true,
      locations: true,
      itinerary: true,
      dressCode: true,
      giftRegistry: true,
      digitalEnvelope: false,
      lodging: false,
      backgroundMusic: true
    };
  }

  openCreateInvitationWizard(): void {
    this.resetWizardSectionsToDefault();
    this.showCreateWizardModal = true;
  }

  closeCreateInvitationWizard(): void {
    this.showCreateWizardModal = false;
  }

  toggleWizardSection(key: string): void {
    this.wizardSections[key] = !this.wizardSections[key];
  }

  applyWizardPreset(preset: 'all' | 'essential' | 'none'): void {
    for (const sec of this.wizardSectionDefinitions) {
      if (preset === 'all') {
        this.wizardSections[sec.key] = true;
      } else if (preset === 'none') {
        this.wizardSections[sec.key] = false;
      } else if (preset === 'essential') {
        this.wizardSections[sec.key] = ['rsvp', 'locations', 'itinerary', 'dressCode', 'story'].includes(sec.key);
      }
    }
  }

  get activeWizardSectionsCount(): number {
    return Object.values(this.wizardSections).filter(Boolean).length;
  }

  confirmCreateInvitation(): void {
    if (!this.event) return;
    const evId = (this.event._id || this.event.id)!;
    this.saving = true;

    const sectionSettings = {
      story: Boolean(this.wizardSections['story']),
      locations: Boolean(this.wizardSections['locations']),
      itinerary: Boolean(this.wizardSections['itinerary']),
      dressCode: Boolean(this.wizardSections['dressCode']),
      rsvp: Boolean(this.wizardSections['rsvp']),
      giftRegistry: Boolean(this.wizardSections['giftRegistry']),
      digitalEnvelope: Boolean(this.wizardSections['digitalEnvelope']),
      lodging: Boolean(this.wizardSections['lodging']),
      gallery: Boolean(this.wizardSections['gallery']),
      guestAlbum: Boolean(this.wizardSections['guestAlbum']),
      dedications: Boolean(this.wizardSections['dedications']),
      backgroundMusic: Boolean(this.wizardSections['backgroundMusic']),
      songRequests: Boolean(this.wizardSections['songRequests'])
    };

    const giftSettings = {
      enabled: Boolean(this.wizardSections['giftRegistry'] || this.wizardSections['digitalEnvelope']),
      showRegistry: Boolean(this.wizardSections['giftRegistry']),
      showEnvelope: Boolean(this.wizardSections['digitalEnvelope'])
    };

    const dedicationSettings = {
      enabled: Boolean(this.wizardSections['dedications']),
      requireApproval: true
    };

    const content: any = {
      sectionSettings,
      giftSettings,
      dedicationSettings,
      privateAlbumEnabled: Boolean(this.wizardSections['guestAlbum'])
    };

    if (this.wizardSections['locations'] && this.event.venue && (this.event.venue.name || this.event.venue.address || this.event.venue.mapUrl)) {
      content.locations = [{
        type: 'recepción',
        name: this.event.venue.name || '',
        address: this.event.venue.address || '',
        mapUrl: this.event.venue.mapUrl || '',
        wazeUrl: '',
        notes: ''
      }];
    }

    if (this.wizardSections['itinerary']) {
      if (this.event.agenda && this.event.agenda.length > 0) {
        content.itinerary = this.event.agenda.map(a => ({
          time: a.time || '',
          title: a.title || '',
          description: a.description || ''
        }));
      } else if (this.event.time) {
        content.itinerary = [{
          time: this.event.time,
          title: this.getDefaultItineraryTitle(this.event.type),
          description: this.event.venue?.name ? `En ${this.event.venue.name}` : ''
        }];
      }
    }

    const payload: any = {
      event: evId,
      content
    };

    this.apiService.createInvitation(payload).subscribe({
      next: invRes => {
        const invId = invRes.invitation._id || invRes.invitation.id;

        const songRequestSettings = {
          enabled: Boolean(this.wizardSections['songRequests']),
          maxRequestsPerGuest: 3,
          allowDedications: true,
          requireApproval: true
        };

        this.apiService.updateEvent(evId, { externalContent: { ...(this.event?.externalContent || {}), songRequestSettings } }).subscribe({
          next: () => {
            this.saving = false;
            this.showCreateWizardModal = false;
            this.router.navigate(['/new/invitations', invId, 'editor']);
          },
          error: () => {
            this.saving = false;
            this.showCreateWizardModal = false;
            this.router.navigate(['/new/invitations', invId, 'editor']);
          }
        });
      },
      error: err => {
        this.error = err?.error?.message || 'Error al crear invitación';
        this.saving = false;
      }
    });
  }

  getDefaultItineraryTitle(eventType?: string): string {
    switch (eventType) {
      case 'boda': return 'Ceremonia / Recepción';
      case 'xv': return 'Recepción de XV Años';
      case 'graduacion': return 'Recepción de Graduación';
      case 'bautizo': return 'Ceremonia / Recepción';
      case 'cumpleanos': return 'Festejo y Recepción';
      default: return 'Recepción';
    }
  }
}
