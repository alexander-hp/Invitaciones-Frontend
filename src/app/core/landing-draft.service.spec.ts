import { of } from 'rxjs';
import { LandingDraftService } from './landing-draft.service';

describe('LandingDraftService', () => {
  let service: LandingDraftService;
  let apiSpy: any;

  beforeEach(() => {
    localStorage.clear();
    apiSpy = {
      createEvent: jasmine.createSpy('createEvent').and.callFake((payload: any) =>
        of({ event: { _id: 'evt-101', id: 'evt-101', ...payload } })
      ),
      createInvitation: jasmine.createSpy('createInvitation').and.callFake((payload: any) =>
        of({
          invitation: {
            _id: 'inv-202',
            id: 'inv-202',
            slug: 'boda-sofia-mateo',
            ...payload
          },
          publicUrl: '/new/i/boda-sofia-mateo'
        })
      ),
      submitCustomTemplate: jasmine.createSpy('submitCustomTemplate').and.returnValue(
        of({ submission: { id: 'sub-303', status: 'approved' } })
      )
    };
    service = new LandingDraftService(apiSpy);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('includes Elegancia Rústica (Girasoles) and Navy Blue & Gold as featured templates', () => {
    const catalog = service.getCatalog();
    const girasoles = catalog.find((t) => t.id === 'boda-girasoles');
    const navy = catalog.find((t) => t.id === 'boda-navy-blue');
    expect(girasoles).toBeTruthy();
    expect(girasoles?.featured).toBeTrue();
    expect(navy).toBeTruthy();
    expect(navy?.featured).toBeTrue();
  });

  it('preserves user edits when switching templates and materializes event + invitation on save', (done) => {
    const draft = service.ensureDraftForTemplate('boda-girasoles');
    draft.event.title = 'Boda de Ana & Carlos';
    draft.customEventTitle = true;
    draft.invitation.content.headline = 'Ana & Carlos';
    service.saveDraft({ event: draft.event, customEventTitle: true, invitation: draft.invitation }, true);

    const switched = service.ensureDraftForTemplate('boda-navy-blue');
    expect(switched.templateKey).toBe('boda-navy-blue');
    expect(switched.event.title).toBe('Boda de Ana & Carlos');
    expect(switched.invitation.content.headline).toBe('Ana & Carlos');

    switched.invitation.content.editedTexts = { 'div__p__1': 'Te esperamos con mucha alegría' };
    service.saveDraft({ invitation: switched.invitation }, true);
    service.markPendingSave('template');

    expect(service.hasPendingSave()).toBeTrue();

    service.materializeDraftToAccount().subscribe((res) => {
      expect(apiSpy.createEvent).toHaveBeenCalled();
      expect(apiSpy.createEvent.calls.mostRecent().args[0].title).toBe('Boda de Ana & Carlos');
      expect(apiSpy.createInvitation).toHaveBeenCalled();
      expect(apiSpy.createInvitation.calls.mostRecent().args[0].content.template).toBe('boda-navy-blue');
      expect(apiSpy.submitCustomTemplate).toHaveBeenCalled();
      expect(res.eventId).toBe('evt-101');
      expect(res.invitationId).toBe('inv-202');
      expect(res.redirectCommands).toEqual(['/new/invitations', 'inv-202', 'editor']);
      expect(service.hasDraft()).toBeFalse();
      done();
    });
  });

  it('materializes visual editor drafts into visual-editor route without losing layers', (done) => {
    const visualDraft = service.ensureDraftForVisualEditor('boda-girasoles');
    visualDraft.invitation.content.visualDesignDraft = {
      version: 1,
      active: true,
      mode: 'easy',
      sections: [{ id: 'sec-1', type: 'hero', enabled: true, layout: 'canvas', height: 760, layers: [] }]
    };
    service.saveDraft({ mode: 'visual', invitation: visualDraft.invitation }, true);
    service.markPendingSave('visual');

    service.materializeDraftToAccount().subscribe((res) => {
      expect(apiSpy.createInvitation).toHaveBeenCalled();
      const invPayload = apiSpy.createInvitation.calls.mostRecent().args[0];
      expect(invPayload.content.template).toBe('visual-builder');
      expect(invPayload.content.visualDesignDraft.active).toBeTrue();
      expect(res.redirectCommands).toEqual(['/new/invitations', 'inv-202', 'visual-editor']);
      done();
    });
  });
});
