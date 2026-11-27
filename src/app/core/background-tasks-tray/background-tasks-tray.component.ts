import { Component } from '@angular/core';
import { BackgroundTask, BackgroundTasksService } from '../background-tasks.service';

@Component({
  selector: 'app-background-tasks-tray',
  template: `
    <div class="bg-tasks-tray" *ngIf="(tasks$ | async) as tasks" [class.has-tasks]="tasks.length > 0" aria-live="polite">
      <div class="bg-task-card" *ngFor="let task of tasks; trackBy: trackById"
           [class.is-minimized]="task.minimized"
           [class.is-completed]="task.completed && !task.failed"
           [class.is-failed]="task.completed && task.failed">

        <!-- Header -->
        <div class="bg-task-header">
          <div class="bg-task-icon"
               [class.done]="task.completed && !task.failed"
               [class.err]="task.completed && task.failed">
            <svg *ngIf="task.completed && !task.failed" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <svg *ngIf="task.completed && task.failed" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <svg *ngIf="!task.completed" class="bg-spin" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="2" x2="12" y2="6"></line>
              <line x1="12" y1="18" x2="12" y2="22"></line>
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
              <line x1="2" y1="12" x2="6" y2="12"></line>
              <line x1="18" y1="12" x2="22" y2="12"></line>
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
            </svg>
          </div>

          <div class="bg-task-title-wrap" (click)="bgTasks.toggleMinimize(task.id)">
            <div class="bg-task-title">{{ task.title }}</div>
            <div class="bg-task-mini-meta" *ngIf="task.minimized">
              {{ task.completed ? (task.failed ? 'Con errores' : 'Completado') : (task.current + ' / ' + task.total + ' · ' + task.percent + '%') }}
            </div>
          </div>

          <div class="bg-task-controls">
            <button type="button" class="bg-icon-btn" (click)="bgTasks.toggleMinimize(task.id)"
                    [attr.aria-label]="task.minimized ? 'Expandir' : 'Minimizar'"
                    [title]="task.minimized ? 'Expandir' : 'Minimizar'">
              <svg *ngIf="!task.minimized" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <svg *ngIf="task.minimized" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
            </button>
            <button *ngIf="task.completed" type="button" class="bg-icon-btn" (click)="bgTasks.dismissTask(task.id)"
                    aria-label="Cerrar notificación" title="Cerrar">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <!-- Expanded Body -->
        <div class="bg-task-body" *ngIf="!task.minimized">
          <div class="bg-task-stats">
            <span class="bg-task-count">
              {{ task.current }} / {{ task.total }}
              <small>{{ task.unitLabel || (task.kind === 'zip' ? 'pases' : (task.kind === 'table_qrs_zip' ? 'mesas' : 'destinatarios')) }}</small>
            </span>
            <span class="bg-task-pct">{{ task.percent }}%</span>
          </div>

          <div class="bg-progress-track">
            <div class="bg-progress-fill"
                 [class.shimmer]="!task.completed"
                 [class.done]="task.completed && !task.failed"
                 [class.err]="task.completed && task.failed"
                 [style.width.%]="task.percent">
            </div>
          </div>

          <div class="bg-task-status">{{ task.statusText }}</div>

          <div class="bg-task-summary" *ngIf="task.completed">
            <span *ngIf="task.successCount > 0" class="bg-pill ok">✓ {{ task.successCount }} completados</span>
            <span *ngIf="task.errorCount > 0" class="bg-pill err">⚠ {{ task.errorCount }} fallidos</span>
            <button type="button" class="bg-done-btn" (click)="bgTasks.dismissTask(task.id)">Listo</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bg-tasks-tray {
      position: fixed;
      right: 20px;
      bottom: 20px;
      z-index: 1200;
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 340px;
      max-width: calc(100vw - 24px);
      pointer-events: none;
    }

    .bg-task-card {
      pointer-events: auto;
      background: #ffffff;
      border: 1px solid #e6d9c6;
      border-radius: 14px;
      box-shadow: 0 14px 36px rgba(24, 20, 17, 0.16), 0 2px 8px rgba(0, 0, 0, 0.06);
      overflow: hidden;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .bg-task-card.is-completed {
      border-color: rgba(22, 163, 74, 0.38);
    }

    .bg-task-card.is-failed {
      border-color: rgba(220, 38, 38, 0.35);
    }

    .bg-task-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 11px 12px;
      background: #faf7f2;
      border-bottom: 1px solid #efe6d9;
    }

    .bg-task-card.is-minimized .bg-task-header {
      border-bottom: none;
    }

    .bg-task-icon {
      width: 32px;
      height: 32px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: rgba(192, 156, 120, 0.16);
      color: #b0844e;
    }

    .bg-task-icon.done {
      background: rgba(34, 197, 94, 0.14);
      color: #16a34a;
    }

    .bg-task-icon.err {
      background: rgba(220, 38, 38, 0.12);
      color: #dc2626;
    }

    .bg-task-title-wrap {
      flex: 1;
      min-width: 0;
      cursor: pointer;
    }

    .bg-task-title {
      font-size: 13px;
      font-weight: 700;
      color: #1e1b18;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .bg-task-mini-meta {
      font-size: 11.5px;
      color: #7c7266;
      margin-top: 1px;
    }

    .bg-task-controls {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .bg-icon-btn {
      width: 26px;
      height: 26px;
      border-radius: 7px;
      border: 1px solid transparent;
      background: transparent;
      color: #6b645b;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .bg-icon-btn:hover {
      background: rgba(0, 0, 0, 0.06);
      color: #1e1b18;
    }

    .bg-task-body {
      padding: 12px 14px 13px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .bg-task-stats {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
    }

    .bg-task-count {
      font-size: 13px;
      font-weight: 800;
      color: #1e1b18;
    }

    .bg-task-count small {
      font-size: 11.5px;
      font-weight: 500;
      color: #8b8175;
      margin-left: 3px;
    }

    .bg-task-pct {
      font-size: 12.5px;
      font-weight: 700;
      color: #b0844e;
    }

    .bg-progress-track {
      height: 6px;
      width: 100%;
      background: #f2ece2;
      border-radius: 999px;
      overflow: hidden;
    }

    .bg-progress-fill {
      height: 100%;
      border-radius: 999px;
      transition: width 0.35s ease-out;
    }

    .bg-progress-fill.shimmer {
      background: linear-gradient(90deg, #c09c78 0%, #ecd9c6 50%, #c09c78 100%);
      background-size: 200% 100%;
      animation: bgShimmer 1.8s infinite linear;
    }

    .bg-progress-fill.done {
      background: linear-gradient(90deg, #22c55e, #16a34a);
    }

    .bg-progress-fill.err {
      background: linear-gradient(90deg, #ef4444, #dc2626);
    }

    .bg-task-status {
      font-size: 11.5px;
      color: #6b645b;
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .bg-task-summary {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      padding-top: 4px;
    }

    .bg-pill {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 999px;
    }

    .bg-pill.ok {
      background: rgba(34, 197, 94, 0.12);
      color: #15803d;
    }

    .bg-pill.err {
      background: rgba(220, 38, 38, 0.1);
      color: #b91c1c;
    }

    .bg-done-btn {
      margin-left: auto;
      padding: 4px 10px;
      border-radius: 8px;
      border: 1px solid #dfd2c0;
      background: #faf7f2;
      color: #1e1b18;
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
    }

    .bg-done-btn:hover {
      background: #efe6d9;
    }

    .bg-spin {
      animation: bgSpin 2.4s linear infinite;
    }

    @keyframes bgSpin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @keyframes bgShimmer {
      0% { background-position: 100% 0; }
      100% { background-position: -100% 0; }
    }

    @media (max-width: 600px) {
      .bg-tasks-tray {
        left: 12px;
        right: 12px;
        bottom: 12px;
        width: auto;
      }
    }
  `]
})
export class BackgroundTasksTrayComponent {
  tasks$ = this.bgTasks.tasks$;

  constructor(public bgTasks: BackgroundTasksService) {}

  trackById(_: number, task: BackgroundTask): string {
    return task.id;
  }
}
