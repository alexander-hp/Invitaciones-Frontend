import { DomSanitizer } from '@angular/platform-browser';
import { ApiService } from '../../../../core/api.service';
import { ConfirmDialogService } from '../../../../core/confirm-dialog.service';
import { GuestModel } from '../../../../core/models';
import { EventCommunicationTabComponent } from './event-communication-tab.component';

describe('EventCommunicationTabComponent', () => {
  let component: EventCommunicationTabComponent;

  beforeEach(() => {
    component = new EventCommunicationTabComponent(
      {} as ApiService,
      {} as ConfirmDialogService,
      {} as DomSanitizer
    );
  });

  it('requires an active OpenWA session but not an OpenWA session for Meta', () => {
    component.whatsappEnabled = true;
    component.whatsappProvider = 'openwa';
    component.openWaReady = false;
    expect(component.whatsappReady).toBeFalse();

    component.whatsappProvider = 'meta';
    expect(component.whatsappReady).toBeTrue();

    component.whatsappEnabled = false;
    expect(component.whatsappReady).toBeFalse();
  });

  it('counts only filtered, included recipients with a usable channel', () => {
    component.guests = [
      { _id: 'a', name: 'Ana', group: 'VIP', email: 'ana@example.com', phone: '2727088143' },
      { _id: 'b', name: 'Beto', group: 'VIP', email: 'beto@example.com' },
      { _id: 'c', name: 'Caro', group: 'Familia', phone: '2727088144' }
    ] as GuestModel[];
    component.guestGroupFilter = 'VIP';
    component.excludedGuestIds.add('b');

    expect(component.activeRecipients.length).toBe(1);
    expect(component.activeEmailRecipientsCount).toBe(1);
    expect(component.activeWhatsappRecipientsCount).toBe(1);
  });
});
