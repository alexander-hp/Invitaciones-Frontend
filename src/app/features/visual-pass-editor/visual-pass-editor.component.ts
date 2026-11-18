import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import html2canvas from 'html2canvas';
import { firstValueFrom, Subscription } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import {
  EventModel,
  GuestModel,
  InvitationModel,
  VisualCanvasSize,
  VisualInvitationDesign,
  VisualInvitationLayer,
  VisualInvitationLayerStyle,
  VisualInvitationSection,
  VisualLayerType,
  WebImageSearchResult
} from '../../core/models';
import { VISUAL_ICON_CATALOG, VisualIconOption } from '../../shared/components/visual-invitation-renderer/visual-icon-catalog';
import {
  buildDefaultPassDesign,
  createPassLayer,
  PASS_CANVAS_PRESETS,
  PassCanvasPresetOption
} from './visual-pass-presets';

export type ImageMask = NonNullable<VisualInvitationLayerStyle['imageMask']>;
export type ShapeKind = NonNullable<VisualInvitationLayerStyle['shapeKind']>;
export type ToolCategory = 'fields' | 'text' | 'elements' | 'images' | 'backgrounds' | 'music' | 'layers';

interface QuickPassFieldOption {
  type: string;
  label: string;
  icon: string;
  sub: string;
  token: string;
}

interface DragResizeState {
  isDragging: boolean;
  isResizing: boolean;
  handle?: string;
  startX: number;
  startY: number;
  layerStartX: number;
  layerStartY: number;
  layerStartW: number;
  layerStartH: number;
}

@Component({
  selector: 'app-visual-pass-editor',
  templateUrl: './visual-pass-editor.component.html',
  styleUrls: ['./visual-pass-editor.component.css']
})
export class VisualPassEditorComponent implements OnInit, OnDestroy {
  invitationId = '';
  invitation?: InvitationModel;
  event?: EventModel;
  guests: GuestModel[] = [];
  previewGuest?: GuestModel;

  design!: VisualInvitationDesign;
  activeSheetIndex = 0;
  selectedLayerId = '';
  clipboardLayer: VisualInvitationLayer | null = null;
  viewMode: 'single' | 'all' = 'single';
  canvasZoom = 1;
  showGrid = false;
  previewModalOpen = false;
  exporting = false;

  loading = true;
  saving = false;
  publishing = false;
  autosaveState: 'Al día' | 'Cambios pendientes' | 'Guardando...' = 'Al día';
  error = '';
  message = '';

  inspectorTab: 'layer' | 'sheet' = 'layer';

  // Canva-style Navigation Rails
  toolCategory: ToolCategory = 'fields';
  toolsCollapsed = false;

  passCanvasPresets = PASS_CANVAS_PRESETS;
  zoomOptions = [0.5, 0.75, 1, 1.25, 1.5];

  // Catálogo de Campos Rápidos de Pase
  quickPassFields: QuickPassFieldOption[] = [
    { type: 'qr', label: 'Código QR', icon: '📱', sub: 'Acceso escaneable', token: 'guest.qrCode' },
    { type: 'name', label: 'Nombre Invitado', icon: '👤', sub: '{{guest.name}}', token: 'guest.name' },
    { type: 'table', label: 'Mesa y Asiento', icon: '🍽️', sub: 'Mesa y lugar', token: 'guest.table' },
    { type: 'companions', label: 'Acompañantes', icon: '👥', sub: 'Lugares válidos', token: 'guest.companions' },
    { type: 'code', label: 'Folio Check-in', icon: '🏷️', sub: 'Folio único', token: 'guest.checkInCode' },
    { type: 'title', label: 'Nombre Evento', icon: '✨', sub: 'Título principal', token: 'event.title' },
    { type: 'date', label: 'Fecha y Hora', icon: '📅', sub: 'Día del evento', token: 'event.date' },
    { type: 'venue', label: 'Lugar / Salón', icon: '📍', sub: 'Ubicación recepción', token: 'event.venue' }
  ];

  // Catálogo de Iconos Lucide
  readonly iconCatalog = VISUAL_ICON_CATALOG;
  iconSearch = '';
  iconCategory: 'all' | 'celebracion' | 'evento' | 'comunicacion' | 'servicios' = 'all';

  // Catálogo de Formas Estilo Canva
  readonly shapeCatalog: Array<{ key: ShapeKind; label: string; icon: string; category: 'basic' | 'arch' | 'banner' | 'decorative' | 'divider' }> = [
    { key: 'rectangle', label: 'Rectángulo', icon: '■', category: 'basic' },
    { key: 'rounded', label: 'Suave', icon: '▢', category: 'basic' },
    { key: 'pill', label: 'Pastilla', icon: '⬭', category: 'basic' },
    { key: 'circle', label: 'Círculo', icon: '●', category: 'basic' },
    { key: 'ellipse', label: 'Óvalo', icon: '⬭', category: 'basic' },
    { key: 'triangle', label: 'Triángulo', icon: '▲', category: 'basic' },
    { key: 'diamond', label: 'Rombo', icon: '◆', category: 'basic' },
    { key: 'hexagon', label: 'Hexágono', icon: '⬢', category: 'basic' },
    { key: 'octagon', label: 'Octágono', icon: '🛑', category: 'basic' },
    { key: 'arch', label: 'Arco superior', icon: '☖', category: 'arch' },
    { key: 'arch-inverted', label: 'Arco invertido', icon: '☗', category: 'arch' },
    { key: 'window', label: 'Ventana', icon: '🪟', category: 'arch' },
    { key: 'banner', label: 'Listón', icon: '⚑', category: 'banner' },
    { key: 'pennant', label: 'Banderín', icon: '🚩', category: 'banner' },
    { key: 'ticket', label: 'Pase / Ticket', icon: '🎟️', category: 'banner' },
    { key: 'chevron', label: 'Chevron', icon: '❯', category: 'banner' },
    { key: 'heart', label: 'Corazón', icon: '♥', category: 'decorative' },
    { key: 'star', label: 'Estrella 5p', icon: '★', category: 'decorative' },
    { key: 'star-4', label: 'Destello', icon: '✦', category: 'decorative' },
    { key: 'star-8', label: 'Estrella 8p', icon: '✸', category: 'decorative' },
    { key: 'shield', label: 'Escudo', icon: '🛡️', category: 'decorative' },
    { key: 'clover', label: 'Sello flor', icon: '✿', category: 'decorative' },
    { key: 'line', label: 'Línea dorada', icon: '━', category: 'divider' },
    { key: 'line-diamond', label: 'Línea con rombo', icon: '◈', category: 'divider' }
  ];
  shapeSearch = '';
  shapeCategory: 'all' | 'basic' | 'arch' | 'banner' | 'decorative' | 'divider' = 'all';

  // Marcos de Recorte para Fotos
  readonly imageMasks: Array<{ key: ImageMask; label: string; icon: string }> = [
    { key: 'none', label: 'Original', icon: '▭' },
    { key: 'circle', label: 'Círculo', icon: '●' },
    { key: 'rounded', label: 'Redondeado', icon: '▢' },
    { key: 'arch', label: 'Arco', icon: '∩' },
    { key: 'diamond', label: 'Rombo', icon: '◆' },
    { key: 'hexagon', label: 'Hexágono', icon: '⬢' },
    { key: 'ticket', label: 'Ticket', icon: '◫' }
  ];

  // Buscador web de fotos y biblioteca
  webImageQuery = '';
  webImageOrientation: '' | 'landscape' | 'portrait' | 'squarish' = '';
  webImageResults: WebImageSearchResult[] = [];
  searchingWebImages = false;
  uploadingImage = false;

  // Música / Audio
  audioPlaying = false;
  private audioElement?: HTMLAudioElement;

  // Paletas de Temas de Lujo para Pases
  readonly passThemes = [
    {
      key: 'obsidian',
      name: 'Obsidian Noir & Oro',
      description: 'Lujo misterioso con destellos dorados',
      bg: '#0c121e',
      cardBg: 'rgba(255, 255, 255, 0.05)',
      accent: '#d4af37',
      textColor: '#ffffff',
      subColor: 'rgba(255, 255, 255, 0.8)'
    },
    {
      key: 'champagne',
      name: 'Champagne & Perla',
      description: 'Elegancia clara y sofisticada',
      bg: '#fcfaf7',
      cardBg: '#ffffff',
      accent: '#b38758',
      textColor: '#2c231c',
      subColor: '#706053'
    },
    {
      key: 'emerald',
      name: 'Esmeralda Real',
      description: 'Verde bosque profundo y detalles oro',
      bg: '#081a14',
      cardBg: 'rgba(255, 255, 255, 0.05)',
      accent: '#d4af37',
      textColor: '#ffffff',
      subColor: 'rgba(255, 255, 255, 0.8)'
    },
    {
      key: 'sapphire',
      name: 'Zafiro Midnight',
      description: 'Azul imperial con acentos platino',
      bg: '#08172e',
      cardBg: 'rgba(255, 255, 255, 0.05)',
      accent: '#c09c78',
      textColor: '#ffffff',
      subColor: 'rgba(255, 255, 255, 0.8)'
    },
    {
      key: 'burgundy',
      name: 'Borgoña & Oro Rosa',
      description: 'Romance distinguido y cálido',
      bg: '#200812',
      cardBg: 'rgba(255, 255, 255, 0.05)',
      accent: '#e0a96d',
      textColor: '#ffffff',
      subColor: 'rgba(255, 255, 255, 0.8)'
    },
    {
      key: 'minimal',
      name: 'Minimal Editorial',
      description: 'Estilo galería de arte contemporáneo',
      bg: '#ffffff',
      cardBg: '#f8fafc',
      accent: '#1e293b',
      textColor: '#0f172a',
      subColor: '#64748b'
    }
  ];

  fontGroups = [
    {
      category: '✨ Caligráficas & Cursivas (Bodas / Gala)',
      fonts: [
        { label: 'Great Vibes (Cursiva Clásica)', value: "'Great Vibes', cursive" },
        { label: 'Alex Brush (Firma Elegante)', value: "'Alex Brush', cursive" },
        { label: 'Pinyon Script (Realeza Aristocrática)', value: "'Pinyon Script', cursive" },
        { label: 'Allura (Caligrafía Fina)', value: "'Allura', cursive" },
        { label: 'MonteCarlo (Caligrafía Romántica)', value: "'MonteCarlo', cursive" },
        { label: 'Italianno (Cursiva Delicada)', value: "'Italianno', cursive" },
        { label: 'Parisienne (Romance Francés)', value: "'Parisienne', cursive" },
        { label: 'Dancing Script (Manuscrita Casual)', value: "'Dancing Script', cursive" },
        { label: 'Sacramento (Trazo Chic Continuo)', value: "'Sacramento', cursive" },
        { label: 'Pacifico (Retro Caligráfica)', value: "'Pacifico', cursive" }
      ]
    },
    {
      category: '🏛️ Serif & Clásico Distinguido',
      fonts: [
        { label: 'Cinzel (Romana Imperial)', value: "'Cinzel', serif" },
        { label: 'Cinzel Decorative (Romana Ornamental)', value: "'Cinzel Decorative', serif" },
        { label: 'Playfair Display (Elegante Atemporal)', value: "'Playfair Display', serif" },
        { label: 'Cormorant Garamond (Lujo Editorial)', value: "'Cormorant Garamond', serif" },
        { label: 'Bodoni Moda (Alta Costura / Vogue)', value: "'Bodoni Moda', serif" },
        { label: 'DM Serif Display (Titular Distinguido)', value: "'DM Serif Display', serif" },
        { label: 'Marcellus (Romana Esculpida)', value: "'Marcellus', serif" },
        { label: 'Lora (Serifa Delicada)', value: "'Lora', serif" },
        { label: 'Libre Baskerville (Tradicional Noble)', value: "'Libre Baskerville', serif" }
      ]
    },
    {
      category: '💎 Modernas & Sans-Serif Limpias',
      fonts: [
        { label: 'Montserrat (Moderna Geométrica)', value: "'Montserrat', sans-serif" },
        { label: 'Inter (Minimalista Limpia)', value: "'Inter', sans-serif" },
        { label: 'Poppins (Moderna Equilibrada)', value: "'Poppins', sans-serif" },
        { label: 'Outfit (Vanguardista Premium)', value: "'Outfit', sans-serif" },
        { label: 'Raleway (Sofisticada Fina)', value: "'Raleway', sans-serif" },
        { label: 'Nunito Sans (Amigable y Clara)', value: "'Nunito Sans', sans-serif" },
        { label: 'Quicksand (Redondeada Suave)', value: "'Quicksand', sans-serif" }
      ]
    },
    {
      category: '🏷️ Display & Titulares de Impacto',
      fonts: [
        { label: 'Bebas Neue (Titular Bold Mayúsculas)', value: "'Bebas Neue', sans-serif" },
        { label: 'Abril Fatface (Glamour Titular)', value: "'Abril Fatface', serif" }
      ]
    }
  ];

  get luxuryFonts(): Array<{ label: string; value: string }> {
    return this.fontGroups.flatMap((g) => g.fonts);
  }

  // Drag-and-drop state from palette
  draggedPaletteItem: any = null;

  private history: string[] = [];
  private historyIndex = -1;
  private routeSub?: Subscription;
  private autosaveTimer: any = null;

  private dragState: DragResizeState = {
    isDragging: false,
    isResizing: false,
    startX: 0,
    startY: 0,
    layerStartX: 0,
    layerStartY: 0,
    layerStartW: 0,
    layerStartH: 0
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private confirmDialogService: ConfirmDialogService
  ) {}

  async ngOnInit(): Promise<void> {
    this.routeSub = this.route.paramMap.subscribe(async (params) => {
      this.invitationId = params.get('id') || '';
      if (!this.invitationId) {
        this.error = 'No se especificó un ID de invitación válido.';
        this.loading = false;
        return;
      }
      await this.loadData();
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
    }
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }

  // ═══ GETTERS ═══
  get activeSheet(): VisualInvitationSection | undefined {
    return this.design?.sections?.[this.activeSheetIndex] || this.design?.sections?.[0];
  }

  get selectedLayer(): VisualInvitationLayer | undefined {
    return this.activeSheet?.layers?.find((l) => l.id === this.selectedLayerId);
  }

  getSheetWidth(sheet?: VisualInvitationSection): number {
    if (!sheet) return this.design?.canvasSize?.width || 450;
    const customW = (sheet as any).width ?? sheet.pluginSettings?.['sheetWidth'];
    if (typeof customW === 'number' && customW >= 100 && customW <= 2500) {
      return customW;
    }
    return this.design?.canvasSize?.width || 450;
  }

  getSheetHeight(sheet?: VisualInvitationSection): number {
    if (!sheet) return this.design?.canvasSize?.height || 800;
    const customH = (sheet as any).height ?? sheet.pluginSettings?.['sheetHeight'] ?? sheet.height;
    if (typeof customH === 'number' && customH >= 100 && customH <= 2500) {
      return customH;
    }
    return this.design?.canvasSize?.height || 800;
  }

  getSheetPreset(sheet?: VisualInvitationSection): string {
    if (!sheet) return this.design?.canvasSize?.preset || 'phone-story';
    const preset = (sheet as any).preset ?? sheet.pluginSettings?.['sheetPreset'];
    if (typeof preset === 'string') return preset;
    return this.design?.canvasSize?.preset || 'phone-story';
  }

  get activeSheetPreset(): string {
    return this.getSheetPreset(this.activeSheet);
  }

  get activeSheetWidth(): number {
    return this.getSheetWidth(this.activeSheet);
  }

  get activeSheetHeight(): number {
    return this.getSheetHeight(this.activeSheet);
  }

  get currentPresetKey(): string {
    return this.activeSheetPreset;
  }

  get artboardWidth(): number {
    return this.activeSheetWidth;
  }

  get artboardHeight(): number {
    return this.activeSheetHeight;
  }

  // ═══ COLOR CONTRAST & LUMINANCE HELPERS ═══
  isLightColor(color?: string): boolean {
    if (!color) return false;
    const clean = color.trim().toLowerCase();
    if (clean === 'white' || clean === '#fff' || clean === '#ffffff') return true;
    if (clean === 'black' || clean === '#000' || clean === '#000000') return false;
    if (clean === 'transparent') return false;

    let r = 0, g = 0, b = 0;
    if (clean.startsWith('#')) {
      const hex = clean.slice(1);
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else if (hex.length >= 6) {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
      }
    } else if (clean.startsWith('rgb')) {
      const match = clean.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        r = parseInt(match[1], 10);
        g = parseInt(match[2], 10);
        b = parseInt(match[3], 10);
      }
    }
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55;
  }

  getContrastColor(bgColor?: string): string {
    return this.isLightColor(bgColor) ? '#111827' : '#ffffff';
  }

  getSheetBackgroundColor(sheet?: VisualInvitationSection): string {
    const s = sheet || this.activeSheet;
    if (!s) return '#0b1426';
    if (s.background?.color && s.background.color !== 'transparent') {
      return s.background.color;
    }
    return '#0b1426';
  }

  getDefaultTextColor(sheet?: VisualInvitationSection): string {
    return this.getContrastColor(this.getSheetBackgroundColor(sheet));
  }

  getDefaultSubtextColor(sheet?: VisualInvitationSection): string {
    return this.isLightColor(this.getSheetBackgroundColor(sheet)) ? '#4b5563' : 'rgba(255, 255, 255, 0.85)';
  }

  getDefaultAccentColor(sheet?: VisualInvitationSection): string {
    return this.isLightColor(this.getSheetBackgroundColor(sheet)) ? '#b45309' : '#c9a87c';
  }

  setSheetBackgroundColor(color: string): void {
    if (!this.activeSheet) return;
    const oldBg = this.activeSheet.background?.color || '#0b1426';
    const wasLight = this.isLightColor(oldBg);
    const nowLight = this.isLightColor(color);

    this.activeSheet.background = this.activeSheet.background || {};
    this.activeSheet.background.color = color;
    this.autosaveState = 'Cambios pendientes';

    // Si cambió la luminosidad del fondo (de oscuro a claro o de claro a oscuro),
    // adaptar automáticamente las capas de texto para que sigan teniendo contraste y no se vuelvan invisibles
    if (wasLight !== nowLight && this.activeSheet.layers) {
      for (const layer of this.activeSheet.layers) {
        if (layer.type === 'text' && layer.style) {
          const c = layer.style.color;
          if (nowLight && (!c || c === '#ffffff' || c === '#fff' || c.startsWith('rgba(255, 255, 255') || !this.isLightColor(c))) {
            layer.style.color = '#111827';
          } else if (!nowLight && (!c || c === '#000000' || c === '#000' || c === '#111827' || c === '#0f172a' || this.isLightColor(c))) {
            layer.style.color = '#ffffff';
          }
        }
      }
    }
    this.pushHistory();
  }

  invertSelectedLayerColor(): void {
    if (!this.selectedLayer) return;
    if (!this.selectedLayer.style) this.selectedLayer.style = {};
    const current = this.selectedLayer.style.color || this.getDefaultTextColor(this.activeSheet);
    this.selectedLayer.style.color = this.isLightColor(current) ? '#ffffff' : '#111827';
    this.autosaveState = 'Cambios pendientes';
    this.pushHistory();
  }

  get canUndo(): boolean {
    return this.historyIndex > 0;
  }

  get canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  get filteredIcons(): VisualIconOption[] {
    const q = this.iconSearch ? this.iconSearch.trim().toLowerCase() : '';
    return this.iconCatalog.filter((item) => {
      const catMatch = this.iconCategory === 'all' || item.category === this.iconCategory;
      const qMatch = !q || item.label.toLowerCase().includes(q) || item.keywords.toLowerCase().includes(q) || item.name.toLowerCase().includes(q);
      return catMatch && qMatch;
    });
  }

  get filteredShapes(): Array<{ key: ShapeKind; label: string; icon: string; category: 'basic' | 'arch' | 'banner' | 'decorative' | 'divider' }> {
    const q = this.shapeSearch ? this.shapeSearch.trim().toLowerCase() : '';
    return this.shapeCatalog.filter((s) => {
      const catMatch = this.shapeCategory === 'all' || s.category === this.shapeCategory;
      const searchMatch = !q || s.label.toLowerCase().includes(q) || s.key.toLowerCase().includes(q);
      return catMatch && searchMatch;
    });
  }

  get mediaLibrary(): string[] {
    const set = new Set<string>();
    if (this.invitation?.content?.coverImageUrl) set.add(this.invitation.content.coverImageUrl);
    for (const url of this.invitation?.content?.gallery || []) {
      if (url) set.add(url);
    }
    const ext = this.event?.externalContent;
    if (ext?.coverImageUrl) set.add(ext.coverImageUrl);
    if (ext?.heroImageUrl) set.add(ext.heroImageUrl);
    for (const url of ext?.gallery || []) {
      if (url) set.add(url);
    }
    for (const asset of this.design?.assets || []) {
      if (asset?.url) set.add(asset.url);
    }
    return Array.from(set);
  }

  get eventMusicUrl(): string | undefined {
    return this.invitation?.content?.musicUrl || (this.event as any)?.musicUrl || (this.event?.externalContent as any)?.musicUrl;
  }

  // ═══ DATA LOADING ═══
  async loadData(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      const invRes = await firstValueFrom(this.apiService.listInvitations());
      this.invitation = invRes.invitations.find((item) => (item._id || item.id) === this.invitationId);
      if (!this.invitation) {
        this.error = 'Invitación no encontrada.';
        this.loading = false;
        return;
      }
      const eventId = typeof this.invitation.event === 'string' ? this.invitation.event : (this.invitation.event as any)?._id;

      if (eventId) {
        try {
          const evRes = await firstValueFrom(this.apiService.getEvent(eventId));
          this.event = evRes.event;
          const guestsRes = await firstValueFrom(this.apiService.listGuests(eventId));
          this.guests = guestsRes.guests || [];
          if (this.guests.length > 0) {
            this.previewGuest = this.guests[0];
          }
        } catch {
          // No bloquea el editor
        }
      }

      this.initPassDesign();
      this.pushHistory();
      this.loading = false;
    } catch (err: any) {
      this.error = err?.error?.message || 'Error al cargar la invitación.';
      this.loading = false;
    }
  }

  private initPassDesign(): void {
    const rawContent: any = this.invitation?.content || {};
    let existing = rawContent.passDesignDraft || rawContent.passDesign;

    // Respaldo de seguridad local: si la BD no lo tiene o falló la conexión previa, recuperar del almacenamiento local
    if (!existing) {
      try {
        const local = localStorage.getItem(`pass_draft_${this.invitationId}`);
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed && Array.isArray(parsed.sections) && parsed.sections.length > 0) {
            existing = parsed;
          }
        }
      } catch {}
    }

    // A valid pass design MUST only contain passSheet sections
    const isPurePass =
      existing &&
      existing.sections &&
      existing.sections.length > 0 &&
      existing.sections.every((s: any) => s.type === 'passSheet');

    if (isPurePass) {
      this.design = JSON.parse(JSON.stringify(existing));
      this.design.documentType = 'pass';
      if (!this.design.canvasSize) {
        this.design.canvasSize = {
          preset: 'phone-story',
          name: 'Pase Móvil / WhatsApp (9:16)',
          width: 450,
          height: 800,
          unit: 'px',
          orientation: 'portrait'
        };
      }
    } else {
      this.design = buildDefaultPassDesign(this.invitation, this.event, (p) => this.uid(p), () => this.inferTheme());
    }

    if (this.activeSheetIndex >= this.design.sections.length) {
      this.activeSheetIndex = 0;
    }

    // Garantizar legibilidad: si alguna hoja tiene fondo claro y textos en blanco, corregir automáticamente
    for (const sheet of this.design.sections || []) {
      const isLight = this.isLightColor(sheet.background?.color);
      for (const layer of sheet.layers || []) {
        if (layer.type === 'text') {
          if (!layer.style) layer.style = {};
          const c = layer.style.color;
          if (isLight && (!c || c === '#ffffff' || c === '#fff' || c.startsWith('rgba(255, 255, 255'))) {
            layer.style.color = '#111827';
          }
        }
      }
    }
  }

  async resetToDefaultPassTemplate(): Promise<void> {
    const ok = await this.confirmDialogService.confirm({
      title: 'Restablecer Plantilla del Pase',
      message: '¿Deseas reemplazar el diseño actual del pase por la plantilla VIP oficial (Frente y Reverso)? Podrás deshacer este cambio.',
      confirmText: 'Restablecer',
      cancelText: 'Cancelar'
    });
    if (!ok) return;
    this.design = buildDefaultPassDesign(this.invitation, this.event, (p) => this.uid(p), () => this.inferTheme());
    this.activeSheetIndex = 0;
    this.pushHistory();
    this.flash('Plantilla VIP oficial restaurada.');
  }

  private inferTheme(): NonNullable<VisualInvitationDesign['theme']> {
    return {
      backgroundColor: '#0b1426',
      textColor: '#ffffff',
      accentColor: '#c9a87c',
      headingFont: "'Playfair Display', serif",
      bodyFont: 'Montserrat, sans-serif',
      buttonBackgroundColor: '#c9a87c',
      buttonTextColor: '#0b1426',
      buttonStyle: 'solid',
      buttonRadius: 12
    };
  }

  uid(prefix = 'id'): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  // ═══ HISTORY / UNDO / REDO ═══
  private pushHistory(): void {
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    this.history.push(JSON.stringify(this.design));
    if (this.history.length > 30) this.history.shift();
    this.historyIndex = this.history.length - 1;
    this.autosaveState = 'Cambios pendientes';
    this.scheduleAutosave();
  }

  private scheduleAutosave(): void {
    // Respaldo inmediato en localStorage para tolerancia ante recargas repentinas
    try {
      if (this.invitationId && this.design) {
        localStorage.setItem(`pass_draft_${this.invitationId}`, JSON.stringify(this.design));
      }
    } catch {}

    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
    }
    this.autosaveTimer = setTimeout(() => {
      if (this.autosaveState === 'Cambios pendientes' && !this.saving && !this.publishing) {
        this.saveDraft(true);
      }
    }, 3500);
  }

  undo(): void {
    if (!this.canUndo) return;
    this.historyIndex--;
    this.design = JSON.parse(this.history[this.historyIndex]);
    if (this.activeSheetIndex >= this.design.sections.length) this.activeSheetIndex = 0;
  }

  redo(): void {
    if (!this.canRedo) return;
    this.historyIndex++;
    this.design = JSON.parse(this.history[this.historyIndex]);
    if (this.activeSheetIndex >= this.design.sections.length) this.activeSheetIndex = 0;
  }

  // ═══ CANVAS SIZING & PRESETS (Independientes por Hoja / Card) ═══
  setCanvasPreset(presetKey: string, applyToAll = false): void {
    const found = this.passCanvasPresets.find((p) => p.preset === presetKey);
    if (!found) return;

    if (presetKey === 'custom') {
      const currentW = this.getSheetWidth(this.activeSheet);
      const currentH = this.getSheetHeight(this.activeSheet);
      if (applyToAll || !this.activeSheet) {
        if (this.design.canvasSize) {
          this.design.canvasSize.preset = 'custom';
        }
        for (const sec of this.design.sections) {
          sec.pluginSettings = sec.pluginSettings || {};
          sec.pluginSettings['sheetPreset'] = 'custom';
        }
      } else {
        const sec = this.activeSheet;
        sec.pluginSettings = sec.pluginSettings || {};
        sec.pluginSettings['sheetPreset'] = 'custom';
        sec.pluginSettings['sheetWidth'] = currentW;
        sec.pluginSettings['sheetHeight'] = currentH;
        sec.height = currentH;
        if (this.design.canvasSize) {
          this.design.canvasSize.width = currentW;
          this.design.canvasSize.height = currentH;
          this.design.canvasSize.preset = 'custom';
        }
      }
      this.pushHistory();
      return;
    }

    if (applyToAll || !this.activeSheet) {
      this.design.canvasSize = {
        preset: found.preset,
        name: found.label,
        width: found.width,
        height: found.height,
        unit: found.unit,
        orientation: found.orientation
      };
      for (const sec of this.design.sections) {
        sec.height = found.height;
        sec.pluginSettings = sec.pluginSettings || {};
        sec.pluginSettings['sheetWidth'] = found.width;
        sec.pluginSettings['sheetHeight'] = found.height;
        sec.pluginSettings['sheetPreset'] = found.preset;
      }
    } else {
      const sec = this.activeSheet;
      sec.height = found.height;
      sec.pluginSettings = sec.pluginSettings || {};
      sec.pluginSettings['sheetWidth'] = found.width;
      sec.pluginSettings['sheetHeight'] = found.height;
      sec.pluginSettings['sheetPreset'] = found.preset;
      if (this.design.canvasSize) {
        this.design.canvasSize.width = found.width;
        this.design.canvasSize.height = found.height;
        this.design.canvasSize.preset = found.preset;
      }
    }
    this.pushHistory();
  }

  setCustomWidth(width: any, applyToAll = false): void {
    const num = typeof width === 'number' ? width : parseInt(width, 10);
    if (isNaN(num)) return;
    const w = Math.max(100, Math.min(2500, num));

    if (applyToAll || !this.activeSheet) {
      if (this.design.canvasSize) {
        this.design.canvasSize.width = w;
        this.design.canvasSize.preset = 'custom';
      }
      for (const sec of this.design.sections) {
        sec.pluginSettings = sec.pluginSettings || {};
        sec.pluginSettings['sheetWidth'] = w;
        sec.pluginSettings['sheetPreset'] = 'custom';
      }
    } else {
      const sec = this.activeSheet;
      sec.pluginSettings = sec.pluginSettings || {};
      sec.pluginSettings['sheetWidth'] = w;
      sec.pluginSettings['sheetPreset'] = 'custom';
      if (this.design.canvasSize) {
        this.design.canvasSize.width = w;
        this.design.canvasSize.preset = 'custom';
      }
    }
    this.pushHistory();
  }

  setCustomHeight(height: any, applyToAll = false): void {
    const num = typeof height === 'number' ? height : parseInt(height, 10);
    if (isNaN(num)) return;
    const h = Math.max(100, Math.min(2500, num));

    if (applyToAll || !this.activeSheet) {
      if (this.design.canvasSize) {
        this.design.canvasSize.height = h;
        this.design.canvasSize.preset = 'custom';
      }
      for (const sec of this.design.sections) {
        sec.height = h;
        sec.pluginSettings = sec.pluginSettings || {};
        sec.pluginSettings['sheetHeight'] = h;
        sec.pluginSettings['sheetPreset'] = 'custom';
      }
    } else {
      const sec = this.activeSheet;
      sec.height = h;
      sec.pluginSettings = sec.pluginSettings || {};
      sec.pluginSettings['sheetHeight'] = h;
      sec.pluginSettings['sheetPreset'] = 'custom';
      if (this.design.canvasSize) {
        this.design.canvasSize.height = h;
        this.design.canvasSize.preset = 'custom';
      }
    }
    this.pushHistory();
  }

  applyActiveSheetSizeToAll(): void {
    if (!this.activeSheet) return;
    const w = this.getSheetWidth(this.activeSheet);
    const h = this.getSheetHeight(this.activeSheet);
    const preset = this.getSheetPreset(this.activeSheet);

    if (this.design.canvasSize) {
      this.design.canvasSize.width = w;
      this.design.canvasSize.height = h;
      this.design.canvasSize.preset = preset;
    }

    for (const sec of this.design.sections) {
      sec.height = h;
      sec.pluginSettings = sec.pluginSettings || {};
      sec.pluginSettings['sheetWidth'] = w;
      sec.pluginSettings['sheetHeight'] = h;
      sec.pluginSettings['sheetPreset'] = preset;
    }
    this.pushHistory();
    this.flash(`Formato (${w} × ${h} px) aplicado a todas las hojas.`);
  }

  setZoom(zoom: number): void {
    this.canvasZoom = zoom;
  }

  // ═══ SHEETS MANAGEMENT ═══
  selectSheet(index: number): void {
    if (index >= 0 && index < this.design.sections.length) {
      this.activeSheetIndex = index;
      this.selectedLayerId = '';
      if (this.design.canvasSize && this.activeSheet) {
        this.design.canvasSize.width = this.getSheetWidth(this.activeSheet);
        this.design.canvasSize.height = this.getSheetHeight(this.activeSheet);
        this.design.canvasSize.preset = this.getSheetPreset(this.activeSheet);
      }
    }
  }

  addSheet(): void {
    const w = this.getSheetWidth(this.activeSheet);
    const h = this.getSheetHeight(this.activeSheet);
    const preset = this.getSheetPreset(this.activeSheet);
    const newIdx = this.design.sections.length + 1;
    const newSheet: VisualInvitationSection = {
      id: this.uid('sheet'),
      type: 'passSheet',
      title: `Hoja ${newIdx}`,
      enabled: true,
      layout: 'canvas',
      height: h,
      background: { color: this.activeSheet?.background?.color || '#0b1426', overlay: 0 },
      pluginSettings: {
        sheetWidth: w,
        sheetHeight: h,
        sheetPreset: preset
      },
      layers: [
        createPassLayer(
          (p) => this.uid(p),
          'shape',
          'Marco de Tarjeta',
          5, 3, 90, 94, 1,
          {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderColor: '#c9a87c',
            borderWidth: 1.5,
            borderRadius: 20
          }
        )
      ]
    };
    this.design.sections = [...this.design.sections, newSheet];
    this.activeSheetIndex = this.design.sections.length - 1;
    this.pushHistory();
  }

  duplicateSheet(index: number): void {
    const src = this.design.sections[index];
    if (!src) return;
    const cloned: VisualInvitationSection = JSON.parse(JSON.stringify(src));
    cloned.id = this.uid('sheet');
    cloned.title = `${src.title || 'Hoja'} (Copia)`;
    cloned.layers = (cloned.layers || []).map((l) => ({ ...l, id: this.uid('layer') }));
    this.design.sections.splice(index + 1, 0, cloned);
    this.activeSheetIndex = index + 1;
    this.pushHistory();
  }

  async promptRenameSheet(index: number): Promise<void> {
    const sheet = this.design.sections[index];
    if (!sheet) return;
    const name = window.prompt('Nuevo nombre para esta hoja del pase:', sheet.title);
    if (name && name.trim()) {
      sheet.title = name.trim();
      this.pushHistory();
    }
  }

  async deleteSheet(index: number, event?: MouseEvent): Promise<void> {
    if (event) {
      event.stopPropagation();
    }
    if (this.design.sections.length <= 1) {
      this.flash('El pase debe tener al menos una cara / hoja.');
      return;
    }
    const targetTitle = this.design.sections[index]?.title || `Hoja ${index + 1}`;
    const confirmed = await this.confirmDialogService.confirm({
      title: 'Eliminar Hoja del Pase',
      message: `¿Estás seguro de eliminar "${targetTitle}"? Se perderán todas las capas contenidas en esta hoja.`
    });
    if (!confirmed) return;

    this.design.sections.splice(index, 1);
    this.selectedLayerId = '';
    if (this.activeSheetIndex >= this.design.sections.length) {
      this.activeSheetIndex = Math.max(0, this.design.sections.length - 1);
    }
    this.pushHistory();
    this.flash(`Hoja "${targetTitle}" eliminada.`);
  }

  setViewMode(mode: 'single' | 'all'): void {
    this.viewMode = mode;
  }

  // ═══ SHAPES & CLIP-PATHS (Canva-inspired) ═══
  shapeClipPath(kind?: string): string {
    const shapes: Record<string, string> = {
      rectangle: 'none',
      rounded: 'inset(0 round 12px)',
      pill: 'inset(0 round 9999px)',
      circle: 'circle(50% at 50% 50%)',
      ellipse: 'ellipse(50% 42% at 50% 50%)',
      arch: 'inset(0 round 50% 50% 0 0)',
      'arch-inverted': 'inset(0 round 0 0 50% 50%)',
      window: 'inset(0 round 48% 48% 6% 6%)',
      triangle: 'polygon(50% 0, 100% 100%, 0 100%)',
      diamond: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
      hexagon: 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)',
      octagon: 'polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%)',
      star: 'polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 93%, 50% 72%, 21% 93%, 32% 57%, 2% 35%, 39% 35%)',
      'star-4': 'polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%)',
      'star-8': 'polygon(50% 0, 65% 20%, 85% 15%, 80% 35%, 100% 50%, 80% 65%, 85% 85%, 65% 80%, 50% 100%, 35% 80%, 15% 85%, 20% 65%, 0 50%, 20% 35%, 15% 15%, 35% 20%)',
      heart: 'polygon(50% 88%, 35% 73%, 20% 58%, 10% 42%, 8% 26%, 16% 12%, 30% 8%, 42% 14%, 50% 26%, 58% 14%, 70% 8%, 84% 12%, 92% 26%, 90% 42%, 80% 58%, 65% 73%)',
      shield: 'polygon(0 0, 100% 0, 100% 60%, 50% 100%, 0 60%)',
      ticket: 'polygon(0 0, 100% 0, 100% 38%, 92% 50%, 100% 62%, 100% 100%, 0 100%, 0 62%, 8% 50%, 0 38%)',
      banner: 'polygon(100% 0, 90% 50%, 100% 100%, 0 100%, 10% 50%, 0 0)',
      pennant: 'polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)',
      chevron: 'polygon(75% 0, 100% 50%, 75% 100%, 0 100%, 25% 50%, 0 0)',
      clover: 'polygon(50% 0, 65% 8%, 80% 0, 92% 12%, 92% 28%, 100% 40%, 98% 56%, 92% 70%, 92% 86%, 80% 98%, 65% 90%, 50% 100%, 35% 90%, 20% 98%, 8% 86%, 8% 70%, 2% 56%, 0 40%, 8% 28%, 8% 12%, 20% 0, 35% 8%)',
      line: 'inset(42% 0)',
      'line-diamond': 'polygon(0 46%, 45% 46%, 50% 15%, 55% 46%, 100% 46%, 100% 54%, 55% 54%, 50% 85%, 45% 54%, 0 54%)'
    };
    return shapes[kind || 'rectangle'] || 'none';
  }

  addShape(kind: ShapeKind): void {
    if (!this.activeSheet) return;
    const isLine = kind === 'line' || kind === 'line-diamond';
    const width = isLine ? 60 : 30;
    const height = isLine ? 2 : 20;
    const layer = createPassLayer(
      (p) => this.uid(p),
      'shape',
      `Forma ${kind}`,
      (100 - width) / 2,
      40,
      width,
      height,
      (this.activeSheet.layers?.length || 0) + 1,
      {
        backgroundColor: '#c9a87c',
        shapeKind: kind,
        clipPath: this.shapeClipPath(kind),
        opacity: 0.9
      }
    );
    this.activeSheet.layers = [...(this.activeSheet.layers || []), layer];
    this.selectLayer(layer);
    this.pushHistory();
  }

  setShapeKind(layer: VisualInvitationLayer, kind: ShapeKind): void {
    if (!layer.style) layer.style = {};
    layer.style.shapeKind = kind;
    layer.style.clipPath = this.shapeClipPath(kind);
    this.pushHistory();
  }

  // ═══ ICONS ═══
  addIcon(icon: VisualIconOption): void {
    if (!this.activeSheet) return;
    const layer = createPassLayer(
      (p) => this.uid(p),
      'text',
      `Icono ${icon.label}`,
      40, 40, 20, 8,
      (this.activeSheet.layers?.length || 0) + 1,
      {
        fontSize: 28,
        textAlign: 'center',
        color: '#c9a87c'
      },
      { text: icon.label }
    );
    // Mark as icon binding
    layer.binding = `icon.${icon.name}`;
    this.activeSheet.layers = [...(this.activeSheet.layers || []), layer];
    this.selectLayer(layer);
    this.pushHistory();
  }

  // ═══ TEXT PRESETS (Canva-inspired) ═══
  addHeadingText(): void {
    const color = this.getDefaultTextColor(this.activeSheet);
    this.addCustomText('TÍTULO PRINCIPAL', 28, '700', "'Playfair Display', serif", color, 84, 8);
  }

  addSubheadingText(): void {
    const color = this.getDefaultAccentColor(this.activeSheet);
    this.addCustomText('Subtítulo Elegante', 16, '600', 'Montserrat, sans-serif', color, 80, 5);
  }

  addBodyText(): void {
    const color = this.getDefaultSubtextColor(this.activeSheet);
    this.addCustomText('Texto de cuerpo con detalles e información del pase.', 13, '400', 'Inter, sans-serif', color, 80, 6);
  }

  addCursiveText(): void {
    const color = this.getDefaultAccentColor(this.activeSheet);
    this.addCustomText('Familia González', 26, '400', "'Great Vibes', cursive", color, 80, 7);
  }

  addBadgeText(): void {
    const color = this.getDefaultAccentColor(this.activeSheet);
    this.addCustomText('★ ACCESO EXCLUSIVO VIP ★', 11, '700', 'Montserrat, sans-serif', color, 70, 4, 2);
  }

  private addCustomText(
    text: string,
    fontSize: number,
    fontWeight: string,
    fontFamily: string,
    color: string,
    width: number,
    height: number,
    letterSpacing = 0
  ): void {
    if (!this.activeSheet) return;
    const layer = createPassLayer(
      (p) => this.uid(p),
      'text',
      text.slice(0, 18),
      (100 - width) / 2,
      40,
      width,
      height,
      (this.activeSheet.layers?.length || 0) + 1,
      {
        fontSize,
        fontWeight,
        fontFamily,
        color,
        letterSpacing,
        textAlign: 'center'
      },
      { text }
    );
    this.activeSheet.layers = [...(this.activeSheet.layers || []), layer];
    this.selectLayer(layer);
    this.pushHistory();
  }

  // ═══ IMAGES & MEDIA ═══
  addImageLayer(url = 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80', mask: ImageMask = 'none', name = 'Imagen'): void {
    if (!this.activeSheet) return;
    const layer = createPassLayer(
      (p) => this.uid(p),
      'image',
      name,
      25, 30, 50, 30,
      (this.activeSheet.layers?.length || 0) + 1,
      {
        borderRadius: mask === 'circle' ? 999 : (mask === 'rounded' ? 16 : 8),
        clipPath: this.shapeClipPath(mask === 'none' ? undefined : mask),
        objectFit: 'cover'
      },
      { url }
    );
    this.activeSheet.layers = [...(this.activeSheet.layers || []), layer];
    this.selectLayer(layer);
    this.pushHistory();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.readAndInsertImageFile(file);
    input.value = '';
  }

  searchWebImages(): void {
    const q = this.webImageQuery?.trim();
    if (!q) return;
    this.searchingWebImages = true;
    this.apiService.searchWebImages(q, this.webImageOrientation || undefined).subscribe({
      next: (res) => {
        this.webImageResults = res.images || [];
        this.searchingWebImages = false;
      },
      error: () => {
        this.searchingWebImages = false;
      }
    });
  }

  addWebImage(item: WebImageSearchResult): void {
    this.addImageLayer(item.url, 'none', item.alt || 'Foto Web');
  }

  // ═══ THEMES & BACKGROUNDS ═══
  applyPassTheme(themeKey: string, toAllSheets = true): void {
    const t = this.passThemes.find((th) => th.key === themeKey);
    if (!t) return;

    const targets = toAllSheets ? this.design.sections : [this.activeSheet].filter(Boolean) as VisualInvitationSection[];
    const isNowLight = this.isLightColor(t.bg);
    for (const sheet of targets) {
      sheet.background = { color: t.bg, overlay: 0 };
      // Ajustar marco o capas de forma que sirvan de fondo y adaptar textos
      for (const layer of sheet.layers || []) {
        if (layer.name?.toLowerCase().includes('fondo') || layer.name?.toLowerCase().includes('tarjeta') || layer.name?.toLowerCase().includes('marco')) {
          if (layer.style) {
            layer.style.backgroundColor = t.cardBg;
            layer.style.borderColor = t.accent;
          }
        } else if (layer.type === 'text' && layer.style) {
          const c = layer.style.color;
          if (isNowLight && (!c || c === '#ffffff' || c === '#fff' || c.startsWith('rgba(255, 255, 255') || !this.isLightColor(c))) {
            layer.style.color = t.textColor || '#111827';
          } else if (!isNowLight && (!c || c === '#000000' || c === '#000' || c === '#111827' || this.isLightColor(c))) {
            layer.style.color = t.textColor || '#ffffff';
          }
        }
      }
    }
    this.pushHistory();
    this.flash(`Tema "${t.name}" aplicado.`);
  }

  // ═══ MUSIC & AUDIO ═══
  togglePlayMusic(): void {
    const url = this.eventMusicUrl;
    if (!url) {
      this.flash('No hay música configurada en este evento.');
      return;
    }
    if (this.audioPlaying && this.audioElement) {
      this.audioElement.pause();
      this.audioPlaying = false;
    } else {
      if (!this.audioElement) {
        this.audioElement = new Audio(url);
        this.audioElement.onended = () => { this.audioPlaying = false; };
      } else {
        this.audioElement.src = url;
      }
      this.audioElement.play().catch(() => {});
      this.audioPlaying = true;
    }
  }

  addMusicButtonLayer(): void {
    if (!this.activeSheet) return;
    const layer = createPassLayer(
      (p) => this.uid(p),
      'button',
      'Control de Música',
      74, 5, 21, 6,
      (this.activeSheet.layers?.length || 0) + 1,
      {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderColor: '#c9a87c',
        borderWidth: 1,
        borderRadius: 999,
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center'
      },
      { text: '♪ Música' }
    );
    this.activeSheet.layers = [...(this.activeSheet.layers || []), layer];
    this.selectLayer(layer);
    this.pushHistory();
    this.flash('Control de música agregado.');
  }

  // ═══ CANVA ALIGNMENT & LAYER ACTIONS ═══
  alignSelectedLayer(direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): void {
    const layer = this.selectedLayer;
    if (!layer || layer.locked) return;
    switch (direction) {
      case 'left': layer.x = 5; break;
      case 'center': layer.x = Math.max(0, Math.round((100 - layer.width) / 2)); break;
      case 'right': layer.x = Math.max(0, 95 - layer.width); break;
      case 'top': layer.y = 5; break;
      case 'middle': layer.y = Math.max(0, Math.round((100 - layer.height) / 2)); break;
      case 'bottom': layer.y = Math.max(0, 95 - layer.height); break;
    }
    this.pushHistory();
  }

  bringToFront(): void {
    if (!this.selectedLayer || !this.activeSheet?.layers) return;
    const maxZ = Math.max(...this.activeSheet.layers.map((l) => l.zIndex || 1), 1);
    this.selectedLayer.zIndex = maxZ + 1;
    this.pushHistory();
  }

  sendToBack(): void {
    if (!this.selectedLayer || !this.activeSheet?.layers) return;
    const minZ = Math.min(...this.activeSheet.layers.map((l) => l.zIndex || 1), 1);
    this.selectedLayer.zIndex = Math.max(1, minZ - 1);
    this.pushHistory();
  }

  toggleLockLayer(layer?: VisualInvitationLayer): void {
    const l = layer || this.selectedLayer;
    if (!l) return;
    l.locked = !l.locked;
    this.pushHistory();
  }

  toggleLockSelectedLayer(): void {
    this.toggleLockLayer();
  }

  toggleHideLayer(layer?: VisualInvitationLayer): void {
    const l = layer || this.selectedLayer;
    if (!l) return;
    l.hidden = !l.hidden;
    this.pushHistory();
  }

  toggleHideSelectedLayer(): void {
    this.toggleHideLayer();
  }

  // ═══ DRAG & DROP FROM PALETTE ONTO CANVAS ═══
  beginPaletteDrag(event: DragEvent, item: any): void {
    this.draggedPaletteItem = item;
    if (event.dataTransfer) {
      event.dataTransfer.setData('application/json', JSON.stringify(item));
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  endPaletteDrag(): void {
    this.draggedPaletteItem = null;
  }

  onCanvasDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  onCanvasDrop(event: DragEvent, sheet: VisualInvitationSection): void {
    event.preventDefault();

    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const xPct = Math.min(85, Math.max(5, Math.round(((event.clientX - rect.left) / rect.width) * 100)));
    const yPct = Math.min(85, Math.max(5, Math.round(((event.clientY - rect.top) / rect.height) * 100)));

    // Si se arrastraron archivos desde el escritorio o explorador (ej. imágenes)
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type && file.type.startsWith('image/')) {
          this.readAndInsertImageFile(file, xPct, yPct);
          return;
        }
      }
    }

    if (!this.draggedPaletteItem && !event.dataTransfer?.getData('application/json')) return;
    let item = this.draggedPaletteItem;
    if (!item && event.dataTransfer) {
      try {
        item = JSON.parse(event.dataTransfer.getData('application/json'));
      } catch {}
    }
    this.draggedPaletteItem = null;
    if (!item) return;

    if (item.kind === 'field') {
      this.addQuickField(item.field, xPct, yPct);
    } else if (item.kind === 'shape') {
      this.addShape(item.shape);
    } else if (item.kind === 'icon') {
      this.addIcon(item.icon);
    }
  }

  // ═══ CANVA EXPORT (PNG / PDF) ═══
  async exportPass(format: 'png' | 'pdf' = 'png'): Promise<void> {
    const cardEl = document.querySelector('.vpe-card-sheet.active-sheet') as HTMLElement;
    if (!cardEl) return;
    this.exporting = true;
    try {
      const canvas = await html2canvas(cardEl, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null
      });
      if (format === 'png') {
        const link = document.createElement('a');
        const guestName = this.previewGuest?.name?.replace(/\s+/g, '_') || 'Invitado';
        link.download = `Pase-VIP-${guestName}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        this.flash('✨ Pase VIP descargado en alta resolución.');
      } else {
        const imgData = canvas.toDataURL('image/png');
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Imprimir Pase VIP - ${this.previewGuest?.name || 'Invitado'}</title>
                <style>
                  @page { size: auto; margin: 10mm; }
                  body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #fff; font-family: sans-serif; }
                  img { max-width: 100%; max-height: 95vh; object-fit: contain; }
                </style>
              </head>
              <body onload="window.print()">
                <img src="${imgData}" />
              </body>
            </html>
          `);
          printWindow.document.close();
        }
      }
    } catch {
      this.error = 'No se pudo exportar la imagen del pase.';
    } finally {
      this.exporting = false;
    }
  }

  // ═══ ELEMENT SELECTION & LAYER EDITING ═══
  selectLayer(layer: VisualInvitationLayer, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.selectedLayerId = layer.id;
    this.inspectorTab = 'layer';
  }

  deselectAll(): void {
    this.selectedLayerId = '';
  }

  addTextLayer(): void {
    const color = this.getDefaultTextColor(this.activeSheet);
    this.addCustomText('Escribe tu texto aquí', 16, '400', 'Inter, sans-serif', color, 80, 6);
  }

  addShapeLayer(kind: 'card' | 'line'): void {
    if (!this.activeSheet) return;
    const isLine = kind === 'line';
    const layer = createPassLayer(
      (p) => this.uid(p),
      'shape',
      isLine ? 'Línea divisoria' : 'Contenedor Tarjeta',
      isLine ? 15 : 10,
      40,
      isLine ? 70 : 80,
      isLine ? 2 : 25,
      (this.activeSheet.layers?.length || 0) + 1,
      {
        backgroundColor: isLine ? '#c9a87c' : 'rgba(255, 255, 255, 0.08)',
        borderColor: '#c9a87c',
        borderWidth: isLine ? 0 : 1,
        borderRadius: isLine ? 0 : 12
      }
    );
    this.activeSheet.layers = [...(this.activeSheet.layers || []), layer];
    this.selectLayer(layer);
    this.pushHistory();
  }

  addQuickField(field: QuickPassFieldOption, atX = 10, atY = 40): void {
    if (!this.activeSheet) return;
    const uid = (p: string) => this.uid(p);
    const zIndex = (this.activeSheet.layers?.length || 0) + 1;

    let layer: VisualInvitationLayer;
    switch (field.type) {
      case 'qr':
        layer = createPassLayer(uid, 'image', 'Código QR Dinámico', 30, atY, 40, 22, zIndex, {
          borderRadius: 8
        }, {
          binding: 'pass.qrCode',
          url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=VIP-DEMO'
        });
        break;
      case 'name':
        layer = createPassLayer(uid, 'text', 'Nombre del Invitado', atX, atY, 80, 6, zIndex, {
          color: this.getDefaultTextColor(this.activeSheet),
          fontSize: 22,
          fontWeight: '800',
          textAlign: 'center'
        }, { text: '{{guest.name}}' });
        break;
      case 'table':
        layer = createPassLayer(uid, 'text', 'Mesa y Asiento', atX, atY, 80, 5, zIndex, {
          color: this.getDefaultAccentColor(this.activeSheet),
          fontSize: 14,
          fontWeight: '600',
          textAlign: 'center'
        }, { text: 'Mesa: {{guest.table}}  ·  Asiento: {{guest.seat}}' });
        break;
      case 'companions':
        layer = createPassLayer(uid, 'text', 'Acompañantes', atX, atY, 80, 4, zIndex, {
          color: this.getDefaultAccentColor(this.activeSheet),
          fontSize: 13,
          fontWeight: '600',
          textAlign: 'center'
        }, { text: 'Válido por {{guest.companions}} personas' });
        break;
      case 'code':
        layer = createPassLayer(uid, 'text', 'Folio de Check-in', atX, atY, 60, 4, zIndex, {
          color: this.isLightColor(this.getSheetBackgroundColor(this.activeSheet)) ? '#6b7280' : 'rgba(255, 255, 255, 0.5)',
          fontSize: 11,
          textAlign: 'center',
          letterSpacing: 1.5
        }, { text: 'Folio: #{{guest.checkInCode}}' });
        break;
      case 'title':
        layer = createPassLayer(uid, 'text', 'Título del Evento', atX, atY, 80, 8, zIndex, {
          color: this.getDefaultTextColor(this.activeSheet),
          fontSize: 24,
          fontWeight: '700',
          textAlign: 'center',
          fontFamily: "'Playfair Display', serif"
        }, { text: '{{event.title}}' });
        break;
      case 'date':
        layer = createPassLayer(uid, 'text', 'Fecha y Hora', atX, atY, 80, 4, zIndex, {
          color: this.getDefaultSubtextColor(this.activeSheet),
          fontSize: 13,
          textAlign: 'center'
        }, { text: '{{event.date}} · {{event.time}}' });
        break;
      case 'venue':
        layer = createPassLayer(uid, 'text', 'Lugar del Evento', atX, atY, 80, 5, zIndex, {
          color: this.getDefaultSubtextColor(this.activeSheet),
          fontSize: 13,
          textAlign: 'center'
        }, { text: '{{event.venue}}' });
        break;
      default:
        return;
    }

    this.activeSheet.layers = [...(this.activeSheet.layers || []), layer];
    this.selectLayer(layer);
    this.pushHistory();
  }

  copySelectedLayer(): void {
    if (!this.selectedLayer) return;
    this.clipboardLayer = JSON.parse(JSON.stringify(this.selectedLayer));
    this.flash(`Capa "${this.selectedLayer.name || 'Capa'}" copiada (Ctrl+C).`);
  }

  pasteLayer(): void {
    if (!this.activeSheet || !this.clipboardLayer) return;
    const cloned: VisualInvitationLayer = JSON.parse(JSON.stringify(this.clipboardLayer));
    cloned.id = this.uid('layer');
    cloned.name = `${cloned.name || 'Capa'} (Copia)`;
    cloned.x = Math.min(90, (cloned.x || 0) + 4);
    cloned.y = Math.min(90, (cloned.y || 0) + 4);
    cloned.zIndex = (this.activeSheet.layers?.length || 0) + 1;
    this.activeSheet.layers = [...(this.activeSheet.layers || []), cloned];
    this.selectLayer(cloned);
    this.pushHistory();
    this.flash(`Capa "${cloned.name}" pegada.`);
  }

  duplicateLayer(layerId: string): void {
    if (!this.activeSheet?.layers) return;
    const src = this.activeSheet.layers.find((l) => l.id === layerId);
    if (!src) return;
    const cloned: VisualInvitationLayer = JSON.parse(JSON.stringify(src));
    cloned.id = this.uid('layer');
    cloned.name = `${src.name || 'Capa'} (Copia)`;
    cloned.x = Math.min(90, (src.x || 0) + 3);
    cloned.y = Math.min(90, (src.y || 0) + 3);
    cloned.zIndex = (this.activeSheet.layers.length || 0) + 1;
    this.activeSheet.layers.push(cloned);
    this.selectLayer(cloned);
    this.pushHistory();
  }

  deleteLayer(layerId: string): void {
    if (!this.activeSheet?.layers) return;
    this.activeSheet.layers = this.activeSheet.layers.filter((l) => l.id !== layerId);
    if (this.selectedLayerId === layerId) {
      this.selectedLayerId = '';
    }
    this.pushHistory();
  }

  moveLayerZIndex(layerId: string, direction: 'up' | 'down'): void {
    if (!this.activeSheet?.layers) return;
    const idx = this.activeSheet.layers.findIndex((l) => l.id === layerId);
    if (idx < 0) return;
    if (direction === 'up' && idx < this.activeSheet.layers.length - 1) {
      const temp = this.activeSheet.layers[idx];
      this.activeSheet.layers[idx] = this.activeSheet.layers[idx + 1];
      this.activeSheet.layers[idx + 1] = temp;
    } else if (direction === 'down' && idx > 0) {
      const temp = this.activeSheet.layers[idx];
      this.activeSheet.layers[idx] = this.activeSheet.layers[idx - 1];
      this.activeSheet.layers[idx - 1] = temp;
    }
    this.activeSheet.layers.forEach((l, i) => (l.zIndex = i + 1));
    this.pushHistory();
  }

  // ═══ DRAG & RESIZE SURFACES ═══
  startLayerDrag(layer: VisualInvitationLayer, event: MouseEvent): void {
    if (layer.locked) return;
    event.stopPropagation();
    this.selectLayer(layer);

    this.dragState = {
      isDragging: true,
      isResizing: false,
      startX: event.clientX,
      startY: event.clientY,
      layerStartX: layer.x,
      layerStartY: layer.y,
      layerStartW: layer.width,
      layerStartH: layer.height
    };
  }

  startLayerResize(layer: VisualInvitationLayer, handle: string, event: MouseEvent): void {
    if (layer.locked) return;
    event.stopPropagation();
    event.preventDefault();
    this.selectLayer(layer);

    this.dragState = {
      isDragging: false,
      isResizing: true,
      handle,
      startX: event.clientX,
      startY: event.clientY,
      layerStartX: layer.x,
      layerStartY: layer.y,
      layerStartW: layer.width,
      layerStartH: layer.height
    };
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.dragState.isDragging && !this.dragState.isResizing) return;
    const layer = this.selectedLayer;
    if (!layer || layer.locked) return;

    const deltaX = event.clientX - this.dragState.startX;
    const deltaY = event.clientY - this.dragState.startY;

    const artW = this.artboardWidth * this.canvasZoom;
    const artH = this.artboardHeight * this.canvasZoom;

    const deltaXPct = (deltaX / artW) * 100;
    const deltaYPct = (deltaY / artH) * 100;

    if (this.dragState.isDragging) {
      let nx = Math.round(this.dragState.layerStartX + deltaXPct);
      let ny = Math.round(this.dragState.layerStartY + deltaYPct);

      // Permitir sangrado / desborde controlado (bleed) para que elementos como flores,
      // marcos o decoraciones puedan colocarse parcialmente fuera del lienzo
      // (por ejemplo, mostrando solo la mitad o un tercio de la imagen recortada en el borde).
      const minX = -Math.round(layer.width * 0.9);
      const maxX = Math.round(100 - layer.width * 0.1);
      const minY = -Math.round(layer.height * 0.9);
      const maxY = Math.round(100 - layer.height * 0.1);

      nx = Math.max(minX, Math.min(maxX, nx));
      ny = Math.max(minY, Math.min(maxY, ny));

      layer.x = nx;
      layer.y = ny;
      if (layer.layouts?.mobile) {
        layer.layouts.mobile.x = nx;
        layer.layouts.mobile.y = ny;
      }
    } else if (this.dragState.isResizing) {
      const h = this.dragState.handle || 'se';
      let nx = layer.x;
      let ny = layer.y;
      let nw = layer.width;
      let nh = layer.height;

      if (h.includes('e')) nw = Math.max(5, Math.min(200, Math.round(this.dragState.layerStartW + deltaXPct)));
      if (h.includes('s')) nh = Math.max(2, Math.min(200, Math.round(this.dragState.layerStartH + deltaYPct)));
      if (h.includes('w')) {
        const potentialW = Math.round(this.dragState.layerStartW - deltaXPct);
        if (potentialW >= 5 && potentialW <= 200) {
          nw = potentialW;
          nx = Math.round(this.dragState.layerStartX + deltaXPct);
        }
      }
      if (h.includes('n')) {
        const potentialH = Math.round(this.dragState.layerStartH - deltaYPct);
        if (potentialH >= 2 && potentialH <= 200) {
          nh = potentialH;
          ny = Math.round(this.dragState.layerStartY + deltaYPct);
        }
      }

      layer.x = nx;
      layer.y = ny;
      layer.width = nw;
      layer.height = nh;
      if (layer.layouts?.mobile) {
        layer.layouts.mobile.x = nx;
        layer.layouts.mobile.y = ny;
        layer.layouts.mobile.width = nw;
        layer.layouts.mobile.height = nh;
      }
    }
  }

  @HostListener('window:mouseup')
  onMouseUp(): void {
    if (this.dragState.isDragging || this.dragState.isResizing) {
      this.dragState.isDragging = false;
      this.dragState.isResizing = false;
      this.pushHistory();
    }
  }

  // ═══ CLIPBOARD & KEYBOARD SHORTCUTS ═══
  @HostListener('window:paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    const target = event.target as HTMLElement;
    const isInputField = Boolean(target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName));

    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    // 1. Extraer archivo de imagen directamente del portapapeles (capturas de pantalla, archivos copiados)
    const imageFile = this.extractImageFromClipboard(clipboardData);
    if (imageFile) {
      event.preventDefault();
      event.stopPropagation();
      this.readAndInsertImageFile(imageFile);
      return;
    }

    // 2. Extraer URLs o Data URLs de imagen pegadas como texto
    const text = clipboardData.getData('text/plain')?.trim();
    if (text && !isInputField && this.isImageUrl(text)) {
      event.preventDefault();
      event.stopPropagation();
      this.addImageFromDataUrl(text, 'Imagen Web');
      return;
    }

    // 3. Extraer etiqueta <img> de HTML copiado (copiar imagen desde navegador web)
    const html = clipboardData.getData('text/html');
    if (html && !isInputField) {
      const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (match && match[1]) {
        event.preventDefault();
        event.stopPropagation();
        this.addImageFromDataUrl(match[1], 'Imagen Web');
        return;
      }
    }

    // 4. Si el foco está en un input/textarea, permitir que pegue texto nativamente
    if (isInputField) return;

    // 5. Si no hay imagen en el portapapeles pero se copió una capa en el editor (Ctrl+C), pegarla
    if (this.clipboardLayer) {
      event.preventDefault();
      this.pasteLayer();
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) return;

    const modifier = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();

    // Deshacer / Rehacer
    if (modifier && key === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        this.redo();
      } else {
        this.undo();
      }
      return;
    }
    if (modifier && key === 'y') {
      event.preventDefault();
      this.redo();
      return;
    }

    // Copiar capa con Ctrl+C
    if (modifier && key === 'c' && this.selectedLayer) {
      event.preventDefault();
      this.copySelectedLayer();
      return;
    }

    // Duplicar capa con Ctrl+D
    if (modifier && key === 'd' && this.selectedLayer) {
      event.preventDefault();
      this.duplicateLayer(this.selectedLayer.id);
      return;
    }

    // Eliminar capa con Delete o Backspace
    if ((event.key === 'Delete' || event.key === 'Backspace') && this.selectedLayer) {
      event.preventDefault();
      this.deleteLayer(this.selectedLayer.id);
      return;
    }

    // Escape: Deseleccionar
    if (event.key === 'Escape') {
      this.deselectAll();
      return;
    }

    // Flechas de dirección para mover capa con precisión (permitiendo sangrado fuera del lienzo)
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) && this.selectedLayer && !this.selectedLayer.locked) {
      event.preventDefault();
      const step = event.shiftKey ? 5 : 1;
      const l = this.selectedLayer;
      if (event.key === 'ArrowLeft') l.x = Math.max(-100, (l.x || 0) - step);
      if (event.key === 'ArrowRight') l.x = Math.min(150, (l.x || 0) + step);
      if (event.key === 'ArrowUp') l.y = Math.max(-100, (l.y || 0) - step);
      if (event.key === 'ArrowDown') l.y = Math.min(150, (l.y || 0) + step);
      if (l.layouts?.mobile) {
        l.layouts.mobile.x = l.x;
        l.layouts.mobile.y = l.y;
      }
      this.pushHistory();
      return;
    }
  }

  private extractImageFromClipboard(clipboardData: DataTransfer): File | null {
    if (clipboardData.files && clipboardData.files.length > 0) {
      for (let i = 0; i < clipboardData.files.length; i++) {
        const file = clipboardData.files[i];
        if (file.type && file.type.startsWith('image/')) {
          return file;
        }
      }
    }

    if (clipboardData.items && clipboardData.items.length > 0) {
      for (let i = 0; i < clipboardData.items.length; i++) {
        const item = clipboardData.items[i];
        if (item.type && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
            const cleanName = (file.name && file.name !== 'image.png')
              ? file.name
              : `imagen_pegada_${Date.now()}.${ext}`;
            return new File([file], cleanName, { type: file.type || 'image/png' });
          }
        }
      }
    }

    return null;
  }

  private isImageUrl(url: string): boolean {
    if (url.startsWith('data:image/')) return true;
    return /^https?:\/\/.*\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(url);
  }

  dataUrlToFile(dataUrl: string, filename = `imagen_${Date.now()}.png`): File | null {
    try {
      if (!dataUrl || !dataUrl.startsWith('data:image/')) return null;
      const parts = dataUrl.split(',');
      if (parts.length < 2) return null;
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/png';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new File([u8arr], filename, { type: mime });
    } catch {
      return null;
    }
  }

  async uploadImageFile(file: File, layer: VisualInvitationLayer): Promise<string | null> {
    const eventId = typeof this.invitation?.event === 'string'
      ? this.invitation.event
      : (this.invitation?.event as any)?._id;
    if (!eventId) return null;

    try {
      const ext = file.type?.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
      const cleanFileName = file.name && file.name !== 'image.png' ? file.name : `pass_img_${Date.now()}.${ext}`;
      const res = await firstValueFrom(
        this.apiService.createUploadUrl({
          fileName: cleanFileName,
          contentType: file.type || 'image/png',
          folder: 'assets',
          event: eventId,
          size: file.size
        })
      );
      await firstValueFrom(this.apiService.uploadAsset(res.uploadUrl, file));
      if (res.publicUrl) {
        layer.url = res.publicUrl;
        this.scheduleAutosave();
        return res.publicUrl;
      }
      return null;
    } catch (err) {
      console.warn('Subida en segundo plano no completada, conservando vista local:', err);
      return null;
    }
  }

  async uploadPendingDataUrls(): Promise<void> {
    const eventId = typeof this.invitation?.event === 'string'
      ? this.invitation.event
      : (this.invitation?.event as any)?._id;
    if (!eventId) return;

    for (const sheet of this.design?.sections || []) {
      for (const layer of sheet.layers || []) {
        if (layer.url && layer.url.startsWith('data:image/')) {
          const file = this.dataUrlToFile(layer.url, `${layer.name || 'pass_layer'}_${Date.now()}.png`);
          if (file) {
            try {
              const res = await firstValueFrom(
                this.apiService.createUploadUrl({
                  fileName: file.name,
                  contentType: file.type || 'image/png',
                  folder: 'assets',
                  event: eventId,
                  size: file.size
                })
              );
              await firstValueFrom(this.apiService.uploadAsset(res.uploadUrl, file));
              if (res.publicUrl) {
                layer.url = res.publicUrl;
              }
            } catch (uploadErr) {
              console.warn('Aviso: no se pudo sincronizar la imagen local antes de guardar:', uploadErr);
            }
          }
        }
      }
    }
  }

  private stripMongoMetadata<T>(value: T, parentKey?: string): T {
    if (Array.isArray(value)) return value.map((item) => this.stripMongoMetadata(item, parentKey)) as unknown as T;
    if (!value || typeof value !== 'object') return value;
    const record = value as Record<string, unknown>;
    const clean: Record<string, unknown> = {};

    const isVisualSection = parentKey === 'sections' || (Array.isArray(record['layers']) && typeof record['type'] === 'string');
    const isVisualLayer = parentKey === 'layers' || (typeof record['type'] === 'string' && ('x' in record) && ('y' in record) && ('width' in record) && ('height' in record) && !Array.isArray(record['layers']));
    const isVisualAsset = parentKey === 'assets' || (typeof record['url'] === 'string' && typeof record['name'] === 'string' && ['image', 'video', 'audio'].includes(record['type'] as string));
    const isGalleryItem = parentKey === 'galleryItems';
    const allowsId = isVisualSection || isVisualLayer || isVisualAsset || isGalleryItem;

    for (const [key, item] of Object.entries(record)) {
      if (key === '__v' || key === '_id') continue;
      if (key === 'id' && !allowsId) continue;
      clean[key] = this.stripMongoMetadata(item, key);
    }
    return clean as T;
  }

  private normalizeDesignGeometry(): void {
    if (!this.design) return;
    this.design.version = 1;
    this.design.active = true;
    this.design.mode = 'advanced';
    this.design.documentType = 'pass';
    this.design.assets = this.design.assets || [];

    for (const sheet of this.design.sections || []) {
      sheet.layout = 'canvas';
      sheet.type = 'passSheet';
      sheet.enabled = true;
      const sh = this.getSheetHeight(sheet);
      const sw = this.getSheetWidth(sheet);
      const sp = this.getSheetPreset(sheet);
      sheet.height = sh;
      sheet.pluginSettings = sheet.pluginSettings || {};
      sheet.pluginSettings['sheetWidth'] = sw;
      sheet.pluginSettings['sheetHeight'] = sh;
      sheet.pluginSettings['sheetPreset'] = sp;
      for (const layer of sheet.layers || []) {
        layer.rotation = layer.rotation ?? 0;
        layer.zIndex = layer.zIndex ?? 1;
        layer.locked = Boolean(layer.locked);
        layer.hidden = Boolean(layer.hidden);
        layer.layouts = layer.layouts || {};
        layer.layouts.mobile = {
          x: layer.x,
          y: layer.y,
          width: layer.width,
          height: layer.height,
          rotation: layer.rotation
        };
      }
    }
  }

  readAndInsertImageFile(file: File, targetXPct?: number, targetYPct?: number): void {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const cleanName = file.name ? file.name.replace(/\.[^/.]+$/, '') : 'Imagen Pegada';
      this.addImageFromDataUrl(dataUrl, cleanName, targetXPct, targetYPct, file);
    };
    reader.readAsDataURL(file);
  }

  addImageFromDataUrl(dataUrl: string, name = 'Imagen pegada', targetXPct?: number, targetYPct?: number, sourceFile?: File): void {
    if (!this.activeSheet) return;
    const img = new Image();
    img.onload = () => {
      const naturalW = img.naturalWidth || 400;
      const naturalH = img.naturalHeight || 300;
      const imgAspect = naturalW / naturalH;
      const artW = this.artboardWidth || 450;
      const artH = this.artboardHeight || 800;

      // Calcular ancho y alto proporcionales en % del lienzo
      let wPct = 50;
      let hPct = Math.round((wPct * artW) / (imgAspect * artH));

      // Si la altura supera el 60%, escalar proporcionalmente
      if (hPct > 60) {
        const scale = 60 / hPct;
        hPct = 60;
        wPct = Math.max(15, Math.round(wPct * scale));
      }
      wPct = Math.max(15, Math.min(90, wPct));
      hPct = Math.max(10, Math.min(85, hPct));

      const xPct = targetXPct !== undefined
        ? Math.min(95 - wPct, Math.max(5, targetXPct - Math.round(wPct / 2)))
        : Math.round((100 - wPct) / 2);
      const yPct = targetYPct !== undefined
        ? Math.min(95 - hPct, Math.max(5, targetYPct - Math.round(hPct / 2)))
        : Math.round((100 - hPct) / 2);

      const layer = createPassLayer(
        (p) => this.uid(p),
        'image',
        name,
        xPct,
        yPct,
        wPct,
        hPct,
        (this.activeSheet?.layers?.length || 0) + 1,
        {
          borderRadius: 8,
          objectFit: 'contain'
        },
        { url: dataUrl }
      );

      this.activeSheet!.layers = [...(this.activeSheet!.layers || []), layer];
      this.selectLayer(layer);
      this.pushHistory();
      this.flash('✨ Imagen agregada al pase.');

      // Subir archivo a CDN/storage en segundo plano para obtener URL limpia
      const fileToUpload = sourceFile || this.dataUrlToFile(dataUrl, `${name}_${Date.now()}.png`);
      if (fileToUpload) {
        this.uploadImageFile(fileToUpload, layer);
      }
    };
    img.onerror = () => {
      this.addImageLayer(dataUrl, 'none', name);
      this.flash('✨ Imagen agregada al pase.');
    };
    img.src = dataUrl;
  }

  async pasteImageFromClipboard(): Promise<void> {
    if (!navigator.clipboard?.read) {
      this.flash('💡 Presiona Ctrl+V en tu teclado para pegar la imagen copiada.');
      return;
    }
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const ext = imageType.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
          const file = new File([blob], `imagen_pegada_${Date.now()}.${ext}`, { type: imageType });
          this.readAndInsertImageFile(file);
          return;
        }
      }
      this.flash('No se encontró ninguna imagen en el portapapeles. Copia una imagen primero (Ctrl+C).');
    } catch {
      this.flash('💡 Presiona Ctrl+V en tu teclado para pegar la imagen del portapapeles.');
    }
  }

  // ═══ TEXT & IMAGE DYNAMIC TOKENS ═══
  evalText(rawText?: string): string {
    if (!rawText) return '';
    let text = rawText;
    const g = this.previewGuest || {
      name: 'Daniel Díaz',
      tableName: 'Mesa Presidencial',
      seatLabel: 'A1',
      allowedCompanions: 1,
      checkInCode: 'VIP-7788'
    };

    text = text.replace(/\{\{guest\.name\}\}/g, g.name || 'Invitado VIP');
    text = text.replace(/\{\{guest\.table\}\}/g, g.tableName || 'Mesa General');
    text = text.replace(/\{\{guest\.seat\}\}/g, g.seatLabel || '1');
    text = text.replace(/\{\{guest\.companions\}\}/g, String((g.allowedCompanions || 0) + 1));
    text = text.replace(/\{\{guest\.checkInCode\}\}/g, g.checkInCode || 'VIP-001');

    const evTitle = this.event?.title || this.invitation?.content?.headline || 'Nuestra Celebración';
    const evDate = this.event?.date ? new Date(this.event.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Próximamente';
    const evVenue = this.event?.venue?.name || 'Salón Principal';

    text = text.replace(/\{\{event\.title\}\}/g, evTitle);
    text = text.replace(/\{\{event\.date\}\}/g, evDate);
    text = text.replace(/\{\{event\.venue\}\}/g, evVenue);
    text = text.replace(/\{\{event\.time\}\}/g, this.event?.time || '');

    return text;
  }

  evalImageUrl(layer: VisualInvitationLayer): string {
    if (layer.binding === 'pass.qrCode') {
      const code = this.previewGuest?.checkInCode || 'VIP-ACCESO-DEMO';
      return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(code)}`;
    }
    return layer.url || '';
  }

  // ═══ PERSISTENCE ═══
  async saveDraft(silent = false): Promise<void> {
    if (this.saving) return;
    this.saving = true;
    this.autosaveState = 'Guardando...';
    this.error = '';

    try {
      // 1. Subir cualquier dataURL restante antes de enviar a la base de datos
      await this.uploadPendingDataUrls();

      // 2. Normalizar geometría y propiedades obligatorias
      this.normalizeDesignGeometry();

      // 3. Limpiar metadatos internos de Mongo para no disparar validaciones Zod strict
      const rawContent: any = {
        ...this.invitation?.content,
        passDesignDraft: this.design
      };
      delete rawContent.id;
      delete rawContent._id;
      const content = this.stripMongoMetadata(rawContent);

      const rawRsvp: any = { ...(this.invitation?.rsvpSettings || {}) };
      delete rawRsvp.id;
      delete rawRsvp._id;
      const rsvpSettings = this.stripMongoMetadata(rawRsvp);

      const payload: any = {
        content,
        rsvpSettings
      };

      const res = await firstValueFrom(this.apiService.updateInvitation(this.invitationId, payload));
      if (res.invitation) {
        this.invitation = res.invitation;
      }

      // Guardar también copia local segura
      try {
        localStorage.setItem(`pass_draft_${this.invitationId}`, JSON.stringify(this.design));
      } catch {}

      this.autosaveState = 'Al día';
      this.saving = false;
      if (!silent) {
        this.flash('✓ Borrador de pase guardado con éxito.');
      }
    } catch (err: any) {
      console.error('Error al guardar borrador del pase:', err);
      this.saving = false;
      this.autosaveState = 'Cambios pendientes';
      const detail = err?.error?.message || err?.message || 'Error al guardar el pase.';
      this.error = detail;
      this.flash(`⚠️ Error al guardar: ${detail}`);
    }
  }

  async publishPass(): Promise<void> {
    if (this.publishing) return;
    const confirmed = await this.confirmDialogService.confirm({
      title: 'Publicar Pase Oficial',
      message: '¿Deseas publicar este diseño como el pase oficial para todos los invitados? Se usará para las descargas y mensajes con imagen.'
    });
    if (!confirmed) return;

    this.publishing = true;
    this.error = '';

    try {
      await this.uploadPendingDataUrls();
      this.normalizeDesignGeometry();

      const rawContent: any = {
        ...this.invitation?.content,
        passDesignDraft: this.design,
        passDesign: this.design
      };
      delete rawContent.id;
      delete rawContent._id;
      const content = this.stripMongoMetadata(rawContent);

      const rawRsvp: any = { ...(this.invitation?.rsvpSettings || {}) };
      delete rawRsvp.id;
      delete rawRsvp._id;
      const rsvpSettings = this.stripMongoMetadata(rawRsvp);

      const payload: any = {
        content,
        rsvpSettings
      };

      const res = await firstValueFrom(this.apiService.updateInvitation(this.invitationId, payload));
      if (res.invitation) {
        this.invitation = res.invitation;
      }
      try {
        localStorage.setItem(`pass_draft_${this.invitationId}`, JSON.stringify(this.design));
      } catch {}

      this.autosaveState = 'Al día';
      this.publishing = false;
      this.flash('✨ ¡Pase oficial publicado con éxito!');
    } catch (err: any) {
      console.error('Error al publicar pase:', err);
      this.publishing = false;
      this.autosaveState = 'Cambios pendientes';
      const detail = err?.error?.message || err?.message || 'Error al publicar el pase.';
      this.error = detail;
      this.flash(`⚠️ Error al publicar: ${detail}`);
    }
  }

  goBack(): void {
    const eventId = typeof this.invitation?.event === 'string' ? this.invitation?.event : (this.invitation?.event as any)?._id;
    if (eventId) {
      this.router.navigate(['/new/events', eventId], { queryParams: { tab: 'communication' } });
    } else {
      window.history.back();
    }
  }

  private flash(msg: string): void {
    this.message = msg;
    setTimeout(() => {
      if (this.message === msg) this.message = '';
    }, 4500);
  }
}
