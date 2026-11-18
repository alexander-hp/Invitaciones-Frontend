import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from 'src/environments/environment';

declare const google: any;

@Injectable({
  providedIn: 'root'
})
export class GoogleAuthService {
  private credentialSubject = new Subject<string>();
  readonly credential$: Observable<string> = this.credentialSubject.asObservable();
  private initialized = false;

  constructor(private ngZone: NgZone) {}

  isConfigured(): boolean {
    const clientId = environment.googleClientId;
    return Boolean(clientId && !clientId.includes('AQUI_VA'));
  }

  init(): void {
    if (this.initialized || typeof window === 'undefined') return;
    if (!this.isConfigured()) {
      return;
    }
    const clientId = environment.googleClientId;

    const checkAndInit = () => {
      if (typeof google !== 'undefined' && google?.accounts?.id) {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: any) => {
            this.ngZone.run(() => {
              if (response?.credential) {
                this.credentialSubject.next(response.credential);
              }
            });
          },
          auto_select: false,
          cancel_on_tap_outside: true
        });
        this.initialized = true;
      } else {
        setTimeout(checkAndInit, 200);
      }
    };

    checkAndInit();
  }

  renderHiddenButton(container: HTMLElement): void {
    if (!this.isConfigured()) return;
    this.init();
    const tryRender = () => {
      if (typeof google !== 'undefined' && google?.accounts?.id && container) {
        container.innerHTML = '';
        google.accounts.id.renderButton(container, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          shape: 'rectangular',
          text: 'signin_with',
          logo_alignment: 'left'
        });
      } else {
        setTimeout(tryRender, 200);
      }
    };
    tryRender();
  }

  prompt(): void {
    this.init();
    if (typeof google !== 'undefined' && google?.accounts?.id) {
      google.accounts.id.prompt();
    }
  }
}
