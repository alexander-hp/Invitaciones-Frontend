import { SimpleChange } from '@angular/core';
import { EventGuestsTabComponent } from './event-guests-tab.component';

describe('EventGuestsTabComponent quick navigation', () => {
  it('opens the import menu when a direct link targets it', () => {
    const tab = new EventGuestsTabComponent({} as any, {} as any);
    tab.focusSection = 'guest-import';

    tab.ngOnChanges({ focusSection: new SimpleChange('', 'guest-import', true) });

    expect(tab.showImpExpMenu).toBeTrue();
  });
});
