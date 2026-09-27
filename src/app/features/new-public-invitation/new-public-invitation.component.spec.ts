import { convertToParamMap } from '@angular/router';
import { throwError } from 'rxjs';
import { NewPublicInvitationComponent } from './new-public-invitation.component';

describe('NewPublicInvitationComponent public loading', () => {
  const route = {
    snapshot: {
      paramMap: convertToParamMap({ slug: 'invitacion-prueba' }),
      queryParamMap: convertToParamMap({})
    }
  };

  afterEach(() => {
    localStorage.removeItem('invitaciones_token');
    sessionStorage.removeItem('kyndra_guest_session_invitacion-prueba');
  });

  it('does not replace an unpublished public invitation with an owner draft', () => {
    localStorage.setItem('invitaciones_token', 'owner-session');
    const api = {
      getPublicInvitation: jasmine.createSpy().and.returnValue(throwError(() => ({ status: 404, error: { message: 'No publicada' } }))),
      listInvitations: jasmine.createSpy()
    };
    const component = new NewPublicInvitationComponent(route as any, api as any, {} as any, {} as any, {} as any, {} as any);

    component.load();

    expect(component.invitation).toBeUndefined();
    expect(component.error).toBe('No publicada');
    expect(api.listInvitations).not.toHaveBeenCalled();
  });

  it('shows a contact gate without loading restricted content', () => {
    const api = { getPublicInvitation: jasmine.createSpy().and.returnValue(throwError(() => ({ status: 401 }))) };
    const component = new NewPublicInvitationComponent(route as any, api as any, {} as any, {} as any, {} as any, {} as any);

    component.load();

    expect(component.accessRequired).toBeTrue();
    expect(component.invitation).toBeUndefined();
  });
});
