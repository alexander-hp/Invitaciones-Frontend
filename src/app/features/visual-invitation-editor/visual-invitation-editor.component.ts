import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ApiService } from '../../core/api.service';
import {
  EventModel, InvitationContent, InvitationModel, VisualDesignTemplateModel, VisualInvitationDesign,
  VisualDesignRevisionModel, VisualInvitationAsset, VisualInvitationLayer, VisualInvitationLayerLayout,
  VisualInvitationSection, VisualLayerType, WebImageSearchResult
} from '../../core/models';

type DeviceMode = 'mobile' | 'tablet' | 'desktop';
type MobileEditorPanel = 'tools' | 'canvas' | 'inspector';
type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';
type InspectorView = 'properties' | 'layers' | 'history';
type DesignMedia = { id?: string; url: string; type: 'image' | 'video' | 'audio'; label: string; stored?: boolean; attribution?: string; attributionUrl?: string; sourceUrl?: string };
type MediaFilter = 'all' | DesignMedia['type'];
type VisualTheme = NonNullable<VisualInvitationDesign['theme']>;
type ImageMask = NonNullable<NonNullable<VisualInvitationLayer['style']>['imageMask']>;
type ShapeKind = NonNullable<NonNullable<VisualInvitationLayer['style']>['shapeKind']>;
type PaletteDragItem =
  | { kind: 'layer'; type: VisualLayerType }
  | { kind: 'shape'; shape: ShapeKind }
  | { kind: 'component'; key: string }
  | { kind: 'media'; media: DesignMedia };
type AuditSeverity = 'critical' | 'warning' | 'suggestion';
type PublishAuditIssue = {
  id: string;
  severity: AuditSeverity;
  title: string;
  detail: string;
  sectionId?: string;
  layerId?: string;
  device?: DeviceMode;
};
type SelectionMarquee = { sectionId: string; left: number; top: number; width: number; height: number };
type ContentListKey = 'locations' | 'itinerary' | 'gallery' | 'giftRegistry';
type EditorHistoryState = { design: VisualInvitationDesign; content: InvitationContent };

@Component({
  selector: 'app-visual-invitation-editor',
  templateUrl: './visual-invitation-editor.component.html',
  styleUrls: ['./visual-invitation-editor.component.css']
})
export class VisualInvitationEditorComponent implements OnInit, OnDestroy {
  invitation?: InvitationModel;
  event?: EventModel;
  design!: VisualInvitationDesign;
  personalTemplates: VisualDesignTemplateModel[] = [];
  revisions: VisualDesignRevisionModel[] = [];
  templateName = '';
  revisionLabel = '';
  selectedSectionId = '';
  selectedLayerId = '';
  selectedLayerIds: string[] = [];
  device: DeviceMode = 'mobile';
  loading = true;
  saving = false;
  publishing = false;
  uploading = false;
  savingTemplate = false;
  savingRevision = false;
  loadingRevisions = false;
  showOnboarding = false;
  autosaving = false;
  autosaveState = 'Guardado';
  message = '';
  error = '';
  resizing = false;
  inspectorView: InspectorView = 'properties';
  guideX: number | null = null;
  guideY: number | null = null;
  draggingLayerId = '';
  mediaFilter: MediaFilter = 'all';
  webImageQuery = '';
  webImageOrientation: '' | 'landscape' | 'portrait' | 'squarish' = '';
  webImageResults: WebImageSearchResult[] = [];
  searchingWebImages = false;
  webImageError = '';
  previewAnimationLayerId = '';
  canvasZoom = 1;
  showGrid = false;
  showSafeMargins = false;
  smartSnapping = true;
  showPublishAudit = false;
  publishAuditIssues: PublishAuditIssue[] = [];
  showResponsivePreview = false;
  editingLayerId = '';
  paletteDropSectionId = '';
  selectionMarquee?: SelectionMarquee;
  croppingLayerId = '';
  mobilePanel: MobileEditorPanel = 'canvas';
  touchZoomVisible = false;
  touchGestureActive = false;
  touchGestureLabel = '';

  readonly zoomOptions = [.5, .75, 1, 1.25, 1.5];
  readonly imageMasks: Array<{ key: ImageMask; label: string; icon: string }> = [
    { key: 'none', label: 'Original', icon: '▭' }, { key: 'circle', label: 'Círculo', icon: '●' },
    { key: 'rounded', label: 'Redondeado', icon: '▢' }, { key: 'arch', label: 'Arco', icon: '∩' },
    { key: 'diamond', label: 'Rombo', icon: '◆' }, { key: 'hexagon', label: 'Hexágono', icon: '⬢' },
    { key: 'ticket', label: 'Recorte', icon: '◫' }
  ];
  readonly shapeCatalog: Array<{ key: ShapeKind; label: string; icon: string }> = [
    { key: 'rectangle', label: 'Rectángulo', icon: '■' }, { key: 'circle', label: 'Círculo', icon: '●' },
    { key: 'ellipse', label: 'Óvalo', icon: '⬭' }, { key: 'triangle', label: 'Triángulo', icon: '▲' },
    { key: 'diamond', label: 'Rombo', icon: '◆' }, { key: 'star', label: 'Estrella', icon: '★' },
    { key: 'hexagon', label: 'Hexágono', icon: '⬢' }, { key: 'line', label: 'Línea', icon: '━' }
  ];
  readonly previewDevices: Array<{ key: DeviceMode; label: string; width: number; scale: number }> = [
    { key: 'mobile', label: 'Celular', width: 390, scale: .62 },
    { key: 'tablet', label: 'Tablet', width: 768, scale: .315 },
    { key: 'desktop', label: 'Escritorio', width: 1180, scale: .205 }
  ];

  private undoStack: EditorHistoryState[] = [];
  private redoStack: EditorHistoryState[] = [];
  private clipboardLayers: VisualInvitationLayer[] = [];
  private autosaveHandle?: ReturnType<typeof setInterval>;
  private touchZoomHideHandle?: ReturnType<typeof setTimeout>;
  private lastSavedSnapshot = '';
  private suppressNextLayerClickId = '';
  private inlineEditOriginal = '';
  private paletteDragItem?: PaletteDragItem;
  private marqueeState?: {
    section: VisualInvitationSection;
    canvas: HTMLElement;
    startX: number;
    startY: number;
    baseIds: string[];
    moved: boolean;
  };
  private cropPanState?: {
    layer: VisualInvitationLayer;
    frame: HTMLElement;
    startX: number;
    startY: number;
    positionX: number;
    positionY: number;
  };
  private rotationState?: {
    layout: VisualInvitationLayerLayout;
    centerX: number;
    centerY: number;
    startAngle: number;
    initialRotation: number;
  };
  private resizeState?: {
    corner: ResizeCorner;
    layout: VisualInvitationLayerLayout;
    canvas: HTMLElement;
    startX: number;
    startY: number;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  private layerDragState?: {
    layer: VisualInvitationLayer;
    section: VisualInvitationSection;
    items: Array<{ layer: VisualInvitationLayer; layout: VisualInvitationLayerLayout; x: number; y: number; width: number; height: number }>;
    canvas: HTMLElement;
    startX: number;
    startY: number;
    bounds: { x: number; y: number; width: number; height: number };
    moved: boolean;
  };
  private stageElement?: HTMLElement;
  private touchPointers = new Map<number, { x: number; y: number; cropFrame?: HTMLElement }>();
  private canvasGesture?: {
    startDistance: number;
    startZoom: number;
    startCenterX: number;
    startCenterY: number;
    startScrollLeft: number;
    startScrollTop: number;
    stageLeft: number;
    stageTop: number;
  };
  private imageCropGesture?: {
    layer: VisualInvitationLayer;
    frame: HTMLElement;
    startDistance: number;
    startCenterX: number;
    startCenterY: number;
    startScale: number;
    startPositionX: number;
    startPositionY: number;
  };
  private readonly stagePointerDown = (event: PointerEvent) => this.trackCanvasPointerDown(event);
  private readonly stagePointerMove = (event: PointerEvent) => this.trackCanvasPointerMove(event);
  private readonly stagePointerEnd = (event: PointerEvent) => this.trackCanvasPointerEnd(event);

  @ViewChild('editorStage')
  set editorStage(ref: ElementRef<HTMLElement> | undefined) {
    const nextStage = ref?.nativeElement;
    if (nextStage === this.stageElement) return;
    this.detachStageGestureListeners();
    this.stageElement = nextStage;
    this.attachStageGestureListeners();
  }

  readonly builtInPresets = [
    { key: 'editorial', label: 'Editorial claro', colors: ['#f6f1eb', '#24211f'] },
    { key: 'romantic', label: 'Romántico floral', colors: ['#f8e9e8', '#8d4f58'] },
    { key: 'night', label: 'Noche elegante', colors: ['#171717', '#d6b46c'] }
  ];

  readonly themePresets: Array<{ key: string; label: string; theme: VisualTheme }> = [
    { key: 'editorial', label: 'Editorial', theme: { backgroundColor: '#f6f1eb', textColor: '#24211f', accentColor: '#b57c62', headingFont: "'Playfair Display', serif", bodyFont: 'Montserrat, sans-serif', buttonBackgroundColor: '#24211f', buttonTextColor: '#ffffff', buttonStyle: 'solid', buttonRadius: 4 } },
    { key: 'romantic', label: 'Romántico', theme: { backgroundColor: '#fff7f6', textColor: '#56383d', accentColor: '#b96775', headingFont: "'Cormorant Garamond', serif", bodyFont: 'Montserrat, sans-serif', buttonBackgroundColor: '#9f5260', buttonTextColor: '#ffffff', buttonStyle: 'soft', buttonRadius: 18 } },
    { key: 'garden', label: 'Jardín', theme: { backgroundColor: '#f5f4ec', textColor: '#263c32', accentColor: '#66836f', headingFont: 'Cinzel, serif', bodyFont: 'Montserrat, sans-serif', buttonBackgroundColor: '#385947', buttonTextColor: '#ffffff', buttonStyle: 'outline', buttonRadius: 2 } },
    { key: 'celebration', label: 'Celebración', theme: { backgroundColor: '#fffaf0', textColor: '#292523', accentColor: '#c04b5c', headingFont: "'Alex Brush', cursive", bodyFont: 'Arial, sans-serif', buttonBackgroundColor: '#167c72', buttonTextColor: '#ffffff', buttonStyle: 'solid', buttonRadius: 24 } },
    { key: 'night', label: 'Noche', theme: { backgroundColor: '#181715', textColor: '#f5efe4', accentColor: '#d2ad63', headingFont: 'Cinzel, serif', bodyFont: 'Montserrat, sans-serif', buttonBackgroundColor: '#d2ad63', buttonTextColor: '#181715', buttonStyle: 'outline', buttonRadius: 0 } }
  ];

  readonly sectionCatalog = [
    { type: 'custom', label: 'Sección vacía' },
    { type: 'story', label: 'Nuestra historia' }, { type: 'locations', label: 'Ubicaciones' },
    { type: 'itinerary', label: 'Itinerario' }, { type: 'dressCode', label: 'Vestimenta' },
    { type: 'rsvp', label: 'Confirmación RSVP' }, { type: 'gifts', label: 'Mesa de regalos' },
    { type: 'gallery', label: 'Galería' }, { type: 'album', label: 'Álbum colectivo' },
    { type: 'dedications', label: 'Dedicatorias' }, { type: 'songs', label: 'Peticiones al DJ' }
  ];

  readonly componentCatalog = [
    { key: 'hero', icon: 'Aa', label: 'Portada' },
    { key: 'heading', icon: 'T', label: 'Título' },
    { key: 'imageCaption', icon: '▧', label: 'Foto + texto' },
    { key: 'quote', icon: '“”', label: 'Cita' },
    { key: 'cta', icon: '→', label: 'Botón CTA' },
    { key: 'divider', icon: '—', label: 'Separador' }
  ];

  readonly previewLocations = [
    { name: 'Ceremonia', address: 'Ubicación principal del evento', notes: 'Consulta indicaciones y horario.' },
    { name: 'Recepción', address: 'Salón de celebración', notes: 'Acceso disponible para invitados.' }
  ];
  readonly previewItinerary = [
    { time: '17:00', title: 'Ceremonia', description: 'Inicio del evento' },
    { time: '19:00', title: 'Recepción', description: 'Cena y celebración' },
    { time: '21:00', title: 'Fiesta', description: 'Música y baile' }
  ];
  readonly previewGifts = [
    { title: 'Mesa de regalos', store: 'Tienda seleccionada', note: 'Tu presencia es nuestro mejor regalo.' }
  ];
  readonly previewDedications = [
    { publicName: 'Familia y amigos', message: 'Que esta nueva etapa esté llena de momentos inolvidables.' },
    { publicName: 'Tus invitados', message: 'Gracias por permitirnos acompañarlos en este día.' }
  ];
  readonly previewGallerySlots = [0, 1, 2, 3, 4, 5];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.api.listInvitations().subscribe({
      next: ({ invitations }) => {
        this.invitation = invitations.find((item) => (item._id || item.id) === id);
        if (!this.invitation) return this.fail('Invitación no encontrada.');
        const storedDesign = this.invitation.content?.visualDesign;
        this.showOnboarding = !storedDesign?.sections?.length;
        this.design = this.clone(storedDesign?.sections?.length ? storedDesign : this.createDefaultDesign());
        this.design.responsiveMode = this.design.responsiveMode || 'shared';
        this.design.assets = this.design.assets || [];
        this.design.theme = this.design.theme || this.inferTheme();
        this.normalizeInvitationContent();
        this.normalizeModuleStyles();
        this.selectedSectionId = this.design.sections[0]?.id || '';
        this.lastSavedSnapshot = this.designSnapshot();
        setTimeout(() => this.fitCanvasToViewport());
        this.startAutosave();
        this.loadPersonalTemplates();
        this.loadRevisions();
        const eventId = typeof this.invitation.event === 'string'
          ? this.invitation.event
          : (this.invitation.event._id || this.invitation.event.id || '');
        if (!eventId) { this.loading = false; return; }
        this.api.getEvent(eventId).subscribe({
          next: ({ event }) => { this.event = event; this.loading = false; },
          error: () => { this.loading = false; }
        });
      },
      error: () => this.fail('No fue posible cargar la invitación.')
    });
  }

  private attachStageGestureListeners(): void {
    this.stageElement?.addEventListener('pointerdown', this.stagePointerDown, { capture: true, passive: false });
    this.stageElement?.addEventListener('pointermove', this.stagePointerMove, { capture: true, passive: false });
    this.stageElement?.addEventListener('pointerup', this.stagePointerEnd, { capture: true, passive: false });
    this.stageElement?.addEventListener('pointercancel', this.stagePointerEnd, { capture: true, passive: false });
  }

  private detachStageGestureListeners(): void {
    this.stageElement?.removeEventListener('pointerdown', this.stagePointerDown, true);
    this.stageElement?.removeEventListener('pointermove', this.stagePointerMove, true);
    this.stageElement?.removeEventListener('pointerup', this.stagePointerEnd, true);
    this.stageElement?.removeEventListener('pointercancel', this.stagePointerEnd, true);
  }

  ngOnDestroy(): void {
    if (this.autosaveHandle) clearInterval(this.autosaveHandle);
    if (this.touchZoomHideHandle) clearTimeout(this.touchZoomHideHandle);
    this.detachStageGestureListeners();
  }

  private trackCanvasPointerDown(event: PointerEvent): void {
    if (event.pointerType !== 'touch') return;
    const cropFrame = (event.target as HTMLElement).closest('.image-frame.crop-active') as HTMLElement | null;
    this.touchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY, cropFrame: cropFrame || undefined });
    if (this.touchPointers.size !== 2 || !this.stageElement) return;

    const [first, second] = Array.from(this.touchPointers.values());
    if (first.cropFrame && first.cropFrame === second.cropFrame && this.selectedLayer?.id === this.croppingLayerId) {
      const layer = this.selectedLayer;
      layer.style = layer.style || {};
      this.cropPanState = undefined;
      this.imageCropGesture = {
        layer,
        frame: first.cropFrame,
        startDistance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
        startCenterX: (first.x + second.x) / 2,
        startCenterY: (first.y + second.y) / 2,
        startScale: Number(layer.style.imageScale ?? 1),
        startPositionX: Number(layer.style.objectPositionX ?? 50),
        startPositionY: Number(layer.style.objectPositionY ?? 50)
      };
      this.touchGestureActive = true;
      this.showTouchZoom(`${this.imageCropGesture.startScale.toFixed(2)}×`);
      event.preventDefault();
      return;
    }

    const rect = this.stageElement.getBoundingClientRect();
    this.cancelCanvasInteraction();
    this.canvasGesture = {
      startDistance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
      startZoom: this.canvasZoom,
      startCenterX: (first.x + second.x) / 2,
      startCenterY: (first.y + second.y) / 2,
      startScrollLeft: this.stageElement.scrollLeft,
      startScrollTop: this.stageElement.scrollTop,
      stageLeft: rect.left,
      stageTop: rect.top
    };
    this.touchGestureActive = true;
    this.showTouchZoom(`${Math.round(this.canvasZoom * 100)}%`);
    event.preventDefault();
  }

  private trackCanvasPointerMove(event: PointerEvent): void {
    if (event.pointerType !== 'touch' || !this.touchPointers.has(event.pointerId)) return;
    const current = this.touchPointers.get(event.pointerId)!;
    this.touchPointers.set(event.pointerId, { ...current, x: event.clientX, y: event.clientY });
    if (this.imageCropGesture && this.touchPointers.size >= 2) {
      event.preventDefault();
      const [first, second] = Array.from(this.touchPointers.values());
      const gesture = this.imageCropGesture;
      const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
      const centerX = (first.x + second.x) / 2;
      const centerY = (first.y + second.y) / 2;
      const nextScale = this.bound(gesture.startScale * distance / gesture.startDistance, .5, 3);
      const frameWidth = Math.max(1, gesture.frame.clientWidth);
      const frameHeight = Math.max(1, gesture.frame.clientHeight);
      gesture.layer.style = gesture.layer.style || {};
      gesture.layer.style.imageScale = Math.round(nextScale * 100) / 100;
      gesture.layer.style.objectPositionX = this.bound(gesture.startPositionX - (centerX - gesture.startCenterX) / frameWidth * 100, 0, 100);
      gesture.layer.style.objectPositionY = this.bound(gesture.startPositionY - (centerY - gesture.startCenterY) / frameHeight * 100, 0, 100);
      this.showTouchZoom(`${gesture.layer.style.imageScale.toFixed(2)}×`);
      return;
    }
    if (!this.canvasGesture || this.touchPointers.size < 2 || !this.stageElement) return;

    event.preventDefault();
    const [first, second] = Array.from(this.touchPointers.values());
    const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
    const centerX = (first.x + second.x) / 2;
    const centerY = (first.y + second.y) / 2;
    const nextZoom = this.bound(this.canvasGesture.startZoom * distance / this.canvasGesture.startDistance, .5, 1.5);
    const zoomRatio = nextZoom / this.canvasGesture.startZoom;
    const localStartX = this.canvasGesture.startCenterX - this.canvasGesture.stageLeft;
    const localStartY = this.canvasGesture.startCenterY - this.canvasGesture.stageTop;
    const localCurrentX = centerX - this.canvasGesture.stageLeft;
    const localCurrentY = centerY - this.canvasGesture.stageTop;

    this.canvasZoom = nextZoom;
    this.stageElement.scrollLeft = (this.canvasGesture.startScrollLeft + localStartX) * zoomRatio - localCurrentX;
    this.stageElement.scrollTop = (this.canvasGesture.startScrollTop + localStartY) * zoomRatio - localCurrentY;
    this.showTouchZoom(`${Math.round(nextZoom * 100)}%`);
  }

  private trackCanvasPointerEnd(event: PointerEvent): void {
    if (event.pointerType !== 'touch') return;
    this.touchPointers.delete(event.pointerId);
    if (this.touchPointers.size >= 2) return;
    this.canvasGesture = undefined;
    this.imageCropGesture = undefined;
    this.touchGestureActive = false;
    this.scheduleTouchZoomHide();
  }

  private cancelCanvasInteraction(): void {
    this.resizeState = undefined;
    this.rotationState = undefined;
    this.marqueeState = undefined;
    this.selectionMarquee = undefined;
    this.cropPanState = undefined;
    this.layerDragState = undefined;
    this.draggingLayerId = '';
    this.guideX = null;
    this.guideY = null;
    this.resizing = false;
  }

  private showTouchZoom(label: string): void {
    if (this.touchZoomHideHandle) clearTimeout(this.touchZoomHideHandle);
    this.touchGestureLabel = label;
    this.touchZoomVisible = true;
  }

  private scheduleTouchZoomHide(): void {
    if (this.touchZoomHideHandle) clearTimeout(this.touchZoomHideHandle);
    this.touchZoomHideHandle = setTimeout(() => {
      this.touchZoomVisible = false;
      this.touchGestureLabel = '';
    }, 650);
  }

  get selectedSection(): VisualInvitationSection | undefined {
    return this.design?.sections.find((item) => item.id === this.selectedSectionId);
  }

  get selectedLayer(): VisualInvitationLayer | undefined {
    return this.selectedSection?.layers.find((item) => item.id === this.selectedLayerId);
  }

  get selectedLayers(): VisualInvitationLayer[] {
    const ids = new Set(this.selectedLayerIds);
    return (this.selectedSection?.layers || []).filter((item) => ids.has(item.id));
  }

  get selectedLayerCount(): number {
    return this.selectedLayers.length;
  }

  get mobileSelectionLabel(): string {
    if (this.selectedLayerCount > 1) return `${this.selectedLayerCount} elementos`;
    return this.selectedLayer ? this.layerLabel(this.selectedLayer) : 'Elemento';
  }

  get artboardWidth(): number {
    return this.device === 'mobile' ? 390 : this.device === 'tablet' ? 768 : 1180;
  }

  get artboardHeight(): number {
    const sections = this.design?.sections || [];
    return sections.reduce((total, section) => total + Number(section.height || 0), 0) + Math.max(0, sections.length - 1) * 22;
  }

  get hasClipboardLayers(): boolean {
    return this.clipboardLayers.length > 0;
  }

  get criticalAuditCount(): number {
    return this.publishAuditIssues.filter((issue) => issue.severity === 'critical').length;
  }

  get warningAuditCount(): number {
    return this.publishAuditIssues.filter((issue) => issue.severity === 'warning').length;
  }

  get selectedLayout(): VisualInvitationLayerLayout | undefined {
    return this.selectedLayer ? this.editableLayout(this.selectedLayer) : undefined;
  }

  get hasUnsavedChanges(): boolean {
    return !!this.design && this.designSnapshot() !== this.lastSavedSnapshot;
  }

  setDevice(device: DeviceMode): void {
    this.device = device;
    setTimeout(() => this.fitCanvasToViewport());
  }

  setMobilePanel(panel: MobileEditorPanel): void {
    this.mobilePanel = panel;
    if (panel === 'canvas') setTimeout(() => this.fitCanvasToViewport());
  }

  openMobileInspector(): void {
    this.inspectorView = 'properties';
    this.setMobilePanel('inspector');
  }

  clearMobileSelection(): void {
    this.clearLayerSelection();
  }

  fitCanvasToViewport(): void {
    if (typeof window === 'undefined' || window.innerWidth > 700) return;
    const availableWidth = Math.max(240, window.innerWidth - 20);
    this.canvasZoom = this.bound(availableWidth / this.artboardWidth, .5, 1);
  }

  @HostListener('window:resize')
  handleViewportResize(): void {
    if (this.mobilePanel === 'canvas') this.fitCanvasToViewport();
  }

  setCanvasZoom(value: number | string): void {
    this.canvasZoom = this.bound(Number(value) || 1, .5, 1.5);
  }

  normalizeLayerTransform(layer: VisualInvitationLayer, layout: VisualInvitationLayerLayout): void {
    layout.width = this.bound(Number(layout.width) || 4, 4, 100);
    layout.height = this.bound(Number(layout.height) || 4, 4, 100);
    layout.x = this.bound(Number(layout.x) || 0, 0, 100 - layout.width);
    layout.y = this.bound(Number(layout.y) || 0, 0, 100 - layout.height);
    layout.rotation = this.bound(Number(layout.rotation) || 0, -180, 180);
    layer.zIndex = Math.round(this.bound(Number(layer.zIndex) || 0, 0, 1000));
  }

  openResponsivePreview(): void {
    this.publishAuditIssues = this.auditDesign();
    this.showResponsivePreview = true;
  }

  closeResponsivePreview(): void {
    this.showResponsivePreview = false;
  }

  responsiveIssueCount(device: DeviceMode): number {
    return this.publishAuditIssues.filter((issue) => issue.device === device).length;
  }

  responsivePreviewLayerStyle(layer: VisualInvitationLayer, device: DeviceMode): Record<string, string> {
    const style = layer.style || {};
    const shape = layer.type === 'shape';
    const layout = this.design.responsiveMode === 'independent' ? (layer.layouts?.[device] || layer) : layer;
    return {
      left: `${layout.x}%`, top: `${layout.y}%`, width: `${layout.width}%`, height: `${layout.height}%`,
      transform: `rotate(${layout.rotation || 0}deg)`, zIndex: String(layer.zIndex || 1),
      color: String(style.color || '#2d2927'), backgroundColor: shape ? 'transparent' : String(style.backgroundColor || 'transparent'),
      fontFamily: String(style.fontFamily || 'Arial, sans-serif'), fontSize: `${Number(style.fontSize || 30)}px`,
      fontWeight: String(style.fontWeight || 400), textAlign: String(style.textAlign || 'center'),
      lineHeight: String(style.lineHeight || 1.2), letterSpacing: `${Number(style.letterSpacing || 0)}px`, textTransform: String(style.textTransform || 'none'),
      textDecoration: String(style.textDecoration || 'none'), textShadow: String(style.textShadow || 'none'),
      borderRadius: shape ? '0' : `${Number(style.borderRadius || 0)}px`, borderColor: shape ? 'transparent' : String(style.borderColor || 'transparent'),
      borderStyle: !shape && Number(style.borderWidth || 0) > 0 ? String(style.borderStyle || 'solid') : 'none', borderWidth: shape ? '0' : `${Number(style.borderWidth || 0)}px`,
      backgroundImage: !shape && style.gradientEnabled ? `linear-gradient(${Number(style.gradientAngle || 0)}deg,${String(style.gradientStart || '#ffffff')},${String(style.gradientEnd || '#000000')})` : 'none',
      boxShadow: shape ? 'none' : String(style.boxShadow || 'none'),
      opacity: layer.hidden ? '0' : String(style.opacity ?? 1)
    };
  }

  applyThemePreset(preset: { theme: VisualTheme }): void {
    this.recordHistory();
    this.design.theme = this.clone(preset.theme);
    this.applyThemeValues(this.design.sections);
    this.flash('Tema aplicado a toda la invitación.');
  }

  applyCurrentTheme(scope: 'section' | 'all'): void {
    if (!this.design.theme) return;
    const sections = scope === 'section' && this.selectedSection ? [this.selectedSection] : this.design.sections;
    this.recordHistory();
    this.applyThemeValues(sections);
    this.flash(scope === 'section' ? 'Estilo aplicado a esta sección.' : 'Estilo aplicado a toda la invitación.');
  }

  beginPropertyEdit(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) return;
    if (!target.closest('.ve-inspector,.theme-editor')) return;
    this.recordHistory();
  }

  openPublishAudit(): void {
    this.publishAuditIssues = this.auditDesign();
    this.showPublishAudit = true;
  }

  closePublishAudit(): void {
    if (this.publishing) return;
    this.showPublishAudit = false;
  }

  goToAuditIssue(issue: PublishAuditIssue): void {
    if (issue.device) this.device = issue.device;
    if (issue.sectionId) this.selectedSectionId = issue.sectionId;
    if (issue.layerId) this.setLayerSelection([issue.layerId]); else this.clearLayerSelection();
    this.inspectorView = 'properties';
    this.showPublishAudit = false;
    setTimeout(() => {
      const selector = issue.layerId ? `[data-layer-id="${issue.layerId}"]` : `[data-section-id="${issue.sectionId}"]`;
      document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  auditSeverityLabel(severity: AuditSeverity): string {
    return { critical: 'Debes corregir', warning: 'Recomendado', suggestion: 'Mejora opcional' }[severity];
  }

  setResponsiveMode(independent: boolean): void {
    const next = independent ? 'independent' : 'shared';
    if (this.design.responsiveMode === next) return;
    if (!independent && this.design.sections.some((section) => section.layers.some((layer) => layer.layouts && Object.keys(layer.layouts).length))) {
      if (!window.confirm('Al usar un solo diseño se conservará la distribución base y se dejarán de usar los ajustes por dispositivo.')) return;
    }
    this.recordHistory();
    this.design.responsiveMode = next;
    this.autosaveState = 'Cambios pendientes';
  }

  copyCurrentLayoutTo(target: DeviceMode): void {
    if (this.design.responsiveMode !== 'independent' || target === this.device) return;
    this.recordHistory();
    for (const section of this.design.sections) for (const layer of section.layers) {
      layer.layouts = layer.layouts || {};
      layer.layouts[target] = this.clone(this.layoutFor(layer));
    }
    this.flash(`Diseño de ${this.deviceLabel(this.device)} copiado a ${this.deviceLabel(target)}.`);
  }

  get orderedLayers(): VisualInvitationLayer[] {
    return [...(this.selectedSection?.layers || [])].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
  }

  get mediaLibrary(): DesignMedia[] {
    const media = new Map<string, DesignMedia>();
    for (const asset of this.design?.assets || []) {
      media.set(asset.url, { id: asset.id, url: asset.url, type: asset.type, label: asset.name, stored: true, attribution: asset.attribution, attributionUrl: asset.attributionUrl, sourceUrl: asset.sourceUrl });
    }
    const content = this.invitation?.content;
    if (content?.coverImageUrl) media.set(content.coverImageUrl, { url: content.coverImageUrl, type: 'image', label: 'Portada de la invitación' });
    for (const [index, url] of (content?.gallery || []).entries()) {
      if (url) media.set(url, { url, type: 'image', label: `Galería ${index + 1}` });
    }
    if (content?.musicUrl) media.set(content.musicUrl, { url: content.musicUrl, type: 'audio', label: 'Música principal' });
    const external = this.event?.externalContent;
    const externalImages = [external?.coverImageUrl, external?.heroImageUrl, ...(external?.carousel || []), ...(external?.gallery || []), ...(external?.spectacularImages || [])];
    externalImages.filter(Boolean).forEach((url, index) => media.set(url as string, { url: url as string, type: 'image', label: `Archivo del evento ${index + 1}` }));
    if (external?.musicUrl) media.set(external.musicUrl, { url: external.musicUrl, type: 'audio', label: 'Audio del evento' });
    for (const audio of external?.audioSections || []) if (audio.url) media.set(audio.url, { url: audio.url, type: 'audio', label: audio.title || 'Audio de sección' });
    for (const section of this.design?.sections || []) {
      if (section.background?.imageUrl) media.set(section.background.imageUrl, { url: section.background.imageUrl, type: 'image', label: `${section.title || 'Sección'} · fondo` });
      for (const layer of section.layers) {
        if (layer.url && ['image', 'video', 'audio'].includes(layer.type)) {
          media.set(layer.url, { url: layer.url, type: layer.type as DesignMedia['type'], label: this.layerLabel(layer) });
        }
      }
    }
    return [...media.values()];
  }

  get filteredMediaLibrary(): DesignMedia[] {
    return this.mediaFilter === 'all' ? this.mediaLibrary : this.mediaLibrary.filter((media) => media.type === this.mediaFilter);
  }

  trackMediaByUrl(_index: number, media: DesignMedia): string {
    return media.url;
  }

  trackVisualById(index: number, item: VisualInvitationSection | VisualInvitationLayer): string | number {
    return item.id || index;
  }

  searchWebImages(): void {
    const query = this.webImageQuery.trim();
    if (query.length < 2) { this.webImageError = 'Escribe al menos 2 caracteres.'; return; }
    this.searchingWebImages = true;
    this.webImageError = '';
    this.api.searchWebImages(query, this.webImageOrientation || undefined).subscribe({
      next: ({ images }) => { this.webImageResults = images; this.searchingWebImages = false; },
      error: (error) => {
        this.webImageResults = [];
        this.searchingWebImages = false;
        this.webImageError = error?.error?.message || 'No fue posible buscar imágenes.';
      }
    });
  }

  addWebImage(image: WebImageSearchResult): void {
    if ((this.design.assets || []).some((asset) => asset.url === image.url)) {
      this.flash('La imagen ya está en tu biblioteca.');
      return;
    }
    this.api.trackWebImage(image.downloadLocation).subscribe({
      next: () => {
        this.recordHistory();
        this.design.assets = this.design.assets || [];
        this.design.assets.push({
          id: this.uid('asset'), url: image.url, type: 'image', name: image.alt || `Foto de ${image.photographer}`,
          attribution: `Foto de ${image.photographer} en Unsplash`, attributionUrl: image.photographerUrl,
          sourceUrl: image.sourceUrl, createdAt: new Date().toISOString()
        });
        this.flash('Imagen agregada a tu biblioteca.');
      },
      error: (error) => { this.webImageError = error?.error?.message || 'No fue posible agregar la imagen.'; }
    });
  }

  previewAnimation(layer: VisualInvitationLayer): void {
    if (!layer.animation || layer.animation.type === 'none') return;
    this.previewAnimationLayerId = '';
    setTimeout(() => { this.previewAnimationLayerId = layer.id; }, 0);
    const duration = Number(layer.animation.duration || 1) + Number(layer.animation.delay || 0);
    setTimeout(() => { if (this.previewAnimationLayerId === layer.id) this.previewAnimationLayerId = ''; }, Math.max(1200, duration * 1000 + 200));
  }

  animationFor(layer: VisualInvitationLayer): NonNullable<VisualInvitationLayer['animation']> {
    layer.animation = layer.animation || { type: 'none', duration: 1, delay: 0, repeat: false };
    return layer.animation;
  }

  editorAnimationClasses(layer: VisualInvitationLayer): Record<string, boolean> {
    const type = layer.animation?.type || 'none';
    return {
      'preview-animation': this.previewAnimationLayerId === layer.id,
      [`animation-${type}`]: this.previewAnimationLayerId === layer.id && type !== 'none'
    };
  }

  toggleTextShadow(layer: VisualInvitationLayer, enabled: boolean): void {
    layer.style = layer.style || {};
    layer.style.textShadow = enabled ? '0 2px 8px rgba(0,0,0,.35)' : '';
  }

  toggleLayerGradient(layer: VisualInvitationLayer, enabled: boolean): void {
    layer.style = layer.style || {};
    layer.style.gradientEnabled = enabled;
    if (!enabled) return;
    const backgroundColor = layer.style.backgroundColor;
    layer.style.gradientStart ||= backgroundColor && backgroundColor !== 'transparent' ? backgroundColor : '#ffffff';
    layer.style.gradientEnd ||= this.design.theme?.accentColor || '#000000';
    layer.style.gradientAngle ??= 90;
  }

  resetLayerAppearance(layer: VisualInvitationLayer): void {
    this.recordHistory();
    layer.style = {
      ...(layer.style || {}),
      borderWidth: 0,
      borderStyle: 'solid',
      borderColor: '#000000',
      borderRadius: 0,
      boxShadow: 'none',
      gradientEnabled: false,
      gradientStart: '#ffffff',
      gradientEnd: this.design.theme?.accentColor || '#000000',
      gradientAngle: 90
    };
  }

  selectSection(section: VisualInvitationSection): void {
    this.croppingLayerId = '';
    this.selectedSectionId = section.id;
    this.clearLayerSelection();
  }

  selectLayer(section: VisualInvitationSection, layer: VisualInvitationLayer, event: MouseEvent): void {
    event.stopPropagation();
    if (this.suppressNextLayerClickId === layer.id) {
      this.suppressNextLayerClickId = '';
      return;
    }
    if (this.layerDragState?.moved) return;
    if (event.detail >= 2 && layer.type === 'image') { this.startImageCrop(event, section, layer); return; }
    if (event.detail >= 2 && ['text', 'button'].includes(layer.type)) { this.startInlineEdit(event, section, layer); return; }
    if (this.croppingLayerId && this.croppingLayerId !== layer.id) this.croppingLayerId = '';
    this.applyLayerSelection(section, layer, event.shiftKey);
    this.inspectorView = 'properties';
  }

  selectLayerFromPanel(layer: VisualInvitationLayer, event: MouseEvent): void {
    event.stopPropagation();
    if (!this.selectedSection) return;
    this.applyLayerSelection(this.selectedSection, layer, event.shiftKey);
    this.inspectorView = 'properties';
  }

  addSection(type: string, title: string): void {
    this.recordHistory();
    const section = this.makeSection(type, title, this.design.theme?.backgroundColor || '#ffffff', 540);
    if (type !== 'custom' && !this.isFunctionalType(type)) section.layers.push(this.newLayer('text', title, 15, 12, 70, 18));
    this.design.sections.push(section);
    this.selectedSectionId = section.id;
    this.setLayerSelection(section.layers[0] ? [section.layers[0].id] : []);
  }

  addLayer(type: VisualLayerType): void {
    if (type === 'shape') { this.addShape('rectangle'); return; }
    const section = this.selectedSection;
    if (!section) return;
    this.recordHistory();
    const text = type === 'text' ? 'Escribe aquí' : type === 'button' ? 'Ver detalles' : '';
    const layer = this.newLayer(type, text, 20, 25, type === 'text' ? 60 : 45, type === 'text' ? 18 : 30);
    layer.zIndex = Math.max(0, ...section.layers.map((item) => item.zIndex || 0)) + 1;
    this.applyThemeToLayer(layer, this.design.theme || this.themePresets[0].theme);
    section.layers.push(layer);
    this.setLayerSelection([layer.id]);
  }

  addShape(kind: ShapeKind): void {
    const section = this.selectedSection;
    if (!section) return;
    this.recordHistory();
    const dimensions = this.shapeDimensions(kind);
    const layer = this.newLayer('shape', '', 20, 25, dimensions.width, dimensions.height);
    layer.zIndex = Math.max(0, ...section.layers.map((item) => item.zIndex || 0)) + 1;
    this.applyThemeToLayer(layer, this.design.theme || this.themePresets[0].theme);
    this.applyShapePreset(layer, kind);
    section.layers.push(layer);
    this.setLayerSelection([layer.id]);
    this.inspectorView = 'properties';
  }

  addComponent(key: string): void {
    const section = this.selectedSection;
    if (!section) { this.error = 'Selecciona una sección para agregar el bloque.'; return; }
    this.recordHistory();
    const groupId = this.uid('group');
    const topZ = Math.max(0, ...section.layers.map((item) => item.zIndex || 0));
    let layers: VisualInvitationLayer[] = [];
    if (key === 'hero') {
      const eyebrow = this.newLayer('text', 'CELEBREMOS JUNTOS', 15, 18, 70, 8, 13);
      const title = this.newLayer('text', this.invitation?.content?.headline || this.event?.title || 'Nuestra celebración', 8, 29, 84, 20, 48);
      const subtitle = this.newLayer('text', this.invitation?.content?.subheadline || 'Una fecha para recordar', 15, 53, 70, 10, 19);
      eyebrow.style = { ...eyebrow.style, color: '#9b6655', fontWeight: 700 };
      title.style = { ...title.style, fontFamily: 'Georgia, serif', fontWeight: 600 };
      subtitle.style = { ...subtitle.style, fontFamily: 'Georgia, serif', fontWeight: 400 };
      layers = [eyebrow, title, subtitle];
    } else if (key === 'heading') {
      const title = this.newLayer('text', 'Título de la sección', 12, 15, 76, 15, 38);
      title.style = { ...title.style, fontFamily: 'Georgia, serif' };
      layers = [title];
    } else if (key === 'imageCaption') {
      const image = this.newLayer('image', '', 10, 18, 80, 50);
      image.name = 'Fotografía';
      image.style = { ...image.style, borderRadius: 4, objectFit: 'cover', objectPositionX: 50, objectPositionY: 50 };
      const caption = this.newLayer('text', 'Escribe una descripción especial para esta fotografía', 15, 71, 70, 12, 18);
      caption.style = { ...caption.style, fontFamily: 'Georgia, serif', fontWeight: 400 };
      layers = [image, caption];
    } else if (key === 'quote') {
      const mark = this.newLayer('text', '“', 42, 18, 16, 16, 70);
      const quote = this.newLayer('text', 'Aquí comienza una historia que siempre querremos recordar.', 12, 35, 76, 25, 28);
      const author = this.newLayer('text', '— Los anfitriones', 25, 65, 50, 8, 14);
      mark.style = { ...mark.style, color: '#b57c62', fontFamily: 'Georgia, serif' };
      quote.style = { ...quote.style, fontFamily: 'Georgia, serif', fontWeight: 400 };
      author.style = { ...author.style, color: '#7a6f68', fontWeight: 400 };
      layers = [mark, quote, author];
    } else if (key === 'cta') {
      const button = this.newLayer('button', 'Confirmar asistencia', 25, 38, 50, 13, 17);
      button.name = 'Llamada a la acción';
      button.style = { ...button.style, color: '#ffffff', backgroundColor: '#262321', borderRadius: 4, fontWeight: 700 };
      layers = [button];
    } else if (key === 'divider') {
      const divider = this.newLayer('shape', '', 15, 48, 70, 1);
      divider.name = 'Separador';
      divider.style = { backgroundColor: '#b99482', borderRadius: 0, opacity: 1 };
      layers = [divider];
    }
    if (!layers.length) return;
    layers.forEach((layer, index) => {
      layer.groupId = layers.length > 1 ? groupId : undefined;
      layer.zIndex = topZ + index + 1;
      this.applyThemeToLayer(layer, this.design.theme || this.themePresets[0].theme);
    });
    section.layers.push(...layers);
    this.setLayerSelection(layers.map((layer) => layer.id));
    this.inspectorView = 'properties';
    this.flash('Bloque agregado. Puedes moverlo y personalizarlo.');
  }

  beginPaletteDrag(event: DragEvent, item: PaletteDragItem): void {
    this.paletteDragItem = item;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('text/plain', 'kyndra-visual-element');
    }
  }

  endPaletteDrag(): void {
    this.paletteDragItem = undefined;
    this.paletteDropSectionId = '';
  }

  dragPaletteOver(event: DragEvent, section: VisualInvitationSection): void {
    if (!this.paletteDragItem) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    this.paletteDropSectionId = section.id;
  }

  leavePaletteTarget(event: DragEvent, section: VisualInvitationSection): void {
    const target = event.currentTarget as HTMLElement;
    if (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) return;
    if (this.paletteDropSectionId === section.id) this.paletteDropSectionId = '';
  }

  dropPaletteItem(event: DragEvent, section: VisualInvitationSection): void {
    const item = this.paletteDragItem;
    if (!item) return;
    event.preventDefault();
    event.stopPropagation();
    const surface = event.currentTarget as HTMLElement;
    const rect = surface.getBoundingClientRect();
    const x = this.bound((event.clientX - rect.left) / rect.width * 100, 0, 100);
    const y = this.bound((event.clientY - rect.top) / rect.height * 100, 0, 100);
    this.selectedSectionId = section.id;

    if (item.kind === 'component') {
      this.addComponent(item.key);
      this.centerLayersAt(this.selectedLayers, x, y);
    } else {
      this.recordHistory();
      const type = item.kind === 'media' ? item.media.type : item.kind === 'shape' ? 'shape' : item.type;
      const text = type === 'text' ? 'Escribe aquí' : type === 'button' ? 'Ver detalles' : '';
      const shapeDimensions = item.kind === 'shape' ? this.shapeDimensions(item.shape) : undefined;
      const width = shapeDimensions?.width || (type === 'text' ? 60 : type === 'shape' ? 36 : 45);
      const height = shapeDimensions?.height || (type === 'text' ? 18 : type === 'button' ? 13 : type === 'shape' ? 22 : 30);
      const layer = this.newLayer(type, text, 0, 0, width, height);
      layer.x = this.bound(x - width / 2, 0, 100 - width);
      layer.y = this.bound(y - height / 2, 0, 100 - height);
      layer.zIndex = Math.max(0, ...section.layers.map((entry) => entry.zIndex || 0)) + 1;
      if (item.kind === 'media') {
        layer.url = item.media.url;
        layer.name = item.media.label;
      }
      this.applyThemeToLayer(layer, this.design.theme || this.themePresets[0].theme);
      if (type === 'shape') this.applyShapePreset(layer, item.kind === 'shape' ? item.shape : 'rectangle');
      section.layers.push(layer);
      this.setLayerSelection([layer.id]);
    }
    this.inspectorView = 'properties';
    this.endPaletteDrag();
    this.flash('Elemento agregado en el lienzo.');
  }

  uploadLibraryFiles(fileInput: HTMLInputElement): void {
    const eventId = this.invitation && (typeof this.invitation.event === 'string'
      ? this.invitation.event
      : (this.invitation.event._id || this.invitation.event.id));
    const files = Array.from(fileInput.files || []).filter((file) => /^(image|video|audio)\//.test(file.type));
    if (!eventId || !files.length) return;
    this.uploading = true;
    this.error = '';
    const uploads = files.map((file) => {
      const type = file.type.split('/')[0] as DesignMedia['type'];
      const folder = type === 'audio' ? 'music' : 'assets';
      return this.api.createUploadUrl({ fileName: file.name, contentType: file.type, folder, event: eventId, size: file.size }).pipe(
        switchMap(({ uploadUrl, publicUrl }) => this.api.uploadAsset(uploadUrl, file).pipe(map(() => ({ file, publicUrl, type }))))
      );
    });
    forkJoin(uploads).subscribe({
      next: (results) => {
        this.recordHistory();
        this.design.assets = this.design.assets || [];
        const knownUrls = new Set(this.design.assets.map((asset) => asset.url));
        const assets: VisualInvitationAsset[] = results.filter((result) => !knownUrls.has(result.publicUrl)).map((result) => ({
          id: this.uid('asset'), url: result.publicUrl, type: result.type, name: result.file.name, createdAt: new Date().toISOString()
        }));
        this.design.assets.push(...assets);
        this.uploading = false;
        fileInput.value = '';
        this.flash(`${assets.length} archivo${assets.length === 1 ? '' : 's'} agregado${assets.length === 1 ? '' : 's'} a la biblioteca.`);
      },
      error: (error) => {
        this.uploading = false;
        fileInput.value = '';
        this.error = error?.error?.message || 'No fue posible subir uno de los archivos.';
      }
    });
  }

  removeLibraryAsset(media: DesignMedia, event: MouseEvent): void {
    event.stopPropagation();
    if (!media.id || !media.stored) return;
    this.recordHistory();
    this.design.assets = (this.design.assets || []).filter((asset) => asset.id !== media.id);
  }

  removeLayer(): void {
    const section = this.selectedSection;
    const ids = new Set(this.selectedLayerIds);
    if (!section || !ids.size) return;
    this.recordHistory();
    section.layers = section.layers.filter((item) => !ids.has(item.id));
    this.clearLayerSelection();
  }

  duplicateLayer(): void {
    const section = this.selectedSection;
    const layers = this.selectedLayers;
    if (!section || !layers.length) return;
    this.recordHistory();
    const copiedGroup = layers.length > 1 ? this.uid('group') : undefined;
    const copies = layers.map((layer) => {
      const copy = this.clone(layer);
      copy.id = this.uid('layer');
      copy.groupId = copiedGroup;
      copy.name = `${this.layerLabel(layer)} copia`;
      copy.x = this.bound(copy.x + 3, 0, 100 - copy.width);
      copy.y = this.bound(copy.y + 3, 0, 100 - copy.height);
      if (copy.layouts) Object.values(copy.layouts).forEach((layout) => {
        if (!layout) return;
        layout.x = this.bound(layout.x + 3, 0, 100 - layout.width);
        layout.y = this.bound(layout.y + 3, 0, 100 - layout.height);
      });
      copy.zIndex = (copy.zIndex || 1) + 1;
      return copy;
    });
    section.layers.push(...copies);
    this.setLayerSelection(copies.map((copy) => copy.id));
  }

  copySelectedLayers(): void {
    if (!this.selectedLayers.length) return;
    this.clipboardLayers = this.clone(this.selectedLayers);
    this.flash(`${this.clipboardLayers.length} elemento${this.clipboardLayers.length === 1 ? '' : 's'} copiado${this.clipboardLayers.length === 1 ? '' : 's'}.`);
  }

  cutSelectedLayers(): void {
    if (!this.selectedLayers.length) return;
    this.clipboardLayers = this.clone(this.selectedLayers);
    this.removeLayer();
    this.flash('Elementos cortados. Selecciona otra sección y pégalos.');
  }

  pasteLayers(): void {
    const section = this.selectedSection;
    if (!section || !this.clipboardLayers.length) return;
    this.recordHistory();
    const groupIds = new Map<string, string>();
    const topZ = Math.max(0, ...section.layers.map((item) => item.zIndex || 0));
    const copies = this.clipboardLayers.map((source, index) => {
      const copy = this.clone(source);
      copy.id = this.uid('layer');
      if (copy.groupId) {
        if (!groupIds.has(copy.groupId)) groupIds.set(copy.groupId, this.uid('group'));
        copy.groupId = groupIds.get(copy.groupId);
      }
      copy.name = `${this.layerLabel(source)} copia`;
      copy.x = this.bound(copy.x + 3, 0, 100 - copy.width);
      copy.y = this.bound(copy.y + 3, 0, 100 - copy.height);
      if (copy.layouts) Object.values(copy.layouts).forEach((layout) => {
        if (!layout) return;
        layout.x = this.bound(layout.x + 3, 0, 100 - layout.width);
        layout.y = this.bound(layout.y + 3, 0, 100 - layout.height);
      });
      copy.zIndex = topZ + index + 1;
      return copy;
    });
    section.layers.push(...copies);
    this.setLayerSelection(copies.map((copy) => copy.id));
    this.flash(`${copies.length} elemento${copies.length === 1 ? '' : 's'} pegado${copies.length === 1 ? '' : 's'}.`);
  }

  removeSection(section: VisualInvitationSection): void {
    if (this.design.sections.length <= 1) return;
    this.recordHistory();
    this.design.sections = this.design.sections.filter((item) => item.id !== section.id);
    this.selectedSectionId = this.design.sections[0].id;
    this.clearLayerSelection();
  }

  dropSection(event: CdkDragDrop<VisualInvitationSection[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    this.recordHistory();
    moveItemInArray(this.design.sections, event.previousIndex, event.currentIndex);
  }

  beginLayerDrag(event: PointerEvent, layer: VisualInvitationLayer, section: VisualInvitationSection): void {
    if (layer.locked || this.resizing || this.editingLayerId === layer.id || this.croppingLayerId === layer.id || (event.target as HTMLElement).closest('.resize-handle, .rotate-handle, .layer-toolbar, .inline-text-editor, .crop-toolbar, audio, video, button, input')) return;
    event.preventDefault();
    event.stopPropagation();
    const canvas = (event.currentTarget as HTMLElement).closest('.layer-surface') as HTMLElement;
    if (!canvas) return;
    if (event.shiftKey) {
      this.applyLayerSelection(section, layer, true);
      this.suppressNextLayerClickId = layer.id;
      return;
    }
    if (!this.selectedLayerIds.includes(layer.id)) this.applyLayerSelection(section, layer, false);
    const items = this.selectedLayers.filter((item) => !item.locked).map((item) => {
      const layout = this.editableLayout(item);
      return { layer: item, layout, x: layout.x, y: layout.y, width: layout.width, height: layout.height };
    });
    if (!items.length) return;
    const minX = Math.min(...items.map((item) => item.x));
    const minY = Math.min(...items.map((item) => item.y));
    const maxX = Math.max(...items.map((item) => item.x + item.width));
    const maxY = Math.max(...items.map((item) => item.y + item.height));
    this.inspectorView = 'properties';
    this.draggingLayerId = layer.id;
    this.layerDragState = {
      layer, section, items, canvas, startX: event.clientX, startY: event.clientY,
      bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY }, moved: false
    };
  }

  beginMarquee(event: PointerEvent, section: VisualInvitationSection): void {
    if (event.button !== 0 || this.paletteDragItem || event.target !== event.currentTarget) return;
    event.preventDefault();
    event.stopPropagation();
    const canvas = event.currentTarget as HTMLElement;
    const rect = canvas.getBoundingClientRect();
    const startX = this.bound((event.clientX - rect.left) / rect.width * 100, 0, 100);
    const startY = this.bound((event.clientY - rect.top) / rect.height * 100, 0, 100);
    if (this.selectedSectionId !== section.id) {
      this.selectedSectionId = section.id;
      this.clearLayerSelection();
    }
    const baseIds = event.shiftKey ? [...this.selectedLayerIds] : [];
    if (!event.shiftKey) this.clearLayerSelection();
    this.marqueeState = { section, canvas, startX, startY, baseIds, moved: false };
    this.selectionMarquee = { sectionId: section.id, left: startX, top: startY, width: 0, height: 0 };
    this.inspectorView = 'properties';
  }

  beginResize(event: PointerEvent, layer: VisualInvitationLayer, corner: ResizeCorner): void {
    if (layer.locked) return;
    event.preventDefault();
    event.stopPropagation();
    const canvas = (event.currentTarget as HTMLElement).closest('.canvas-section') as HTMLElement;
    if (!canvas) return;
    this.recordHistory();
    this.resizing = true;
    const layout = this.editableLayout(layer);
    this.resizeState = {
      corner, layout, canvas, startX: event.clientX, startY: event.clientY,
      x: layout.x, y: layout.y, width: layout.width, height: layout.height
    };
  }

  beginRotate(event: PointerEvent, layer: VisualInvitationLayer): void {
    if (layer.locked) return;
    event.preventDefault();
    event.stopPropagation();
    const element = (event.currentTarget as HTMLElement).closest('.canvas-layer') as HTMLElement;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const layout = this.editableLayout(layer);
    this.recordHistory();
    this.resizing = true;
    this.rotationState = {
      layout,
      centerX,
      centerY,
      startAngle: Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180 / Math.PI,
      initialRotation: Number(layout.rotation || 0)
    };
  }

  startInlineEdit(event: MouseEvent, section: VisualInvitationSection, layer: VisualInvitationLayer): void {
    if (layer.locked || !['text', 'button'].includes(layer.type)) return;
    event.preventDefault();
    event.stopPropagation();
    this.applyLayerSelection(section, layer, false);
    this.recordHistory();
    this.inlineEditOriginal = layer.text || '';
    this.editingLayerId = layer.id;
    setTimeout(() => {
      const editor = document.querySelector(`[data-inline-editor="${layer.id}"]`) as HTMLElement | null;
      if (!editor) return;
      editor.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editor);
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
  }

  startImageCrop(event: MouseEvent, section: VisualInvitationSection, layer: VisualInvitationLayer): void {
    event.preventDefault();
    event.stopPropagation();
    this.activateImageCrop(section, layer);
  }

  startMobileImageCrop(layer: VisualInvitationLayer): void {
    const section = this.selectedSection;
    if (!section) return;
    this.activateImageCrop(section, layer);
  }

  private activateImageCrop(section: VisualInvitationSection, layer: VisualInvitationLayer): void {
    if (layer.locked || layer.type !== 'image' || !layer.url) return;
    this.applyLayerSelection(section, layer, false);
    layer.style = {
      ...(layer.style || {}),
      objectFit: 'cover',
      objectPositionX: layer.style?.objectPositionX ?? 50,
      objectPositionY: layer.style?.objectPositionY ?? 50,
      imageScale: layer.style?.imageScale ?? 1
    };
    this.croppingLayerId = layer.id;
    this.inspectorView = 'properties';
  }

  finishImageCrop(): void {
    this.cropPanState = undefined;
    this.imageCropGesture = undefined;
    this.touchGestureActive = false;
    this.croppingLayerId = '';
  }

  beginImageCropPan(event: PointerEvent, layer: VisualInvitationLayer): void {
    if (this.croppingLayerId !== layer.id || layer.locked || this.imageCropGesture) return;
    event.preventDefault();
    event.stopPropagation();
    const frame = event.currentTarget as HTMLElement;
    this.recordHistory();
    layer.style = layer.style || {};
    this.cropPanState = {
      layer,
      frame,
      startX: event.clientX,
      startY: event.clientY,
      positionX: Number(layer.style.objectPositionX ?? 50),
      positionY: Number(layer.style.objectPositionY ?? 50)
    };
  }

  adjustImageCropZoom(layer: VisualInvitationLayer, delta: number): void {
    if (layer.locked) return;
    this.recordHistory();
    layer.style = layer.style || {};
    layer.style.imageScale = this.bound(Number(layer.style.imageScale || 1) + delta, .5, 3);
  }

  finishInlineEdit(event: FocusEvent, layer: VisualInvitationLayer): void {
    if (this.editingLayerId !== layer.id) return;
    const target = event.target as HTMLElement;
    layer.text = (target.innerText || '').replace(/\n{3,}/g, '\n\n').trim();
    this.editingLayerId = '';
  }

  handleInlineKeydown(event: KeyboardEvent, layer: VisualInvitationLayer): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      layer.text = this.inlineEditOriginal;
      this.editingLayerId = '';
      (event.target as HTMLElement).blur();
      return;
    }
    if ((layer.type === 'button' && event.key === 'Enter') || ((event.ctrlKey || event.metaKey) && event.key === 'Enter')) {
      event.preventDefault();
      (event.target as HTMLElement).blur();
    }
  }

  @HostListener('document:pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (this.canvasGesture || this.imageCropGesture) {
      event.preventDefault();
      return;
    }
    const crop = this.cropPanState;
    if (crop) {
      event.preventDefault();
      const width = Math.max(1, crop.frame.clientWidth);
      const height = Math.max(1, crop.frame.clientHeight);
      crop.layer.style = crop.layer.style || {};
      crop.layer.style.objectPositionX = this.bound(crop.positionX - (event.clientX - crop.startX) / width * 100, 0, 100);
      crop.layer.style.objectPositionY = this.bound(crop.positionY - (event.clientY - crop.startY) / height * 100, 0, 100);
      return;
    }
    const marquee = this.marqueeState;
    if (marquee) {
      const rect = marquee.canvas.getBoundingClientRect();
      const currentX = this.bound((event.clientX - rect.left) / rect.width * 100, 0, 100);
      const currentY = this.bound((event.clientY - rect.top) / rect.height * 100, 0, 100);
      const startClientX = rect.left + marquee.startX / 100 * rect.width;
      const startClientY = rect.top + marquee.startY / 100 * rect.height;
      if (!marquee.moved && Math.hypot(event.clientX - startClientX, event.clientY - startClientY) < 3) return;
      event.preventDefault();
      marquee.moved = true;
      const left = Math.min(marquee.startX, currentX);
      const top = Math.min(marquee.startY, currentY);
      this.selectionMarquee = {
        sectionId: marquee.section.id,
        left,
        top,
        width: Math.abs(currentX - marquee.startX),
        height: Math.abs(currentY - marquee.startY)
      };
      const right = left + this.selectionMarquee.width;
      const bottom = top + this.selectionMarquee.height;
      const intersected = marquee.section.layers.filter((layer) => {
        if (layer.hidden) return false;
        const layout = this.layoutFor(layer);
        return layout.x < right && layout.x + layout.width > left && layout.y < bottom && layout.y + layout.height > top;
      });
      const matchedGroups = new Set(intersected.map((layer) => layer.groupId).filter(Boolean) as string[]);
      const matched = marquee.section.layers.filter((layer) =>
        intersected.some((item) => item.id === layer.id) || (!!layer.groupId && matchedGroups.has(layer.groupId))
      ).map((layer) => layer.id);
      this.setLayerSelection([...marquee.baseIds, ...matched]);
      return;
    }
    const rotation = this.rotationState;
    if (rotation) {
      event.preventDefault();
      const angle = Math.atan2(event.clientY - rotation.centerY, event.clientX - rotation.centerX) * 180 / Math.PI;
      let next = rotation.initialRotation + angle - rotation.startAngle;
      next = event.shiftKey ? Math.round(next / 15) * 15 : Math.round(next);
      rotation.layout.rotation = ((next + 180) % 360 + 360) % 360 - 180;
      return;
    }
    const resize = this.resizeState;
    if (resize) {
      event.preventDefault();
      const dx = (event.clientX - resize.startX) / resize.canvas.clientWidth * 100;
      const dy = (event.clientY - resize.startY) / resize.canvas.clientHeight * 100;
      const west = resize.corner.includes('w');
      const north = resize.corner.includes('n');
      const nextX = west ? resize.x + dx : resize.x;
      const nextY = north ? resize.y + dy : resize.y;
      const nextWidth = west ? resize.width - dx : resize.width + dx;
      const nextHeight = north ? resize.height - dy : resize.height + dy;
      const precision = event.pointerType === 'touch' ? 2 : 100;
      const round = (value: number) => Math.round(value * precision) / precision;
      resize.layout.x = round(this.bound(nextX, 0, resize.x + resize.width - 4));
      resize.layout.y = round(this.bound(nextY, 0, resize.y + resize.height - 4));
      resize.layout.width = round(this.bound(nextWidth, 4, 100 - resize.layout.x));
      resize.layout.height = round(this.bound(nextHeight, 4, 100 - resize.layout.y));
      return;
    }
    const drag = this.layerDragState;
    if (!drag) return;
    const distanceX = event.clientX - drag.startX;
    const distanceY = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(distanceX, distanceY) < 3) return;
    event.preventDefault();
    if (!drag.moved) { this.recordHistory(); drag.moved = true; }
    const rawX = this.bound(drag.bounds.x + distanceX / drag.canvas.clientWidth * 100, 0, 100 - drag.bounds.width);
    const rawY = this.bound(drag.bounds.y + distanceY / drag.canvas.clientHeight * 100, 0, 100 - drag.bounds.height);
    const ignoredIds = new Set(drag.items.map((item) => item.layer.id));
    const snapped = this.snapRawPosition(drag.layer, drag.section, drag.canvas, rawX, rawY, drag.bounds.width, drag.bounds.height, ignoredIds);
    const dx = snapped.x - drag.bounds.x;
    const dy = snapped.y - drag.bounds.y;
    for (const item of drag.items) {
      item.layout.x = this.bound(item.x + dx, 0, 100 - item.width);
      item.layout.y = this.bound(item.y + dy, 0, 100 - item.height);
    }
    this.guideX = snapped.guideX;
    this.guideY = snapped.guideY;
  }

  @HostListener('document:pointerup')
  endPointerInteraction(): void {
    if (this.layerDragState?.moved) this.suppressNextLayerClickId = this.layerDragState.layer.id;
    this.resizeState = undefined;
    this.rotationState = undefined;
    this.marqueeState = undefined;
    this.selectionMarquee = undefined;
    this.cropPanState = undefined;
    this.layerDragState = undefined;
    this.draggingLayerId = '';
    this.guideX = null;
    this.guideY = null;
    setTimeout(() => { this.resizing = false; });
  }

  toggleLayerHidden(layer: VisualInvitationLayer, event?: MouseEvent): void {
    event?.stopPropagation();
    this.recordHistory();
    layer.hidden = !layer.hidden;
  }

  toggleLayerLocked(layer: VisualInvitationLayer, event?: MouseEvent): void {
    event?.stopPropagation();
    this.recordHistory();
    layer.locked = !layer.locked;
  }

  shiftLayer(layer: VisualInvitationLayer, direction: 1 | -1): void {
    const section = this.selectedSection;
    if (!section) return;
    const ordered = [...section.layers].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    ordered.forEach((item, index) => { item.zIndex = index + 1; });
    const index = ordered.findIndex((item) => item.id === layer.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    this.recordHistory();
    const currentZ = ordered[index].zIndex;
    ordered[index].zIndex = ordered[target].zIndex;
    ordered[target].zIndex = currentZ;
  }

  isLayerSelected(layer: VisualInvitationLayer): boolean {
    return this.selectedLayerIds.includes(layer.id);
  }

  groupSelectedLayers(): void {
    const layers = this.selectedLayers;
    if (layers.length < 2) return;
    this.recordHistory();
    const groupId = this.uid('group');
    layers.forEach((layer) => { layer.groupId = groupId; });
    this.flash(`${layers.length} elementos agrupados.`);
  }

  ungroupSelectedLayers(): void {
    const section = this.selectedSection;
    if (!section) return;
    const groupIds = new Set(this.selectedLayers.map((layer) => layer.groupId).filter(Boolean) as string[]);
    if (!groupIds.size) return;
    this.recordHistory();
    section.layers.forEach((layer) => { if (layer.groupId && groupIds.has(layer.groupId)) delete layer.groupId; });
    this.flash('Elementos desagrupados.');
  }

  alignSelection(mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): void {
    const layers = this.selectedLayers.filter((layer) => !layer.locked);
    if (layers.length < 2) return;
    const layouts = layers.map((layer) => this.editableLayout(layer));
    const left = Math.min(...layouts.map((layout) => layout.x));
    const right = Math.max(...layouts.map((layout) => layout.x + layout.width));
    const top = Math.min(...layouts.map((layout) => layout.y));
    const bottom = Math.max(...layouts.map((layout) => layout.y + layout.height));
    const center = (left + right) / 2;
    const middle = (top + bottom) / 2;
    this.recordHistory();
    layouts.forEach((layout) => {
      if (mode === 'left') layout.x = left;
      if (mode === 'center') layout.x = this.bound(center - layout.width / 2, 0, 100 - layout.width);
      if (mode === 'right') layout.x = this.bound(right - layout.width, 0, 100 - layout.width);
      if (mode === 'top') layout.y = top;
      if (mode === 'middle') layout.y = this.bound(middle - layout.height / 2, 0, 100 - layout.height);
      if (mode === 'bottom') layout.y = this.bound(bottom - layout.height, 0, 100 - layout.height);
    });
  }

  distributeSelection(axis: 'horizontal' | 'vertical'): void {
    const layers = this.selectedLayers.filter((layer) => !layer.locked);
    if (layers.length < 3) return;
    const entries = layers.map((layer) => ({ layer, layout: this.editableLayout(layer) }));
    entries.sort((a, b) => axis === 'horizontal' ? a.layout.x - b.layout.x : a.layout.y - b.layout.y);
    const first = entries[0].layout;
    const last = entries[entries.length - 1].layout;
    const start = axis === 'horizontal' ? first.x : first.y;
    const end = axis === 'horizontal' ? last.x + last.width : last.y + last.height;
    const occupied = entries.reduce((sum, entry) => sum + (axis === 'horizontal' ? entry.layout.width : entry.layout.height), 0);
    const gap = (end - start - occupied) / (entries.length - 1);
    this.recordHistory();
    let cursor = start;
    entries.forEach((entry) => {
      if (axis === 'horizontal') entry.layout.x = this.bound(cursor, 0, 100 - entry.layout.width);
      else entry.layout.y = this.bound(cursor, 0, 100 - entry.layout.height);
      cursor += (axis === 'horizontal' ? entry.layout.width : entry.layout.height) + gap;
    });
  }

  applyMedia(media: DesignMedia): void {
    let layer = this.selectedLayer;
    let created = false;
    if (!layer || !['image', 'video', 'audio'].includes(layer.type)) {
      this.addLayer(media.type);
      layer = this.selectedLayer;
      created = true;
    }
    if (!layer) return;
    if (!created) this.recordHistory();
    layer.type = media.type;
    layer.url = media.url;
    layer.name = media.label;
  }

  setSectionBackground(media: DesignMedia): void {
    if (media.type !== 'image' || !this.selectedSection) return;
    this.recordHistory();
    this.selectedSection.background = { ...(this.selectedSection.background || {}), imageUrl: media.url };
  }

  layerLabel(layer: VisualInvitationLayer): string {
    if (layer.name?.trim()) return layer.name.trim();
    if (layer.text?.trim()) return layer.text.trim().slice(0, 32);
    return this.layerTypeLabel(layer.type);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) return;
    const modifier = event.ctrlKey || event.metaKey;
    if (modifier && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? this.redo() : this.undo(); return; }
    if (modifier && event.key.toLowerCase() === 'y') { event.preventDefault(); this.redo(); return; }
    if (modifier && event.key.toLowerCase() === 'c' && this.selectedLayerCount) { event.preventDefault(); this.copySelectedLayers(); return; }
    if (modifier && event.key.toLowerCase() === 'x' && this.selectedLayerCount) { event.preventDefault(); this.cutSelectedLayers(); return; }
    if (modifier && event.key.toLowerCase() === 'v' && this.hasClipboardLayers) { event.preventDefault(); this.pasteLayers(); return; }
    if (modifier && event.key.toLowerCase() === 'd' && this.selectedLayer) { event.preventDefault(); this.duplicateLayer(); return; }
    if ((event.key === 'Delete' || event.key === 'Backspace') && this.selectedLayer) { event.preventDefault(); this.removeLayer(); return; }
    if (event.key === 'Escape' && this.croppingLayerId) { this.finishImageCrop(); return; }
    if (event.key === 'Escape') { this.clearLayerSelection(); return; }
    const layers = this.selectedLayers.filter((layer) => !layer.locked);
    if (!layers.length || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    this.recordHistory();
    const step = event.shiftKey ? 2 : .25;
    layers.forEach((layer) => {
      const layout = this.editableLayout(layer);
      if (event.key === 'ArrowLeft') layout.x = this.bound(layout.x - step, 0, 100 - layout.width);
      if (event.key === 'ArrowRight') layout.x = this.bound(layout.x + step, 0, 100 - layout.width);
      if (event.key === 'ArrowUp') layout.y = this.bound(layout.y - step, 0, 100 - layout.height);
      if (event.key === 'ArrowDown') layout.y = this.bound(layout.y + step, 0, 100 - layout.height);
    });
  }

  layerStyle(layer: VisualInvitationLayer): Record<string, string> {
    const s = layer.style || {};
    const shape = layer.type === 'shape';
    const layout = this.layoutFor(layer);
    return {
      left: `${layout.x}%`, top: `${layout.y}%`, width: `${layout.width}%`, height: `${layout.height}%`,
      transform: `rotate(${layout.rotation || 0}deg)`, zIndex: String(layer.zIndex || 1),
      color: String(s.color || '#2d2927'), backgroundColor: shape ? 'transparent' : String(s.backgroundColor || 'transparent'),
      fontFamily: String(s.fontFamily || 'Arial, sans-serif'), fontSize: `${Number(s.fontSize || 30)}px`,
      fontWeight: String(s.fontWeight || 400), textAlign: String(s.textAlign || 'center'),
      lineHeight: String(s.lineHeight || 1.2), letterSpacing: `${Number(s.letterSpacing || 0)}px`, textTransform: String(s.textTransform || 'none'),
      textDecoration: String(s.textDecoration || 'none'), textShadow: String(s.textShadow || 'none'),
      borderRadius: shape ? '0' : `${Number(s.borderRadius || 0)}px`, borderColor: shape ? 'transparent' : String(s.borderColor || 'transparent'),
      borderStyle: !shape && Number(s.borderWidth || 0) > 0 ? String(s.borderStyle || 'solid') : 'none', borderWidth: shape ? '0' : `${Number(s.borderWidth || 0)}px`,
      backgroundImage: !shape && s.gradientEnabled ? `linear-gradient(${Number(s.gradientAngle || 0)}deg,${String(s.gradientStart || '#ffffff')},${String(s.gradientEnd || '#000000')})` : 'none',
      boxShadow: shape ? 'none' : String(s.boxShadow || 'none'), opacity: String(s.opacity ?? 1),
      animationDuration: `${Number(layer.animation?.duration || 1)}s`, animationDelay: `${Number(layer.animation?.delay || 0)}s`,
      animationIterationCount: layer.animation?.repeat ? 'infinite' : '1'
    };
  }

  imageStyle(layer: VisualInvitationLayer): Record<string, string> {
    const style = layer.style || {};
    const scale = Number(style.imageScale || 1);
    const scaleX = scale * (style.flipX ? -1 : 1);
    const scaleY = scale * (style.flipY ? -1 : 1);
    return {
      objectFit: style.objectFit || 'cover',
      objectPosition: `${style.objectPositionX ?? 50}% ${style.objectPositionY ?? 50}%`,
      transform: `scale(${scaleX},${scaleY}) rotate(${Number(style.imageRotation || 0)}deg)`,
      filter: `brightness(${Number(style.brightness ?? 100)}%) contrast(${Number(style.contrast ?? 100)}%) saturate(${Number(style.saturation ?? 100)}%) blur(${Number(style.blur || 0)}px)`
    };
  }

  imageMaskStyle(layer: VisualInvitationLayer): Record<string, string> {
    const mask = layer.style?.imageMask || 'none';
    return { clipPath: this.maskClipPath(mask), borderRadius: mask === 'rounded' ? '12%' : '0' };
  }

  setImageMask(layer: VisualInvitationLayer, mask: ImageMask): void {
    layer.style = layer.style || {};
    if ((layer.style.imageMask || 'none') === mask) return;
    this.recordHistory();
    layer.style.imageMask = mask;
  }

  shapeContentStyle(layer: VisualInvitationLayer): Record<string, string> {
    const style = layer.style || {};
    return {
      width: '100%', height: '100%',
      backgroundColor: String(style.backgroundColor || this.design.theme?.accentColor || '#d88f7d'),
      backgroundImage: style.gradientEnabled ? `linear-gradient(${Number(style.gradientAngle || 0)}deg,${String(style.gradientStart || '#ffffff')},${String(style.gradientEnd || '#000000')})` : 'none',
      border: `${Number(style.borderWidth || 0)}px ${String(style.borderStyle || 'solid')} ${String(style.borderColor || 'transparent')}`,
      borderRadius: `${Number(style.borderRadius || 0)}px`, boxShadow: String(style.boxShadow || 'none'),
      clipPath: this.shapeClipPath(style.shapeKind || 'rectangle')
    };
  }

  resetImageAdjustments(layer: VisualInvitationLayer): void {
    this.recordHistory();
    layer.style = {
      ...(layer.style || {}), objectFit: 'cover', objectPositionX: 50, objectPositionY: 50,
      imageScale: 1, imageRotation: 0, flipX: false, flipY: false,
      brightness: 100, contrast: 100, saturation: 100, blur: 0, imageMask: 'none'
    };
  }

  private maskClipPath(mask: ImageMask): string {
    const masks: Record<ImageMask, string> = {
      none: 'none', circle: 'circle(50% at 50% 50%)', rounded: 'inset(0 round 12%)',
      arch: 'inset(0 round 50% 50% 10% 10%)', diamond: 'polygon(50% 0,100% 50%,50% 100%,0 50%)',
      hexagon: 'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)',
      ticket: 'polygon(0 0,100% 0,100% 38%,92% 50%,100% 62%,100% 100%,0 100%,0 62%,8% 50%,0 38%)'
    };
    return masks[mask];
  }

  private shapeClipPath(kind: ShapeKind): string {
    const shapes: Record<ShapeKind, string> = {
      rectangle: 'none', circle: 'circle(50% at 50% 50%)', ellipse: 'ellipse(50% 42% at 50% 50%)',
      triangle: 'polygon(50% 0,100% 100%,0 100%)', diamond: 'polygon(50% 0,100% 50%,50% 100%,0 50%)',
      star: 'polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 93%,50% 72%,21% 93%,32% 57%,2% 35%,39% 35%)',
      hexagon: 'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)', line: 'inset(42% 0)'
    };
    return shapes[kind];
  }

  private shapeDimensions(kind: ShapeKind): { width: number; height: number } {
    if (kind === 'line') return { width: 58, height: 4 };
    if (kind === 'ellipse') return { width: 42, height: 24 };
    return { width: 30, height: 30 };
  }

  private applyShapePreset(layer: VisualInvitationLayer, kind: ShapeKind): void {
    layer.name = this.shapeCatalog.find((item) => item.key === kind)?.label || 'Forma';
    layer.style = {
      ...(layer.style || {}), shapeKind: kind,
      backgroundColor: this.design.theme?.accentColor || '#d88f7d',
      borderRadius: kind === 'rectangle' ? 8 : 0, opacity: 1
    };
  }

  sectionStyle(section: VisualInvitationSection): Record<string, string> {
    const bg = section.background || {};
    const alpha = Math.round((bg.overlay || 0) * 255).toString(16).padStart(2, '0');
    return {
      height: `${section.height}px`, backgroundColor: bg.color || '#fff',
      backgroundImage: bg.imageUrl ? `linear-gradient(#000000${alpha},#000000${alpha}),url("${bg.imageUrl}")` : 'none'
    };
  }

  functionalPreviewStyle(section: VisualInvitationSection): Record<string, string> {
    const theme = this.design.theme || this.themePresets[0].theme;
    const moduleStyle = section.moduleStyle || {};
    const buttonStyle = theme.buttonStyle || 'solid';
    const buttonColor = String(theme.buttonBackgroundColor || '#292523');
    return {
      '--module-background': String(theme.backgroundColor || '#ffffff'),
      '--module-text': String(theme.textColor || '#292523'),
      '--module-accent': String(theme.accentColor || '#9a6754'),
      '--module-heading-font': String(theme.headingFont || 'Georgia, serif'),
      '--module-body-font': String(theme.bodyFont || 'Arial, sans-serif'),
      '--module-button-background': buttonStyle === 'solid' ? buttonColor : buttonStyle === 'soft' ? `color-mix(in srgb,${buttonColor} 16%,transparent)` : 'transparent',
      '--module-button-text': buttonStyle === 'solid' ? String(theme.buttonTextColor || '#ffffff') : buttonColor,
      '--module-button-border': buttonStyle === 'outline' ? `1px solid ${buttonColor}` : '1px solid transparent',
      '--module-button-radius': `${Number(theme.buttonRadius || 0)}px`,
      '--module-columns': String(moduleStyle.columns || 2),
      '--module-gap': `${Number(moduleStyle.gap ?? 11)}px`
    };
  }

  moduleClasses(section: VisualInvitationSection): string[] {
    const style = section.moduleStyle || {};
    return [
      `module-layout-${style.layout || 'grid'}`,
      `module-align-${style.alignment || 'center'}`,
      `module-surface-${style.surface || 'solid'}`,
      `module-cards-${style.cardStyle || 'bordered'}`,
      style.showTitle === false ? 'module-title-hidden' : 'module-title-visible'
    ];
  }

  setModuleStyle(
    section: VisualInvitationSection,
    key: keyof NonNullable<VisualInvitationSection['moduleStyle']>,
    value: string | number | boolean
  ): void {
    section.moduleStyle = { ...this.defaultModuleStyle(), ...(section.moduleStyle || {}), [key]: value } as NonNullable<VisualInvitationSection['moduleStyle']>;
  }

  beginContentEdit(): void {
    this.recordHistory();
  }

  updateStoryContent(field: 'storyTitle' | 'storyBody', value: string): void {
    if (!this.invitation) return;
    this.invitation.content[field] = value;
    if (this.selectedSection?.type !== 'story') return;
    const textLayers = this.selectedSection.layers.filter((layer) => layer.type === 'text');
    const target = field === 'storyTitle' ? textLayers[0] : textLayers[1];
    if (target) target.text = value;
  }

  addContentItem(key: ContentListKey): void {
    if (!this.invitation) return;
    this.recordHistory();
    if (key === 'locations') this.invitation.content.locations!.push({ type: 'venue', name: '', address: '', mapUrl: '', wazeUrl: '', notes: '' });
    if (key === 'itinerary') this.invitation.content.itinerary!.push({ time: '', title: '', description: '' });
    if (key === 'gallery') this.invitation.content.gallery!.push('');
    if (key === 'giftRegistry') this.invitation.content.giftRegistry!.push({ store: '', title: '', url: '', imageUrl: '', note: '', priority: this.invitation.content.giftRegistry!.length });
  }

  removeContentItem(key: ContentListKey, index: number): void {
    const items = this.contentList(key);
    if (index < 0 || index >= items.length) return;
    this.recordHistory();
    items.splice(index, 1);
    if (key === 'giftRegistry') this.invitation?.content.giftRegistry?.forEach((item, itemIndex) => { item.priority = itemIndex; });
  }

  dropContentItem(event: { previousIndex: number; currentIndex: number }, key: ContentListKey): void {
    if (event.previousIndex === event.currentIndex) return;
    this.recordHistory();
    moveItemInArray(this.contentList(key), event.previousIndex, event.currentIndex);
    if (key === 'giftRegistry') this.invitation?.content.giftRegistry?.forEach((item, index) => { item.priority = index; });
  }

  uploadContentImage(fileInput: HTMLInputElement, target: 'gallery' | 'dressCode' | 'gift', index = -1): void {
    const file = fileInput.files?.[0];
    if (!file || !this.invitation) return;
    const eventId = typeof this.invitation.event === 'string' ? this.invitation.event : (this.invitation.event._id || this.invitation.event.id);
    this.uploading = true;
    this.error = '';
    this.api.createUploadUrl({ fileName: file.name, contentType: file.type, folder: 'assets', event: eventId, size: file.size }).pipe(
      switchMap(({ uploadUrl, publicUrl }) => this.api.uploadAsset(uploadUrl, file).pipe(map(() => publicUrl)))
    ).subscribe({
      next: (publicUrl) => {
        this.recordHistory();
        if (target === 'gallery') this.invitation!.content.gallery!.push(publicUrl);
        if (target === 'dressCode') this.invitation!.content.dressCodeImageUrl = publicUrl;
        if (target === 'gift' && this.invitation!.content.giftRegistry?.[index]) this.invitation!.content.giftRegistry[index].imageUrl = publicUrl;
        this.uploading = false;
        fileInput.value = '';
      },
      error: () => { this.uploading = false; this.error = 'No fue posible subir la imagen del módulo.'; }
    });
  }

  uploadImage(fileInput: HTMLInputElement, target: 'layer' | 'background'): void {
    const file = fileInput.files?.[0];
    if (!file || !this.invitation) return;
    const eventId = typeof this.invitation.event === 'string'
      ? this.invitation.event
      : (this.invitation.event._id || this.invitation.event.id);
    const folder = file.type.startsWith('audio/') ? 'music' : 'assets';
    this.uploading = true;
    this.error = '';
    this.api.createUploadUrl({ fileName: file.name, contentType: file.type, folder, event: eventId, size: file.size }).pipe(
      switchMap(({ uploadUrl, publicUrl }) => this.api.uploadAsset(uploadUrl, file).pipe(map(() => publicUrl)))
    ).subscribe({
      next: (publicUrl) => {
        this.recordHistory();
        if (target === 'background' && this.selectedSection) {
          this.selectedSection.background = { ...(this.selectedSection.background || {}), imageUrl: publicUrl };
        } else if (this.selectedLayer) {
          this.selectedLayer.url = publicUrl;
        }
        this.uploading = false;
        fileInput.value = '';
      },
      error: () => { this.uploading = false; this.error = 'No fue posible subir el archivo.'; }
    });
  }

  applyBuiltInPreset(key: string): void {
    if (!this.confirmReplaceDesign()) return;
    this.recordHistory();
    this.design = this.buildPreset(key);
    this.selectedSectionId = this.design.sections[0]?.id || '';
    this.clearLayerSelection();
  }

  chooseStartingDesign(key: string): void {
    this.design = this.buildPreset(key);
    this.design.assets = [];
    this.selectedSectionId = this.design.sections[0]?.id || '';
    this.clearLayerSelection();
    this.showOnboarding = false;
    this.autosaveState = 'Cambios pendientes';
  }

  startBlankDesign(): void {
    const section = this.makeSection('custom', 'Mi primera sección', '#ffffff', 640);
    this.design = { version: 1, active: false, mode: 'easy', responsiveMode: 'shared', theme: this.clone(this.themePresets[0].theme), assets: [], sections: [section] };
    this.selectedSectionId = section.id;
    this.clearLayerSelection();
    this.showOnboarding = false;
    this.autosaveState = 'Cambios pendientes';
  }

  applyPersonalTemplate(template: VisualDesignTemplateModel): void {
    if (!this.confirmReplaceDesign()) return;
    this.recordHistory();
    this.design = this.regenerateIds(this.clone(template.design));
    this.design.active = true;
    this.design.theme = this.design.theme || this.inferTheme();
    this.normalizeModuleStyles();
    this.selectedSectionId = this.design.sections[0]?.id || '';
    this.clearLayerSelection();
  }

  saveAsTemplate(): void {
    const name = this.templateName.trim();
    if (name.length < 2) { this.error = 'Escribe un nombre para la plantilla.'; return; }
    this.savingTemplate = true;
    this.api.createVisualDesignTemplate({
      name,
      eventType: this.event?.type || 'otro',
      description: `Diseño creado desde ${this.invitation?.content?.headline || this.event?.title || 'una invitación'}`,
      design: this.stripMongoMetadata(this.clone(this.design))
    }).subscribe({
      next: ({ template }) => {
        const index = this.personalTemplates.findIndex((item) => item._id === template._id || item.name === template.name);
        if (index >= 0) this.personalTemplates[index] = template; else this.personalTemplates.unshift(template);
        this.templateName = '';
        this.savingTemplate = false;
        this.flash('Plantilla guardada en tu cuenta.');
      },
      error: (error) => { this.savingTemplate = false; this.error = error?.error?.message || 'No fue posible guardar la plantilla.'; }
    });
  }

  deletePersonalTemplate(template: VisualDesignTemplateModel, event: MouseEvent): void {
    event.stopPropagation();
    if (!window.confirm(`¿Eliminar la plantilla "${template.name}"?`)) return;
    this.api.deleteVisualDesignTemplate(template._id).subscribe({
      next: () => { this.personalTemplates = this.personalTemplates.filter((item) => item._id !== template._id); },
      error: () => { this.error = 'No fue posible eliminar la plantilla.'; }
    });
  }

  createRevision(): void {
    const invitationId = this.invitation?._id || this.invitation?.id || '';
    if (!invitationId || this.savingRevision) return;
    const label = this.revisionLabel.trim() || `Versión ${new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}`;
    this.savingRevision = true;
    this.api.createVisualDesignRevision(invitationId, { label, design: this.stripMongoMetadata(this.clone(this.design)) }).subscribe({
      next: ({ revision }) => {
        this.revisions.unshift(revision);
        this.revisions = this.revisions.slice(0, 20);
        this.revisionLabel = '';
        this.savingRevision = false;
        this.flash('Versión guardada.');
      },
      error: (error) => { this.savingRevision = false; this.error = error?.error?.message || 'No fue posible guardar la versión.'; }
    });
  }

  restoreRevision(revision: VisualDesignRevisionModel): void {
    const invitationId = this.invitation?._id || this.invitation?.id || '';
    if (!invitationId || !window.confirm(`¿Restaurar "${revision.label}"? El diseño actual quedará en el historial solo si antes guardaste una versión.`)) return;
    this.api.restoreVisualDesignRevision(invitationId, revision._id).subscribe({
      next: ({ invitation }) => {
        this.invitation = invitation;
        this.design = this.clone(revision.design);
        this.design.assets = this.design.assets || [];
        this.design.theme = this.design.theme || this.inferTheme();
        this.normalizeModuleStyles();
        this.selectedSectionId = this.design.sections[0]?.id || '';
        this.clearLayerSelection();
        this.undoStack = [];
        this.redoStack = [];
        this.markSaved();
        this.flash(`Versión "${revision.label}" restaurada.`);
      },
      error: (error) => { this.error = error?.error?.message || 'No fue posible restaurar la versión.'; }
    });
  }

  deleteRevision(revision: VisualDesignRevisionModel, event: MouseEvent): void {
    event.stopPropagation();
    const invitationId = this.invitation?._id || this.invitation?.id || '';
    if (!invitationId || !window.confirm(`¿Eliminar la versión "${revision.label}"?`)) return;
    this.api.deleteVisualDesignRevision(invitationId, revision._id).subscribe({
      next: () => { this.revisions = this.revisions.filter((item) => item._id !== revision._id); },
      error: () => { this.error = 'No fue posible eliminar la versión.'; }
    });
  }

  revisionDate(value: string): string {
    return new Date(value).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  }

  save(): void {
    if (!this.invitation) return;
    this.saving = true;
    this.error = '';
    this.persistDesign().subscribe({
      next: ({ invitation }) => { this.invitation = invitation; this.saving = false; this.markSaved(); this.flash('Diseño guardado.'); },
      error: (error) => { this.saving = false; this.error = error?.error?.message || 'No fue posible guardar el diseño.'; }
    });
  }

  publish(): void {
    if (!this.invitation) return;
    this.publishing = true;
    this.error = '';
    const id = this.invitation._id || this.invitation.id || '';
    this.persistDesign().pipe(switchMap(() => this.api.publishInvitation(id))).subscribe({
      next: ({ invitation }) => { this.invitation = invitation; this.publishing = false; this.showPublishAudit = false; this.markSaved(); this.flash('Diseño publicado.'); this.openPreview(); },
      error: (error) => { this.publishing = false; this.error = error?.error?.message || 'No fue posible publicar.'; }
    });
  }

  undo(): void {
    const previous = this.undoStack.pop();
    if (!previous) return;
    this.redoStack.push(this.editorHistoryState());
    this.design = previous.design;
    if (this.invitation) this.invitation.content = previous.content;
    this.restoreSelection();
  }

  redo(): void {
    const next = this.redoStack.pop();
    if (!next) return;
    this.undoStack.push(this.editorHistoryState());
    this.design = next.design;
    if (this.invitation) this.invitation.content = next.content;
    this.restoreSelection();
  }

  back(): void {
    const id = this.invitation?._id || this.invitation?.id;
    this.router.navigate(['/new/invitations', id, 'editor']);
  }

  openPreview(): void {
    if (this.invitation?.slug) window.open(`/new/i/${this.invitation.slug}`, '_blank');
  }

  private persistDesign() {
    const id = this.invitation?._id || this.invitation?.id || '';
    this.design.active = true;
    const content = this.stripMongoMetadata({
      ...this.invitation?.content,
      template: 'visual-builder',
      visualDesign: this.design
    });
    return this.api.updateInvitation(id, {
      content
    });
  }

  private loadPersonalTemplates(): void {
    this.api.listVisualDesignTemplates().subscribe({
      next: ({ templates }) => { this.personalTemplates = templates; },
      error: () => { this.personalTemplates = []; }
    });
  }

  private loadRevisions(): void {
    const invitationId = this.invitation?._id || this.invitation?.id || '';
    if (!invitationId) return;
    this.loadingRevisions = true;
    this.api.listVisualDesignRevisions(invitationId).subscribe({
      next: ({ revisions }) => { this.revisions = revisions; this.loadingRevisions = false; },
      error: () => { this.revisions = []; this.loadingRevisions = false; }
    });
  }

  private createDefaultDesign(): VisualInvitationDesign {
    return this.buildPreset('editorial', false);
  }

  private buildPreset(key: string, includeModules = true): VisualInvitationDesign {
    const content = this.invitation?.content || {};
    const palettes: Record<string, { background: string; foreground: string; accent: string; font: string }> = {
      editorial: { background: '#f6f1eb', foreground: '#24211f', accent: '#b57c62', font: 'Georgia, serif' },
      romantic: { background: '#f8e9e8', foreground: '#633c43', accent: '#a65e6a', font: 'Georgia, serif' },
      night: { background: '#171717', foreground: '#f7f1e5', accent: '#d6b46c', font: "'Times New Roman', serif" }
    };
    const palette = palettes[key] || palettes['editorial'];
    const hero = this.makeSection('hero', 'Portada', palette.background, 720);
    hero.background = { color: palette.background, imageUrl: content.coverImageUrl || '', overlay: content.coverImageUrl ? .35 : 0 };
    const title = this.newLayer('text', content.headline || this.event?.title || 'Nuestra celebración', 8, 29, 84, 20, 54);
    title.style = { ...title.style, color: palette.foreground, fontFamily: palette.font, fontWeight: 600 };
    const subtitle = this.newLayer('text', content.subheadline || 'Acompáñanos en este día especial', 15, 54, 70, 12, 21);
    subtitle.style = { ...subtitle.style, color: palette.accent, fontFamily: palette.font, fontWeight: 400 };
    hero.layers = [title, subtitle];
    const sections = [hero];

    if (includeModules) {
      if (content.storyBody || content.storyTitle) {
        const story = this.makeSection('story', content.storyTitle || 'Nuestra historia', palette.background, 560);
        const storyTitle = this.newLayer('text', content.storyTitle || 'Nuestra historia', 12, 10, 76, 14, 38);
        const storyBody = this.newLayer('text', content.storyBody || '', 14, 31, 72, 45, 20);
        storyTitle.style = { ...storyTitle.style, color: palette.accent, fontFamily: palette.font };
        storyBody.style = { ...storyBody.style, color: palette.foreground, fontFamily: 'Arial, sans-serif', fontWeight: 400 };
        story.layers = [storyTitle, storyBody];
        sections.push(story);
      }
      const settings = content.sectionSettings || {};
      if (settings.locations !== false && content.locations?.length) sections.push(this.makeSection('locations', 'Ubicaciones', palette.background, 620));
      if (settings.itinerary !== false && content.itinerary?.length) sections.push(this.makeSection('itinerary', 'Itinerario', palette.background, 620));
      if (settings.gallery !== false && content.gallery?.length) sections.push(this.makeSection('gallery', 'Galería', palette.background, 620));
      if (settings.giftRegistry !== false || settings.digitalEnvelope !== false) sections.push(this.makeSection('gifts', 'Mesa de regalos', palette.background, 620));
      if (settings.rsvp !== false) sections.push(this.makeSection('rsvp', 'Confirma tu asistencia', palette.background, 700));
      if (settings.guestAlbum !== false) sections.push(this.makeSection('album', 'Álbum colectivo', palette.background, 520));
      if (settings.dedications !== false) sections.push(this.makeSection('dedications', 'Dedicatorias', palette.background, 620));
      if (settings.songRequests !== false) sections.push(this.makeSection('songs', 'Pide una canción', palette.background, 560));
    }
    const presetTheme = this.themePresets.find((item) => item.key === key)?.theme || this.themePresets[0].theme;
    return { version: 1, active: false, mode: 'easy', responsiveMode: 'shared', theme: this.clone(presetTheme), sections };
  }

  private makeSection(type: string, title: string, color: string, height: number): VisualInvitationSection {
    return {
      id: this.uid('section'), type, title, enabled: true, layout: 'canvas', height,
      background: { color, overlay: 0 },
      moduleStyle: type === 'hero' || type === 'custom' ? undefined : this.defaultModuleStyle(),
      layers: []
    };
  }

  private defaultModuleStyle(): NonNullable<VisualInvitationSection['moduleStyle']> {
    return { layout: 'grid', columns: 2, alignment: 'center', surface: 'solid', cardStyle: 'bordered', gap: 11, showTitle: true };
  }

  private normalizeModuleStyles(): void {
    for (const section of this.design.sections) {
      section.background = { color: '#ffffff', overlay: 0, ...(section.background || {}) };
      if (section.type === 'hero' || section.type === 'custom') continue;
      section.moduleStyle = { ...this.defaultModuleStyle(), ...(section.moduleStyle || {}) };
    }
  }

  private newLayer(type: VisualLayerType, text: string, x: number, y: number, width: number, height: number, fontSize = 30): VisualInvitationLayer {
    const theme = this.design?.theme || this.themePresets[0].theme;
    return {
      id: this.uid('layer'), type, name: text.trim().slice(0, 32) || this.layerTypeLabel(type), text, x, y, width, height, rotation: 0, zIndex: 1, locked: false, hidden: false,
      animation: { type: 'none', duration: 1, delay: 0, repeat: false },
      style: { color: theme.textColor, fontFamily: fontSize >= 30 ? theme.headingFont : theme.bodyFont, fontSize, fontWeight: type === 'text' ? 600 : 400, textAlign: 'center', borderRadius: type === 'button' ? theme.buttonRadius : 0, opacity: 1 }
    };
  }

  private inferTheme(): VisualTheme {
    const firstSection = this.design?.sections?.[0];
    const textLayer = firstSection?.layers?.find((layer) => layer.type === 'text');
    return {
      ...this.clone(this.themePresets[0].theme),
      backgroundColor: firstSection?.background?.color || this.themePresets[0].theme.backgroundColor,
      textColor: String(textLayer?.style?.color || this.themePresets[0].theme.textColor),
      headingFont: String(textLayer?.style?.fontFamily || this.themePresets[0].theme.headingFont)
    };
  }

  private applyThemeValues(sections: VisualInvitationSection[]): void {
    const theme = this.design.theme || this.themePresets[0].theme;
    for (const section of sections) {
      section.background = { ...(section.background || {}), color: theme.backgroundColor };
      for (const layer of section.layers) this.applyThemeToLayer(layer, theme);
    }
  }

  private applyThemeToLayer(layer: VisualInvitationLayer, theme: VisualTheme): void {
    layer.style = layer.style || {};
    if (layer.type === 'text') {
      const heading = Number(layer.style.fontSize || 0) >= 30;
      layer.style.fontFamily = heading ? theme.headingFont : theme.bodyFont;
      layer.style.color = heading ? theme.accentColor : theme.textColor;
    } else if (layer.type === 'button') {
      layer.style.fontFamily = theme.bodyFont;
      layer.style.borderRadius = theme.buttonRadius;
      layer.style.borderWidth = theme.buttonStyle === 'outline' ? 2 : 0;
      layer.style.borderColor = theme.buttonBackgroundColor;
      layer.style.backgroundColor = theme.buttonStyle === 'solid'
        ? theme.buttonBackgroundColor
        : theme.buttonStyle === 'soft' ? this.colorWithAlpha(theme.buttonBackgroundColor, .16) : 'transparent';
      layer.style.color = theme.buttonStyle === 'solid' ? theme.buttonTextColor : theme.buttonBackgroundColor;
    } else if (layer.type === 'shape') {
      layer.style.backgroundColor = theme.accentColor;
    }
  }

  private colorWithAlpha(color: string, alpha: number): string {
    const match = /^#([0-9a-f]{6})$/i.exec(color);
    if (!match) return color;
    const value = Number.parseInt(match[1], 16);
    return `rgba(${value >> 16},${(value >> 8) & 255},${value & 255},${alpha})`;
  }

  private auditDesign(): PublishAuditIssue[] {
    const issues: PublishAuditIssue[] = [];
    const add = (severity: AuditSeverity, title: string, detail: string, sectionId?: string, layerId?: string, device?: DeviceMode) => {
      issues.push({ id: `audit-${issues.length + 1}`, severity, title, detail, sectionId, layerId, device });
    };
    const enabledSections = this.design.sections.filter((section) => section.enabled);
    if (!enabledSections.length) add('critical', 'No hay secciones visibles', 'Activa al menos una sección antes de publicar.');
    if (!this.event?.date) add('critical', 'Falta la fecha del evento', 'Completa la fecha desde la configuración del evento.');
    if (!this.event?.venue?.name && !this.event?.venue?.address) add('warning', 'Falta la ubicación principal', 'Agrega nombre o dirección para que los invitados sepan dónde será el evento.');

    const content = this.invitation?.content || {};
    for (const section of this.design.sections) {
      if (!section.enabled) {
        add('suggestion', `Sección oculta: ${section.title || section.type}`, 'No aparecerá en la invitación publicada.', section.id);
        continue;
      }
      if (!section.layers.length && !this.isFunctionalType(section.type)) {
        add('warning', `Sección vacía: ${section.title || section.type}`, 'Agrega contenido o desactiva esta sección.', section.id);
      }
      if (section.type === 'locations' && !content.locations?.length) add('warning', 'Ubicaciones sin datos', 'La sección está activa pero no contiene ubicaciones.', section.id);
      if (section.type === 'itinerary' && !content.itinerary?.length) add('warning', 'Itinerario vacío', 'Agrega actividades o desactiva esta sección.', section.id);
      if (section.type === 'gallery' && !content.gallery?.length) add('warning', 'Galería vacía', 'Agrega fotografías o desactiva esta sección.', section.id);
      if (section.type === 'gifts' && !content.giftRegistry?.length && !content.digitalEnvelope) add('warning', 'Mesa de regalos vacía', 'Agrega una mesa o sobre digital, o desactiva la sección.', section.id);

      for (const layer of section.layers) {
        if (layer.hidden) {
          add('suggestion', `Elemento oculto: ${this.layerLabel(layer)}`, 'Este elemento no se mostrará al público.', section.id, layer.id);
          continue;
        }
        if (['image', 'video', 'audio'].includes(layer.type) && !layer.url?.trim()) {
          add('critical', `${this.layerTypeLabel(layer.type)} sin archivo`, 'Carga un archivo o elimina este elemento.', section.id, layer.id);
        }
        if (layer.type === 'button' && !layer.url?.trim() && !layer.binding?.trim()) {
          add('critical', `Botón sin destino: ${this.layerLabel(layer)}`, 'Agrega una URL o una acción al botón.', section.id, layer.id);
        }
        if ((layer.type === 'text' || layer.type === 'button') && !layer.text?.trim()) {
          add('warning', 'Texto vacío', 'Escribe un texto o elimina el elemento.', section.id, layer.id);
        }
        if (layer.type === 'image' && !layer.text?.trim()) {
          add('suggestion', `Imagen sin descripción: ${this.layerLabel(layer)}`, 'Agrega una descripción breve para accesibilidad.', section.id, layer.id);
        }
        const layouts: Array<{ device: DeviceMode; x: number; y: number; width: number; height: number }> = this.design.responsiveMode === 'independent'
          ? (['mobile', 'tablet', 'desktop'] as DeviceMode[]).map((device) => ({ device, ...(layer.layouts?.[device] || layer) }))
          : [{ device: 'mobile', ...layer }];
        for (const layout of layouts) {
          if (layout.x + layout.width > 100.01 || layout.y + layout.height > 100.01) {
            add('critical', `Elemento fuera del área en ${this.deviceLabel(layout.device)}`, 'Muévelo o reduce su tamaño para que no se corte.', section.id, layer.id, layout.device);
            break;
          }
        }
        if (layer.type === 'text' && !section.background?.imageUrl && this.hasLowContrast(String(layer.style?.color || '#000000'), section.background?.color || '#ffffff')) {
          add('warning', `Contraste bajo: ${this.layerLabel(layer)}`, 'Cambia el color del texto o del fondo para mejorar la lectura.', section.id, layer.id);
        }
      }
    }
    if (!enabledSections.some((section) => section.type === 'rsvp')) add('suggestion', 'RSVP no incluido', 'Agrega la sección de confirmación si deseas recibir respuestas.');
    return issues;
  }

  private hasLowContrast(foreground: string, background: string): boolean {
    const luminance = (color: string): number | null => {
      const match = /^#([0-9a-f]{6})$/i.exec(color);
      if (!match) return null;
      const value = Number.parseInt(match[1], 16);
      const channels = [value >> 16, (value >> 8) & 255, value & 255].map((channel) => {
        const normalized = channel / 255;
        return normalized <= .03928 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
      });
      return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
    };
    const first = luminance(foreground);
    const second = luminance(background);
    if (first === null || second === null) return false;
    const ratio = (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
    return ratio < 3;
  }

  private regenerateIds(design: VisualInvitationDesign): VisualInvitationDesign {
    const groupIds = new Map<string, string>();
    design.sections = design.sections.map((section) => ({
      ...section,
      id: this.uid('section'),
      layers: section.layers.map((layer) => ({
        ...layer,
        id: this.uid('layer'),
        groupId: layer.groupId ? (groupIds.get(layer.groupId) || (() => {
          const id = this.uid('group');
          groupIds.set(layer.groupId as string, id);
          return id;
        })()) : undefined
      }))
    }));
    return design;
  }

  private isFunctionalType(type: string): boolean {
    return ['locations', 'itinerary', 'dressCode', 'rsvp', 'gifts', 'gallery', 'album', 'dedications', 'songs'].includes(type);
  }

  private layerTypeLabel(type: VisualLayerType): string {
    return { image: 'Imagen', video: 'Video', audio: 'Audio', button: 'Botón', shape: 'Forma', text: 'Texto' }[type];
  }

  private snapRawPosition(layer: VisualInvitationLayer, section: VisualInvitationSection, canvas: HTMLElement, rawX: number, rawY: number, width: number, height: number, ignoredIds = new Set<string>([layer.id])): { x: number; y: number; guideX: number | null; guideY: number | null } {
    if (!this.smartSnapping) {
      return { x: this.bound(rawX, 0, 100 - width), y: this.bound(rawY, 0, 100 - height), guideX: null, guideY: null };
    }
    const xTargets = [0, 50, 100];
    const yTargets = [0, 50, 100];
    for (const other of section.layers) {
      if (ignoredIds.has(other.id) || other.hidden) continue;
      const otherLayout = this.layoutFor(other);
      xTargets.push(otherLayout.x, otherLayout.x + otherLayout.width / 2, otherLayout.x + otherLayout.width);
      yTargets.push(otherLayout.y, otherLayout.y + otherLayout.height / 2, otherLayout.y + otherLayout.height);
    }
    const xAnchors = [{ value: rawX, offset: 0 }, { value: rawX + width / 2, offset: width / 2 }, { value: rawX + width, offset: width }];
    const yAnchors = [{ value: rawY, offset: 0 }, { value: rawY + height / 2, offset: height / 2 }, { value: rawY + height, offset: height }];
    const snapX = this.closestSnap(xAnchors, xTargets, 800 / Math.max(canvas.clientWidth, 1));
    const snapY = this.closestSnap(yAnchors, yTargets, 800 / Math.max(canvas.clientHeight, 1));
    return {
      x: this.bound(snapX ? snapX.target - snapX.offset : rawX, 0, 100 - width),
      y: this.bound(snapY ? snapY.target - snapY.offset : rawY, 0, 100 - height),
      guideX: snapX?.target ?? null,
      guideY: snapY?.target ?? null
    };
  }

  private closestSnap(anchors: Array<{ value: number; offset: number }>, targets: number[], threshold: number): { target: number; offset: number } | undefined {
    let match: { target: number; offset: number; distance: number } | undefined;
    for (const anchor of anchors) for (const target of targets) {
      const distance = Math.abs(anchor.value - target);
      if (distance <= threshold && (!match || distance < match.distance)) match = { target, offset: anchor.offset, distance };
    }
    return match;
  }

  private layoutFor(layer: VisualInvitationLayer): VisualInvitationLayerLayout {
    if (this.design.responsiveMode === 'independent' && layer.layouts?.[this.device]) return layer.layouts[this.device] as VisualInvitationLayerLayout;
    return { x: layer.x, y: layer.y, width: layer.width, height: layer.height, rotation: layer.rotation || 0 };
  }

  private editableLayout(layer: VisualInvitationLayer): VisualInvitationLayerLayout {
    if (this.design.responsiveMode !== 'independent') return layer;
    layer.layouts = layer.layouts || {};
    if (!layer.layouts[this.device]) layer.layouts[this.device] = this.clone({ x: layer.x, y: layer.y, width: layer.width, height: layer.height, rotation: layer.rotation || 0 });
    return layer.layouts[this.device] as VisualInvitationLayerLayout;
  }

  private deviceLabel(device: DeviceMode): string {
    return { mobile: 'celular', tablet: 'tablet', desktop: 'escritorio' }[device];
  }

  private startAutosave(): void {
    if (this.autosaveHandle) clearInterval(this.autosaveHandle);
    this.autosaveHandle = setInterval(() => this.autoSave(), 5000);
  }

  private autoSave(): void {
    if (!this.hasUnsavedChanges || this.saving || this.publishing || this.autosaving || this.uploading) return;
    this.autosaving = true;
    this.autosaveState = 'Guardando...';
    this.persistDesign().subscribe({
      next: ({ invitation }) => { this.invitation = invitation; this.autosaving = false; this.markSaved(); },
      error: () => { this.autosaving = false; this.autosaveState = 'No se pudo guardar'; }
    });
  }

  private markSaved(): void {
    this.lastSavedSnapshot = this.designSnapshot();
    this.autosaveState = 'Guardado';
    this.error = '';
  }

  private designSnapshot(): string {
    const content = { ...(this.invitation?.content || {}) };
    delete content.visualDesign;
    return JSON.stringify(this.stripMongoMetadata({ design: this.design, content }));
  }

  private confirmReplaceDesign(): boolean {
    if (!this.design?.sections?.length) return true;
    return window.confirm('Esta acción reemplazará el diseño actual. Puedes usar Deshacer inmediatamente después.');
  }

  private recordHistory(): void {
    if (!this.design) return;
    this.undoStack.push(this.editorHistoryState());
    if (this.undoStack.length > 30) this.undoStack.shift();
    this.redoStack = [];
  }

  private editorHistoryState(): EditorHistoryState {
    return { design: this.clone(this.design), content: this.clone(this.invitation?.content || {}) };
  }

  private contentList(key: ContentListKey): unknown[] {
    if (!this.invitation) return [];
    return this.invitation.content[key] as unknown[];
  }

  private normalizeInvitationContent(): void {
    if (!this.invitation) return;
    const content = this.invitation.content;
    content.locations = content.locations || [];
    content.itinerary = content.itinerary || [];
    content.gallery = content.gallery || [];
    content.giftRegistry = content.giftRegistry || [];
    content.giftSettings = { enabled: true, showRegistry: true, showEnvelope: true, ...(content.giftSettings || {}) };
    content.digitalEnvelope = content.digitalEnvelope || {};
  }

  private restoreSelection(): void {
    if (!this.design.sections.some((section) => section.id === this.selectedSectionId)) {
      this.selectedSectionId = this.design.sections[0]?.id || '';
    }
    const available = new Set((this.selectedSection?.layers || []).map((layer) => layer.id));
    this.setLayerSelection(this.selectedLayerIds.filter((id) => available.has(id)));
  }

  private applyLayerSelection(section: VisualInvitationSection, layer: VisualInvitationLayer, additive: boolean): void {
    if (this.selectedSectionId !== section.id) {
      this.selectedSectionId = section.id;
      this.clearLayerSelection();
    }
    if (additive) {
      const ids = this.selectedLayerIds.includes(layer.id)
        ? this.selectedLayerIds.filter((id) => id !== layer.id)
        : [...this.selectedLayerIds, layer.id];
      this.setLayerSelection(ids);
      return;
    }
    const ids = layer.groupId
      ? section.layers.filter((item) => item.groupId === layer.groupId).map((item) => item.id)
      : [layer.id];
    this.setLayerSelection(ids, layer.id);
  }

  private setLayerSelection(ids: string[], primaryId?: string): void {
    this.selectedLayerIds = [...new Set(ids)];
    this.selectedLayerId = primaryId && this.selectedLayerIds.includes(primaryId)
      ? primaryId
      : (this.selectedLayerIds[this.selectedLayerIds.length - 1] || '');
  }

  private clearLayerSelection(): void {
    this.selectedLayerIds = [];
    this.selectedLayerId = '';
  }

  private centerLayersAt(layers: VisualInvitationLayer[], x: number, y: number): void {
    if (!layers.length) return;
    const layouts = layers.map((layer) => this.editableLayout(layer));
    const minX = Math.min(...layouts.map((layout) => layout.x));
    const minY = Math.min(...layouts.map((layout) => layout.y));
    const maxX = Math.max(...layouts.map((layout) => layout.x + layout.width));
    const maxY = Math.max(...layouts.map((layout) => layout.y + layout.height));
    const dx = this.bound(x - (maxX - minX) / 2, 0, 100 - (maxX - minX)) - minX;
    const dy = this.bound(y - (maxY - minY) / 2, 0, 100 - (maxY - minY)) - minY;
    layouts.forEach((layout) => {
      layout.x = this.bound(layout.x + dx, 0, 100 - layout.width);
      layout.y = this.bound(layout.y + dy, 0, 100 - layout.height);
    });
  }

  private flash(message: string): void {
    this.message = message;
    setTimeout(() => { if (this.message === message) this.message = ''; }, 2500);
  }

  private uid(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }

  private stripMongoMetadata<T>(value: T): T {
    if (Array.isArray(value)) return value.map((item) => this.stripMongoMetadata(item)) as unknown as T;
    if (!value || typeof value !== 'object') return value;
    return Object.entries(value as Record<string, unknown>).reduce((clean, [key, item]) => {
      if (key === '_id' || key === '__v') return clean;
      clean[key] = this.stripMongoMetadata(item);
      return clean;
    }, {} as Record<string, unknown>) as T;
  }

  private bound(value: number, min: number, max: number): number {
    return Math.round(Math.max(min, Math.min(max, value)) * 100) / 100;
  }

  private fail(message: string): void {
    this.error = message;
    this.loading = false;
  }
}
