import { Subject } from 'rxjs';
import { InvitationModel } from '../../core/models';
import { VisualInvitationEditorComponent } from './visual-invitation-editor.component';
import { VisualDesignImporterService } from './visual-design-importer.service';

describe('VisualInvitationEditorComponent persistence', () => {
  let component: VisualInvitationEditorComponent;
  let responses: Subject<{ invitation: InvitationModel }>;
  let api: { updateInvitation: jasmine.Spy };

  beforeEach(() => {
    responses = new Subject<{ invitation: InvitationModel }>();
    api = { updateInvitation: jasmine.createSpy().and.returnValue(responses.asObservable()) };
    component = new VisualInvitationEditorComponent({} as any, {} as any, api as any, {} as any, {} as any);
    component.design = {
      version: 1, active: true, mode: 'easy', sections: [
        { id: 'hero', type: 'hero', title: 'Original', enabled: true, layout: 'canvas', height: 600, layers: [] }
      ]
    };
    component.invitation = {
      id: 'invitation-1', event: 'event-1', slug: 'prueba', status: 'draft',
      content: { headline: 'Evento', galleryItems: [] }
    } as InvitationModel;
    (component as any).markSaved();
  });

  it('keeps edits made while a save request is in flight pending', () => {
    component.save();
    component.design.sections[0].title = 'Cambio posterior';
    responses.next({ invitation: {
      ...component.invitation!,
      content: { ...component.invitation!.content, visualDesign: { ...component.design, sections: [{ ...component.design.sections[0], title: 'Original' }] } }
    } });

    expect(component.design.sections[0].title).toBe('Cambio posterior');
    expect(component.hasUnsavedChanges).toBeTrue();
    expect(component.autosaveState).toBe('Cambios pendientes');
  });

  it('marks the exact submitted design saved when no new edit occurred', () => {
    component.design.sections[0].title = 'Guardado';
    component.save();
    responses.next({ invitation: {
      ...component.invitation!,
      content: { ...component.invitation!.content, visualDesign: component.design }
    } });

    expect(component.hasUnsavedChanges).toBeFalse();
    expect(component.autosaveState).toBe('Guardado');
  });

  it('downloads the current editable design in the AI exchange format', async () => {
    const download = spyOn<any>(component, 'downloadBlob');
    component.downloadEditableDesign();
    const [blob, name] = download.calls.mostRecent().args as [Blob, string];
    const payload = JSON.parse(await blob.text());
    expect(name).toBe('evento-editable.json');
    expect(payload.format).toBe('kyndrasoft-visual-design');
    expect(payload.design.sections[0].title).toBe('Original');
    expect(payload.invitation).toBeUndefined();
  });

  it('reads an AI JSON file without applying it before import', async () => {
    const file = new File(['{"format":"kyndrasoft-visual-design","version":1,"design":{"sections":[]}}'], 'design.json', { type: 'application/json' });
    await component.loadDesignJsonFile({ target: { files: [file], value: 'design.json' } } as unknown as Event);
    expect(component.importJsonFileName).toBe('design.json');
    expect(component.importJsonSource).toContain('kyndrasoft-visual-design');
    expect(component.design.sections[0].title).toBe('Original');
  });

  it('adds native modules to an imported design and discards the full import together', async () => {
    (component as any).designImporter = new VisualDesignImporterService();
    component.importSource = 'json';
    component.importJsonSource = JSON.stringify({ sections: [{ id: 'imported', type: 'custom', enabled: true, layout: 'canvas', height: 640,
      layers: [{ id: 'headline', type: 'text', text: 'Fiesta', x: 10, y: 20, width: 80, height: 10 }] }] });
    await component.importDesign();
    component.addImportedModule('rsvp');
    expect(component.design.sections.some((section) => section.type === 'rsvp')).toBeTrue();
    expect(component.importReviewCount('connected')).toBe(1);
    component.discardImportedDesign();
    expect(component.design.sections.length).toBe(1);
    expect(component.design.sections[0].title).toBe('Original');
  });

  it('persists the selected presentation mode with the invitation', () => {
    component.setPresentationMode('chapters');
    expect(component.hasUnsavedChanges).toBeTrue();
    component.save();
    expect(api.updateInvitation.calls.mostRecent().args[1].content.visualDesign.presentationMode).toBe('chapters');
    responses.next({ invitation: {
      ...component.invitation!,
      content: { ...component.invitation!.content, visualDesign: component.design }
    } });
    expect(component.hasUnsavedChanges).toBeFalse();
  });

  it('applies a button design without changing its action or text', () => {
    const layer = {
      id: 'cta', type: 'button' as const, text: 'Confirmar asistencia', binding: 'section:rsvp',
      x: 20, y: 20, width: 60, height: 12,
      style: { gradientEnabled: true, gradientStart: '#000000', backgroundImageUrl: 'https://example.com/old.png', buttonIcon: '↗' }
    };
    component.design.sections[0].layers.push(layer);
    const preset = component.buttonPresets.find((item) => item.key === 'gold')!;
    component.applyButtonPreset(layer, preset);

    expect(layer.text).toBe('Confirmar asistencia');
    expect(layer.binding).toBe('section:rsvp');
    expect(layer.style.buttonIcon).toBe('↗');
    expect(layer.style.gradientEnabled).toBeFalse();
    expect(layer.style.backgroundImageUrl).toBeUndefined();
    expect(component.isButtonPresetApplied(layer, preset)).toBeTrue();
    expect(component.hasUnsavedChanges).toBeTrue();
  });

  it('clears a previous button preset when switching from gradient to minimal', () => {
    const layer = { id: 'cta', type: 'button' as const, text: 'Abrir', x: 20, y: 20, width: 50, height: 10,
      style: { gradientEnabled: false, textDecoration: 'none' as const } };
    component.design.sections[0].layers.push(layer);
    component.applyButtonPreset(layer, component.buttonPresets.find((item) => item.key === 'aurora')!);
    expect(layer.style.gradientEnabled).toBeTrue();
    component.applyButtonPreset(layer, component.buttonPresets.find((item) => item.key === 'minimal')!);
    expect(layer.style.gradientEnabled).toBeFalse();
    expect(layer.style.textDecoration).toBe('underline');
    component.applyButtonPreset(layer, component.buttonPresets.find((item) => item.key === 'editorial')!);
    expect(layer.style.textDecoration).toBe('none');
  });

  it('creates an empty photo frame and fills it when an image is dropped onto it', () => {
    component.selectedSectionId = 'hero';
    component.addFrame('circle');
    const frame = component.design.sections[0].layers[0];
    expect(frame.style?.imageMask).toBe('circle');
    expect(frame.style?.frameEnabled).toBeTrue();
    expect(frame.style?.objectFit).toBe('cover');
    expect((component as any).auditDesign().find((issue: any) => issue.layerId === frame.id && issue.title === 'Marco sin foto')?.severity).toBe('suggestion');

    const surface = document.createElement('div');
    const target = document.createElement('div');
    target.className = 'canvas-layer';
    target.dataset['layerId'] = frame.id;
    surface.appendChild(target);
    spyOn(surface, 'getBoundingClientRect').and.returnValue({ left: 0, top: 0, width: 400, height: 600 } as DOMRect);
    (component as any).paletteDragItem = { kind: 'media', media: { type: 'image', url: 'https://example.com/photo.jpg', label: 'Foto' } };
    component.dropPaletteItem({ target, currentTarget: surface, clientX: 100, clientY: 100,
      preventDefault: () => {}, stopPropagation: () => {} } as unknown as DragEvent, component.design.sections[0]);

    expect(component.design.sections[0].layers.length).toBe(1);
    expect(frame.url).toBe('https://example.com/photo.jpg');
    expect(frame.style?.imageMask).toBe('circle');
    expect((component as any).auditDesign().some((issue: any) => issue.layerId === frame.id && issue.title === 'Marco sin foto')).toBeFalse();
  });

  it('lets a layer cross section boundaries only in continuous mode', () => {
    const first = component.design.sections[0];
    const second = { id: 'details', type: 'custom' as const, enabled: true, layout: 'canvas' as const, height: 600, layers: [] };
    component.design.sections.push(second);
    const layer = { id: 'image', type: 'image' as const, x: 10, y: 125, width: 40, height: 20 };
    first.layers.push(layer);
    component.selectedSectionId = first.id;
    component.design.presentationMode = 'continuous';
    component.normalizeLayerTransform(layer, layer);
    expect(layer.y).toBe(125);
    expect(component.verticalLayerBounds(first, 20)).toEqual({ min: 0, max: 180 });
    expect(component.verticalLayerBounds(second, 20)).toEqual({ min: -100, max: 80 });
    expect(component.sectionHasOverflowLayers(first)).toBeTrue();

    component.design.presentationMode = 'chapters';
    component.normalizeLayerTransform(layer, layer);
    expect(layer.y).toBe(80);
    expect(component.sectionHasOverflowLayers(first)).toBeFalse();
  });

  it('keeps a dragged image beyond its section rather than snapping it back', () => {
    const first = component.design.sections[0];
    component.design.sections.push({ id: 'next', type: 'custom', enabled: true, layout: 'canvas', height: 600, layers: [] });
    component.design.presentationMode = 'continuous';
    component.smartSnapping = false;
    const layer = { id: 'image', type: 'image' as const, x: 10, y: 85, width: 40, height: 20 };
    first.layers.push(layer);
    (component as any).layerDragState = {
      layer, section: first, items: [{ layer, layout: layer, x: 10, y: 85, width: 40, height: 20 }],
      canvas: { clientWidth: 1000, clientHeight: 600 }, startX: 0, startY: 0,
      bounds: { x: 10, y: 85, width: 40, height: 20 }, moved: true
    };

    component.onPointerMove({ clientX: 0, clientY: 240, preventDefault: () => {} } as unknown as PointerEvent);

    expect(layer.y).toBe(125);
  });

  it('uses the same authored heights as the public continuous canvas', () => {
    component.design.sections[0].height = 600;
    component.design.sections.push({ id: 'rsvp', type: 'rsvp', enabled: true, layout: 'canvas', height: 800, layers: [] });
    component.design.presentationMode = 'continuous';

    expect(component.artboardHeight).toBe(1400);
    expect(component.sectionStyle(component.design.sections[1])['height']).toBe('800px');
    expect(component.verticalLayerBounds(component.design.sections[1], 25)).toEqual({ min: -75, max: 75 });
  });

  it('does not warn that a layer crossing into the next section is cut', () => {
    const first = component.design.sections[0];
    first.layers = [{ id: 'photo', type: 'image', url: 'https://example.com/photo.jpg', text: 'Foto', x: 10, y: 90, width: 40, height: 30 }];
    component.design.sections.push({ id: 'next', type: 'custom', enabled: true, layout: 'canvas', height: 600, layers: [] });
    component.design.presentationMode = 'continuous';
    expect((component as any).auditDesign().some((issue: any) => issue.layerId === 'photo' && issue.title.startsWith('Elemento fuera'))).toBeFalse();

    component.design.presentationMode = 'chapters';
    expect((component as any).auditDesign().some((issue: any) => issue.layerId === 'photo' && issue.title.startsWith('Elemento fuera'))).toBeTrue();
  });

  it('does not duplicate or paste a connected action twice', () => {
    const section = component.design.sections[0];
    section.type = 'songs';
    section.layers = [
      { id: 'send', type: 'button', binding: 'song.submit', text: 'Enviar', x: 20, y: 30, width: 30, height: 10 },
      { id: 'ornament', type: 'text', text: 'Música', x: 20, y: 10, width: 30, height: 10 }
    ];
    component.selectedSectionId = section.id;
    (component as any).setLayerSelection(['send', 'ornament']);

    component.duplicateLayer();
    expect(section.layers.filter((layer) => layer.binding === 'song.submit').length).toBe(1);
    expect(section.layers.filter((layer) => layer.type === 'text').length).toBe(2);

    (component as any).setLayerSelection(['send']);
    component.copySelectedLayers();
    component.pasteLayers();
    expect(section.layers.filter((layer) => layer.binding === 'song.submit').length).toBe(1);
  });

  it('previews a complete design without changing the current design and keeps assets when applying it', () => {
    const original = component.design;
    original.assets = [{ id: 'uploaded', url: 'https://example.com/photo.jpg', type: 'image', name: 'foto.jpg' }];
    component.openDesignLibrary('night');
    expect(component.design).toBe(original);
    expect(component.libraryPreviewInvitation?.content.visualDesign?.sections.length).toBeGreaterThan(2);
    expect(component.libraryPreviewDesign?.sections[0].layers.some((layer) => layer.binding === 'section:rsvp')).toBeTrue();

    component.showOnboarding = true;
    component.applyCompleteDesign();
    expect(component.design.sections.length).toBeGreaterThan(2);
    expect(component.design.assets).toEqual(original.assets);
    expect(component.showDesignLibrary).toBeFalse();
    expect(component.showOnboarding).toBeFalse();
    component.undo();
    expect(component.design.sections[0].title).toBe('Original');
  });

  it('keeps the selected preview inside the filtered category', () => {
    component.openDesignLibrary('night');
    component.setLibraryCategory('boda');
    expect(component.librarySelectedKey).toBe('romantic');
    expect(component.libraryPreviewDesign?.sections.length).toBeGreaterThan(2);
  });

  it('recommends a complete design for birthday and baptism events', () => {
    component.event = { title: 'Fiesta', type: 'cumpleanos' } as any;
    component.openDesignLibrary();
    expect(component.librarySelectedKey).toBe('birthday');
    component.event = { title: 'Ceremonia', type: 'bautizo' } as any;
    component.openDesignLibrary();
    expect(component.librarySelectedKey).toBe('baptism');
  });

  it('points a duplicate warning to the redundant layer', () => {
    const section = component.design.sections[0];
    section.type = 'album';
    section.layers = [
      { id: 'upload', type: 'button', binding: 'album.upload', text: 'Subir foto', x: 10, y: 10, width: 30, height: 10 },
      { id: 'upload-copy', type: 'button', binding: 'album.upload', text: 'Subir otra foto', x: 50, y: 10, width: 30, height: 10 }
    ];

    const duplicate = (component as any).auditDesign().find((issue: any) => issue.title.startsWith('Control duplicado'));
    expect(duplicate.layerId).toBe('upload-copy');
    expect(duplicate.sectionId).toBe(section.id);
  });

  it('lets a reviewed contrast or decorative overflow warning be restored, and revisits it after edits', () => {
    const section = component.design.sections[0];
    section.background = { color: '#ffffff' };
    section.layers = [{ id: 'decoration', type: 'text', text: 'Decoración', x: -10, y: 20, width: 35, height: 12,
      style: { color: '#fefefe' } }];
    component.design.sections.push({ id: 'rsvp', type: 'rsvp', enabled: true, layout: 'canvas', height: 820, layers: [] });
    component.event = { date: '2026-10-01', venue: { name: 'Jardín' } } as any;
    const key = 'visual-editor-audit:invitation-1';
    localStorage.removeItem(key);

    component.openPublishAudit();
    const contrast = component.publishAuditIssues.find((issue) => issue.title.startsWith('Contraste bajo'))!;
    const overflow = component.publishAuditIssues.find((issue) => issue.title.startsWith('Elemento parcialmente fuera'))!;
    expect(contrast.severity).toBe('suggestion');
    expect(overflow.severity).toBe('suggestion');
    component.acknowledgeAuditIssue(contrast);
    component.acknowledgeAuditIssue(overflow);
    expect(component.optionalAuditCount).toBe(0);
    expect(component.acknowledgedPublishAuditIssues.length).toBe(2);

    component.openPublishAudit();
    expect(component.acknowledgedPublishAuditIssues.length).toBe(2);
    component.restoreAuditIssue(contrast);
    expect(component.optionalAuditCount).toBe(1);

    section.layers[0].x = -12;
    component.openPublishAudit();
    expect(component.optionalAuditCount).toBe(2);
    localStorage.removeItem(key);
  });
});
