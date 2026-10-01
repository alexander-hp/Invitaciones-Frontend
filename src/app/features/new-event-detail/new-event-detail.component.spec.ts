import { EventModel } from '../../core/models';
import { NewEventDetailComponent } from './new-event-detail.component';

describe('NewEventDetailComponent preparation', () => {
  const event = (mode: EventModel['mode'] = 'invitation', owner = true): EventModel => ({
    _id: 'event-1', mode, title: 'Evento', type: 'boda', date: '2026-12-01', hosts: [], venue: {}, status: 'draft',
    access: { owner, permissions: owner ? [] : ['manage_tables'] }
  });

  const create = () => {
    const navigate = jasmine.createSpy();
    const page = new NewEventDetailComponent({} as any, { navigate } as any, {} as any);
    page.event = event();
    page.eventId = 'event-1';
    page.invitationsLoaded = true;
    return { page, navigate };
  };

  it('suggests creating an invitation before adding guests', () => {
    const { page } = create();
    spyOn(page, 'openCreateInvitationWizard');

    expect(page.preparationSteps.map(step => step.key)).toEqual(['invitation', 'guests', 'tables', 'communication']);
    expect(page.nextPreparationKey).toBe('invitation');
    expect(page.preparationSteps[0].status).toBe('Sin crear');
    page.openPreparationStep(page.preparationSteps[0]);
    expect(page.openCreateInvitationWizard).toHaveBeenCalled();
  });

  it('opens the existing invitation and advances after publication', () => {
    const { page, navigate } = create();
    const invitation = { _id: 'invitation-1', status: 'published' } as any;
    page.invitation = invitation;
    page.eventInvitations = [invitation];

    expect(page.preparationSteps[0].status).toBe('Publicada');
    expect(page.nextPreparationKey).toBe('guests');
    page.openPreparationStep(page.preparationSteps[0]);
    expect(navigate).toHaveBeenCalledWith(['/new/invitations', 'invitation-1', 'editor']);
  });

  it('uses integration for external events and does not require an external site URL', () => {
    const { page } = create();
    page.event = event('external_dashboard');

    expect(page.preparationSteps[0].key).toBe('integration');
    expect(page.nextPreparationKey).toBe('integration');
    page.event.externalPortalSlug = 'evento-demo';
    expect(page.nextPreparationKey).toBe('guests');
  });

  it('only exposes steps allowed for a collaborator', () => {
    const { page } = create();
    page.event = event('invitation', false);

    expect(page.preparationSteps.map(step => step.key)).toEqual(['tables']);
    expect(page.nextPreparationKey).toBe('tables');
  });

  it('finds tasks by common words and opens the requested section', () => {
    const { page, navigate } = create();
    page.quickSearch = 'foto';

    expect(page.quickSearchResults.map(link => link.key)).toContain('cover');
    page.openQuickLink(page.quickSearchResults.find(link => link.key === 'cover')!);

    expect(page.activeTab).toBe('info');
    expect(page.selectedSection).toBe('cover');
    expect(page.quickSearch).toBe('');
    expect(navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: { tab: 'info', section: 'cover' }, replaceUrl: false
    }));
  });

  it('opens the compact search from any section and closes it with Escape', () => {
    const { page } = create();
    page.activeTab = 'communication';

    page.openQuickSearch();
    expect(page.showQuickSearch).toBeTrue();
    page.quickSearch = 'crear mesa';
    expect(page.quickSearchResults.some(link => link.key === 'table-create')).toBeTrue();

    page.onEscape();
    expect(page.showQuickSearch).toBeFalse();
    expect(page.quickSearch).toBe('');
    expect(page.activeTab).toBe('communication');
  });

  it('matches accent-insensitive searches and hides unavailable tools', () => {
    const { page } = create();
    page.quickSearch = 'musica';
    expect(page.quickSearchResults.some(link => link.key === 'dj')).toBeTrue();

    page.event = event('invitation', false);
    expect(page.quickLinks.map(link => link.key)).toEqual([
      'details', 'tables', 'table-create', 'table-assign', 'table-auto-assign', 'table-map'
    ]);
    page.quickSearch = 'pagos';
    expect(page.quickSearchResults).toEqual([]);
  });

  it('opens a specific guest control and keeps it in the URL', () => {
    const { page, navigate } = create();
    page.quickSearch = 'importar excel';
    const link = page.quickSearchResults.find(result => result.key === 'guest-import');
    expect(link).toBeDefined();
    page.openQuickLink(link!);

    expect(page.activeTab).toBe('guests');
    expect(page.selectedSection).toBe('guest-import');
    expect(page.currentLocationLabel).toBe('Importar invitados CSV');
    expect(navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: { tab: 'guests', section: 'guest-import' }, replaceUrl: false
    }));
  });

  it('finds the bulk WhatsApp action without starting a send', () => {
    const { page, navigate } = create();
    page.quickSearch = 'enviar whatsapp masivo';
    const link = page.quickSearchResults.find(result => result.key === 'whatsapp-send');
    expect(link).toBeDefined();
    page.openQuickLink(link!);

    expect(page.activeTab).toBe('communication');
    expect(page.selectedSection).toBe('whatsapp-send');
    expect(navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: { tab: 'communication', section: 'whatsapp-send' }, replaceUrl: false
    }));
  });

  it('does not expose guest and send controls to a collaborator without guest permissions', () => {
    const { page } = create();
    page.event = event('invitation', false);
    page.quickSearch = 'nuevo invitado';
    expect(page.quickSearchResults).toEqual([]);
    page.quickSearch = 'whatsapp masivo';
    expect(page.quickSearchResults).toEqual([]);
  });

  it('navigates directly to the table creation control', () => {
    const { page, navigate } = create();
    page.quickSearch = 'crear mesa';
    const link = page.quickSearchResults.find(result => result.key === 'table-create');
    expect(link).toBeDefined();

    page.openQuickLink(link!);

    expect(page.activeTab).toBe('tables');
    expect(page.selectedSection).toBe('table-create');
    expect(navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: { tab: 'tables', section: 'table-create' }, replaceUrl: false
    }));
  });

  it('guides an owner through required and optional work without counting visits as completion', () => {
    const { page } = create();
    expect(page.guideSteps.map(step => step.key)).toEqual([
      'details', 'invitation', 'guests', 'tables', 'communication', 'rsvps'
    ]);
    expect(page.guideProgress).toEqual({ done: 0, total: 4 });
    expect(page.guideSteps.find(step => step.key === 'tables')?.optional).toBeTrue();

    page.event!.venue.name = 'Salón';
    page.eventInvitations = [{ _id: 'invitation-1', status: 'published' } as any];
    page.guests = [{ _id: 'guest-1' } as any];
    page.eventMetrics = { emailSent: 2 };
    expect(page.guideProgress).toEqual({ done: 4, total: 4 });
  });

  it('uses the external portal step and only shows permitted tools to collaborators', () => {
    const { page } = create();
    page.event = event('external_dashboard');
    expect(page.guideSteps.some(step => step.key === 'integration')).toBeTrue();
    expect(page.guideSteps.some(step => step.key === 'invitation')).toBeFalse();

    page.event = event('invitation', false);
    expect(page.guideSteps.map(step => step.key)).toEqual(['tables']);
  });

  it('remembers the selected guide step and opens its exact control', () => {
    const { page, navigate } = create();
    localStorage.removeItem('eventGuide_step_event-1');

    page.openJourneyGuide();
    expect(page.showJourneyGuide).toBeTrue();
    expect(page.guideIndex).toBe(0);
    page.selectGuideStep(3);
    page.closeJourneyGuide();
    page.openJourneyGuide();
    expect(page.guideIndex).toBe(3);

    page.openGuideTarget();
    expect(page.showJourneyGuide).toBeFalse();
    expect(page.activeTab).toBe('tables');
    expect(page.selectedSection).toBe('table-create');
    expect(navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: { tab: 'tables', section: 'table-create' }
    }));
    localStorage.removeItem('eventGuide_step_event-1');
  });

  it('finds RSVP filters and album review without exposing their controls to unauthorized users', () => {
    const { page } = create();
    page.quickSearch = 'filtrar confirmaciones';
    expect(page.quickSearchResults.some(link => link.key === 'rsvp-filters')).toBeTrue();
    page.quickSearch = 'fotos pendientes';
    expect(page.quickSearchResults.some(link => link.key === 'album-review')).toBeTrue();

    page.event = event('invitation', false);
    expect(page.quickLinks.some(link => link.key === 'rsvp-filters' || link.key === 'album-review')).toBeFalse();
  });
});
