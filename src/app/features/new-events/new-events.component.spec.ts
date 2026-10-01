import { of } from 'rxjs';
import { EventModel } from '../../core/models';
import { NewEventsComponent } from './new-events.component';

describe('NewEventsComponent', () => {
  const event = (title: string, date: string, status: EventModel['status'] = 'draft'): EventModel => ({
    title, date, status, type: 'boda', hosts: [], venue: {}
  });

  const localDate = (offset: number): string => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const component = () => new NewEventsComponent({} as any, {} as any);

  it('keeps events happening today in upcoming events', () => {
    const page = component();
    page.events = [event('Hoy', localDate(0)), event('Ayer', localDate(-1))];

    expect(page.isPast(page.events[0])).toBeFalse();
    expect(page.upcomingCount).toBe(1);
    expect(page.pastCount).toBe(1);
  });

  it('sorts upcoming first and past events newest first', () => {
    const page = component();
    page.events = [event('Ayer', localDate(-1)), event('Después', localDate(7)), event('Antes', localDate(-7)), event('Mañana', localDate(1))];

    expect(page.filteredEvents.map(item => item.title)).toEqual(['Mañana', 'Después', 'Ayer', 'Antes']);
    page.filterMoment = 'upcoming';
    expect(page.filteredEvents.map(item => item.title)).toEqual(['Mañana', 'Después']);
  });

  it('resets combined filters and pagination', () => {
    const page = component();
    page.filterSearch = 'boda';
    page.filterType = 'boda';
    page.filterStatus = 'draft';
    page.filterMoment = 'past';
    page.currentPage = 3;

    page.clearFilters();

    expect([page.filterSearch, page.filterType, page.filterStatus, page.filterMoment]).toEqual(['', '', '', '']);
    expect(page.currentPage).toBe(1);
  });

  it('opens event search without clearing an applied query when dismissed', () => {
    const page = component();
    page.filterSearch = 'Iris';

    page.openEventSearch();
    expect(page.showEventSearch).toBeTrue();

    page.onEscape();
    expect(page.showEventSearch).toBeFalse();
    expect(page.filterSearch).toBe('Iris');
  });

  it('starts the guide at creation and opens the event form from its first step', () => {
    const page = component();
    page.gettingStartedStep = 2;

    page.openGettingStarted();
    expect(page.gettingStartedStep).toBe(0);
    expect(page.showGettingStarted).toBeTrue();

    page.beginFromGuide();
    expect(page.showGettingStarted).toBeFalse();
    expect(page.showCreateModal).toBeTrue();
  });

  it('creates the selected event mode with trimmed hosts', () => {
    const createEvent = jasmine.createSpy().and.returnValue(of({ event: { _id: 'new-id' } }));
    const navigate = jasmine.createSpy();
    const page = new NewEventsComponent({ createEvent } as any, { navigate } as any);
    page.newEvent.mode = 'external_dashboard';
    page.newEvent.title = ' Demo ';
    page.newEvent.date = localDate(1);
    page.newEvent.hosts = 'Ana, , Carlos';
    page.newEvent.externalSiteUrl = 'https://example.com';

    page.createEvent();

    expect(createEvent).toHaveBeenCalledWith(jasmine.objectContaining({
      mode: 'external_dashboard', title: 'Demo', hosts: ['Ana', 'Carlos'], externalSiteUrl: 'https://example.com'
    }));
    expect(navigate).toHaveBeenCalledWith(['/new/events', 'new-id']);
  });
});
