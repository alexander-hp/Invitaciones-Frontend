import { SimpleChange } from '@angular/core';
import { VisualInvitationRendererComponent } from './visual-invitation-renderer.component';

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

  it('only publishes location actions backed by real data', () => {
    component.invitation = { content: { locations: [{ name: 'Salón', mapUrl: 'https://maps.example.test' }] } } as any;
    const section = { id: 'locations', type: 'locations', enabled: true, layout: 'canvas' as const, height: 760, layers: [] };
    const map = { id: 'map', type: 'button' as const, binding: 'location.0.map', x: 0, y: 0, width: 20, height: 8 };
    const waze = { ...map, id: 'waze', binding: 'location.0.waze' };

    expect(component.shouldRenderLocationLayer(section, map)).toBeTrue();
    expect(component.shouldRenderLocationLayer(section, waze)).toBeFalse();
  });
});
