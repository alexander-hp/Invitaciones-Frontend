import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { AnalyticsTrackerService } from './analytics-tracker.service';

@Injectable()
export class AnalyticsErrorHandler implements ErrorHandler {
  constructor(private injector: Injector) { }

  handleError(error: unknown): void {
    try {
      const analytics = this.injector.get(AnalyticsTrackerService);
      analytics.recordRuntimeError(error);
    } catch {
      // Evitar recursión en caso de fallo temprano de inyección
    }
    console.error(error);
  }
}
