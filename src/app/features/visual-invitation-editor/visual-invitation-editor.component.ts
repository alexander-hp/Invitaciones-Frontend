import { Component, ElementRef, HostListener, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import html2canvas from 'html2canvas';
import type { jsPDF as JsPdfDocument } from 'jspdf';
import { ApiService } from '../../core/api.service';
import {
  DedicationModel, EventModel, GiftRegistryItem, GuestAccessResponse, InvitationContent, InvitationGalleryItem, InvitationLocation, InvitationLodgingItem, InvitationModel, InvitationModerationSettings, PlaceSearchResult, RsvpSettings,
  VisualDesignTemplateModel, VisualInvitationDesign,
  VisualDesignRevisionModel, VisualInvitationAsset, VisualInvitationLayer, VisualInvitationLayerLayout, VisualInvitationLayerStyle,
  VisualInvitationSection, VisualLayerType, VisualPluginPartDesign, WebImageSearchResult
} from '../../core/models';
import { resolveVisualTemplateText, VISUAL_TEMPLATE_VARIABLES, visualTemplateContext } from '../../core/visual-template-bindings';
import { generateTemplateHtml, TemplateData } from '../new-invitation-editor/modals/visual-template-text-editor-modal/template-html-generator';
import { VisualDesignImporterService, VisualDesignImportReview, VisualDesignImportReviewStatus } from './visual-design-importer.service';
import {
  AnimatedExportScene, AnimatedExportTransition, animatedFrameSize, VisualInvitationAnimatedExportService
} from './visual-invitation-animated-export.service';
import { resolveVisualMediaSource } from '../../shared/components/visual-invitation-renderer/visual-media-source';
import { VisualInvitationRendererComponent } from '../../shared/components/visual-invitation-renderer/visual-invitation-renderer.component';
import { VISUAL_ICON_CATALOG, VisualIconOption } from '../../shared/components/visual-invitation-renderer/visual-icon-catalog';
import { isSingleInstanceControl, visibleControlDuplicates } from '../../shared/components/visual-invitation-renderer/visual-functional-controls';
import { visualCanvasHeight, visualSectionHeight, visualSectionOffset } from '../../shared/components/visual-invitation-renderer/visual-canvas-geometry';
import { buildCompleteDesign, COMPLETE_DESIGN_PRESETS, CompleteDesignPreset } from './complete-design-library';
import { createVisualDesignAiPrompt, createVisualDesignExchange } from './visual-design-exchange';
import { buttonPresetStyle, VISUAL_BUTTON_PRESETS, VisualButtonPreset } from './visual-button-presets';
import { PHOTO_COMPOSITION_PRESETS, photoCompositionLayouts, photoCompositionSpacing, reflowPhotoCompositionLayouts, withPhotoCompositionSpacing } from './photo-composition-presets';

type DeviceMode = 'mobile' | 'tablet' | 'desktop';
type MobileEditorPanel = 'tools' | 'canvas' | 'inspector';
type ToolCategory = 'design' | 'elements' | 'assets' | 'functions';
type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';
type InspectorView = 'properties' | 'layers' | 'history';
type DesignMedia = { id?: string; url: string; type: 'image' | 'video' | 'audio'; label: string; stored?: boolean; attribution?: string; attributionUrl?: string; sourceUrl?: string };
type MediaFilter = 'all' | DesignMedia['type'];
type VisualTheme = NonNullable<VisualInvitationDesign['theme']>;
type ImageMask = NonNullable<NonNullable<VisualInvitationLayer['style']>['imageMask']>;
type ShapeKind = NonNullable<NonNullable<VisualInvitationLayer['style']>['shapeKind']>;
type PaletteDragItem =
  | { kind: 'layer'; type: VisualLayerType }
  | { kind: 'frame'; mask: ImageMask }
  | { kind: 'composition'; key: string }
  | { kind: 'shape'; shape: ShapeKind }
  | { kind: 'icon'; icon: VisualIconOption }
  | { kind: 'component'; key: string }
  | { kind: 'rsvp-control'; binding: string }
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
type ContentListKey = 'locations' | 'itinerary' | 'galleryItems' | 'giftRegistry' | 'lodging';
type EditorHistoryState = { design: VisualInvitationDesign; content: InvitationContent; rsvpSettings: RsvpSettings };
type ModerationListKey = 'autoApproveRoles' | 'autoApproveGroups' | 'autoApproveEmails' | 'autoApprovePhones';
type RsvpPartKey = 'eyebrow' | 'title' | 'intro' | 'name' | 'contact' | 'response' | 'companions' | 'dietary' | 'message' | 'submit' | 'feedback';
type DesignImportSource = 'ai' | 'current' | 'catalog' | 'html' | 'json';
type DesignImportStrategy = 'replace' | 'append';
type ImportMappingModuleType = 'rsvp' | 'dedications' | 'songs' | 'album' | 'guestPass';
type FunctionalTestType = ImportMappingModuleType;
type FunctionalTestView = 'guided' | 'design';
type InvitationExportFormat = 'png' | 'jpeg' | 'pdf' | 'gif' | 'mp4';
type VisualDesignImportReviewItem = VisualDesignImportReview & { sectionId?: string };
type FunctionalTestData = {
  name: string; contact: string; response: string; companions: number; dietary: string; message: string;
  publicName: string; dedication: string; song: string; artist: string; sourceUrl: string; songDedication: string;
  albumFileName: string; passEmail: string; passPhone: string;
};

@Component({
  selector: 'app-visual-invitation-editor',
  templateUrl: './visual-invitation-editor.component.html',
  styleUrls: ['./visual-invitation-editor.component.css', './visual-invitation-editor.responsive-preview.css', './visual-invitation-editor.export.css', './visual-invitation-editor.icons.css', './visual-invitation-editor.library.css', './visual-invitation-editor.tutorial.css']
})
export class VisualInvitationEditorComponent implements OnInit, OnDestroy {
  readonly buttonPresets = VISUAL_BUTTON_PRESETS;
  readonly buttonPresetStyle = buttonPresetStyle;
  readonly photoCompositionPresets = PHOTO_COMPOSITION_PRESETS;

  sanitizeBankDigits(value: unknown, maxLength: number): string {
    return String(value ?? '').replace(/\D/g, '').slice(0, maxLength);
  }
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
  selectedPluginPartKey = '';
  toolCategory: ToolCategory = 'elements';
  toolsCollapsed = false;
  tutorialStep = -1;
  readonly tutorialSteps = [
    { title: 'Tu espacio de diseño', description: 'A la izquierda eliges qué agregar, en el centro acomodas la invitación y a la derecha cambias las propiedades de lo seleccionado.' },
    { title: 'Empieza con un diseño', description: 'Explora diseños completos o ajusta colores, tipografía y botones desde Diseño. En Más también puedes importar una plantilla hecha con otra IA.' },
    { title: 'Agrega elementos', description: 'Añade texto, fotos, video, audio, botones, formas y marcos. Arrastra cada pieza al lienzo y colócala donde la necesites.' },
    { title: 'Usa tus archivos', description: 'Sube imágenes, videos y música, o busca recursos. Selecciona un archivo para usarlo como portada, fondo o elemento del diseño.' },
    { title: 'Conecta funciones reales', description: 'Agrega RSVP, pase, mesa, mapas, regalos, álbum, dedicatorias o peticiones al DJ. Estos módulos guardan respuestas; no son solo decoración.' },
    { title: 'Organiza el lienzo', description: 'Selecciona, mueve y cambia el tamaño de los objetos. La barra del lienzo te permite activar cuadrícula, ajuste, márgenes y zoom.' },
    { title: 'Personaliza cada detalle', description: 'Selecciona una sección u objeto y usa Propiedades para editarlo. En Capas cambias el orden o eliges piezas superpuestas; Versiones permite recuperar diseños.' },
    { title: 'Comprueba cada dispositivo', description: 'Alterna entre celular, tablet y escritorio. Puedes ajustar cada tamaño y abrir la vista comparativa desde Más antes de publicar.' },
    { title: 'Prueba la experiencia', description: 'En Más encontrarás la vista comparativa, la prueba de formularios y la descarga. Usa Vista previa para ver la invitación como invitado.' },
    { title: 'Guarda y publica', description: 'Guarda el diseño mientras trabajas. Publicar revisa advertencias antes de hacerlo visible; podrás volver a editarlo después. Repite esta guía desde Más.' }
  ];
  device: DeviceMode = 'mobile';
  loading = true;
  saving = false;
  publishing = false;
  uploading = false;
  savingTemplate = false;
  savingRevision = false;
  loadingRevisions = false;
  showOnboarding = false;
  showDesignLibrary = false;
  libraryCategory = 'all';
  librarySelectedKey = COMPLETE_DESIGN_PRESETS[0].key;
  libraryPreviewDesign?: VisualInvitationDesign;
  libraryPreviewInvitation?: InvitationModel;
  autosaving = false;
  autosaveState = 'Guardado';
  message = '';
  error = '';
  locationSearchResults: Record<number, PlaceSearchResult[]> = {};
  locationSearchLoading: Record<number, boolean> = {};
  locationExtractLoading: Record<number, boolean> = {};
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
  showAcknowledgedAuditIssues = false;
  private acknowledgedAuditIssueKeys = new Set<string>();
  showResponsivePreview = false;
  editingLayerId = '';
  previewingMediaLayerId = '';
  paletteDropSectionId = '';
  selectionMarquee?: SelectionMarquee;
  croppingLayerId = '';
  mobilePanel: MobileEditorPanel = 'canvas';
  touchZoomVisible = false;
  touchGestureActive = false;
  touchGestureLabel = '';
  showImportDialog = false;
  importingDesign = false;
  importSource: DesignImportSource = 'current';
  importStrategy: DesignImportStrategy = 'replace';
  importHtmlSource = '';
  importCssSource = '';
  importJsonSource = '';
  importJsonFileName = '';
  importError = '';
  aiExchangeMessage = '';
  aiDesignPrompt = '';
  importTemplateKey = 'envelope-cards';
  importWarnings: string[] = [];
  importSummary = '';
  private importHistorySteps = 0;
  importReview: VisualDesignImportReviewItem[] = [];
  importMappingSectionId = '';
  importMappingType: ImportMappingModuleType = 'rsvp';
  importLayerBindings: Record<string, string> = {};
  importMappingError = '';
  showFunctionalTest = false;
  functionalTestSectionId = '';
  functionalTestFeedback = '';
  functionalTestSuccess = false;
  functionalTestView: FunctionalTestView = 'guided';
  functionalTestDevice: DeviceMode = 'mobile';
  functionalTestPreviewInvitation?: InvitationModel;
  responsivePreviewInvitation?: InvitationModel;
  exportPreviewInvitation?: InvitationModel;
  showExportDialog = false;
  exportFormat: InvitationExportFormat = 'png';
  exportDevice: DeviceMode = 'desktop';
  exportScale = 2;
  exportJpegQuality = .92;
  exportPageDuration = 3;
  exportCarouselImageDuration = 1.5;
  exportTransitionDuration = .65;
  exportTransition: AnimatedExportTransition = 'fade';
  exportIncludeMusic = true;
  exportSectionIds: string[] = [];
  exportingInvitation = false;
  exportProgress = 0;
  exportError = '';
  exportWarning = '';
  functionalTestGuest?: GuestAccessResponse['guest'];
  functionalTestDedications: DedicationModel[] = [];
  functionalTestAlbumAssets: Array<{ url: string; uploaderName?: string }> = [];
  functionalTestResetKey = 0;
  functionalTestData: FunctionalTestData = this.emptyFunctionalTestData();

  readonly zoomOptions = [.5, .75, 1, 1.25, 1.5];
  readonly importMappingModules: Array<{ value: ImportMappingModuleType; label: string }> = [
    { value: 'rsvp', label: 'Confirmación RSVP' },
    { value: 'dedications', label: 'Dedicatorias' },
    { value: 'songs', label: 'Peticiones al DJ' },
    { value: 'album', label: 'Álbum colectivo' },
    { value: 'guestPass', label: 'Mesa y pase' }
  ];
  readonly functionalTestLabels: Record<FunctionalTestType, string> = {
    rsvp: 'Confirmación RSVP', dedications: 'Dedicatorias', songs: 'Peticiones al DJ', album: 'Álbum colectivo', guestPass: 'Mesa y pase'
  };
  readonly importableTemplates = [
    { key: 'envelope-cards', label: 'Sobre interactivo y cards' },
    { key: 'classic-vertical', label: 'Clásica editorial vertical' },
    { key: 'modern-minimal', label: 'Glamour moderno y minimal' },
    { key: 'boda-mobile-first', label: 'Boda mobile-first' },
    { key: 'boda-desktop-first', label: 'Boda revista editorial' },
    { key: 'boda-cards-lateral', label: 'Boda cards lateral' },
    { key: 'boda-creativa-premium', label: 'Boda royal cinematic' },
    { key: 'maison-dore', label: 'La Maison Dorée' },
    { key: 'template-boda', label: 'Temática boda' },
    { key: 'template-xv', label: 'Temática XV años' },
    { key: 'template-graduacion', label: 'Temática graduación' },
    { key: 'template-cumpleanos', label: 'Temática cumpleaños' },
    { key: 'template-bautizo', label: 'Temática bautizo' },
    { key: 'template-otro', label: 'Temática general' },
    { key: 'boda-villa-perle', label: 'Villa Perlè' },
    { key: 'boda-teatro', label: 'Gran Teatro' },
    { key: 'boda-eleganza', label: 'Eleganza Italiana' },
    { key: 'boda-rosas', label: 'Romance Floral' },
    { key: 'boda-girasoles', label: 'Elegancia Rústica' },
    { key: 'boda-navy-blue', label: 'Navy Blue & Gold' }
  ];
  readonly rsvpParts: Array<{ key: RsvpPartKey; label: string; binding: string; purpose: string }> = [
    { key: 'eyebrow', label: 'Texto superior', binding: 'display.rsvp.eyebrow', purpose: 'Presentación visual' },
    { key: 'title', label: 'Título', binding: 'display.rsvp.title', purpose: 'Presentación visual' },
    { key: 'intro', label: 'Introducción', binding: 'display.rsvp.intro', purpose: 'Presentación visual' },
    { key: 'name', label: 'Nombre', binding: 'rsvp.name', purpose: 'Guarda el nombre del invitado' },
    { key: 'contact', label: 'Correo', binding: 'rsvp.email', purpose: 'Identifica y contacta al invitado' },
    { key: 'response', label: 'Respuesta', binding: 'rsvp.response', purpose: 'Guarda si asistirá, tal vez o no asistirá' },
    { key: 'companions', label: 'Acompañantes', binding: 'rsvp.companions', purpose: 'Respeta el máximo permitido' },
    { key: 'dietary', label: 'Alimentación', binding: 'rsvp.dietaryRestrictions', purpose: 'Guarda restricciones alimentarias' },
    { key: 'message', label: 'Mensaje', binding: 'rsvp.message', purpose: 'Guarda un mensaje opcional' },
    { key: 'submit', label: 'Botón enviar', binding: 'rsvp.submit', purpose: 'Valida y envía la confirmación' },
    { key: 'feedback', label: 'Respuesta del sistema', binding: 'rsvp.feedback', purpose: 'Muestra éxito o error del envío' }
  ];
  readonly rsvpControlCatalog = [
    { binding: 'rsvp.name', label: 'Nombre', icon: 'Aa' }, { binding: 'rsvp.email', label: 'Correo', icon: '@' },
    { binding: 'rsvp.response', label: 'Respuesta', icon: '✓' }, { binding: 'rsvp.companions', label: 'Acompañantes', icon: '+1' },
    { binding: 'rsvp.dietaryRestrictions', label: 'Alimentación', icon: '◌' }, { binding: 'rsvp.message', label: 'Mensaje', icon: '✎' },
    { binding: 'rsvp.submit', label: 'Enviar', icon: '→' }
  ];
  readonly dedicationControlCatalog = [
    { binding: 'dedication.publicName', label: 'Nombre público', icon: 'Aa' },
    { binding: 'dedication.message', label: 'Dedicatoria', icon: '✎' },
    { binding: 'dedication.submit', label: 'Enviar', icon: '→' },
    { binding: 'dedication.wall', label: 'Muro aprobado', icon: '▤' }
  ];
  readonly songControlCatalog = [
    { binding: 'song.title', label: 'Canción', icon: '♫' },
    { binding: 'song.sourceUrl', label: 'Spotify / YouTube', icon: '↗' },
    { binding: 'song.artist', label: 'Artista', icon: 'Aa' },
    { binding: 'song.dedication', label: 'Dedicatoria', icon: '✎' },
    { binding: 'song.submit', label: 'Enviar al DJ', icon: '→' }
  ];
  readonly albumControlCatalog = [
    { binding: 'album.upload', label: 'Subir fotografía', icon: '＋' },
    { binding: 'album.gallery', label: 'Galería aprobada', icon: '▧' }
  ];
  readonly guestPassControlCatalog = [
    { binding: 'pass.card', label: 'Tarjeta de pase', icon: '■' },
    { binding: 'pass.email', label: 'Correo de acceso', icon: '@' }, { binding: 'pass.phone', label: 'Teléfono de acceso', icon: '☎' },
    { binding: 'pass.identify', label: 'Identificar pase', icon: '→' }, { binding: 'pass.name', label: 'Nombre', icon: 'Aa' },
    { binding: 'pass.group', label: 'Grupo', icon: '●' }, { binding: 'pass.table', label: 'Mesa', icon: '▣' },
    { binding: 'pass.seat', label: 'Asiento', icon: '#' }, { binding: 'pass.companions', label: 'Acompañantes', icon: '+1' },
    { binding: 'pass.qr', label: 'Código QR', icon: '▦' }
  ];
  readonly guestActivityControlCatalog = [
    { binding: 'activity.email', label: 'Correo de acceso', icon: '@' }, { binding: 'activity.phone', label: 'Teléfono de acceso', icon: '☎' },
    { binding: 'activity.identify', label: 'Identificar invitado', icon: '→' }, { binding: 'activity.greeting', label: 'Saludo y novedades', icon: 'Aa' },
    { binding: 'activity.rsvp', label: 'Estado RSVP', icon: '✓' }, { binding: 'activity.pass', label: 'Mesa y pase', icon: '▦' },
    { binding: 'activity.album', label: 'Total de fotos', icon: '▧' }, { binding: 'activity.songs', label: 'Total de canciones', icon: '♪' },
    { binding: 'activity.dedications', label: 'Total de dedicatorias', icon: '✎' }, { binding: 'activity.manage', label: 'Abrir centro rápido', icon: '⚙' },
    { binding: 'activity.full', label: 'Abrir centro completo', icon: '↗' }
  ];
  readonly countdownControlCatalog = [
    { binding: 'countdown.days', label: 'Número de días', icon: '00' }, { binding: 'display.countdown.daysLabel', label: 'Etiqueta Días', icon: 'Aa' },
    { binding: 'countdown.hours', label: 'Número de horas', icon: '00' }, { binding: 'display.countdown.hoursLabel', label: 'Etiqueta Horas', icon: 'Aa' },
    { binding: 'countdown.minutes', label: 'Número de minutos', icon: '00' }, { binding: 'display.countdown.minutesLabel', label: 'Etiqueta Minutos', icon: 'Aa' },
    { binding: 'countdown.seconds', label: 'Número de segundos', icon: '00' }, { binding: 'display.countdown.secondsLabel', label: 'Etiqueta Segundos', icon: 'Aa' },
    { binding: 'countdown.expired', label: 'Mensaje al finalizar', icon: '★' }
  ];
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
  readonly exportDevices: Array<{ key: DeviceMode; label: string; width: number }> = [
    { key: 'mobile', label: 'Celular', width: 390 },
    { key: 'tablet', label: 'Tablet', width: 768 },
    { key: 'desktop', label: 'Escritorio', width: 1180 }
  ];
  readonly exportScales = [
    { value: 1, label: 'Estándar', detail: '1x' },
    { value: 2, label: 'Alta', detail: '2x' },
    { value: 3, label: 'Máxima', detail: '3x' }
  ];
  readonly exportTransitions: Array<{ value: AnimatedExportTransition; label: string; detail: string }> = [
    { value: 'fade', label: 'Fundido', detail: 'Cambio suave' },
    { value: 'slide', label: 'Deslizar', detail: 'Movimiento lateral' },
    { value: 'zoom', label: 'Zoom', detail: 'Entrada cinematográfica' }
  ];

  private undoStack: EditorHistoryState[] = [];
  private redoStack: EditorHistoryState[] = [];
  private clipboardLayers: VisualInvitationLayer[] = [];
  private clipboardSectionType?: string;
  private autosaveHandle?: ReturnType<typeof setInterval>;
  private touchZoomHideHandle?: ReturnType<typeof setTimeout>;
  private locationSearchTimeouts: Record<number, ReturnType<typeof setTimeout>> = {};
  private lastSavedSnapshot = '';
  private suppressNextLayerClickId = '';
  private inlineEditOriginal = '';
  private paletteDragItem?: PaletteDragItem;
  private photoSwapSourceId = '';
  photoSwapTargetId = '';
  fileDropTargetLayerId = '';
  private photoSpacingEditKey = '';
  iconSearch = '';
  iconCategory: 'all' | VisualIconOption['category'] = 'all';
  readonly iconCatalog = VISUAL_ICON_CATALOG;
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
    section: VisualInvitationSection;
    layout: VisualInvitationLayerLayout;
    canvas: HTMLElement;
    startX: number;
    startY: number;
    x: number;
    y: number;
    width: number;
    height: number;
    layer?: VisualInvitationLayer;
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
  private pluginPartDragState?: {
    section: VisualInvitationSection;
    part: VisualPluginPartDesign;
    canvas: HTMLElement;
    startX: number;
    startY: number;
    x: number;
    y: number;
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

  @ViewChild('exportSurface') exportSurface?: ElementRef<HTMLElement>;
  @ViewChild('exportRenderer') exportRenderer?: VisualInvitationRendererComponent;
  @ViewChildren('responsiveArtboard') responsiveArtboards?: QueryList<ElementRef<HTMLElement>>;
  responsivePreviewRuntimeIssues: Record<DeviceMode, string[]> = { mobile: [], tablet: [], desktop: [] };
  responsivePreviewMeasuredHeight: Record<DeviceMode, number> = { mobile: 0, tablet: 0, desktop: 0 };
  responsivePreviewView: 'all' | DeviceMode = 'all';
  showResponsiveAlertsModal = false;
  selectedAlertsTab: 'all' | DeviceMode = 'all';
  openAlertsDevice: DeviceMode | null = null;
  private responsiveAuditHandle?: ReturnType<typeof setTimeout>;

  readonly builtInPresets = COMPLETE_DESIGN_PRESETS;

  readonly themePresets: Array<{ key: string; label: string; theme: VisualTheme }> = [
    { key: 'haute-couture', label: 'Alta Costura', theme: { backgroundColor: '#fcfaf7', textColor: '#181514', accentColor: '#c59b48', headingFont: "'Cinzel Decorative', serif", bodyFont: 'Montserrat, sans-serif', buttonBackgroundColor: '#181514', buttonTextColor: '#ffffff', buttonStyle: 'solid', buttonRadius: 30 } },
    { key: 'xv-burgundy', label: 'Mis XV Borgoña Real', theme: { backgroundColor: '#5c0d18', textColor: '#faf6f0', accentColor: '#d4af37', headingFont: "'Great Vibes', cursive", bodyFont: 'Montserrat, sans-serif', buttonBackgroundColor: '#d4af37', buttonTextColor: '#5c0d18', buttonStyle: 'solid', buttonRadius: 30 } },
    { key: 'editorial', label: 'Editorial', theme: { backgroundColor: '#f6f1eb', textColor: '#24211f', accentColor: '#b57c62', headingFont: "'Playfair Display', serif", bodyFont: 'Montserrat, sans-serif', buttonBackgroundColor: '#24211f', buttonTextColor: '#ffffff', buttonStyle: 'solid', buttonRadius: 4 } },
    { key: 'romantic', label: 'Romántico', theme: { backgroundColor: '#fff7f6', textColor: '#56383d', accentColor: '#b96775', headingFont: "'Cormorant Garamond', serif", bodyFont: 'Montserrat, sans-serif', buttonBackgroundColor: '#9f5260', buttonTextColor: '#ffffff', buttonStyle: 'soft', buttonRadius: 18 } },
    { key: 'garden', label: 'Jardín', theme: { backgroundColor: '#f5f4ec', textColor: '#263c32', accentColor: '#66836f', headingFont: 'Cinzel, serif', bodyFont: 'Montserrat, sans-serif', buttonBackgroundColor: '#385947', buttonTextColor: '#ffffff', buttonStyle: 'outline', buttonRadius: 2 } },
    { key: 'celebration', label: 'Celebración', theme: { backgroundColor: '#fffaf0', textColor: '#292523', accentColor: '#c04b5c', headingFont: "'Alex Brush', cursive", bodyFont: 'Arial, sans-serif', buttonBackgroundColor: '#167c72', buttonTextColor: '#ffffff', buttonStyle: 'solid', buttonRadius: 24 } },
    { key: 'night', label: 'Noche', theme: { backgroundColor: '#181715', textColor: '#f5efe4', accentColor: '#d2ad63', headingFont: 'Cinzel, serif', bodyFont: 'Montserrat, sans-serif', buttonBackgroundColor: '#d2ad63', buttonTextColor: '#181715', buttonStyle: 'outline', buttonRadius: 0 } }
  ];

  readonly sectionCatalog = [
    { type: 'custom', label: 'Sección vacía' },
    { type: 'story', label: 'Nuestra historia' }
  ];

  readonly pluginCatalog = [
    { type: 'rsvp', icon: '✓', label: 'Confirmación RSVP' },
    { type: 'guestPass', icon: '▦', label: 'Mi mesa y pase' },
    { type: 'guestActivity', icon: '◎', label: 'Mi pase y actividad' },
    { type: 'countdown', icon: '◷', label: 'Cuenta regresiva' },
    { type: 'locations', icon: '⌖', label: 'Ubicación y mapa' },
    { type: 'gifts', icon: '⌑', label: 'Mesa de regalos' },
    { type: 'album', icon: '▧', label: 'Álbum colectivo' },
    { type: 'dedications', icon: '“”', label: 'Dedicatorias' },
    { type: 'songs', icon: '♪', label: 'Peticiones al DJ' },
    { type: 'gallery', icon: '▥', label: 'Galería' },
    { type: 'itinerary', icon: '≡', label: 'Itinerario' },
    { type: 'dressCode', icon: '♢', label: 'Vestimenta' },
    { type: 'lodging', icon: '⌂', label: 'Hospedaje' }
  ];

  readonly componentCatalog = [
    { key: 'hero', icon: 'Aa', label: 'Portada' },
    { key: 'heading', icon: 'T', label: 'Título' },
    { key: 'imageCaption', icon: '▧', label: 'Foto + texto' },
    { key: 'quote', icon: '“”', label: 'Cita' },
    { key: 'cta', icon: '→', label: 'Botón CTA' },
    { key: 'divider', icon: '—', label: 'Separador' }
  ];

  readonly dynamicVariables = VISUAL_TEMPLATE_VARIABLES;
  readonly smartComponentCatalog = [
    { key: 'smartGreeting', icon: 'Aa', label: 'Saludo personal' },
    { key: 'smartPass', icon: '#', label: 'Mesa y pase' },
    { key: 'smartEvent', icon: '◷', label: 'Fecha y lugar' },
    { key: 'smartRsvp', icon: '✓', label: 'Botón RSVP' },
    { key: 'smartMap', icon: '⌖', label: 'Botón mapa' },
    { key: 'smartCalendar', icon: '▦', label: 'Agendar evento' }
  ];
  readonly buttonActions = [
    { value: '', label: 'Enlace personalizado' },
    { value: 'section:rsvp', label: 'Ir a confirmación RSVP' },
    { value: 'section:guestPass', label: 'Ir a mi mesa y pase' },
    { value: 'section:guestActivity', label: 'Ir a mi actividad' },
    { value: 'section:countdown', label: 'Ir a cuenta regresiva' },
    { value: 'section:locations', label: 'Ir a ubicación y mapa' },
    { value: 'section:gifts', label: 'Ir a mesa de regalos' },
    { value: 'section:gallery', label: 'Ir a galería' },
    { value: 'section:itinerary', label: 'Ir a itinerario' },
    { value: 'section:dressCode', label: 'Ir a vestimenta' },
    { value: 'section:lodging', label: 'Ir a hospedaje' },
    { value: 'section:album', label: 'Ir al álbum colectivo' },
    { value: 'section:dedications', label: 'Ir a dedicatorias' },
    { value: 'section:songs', label: 'Ir a peticiones al DJ' },
    { value: 'map', label: 'Abrir ubicación principal' },
    { value: 'calendar', label: 'Agregar al calendario' }
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
  readonly previewGuest = { name: 'Invitado de ejemplo', group: 'Familia', tableName: 'Mesa 5', seatLabel: 'A-12', allowedCompanions: 2 };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private designImporter: VisualDesignImporterService,
    private animatedExporter: VisualInvitationAnimatedExportService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.api.listInvitations().subscribe({
      next: ({ invitations }) => {
        this.invitation = invitations.find((item) => (item._id || item.id) === id);
        if (!this.invitation) return this.fail('Invitación no encontrada.');
        const draftDesign = this.invitation.content?.visualDesignDraft;
        const publishedVisualDesign = this.invitation.content?.template === 'visual-builder'
          ? this.invitation.content?.visualDesign
          : undefined;
        const storedDesign = draftDesign?.sections?.length ? draftDesign : publishedVisualDesign;
        this.showOnboarding = !storedDesign?.sections?.length;
        this.design = this.clone(storedDesign?.sections?.length ? storedDesign : this.createDefaultDesign());
        this.design.presentationMode = this.design.presentationMode || 'continuous';
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
        if (!eventId) { this.loading = false; this.maybeStartTutorial(); return; }
        this.api.getEvent(eventId).subscribe({
          next: ({ event }) => { this.event = event; this.loading = false; this.maybeStartTutorial(); },
          error: () => { this.loading = false; this.maybeStartTutorial(); }
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
    if (this.responsiveAuditHandle) clearTimeout(this.responsiveAuditHandle);
    if (this.touchZoomHideHandle) clearTimeout(this.touchZoomHideHandle);
    Object.values(this.locationSearchTimeouts).forEach((handle) => clearTimeout(handle));
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

  get selectedCompositeFrames(): VisualInvitationLayer[] {
    const layers = this.selectedLayers;
    const groupId = layers[0]?.groupId;
    return groupId && layers.length > 1 && layers.every((layer) => layer.groupId === groupId && layer.type === 'image' && layer.style?.frameEnabled)
      ? layers : [];
  }

  get compatiblePhotoCompositionPresets(): typeof PHOTO_COMPOSITION_PRESETS {
    return this.photoCompositionPresets.filter((preset) => preset.slots.length === this.selectedCompositeFrames.length);
  }

  get canReflowSelectedComposition(): boolean {
    return this.selectedCompositeFrames.length > 1 && this.selectedCompositeFrames.every((frame) => !frame.locked);
  }

  get selectedPhotoCompositionSpacing(): number {
    const section = this.selectedSection;
    return section && this.selectedCompositeFrames.length > 1
      ? Math.round(photoCompositionSpacing(this.selectedCompositeFrames.map((frame) => this.layoutFor(frame)), this.artboardWidth, visualSectionHeight(section)))
      : 0;
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
    const gap = this.design?.presentationMode === 'chapters' ? 22 : 0;
    return visualCanvasHeight(sections) + Math.max(0, sections.length - 1) * gap;
  }

  get hasClipboardLayers(): boolean {
    return this.clipboardLayers.length > 0;
  }

  get criticalAuditCount(): number {
    return this.pendingPublishAuditIssues.filter((issue) => issue.severity === 'critical').length;
  }

  get warningAuditCount(): number {
    return this.pendingPublishAuditIssues.filter((issue) => issue.severity === 'warning').length;
  }

  get optionalAuditCount(): number {
    return this.pendingPublishAuditIssues.filter((issue) => issue.severity === 'suggestion').length;
  }

  get pendingPublishAuditIssues(): PublishAuditIssue[] {
    return this.publishAuditIssues.filter((issue) => !this.acknowledgedAuditIssueKeys.has(this.auditIssueKey(issue)));
  }

  get acknowledgedPublishAuditIssues(): PublishAuditIssue[] {
    return this.publishAuditIssues.filter((issue) => this.acknowledgedAuditIssueKeys.has(this.auditIssueKey(issue)));
  }

  get selectedLayout(): VisualInvitationLayerLayout | undefined {
    return this.selectedLayer ? this.editableLayout(this.selectedLayer) : undefined;
  }

  get hasUnsavedChanges(): boolean {
    return !!this.design && this.designSnapshot() !== this.lastSavedSnapshot;
  }

  get rsvpDeadlineDate(): string {
    const value = this.invitation?.rsvpSettings?.deadline;
    return value ? String(value).slice(0, 10) : '';
  }

  setDevice(device: DeviceMode): void {
    this.device = device;
    setTimeout(() => this.fitCanvasToViewport());
  }

  setMobilePanel(panel: MobileEditorPanel): void {
    this.mobilePanel = panel;
    if (panel === 'canvas') setTimeout(() => this.fitCanvasToViewport());
  }

  private maybeStartTutorial(): void {
    if (this.showOnboarding) return;
    try {
      if (localStorage.getItem('kyndra-visual-editor-tutorial-v1')) return;
    } catch { /* El tutorial también funciona sin almacenamiento local. */ }
    setTimeout(() => this.openTutorial());
  }

  openTutorial(): void {
    this.tutorialStep = 0;
    this.prepareTutorialStep();
  }

  changeTutorialStep(direction: number): void {
    if (this.tutorialStep < 0) return;
    if (this.tutorialStep + direction >= this.tutorialSteps.length) { this.closeTutorial(); return; }
    this.tutorialStep = Math.max(0, this.tutorialStep + direction);
    this.prepareTutorialStep();
  }

  closeTutorial(): void {
    this.tutorialStep = -1;
    try { localStorage.setItem('kyndra-visual-editor-tutorial-v1', 'seen'); } catch { /* The guide remains available from Más. */ }
  }

  private prepareTutorialStep(): void {
    const categories: Partial<Record<number, ToolCategory>> = { 1: 'design', 2: 'elements', 3: 'assets', 4: 'functions' };
    const category = categories[this.tutorialStep];
    if (category) {
      this.toolCategory = category;
      this.toolsCollapsed = false;
      this.setMobilePanel('tools');
    } else if (this.tutorialStep === 6) {
      this.inspectorView = 'properties';
      this.setMobilePanel('inspector');
    } else {
      this.setMobilePanel('canvas');
    }
  }

  openMobileInspector(): void {
    this.inspectorView = 'properties';
    this.setMobilePanel('inspector');
  }

  clearMobileSelection(): void {
    this.clearLayerSelection();
  }

  fitCanvasToViewport(): void {
    if (typeof window === 'undefined' || window.innerWidth > 1280) return;
    const availableWidth = Math.max(240, window.innerWidth - (window.innerWidth <= 700 ? 20 : 48));
    this.canvasZoom = this.bound(availableWidth / this.artboardWidth, .5, 1);
  }

  @HostListener('window:resize')
  handleViewportResize(): void {
    if (this.mobilePanel === 'canvas') this.fitCanvasToViewport();
  }

  @HostListener('window:dragenter', ['$event'])
  onWindowDragEnter(event: DragEvent): void {
    if (this.isExternalFileDrag(event)) {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    }
  }

  @HostListener('window:dragover', ['$event'])
  onWindowDragOver(event: DragEvent): void {
    if (this.isExternalFileDrag(event)) {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    }
  }

  @HostListener('window:drop', ['$event'])
  onWindowDrop(event: DragEvent): void {
    if (this.isExternalFileDrag(event)) {
      event.preventDefault();
    }
  }

  setCanvasZoom(value: number | string): void {
    this.canvasZoom = this.bound(Number(value) || 1, .5, 1.5);
  }

  normalizeLayerTransform(layer: VisualInvitationLayer, layout: VisualInvitationLayerLayout): void {
    layout.width = this.bound(this.finiteNumber(layout.width, 1), 1, 100);
    layout.height = this.bound(this.finiteNumber(layout.height, 1), 1, 100);
    layout.x = this.bound(this.finiteNumber(layout.x, 0), -100, 200);
    const range = this.verticalLayerBounds(this.selectedSection, layout.height);
    layout.y = this.bound(this.finiteNumber(layout.y, 0), range.min, range.max);
    layout.rotation = this.bound(this.finiteNumber(layout.rotation, 0), -180, 180);
    layer.zIndex = Math.round(this.bound(this.finiteNumber(layer.zIndex, 0), 0, 1000));
  }

  verticalLayerBounds(section: VisualInvitationSection | undefined, layerHeight: number): { min: number; max: number } {
    if (!section || this.design.presentationMode === 'chapters') return { min: 0, max: 100 - layerHeight };
    const index = this.design.sections.indexOf(section);
    if (index < 0) return { min: 0, max: 100 - layerHeight };
    const before = visualSectionOffset(this.design.sections, section);
    const total = visualCanvasHeight(this.design.sections);
    const height = visualSectionHeight(section);
    return {
      min: before ? Math.max(-10000, -before / height * 100) : 0,
      max: Math.min(10000, (total - before) / height * 100 - layerHeight)
    };
  }

  sectionHasOverflowLayers(section: VisualInvitationSection): boolean {
    return this.design.presentationMode !== 'chapters' && section.layers.some((layer) => {
      if (layer.hidden) return false;
      const layout = this.layoutFor(layer);
      return layout.y < 0 || layout.y + layout.height > 100;
    });
  }

  layerHasHorizontalOverflow(layout: VisualInvitationLayerLayout): boolean {
    return layout.x < 0 || layout.x + layout.width > 100;
  }

  openResponsivePreview(): void {
    this.publishAuditIssues = this.auditDesign();
    if (this.invitation) {
      this.responsivePreviewInvitation = {
        ...this.invitation,
        content: {
          ...(this.invitation.content || {}),
          visualDesign: { ...this.clone(this.design), active: true }
        }
      };
    }
    this.responsivePreviewView = 'all';
    this.showResponsivePreview = true;
    this.responsivePreviewRuntimeIssues = { mobile: [], tablet: [], desktop: [] };
    this.responsivePreviewMeasuredHeight = { mobile: 0, tablet: 0, desktop: 0 };
    this.scheduleResponsiveAudit(1000);
  }

  closeResponsivePreview(): void {
    this.showResponsivePreview = false;
    this.showResponsiveAlertsModal = false;
    this.openAlertsDevice = null;
    if (this.responsiveAuditHandle) clearTimeout(this.responsiveAuditHandle);
  }

  scheduleResponsiveAudit(delay = 350): void {
    if (this.responsiveAuditHandle) clearTimeout(this.responsiveAuditHandle);
    this.responsiveAuditHandle = setTimeout(() => this.auditRenderedPreviews(), delay);
  }

  private auditRenderedPreviews(): void {
    if (!this.showResponsivePreview) return;
    for (const artboardRef of this.responsiveArtboards?.toArray() || []) {
      const artboard = artboardRef.nativeElement;
      const device = artboard.dataset['device'] as DeviceMode;
      if (!device) continue;
      const issues: string[] = [];
      const page = artboard.querySelector<HTMLElement>('.visual-invitation');
      if (page && page.scrollWidth > page.clientWidth + 3) issues.push('Contenido desbordado horizontalmente');
      if (page) this.responsivePreviewMeasuredHeight[device] = page.scrollHeight;
      for (const image of Array.from(artboard.querySelectorAll('img'))) {
        if (image.complete && !image.naturalWidth && image.currentSrc) issues.push(`Imagen no disponible: ${image.alt || image.currentSrc}`);
      }
      this.responsivePreviewRuntimeIssues[device] = issues;
    }
  }

  openExportDialog(): void {
    this.exportSectionIds = this.exportableSections.map((section) => section.id);
    this.exportError = '';
    this.exportWarning = '';
    this.exportProgress = 0;
    this.rebuildExportPreview();
    this.showExportDialog = true;
  }

  closeExportDialog(): void {
    if (this.exportingInvitation) return;
    this.showExportDialog = false;
    this.exportPreviewInvitation = undefined;
  }

  get exportableSections(): VisualInvitationSection[] {
    return this.design.sections.filter((section) => section.enabled);
  }

  get selectedExportSections(): VisualInvitationSection[] {
    return this.exportableSections.filter((section) => this.exportSectionIds.includes(section.id));
  }

  get exportDeviceWidth(): number {
    return this.exportDevices.find((option) => option.key === this.exportDevice)?.width || 1180;
  }

  get exportOutputWidth(): number {
    return this.exportDeviceWidth * this.exportScale;
  }

  get animatedExport(): boolean {
    return this.exportFormat === 'gif' || this.exportFormat === 'mp4';
  }

  get animatedOutputSize(): { width: number; height: number } {
    return animatedFrameSize(this.exportDevice, this.animatedWidthForScale(this.exportScale));
  }

  animatedWidthForScale(scale: number): number {
    const limits = this.exportFormat === 'gif' ? [360, 540, 720] : [720, 1280, 1920];
    return animatedFrameSize(this.exportDevice, Math.min(this.exportDeviceWidth * scale, limits[Math.max(0, Math.min(2, scale - 1))])).width;
  }

  get mp4Supported(): boolean {
    return Boolean(this.animatedExporter.supportedMp4Type());
  }

  get exportMusicUrl(): string {
    const primary = String(this.invitation?.content?.musicUrl || '').trim();
    if (primary) return primary;
    for (const section of this.selectedExportSections) {
      const audio = section.layers.find((layer) => layer.type === 'audio' && layer.url);
      if (audio?.url) return audio.url;
    }
    return '';
  }

  get exportCanIncludeMusic(): boolean {
    return resolveVisualMediaSource(this.exportMusicUrl).provider === 'direct';
  }

  get exportContainsMedia(): boolean {
    return this.selectedExportSections.some((section) => section.layers.some((layer) => layer.type === 'video' || layer.type === 'audio'));
  }

  get exportContainsCarousel(): boolean {
    return this.selectedExportSections.some((section) => section.type === 'gallery' && this.galleryExportMode(section) === 'carousel');
  }

  isExportSectionSelected(section: VisualInvitationSection): boolean {
    return this.exportSectionIds.includes(section.id);
  }

  toggleExportSection(section: VisualInvitationSection, selected: boolean): void {
    this.exportSectionIds = selected
      ? Array.from(new Set([...this.exportSectionIds, section.id]))
      : this.exportSectionIds.filter((id) => id !== section.id);
    this.rebuildExportPreview();
  }

  selectAllExportSections(selected: boolean): void {
    this.exportSectionIds = selected ? this.exportableSections.map((section) => section.id) : [];
    this.rebuildExportPreview();
  }

  exportFormatLabel(): string {
    return this.exportFormat === 'jpeg' ? 'JPEG' : this.exportFormat.toUpperCase();
  }

  exportDeliveryLabel(): string {
    if (this.animatedExport) return `1 archivo ${this.exportFormatLabel()} con ${this.selectedExportSections.length} escena${this.selectedExportSections.length === 1 ? '' : 's'}`;
    if (this.exportFormat === 'pdf') return `${this.selectedExportSections.length} página${this.selectedExportSections.length === 1 ? '' : 's'} en un PDF`;
    return this.selectedExportSections.length > 1
      ? `${this.selectedExportSections.length} archivos ${this.exportFormatLabel()} en ZIP`
      : `1 archivo ${this.exportFormatLabel()}`;
  }

  exportSectionThumbnailStyle(section: VisualInvitationSection): Record<string, string> {
    const background = section.background || {};
    const alpha = Math.round(Number(background.overlay || 0) * 255).toString(16).padStart(2, '0');
    return {
      backgroundColor: background.color || this.design.theme?.backgroundColor || '#ffffff',
      backgroundImage: background.imageUrl ? `linear-gradient(#000000${alpha},#000000${alpha}),url("${background.imageUrl}")` : 'none'
    };
  }

  async exportInvitation(): Promise<void> {
    if (!this.selectedExportSections.length || this.exportingInvitation) return;
    this.exportingInvitation = true;
    this.exportError = '';
    this.exportWarning = '';
    this.exportProgress = 5;
    this.rebuildExportPreview();

    try {
      await this.inlineExportImages();
      await this.waitForExportRenderer();
      this.exportProgress = 10;
      const surface = this.exportSurface?.nativeElement;
      const elements = Array.from(surface?.querySelectorAll<HTMLElement>('.visual-section') || []);
      if (elements.length !== this.selectedExportSections.length) throw new Error('No fue posible preparar todas las páginas seleccionadas.');

      const fileBase = this.exportFileBase();
      if (this.animatedExport) {
        await this.exportAnimatedInvitation(elements, fileBase);
        this.flash(`Exportación ${this.exportFormatLabel()} preparada.`);
        return;
      }
      const imagePages: Array<{ name: string; blob: Blob }> = [];
      let pdf: JsPdfDocument | undefined;
      const pdfModule = this.exportFormat === 'pdf' ? await import('jspdf') : undefined;

      for (let index = 0; index < elements.length; index += 1) {
        this.exportProgress = 10 + Math.round(index / elements.length * 80);
        const canvas = await this.captureExportSection(elements[index], this.exportScale, this.exportFormat === 'png' ? null : '#ffffff');
        const pageNumber = String(index + 1).padStart(2, '0');

        if (this.exportFormat === 'pdf') {
          const orientation: 'portrait' | 'landscape' = canvas.width > canvas.height ? 'landscape' : 'portrait';
          if (!pdf) {
            pdf = new pdfModule!.jsPDF({ orientation, unit: 'px', format: [canvas.width, canvas.height], compress: true, hotfixes: ['px_scaling'] });
          } else {
            pdf.addPage([canvas.width, canvas.height], orientation);
          }
          pdf.addImage(
            canvas.toDataURL('image/jpeg', .94),
            'JPEG',
            0,
            0,
            pdf.internal.pageSize.getWidth(),
            pdf.internal.pageSize.getHeight(),
            undefined,
            'FAST'
          );
        } else {
          const mime = this.exportFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
          const extension = this.exportFormat === 'jpeg' ? 'jpg' : 'png';
          imagePages.push({
            name: `${fileBase}-pagina-${pageNumber}.${extension}`,
            blob: await this.canvasBlob(canvas, mime, this.exportJpegQuality)
          });
        }

        canvas.width = 1;
        canvas.height = 1;
      }

      if (pdf) {
        pdf.save(`${fileBase}.pdf`);
      } else if (imagePages.length === 1) {
        this.downloadBlob(imagePages[0].blob, imagePages[0].name);
      } else {
        const { default: JSZip } = await import('jszip');
        const zip = new JSZip();
        imagePages.forEach((page) => zip.file(page.name, page.blob));
        this.downloadBlob(await zip.generateAsync({ type: 'blob' }), `${fileBase}-${this.exportFormat}.zip`);
      }

      this.exportProgress = 100;
      this.flash(`Exportación ${this.exportFormatLabel()} preparada.`);
    } catch (error) {
      this.exportError = error instanceof Error ? error.message : 'No fue posible exportar la invitación.';
    } finally {
      this.exportingInvitation = false;
    }
  }

  private captureExportSection(section: HTMLElement, scale: number, backgroundColor: string | null): Promise<HTMLCanvasElement> {
    const root = this.exportSurface?.nativeElement.querySelector<HTMLElement>('.visual-invitation');
    if (!root) throw new Error('No fue posible preparar el lienzo para exportar.');
    const top = section.getBoundingClientRect().top - root.getBoundingClientRect().top;
    return html2canvas(root, {
      x: 0,
      y: Math.round(top),
      width: root.clientWidth,
      height: section.offsetHeight,
      scale,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor
    });
  }

  private async exportAnimatedInvitation(elements: HTMLElement[], fileBase: string): Promise<void> {
    const captureScale = this.animatedOutputSize.width / this.exportDeviceWidth;
    const scenes: AnimatedExportScene[] = [];
    for (let index = 0; index < elements.length; index += 1) {
      this.exportProgress = 10 + Math.round(index / elements.length * 25);
      const frameIndexes = this.galleryExportFrameIndexes(this.selectedExportSections[index]);
      const frames: HTMLCanvasElement[] = [];
      for (const galleryIndex of frameIndexes) {
        this.exportRenderer?.setExportGalleryIndex(galleryIndex);
        await this.waitForExportRenderer();
        frames.push(await this.captureExportSection(elements[index], captureScale, this.design.theme?.backgroundColor || '#ffffff'));
      }
      scenes.push({ frames });
    }

    try {
      const audioUrl = this.exportFormat === 'mp4' && this.exportIncludeMusic && this.exportCanIncludeMusic
        ? this.exportMusicUrl
        : undefined;
      const result = await this.animatedExporter.create(scenes, {
        format: this.exportFormat as 'gif' | 'mp4',
        device: this.exportDevice,
        width: this.animatedOutputSize.width,
        pageDuration: this.exportPageDuration,
        transitionDuration: Math.min(this.exportTransitionDuration, this.exportPageDuration / 2),
        transition: this.exportTransition,
        fps: 30,
        backgroundColor: this.design.theme?.backgroundColor || '#ffffff',
        audioUrl
      }, (progress) => { this.exportProgress = 35 + Math.round(progress * .65); });
      this.downloadBlob(result.blob, `${fileBase}.${result.extension}`);
      this.exportWarning = result.warning || '';
      this.exportProgress = 100;
    } finally {
      scenes.flatMap((scene) => scene.frames).forEach((canvas) => {
        canvas.width = 1;
        canvas.height = 1;
      });
    }
  }

  private galleryExportFrameIndexes(section: VisualInvitationSection): number[] {
    const items = (this.invitation?.content?.galleryItems || []).filter((item) => item.url);
    const featuredIndex = Math.max(0, items.findIndex((item) => item.featured));
    if (section.type !== 'gallery' || this.galleryExportMode(section) !== 'carousel' || items.length < 2) return [featuredIndex];
    const stableDuration = Math.max(.5, this.exportPageDuration - this.exportTransitionDuration);
    const count = Math.min(items.length, Math.max(1, Math.ceil(stableDuration / this.exportCarouselImageDuration)));
    return Array.from({ length: count }, (_, offset) => (featuredIndex + offset) % items.length);
  }

  private galleryExportMode(section: VisualInvitationSection): 'grid' | 'list' | 'carousel' {
    const configured = String(section.pluginSettings?.['displayMode'] || 'inherit');
    if (configured === 'grid' || configured === 'list' || configured === 'carousel') return configured;
    return this.invitation?.content?.gallerySettings?.displayMode || 'grid';
  }

  private rebuildExportPreview(): void {
    if (!this.invitation) return;
    const sections = this.selectedExportSections.map((section) => this.clone(section));
    const content = this.clone(this.invitation.content || {});
    this.exportPreviewInvitation = {
      ...this.invitation,
      content: {
        ...content,
        visualDesign: { ...this.clone(this.design), active: true, sections }
      }
    };
  }

  private async inlineExportImages(): Promise<void> {
    const content = this.exportPreviewInvitation?.content;
    const sections = content?.visualDesign?.sections || [];
    if (!content) return;
    const cache = new Map<string, Promise<string>>();
    const inline = (url?: string) => {
      const source = String(url || '').trim();
      if (!source || source.startsWith('data:') || source.startsWith('blob:')) return Promise.resolve(source);
      if (!cache.has(source)) cache.set(source, this.exportImageDataUrl(source));
      return cache.get(source)!;
    };

    content.coverImageUrl = await inline(content.coverImageUrl);
    if (content.galleryItems) {
      await Promise.all(content.galleryItems.map(async (item) => { item.url = await inline(item.url); }));
      content.gallery = content.galleryItems.map((item) => item.url).filter(Boolean);
    }
    await Promise.all(sections.flatMap((section) => {
      const tasks: Promise<void>[] = [];
      if (section.background?.imageUrl) tasks.push(inline(section.background.imageUrl).then((url) => { section.background!.imageUrl = url; }));
      section.layers.filter((layer) => layer.type === 'image' && layer.url).forEach((layer) => {
        tasks.push(inline(layer.url).then((url) => { layer.url = url; }));
      });
      return tasks;
    }));
  }

  private async exportImageDataUrl(url: string): Promise<string> {
    let blob: Blob | undefined;
    try {
      const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
      if (response.ok) blob = await response.blob();
    } catch {
      // The authenticated proxy below handles storage providers that block browser canvas access.
    }
    if (!blob?.type.startsWith('image/')) {
      try { blob = await this.api.exportAssetImage(url).toPromise(); } catch { return url; }
    }
    if (!blob?.type.startsWith('image/')) return url;
    const imageBlob = blob;
    try {
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => resolve(String(reader.result || url)), { once: true });
        reader.addEventListener('error', () => reject(reader.error), { once: true });
        reader.readAsDataURL(imageBlob);
      });
    } catch {
      return url;
    }
  }

  private async waitForExportRenderer(): Promise<void> {
    await this.exportDelay(0);
    if (document.fonts?.ready) await Promise.race([document.fonts.ready.then(() => undefined), this.exportDelay(3000)]);
    await this.exportDelay(50);
    const images = Array.from(this.exportSurface?.nativeElement.querySelectorAll<HTMLImageElement>('img') || []);
    await Promise.all(images.map((image) => image.complete
      ? Promise.resolve()
      : Promise.race([
        new Promise<void>((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        }),
        this.exportDelay(5000)
      ])));
  }

  private exportDelay(milliseconds: number): Promise<void> {
    return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
  }

  private canvasBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('No fue posible generar la imagen.')), mime, quality));
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private exportFileBase(): string {
    const source = this.invitation?.content?.headline || this.event?.title || 'invitacion';
    return source.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'invitacion';
  }

  responsiveIssueCount(device: DeviceMode): number {
    return this.publishAuditIssues.filter((issue) => issue.device === device).length + this.responsivePreviewRuntimeIssues[device].length;
  }

  responsivePreviewContentHeight(): number {
    const heights = this.design.sections.filter((section) => section.enabled).map(visualSectionHeight);
    return this.design.presentationMode === 'chapters'
      ? Math.max(0, ...heights) + 96
      : heights.reduce((total, height) => total + height, 0);
  }

  get displayedPreviewDevices(): Array<{ key: DeviceMode; label: string; width: number; scale: number }> {
    if (this.responsivePreviewView === 'all') {
      return this.previewDevices;
    }
    return this.previewDevices.filter((preview) => preview.key === this.responsivePreviewView);
  }

  setResponsivePreviewView(view: 'all' | DeviceMode): void {
    this.responsivePreviewView = view;
    this.scheduleResponsiveAudit(200);
  }

  responsivePreviewScale(device: DeviceMode): number {
    if (this.responsivePreviewView === 'all') {
      if (device === 'mobile') return 0.62;
      if (device === 'tablet') return 0.46;
      if (device === 'desktop') return 0.41;
      return 0.5;
    }
    if (device === 'mobile') return 0.95;
    if (device === 'tablet') return 0.85;
    if (device === 'desktop') return 0.80;
    return 1;
  }

  responsivePreviewViewportStyle(preview: { key: DeviceMode; width: number }): Record<string, string> {
    const scale = this.responsivePreviewScale(preview.key);
    const viewportWidth = Math.round(preview.width * scale);
    const viewportHeight = this.responsivePreviewView === 'all' ? 520 : 640;
    return {
      width: `${viewportWidth}px`,
      height: `${viewportHeight}px`
    };
  }

  responsivePreviewStageStyle(preview: { key: DeviceMode; width: number; scale: number }): Record<string, string> {
    const scale = this.responsivePreviewScale(preview.key);
    return {
      width: `${preview.width * scale}px`,
      height: `${(this.responsivePreviewMeasuredHeight[preview.key] || this.responsivePreviewContentHeight()) * scale}px`
    };
  }

  toggleDeviceAlerts(device: DeviceMode): void {
    this.openAlertsDevice = this.openAlertsDevice === device ? null : device;
  }

  openResponsiveAlertsModal(device: 'all' | DeviceMode = 'all'): void {
    this.selectedAlertsTab = device;
    this.showResponsiveAlertsModal = true;
  }

  closeResponsiveAlertsModal(): void {
    this.showResponsiveAlertsModal = false;
  }

  deviceAlerts(device: DeviceMode): Array<{ id: string; severity: AuditSeverity; title: string; detail: string; device: DeviceMode; sectionId?: string; layerId?: string }> {
    const list: Array<{ id: string; severity: AuditSeverity; title: string; detail: string; device: DeviceMode; sectionId?: string; layerId?: string }> = [];

    for (const issue of this.publishAuditIssues) {
      if (issue.device === device) {
        list.push({
          id: issue.id,
          severity: issue.severity,
          title: issue.title,
          detail: issue.detail,
          device,
          sectionId: issue.sectionId,
          layerId: issue.layerId
        });
      }
    }

    (this.responsivePreviewRuntimeIssues[device] || []).forEach((runtimeTitle, index) => {
      list.push({
        id: `runtime-${device}-${index}`,
        severity: runtimeTitle.toLowerCase().includes('desbord') ? 'critical' : 'warning',
        title: runtimeTitle,
        detail: `Detectado durante el renderizado del lienzo en ${this.deviceLabel(device)}.`,
        device
      });
    });

    return list;
  }

  get totalResponsiveAlertsCount(): number {
    return this.deviceAlerts('mobile').length + this.deviceAlerts('tablet').length + this.deviceAlerts('desktop').length;
  }

  get filteredResponsiveAlerts(): Array<{ id: string; severity: AuditSeverity; title: string; detail: string; device: DeviceMode; sectionId?: string; layerId?: string }> {
    if (this.selectedAlertsTab === 'all') {
      return [
        ...this.deviceAlerts('mobile'),
        ...this.deviceAlerts('tablet'),
        ...this.deviceAlerts('desktop')
      ];
    }
    return this.deviceAlerts(this.selectedAlertsTab);
  }

  goToResponsiveAlert(alert: { device: DeviceMode; sectionId?: string; layerId?: string }): void {
    this.closeResponsivePreview();
    this.showResponsiveAlertsModal = false;
    this.device = alert.device;
    if (alert.sectionId) this.selectedSectionId = alert.sectionId;
    if (alert.layerId) this.setLayerSelection([alert.layerId]); else this.clearLayerSelection();
    this.inspectorView = 'properties';
    setTimeout(() => {
      const selector = alert.layerId ? `[data-layer-id="${alert.layerId}"]` : (alert.sectionId ? `[data-section-id="${alert.sectionId}"]` : null);
      if (selector) document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }

  responsivePreviewLayerStyle(layer: VisualInvitationLayer, device: DeviceMode): Record<string, string> {
    const style = layer.style || {};
    const shape = layer.type === 'shape';
    const maskedImage = layer.type === 'image' && !!style.imageMask && style.imageMask !== 'none';
    const responsiveScale = this.sharedStyleScale(device);
    const layout = this.design.responsiveMode === 'independent' ? (layer.layouts?.[device] || layer) : layer;
    return {
      left: `${layout.x}%`, top: `${layout.y}%`, width: `${layout.width}%`, height: `${layout.height}%`,
      transform: `rotate(${layout.rotation || 0}deg)`, zIndex: String(layer.zIndex || 1),
      color: String(style.color || '#2d2927'), backgroundColor: shape || maskedImage ? 'transparent' : String(style.backgroundColor || 'transparent'),
      fontFamily: String(style.fontFamily || 'Arial, sans-serif'), fontSize: `${this.scaledLayerPixels(style.fontSize || 30, responsiveScale, 10)}px`,
      fontWeight: String(style.fontWeight || 400), fontStyle: String(style.fontStyle || 'normal'), textAlign: String(style.textAlign || 'center'),
      lineHeight: String(style.lineHeight || 1.2), letterSpacing: `${this.scaledLayerPixels(style.letterSpacing || 0, responsiveScale)}px`, textTransform: String(style.textTransform || 'none'),
      textDecoration: String(style.textDecoration || 'none'), textShadow: String(style.textShadow || 'none'),
      borderRadius: shape ? '0' : `${this.scaledLayerPixels(style.borderRadius || 0, responsiveScale)}px`, borderColor: shape ? 'transparent' : String(style.borderColor || 'transparent'),
      borderStyle: !shape && !maskedImage && Number(style.borderWidth || 0) > 0 ? String(style.borderStyle || 'solid') : 'none', borderWidth: shape || maskedImage ? '0' : `${this.scaledLayerPixels(style.borderWidth || 0, responsiveScale)}px`,
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
    this.loadAuditAcknowledgements();
    this.showAcknowledgedAuditIssues = false;
    this.showPublishAudit = true;
  }

  acknowledgeAuditIssue(issue: PublishAuditIssue): void {
    if (issue.severity === 'critical') return;
    this.acknowledgedAuditIssueKeys.add(this.auditIssueKey(issue));
    this.saveAuditAcknowledgements();
  }

  restoreAuditIssue(issue: PublishAuditIssue): void {
    this.acknowledgedAuditIssueKeys.delete(this.auditIssueKey(issue));
    this.saveAuditAcknowledgements();
  }

  private auditIssueKey(issue: PublishAuditIssue): string {
    return JSON.stringify([issue.severity, issue.title, issue.detail, issue.sectionId, issue.layerId, issue.device]);
  }

  private auditAcknowledgementStorageKey(): string {
    return `visual-editor-audit:${this.invitation?._id || this.invitation?.id || ''}`;
  }

  private auditDesignFingerprint(): string {
    const snapshot = this.designSnapshot();
    let hash = 2166136261;
    for (let index = 0; index < snapshot.length; index++) {
      hash ^= snapshot.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  private loadAuditAcknowledgements(): void {
    this.acknowledgedAuditIssueKeys.clear();
    try {
      const stored = JSON.parse(localStorage.getItem(this.auditAcknowledgementStorageKey()) || 'null');
      if (stored?.fingerprint === this.auditDesignFingerprint() && Array.isArray(stored.keys)) {
        this.acknowledgedAuditIssueKeys = new Set(stored.keys.filter((key: unknown): key is string => typeof key === 'string'));
      }
    } catch {
      // Browser storage is optional; acknowledgements still work for this session.
    }
  }

  private saveAuditAcknowledgements(): void {
    try {
      localStorage.setItem(this.auditAcknowledgementStorageKey(), JSON.stringify({
        fingerprint: this.auditDesignFingerprint(), keys: [...this.acknowledgedAuditIssueKeys]
      }));
    } catch {
      // Browser storage is optional; acknowledgements still work for this session.
    }
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

  setPresentationMode(mode: 'continuous' | 'chapters'): void {
    if (this.design.presentationMode === mode) return;
    this.recordHistory();
    this.design.presentationMode = mode;
    this.autosaveState = 'Cambios pendientes';
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
    this.selectedPluginPartKey = '';
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
    const binding = String(layer.binding || '');
    if (this.selectedSection.type === 'guestPass') {
      const isFormLayer = ['pass.email', 'pass.phone', 'pass.identify', 'pass.feedback'].includes(binding) || binding.startsWith('display.label.pass.');
      const currentMode = this.pluginSetting(this.selectedSection, 'editorViewMode') || 'pass';
      if (isFormLayer && currentMode !== 'form') {
        this.setPluginSetting(this.selectedSection, 'editorViewMode', 'form');
      } else if (!isFormLayer && currentMode === 'form') {
        this.setPluginSetting(this.selectedSection, 'editorViewMode', 'pass');
      }
    } else if (this.selectedSection.type === 'guestActivity') {
      const isFormLayer = ['activity.email', 'activity.phone', 'activity.identify'].includes(binding) || binding.startsWith('display.label.activity.');
      const currentMode = this.pluginSetting(this.selectedSection, 'editorViewMode') || 'activity';
      if (isFormLayer && currentMode !== 'form') {
        this.setPluginSetting(this.selectedSection, 'editorViewMode', 'form');
      } else if (!isFormLayer && currentMode === 'form') {
        this.setPluginSetting(this.selectedSection, 'editorViewMode', 'activity');
      }
    }
    this.applyLayerSelection(this.selectedSection, layer, event.shiftKey);
    this.inspectorView = 'properties';
  }

  addSection(type: string, title: string): void {
    this.recordHistory();
    const section = this.makeSection(type, title, this.design.theme?.backgroundColor || '#ffffff', type === 'rsvp' ? 820 : ['dedications', 'songs', 'album', 'guestPass', 'guestActivity', 'countdown'].includes(type) ? 760 : 540);
    if (type !== 'custom' && !this.isFunctionalType(type)) section.layers.push(this.newLayer('text', title, 15, 12, 70, 18));
    if (type === 'rsvp') { this.ensureRsvpPluginDesign(section); this.ensureRsvpCanvasLayers(section); this.ensureSeparatedRsvpFieldParts(section); }
    if (type === 'dedications') this.ensureDedicationCanvasLayers(section);
    if (type === 'songs') this.ensureSongCanvasLayers(section);
    if (type === 'album') this.ensureAlbumCanvasLayers(section);
    if (type === 'guestPass') this.ensureGuestPassCanvasLayers(section);
    if (type === 'guestActivity') this.ensureGuestActivityCanvasLayers(section);
    if (type === 'countdown') this.ensureCountdownCanvasLayers(section);
    if (type === 'locations') this.ensureLocationCanvasLayers(section);
    if (type === 'gifts') this.ensureGiftCanvasLayers(section);
    if (type === 'itinerary') this.ensureItineraryCanvasLayers(section);
    if (type === 'dressCode') this.ensureDressCodeCanvasLayers(section);
    if (type === 'lodging') this.ensureLodgingCanvasLayers(section);
    if (type === 'gallery') this.ensureGalleryCanvasLayers(section);
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
    if (type === 'audio') {
      layer.x = 82;
      layer.y = 80;
      layer.width = 12;
      layer.height = 12;
      layer.style = {
        ...(layer.style || {}),
        audioPresentation: 'button', audioPosition: 'fixed', audioCorner: 'bottom-right',
        audioShape: 'circle', audioVariant: 'solid', audioIcon: 'play',
        audioShowIcon: true, audioShowLabel: false, audioAutoplay: false, audioLoop: true,
        audioVolume: .8, audioSize: 64, audioOffset: 20
      };
      this.setAudioShape(layer, 'circle', false);
      this.setAudioVariant(layer, 'solid', false);
    }
    section.layers.push(layer);
    this.setLayerSelection([layer.id]);
  }

  addMainMusicControl(): void {
    const url = this.invitation?.content?.musicUrl;
    if (!url) { this.error = 'Primero configura la música principal de la invitación.'; return; }
    this.addLayer('audio');
    const layer = this.selectedLayer;
    if (!layer) return;
    const settings = this.invitation?.content?.musicSettings || {};
    layer.url = url;
    layer.name = 'Música principal';
    layer.binding = 'music.toggle';
    layer.style = {
      ...(layer.style || {}),
      audioStartSeconds: Number(settings.startSeconds || 0),
      audioEndSeconds: settings.endSeconds,
      audioVolume: Number(settings.volume ?? .7),
      audioLoop: settings.loop !== false,
      audioAutoplay: settings.playbackMode !== 'manual'
    };
    this.adaptAudioLayerToProvider(layer);
    this.flash('Música principal agregada al diseño.');
  }

  get selectedSectionMusic(): { key: string; url: string; label: string } | null {
    const section = this.selectedSection;
    const configured = this.invitation?.content?.sectionMusic as any;
    if (!section || !configured) return null;
    const candidates: Record<string, string[]> = {
      story: ['story'], locations: ['locations'], itinerary: ['itinerary'], dressCode: ['dressCode'],
      rsvp: ['rsvp'], gifts: ['giftRegistry', 'digitalEnvelope'], lodging: ['lodging'], gallery: ['gallery'],
      album: ['guestAlbum'], dedications: ['dedications'], songs: ['songRequests']
    };
    for (const key of candidates[section.type] || [section.type]) {
      const value = typeof configured.get === 'function' ? configured.get(key) : configured[key];
      if (typeof value === 'string' && value.trim()) return { key, url: value.trim(), label: section.title || section.type };
    }
    return null;
  }

  addSelectedSectionMusicControl(): void {
    const configured = this.selectedSectionMusic;
    if (!configured) { this.error = 'Esta sección no tiene audio configurado en Música de Fondo.'; return; }
    this.addLayer('audio');
    const layer = this.selectedLayer;
    if (!layer) return;
    const defaults = this.invitation?.content?.musicSettings || {};
    const cue = this.invitation?.content?.sectionMusicCues?.[configured.key] || {};
    layer.url = configured.url;
    layer.name = `Música: ${configured.label}`;
    layer.binding = `music.section.${configured.key}`;
    layer.style = {
      ...(layer.style || {}),
      audioStartSeconds: Number(cue.startSeconds ?? defaults.startSeconds ?? 0),
      audioEndSeconds: cue.endSeconds ?? defaults.endSeconds,
      audioVolume: Number(cue.volume ?? defaults.volume ?? .7),
      audioLoop: cue.loop ?? defaults.loop ?? true,
      audioAutoplay: false
    };
    this.adaptAudioLayerToProvider(layer);
    this.flash(`Control de audio agregado a ${configured.label}.`);
  }

  onMediaUrlChange(layer: VisualInvitationLayer, value: string): void {
    layer.url = value;
    if (layer.type === 'audio') this.adaptAudioLayerToProvider(layer);
  }

  private adaptAudioLayerToProvider(layer: VisualInvitationLayer): void {
    const provider = resolveVisualMediaSource(layer.url).provider;
    layer.style = layer.style || {};
    if (provider === 'youtube' || provider === 'spotify') {
      layer.style.audioPresentation = 'button';
      layer.style.audioPosition = 'fixed';
    } else if (provider === 'vimeo') {
      layer.style.audioPresentation = 'native';
      layer.style.audioPosition = 'inline';
      const layout = this.layoutFor(layer);
      layout.width = Math.max(layout.width, 58);
      layout.height = Math.max(layout.height, 30);
      layout.x = this.bound(layout.x, 0, 100 - layout.width);
      layout.y = this.bound(layout.y, 0, 100 - layout.height);
    }
  }

  addFrame(mask: ImageMask): void {
    const section = this.selectedSection;
    if (!section) return;
    this.recordHistory();
    const layer = this.newLayer('image', '', 24, 26, 52, 26);
    layer.name = `Marco ${this.imageMasks.find((item) => item.key === mask)?.label || 'de foto'}`;
    layer.zIndex = Math.max(0, ...section.layers.map((item) => item.zIndex || 0)) + 1;
    layer.style = {
      ...layer.style, imageMask: mask, frameEnabled: true, objectFit: 'cover', preserveAspectRatio: false,
      borderWidth: 5, borderStyle: 'solid', borderColor: this.design.theme?.accentColor || '#9d765d',
      backgroundColor: '#e9e3dc', objectPositionX: 50, objectPositionY: 50
    };
    section.layers.push(layer);
    this.setLayerSelection([layer.id]);
    this.inspectorView = 'properties';
  }

  addPhotoComposition(key: string): void {
    const section = this.selectedSection;
    const preset = this.photoCompositionPresets.find((item) => item.key === key);
    if (!section || !preset) return;
    this.recordHistory();
    this.design.responsiveMode = 'independent';
    const layouts = photoCompositionLayouts(preset, visualSectionHeight(section));
    const groupId = this.uid('group');
    const topZ = Math.max(0, ...section.layers.map((layer) => layer.zIndex || 0));
    const layers = preset.slots.map((slot, index) => {
      const mobile = layouts.mobile[index];
      const layer = this.newLayer('image', '', mobile.x, mobile.y, mobile.width, mobile.height);
      layer.name = `Foto ${index + 1}`;
      layer.groupId = groupId;
      layer.zIndex = topZ + index + 1;
      layer.layouts = {
        mobile: { ...mobile }, tablet: { ...layouts.tablet[index] }, desktop: { ...layouts.desktop[index] }
      };
      layer.style = {
        ...layer.style, frameEnabled: true, imageMask: slot.mask, objectFit: 'cover', preserveAspectRatio: false,
        borderWidth: 3, borderStyle: 'solid', borderColor: this.design.theme?.accentColor || '#9d765d',
        backgroundColor: '#e9e3dc', objectPositionX: 50, objectPositionY: 50
      };
      return layer;
    });
    section.layers.push(...layers);
    this.setLayerSelection(layers.map((layer) => layer.id));
    this.inspectorView = 'properties';
    this.autosaveState = 'Cambios pendientes';
    this.flash(`${preset.name} agregado. Selecciona una foto en Propiedades para editarla.`);
  }

  applyPhotoCompositionPreset(key: string): void {
    const section = this.selectedSection;
    const frames = this.selectedCompositeFrames;
    const preset = this.photoCompositionPresets.find((item) => item.key === key);
    if (!section || !preset || !this.canReflowSelectedComposition || preset.slots.length !== frames.length) return;
    const devices = ['mobile', 'tablet', 'desktop'] as const;
    const current = {} as Record<typeof devices[number], VisualInvitationLayerLayout[]>;
    for (const device of devices) {
      current[device] = frames.map((frame) => ({
        ...(this.design.responsiveMode === 'independent' && frame.layouts?.[device]
          ? frame.layouts[device]!
          : { x: frame.x, y: frame.y, width: frame.width, height: frame.height, rotation: frame.rotation || 0 })
      }));
    }
    const layouts = reflowPhotoCompositionLayouts(preset, visualSectionHeight(section), current);
    this.recordHistory();
    this.design.responsiveMode = 'independent';
    frames.forEach((frame, index) => {
      frame.layouts = {
        mobile: layouts.mobile[index], tablet: layouts.tablet[index], desktop: layouts.desktop[index]
      };
      Object.assign(frame, layouts.mobile[index]);
    });
    this.autosaveState = 'Cambios pendientes';
    this.flash(`Distribución ${preset.name} aplicada.`);
  }

  setPhotoCompositionSpacing(value: number): void {
    const section = this.selectedSection;
    const frames = this.selectedCompositeFrames;
    if (!section || !this.canReflowSelectedComposition) return;
    const desired = this.bound(Number(value), 0, 40);
    const height = visualSectionHeight(section);
    const current = frames.map((frame) => ({ ...this.layoutFor(frame) }));
    if (Math.abs(photoCompositionSpacing(current, this.artboardWidth, height) - desired) < .5) return;
    const adjusted = withPhotoCompositionSpacing(current, this.artboardWidth, height, desired);
    if (adjusted.every((layout, index) => layout.width === current[index].width && layout.height === current[index].height)) return;
    const editKey = `${frames[0].groupId}:${this.device}`;
    if (this.photoSpacingEditKey !== editKey) {
      this.recordHistory();
      this.photoSpacingEditKey = editKey;
    }
    frames.forEach((frame, index) => Object.assign(
      this.design.responsiveMode === 'independent' ? this.editableLayout(frame) : frame,
      adjusted[index]
    ));
    this.autosaveState = 'Cambios pendientes';
  }

  finishPhotoCompositionSpacing(): void {
    this.photoSpacingEditKey = '';
  }

  selectCompositeFrame(layer: VisualInvitationLayer): void {
    this.setLayerSelection([layer.id]);
    this.inspectorView = 'properties';
  }

  selectCompositeGroup(layer: VisualInvitationLayer): void {
    const section = this.selectedSection;
    if (!section || !layer.groupId) return;
    this.setLayerSelection(section.layers.filter((item) => item.groupId === layer.groupId).map((item) => item.id), layer.id);
    this.inspectorView = 'properties';
  }

  beginPhotoSwapDrag(event: DragEvent, frame: VisualInvitationLayer): void {
    if (!frame.groupId || frame.locked || frame.binding || !frame.style?.frameEnabled) {
      event.preventDefault();
      return;
    }
    this.photoSwapSourceId = frame.id;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', 'kyndra-photo-swap');
    }
  }

  dragPhotoSwapOver(event: DragEvent, target: VisualInvitationLayer): void {
    if (this.photoSwapSourceId) {
      event.preventDefault();
      event.stopPropagation();
      this.photoSwapTargetId = this.canSwapCompositePhotos(target) ? target.id : '';
      if (event.dataTransfer) event.dataTransfer.dropEffect = this.photoSwapTargetId ? 'move' : 'none';
      return;
    }
    const isFileDrag = this.hasDataTransferFiles(event.dataTransfer);
    const isMediaDrag = this.paletteDragItem?.kind === 'media' && this.paletteDragItem.media.type === 'image';
    if (isFileDrag || isMediaDrag) {
      event.preventDefault();
      event.stopPropagation();
      this.photoSwapTargetId = target.id;
      this.fileDropTargetLayerId = target.id;
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    }
  }

  leavePhotoSwapTarget(target: VisualInvitationLayer): void {
    if (this.photoSwapTargetId === target.id) this.photoSwapTargetId = '';
    if (this.fileDropTargetLayerId === target.id) this.fileDropTargetLayerId = '';
  }

  dropPhotoSwap(event: DragEvent, target: VisualInvitationLayer): void {
    if (this.photoSwapSourceId) {
      event.preventDefault();
      event.stopPropagation();
      const source = this.canSwapCompositePhotos(target)
        ? this.selectedSection?.layers.find((layer) => layer.id === this.photoSwapSourceId)
        : undefined;
      if (source) this.swapCompositePhotos(source, target);
      this.endPhotoSwapDrag();
      return;
    }
    const files = Array.from(event.dataTransfer?.files || []).filter((f) => {
      const info = this.resolveFileType(f);
      return ['image', 'video', 'audio'].includes(info.kind);
    });
    if (files.length && this.selectedSection) {
      this.endPhotoSwapDrag();
      this.handleDroppedFiles(files, this.selectedSection, event, target.id);
      return;
    }
    if (this.paletteDragItem?.kind === 'media' && this.paletteDragItem.media.type === 'image') {
      event.preventDefault();
      event.stopPropagation();
      this.recordHistory();
      target.url = this.paletteDragItem.media.url;
      this.setLayerSelection([target.id]);
      this.inspectorView = 'properties';
      this.endPhotoSwapDrag();
      this.endPaletteDrag();
      this.flash('Foto colocada en el marco.');
      return;
    }
    const externalImageUrl = this.extractImageUrlFromDataTransfer(event.dataTransfer);
    if (externalImageUrl && this.selectedSection) {
      this.endPhotoSwapDrag();
      this.handleDroppedImageUrl(externalImageUrl, this.selectedSection, event, target.id);
      return;
    }
  }

  endPhotoSwapDrag(): void {
    this.photoSwapSourceId = '';
    this.photoSwapTargetId = '';
    this.fileDropTargetLayerId = '';
  }

  swapCompositePhotos(source: VisualInvitationLayer, target: VisualInvitationLayer): void {
    if (!source.groupId || source.groupId !== target.groupId || source.id === target.id ||
        source.type !== 'image' || target.type !== 'image' ||
        !source.style?.frameEnabled || !target.style?.frameEnabled ||
        source.locked || target.locked || source.binding || target.binding ||
        !this.selectedSection?.layers.includes(source) || !this.selectedSection?.layers.includes(target)) return;
    this.recordHistory();
    const sourceUrl = source.url;
    source.url = target.url;
    target.url = sourceUrl;
    const photoStyleKeys: Array<keyof VisualInvitationLayerStyle> = [
      'objectFit', 'preserveAspectRatio', 'objectPositionX', 'objectPositionY', 'imageScale',
      'brightness', 'contrast', 'saturation', 'blur'
    ];
    const sourceStyle = { ...source.style } as Record<string, unknown>;
    const targetStyle = { ...target.style } as Record<string, unknown>;
    for (const key of photoStyleKeys) {
      const sourceValue = sourceStyle[key];
      const targetValue = targetStyle[key];
      if (targetValue === undefined) delete sourceStyle[key]; else sourceStyle[key] = targetValue;
      if (sourceValue === undefined) delete targetStyle[key]; else targetStyle[key] = sourceValue;
    }
    source.style = sourceStyle as VisualInvitationLayerStyle;
    target.style = targetStyle as VisualInvitationLayerStyle;
    this.autosaveState = 'Cambios pendientes';
    this.flash('Fotos intercambiadas.');
  }

  private canSwapCompositePhotos(target: VisualInvitationLayer): boolean {
    const source = this.selectedSection?.layers.find((layer) => layer.id === this.photoSwapSourceId);
    return Boolean(source && source.id !== target.id && source.groupId && source.groupId === target.groupId &&
      source.type === 'image' && target.type === 'image' && source.style?.frameEnabled && target.style?.frameEnabled &&
      !source.locked && !target.locked && !source.binding && !target.binding);
  }

  get filteredIconCatalog(): VisualIconOption[] {
    const query = this.iconSearch.trim().toLocaleLowerCase('es');
    return this.iconCatalog.filter((icon) => {
      const categoryMatches = this.iconCategory === 'all' || icon.category === this.iconCategory;
      const haystack = `${icon.label} ${icon.name} ${icon.keywords}`.toLocaleLowerCase('es');
      return categoryMatches && (!query || haystack.includes(query));
    });
  }

  isIconLayer(layer: VisualInvitationLayer): boolean {
    return layer.type === 'text' && Boolean(layer.style?.iconName);
  }

  addIcon(icon: VisualIconOption): void {
    const section = this.selectedSection;
    if (!section) return;
    this.recordHistory();
    const layer = this.newLayer('text', icon.label, 44, 32, 12, 12);
    layer.name = `Icono: ${icon.label}`;
    layer.zIndex = Math.max(0, ...section.layers.map((item) => item.zIndex || 0)) + 1;
    this.applyThemeToLayer(layer, this.design.theme || this.themePresets[0].theme);
    layer.style = { ...(layer.style || {}), iconName: icon.name, iconStrokeWidth: 2, iconFilled: false, padding: 0, backgroundColor: 'transparent' };
    section.layers.push(layer);
    this.setLayerSelection([layer.id]);
    this.inspectorView = 'properties';
  }

  setLayerIcon(layer: VisualInvitationLayer, icon: VisualIconOption): void {
    this.recordHistory();
    layer.style = { ...(layer.style || {}), iconName: icon.name, iconStrokeWidth: layer.style?.iconStrokeWidth || 2 };
    layer.name = `Icono: ${icon.label}`;
    layer.text = icon.label;
  }

  isMediaPreviewActive(layer: VisualInvitationLayer): boolean {
    return this.previewingMediaLayerId === layer.id;
  }

  toggleMediaPreview(layer: VisualInvitationLayer, event: Event): void {
    event.stopPropagation();
    this.previewingMediaLayerId = this.previewingMediaLayerId === layer.id ? '' : layer.id;
  }

  mediaProviderLabel(url?: string): string {
    const provider = resolveVisualMediaSource(url).provider;
    return provider === 'youtube' ? 'YouTube detectado'
      : provider === 'spotify' ? 'Spotify detectado'
        : provider === 'vimeo' ? 'Vimeo detectado'
          : 'Archivo multimedia directo';
  }

  mediaProviderHelp(layer: VisualInvitationLayer): string {
    const provider = resolveVisualMediaSource(layer.url).provider;
    if (provider === 'youtube') return layer.type === 'audio'
      ? 'El botón abre el reproductor oficial visible y respeta el fragmento configurado. Para reproducir sin mostrar proveedor, sube un MP3, WAV o M4A propio.'
      : 'El enlace se convertirá automáticamente al reproductor embebido de YouTube.';
    if (provider === 'spotify') return layer.type === 'audio' ? 'El botón abre el reproductor oficial de Spotify; la reproducción requiere interacción del invitado.' : 'Se mostrará el reproductor oficial de Spotify.';
    if (provider === 'vimeo') return 'El enlace se convertirá automáticamente al reproductor embebido de Vimeo.';
    return layer.type === 'video'
      ? 'Se usará el reproductor nativo. La URL debe entregar directamente un MP4 o WebM compatible.'
      : 'Se usará el reproductor nativo o el botón personalizado. La URL debe entregar directamente un MP3, WAV, OGG o M4A compatible.';
  }

  canUseCustomAudio(layer: VisualInvitationLayer): boolean {
    const provider = resolveVisualMediaSource(layer.url).provider;
    return ['direct', 'empty', 'youtube', 'spotify'].includes(provider);
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
      button.binding = 'section:rsvp';
      button.style = { ...button.style, color: '#ffffff', backgroundColor: '#262321', borderRadius: 4, fontWeight: 700 };
      layers = [button];
    } else if (key === 'smartGreeting') {
      const greeting = this.newLayer('text', 'Hola, {{guest.name}}', 10, 30, 80, 15, 34);
      greeting.name = 'Saludo personalizado';
      layers = [greeting];
    } else if (key === 'smartPass') {
      const table = this.newLayer('text', '{{guest.table}} · Lugar {{guest.seat}}', 13, 35, 74, 10, 20);
      const companions = this.newLayer('text', 'Pase para {{guest.companions}} acompañante(s)', 18, 49, 64, 8, 14);
      table.name = 'Mesa y lugar';
      companions.name = 'Acompañantes permitidos';
      layers = [table, companions];
    } else if (key === 'smartEvent') {
      const date = this.newLayer('text', '{{event.date}} · {{event.time}}', 12, 31, 76, 10, 22);
      const venue = this.newLayer('text', '{{event.venue}}\n{{event.address}}', 15, 45, 70, 16, 16);
      date.name = 'Fecha y hora del evento';
      venue.name = 'Lugar del evento';
      layers = [date, venue];
    } else if (key === 'smartRsvp' || key === 'smartMap' || key === 'smartCalendar') {
      const definitions: Record<string, { text: string; name: string; binding: string }> = {
        smartRsvp: { text: 'Confirmar asistencia', name: 'Botón RSVP', binding: 'section:rsvp' },
        smartMap: { text: 'Cómo llegar', name: 'Botón de ubicación', binding: 'map' },
        smartCalendar: { text: 'Agregar al calendario', name: 'Botón de calendario', binding: 'calendar' }
      };
      const definition = definitions[key];
      const button = this.newLayer('button', definition.text, 24, 40, 52, 12, 16);
      button.name = definition.name;
      button.binding = definition.binding;
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

  resolveLayerText(layer: VisualInvitationLayer): string {
    return resolveVisualTemplateText(layer.text, visualTemplateContext(this.invitation, this.event, undefined, true));
  }

  insertDynamicVariable(layer: VisualInvitationLayer, token: string): void {
    if (!['text', 'button'].includes(layer.type)) return;
    this.recordHistory();
    const value = `{{${token}}}`;
    const current = String(layer.text || '');
    layer.text = current ? `${current}${/\s$/.test(current) ? '' : ' '}${value}` : value;
    this.autosaveState = 'Cambios pendientes';
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

  isExternalFileDrag(event: DragEvent): boolean {
    const dt = event.dataTransfer;
    if (!dt) return false;
    const types = Array.from(dt.types || []);
    return types.includes('Files');
  }

  hasDataTransferFiles(dt: DataTransfer | null): boolean {
    if (!dt) return false;
    const types = Array.from(dt.types || []);
    return types.includes('Files') || (dt.files && dt.files.length > 0);
  }

  hasExternalImageDrag(dt: DataTransfer | null): boolean {
    if (!dt) return false;
    const types = Array.from(dt.types || []);
    return types.includes('text/uri-list') || types.includes('text/html') || types.includes('text/plain');
  }

  extractImageUrlFromDataTransfer(dt: DataTransfer | null): string | null {
    if (!dt) return null;
    const uriList = dt.getData('text/uri-list');
    if (uriList && /^https?:\/\/.+\.(jpe?g|png|webp|gif|svg|avif)(\?.*)?$/i.test(uriList.trim())) {
      return uriList.trim();
    }
    const url = dt.getData('URL');
    if (url && /^https?:\/\/.+\.(jpe?g|png|webp|gif|svg|avif)(\?.*)?$/i.test(url.trim())) {
      return url.trim();
    }
    const plain = dt.getData('text/plain');
    if (plain && /^https?:\/\/.+\.(jpe?g|png|webp|gif|svg|avif)(\?.*)?$/i.test(plain.trim())) {
      return plain.trim();
    }
    const html = dt.getData('text/html');
    if (html) {
      const match = /<img[^>]+src=["'](https?:\/\/[^"']+)["']/i.exec(html);
      if (match) return match[1];
    }
    return null;
  }

  resolveFileType(file: File): { mimeType: string; kind: 'image' | 'video' | 'audio' } {
    if (file.type?.startsWith('video/')) return { mimeType: file.type, kind: 'video' };
    if (file.type?.startsWith('audio/')) return { mimeType: file.type, kind: 'audio' };
    if (file.type?.startsWith('image/')) return { mimeType: file.type, kind: 'image' };
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'png') return { mimeType: 'image/png', kind: 'image' };
    if (ext === 'jpg' || ext === 'jpeg') return { mimeType: 'image/jpeg', kind: 'image' };
    if (ext === 'webp') return { mimeType: 'image/webp', kind: 'image' };
    if (ext === 'gif') return { mimeType: 'image/gif', kind: 'image' };
    if (ext === 'svg') return { mimeType: 'image/svg+xml', kind: 'image' };
    if (ext === 'avif') return { mimeType: 'image/avif', kind: 'image' };
    if (ext === 'mp4') return { mimeType: 'video/mp4', kind: 'video' };
    if (ext === 'webm') return { mimeType: 'video/webm', kind: 'video' };
    if (ext === 'mp3') return { mimeType: 'audio/mpeg', kind: 'audio' };
    if (ext === 'wav') return { mimeType: 'audio/wav', kind: 'audio' };
    if (ext === 'ogg') return { mimeType: 'audio/ogg', kind: 'audio' };
    return { mimeType: file.type || 'image/jpeg', kind: 'image' };
  }

  findImageLayerAtPoint(section: VisualInvitationSection, clientX: number, clientY: number, targetEl?: HTMLElement | null): VisualInvitationLayer | undefined {
    const layerEl = targetEl?.closest<HTMLElement>('.canvas-layer');
    if (layerEl?.dataset['layerId']) {
      const match = section.layers.find((l) => l.id === layerEl.dataset['layerId']);
      if (match && match.type === 'image') return match;
    }
    if (typeof document !== 'undefined' && typeof document.elementFromPoint === 'function') {
      const elAtPoint = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>('.canvas-layer');
      if (elAtPoint?.dataset['layerId']) {
        const match = section.layers.find((l) => l.id === elAtPoint.dataset['layerId']);
        if (match && match.type === 'image') return match;
      }
    }
    if (typeof document !== 'undefined') {
      const surfaceEl = document.querySelector('.layer-surface');
      if (surfaceEl) {
        const rect = surfaceEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const px = (clientX - rect.left) / rect.width * 100;
          const py = (clientY - rect.top) / rect.height * 100;
          const candidates = section.layers.filter((l) => l.type === 'image' && !l.hidden);
          for (let i = candidates.length - 1; i >= 0; i--) {
            const l = candidates[i];
            if (px >= l.x && px <= (l.x + l.width) && py >= l.y && py <= (l.y + l.height)) {
              return l;
            }
          }
        }
      }
    }
    return undefined;
  }

  dragLayerTargetEnter(event: DragEvent, section: VisualInvitationSection, layer: VisualInvitationLayer): void {
    if (this.photoSwapSourceId) {
      this.dragPaletteOver(event, section);
      return;
    }
    const isFileDrag = this.hasDataTransferFiles(event.dataTransfer);
    const isPaletteDrag = !!this.paletteDragItem;
    const isExternalImage = !isPaletteDrag && this.hasExternalImageDrag(event.dataTransfer);
    if (!isPaletteDrag && !isFileDrag && !isExternalImage) return;

    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';

    if (layer.type === 'image') {
      if (this.fileDropTargetLayerId !== layer.id) {
        this.fileDropTargetLayerId = layer.id;
        this.paletteDropSectionId = '';
      }
    } else {
      if (this.fileDropTargetLayerId !== '') {
        this.fileDropTargetLayerId = '';
      }
    }
  }

  dragLayerTargetOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  dragLayerTargetLeave(event: DragEvent, layer: VisualInvitationLayer): void {
    const target = event.currentTarget as HTMLElement;
    if (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) return;
    if (this.fileDropTargetLayerId === layer.id) {
      this.fileDropTargetLayerId = '';
    }
  }

  dragPaletteOver(event: DragEvent, section: VisualInvitationSection): void {
    if (this.photoSwapSourceId) {
      event.preventDefault();
      event.stopPropagation();
      const targetId = (event.target as HTMLElement).closest<HTMLElement>('.canvas-layer')?.dataset['layerId'];
      const target = section.layers.find((layer) => layer.id === targetId);
      this.photoSwapTargetId = target && this.selectedSectionId === section.id && this.canSwapCompositePhotos(target) ? target.id : '';
      if (event.dataTransfer) event.dataTransfer.dropEffect = this.photoSwapTargetId ? 'move' : 'none';
      return;
    }

    const isFileDrag = this.hasDataTransferFiles(event.dataTransfer);
    const isPaletteDrag = !!this.paletteDragItem;
    const isExternalImage = !isPaletteDrag && this.hasExternalImageDrag(event.dataTransfer);

    if (!isPaletteDrag && !isFileDrag && !isExternalImage) return;

    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';

    const targetElement = (event.target as HTMLElement).closest<HTMLElement>('.canvas-layer');
    const targetId = targetElement?.dataset['layerId'];
    const targetLayer = section.layers.find((layer) => layer.id === targetId);

    if ((isFileDrag || isExternalImage || (isPaletteDrag && this.paletteDragItem?.kind === 'media' && this.paletteDragItem.media.type === 'image')) && targetLayer?.type === 'image') {
      if (this.fileDropTargetLayerId !== targetLayer.id) {
        this.fileDropTargetLayerId = targetLayer.id;
        this.paletteDropSectionId = '';
      }
    } else {
      if (this.fileDropTargetLayerId !== '') {
        this.fileDropTargetLayerId = '';
      }
      if (this.paletteDropSectionId !== section.id) {
        this.paletteDropSectionId = section.id;
      }
    }
  }

  leavePaletteTarget(event: DragEvent, section: VisualInvitationSection): void {
    const target = event.currentTarget as HTMLElement;
    if (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) return;
    if (this.paletteDropSectionId === section.id) this.paletteDropSectionId = '';
    this.fileDropTargetLayerId = '';
  }

  dropPaletteItem(event: DragEvent, section: VisualInvitationSection): void {
    if (this.photoSwapSourceId) {
      event.preventDefault();
      event.stopPropagation();
      const targetId = (event.target as HTMLElement).closest<HTMLElement>('.canvas-layer')?.dataset['layerId'];
      const target = section.layers.find((layer) => layer.id === targetId);
      if (target && this.selectedSectionId === section.id) this.dropPhotoSwap(event, target);
      this.endPhotoSwapDrag();
      return;
    }

    const files = Array.from(event.dataTransfer?.files || []).filter((f) => {
      const info = this.resolveFileType(f);
      return ['image', 'video', 'audio'].includes(info.kind);
    });

    if (files.length > 0) {
      this.handleDroppedFiles(files, section, event);
      return;
    }

    const externalImageUrl = this.extractImageUrlFromDataTransfer(event.dataTransfer);
    if (externalImageUrl) {
      this.handleDroppedImageUrl(externalImageUrl, section, event);
      return;
    }

    const item = this.paletteDragItem;
    if (!item) return;
    event.preventDefault();
    event.stopPropagation();
    const surface = event.currentTarget as HTMLElement;
    const rect = surface.getBoundingClientRect();
    const x = this.bound((event.clientX - rect.left) / rect.width * 100, 0, 100);
    const y = this.bound((event.clientY - rect.top) / rect.height * 100, 0, 100);
    this.selectedSectionId = section.id;

    const targetId = this.fileDropTargetLayerId || (event.target as HTMLElement).closest<HTMLElement>('.canvas-layer')?.dataset['layerId'];
    this.fileDropTargetLayerId = '';
    const imageTarget = section.layers.find((layer) => layer.id === targetId && layer.type === 'image');
    if (item.kind === 'media' && item.media.type === 'image' && imageTarget) {
      this.recordHistory();
      imageTarget.url = item.media.url;
      this.setLayerSelection([imageTarget.id]);
      this.inspectorView = 'properties';
      this.endPaletteDrag();
      this.flash('Foto colocada en el marco.');
      return;
    }

    if (item.kind === 'component') {
      this.addComponent(item.key);
      this.centerLayersAt(this.selectedLayers, x, y);
    } else if (item.kind === 'composition') {
      this.addPhotoComposition(item.key);
      this.centerLayersAt(this.selectedLayers, x, y);
    } else if (item.kind === 'rsvp-control') {
      this.addFunctionalControl(item.binding);
      this.centerLayersAt(this.selectedLayers, x, y);
    } else if (item.kind === 'frame') {
      this.addFrame(item.mask);
      this.centerLayersAt(this.selectedLayers, x, y);
    } else {
      this.recordHistory();
      const type = item.kind === 'media' ? item.media.type : item.kind === 'shape' ? 'shape' : item.kind === 'icon' ? 'text' : item.type;
      const text = type === 'text' ? 'Escribe aquí' : type === 'button' ? 'Ver detalles' : '';
      const shapeDimensions = item.kind === 'shape' ? this.shapeDimensions(item.shape) : undefined;
      const width = item.kind === 'icon' ? 12 : shapeDimensions?.width || (type === 'text' ? 60 : type === 'shape' ? 36 : 45);
      const height = item.kind === 'icon' ? 12 : shapeDimensions?.height || (type === 'text' ? 18 : type === 'button' ? 13 : type === 'shape' ? 22 : 30);
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
      if (item.kind === 'icon') {
        layer.name = `Icono: ${item.icon.label}`;
        layer.text = item.icon.label;
        layer.style = { ...(layer.style || {}), iconName: item.icon.name, iconStrokeWidth: 2, iconFilled: false, padding: 0, backgroundColor: 'transparent' };
      }
      section.layers.push(layer);
      this.setLayerSelection([layer.id]);
    }
    this.inspectorView = 'properties';
    this.endPaletteDrag();
    this.flash('Elemento agregado en el lienzo.');
  }

  handleDroppedImageUrl(url: string, section: VisualInvitationSection, event: DragEvent, targetLayerId?: string): void {
    event.preventDefault();
    event.stopPropagation();
    const droppedTargetId = targetLayerId || this.fileDropTargetLayerId || (event.target as HTMLElement).closest<HTMLElement>('.canvas-layer')?.dataset['layerId'];
    this.fileDropTargetLayerId = '';
    this.paletteDropSectionId = '';
    this.selectedSectionId = section.id;
    const targetLayer = section.layers.find((layer) => layer.id === droppedTargetId);
    this.recordHistory();
    if (targetLayer && targetLayer.type === 'image') {
      targetLayer.url = url;
      this.setLayerSelection([targetLayer.id]);
      this.inspectorView = 'properties';
      this.flash('Foto colocada en el marco.');
    } else {
      const surface = (event.currentTarget as HTMLElement) || (event.target as HTMLElement).closest<HTMLElement>('.layer-surface');
      let x = 20;
      let y = 20;
      if (surface) {
        const rect = surface.getBoundingClientRect();
        x = this.bound((event.clientX - rect.left) / rect.width * 100, 0, 100);
        y = this.bound((event.clientY - rect.top) / rect.height * 100, 0, 100);
      }
      const layer = this.newLayer('image', '', x, y, 45, 30);
      layer.url = url;
      layer.name = 'Imagen web';
      section.layers.push(layer);
      this.setLayerSelection([layer.id]);
      this.inspectorView = 'properties';
      this.flash('Foto agregada al lienzo.');
    }
    this.design.assets = this.design.assets || [];
    if (!this.design.assets.some((a) => a.url === url)) {
      this.design.assets.push({
        id: this.uid('asset'),
        url,
        type: 'image',
        name: 'Imagen web',
        createdAt: new Date().toISOString()
      });
    }
    this.autosaveState = 'Cambios pendientes';
  }

  handleDroppedFiles(files: File[], section: VisualInvitationSection, event: DragEvent, targetLayerId?: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.paletteDropSectionId = '';
    const droppedTargetId = targetLayerId || this.fileDropTargetLayerId || (event.target as HTMLElement).closest<HTMLElement>('.canvas-layer')?.dataset['layerId'];
    this.fileDropTargetLayerId = '';

    const validFiles = files.filter((f) => {
      const info = this.resolveFileType(f);
      return ['image', 'video', 'audio'].includes(info.kind);
    });

    if (!validFiles.length) {
      this.flash('Formato no compatible. Arrastra archivos de imagen, video o audio.');
      return;
    }

    const eventId = this.invitation && (typeof this.invitation.event === 'string'
      ? this.invitation.event
      : (this.invitation.event._id || this.invitation.event.id));

    if (!eventId) {
      this.error = 'No se encontró el evento para subir el archivo.';
      return;
    }

    const surface = (event.currentTarget as HTMLElement) || (event.target as HTMLElement).closest<HTMLElement>('.layer-surface');
    let x = 20;
    let y = 20;
    if (surface) {
      const rect = surface.getBoundingClientRect();
      x = this.bound((event.clientX - rect.left) / rect.width * 100, 0, 100);
      y = this.bound((event.clientY - rect.top) / rect.height * 100, 0, 100);
    }
    this.selectedSectionId = section.id;

    const targetLayer = section.layers.find((layer) => layer.id === droppedTargetId);

    // INSTANT OPTIMISTIC PREVIEW: Display local preview immediately in < 1ms
    const blobUrls: string[] = [];
    const makeBlob = (file: File): string => {
      try {
        if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
          const u = URL.createObjectURL(file);
          blobUrls.push(u);
          return u;
        }
      } catch {}
      return '';
    };

    this.recordHistory();
    const previousTargetUrl = targetLayer?.url || '';
    const siblingReverts: Array<{ frame: VisualInvitationLayer; url: string }> = [];

    if (targetLayer && targetLayer.type === 'image') {
      const localUrl = makeBlob(validFiles[0]);
      if (localUrl) targetLayer.url = localUrl;

      if (validFiles.length > 1 && targetLayer.groupId) {
        const groupFrames = section.layers.filter((l) => l.groupId === targetLayer.groupId && l.id !== targetLayer.id && l.type === 'image');
        const emptyFrames = groupFrames.filter((l) => !l.url);
        const filledFrames = groupFrames.filter((l) => !!l.url);
        const orderedSiblings = [...emptyFrames, ...filledFrames];

        for (let i = 1; i < validFiles.length; i++) {
          if (i - 1 < orderedSiblings.length) {
            const sibling = orderedSiblings[i - 1];
            siblingReverts.push({ frame: sibling, url: sibling.url || '' });
            const sLocalUrl = makeBlob(validFiles[i]);
            if (sLocalUrl) sibling.url = sLocalUrl;
          }
        }
      }

      if (validFiles.length > 1 && targetLayer.groupId) {
        const allGroupFrames = section.layers.filter((l) => l.groupId === targetLayer.groupId);
        this.setLayerSelection(allGroupFrames.map((l) => l.id));
      } else {
        this.setLayerSelection([targetLayer.id]);
      }
      this.inspectorView = 'properties';
    }

    this.uploading = true;
    this.error = '';

    const uploads = validFiles.map((file) => {
      const { mimeType, kind } = this.resolveFileType(file);
      const folder = kind === 'audio' ? 'music' : 'assets';
      return this.api.createUploadUrl({ fileName: file.name, contentType: mimeType, folder, event: eventId, size: file.size }).pipe(
        switchMap(({ uploadUrl, publicUrl }) => this.api.uploadAsset(uploadUrl, file).pipe(map(() => ({ file, publicUrl, type: kind }))))
      );
    });

    forkJoin(uploads).subscribe({
      next: (results) => {
        blobUrls.forEach((u) => {
          try { URL.revokeObjectURL(u); } catch {}
        });

        this.design.assets = this.design.assets || [];
        const knownUrls = new Set(this.design.assets.map((asset) => asset.url));
        const newAssets: VisualInvitationAsset[] = results.filter((res) => !knownUrls.has(res.publicUrl)).map((res) => ({
          id: this.uid('asset'), url: res.publicUrl, type: res.type, name: res.file.name, createdAt: new Date().toISOString()
        }));
        this.design.assets.push(...newAssets);

        const assignedLayerIds: string[] = [];

        if (targetLayer && targetLayer.type === 'image') {
          targetLayer.url = results[0].publicUrl;
          assignedLayerIds.push(targetLayer.id);

          if (results.length > 1 && targetLayer.groupId) {
            const groupFrames = section.layers.filter((l) => l.groupId === targetLayer.groupId && l.id !== targetLayer.id && l.type === 'image');
            const emptyFrames = groupFrames.filter((l) => !l.url || blobUrls.includes(l.url));
            const filledFrames = groupFrames.filter((l) => !!l.url && !blobUrls.includes(l.url));
            const orderedSiblings = [...emptyFrames, ...filledFrames];

            for (let i = 1; i < results.length; i++) {
              if (i - 1 < orderedSiblings.length) {
                const sibling = orderedSiblings[i - 1];
                sibling.url = results[i].publicUrl;
                assignedLayerIds.push(sibling.id);
              } else {
                const extraOffset = (i - orderedSiblings.length) * 4;
                const newL = this.newLayer('image', '', this.bound(targetLayer.x + extraOffset, 5, 80), this.bound(targetLayer.y + extraOffset, 5, 80), targetLayer.width, targetLayer.height);
                newL.url = results[i].publicUrl;
                newL.name = results[i].file.name;
                section.layers.push(newL);
                assignedLayerIds.push(newL.id);
              }
            }
          } else if (results.length > 1) {
            for (let i = 1; i < results.length; i++) {
              const extraOffset = i * 4;
              const newL = this.newLayer('image', '', this.bound(targetLayer.x + extraOffset, 5, 80), this.bound(targetLayer.y + extraOffset, 5, 80), targetLayer.width, targetLayer.height);
              newL.url = results[i].publicUrl;
              newL.name = results[i].file.name;
              section.layers.push(newL);
              assignedLayerIds.push(newL.id);
            }
          }
        } else if (targetLayer && (targetLayer.type === 'video' || targetLayer.type === 'audio') && results[0].type === targetLayer.type) {
          targetLayer.url = results[0].publicUrl;
          assignedLayerIds.push(targetLayer.id);
        } else {
          results.forEach((res, i) => {
            const layerType = res.type;
            const width = layerType === 'image' ? 45 : (layerType === 'video' ? 50 : 40);
            const height = layerType === 'image' ? 30 : (layerType === 'video' ? 35 : 15);
            const posX = this.bound(x + i * 4, 2, 85);
            const posY = this.bound(y + i * 4, 2, 85);
            const newL = this.newLayer(layerType, '', posX, posY, width, height);
            newL.url = res.publicUrl;
            newL.name = res.file.name;
            if (layerType === 'image') {
              newL.style = { ...newL.style, objectFit: 'cover' };
            }
            section.layers.push(newL);
            assignedLayerIds.push(newL.id);
          });
        }

        if (assignedLayerIds.length) {
          this.setLayerSelection(assignedLayerIds);
        }
        this.inspectorView = 'properties';

        this.uploading = false;
        this.autosaveState = 'Cambios pendientes';
        const count = results.length;
        if (targetLayer && targetLayer.type === 'image') {
          this.flash(count === 1 ? 'Foto colocada en el marco.' : `${count} fotos colocadas en la composición.`);
        } else {
          this.flash(count === 1 ? 'Elemento agregado en el lienzo.' : `${count} elementos agregados en el lienzo.`);
        }
      },
      error: (error) => {
        blobUrls.forEach((u) => {
          try { URL.revokeObjectURL(u); } catch {}
        });
        if (targetLayer) targetLayer.url = previousTargetUrl;
        siblingReverts.forEach((s) => s.frame.url = s.url);
        this.uploading = false;
        this.error = error?.error?.message || 'No fue posible subir los archivos.';
      }
    });
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
    const selected = this.selectedLayers;
    if (!section || !selected.length) return;
    const layers = selected.filter((layer) => !isSingleInstanceControl(layer));
    if (!layers.length) { this.flash('Los controles conectados son únicos. Selecciona el existente para editarlo.'); return; }
    this.recordHistory();
    const copiedGroup = layers.length > 1 ? this.uid('group') : undefined;
    const copies = layers.map((layer) => {
      const copy = this.clone(layer);
      copy.id = this.uid('layer');
      copy.groupId = copiedGroup;
      copy.name = `${this.layerLabel(layer)} copia`;
      copy.x = this.bound(copy.x + 3, 0, 100 - copy.width);
      const range = this.verticalLayerBounds(section, copy.height);
      copy.y = this.bound(copy.y + 3, range.min, range.max);
      if (copy.layouts) Object.values(copy.layouts).forEach((layout) => {
        if (!layout) return;
        layout.x = this.bound(layout.x + 3, 0, 100 - layout.width);
        const layoutRange = this.verticalLayerBounds(section, layout.height);
        layout.y = this.bound(layout.y + 3, layoutRange.min, layoutRange.max);
      });
      copy.zIndex = (copy.zIndex || 1) + 1;
      return copy;
    });
    section.layers.push(...copies);
    this.setLayerSelection(copies.map((copy) => copy.id));
    if (layers.length !== selected.length) this.flash('Se duplicaron solo los elementos decorativos; los controles conectados se conservan una vez.');
  }

  copySelectedLayers(): void {
    if (!this.selectedLayers.length) return;
    this.clipboardLayers = this.clone(this.selectedLayers);
    this.clipboardSectionType = this.selectedSection?.type;
    this.flash(`${this.clipboardLayers.length} elemento${this.clipboardLayers.length === 1 ? '' : 's'} copiado${this.clipboardLayers.length === 1 ? '' : 's'}.`);
  }

  cutSelectedLayers(): void {
    if (!this.selectedLayers.length) return;
    this.clipboardLayers = this.clone(this.selectedLayers);
    this.clipboardSectionType = this.selectedSection?.type;
    this.removeLayer();
    this.flash('Elementos cortados. Selecciona otra sección y pégalos.');
  }

  pasteLayers(): void {
    const section = this.selectedSection;
    if (!section || !this.clipboardLayers.length) return;
    const existing = new Set(section.layers.filter((layer) => isSingleInstanceControl(layer)).map((layer) => layer.binding));
    const sources = this.clipboardLayers.filter((layer) => {
      if (!isSingleInstanceControl(layer)) return true;
      if (this.clipboardSectionType !== section.type || existing.has(layer.binding)) return false;
      existing.add(layer.binding);
      return true;
    });
    if (!sources.length) { this.flash('Los controles conectados ya existen en esta sección o pertenecen a otra función.'); return; }
    this.recordHistory();
    const groupIds = new Map<string, string>();
    const topZ = Math.max(0, ...section.layers.map((item) => item.zIndex || 0));
    const copies = sources.map((source, index) => {
      const copy = this.clone(source);
      copy.id = this.uid('layer');
      if (copy.groupId) {
        if (!groupIds.has(copy.groupId)) groupIds.set(copy.groupId, this.uid('group'));
        copy.groupId = groupIds.get(copy.groupId);
      }
      copy.name = `${this.layerLabel(source)} copia`;
      copy.x = this.bound(copy.x + 3, 0, 100 - copy.width);
      const range = this.verticalLayerBounds(section, copy.height);
      copy.y = this.bound(copy.y + 3, range.min, range.max);
      if (copy.layouts) Object.values(copy.layouts).forEach((layout) => {
        if (!layout) return;
        layout.x = this.bound(layout.x + 3, 0, 100 - layout.width);
        const layoutRange = this.verticalLayerBounds(section, layout.height);
        layout.y = this.bound(layout.y + 3, layoutRange.min, layoutRange.max);
      });
      copy.zIndex = topZ + index + 1;
      return copy;
    });
    section.layers.push(...copies);
    this.setLayerSelection(copies.map((copy) => copy.id));
    this.flash(`${copies.length} elemento${copies.length === 1 ? '' : 's'} pegado${copies.length === 1 ? '' : 's'}.${copies.length !== this.clipboardLayers.length ? ' Se omitieron controles conectados duplicados.' : ''}`);
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
    const section = this.selectedSection;
    if (layer.locked || !section) return;
    event.preventDefault();
    event.stopPropagation();
    const canvas = (event.currentTarget as HTMLElement).closest('.canvas-section') as HTMLElement;
    if (!canvas) return;
    this.recordHistory();
    this.resizing = true;
    const layout = this.editableLayout(layer);
    this.resizeState = {
      corner, section, layout, canvas, startX: event.clientX, startY: event.clientY,
      x: layout.x, y: layout.y, width: layout.width, height: layout.height,
      layer
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
    if (layer.locked || !['text', 'button'].includes(layer.type) || this.isDynamicTextOutputLayer(layer)) return;
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
    if (layer.locked || layer.type !== 'image' || !this.boundImageUrl(layer)) return;
    this.selectedSectionId = section.id;
    if (layer.groupId && layer.style?.frameEnabled) this.setLayerSelection([layer.id]);
    else this.applyLayerSelection(section, layer, false);
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
    const pluginDrag = this.pluginPartDragState;
    if (pluginDrag) {
      const distanceX = event.clientX - pluginDrag.startX;
      const distanceY = event.clientY - pluginDrag.startY;
      if (!pluginDrag.moved && Math.hypot(distanceX, distanceY) < 3) return;
      event.preventDefault();
      if (!pluginDrag.moved) { this.recordHistory(); pluginDrag.moved = true; }
      const width = Number(pluginDrag.part.width || 20);
      const height = Number(pluginDrag.part.height || 8);
      pluginDrag.part.x = Math.round(this.bound(pluginDrag.x + distanceX / Math.max(1, pluginDrag.canvas.clientWidth) * 100, 0, 100 - width) * 10) / 10;
      pluginDrag.part.y = Math.round(this.bound(pluginDrag.y + distanceY / Math.max(1, pluginDrag.canvas.clientHeight) * 100, 0, 100 - height) * 10) / 10;
      this.autosaveState = 'Cambios pendientes';
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
      let nextX = west ? resize.x + dx : resize.x;
      let nextY = north ? resize.y + dy : resize.y;
      let nextWidth = west ? resize.width - dx : resize.width + dx;
      let nextHeight = north ? resize.height - dy : resize.height + dy;
      if (event.shiftKey && resize.width > 0 && resize.height > 0) {
        const canvasW = resize.canvas.clientWidth || 1;
        const canvasH = resize.canvas.clientHeight || 1;
        const aspectPx = (resize.width * canvasW) / (resize.height * canvasH);
        const candidateWidthPx = Math.max(1, nextWidth * canvasW);
        const candidateHeightPx = Math.max(1, nextHeight * canvasH);
        if (Math.abs(dx * canvasW) >= Math.abs(dy * canvasH)) {
          const syncedH = (candidateWidthPx / aspectPx) / canvasH * 100;
          if (north) nextY = resize.y + (resize.height - syncedH);
          nextHeight = syncedH;
        } else {
          const syncedW = (candidateHeightPx * aspectPx) / canvasW * 100;
          if (west) nextX = resize.x + (resize.width - syncedW);
          nextWidth = syncedW;
        }
      }
      const precision = event.pointerType === 'touch' ? 2 : 100;
      const round = (value: number) => Math.round(value * precision) / precision;
      resize.layout.x = round(this.bound(nextX, -100, resize.x + resize.width - 1));
      const height = this.bound(nextHeight, 1, 100);
      const range = this.verticalLayerBounds(resize.section, height);
      resize.layout.y = round(this.bound(nextY, range.min, Math.min(range.max, resize.y + resize.height - 1)));
      resize.layout.width = round(this.bound(nextWidth, 1, 100));
      resize.layout.height = round(this.bound(height, 1, this.design.presentationMode === 'chapters' ? 100 - resize.layout.y : 100));
      return;
    }
    const drag = this.layerDragState;
    if (!drag) return;
    const distanceX = event.clientX - drag.startX;
    const distanceY = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(distanceX, distanceY) < 3) return;
    event.preventDefault();
    if (!drag.moved) { this.recordHistory(); drag.moved = true; }
    const rawX = this.bound(drag.bounds.x + distanceX / drag.canvas.clientWidth * 100, -100, 200);
    const range = this.verticalLayerBounds(drag.section, drag.bounds.height);
    const rawY = this.bound(drag.bounds.y + distanceY / drag.canvas.clientHeight * 100, range.min, range.max);
    const ignoredIds = new Set(drag.items.map((item) => item.layer.id));
    const snapped = this.snapRawPosition(drag.layer, drag.section, drag.canvas, rawX, rawY, drag.bounds.width, drag.bounds.height, ignoredIds);
    const dx = snapped.x - drag.bounds.x;
    const dy = snapped.y - drag.bounds.y;
    for (const item of drag.items) {
      item.layout.x = this.bound(item.x + dx, -100, 200);
      const itemRange = this.verticalLayerBounds(drag.section, item.height);
      item.layout.y = this.bound(item.y + dy, itemRange.min, itemRange.max);
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
    this.pluginPartDragState = undefined;
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
    if (!layer || layer.type !== media.type) {
      this.addLayer(media.type);
      layer = this.selectedLayer;
      created = true;
    }
    if (!layer) return;
    if (!created) this.recordHistory();
    layer.type = media.type;
    layer.url = media.url;
    layer.name = media.label;
    if (media.type === 'audio') {
      if (media.url === this.invitation?.content?.musicUrl) {
        const settings = this.invitation.content.musicSettings || {};
        layer.style = { ...(layer.style || {}), audioStartSeconds: Number(settings.startSeconds || 0), audioEndSeconds: settings.endSeconds, audioVolume: Number(settings.volume ?? .7), audioLoop: settings.loop !== false };
      }
      this.adaptAudioLayerToProvider(layer);
    }
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
    if (event.key === 'Escape' && this.tutorialStep >= 0) { this.closeTutorial(); return; }
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
      if (event.key === 'ArrowLeft') layout.x = this.bound(layout.x - step, -100, 200);
      if (event.key === 'ArrowRight') layout.x = this.bound(layout.x + step, -100, 200);
      const range = this.verticalLayerBounds(this.selectedSection, layout.height);
      if (event.key === 'ArrowUp') layout.y = this.bound(layout.y - step, range.min, range.max);
      if (event.key === 'ArrowDown') layout.y = this.bound(layout.y + step, range.min, range.max);
    });
  }

  layerStyle(layer: VisualInvitationLayer): Record<string, string> {
    const s = layer.style || {};
    const shape = layer.type === 'shape';
    const isIcon = this.isIconLayer(layer);
    const maskedImage = layer.type === 'image' && !!s.imageMask && s.imageMask !== 'none';
    const responsiveScale = this.sharedStyleScale(this.device);
    const layout = this.layoutFor(layer);
    return {
      left: `${layout.x}%`, top: `${layout.y}%`, width: `${layout.width}%`, height: `${layout.height}%`,
      transform: `rotate(${layout.rotation || 0}deg)`, zIndex: String(layer.zIndex || 1),
      color: String(s.color || '#2d2927'), backgroundColor: shape || maskedImage ? 'transparent' : String(s.backgroundColor || 'transparent'),
      fontFamily: String(s.fontFamily || 'Arial, sans-serif'), fontSize: `${this.scaledLayerPixels(s.fontSize || 30, responsiveScale, 10)}px`,
      fontWeight: String(s.fontWeight || 400), fontStyle: String(s.fontStyle || 'normal'), textAlign: String(s.textAlign || 'center'),
      lineHeight: isIcon ? '1' : String(s.lineHeight || 1.2), letterSpacing: `${this.scaledLayerPixels(s.letterSpacing || 0, responsiveScale)}px`, textTransform: String(s.textTransform || 'none'),
      textDecoration: String(s.textDecoration || 'none'), textShadow: String(s.textShadow || 'none'),
      borderRadius: shape ? '0' : `${this.scaledLayerPixels(s.borderRadius || 0, responsiveScale)}px`, borderColor: shape ? 'transparent' : String(s.borderColor || 'transparent'),
      borderStyle: !shape && !maskedImage && Number(s.borderWidth || 0) > 0 ? String(s.borderStyle || 'solid') : 'none', borderWidth: shape || maskedImage ? '0' : `${this.scaledLayerPixels(s.borderWidth || 0, responsiveScale)}px`,
      backgroundImage: !shape && s.gradientEnabled
        ? `linear-gradient(${Number(s.gradientAngle || 0)}deg,${String(s.gradientStart || '#ffffff')},${String(s.gradientEnd || '#000000')})`
        : !shape && s.backgroundImageUrl ? `url("${String(s.backgroundImageUrl)}")` : 'none',
      backgroundSize: 'cover', backgroundPosition: 'center', padding: shape || isIcon ? '0' : `${this.scaledLayerPixels(s.padding || 0, responsiveScale)}px`,
      boxShadow: shape ? 'none' : String(s.boxShadow || 'none'), opacity: String(s.opacity ?? 1),
      '--button-hover-background': String(s.hoverBackgroundColor || s.backgroundColor || 'transparent'),
      '--button-hover-color': String(s.hoverColor || s.color || '#2d2927'),
      '--button-pressed-scale': String(s.pressedScale ?? .97),
      animationDuration: `${Number(layer.animation?.duration || 1)}s`, animationDelay: `${Number(layer.animation?.delay || 0)}s`,
      animationIterationCount: layer.animation?.repeat ? 'infinite' : '1'
    };
  }

  private sharedStyleScale(device: DeviceMode): number {
    if (this.design.responsiveMode === 'independent') return 1;
    return device === 'mobile' ? .68 : device === 'tablet' ? .84 : 1;
  }

  private scaledLayerPixels(value: number, scale: number, minimum = 0): number {
    return Math.round(Math.max(minimum, Number(value || 0) * scale) * 100) / 100;
  }

  setButtonVariant(layer: VisualInvitationLayer, variant: NonNullable<VisualInvitationLayerStyle['buttonVariant']>): void {
    layer.style = layer.style || {};
    this.recordHistory();
    const style = layer.style;
    const accent = this.design.theme?.accentColor || '#b66f5c';
    const contrast = this.design.theme?.buttonTextColor || '#ffffff';
    style.buttonVariant = variant;
    style.pressedScale = style.pressedScale ?? .97;
    style.borderRadius = style.borderRadius ?? this.design.theme?.buttonRadius ?? 8;
    style.padding = style.padding ?? 10;

    if (variant === 'solid') {
      Object.assign(style, { backgroundColor: accent, color: contrast, borderWidth: 0, boxShadow: '0 6px 16px rgba(0,0,0,.16)', hoverBackgroundColor: this.shiftHex(accent, -18), hoverColor: contrast });
    } else if (variant === 'outline') {
      Object.assign(style, { backgroundColor: 'transparent', color: accent, borderWidth: 2, borderStyle: 'solid', borderColor: accent, boxShadow: 'none', hoverBackgroundColor: accent, hoverColor: contrast });
    } else if (variant === 'soft') {
      Object.assign(style, { backgroundColor: `${accent}26`, color: accent, borderWidth: 0, boxShadow: 'none', hoverBackgroundColor: `${accent}42`, hoverColor: accent });
    } else if (variant === 'text') {
      Object.assign(style, { backgroundColor: 'transparent', color: accent, borderWidth: 0, boxShadow: 'none', hoverBackgroundColor: `${accent}14`, hoverColor: accent });
    } else {
      Object.assign(style, { backgroundColor: '#ffffffb8', color: this.design.theme?.textColor || '#2d2927', borderWidth: 1, borderStyle: 'solid', borderColor: '#ffffffcc', boxShadow: '0 10px 30px rgba(0,0,0,.18)', hoverBackgroundColor: '#ffffffe6', hoverColor: this.design.theme?.textColor || '#2d2927' });
    }
  }

  applyButtonPreset(layer: VisualInvitationLayer, preset: VisualButtonPreset): void {
    if (layer.type !== 'button') return;
    this.recordHistory();
    layer.style = {
      ...layer.style,
      ...preset.style,
      gradientEnabled: !!preset.style.gradientEnabled,
      backgroundImageUrl: undefined,
      fontStyle: 'normal',
      textAlign: 'center',
      textDecoration: preset.style.textDecoration || 'none',
      textShadow: 'none',
      letterSpacing: 0,
      lineHeight: 1.2,
      textTransform: preset.style.textTransform || 'none',
      opacity: 1,
      pressedScale: .97
    };
  }

  isButtonPresetApplied(layer: VisualInvitationLayer, preset: VisualButtonPreset): boolean {
    return Object.entries(preset.style).every(([key, value]) =>
      layer.style?.[key as keyof VisualInvitationLayerStyle] === value
    ) && !!layer.style?.gradientEnabled === !!preset.style.gradientEnabled;
  }

  setAudioShape(layer: VisualInvitationLayer, shape: NonNullable<VisualInvitationLayerStyle['audioShape']>, record = true): void {
    layer.style = layer.style || {};
    if (record) this.recordHistory();
    layer.style.audioShape = shape;
    const layout = this.layoutFor(layer);
    if (shape === 'circle') {
      layer.style.borderRadius = 999;
      layout.width = Math.min(layout.width, 14);
      layout.height = layout.width;
      layer.style.audioShowLabel = false;
    } else if (shape === 'pill') {
      layer.style.borderRadius = 999;
      layout.width = Math.max(layout.width, 22);
      layout.height = Math.min(layout.height, 10);
      layer.style.audioShowLabel = true;
    } else {
      layer.style.borderRadius = 12;
      layout.width = Math.max(layout.width, 16);
      layout.height = Math.min(layout.height, 12);
    }
  }

  setAudioVariant(layer: VisualInvitationLayer, variant: NonNullable<VisualInvitationLayerStyle['audioVariant']>, record = true): void {
    layer.style = layer.style || {};
    if (record) this.recordHistory();
    const style = layer.style;
    const accent = this.design.theme?.accentColor || '#b66f5c';
    const contrast = this.design.theme?.buttonTextColor || '#ffffff';
    style.audioVariant = variant;
    if (variant === 'solid') {
      Object.assign(style, { backgroundColor: accent, color: contrast, borderWidth: 0, boxShadow: '0 6px 18px rgba(0,0,0,.22)' });
    } else if (variant === 'outline') {
      Object.assign(style, { backgroundColor: '#ffffff', color: accent, borderWidth: 2, borderStyle: 'solid', borderColor: accent, boxShadow: '0 4px 14px rgba(0,0,0,.12)' });
    } else {
      Object.assign(style, { backgroundColor: '#ffffffcc', color: accent, borderWidth: 0, boxShadow: 'none' });
    }
  }

  private shiftHex(color: string, amount: number): string {
    const match = /^#([\da-f]{6})$/i.exec(color);
    if (!match) return color;
    const value = Number.parseInt(match[1], 16);
    const channel = (shift: number) => Math.max(0, Math.min(255, shift + amount)).toString(16).padStart(2, '0');
    return `#${channel(value >> 16)}${channel((value >> 8) & 255)}${channel(value & 255)}`;
  }

  imageStyle(layer: VisualInvitationLayer): Record<string, string> {
    const style = layer.style || {};
    const scale = Number(style.imageScale || 1);
    const scaleX = scale * (style.flipX ? -1 : 1);
    const scaleY = scale * (style.flipY ? -1 : 1);
    return {
      objectFit: style.preserveAspectRatio !== false ? 'contain' : (style.objectFit || 'cover'),
      objectPosition: `${style.objectPositionX ?? 50}% ${style.objectPositionY ?? 50}%`,
      clipPath: style.imageMask && style.imageMask !== 'none' && Number(style.borderWidth || 0) > 0 ? this.maskClipPath(style.imageMask) : 'none',
      borderRadius: style.imageMask === 'rounded' ? '12%' : '0',
      transform: `scale(${scaleX},${scaleY}) rotate(${Number(style.imageRotation || 0)}deg)`,
      filter: `brightness(${Number(style.brightness ?? 100)}%) contrast(${Number(style.contrast ?? 100)}%) saturate(${Number(style.saturation ?? 100)}%) blur(${Number(style.blur || 0)}px)`
    };
  }

  imageMaskStyle(layer: VisualInvitationLayer): Record<string, string> {
    const mask = layer.style?.imageMask || 'none';
    const framed = mask !== 'none' && Number(layer.style?.borderWidth || 0) > 0;
    return {
      clipPath: this.maskClipPath(mask), borderRadius: mask === 'rounded' ? '12%' : '0',
      boxSizing: 'border-box',
      padding: framed ? `${this.scaledLayerPixels(Number(layer.style?.borderWidth || 0), this.sharedStyleScale(this.device))}px` : '0',
      backgroundColor: framed ? String(layer.style?.borderColor || '#ffffff') : 'transparent'
    };
  }

  framePreviewStyle(mask: ImageMask): Record<string, string> {
    return { clipPath: this.maskClipPath(mask), borderRadius: mask === 'rounded' ? '12%' : '0' };
  }

  setImageFit(layer: VisualInvitationLayer, fit: 'cover' | 'contain'): void {
    this.recordHistory();
    layer.style = { ...layer.style, preserveAspectRatio: fit === 'contain', objectFit: fit };
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
      height: `${visualSectionHeight(section)}px`, backgroundColor: bg.color || '#fff',
      backgroundImage: bg.imageUrl ? `linear-gradient(#000000${alpha},#000000${alpha}),url("${bg.imageUrl}")` : 'none'
    };
  }

  functionalPreviewStyle(section: VisualInvitationSection): Record<string, string> {
    const theme = this.design.theme || this.themePresets[0].theme;
    const moduleStyle = section.moduleStyle || {};
    const isXv = this.isXvBurgundy();
    const buttonStyle = theme.buttonStyle || 'solid';
    const buttonColor = isXv ? '#d4af37' : String(theme.buttonBackgroundColor || '#292523');
    return {
      '--module-background': isXv ? '#faf6f0' : String(theme.backgroundColor || '#ffffff'),
      '--module-text': isXv ? '#5c0d18' : String(theme.textColor || '#292523'),
      '--module-accent': isXv ? '#d4af37' : String(theme.accentColor || '#9a6754'),
      '--module-heading-font': String(theme.headingFont || 'Georgia, serif'),
      '--module-body-font': String(theme.bodyFont || 'Arial, sans-serif'),
      '--module-button-background': isXv ? '#d4af37' : (buttonStyle === 'solid' ? buttonColor : buttonStyle === 'soft' ? `color-mix(in srgb,${buttonColor} 16%,transparent)` : 'transparent'),
      '--module-button-text': isXv ? '#5c0d18' : (buttonStyle === 'solid' ? String(theme.buttonTextColor || '#ffffff') : buttonColor),
      '--module-button-border': isXv ? '1px solid #d4af37' : (buttonStyle === 'outline' ? `1px solid ${buttonColor}` : '1px solid transparent'),
      '--module-button-radius': isXv ? '30px' : `${Number(theme.buttonRadius || 0)}px`,
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

  selectPluginPart(section: VisualInvitationSection, key: RsvpPartKey, event: Event): void {
    event.stopPropagation();
    this.selectedSectionId = section.id;
    this.clearLayerSelection();
    this.selectedPluginPartKey = key;
    this.inspectorView = 'properties';
  }

  rsvpPart(key: string): { key: RsvpPartKey; label: string; binding: string; purpose: string } | undefined {
    return this.rsvpParts.find((part) => part.key === key);
  }

  pluginPartDesign(section: VisualInvitationSection, key: string): VisualPluginPartDesign {
    return section.pluginDesign?.parts?.[key] || this.defaultRsvpPluginDesign().parts?.[key] || {};
  }

  pluginPartLabel(section: VisualInvitationSection, key: RsvpPartKey): string {
    const configured = this.pluginPartDesign(section, key).label;
    if (configured) return configured;
    const labels: Record<RsvpPartKey, string> = {
      eyebrow: String(this.pluginSetting(section, 'eyebrow') || 'Confirmación'),
      title: section.title || 'Confirma tu asistencia',
      intro: String(this.pluginSetting(section, 'introText') || 'Nos encantará contar contigo.'),
      name: 'Nombre', contact: 'Correo', response: 'Respuesta', companions: 'Acompañantes',
      dietary: 'Restricciones alimentarias', message: 'Mensaje',
      submit: String(this.pluginSetting(section, 'primaryButtonText') || 'Enviar confirmación'),
      feedback: 'Aquí aparecerá la confirmación del envío'
    };
    return labels[key];
  }

  pluginPartPlaceholder(section: VisualInvitationSection, key: RsvpPartKey): string {
    const configured = this.pluginPartDesign(section, key).placeholder;
    if (configured) return configured;
    const placeholders: Partial<Record<RsvpPartKey, string>> = {
      name: 'Nombre del invitado', contact: 'contacto@ejemplo.com', response: 'Sí asistiré', companions: '0',
      dietary: 'Vegetariano, alergias...', message: 'Mensaje opcional'
    };
    return placeholders[key] || '';
  }

  pluginPartClasses(section: VisualInvitationSection, key: string): string[] {
    const design = this.pluginPartDesign(section, key);
    return [`plugin-part-${key}`, `plugin-shape-${design.shape || 'rectangle'}`, design.variant === 'cards' ? 'plugin-variant-cards' : 'plugin-variant-default'];
  }

  pluginPartStyle(section: VisualInvitationSection, key: string): Record<string, string> {
    const part = this.pluginPartDesign(section, key);
    const free = section.pluginDesign?.layout === 'free';
    return {
      position: free ? 'absolute' : 'relative',
      left: free ? `${part.x ?? 5}%` : 'auto', top: free ? `${part.y ?? 5}%` : 'auto',
      width: free ? `${part.width ?? 90}%` : 'auto', minHeight: free ? `${part.height ?? 8}%` : '0',
      color: String(part.color || 'var(--module-text)'), backgroundColor: String(part.backgroundColor || 'transparent'),
      backgroundImage: part.backgroundImageUrl ? `url("${part.backgroundImageUrl}")` : 'none',
      fontFamily: String(part.fontFamily || 'var(--module-body-font)'), fontSize: `${Number(part.fontSize || 14)}px`,
      fontWeight: String(part.fontWeight || 500), textAlign: String(part.textAlign || 'left'),
      borderColor: String(part.borderColor || 'transparent'), borderWidth: `${Number(part.borderWidth || 0)}px`,
      borderStyle: Number(part.borderWidth || 0) ? 'solid' : 'none', borderRadius: `${Number(part.borderRadius || 0)}px`,
      padding: `${Number(part.padding ?? 8)}px`, boxShadow: String(part.boxShadow || 'none'),
      backgroundSize: 'cover', backgroundPosition: 'center', boxSizing: 'border-box'
    };
  }

  rsvpDesignCanvasStyle(section: VisualInvitationSection): Record<string, string> {
    return { minHeight: section.pluginDesign?.layout === 'free' ? `${Number(section.pluginDesign?.minHeight || 560)}px` : '0' };
  }

  setRsvpDesignLayout(section: VisualInvitationSection, layout: 'flow' | 'free'): void {
    this.recordHistory();
    this.ensureRsvpPluginDesign(section);
    section.pluginDesign!.layout = layout;
    section.height = Math.max(section.height, layout === 'free' ? Number(section.pluginDesign!.minHeight || 560) + 150 : 820);
    this.autosaveState = 'Cambios pendientes';
  }

  setRsvpDesignHeight(section: VisualInvitationSection, value: number): void {
    this.ensureRsvpPluginDesign(section);
    section.pluginDesign!.minHeight = Math.max(240, Math.min(1600, Number(value) || 560));
    section.height = Math.max(section.height, section.pluginDesign!.minHeight + 150);
    this.autosaveState = 'Cambios pendientes';
  }

  setPluginPartDesign(section: VisualInvitationSection, key: string, property: keyof VisualPluginPartDesign, value: string | number | boolean): void {
    this.ensureRsvpPluginDesign(section);
    section.pluginDesign!.parts![key] = { ...section.pluginDesign!.parts![key], [property]: value };
    this.autosaveState = 'Cambios pendientes';
  }

  applyPluginPartPreset(section: VisualInvitationSection, key: string, preset: 'minimal' | 'pill' | 'cloud' | 'notebook'): void {
    this.recordHistory();
    this.ensureRsvpPluginDesign(section);
    const accent = this.design.theme?.accentColor || '#9a6754';
    const presets: Record<typeof preset, Partial<VisualPluginPartDesign>> = {
      minimal: { shape: 'rectangle', backgroundColor: '#ffffff', borderColor: '#d7cec7', borderWidth: 1, borderRadius: 4, boxShadow: 'none' },
      pill: { shape: 'pill', backgroundColor: '#ffffff', borderColor: accent, borderWidth: 1, borderRadius: 999, boxShadow: 'none' },
      cloud: { shape: 'cloud', backgroundColor: '#ffffff', borderColor: accent, borderWidth: 1, borderRadius: 48, boxShadow: '0 10px 24px rgba(64,53,47,.12)' },
      notebook: { shape: 'notebook', backgroundColor: '#fffdf8', borderColor: '#d9cec3', borderWidth: 1, borderRadius: 3, boxShadow: '0 8px 18px rgba(64,53,47,.12)' }
    };
    section.pluginDesign!.parts![key] = { ...section.pluginDesign!.parts![key], ...presets[preset] };
    this.autosaveState = 'Cambios pendientes';
  }

  beginPluginPartDrag(event: PointerEvent, section: VisualInvitationSection, key: RsvpPartKey, canvas: HTMLElement): void {
    this.selectPluginPart(section, key, event);
    if (section.pluginDesign?.layout !== 'free' || event.button !== 0) return;
    const part = this.pluginPartDesign(section, key);
    this.ensureRsvpPluginDesign(section);
    this.pluginPartDragState = {
      section, part: section.pluginDesign!.parts![key], canvas,
      startX: event.clientX, startY: event.clientY, x: Number(part.x || 0), y: Number(part.y || 0), moved: false
    };
  }

  uploadPluginPartBackground(fileInput: HTMLInputElement, section: VisualInvitationSection, key: string): void {
    const file = fileInput.files?.[0];
    if (!file || !this.invitation) return;
    const eventId = typeof this.invitation.event === 'string' ? this.invitation.event : (this.invitation.event._id || this.invitation.event.id);
    this.uploading = true;
    this.api.createUploadUrl({ fileName: file.name, contentType: file.type, folder: 'assets', event: eventId, size: file.size }).pipe(
      switchMap(({ uploadUrl, publicUrl }) => this.api.uploadAsset(uploadUrl, file).pipe(map(() => publicUrl)))
    ).subscribe({
      next: (publicUrl) => { this.recordHistory(); this.setPluginPartDesign(section, key, 'backgroundImageUrl', publicUrl); this.uploading = false; fileInput.value = ''; },
      error: () => { this.uploading = false; this.error = 'No fue posible subir el fondo del control.'; }
    });
  }

  pluginSetting(section: VisualInvitationSection, key: string): string | number | boolean {
    return section.pluginSettings?.[key] ?? this.defaultPluginSettings(section.type)[key] ?? '';
  }

  setPluginSetting(section: VisualInvitationSection, key: string, value: string | number | boolean): void {
    section.pluginSettings = { ...this.defaultPluginSettings(section.type), ...(section.pluginSettings || {}), [key]: value };
    this.autosaveState = 'Cambios pendientes';
  }

  galleryPreviewMode(section: VisualInvitationSection): 'grid' | 'list' | 'carousel' {
    const configured = String(this.pluginSetting(section, 'displayMode'));
    return configured === 'grid' || configured === 'list' || configured === 'carousel'
      ? configured
      : (this.invitation?.content?.gallerySettings?.displayMode || 'grid');
  }

  isConfigurablePlugin(type: string): boolean {
    return ['rsvp', 'guestPass', 'guestActivity', 'countdown', 'locations', 'gifts', 'album', 'dedications', 'songs', 'gallery', 'itinerary', 'dressCode', 'lodging'].includes(type);
  }

  hasRsvpCanvasLayers(section: VisualInvitationSection): boolean {
    return section.type === 'rsvp' && section.layers.some((layer) => this.isRsvpFunctionalLayer(layer));
  }

  hasNativeFunctionalLayers(section: VisualInvitationSection): boolean {
    return section.layers.some((layer) => {
      const binding = String(layer.binding || '');
      return this.isRsvpFunctionalLayer(layer) || binding.startsWith('dedication.') || binding.startsWith('display.dedications.') || binding.startsWith('song.') || binding.startsWith('display.songs.') || binding.startsWith('album.') || binding.startsWith('display.album.') || binding.startsWith('pass.') || binding.startsWith('display.guestPass.') || binding.startsWith('activity.') || binding.startsWith('display.guestActivity.') || binding.startsWith('countdown.') || binding.startsWith('display.countdown.') || binding.startsWith('location.') || binding.startsWith('display.locations.') || binding.startsWith('gift.') || binding.startsWith('envelope.') || binding.startsWith('display.gifts.') || binding.startsWith('itinerary.') || binding.startsWith('display.itinerary.') || binding.startsWith('dress.') || binding.startsWith('display.dressCode.') || binding.startsWith('lodging.') || binding.startsWith('display.lodging.') || binding.startsWith('gallery.') || binding.startsWith('display.gallery.');
    });
  }

  isRsvpFunctionalLayer(layer: VisualInvitationLayer): boolean {
    return String(layer.binding || '').startsWith('rsvp.') || String(layer.binding || '').startsWith('display.rsvp.');
  }

  rsvpFieldPreview(layer: VisualInvitationLayer): string {
    if (layer.style?.showPlaceholder === false) return '';
    if (layer.binding === 'dedication.wall') return '“Que esta etapa esté llena de momentos inolvidables.”';
    if (layer.binding === 'album.gallery') return '▧  ▧  ▧  Fotografías aprobadas';
    if (layer.binding === 'pass.qr') return '▦ Código QR';
    if (layer.binding === 'activity.rsvp') return 'RSVP\nAsistencia confirmada';
    if (layer.binding === 'activity.pass') return 'Pase\nMesa 5';
    if (layer.binding === 'activity.album') return 'Fotografías\n2';
    if (layer.binding === 'activity.songs') return 'Canciones\n1';
    if (layer.binding === 'activity.dedications') return 'Dedicatorias\n1';
    if (layer.binding === 'rsvp.response') return 'Sí asistiré';
    if (layer.binding === 'rsvp.companions') return '0';
    return layer.placeholder || 'Escribe aquí';
  }

  isDynamicOutputLayer(layer: VisualInvitationLayer): boolean {
    return ['dedication.wall', 'album.gallery', 'pass.qr', 'activity.rsvp', 'activity.pass', 'activity.album', 'activity.songs', 'activity.dedications'].includes(layer.binding || '');
  }

  isDynamicTextOutputLayer(layer: VisualInvitationLayer): boolean {
    return layer.type === 'text' && (String(layer.binding || '').startsWith('pass.') || String(layer.binding || '').startsWith('location.') || String(layer.binding || '').startsWith('gift.') || String(layer.binding || '').startsWith('envelope.') || String(layer.binding || '').startsWith('itinerary.') || String(layer.binding || '').startsWith('dress.') || String(layer.binding || '').startsWith('lodging.') || String(layer.binding || '').startsWith('gallery.') || layer.binding === 'activity.greeting' || ['countdown.days', 'countdown.hours', 'countdown.minutes', 'countdown.seconds'].includes(layer.binding || ''));
  }

  isDynamicImageOutputLayer(layer: VisualInvitationLayer): boolean {
    return layer.type === 'image' && (/^gift\.\d+\.image$/.test(String(layer.binding || '')) || /^lodging\.\d+\.image$/.test(String(layer.binding || '')) || /^gallery\.item\.\d+\.image$/.test(String(layer.binding || '')) || layer.binding === 'gallery.carousel.image' || layer.binding === 'envelope.qr' || layer.binding === 'dress.image');
  }

  boundImageUrl(layer: VisualInvitationLayer): string {
    if (layer.binding === 'gallery.carousel.image') return this.invitation?.content?.galleryItems?.[0]?.url || layer.url || '';
    const galleryImageMatch = String(layer.binding || '').match(/^gallery\.item\.(\d+)\.image$/);
    if (galleryImageMatch) return this.invitation?.content?.galleryItems?.[Number(galleryImageMatch[1])]?.url || layer.url || '';
    if (layer.binding === 'dress.image') return this.invitation?.content?.dressCodeImageUrl || layer.url || '';
    const lodgingImageMatch = String(layer.binding || '').match(/^lodging\.(\d+)\.image$/);
    if (lodgingImageMatch) return this.invitation?.content?.lodging?.[Number(lodgingImageMatch[1])]?.imageUrl || layer.url || '';
    const giftMatch = String(layer.binding || '').match(/^gift\.(\d+)\.image$/);
    if (giftMatch) return this.invitation?.content?.giftRegistry?.[Number(giftMatch[1])]?.imageUrl || layer.url || '';
    if (layer.binding === 'envelope.qr') return this.invitation?.content?.digitalEnvelope?.qrImageUrl || layer.url || '';
    return layer.url || '';
  }

  editorLayerText(layer: VisualInvitationLayer): string {
    const binding = String(layer.binding || '');
    if (binding === 'gallery.carousel.counter') return `1 / ${Math.max(1, this.invitation?.content?.galleryItems?.length || 0)}`;
    const galleryCarouselMatch = binding.match(/^gallery\.carousel\.(title|description|dedication)$/);
    if (galleryCarouselMatch) return this.invitation?.content?.galleryItems?.[0]?.[galleryCarouselMatch[1] as 'title' | 'description' | 'dedication'] || layer.text || '';
    const galleryItemMatch = binding.match(/^gallery\.item\.(\d+)\.(title|description|dedication)$/);
    if (galleryItemMatch) return this.invitation?.content?.galleryItems?.[Number(galleryItemMatch[1])]?.[galleryItemMatch[2] as 'title' | 'description' | 'dedication'] || layer.text || '';
    const lodgingMatch = binding.match(/^lodging\.(\d+)\.(name|description|address|price|agreement|discount|services|notes)$/);
    if (lodgingMatch) {
      const hotel = this.invitation?.content?.lodging?.[Number(lodgingMatch[1])];
      if (!hotel) return layer.text || '';
      const key = lodgingMatch[2];
      if (key === 'name') return hotel.name || layer.text || '';
      if (key === 'description') return hotel.description || layer.text || '';
      if (key === 'address') return hotel.address || layer.text || '';
      if (key === 'price') return hotel.priceLabel || layer.text || '';
      if (key === 'agreement') return hotel.agreementLabel || layer.text || '';
      if (key === 'discount') return [hotel.discountCode, hotel.discountDescription].filter(Boolean).join(' · ') || layer.text || '';
      if (key === 'services') return (hotel.services || []).join(' · ') || layer.text || '';
      return hotel.notes || layer.text || '';
    }
    if (binding === 'dress.code') return this.invitation?.content?.dressCode || layer.text || '';
    if (binding === 'dress.description') return this.invitation?.content?.dressCodeDescription || layer.text || '';
    const dressOptionMatch = binding.match(/^dress\.option\.(\d+)\.(title|description)$/);
    if (dressOptionMatch) {
      const option = this.invitation?.content?.dressCodeOptions?.[Number(dressOptionMatch[1])];
      return option?.[dressOptionMatch[2] as 'title' | 'description'] || layer.text || '';
    }
    const itineraryMatch = binding.match(/^itinerary\.(\d+)\.(icon|time|title|description)$/);
    if (itineraryMatch) {
      const item = this.itinerarySourceData()[Number(itineraryMatch[1])];
      const key = itineraryMatch[2] as 'icon' | 'time' | 'title' | 'description';
      return item?.[key] || layer.text || '';
    }
    const locationMatch = binding.match(/^location\.(\d+)\.(name|address|notes|details)$/);
    if (locationMatch) {
      const location = this.locationSourceData()[Number(locationMatch[1])];
      const key = locationMatch[2];
      if (!location) return '';
      if (key === 'name') return location.name || location.type || layer.text || '';
      if (key === 'address') return location.address || '';
      if (key === 'notes') return location.notes || '';
      return [location.parking, location.transport, location.accessibility, ...(location.schedule || [])].filter(Boolean).join('\n');
    }
    const giftMatch = binding.match(/^gift\.(\d+)\.(title|store|note)$/);
    if (giftMatch) {
      const gift = this.invitation?.content?.giftRegistry?.[Number(giftMatch[1])];
      const key = giftMatch[2] as 'title' | 'store' | 'note';
      return gift?.[key] || (key === 'title' ? gift?.store : '') || layer.text || '';
    }
    const envelope = this.invitation?.content?.digitalEnvelope;
    if (binding === 'envelope.bank') return envelope?.bank || layer.text || '';
    if (binding === 'envelope.holder') return envelope?.holder || layer.text || '';
    if (binding === 'envelope.account') return envelope?.account ? `Cuenta: ${envelope.account}` : layer.text || '';
    if (binding === 'envelope.clabe') return envelope?.clabe ? `CLABE: ${envelope.clabe}` : layer.text || '';
    if (binding === 'envelope.note') return envelope?.note || layer.text || '';
    if (binding === 'countdown.days') return String(this.countdownPreview.days);
    if (binding === 'countdown.hours') return String(this.countdownPreview.hours).padStart(2, '0');
    if (binding === 'countdown.minutes') return String(this.countdownPreview.minutes).padStart(2, '0');
    if (binding === 'countdown.seconds') return String(this.countdownPreview.seconds).padStart(2, '0');
    return this.resolveLayerText(layer);
  }

  editorLayerUnavailableReason(layer: VisualInvitationLayer): string {
    if (layer.type !== 'button') return '';
    const match = String(layer.binding || '').match(/^location\.(\d+)\.(map|waze|phone|website)$/);
    if (!match) return '';
    const location = this.locationSourceData()[Number(match[1])];
    if (!location) return 'Esta ubicación ya no existe y la acción no se publicará.';
    const value = match[2] === 'map' ? location.mapUrl
      : match[2] === 'waze' ? location.wazeUrl
        : match[2] === 'phone' ? location.phone
          : location.websiteUrl;
    return value ? '' : 'Falta configurar este dato; el botón no aparecerá en la invitación pública.';
  }

  setLayerControlStyle(layer: VisualInvitationLayer, key: 'controlVariant' | 'controlShape', value: string): void {
    layer.style = { ...(layer.style || {}), [key]: value };
    this.autosaveState = 'Cambios pendientes';
  }

  makeFieldTransparent(layer: VisualInvitationLayer): void {
    this.recordHistory();
    layer.style = { ...(layer.style || {}), backgroundColor: 'transparent', borderWidth: 0, boxShadow: 'none' };
  }

  addRsvpControl(binding: string): void {
    this.addFunctionalControl(binding);
  }

  addFunctionalControl(binding: string): void {
    const section = this.selectedSection;
    if (!section || !['rsvp', 'dedications', 'songs', 'album', 'guestPass', 'guestActivity', 'countdown', 'locations', 'gifts', 'itinerary', 'dressCode', 'lodging', 'gallery'].includes(section.type)) return;
    const existing = section.layers.find((layer) => layer.binding === binding && isSingleInstanceControl(layer));
    if (existing) {
      this.setLayerSelection([existing.id]);
      this.inspectorView = 'properties';
      this.flash(existing.hidden ? 'Este control ya existe, pero está oculto. Actívalo en Propiedades.' : 'Este control ya existe. Selecciónalo para cambiar su diseño o posición.');
      return;
    }
    this.recordHistory();
    const topZ = Math.max(0, ...section.layers.map((item) => item.zIndex || 0));
    let layer: VisualInvitationLayer;
    let label = '';
    if (section.type === 'rsvp') {
      const definition = this.rsvpLayerDefinitions().find((item) => item.binding === binding);
      if (!definition) return;
      layer = this.createRsvpLayer(section, definition, topZ + 1);
      label = definition.label;
    } else if (section.type === 'dedications') {
      const definition = this.dedicationLayerDefinitions(section).find((item) => item.binding === binding);
      if (!definition) return;
      layer = this.createDedicationLayer(section, definition, topZ + 1);
      label = definition.label;
    } else if (section.type === 'songs') {
      const definition = this.songLayerDefinitions(section).find((item) => item.binding === binding);
      if (!definition) return;
      layer = this.createSongLayer(definition, topZ + 1);
      label = definition.label;
    } else if (section.type === 'album') {
      const definition = this.albumLayerDefinitions(section).find((item) => item.binding === binding);
      if (!definition) return;
      layer = this.createAlbumLayer(definition, topZ + 1);
      label = definition.label;
    } else if (section.type === 'guestPass') {
      const definition = this.guestPassLayerDefinitions(section).find((item) => item.binding === binding);
      if (!definition) return;
      layer = this.createGuestPassLayer(definition, topZ + 1);
      label = definition.label;
    } else if (section.type === 'guestActivity') {
      const definition = this.guestActivityLayerDefinitions(section).find((item) => item.binding === binding);
      if (!definition) return;
      layer = this.createGuestActivityLayer(definition, topZ + 1);
      label = definition.label;
    } else if (section.type === 'countdown') {
      const definition = this.countdownLayerDefinitions(section).find((item) => item.binding === binding);
      if (!definition) return;
      layer = this.createCountdownLayer(definition, topZ + 1);
      label = definition.label;
    } else if (section.type === 'locations') {
      const definition = this.locationLayerDefinitions(section).find((item) => item.binding === binding);
      if (!definition) return;
      layer = this.createLocationLayer(definition, topZ + 1);
      label = definition.label;
    } else if (section.type === 'gifts') {
      const definition = this.giftLayerDefinitions(section).find((item) => item.binding === binding);
      if (!definition) return;
      layer = this.createGiftLayer(definition, topZ + 1);
      label = definition.label;
    } else if (section.type === 'itinerary') {
      const definition = this.itineraryLayerDefinitions(section).find((item) => item.binding === binding);
      if (!definition) return;
      layer = this.createItineraryLayer(definition, topZ + 1);
      label = definition.label;
    } else if (section.type === 'dressCode') {
      const definition = this.dressCodeLayerDefinitions(section).find((item) => item.binding === binding);
      if (!definition) return;
      layer = this.createDressCodeLayer(definition, topZ + 1);
      label = definition.label;
    } else if (section.type === 'lodging') {
      const definition = this.lodgingLayerDefinitions(section).find((item) => item.binding === binding);
      if (!definition) return;
      layer = this.createLodgingLayer(definition, topZ + 1);
      label = definition.label;
    } else {
      const definition = this.galleryLayerDefinitions(section).find((item) => item.binding === binding);
      if (!definition) return;
      layer = this.createGalleryLayer(definition, topZ + 1);
      label = definition.label;
    }
    if (section.type === 'rsvp') { layer.x = 25; layer.y = 40; }
    const additions = layer.type === 'field' && !this.isDynamicOutputLayer(layer) ? [this.separateRsvpFieldLayer(layer, topZ + 1), layer] : [layer];
    section.layers.push(...additions);
    this.setLayerSelection(additions.map((item) => item.id), layer.id);
    this.inspectorView = 'properties';
    this.flash(`${label} agregado al lienzo.`);
  }

  restoreMissingRsvpControls(section: VisualInvitationSection): void {
    if (section.type !== 'rsvp') return;
    const existing = new Set(section.layers.map((layer) => layer.binding).filter(Boolean));
    const missing = this.rsvpLayerDefinitions().filter((definition) => definition.binding.startsWith('rsvp.') && !existing.has(definition.binding));
    if (!missing.length) { this.flash('Todos los campos RSVP ya están en el lienzo.'); return; }
    this.recordHistory();
    let topZ = Math.max(0, ...section.layers.map((layer) => layer.zIndex || 0));
    for (const definition of missing) {
      const layer = this.createRsvpLayer(section, definition, ++topZ);
      if (layer.type === 'field') section.layers.push(this.separateRsvpFieldLayer(layer, topZ), layer);
      else section.layers.push(layer);
    }
    this.flash(`${missing.length} elemento(s) RSVP restaurado(s).`);
  }

  get countdownPreview(): { days: number; hours: number; minutes: number; seconds: number; isOver: boolean } {
    const target = this.event?.date ? new Date(this.event.date) : new Date(Date.now() + 38 * 24 * 60 * 60 * 1000);
    const distance = target.getTime() - Date.now();
    if (Number.isNaN(distance) || distance <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true };
    return {
      days: Math.floor(distance / 86400000), hours: Math.floor(distance / 3600000) % 24,
      minutes: Math.floor(distance / 60000) % 60, seconds: Math.floor(distance / 1000) % 60, isOver: false
    };
  }

  locationControlCatalog(section: VisualInvitationSection): Array<{ binding: string; label: string; fullLabel?: string; icon: string }> {
    const icons: Record<string, string> = { name: 'Aa', address: '⌖', notes: '≡', details: '☰', map: '⌖', waze: 'W', phone: '☎', website: '↗' };
    const fieldNames: Record<string, string> = {
      name: 'Nombre', address: 'Dirección', notes: 'Notas', details: 'Detalles',
      map: 'Abrir mapa', waze: 'Waze', phone: 'Llamar', website: 'Sitio web'
    };
    return this.locationLayerDefinitions(section)
      .filter((definition) => /^location\.\d+\.(name|address|notes|details|map|waze|phone|website)$/.test(definition.binding))
      .map((definition) => {
        const match = definition.binding.match(/^location\.(\d+)\.([^.]+)$/);
        const index = Number(match?.[1] || 0);
        const key = match?.[2] || 'name';
        const fieldLabel = fieldNames[key] || definition.label;
        const loc = this.locationSourceData()[index];
        const locName = loc?.name || loc?.type || `Lugar ${index + 1}`;
        return {
          binding: definition.binding,
          label: `Ubic. ${index + 1}: ${fieldLabel}`,
          fullLabel: `Ubicación ${index + 1} (${locName}): ${fieldLabel}`,
          icon: icons[key] || '+'
        };
      });
  }

  locationControlGroups(section: VisualInvitationSection): Array<{
    badge: string;
    title: string;
    controls: Array<{ binding: string; label: string; fullLabel: string; icon: string }>;
  }> {
    const icons: Record<string, string> = { name: 'Aa', address: '⌖', notes: '≡', details: '☰', map: '⌖', waze: 'W', phone: '☎', website: '↗' };
    const fieldNames: Record<string, string> = {
      name: 'Nombre', address: 'Dirección', notes: 'Notas', details: 'Detalles',
      map: 'Abrir mapa', waze: 'Waze', phone: 'Llamar', website: 'Sitio web'
    };
    const locations = this.locationSourceData();
    const count = Math.max(locations.length, 1);
    const groups: Array<{ badge: string; title: string; controls: Array<{ binding: string; label: string; fullLabel: string; icon: string }> }> = [];

    for (let index = 0; index < count; index++) {
      const loc = locations[index];
      const locName = loc?.name?.trim() || loc?.type || `Ubicación ${index + 1}`;
      const prefix = `location.${index}.`;
      const controls = this.locationLayerDefinitions(section)
        .filter((def) => def.binding.startsWith(prefix) && /^location\.\d+\.(name|address|notes|details|map|waze|phone|website)$/.test(def.binding))
        .map((def) => {
          const key = def.binding.replace(prefix, '');
          const label = fieldNames[key] || def.label;
          return {
            binding: def.binding,
            label,
            fullLabel: `Ubicación ${index + 1} (${locName}): ${label}`,
            icon: icons[key] || '+'
          };
        });

      if (controls.length) {
        groups.push({
          badge: `Ubicación ${index + 1}`,
          title: locName,
          controls
        });
      }
    }
    return groups;
  }

  giftControlCatalog(section: VisualInvitationSection): Array<{ binding: string; label: string; fullLabel?: string; icon: string }> {
    return this.giftLayerDefinitions(section)
      .filter((definition) => /^(gift\.\d+\.(image|title|store|note|open)|envelope\.(bank|holder|account|clabe|note|qr|copyAccount|copyClabe|feedback))$/.test(definition.binding))
      .map((definition) => ({
        binding: definition.binding,
        label: definition.label,
        icon: definition.type === 'image' ? '▧' : definition.type === 'button' ? '→' : 'Aa'
      }));
  }

  giftControlGroups(section: VisualInvitationSection): Array<{
    badge: string;
    title: string;
    controls: Array<{ binding: string; label: string; fullLabel: string; icon: string }>;
  }> {
    const gifts = this.giftSourceData();
    const groups: Array<{ badge: string; title: string; controls: Array<{ binding: string; label: string; fullLabel: string; icon: string }> }> = [];
    const giftFieldNames: Record<string, string> = {
      image: 'Logo', title: 'Título', store: 'Tienda', note: 'Nota', open: 'Abrir mesa'
    };

    gifts.forEach((gift, index) => {
      const giftName = gift.title || gift.store || `Mesa ${index + 1}`;
      const prefix = `gift.${index}.`;
      const controls = this.giftLayerDefinitions(section)
        .filter((def) => def.binding.startsWith(prefix) && /^(image|title|store|note|open)$/.test(def.binding.replace(prefix, '')))
        .map((def) => {
          const key = def.binding.replace(prefix, '');
          const label = giftFieldNames[key] || def.label;
          return {
            binding: def.binding,
            label,
            fullLabel: `Mesa ${index + 1} (${giftName}): ${label}`,
            icon: def.type === 'image' ? '▧' : def.type === 'button' ? '→' : 'Aa'
          };
        });
      if (controls.length) {
        groups.push({
          badge: `Mesa ${index + 1}`,
          title: giftName,
          controls
        });
      }
    });

    const envelopeFieldNames: Record<string, string> = {
      bank: 'Banco', holder: 'Titular', account: 'Cuenta', clabe: 'CLABE',
      note: 'Nota', qr: 'Código QR', copyAccount: 'Copiar cta.', copyClabe: 'Copiar CLABE', feedback: 'Confirmación'
    };
    const envelopeControls = this.giftLayerDefinitions(section)
      .filter((def) => def.binding.startsWith('envelope.') && /^(bank|holder|account|clabe|note|qr|copyAccount|copyClabe|feedback)$/.test(def.binding.replace('envelope.', '')))
      .map((def) => {
        const key = def.binding.replace('envelope.', '');
        const label = envelopeFieldNames[key] || def.label;
        return {
          binding: def.binding,
          label,
          fullLabel: `Sobre digital: ${label}`,
          icon: def.type === 'image' ? '▧' : def.type === 'button' ? '→' : 'Aa'
        };
      });

    if (envelopeControls.length) {
      groups.push({
        badge: 'Sobre digital',
        title: 'Transferencias y regalos',
        controls: envelopeControls
      });
    }

    return groups;
  }

  itineraryControlCatalog(section: VisualInvitationSection): Array<{ binding: string; label: string; fullLabel?: string; icon: string }> {
    const icons: Record<string, string> = { icon: '★', time: '◷', title: 'Aa', description: '≡', location: '⌖' };
    const fieldNames: Record<string, string> = { icon: 'Ícono', time: 'Horario', title: 'Título', description: 'Descripción', location: 'Lugar' };
    return this.itineraryLayerDefinitions(section)
      .filter((definition) => /^itinerary\.\d+\.(icon|time|title|description|location)$/.test(definition.binding))
      .map((definition) => {
        const match = definition.binding.match(/^itinerary\.(\d+)\.([^.]+)$/);
        const index = Number(match?.[1] || 0);
        const key = match?.[2] || 'title';
        const fieldLabel = fieldNames[key] || definition.label;
        const item = this.itinerarySourceData()[index];
        const itemTitle = item?.title || `Actividad ${index + 1}`;
        return {
          binding: definition.binding,
          label: `Act. ${index + 1}: ${fieldLabel}`,
          fullLabel: `Actividad ${index + 1} (${itemTitle}): ${fieldLabel}`,
          icon: icons[key] || '+'
        };
      });
  }

  itineraryControlGroups(section: VisualInvitationSection): Array<{
    badge: string;
    title: string;
    controls: Array<{ binding: string; label: string; fullLabel: string; icon: string }>;
  }> {
    const icons: Record<string, string> = { icon: '★', time: '◷', title: 'Aa', description: '≡', location: '⌖' };
    const fieldNames: Record<string, string> = { icon: 'Ícono', time: 'Horario', title: 'Título', description: 'Descripción', location: 'Lugar' };
    const activities = this.itinerarySourceData();
    const count = Math.max(activities.length, 1);
    const groups: Array<{ badge: string; title: string; controls: Array<{ binding: string; label: string; fullLabel: string; icon: string }> }> = [];

    for (let index = 0; index < count; index++) {
      const item = activities[index];
      const itemTitle = item?.time ? (item.title ? `${item.time} · ${item.title}` : item.time) : (item?.title || `Actividad ${index + 1}`);
      const prefix = `itinerary.${index}.`;
      const controls = this.itineraryLayerDefinitions(section)
        .filter((def) => def.binding.startsWith(prefix) && /^itinerary\.\d+\.(icon|time|title|description|location)$/.test(def.binding))
        .map((def) => {
          const key = def.binding.replace(prefix, '');
          const label = fieldNames[key] || def.label;
          return {
            binding: def.binding,
            label,
            fullLabel: `Actividad ${index + 1} (${itemTitle}): ${label}`,
            icon: icons[key] || '+'
          };
        });

      if (controls.length) {
        groups.push({
          badge: `Actividad ${index + 1}`,
          title: itemTitle,
          controls
        });
      }
    }
    return groups;
  }

  dressCodeControlCatalog(section: VisualInvitationSection): Array<{ binding: string; label: string; fullLabel?: string; icon: string }> {
    return this.dressCodeLayerDefinitions(section)
      .filter((definition) => definition.binding === 'dress.image' || definition.binding === 'dress.code' || definition.binding === 'dress.description' || /^dress\.option\.\d+\.(color|title|description)$/.test(definition.binding))
      .map((definition) => ({
        binding: definition.binding,
        label: definition.label,
        icon: definition.type === 'image' ? '▧' : definition.type === 'shape' ? '■' : 'Aa'
      }));
  }

  dressCodeControlGroups(section: VisualInvitationSection): Array<{
    badge: string;
    title: string;
    controls: Array<{ binding: string; label: string; fullLabel: string; icon: string }>;
  }> {
    const groups: Array<{ badge: string; title: string; controls: Array<{ binding: string; label: string; fullLabel: string; icon: string }> }> = [];
    const mainControls = this.dressCodeLayerDefinitions(section)
      .filter((def) => ['dress.image', 'dress.code', 'dress.description'].includes(def.binding))
      .map((def) => {
        const label = def.binding === 'dress.image' ? 'Foto guía' : def.binding === 'dress.code' ? 'Vestimenta' : 'Descripción';
        return {
          binding: def.binding,
          label,
          fullLabel: `Vestimenta: ${label}`,
          icon: def.type === 'image' ? '▧' : 'Aa'
        };
      });

    if (mainControls.length) {
      groups.push({
        badge: 'General',
        title: this.invitation?.content?.dressCode || 'Código de vestimenta',
        controls: mainControls
      });
    }

    const options = this.invitation?.content?.dressCodeOptions || [];
    options.forEach((opt, index) => {
      const optTitle = opt.title || `Color ${index + 1}`;
      const prefix = `dress.option.${index}.`;
      const controls = this.dressCodeLayerDefinitions(section)
        .filter((def) => def.binding.startsWith(prefix) && /^(color|title|description)$/.test(def.binding.replace(prefix, '')))
        .map((def) => {
          const key = def.binding.replace(prefix, '');
          const label = key === 'color' ? 'Muestra' : key === 'title' ? 'Título' : 'Descripción';
          return {
            binding: def.binding,
            label,
            fullLabel: `Color ${index + 1} (${optTitle}): ${label}`,
            icon: def.type === 'shape' ? '■' : 'Aa'
          };
        });
      if (controls.length) {
        groups.push({
          badge: `Color ${index + 1}`,
          title: optTitle,
          controls
        });
      }
    });

    return groups;
  }

  addDressCodeOption(): void {
    if (!this.invitation) return;
    this.recordHistory();
    const options = this.invitation.content.dressCodeOptions ||= [];
    const index = options.length;
    options.push({ title: '', description: '', color: '#d9c2b0' });
    const section = this.design.sections.find((item) => item.type === 'dressCode');
    if (section && this.hasNativeFunctionalLayers(section)) this.ensureDressCodeCanvasLayers(section, [index]);
  }

  removeDressCodeOption(index: number): void {
    const options = this.invitation?.content?.dressCodeOptions;
    if (!options || index < 0 || index >= options.length) return;
    this.recordHistory();
    options.splice(index, 1);
    const section = this.design.sections.find((item) => item.type === 'dressCode');
    if (!section) return;
    section.layers = section.layers.filter((layer) => !String(layer.binding || '').startsWith(`dress.option.${index}.`));
    for (const layer of section.layers) {
      const match = String(layer.binding || '').match(/^dress\.option\.(\d+)\.(.+)$/);
      if (match && Number(match[1]) > index) layer.binding = `dress.option.${Number(match[1]) - 1}.${match[2]}`;
    }
    this.restoreSelection();
  }

  updateDressCodeOptionColor(index: number, color: string): void {
    const option = this.invitation?.content?.dressCodeOptions?.[index];
    if (!option) return;
    option.color = color;
    const layer = this.design.sections.find((item) => item.type === 'dressCode')?.layers.find((item) => item.binding === `dress.option.${index}.color`);
    if (layer) layer.style = { ...(layer.style || {}), backgroundColor: color };
  }

  lodgingControlCatalog(section: VisualInvitationSection): Array<{ binding: string; label: string; fullLabel?: string; icon: string }> {
    const icons: Record<string, string> = { image: '▧', name: 'Aa', description: '≡', address: '⌖', price: '$', agreement: '%', discount: '%', services: '+', notes: '≡', reserve: '→', map: '⌖', phone: '☎' };
    const fieldNames: Record<string, string> = {
      image: 'Foto', name: 'Nombre', description: 'Descripción', address: 'Dirección',
      price: 'Tarifa', agreement: 'Convenio', discount: 'Descuento', services: 'Servicios',
      notes: 'Notas', reserve: 'Reservar', map: 'Abrir mapa', phone: 'Llamar'
    };
    return this.lodgingLayerDefinitions(section)
      .filter((definition) => /^lodging\.\d+\.(image|name|description|address|price|agreement|discount|services|notes|reserve|map|phone)$/.test(definition.binding))
      .map((definition) => {
        const match = definition.binding.match(/^lodging\.(\d+)\.([^.]+)$/);
        const index = Number(match?.[1] || 0);
        const fieldKey = match?.[2] || 'name';
        const fieldLabel = fieldNames[fieldKey] || definition.label;
        const hotelName = this.invitation?.content?.lodging?.[index]?.name;
        const hotelTitle = hotelName ? `Hosp. ${index + 1} (${hotelName})` : `Hospedaje ${index + 1}`;
        return {
          binding: definition.binding,
          label: `Hosp. ${index + 1}: ${fieldLabel}`,
          fullLabel: `${hotelTitle}: ${fieldLabel}`,
          icon: icons[fieldKey] || '+'
        };
      });
  }

  lodgingControlGroups(section: VisualInvitationSection): Array<{
    badge: string;
    title: string;
    controls: Array<{ binding: string; label: string; fullLabel: string; icon: string }>;
  }> {
    const icons: Record<string, string> = { image: '▧', name: 'Aa', description: '≡', address: '⌖', price: '$', agreement: '%', discount: '%', services: '+', notes: '≡', reserve: '→', map: '⌖', phone: '☎' };
    const fieldNames: Record<string, string> = {
      image: 'Foto', name: 'Nombre', description: 'Descripción', address: 'Dirección',
      price: 'Tarifa', agreement: 'Convenio', discount: 'Descuento', services: 'Servicios',
      notes: 'Notas', reserve: 'Reservar', map: 'Abrir mapa', phone: 'Llamar'
    };
    const hotels = this.invitation?.content?.lodging || [];
    const count = Math.max(hotels.length, 1);
    const groups: Array<{ badge: string; title: string; controls: Array<{ binding: string; label: string; fullLabel: string; icon: string }> }> = [];

    for (let index = 0; index < count; index++) {
      const hotel = hotels[index];
      const hotelName = hotel?.name?.trim() || `Hotel ${index + 1}`;
      const prefix = `lodging.${index}.`;
      const controls = this.lodgingLayerDefinitions(section)
        .filter((def) => def.binding.startsWith(prefix) && /^lodging\.\d+\.(image|name|description|address|price|agreement|discount|services|notes|reserve|map|phone)$/.test(def.binding))
        .map((def) => {
          const fieldKey = def.binding.replace(prefix, '');
          const label = fieldNames[fieldKey] || def.label;
          return {
            binding: def.binding,
            label,
            fullLabel: `Hospedaje ${index + 1} (${hotelName}): ${label}`,
            icon: icons[fieldKey] || '+'
          };
        });

      if (controls.length) {
        groups.push({
          badge: `Hospedaje ${index + 1}`,
          title: hotelName,
          controls
        });
      }
    }
    return groups;
  }

  galleryControlCatalog(section: VisualInvitationSection): Array<{ binding: string; label: string; fullLabel?: string; icon: string }> {
    const mode = this.galleryPreviewMode(section);
    return this.galleryLayerDefinitions(section)
      .filter((definition) => mode === 'carousel'
        ? definition.binding.startsWith('gallery.carousel.')
        : /^gallery\.item\.\d+\.(image|title|description|dedication)$/.test(definition.binding))
      .map((definition) => ({
        binding: definition.binding,
        label: definition.label,
        icon: definition.type === 'image' ? '▧' : definition.type === 'button' ? '→' : 'Aa'
      }));
  }

  galleryControlGroups(section: VisualInvitationSection): Array<{
    badge: string;
    title: string;
    controls: Array<{ binding: string; label: string; fullLabel: string; icon: string }>;
  }> {
    const mode = this.galleryPreviewMode(section);
    const groups: Array<{ badge: string; title: string; controls: Array<{ binding: string; label: string; fullLabel: string; icon: string }> }> = [];

    if (mode === 'carousel') {
      const carouselLabels: Record<string, string> = {
        image: 'Foto actual', counter: 'Contador', title: 'Título',
        description: 'Descripción', dedication: 'Dedicatoria', prev: 'Anterior', next: 'Siguiente'
      };
      const controls = this.galleryLayerDefinitions(section)
        .filter((def) => def.binding.startsWith('gallery.carousel.'))
        .map((def) => {
          const key = def.binding.replace('gallery.carousel.', '');
          const label = carouselLabels[key] || def.label;
          return {
            binding: def.binding,
            label,
            fullLabel: `Carrusel: ${label}`,
            icon: def.type === 'image' ? '▧' : def.type === 'button' ? '→' : 'Aa'
          };
        });
      if (controls.length) {
        groups.push({
          badge: 'Carrusel',
          title: 'Marco interactivo',
          controls
        });
      }
    } else {
      const itemLabels: Record<string, string> = {
        image: 'Foto', title: 'Título', description: 'Descripción', dedication: 'Dedicatoria'
      };
      const items = this.invitation?.content?.galleryItems || [];
      const count = Math.max(items.length, 1);
      for (let index = 0; index < count; index++) {
        const item = items[index];
        const itemTitle = item?.title?.trim() || `Foto ${index + 1}`;
        const prefix = `gallery.item.${index}.`;
        const controls = this.galleryLayerDefinitions(section)
          .filter((def) => def.binding.startsWith(prefix) && /^gallery\.item\.\d+\.(image|title|description|dedication)$/.test(def.binding))
          .map((def) => {
            const key = def.binding.replace(prefix, '');
            const label = itemLabels[key] || def.label;
            return {
              binding: def.binding,
              label,
              fullLabel: `Foto ${index + 1} (${itemTitle}): ${label}`,
              icon: def.type === 'image' ? '▧' : 'Aa'
            };
          });
        if (controls.length) {
          groups.push({
            badge: `Foto ${index + 1}`,
            title: itemTitle,
            controls
          });
        }
      }
    }

    return groups;
  }

  shouldRenderEditorLayer(section: VisualInvitationSection, layer: VisualInvitationLayer): boolean {
    if (section.type === 'gallery') {
      const binding = String(layer.binding || '');
      if (!binding.startsWith('gallery.')) return true;
      const carousel = this.galleryPreviewMode(section) === 'carousel';
      return carousel ? binding.startsWith('gallery.carousel.') : binding.startsWith('gallery.item.');
    }
    if (section.type === 'guestPass') {
      const binding = String(layer.binding || '');
      if (binding.startsWith('display.guestPass.')) return true;
      const isFormMode = this.pluginSetting(section, 'editorViewMode') === 'form';
      const isFormLayer = ['pass.email', 'pass.phone', 'pass.identify'].includes(binding) || binding.startsWith('display.label.pass.');
      const isPassLayer = ['pass.card', 'pass.qr', 'pass.name', 'pass.group', 'pass.table', 'pass.seat', 'pass.companions', 'pass.feedback'].includes(binding);
      if (isFormMode) return isFormLayer || binding === 'pass.feedback';
      return isPassLayer;
    }
    if (section.type === 'guestActivity') {
      const binding = String(layer.binding || '');
      if (binding.startsWith('display.guestActivity.')) return true;
      const isFormMode = this.pluginSetting(section, 'editorViewMode') === 'form';
      const isFormLayer = ['activity.email', 'activity.phone', 'activity.identify'].includes(binding) || binding.startsWith('display.label.activity.');
      const isDashboardLayer = ['activity.greeting', 'activity.rsvp', 'activity.pass', 'activity.album', 'activity.songs', 'activity.dedications', 'activity.manage', 'activity.full'].includes(binding);
      if (isFormMode) return isFormLayer;
      return isDashboardLayer;
    }
    return true;
  }

  beginContentEdit(): void {
    this.recordHistory();
  }

  setRsvpDeadlineDate(value: string): void {
    if (!this.invitation?.rsvpSettings) return;
    this.invitation.rsvpSettings.deadline = value ? `${value}T23:59:59.000Z` : undefined;
  }

  identityMethodEnabled(method: 'email' | 'phone'): boolean {
    return this.invitation?.rsvpSettings?.identityMethods?.includes(method) !== false;
  }

  setIdentityMethod(method: 'email' | 'phone', enabled: boolean): void {
    if (!this.invitation?.rsvpSettings) return;
    const methods = new Set<'email' | 'phone'>(this.invitation.rsvpSettings.identityMethods || ['email', 'phone']);
    if (enabled) methods.add(method); else if (methods.size > 1) methods.delete(method);
    this.invitation.rsvpSettings.identityMethods = Array.from(methods);
  }

  moderationListValue(key: ModerationListKey): string {
    return (this.invitation?.content.moderationSettings?.[key] || []).join(', ');
  }

  setModerationList(key: ModerationListKey, value: string): void {
    const settings = this.invitation?.content.moderationSettings;
    if (!settings) return;
    settings[key] = [...new Set(value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean))];
  }

  isModeratedModule(type: string): boolean {
    return ['album', 'dedications', 'songs'].includes(type);
  }

  updateStoryContent(field: 'storyTitle' | 'storyBody', value: string): void {
    if (!this.invitation) return;
    this.invitation.content[field] = value;
    if (this.selectedSection?.type !== 'story') return;
    const textLayers = this.selectedSection.layers.filter((layer) => layer.type === 'text');
    const target = field === 'storyTitle' ? textLayers[0] : textLayers[1];
    if (target) target.text = value;
  }

  updateGalleryItemUrl(item: InvitationGalleryItem, value: string): void {
    item.url = value;
    this.syncLegacyGallery();
  }

  get hasFeaturedGalleryItem(): boolean {
    return Boolean(this.invitation?.content?.galleryItems?.some((item) => item.featured));
  }

  setFeaturedGalleryItem(index: number): void {
    if (!this.invitation) return;
    this.beginContentEdit();
    this.invitation.content.galleryItems?.forEach((item, itemIndex) => { item.featured = itemIndex === index; });
  }

  galleryCaption(item: InvitationGalleryItem): string {
    return [item.title, item.description, item.dedication].filter(Boolean).join(' · ');
  }

  lodgingServices(item: InvitationLodgingItem): string {
    return (item.services || []).join(', ');
  }

  setLodgingServices(item: InvitationLodgingItem, value: string): void {
    item.services = [...new Set(value.split(/[;,\n]/).map((service) => service.trim()).filter(Boolean))];
  }

  locationSchedule(location: InvitationLocation): string {
    return (location.schedule || []).join('\n');
  }

  setLocationSchedule(location: InvitationLocation, value: string): void {
    location.schedule = value.split('\n').map((line) => line.trim()).filter(Boolean);
  }

  searchLocation(index: number, query: string): void {
    if (this.locationSearchTimeouts[index]) clearTimeout(this.locationSearchTimeouts[index]);
    const trimmed = query.trim();
    if (trimmed.length < 3) { this.locationSearchResults[index] = []; this.locationSearchLoading[index] = false; return; }
    this.locationSearchLoading[index] = true;
    this.locationSearchTimeouts[index] = setTimeout(() => {
      this.api.searchPlaces(trimmed).subscribe({
        next: (places) => { this.locationSearchResults[index] = places; this.locationSearchLoading[index] = false; },
        error: () => { this.locationSearchResults[index] = []; this.locationSearchLoading[index] = false; }
      });
    }, 450);
  }

  selectLocation(index: number, place: PlaceSearchResult): void {
    const location = this.invitation?.content.locations?.[index];
    if (!location) return;
    this.recordHistory();
    Object.assign(location, {
      type: place.type || location.type, name: place.name, address: place.address,
      mapUrl: place.mapUrl, wazeUrl: place.wazeUrl, lat: place.lat, lon: place.lon,
      phone: place.phone || location.phone, websiteUrl: place.websiteUrl || location.websiteUrl,
      schedule: place.schedule?.length ? place.schedule : location.schedule
    });
    this.locationSearchResults[index] = [];
  }

  async inspectLocationUrl(index: number): Promise<void> {
    const location = this.invitation?.content.locations?.[index];
    if (!location?.mapUrl) return;
    this.locationExtractLoading[index] = true;
    try {
      const parsed = await this.api.parseGoogleMapsUrl(location.mapUrl);
      this.recordHistory();
      Object.assign(location, {
        name: parsed.name || location.name, address: parsed.address || location.address,
        mapUrl: parsed.mapUrl || location.mapUrl, wazeUrl: parsed.wazeUrl || location.wazeUrl,
        lat: parsed.lat ?? location.lat, lon: parsed.lon ?? location.lon
      });
      this.flash('Ubicación actualizada desde Google Maps.');
    } catch {
      this.error = 'No fue posible extraer los datos del enlace de Google Maps.';
    } finally {
      this.locationExtractLoading[index] = false;
    }
  }

  addContentItem(key: ContentListKey): void {
    if (!this.invitation) return;
    this.recordHistory();
    if (key === 'locations') {
      const index = this.invitation.content.locations!.length;
      this.invitation.content.locations!.push({ type: 'venue', name: '', address: '', mapUrl: '', wazeUrl: '', notes: '', schedule: [], priority: index });
      const section = this.design.sections.find((item) => item.type === 'locations');
      if (section && this.hasNativeFunctionalLayers(section)) this.ensureLocationCanvasLayers(section, [index]);
    }
    if (key === 'itinerary') {
      const index = this.invitation.content.itinerary!.length;
      this.invitation.content.itinerary!.push({ time: '', title: '', description: '', icon: '', locationLabel: '', locationUrl: '' });
      const section = this.design.sections.find((item) => item.type === 'itinerary');
      if (section && this.hasNativeFunctionalLayers(section)) this.ensureItineraryCanvasLayers(section, [index]);
    }
    if (key === 'galleryItems') {
      const index = this.invitation.content.galleryItems!.length;
      this.invitation.content.galleryItems!.push(this.emptyGalleryItem(index));
      const section = this.design.sections.find((item) => item.type === 'gallery');
      if (section && this.hasNativeFunctionalLayers(section)) this.ensureGalleryCanvasLayers(section, [index]);
    }
    if (key === 'giftRegistry') this.invitation.content.giftRegistry!.push({ store: '', title: '', url: '', imageUrl: '', note: '', priority: this.invitation.content.giftRegistry!.length });
    if (key === 'lodging') {
      const index = this.invitation.content.lodging!.length;
      this.invitation.content.lodging!.push(this.emptyLodgingItem(index));
      const section = this.design.sections.find((item) => item.type === 'lodging');
      if (section && this.hasNativeFunctionalLayers(section)) this.ensureLodgingCanvasLayers(section, [index]);
    }
    if (key === 'giftRegistry') {
      const index = this.invitation.content.giftRegistry!.length - 1;
      const section = this.design.sections.find((item) => item.type === 'gifts');
      if (section && this.hasNativeFunctionalLayers(section)) this.ensureGiftCanvasLayers(section, [index]);
    }
  }

  removeContentItem(key: ContentListKey, index: number): void {
    const items = this.contentList(key);
    if (index < 0 || index >= items.length) return;
    this.recordHistory();
    items.splice(index, 1);
    if (key === 'lodging') this.removeIndexedNativeLayers('lodging', index);
    if (key === 'galleryItems') { this.removeIndexedNativeLayers('gallery', index, 'gallery.item'); this.syncLegacyGallery(); }
    if (key === 'giftRegistry') this.invitation?.content.giftRegistry?.forEach((item, itemIndex) => { item.priority = itemIndex; });
    if (key === 'lodging') this.invitation?.content.lodging?.forEach((item, itemIndex) => { item.priority = itemIndex; });
    if (key === 'locations') this.invitation?.content.locations?.forEach((item, itemIndex) => { item.priority = itemIndex; });
  }

  dropContentItem(event: { previousIndex: number; currentIndex: number }, key: ContentListKey): void {
    if (event.previousIndex === event.currentIndex) return;
    this.recordHistory();
    moveItemInArray(this.contentList(key), event.previousIndex, event.currentIndex);
    if (key === 'galleryItems') this.syncLegacyGallery();
    if (key === 'giftRegistry') this.invitation?.content.giftRegistry?.forEach((item, index) => { item.priority = index; });
    if (key === 'lodging') this.invitation?.content.lodging?.forEach((item, index) => { item.priority = index; });
    if (key === 'locations') this.invitation?.content.locations?.forEach((item, index) => { item.priority = index; });
  }

  private removeIndexedNativeLayers(sectionType: string, index: number, bindingPrefix = sectionType): void {
    const section = this.design.sections.find((item) => item.type === sectionType);
    if (!section) return;
    section.layers = section.layers.filter((layer) => !String(layer.binding || '').startsWith(`${bindingPrefix}.${index}.`));
    const escapedPrefix = bindingPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const layer of section.layers) {
      const match = String(layer.binding || '').match(new RegExp(`^${escapedPrefix}\\.(\\d+)\\.(.+)$`));
      if (match && Number(match[1]) > index) layer.binding = `${bindingPrefix}.${Number(match[1]) - 1}.${match[2]}`;
    }
    this.restoreSelection();
  }

  uploadContentImage(fileInput: HTMLInputElement, target: 'gallery' | 'dressCode' | 'gift' | 'lodging' | 'envelopeQr', index = -1): void {
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
        if (target === 'gallery') {
          const index = this.invitation!.content.galleryItems!.length;
          this.invitation!.content.galleryItems!.push({ ...this.emptyGalleryItem(index), url: publicUrl, alt: file.name });
          const section = this.design.sections.find((item) => item.type === 'gallery');
          if (section && this.hasNativeFunctionalLayers(section)) this.ensureGalleryCanvasLayers(section, [index]);
          this.syncLegacyGallery();
        }
        if (target === 'dressCode') this.invitation!.content.dressCodeImageUrl = publicUrl;
        if (target === 'gift' && this.invitation!.content.giftRegistry?.[index]) this.invitation!.content.giftRegistry[index].imageUrl = publicUrl;
        if (target === 'envelopeQr') this.invitation!.content.digitalEnvelope!.qrImageUrl = publicUrl;
        if (target === 'lodging' && this.invitation!.content.lodging?.[index]) this.invitation!.content.lodging[index].imageUrl = publicUrl;
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
        this.design.assets = this.design.assets || [];
        if (!this.design.assets.some((a) => a.url === publicUrl)) {
          this.design.assets.push({
            id: this.uid('asset'),
            url: publicUrl,
            type: file.type.startsWith('audio/') ? 'audio' : (file.type.startsWith('video/') ? 'video' : 'image'),
            name: file.name,
            createdAt: new Date().toISOString()
          });
        }
        this.uploading = false;
        fileInput.value = '';
      },
      error: () => { this.uploading = false; this.error = 'No fue posible subir el archivo.'; }
    });
  }

  chooseStartingDesign(key: string): void {
    this.openDesignLibrary(key);
    this.applyCompleteDesign();
  }

  get filteredCompleteDesigns(): CompleteDesignPreset[] {
    return this.libraryCategory === 'all'
      ? this.builtInPresets
      : this.builtInPresets.filter((preset) => preset.category === this.libraryCategory || preset.category === 'general');
  }

  get selectedCompleteDesign(): CompleteDesignPreset {
    return this.builtInPresets.find((preset) => preset.key === this.librarySelectedKey) || this.builtInPresets[0];
  }

  openDesignLibrary(key?: string): void {
    this.libraryCategory = 'all';
    this.selectCompleteDesign(key || this.recommendedCompleteDesignKey());
    this.showDesignLibrary = true;
  }

  setLibraryCategory(category: string): void {
    this.libraryCategory = category;
    if (!this.filteredCompleteDesigns.some((preset) => preset.key === this.librarySelectedKey)) {
      this.selectCompleteDesign(this.filteredCompleteDesigns.find((preset) => preset.category === category)?.key || this.filteredCompleteDesigns[0].key);
    }
  }

  closeDesignLibrary(): void {
    this.showDesignLibrary = false;
    this.libraryPreviewDesign = undefined;
    this.libraryPreviewInvitation = undefined;
  }

  selectCompleteDesign(key: string): void {
    if (!this.invitation) return;
    this.librarySelectedKey = key;
    const candidate = this.buildPreset(key);
    const current = this.design;
    try {
      this.design = candidate;
      this.normalizeModuleStyles();
    } finally {
      this.design = current;
    }
    this.libraryPreviewDesign = candidate;
    this.libraryPreviewInvitation = {
      ...this.invitation,
      content: { ...this.invitation.content, visualDesign: candidate }
    };
  }

  applyCompleteDesign(): void {
    if (!this.libraryPreviewDesign || (!this.showOnboarding && !this.confirmReplaceDesign())) return;
    const wasOnboarding = this.showOnboarding;
    this.recordHistory();
    const assets = this.design.assets || [];
    this.design = this.clone(this.libraryPreviewDesign);
    this.design.active = true;
    this.design.assets = assets;
    this.selectedSectionId = this.design.sections[0]?.id || '';
    this.clearLayerSelection();
    this.showOnboarding = false;
    this.closeDesignLibrary();
    this.autosaveState = 'Cambios pendientes';
    if (wasOnboarding) setTimeout(() => this.save(), 0);
    if (wasOnboarding) this.maybeStartTutorial();
  }

  private recommendedCompleteDesignKey(): string {
    const type = this.event?.type;
    return this.builtInPresets.find((preset) => preset.category === type)?.key || 'editorial';
  }

  startBlankDesign(): void {
    const section = this.makeSection('custom', 'Mi primera sección', '#ffffff', 640);
    this.design = { version: 1, active: false, mode: 'easy', presentationMode: 'continuous', responsiveMode: 'shared', theme: this.clone(this.themePresets[0].theme), assets: [], sections: [section] };
    this.selectedSectionId = section.id;
    this.clearLayerSelection();
    this.showOnboarding = false;
    this.autosaveState = 'Cambios pendientes';
    setTimeout(() => this.save(), 0);
    this.maybeStartTutorial();
  }

  openDesignImporter(): void {
    this.importWarnings = [];
    this.importSummary = '';
    this.importReview = [];
    this.resetImportMapping();
    const currentTemplate = this.invitation?.content?.sourceTemplateKey || this.invitation?.content?.template || '';
    this.importSource = 'ai';
    this.importTemplateKey = currentTemplate && currentTemplate !== 'visual-builder' && currentTemplate !== 'custom-html' ? currentTemplate : 'envelope-cards';
    this.importHtmlSource = this.invitation?.content?.customHtml || '';
    this.importCssSource = this.invitation?.content?.customCss || '';
    this.importJsonSource = '';
    this.importJsonFileName = '';
    this.importError = '';
    this.aiExchangeMessage = '';
    this.aiDesignPrompt = createVisualDesignAiPrompt(this.event?.type);
    this.showImportDialog = true;
  }

  async copyAiDesignPrompt(): Promise<void> {
    this.importError = '';
    try {
      await navigator.clipboard.writeText(this.aiDesignPrompt);
      this.aiExchangeMessage = 'Instrucciones copiadas. Pégalas en el chat de la IA que prefieras.';
    } catch {
      this.importError = 'No se pudo copiar automáticamente. Abre las instrucciones y cópialas manualmente.';
    }
  }

  downloadEditableDesign(): void {
    const design = this.stripMongoMetadata(this.clone(this.design));
    const content = JSON.stringify(createVisualDesignExchange(design), null, 2);
    this.downloadBlob(new Blob([content], { type: 'application/json' }), `${this.exportFileBase()}-editable.json`);
    this.aiExchangeMessage = 'Diseño editable descargado. Puedes compartir ese JSON con otra IA y volver a importarlo aquí.';
  }

  async loadDesignJsonFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.importError = '';
    this.aiExchangeMessage = '';
    if (!file.name.toLowerCase().endsWith('.json') || file.size > 2_000_000) {
      this.importError = 'Selecciona un archivo .json de hasta 2 MB.';
      return;
    }
    try {
      this.importJsonSource = await file.text();
      this.importJsonFileName = file.name;
      this.aiExchangeMessage = 'Archivo cargado. Revísalo y pulsa Importar al editor.';
    } catch {
      this.importError = 'No fue posible leer el archivo JSON.';
    }
  }

  closeDesignImporter(): void {
    if (this.importingDesign) return;
    this.showImportDialog = false;
  }

  functionalTestSections(): VisualInvitationSection[] {
    return this.design.sections.filter((section) => section.enabled !== false && ['rsvp', 'dedications', 'songs', 'album', 'guestPass'].includes(section.type));
  }

  selectedFunctionalTestSection(): VisualInvitationSection | undefined {
    return this.functionalTestSections().find((section) => section.id === this.functionalTestSectionId) || this.functionalTestSections()[0];
  }

  functionalTestLabel(section: VisualInvitationSection): string {
    return this.functionalTestLabels[section.type as FunctionalTestType] || section.title || 'Función';
  }

  openFunctionalTest(): void {
    const sections = this.functionalTestSections();
    if (!sections.length) {
      this.flash('Agrega RSVP, dedicatorias, DJ, álbum o pase para poder probar funciones.');
      return;
    }
    this.functionalTestSectionId = sections[0].id;
    this.functionalTestView = 'guided';
    this.functionalTestDevice = this.device;
    this.resetFunctionalTest();
    this.prepareFunctionalTestPreview(sections[0]);
    this.showFunctionalTest = true;
  }

  closeFunctionalTest(): void {
    this.showFunctionalTest = false;
    this.functionalTestFeedback = '';
  }

  selectFunctionalTestSection(sectionId: string): void {
    this.functionalTestSectionId = sectionId;
    this.resetFunctionalTest();
    const section = this.selectedFunctionalTestSection();
    if (section) this.prepareFunctionalTestPreview(section);
  }

  functionalTestArtboardWidth(): number {
    return this.functionalTestDevice === 'mobile' ? 390 : this.functionalTestDevice === 'tablet' ? 768 : 1180;
  }

  functionalTestPublicViewportStyle(): Record<string, string> {
    return { width: `${this.functionalTestArtboardWidth()}px` };
  }

  functionalTestFileChanged(input: HTMLInputElement, section?: VisualInvitationSection): void {
    this.functionalTestData.albumFileName = input.files?.[0]?.name || '';
    this.functionalTestFeedback = '';
    this.functionalTestSuccess = false;
    if (section && this.functionalTestData.albumFileName) this.runFunctionalTest(section);
  }

  runFunctionalTest(section: VisualInvitationSection): void {
    const data = this.functionalTestData;
    this.functionalTestSuccess = false;
    if (section.type === 'rsvp') {
      if (!data.name.trim() || !data.contact.trim() || !data.response) return this.functionalTestError('Completa nombre, correo o teléfono y respuesta de asistencia.');
      this.functionalTestSuccess = true;
      this.functionalTestFeedback = `Simulación correcta: ${data.name.trim()} quedaría como ${data.response}${data.companions > 0 ? ` con ${data.companions} acompañante(s)` : ''}.`;
    } else if (section.type === 'dedications') {
      if (!data.publicName.trim() || !data.dedication.trim()) return this.functionalTestError('Escribe el nombre público y la dedicatoria.');
      this.functionalTestSuccess = true;
      this.functionalTestFeedback = 'La dedicatoria quedaría pendiente de moderación según la configuración del evento.';
    } else if (section.type === 'songs') {
      if (!data.song.trim() && !data.sourceUrl.trim()) return this.functionalTestError('Escribe una canción o pega un enlace de Spotify/YouTube.');
      this.functionalTestSuccess = true;
      this.functionalTestFeedback = `La solicitud${data.song.trim() ? ` “${data.song.trim()}”` : ''} quedaría registrada para revisión del DJ.`;
    } else if (section.type === 'album') {
      if (!data.albumFileName) return this.functionalTestError('Selecciona una imagen para comprobar el flujo del álbum.');
      this.functionalTestSuccess = true;
      this.functionalTestFeedback = `${data.albumFileName} quedaría pendiente de aprobación. El archivo no se subió durante esta prueba.`;
    } else if (section.type === 'guestPass') {
      if (!data.passEmail.trim() && !data.passPhone.trim()) return this.functionalTestError('Escribe un correo o teléfono para simular la identificación.');
      this.functionalTestSuccess = true;
      this.functionalTestFeedback = 'Identificación simulada. En la invitación publicada se consultaría el invitado real y se mostraría su pase.';
    }
  }

  resetFunctionalTest(): void {
    this.functionalTestData = this.emptyFunctionalTestData();
    this.functionalTestFeedback = '';
    this.functionalTestSuccess = false;
    this.functionalTestGuest = undefined;
    this.functionalTestDedications = [];
    this.functionalTestAlbumAssets = [];
    this.functionalTestResetKey += 1;
  }

  simulateVisualRsvp(data: { name: string; email?: string; response: string; companions?: number }): void {
    if (!data.name?.trim()) return this.functionalTestError('Escribe el nombre del invitado antes de enviar.');
    this.functionalTestSuccess = true;
    this.functionalTestFeedback = `RSVP válido: ${data.name.trim()} quedaría como ${data.response}${Number(data.companions || 0) > 0 ? ` con ${Number(data.companions)} acompañante(s)` : ''}.`;
  }

  simulateVisualDedication(data: { publicName: string; message: string }): void {
    if (!data.message?.trim()) return this.functionalTestError('Escribe una dedicatoria antes de enviarla.');
    this.functionalTestDedications = [{ id: 'sandbox-dedication', publicName: data.publicName || 'Invitado', message: data.message.trim(), type: 'dedication', status: 'approved' }];
    this.functionalTestSuccess = true;
    this.functionalTestFeedback = 'La dedicatoria quedaría pendiente de moderación según la configuración del evento.';
  }

  simulateVisualSong(data: { title: string; sourceUrl: string }): void {
    if (!data.title?.trim() && !data.sourceUrl?.trim()) return this.functionalTestError('Escribe una canción o pega un enlace de Spotify/YouTube.');
    this.functionalTestSuccess = true;
    this.functionalTestFeedback = 'La solicitud quedaría registrada para revisión del DJ.';
  }

  simulateVisualPhoto(file: File): void {
    this.functionalTestData.albumFileName = file.name;
    this.functionalTestSuccess = true;
    this.functionalTestFeedback = `${file.name} quedaría pendiente de aprobación. El archivo no se subió durante esta prueba.`;
    const reader = new FileReader();
    reader.onload = () => this.functionalTestAlbumAssets = [{ url: String(reader.result || ''), uploaderName: 'Vista previa local' }];
    reader.readAsDataURL(file);
  }

  simulateVisualGuestAccess(data: { email: string; phone: string }): void {
    if (!data.email?.trim() && !data.phone?.trim()) return this.functionalTestError('Escribe un correo o teléfono para simular la identificación.');
    this.functionalTestGuest = { id: 'sandbox-guest', name: this.previewGuest.name, email: data.email || undefined, group: this.previewGuest.group, roles: ['vip'], allowedCompanions: this.previewGuest.allowedCompanions, status: 'pending', checkInCode: 'SANDBOX-PASS', tableName: this.previewGuest.tableName, seatLabel: this.previewGuest.seatLabel };
    this.functionalTestSuccess = true;
    this.functionalTestFeedback = 'Identificación simulada. En la invitación publicada se consultaría el invitado real y se mostraría su pase.';
  }

  functionalTestMessage(type: FunctionalTestType): string {
    return this.selectedFunctionalTestSection()?.type === type ? this.functionalTestFeedback : '';
  }

  private prepareFunctionalTestPreview(section: VisualInvitationSection): void {
    if (!this.invitation) return;
    this.functionalTestPreviewInvitation = {
      ...this.invitation,
      content: {
        ...(this.invitation.content || {}),
        visualDesign: { ...this.design, active: true, sections: [this.clone(section)] }
      }
    };
  }

  private functionalTestError(message: string): void {
    this.functionalTestFeedback = message;
    this.functionalTestSuccess = false;
  }

  private emptyFunctionalTestData(): FunctionalTestData {
    return {
      name: '', contact: '', response: '', companions: 0, dietary: '', message: '', publicName: '', dedication: '',
      song: '', artist: '', sourceUrl: '', songDedication: '', albumFileName: '', passEmail: '', passPhone: ''
    };
  }

  importReviewCount(status: VisualDesignImportReviewStatus): number {
    return this.importReview.filter((item) => item.status === status).length;
  }

  reviewImportedSection(item: VisualDesignImportReviewItem): void {
    if (!item.sectionId) return;
    this.selectedSectionId = item.sectionId;
    this.clearLayerSelection();
    this.mobilePanel = 'canvas';
    this.showImportDialog = false;
    setTimeout(() => {
      const target = Array.from(document.querySelectorAll<HTMLElement>('[data-section-id]'))
        .find((element) => element.dataset['sectionId'] === item.sectionId);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  beginImportMapping(item: VisualDesignImportReviewItem): void {
    if (!item.sectionId) return;
    this.importMappingSectionId = item.sectionId;
    this.importMappingType = 'rsvp';
    this.importMappingError = '';
    this.suggestImportBindings();
  }

  importMappingSection(): VisualInvitationSection | undefined {
    return this.design.sections.find((section) => section.id === this.importMappingSectionId);
  }

  importMappingLayers(section: VisualInvitationSection): VisualInvitationLayer[] {
    return section.layers.filter((layer) => layer.type === 'field' || layer.type === 'button');
  }

  importBindingOptions(): Array<{ binding: string; label: string }> {
    if (this.importMappingType === 'rsvp') return this.rsvpControlCatalog.map(({ binding, label }) => ({ binding, label }));
    if (this.importMappingType === 'dedications') return this.dedicationControlCatalog.filter((item) => item.binding !== 'dedication.wall').map(({ binding, label }) => ({ binding, label }));
    if (this.importMappingType === 'songs') return this.songControlCatalog.map(({ binding, label }) => ({ binding, label }));
    if (this.importMappingType === 'album') return this.albumControlCatalog.filter((item) => item.binding === 'album.upload').map(({ binding, label }) => ({ binding, label }));
    return this.guestPassControlCatalog.filter((item) => ['pass.email', 'pass.phone', 'pass.identify'].includes(item.binding)).map(({ binding, label }) => ({ binding, label }));
  }

  changeImportMappingType(type: ImportMappingModuleType): void {
    this.importMappingType = type;
    this.importMappingError = '';
    this.suggestImportBindings();
  }

  setImportLayerBinding(layerId: string, binding: string): void {
    this.importLayerBindings = { ...this.importLayerBindings, [layerId]: binding };
    this.importMappingError = '';
  }

  applyImportMapping(): void {
    const section = this.importMappingSection();
    if (!section) return;
    const mapped = this.importMappingLayers(section).filter((layer) => this.importLayerBindings[layer.id]);
    if (!mapped.length) {
      this.importMappingError = 'Relaciona al menos un campo o botón antes de conectar la función.';
      return;
    }
    const bindings = mapped.map((layer) => this.importLayerBindings[layer.id]);
    const duplicate = bindings.find((binding, index) => bindings.indexOf(binding) !== index);
    if (duplicate) {
      this.importMappingError = 'Cada dato funcional solo puede asignarse una vez.';
      return;
    }
    section.type = this.importMappingType;
    section.moduleStyle = { ...this.defaultModuleStyle(), ...(section.moduleStyle || {}) };
    section.pluginSettings = { ...this.defaultPluginSettings(section.type), ...(section.pluginSettings || {}) };
    mapped.forEach((layer) => {
      const binding = this.importLayerBindings[layer.id];
      layer.binding = binding;
      layer.type = this.isImportActionBinding(binding) ? 'button' : 'field';
      layer.name = layer.name || this.importBindingOptions().find((item) => item.binding === binding)?.label || 'Control funcional';
    });
    this.completeMappedFunctionalSection(section);
    const review = this.importReview.find((item) => item.sectionId === section.id);
    if (review) {
      review.status = 'connected';
      review.detail = `${this.importMappingModules.find((item) => item.value === this.importMappingType)?.label || 'La función'} quedó conectada con los controles importados.`;
    }
    this.importWarnings = this.importWarnings.filter((warning) => !warning.startsWith('Se encontraron formularios, pero no fue posible identificar'));
    this.importWarnings.push(`${section.title || 'La sección'} se conectó manualmente como ${this.importMappingModules.find((item) => item.value === this.importMappingType)?.label || 'módulo funcional'}.`);
    this.importMappingSectionId = '';
    this.importMappingError = '';
    this.autosaveState = 'Cambios pendientes';
  }

  cancelImportMapping(): void {
    this.resetImportMapping();
  }

  discardImportedDesign(): void {
    if (!this.importSummary) return;
    for (let step = 0; step < this.importHistorySteps; step++) this.undo();
    this.importHistorySteps = 0;
    this.importSummary = '';
    this.importWarnings = [];
    this.importReview = [];
    this.resetImportMapping();
    this.autosaveState = this.hasUnsavedChanges ? 'Cambios pendientes' : 'Guardado';
  }

  async importDesign(): Promise<void> {
    if (this.importingDesign) return;
    this.error = '';
    this.importError = '';
    this.importWarnings = [];
    this.importSummary = '';
    this.importReview = [];
    this.resetImportMapping();
    this.importingDesign = true;
    try {
      let result;
      if (this.importSource === 'json' || this.importSource === 'ai') {
        result = this.designImporter.fromJson(this.importJsonSource.trim());
      } else if (this.importSource === 'catalog' && this.invitation?.slug) {
        result = await this.designImporter.fromUrl(this.templatePreviewUrl(this.importTemplateKey), this.design.theme || this.themePresets[0].theme);
      } else if (this.importSource === 'current' && this.invitation?.content?.customHtml) {
        result = await this.designImporter.fromHtml(this.invitation.content.customHtml, this.invitation.content.customCss || '', this.design.theme || this.themePresets[0].theme);
      } else if (this.importSource === 'current' && this.invitation?.slug) {
        const templateKey = this.invitation.content?.sourceTemplateKey || this.invitation.content?.template || 'envelope-cards';
        result = templateKey === 'visual-builder'
          ? this.designImporter.fromJson(JSON.stringify(this.design))
          : await this.designImporter.fromUrl(this.templatePreviewUrl(templateKey), this.design.theme || this.themePresets[0].theme);
      } else {
        const source = this.importSource === 'current' ? this.currentTemplateHtml() : { html: this.importHtmlSource, css: this.importCssSource };
        if (!source.html.trim()) throw new Error('Agrega HTML o selecciona una plantilla que tenga contenido para importar.');
        result = await this.designImporter.fromHtml(source.html, source.css, this.design.theme || this.themePresets[0].theme);
      }
      this.recordHistory();
      this.importHistorySteps = 1;
      const imported = this.regenerateIds(this.clone(result.design));
      if (this.importStrategy === 'append') {
        this.design.sections.push(...imported.sections);
        this.design.assets = [...(this.design.assets || []), ...(imported.assets || [])];
      } else {
        this.design = imported;
      }
      this.design.active = true;
      this.design.theme = this.design.theme || this.inferTheme();
      this.normalizeModuleStyles();
      this.selectedSectionId = this.importStrategy === 'append' ? imported.sections[0]?.id || this.selectedSectionId : this.design.sections[0]?.id || '';
      this.clearLayerSelection();
      this.importWarnings = result.warnings;
      this.importSummary = `${result.stats.sections} sección(es) y ${result.stats.layers} elemento(s) importados.`;
      this.importReview = result.review.map((item) => ({ ...item, sectionId: imported.sections[item.sectionIndex]?.id }));
      this.autosaveState = 'Cambios pendientes';
    } catch (error) {
      this.importError = error instanceof Error ? error.message : 'No fue posible importar el diseño.';
    } finally {
      this.importingDesign = false;
    }
  }

  addImportedModule(type: 'rsvp' | 'countdown' | 'locations' | 'album'): void {
    if (!this.importSummary || this.designHasSectionType(type)) return;
    const labels = { rsvp: 'Confirmación RSVP', countdown: 'Cuenta regresiva', locations: 'Ubicación y mapa', album: 'Álbum colectivo' };
    this.addSection(type, labels[type]);
    this.importHistorySteps++;
    const section = this.design.sections[this.design.sections.length - 1];
    this.importReview.push({ sectionIndex: this.design.sections.length - 1, sectionId: section.id, status: 'connected',
      title: labels[type], detail: 'Módulo nativo conectado con los datos del evento. Revisa su configuración antes de publicar.' });
    this.importWarnings = this.importWarnings.filter((warning) => !warning.startsWith('Este diseño es solo visual'));
    this.autosaveState = 'Cambios pendientes';
  }

  designHasSectionType(type: string): boolean {
    return this.design.sections.some((section) => section.type === type);
  }

  private resetImportMapping(): void {
    this.importMappingSectionId = '';
    this.importLayerBindings = {};
    this.importMappingError = '';
  }

  private suggestImportBindings(): void {
    const section = this.importMappingSection();
    this.importLayerBindings = {};
    if (!section) return;
    const used = new Set<string>();
    for (const layer of this.importMappingLayers(section)) {
      const binding = this.guessImportBinding(layer, this.importMappingType);
      if (binding && !used.has(binding)) {
        this.importLayerBindings[layer.id] = binding;
        used.add(binding);
      }
    }
  }

  private guessImportBinding(layer: VisualInvitationLayer, type: ImportMappingModuleType): string {
    const text = String(`${layer.name || ''} ${layer.text || ''} ${layer.placeholder || ''}`)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const action = layer.type === 'button' || /enviar|confirmar|guardar|subir|cargar|consultar|validar|abrir/.test(text);
    if (type === 'rsvp') {
      if (action) return 'rsvp.submit';
      if (/acompan|invitados extra/.test(text)) return 'rsvp.companions';
      if (/alerg|restric|diet|aliment/.test(text)) return 'rsvp.dietaryRestrictions';
      if (/asist|respuesta|confirmacion/.test(text)) return 'rsvp.response';
      if (/mensaje|comentario|nota/.test(text)) return 'rsvp.message';
      if (/correo|email|mail|telefono|phone|whatsapp/.test(text)) return 'rsvp.email';
      if (/nombre|invitado/.test(text)) return 'rsvp.name';
    }
    if (type === 'dedications') {
      if (action) return 'dedication.submit';
      if (/mensaje|dedicator|deseo|recuerdo|brindis/.test(text)) return 'dedication.message';
      if (/nombre|autor/.test(text)) return 'dedication.publicName';
    }
    if (type === 'songs') {
      if (action) return 'song.submit';
      if (/spotify|youtube|url|enlace|link/.test(text)) return 'song.sourceUrl';
      if (/artista|interprete/.test(text)) return 'song.artist';
      if (/dedicator|mensaje|para quien/.test(text)) return 'song.dedication';
      if (/cancion|titulo|tema/.test(text)) return 'song.title';
    }
    if (type === 'album' && (action || /foto|imagen|archivo/.test(text))) return 'album.upload';
    if (type === 'guestPass') {
      if (action) return 'pass.identify';
      if (/telefono|phone|whatsapp|celular/.test(text)) return 'pass.phone';
      if (/correo|email|mail/.test(text)) return 'pass.email';
    }
    return '';
  }

  private isImportActionBinding(binding: string): boolean {
    return ['rsvp.submit', 'dedication.submit', 'song.submit', 'album.upload', 'pass.identify'].includes(binding);
  }

  private completeMappedFunctionalSection(section: VisualInvitationSection): void {
    const existing = new Set(section.layers.map((layer) => layer.binding).filter(Boolean));
    let topZ = Math.max(0, ...section.layers.map((layer) => layer.zIndex || 0));
    if (section.type === 'rsvp') {
      this.ensureRsvpPluginDesign(section);
      for (const definition of this.rsvpLayerDefinitions()) {
        if (existing.has(definition.binding)) continue;
        section.layers.push(this.createRsvpLayer(section, definition, ++topZ));
      }
      section.pluginSettings = { ...(section.pluginSettings || {}), nativeFieldPartsSeparated: false };
      this.ensureSeparatedRsvpFieldParts(section);
      section.pluginDesign = { ...(section.pluginDesign || {}), layout: 'free' };
      section.height = Math.max(section.height, 820);
    } else if (section.type === 'dedications') {
      for (const definition of this.dedicationLayerDefinitions(section)) {
        if (!existing.has(definition.binding)) section.layers.push(this.createDedicationLayer(section, definition, ++topZ));
      }
      this.ensureImportedFieldLabels(section, ['dedication.publicName', 'dedication.message'], topZ);
      section.height = Math.max(section.height, 760);
    } else if (section.type === 'songs') {
      for (const definition of this.songLayerDefinitions(section)) {
        if (!existing.has(definition.binding)) section.layers.push(this.createSongLayer(definition, ++topZ));
      }
      this.ensureImportedFieldLabels(section, ['song.title', 'song.sourceUrl', 'song.artist', 'song.dedication'], topZ);
      section.height = Math.max(section.height, 760);
    } else if (section.type === 'album') {
      for (const definition of this.albumLayerDefinitions(section)) {
        if (!existing.has(definition.binding)) section.layers.push(this.createAlbumLayer(definition, ++topZ));
      }
      section.height = Math.max(section.height, 760);
    } else if (section.type === 'guestPass') {
      for (const definition of this.guestPassLayerDefinitions(section)) {
        if (!existing.has(definition.binding)) section.layers.push(this.createGuestPassLayer(definition, ++topZ));
      }
      this.ensureImportedFieldLabels(section, ['pass.email', 'pass.phone'], topZ);
      section.height = Math.max(section.height, 760);
    }
  }

  private ensureImportedFieldLabels(section: VisualInvitationSection, bindings: string[], startingZ: number): void {
    const existingLabels = new Set(section.layers.map((layer) => layer.binding).filter((binding) => String(binding || '').startsWith('display.label.')));
    let topZ = Math.max(startingZ, ...section.layers.map((layer) => layer.zIndex || 0));
    const labels: VisualInvitationLayer[] = [];
    for (const field of section.layers.filter((layer) => layer.type === 'field' && bindings.includes(layer.binding || ''))) {
      const labelBinding = `display.label.${field.binding}`;
      if (existingLabels.has(labelBinding)) continue;
      labels.push(this.separateRsvpFieldLayer(field, ++topZ));
      existingLabels.add(labelBinding);
    }
    section.layers.push(...labels);
    section.pluginSettings = { ...(section.pluginSettings || {}), nativeFieldPartsSeparated: true };
  }

  private templatePreviewUrl(templateKey: string): string {
    const slug = this.invitation?.slug || '';
    return `${window.location.origin}/new/i/${encodeURIComponent(slug)}?tpl=${encodeURIComponent(templateKey)}&preview=true&clean=1&visualImport=1`;
  }

  private currentTemplateHtml(): { html: string; css: string } {
    const content = this.invitation?.content;
    if (content?.customHtml) return { html: content.customHtml, css: content.customCss || '' };
    const templateKey = content?.sourceTemplateKey || content?.template || 'classic-vertical';
    return generateTemplateHtml(this.currentTemplateData(templateKey));
  }

  private currentTemplateData(templateKey: string): TemplateData {
    const content = this.invitation?.content || {};
    const envelope = content.digitalEnvelope || {};
    return {
      templateKey, palette: content.palette, eventDate: this.event?.date, coverImageUrl: content.coverImageUrl, brandLogoUrl: content.brandLogoUrl,
      headline: content.headline || this.event?.title || 'Nuestra celebración', subheadline: content.subheadline || '', message: content.message || '',
      storyTitle: content.storyTitle || 'Nuestra historia', storyBody: content.storyBody || '', dressCode: content.dressCode || '',
      giftIntroText: content.giftSettings?.introText || '', envelopeBank: envelope.bank || '', envelopeHolder: envelope.holder || '',
      envelopeAccount: envelope.account || '', envelopeClabe: envelope.clabe || '', envelopeNote: envelope.note || '',
      dedicationIntroText: content.dedicationSettings?.introText || '', lodgingText: content.lodging?.map((item) => item.name).filter(Boolean).join(', ') || '',
      itinerary: (content.itinerary || []).map((item) => ({ time: item.time || '', title: item.title || '', description: item.description || '' })),
      locations: (content.locations || []).map((item) => ({ name: item.name || '', address: item.address || '', notes: item.notes || '', mapUrl: item.mapUrl })),
      giftRegistry: (content.giftRegistry || []).map((item) => ({ store: item.store || '', title: item.title || '', note: item.note || '', url: item.url })),
      lodgingList: (content.lodging || []).map((item) => ({ name: item.name || '', description: item.description || '', url: item.url })),
      rsvpTitle: 'Confirma tu asistencia', rsvpDeadlineText: '', albumTitle: 'Álbum colectivo', albumNote: '', djTitle: 'Peticiones al DJ', djNote: ''
    };
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
    if (!this.invitation || this.saving || this.autosaving || this.publishing) return;
    this.saving = true;
    this.error = '';
    const request = this.persistDesign();
    const snapshot = this.designSnapshot();
    request.subscribe({
      next: ({ invitation }) => { this.acceptSavedDesign(invitation, snapshot); this.saving = false; this.flash(this.hasUnsavedChanges ? 'Guardado; hay cambios nuevos pendientes.' : 'Diseño guardado.'); },
      error: (error) => { this.saving = false; this.error = this.designRequestError(error, 'No fue posible guardar el diseño.'); }
    });
  }

  publish(): void {
    if (!this.invitation || this.saving || this.autosaving || this.publishing) return;
    this.publishing = true;
    this.error = '';
    const id = this.invitation._id || this.invitation.id || '';
    const request = this.persistDesign();
    const snapshot = this.designSnapshot();
    request.pipe(switchMap(() => this.api.publishInvitation(id, 'visual'))).subscribe({
      next: ({ invitation }) => {
        this.acceptSavedDesign(invitation, snapshot);
        this.publishing = false;
        this.showPublishAudit = false;
        this.flash(this.hasUnsavedChanges ? 'Publicado; hay cambios nuevos pendientes.' : 'Diseño publicado.');
        if (!this.hasUnsavedChanges) this.openPublicVersion();
      },
      error: (error) => { this.publishing = false; this.error = this.designRequestError(error, 'No fue posible publicar.'); }
    });
  }

  undo(): void {
    const previous = this.undoStack.pop();
    if (!previous) return;
    this.redoStack.push(this.editorHistoryState());
    this.design = previous.design;
    if (this.invitation) {
      this.invitation.content = previous.content;
      this.invitation.rsvpSettings = previous.rsvpSettings;
    }
    this.restoreSelection();
  }

  redo(): void {
    const next = this.redoStack.pop();
    if (!next) return;
    this.undoStack.push(this.editorHistoryState());
    this.design = next.design;
    if (this.invitation) {
      this.invitation.content = next.content;
      this.invitation.rsvpSettings = next.rsvpSettings;
    }
    this.restoreSelection();
  }

  back(): void {
    const id = this.invitation?._id || this.invitation?.id;
    this.router.navigate(['/new/invitations', id, 'editor']);
  }

  openPreview(): void {
    this.openResponsivePreview();
  }

  openDraftPreview(): void {
    if (!this.invitation?.slug) return;
    const previewWindow = window.open('', '_blank');
    const openSavedDraft = () => {
      const id = this.invitation?._id || this.invitation?.id || '';
      const url = `/new/i/${this.invitation?.slug}?preview=true&previewId=${encodeURIComponent(id)}`;
      if (previewWindow) previewWindow.location.href = url;
      else window.open(url, '_blank');
    };
    if (!this.hasUnsavedChanges) {
      openSavedDraft();
      return;
    }
    const snapshot = this.designSnapshot();
    this.saving = true;
    this.persistDesign().subscribe({
      next: ({ invitation }) => {
        this.acceptSavedDesign(invitation, snapshot);
        this.saving = false;
        openSavedDraft();
      },
      error: (error) => {
        this.saving = false;
        if (previewWindow) previewWindow.close();
        this.error = this.designRequestError(error, 'No fue posible guardar el borrador para previsualizarlo.');
      }
    });
  }

  openPublicVersion(): void {
    if (this.invitation?.status !== 'published' || !this.invitation.slug) return;
    window.open(`/new/i/${this.invitation.slug}`, '_blank');
  }

  private persistDesign() {
    const id = this.invitation?._id || this.invitation?.id || '';
    this.design.active = true;
    this.normalizeDesignGeometry();
    this.syncLegacyGallery();
    const content = this.stripMongoMetadata({
      ...this.invitation?.content,
      galleryItems: (this.invitation?.content.galleryItems || []).filter((item) => item.url.trim()),
      visualDesignDraft: this.design
    });
    return this.api.updateInvitation(id, {
      content,
      rsvpSettings: this.stripMongoMetadata(this.invitation?.rsvpSettings || {})
    });
  }

  private designRequestError(error: { error?: { message?: string; details?: { issues?: Array<{ path?: Array<string | number>; message?: string }>; fieldErrors?: Record<string, string[]> } } }, fallback: string): string {
    const details = error?.error?.details;
    const issues = details?.issues?.slice(0, 3).map((issue) => {
      const path = issue.path?.map((part) => typeof part === 'number' ? `[${part}]` : part).join('.').replace(/\.\[/g, '[') || 'diseño';
      return `${path}: ${issue.message || 'valor inválido'}`;
    });
    if (issues?.length) return `Revisa estos campos antes de guardar: ${issues.join('; ')}`;
    const fieldErrors = details?.fieldErrors;
    if (fieldErrors && Object.values(fieldErrors).some((messages) => messages?.length)) {
      return `Revisa el diseño: ${Object.entries(fieldErrors).flatMap(([field, messages]) => messages.map((message) => `${field}: ${message}`)).slice(0, 3).join('; ')}`;
    }
    return error?.error?.message || fallback;
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
    return buildCompleteDesign(key, this.invitation?.content || {}, this.event, (prefix) => this.uid(prefix), includeModules);
  }

  private makeSection(type: string, title: string, color: string, height: number): VisualInvitationSection {
    return {
      id: this.uid('section'), type, title, enabled: true, layout: 'canvas', height,
      background: { color, overlay: 0 },
      moduleStyle: type === 'hero' || type === 'custom' ? undefined : this.defaultModuleStyle(),
      pluginSettings: this.isConfigurablePlugin(type) ? this.defaultPluginSettings(type) : undefined,
      pluginDesign: type === 'rsvp' ? this.defaultRsvpPluginDesign() : undefined,
      layers: []
    };
  }

  private defaultModuleStyle(): NonNullable<VisualInvitationSection['moduleStyle']> {
    return { layout: 'grid', columns: 2, alignment: 'center', surface: 'solid', cardStyle: 'bordered', gap: 11, showTitle: true };
  }

  private normalizeModuleStyles(): void {
    this.normalizeDesignGeometry();
    for (const section of this.design.sections) {
      section.background = { color: '#ffffff', overlay: 0, ...(section.background || {}) };
      if (section.type === 'hero' || section.type === 'custom') continue;
      section.moduleStyle = { ...this.defaultModuleStyle(), ...(section.moduleStyle || {}) };
      if (this.isConfigurablePlugin(section.type)) section.pluginSettings = { ...this.defaultPluginSettings(section.type), ...(section.pluginSettings || {}) };
      if (section.type === 'rsvp') {
        this.ensureRsvpPluginDesign(section);
        section.height = Math.max(section.height, section.pluginDesign?.layout === 'free' ? Number(section.pluginDesign.minHeight || 560) + 150 : (this.isXvBurgundy() ? 840 : 820));
        this.ensureRsvpCanvasLayers(section);
        this.ensureSeparatedRsvpFieldParts(section);
      }
      if (section.type === 'dedications') {
        section.height = Math.max(section.height, this.isXvBurgundy() ? 680 : 760);
        this.ensureDedicationCanvasLayers(section);
      }
      if (section.type === 'songs') {
        section.height = Math.max(section.height, this.isXvBurgundy() ? 680 : 760);
        this.ensureSongCanvasLayers(section);
      }
      if (section.type === 'album') {
        section.height = Math.max(section.height, this.isXvBurgundy() ? 680 : 760);
        this.ensureAlbumCanvasLayers(section);
      }
      if (section.type === 'guestPass') {
        section.height = Math.max(section.height, 760);
        this.ensureGuestPassCanvasLayers(section);
      }
      if (section.type === 'guestActivity') {
        section.height = Math.max(section.height, 760);
        this.ensureGuestActivityCanvasLayers(section);
      }
      if (section.type === 'countdown') {
        section.height = Math.max(section.height, this.isXvBurgundy() ? 620 : 760);
        this.ensureCountdownCanvasLayers(section);
      }
      if (section.type === 'locations') {
        this.ensureLocationCanvasLayers(section);
      }
      if (section.type === 'gifts') {
        this.ensureGiftCanvasLayers(section);
      }
      if (section.type === 'itinerary') {
        this.ensureItineraryCanvasLayers(section);
      }
      if (section.type === 'dressCode') {
        this.ensureDressCodeCanvasLayers(section);
      }
      if (section.type === 'lodging') {
        this.ensureLodgingCanvasLayers(section);
      }
      if (section.type === 'gallery') {
        this.ensureGalleryCanvasLayers(section);
      }
    }
  }

  private ensureRsvpPluginDesign(section: VisualInvitationSection): void {
    const defaults = this.defaultRsvpPluginDesign();
    const existing = section.pluginDesign || {};
    const existingParts = existing.parts || {};
    const parts: Record<string, VisualPluginPartDesign> = {};
    for (const [key, value] of Object.entries(defaults.parts || {})) parts[key] = { ...value, ...(existingParts[key] || {}) };
    for (const [key, value] of Object.entries(existingParts)) if (!parts[key]) parts[key] = { ...value };
    section.pluginDesign = { ...defaults, ...existing, parts };
  }

  private defaultRsvpPluginDesign(): NonNullable<VisualInvitationSection['pluginDesign']> {
    const base = (x: number, y: number, width: number, height: number, extras: Partial<VisualPluginPartDesign> = {}): VisualPluginPartDesign => ({
      x, y, width, height, fontFamily: this.design?.theme?.bodyFont || 'Arial, sans-serif', fontSize: 14, fontWeight: 500,
      color: this.design?.theme?.textColor || '#292523', backgroundColor: '#ffffff', borderColor: '#d5cbc4', borderWidth: 1,
      borderRadius: 8, padding: 10, textAlign: 'left', shape: 'rectangle', ...extras
    });
    return {
      layout: 'flow', minHeight: 560,
      parts: {
        eyebrow: base(15, 2, 70, 6, { fontSize: 11, fontWeight: 700, textAlign: 'center', backgroundColor: 'transparent', borderWidth: 0, padding: 2 }),
        title: base(10, 9, 80, 10, { fontFamily: this.design?.theme?.headingFont || 'Georgia, serif', fontSize: 34, fontWeight: 700, textAlign: 'center', backgroundColor: 'transparent', borderWidth: 0, padding: 3 }),
        intro: base(12, 20, 76, 8, { textAlign: 'center', backgroundColor: 'transparent', borderWidth: 0, padding: 3 }),
        name: base(5, 31, 42, 13), contact: base(53, 31, 42, 13), response: base(5, 47, 42, 13), companions: base(53, 47, 42, 13),
        dietary: base(5, 63, 42, 15), message: base(53, 63, 42, 15),
        submit: base(30, 82, 40, 10, { textAlign: 'center', fontWeight: 700, color: this.design?.theme?.buttonTextColor || '#ffffff', backgroundColor: this.design?.theme?.buttonBackgroundColor || '#292523', borderWidth: 0, borderRadius: this.design?.theme?.buttonRadius || 6 }),
        feedback: base(15, 92, 70, 6, { textAlign: 'center', backgroundColor: '#edf5fb', borderWidth: 0, fontSize: 12 })
      }
    };
  }

  private ensureRsvpCanvasLayers(section: VisualInvitationSection): void {
    if (section.layers.some((layer) => this.isRsvpFunctionalLayer(layer))) return;
    const definitions = this.rsvpLayerDefinitions();
    const topZ = Math.max(0, ...section.layers.map((layer) => layer.zIndex || 0));
    section.layers.push(...definitions.map((definition, index) => this.createRsvpLayer(section, definition, topZ + index + 1)));
    section.pluginDesign = { ...(section.pluginDesign || {}), layout: 'free' };
  }

  private ensureSeparatedRsvpFieldParts(section: VisualInvitationSection): void {
    if (section.pluginSettings?.['nativeFieldPartsSeparated'] === true) return;
    const fields = section.layers.filter((layer) => layer.type === 'field' && String(layer.binding || '').startsWith('rsvp.'));
    let topZ = Math.max(0, ...section.layers.map((layer) => layer.zIndex || 0));
    section.layers.push(...fields.map((field) => this.separateRsvpFieldLayer(field, ++topZ)));
    section.pluginSettings = { ...(section.pluginSettings || {}), nativeFieldPartsSeparated: true };
  }

  private separateRsvpFieldLayer(field: VisualInvitationLayer, zIndex: number): VisualInvitationLayer {
    const splitLayout = (layout: { x: number; y: number; width: number; height: number; rotation?: number }) => {
      const labelHeight = Math.min(5, Math.max(3, layout.height * .28));
      const labelLayout = { ...layout, height: labelHeight };
      layout.y = Math.min(100 - 4, layout.y + labelHeight + 1);
      layout.height = Math.max(4, layout.height - labelHeight - 1);
      return labelLayout;
    };
    const baseLayout = splitLayout(field);
    const label = this.newLayer('text', field.text || 'Etiqueta', baseLayout.x, baseLayout.y, baseLayout.width, baseLayout.height, Math.max(10, Number(field.style?.fontSize || 14) * .82));
    label.name = `Etiqueta: ${field.text || 'Campo'}`;
    label.binding = `display.label.${field.binding}`;
    label.hidden = field.hidden;
    label.zIndex = zIndex;
    label.style = {
      ...(label.style || {}), color: field.style?.color, fontFamily: field.style?.fontFamily,
      fontWeight: 600, textAlign: field.style?.textAlign || 'left', backgroundColor: 'transparent',
      borderWidth: 0, padding: 0, boxShadow: 'none'
    };
    if (field.layouts) {
      label.layouts = {};
      for (const device of ['mobile', 'tablet', 'desktop'] as DeviceMode[]) {
        const layout = field.layouts[device];
        if (layout) label.layouts[device] = splitLayout(layout);
      }
    }
    field.style = { ...(field.style || {}), showPlaceholder: field.style?.showPlaceholder !== false };
    return label;
  }

  private rsvpLayerDefinitions(): Array<{ key: RsvpPartKey; type: 'text' | 'field' | 'button'; binding: string; label: string; placeholder?: string }> {
    return [
      { key: 'eyebrow', type: 'text', binding: 'display.rsvp.eyebrow', label: 'Confirmación' },
      { key: 'title', type: 'text', binding: 'display.rsvp.title', label: 'Confirma tu asistencia' },
      { key: 'intro', type: 'text', binding: 'display.rsvp.intro', label: 'Nos encantará contar contigo.' },
      { key: 'name', type: 'field', binding: 'rsvp.name', label: 'Nombre', placeholder: 'Nombre del invitado' },
      { key: 'contact', type: 'field', binding: 'rsvp.email', label: 'Correo', placeholder: 'contacto@ejemplo.com' },
      { key: 'response', type: 'field', binding: 'rsvp.response', label: 'Respuesta' },
      { key: 'companions', type: 'field', binding: 'rsvp.companions', label: 'Acompañantes', placeholder: '0' },
      { key: 'dietary', type: 'field', binding: 'rsvp.dietaryRestrictions', label: 'Restricciones alimentarias', placeholder: 'Vegetariano, alergias...' },
      { key: 'message', type: 'field', binding: 'rsvp.message', label: 'Mensaje', placeholder: 'Mensaje opcional' },
      { key: 'submit', type: 'button', binding: 'rsvp.submit', label: 'Enviar confirmación' },
      { key: 'feedback', type: 'text', binding: 'rsvp.feedback', label: 'Aquí aparecerá la confirmación del envío' }
    ];
  }

  private dedicationLayerDefinitions(section: VisualInvitationSection): Array<{ type: 'text' | 'field' | 'button'; binding: string; label: string; placeholder?: string; x: number; y: number; width: number; height: number; fontSize?: number }> {
    return [
      { type: 'text', binding: 'display.dedications.eyebrow', label: String(this.pluginSetting(section, 'eyebrow') || 'Libro de mensajes'), x: 15, y: 5, width: 70, height: 5, fontSize: 11 },
      { type: 'text', binding: 'display.dedications.title', label: section.title || 'Dedicatorias', x: 10, y: 12, width: 80, height: 10, fontSize: 34 },
      { type: 'text', binding: 'display.dedications.intro', label: String(this.pluginSetting(section, 'introText') || 'Déjanos unas palabras para recordar.'), x: 12, y: 24, width: 76, height: 7, fontSize: 14 },
      { type: 'field', binding: 'dedication.publicName', label: 'Tu nombre', placeholder: 'Nombre público', x: 10, y: 36, width: 34, height: 13, fontSize: 14 },
      { type: 'field', binding: 'dedication.message', label: 'Mensaje', placeholder: 'Escribe tu dedicatoria...', x: 48, y: 36, width: 42, height: 20, fontSize: 14 },
      { type: 'button', binding: 'dedication.submit', label: String(this.pluginSetting(section, 'primaryButtonText') || 'Enviar dedicatoria'), x: 30, y: 60, width: 40, height: 8, fontSize: 14 },
      { type: 'text', binding: 'dedication.feedback', label: 'Aquí aparecerá el estado del envío', x: 20, y: 70, width: 60, height: 5, fontSize: 12 },
      { type: 'field', binding: 'dedication.wall', label: 'Dedicatorias aprobadas', x: 8, y: 78, width: 84, height: 18, fontSize: 13 }
    ];
  }

  private ensureDedicationCanvasLayers(section: VisualInvitationSection): void {
    if (section.layers.some((layer) => String(layer.binding || '').startsWith('dedication.') || String(layer.binding || '').startsWith('display.dedications.'))) return;
    let topZ = Math.max(0, ...section.layers.map((layer) => layer.zIndex || 0));
    const additions: VisualInvitationLayer[] = [];
    for (const definition of this.dedicationLayerDefinitions(section)) {
      const layer = this.createDedicationLayer(section, definition, ++topZ);
      if (layer.type === 'field' && !['dedication.wall'].includes(layer.binding || '')) additions.push(this.separateRsvpFieldLayer(layer, topZ));
      additions.push(layer);
    }
    section.layers.push(...additions);
    section.pluginSettings = { ...(section.pluginSettings || {}), nativeFieldPartsSeparated: true };
  }

  private createDedicationLayer(section: VisualInvitationSection, definition: ReturnType<typeof this.dedicationLayerDefinitions>[number], zIndex: number): VisualInvitationLayer {
    const isXv = this.isXvBurgundy();
    const layer = this.newLayer(definition.type, definition.label, definition.x, definition.y, definition.width, definition.height, definition.fontSize || 14);
    layer.binding = definition.binding;
    layer.placeholder = definition.placeholder;
    layer.zIndex = zIndex;
    if (definition.type === 'field') {
      layer.style = {
        ...(layer.style || {}),
        backgroundColor: isXv ? '#faf6f0' : '#ffffff',
        borderColor: isXv ? '#d4af37' : '#d5cbc4',
        borderWidth: isXv ? 1.5 : 1,
        borderStyle: 'solid',
        borderRadius: isXv ? 12 : 8,
        color: isXv ? '#5c0d18' : layer.style?.color,
        padding: 10,
        textAlign: 'left',
        showPlaceholder: true
      };
    }
    if (definition.type === 'button') {
      this.applyThemeToLayer(layer, this.design.theme || this.themePresets[0].theme);
      if (isXv) {
        layer.style = { ...(layer.style || {}), backgroundColor: '#d4af37', color: '#5c0d18', borderColor: '#d4af37', borderRadius: 30, fontWeight: 700, letterSpacing: 0.5 };
      }
    }
    if (definition.type === 'text' && isXv) {
      if (definition.binding === 'display.dedications.eyebrow') {
        layer.style = { ...(layer.style || {}), letterSpacing: 2.5, fontWeight: 700, color: '#d4af37' };
      } else if (definition.binding === 'display.dedications.title') {
        layer.style = { ...(layer.style || {}), fontFamily: "'Great Vibes', cursive", fontSize: 44, fontWeight: 700, color: '#faf6f0' };
      } else if (definition.binding === 'display.dedications.intro') {
        layer.style = { ...(layer.style || {}), color: '#e2d5c3' };
      } else if (definition.binding === 'dedication.feedback') {
        layer.style = { ...(layer.style || {}), color: '#e2d5c3' };
      }
    }
    if (definition.binding === 'dedication.wall') layer.style = { ...(layer.style || {}), backgroundColor: 'transparent', borderWidth: 0, padding: 0 };
    return layer;
  }

  private songLayerDefinitions(section: VisualInvitationSection): Array<{ type: 'text' | 'field' | 'button'; binding: string; label: string; placeholder?: string; x: number; y: number; width: number; height: number; fontSize?: number }> {
    return [
      { type: 'text', binding: 'display.songs.eyebrow', label: String(this.pluginSetting(section, 'eyebrow') || 'Música'), x: 15, y: 5, width: 70, height: 5, fontSize: 11 },
      { type: 'text', binding: 'display.songs.title', label: section.title || 'Pide una canción', x: 10, y: 12, width: 80, height: 10, fontSize: 34 },
      { type: 'text', binding: 'display.songs.intro', label: String(this.pluginSetting(section, 'introText') || 'Ayúdanos a crear la música de este momento.'), x: 12, y: 24, width: 76, height: 7, fontSize: 14 },
      { type: 'field', binding: 'song.title', label: String(this.pluginSetting(section, 'songLabel') || 'Canción'), placeholder: 'Nombre de la canción', x: 8, y: 36, width: 40, height: 13 },
      { type: 'field', binding: 'song.sourceUrl', label: 'Spotify / YouTube', placeholder: 'Pega el enlace de la canción', x: 52, y: 36, width: 40, height: 13 },
      { type: 'field', binding: 'song.artist', label: 'Artista', placeholder: 'Nombre del artista', x: 8, y: 54, width: 40, height: 13 },
      { type: 'field', binding: 'song.dedication', label: 'Dedicatoria', placeholder: 'Mensaje opcional', x: 52, y: 54, width: 40, height: 13 },
      { type: 'button', binding: 'song.submit', label: String(this.pluginSetting(section, 'primaryButtonText') || 'Enviar al DJ'), x: 30, y: 73, width: 40, height: 9, fontSize: 14 },
      { type: 'text', binding: 'song.feedback', label: 'Aquí aparecerá el estado del envío', x: 20, y: 85, width: 60, height: 6, fontSize: 12 }
    ];
  }

  private ensureSongCanvasLayers(section: VisualInvitationSection): void {
    if (section.layers.some((layer) => String(layer.binding || '').startsWith('song.') || String(layer.binding || '').startsWith('display.songs.'))) return;
    let topZ = Math.max(0, ...section.layers.map((layer) => layer.zIndex || 0));
    const additions: VisualInvitationLayer[] = [];
    for (const definition of this.songLayerDefinitions(section)) {
      const layer = this.createSongLayer(definition, ++topZ);
      if (layer.type === 'field') additions.push(this.separateRsvpFieldLayer(layer, topZ));
      additions.push(layer);
    }
    section.layers.push(...additions);
    section.pluginSettings = { ...(section.pluginSettings || {}), nativeFieldPartsSeparated: true };
  }

  private createSongLayer(definition: ReturnType<typeof this.songLayerDefinitions>[number], zIndex: number): VisualInvitationLayer {
    const isXv = this.isXvBurgundy();
    const layer = this.newLayer(definition.type, definition.label, definition.x, definition.y, definition.width, definition.height, definition.fontSize || 14);
    layer.binding = definition.binding;
    layer.placeholder = definition.placeholder;
    layer.zIndex = zIndex;
    if (definition.type === 'field') {
      layer.style = {
        ...(layer.style || {}),
        backgroundColor: isXv ? '#faf6f0' : '#ffffff',
        borderColor: isXv ? '#d4af37' : '#d5cbc4',
        borderWidth: isXv ? 1.5 : 1,
        borderStyle: 'solid',
        borderRadius: isXv ? 12 : 8,
        color: isXv ? '#5c0d18' : layer.style?.color,
        padding: 10,
        textAlign: 'left',
        showPlaceholder: true
      };
    }
    if (definition.type === 'button') {
      this.applyThemeToLayer(layer, this.design.theme || this.themePresets[0].theme);
      if (isXv) {
        layer.style = { ...(layer.style || {}), backgroundColor: '#d4af37', color: '#5c0d18', borderColor: '#d4af37', borderRadius: 30, fontWeight: 700, letterSpacing: 0.5 };
      }
    }
    if (definition.type === 'text' && isXv) {
      if (definition.binding === 'display.songs.eyebrow') {
        layer.style = { ...(layer.style || {}), letterSpacing: 2.5, fontWeight: 700, color: '#d4af37' };
      } else if (definition.binding === 'display.songs.title') {
        layer.style = { ...(layer.style || {}), fontFamily: "'Great Vibes', cursive", fontSize: 44, fontWeight: 700, color: '#faf6f0' };
      } else if (definition.binding === 'display.songs.intro') {
        layer.style = { ...(layer.style || {}), color: '#e2d5c3' };
      } else if (definition.binding === 'song.feedback') {
        layer.style = { ...(layer.style || {}), color: '#e2d5c3' };
      }
    }
    return layer;
  }

  private albumLayerDefinitions(section: VisualInvitationSection): Array<{ type: 'text' | 'field' | 'button'; binding: string; label: string; x: number; y: number; width: number; height: number; fontSize?: number }> {
    return [
      { type: 'text', binding: 'display.album.eyebrow', label: String(this.pluginSetting(section, 'eyebrow') || 'Álbum colectivo'), x: 15, y: 5, width: 70, height: 5, fontSize: 11 },
      { type: 'text', binding: 'display.album.title', label: section.title || 'Comparte tus fotografías', x: 10, y: 12, width: 80, height: 10, fontSize: 34 },
      { type: 'text', binding: 'display.album.intro', label: String(this.pluginSetting(section, 'introText') || 'Comparte tus mejores momentos con los anfitriones.'), x: 12, y: 24, width: 76, height: 7, fontSize: 14 },
      { type: 'button', binding: 'album.upload', label: String(this.pluginSetting(section, 'primaryButtonText') || 'Seleccionar fotografía'), x: 28, y: 36, width: 44, height: 10, fontSize: 14 },
      { type: 'text', binding: 'album.feedback', label: 'Aquí aparecerá el estado de la fotografía', x: 20, y: 49, width: 60, height: 6, fontSize: 12 },
      { type: 'field', binding: 'album.gallery', label: 'Fotografías aprobadas', x: 8, y: 59, width: 84, height: 34, fontSize: 13 }
    ];
  }

  private ensureAlbumCanvasLayers(section: VisualInvitationSection): void {
    if (section.layers.some((layer) => String(layer.binding || '').startsWith('album.') || String(layer.binding || '').startsWith('display.album.'))) return;
    let topZ = Math.max(0, ...section.layers.map((layer) => layer.zIndex || 0));
    section.layers.push(...this.albumLayerDefinitions(section).map((definition) => this.createAlbumLayer(definition, ++topZ)));
  }

  private createAlbumLayer(definition: ReturnType<typeof this.albumLayerDefinitions>[number], zIndex: number): VisualInvitationLayer {
    const isXv = this.isXvBurgundy();
    const layer = this.newLayer(definition.type, definition.label, definition.x, definition.y, definition.width, definition.height, definition.fontSize || 14);
    layer.binding = definition.binding;
    layer.zIndex = zIndex;
    if (definition.type === 'button') {
      this.applyThemeToLayer(layer, this.design.theme || this.themePresets[0].theme);
      if (isXv) {
        layer.style = { ...(layer.style || {}), backgroundColor: '#d4af37', color: '#5c0d18', borderColor: '#d4af37', borderRadius: 30, fontWeight: 700, letterSpacing: 0.5 };
      }
    }
    if (definition.type === 'text' && isXv) {
      if (definition.binding === 'display.album.eyebrow') {
        layer.style = { ...(layer.style || {}), letterSpacing: 2.5, fontWeight: 700, color: '#d4af37' };
      } else if (definition.binding === 'display.album.title') {
        layer.style = { ...(layer.style || {}), fontFamily: "'Great Vibes', cursive", fontSize: 44, fontWeight: 700, color: '#faf6f0' };
      } else if (definition.binding === 'display.album.intro') {
        layer.style = { ...(layer.style || {}), color: '#e2d5c3' };
      } else if (definition.binding === 'album.feedback') {
        layer.style = { ...(layer.style || {}), color: '#e2d5c3' };
      }
    }
    if (definition.binding === 'album.gallery') layer.style = { ...(layer.style || {}), backgroundColor: 'transparent', borderWidth: 0, padding: 0 };
    return layer;
  }

  private guestPassLayerDefinitions(section: VisualInvitationSection): Array<{ type: 'text' | 'field' | 'button' | 'shape'; binding: string; label: string; placeholder?: string; x: number; y: number; width: number; height: number; fontSize?: number }> {
    return [
      { type: 'text', binding: 'display.guestPass.eyebrow', label: String(this.pluginSetting(section, 'eyebrow') || 'Acceso personal'), x: 15, y: 5, width: 70, height: 4, fontSize: 11 },
      { type: 'text', binding: 'display.guestPass.title', label: section.title || 'Mi mesa y pase', x: 10, y: 10, width: 80, height: 8, fontSize: 32 },
      { type: 'text', binding: 'display.guestPass.intro', label: String(this.pluginSetting(section, 'introText') || 'Presenta este pase al ingresar.'), x: 12, y: 19, width: 76, height: 6, fontSize: 13 },
      { type: 'shape', binding: 'pass.card', label: 'Tarjeta de pase', x: 8, y: 27, width: 84, height: 50, fontSize: 14 },
      { type: 'field', binding: 'pass.qr', label: 'Código QR', x: 13, y: 32, width: 32, height: 26 },
      { type: 'text', binding: 'pass.name', label: 'Invitado de ejemplo', x: 48, y: 32, width: 40, height: 7, fontSize: 22 },
      { type: 'text', binding: 'pass.group', label: 'Familia', x: 48, y: 40, width: 40, height: 4, fontSize: 12 },
      { type: 'text', binding: 'pass.table', label: 'Mesa 5', x: 48, y: 45, width: 40, height: 6, fontSize: 18 },
      { type: 'text', binding: 'pass.seat', label: 'Lugar A-12', x: 48, y: 52, width: 19, height: 5, fontSize: 12 },
      { type: 'text', binding: 'pass.companions', label: '2 acompañantes', x: 68, y: 52, width: 20, height: 5, fontSize: 12 },
      { type: 'text', binding: 'pass.feedback', label: 'Aquí aparecerá el estado de identificación', x: 12, y: 64, width: 76, height: 5, fontSize: 11 },
      { type: 'field', binding: 'pass.email', label: 'Correo', placeholder: 'correo@ejemplo.com', x: 12, y: 28, width: 76, height: 9 },
      { type: 'field', binding: 'pass.phone', label: 'Teléfono', placeholder: 'Número de teléfono', x: 12, y: 40, width: 76, height: 9 },
      { type: 'button', binding: 'pass.identify', label: String(this.pluginSetting(section, 'identifyButtonText') || 'Ver mi pase'), x: 20, y: 53, width: 60, height: 8 }
    ];
  }

  private ensureGuestPassCanvasLayers(section: VisualInvitationSection): void {
    if (section.layers.some((layer) => String(layer.binding || '').startsWith('pass.') || String(layer.binding || '').startsWith('display.guestPass.'))) return;
    let topZ = Math.max(0, ...section.layers.map((layer) => layer.zIndex || 0));
    const additions: VisualInvitationLayer[] = [];
    for (const definition of this.guestPassLayerDefinitions(section)) {
      const layer = this.createGuestPassLayer(definition, ++topZ);
      if (layer.type === 'field' && ['pass.email', 'pass.phone'].includes(layer.binding || '')) additions.push(this.separateRsvpFieldLayer(layer, topZ));
      additions.push(layer);
    }
    section.layers.push(...additions);
  }

  private createGuestPassLayer(definition: ReturnType<typeof this.guestPassLayerDefinitions>[number], zIndex: number): VisualInvitationLayer {
    const isXv = this.isXvBurgundy();
    const isHaute = this.isHauteCouture();
    const layer = this.newLayer(definition.type, definition.label, definition.x, definition.y, definition.width, definition.height, definition.fontSize || 14);
    layer.binding = definition.binding; layer.placeholder = definition.placeholder; layer.zIndex = zIndex;
    if (definition.type === 'shape') {
      layer.style = {
        ...(layer.style || {}),
        backgroundColor: isXv ? '#faf6f0' : '#ffffff',
        borderColor: isXv ? '#d4af37' : isHaute ? '#c59b48' : '#e6ded8',
        borderWidth: isXv || isHaute ? 1.5 : 1,
        borderStyle: 'solid',
        borderRadius: 18,
        boxShadow: isXv ? '0 12px 30px rgba(92, 13, 24, 0.16)' : isHaute ? '0 12px 30px rgba(197, 155, 72, 0.14)' : '0 10px 28px rgba(0,0,0,0.06)'
      };
      layer.zIndex = 1;
    }
    if (definition.type === 'field') {
      const isQr = definition.binding === 'pass.qr';
      layer.style = {
        ...(layer.style || {}),
        backgroundColor: '#ffffff',
        borderColor: isXv ? '#d4af37' : isHaute ? '#c59b48' : '#d5cbc4',
        borderWidth: isXv || isHaute ? 1.5 : 1,
        borderStyle: 'solid',
        borderRadius: isQr ? 12 : 8,
        color: isXv ? '#5c0d18' : layer.style?.color,
        padding: isQr ? 8 : 10,
        textAlign: isQr ? 'center' : 'left',
        showPlaceholder: true,
        boxShadow: isQr ? '0 2px 8px rgba(0,0,0,0.04)' : undefined
      };
    }
    if (definition.type === 'button') {
      this.applyThemeToLayer(layer, this.design.theme || this.themePresets[0].theme);
      if (isXv) {
        layer.style = { ...(layer.style || {}), backgroundColor: '#d4af37', color: '#5c0d18', borderColor: '#d4af37', borderRadius: 30, fontWeight: 700 };
      }
    }
    if (definition.type === 'text') {
      if (definition.binding === 'pass.name') {
        layer.style = { ...(layer.style || {}), fontWeight: 700, fontSize: 22, color: isXv ? '#5c0d18' : isHaute ? '#181514' : layer.style?.color };
      } else if (definition.binding === 'pass.group') {
        layer.style = { ...(layer.style || {}), fontWeight: 600, fontSize: 12, color: isXv ? '#8c1d2e' : isHaute ? '#c59b48' : '#8a7d75', letterSpacing: 1 };
      } else if (definition.binding === 'pass.table') {
        layer.style = { ...(layer.style || {}), fontWeight: 700, fontSize: 18, color: isXv ? '#d4af37' : isHaute ? '#c59b48' : layer.style?.color };
      } else if (definition.binding === 'pass.seat' || definition.binding === 'pass.companions') {
        layer.style = { ...(layer.style || {}), fontWeight: 500, fontSize: 12, color: '#6b635e' };
      } else if (definition.binding === 'pass.feedback') {
        layer.style = { ...(layer.style || {}), fontSize: 11, color: '#99908a', textAlign: 'center' };
      }
    }
    return layer;
  }

  private guestActivityLayerDefinitions(section: VisualInvitationSection): Array<{ type: 'text' | 'field' | 'button'; binding: string; label: string; placeholder?: string; x: number; y: number; width: number; height: number; fontSize?: number }> {
    return [
      { type: 'text', binding: 'display.guestActivity.eyebrow', label: String(this.pluginSetting(section, 'eyebrow') || 'Tu espacio'), x: 15, y: 5, width: 70, height: 4, fontSize: 11 },
      { type: 'text', binding: 'display.guestActivity.title', label: section.title || 'Mi pase y actividad', x: 10, y: 10, width: 80, height: 8, fontSize: 32 },
      { type: 'text', binding: 'display.guestActivity.intro', label: String(this.pluginSetting(section, 'introText') || 'Consulta tu confirmación, pase y envíos sin salir de la invitación.'), x: 12, y: 19, width: 76, height: 6, fontSize: 13 },
      { type: 'text', binding: 'activity.greeting', label: 'Hola, Invitado de ejemplo', x: 10, y: 27, width: 80, height: 5, fontSize: 17 },
      { type: 'field', binding: 'activity.rsvp', label: 'Estado RSVP', x: 8, y: 34, width: 40, height: 16, fontSize: 13 },
      { type: 'field', binding: 'activity.pass', label: 'Mesa y pase', x: 52, y: 34, width: 40, height: 16, fontSize: 13 },
      { type: 'field', binding: 'activity.album', label: 'Fotografías', x: 8, y: 53, width: 26, height: 15, fontSize: 12 },
      { type: 'field', binding: 'activity.songs', label: 'Canciones', x: 37, y: 53, width: 26, height: 15, fontSize: 12 },
      { type: 'field', binding: 'activity.dedications', label: 'Dedicatorias', x: 66, y: 53, width: 26, height: 15, fontSize: 12 },
      { type: 'button', binding: 'activity.manage', label: 'Administrar aquí', x: 10, y: 72, width: 38, height: 8, fontSize: 12 },
      { type: 'button', binding: 'activity.full', label: String(this.pluginSetting(section, 'primaryButtonText') || 'Ver toda mi actividad'), x: 52, y: 72, width: 38, height: 8, fontSize: 12 },
      { type: 'field', binding: 'activity.email', label: 'Correo', placeholder: 'correo@ejemplo.com', x: 12, y: 28, width: 76, height: 9 },
      { type: 'field', binding: 'activity.phone', label: 'Teléfono', placeholder: 'Número de teléfono', x: 12, y: 40, width: 76, height: 9 },
      { type: 'button', binding: 'activity.identify', label: String(this.pluginSetting(section, 'identifyButtonText') || 'Ver mi actividad'), x: 20, y: 53, width: 60, height: 8 }
    ];
  }

  private ensureGuestActivityCanvasLayers(section: VisualInvitationSection): void {
    if (section.layers.some((layer) => String(layer.binding || '').startsWith('activity.') || String(layer.binding || '').startsWith('display.guestActivity.'))) return;
    let topZ = Math.max(0, ...section.layers.map((layer) => layer.zIndex || 0));
    const additions: VisualInvitationLayer[] = [];
    for (const definition of this.guestActivityLayerDefinitions(section)) {
      const layer = this.createGuestActivityLayer(definition, ++topZ);
      if (layer.type === 'field' && ['activity.email', 'activity.phone'].includes(layer.binding || '')) additions.push(this.separateRsvpFieldLayer(layer, topZ));
      additions.push(layer);
    }
    section.layers.push(...additions);
  }

  private createGuestActivityLayer(definition: ReturnType<typeof this.guestActivityLayerDefinitions>[number], zIndex: number): VisualInvitationLayer {
    const isXv = this.isXvBurgundy();
    const isHaute = this.isHauteCouture();
    const layer = this.newLayer(definition.type, definition.label, definition.x, definition.y, definition.width, definition.height, definition.fontSize || 14);
    layer.binding = definition.binding; layer.placeholder = definition.placeholder; layer.zIndex = zIndex;
    if (definition.type === 'field') {
      const isCard = ['activity.rsvp', 'activity.pass', 'activity.album', 'activity.songs', 'activity.dedications'].includes(definition.binding);
      layer.style = {
        ...(layer.style || {}),
        backgroundColor: isXv ? '#faf6f0' : '#ffffff',
        borderColor: isXv ? '#d4af37' : isHaute ? '#c59b48' : '#e2dbd5',
        borderWidth: isXv || isHaute ? 1.5 : 1,
        borderStyle: 'solid',
        borderRadius: isCard ? 14 : 8,
        color: isXv ? '#5c0d18' : layer.style?.color,
        padding: 10,
        textAlign: isCard ? 'center' : 'left',
        showPlaceholder: true,
        boxShadow: isCard ? '0 4px 16px rgba(0,0,0,0.05)' : undefined
      };
    }
    if (definition.type === 'button') {
      this.applyThemeToLayer(layer, this.design.theme || this.themePresets[0].theme);
      if (definition.binding === 'activity.manage') {
        layer.style = {
          ...(layer.style || {}),
          backgroundColor: isXv ? '#faf6f0' : '#ffffff',
          color: isXv ? '#5c0d18' : '#333333',
          borderColor: isXv ? '#d4af37' : isHaute ? '#c59b48' : '#d5cbc4',
          borderWidth: 1,
          borderStyle: 'solid',
          borderRadius: 24,
          fontWeight: 600
        };
      } else if (isXv) {
        layer.style = { ...(layer.style || {}), backgroundColor: '#d4af37', color: '#5c0d18', borderColor: '#d4af37', borderRadius: 30, fontWeight: 700 };
      }
    }
    if (definition.type === 'text') {
      if (definition.binding === 'activity.greeting') {
        layer.style = { ...(layer.style || {}), fontWeight: 700, fontSize: 17, textAlign: 'center', color: isXv ? '#5c0d18' : isHaute ? '#181514' : layer.style?.color };
      }
    }
    return layer;
  }

  private countdownLayerDefinitions(section: VisualInvitationSection): Array<{ type?: 'text' | 'image' | 'shape'; binding: string; label: string; url?: string; x: number; y: number; width: number; height: number; fontSize: number }> {
    const isXv = this.isXvBurgundy();
    if (isXv) {
      return [
        { type: 'text', binding: 'display.countdown.eyebrow', label: String(this.pluginSetting(section, 'eyebrow') || 'SÓLO FALTAN'), x: 15, y: 5, width: 70, height: 5, fontSize: 11 },
        { type: 'text', binding: 'display.countdown.title', label: section.title || 'Para este gran día', x: 10, y: 12, width: 80, height: 10, fontSize: 44 },
        { type: 'text', binding: 'display.countdown.intro', label: String(this.pluginSetting(section, 'introText') || 'Cada segundo nos acerca más a esta noche inolvidable.'), x: 12, y: 23, width: 76, height: 6, fontSize: 14 },
        { type: 'image', binding: 'display.countdown.plaque', label: 'Marco de cuenta regresiva', url: 'assets/templates/xv-burgundy/countdown-box.jpg', x: 5, y: 32, width: 90, height: 38, fontSize: 12 },
        { type: 'text', binding: 'countdown.days', label: String(this.countdownPreview.days), x: 9, y: 39, width: 18, height: 16, fontSize: 40 },
        { type: 'text', binding: 'display.countdown.daysLabel', label: 'Días', x: 9, y: 55, width: 18, height: 5, fontSize: 11 },
        { type: 'text', binding: 'countdown.hours', label: String(this.countdownPreview.hours), x: 31, y: 39, width: 18, height: 16, fontSize: 40 },
        { type: 'text', binding: 'display.countdown.hoursLabel', label: 'Horas', x: 31, y: 55, width: 18, height: 5, fontSize: 11 },
        { type: 'text', binding: 'countdown.minutes', label: String(this.countdownPreview.minutes), x: 51, y: 39, width: 18, height: 16, fontSize: 40 },
        { type: 'text', binding: 'display.countdown.minutesLabel', label: 'Minutos', x: 51, y: 55, width: 18, height: 5, fontSize: 11 },
        { type: 'text', binding: 'countdown.seconds', label: String(this.countdownPreview.seconds), x: 73, y: 39, width: 18, height: 16, fontSize: 40 },
        { type: 'text', binding: 'display.countdown.secondsLabel', label: 'Segundos', x: 73, y: 55, width: 18, height: 5, fontSize: 11 },
        { type: 'text', binding: 'countdown.expired', label: String(this.pluginSetting(section, 'expiredText') || 'El gran día llegó'), x: 15, y: 74, width: 70, height: 12, fontSize: 32 }
      ];
    }
    return [
      { type: 'text', binding: 'display.countdown.eyebrow', label: String(this.pluginSetting(section, 'eyebrow') || 'Falta poco'), x: 15, y: 5, width: 70, height: 5, fontSize: 11 },
      { type: 'text', binding: 'display.countdown.title', label: section.title || 'Cuenta regresiva', x: 10, y: 12, width: 80, height: 10, fontSize: 34 },
      { type: 'text', binding: 'display.countdown.intro', label: String(this.pluginSetting(section, 'introText') || 'Cada vez falta menos para celebrar juntos.'), x: 12, y: 23, width: 76, height: 6, fontSize: 14 },
      { type: 'text', binding: 'countdown.days', label: String(this.countdownPreview.days), x: 7, y: 37, width: 18, height: 14, fontSize: 44 },
      { type: 'text', binding: 'display.countdown.daysLabel', label: 'Días', x: 7, y: 52, width: 18, height: 5, fontSize: 12 },
      { type: 'text', binding: 'countdown.hours', label: String(this.countdownPreview.hours), x: 29, y: 37, width: 18, height: 14, fontSize: 44 },
      { type: 'text', binding: 'display.countdown.hoursLabel', label: 'Horas', x: 29, y: 52, width: 18, height: 5, fontSize: 12 },
      { type: 'text', binding: 'countdown.minutes', label: String(this.countdownPreview.minutes), x: 53, y: 37, width: 18, height: 14, fontSize: 44 },
      { type: 'text', binding: 'display.countdown.minutesLabel', label: 'Minutos', x: 53, y: 52, width: 18, height: 5, fontSize: 12 },
      { type: 'text', binding: 'countdown.seconds', label: String(this.countdownPreview.seconds), x: 75, y: 37, width: 18, height: 14, fontSize: 44 },
      { type: 'text', binding: 'display.countdown.secondsLabel', label: 'Segundos', x: 75, y: 52, width: 18, height: 5, fontSize: 12 },
      { type: 'text', binding: 'countdown.expired', label: String(this.pluginSetting(section, 'expiredText') || 'El gran día llegó'), x: 15, y: 68, width: 70, height: 12, fontSize: 30 }
    ];
  }

  private ensureCountdownCanvasLayers(section: VisualInvitationSection): void {
    if (section.layers.some((layer) => String(layer.binding || '').startsWith('countdown.') || String(layer.binding || '').startsWith('display.countdown.'))) return;
    let topZ = Math.max(0, ...section.layers.map((layer) => layer.zIndex || 0));
    section.layers.push(...this.countdownLayerDefinitions(section).map((definition) => this.createCountdownLayer(definition, ++topZ)));
  }

  private createCountdownLayer(definition: ReturnType<typeof this.countdownLayerDefinitions>[number], zIndex: number): VisualInvitationLayer {
    const isXv = this.isXvBurgundy();
    const layer = this.newLayer(definition.type || 'text', definition.label, definition.x, definition.y, definition.width, definition.height, definition.fontSize);
    layer.binding = definition.binding; layer.url = definition.url; layer.zIndex = definition.type === 'image' ? Math.max(1, zIndex - 1) : zIndex;
    if (definition.type === 'image') {
      layer.style = { ...(layer.style || {}), objectFit: 'cover', borderRadius: 16, boxShadow: '0 14px 36px rgba(0,0,0,0.45)' };
      return layer;
    }
    if (definition.binding.startsWith('countdown.') && definition.binding !== 'countdown.expired') {
      layer.style = { ...(layer.style || {}), fontWeight: 700, textAlign: 'center', color: isXv ? '#5c0d18' : layer.style?.color, fontFamily: isXv ? "'Cinzel', 'Playfair Display', serif" : layer.style?.fontFamily };
    }
    if (isXv) {
      if (definition.binding === 'display.countdown.eyebrow') {
        layer.style = { ...(layer.style || {}), letterSpacing: 3, fontWeight: 700, color: '#d4af37' };
      } else if (definition.binding === 'display.countdown.title') {
        layer.style = { ...(layer.style || {}), fontFamily: "'Great Vibes', cursive", fontSize: 44, fontWeight: 700, color: '#faf6f0' };
      } else if (definition.binding === 'display.countdown.intro') {
        layer.style = { ...(layer.style || {}), color: '#e2d5c3' };
      } else if (definition.binding.endsWith('Label')) {
        layer.style = { ...(layer.style || {}), letterSpacing: 1.5, textTransform: 'uppercase', fontSize: 11, color: '#8c1d2e', fontWeight: 700 };
      } else if (definition.binding === 'countdown.expired') {
        layer.style = { ...(layer.style || {}), fontFamily: "'Great Vibes', cursive", fontSize: 34, fontWeight: 700, color: '#faf6f0' };
      }
    }
    return layer;
  }

  isHauteCouture(): boolean {
    const theme = this.design?.theme;
    return Boolean(
      theme?.headingFont?.includes('Cinzel Decorative') ||
      (theme?.accentColor === '#c59b48' && theme?.buttonRadius === 30)
    );
  }

  isXvBurgundy(): boolean {
    const theme = this.design?.theme;
    return Boolean(
      theme?.headingFont?.includes('Great Vibes') ||
      (theme?.accentColor === '#d4af37' && theme?.backgroundColor === '#5c0d18')
    );
  }

  private locationSourceData(): InvitationLocation[] {
    const configured = this.invitation?.content?.locations || [];
    if (configured.length) return configured;
    if (this.event?.venue?.name || this.event?.venue?.address || this.event?.venue?.mapUrl) {
      return [{ name: this.event.venue.name || 'Lugar del evento', address: this.event.venue.address || '', mapUrl: this.event.venue.mapUrl || '' }];
    }
    return this.previewLocations;
  }

  private locationLayerDefinitions(section: VisualInvitationSection): Array<{ type: 'text' | 'button' | 'shape' | 'image'; binding: string; label: string; url?: string; x: number; y: number; width: number; height: number; fontSize: number }> {
    const locations = this.locationSourceData();
    const isHaute = this.isHauteCouture();
    const isXv = this.isXvBurgundy();
    const isSingle = locations.length === 1;
    const cardHeightPx = isXv ? 340 : isHaute ? 310 : 280;
    const rows = isSingle ? 1 : Math.max(1, Math.ceil(locations.length / 2));
    const requiredHeight = Math.max(760, 230 + rows * (cardHeightPx + 30));
    const pct = (pixels: number) => pixels / requiredHeight * 100;
    const definitions: Array<{ type: 'text' | 'button' | 'shape' | 'image'; binding: string; label: string; url?: string; x: number; y: number; width: number; height: number; fontSize: number }> = [
      { type: 'text', binding: 'display.locations.eyebrow', label: String(this.pluginSetting(section, 'eyebrow') || (isHaute ? 'CÓMO LLEGAR' : isXv ? 'DÓNDE & CUÁNDO' : 'Cómo llegar')), x: 15, y: pct(30), width: 70, height: pct(34), fontSize: 11 },
      { type: 'text', binding: 'display.locations.title', label: section.title || 'Ubicaciones', x: 10, y: pct(72), width: 80, height: pct(70), fontSize: isXv ? 42 : 34 },
      { type: 'text', binding: 'display.locations.intro', label: String(this.pluginSetting(section, 'introText') || (isXv ? 'Acompaña a la quinceañera en cada etapa de esta noche especial.' : 'Consulta los datos y abre tu aplicación de navegación preferida.')), x: 12, y: pct(145), width: 76, height: pct(42), fontSize: 14 }
    ];
    locations.forEach((location, index) => {
      const left = isSingle ? 8 : (index % 2 === 0 ? 5 : 51);
      const cardWidth = isSingle ? 84 : 44;
      const contentWidth = isSingle ? 76 : 38;
      const contentLeft = isSingle ? 12 : left + 3;
      const mapWidth = isSingle ? 54 : 36;
      const mapLeft = isSingle ? 23 : left + 4;
      const wazeWidth = isSingle ? 44 : 30;
      const wazeLeft = isSingle ? 28 : left + 7;
      const topPx = 210 + (isSingle ? 0 : Math.floor(index / 2) * (cardHeightPx + 30));
      const prefix = `location.${index}`;
      if (isXv) {
        const photoUrl = index === 0 ? 'assets/templates/xv-burgundy/church-card.jpg' : 'assets/templates/xv-burgundy/reception-doily.jpg';
        definitions.push(
          { type: 'shape', binding: `${prefix}.card`, label: `Tarjeta ${index + 1}`, x: left, y: pct(topPx), width: cardWidth, height: pct(cardHeightPx), fontSize: 14 },
          { type: 'image', binding: `${prefix}.image`, label: `Foto ${index + 1}`, url: photoUrl, x: isSingle ? 13 : left + 2.5, y: pct(topPx + 10), width: isSingle ? 74 : 39, height: pct(100), fontSize: 12 },
          { type: 'text', binding: `${prefix}.name`, label: location.name || location.type || `Ubicación ${index + 1}`, x: contentLeft, y: pct(topPx + 118), width: contentWidth, height: pct(38), fontSize: isSingle ? 28 : 24 },
          { type: 'text', binding: `${prefix}.address`, label: location.address || 'Dirección pendiente', x: contentLeft, y: pct(topPx + 158), width: contentWidth, height: pct(34), fontSize: 12 },
          { type: 'text', binding: `${prefix}.notes`, label: location.notes || 'Indicaciones del lugar', x: contentLeft, y: pct(topPx + 194), width: contentWidth, height: pct(28), fontSize: 11 },
          { type: 'button', binding: `${prefix}.map`, label: String(this.pluginSetting(section, 'primaryButtonText') || 'VER UBICACIÓN'), x: mapLeft, y: pct(topPx + 228), width: mapWidth, height: pct(38), fontSize: 12 },
          { type: 'button', binding: `${prefix}.waze`, label: 'Waze', x: wazeLeft, y: pct(topPx + 272), width: wazeWidth, height: pct(32), fontSize: 11 }
        );
        if (location.phone) {
          definitions.push({ type: 'button', binding: `${prefix}.phone`, label: 'Llamar', x: wazeLeft, y: pct(topPx + 308), width: wazeWidth, height: pct(26), fontSize: 11 });
        }
      } else if (isHaute) {
        definitions.push(
          { type: 'shape', binding: `${prefix}.card`, label: `Tarjeta ${index + 1}`, x: left, y: pct(topPx), width: cardWidth, height: pct(cardHeightPx), fontSize: 14 },
          { type: 'text', binding: `${prefix}.name`, label: location.name || location.type || `Ubicación ${index + 1}`, x: contentLeft, y: pct(topPx + 22), width: contentWidth, height: pct(42), fontSize: isSingle ? 26 : 22 },
          { type: 'text', binding: `${prefix}.address`, label: location.address || 'Dirección pendiente', x: contentLeft, y: pct(topPx + 72), width: contentWidth, height: pct(40), fontSize: 13 },
          { type: 'text', binding: `${prefix}.notes`, label: location.notes || 'Indicaciones del lugar', x: contentLeft, y: pct(topPx + 118), width: contentWidth, height: pct(36), fontSize: 12 },
          { type: 'button', binding: `${prefix}.map`, label: String(this.pluginSetting(section, 'primaryButtonText') || 'VER UBICACIÓN'), x: mapLeft, y: pct(topPx + 175), width: mapWidth, height: pct(40), fontSize: 13 },
          { type: 'button', binding: `${prefix}.waze`, label: 'Waze', x: wazeLeft, y: pct(topPx + 226), width: wazeWidth, height: pct(36), fontSize: 12 }
        );
        if (location.phone) {
          definitions.push({ type: 'button', binding: `${prefix}.phone`, label: 'Llamar', x: wazeLeft, y: pct(topPx + 270), width: wazeWidth, height: pct(28), fontSize: 11 });
        }
      } else {
        definitions.push(
          { type: 'shape', binding: `${prefix}.card`, label: `Tarjeta ${index + 1}`, x: left, y: pct(topPx), width: cardWidth, height: pct(cardHeightPx), fontSize: 14 },
          { type: 'text', binding: `${prefix}.name`, label: location.name || location.type || `Ubicación ${index + 1}`, x: contentLeft, y: pct(topPx + 18), width: contentWidth, height: pct(36), fontSize: isSingle ? 24 : 20 },
          { type: 'text', binding: `${prefix}.address`, label: location.address || 'Dirección pendiente', x: contentLeft, y: pct(topPx + 58), width: contentWidth, height: pct(34), fontSize: 13 },
          { type: 'text', binding: `${prefix}.notes`, label: location.notes || 'Indicaciones del lugar', x: contentLeft, y: pct(topPx + 96), width: contentWidth, height: pct(28), fontSize: 12 },
          { type: 'button', binding: `${prefix}.map`, label: String(this.pluginSetting(section, 'primaryButtonText') || 'Abrir mapa'), x: mapLeft, y: pct(topPx + 140), width: mapWidth, height: pct(36), fontSize: 12 },
          { type: 'button', binding: `${prefix}.waze`, label: 'Waze', x: wazeLeft, y: pct(topPx + 184), width: wazeWidth, height: pct(32), fontSize: 11 }
        );
        if (location.phone) {
          definitions.push({ type: 'button', binding: `${prefix}.phone`, label: 'Llamar', x: wazeLeft, y: pct(topPx + 224), width: wazeWidth, height: pct(28), fontSize: 11 });
        }
        if (location.websiteUrl) {
          definitions.push({ type: 'button', binding: `${prefix}.website`, label: 'Sitio web', x: wazeLeft, y: pct(topPx + 258), width: wazeWidth, height: pct(28), fontSize: 11 });
        }
        if (location.parking || location.transport || location.accessibility || location.schedule?.length) {
          definitions.push({ type: 'text', binding: `${prefix}.details`, label: 'Estacionamiento, transporte y horarios', x: contentLeft, y: pct(topPx + 224), width: contentWidth, height: pct(36), fontSize: 11 });
        }
      }
    });
    return definitions;
  }

  private ensureLocationCanvasLayers(section: VisualInvitationSection, indexes?: number[]): void {
    const hasLocationLayers = section.layers.some((layer) => String(layer.binding || '').startsWith('location.') || String(layer.binding || '').startsWith('display.locations.'));
    if (!indexes?.length && hasLocationLayers) return;
    const rows = Math.max(1, Math.ceil(this.locationSourceData().length / 2));
    const requiredHeight = Math.max(760, 250 + rows * (this.isXvBurgundy() ? 340 : this.isHauteCouture() ? 320 : 300));
    if (requiredHeight > section.height) this.resizeSectionPreservingLayerPixels(section, requiredHeight);
    const existing = new Set(section.layers.map((layer) => layer.binding).filter(Boolean));
    const definitions = this.locationLayerDefinitions(section).filter((definition) => {
      if (existing.has(definition.binding)) return false;
      if (!indexes?.length) return true;
      const match = definition.binding.match(/^location\.(\d+)\./);
      return Boolean(match && indexes.includes(Number(match[1])));
    });
    let topZ = Math.max(0, ...section.layers.map((layer) => layer.zIndex || 0));
    section.layers.push(...definitions.map((definition) => this.createLocationLayer(definition, ++topZ)));
  }

  private resizeSectionPreservingLayerPixels(section: VisualInvitationSection, nextHeight: number): void {
    const previousHeight = Math.max(1, section.height);
    if (nextHeight === previousHeight) return;
    const ratio = previousHeight / nextHeight;
    for (const layer of section.layers) {
      layer.y *= ratio;
      layer.height *= ratio;
      for (const layout of Object.values(layer.layouts || {})) {
        if (!layout) continue;
        layout.y *= ratio;
        layout.height *= ratio;
      }
    }
    section.height = nextHeight;
  }

  private createLocationLayer(definition: ReturnType<typeof this.locationLayerDefinitions>[number], zIndex: number): VisualInvitationLayer {
    const isHaute = this.isHauteCouture();
    const isXv = this.isXvBurgundy();
    const layer = this.newLayer(definition.type, definition.label, definition.x, definition.y, definition.width, definition.height, definition.fontSize);
    layer.binding = definition.binding; layer.url = definition.url; layer.zIndex = zIndex;
    if (definition.type === 'image') {
      layer.style = { ...(layer.style || {}), objectFit: 'cover', borderRadius: 12, borderColor: '#d4af37', borderWidth: 1.5, borderStyle: 'solid', boxShadow: '0 6px 16px rgba(0,0,0,0.2)' };
    }
    if (definition.type === 'button') {
      this.applyThemeToLayer(layer, this.design.theme || this.themePresets[0].theme);
      if (isHaute) {
        if (definition.binding.endsWith('.waze')) {
          layer.style = { ...(layer.style || {}), backgroundColor: '#ffffff', color: '#181514', borderColor: '#c59b48', borderWidth: 1, borderStyle: 'solid', borderRadius: 30 };
        } else {
          layer.style = { ...(layer.style || {}), backgroundColor: '#181514', color: '#ffffff', borderColor: '#c59b48', borderWidth: 1, borderStyle: 'solid', borderRadius: 30, letterSpacing: 0.5 };
        }
      } else if (isXv) {
        if (definition.binding.endsWith('.waze')) {
          layer.style = { ...(layer.style || {}), backgroundColor: '#faf6f0', color: '#5c0d18', borderColor: '#d4af37', borderWidth: 1, borderStyle: 'solid', borderRadius: 30, fontWeight: 700 };
        } else {
          layer.style = { ...(layer.style || {}), backgroundColor: '#d4af37', color: '#5c0d18', borderColor: '#d4af37', borderWidth: 1, borderStyle: 'solid', borderRadius: 30, fontWeight: 700, letterSpacing: 0.5 };
        }
      } else {
        layer.style = { ...(layer.style || {}), borderRadius: 24, fontWeight: 600 };
      }
    }
    if (definition.type === 'shape') {
      if (isHaute) {
        layer.style = { ...(layer.style || {}), backgroundColor: '#ffffff', borderColor: '#c59b48', borderWidth: 1, borderStyle: 'solid', borderRadius: 16, boxShadow: '0 12px 30px rgba(197, 155, 72, 0.14)' };
      } else if (isXv) {
        layer.style = { ...(layer.style || {}), backgroundColor: '#faf6f0', borderColor: '#d4af37', borderWidth: 2, borderStyle: 'solid', borderRadius: 18, boxShadow: '0 14px 34px rgba(92, 13, 24, 0.28)' };
      } else {
        layer.style = { ...(layer.style || {}), backgroundColor: '#ffffff', borderColor: '#e6ded8', borderWidth: 1, borderStyle: 'solid', borderRadius: 16, boxShadow: '0 10px 28px rgba(0,0,0,0.06)' };
      }
      layer.zIndex = Math.max(1, zIndex - 1);
    }
    if (definition.type === 'text') {
      if (isHaute) {
        if (definition.binding.endsWith('.name')) {
          layer.style = { ...(layer.style || {}), fontFamily: "'Cinzel Decorative', serif", fontWeight: 700, color: '#181514' };
        } else if (definition.binding.endsWith('.notes')) {
          layer.style = { ...(layer.style || {}), color: '#c59b48', fontStyle: 'italic' };
        } else if (definition.binding === 'display.locations.eyebrow') {
          layer.style = { ...(layer.style || {}), letterSpacing: 2.5, fontWeight: 700, color: '#c59b48' };
        } else if (definition.binding === 'display.locations.title') {
          layer.style = { ...(layer.style || {}), fontFamily: "'Cinzel Decorative', serif", fontWeight: 700, color: '#181514' };
        }
      } else if (isXv) {
        if (definition.binding.endsWith('.name')) {
          layer.style = { ...(layer.style || {}), fontFamily: "'Great Vibes', cursive", fontWeight: 600, fontSize: 30, color: '#5c0d18' };
        } else if (definition.binding.endsWith('.address')) {
          layer.style = { ...(layer.style || {}), color: '#3a0810', fontWeight: 500 };
        } else if (definition.binding.endsWith('.notes')) {
          layer.style = { ...(layer.style || {}), color: '#8c1d2e', fontStyle: 'italic' };
        } else if (definition.binding === 'display.locations.eyebrow') {
          layer.style = { ...(layer.style || {}), letterSpacing: 2.5, fontWeight: 700, color: '#d4af37' };
        } else if (definition.binding === 'display.locations.title') {
          layer.style = { ...(layer.style || {}), fontFamily: "'Great Vibes', cursive", fontSize: 44, fontWeight: 700, color: '#faf6f0' };
        }
      }
    }
    return layer;
  }

  private giftSourceData(): GiftRegistryItem[] {
    const configured = this.invitation?.content?.giftRegistry || [];
    return configured.length ? configured : this.previewGifts;
  }

  private giftLayerDefinitions(section: VisualInvitationSection): Array<{ type: 'text' | 'button' | 'shape' | 'image'; binding: string; label: string; url?: string; x: number; y: number; width: number; height: number; fontSize: number }> {
    const isHaute = this.isHauteCouture();
    const isXv = this.isXvBurgundy();
    const gifts = this.giftSourceData();
    const rows = Math.max(1, Math.ceil(gifts.length / 2));
    const requiredHeight = Math.max(900, 250 + rows * 290 + 330);
    const pct = (pixels: number) => pixels / requiredHeight * 100;
    const definitions: Array<{ type: 'text' | 'button' | 'shape' | 'image'; binding: string; label: string; url?: string; x: number; y: number; width: number; height: number; fontSize: number }> = [
      { type: 'text', binding: 'display.gifts.eyebrow', label: String(this.pluginSetting(section, 'eyebrow') || (isHaute || isXv ? 'DETALLES Y PRESENTES' : 'Un detalle opcional')), x: 15, y: pct(28), width: 70, height: pct(32), fontSize: 11 },
      { type: 'text', binding: 'display.gifts.title', label: section.title || 'Mesa de regalos', x: 10, y: pct(68), width: 80, height: pct(66), fontSize: isXv ? 42 : 34 },
      { type: 'text', binding: 'display.gifts.intro', label: String(this.pluginSetting(section, 'introText') || this.invitation?.content?.giftSettings?.introText || (isXv ? 'El mejor regalo es tu presencia, pero si deseas tener un detalle con la quinceañera:' : isHaute ? 'Tu presencia y cariño son nuestro mejor regalo.' : 'Tu presencia es lo más importante para nosotros.')), x: 12, y: pct(137), width: 76, height: pct(45), fontSize: 14 }
    ];
    gifts.forEach((gift, index) => {
      const topPx = 200 + Math.floor(index / 2) * 290;
      const prefix = `gift.${index}`;
      if (isHaute || isXv) {
        const cardLeft = index % 2 === 0 ? 5 : 51;
        definitions.push(
          { type: 'shape', binding: `${prefix}.card`, label: `Tarjeta de regalo ${index + 1}`, x: cardLeft, y: pct(topPx), width: 44, height: pct(255), fontSize: 14 }
        );
        if (gift.imageUrl) {
          definitions.push(
            { type: 'image', binding: `${prefix}.image`, label: `Logo de mesa ${index + 1}`, url: gift.imageUrl, x: cardLeft + 14, y: pct(topPx + 16), width: 16, height: pct(60), fontSize: 12 },
            { type: 'text', binding: `${prefix}.title`, label: gift.title || gift.store || `Mesa ${index + 1}`, x: cardLeft + 3, y: pct(topPx + 82), width: 38, height: pct(36), fontSize: isXv ? 24 : 20 },
            { type: 'text', binding: `${prefix}.store`, label: gift.store || '', x: cardLeft + 3, y: pct(topPx + 120), width: 38, height: pct(26), fontSize: 12 },
            { type: 'text', binding: `${prefix}.note`, label: gift.note || 'Regalo opcional', x: cardLeft + 3, y: pct(topPx + 148), width: 38, height: pct(42), fontSize: 13 },
            { type: 'button', binding: `${prefix}.open`, label: String(this.pluginSetting(section, 'primaryButtonText') || 'Abrir mesa'), x: cardLeft + 8, y: pct(topPx + 195), width: 28, height: pct(42), fontSize: 13 }
          );
        } else {
          definitions.push(
            { type: 'text', binding: `${prefix}.title`, label: gift.title || gift.store || `Mesa ${index + 1}`, x: cardLeft + 3, y: pct(topPx + 28), width: 38, height: pct(42), fontSize: isXv ? 26 : 22 },
            { type: 'text', binding: `${prefix}.store`, label: gift.store || '', x: cardLeft + 3, y: pct(topPx + 74), width: 38, height: pct(28), fontSize: 12 },
            { type: 'text', binding: `${prefix}.note`, label: gift.note || 'Regalo opcional', x: cardLeft + 3, y: pct(topPx + 108), width: 38, height: pct(68), fontSize: 13 },
            { type: 'button', binding: `${prefix}.open`, label: String(this.pluginSetting(section, 'primaryButtonText') || 'Abrir mesa'), x: cardLeft + 8, y: pct(topPx + 188), width: 28, height: pct(44), fontSize: 13 }
          );
        }
      } else {
        const left = index % 2 === 0 ? 4 : 52;
        definitions.push(
          { type: 'shape', binding: `${prefix}.card`, label: `Tarjeta de regalo ${index + 1}`, x: left, y: pct(topPx), width: 44, height: pct(255), fontSize: 14 },
          { type: 'image', binding: `${prefix}.image`, label: `Logo de mesa ${index + 1}`, url: gift.imageUrl || '', x: left + 4, y: pct(topPx + 18), width: 14, height: pct(78), fontSize: 12 },
          { type: 'text', binding: `${prefix}.title`, label: gift.title || gift.store || `Mesa ${index + 1}`, x: left + 20, y: pct(topPx + 22), width: 21, height: pct(38), fontSize: 20 },
          { type: 'text', binding: `${prefix}.store`, label: gift.store || '', x: left + 20, y: pct(topPx + 64), width: 21, height: pct(28), fontSize: 12 },
          { type: 'text', binding: `${prefix}.note`, label: gift.note || 'Regalo opcional', x: left + 4, y: pct(topPx + 110), width: 36, height: pct(55), fontSize: 13 },
          { type: 'button', binding: `${prefix}.open`, label: String(this.pluginSetting(section, 'primaryButtonText') || 'Abrir mesa'), x: left + 12, y: pct(topPx + 187), width: 28, height: pct(42), fontSize: 13 }
        );
      }
    });
    const envelopeTop = 220 + rows * 290;
    const envelope = this.invitation?.content?.digitalEnvelope || {};
    const hasQr = Boolean(envelope.qrImageUrl);
    if (isXv) {
      definitions.push(
        { type: 'shape', binding: 'envelope.card', label: 'Tarjeta de sobre digital', x: 8, y: pct(envelopeTop), width: 84, height: pct(285), fontSize: 14 },
        { type: 'image', binding: 'envelope.art', label: 'Sobre de gala', url: 'assets/templates/xv-burgundy/gift-envelope.jpg', x: 12, y: pct(envelopeTop + 16), width: 22, height: pct(115), fontSize: 12 },
        { type: 'text', binding: 'display.gifts.envelopeTitle', label: 'Lluvia de sobres y transferencias', x: 36, y: pct(envelopeTop + 16), width: 52, height: pct(38), fontSize: 26 },
        { type: 'text', binding: 'envelope.bank', label: envelope.bank || 'Banco', x: 36, y: pct(envelopeTop + 58), width: 24, height: pct(28), fontSize: 13 },
        { type: 'text', binding: 'envelope.holder', label: envelope.holder || 'Titular', x: 62, y: pct(envelopeTop + 58), width: 26, height: pct(28), fontSize: 13 },
        { type: 'text', binding: 'envelope.account', label: envelope.account || 'Cuenta', x: 36, y: pct(envelopeTop + 92), width: 24, height: pct(30), fontSize: 12 },
        { type: 'text', binding: 'envelope.clabe', label: envelope.clabe || 'CLABE', x: 62, y: pct(envelopeTop + 92), width: 26, height: pct(30), fontSize: 12 },
        { type: 'text', binding: 'envelope.note', label: envelope.note || 'Agradecemos de corazón tu muestra de cariño.', x: 14, y: pct(envelopeTop + 148), width: 72, height: pct(35), fontSize: 13 },
        { type: 'button', binding: 'envelope.copyAccount', label: 'Copiar cuenta', x: 20, y: pct(envelopeTop + 195), width: 27, height: pct(42), fontSize: 12 },
        { type: 'button', binding: 'envelope.copyClabe', label: String(this.pluginSetting(section, 'envelopeButtonText') || 'Copiar CLABE'), x: 53, y: pct(envelopeTop + 195), width: 27, height: pct(42), fontSize: 12 },
        { type: 'text', binding: 'envelope.feedback', label: 'Aquí aparecerá la confirmación de copiado', x: 14, y: pct(envelopeTop + 248), width: 72, height: pct(24), fontSize: 11 }
      );
    } else if (isHaute) {
      definitions.push(
        { type: 'shape', binding: 'envelope.card', label: 'Tarjeta de sobre digital', x: 8, y: pct(envelopeTop), width: 84, height: pct(275), fontSize: 14 }
      );
      if (hasQr) {
        definitions.push(
          { type: 'image', binding: 'envelope.qr', label: 'QR del sobre digital', url: envelope.qrImageUrl || '', x: 12, y: pct(envelopeTop + 20), width: 16, height: pct(115), fontSize: 12 },
          { type: 'text', binding: 'display.gifts.envelopeTitle', label: 'Sobre digital', x: 31, y: pct(envelopeTop + 18), width: 55, height: pct(38), fontSize: 24 },
          { type: 'text', binding: 'envelope.bank', label: envelope.bank || 'Banco', x: 31, y: pct(envelopeTop + 60), width: 26, height: pct(28), fontSize: 13 },
          { type: 'text', binding: 'envelope.holder', label: envelope.holder || 'Titular', x: 59, y: pct(envelopeTop + 60), width: 27, height: pct(28), fontSize: 13 },
          { type: 'text', binding: 'envelope.account', label: envelope.account || 'Cuenta', x: 31, y: pct(envelopeTop + 96), width: 26, height: pct(30), fontSize: 12 },
          { type: 'text', binding: 'envelope.clabe', label: envelope.clabe || 'CLABE', x: 59, y: pct(envelopeTop + 96), width: 27, height: pct(30), fontSize: 12 },
          { type: 'text', binding: 'envelope.note', label: envelope.note || 'Agradecemos mucho tu detalle.', x: 14, y: pct(envelopeTop + 148), width: 72, height: pct(35), fontSize: 12 },
          { type: 'button', binding: 'envelope.copyAccount', label: 'Copiar cuenta', x: 20, y: pct(envelopeTop + 195), width: 26, height: pct(42), fontSize: 12 },
          { type: 'button', binding: 'envelope.copyClabe', label: String(this.pluginSetting(section, 'envelopeButtonText') || 'Copiar CLABE'), x: 52, y: pct(envelopeTop + 195), width: 26, height: pct(42), fontSize: 12 },
          { type: 'text', binding: 'envelope.feedback', label: 'Aquí aparecerá la confirmación de copiado', x: 18, y: pct(envelopeTop + 244), width: 64, height: pct(24), fontSize: 11 }
        );
      } else {
        definitions.push(
          { type: 'text', binding: 'display.gifts.envelopeTitle', label: 'Lluvia de sobres y transferencias', x: 12, y: pct(envelopeTop + 20), width: 76, height: pct(38), fontSize: 24 },
          { type: 'text', binding: 'envelope.bank', label: envelope.bank || 'Banco', x: 14, y: pct(envelopeTop + 64), width: 35, height: pct(28), fontSize: 13 },
          { type: 'text', binding: 'envelope.holder', label: envelope.holder || 'Titular', x: 51, y: pct(envelopeTop + 64), width: 35, height: pct(28), fontSize: 13 },
          { type: 'text', binding: 'envelope.account', label: envelope.account || 'Cuenta', x: 14, y: pct(envelopeTop + 100), width: 35, height: pct(30), fontSize: 12 },
          { type: 'text', binding: 'envelope.clabe', label: envelope.clabe || 'CLABE', x: 51, y: pct(envelopeTop + 100), width: 35, height: pct(30), fontSize: 12 },
          { type: 'text', binding: 'envelope.note', label: envelope.note || 'Agradecemos de corazón tu muestra de cariño.', x: 14, y: pct(envelopeTop + 144), width: 72, height: pct(35), fontSize: 13 },
          { type: 'button', binding: 'envelope.copyAccount', label: 'Copiar cuenta', x: 20, y: pct(envelopeTop + 192), width: 27, height: pct(42), fontSize: 12 },
          { type: 'button', binding: 'envelope.copyClabe', label: String(this.pluginSetting(section, 'envelopeButtonText') || 'Copiar CLABE'), x: 53, y: pct(envelopeTop + 192), width: 27, height: pct(42), fontSize: 12 },
          { type: 'text', binding: 'envelope.feedback', label: 'Aquí aparecerá la confirmación de copiado', x: 14, y: pct(envelopeTop + 242), width: 72, height: pct(24), fontSize: 11 }
        );
      }
    } else {
      definitions.push(
        { type: 'shape', binding: 'envelope.card', label: 'Tarjeta de sobre digital', x: 10, y: pct(envelopeTop), width: 80, height: pct(275), fontSize: 14 },
        { type: 'text', binding: 'display.gifts.envelopeTitle', label: 'Sobre digital', x: 32, y: pct(envelopeTop + 18), width: 50, height: pct(38), fontSize: 24 },
        { type: 'image', binding: 'envelope.qr', label: 'QR del sobre digital', url: envelope.qrImageUrl || '', x: 14, y: pct(envelopeTop + 20), width: 15, height: pct(112), fontSize: 12 },
        { type: 'text', binding: 'envelope.bank', label: envelope.bank || 'Banco', x: 32, y: pct(envelopeTop + 62), width: 24, height: pct(28), fontSize: 13 },
        { type: 'text', binding: 'envelope.holder', label: envelope.holder || 'Titular', x: 58, y: pct(envelopeTop + 62), width: 25, height: pct(28), fontSize: 13 },
        { type: 'text', binding: 'envelope.account', label: envelope.account || 'Cuenta', x: 32, y: pct(envelopeTop + 98), width: 24, height: pct(30), fontSize: 12 },
        { type: 'text', binding: 'envelope.clabe', label: envelope.clabe || 'CLABE', x: 58, y: pct(envelopeTop + 98), width: 25, height: pct(30), fontSize: 12 },
        { type: 'text', binding: 'envelope.note', label: envelope.note || 'Agradecemos mucho tu detalle.', x: 18, y: pct(envelopeTop + 145), width: 64, height: pct(35), fontSize: 12 },
        { type: 'button', binding: 'envelope.copyAccount', label: 'Copiar cuenta', x: 24, y: pct(envelopeTop + 196), width: 23, height: pct(40), fontSize: 12 },
        { type: 'button', binding: 'envelope.copyClabe', label: String(this.pluginSetting(section, 'envelopeButtonText') || 'Copiar CLABE'), x: 53, y: pct(envelopeTop + 196), width: 23, height: pct(40), fontSize: 12 },
        { type: 'text', binding: 'envelope.feedback', label: 'Aquí aparecerá la confirmación de copiado', x: 25, y: pct(envelopeTop + 242), width: 50, height: pct(24), fontSize: 11 }
      );
    }
    return definitions;
  }

  private ensureGiftCanvasLayers(section: VisualInvitationSection, indexes?: number[]): void {
    const hasGiftLayers = section.layers.some((layer) => String(layer.binding || '').startsWith('gift.') || String(layer.binding || '').startsWith('envelope.') || String(layer.binding || '').startsWith('display.gifts.'));
    if (!indexes?.length && hasGiftLayers) return;
    const rows = Math.max(1, Math.ceil(this.giftSourceData().length / 2));
    const requiredHeight = Math.max(900, 250 + rows * 290 + 330);
    if (requiredHeight > section.height) this.resizeSectionPreservingLayerPixels(section, requiredHeight);
    const existing = new Set(section.layers.map((layer) => layer.binding).filter(Boolean));
    const definitions = this.giftLayerDefinitions(section).filter((definition) => {
      if (existing.has(definition.binding)) return false;
      if (!indexes?.length) return true;
      const match = definition.binding.match(/^gift\.(\d+)\./);
      return Boolean(match && indexes.includes(Number(match[1])));
    });
    let topZ = Math.max(0, ...section.layers.map((layer) => layer.zIndex || 0));
    section.layers.push(...definitions.map((definition) => this.createGiftLayer(definition, ++topZ)));
  }

  private createGiftLayer(definition: ReturnType<typeof this.giftLayerDefinitions>[number], zIndex: number): VisualInvitationLayer {
    const isHaute = this.isHauteCouture();
    const isXv = this.isXvBurgundy();
    const layer = this.newLayer(definition.type, definition.label, definition.x, definition.y, definition.width, definition.height, definition.fontSize);
    layer.binding = definition.binding; layer.url = definition.url; layer.zIndex = zIndex;
    if (definition.type === 'button') {
      this.applyThemeToLayer(layer, this.design.theme || this.themePresets[0].theme);
      if (isHaute) {
        if (definition.binding.includes('copy')) {
          layer.style = { ...(layer.style || {}), backgroundColor: '#ffffff', color: '#181514', borderColor: '#c59b48', borderWidth: 1, borderStyle: 'solid', borderRadius: 30, fontWeight: 600 };
        } else {
          layer.style = { ...(layer.style || {}), backgroundColor: '#181514', color: '#ffffff', borderColor: '#c59b48', borderWidth: 1, borderStyle: 'solid', borderRadius: 30, letterSpacing: 0.5 };
        }
      } else if (isXv) {
        if (definition.binding.includes('copy')) {
          layer.style = { ...(layer.style || {}), backgroundColor: '#faf6f0', color: '#5c0d18', borderColor: '#d4af37', borderWidth: 1, borderStyle: 'solid', borderRadius: 30, fontWeight: 700 };
        } else {
          layer.style = { ...(layer.style || {}), backgroundColor: '#d4af37', color: '#5c0d18', borderColor: '#d4af37', borderWidth: 1, borderStyle: 'solid', borderRadius: 30, letterSpacing: 0.5, fontWeight: 700 };
        }
      }
    }
    if (definition.type === 'image') {
      if (isHaute) {
        layer.style = { ...(layer.style || {}), objectFit: 'contain', backgroundColor: '#faf8f5', borderColor: '#e8dcce', borderWidth: 1, borderStyle: 'solid', borderRadius: 12, padding: 6 };
      } else if (isXv) {
        if (definition.binding === 'envelope.art') {
          layer.style = { ...(layer.style || {}), objectFit: 'cover', borderRadius: 14, borderColor: '#d4af37', borderWidth: 1.5, borderStyle: 'solid', boxShadow: '0 8px 20px rgba(92, 13, 24, 0.25)' };
        } else {
          layer.style = { ...(layer.style || {}), objectFit: 'contain', backgroundColor: '#ffffff', borderColor: '#d4af37', borderWidth: 1, borderStyle: 'solid', borderRadius: 12, padding: 6 };
        }
      } else {
        layer.style = { ...(layer.style || {}), objectFit: 'contain', backgroundColor: '#ffffff', borderRadius: 8 };
      }
    }
    if (definition.type === 'shape') {
      if (isHaute) {
        layer.style = { ...(layer.style || {}), backgroundColor: '#ffffff', borderColor: '#c59b48', borderWidth: 1, borderStyle: 'solid', borderRadius: 16, boxShadow: '0 12px 30px rgba(197, 155, 72, 0.14)' };
      } else if (isXv) {
        layer.style = { ...(layer.style || {}), backgroundColor: '#faf6f0', borderColor: '#d4af37', borderWidth: 2, borderStyle: 'solid', borderRadius: 18, boxShadow: '0 14px 34px rgba(92, 13, 24, 0.28)' };
      } else {
        layer.style = { ...(layer.style || {}), backgroundColor: '#ffffff', borderColor: '#d5cbc4', borderWidth: 1, borderStyle: 'solid', borderRadius: 8, boxShadow: '0 8px 24px #00000012' };
      }
      layer.zIndex = Math.max(1, zIndex - 1);
    }
    if (definition.type === 'text') {
      if (isHaute) {
        if (definition.binding === 'display.gifts.eyebrow') {
          layer.style = { ...(layer.style || {}), letterSpacing: 2.5, fontWeight: 700, color: '#c59b48', textAlign: 'center' };
        } else if (definition.binding === 'display.gifts.title') {
          layer.style = { ...(layer.style || {}), fontFamily: "'Cinzel Decorative', serif", fontWeight: 700, color: '#181514', textAlign: 'center' };
        } else if (definition.binding === 'display.gifts.intro') {
          layer.style = { ...(layer.style || {}), color: '#555555', textAlign: 'center' };
        } else if (definition.binding.endsWith('.title')) {
          layer.style = { ...(layer.style || {}), fontFamily: "'Cinzel Decorative', serif", fontWeight: 700, color: '#181514', textAlign: 'center' };
        } else if (definition.binding.endsWith('.store')) {
          layer.style = { ...(layer.style || {}), fontFamily: 'Montserrat, sans-serif', fontWeight: 600, color: '#c59b48', letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center' };
        } else if (definition.binding.endsWith('.note')) {
          layer.style = { ...(layer.style || {}), fontStyle: 'italic', color: '#555555', textAlign: 'center' };
        } else if (definition.binding === 'display.gifts.envelopeTitle') {
          layer.style = { ...(layer.style || {}), fontFamily: "'Cinzel Decorative', serif", fontWeight: 700, color: '#181514', textAlign: 'center' };
        } else if (definition.binding === 'envelope.bank' || definition.binding === 'envelope.holder') {
          layer.style = { ...(layer.style || {}), fontWeight: 600, color: '#181514' };
        } else if (definition.binding === 'envelope.account' || definition.binding === 'envelope.clabe') {
          layer.style = { ...(layer.style || {}), color: '#c59b48', fontFamily: 'monospace', fontWeight: 600 };
        } else if (definition.binding === 'envelope.note') {
          layer.style = { ...(layer.style || {}), fontStyle: 'italic', color: '#555555', textAlign: 'center' };
        } else if (definition.binding === 'envelope.feedback') {
          layer.style = { ...(layer.style || {}), color: '#888888', textAlign: 'center' };
        }
      } else if (isXv) {
        if (definition.binding === 'display.gifts.eyebrow') {
          layer.style = { ...(layer.style || {}), letterSpacing: 2.5, fontWeight: 700, color: '#d4af37', textAlign: 'center' };
        } else if (definition.binding === 'display.gifts.title') {
          layer.style = { ...(layer.style || {}), fontFamily: "'Great Vibes', cursive", fontSize: 44, fontWeight: 700, color: '#faf6f0', textAlign: 'center' };
        } else if (definition.binding === 'display.gifts.intro') {
          layer.style = { ...(layer.style || {}), color: '#e2d5c3', textAlign: 'center' };
        } else if (definition.binding.endsWith('.title')) {
          layer.style = { ...(layer.style || {}), fontFamily: "'Great Vibes', cursive", fontSize: 28, fontWeight: 600, color: '#5c0d18', textAlign: 'center' };
        } else if (definition.binding.endsWith('.store')) {
          layer.style = { ...(layer.style || {}), fontFamily: 'Montserrat, sans-serif', fontWeight: 700, color: '#d4af37', letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center' };
        } else if (definition.binding.endsWith('.note')) {
          layer.style = { ...(layer.style || {}), fontStyle: 'italic', color: '#8c1d2e', textAlign: 'center' };
        } else if (definition.binding === 'display.gifts.envelopeTitle') {
          layer.style = { ...(layer.style || {}), fontFamily: "'Great Vibes', cursive", fontSize: 32, fontWeight: 700, color: '#5c0d18', textAlign: 'center' };
        } else if (definition.binding === 'envelope.bank' || definition.binding === 'envelope.holder') {
          layer.style = { ...(layer.style || {}), fontWeight: 600, color: '#5c0d18' };
        } else if (definition.binding === 'envelope.account' || definition.binding === 'envelope.clabe') {
          layer.style = { ...(layer.style || {}), color: '#8c1d2e', fontFamily: 'monospace', fontWeight: 700 };
        } else if (definition.binding === 'envelope.note') {
          layer.style = { ...(layer.style || {}), fontStyle: 'italic', color: '#5c0d18', textAlign: 'center' };
        } else if (definition.binding === 'envelope.feedback') {
          layer.style = { ...(layer.style || {}), color: '#8c1d2e', textAlign: 'center' };
        }
      }
    }
    return layer;
  }

  private itinerarySourceData(): Array<{ time?: string; title?: string; description?: string; icon?: string; locationLabel?: string; locationUrl?: string }> {
    const configured = this.invitation?.content?.itinerary || [];
    return configured.length ? configured : this.previewItinerary;
  }

  private itineraryLayerDefinitions(section: VisualInvitationSection): Array<{ type: 'text' | 'button' | 'shape'; binding: string; label: string; x: number; y: number; width: number; height: number; fontSize: number }> {
    const itinerary = this.itinerarySourceData();
    const isHaute = this.isHauteCouture();
    const isXv = this.isXvBurgundy();
    const requiredHeight = Math.max(760, 220 + Math.max(1, itinerary.length) * 190);
    const pct = (pixels: number) => pixels / requiredHeight * 100;
    const definitions: Array<{ type: 'text' | 'button' | 'shape'; binding: string; label: string; x: number; y: number; width: number; height: number; fontSize: number }> = [
      { type: 'text', binding: 'display.itinerary.eyebrow', label: String(this.pluginSetting(section, 'eyebrow') || (isHaute ? 'PROGRAMA DE LA CELEBRACIÓN' : isXv ? 'EL PROGRAMA' : 'Programa')), x: 15, y: pct(28), width: 70, height: pct(32), fontSize: 11 },
      { type: 'text', binding: 'display.itinerary.title', label: section.title || (isXv ? 'Itinerario de la Noche' : 'Itinerario'), x: 10, y: pct(68), width: 80, height: pct(64), fontSize: isXv ? 42 : 34 },
      { type: 'text', binding: 'display.itinerary.intro', label: String(this.pluginSetting(section, 'introText') || (isXv ? 'Momentos especiales preparados para celebrar en grande.' : 'Estos son los momentos principales de nuestra celebración.')), x: 12, y: pct(136), width: 76, height: pct(42), fontSize: 14 }
    ];
    itinerary.forEach((item, index) => {
      const topPx = 200 + index * 190;
      const prefix = `itinerary.${index}`;
      if (isHaute || isXv) {
        definitions.push(
          { type: 'shape', binding: `${prefix}.card`, label: `Tarjeta de actividad ${index + 1}`, x: 8, y: pct(topPx), width: 84, height: pct(160), fontSize: 14 },
          { type: 'text', binding: `${prefix}.icon`, label: item.icon || '✦', x: 11, y: pct(topPx + 22), width: 8, height: pct(38), fontSize: 18 },
          { type: 'text', binding: `${prefix}.time`, label: item.time || 'Hora', x: 19, y: pct(topPx + 20), width: 22, height: pct(34), fontSize: 16 },
          { type: 'text', binding: `${prefix}.title`, label: item.title || `Actividad ${index + 1}`, x: 42, y: pct(topPx + 18), width: 46, height: pct(38), fontSize: isXv ? 24 : 22 },
          { type: 'text', binding: `${prefix}.description`, label: item.description || 'Descripción de la actividad', x: 19, y: pct(topPx + 68), width: 44, height: pct(42), fontSize: 13 },
          { type: 'button', binding: `${prefix}.location`, label: item.locationLabel || 'Ver ubicación', x: 65, y: pct(topPx + 112), width: 24, height: pct(36), fontSize: 12 }
        );
      } else {
        definitions.push(
          { type: 'shape', binding: `${prefix}.card`, label: `Tarjeta de actividad ${index + 1}`, x: 8, y: pct(topPx), width: 84, height: pct(160), fontSize: 14 },
          { type: 'text', binding: `${prefix}.icon`, label: item.icon || '•', x: 12, y: pct(topPx + 22), width: 8, height: pct(40), fontSize: 25 },
          { type: 'text', binding: `${prefix}.time`, label: item.time || 'Hora', x: 22, y: pct(topPx + 20), width: 18, height: pct(32), fontSize: 15 },
          { type: 'text', binding: `${prefix}.title`, label: item.title || `Actividad ${index + 1}`, x: 42, y: pct(topPx + 18), width: 44, height: pct(38), fontSize: 21 },
          { type: 'text', binding: `${prefix}.description`, label: item.description || 'Descripción de la actividad', x: 22, y: pct(topPx + 66), width: 64, height: pct(42), fontSize: 13 },
          { type: 'button', binding: `${prefix}.location`, label: item.locationLabel || 'Ver ubicación', x: 60, y: pct(topPx + 112), width: 26, height: pct(34), fontSize: 12 }
        );
      }
    });
    return definitions;
  }

  private ensureItineraryCanvasLayers(section: VisualInvitationSection, indexes?: number[]): void {
    const hasItineraryLayers = section.layers.some((layer) => String(layer.binding || '').startsWith('itinerary.') || String(layer.binding || '').startsWith('display.itinerary.'));
    if (!indexes?.length && hasItineraryLayers) return;
    const requiredHeight = Math.max(760, 220 + Math.max(1, this.itinerarySourceData().length) * 190);
    if (requiredHeight > section.height) this.resizeSectionPreservingLayerPixels(section, requiredHeight);
    const existing = new Set(section.layers.map((layer) => layer.binding).filter(Boolean));
    const definitions = this.itineraryLayerDefinitions(section).filter((definition) => {
      if (existing.has(definition.binding)) return false;
      if (!indexes?.length) return true;
      const match = definition.binding.match(/^itinerary\.(\d+)\./);
      return Boolean(match && indexes.includes(Number(match[1])));
    });
    let topZ = Math.max(0, ...section.layers.map((layer) => layer.zIndex || 0));
    section.layers.push(...definitions.map((definition) => this.createItineraryLayer(definition, ++topZ)));
  }

  private createItineraryLayer(definition: ReturnType<typeof this.itineraryLayerDefinitions>[number], zIndex: number): VisualInvitationLayer {
    const isHaute = this.isHauteCouture();
    const isXv = this.isXvBurgundy();
    const layer = this.newLayer(definition.type, definition.label, definition.x, definition.y, definition.width, definition.height, definition.fontSize);
    layer.binding = definition.binding;
    layer.zIndex = zIndex;
    if (definition.type === 'button') {
      this.applyThemeToLayer(layer, this.design.theme || this.themePresets[0].theme);
      if (isHaute) {
        layer.style = { ...(layer.style || {}), backgroundColor: '#181514', color: '#ffffff', borderColor: '#c59b48', borderWidth: 1, borderStyle: 'solid', borderRadius: 30, letterSpacing: 0.5 };
      } else if (isXv) {
        layer.style = { ...(layer.style || {}), backgroundColor: '#d4af37', color: '#5c0d18', borderColor: '#d4af37', borderWidth: 1, borderStyle: 'solid', borderRadius: 30, letterSpacing: 0.5, fontWeight: 700 };
      }
    }
    if (definition.type === 'shape') {
      if (isHaute) {
        layer.style = { ...(layer.style || {}), backgroundColor: '#ffffff', borderColor: '#c59b48', borderWidth: 1, borderStyle: 'solid', borderRadius: 16, boxShadow: '0 10px 28px rgba(197, 155, 72, 0.12)' };
      } else if (isXv) {
        layer.style = { ...(layer.style || {}), backgroundColor: '#faf6f0', borderColor: '#d4af37', borderWidth: 1.5, borderStyle: 'solid', borderRadius: 16, boxShadow: '0 12px 30px rgba(92, 13, 24, 0.22)' };
      } else {
        layer.style = { ...(layer.style || {}), backgroundColor: '#ffffff', borderColor: '#d5cbc4', borderWidth: 1, borderStyle: 'solid', borderRadius: 8, boxShadow: '0 8px 24px #00000012' };
      }
      layer.zIndex = Math.max(1, zIndex - 1);
    }
    if (definition.type === 'text') {
      if (isHaute) {
        if (definition.binding.endsWith('.title')) {
          layer.style = { ...(layer.style || {}), fontFamily: "'Cinzel Decorative', serif", fontWeight: 700, color: '#181514' };
        } else if (definition.binding.endsWith('.time')) {
          layer.style = { ...(layer.style || {}), fontFamily: 'Montserrat, sans-serif', fontWeight: 700, color: '#c59b48', letterSpacing: 1 };
        } else if (definition.binding.endsWith('.icon')) {
          layer.style = { ...(layer.style || {}), color: '#c59b48' };
        } else if (definition.binding === 'display.itinerary.eyebrow') {
          layer.style = { ...(layer.style || {}), letterSpacing: 2.5, fontWeight: 700, color: '#c59b48' };
        } else if (definition.binding === 'display.itinerary.title') {
          layer.style = { ...(layer.style || {}), fontFamily: "'Cinzel Decorative', serif", fontWeight: 700, color: '#181514' };
        }
      } else if (isXv) {
        if (definition.binding.endsWith('.title')) {
          layer.style = { ...(layer.style || {}), fontFamily: "'Great Vibes', cursive", fontWeight: 600, fontSize: 26, color: '#5c0d18' };
        } else if (definition.binding.endsWith('.time')) {
          layer.style = { ...(layer.style || {}), fontFamily: 'Montserrat, sans-serif', fontWeight: 700, color: '#d4af37', letterSpacing: 1 };
        } else if (definition.binding.endsWith('.icon')) {
          layer.style = { ...(layer.style || {}), color: '#d4af37', fontSize: 20 };
        } else if (definition.binding.endsWith('.description')) {
          layer.style = { ...(layer.style || {}), color: '#5c0d18' };
        } else if (definition.binding === 'display.itinerary.eyebrow') {
          layer.style = { ...(layer.style || {}), letterSpacing: 2.5, fontWeight: 700, color: '#d4af37' };
        } else if (definition.binding === 'display.itinerary.title') {
          layer.style = { ...(layer.style || {}), fontFamily: "'Great Vibes', cursive", fontSize: 44, fontWeight: 700, color: '#faf6f0' };
        } else if (definition.binding === 'display.itinerary.intro') {
          layer.style = { ...(layer.style || {}), color: '#e2d5c3' };
        }
      }
    }
    return layer;
  }

  private dressCodeLayerDefinitions(section: VisualInvitationSection): Array<{ type: 'text' | 'image' | 'shape'; binding: string; label: string; url?: string; color?: string; x: number; y: number; width: number; height: number; fontSize: number }> {
    const isHaute = this.isHauteCouture();
    const isXv = this.isXvBurgundy();
    const options = this.invitation?.content?.dressCodeOptions || [];
    const dressImgUrl = isXv
      ? (this.invitation?.content?.dressCodeImageUrl || 'assets/templates/xv-burgundy/dresscode-art.jpg')
      : this.invitation?.content?.dressCodeImageUrl;
    const hasImage = Boolean(dressImgUrl);
    const rows = Math.max(1, Math.ceil(options.length / 2));
    const requiredHeight = isHaute || isXv
      ? Math.max(760, (hasImage ? 460 : 380) + rows * 180)
      : Math.max(760, 490 + rows * 180);
    const pct = (pixels: number) => pixels / requiredHeight * 100;
    const definitions: Array<{ type: 'text' | 'image' | 'shape'; binding: string; label: string; url?: string; color?: string; x: number; y: number; width: number; height: number; fontSize: number }> = [
      { type: 'text', binding: 'display.dressCode.eyebrow', label: String(this.pluginSetting(section, 'eyebrow') || (isHaute || isXv ? 'CÓDIGO DE ETIQUETA' : 'Vestimenta')), x: 15, y: pct(28), width: 70, height: pct(30), fontSize: 11 },
      { type: 'text', binding: 'display.dressCode.title', label: section.title || 'Código de vestimenta', x: 10, y: pct(66), width: 80, height: pct(62), fontSize: isXv ? 42 : 34 },
      { type: 'text', binding: 'display.dressCode.intro', label: String(this.pluginSetting(section, 'introText') || (isXv ? 'Agradecemos vestir conforme a la etiqueta para lucir en esta noche de gala.' : isHaute ? 'Agradecemos vestir conforme a la etiqueta establecida para nuestra gala.' : 'Inspírate con estas recomendaciones para la celebración.')), x: 12, y: pct(132), width: 76, height: pct(42), fontSize: 14 }
    ];
    if (isHaute || isXv) {
      if (hasImage) {
        definitions.push(
          { type: 'image', binding: 'dress.image', label: 'Imagen de referencia', url: dressImgUrl, x: 10, y: pct(190), width: 34, height: pct(230), fontSize: 12 },
          { type: 'text', binding: 'dress.code', label: this.invitation?.content?.dressCode || (isXv ? 'Rigurosa Etiqueta / Gala' : 'Rigurosa Etiqueta'), x: 48, y: pct(210), width: 44, height: pct(52), fontSize: isXv ? 32 : 28 },
          { type: 'text', binding: 'dress.description', label: this.invitation?.content?.dressCodeDescription || (isXv ? 'Damas: Vestido largo de gala en tonos sugeridos.\nCaballeros: Traje formal oscuro o esmoquin.' : 'Caballeros: Frac o esmoquin negro clásico.\nDamas: Vestido largo de noche.'), x: 48, y: pct(272), width: 44, height: pct(130), fontSize: 14 }
        );
      } else {
        definitions.push(
          { type: 'text', binding: 'dress.code', label: this.invitation?.content?.dressCode || (isXv ? 'Rigurosa Etiqueta / Gala' : 'Rigurosa Etiqueta'), x: 15, y: pct(190), width: 70, height: pct(58), fontSize: isXv ? 36 : 32 },
          { type: 'text', binding: 'dress.description', label: this.invitation?.content?.dressCodeDescription || (isXv ? 'Damas: Vestido largo de gala en tonos sugeridos.\nCaballeros: Traje formal oscuro o esmoquin.' : 'Caballeros: Frac o esmoquin negro clásico.\nDamas: Vestido largo de noche en tonos sugeridos.'), x: 15, y: pct(260), width: 70, height: pct(85), fontSize: 15 }
        );
      }
      const startTopPx = hasImage ? 440 : 365;
      options.forEach((option, index) => {
        const left = index % 2 === 0 ? 8 : 52;
        const topPx = startTopPx + Math.floor(index / 2) * 180;
        const prefix = `dress.option.${index}`;
        definitions.push(
          { type: 'shape', binding: `${prefix}.card`, label: `Tarjeta de referencia ${index + 1}`, x: left, y: pct(topPx), width: 40, height: pct(155), fontSize: 12 },
          { type: 'shape', binding: `${prefix}.color`, label: option.title ? `Color: ${option.title}` : `Color ${index + 1}`, color: option.color || (isXv ? '#5c0d18' : '#181514'), x: left + 3.5, y: pct(topPx + 22), width: 7, height: pct(54), fontSize: 12 },
          { type: 'text', binding: `${prefix}.title`, label: option.title || `Etiqueta ${index + 1}`, x: left + 12, y: pct(topPx + 18), width: 26, height: pct(36), fontSize: 18 },
          { type: 'text', binding: `${prefix}.description`, label: option.description || 'Recomendación de vestuario', x: left + 12, y: pct(topPx + 58), width: 26, height: pct(80), fontSize: 12 }
        );
      });
    } else {
      definitions.push(
        { type: 'image', binding: 'dress.image', label: 'Imagen de referencia', url: this.invitation?.content?.dressCodeImageUrl || '', x: 10, y: pct(196), width: 34, height: pct(235), fontSize: 12 },
        { type: 'text', binding: 'dress.code', label: this.invitation?.content?.dressCode || 'Formal', x: 49, y: pct(220), width: 41, height: pct(48), fontSize: 28 },
        { type: 'text', binding: 'dress.description', label: this.invitation?.content?.dressCodeDescription || 'Agrega recomendaciones, colores o prendas sugeridas.', x: 49, y: pct(282), width: 41, height: pct(115), fontSize: 14 }
      );
      options.forEach((option, index) => {
        const left = index % 2 === 0 ? 8 : 52;
        const topPx = 465 + Math.floor(index / 2) * 180;
        const prefix = `dress.option.${index}`;
        definitions.push(
          { type: 'shape', binding: `${prefix}.card`, label: `Tarjeta de referencia ${index + 1}`, x: left, y: pct(topPx), width: 40, height: pct(150), fontSize: 12 },
          { type: 'shape', binding: `${prefix}.color`, label: option.title ? `Color: ${option.title}` : `Color ${index + 1}`, color: option.color || '#d9c2b0', x: left + 3, y: pct(topPx + 24), width: 9, height: pct(72), fontSize: 12 },
          { type: 'text', binding: `${prefix}.title`, label: option.title || `Referencia ${index + 1}`, x: left + 15, y: pct(topPx + 20), width: 22, height: pct(36), fontSize: 17 },
          { type: 'text', binding: `${prefix}.description`, label: option.description || 'Recomendación opcional', x: left + 15, y: pct(topPx + 62), width: 22, height: pct(58), fontSize: 12 }
        );
      });
    }
    return definitions;
  }

  private ensureDressCodeCanvasLayers(section: VisualInvitationSection, indexes?: number[]): void {
    const hasDressLayers = section.layers.some((layer) => String(layer.binding || '').startsWith('dress.') || String(layer.binding || '').startsWith('display.dressCode.'));
    if (!indexes?.length && hasDressLayers) return;
    const rows = Math.max(1, Math.ceil((this.invitation?.content?.dressCodeOptions?.length || 0) / 2));
    const requiredHeight = Math.max(760, 490 + rows * 180);
    if (requiredHeight > section.height) this.resizeSectionPreservingLayerPixels(section, requiredHeight);
    const existing = new Set(section.layers.map((layer) => layer.binding).filter(Boolean));
    const definitions = this.dressCodeLayerDefinitions(section).filter((definition) => {
      if (existing.has(definition.binding)) return false;
      if (!indexes?.length) return true;
      const match = definition.binding.match(/^dress\.option\.(\d+)\./);
      return Boolean(match && indexes.includes(Number(match[1])));
    });
    let topZ = Math.max(0, ...section.layers.map((layer) => layer.zIndex || 0));
    section.layers.push(...definitions.map((definition) => this.createDressCodeLayer(definition, ++topZ)));
  }

  private createDressCodeLayer(definition: ReturnType<typeof this.dressCodeLayerDefinitions>[number], zIndex: number): VisualInvitationLayer {
    const isHaute = this.isHauteCouture();
    const isXv = this.isXvBurgundy();
    const hasImage = Boolean(isXv ? (this.invitation?.content?.dressCodeImageUrl || 'assets/templates/xv-burgundy/dresscode-art.jpg') : this.invitation?.content?.dressCodeImageUrl);
    const layer = this.newLayer(definition.type, definition.label, definition.x, definition.y, definition.width, definition.height, definition.fontSize);
    layer.binding = definition.binding;
    layer.url = definition.url;
    layer.zIndex = zIndex;
    if (definition.type === 'image') {
      if (isHaute) {
        layer.style = { ...(layer.style || {}), objectFit: 'cover', borderRadius: 14, borderColor: '#c59b48', borderWidth: 1, borderStyle: 'solid', boxShadow: '0 8px 20px rgba(0, 0, 0, 0.08)' };
      } else if (isXv) {
        layer.style = { ...(layer.style || {}), objectFit: 'cover', borderRadius: 16, borderColor: '#d4af37', borderWidth: 2, borderStyle: 'solid', boxShadow: '0 12px 30px rgba(92, 13, 24, 0.35)' };
      } else {
        layer.style = { ...(layer.style || {}), objectFit: 'cover', borderRadius: 8 };
      }
    }
    if (definition.type === 'shape') {
      const isColor = definition.binding.endsWith('.color');
      if (isHaute) {
        layer.style = {
          ...(layer.style || {}),
          backgroundColor: isColor ? definition.color || '#181514' : '#ffffff',
          borderColor: '#c59b48',
          borderWidth: isColor ? 2 : 1,
          borderStyle: 'solid',
          borderRadius: isColor ? 999 : 16,
          boxShadow: isColor ? '0 4px 12px rgba(197, 155, 72, 0.25)' : '0 10px 28px rgba(197, 155, 72, 0.12)'
        };
      } else if (isXv) {
        layer.style = {
          ...(layer.style || {}),
          backgroundColor: isColor ? definition.color || '#5c0d18' : '#faf6f0',
          borderColor: '#d4af37',
          borderWidth: isColor ? 2 : 1.5,
          borderStyle: 'solid',
          borderRadius: isColor ? 999 : 16,
          boxShadow: isColor ? '0 4px 12px rgba(212, 175, 55, 0.35)' : '0 12px 30px rgba(92, 13, 24, 0.22)'
        };
      } else {
        layer.style = {
          ...(layer.style || {}), backgroundColor: isColor ? definition.color || '#d9c2b0' : '#ffffff',
          borderColor: '#d5cbc4', borderWidth: 1, borderStyle: 'solid', borderRadius: isColor ? 999 : 8,
          boxShadow: isColor ? 'none' : '0 8px 24px #00000012'
        };
      }
      if (!isColor) layer.zIndex = Math.max(1, zIndex - 1);
    }
    if (definition.type === 'text') {
      if (isHaute) {
        if (definition.binding === 'display.dressCode.eyebrow') {
          layer.style = { ...(layer.style || {}), letterSpacing: 2.5, fontWeight: 700, color: '#c59b48', textAlign: 'center' };
        } else if (definition.binding === 'display.dressCode.title') {
          layer.style = { ...(layer.style || {}), fontFamily: "'Cinzel Decorative', serif", fontWeight: 700, color: '#181514', textAlign: 'center' };
        } else if (definition.binding === 'display.dressCode.intro') {
          layer.style = { ...(layer.style || {}), color: '#555555', textAlign: 'center' };
        } else if (definition.binding === 'dress.code') {
          layer.style = { ...(layer.style || {}), fontFamily: "'Cinzel Decorative', serif", fontWeight: 700, color: '#181514', textAlign: hasImage ? 'left' : 'center', letterSpacing: 1 };
        } else if (definition.binding === 'dress.description') {
          layer.style = { ...(layer.style || {}), color: '#333333', lineHeight: 1.6, textAlign: hasImage ? 'left' : 'center' };
        } else if (definition.binding.endsWith('.title')) {
          layer.style = { ...(layer.style || {}), fontFamily: "'Cinzel Decorative', serif", fontWeight: 700, color: '#181514' };
        } else if (definition.binding.endsWith('.description')) {
          layer.style = { ...(layer.style || {}), color: '#555555', lineHeight: 1.4 };
        }
      } else if (isXv) {
        if (definition.binding === 'display.dressCode.eyebrow') {
          layer.style = { ...(layer.style || {}), letterSpacing: 2.5, fontWeight: 700, color: '#d4af37', textAlign: 'center' };
        } else if (definition.binding === 'display.dressCode.title') {
          layer.style = { ...(layer.style || {}), fontFamily: "'Great Vibes', cursive", fontSize: 44, fontWeight: 700, color: '#faf6f0', textAlign: 'center' };
        } else if (definition.binding === 'display.dressCode.intro') {
          layer.style = { ...(layer.style || {}), color: '#e2d5c3', textAlign: 'center' };
        } else if (definition.binding === 'dress.code') {
          layer.style = { ...(layer.style || {}), fontFamily: "'Great Vibes', cursive", fontSize: 34, fontWeight: 700, color: hasImage ? '#faf6f0' : '#faf6f0', textAlign: hasImage ? 'left' : 'center', letterSpacing: 1 };
        } else if (definition.binding === 'dress.description') {
          layer.style = { ...(layer.style || {}), color: '#e2d5c3', lineHeight: 1.6, textAlign: hasImage ? 'left' : 'center' };
        } else if (definition.binding.endsWith('.title')) {
          layer.style = { ...(layer.style || {}), fontFamily: 'Montserrat, sans-serif', fontWeight: 700, color: '#5c0d18' };
        } else if (definition.binding.endsWith('.description')) {
          layer.style = { ...(layer.style || {}), color: '#5c0d18', lineHeight: 1.4 };
        }
      }
    }
    return layer;
  }

  private lodgingLayerDefinitions(section: VisualInvitationSection): Array<{ type: 'text' | 'image' | 'button' | 'shape'; binding: string; label: string; url?: string; x: number; y: number; width: number; height: number; fontSize: number }> {
    const hotels = this.invitation?.content?.lodging || [];
    const requiredHeight = Math.max(760, 220 + Math.max(1, hotels.length) * 420);
    const pct = (pixels: number) => pixels / requiredHeight * 100;
    const definitions: Array<{ type: 'text' | 'image' | 'button' | 'shape'; binding: string; label: string; url?: string; x: number; y: number; width: number; height: number; fontSize: number }> = [
      { type: 'text', binding: 'display.lodging.eyebrow', label: String(this.pluginSetting(section, 'eyebrow') || 'Para invitados foráneos'), x: 15, y: pct(28), width: 70, height: pct(30), fontSize: 11 },
      { type: 'text', binding: 'display.lodging.title', label: section.title || 'Hospedaje recomendado', x: 10, y: pct(66), width: 80, height: pct(62), fontSize: 34 },
      { type: 'text', binding: 'display.lodging.intro', label: String(this.pluginSetting(section, 'introText') || 'Opciones seleccionadas para hacer más cómoda tu estancia.'), x: 12, y: pct(132), width: 76, height: pct(42), fontSize: 14 }
    ];
    hotels.forEach((hotel, index) => {
      const topPx = 200 + index * 420;
      const prefix = `lodging.${index}`;
      definitions.push(
        { type: 'shape', binding: `${prefix}.card`, label: `Tarjeta de hospedaje ${index + 1}`, x: 8, y: pct(topPx), width: 84, height: pct(390), fontSize: 12 },
        { type: 'image', binding: `${prefix}.image`, label: 'Imagen', url: hotel.imageUrl || '', x: 12, y: pct(topPx + 20), width: 28, height: pct(150), fontSize: 12 },
        { type: 'text', binding: `${prefix}.name`, label: hotel.name || `Hospedaje ${index + 1}`, x: 44, y: pct(topPx + 18), width: 43, height: pct(38), fontSize: 23 },
        { type: 'text', binding: `${prefix}.description`, label: hotel.description || 'Motivo de recomendación', x: 44, y: pct(topPx + 62), width: 43, height: pct(42), fontSize: 13 },
        { type: 'text', binding: `${prefix}.address`, label: hotel.address || 'Dirección', x: 44, y: pct(topPx + 112), width: 43, height: pct(34), fontSize: 12 },
        { type: 'text', binding: `${prefix}.price`, label: hotel.priceLabel || 'Tarifa', x: 12, y: pct(topPx + 190), width: 22, height: pct(30), fontSize: 13 },
        { type: 'text', binding: `${prefix}.agreement`, label: hotel.agreementLabel || 'Convenio', x: 37, y: pct(topPx + 190), width: 23, height: pct(30), fontSize: 12 },
        { type: 'text', binding: `${prefix}.discount`, label: [hotel.discountCode, hotel.discountDescription].filter(Boolean).join(' · ') || 'Descuento', x: 63, y: pct(topPx + 190), width: 24, height: pct(30), fontSize: 12 },
        { type: 'text', binding: `${prefix}.services`, label: (hotel.services || []).join(' · ') || 'Servicios', x: 12, y: pct(topPx + 232), width: 75, height: pct(34), fontSize: 12 },
        { type: 'text', binding: `${prefix}.notes`, label: hotel.notes || 'Notas adicionales', x: 12, y: pct(topPx + 274), width: 75, height: pct(34), fontSize: 12 },
        { type: 'button', binding: `${prefix}.reserve`, label: String(this.pluginSetting(section, 'primaryButtonText') || 'Reservar'), x: 16, y: pct(topPx + 330), width: 24, height: pct(38), fontSize: 12 },
        { type: 'button', binding: `${prefix}.map`, label: 'Abrir mapa', x: 42, y: pct(topPx + 330), width: 20, height: pct(38), fontSize: 12 },
        { type: 'button', binding: `${prefix}.phone`, label: 'Llamar', x: 64, y: pct(topPx + 330), width: 20, height: pct(38), fontSize: 12 }
      );
    });
    return definitions;
  }

  private ensureLodgingCanvasLayers(section: VisualInvitationSection, indexes?: number[]): void {
    const hasLodgingLayers = section.layers.some((layer) => String(layer.binding || '').startsWith('lodging.') || String(layer.binding || '').startsWith('display.lodging.'));
    if (!indexes?.length && hasLodgingLayers) return;
    const requiredHeight = Math.max(760, 220 + Math.max(1, this.invitation?.content?.lodging?.length || 0) * 420);
    if (requiredHeight > section.height) this.resizeSectionPreservingLayerPixels(section, requiredHeight);
    const existing = new Set(section.layers.map((layer) => layer.binding).filter(Boolean));
    const definitions = this.lodgingLayerDefinitions(section).filter((definition) => {
      if (existing.has(definition.binding)) return false;
      if (!indexes?.length) return true;
      const match = definition.binding.match(/^lodging\.(\d+)\./);
      return Boolean(match && indexes.includes(Number(match[1])));
    });
    let topZ = Math.max(0, ...section.layers.map((layer) => layer.zIndex || 0));
    section.layers.push(...definitions.map((definition) => this.createLodgingLayer(definition, ++topZ)));
  }

  private createLodgingLayer(definition: ReturnType<typeof this.lodgingLayerDefinitions>[number], zIndex: number): VisualInvitationLayer {
    const isXv = this.isXvBurgundy();
    const layer = this.newLayer(definition.type, definition.label, definition.x, definition.y, definition.width, definition.height, definition.fontSize);
    layer.binding = definition.binding;
    layer.url = definition.url;
    layer.zIndex = zIndex;
    if (definition.type === 'button') {
      this.applyThemeToLayer(layer, this.design.theme || this.themePresets[0].theme);
      if (isXv) {
        if (definition.binding.endsWith('.reserve')) {
          layer.style = { ...(layer.style || {}), backgroundColor: '#d4af37', color: '#5c0d18', borderColor: '#d4af37', borderRadius: 30, fontWeight: 700, letterSpacing: 0.5 };
        } else {
          layer.style = { ...(layer.style || {}), backgroundColor: '#faf6f0', color: '#5c0d18', borderColor: '#d4af37', borderWidth: 1.5, borderRadius: 30, fontWeight: 700 };
        }
      }
    }
    if (definition.type === 'image') {
      layer.style = { ...(layer.style || {}), objectFit: 'cover', borderRadius: isXv ? 12 : 8, borderColor: isXv ? '#d4af37' : undefined, borderWidth: isXv ? 1 : 0 };
    }
    if (definition.type === 'shape') {
      if (isXv) {
        layer.style = { ...(layer.style || {}), backgroundColor: '#faf6f0', borderColor: '#d4af37', borderWidth: 2, borderStyle: 'solid', borderRadius: 18, boxShadow: '0 14px 34px rgba(92, 13, 24, 0.28)' };
      } else {
        layer.style = { ...(layer.style || {}), backgroundColor: '#ffffff', borderColor: '#d5cbc4', borderWidth: 1, borderStyle: 'solid', borderRadius: 8, boxShadow: '0 8px 24px #00000012' };
      }
      layer.zIndex = Math.max(1, zIndex - 1);
    }
    if (definition.type === 'text' && isXv) {
      if (definition.binding === 'display.lodging.eyebrow') {
        layer.style = { ...(layer.style || {}), letterSpacing: 2.5, fontWeight: 700, color: '#d4af37' };
      } else if (definition.binding === 'display.lodging.title') {
        layer.style = { ...(layer.style || {}), fontFamily: "'Great Vibes', cursive", fontSize: 44, fontWeight: 700, color: '#faf6f0' };
      } else if (definition.binding === 'display.lodging.intro') {
        layer.style = { ...(layer.style || {}), color: '#e2d5c3' };
      } else if (definition.binding.endsWith('.name')) {
        layer.style = { ...(layer.style || {}), fontFamily: "'Great Vibes', cursive", fontSize: 26, fontWeight: 600, color: '#5c0d18' };
      } else if (definition.binding.endsWith('.price') || definition.binding.endsWith('.agreement') || definition.binding.endsWith('.discount')) {
        layer.style = { ...(layer.style || {}), color: '#8c1d2e', fontWeight: 600 };
      } else {
        layer.style = { ...(layer.style || {}), color: '#3a0810' };
      }
    }
    return layer;
  }

  private gallerySourceData(): Array<{ url?: string; title?: string; description?: string; dedication?: string }> {
    const configured = this.invitation?.content?.galleryItems || [];
    if (configured.length) return configured;
    const legacy = (this.invitation?.content?.gallery || []).map((url, i) => ({ url, title: `Fotografía ${i + 1}` }));
    if (legacy.length) return legacy;
    return [{ title: 'Fotografía 1' }, { title: 'Fotografía 2' }];
  }

  private galleryLayerDefinitions(section: VisualInvitationSection): Array<{ type: 'text' | 'image' | 'button' | 'shape'; binding: string; label: string; url?: string; x: number; y: number; width: number; height: number; fontSize: number }> {
    const isHaute = this.isHauteCouture();
    const isXv = this.isXvBurgundy();
    const items = this.gallerySourceData();
    const rows = Math.max(1, Math.ceil(items.length / 2));
    const requiredHeight = Math.max(760, 220 + rows * (isHaute || isXv ? 320 : 330));
    const pct = (pixels: number) => pixels / requiredHeight * 100;
    const definitions: Array<{ type: 'text' | 'image' | 'button' | 'shape'; binding: string; label: string; url?: string; x: number; y: number; width: number; height: number; fontSize: number }> = [
      { type: 'text', binding: 'display.gallery.eyebrow', label: String(this.pluginSetting(section, 'eyebrow') || (isHaute ? 'GALERÍA DE RECUERDOS' : isXv ? 'MIS MOMENTOS FAVORITOS' : 'Momentos')), x: 15, y: pct(28), width: 70, height: pct(30), fontSize: 11 },
      { type: 'text', binding: 'display.gallery.title', label: section.title || (isHaute ? 'Galería de fotos' : isXv ? 'Galería de Recuerdos' : 'Galería'), x: 10, y: pct(66), width: 80, height: pct(62), fontSize: isXv ? 42 : 34 },
      { type: 'text', binding: 'display.gallery.intro', label: String(this.pluginSetting(section, 'introText') || (isXv ? 'Una selección de momentos que han marcado mi camino hasta mis XV.' : isHaute ? 'Momentos especiales que atesoramos con amor.' : 'Una selección de momentos especiales.')), x: 12, y: pct(132), width: 76, height: pct(42), fontSize: 14 }
    ];
    if (isHaute || isXv) {
      items.forEach((item, index) => {
        const left = index % 2 === 0 ? 5 : 52;
        const topPx = 200 + Math.floor(index / 2) * 320;
        const prefix = `gallery.item.${index}`;
        const defaultPhotoUrl = isXv ? (index === 0 ? 'assets/templates/xv-burgundy/portrait.jpg' : 'assets/templates/xv-burgundy/header.jpg') : '';
        definitions.push(
          { type: 'shape', binding: `${prefix}.card`, label: `Tarjeta de fotografía ${index + 1}`, x: left, y: pct(topPx), width: 43, height: pct(295), fontSize: 12 },
          { type: 'image', binding: `${prefix}.image`, label: `Fotografía ${index + 1}`, url: item.url || defaultPhotoUrl, x: left + 2.5, y: pct(topPx + 14), width: 38, height: pct(225), fontSize: 12 },
          { type: 'text', binding: `${prefix}.title`, label: item.title || `Fotografía ${index + 1}`, x: left + 2.5, y: pct(topPx + 250), width: 38, height: pct(30), fontSize: isXv ? 20 : 16 }
        );
        if (item.description) {
          definitions.push(
            { type: 'text', binding: `${prefix}.description`, label: item.description, x: left + 2.5, y: pct(topPx + 282), width: 38, height: pct(24), fontSize: 12 }
          );
        }
        if (item.dedication) {
          definitions.push(
            { type: 'text', binding: `${prefix}.dedication`, label: item.dedication, x: left + 2.5, y: pct(topPx + 308), width: 38, height: pct(22), fontSize: 11 }
          );
        }
      });
    } else {
      items.forEach((item, index) => {
        const left = index % 2 === 0 ? 5 : 52;
        const topPx = 200 + Math.floor(index / 2) * 330;
        const prefix = `gallery.item.${index}`;
        definitions.push(
          { type: 'shape', binding: `${prefix}.card`, label: `Tarjeta de fotografía ${index + 1}`, x: left, y: pct(topPx), width: 43, height: pct(300), fontSize: 12 },
          { type: 'image', binding: `${prefix}.image`, label: `Fotografía ${index + 1}`, url: item.url || '', x: left + 3, y: pct(topPx + 16), width: 37, height: pct(185), fontSize: 12 },
          { type: 'text', binding: `${prefix}.title`, label: item.title || `Fotografía ${index + 1}`, x: left + 3, y: pct(topPx + 210), width: 37, height: pct(28), fontSize: 17 },
          { type: 'text', binding: `${prefix}.description`, label: item.description || 'Descripción', x: left + 3, y: pct(topPx + 241), width: 37, height: pct(25), fontSize: 12 },
          { type: 'text', binding: `${prefix}.dedication`, label: item.dedication || 'Dedicatoria', x: left + 3, y: pct(topPx + 270), width: 37, height: pct(22), fontSize: 11 }
        );
      });
    }
    const first = items[0];
    definitions.push(
      { type: 'image', binding: 'gallery.carousel.image', label: 'Fotografía actual', url: first?.url || (isXv ? 'assets/templates/xv-burgundy/portrait.jpg' : ''), x: 15, y: pct(205), width: 70, height: pct(340), fontSize: 12 },
      { type: 'text', binding: 'gallery.carousel.title', label: first?.title || 'Título de fotografía', x: 20, y: pct(565), width: 60, height: pct(38), fontSize: 22 },
      { type: 'text', binding: 'gallery.carousel.description', label: first?.description || 'Descripción', x: 20, y: pct(610), width: 60, height: pct(32), fontSize: 13 },
      { type: 'text', binding: 'gallery.carousel.dedication', label: first?.dedication || 'Dedicatoria', x: 20, y: pct(648), width: 60, height: pct(28), fontSize: 12 },
      { type: 'button', binding: 'gallery.carousel.previous', label: 'Anterior', x: 5, y: pct(350), width: 9, height: pct(48), fontSize: 18 },
      { type: 'button', binding: 'gallery.carousel.next', label: 'Siguiente', x: 86, y: pct(350), width: 9, height: pct(48), fontSize: 18 },
      { type: 'text', binding: 'gallery.carousel.counter', label: `1 / ${Math.max(1, items.length)}`, x: 42, y: pct(690), width: 16, height: pct(28), fontSize: 12 }
    );
    return definitions;
  }

  private ensureGalleryCanvasLayers(section: VisualInvitationSection, indexes?: number[]): void {
    const hasGalleryLayers = section.layers.some((layer) => String(layer.binding || '').startsWith('gallery.') || String(layer.binding || '').startsWith('display.gallery.'));
    if (!indexes?.length && hasGalleryLayers) return;
    const rows = Math.max(1, Math.ceil(this.gallerySourceData().length / 2));
    const requiredHeight = Math.max(760, 220 + rows * (this.isHauteCouture() || this.isXvBurgundy() ? 320 : 330));
    if (requiredHeight > section.height) this.resizeSectionPreservingLayerPixels(section, requiredHeight);
    const existing = new Set(section.layers.map((layer) => layer.binding).filter(Boolean));
    const definitions = this.galleryLayerDefinitions(section).filter((definition) => {
      if (existing.has(definition.binding)) return false;
      if (!indexes?.length) return true;
      const match = definition.binding.match(/^gallery\.item\.(\d+)\./);
      return Boolean(match && indexes.includes(Number(match[1])));
    });
    let topZ = Math.max(0, ...section.layers.map((layer) => layer.zIndex || 0));
    section.layers.push(...definitions.map((definition) => this.createGalleryLayer(definition, ++topZ)));
  }

  private createGalleryLayer(definition: ReturnType<typeof this.galleryLayerDefinitions>[number], zIndex: number): VisualInvitationLayer {
    const isHaute = this.isHauteCouture();
    const isXv = this.isXvBurgundy();
    const layer = this.newLayer(definition.type, definition.label, definition.x, definition.y, definition.width, definition.height, definition.fontSize);
    layer.binding = definition.binding;
    layer.url = definition.url;
    layer.zIndex = zIndex;
    if (definition.type === 'button') {
      this.applyThemeToLayer(layer, this.design.theme || this.themePresets[0].theme);
      if (isHaute) {
        layer.style = { ...(layer.style || {}), backgroundColor: '#181514', color: '#ffffff', borderColor: '#c59b48', borderWidth: 1, borderStyle: 'solid', borderRadius: 30 };
      } else if (isXv) {
        layer.style = { ...(layer.style || {}), backgroundColor: '#d4af37', color: '#5c0d18', borderColor: '#d4af37', borderRadius: 30, fontWeight: 700 };
      }
    }
    if (definition.type === 'image') {
      if (isHaute) {
        layer.style = { ...(layer.style || {}), objectFit: 'cover', borderRadius: 12, borderColor: '#e8dcce', borderWidth: 1, borderStyle: 'solid' };
      } else if (isXv) {
        layer.style = { ...(layer.style || {}), objectFit: 'cover', borderRadius: 14, borderColor: '#d4af37', borderWidth: 1, borderStyle: 'solid', boxShadow: '0 8px 20px rgba(92, 13, 24, 0.15)' };
      } else {
        layer.style = { ...(layer.style || {}), objectFit: 'cover', borderRadius: 4 };
      }
    }
    if (definition.type === 'shape') {
      if (isHaute) {
        layer.style = { ...(layer.style || {}), backgroundColor: '#ffffff', borderColor: '#c59b48', borderWidth: 1, borderStyle: 'solid', borderRadius: 16, boxShadow: '0 12px 30px rgba(197, 155, 72, 0.14)' };
      } else if (isXv) {
        layer.style = { ...(layer.style || {}), backgroundColor: '#faf6f0', borderColor: '#d4af37', borderWidth: 2, borderStyle: 'solid', borderRadius: 18, boxShadow: '0 14px 34px rgba(92, 13, 24, 0.28)' };
      } else {
        layer.style = { ...(layer.style || {}), backgroundColor: '#ffffff', borderColor: '#d5cbc4', borderWidth: 1, borderStyle: 'solid', borderRadius: 4, boxShadow: '0 8px 24px #00000012' };
      }
      layer.zIndex = Math.max(1, zIndex - 1);
    }
    if (definition.type === 'text') {
      if (isHaute) {
        if (definition.binding === 'display.gallery.eyebrow') {
          layer.style = { ...(layer.style || {}), letterSpacing: 2.5, fontWeight: 700, color: '#c59b48', textAlign: 'center' };
        } else if (definition.binding === 'display.gallery.title') {
          layer.style = { ...(layer.style || {}), fontFamily: "'Cinzel Decorative', serif", fontWeight: 700, color: '#181514', textAlign: 'center' };
        } else if (definition.binding === 'display.gallery.intro') {
          layer.style = { ...(layer.style || {}), color: '#555555', textAlign: 'center' };
        } else if (definition.binding.endsWith('.title')) {
          layer.style = { ...(layer.style || {}), fontFamily: "'Cinzel Decorative', serif", fontWeight: 700, color: '#181514', textAlign: 'center' };
        } else if (definition.binding.endsWith('.description')) {
          layer.style = { ...(layer.style || {}), color: '#555555', textAlign: 'center' };
        } else if (definition.binding.endsWith('.dedication')) {
          layer.style = { ...(layer.style || {}), fontStyle: 'italic', color: '#c59b48', textAlign: 'center' };
        } else if (definition.binding === 'gallery.carousel.title') {
          layer.style = { ...(layer.style || {}), fontFamily: "'Cinzel Decorative', serif", fontWeight: 700, color: '#181514', textAlign: 'center' };
        } else if (definition.binding === 'gallery.carousel.counter') {
          layer.style = { ...(layer.style || {}), color: '#c59b48', fontWeight: 700, textAlign: 'center' };
        }
      } else if (isXv) {
        if (definition.binding === 'display.gallery.eyebrow') {
          layer.style = { ...(layer.style || {}), letterSpacing: 2.5, fontWeight: 700, color: '#d4af37', textAlign: 'center' };
        } else if (definition.binding === 'display.gallery.title') {
          layer.style = { ...(layer.style || {}), fontFamily: "'Great Vibes', cursive", fontSize: 44, fontWeight: 700, color: '#faf6f0', textAlign: 'center' };
        } else if (definition.binding === 'display.gallery.intro') {
          layer.style = { ...(layer.style || {}), color: '#e2d5c3', textAlign: 'center' };
        } else if (definition.binding.endsWith('.title')) {
          layer.style = { ...(layer.style || {}), fontFamily: "'Great Vibes', cursive", fontSize: 24, fontWeight: 600, color: '#5c0d18', textAlign: 'center' };
        } else if (definition.binding.endsWith('.description')) {
          layer.style = { ...(layer.style || {}), color: '#3a0810', textAlign: 'center' };
        } else if (definition.binding.endsWith('.dedication')) {
          layer.style = { ...(layer.style || {}), fontStyle: 'italic', color: '#8c1d2e', textAlign: 'center' };
        } else if (definition.binding === 'gallery.carousel.title') {
          layer.style = { ...(layer.style || {}), fontFamily: "'Great Vibes', cursive", fontSize: 32, fontWeight: 700, color: '#5c0d18', textAlign: 'center' };
        } else if (definition.binding === 'gallery.carousel.counter') {
          layer.style = { ...(layer.style || {}), color: '#d4af37', fontWeight: 700, textAlign: 'center' };
        }
      }
    }
    return layer;
  }

  private createRsvpLayer(
    section: VisualInvitationSection,
    definition: { key: RsvpPartKey; type: 'text' | 'field' | 'button'; binding: string; label: string; placeholder?: string },
    zIndex: number
  ): VisualInvitationLayer {
    const isXv = this.isXvBurgundy();
    const part = this.pluginPartDesign(section, definition.key);
    const configuredText: Partial<Record<RsvpPartKey, string>> = {
      eyebrow: String(this.pluginSetting(section, 'eyebrow') || definition.label),
      title: section.title || definition.label,
      intro: String(this.pluginSetting(section, 'introText') || definition.label),
      submit: String(this.pluginSetting(section, 'primaryButtonText') || definition.label)
    };
    const layer = this.newLayer(definition.type, part.label || configuredText[definition.key] || definition.label, Number(part.x ?? 5), Number(part.y ?? 5), Number(part.width ?? 40), Number(part.height ?? 10), Number(part.fontSize || 14));
    layer.name = this.rsvpPart(definition.key)?.label || definition.label;
    layer.binding = definition.binding;
    layer.placeholder = part.placeholder || definition.placeholder;
    layer.hidden = Boolean(part.hidden);
    layer.zIndex = zIndex;
    layer.style = {
      ...(layer.style || {}), color: part.color, backgroundColor: part.backgroundColor, backgroundImageUrl: part.backgroundImageUrl,
      fontFamily: part.fontFamily, fontSize: part.fontSize, fontWeight: part.fontWeight, textAlign: part.textAlign,
      borderColor: part.borderColor, borderWidth: part.borderWidth, borderStyle: 'solid', borderRadius: part.borderRadius,
      padding: part.padding, boxShadow: part.boxShadow, controlShape: part.shape, controlVariant: part.variant
    };
    if (isXv) {
      if (definition.type === 'field') {
        layer.style = { ...(layer.style || {}), backgroundColor: '#faf6f0', borderColor: '#d4af37', borderWidth: 1.5, borderRadius: 12, color: '#5c0d18', padding: 10, textAlign: 'left', showPlaceholder: true };
      } else if (definition.type === 'button') {
        layer.style = { ...(layer.style || {}), backgroundColor: '#d4af37', color: '#5c0d18', borderColor: '#d4af37', borderRadius: 30, fontWeight: 700, letterSpacing: 0.5 };
      } else if (definition.type === 'text') {
        if (definition.key === 'eyebrow') {
          layer.style = { ...(layer.style || {}), color: '#d4af37', letterSpacing: 2.5, fontWeight: 700 };
        } else if (definition.key === 'title') {
          layer.style = { ...(layer.style || {}), fontFamily: "'Great Vibes', cursive", fontSize: 44, color: '#faf6f0', fontWeight: 700 };
        } else if (definition.key === 'intro') {
          layer.style = { ...(layer.style || {}), color: '#e2d5c3' };
        }
      }
    }
    return layer;
  }

  private defaultPluginSettings(type: string): Record<string, string | number | boolean> {
    const common: Record<string, string | number | boolean> = { eyebrow: '', introText: '', primaryButtonText: '' };
    if (type === 'rsvp') return { ...common, eyebrow: 'Confirmación', introText: '', primaryButtonText: 'Enviar confirmación', identifyButtonText: 'Continuar', showDietary: true, showMessage: true };
    if (type === 'guestPass') return { ...common, eyebrow: 'Acceso personal', introText: 'Presenta este pase al ingresar.', identifyButtonText: 'Ver mi pase', showGuestName: true, showGroup: true, showTable: true, showSeat: true, showCompanions: true, showQr: true };
    if (type === 'guestActivity') return { ...common, eyebrow: 'Tu espacio', introText: 'Consulta tu confirmación, pase y envíos sin salir de la invitación.', identifyButtonText: 'Ver mi actividad', primaryButtonText: 'Ver toda mi actividad', showRsvp: true, showPass: true, showAlbum: true, showSongs: true, showDedications: true };
    if (type === 'countdown') return { ...common, eyebrow: 'Falta poco', introText: '', expiredText: 'El gran día llegó' };
    if (type === 'locations') return { ...common, eyebrow: 'Cómo llegar', introText: '', primaryButtonText: 'Abrir mapa', locationLimit: 0 };
    if (type === 'gifts') return { ...common, eyebrow: 'Un detalle opcional', introText: '', primaryButtonText: 'Abrir mesa', envelopeButtonText: 'Copiar datos', showRegistry: true, showEnvelope: true };
    if (type === 'album') return { ...common, eyebrow: 'Álbum colectivo', introText: 'Comparte tus mejores momentos con los anfitriones.', primaryButtonText: 'Seleccionar fotografía', showGallery: true };
    if (type === 'dedications') return { ...common, eyebrow: 'Libro de mensajes', introText: '', primaryButtonText: 'Enviar dedicatoria', publicNameLabel: 'Tu nombre', messageLabel: 'Mensaje', showWall: true };
    if (type === 'songs') return { ...common, eyebrow: 'Música', introText: '', primaryButtonText: 'Enviar al DJ', songLabel: 'Canción o enlace', showSourceUrl: true, showArtist: true, showDedication: true };
    if (type === 'gallery') return { ...common, eyebrow: 'Momentos', introText: '', displayMode: 'inherit', showCaptions: true, imageHeight: 170 };
    if (type === 'itinerary') return { ...common, eyebrow: 'Programa', introText: '', showDescription: true };
    if (type === 'dressCode') return { ...common, eyebrow: 'Vestimenta', introText: '', showImage: true, showDescription: true };
    if (type === 'lodging') return { ...common, eyebrow: 'Para invitados foráneos', introText: '', primaryButtonText: 'Reservar', showPrice: true, showDiscount: true, showServices: true, showMap: true, showPhone: true };
    return {};
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
    } else if (layer.type === 'field') {
      layer.style.fontFamily = theme.bodyFont;
      layer.style.color = theme.textColor;
      layer.style.backgroundColor = theme.backgroundColor;
      layer.style.borderColor = this.colorWithAlpha(theme.textColor, .28);
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
      if (section.type === 'locations' && content.locations?.length && content.locations.every((location) => !location.mapUrl && !location.wazeUrl)) add('warning', 'Ubicaciones sin navegación', 'Agrega un enlace de Google Maps o Waze para mostrar cómo llegar.', section.id);
      if (section.type === 'itinerary' && !content.itinerary?.length) add('warning', 'Itinerario vacío', 'Agrega actividades o desactiva esta sección.', section.id);
      if (section.type === 'gallery' && !content.gallery?.length) add('warning', 'Galería vacía', 'Agrega fotografías o desactiva esta sección.', section.id);
      if (section.type === 'gifts' && !content.giftRegistry?.length && !this.hasEnvelopeContent(content.digitalEnvelope)) add('warning', 'Mesa de regalos vacía', 'Agrega una mesa o sobre digital, o desactiva la sección.', section.id);
      if (section.type === 'lodging' && !content.lodging?.length) add('warning', 'Hospedaje vacío', 'Agrega por lo menos una recomendación o elimina esta sección.', section.id);

      if (section.type === 'rsvp' && this.hasRsvpCanvasLayers(section)) {
        const visibleBindings = section.layers.filter((layer) => !layer.hidden && this.isRsvpFunctionalLayer(layer)).map((layer) => layer.binding || '');
        if (!visibleBindings.includes('rsvp.submit')) add('critical', 'RSVP sin botón de envío', 'Restaura o muestra el botón para que los invitados puedan enviar su confirmación.', section.id);
        if (!visibleBindings.includes('rsvp.response')) add('critical', 'RSVP sin respuesta', 'Restaura o muestra el campo de respuesta para poder confirmar asistencia.', section.id);
        if (!visibleBindings.includes('rsvp.name')) add('warning', 'RSVP sin nombre', 'Agrega el campo de nombre si la invitación no exige identificación previa.', section.id);
      }
      if (section.type === 'dedications' && this.hasNativeFunctionalLayers(section)) {
        const visibleBindings = section.layers.filter((layer) => !layer.hidden).map((layer) => layer.binding || '');
        if (!visibleBindings.includes('dedication.message')) add('critical', 'Dedicatorias sin mensaje', 'Restaura el campo para que los invitados puedan escribir su dedicatoria.', section.id);
        if (!visibleBindings.includes('dedication.submit')) add('critical', 'Dedicatorias sin botón de envío', 'Restaura el botón para poder enviar el mensaje.', section.id);
      }
      if (section.type === 'songs' && this.hasNativeFunctionalLayers(section)) {
        const visibleBindings = section.layers.filter((layer) => !layer.hidden).map((layer) => layer.binding || '');
        if (!visibleBindings.includes('song.title') && !visibleBindings.includes('song.sourceUrl')) add('critical', 'DJ sin canción o enlace', 'Muestra al menos el campo de canción o el enlace para recibir solicitudes.', section.id);
        if (!visibleBindings.includes('song.submit')) add('critical', 'DJ sin botón de envío', 'Restaura el botón para enviar solicitudes al DJ.', section.id);
      }
      if (section.type === 'album' && this.hasNativeFunctionalLayers(section)) {
        const visibleBindings = section.layers.filter((layer) => !layer.hidden).map((layer) => layer.binding || '');
        if (!visibleBindings.includes('album.upload')) add('critical', 'Álbum sin selector de fotografía', 'Restaura el botón para que los invitados puedan subir imágenes.', section.id);
      }
      if (section.type === 'guestPass' && this.hasNativeFunctionalLayers(section)) {
        const visibleBindings = section.layers.filter((layer) => !layer.hidden).map((layer) => layer.binding || '');
        if (!visibleBindings.includes('pass.email') && !visibleBindings.includes('pass.phone')) add('critical', 'Pase sin dato de acceso', 'Muestra correo o teléfono para que el invitado pueda identificarse.', section.id);
        if (!visibleBindings.includes('pass.identify')) add('critical', 'Pase sin botón de identificación', 'Restaura el botón para consultar los datos del pase.', section.id);
        if (!visibleBindings.includes('pass.qr')) add('warning', 'Pase sin código QR', 'Agrega el código QR si se usará para check-in.', section.id);
      }
      if (section.type === 'guestActivity' && this.hasNativeFunctionalLayers(section)) {
        const visibleBindings = section.layers.filter((layer) => !layer.hidden).map((layer) => layer.binding || '');
        if (!visibleBindings.includes('activity.email') && !visibleBindings.includes('activity.phone')) add('critical', 'Actividad sin dato de acceso', 'Muestra correo o teléfono para que el invitado pueda identificarse.', section.id);
        if (!visibleBindings.includes('activity.identify')) add('critical', 'Actividad sin botón de identificación', 'Restaura el botón para consultar la actividad del invitado.', section.id);
        if (!visibleBindings.includes('activity.manage') && !visibleBindings.includes('activity.full')) add('critical', 'Actividad sin acción', 'Muestra el centro rápido o el centro completo para administrar los envíos.', section.id);
      }
      if (section.type === 'countdown' && this.hasNativeFunctionalLayers(section)) {
        const visibleBindings = section.layers.filter((layer) => !layer.hidden).map((layer) => layer.binding || '');
        const liveValues = ['countdown.days', 'countdown.hours', 'countdown.minutes', 'countdown.seconds'];
        if (!liveValues.some((binding) => visibleBindings.includes(binding))) add('critical', 'Cuenta regresiva sin contador', 'Muestra al menos uno de los valores de tiempo.', section.id);
        if (!visibleBindings.includes('countdown.expired')) add('warning', 'Cuenta regresiva sin mensaje final', 'Agrega un mensaje para mostrar cuando llegue la fecha del evento.', section.id);
      }

      for (const { original, duplicate } of visibleControlDuplicates(section.layers)) {
        add('warning', `Control duplicado: ${this.layerLabel(duplicate)}`, `Ya existe "${this.layerLabel(original)}" conectado a ${duplicate.binding}. La vista pública mostrará solo el primero; elimina u oculta esta copia.`, section.id, duplicate.id);
      }

      for (const layer of section.layers) {
        if (layer.hidden) {
          add('suggestion', `Elemento oculto: ${this.layerLabel(layer)}`, 'Este elemento no se mostrará al público.', section.id, layer.id);
          continue;
        }
        if (['image', 'video', 'audio'].includes(layer.type) && !layer.url?.trim()) {
          const emptyFrame = layer.type === 'image' && layer.style?.frameEnabled;
          add(emptyFrame ? 'suggestion' : 'critical', emptyFrame ? 'Marco sin foto' : `${this.layerTypeLabel(layer.type)} sin archivo`,
            emptyFrame ? 'Este marco no aparecerá en la invitación pública hasta que coloques una foto.' : 'Carga un archivo o elimina este elemento.', section.id, layer.id);
        }
        if (layer.type === 'button' && !layer.url?.trim() && !layer.binding?.trim()) {
          add('critical', `Botón sin destino: ${this.layerLabel(layer)}`, 'Agrega una URL o una acción al botón.', section.id, layer.id);
        }
        const unavailableReason = this.editorLayerUnavailableReason(layer);
        if (unavailableReason) {
          add('warning', `Acción sin configurar: ${this.layerLabel(layer)}`, unavailableReason, section.id, layer.id);
        }
        if ((layer.type === 'text' || layer.type === 'button') && !layer.text?.trim()) {
          add('warning', 'Texto vacío', 'Escribe un texto o elimina el elemento.', section.id, layer.id);
        }
        if (layer.type === 'image' && layer.url?.trim() && !layer.text?.trim()) {
          add('suggestion', `Imagen sin descripción: ${this.layerLabel(layer)}`, 'Agrega una descripción breve para accesibilidad.', section.id, layer.id);
        }
        const layouts: Array<{ device: DeviceMode; x: number; y: number; width: number; height: number }> = this.design.responsiveMode === 'independent'
          ? (['mobile', 'tablet', 'desktop'] as DeviceMode[]).map((device) => ({ device, ...(layer.layouts?.[device] || layer) }))
          : [{ device: 'mobile', ...layer }];
        for (const layout of layouts) {
          const sectionHeight = visualSectionHeight(section);
          const sectionTop = visualSectionOffset(enabledSections, section);
          const top = sectionTop + sectionHeight * layout.y / 100;
          const bottom = top + sectionHeight * layout.height / 100;
          const outsideCanvas = this.design.presentationMode === 'chapters'
            ? layout.y < -.01 || layout.y + layout.height > 100.01
            : top < -.01 || bottom > visualCanvasHeight(enabledSections) + .01;
          const horizontalOverflow = layout.x < -.01 || layout.x + layout.width > 100.01;
          if (horizontalOverflow) {
            add('suggestion', `Elemento parcialmente fuera del ancho en ${this.deviceLabel(layout.device)}`, 'Se conservará su posición; la parte exterior se recortará en la invitación pública.', section.id, layer.id, layout.device);
          }
          if (outsideCanvas) {
            add('critical', `Elemento fuera del área en ${this.deviceLabel(layout.device)}`, 'Muévelo o reduce su tamaño para que no se corte.', section.id, layer.id, layout.device);
          }
          if (horizontalOverflow || outsideCanvas) break;
        }
        if (layer.type === 'text' && !section.background?.imageUrl && this.hasLowContrast(String(layer.style?.color || '#000000'), section.background?.color || '#ffffff')) {
          add('suggestion', `Contraste bajo: ${this.layerLabel(layer)}`, 'Cambia el color del texto o del fondo para mejorar la lectura.', section.id, layer.id);
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
    return ['story', 'locations', 'itinerary', 'dressCode', 'rsvp', 'guestPass', 'guestActivity', 'countdown', 'gifts', 'gallery', 'album', 'dedications', 'songs'].includes(type);
  }

  private hasEnvelopeContent(envelope = this.invitation?.content?.digitalEnvelope): boolean {
    return Boolean(envelope && (envelope.bank || envelope.holder || envelope.account || envelope.clabe || envelope.note || envelope.qrImageUrl));
  }

  private layerTypeLabel(type: VisualLayerType): string {
    return { image: 'Imagen', video: 'Video', audio: 'Audio', button: 'Botón', shape: 'Forma', text: 'Texto', field: 'Campo' }[type];
  }

  private snapRawPosition(layer: VisualInvitationLayer, section: VisualInvitationSection, canvas: HTMLElement, rawX: number, rawY: number, width: number, height: number, ignoredIds = new Set<string>([layer.id])): { x: number; y: number; guideX: number | null; guideY: number | null } {
    const range = this.verticalLayerBounds(section, height);
    if (!this.smartSnapping) {
      return { x: this.bound(rawX, -100, 200), y: this.bound(rawY, range.min, range.max), guideX: null, guideY: null };
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
      x: this.bound(snapX ? snapX.target - snapX.offset : rawX, -100, 200),
      y: this.bound(snapY ? snapY.target - snapY.offset : rawY, range.min, range.max),
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
    if (this.showImportDialog || !this.hasUnsavedChanges || this.saving || this.publishing || this.autosaving || this.uploading) return;
    this.autosaving = true;
    this.autosaveState = 'Guardando...';
    const request = this.persistDesign();
    const snapshot = this.designSnapshot();
    request.subscribe({
      next: ({ invitation }) => { this.acceptSavedDesign(invitation, snapshot); this.autosaving = false; },
      error: () => { this.autosaving = false; this.autosaveState = 'No se pudo guardar'; }
    });
  }

  private markSaved(): void {
    this.lastSavedSnapshot = this.designSnapshot();
    this.autosaveState = 'Guardado';
    this.error = '';
  }

  private acceptSavedDesign(invitation: InvitationModel, snapshot: string): void {
    if (this.designSnapshot() === snapshot) {
      this.invitation = invitation;
      this.markSaved();
      return;
    }
    if (this.invitation) {
      this.invitation.status = invitation.status;
      this.invitation.publishedAt = invitation.publishedAt;
    }
    this.lastSavedSnapshot = snapshot;
    this.autosaveState = 'Cambios pendientes';
  }

  private designSnapshot(): string {
    const content = { ...(this.invitation?.content || {}) };
    delete content.visualDesign;
    delete content.visualDesignDraft;
    return JSON.stringify(this.stripMongoMetadata({ design: this.design, content, rsvpSettings: this.invitation?.rsvpSettings || {} }));
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
    return {
      design: this.clone(this.design),
      content: this.clone(this.invitation?.content || {}),
      rsvpSettings: this.clone(this.invitation?.rsvpSettings || {})
    };
  }

  private contentList(key: ContentListKey): unknown[] {
    if (!this.invitation) return [];
    return this.invitation.content[key] as unknown[];
  }

  private emptyGalleryItem(index = 0): InvitationGalleryItem {
    return {
      id: this.uid(`gallery-${index + 1}`), url: '', title: '', description: '', dedication: '', alt: '',
      featured: false, fit: 'cover', focalX: 50, focalY: 50
    };
  }

  private emptyLodgingItem(priority = 0): InvitationLodgingItem {
    return {
      name: '', description: '', url: '', imageUrl: '', address: '', phone: '', mapUrl: '',
      agreementLabel: '', discountCode: '', discountDescription: '', priceLabel: '', services: [], notes: '', priority
    };
  }

  private syncLegacyGallery(): void {
    if (!this.invitation) return;
    this.invitation.content.gallery = (this.invitation.content.galleryItems || [])
      .map((item) => item.url.trim())
      .filter(Boolean);
  }

  private normalizeInvitationContent(): void {
    if (!this.invitation) return;
    const content = this.invitation.content;
    content.locations = (content.locations || []).map((item, priority) => ({ ...item, schedule: item.schedule || [], priority }));
    content.itinerary = content.itinerary || [];
    content.dressCodeOptions = content.dressCodeOptions || [];
    const savedItems = content.galleryItems || [];
    const galleryUrls = (content.gallery?.length ? content.gallery : savedItems.map((item) => item.url)).filter(Boolean);
    content.galleryItems = galleryUrls.map((url, index) => {
      const saved = savedItems.find((item) => item.url === url);
      return { ...this.emptyGalleryItem(index), ...(saved || {}), url };
    });
    content.gallerySettings = { displayMode: 'grid', showCaptions: true, autoplay: false, intervalSeconds: 5, ...(content.gallerySettings || {}) };
    this.syncLegacyGallery();
    content.giftRegistry = content.giftRegistry || [];
    content.lodging = (content.lodging || []).map((item, priority) => ({ ...this.emptyLodgingItem(priority), ...item, services: item.services || [], priority }));
    content.giftSettings = { enabled: true, showRegistry: true, showEnvelope: true, ...(content.giftSettings || {}) };
    content.digitalEnvelope = content.digitalEnvelope || {};
    content.dedicationSettings = { enabled: true, requireApproval: true, ...(content.dedicationSettings || {}) };
    content.songRequestSettings = { enabled: true, maxRequestsPerGuest: 3, allowDedications: true, requireApproval: true, ...(content.songRequestSettings || {}) };
    content.moderationSettings = {
      notifyOnReview: true,
      autoApproveRoles: [], autoApproveGroups: [], autoApproveEmails: [], autoApprovePhones: [],
      autoApproveAlbum: false, autoApproveSongs: false, autoApproveDedications: false,
      ...(content.moderationSettings || {})
    } as InvitationModerationSettings;
    this.invitation.rsvpSettings = {
      allowMaybe: true, allowChangesUntilDeadline: true, declineRequiresConfirmation: true,
      reminderDaysBeforeDeadline: 3, identityMethods: ['email', 'phone'],
      allowCompanionsDefault: false, defaultAllowedCompanions: 0,
      ...(this.invitation.rsvpSettings || {})
    };
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
    if (this.previewingMediaLayerId && !this.selectedLayerIds.includes(this.previewingMediaLayerId)) this.previewingMediaLayerId = '';
  }

  private clearLayerSelection(): void {
    this.selectedLayerIds = [];
    this.selectedLayerId = '';
    this.previewingMediaLayerId = '';
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

  private normalizeDesignGeometry(): void {
    const devices: DeviceMode[] = ['mobile', 'tablet', 'desktop'];
    for (const section of this.design.sections || []) {
      section.height = this.bound(this.finiteNumber(section.height, 640), 240, 1600);
      for (const layer of section.layers || []) {
        this.normalizeStoredLayout(layer);
        if (!layer.layouts) continue;
        for (const device of devices) {
          const layout = layer.layouts[device];
          if (layout) this.normalizeStoredLayout(layout);
        }
      }
    }
  }

  private normalizeStoredLayout(layout: VisualInvitationLayerLayout): void {
    layout.x = this.bound(this.finiteNumber(layout.x, 0), -100, 200);
    layout.y = this.bound(this.finiteNumber(layout.y, 0), -10000, 10000);
    layout.width = this.bound(this.finiteNumber(layout.width, 1), 1, 100);
    layout.height = this.bound(this.finiteNumber(layout.height, 1), 1, 100);
    if (layout.rotation !== undefined) layout.rotation = this.bound(this.finiteNumber(layout.rotation, 0), -360, 360);
  }

  private finiteNumber(value: unknown, fallback: number): number {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  private bound(value: number, min: number, max: number): number {
    return Math.round(Math.max(min, Math.min(max, value)) * 100) / 100;
  }

  private fail(message: string): void {
    this.error = message;
    this.loading = false;
  }
}
