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

  it('registers all 7 requested event sections', () => {
    const { service } = createService();
    const keys = service.sections.map(s => s.key);
    expect(keys).toEqual([
      'info',
      'guests',
      'tables',
      'rsvps',
      'communication',
      'dj',
      'dedications'
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

  it('navigates back to event detail with tutorial query param when on event sub-route', () => {
    const { service, navigate } = createService('/new/events/6a987c1ede9c0bcfa6744500/seating');
    service.triggerFromSidebar('tables');

    expect(navigate).toHaveBeenCalledWith(
      ['/new/events', '6a987c1ede9c0bcfa6744500'],
      { queryParams: { tab: 'tables', tutorial: '1' } }
    );
  });
});
