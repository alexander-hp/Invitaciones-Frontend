import { SimpleChange } from '@angular/core';
import { EventAlbumTabComponent } from './event-album-tab.component';

describe('EventAlbumTabComponent quick navigation', () => {
  it('reveals album access links without reloading photos for a section-only change', () => {
    const tab = new EventAlbumTabComponent({} as any);
    tab.eventId = 'event-1';
    tab.focusSection = 'album-access';
    spyOn(tab, 'loadAlbum');
    spyOn(tab, 'loadAlbumAccessLinks');

    tab.ngOnChanges({ focusSection: new SimpleChange('', 'album-access', false) });

    expect(tab.isAccessLinksCollapsed).toBeFalse();
    expect(tab.loadAlbum).not.toHaveBeenCalled();
    expect(tab.loadAlbumAccessLinks).not.toHaveBeenCalled();
  });
});
