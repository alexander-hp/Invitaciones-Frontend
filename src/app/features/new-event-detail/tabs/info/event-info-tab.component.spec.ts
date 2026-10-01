import { EventModel } from '../../../../core/models';
import { SimpleChange } from '@angular/core';
import { EventInfoTabComponent } from './event-info-tab.component';

describe('EventInfoTabComponent overview', () => {
  const create = () => {
    const page = new EventInfoTabComponent({} as any, {} as any);
    page.event = {
      _id: 'event-1', title: 'Evento', type: 'boda', date: '2026-12-01',
      hosts: [], venue: {}, status: 'draft', mode: 'invitation',
      access: { owner: true, permissions: [] }
    } as EventModel;
    return page;
  };

  it('keeps the invitation action visible and secondary settings collapsed', () => {
    const page = create();

    expect(page.collapsedCards['invitations']).toBeFalse();
    expect(page.collapsedCards['details']).toBeTrue();
    expect(page.collapsedCards['cover']).toBeTrue();
    expect(page.collapsedCards['team']).toBeTrue();
    expect(page.collapsedCards['external']).toBeTrue();
    expect(page.collapsedCards['plans']).toBeTrue();
  });

  it('opens event details when editing starts', () => {
    const page = create();

    page.openEditDetails();

    expect(page.editingDetails).toBeTrue();
    expect(page.collapsedCards['details']).toBeFalse();
    expect(page.editDetailsForm.title).toBe('Evento');
  });

  it('expands the section addressed by the event search', () => {
    const page = create();
    page.focusSection = 'cover';

    page.ngOnChanges({ focusSection: new SimpleChange('', 'cover', false) });

    expect(page.collapsedCards['cover']).toBeFalse();
    expect(page.collapsedCards['team']).toBeTrue();
  });
});
