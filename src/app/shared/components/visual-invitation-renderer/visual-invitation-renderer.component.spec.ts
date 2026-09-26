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

  it('preserves the authored font size on every device', () => {
    const style = component.layerStyle({
      id: 'title', type: 'text', text: 'Título', x: 10, y: 10, width: 80, height: 12,
      style: { fontSize: 42 }
    });

    expect(style['fontSize']).toBe('42px');
  });
});
