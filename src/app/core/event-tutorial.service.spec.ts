import { NgZone } from '@angular/core';
import { EventTutorialService, TutorialSectionKey } from './event-tutorial.service';

describe('EventTutorialService', () => {
  const createService = (url = '/new/dashboard') => {
    const navigate = jasmine.createSpy('navigate');
    const routerMock = { url, navigate } as any;
    const zoneMock = { run: (fn: () => any) => fn() } as unknown as NgZone;
    const service = new EventTutorialService(routerMock, zoneMock);
    return { service, navigate, routerMock };
  };

  afterEach(() => {
    document.querySelectorAll('.driver-popover, .driver-overlay, .driver-layer').forEach(el => el.remove());
  });

  it('registers all 10 event sections', () => {
    const { service } = createService();
    const keys = service.sections.map(s => s.key);
    expect(keys).toEqual([
      'info',
      'guests',
      'tables',
      'rsvps',
      'album',
      'communication',
      'dj',
      'dedications',
      'integration',
      'logs'
    ] as TutorialSectionKey[]);
  });

  it('emits tutorial request when inside an active event context', () => {
    const { service } = createService('/new/events/6a987c1ede9c0bcfa6744500');
    const emitted: Array<TutorialSectionKey | undefined> = [];
    service.tutorialRequest$.subscribe(sec => emitted.push(sec));

    service.setEventContext('6a987c1ede9c0bcfa6744500', 'guests', ['info', 'guests', 'tables']);
    service.triggerFromSidebar();
    service.triggerFromSidebar('tables');

    expect(emitted).toEqual([undefined, 'tables']);
  });

  it('navigates back to event detail with tutorial query param when requesting a specific event section from sub-route', () => {
    const { service, navigate } = createService('/new/events/6a987c1ede9c0bcfa6744500/seating');
    service.triggerFromSidebar('tables');

    expect(navigate).toHaveBeenCalledWith(
      ['/new/events', '6a987c1ede9c0bcfa6744500'],
      { queryParams: { tab: 'tables', tutorial: '1' } }
    );
  });

  it('resolves contextual page tours from platform routes', () => {
    const { service } = createService('/new/dashboard');
    expect(service.resolvePageTourFromUrl('/new/dashboard')).toBe('dashboard');
    expect(service.resolvePageTourFromUrl('/new/events')).toBe('events');
    expect(service.resolvePageTourFromUrl('/new/events/6a987c1ede9c0bcfa6744500/seating')).toBe('seating-chart');
    expect(service.resolvePageTourFromUrl('/new/invitations/abc123/visual-editor')).toBe('visual-editor');
    expect(service.resolvePageTourFromUrl('/new/demo/visual-editor')).toBe('visual-editor');
    expect(service.resolvePageTourFromUrl('/new/invitations/abc123/pass-editor')).toBe('pass-editor');
    expect(service.resolvePageTourFromUrl('/new/invitations/abc123/editor')).toBe('invitation-editor');
    expect(service.resolvePageTourFromUrl('/new/invitations/abc123/sections')).toBe('invitation-sections');
    expect(service.resolvePageTourFromUrl('/new/plan')).toBe('plan');
    expect(service.resolvePageTourFromUrl('/new/contact')).toBe('contact');
    expect(service.resolvePageTourFromUrl('/new/guia')).toBe('user-guide');
    expect(service.resolvePageTourFromUrl('/new/template-management')).toBe('template-management');
  });
});
