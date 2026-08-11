import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import {
  EventModel, DashboardMetrics, GuestModel, EventTableModel, InvitationModel, EventPermission
} from '../../core/models';

type Tab = 'info' | 'guests' | 'tables' | 'rsvps' | 'album' | 'communication' | 'dedications' | 'dj' | 'integration';

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
  songRequestsCount = 0;
  dedicationsCount = 0;
  rsvpsCount = 0;
  pendingAlbumAssets = 0;

  showCreateWizardModal = false;
  wizardSections: Record<string, boolean> = {
    cover: true,
    countdown: true,
    details: true,
    location: true,
    rsvp: true,
    gift: true,
    dressCode: true,
    schedule: true,
    gallery: true,
    dedications: true,
    music: true,
    passes: true
  };

  wizardSectionDefinitions: WizardSectionDef[] = [
    { key: 'cover', icon: '🖼️', label: 'Portada / Bienvenida', description: 'Imagen principal y título de la invitación.' },
    { key: 'countdown', icon: '⏳', label: 'Cuenta Regresiva', description: 'Temporizador en vivo hacia el día del evento.' },
    { key: 'details', icon: 'ℹ️', label: 'Detalles y Horarios', description: 'Fecha, hora y mensaje de los novios/anfitriones.' },
    { key: 'location', icon: '📍', label: 'Ubicación y Mapa', description: 'Dirección del lugar con enlace a Google Maps / Waze.' },
    { key: 'rsvp', icon: '💌', label: 'Confirmación RSVP', description: 'Formulario para que los invitados confirmen asistencia.' },
    { key: 'gift', icon: '🎁', label: 'Mesa de Regalos / Sobre', description: 'Datos bancarios o enlaces a mesas de regalos.' },
    { key: 'dressCode', icon: '👔', label: 'Código de Vestimenta', description: 'Sugerencias de vestuario y paleta de colores.' },
    { key: 'schedule', icon: '📅', label: 'Itinerario / Programa', description: 'Cronograma de actividades durante el evento.' },
    { key: 'gallery', icon: '📸', label: 'Galería de Fotos', description: 'Álbum de fotos oficial y fotos de invitados.' },
    { key: 'dedications', icon: '💬', label: 'Muro de Dedicatorias', description: 'Libro de visitas para que dejen sus mensajes.' },
    { key: 'music', icon: '🎵', label: 'Peticiones de Canciones', description: 'Los invitados pueden proponer canciones al DJ.' },
    { key: 'passes', icon: '🎫', label: 'Pases VIP / QR', description: 'Pase digital individual con código QR para entrada.' }
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
    return ['info', 'guests', 'tables', 'rsvps', 'album', 'communication', 'dedications', 'dj', 'integration'].includes(tab);
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
        this.wizardSections[sec.key] = ['cover', 'details', 'location', 'rsvp', 'passes'].includes(sec.key);
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
    this.apiService.createInvitation({ event: evId }).subscribe({
      next: invRes => {
        this.saving = false;
        this.showCreateWizardModal = false;
        const invId = invRes.invitation._id || invRes.invitation.id;
        this.router.navigate(['/new/invitations', invId, 'sections']);
      },
      error: err => {
        this.error = err?.error?.message || 'Error al crear invitación';
        this.saving = false;
      }
    });
  }
}
