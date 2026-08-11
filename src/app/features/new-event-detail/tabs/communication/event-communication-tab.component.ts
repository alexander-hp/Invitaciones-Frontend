import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiService } from '../../../../core/api.service';
import { ConfirmDialogService } from '../../../../core/confirm-dialog.service';
import {
  EventModel, GuestModel, DashboardMetrics, WhatsAppProvider,
  WhatsAppMediaAssetModel, WhatsAppMediaInspection, WhatsAppMediaType, GuestMessageType, GuestCommunicationStatus
} from '../../../../core/models';
import { generateGuestPassHtml } from '../../../new-public-invitation/guest-pass-template';

interface MessageTemplateOption { value: GuestMessageType; label: string; }
interface WhatsAppPremiumSegmentOption { key: string; label: string; count: number; }

@Component({
  selector: 'app-event-communication-tab',
  templateUrl: './event-communication-tab.component.html'
})
export class EventCommunicationTabComponent implements OnInit, OnChanges {
  @Input() event?: EventModel;
  @Input() guests: GuestModel[] = [];

  eventMetrics: Partial<DashboardMetrics> = {};
  whatsappMediaAssets: WhatsAppMediaAssetModel[] = [];

  guestMessage = '';
  guestError = '';
  emailSending = '';
  emailBulkSending = false;
  whatsappSending = '';
  whatsappBulkSending = false;
  whatsappMediaUploading = false;

  excludedGuestIds = new Set<string>();
  includePassInMessage = true;
  simulationMode = false;
  showPreviewModal = false;
  previewModalKind: 'email' | 'whatsapp' = 'email';
  previewGuest?: GuestModel;

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
  readonly whatsappPremiumMediaLimit = 30;
  whatsappBulkDeliveryMode: 'safe' | 'premium' = 'safe';
  whatsappPremiumSegmentKeys: string[] = ['role:vip', 'role:familia', 'role:padrino', 'role:dama_honor', 'role:anfitrion'];
  selectedMessageType: GuestMessageType = 'invitation';
  messageTemplates: MessageTemplateOption[] = [
    { value: 'invitation', label: 'Invitación' },
    { value: 'reminder', label: 'Recordatorio RSVP' },
    { value: 'event_reminder', label: 'Recordatorio evento' },
    { value: 'location_change', label: 'Cambio de ubicación' },
    { value: 'thanks', label: 'Agradecimiento' }
  ];

  guestSearch = '';
  guestStatusFilter = '';
  guestCommunicationFilter = '';
  guestGroupFilter = '';

  constructor(
    private apiService: ApiService,
    private confirmDialogService: ConfirmDialogService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const id = this.event?._id || this.event?.id;
    if (id) {
      this.loadCommunicationData();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    const id = this.event?._id || this.event?.id;
    if (changes['event'] && !changes['event'].firstChange && id) {
      this.loadCommunicationData();
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
      error: () => {}
    });

    this.apiService.listWhatsAppMedia(id).subscribe({
      next: res => { this.whatsappMediaAssets = res.assets || []; },
      error: () => {}
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
      case 'pending': return 'Por enviar ⏳';
      case 'sent': return 'Enviado ✉️';
      case 'delivered': return 'Entregado 📬';
      case 'read': return 'Leído 👁️';
      case 'opened': return 'Abierto 🔓';
      case 'failed': return 'Fallido ❌';
      case 'confirmed': return 'Confirmado ✅';
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

  sendBulkEmail(): void {
    const id = (this.event?._id || this.event?.id);
    if (!id || !this.activeRecipients.length) return;
    this.confirmDialogService.confirm({
      title: 'Envío Masivo de Email',
      message: `¿Enviar emails masivos a ${this.activeRecipients.length} invitados activos?`,
      confirmText: 'Sí, enviar emails',
      cancelText: 'Cancelar',
      type: 'info'
    }).then(confirmed => {
      if (!confirmed) return;
      this.emailBulkSending = true;
      this.apiService.sendBulkEmail(id, {
        confirm: true,
        messageType: this.selectedMessageType,
        guestIds: this.activeRecipients.map(g => this.getGuestId(g)),
        attachPass: this.includePassInMessage
      }).subscribe({
        next: res => {
          this.emailBulkSending = false;
          this.guestMessage = `Se enviaron ${res.sent || 0} emails con éxito.`;
        },
        error: err => {
          this.emailBulkSending = false;
          this.guestError = err?.error?.message || 'Error al enviar emails masivos';
        }
      });
    });
  }

  sendBulkWhatsapp(): void {
    const id = (this.event?._id || this.event?.id);
    if (!id || !this.activeRecipients.length) return;
    this.confirmDialogService.confirm({
      title: 'Envío Masivo de WhatsApp',
      message: `¿Enviar mensajes de WhatsApp masivos a ${this.activeRecipients.length} invitados activos?`,
      confirmText: 'Sí, enviar WhatsApp',
      cancelText: 'Cancelar',
      type: 'info'
    }).then(confirmed => {
      if (!confirmed) return;
      this.whatsappBulkSending = true;
      this.apiService.sendBulkWhatsApp(id, {
        confirm: true,
        messageType: this.selectedMessageType,
        guestIds: this.activeRecipients.map(g => this.getGuestId(g))
      }).subscribe({
        next: res => {
          this.whatsappBulkSending = false;
          this.guestMessage = `Se enviaron ${res.sent || 0} mensajes de WhatsApp con éxito.`;
        },
        error: err => {
          this.whatsappBulkSending = false;
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
      messageType: this.selectedMessageType
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
      error: () => {}
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

  get whatsappPremiumSegmentOptions(): WhatsAppPremiumSegmentOption[] {
    const counts: Record<string, number> = {};
    for (const g of this.activeRecipients) {
      const role = (g.roles && g.roles[0]) ? `role:${g.roles[0]}` : (g.group ? `group:${g.group}` : 'other');
      counts[role] = (counts[role] || 0) + 1;
    }
    return [
      { key: 'role:vip', label: '⭐ VIP', count: counts['role:vip'] || 0 },
      { key: 'role:familia', label: '👨‍👩‍👧‍👦 Familia', count: counts['role:familia'] || 0 },
      { key: 'role:padrino', label: '💒 Padrinos', count: counts['role:padrino'] || 0 },
      { key: 'role:dama_honor', label: '👗 Damas', count: counts['role:dama_honor'] || 0 },
      { key: 'role:anfitrion', label: '👤 Anfitriones', count: counts['role:anfitrion'] || 0 }
    ];
  }

  isWhatsappPremiumSegmentSelected(key: string): boolean {
    return this.whatsappPremiumSegmentKeys.includes(key);
  }

  toggleWhatsappPremiumSegment(key: string, checked: boolean): void {
    if (checked) {
      if (!this.whatsappPremiumSegmentKeys.includes(key)) {
        this.whatsappPremiumSegmentKeys.push(key);
      }
    } else {
      this.whatsappPremiumSegmentKeys = this.whatsappPremiumSegmentKeys.filter(k => k !== key);
    }
  }

  get whatsappPremiumMediaGuests(): GuestModel[] {
    return this.activeRecipients.filter(g => {
      const rKey = (g.roles && g.roles[0]) ? `role:${g.roles[0]}` : '';
      return this.whatsappPremiumSegmentKeys.includes(rKey);
    });
  }

  get whatsappSafeMessageGuests(): GuestModel[] {
    const premIds = new Set(this.whatsappPremiumMediaGuests.map(g => this.getGuestId(g)));
    return this.activeRecipients.filter(g => !premIds.has(this.getGuestId(g)));
  }

  get whatsappPremiumMediaOverLimit(): number {
    return Math.max(0, this.whatsappPremiumMediaGuests.length - this.whatsappPremiumMediaLimit);
  }

  get whatsappPremiumMediaReady(): boolean {
    return !!(this.whatsappMedia.assetId || this.whatsappMedia.url || this.selectedWhatsappMediaFile);
  }

  get bulkWhatsappPreview(): string {
    const sampleGuest = this.activeRecipients[0] || { name: 'Sofia Garcia', phone: '+523312345678' };
    return this.buildMessage(sampleGuest, this.selectedMessageType);
  }

  buildMessage(g: GuestModel, type: GuestMessageType): string {
    const eventName = this.event?.title || 'Boda de Alex y Tania';
    const evId = this.event?._id || this.event?.id;
    const link = `${window.location.origin}/new/i/${evId}?guestToken=${g.invitationToken || 'TOKEN'}`;
    switch (type) {
      case 'invitation':
        return `Hola ${g.name}, estás cordialmente invitado(a) a ${eventName}.\n\nPara ver tu invitación y confirmar tu asistencia, ingresa aquí:\n${link}`;
      case 'reminder':
        return `Hola ${g.name}, te recordamos confirmar tu asistencia para ${eventName}.\n\nIngresa aquí para responder:\n${link}`;
      case 'event_reminder':
        return `Hola ${g.name}, ¡falta muy poco para ${eventName}! Te esperamos.\n\nRevisa los detalles aquí:\n${link}`;
      case 'location_change':
        return `Hola ${g.name}, hay una actualización importante sobre la ubicación de ${eventName}.\n\nRevisa el mapa aquí:\n${link}`;
      case 'thanks':
        return `Hola ${g.name}, ¡muchas gracias por acompañarnos en ${eventName}! Fue un momento inolvidable.`;
      default:
        return `Hola ${g.name}, te invitamos a ${eventName}: ${link}`;
    }
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

  simulateSendGuest(g: GuestModel, kind: 'email' | 'whatsapp'): void {
    g.communicationStatus = 'sent';
    g.lastMessageType = this.selectedMessageType;
    this.showPreviewModal = false;
    this.guestMessage = `[Modo Simulación] Mensaje ${kind} marcado como enviado a ${g.name}.`;
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

  downloadGuestPass(g: GuestModel): void {
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
    const blob = new Blob([html], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Pase_VIP_${g.name.replace(/\s+/g, '_')}.html`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  getGuestsByRole(role: string): GuestModel[] {
    return this.guests.filter(g => g.roles && g.roles.includes(role));
  }
}
