import { DomSanitizer } from '@angular/platform-browser';
import { of } from 'rxjs';
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

  it('uses the invitation slug and guest token in the preview', () => {
    component.invitation = { slug: 'boda-prueba' } as any;
    const message = component.buildMessage({ name: 'Ana', invitationToken: 'token-ana' } as GuestModel, 'invitation');
    expect(message).toContain('/i/boda-prueba?t=token-ana');
    expect(message).not.toContain('/new/i/');
  });

  it('sends the edited body to the email API', () => {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['sendGuestEmail']);
    api.sendGuestEmail.and.returnValue(of({} as any));
    component = new EventCommunicationTabComponent(api, {} as ConfirmDialogService, {} as DomSanitizer);
    component.isMessageEdited = true;
    component.customMessageBody = '  Te esperamos con alegría.  ';
    component.sendRealEmail({ _id: 'guest-id', name: 'Ana', email: 'ana@example.com' } as GuestModel);

    expect(api.sendGuestEmail).toHaveBeenCalledWith('guest-id', jasmine.objectContaining({
      messageBody: 'Te esperamos con alegría.'
    }));
  });

  it('preserves an edited body when changing the message type', () => {
    component.customMessageBody = 'Texto anterior';
    component.isMessageEdited = true;
    component.selectedMessageType = 'reminder';
    component.onMessageTypeChange();

    expect(component.isMessageEdited).toBeTrue();
    expect(component.customMessageBody).toBe('Texto anterior');
  });

  it('counts only confirmed image sends and leaves failed guests available to retry', () => {
    const eventId = 'special-pass-spec';
    component.event = { _id: eventId } as any;
    localStorage.setItem(`special_passes_sent_${eventId}`, 'true');

    try {
      expect(component.specialPassesAlreadySent).toBeFalse();
      component.selectedSpecialGuestIds = new Set(['sent-guest', 'failed-guest']);
      component.markSpecialPassesAsSent([
        { guest: 'sent-guest', status: 'sent' },
        { guest: 'failed-guest', status: 'failed' }
      ]);

      expect(component.specialPassesSentCount).toBe(1);
      expect(component.selectedSpecialGuestIds.has('sent-guest')).toBeFalse();
      expect(component.selectedSpecialGuestIds.has('failed-guest')).toBeTrue();
      expect(component.specialPassesAlreadySent).toBeFalse();
    } finally {
      localStorage.removeItem(`special_passes_sent_${eventId}`);
    }
  });

  it('ignores stale browser success flags and restores confirmed passes from the API', () => {
    const eventId = 'pass-status-spec';
    const staleKey = `special_pass_image_sent_ids_v2_${eventId}`;
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['getWhatsAppPassStatus', 'getWhatsAppStatus', 'listWhatsAppMedia']);
    api.getWhatsAppPassStatus.and.returnValue(of({ sentGuestIds: ['confirmed-guest'] }));
    api.getWhatsAppStatus.and.returnValue(of({} as any));
    api.listWhatsAppMedia.and.returnValue(of({ assets: [] }));
    component = new EventCommunicationTabComponent(api, {} as ConfirmDialogService, {} as DomSanitizer);
    component.event = { _id: eventId } as any;
    component.selectedSpecialGuestIds = new Set(['stale-guest', 'confirmed-guest']);
    localStorage.setItem(staleKey, JSON.stringify(['stale-guest']));
    try {
      component.loadCommunicationData();
      expect(component.specialPassesSentCount).toBe(1);
      expect(component.selectedSpecialGuestIds.has('confirmed-guest')).toBeFalse();
      expect(component.selectedSpecialGuestIds.has('stale-guest')).toBeTrue();
    } finally {
      localStorage.removeItem(staleKey);
    }
  });

  it('restores the pass switch and delivery mode for the same event after reload', () => {
    const eventId = 'delivery-preferences-spec';
    const key = `communication_delivery_preferences_${eventId}`;
    component.event = { _id: eventId } as any;
    try {
      component.setIncludePassInMessage(true);
      component.setDeliveryModeWithImage(true);

      const restored = new EventCommunicationTabComponent({} as ApiService, {} as ConfirmDialogService, {} as DomSanitizer);
      restored.event = { _id: eventId } as any;
      restored.ngOnChanges({ event: { firstChange: true } as any });
      expect(restored.includePassInMessage).toBeTrue();
      expect(restored.deliveryModeWithImage).toBeTrue();
    } finally {
      localStorage.removeItem(key);
    }
  });

  it('resends a previously sent pass only after confirmation and includes the image', async () => {
    const eventId = 'resend-pass-spec';
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['sendGuestWhatsApp']);
    const dialog = jasmine.createSpyObj<ConfirmDialogService>('ConfirmDialogService', ['confirm']);
    api.sendGuestWhatsApp.and.returnValue(of({ status: 'sent' } as any));
    dialog.confirm.and.returnValue(Promise.resolve(true));
    component = new EventCommunicationTabComponent(api, dialog, {} as DomSanitizer);
    component.event = { _id: eventId } as any;
    component.whatsappEnabled = true;
    component.whatsappProvider = 'openwa';
    component.openWaReady = true;
    component.markSpecialPassesAsSent([{ guest: 'guest-1', status: 'sent' }]);

    component.resendSpecialGuestPass({ _id: 'guest-1', name: 'Ana', phone: '2727088143' } as GuestModel);
    await Promise.resolve();
    expect(dialog.confirm).toHaveBeenCalled();
    expect(api.sendGuestWhatsApp).toHaveBeenCalledWith('guest-1', jasmine.objectContaining({ attachPass: true }));
    expect(component.resendingSpecialGuestId).toBe('');
    expect(component.specialPassesSentCount).toBe(1);
  });

  it('offers a manual text link and sends the selected special guest pass automatically', () => {
    const eventId = 'automatic-pass-spec';
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['sendGuestWhatsApp']);
    api.sendGuestWhatsApp.and.returnValue(of({ status: 'sent' } as any));
    component = new EventCommunicationTabComponent(api, {} as ConfirmDialogService, {} as DomSanitizer);
    component.event = { _id: eventId, title: 'Evento de prueba' } as any;
    component.invitation = { slug: 'evento-prueba' } as any;
    component.whatsappEnabled = true;
    component.whatsappProvider = 'openwa';
    component.openWaReady = true;
    component.deliveryModeWithImage = true;
    component.selectedSpecialGuestIds.add('guest-1');
    const guest = { _id: 'guest-1', name: 'Ana', phone: '+522727088143', roles: ['vip'] } as GuestModel;

    expect(component.getWhatsappLink(guest)).toContain('wa.me/522727088143?text=');
    expect(component.shouldAttachPassToWhatsapp(guest)).toBeTrue();
    component.sendRealWhatsapp(guest);
    expect(api.sendGuestWhatsApp).toHaveBeenCalledWith('guest-1', jasmine.objectContaining({ attachPass: true }));
    expect(component.specialPassesSentCount).toBe(1);
  });

  it('does not report an automatic WhatsApp send as successful without a sent status', () => {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['sendGuestWhatsApp']);
    api.sendGuestWhatsApp.and.returnValue(of({ status: 'skipped' } as any));
    component = new EventCommunicationTabComponent(api, {} as ConfirmDialogService, {} as DomSanitizer);
    component.whatsappEnabled = true;
    component.whatsappProvider = 'openwa';
    component.openWaReady = true;
    const guest = { _id: 'guest-2', name: 'Beto', phone: '+522727088144', communicationStatus: 'pending' } as GuestModel;

    component.sendRealWhatsapp(guest);

    expect(guest.communicationStatus).toBe('pending');
    expect(component.guestError).toContain('no confirmó');
  });
});
