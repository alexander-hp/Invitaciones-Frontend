import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  icon?: string;
}

export interface ConfirmDialogState {
  isOpen: boolean;
  options: ConfirmDialogOptions;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private stateSubject = new BehaviorSubject<ConfirmDialogState>({
    isOpen: false,
    options: { message: '' }
  });

  private resolveFn?: (result: boolean) => void;

  get state$(): Observable<ConfirmDialogState> {
    return this.stateSubject.asObservable();
  }

  confirm(options: ConfirmDialogOptions | string): Promise<boolean> {
    const opts: ConfirmDialogOptions = typeof options === 'string'
      ? {
          title: '¿Confirmar acción?',
          message: options,
          confirmText: 'Aceptar',
          cancelText: 'Cancelar',
          type: 'danger'
        }
      : {
          title: options.title || '¿Confirmar acción?',
          message: options.message,
          confirmText: options.confirmText || 'Aceptar',
          cancelText: options.cancelText || 'Cancelar',
          type: options.type || 'danger',
          icon: options.icon
        };

    this.stateSubject.next({ isOpen: true, options: opts });

    return new Promise<boolean>((resolve) => {
      this.resolveFn = resolve;
    });
  }

  handleResult(result: boolean): void {
    this.stateSubject.next({ isOpen: false, options: { message: '' } });
    if (this.resolveFn) {
      this.resolveFn(result);
      this.resolveFn = undefined;
    }
  }
}
