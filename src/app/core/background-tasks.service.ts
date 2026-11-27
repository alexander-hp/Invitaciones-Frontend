import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { ApiService } from './api.service';
import { GuestMessageType } from './models';

export type BackgroundTaskKind = 'email' | 'whatsapp' | 'special_passes' | 'zip' | 'table_qrs_zip';

export interface BackgroundTask {
  id: string;
  eventId: string;
  title: string;
  subtitle: string;
  kind: BackgroundTaskKind;
  unitLabel?: string;
  current: number;
  total: number;
  percent: number;
  statusText: string;
  completed: boolean;
  failed: boolean;
  minimized: boolean;
  successCount: number;
  errorCount: number;
}

export interface BackgroundTaskCompletion {
  eventId: string;
  kind: BackgroundTaskKind;
  successCount: number;
  errorCount: number;
  message?: string;
  error?: string;
  results?: any[];
}

@Injectable({ providedIn: 'root' })
export class BackgroundTasksService {
  private readonly tasksSubject = new BehaviorSubject<BackgroundTask[]>([]);
  readonly tasks$ = this.tasksSubject.asObservable();

  private readonly taskCompletedSubject = new Subject<BackgroundTaskCompletion>();
  readonly taskCompleted$ = this.taskCompletedSubject.asObservable();

  private readonly intervals = new Map<string, ReturnType<typeof setInterval>>();

  constructor(private apiService: ApiService) {}

  get tasks(): BackgroundTask[] {
    return this.tasksSubject.value;
  }

  isRunning(eventId: string | undefined, kind: BackgroundTaskKind): boolean {
    if (!eventId) return false;
    return this.tasks.some((t) => t.eventId === eventId && t.kind === kind && !t.completed);
  }

  toggleMinimize(taskId: string): void {
    this.updateTask(taskId, (task) => ({ ...task, minimized: !task.minimized }));
  }

  dismissTask(taskId: string): void {
    this.clearIntervalFor(taskId);
    this.tasksSubject.next(this.tasks.filter((t) => t.id !== taskId));
  }

  beginCustomTask(config: {
    eventId: string;
    title: string;
    subtitle: string;
    kind: BackgroundTaskKind;
    total: number;
    unitLabel?: string;
    initialStatusText?: string;
  }): string {
    const id = `${config.kind}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const task: BackgroundTask = {
      id,
      eventId: config.eventId,
      title: config.title,
      subtitle: config.subtitle,
      kind: config.kind,
      unitLabel: config.unitLabel,
      current: 0,
      total: config.total,
      percent: config.total > 0 ? 2 : 0,
      statusText: config.initialStatusText || 'Iniciando proceso en segundo plano...',
      completed: false,
      failed: false,
      minimized: false,
      successCount: 0,
      errorCount: 0
    };
    const filtered = this.tasks.filter(
      (t) => !(t.eventId === config.eventId && t.kind === config.kind && t.completed)
    );
    this.tasksSubject.next([...filtered, task]);
    return id;
  }

  updateTaskProgress(taskId: string, current: number, statusText: string): void {
    this.updateTask(taskId, (t) => {
      const clampedCurrent = Math.min(t.total, Math.max(0, current));
      const pct = t.total > 0 ? Math.min(99, Math.max(1, Math.round((clampedCurrent / t.total) * 100))) : 0;
      return {
        ...t,
        current: clampedCurrent,
        percent: pct,
        statusText
      };
    });
  }

  finishCustomTask(
    taskId: string,
    successCount: number,
    errorCount: number,
    statusText: string,
    failed = false
  ): void {
    this.completeTask(taskId, successCount, errorCount, statusText, failed);
  }

  runBulkEmail(params: {
    eventId: string;
    messageType: GuestMessageType;
    messageBody?: string;
    guestIds: string[];
    attachPass: boolean;
  }): void {
    const total = params.guestIds.length;
    if (!params.eventId || !total || this.isRunning(params.eventId, 'email')) return;

    const taskId = this.startTask({
      eventId: params.eventId,
      title: 'Envío Masivo de Email',
      subtitle: 'Procesando correos en segundo plano...',
      kind: 'email',
      total,
      initialStatusText: `Procesando lote de ${total} correos...`
    });

    this.apiService.sendBulkEmail(params.eventId, {
      confirm: true,
      messageType: params.messageType,
      messageBody: params.messageBody,
      guestIds: params.guestIds,
      attachPass: params.attachPass
    }).subscribe({
      next: (res) => {
        const sent = res.sent || 0;
        const failed = res.failed || 0;
        const statusText = `Finalizado: ${sent} emails enviados exitosamente.`;
        this.completeTask(taskId, sent, failed, statusText, false);
        this.taskCompletedSubject.next({
          eventId: params.eventId,
          kind: 'email',
          successCount: sent,
          errorCount: failed,
          message: `Se enviaron ${sent} emails con éxito.${failed > 0 ? ` (${failed} fallidos)` : ''}`
        });
      },
      error: (err) => {
        const errorMsg = err?.error?.message || 'Error al enviar emails masivos';
        this.completeTask(taskId, 0, total, errorMsg, true);
        this.taskCompletedSubject.next({
          eventId: params.eventId,
          kind: 'email',
          successCount: 0,
          errorCount: total,
          error: errorMsg
        });
      }
    });
  }

  runBulkWhatsApp(params: {
    eventId: string;
    messageType: GuestMessageType;
    messageBody?: string;
    guestIds: string[];
    attachPass: boolean;
  }): void {
    const total = params.guestIds.length;
    if (!params.eventId || !total || this.isRunning(params.eventId, 'whatsapp')) return;

    const taskId = this.startTask({
      eventId: params.eventId,
      title: 'Envío Masivo de WhatsApp',
      subtitle: 'Procesando mensajes en segundo plano...',
      kind: 'whatsapp',
      total,
      initialStatusText: `Procesando lote de ${total} mensajes...`
    });

    this.apiService.sendBulkWhatsApp(params.eventId, {
      confirm: true,
      messageType: params.messageType,
      messageBody: params.messageBody,
      guestIds: params.guestIds,
      attachPass: params.attachPass
    }).subscribe({
      next: (res) => {
        const sent = res.sent || 0;
        const failed = res.failed || 0;
        const statusText = `Finalizado: ${sent} mensajes de WhatsApp enviados.`;
        this.completeTask(taskId, sent, failed, statusText, false);
        this.taskCompletedSubject.next({
          eventId: params.eventId,
          kind: 'whatsapp',
          successCount: sent,
          errorCount: failed,
          message: `Se enviaron ${sent} mensajes de WhatsApp con éxito.${failed > 0 ? ` (${failed} fallidos)` : ''}`
        });
      },
      error: (err) => {
        const errorMsg = err?.error?.message || 'Error al enviar WhatsApp masivo';
        this.completeTask(taskId, 0, total, errorMsg, true);
        this.taskCompletedSubject.next({
          eventId: params.eventId,
          kind: 'whatsapp',
          successCount: 0,
          errorCount: total,
          error: errorMsg
        });
      }
    });
  }

  runSpecialPasses(params: {
    eventId: string;
    messageType: GuestMessageType;
    messageBody?: string;
    guestIds: string[];
  }): void {
    const count = params.guestIds.length;
    if (!params.eventId || !count || this.isRunning(params.eventId, 'special_passes')) return;

    const taskId = this.startTask({
      eventId: params.eventId,
      title: 'Envío de Pases Especiales',
      subtitle: 'Generando y enviando pases VIP en segundo plano...',
      kind: 'special_passes',
      total: count,
      initialStatusText: `Enviando lote de ${count} pases con imagen...`
    });

    this.apiService.sendBulkWhatsApp(params.eventId, {
      confirm: true,
      messageType: params.messageType,
      messageBody: params.messageBody,
      guestIds: params.guestIds,
      attachPass: true
    }).subscribe({
      next: (res: any) => {
        const sent = res.sent ?? 0;
        const failed = (res.failed ?? 0) + (res.skipped ?? 0) + Math.max(0, count - (res.requested ?? count));
        const statusText = sent
          ? `Se enviaron ${sent} pases VIP con imagen.${failed ? ` ${failed} pendientes de reintento.` : ''}`
          : 'No se envió ningún pase con imagen. Revisa los resultados y vuelve a intentarlo.';
        this.completeTask(taskId, sent, failed, statusText, sent === 0);
        this.taskCompletedSubject.next({
          eventId: params.eventId,
          kind: 'special_passes',
          successCount: sent,
          errorCount: failed,
          results: res.results || [],
          message: sent ? `Se enviaron ${sent} pases con imagen.${failed ? ` ${failed} pendientes de reintento.` : ''}` : undefined,
          error: sent ? undefined : (res.results?.find((r: any) => r.error)?.error || 'No se envió ningún pase con imagen.')
        });
      },
      error: (err: any) => {
        const errorMsg = err?.error?.message || 'Error al enviar pases a invitados especiales';
        this.completeTask(taskId, 0, count, errorMsg, true);
        this.taskCompletedSubject.next({
          eventId: params.eventId,
          kind: 'special_passes',
          successCount: 0,
          errorCount: count,
          error: errorMsg
        });
      }
    });
  }

  runDownloadAllPassesZip(params: {
    eventId: string;
    eventTitle: string;
    total: number;
  }): void {
    if (!params.eventId || !params.total || this.isRunning(params.eventId, 'zip')) return;

    const safeTitle = (params.eventTitle || 'Evento').replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');
    const taskId = this.startTask({
      eventId: params.eventId,
      title: 'Descarga de Pases en ZIP',
      subtitle: 'Generando pases VIP en segundo plano...',
      kind: 'zip',
      total: params.total,
      initialStatusText: 'El servidor está renderizando y empaquetando los pases...'
    });

    this.apiService.downloadAllPassesZip(params.eventId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Pases_VIP_${safeTitle}.zip`;
        a.click();
        window.URL.revokeObjectURL(url);

        const statusText = `Pases_VIP_${safeTitle}.zip descargado (${params.total} pases).`;
        this.completeTask(taskId, params.total, 0, statusText, false);
        this.taskCompletedSubject.next({
          eventId: params.eventId,
          kind: 'zip',
          successCount: params.total,
          errorCount: 0,
          message: `Se descargaron exitosamente ${params.total} pases en formato ZIP.`
        });
      },
      error: (err: any) => {
        const errorMsg = err?.error?.message || 'Error al descargar archivo ZIP de pases';
        this.completeTask(taskId, 0, params.total, errorMsg, true);
        this.taskCompletedSubject.next({
          eventId: params.eventId,
          kind: 'zip',
          successCount: 0,
          errorCount: params.total,
          error: errorMsg
        });
      }
    });
  }

  private startTask(config: {
    eventId: string;
    title: string;
    subtitle: string;
    kind: BackgroundTaskKind;
    total: number;
    initialStatusText?: string;
  }): string {
    const id = `${config.kind}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const task: BackgroundTask = {
      id,
      eventId: config.eventId,
      title: config.title,
      subtitle: config.subtitle,
      kind: config.kind,
      current: Math.max(1, Math.round(config.total * 0.05)),
      total: config.total,
      percent: 6,
      statusText: config.initialStatusText || 'Iniciando proceso en segundo plano...',
      completed: false,
      failed: false,
      minimized: false,
      successCount: 0,
      errorCount: 0
    };

    // Remove any previously completed task of the same kind & event to keep the tray clean
    const filtered = this.tasks.filter(
      (t) => !(t.eventId === config.eventId && t.kind === config.kind && t.completed)
    );
    this.tasksSubject.next([...filtered, task]);

    const phrases = this.getPhrases(config.kind, config.total);
    let stepIndex = 0;

    const timer = setInterval(() => {
      const existing = this.tasks.find((t) => t.id === id);
      if (!existing || existing.completed) {
        this.clearIntervalFor(id);
        return;
      }

      let nextPercent = existing.percent;
      let nextCurrent = existing.current;
      if (nextPercent < 94) {
        const increment = Math.max(1, Math.round((95 - nextPercent) * 0.07));
        nextPercent = Math.min(94, nextPercent + increment);
        nextCurrent = Math.min(
          Math.max(1, existing.total - 1),
          Math.max(1, Math.round((nextPercent / 100) * existing.total))
        );
      }

      stepIndex = (stepIndex + 1) % phrases.length;
      this.updateTask(id, (t) => ({
        ...t,
        percent: nextPercent,
        current: nextCurrent,
        statusText: phrases[stepIndex]
      }));
    }, 1400);

    this.intervals.set(id, timer);
    return id;
  }

  private completeTask(
    taskId: string,
    successCount: number,
    errorCount: number,
    statusText: string,
    failed: boolean
  ): void {
    this.clearIntervalFor(taskId);
    this.updateTask(taskId, (t) => ({
      ...t,
      current: t.total,
      percent: 100,
      completed: true,
      failed,
      minimized: false,
      successCount,
      errorCount,
      statusText
    }));
  }

  private updateTask(taskId: string, updater: (task: BackgroundTask) => BackgroundTask): void {
    this.tasksSubject.next(this.tasks.map((t) => (t.id === taskId ? updater(t) : t)));
  }

  private clearIntervalFor(taskId: string): void {
    const timer = this.intervals.get(taskId);
    if (timer) {
      clearInterval(timer);
      this.intervals.delete(taskId);
    }
  }

  private getPhrases(kind: BackgroundTaskKind, total: number): string[] {
    switch (kind) {
      case 'email':
        return [
          `Preparando lote de ${total} correos electrónicos...`,
          'Generando enlaces y tokens de acceso personalizados...',
          'Renderizando plantillas de correo para cada invitado...',
          'Despachando mensajes a través del servidor...',
          'Verificando confirmaciones y estados de entrega...',
          'Finalizando sincronización de envíos...'
        ];
      case 'whatsapp':
        return [
          `Preparando lote de ${total} mensajes de WhatsApp...`,
          'Formateando mensajes personalizados con tokens únicos...',
          'Despachando mensajes a través del servicio de mensajería...',
          'Sincronizando estados de entrega con el servidor...',
          'Consolidando métricas de comunicación...'
        ];
      case 'special_passes':
        return [
          `Generando imágenes de pase VIP para los ${total} invitados especiales...`,
          'Incorporando códigos QR de acceso en alta resolución...',
          'Adjuntando tarjetas de pase y despachando por WhatsApp...',
          'Registrando bloqueo de cupo especial en el servidor...'
        ];
      case 'zip':
      case 'table_qrs_zip':
        return [
          'Inicializando renderizador en el servidor...',
          'Generando imágenes PNG de alta resolución (2x Retina)...',
          'Empaquetando tarjetas oficiales en el archivo ZIP...',
          'Preparando descarga automática del archivo...'
        ];
    }
  }
}
