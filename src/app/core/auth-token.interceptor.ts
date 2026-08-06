import { Injectable } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

const TOKEN_KEY = 'invitaciones_token';

@Injectable()
export class AuthTokenInterceptor implements HttpInterceptor {
  constructor(private router: Router) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = localStorage.getItem(TOKEN_KEY);
    const isApiRequest = req.url.startsWith(environment.apiUrl);
    const authReq = token && isApiRequest ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        const isAuthEntryPoint = ['/auth/login', '/auth/register', '/auth/social'].some((path) => req.url.includes(path));
        if (isApiRequest && error.status === 401 && !isAuthEntryPoint) {
          localStorage.removeItem(TOKEN_KEY);
          this.router.navigate(['/new/login']);
        }
        return throwError(() => error);
      })
    );
  }
}
