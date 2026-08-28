import { Component, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-new-event-detail',
  templateUrl: './new-event-detail.component.html'
})
export class NewEventDetailComponent implements OnInit {
  sidebarOpen = false;
  activeTab: Tab = 'info';
  event?: EventModel;
  eventId = '';
  eventMetrics: Partial<DashboardMetrics> = {};

  loading = true;
  saving = false;
  error = '';

  guests: GuestModel[] = [];
  tables: EventTableModel[] = [];
  invitation?: InvitationModel;
  songRequestsCount = 0;
  dedicationsCount = 0;
  rsvpsCount = 0;
  pendingAlbumAssets = 0;

  showCreateWizardModal = false;
  wizardSections: Record<string, boolean> = {
    guestAlbum: true,
    gallery: true,
    songRequests: true,
    dedications: true,
    rsvp: true,
    story: true,
    locations: true,
    itinerary: true,
    dressCode: true,
    giftRegistry: true,
    digitalEnvelope: false,
    lodging: false,
    backgroundMusic: false
  };

  wizardSectionDefinitions: WizardSectionDef[] = [
    { key: 'guestAlbum', icon: '', label: 'Álbum Interactivo de Invitados', description: 'Permite a los invitados subir sus fotos en tiempo real durante el evento.' },
    { key: 'gallery', icon: '', label: 'Galería Fotográfica Oficial', description: 'Muestra la galería con fotos del evento o sesión de los novios/festejados.' },
    { key: 'songRequests', icon: '', label: 'Música / Pedir Canciones (DJ)', description: 'Módulo interactivo para que los invitados sugieran canciones al DJ.' },
    { key: 'dedications', icon: '', label: 'Dedicatorias y Libro de Firmas', description: 'Muro de mensajes, felicitaciones y buenos deseos para los festejados.' },
    { key: 'rsvp', icon: '', label: 'Confirmación de Asistencia (RSVP)', description: 'Formulario de confirmación de asistencia, pases y acompañantes.' },
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
    });
  }

  private isValidTab(tab: string): tab is Tab {
    return ['info', 'guests', 'tables', 'rsvps', 'album', 'communication', 'dedications', 'dj', 'integration', 'logs', 'guide'].includes(tab);
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
        this.invitation = (res.invitations || []).find(inv => {
          const invEvId = typeof inv.event === 'string' ? inv.event : (inv.event?._id || inv.event?.id);
          return invEvId === this.eventId;
        });
      },
      error: () => {}
    });

    if (this.can('review_album')) this.apiService.listAlbum(this.eventId).subscribe({
      next: res => {
        this.pendingAlbumAssets = (res.assets || []).filter(a => a.status === 'pending').length;
      },
      error: () => {}
    });
  }

  selectTab(tab: Tab): void {
    if (!this.canOpenTab(tab)) tab = 'info';
    this.activeTab = tab;
    if (this.eventId) {
      localStorage.setItem(`newEventDetail_tab_${this.eventId}`, tab);
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
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

  openCreateInvitationWizard(): void {
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

    const payload: any = {
      event: evId,
      content: {
        sectionSettings,
        giftSettings,
        dedicationSettings,
        privateAlbumEnabled: Boolean(this.wizardSections['guestAlbum'])
      }
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
            this.router.navigate(['/new/invitations', invId, 'sections']);
          },
          error: () => {
            this.saving = false;
            this.showCreateWizardModal = false;
            this.router.navigate(['/new/invitations', invId, 'sections']);
          }
        });
      },
      error: err => {
        this.error = err?.error?.message || 'Error al crear invitación';
        this.saving = false;
      }
    });
  }
}
