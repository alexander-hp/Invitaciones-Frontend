import { HttpHandler, HttpRequest, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthTokenInterceptor } from './auth-token.interceptor';

describe('AuthTokenInterceptor', () => {
  afterEach(() => localStorage.removeItem('invitaciones_token'));

  it('does not send the owner token to public guest routes', () => {
    localStorage.setItem('invitaciones_token', 'owner-token');
    const interceptor = new AuthTokenInterceptor({ url: '/i/prueba' } as any);
    let forwarded: HttpRequest<unknown> | undefined;
    const handler: HttpHandler = { handle: (request) => { forwarded = request; return of(new HttpResponse({ status: 200 })); } };

    interceptor.intercept(new HttpRequest('GET', `${environment.apiUrl}/invitations/public/prueba`), handler).subscribe();

    expect(forwarded?.headers.has('Authorization')).toBeFalse();
  });

  it('preserves an explicitly supplied guest session', () => {
    localStorage.setItem('invitaciones_token', 'owner-token');
    const interceptor = new AuthTokenInterceptor({ url: '/i/prueba' } as any);
    let forwarded: HttpRequest<unknown> | undefined;
    const handler: HttpHandler = { handle: (request) => { forwarded = request; return of(new HttpResponse({ status: 200 })); } };
    const request = new HttpRequest('GET', `${environment.apiUrl}/invitations/public/prueba`).clone({
      setHeaders: { Authorization: 'Bearer guest-token' }
    });

    interceptor.intercept(request, handler).subscribe();

    expect(forwarded?.headers.get('Authorization')).toBe('Bearer guest-token');
  });
});
