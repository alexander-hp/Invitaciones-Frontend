import { Subject } from 'rxjs';
import { InvitationModel } from '../../core/models';
import { VisualInvitationEditorComponent } from './visual-invitation-editor.component';

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
});
