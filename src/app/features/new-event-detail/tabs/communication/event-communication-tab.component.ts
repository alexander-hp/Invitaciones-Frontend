import { Component, Input, OnInit, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../../core/api.service';
import { ConfirmDialogService } from '../../../../core/confirm-dialog.service';
import {
  EventModel, GuestModel, DashboardMetrics, WhatsAppProvider,
  WhatsAppMediaAssetModel, WhatsAppMediaInspection, WhatsAppMediaType, GuestMessageType, GuestCommunicationStatus
} from '../../../../core/models';
import { generateGuestPassHtml } from '../../../new-public-invitation/guest-pass-template';
import { generateGuestPassImageBlob } from '../../../../core/guest-pass-image';
import * as JSZip from 'jszip';

interface MessageTemplateOption { value: GuestMessageType; label: string; }
interface WhatsAppPremiumSegmentOption { key: string; label: string; count: number; }

export interface ProgressModalState {
  visible: boolean;
  title: string;
  subtitle: string;
  kind: 'email' | 'whatsapp' | 'special_passes' | 'zip';
  current: number;
  total: number;
  percent: number;
  statusText: string;
  currentGuestName: string;
  completed: boolean;
  successCount: number;
  errorCount: number;
}

@Component({
  selector: 'app-event-communication-tab',
  templateUrl: './event-communication-tab.component.html'
})
export class EventCommunicationTabComponent implements OnInit, OnChanges, OnDestroy {
  @Input() event?: EventModel;
  @Input() guests: GuestModel[] = [];

  private progressInterval: any = null;

  eventMetrics: Partial<DashboardMetrics> = {};
  whatsappMediaAssets: WhatsAppMediaAssetModel[] = [];

  guestMessage = '';
  guestError = '';
  emailSending = '';
  emailBulkSending = false;
  whatsappSending = '';
  whatsappBulkSending = false;
  downloadingPass = '';
  downloadingZip = false;
  zipProgress = '';
  whatsappMediaUploading = false;

  progressModal: ProgressModalState = {
    visible: false,
    title: '',
    subtitle: '',
    kind: 'email',
    current: 0,
    total: 0,
    percent: 0,
    statusText: '',
    currentGuestName: '',
    completed: false,
    successCount: 0,
    errorCount: 0
  };

  excludedGuestIds = new Set<string>();
  includePassInMessage = false;
  showPreviewModal = false;
  previewModalKind: 'email' | 'whatsapp' = 'email';
  previewGuest?: GuestModel;

  customMessageBody = '';
  customMessagePreview = '';
  isMessageEdited = false;
  previewTabMode: 'view' | 'edit' | 'preview' = 'view';

  whatsappProvider: WhatsAppProvider = 'disabled';
  whatsappFallbackProvider: WhatsAppProvider | '' = '';
  whatsappEnabled = false;
  whatsappFallbackEnabled = false;
  openWaReady = false;
  openWaStatus = '';
  mediaInspection?: WhatsAppMediaInspection;
  mediaInspecting = false;
  selectedWhatsappMediaFile?: File;
  whatsappMedia = {
    enabled: false, assetId: '', type: 'image' as WhatsAppMediaType,
    url: '', mimetype: '', filename: '', caption: ''
  };

  readonly maxSpecialGuests = 30;
  deliveryModeWithImage = false;
  selectedSpecialGuestIds = new Set<string>();
  specialGuestsSending = false;

  selectedMessageType: GuestMessageType = 'invitation';
  messageTemplates: MessageTemplateOption[] = [
    { value: 'invitation', label: 'Invitación' },
    { value: 'reminder', label: 'Recordatorio RSVP' },
    { value: 'event_reminder', label: 'Recordatorio evento' },
    { value: 'location_change', label: 'Cambio de ubicación' },
    { value: 'thanks', label: 'Agradecimiento' }
  ];

  previewGuestSearch = '';
  isGuestDropdownOpen = false;

  get previewGuestFilteredList(): GuestModel[] {
    if (!this.previewGuestSearch.trim()) {
      return this.guests;
    }
    const q = this.previewGuestSearch.toLowerCase().trim();
    return this.guests.filter(g => g.name.toLowerCase().includes(q) || (g.email && g.email.toLowerCase().includes(q)));
  }

  toggleGuestDropdown(): void {
    this.isGuestDropdownOpen = !this.isGuestDropdownOpen;
    if (this.isGuestDropdownOpen) {
      this.previewGuestSearch = '';
    }
  }

  selectPreviewGuest(g: GuestModel): void {
    this.previewGuest = g;
    this.isGuestDropdownOpen = false;
  }

  guestSearch = '';
  guestStatusFilter = '';
  guestCommunicationFilter = '';
  guestGroupFilter = '';

  guestPage = 1;
  guestPageSize = 25;
  Math = Math;

  get totalPages(): number {
    return Math.ceil(this.filteredGuests.length / this.guestPageSize) || 1;
  }

  get paginatedGuests(): GuestModel[] {
    const total = this.totalPages;
    if (this.guestPage > total) {
      this.guestPage = 1;
    }
    const start = (this.guestPage - 1) * this.guestPageSize;
    return this.filteredGuests.slice(start, start + this.guestPageSize);
  }

  setPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.guestPage = page;
  }

  getPagesArray(): number[] {
    const total = this.totalPages;
    const current = this.guestPage;
    const pages: number[] = [];
    const maxVisible = 5;

    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  clearAllFilters(): void {
    this.guestSearch = '';
    this.guestStatusFilter = '';
    this.guestCommunicationFilter = '';
    this.guestGroupFilter = '';
    this.guestPage = 1;
  }

  constructor(
    private apiService: ApiService,
    private confirmDialogService: ConfirmDialogService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    const id = this.event?._id || this.event?.id;
    if (id) {
      this.loadCommunicationData();
    }
    this.initSpecialGuests();
    this.updatePreviewMessage();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const id = this.event?._id || this.event?.id;
    if (changes['event'] && !changes['event'].firstChange && id) {
      this.loadCommunicationData();
    }
    if (changes['guests'] && this.guests.length) {
      if (!this.selectedSpecialGuestIds.size) {
        this.initSpecialGuests();
      }
      if (!this.customMessagePreview) {
        this.updatePreviewMessage();
      }
    }
  }

  initSpecialGuests(): void {
    const vips = this.getGuestsByRole('vip');
    const family = this.getGuestsByRole('familia');
    const padrinos = this.getGuestsByRole('padrino');
    const initialList = [...vips, ...family, ...padrinos];
    for (const g of initialList) {
      if (this.selectedSpecialGuestIds.size >= this.maxSpecialGuests) break;
      const gId = this.getGuestId(g);
      if (gId) this.selectedSpecialGuestIds.add(gId);
    }
  }

  loadCommunicationData(): void {
    const id = (this.event?._id || this.event?.id);
    if (!id) return;

    this.apiService.getWhatsAppStatus().subscribe({
      next: res => {
        this.whatsappProvider = res.provider || 'disabled';
        this.whatsappFallbackProvider = res.fallbackProvider || '';
        this.whatsappEnabled = res.enabled || false;
        this.whatsappFallbackEnabled = res.fallbackEnabled || false;
        this.openWaReady = res.openWaSession?.ready || false;
        this.openWaStatus = res.openWaSession?.status || '';
      },
      error: () => { }
    });

    this.apiService.listWhatsAppMedia(id).subscribe({
      next: res => { this.whatsappMediaAssets = res.assets || []; },
      error: () => { }
    });
  }

  get guestGroups(): string[] {
    const groups = new Set<string>();
    for (const g of this.guests) {
      if (g.group) groups.add(g.group);
    }
    return Array.from(groups).sort();
  }

  get filteredGuests(): GuestModel[] {
    return this.guests.filter(g => {
      if (this.guestStatusFilter && g.status !== this.guestStatusFilter) return false;
      if (this.guestGroupFilter && g.group !== this.guestGroupFilter) return false;
      if (this.guestCommunicationFilter) {
        const commStatus = g.communicationStatus || 'pending';
        if (commStatus !== this.guestCommunicationFilter) return false;
      }
      if (this.guestSearch.trim()) {
        const q = this.guestSearch.toLowerCase().trim();
        const nameMatch = g.name.toLowerCase().includes(q);
        const emailMatch = g.email?.toLowerCase().includes(q) || false;
        const phoneMatch = g.phone?.includes(q) || false;
        const groupMatch = g.group?.toLowerCase().includes(q) || false;
        return nameMatch || emailMatch || phoneMatch || groupMatch;
      }
      return true;
    });
  }

  get activeRecipients(): GuestModel[] {
    return this.filteredGuests.filter(g => !this.isExcluded(g));
  }

  get activeEmailRecipients(): GuestModel[] {
    return this.activeRecipients.filter(g => this.canEmailGuest(g));
  }

  get activeEmailRecipientsCount(): number {
    return this.activeEmailRecipients.length;
  }

  get activeWhatsappRecipients(): GuestModel[] {
    return this.activeRecipients.filter(g => this.canWhatsappGuest(g));
  }

  get activeWhatsappRecipientsCount(): number {
    return this.activeWhatsappRecipients.length;
  }

  get exceptionCount(): number {
    return this.excludedGuestIds.size;
  }

  get pendingCommunicationGuests(): number {
    return this.guests.filter(g => (g.communicationStatus || 'pending') === 'pending').length;
  }

  get sentCommunicationGuests(): number {
    return this.guests.filter(g => g.communicationStatus === 'sent').length;
  }

  get deliveredCommunicationGuests(): number {
    return this.guests.filter(g => g.communicationStatus === 'delivered').length;
  }

  get readCommunicationGuests(): number {
    return this.guests.filter(g => g.communicationStatus === 'read').length;
  }

  get openedCommunicationGuests(): number {
    return this.guests.filter(g => g.communicationStatus === 'opened').length;
  }

  get failedCommunicationGuests(): number {
    return this.guests.filter(g => g.communicationStatus === 'failed').length;
  }

  get confirmedCommunicationGuests(): number {
    return this.guests.filter(g => g.communicationStatus === 'confirmed').length;
  }

  get whatsappRecipientCount(): number {
    return this.activeRecipients.filter(g => !!g.phone).length;
  }

  get whatsappMissingPhoneCount(): number {
    return this.activeRecipients.filter(g => !g.phone).length;
  }

  isExcluded(g: GuestModel): boolean {
    const id = this.getGuestId(g);
    return this.excludedGuestIds.has(id);
  }

  toggleException(g: GuestModel): void {
    const id = this.getGuestId(g);
    if (this.excludedGuestIds.has(id)) {
      this.excludedGuestIds.delete(id);
    } else {
      this.excludedGuestIds.add(id);
    }
  }

  clearExceptions(): void {
    this.excludedGuestIds.clear();
  }

  selectAllRecipients(): void {
    this.excludedGuestIds.clear();
  }

  getGuestId(g: GuestModel): string {
    return g._id || g.id || '';
  }

  getWhatsAppMediaAssetId(asset: WhatsAppMediaAssetModel): string {
    return asset._id || asset.id || '';
  }

  canEmailGuest(g: GuestModel): boolean {
    return !!g.email && g.email.includes('@');
  }

  canWhatsappGuest(g: GuestModel): boolean {
    return !!g.phone;
  }

  canSendRealWhatsapp(g: GuestModel): boolean {
    return this.canWhatsappGuest(g) && this.whatsappEnabled && this.openWaReady;
  }

  getCommunicationStatus(g: GuestModel): GuestCommunicationStatus {
    return g.communicationStatus || 'pending';
  }

  communicationLabel(status: GuestCommunicationStatus): string {
    switch (status) {
      case 'pending': return 'Por enviar';
      case 'sent': return 'Enviado';
      case 'delivered': return 'Entregado';
      case 'read': return 'Leído';
      case 'opened': return 'Abierto';
      case 'failed': return 'Fallido';
      case 'confirmed': return 'Confirmado';
      default: return status;
    }
  }

  getMessageTypeLabel(type?: GuestMessageType): string {
    switch (type) {
      case 'invitation': return 'Invitación';
      case 'reminder': return 'Recordatorio RSVP';
      case 'event_reminder': return 'Recordatorio Evento';
      case 'location_change': return 'Cambio Ubicación';
      case 'thanks': return 'Agradecimiento';
      default: return type || '';
    }
  }

  showPendingReminders(): void {
    this.guestCommunicationFilter = 'pending';
  }

  get sampleGuest(): GuestModel {
    return this.activeRecipients[0] || this.guests[0] || { name: 'Invitado(a)', phone: '+523312345678', email: 'invitado@ejemplo.com', allowedCompanions: 1, status: 'pending', event: '' };
  }

  onMessageTypeChange(): void {
    if (!this.isMessageEdited) {
      this.updatePreviewMessage();
    }
  }

  getBodyTemplateForType(type: GuestMessageType): string {
    const eventName = this.event?.title || 'nuestro evento especial';
    switch (type) {
      case 'invitation':
        return `Estás cordialmente invitado(a) a ${eventName}. Para ver tu invitación interactiva y confirmar tu asistencia, ingresa aquí:`;
      case 'reminder':
        return `Te recordamos confirmar tu asistencia para ${eventName}. Ingresa aquí para responder:`;
      case 'event_reminder':
        return `¡Falta muy poco para ${eventName}! Te esperamos con mucha alegría. Revisa los detalles aquí:`;
      case 'location_change':
        return `Hay una actualización importante sobre la ubicación de ${eventName}. Revisa el mapa y los detalles aquí:`;
      case 'thanks':
        return `¡Muchas gracias por acompañarnos en ${eventName}! Fue un momento inolvidable. Puedes revivir las fotos y detalles aquí:`;
      default:
        return `Te invitamos a ${eventName}:`;
    }
  }

  updatePreviewMessage(): void {
    this.customMessageBody = this.getBodyTemplateForType(this.selectedMessageType);
    this.refreshCustomPreview();
  }

  onCustomBodyChange(): void {
    this.isMessageEdited = true;
    this.refreshCustomPreview();
  }

  refreshCustomPreview(): void {
    const sample = this.sampleGuest;
    const evId = this.event?._id || this.event?.id;
    const link = `${window.location.origin}/new/i/${evId}?guestToken=${sample.invitationToken || 'TOKEN_INVITADO'}`;
    const body = this.customMessageBody || this.getBodyTemplateForType(this.selectedMessageType);
    this.customMessagePreview = `Hola ${sample.name},\n\n${body}\n${link}`;
  }

  resetMessagePreview(): void {
    this.isMessageEdited = false;
    this.updatePreviewMessage();
  }

  setPreviewGuestAndTab(g: GuestModel, mode: 'view' | 'edit' | 'preview' = 'preview'): void {
    this.previewGuest = g;
    this.previewTabMode = mode;
    const el = document.getElementById('comms-config-card');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // --- Manejo Dinámico de Roles para Invitados Especiales (Límite 30) ---
  get dynamicSpecialRoles(): { key: string; label: string }[] {
    const rolesMap = new Map<string, { key: string; label: string }>();
    
    for (const g of this.guests) {
      if (g.roles && Array.isArray(g.roles)) {
        for (const r of g.roles) {
          if (r && r.trim()) {
            const key = r.trim().toLowerCase();
            if (!rolesMap.has(key)) {
              rolesMap.set(key, { key, label: this.formatRoleLabel(r.trim()) });
            }
          }
        }
      }
      if (g.group && g.group.trim()) {
        const key = g.group.trim().toLowerCase();
        if (!rolesMap.has(key)) {
          rolesMap.set(key, { key, label: this.formatRoleLabel(g.group.trim()) });
        }
      }
    }

    if (rolesMap.size === 0) {
      return [{ key: 'todos', label: 'Todos los Invitados' }];
    }

    return Array.from(rolesMap.values());
  }

  formatRoleLabel(roleName: string): string {
    const lower = roleName.toLowerCase();
    if (lower === 'vip' || lower === 'vips') return 'VIPs';
    if (lower === 'familia' || lower === 'family') return 'Familia';
    if (lower === 'padrino' || lower === 'padrinos') return 'Padrinos';
    if (lower === 'dama' || lower === 'damas' || lower === 'dama_honor') return 'Damas de Honor';
    if (lower === 'anfitrion' || lower === 'anfitriones') return 'Anfitriones';
    if (lower === 'amigos' || lower === 'friends') return 'Amigos';
    if (lower === 'trabajo' || lower === 'companeros') return 'Compañeros';
    return roleName.charAt(0).toUpperCase() + roleName.slice(1);
  }

  // --- Bloqueo con Cookies y LocalStorage tras envío ---
  specialPassesSentSession = false;

  get specialPassesAlreadySent(): boolean {
    if (this.specialPassesSentSession) return true;
    const id = this.event?._id || this.event?.id;
    if (!id) return false;
    
    // 1. Checar LocalStorage
    const localVal = localStorage.getItem(`special_passes_sent_${id}`);
    if (localVal === 'true') return true;
    const localCount = localStorage.getItem(`special_passes_sent_count_${id}`);
    if (localCount && parseInt(localCount, 10) > 0) return true;

    // 2. Checar Cookies
    const cookieMatch = document.cookie.match(new RegExp(`(?:^|;\\s*)special_passes_sent_${id}=([^;]*)`));
    if (cookieMatch && (cookieMatch[1] === 'true' || Number(cookieMatch[1]) > 0)) {
      return true;
    }
    const cookieCountMatch = document.cookie.match(new RegExp(`(?:^|;\\s*)special_passes_sent_count_${id}=([^;]*)`));
    if (cookieCountMatch && Number(cookieCountMatch[1]) > 0) {
      return true;
    }
    return false;
  }

  get specialPassesSentCount(): number {
    const id = this.event?._id || this.event?.id;
    if (!id) return 0;
    const localVal = localStorage.getItem(`special_passes_sent_count_${id}`);
    return localVal ? parseInt(localVal, 10) : 0;
  }

  markSpecialPassesAsSent(count: number): void {
    this.specialPassesSentSession = true;
    const id = this.event?._id || this.event?.id;
    if (!id) return;
    const currentSent = this.specialPassesSentCount + count;
    localStorage.setItem(`special_passes_sent_${id}`, 'true');
    localStorage.setItem(`special_passes_sent_count_${id}`, String(currentSent));
    
    // Cookie persistente por 60 días
    const expires = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `special_passes_sent_${id}=true; expires=${expires}; path=/; SameSite=Lax`;
    document.cookie = `special_passes_sent_count_${id}=${currentSent}; expires=${expires}; path=/; SameSite=Lax`;
  }

  isSpecialGuestSelected(g: GuestModel): boolean {
    const id = this.getGuestId(g);
    return this.selectedSpecialGuestIds.has(id);
  }

  toggleSpecialGuest(g: GuestModel): void {
    if (this.specialPassesAlreadySent) return;
    const id = this.getGuestId(g);
    if (!id) return;
    if (this.selectedSpecialGuestIds.has(id)) {
      this.selectedSpecialGuestIds.delete(id);
    } else {
      if (this.selectedSpecialGuestIds.size >= this.maxSpecialGuests) {
        this.guestError = `Límite alcanzado: Máximo ${this.maxSpecialGuests} invitados especiales pueden recibir imagen.`;
        return;
      }
      this.selectedSpecialGuestIds.add(id);
    }
  }

  isRoleFullySelectedForSpecialGuests(roleKey: string): boolean {
    const guestsInRole = this.getGuestsByRole(roleKey);
    if (!guestsInRole.length) return false;
    return guestsInRole.every(g => this.selectedSpecialGuestIds.has(this.getGuestId(g)));
  }

  toggleRoleForSpecialGuests(roleKey: string): void {
    if (this.specialPassesAlreadySent) return;
    const guestsInRole = this.getGuestsByRole(roleKey);
    if (!guestsInRole.length) return;
    const allSelected = this.isRoleFullySelectedForSpecialGuests(roleKey);

    if (allSelected) {
      for (const g of guestsInRole) {
        this.selectedSpecialGuestIds.delete(this.getGuestId(g));
      }
    } else {
      for (const g of guestsInRole) {
        if (this.selectedSpecialGuestIds.size >= this.maxSpecialGuests) {
          this.guestError = `Se agregaron invitados hasta alcanzar el límite de ${this.maxSpecialGuests}.`;
          break;
        }
        const id = this.getGuestId(g);
        if (id) this.selectedSpecialGuestIds.add(id);
      }
    }
  }

  get selectedSpecialGuestCount(): number {
    return this.selectedSpecialGuestIds.size;
  }

  get specialGuestsList(): GuestModel[] {
    return this.guests.filter(g => this.selectedSpecialGuestIds.has(this.getGuestId(g)));
  }

  ngOnDestroy(): void {
    this.clearProgressInterval();
  }

  clearProgressInterval(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  openProgressModal(title: string, subtitle: string, kind: 'email' | 'whatsapp' | 'special_passes' | 'zip', total: number): void {
    this.clearProgressInterval();
    this.progressModal = {
      visible: true,
      title,
      subtitle,
      kind,
      current: Math.max(1, Math.round(total * 0.05)),
      total,
      percent: 6,
      statusText: 'Iniciando proceso en el servidor...',
      currentGuestName: '',
      completed: false,
      successCount: 0,
      errorCount: 0
    };

    const getPhrases = (k: string) => {
      switch (k) {
        case 'email':
          return [
            `Preparando lote de ${total} correos electrónicos...`,
            'Generando enlaces y tokens de acceso personalizados...',
            'Renderizando plantillas de correo para cada invitado...',
            'Despachando mensajes a través del servidor...',
            'Verificando confirmaciones y estados de entrega...',
            'Finalizando sincronización de envíos...'
          ];
        case 'whatsapp':
          return [
            `Preparando lote de ${total} mensajes de WhatsApp...`,
            'Formateando mensajes personalizados con tokens únicos...',
            'Despachando mensajes a través del servicio de mensajería...',
            'Sincronizando estados de entrega con el servidor...',
            'Consolidando métricas de comunicación...'
          ];
        case 'special_passes':
          return [
            `Generando imágenes de pase VIP para los ${total} invitados especiales...`,
            'Incorporando códigos QR de acceso en alta resolución...',
            'Adjuntando tarjetas de pase y despachando por WhatsApp...',
            'Registrando bloqueo de cupo especial en el servidor...'
          ];
        case 'zip':
          return [
            `Inicializando renderizador de pases en el servidor...`,
            `Generando imágenes PNG de alta resolución (2x Retina)...`,
            'Empaquetando tarjetas oficiales en el archivo ZIP...',
            'Descargando archivo comprimido final...'
          ];
        default:
          return [
            'Procesando en el servidor...',
            'Sincronizando información...',
            'Finalizando proceso...'
          ];
      }
    };

    const phrases = getPhrases(kind);
    let stepIndex = 0;

    this.progressInterval = setInterval(() => {
      if (this.progressModal.completed) {
        this.clearProgressInterval();
        return;
      }

      // Incremento dinámico y fluido hasta el 94% mientras el backend responde
      if (this.progressModal.percent < 94) {
        const increment = Math.max(1, Math.round((95 - this.progressModal.percent) * 0.07));
        this.progressModal.percent = Math.min(94, this.progressModal.percent + increment);
        this.progressModal.current = Math.min(total - 1, Math.max(1, Math.round((this.progressModal.percent / 100) * total)));
      }

      stepIndex = (stepIndex + 1) % phrases.length;
      this.progressModal.statusText = phrases[stepIndex];
    }, 1400);
  }

  updateProgressStep(current: number, total: number, guestName: string, statusText: string): void {
    this.progressModal.current = current;
    this.progressModal.total = total;
    this.progressModal.percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
    this.progressModal.currentGuestName = guestName;
    this.progressModal.statusText = statusText;
  }

  finishProgressModal(successCount: number, errorCount: number, statusText: string): void {
    this.clearProgressInterval();
    this.progressModal.current = this.progressModal.total;
    this.progressModal.percent = 100;
    this.progressModal.completed = true;
    this.progressModal.successCount = successCount;
    this.progressModal.errorCount = errorCount;
    this.progressModal.statusText = statusText;
  }

  closeProgressModal(): void {
    this.clearProgressInterval();
    this.progressModal.visible = false;
    this.loadCommunicationData();
  }

  sendSpecialGuestsPasses(): void {
    const id = this.event?._id || this.event?.id;
    const count = this.selectedSpecialGuestCount;
    if (!id || count === 0 || this.specialPassesAlreadySent) return;

    if (count > this.maxSpecialGuests) {
      this.guestError = `Solo puedes enviar pases a un máximo de ${this.maxSpecialGuests} invitados especiales.`;
      return;
    }

    this.confirmDialogService.confirm({
      title: 'Envío de Pases a Invitados Especiales',
      message: `¿Deseas enviar la imagen de pase VIP a los ${count} invitados especiales seleccionados? Una vez completado el envío, el cupo de ${this.maxSpecialGuests} pases especiales para este evento quedará bloqueado.`,
      confirmText: `Sí, enviar ${count} pases`,
      cancelText: 'Cancelar',
      type: 'info'
    }).then(confirmed => {
      if (!confirmed) return;

      this.specialGuestsSending = true;
      const guestIds = Array.from(this.selectedSpecialGuestIds);
      this.openProgressModal('Envío de Pases Especiales', 'El servidor está procesando y enviando los pases VIP...', 'special_passes', count);
      this.updateProgressStep(1, count, '', `Enviando lote de ${count} pases con imagen...`);

      this.apiService.sendBulkWhatsApp(id, {
        confirm: true,
        messageType: this.selectedMessageType,
        guestIds: guestIds,
        attachPass: true
      }).subscribe({
        next: (res: any) => {
          this.specialGuestsSending = false;
          this.markSpecialPassesAsSent(count);
          const sent = res.sent || count;
          const failed = res.failed || 0;
          this.finishProgressModal(sent, failed, `Se enviaron ${sent} pases VIP con imagen correctamente.`);
          this.guestMessage = `Se enviaron exitosamente ${sent} pases con imagen a los invitados especiales.`;
        },
        error: (err: any) => {
          this.specialGuestsSending = false;
          this.finishProgressModal(0, count, 'Error al enviar pases a invitados especiales.');
          this.guestError = err?.error?.message || 'Error al enviar pases a invitados especiales';
        }
      });
    });
  }

  sendBulkEmail(): void {
    const id = (this.event?._id || this.event?.id);
    const recipients = this.activeEmailRecipients;
    if (!id || !recipients.length) return;

    this.confirmDialogService.confirm({
      title: 'Envío Masivo de Email',
      message: `¿Enviar emails masivos a ${recipients.length} invitados activos con correo válido?`,
      confirmText: 'Sí, enviar emails',
      cancelText: 'Cancelar',
      type: 'info'
    }).then(confirmed => {
      if (!confirmed) return;

      this.emailBulkSending = true;
      const total = recipients.length;
      this.openProgressModal('Envío Masivo de Email', 'El servidor está procesando los correos electrónicos...', 'email', total);
      this.updateProgressStep(1, total, '', `Procesando lote masivo de ${total} correos...`);

      this.apiService.sendBulkEmail(id, {
        confirm: true,
        messageType: this.selectedMessageType,
        guestIds: recipients.map(g => this.getGuestId(g)),
        attachPass: this.includePassInMessage
      }).subscribe({
        next: res => {
          this.emailBulkSending = false;
          const sent = res.sent || 0;
          const failed = res.failed || 0;
          this.finishProgressModal(sent, failed, `Proceso finalizado: ${sent} emails enviados exitosamente.`);
          this.guestMessage = `Se enviaron ${sent} emails con éxito.` + (failed > 0 ? ` (${failed} fallidos)` : '');
        },
        error: err => {
          this.emailBulkSending = false;
          this.finishProgressModal(0, total, 'Error al enviar emails masivos.');
          this.guestError = err?.error?.message || 'Error al enviar emails masivos';
        }
      });
    });
  }

  sendBulkWhatsapp(): void {
    const id = (this.event?._id || this.event?.id);
    const recipients = this.activeWhatsappRecipients;
    if (!id || !recipients.length) return;

    this.confirmDialogService.confirm({
      title: 'Envío Masivo de WhatsApp',
      message: `¿Enviar mensajes de WhatsApp masivos a ${recipients.length} invitados activos con teléfono válido?`,
      confirmText: 'Sí, enviar WhatsApp',
      cancelText: 'Cancelar',
      type: 'info'
    }).then(confirmed => {
      if (!confirmed) return;

      this.whatsappBulkSending = true;
      const total = recipients.length;
      this.openProgressModal('Envío Masivo de WhatsApp', 'El servidor está procesando los mensajes de WhatsApp...', 'whatsapp', total);
      this.updateProgressStep(1, total, '', `Procesando lote masivo de ${total} mensajes...`);

      this.apiService.sendBulkWhatsApp(id, {
        confirm: true,
        messageType: this.selectedMessageType,
        guestIds: recipients.map(g => this.getGuestId(g)),
        attachPass: this.includePassInMessage
      }).subscribe({
        next: res => {
          this.whatsappBulkSending = false;
          const sent = res.sent || 0;
          const failed = res.failed || 0;
          this.finishProgressModal(sent, failed, `Proceso finalizado: ${sent} mensajes de WhatsApp enviados.`);
          this.guestMessage = `Se enviaron ${sent} mensajes de WhatsApp con éxito.` + (failed > 0 ? ` (${failed} fallidos)` : '');
        },
        error: err => {
          this.whatsappBulkSending = false;
          this.finishProgressModal(0, total, 'Error al enviar WhatsApp masivo.');
          this.guestError = err?.error?.message || 'Error al enviar WhatsApp masivo';
        }
      });
    });
  }

  sendRealEmail(g: GuestModel): void {
    const gId = this.getGuestId(g);
    if (!gId) return;
    this.emailSending = gId;
    this.apiService.sendGuestEmail(gId, {
      messageType: this.selectedMessageType,
      attachPass: this.includePassInMessage
    }).subscribe({
      next: () => {
        this.emailSending = '';
        g.communicationStatus = 'sent';
        g.lastMessageType = this.selectedMessageType;
        this.guestMessage = `Email enviado a ${g.name}`;
      },
      error: err => {
        this.emailSending = '';
        this.guestError = err?.error?.message || `Error al enviar email a ${g.name}`;
      }
    });
  }

  sendRealWhatsapp(g: GuestModel): void {
    const gId = this.getGuestId(g);
    if (!gId) return;
    this.whatsappSending = gId;
    this.apiService.sendGuestWhatsApp(gId, {
      messageType: this.selectedMessageType,
      attachPass: this.includePassInMessage
    }).subscribe({
      next: () => {
        this.whatsappSending = '';
        g.communicationStatus = 'sent';
        g.lastMessageType = this.selectedMessageType;
        this.guestMessage = `WhatsApp enviado a ${g.name}`;
      },
      error: err => {
        this.whatsappSending = '';
        this.guestError = err?.error?.message || `Error al enviar WhatsApp a ${g.name}`;
      }
    });
  }

  markMessageSent(g: GuestModel, channel: 'email' | 'whatsapp'): void {
    g.communicationStatus = 'sent';
    g.lastMessageType = this.selectedMessageType;
  }

  setCommunicationStatus(g: GuestModel, status: GuestCommunicationStatus): void {
    g.communicationStatus = status;
  }

  onWhatsappMediaSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedWhatsappMediaFile = input.files[0];
    }
  }

  uploadWhatsappMedia(): void {
    const id = (this.event?._id || this.event?.id);
    if (!id || !this.selectedWhatsappMediaFile) return;
    this.whatsappMediaUploading = true;
    this.apiService.createUploadUrl({
      fileName: this.selectedWhatsappMediaFile.name,
      contentType: this.selectedWhatsappMediaFile.type,
      folder: 'whatsapp-media',
      event: id
    }).subscribe({
      next: uploadRes => {
        this.apiService.uploadAsset(uploadRes.uploadUrl, this.selectedWhatsappMediaFile!).subscribe({
          next: () => {
            this.apiService.createWhatsAppMedia(id, {
              key: uploadRes.key,
              url: uploadRes.publicUrl,
              type: this.whatsappMedia.type,
              fileName: this.selectedWhatsappMediaFile!.name,
              mimetype: this.selectedWhatsappMediaFile!.type
            }).subscribe({
              next: res => {
                this.whatsappMediaUploading = false;
                this.whatsappMediaAssets.push(res.asset);
                this.whatsappMedia.assetId = this.getWhatsAppMediaAssetId(res.asset);
                this.selectedWhatsappMediaFile = undefined;
                this.guestMessage = `Media ${res.asset.fileName} subida.`;
              },
              error: () => { this.whatsappMediaUploading = false; }
            });
          },
          error: () => { this.whatsappMediaUploading = false; }
        });
      },
      error: () => { this.whatsappMediaUploading = false; }
    });
  }

  deleteWhatsappMedia(asset: WhatsAppMediaAssetModel): void {
    const id = (this.event?._id || this.event?.id);
    const aId = this.getWhatsAppMediaAssetId(asset);
    if (!id || !aId) return;
    this.apiService.deleteWhatsAppMedia(id, aId).subscribe({
      next: () => {
        this.whatsappMediaAssets = this.whatsappMediaAssets.filter(a => this.getWhatsAppMediaAssetId(a) !== aId);
        if (this.whatsappMedia.assetId === aId) this.whatsappMedia.assetId = '';
      },
      error: () => { }
    });
  }

  inspectWhatsappMediaUrl(): void {
    if (!this.whatsappMedia.url) return;
    this.mediaInspecting = true;
    this.apiService.inspectAssetUrl(this.whatsappMedia.url).subscribe({
      next: res => {
        this.mediaInspecting = false;
        this.mediaInspection = res;
      },
      error: err => {
        this.mediaInspecting = false;
        this.guestError = err?.error?.message || 'Error al analizar URL de media';
      }
    });
  }

  buildMessage(g: GuestModel, type: GuestMessageType): string {
    const evId = this.event?._id || this.event?.id;
    const link = `${window.location.origin}/new/i/${evId}?guestToken=${g.invitationToken || 'TOKEN'}`;
    const body = this.isMessageEdited ? this.customMessageBody : this.getBodyTemplateForType(type);
    return `Hola ${g.name},\n\n${body}\n${link}`;
  }

  getMessageSubject(type: GuestMessageType): string {
    const eventName = this.event?.title || 'Nuestro Evento Especial';
    switch (type) {
      case 'invitation': return `✨ Estás invitado a ${eventName}`;
      case 'reminder': return `💌 Recordatorio RSVP: ${eventName}`;
      case 'event_reminder': return `🎉 ¡Falta poco para ${eventName}!`;
      case 'location_change': return `📍 Actualización de ubicación - ${eventName}`;
      case 'thanks': return `❤️ ¡Gracias por acompañarnos en ${eventName}!`;
      default: return `Invitación a ${eventName}`;
    }
  }

  getEventDateText(): string {
    return this.event?.date ? new Date(this.event.date).toLocaleDateString('es-MX', { dateStyle: 'full' }) : '';
  }

  getEventLocationText(): string {
    return [this.event?.venue?.name, this.event?.venue?.address].filter(Boolean).join(' - ');
  }

  getEmailPreviewBadge(type: GuestMessageType): string {
    switch (type) {
      case 'invitation': return '✨ INVITACIÓN DIGITAL';
      case 'reminder': return '💌 RECORDATORIO RSVP';
      case 'event_reminder': return '🎉 PRÓXIMO EVENTO';
      case 'location_change': return '📍 CAMBIO DE UBICACIÓN';
      case 'thanks': return '❤️ GRACIAS POR CONFIRMAR';
      default: return '✨ INVITACIÓN DIGITAL';
    }
  }

  getEmailPreviewCta(type: GuestMessageType): string {
    switch (type) {
      case 'invitation': return '✉️ Ver Mi Invitación Digital';
      case 'reminder': return '💌 Confirmar Asistencia';
      case 'event_reminder': return '✨ Ver Detalles del Evento';
      case 'location_change': return '🗺️ Ver Nueva Ubicación';
      case 'thanks': return '💖 Ver Detalles del Evento';
      default: return '✉️ Ver Mi Invitación Digital';
    }
  }

  getEmailLink(g: GuestModel): string {
    const subject = encodeURIComponent(this.getMessageSubject(this.selectedMessageType));
    const body = encodeURIComponent(this.buildMessage(g, this.selectedMessageType));
    return `mailto:${g.email}?subject=${subject}&body=${body}`;
  }

  getWhatsappLink(g: GuestModel): string {
    const text = encodeURIComponent(this.buildMessage(g, this.selectedMessageType));
    const phone = (g.phone || '').replace(/[^0-9]/g, '');
    return `https://wa.me/${phone}?text=${text}`;
  }

  openPreviewModal(g: GuestModel, kind: 'email' | 'whatsapp'): void {
    this.previewGuest = g;
    this.previewModalKind = kind;
    this.showPreviewModal = true;
  }

  closePreviewModal(): void {
    this.showPreviewModal = false;
  }

  getGuestPassSafeSrcdoc(g: GuestModel): SafeResourceUrl {
    const html = generateGuestPassHtml({
      guestName: g.name,
      headline: this.event?.title || 'Evento Especial',
      subheadline: 'Pase de Entrada Personal',
      eventDateFormatted: this.event?.date ? new Date(this.event.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Próximamente',
      locationAddress: this.event?.venue?.name || 'Lugar del evento',
      tableName: g.tableName || 'Mesa General',
      seatLabel: g.seatLabel,
      allowedCompanions: (g.allowedCompanions || 0) + 1,
      qrCodeUrl: g.checkInCode ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(g.checkInCode)}` : ''
    });
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  async downloadGuestPass(g: GuestModel): Promise<void> {
    const gId = this.getGuestId(g);
    if (!gId) return;
    this.downloadingPass = gId;
    const safeName = g.name.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_') || 'Invitado';

    // 1. Intentar descargar pase renderizado exactamente por el Backend (Puppeteer)
    this.apiService.downloadGuestPassImage(gId).subscribe({
      next: (blob: Blob) => {
        this.downloadingPass = '';
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Pase_VIP_${safeName}.png`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: async () => {
        // Fallback: Generación local mediante Canvas
        try {
          const blob = await generateGuestPassImageBlob({
            guestName: g.name,
            headline: this.event?.title || 'Evento Especial',
            subheadline: 'Pase de Entrada Personal',
            eventDateFormatted: this.event?.date ? new Date(this.event.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Próximamente',
            locationAddress: this.event?.venue?.name || 'Lugar del evento',
            tableName: g.tableName || 'Mesa General',
            seatLabel: g.seatLabel,
            allowedCompanions: (g.allowedCompanions || 0) + 1,
            qrCodeUrl: g.checkInCode ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(g.checkInCode)}` : ''
          });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Pase_VIP_${safeName}.png`;
          a.click();
          window.URL.revokeObjectURL(url);
        } catch {
          this.guestError = 'Error al generar la imagen del pase VIP';
        } finally {
          this.downloadingPass = '';
        }
      }
    });
  }

  async downloadAllPassesZip(): Promise<void> {
    const id = this.event?._id || this.event?.id;
    if (!id || !this.guests.length || this.downloadingZip) return;

    this.downloadingZip = true;
    const total = this.guests.length;
    this.openProgressModal('Descarga Masiva de Pases en ZIP', 'Generando imágenes de pases VIP en alta resolución...', 'zip', total);
    const eventTitle = (this.event?.title || 'Evento').replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');

    this.updateProgressStep(1, total, '', 'El servidor está renderizando y empaquetando los pases...');

    this.apiService.downloadAllPassesZip(id).subscribe({
      next: (blob: Blob) => {
        this.downloadingZip = false;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Pases_VIP_${eventTitle}.zip`;
        a.click();
        window.URL.revokeObjectURL(url);

        this.finishProgressModal(total, 0, `Archivo Pases_VIP_${eventTitle}.zip descargado con éxito (${total} pases oficiales).`);
        this.guestMessage = `Se descargaron exitosamente ${total} pases en formato ZIP.`;
      },
      error: (err: any) => {
        this.downloadingZip = false;
        this.finishProgressModal(0, total, 'Ocurrió un error al generar el archivo ZIP en el servidor.');
        this.guestError = err?.error?.message || 'Error al descargar archivo ZIP de pases';
      }
    });
  }

  getGuestsByRole(role: string): GuestModel[] {
    const rLower = (role || '').trim().toLowerCase();
    if (rLower === 'todos') return this.guests;
    return this.guests.filter(g => {
      const inRoles = g.roles && Array.isArray(g.roles) && g.roles.some(r => r.trim().toLowerCase() === rLower);
      const inGroup = g.group && g.group.trim().toLowerCase() === rLower;
      return inRoles || inGroup;
    });
  }
}
