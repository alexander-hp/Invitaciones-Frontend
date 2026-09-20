import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CdkDragDrop, CdkDragEnd, CdkDragMove, moveItemInArray } from '@angular/cdk/drag-drop';
import { ActivatedRoute, Router } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';
import { ApiService } from '../../core/api.service';
import {
  EventModel, InvitationModel, VisualDesignTemplateModel, VisualInvitationDesign,
  VisualInvitationLayer, VisualInvitationLayerLayout, VisualInvitationSection, VisualLayerType
} from '../../core/models';

type DeviceMode = 'mobile' | 'tablet' | 'desktop';
type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';
type InspectorView = 'properties' | 'layers';
type DesignMedia = { url: string; type: 'image' | 'video' | 'audio'; label: string };

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

  private undoStack: VisualInvitationDesign[] = [];
  private redoStack: VisualInvitationDesign[] = [];
  private autosaveHandle?: ReturnType<typeof setInterval>;
  private lastSavedSnapshot = '';
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

  readonly builtInPresets = [
    { key: 'editorial', label: 'Editorial claro', colors: ['#f6f1eb', '#24211f'] },
    { key: 'romantic', label: 'Romántico floral', colors: ['#f8e9e8', '#8d4f58'] },
    { key: 'night', label: 'Noche elegante', colors: ['#171717', '#d6b46c'] }
  ];

  readonly sectionCatalog = [
    { type: 'story', label: 'Nuestra historia' }, { type: 'locations', label: 'Ubicaciones' },
    { type: 'itinerary', label: 'Itinerario' }, { type: 'dressCode', label: 'Vestimenta' },
    { type: 'rsvp', label: 'Confirmación RSVP' }, { type: 'gifts', label: 'Mesa de regalos' },
    { type: 'gallery', label: 'Galería' }, { type: 'album', label: 'Álbum colectivo' },
    { type: 'dedications', label: 'Dedicatorias' }, { type: 'songs', label: 'Peticiones al DJ' }
  ];

  constructor(private route: ActivatedRoute, private router: Router, private api: ApiService) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.api.listInvitations().subscribe({
      next: ({ invitations }) => {
        this.invitation = invitations.find((item) => (item._id || item.id) === id);
        if (!this.invitation) return this.fail('Invitación no encontrada.');
        this.design = this.clone(this.invitation.content?.visualDesign || this.createDefaultDesign());
        this.design.responsiveMode = this.design.responsiveMode || 'shared';
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

  selectSection(section: VisualInvitationSection): void {
    this.selectedSectionId = section.id;
    this.selectedLayerId = '';
  }

  selectLayer(section: VisualInvitationSection, layer: VisualInvitationLayer, event: MouseEvent): void {
    event.stopPropagation();
    this.selectedSectionId = section.id;
    this.selectedLayerId = layer.id;
    this.inspectorView = 'properties';
  }

  selectLayerFromPanel(layer: VisualInvitationLayer): void {
    this.selectedLayerId = layer.id;
    this.inspectorView = 'properties';
  }

  addSection(type: string, title: string): void {
    this.recordHistory();
    const section = this.makeSection(type, title, '#ffffff', 540);
    if (!this.isFunctionalType(type)) section.layers.push(this.newLayer('text', title, 15, 12, 70, 18));
    this.design.sections.push(section);
    this.selectedSectionId = section.id;
    this.selectedLayerId = section.layers[0]?.id || '';
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
    this.selectedLayerId = layer.id;
  }

  removeLayer(): void {
    const section = this.selectedSection;
    if (!section || !this.selectedLayer) return;
    this.recordHistory();
    section.layers = section.layers.filter((item) => item.id !== this.selectedLayerId);
    this.selectedLayerId = '';
  }

  duplicateLayer(): void {
    const section = this.selectedSection;
    const layer = this.selectedLayer;
    if (!section || !layer) return;
    this.recordHistory();
    const copy = this.clone(layer);
    copy.id = this.uid('layer');
    copy.name = `${this.layerLabel(layer)} copia`;
    copy.x = this.bound(copy.x + 3, 0, 100 - copy.width);
    copy.y = this.bound(copy.y + 3, 0, 100 - copy.height);
    if (copy.layouts) Object.values(copy.layouts).forEach((layout) => {
      if (!layout) return;
      layout.x = this.bound(layout.x + 3, 0, 100 - layout.width);
      layout.y = this.bound(layout.y + 3, 0, 100 - layout.height);
    });
    copy.zIndex = (copy.zIndex || 1) + 1;
    section.layers.push(copy);
    this.selectedLayerId = copy.id;
  }

  removeSection(section: VisualInvitationSection): void {
    if (this.design.sections.length <= 1) return;
    this.recordHistory();
    this.design.sections = this.design.sections.filter((item) => item.id !== section.id);
    this.selectedSectionId = this.design.sections[0].id;
    this.selectedLayerId = '';
  }

  dropSection(event: CdkDragDrop<VisualInvitationSection[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    this.recordHistory();
    moveItemInArray(this.design.sections, event.previousIndex, event.currentIndex);
  }

  layerDropped(event: CdkDragEnd, layer: VisualInvitationLayer, section: VisualInvitationSection): void {
    if (this.resizing) return;
    const canvas = event.source.element.nativeElement.parentElement as HTMLElement;
    if (!canvas) return;
    this.recordHistory();
    const snapped = this.snapPosition(layer, section, canvas, event.distance.x, event.distance.y);
    const layout = this.editableLayout(layer);
    layout.x = snapped.x;
    layout.y = snapped.y;
    this.guideX = null;
    this.guideY = null;
    event.source.reset();
    this.selectedSectionId = section.id;
    this.selectedLayerId = layer.id;
  }

  layerMoved(event: CdkDragMove, layer: VisualInvitationLayer, section: VisualInvitationSection): void {
    if (layer.locked || this.resizing) return;
    const canvas = event.source.element.nativeElement.parentElement as HTMLElement;
    if (!canvas) return;
    const snapped = this.snapPosition(layer, section, canvas, event.distance.x, event.distance.y);
    this.guideX = snapped.guideX;
    this.guideY = snapped.guideY;
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
  onResizeMove(event: PointerEvent): void {
    const state = this.resizeState;
    if (!state) return;
    event.preventDefault();
    const dx = (event.clientX - state.startX) / state.canvas.clientWidth * 100;
    const dy = (event.clientY - state.startY) / state.canvas.clientHeight * 100;
    const west = state.corner.includes('w');
    const north = state.corner.includes('n');
    const nextX = west ? state.x + dx : state.x;
    const nextY = north ? state.y + dy : state.y;
    const nextWidth = west ? state.width - dx : state.width + dx;
    const nextHeight = north ? state.height - dy : state.height + dy;
    state.layout.x = this.bound(nextX, 0, state.x + state.width - 4);
    state.layout.y = this.bound(nextY, 0, state.y + state.height - 4);
    state.layout.width = this.bound(nextWidth, 4, 100 - state.layout.x);
    state.layout.height = this.bound(nextHeight, 4, 100 - state.layout.y);
  }

  @HostListener('document:pointerup')
  endResize(): void {
    this.resizeState = undefined;
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
    if (event.key === 'Escape') { this.selectedLayerId = ''; return; }
    const layer = this.selectedLayer;
    if (!layer || layer.locked || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    this.recordHistory();
    const step = event.shiftKey ? 2 : .25;
    const layout = this.editableLayout(layer);
    if (event.key === 'ArrowLeft') layout.x = this.bound(layout.x - step, 0, 100 - layout.width);
    if (event.key === 'ArrowRight') layout.x = this.bound(layout.x + step, 0, 100 - layout.width);
    if (event.key === 'ArrowUp') layout.y = this.bound(layout.y - step, 0, 100 - layout.height);
    if (event.key === 'ArrowDown') layout.y = this.bound(layout.y + step, 0, 100 - layout.height);
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
    this.selectedLayerId = '';
  }

  applyPersonalTemplate(template: VisualDesignTemplateModel): void {
    if (!this.confirmReplaceDesign()) return;
    this.recordHistory();
    this.design = this.regenerateIds(this.clone(template.design));
    this.design.active = true;
    this.selectedSectionId = this.design.sections[0]?.id || '';
    this.selectedLayerId = '';
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
    design.sections = design.sections.map((section) => ({
      ...section,
      id: this.uid('section'),
      layers: section.layers.map((layer) => ({ ...layer, id: this.uid('layer') }))
    }));
    return design;
  }

  private isFunctionalType(type: string): boolean {
    return ['locations', 'itinerary', 'dressCode', 'rsvp', 'gifts', 'gallery', 'album', 'dedications', 'songs'].includes(type);
  }

  private layerTypeLabel(type: VisualLayerType): string {
    return { image: 'Imagen', video: 'Video', audio: 'Audio', button: 'Botón', shape: 'Forma', text: 'Texto' }[type];
  }

  private snapPosition(layer: VisualInvitationLayer, section: VisualInvitationSection, canvas: HTMLElement, dx: number, dy: number): { x: number; y: number; guideX: number | null; guideY: number | null } {
    const layout = this.layoutFor(layer);
    const rawX = this.bound(layout.x + dx / canvas.clientWidth * 100, 0, 100 - layout.width);
    const rawY = this.bound(layout.y + dy / canvas.clientHeight * 100, 0, 100 - layout.height);
    const xTargets = [0, 50, 100];
    const yTargets = [0, 50, 100];
    for (const other of section.layers) {
      if (other.id === layer.id || other.hidden) continue;
      const otherLayout = this.layoutFor(other);
      xTargets.push(otherLayout.x, otherLayout.x + otherLayout.width / 2, otherLayout.x + otherLayout.width);
      yTargets.push(otherLayout.y, otherLayout.y + otherLayout.height / 2, otherLayout.y + otherLayout.height);
    }
    const xAnchors = [{ value: rawX, offset: 0 }, { value: rawX + layout.width / 2, offset: layout.width / 2 }, { value: rawX + layout.width, offset: layout.width }];
    const yAnchors = [{ value: rawY, offset: 0 }, { value: rawY + layout.height / 2, offset: layout.height / 2 }, { value: rawY + layout.height, offset: layout.height }];
    const snapX = this.closestSnap(xAnchors, xTargets, 800 / Math.max(canvas.clientWidth, 1));
    const snapY = this.closestSnap(yAnchors, yTargets, 800 / Math.max(canvas.clientHeight, 1));
    return {
      x: this.bound(snapX ? snapX.target - snapX.offset : rawX, 0, 100 - layout.width),
      y: this.bound(snapY ? snapY.target - snapY.offset : rawY, 0, 100 - layout.height),
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
    if (!this.selectedSection?.layers.some((layer) => layer.id === this.selectedLayerId)) this.selectedLayerId = '';
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
