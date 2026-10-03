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

  it('shows a fallback music control when a visual design has no main music button', () => {
    const component = new NewPublicInvitationComponent(route as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    component.invitation = {
      id: 'invitation-1', slug: 'invitacion-prueba', event: 'event-1', status: 'published',
      content: {
        template: 'visual-builder', musicUrl: 'https://example.test/music.mp3',
        visualDesign: { version: 2, active: true, mode: 'advanced', sections: [
          { id: 'hero', type: 'hero', enabled: true, layout: 'canvas', height: 640, layers: [] }
        ] }
      }
    } as any;

    expect(component.showVisualMusicFallback()).toBeTrue();
    const visualDesign = component.invitation?.content?.visualDesign;
    visualDesign!.sections[0].layers.push({
      id: 'music', type: 'audio', binding: 'music.toggle', x: 80, y: 80, width: 12, height: 12
    });
    expect(component.showVisualMusicFallback()).toBeFalse();
  });

  it('preloads the configured YouTube track into the global player', () => {
    const component = new NewPublicInvitationComponent(route as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    const container = document.createElement('div');
    container.id = 'nw-pub-yt-player';
    document.body.appendChild(container);
    const previousYt = (window as any).YT;
    let playerOptions: any;
    (window as any).YT = { Player: class {
      constructor(_id: string, options: any) { playerOptions = options; }
    } };
    (component as any).currentPlayingTrackUrl = 'https://www.youtube.com/watch?v=wC7IH002Ypk';

    (component as any).createYouTubePlayer();

    expect(playerOptions.videoId).toBe('wC7IH002Ypk');
    container.remove();
    (window as any).YT = previousYt;
  });

  it('starts music on pointerdown without toggling it again on the following click', () => {
    const component = new NewPublicInvitationComponent(route as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    const toggleSpy = spyOn(component, 'toggleMusic');

    component.activateMusicOnPointerDown({ button: 0 } as PointerEvent);
    component.activateMusicOnClick({ detail: 1 } as MouseEvent);

    expect(toggleSpy).toHaveBeenCalledTimes(1);

    component.activateMusicOnClick({ detail: 0 } as MouseEvent);
    expect(toggleSpy).toHaveBeenCalledTimes(2);
  });

  it('keeps a YouTube music control unavailable until the player is ready', () => {
    const component = new NewPublicInvitationComponent(route as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    component.invitation = {
      content: { musicUrl: 'https://www.youtube.com/watch?v=wC7IH002Ypk' }
    } as any;

    expect(component.isMusicControlReady()).toBeFalse();
    (component as any).isYtReady = true;
    expect(component.isMusicControlReady()).toBeTrue();
  });

  it('attempts background music automatically unless playback is manual', () => {
    const component = new NewPublicInvitationComponent(route as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    component.invitation = {
      content: {
        musicUrl: 'https://example.test/music.mp3',
        sectionSettings: { backgroundMusic: true },
        musicSettings: { playbackMode: 'first_interaction' }
      }
    } as any;

    expect((component as any).shouldAutoplayMusic()).toBeTrue();
    component.invitation!.content!.musicSettings!.playbackMode = 'manual';
    expect((component as any).shouldAutoplayMusic()).toBeFalse();
    component.invitation!.content!.sectionSettings!.backgroundMusic = false;
    expect((component as any).shouldAutoplayMusic()).toBeFalse();
  });
});
