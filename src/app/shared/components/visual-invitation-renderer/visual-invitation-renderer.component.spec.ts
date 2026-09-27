import { SimpleChange } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { VisualInvitationSection } from '../../../core/models';
import { VisualInvitationRendererComponent } from './visual-invitation-renderer.component';
import { VisualInvitationRendererModule } from './visual-invitation-renderer.module';

describe('VisualInvitationRendererComponent', () => {
  let component: VisualInvitationRendererComponent;

  beforeEach(() => {
    component = new VisualInvitationRendererComponent();
  });

  it('uses the device forced by the visual editor sandbox', () => {
    component.forcedDevice = 'tablet';
    component.ngOnChanges({ forcedDevice: new SimpleChange(undefined, 'tablet', true) });

    expect(component.device).toBe('tablet');
  });

  it('emits the same RSVP payload used by the public invitation', () => {
    let payload: any;
    component.submitRsvp.subscribe((value) => payload = value);
    component.rsvp = { name: 'Tania', email: 'tania@example.com', response: 'confirmed', companions: 2, dietaryRestrictions: '', message: 'Nos vemos' };

    component.sendRsvp();

    expect(payload).toEqual(jasmine.objectContaining({ name: 'Tania', response: 'confirmed', companions: 2 }));
  });

  it('keeps guest identification local until the parent handles it', () => {
    let payload: any;
    component.verifyGuestAccess.subscribe((value) => payload = value);
    component.guestPhone = '2727088143';

    component.identifyGuest();

    expect(payload).toEqual({ email: '', phone: '2727088143' });
  });

  it('clears public form state when the sandbox is reset', () => {
    component.rsvp.name = 'Invitado';
    component.song.title = 'Canción';
    component.dedication.message = 'Mensaje';

    component.ngOnChanges({ sandboxResetKey: new SimpleChange(1, 2, false) });

    expect(component.rsvp.name).toBe('');
    expect(component.song.title).toBe('');
    expect(component.dedication.message).toBe('');
  });

  it('preserves the authored section height for responsive rendering', () => {
    const style = component.sectionStyle({
      id: 'hero', type: 'hero', enabled: true, layout: 'canvas', height: 640, layers: []
    });

    expect(style['height']).toBe('640px');
    expect(component.sectionRenderHeight({ id: 'hero', type: 'hero', enabled: true, layout: 'canvas', height: 640, layers: [] })).toBe(640);
  });

  it('keeps all enabled sections in continuous mode and only one in chapters', () => {
    const sections: VisualInvitationSection[] = [
      { id: 'hero', type: 'hero', enabled: true, layout: 'canvas', height: 600, layers: [] },
      { id: 'hidden', type: 'custom', enabled: false, layout: 'canvas', height: 600, layers: [] },
      { id: 'rsvp', type: 'rsvp', enabled: true, layout: 'canvas', height: 600, layers: [] }
    ];
    component.invitation = { content: { visualDesign: { sections } } } as any;
    expect(component.displayedSections.map((section) => section.id)).toEqual(['hero', 'rsvp']);

    (component.invitation as any).content.visualDesign.presentationMode = 'chapters';
    expect(component.displayedSections.map((section) => section.id)).toEqual(['hero']);
    component.goToChapter(1);
    expect(component.displayedSections.map((section) => section.id)).toEqual(['rsvp']);
    component.goToChapter(4);
    expect(component.currentChapterIndex).toBe(1);

    component.exportMode = true;
    expect(component.displayedSections.map((section) => section.id)).toEqual(['hero', 'rsvp']);
  });

  it('keeps continuous modules at their authored height in public and export views', () => {
    const section: VisualInvitationSection = { id: 'rsvp', type: 'rsvp', enabled: true, layout: 'canvas', height: 600, layers: [] };
    component.invitation = { content: { visualDesign: { presentationMode: 'continuous', sections: [section] } } } as any;
    expect(component.sectionStyle(section)['height']).toBe('600px');
    component.exportMode = true;
    expect(component.sectionStyle(section)['height']).toBe('600px');
    component.exportMode = false;
    (component.invitation as any).content.visualDesign.presentationMode = 'chapters';
    expect(component.sectionStyle(section)['height']).toBe('auto');
  });

  it('keeps a continuous layer visible beyond its section boundary', () => {
    const section: VisualInvitationSection = {
      id: 'cover', type: 'hero', enabled: true, layout: 'canvas', height: 600,
      layers: [{ id: 'photo', type: 'image', x: 10, y: 90, width: 50, height: 30 }]
    };
    component.invitation = { content: { visualDesign: { presentationMode: 'continuous', sections: [section] } } } as any;
    expect(component.sectionHasOverflowLayers(section)).toBeTrue();
    expect(component.sectionStyle(section)['zIndex']).toBeUndefined();

    (component.invitation as any).content.visualDesign.presentationMode = 'chapters';
    expect(component.sectionHasOverflowLayers(section)).toBeFalse();
  });

  it('places crossing layers on the shared continuous canvas without changing their authored size', () => {
    const first: VisualInvitationSection = { id: 'cover', type: 'hero', enabled: true, layout: 'canvas', height: 600, layers: [] };
    const second: VisualInvitationSection = { id: 'gallery', type: 'custom', enabled: true, layout: 'canvas', height: 800, layers: [] };
    const layer = { id: 'photo', type: 'image' as const, x: 10, y: -10, width: 50, height: 30 };
    second.layers.push(layer);
    component.invitation = { content: { visualDesign: { presentationMode: 'continuous', sections: [first, second] } } } as any;

    expect(component.continuousCanvasHeight).toBe(1400);
    expect(component.continuousLayerStyle(second, layer)).toEqual(jasmine.objectContaining({
      left: '10%', top: '520px', width: '50%', height: '240px'
    }));
  });

  it('renders a layer across two sections on the public canvas', () => {
    TestBed.configureTestingModule({ imports: [VisualInvitationRendererModule] });
    const fixture = TestBed.createComponent(VisualInvitationRendererComponent);
    fixture.componentInstance.invitation = { content: { visualDesign: { presentationMode: 'continuous', sections: [
      { id: 'first', type: 'hero', enabled: true, layout: 'canvas', height: 600, layers: [
        { id: 'crossing', type: 'text', text: 'Cruza secciones', x: 10, y: 90, width: 50, height: 30 }
      ] },
      { id: 'second', type: 'custom', enabled: true, layout: 'canvas', height: 600, layers: [] }
    ] } } } as any;
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const first = root.querySelector<HTMLElement>('.visual-section')!;
    const layer = root.querySelector<HTMLElement>('.continuous-layer-plane > .visual-layer')!;
    expect(root.querySelectorAll('.visual-section .visual-layer').length).toBe(0);
    expect(layer.style.top).toBe('540px');
    expect(layer.style.height).toBe('180px');
    expect(layer.parentElement?.classList.contains('continuous-layer-plane')).toBeTrue();
    expect(first.style.height).toBe('600px');
    fixture.destroy();
  });

  it('preserves the authored font size on desktop', () => {
    component.device = 'desktop';
    const style = component.layerStyle({
      id: 'title', type: 'text', text: 'Título', x: 10, y: 10, width: 80, height: 12,
      style: { fontSize: 42 }
    });

    expect(style['fontSize']).toBe('42px');
  });

  it('scales shared typography on mobile but keeps independent typography exact', () => {
    component.device = 'mobile';
    component.invitation = { content: { visualDesign: { responsiveMode: 'shared' } } } as any;
    const layer = { id: 'title', type: 'text' as const, x: 10, y: 10, width: 80, height: 20, style: { fontSize: 60 } };

    expect(component.layerStyle(layer)['fontSize']).toBe('40.8px');

    (component.invitation as any).content.visualDesign.responsiveMode = 'independent';
    expect(component.layerStyle(layer)['fontSize']).toBe('60px');
  });

  it('keeps the authored media box geometry to avoid collisions', () => {
    const layer = { id: 'photo', type: 'image' as const, x: 10, y: 10, width: 40, height: 20, style: {} };
    component.invitation = { content: { visualDesign: { responsiveMode: 'shared', sections: [{ id: 'section', type: 'custom', enabled: true, layout: 'canvas', height: 780, layers: [layer] }] } } } as any;
    component.device = 'desktop';

    const style = component.layerStyle(layer);

    expect(style['width']).toBe('40%');
    expect(style['height']).toBe('20%');
  });

  it('shows the complete image by default and allows an explicit crop mode', () => {
    const layer = { id: 'photo', type: 'image' as const, x: 10, y: 10, width: 40, height: 20, style: {} };

    expect(component.imageStyle(layer)['objectFit']).toBe('contain');

    layer.style = { preserveAspectRatio: false, objectFit: 'cover' };
    expect(component.imageStyle(layer)['objectFit']).toBe('cover');
  });

  it('renders direct audio buttons in the configured fixed corner', () => {
    const layer = {
      id: 'music', type: 'audio' as const, url: 'https://cdn.example.test/song.mp3',
      x: 80, y: 80, width: 12, height: 12,
      style: { audioPresentation: 'button' as const, audioPosition: 'fixed' as const, audioCorner: 'bottom-right' as const, audioSize: 72, audioOffset: 24 }
    };

    expect(component.isFloatingAudio(layer)).toBeTrue();
    expect(component.layerStyle(layer)).toEqual(jasmine.objectContaining({ position: 'fixed', right: '24px', bottom: '24px', width: '72px', height: '72px' }));
  });

  it('keeps YouTube audio in its required visible player', () => {
    const layer = {
      id: 'youtube-music', type: 'audio' as const, url: 'https://www.youtube.com/watch?v=wC7IH002Ypk',
      x: 10, y: 10, width: 40, height: 24,
      style: { audioPresentation: 'button' as const, audioPosition: 'fixed' as const }
    };

    expect(component.isFloatingAudio(layer)).toBeFalse();
    expect(component.layerStyle(layer)['position']).not.toBe('fixed');
  });

  it('only publishes location actions backed by real data', () => {
    component.invitation = { content: { locations: [{ name: 'Salón', mapUrl: 'https://maps.example.test' }] } } as any;
    const section = { id: 'locations', type: 'locations', enabled: true, layout: 'canvas' as const, height: 760, layers: [] };
    const map = { id: 'map', type: 'button' as const, binding: 'location.0.map', x: 0, y: 0, width: 20, height: 8 };
    const waze = { ...map, id: 'waze', binding: 'location.0.waze' };

    expect(component.shouldRenderLocationLayer(section, map)).toBeTrue();
    expect(component.shouldRenderLocationLayer(section, waze)).toBeFalse();
  });

  it('renders one active upload control from an older design with duplicates', () => {
    const section: VisualInvitationSection = { id: 'album', type: 'album', enabled: true, layout: 'canvas', height: 760, layers: [
      { id: 'first', type: 'button' as const, binding: 'album.upload', x: 10, y: 20, width: 35, height: 8 },
      { id: 'copy', type: 'button' as const, binding: 'album.upload', x: 50, y: 20, width: 35, height: 8 },
      { id: 'heading', type: 'text' as const, binding: 'display.album.title', x: 10, y: 5, width: 80, height: 8 },
      { id: 'heading-copy', type: 'text' as const, binding: 'display.album.title', x: 10, y: 35, width: 80, height: 8 }
    ] };

    expect(component.albumCanvasLayers(section).map((layer) => layer.id)).toEqual(['first', 'heading', 'heading-copy']);
    section.layers[0].hidden = true;
    expect(component.albumCanvasLayers(section).filter((layer) => !layer.hidden).map((layer) => layer.id)).toEqual(['copy', 'heading', 'heading-copy']);
  });

  it('does not emit another form submission while a request is sending', () => {
    let rsvpCount = 0;
    let songCount = 0;
    let dedicationCount = 0;
    component.submitRsvp.subscribe(() => rsvpCount++);
    component.requestSong.subscribe(() => songCount++);
    component.submitDedication.subscribe(() => dedicationCount++);
    component.song.title = 'Canción';
    component.dedication.message = 'Felicidades';

    component.sendRsvp();
    component.sendSong();
    component.sendDedication();
    component.sending = true;
    component.sendRsvp();
    component.sendSong();
    component.sendDedication();

    expect([rsvpCount, songCount, dedicationCount]).toEqual([1, 1, 1]);
  });
});
