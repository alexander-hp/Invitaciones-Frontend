import { Component, OnInit } from '@angular/core';
import { CdkDragDrop, CdkDragEnd, moveItemInArray } from '@angular/cdk/drag-drop';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { ApiService } from '../../core/api.service';
import { EventModel, InvitationModel, VisualInvitationDesign, VisualInvitationLayer, VisualInvitationSection, VisualLayerType } from '../../core/models';

type DeviceMode = 'mobile' | 'tablet' | 'desktop';

@Component({ selector: 'app-visual-invitation-editor', templateUrl: './visual-invitation-editor.component.html', styleUrls: ['./visual-invitation-editor.component.css'] })
export class VisualInvitationEditorComponent implements OnInit {
  invitation?: InvitationModel; event?: EventModel; design!: VisualInvitationDesign;
  selectedSectionId = ''; selectedLayerId = ''; device: DeviceMode = 'mobile';
  loading = true; saving = false; uploading = false; message = ''; error = '';
  private undoStack: VisualInvitationDesign[] = []; private redoStack: VisualInvitationDesign[] = [];
  readonly sectionCatalog = [
    { type: 'story', label: 'Nuestra historia' }, { type: 'locations', label: 'Ubicaciones' }, { type: 'itinerary', label: 'Itinerario' },
    { type: 'dressCode', label: 'Vestimenta' }, { type: 'rsvp', label: 'Confirmación RSVP' }, { type: 'gifts', label: 'Mesa de regalos' },
    { type: 'gallery', label: 'Galería' }, { type: 'album', label: 'Álbum colectivo' }, { type: 'dedications', label: 'Dedicatorias' }, { type: 'songs', label: 'Peticiones al DJ' }
  ];
  constructor(private route: ActivatedRoute, private router: Router, private api: ApiService) {}
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.api.listInvitations().subscribe({ next: ({ invitations }) => {
      this.invitation = invitations.find((item) => (item._id || item.id) === id);
      if (!this.invitation) return this.fail('Invitación no encontrada.');
      this.design = this.clone(this.invitation.content?.visualDesign || this.createDefaultDesign());
      this.selectedSectionId = this.design.sections[0]?.id || '';
      const eventId = typeof this.invitation.event === 'string' ? this.invitation.event : (this.invitation.event._id || this.invitation.event.id || '');
      if (!eventId) { this.loading = false; return; }
      this.api.getEvent(eventId).subscribe({ next: ({ event }) => { this.event = event; this.loading = false; }, error: () => { this.loading = false; } });
    }, error: () => this.fail('No fue posible cargar la invitación.') });
  }
  get selectedSection(): VisualInvitationSection | undefined { return this.design?.sections.find((item) => item.id === this.selectedSectionId); }
  get selectedLayer(): VisualInvitationLayer | undefined { return this.selectedSection?.layers.find((item) => item.id === this.selectedLayerId); }
  get artboardWidth(): number { return this.device === 'mobile' ? 390 : this.device === 'tablet' ? 768 : 1180; }
  selectSection(section: VisualInvitationSection): void { this.selectedSectionId = section.id; this.selectedLayerId = ''; }
  selectLayer(section: VisualInvitationSection, layer: VisualInvitationLayer, event: MouseEvent): void { event.stopPropagation(); this.selectedSectionId = section.id; this.selectedLayerId = layer.id; }
  addSection(type: string, title: string): void { this.recordHistory(); const section: VisualInvitationSection = { id: this.uid('section'), type, title, enabled: true, layout: 'canvas', height: 520, background: { color: '#fff', overlay: 0 }, layers: [] }; section.layers.push(this.newLayer('text', title, 15, 12, 70, 18)); this.design.sections.push(section); this.selectedSectionId = section.id; this.selectedLayerId = section.layers[0].id; }
  addLayer(type: VisualLayerType): void { const section = this.selectedSection; if (!section) return; this.recordHistory(); const text = type === 'text' ? 'Escribe aquí' : type === 'button' ? 'Ver detalles' : ''; const layer = this.newLayer(type, text, 20, 25, type === 'text' ? 60 : 45, type === 'text' ? 18 : 30); if (type === 'shape') layer.style = { backgroundColor: '#d88f7d', borderRadius: 8, opacity: 1 }; section.layers.push(layer); this.selectedLayerId = layer.id; }
  removeLayer(): void { const section = this.selectedSection; if (!section || !this.selectedLayer) return; this.recordHistory(); section.layers = section.layers.filter((item) => item.id !== this.selectedLayerId); this.selectedLayerId = ''; }
  removeSection(section: VisualInvitationSection): void { if (this.design.sections.length <= 1) return; this.recordHistory(); this.design.sections = this.design.sections.filter((item) => item.id !== section.id); this.selectedSectionId = this.design.sections[0].id; this.selectedLayerId = ''; }
  dropSection(event: CdkDragDrop<VisualInvitationSection[]>): void { if (event.previousIndex === event.currentIndex) return; this.recordHistory(); moveItemInArray(this.design.sections, event.previousIndex, event.currentIndex); }
  layerDropped(event: CdkDragEnd, layer: VisualInvitationLayer, section: VisualInvitationSection): void { const canvas = event.source.element.nativeElement.parentElement as HTMLElement; if (!canvas) return; this.recordHistory(); layer.x = this.bound(layer.x + event.distance.x / canvas.clientWidth * 100, 0, 100 - layer.width); layer.y = this.bound(layer.y + event.distance.y / canvas.clientHeight * 100, 0, 100 - layer.height); event.source.reset(); this.selectedSectionId = section.id; this.selectedLayerId = layer.id; }
  layerStyle(layer: VisualInvitationLayer): Record<string, string> { const s = layer.style || {}; return { left: `${layer.x}%`, top: `${layer.y}%`, width: `${layer.width}%`, height: `${layer.height}%`, transform: `rotate(${layer.rotation || 0}deg)`, zIndex: String(layer.zIndex || 1), color: String(s.color || '#2d2927'), backgroundColor: String(s.backgroundColor || 'transparent'), fontFamily: String(s.fontFamily || 'Arial, sans-serif'), fontSize: `${Number(s.fontSize || 30)}px`, fontWeight: String(s.fontWeight || 400), textAlign: String(s.textAlign || 'center'), borderRadius: `${Number(s.borderRadius || 0)}px`, opacity: String(s.opacity ?? 1) }; }
  sectionStyle(section: VisualInvitationSection): Record<string, string> { const bg = section.background || {}; const alpha = Math.round((bg.overlay || 0) * 255).toString(16).padStart(2, '0'); return { height: `${section.height}px`, backgroundColor: bg.color || '#fff', backgroundImage: bg.imageUrl ? `linear-gradient(#000000${alpha},#000000${alpha}),url("${bg.imageUrl}")` : 'none' }; }
  updateLayerStyle(key: string, value: string | number | boolean): void { const layer = this.selectedLayer; if (!layer) return; layer.style = { ...(layer.style || {}), [key]: value }; }
  uploadImage(fileInput: HTMLInputElement, target: 'layer' | 'background'): void { const file = fileInput.files?.[0]; if (!file || !this.invitation) return; const eventId = typeof this.invitation.event === 'string' ? this.invitation.event : (this.invitation.event._id || this.invitation.event.id); this.uploading = true; this.error = ''; this.api.createUploadUrl({ fileName: file.name, contentType: file.type, folder: 'assets', event: eventId, size: file.size }).pipe(switchMap(({ uploadUrl, publicUrl }) => this.api.uploadAsset(uploadUrl, file).pipe(switchMap(() => [{ publicUrl }])))).subscribe({ next: ({ publicUrl }) => { this.recordHistory(); if (target === 'background' && this.selectedSection) this.selectedSection.background = { ...(this.selectedSection.background || {}), imageUrl: publicUrl }; else if (this.selectedLayer) this.selectedLayer.url = publicUrl; this.uploading = false; fileInput.value = ''; }, error: () => { this.uploading = false; this.error = 'No fue posible subir el archivo.'; } }); }
  save(): void { if (!this.invitation) return; const id = this.invitation._id || this.invitation.id || ''; this.saving = true; this.error = ''; this.design.active = true; this.api.updateInvitation(id, { content: { ...this.invitation.content, template: 'visual-builder', visualDesign: this.design } }).subscribe({ next: ({ invitation }) => { this.invitation = invitation; this.saving = false; this.message = 'Diseño guardado.'; setTimeout(() => this.message = '', 2500); }, error: (error) => { this.saving = false; this.error = error?.error?.message || 'No fue posible guardar el diseño.'; } }); }
  undo(): void { const previous = this.undoStack.pop(); if (!previous) return; this.redoStack.push(this.clone(this.design)); this.design = previous; this.restoreSelection(); }
  redo(): void { const next = this.redoStack.pop(); if (!next) return; this.undoStack.push(this.clone(this.design)); this.design = next; this.restoreSelection(); }
  back(): void { const id = this.invitation?._id || this.invitation?.id; this.router.navigate(['/new/invitations', id, 'editor']); }
  openPreview(): void { if (this.invitation?.slug) window.open(`/new/i/${this.invitation.slug}`, '_blank'); }
  private createDefaultDesign(): VisualInvitationDesign { const content = this.invitation?.content || {}; const hero: VisualInvitationSection = { id: this.uid('hero'), type: 'hero', title: 'Portada', enabled: true, layout: 'canvas', height: 700, background: { color: '#f7efea', imageUrl: content.coverImageUrl || '', overlay: content.coverImageUrl ? .28 : 0 }, layers: [] }; hero.layers = [this.newLayer('text', content.headline || 'Nuestra celebración', 10, 30, 80, 18, 52), this.newLayer('text', content.subheadline || 'Acompáñanos en este día especial', 16, 53, 68, 12, 22)]; return { version: 1, active: false, mode: 'easy', sections: [hero] }; }
  private newLayer(type: VisualLayerType, text: string, x: number, y: number, width: number, height: number, fontSize = 30): VisualInvitationLayer { return { id: this.uid('layer'), type, text, x, y, width, height, rotation: 0, zIndex: 1, locked: false, style: { color: '#2d2927', fontFamily: 'Arial, sans-serif', fontSize, fontWeight: type === 'text' ? 600 : 400, textAlign: 'center', borderRadius: 0, opacity: 1 } }; }
  private recordHistory(): void { if (!this.design) return; this.undoStack.push(this.clone(this.design)); if (this.undoStack.length > 30) this.undoStack.shift(); this.redoStack = []; }
  private restoreSelection(): void { if (!this.design.sections.some((s) => s.id === this.selectedSectionId)) this.selectedSectionId = this.design.sections[0]?.id || ''; if (!this.selectedSection?.layers.some((l) => l.id === this.selectedLayerId)) this.selectedLayerId = ''; }
  private uid(prefix: string): string { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
  private clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }
  private bound(value: number, min: number, max: number): number { return Math.round(Math.max(min, Math.min(max, value)) * 100) / 100; }
  private fail(message: string): void { this.error = message; this.loading = false; }
}
