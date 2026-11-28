import { Injectable, Injector } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse
} from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AnalyticsTrackerService } from './analytics-tracker.service';

@Injectable()
export class AnalyticsHttpInterceptor implements HttpInterceptor {
  constructor(private injector: Injector) { }

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Excluir las rutas del propio módulo de analítica para evitar cualquier bucle de telemetría
    if (/\/analytics\//i.test(req.url)) {
      return next.handle(req);
    }

    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

    return next.handle(req).pipe(
      tap({
        next: (event) => {
          if (event instanceof HttpResponse) {
            const elapsed = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt);
            try {
              this.injector.get(AnalyticsTrackerService).recordHttpTelemetry({
                method: req.method,
                url: req.url,
                status: event.status,
                durationMs: Math.max(1, elapsed),
                ok: true
              });
            } catch { }
          }
        },
        error: (err: HttpErrorResponse) => {
          const elapsed = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt);
          try {
            this.injector.get(AnalyticsTrackerService).recordHttpTelemetry({
              method: req.method,
              url: req.url,
              status: err?.status ?? 0,
              durationMs: Math.max(1, elapsed),
              ok: false
            });
          } catch { }
        }
      })
    );
  }
}
