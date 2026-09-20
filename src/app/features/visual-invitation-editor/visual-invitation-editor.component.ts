import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ApiService } from '../../core/api.service';
import {
  EventModel, InvitationModel, VisualDesignTemplateModel, VisualInvitationDesign,
  VisualInvitationAsset, VisualInvitationLayer, VisualInvitationLayerLayout, VisualInvitationSection, VisualLayerType
} from '../../core/models';

type DeviceMode = 'mobile' | 'tablet' | 'desktop';
type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';
type InspectorView = 'properties' | 'layers';
type DesignMedia = { id?: string; url: string; type: 'image' | 'video' | 'audio'; label: string; stored?: boolean };
type MediaFilter = 'all' | DesignMedia['type'];

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
  templateName = '';
  selectedSectionId = '';
  selectedLayerId = '';
  selectedLayerIds: string[] = [];
  device: DeviceMode = 'mobile';
  loading = true;
  saving = false;
  publishing = false;
  uploading = false;
  savingTemplate = false;
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

  private undoStack: VisualInvitationDesign[] = [];
  private redoStack: VisualInvitationDesign[] = [];
  private autosaveHandle?: ReturnType<typeof setInterval>;
  private lastSavedSnapshot = '';
  private suppressNextLayerClickId = '';
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

  readonly builtInPresets = [
    { key: 'editorial', label: 'Editorial claro', colors: ['#f6f1eb', '#24211f'] },
    { key: 'romantic', label: 'Romántico floral', colors: ['#f8e9e8', '#8d4f58'] },
    { key: 'night', label: 'Noche elegante', colors: ['#171717', '#d6b46c'] }
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

  constructor(private route: ActivatedRoute, private router: Router, private api: ApiService) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.api.listInvitations().subscribe({
      next: ({ invitations }) => {
        this.invitation = invitations.find((item) => (item._id || item.id) === id);
        if (!this.invitation) return this.fail('Invitación no encontrada.');
        const storedDesign = this.invitation.content?.visualDesign;
        this.design = this.clone(storedDesign?.sections?.length ? storedDesign : this.createDefaultDesign());
        this.design.responsiveMode = this.design.responsiveMode || 'shared';
        this.design.assets = this.design.assets || [];
        this.selectedSectionId = this.design.sections[0]?.id || '';
        this.lastSavedSnapshot = this.designSnapshot();
        this.startAutosave();
        this.loadPersonalTemplates();
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

  ngOnDestroy(): void {
    if (this.autosaveHandle) clearInterval(this.autosaveHandle);
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

  get artboardWidth(): number {
    return this.device === 'mobile' ? 390 : this.device === 'tablet' ? 768 : 1180;
  }

  get selectedLayout(): VisualInvitationLayerLayout | undefined {
    return this.selectedLayer ? this.editableLayout(this.selectedLayer) : undefined;
  }

  get hasUnsavedChanges(): boolean {
    return !!this.design && this.designSnapshot() !== this.lastSavedSnapshot;
  }

  setDevice(device: DeviceMode): void {
    this.device = device;
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
      media.set(asset.url, { id: asset.id, url: asset.url, type: asset.type, label: asset.name, stored: true });
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

  selectSection(section: VisualInvitationSection): void {
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
    const section = this.makeSection(type, title, '#ffffff', 540);
    if (type !== 'custom' && !this.isFunctionalType(type)) section.layers.push(this.newLayer('text', title, 15, 12, 70, 18));
    this.design.sections.push(section);
    this.selectedSectionId = section.id;
    this.setLayerSelection(section.layers[0] ? [section.layers[0].id] : []);
  }

  addLayer(type: VisualLayerType): void {
    const section = this.selectedSection;
    if (!section) return;
    this.recordHistory();
    const text = type === 'text' ? 'Escribe aquí' : type === 'button' ? 'Ver detalles' : '';
    const layer = this.newLayer(type, text, 20, 25, type === 'text' ? 60 : 45, type === 'text' ? 18 : 30);
    layer.zIndex = Math.max(0, ...section.layers.map((item) => item.zIndex || 0)) + 1;
    if (type === 'shape') layer.style = { backgroundColor: '#d88f7d', borderRadius: 8, opacity: 1 };
    section.layers.push(layer);
    this.setLayerSelection([layer.id]);
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
    layers.forEach((layer, index) => { layer.groupId = layers.length > 1 ? groupId : undefined; layer.zIndex = topZ + index + 1; });
    section.layers.push(...layers);
    this.setLayerSelection(layers.map((layer) => layer.id));
    this.inspectorView = 'properties';
    this.flash('Bloque agregado. Puedes moverlo y personalizarlo.');
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
    if (layer.locked || this.resizing || (event.target as HTMLElement).closest('.resize-handle, audio, video, button, input')) return;
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

  @HostListener('document:pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
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
      resize.layout.x = this.bound(nextX, 0, resize.x + resize.width - 4);
      resize.layout.y = this.bound(nextY, 0, resize.y + resize.height - 4);
      resize.layout.width = this.bound(nextWidth, 4, 100 - resize.layout.x);
      resize.layout.height = this.bound(nextHeight, 4, 100 - resize.layout.y);
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
    if (modifier && event.key.toLowerCase() === 'd' && this.selectedLayer) { event.preventDefault(); this.duplicateLayer(); return; }
    if ((event.key === 'Delete' || event.key === 'Backspace') && this.selectedLayer) { event.preventDefault(); this.removeLayer(); return; }
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
    const layout = this.layoutFor(layer);
    return {
      left: `${layout.x}%`, top: `${layout.y}%`, width: `${layout.width}%`, height: `${layout.height}%`,
      transform: `rotate(${layout.rotation || 0}deg)`, zIndex: String(layer.zIndex || 1),
      color: String(s.color || '#2d2927'), backgroundColor: String(s.backgroundColor || 'transparent'),
      fontFamily: String(s.fontFamily || 'Arial, sans-serif'), fontSize: `${Number(s.fontSize || 30)}px`,
      fontWeight: String(s.fontWeight || 400), textAlign: String(s.textAlign || 'center'),
      borderRadius: `${Number(s.borderRadius || 0)}px`, opacity: String(s.opacity ?? 1)
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

  applyPersonalTemplate(template: VisualDesignTemplateModel): void {
    if (!this.confirmReplaceDesign()) return;
    this.recordHistory();
    this.design = this.regenerateIds(this.clone(template.design));
    this.design.active = true;
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
      next: ({ invitation }) => { this.invitation = invitation; this.publishing = false; this.markSaved(); this.flash('Diseño publicado.'); this.openPreview(); },
      error: (error) => { this.publishing = false; this.error = error?.error?.message || 'No fue posible publicar.'; }
    });
  }

  undo(): void {
    const previous = this.undoStack.pop();
    if (!previous) return;
    this.redoStack.push(this.clone(this.design));
    this.design = previous;
    this.restoreSelection();
  }

  redo(): void {
    const next = this.redoStack.pop();
    if (!next) return;
    this.undoStack.push(this.clone(this.design));
    this.design = next;
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
    return { version: 1, active: false, mode: 'easy', responsiveMode: 'shared', sections };
  }

  private makeSection(type: string, title: string, color: string, height: number): VisualInvitationSection {
    return { id: this.uid('section'), type, title, enabled: true, layout: 'canvas', height, background: { color, overlay: 0 }, layers: [] };
  }

  private newLayer(type: VisualLayerType, text: string, x: number, y: number, width: number, height: number, fontSize = 30): VisualInvitationLayer {
    return {
      id: this.uid('layer'), type, name: text.trim().slice(0, 32) || this.layerTypeLabel(type), text, x, y, width, height, rotation: 0, zIndex: 1, locked: false, hidden: false,
      style: { color: '#2d2927', fontFamily: 'Arial, sans-serif', fontSize, fontWeight: type === 'text' ? 600 : 400, textAlign: 'center', borderRadius: 0, opacity: 1 }
    };
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
    return JSON.stringify(this.stripMongoMetadata(this.design));
  }

  private confirmReplaceDesign(): boolean {
    if (!this.design?.sections?.length) return true;
    return window.confirm('Esta acción reemplazará el diseño actual. Puedes usar Deshacer inmediatamente después.');
  }

  private recordHistory(): void {
    if (!this.design) return;
    this.undoStack.push(this.clone(this.design));
    if (this.undoStack.length > 30) this.undoStack.shift();
    this.redoStack = [];
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
