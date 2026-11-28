import { Component, OnInit } from '@angular/core';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import {
  ActionableRoadmapInsight,
  AdminAnalyticsSnapshot,
  AnalyticsDataSourceMode,
  AnalyticsDateRange,
  AnalyticsResetScope,
  AnalyticsTrackerService,
  FunnelDefinitionReport,
  QaIssueMetric,
  SectionUsageMetric,
  TelemetryEventRecord,
  TrackerServerConfig,
  UxFrictionIncident
} from '../../core/analytics-tracker.service';

export type AdminAnalyticsTab = 'overview' | 'funnels' | 'features' | 'ux' | 'qa' | 'live' | 'settings';

@Component({
  selector: 'app-new-admin-analytics',
  templateUrl: './new-admin-analytics.component.html',
  styleUrls: ['./new-admin-analytics.component.css']
})
export class NewAdminAnalyticsComponent implements OnInit {
  sidebarOpen = false;
  activeTab: AdminAnalyticsTab = 'overview';
  selectedRange: AnalyticsDateRange = '7d';
  sourceMode: AnalyticsDataSourceMode = 'backend_db';

  deviceFilter = 'ALL';
  roleFilter = 'ALL';
  includeDiagnostics = true;

  loading = true;
  savingConfig = false;
  resetting = false;
  toastMessage = '';
  toastError = '';

  snapshot: AdminAnalyticsSnapshot | null = null;

  // Selecciones y filtros locales de tablas
  selectedFunnelId: FunnelDefinitionReport['id'] = 'creator_journey';
  sectionGroupFilter: 'ALL' | SectionUsageMetric['moduleGroup'] = 'ALL';
  sectionSearch = '';
  uxFilterType: 'ALL' | UxFrictionIncident['type'] = 'ALL';
  qaFilterKind: 'ALL' | QaIssueMetric['kind'] = 'ALL';
  liveEventFilter = 'ALL';

  configForm: TrackerServerConfig = {
    captureEnabled: true,
    trackAdminUsers: false,
    captureApiHealthSample: true,
    retentionDays: 90,
    slowApiThresholdMs: 1500,
    lastResetAt: null,
    lastResetBy: null
  };

  readonly rangeOptions: Array<{ key: AnalyticsDateRange; label: string }> = [
    { key: '24h', label: '24h' },
    { key: '7d', label: '7 días' },
    { key: '30d', label: '30 días' },
    { key: '90d', label: '90 días' }
  ];

  readonly moduleGroups: Array<'ALL' | SectionUsageMetric['moduleGroup']> = [
    'ALL',
    'Captación',
    'Gestión Evento',
    'Diseño Invitación',
    'Experiencia Invitado',
    'Operación Staff',
    'Cuenta / Admin'
  ];

  constructor(
    public analytics: AnalyticsTrackerService,
    private confirmDialog: ConfirmDialogService
  ) {}

  ngOnInit(): void {
    this.refreshSnapshot();
  }

  setTab(tab: AdminAnalyticsTab): void {
    this.activeTab = tab;
  }

  setRange(range: AnalyticsDateRange): void {
    if (this.selectedRange === range) return;
    this.selectedRange = range;
    this.refreshSnapshot();
  }

  setSourceMode(mode: AnalyticsDataSourceMode): void {
    if (this.sourceMode === mode) return;
    this.sourceMode = mode;
    this.refreshSnapshot();
  }

  onGlobalSegmentChange(): void {
    if (this.sourceMode === 'demo_preview') {
      this.sourceMode = 'backend_db';
    }
    this.refreshSnapshot();
  }

  async refreshSnapshot(): Promise<void> {
    this.loading = true;
    this.toastError = '';
    try {
      if (this.sourceMode === 'demo_preview') {
        this.snapshot = this.analytics.buildReferenceDemoSnapshot(this.selectedRange, this.configForm);
        return;
      }

      const dbSnap = await this.analytics.fetchAdminDashboard({
        range: this.selectedRange,
        device: this.deviceFilter,
        role: this.roleFilter,
        includeDiagnostics: this.includeDiagnostics
      });
      this.snapshot = dbSnap;
      if (dbSnap.config) {
        this.configForm = { ...dbSnap.config };
      }
    } catch (err: any) {
      this.toastError =
        err?.error?.message ||
        'No se pudo conectar al endpoint /api/analytics/admin/dashboard. Verifica que el Backend esté ejecutándose.';
      this.snapshot = this.analytics.buildReferenceDemoSnapshot(this.selectedRange, this.configForm);
      this.sourceMode = 'demo_preview';
    } finally {
      this.loading = false;
    }
  }

  async confirmAndReset(scope: AnalyticsResetScope = 'all'): Promise<void> {
    const descriptions: Record<AnalyticsResetScope, { title: string; msg: string; btn: string }> = {
      all: {
        title: '¿Resetear y borrar TODA la analítica?',
        msg: 'Esta acción eliminará permanentemente todos los registros de navegación, embudos, fricción UX y errores QA guardados en MongoDB para empezar desde cero.',
        btn: 'Sí, borrar todo'
      },
      diagnostics: {
        title: '¿Limpiar sondas de prueba?',
        msg: 'Se eliminarán únicamente los eventos generados con los botones de prueba diagnóstica, conservando todos los datos reales de usuarios.',
        btn: 'Limpiar pruebas'
      },
      qa: {
        title: '¿Resetear historial de QA y API?',
        msg: 'Se borrarán todas las excepciones JS/Angular y registros de latencia/errores HTTP acumulados hasta ahora.',
        btn: 'Borrar historial QA'
      },
      ux: {
        title: '¿Resetear incidentes de fricción UX?',
        msg: 'Se eliminarán los contadores de Rage Clicks, Dead Clicks y formularios abandonados (útil después de publicar mejoras de diseño).',
        btn: 'Borrar fricciones UX'
      }
    };

    const meta = descriptions[scope];
    const confirmed = await this.confirmDialog.confirm({
      title: meta.title,
      message: meta.msg,
      confirmText: meta.btn,
      cancelText: 'Cancelar',
      type: 'danger'
    });

    if (!confirmed) return;

    this.resetting = true;
    this.toastError = '';
    try {
      const res = await this.analytics.resetAnalytics(scope);
      this.sourceMode = 'backend_db';
      await this.refreshSnapshot();
      this.showToast(res.message || 'Datos reseteados correctamente.');
    } catch (err: any) {
      this.toastError = err?.error?.message || 'Error al intentar resetear los datos en el servidor.';
    } finally {
      this.resetting = false;
    }
  }

  async saveServerConfig(): Promise<void> {
    this.savingConfig = true;
    this.toastError = '';
    try {
      const res = await this.analytics.updateAdminConfig(this.configForm);
      this.configForm = { ...res.config };
      this.showToast(res.message || 'Configuración actualizada en MongoDB.');
      if (this.sourceMode === 'backend_db') {
        await this.refreshSnapshot();
      }
    } catch (err: any) {
      this.toastError = err?.error?.message || 'Error guardando la configuración en el Backend.';
    } finally {
      this.savingConfig = false;
    }
  }

  async triggerDiagnostic(kind: 'ux_rage' | 'qa_error' | 'funnel_step'): Promise<void> {
    this.toastError = '';
    try {
      await this.analytics.sendDiagnosticProbe(kind);
      this.sourceMode = 'backend_db';
      this.includeDiagnostics = true;
      await this.refreshSnapshot();
      const msgMap = {
        ux_rage: 'Sonda Rage Click guardada en MongoDB correctamente.',
        qa_error: 'Excepción QA de prueba guardada en MongoDB.',
        funnel_step: 'Evento de adopción guardado en MongoDB.'
      };
      this.showToast(msgMap[kind]);
    } catch {
      this.toastError = 'No se pudo enviar la sonda al Backend.';
    }
  }

  get activeFunnel(): FunnelDefinitionReport | null {
    if (!this.snapshot?.funnels?.length) return null;
    return this.snapshot.funnels.find((f) => f.id === this.selectedFunnelId) || this.snapshot.funnels[0];
  }

  get filteredSections(): SectionUsageMetric[] {
    if (!this.snapshot) return [];
    const q = this.sectionSearch.trim().toLowerCase();
    return this.snapshot.sections.filter((s) => {
      const matchGroup = this.sectionGroupFilter === 'ALL' || s.moduleGroup === this.sectionGroupFilter;
      const matchQuery = !q || s.label.toLowerCase().includes(q) || s.route.toLowerCase().includes(q);
      return matchGroup && matchQuery;
    });
  }

  get filteredUxIncidents(): UxFrictionIncident[] {
    if (!this.snapshot) return [];
    if (this.uxFilterType === 'ALL') return this.snapshot.uxIncidents;
    return this.snapshot.uxIncidents.filter((i) => i.type === this.uxFilterType);
  }

  get filteredQaIssues(): QaIssueMetric[] {
    if (!this.snapshot) return [];
    if (this.qaFilterKind === 'ALL') return this.snapshot.qaIssues;
    return this.snapshot.qaIssues.filter((q) => q.kind === this.qaFilterKind);
  }

  get filteredLiveEvents(): TelemetryEventRecord[] {
    const list = this.snapshot?.recentLiveEvents || [];
    if (this.liveEventFilter === 'ALL') return list;
    if (this.liveEventFilter === 'UX') {
      return list.filter((e) => ['ux_rage_click', 'ux_dead_click', 'ux_form_abandoned'].includes(e.event));
    }
    if (this.liveEventFilter === 'QA') {
      return list.filter((e) => ['qa_runtime_error', 'qa_api_error', 'qa_slow_api', 'qa_layout_shift', 'qa_slow_lcp'].includes(e.event));
    }
    return list.filter((e) => ['pageview', 'pageleave', 'feature_used', 'section_tab', 'ux_form_submitted'].includes(e.event));
  }

  get isDatabaseEmptyInPeriod(): boolean {
    if (!this.snapshot || this.sourceMode !== 'backend_db') return false;
    return (
      this.snapshot.kpis.totalPageviews === 0 &&
      this.snapshot.kpis.uxFrictionCount === 0 &&
      this.snapshot.kpis.qaErrorsCount === 0 &&
      this.snapshot.recentLiveEvents.length === 0
    );
  }

  exportRoadmapReportCsv(): void {
    if (!this.snapshot) return;
    const rows: string[][] = [
      ['Categoria', 'Prioridad / Estado', 'Ruta / Elemento', 'Evidencia / Metricas', 'Accion Recomendada']
    ];

    for (const ins of this.snapshot.insights) {
      rows.push(['Roadmap Actualizacion', ins.priority, ins.affectedRoute, `${ins.title} — ${ins.evidence}`, ins.suggestedAction]);
    }
    for (const sec of this.snapshot.sections) {
      rows.push([
        'Seccion',
        sec.adoptionStatus,
        `${sec.label} (${sec.route})`,
        `Vistas: ${sec.views} | Usuarios: ${sec.uniqueUsers} | Estancia: ${sec.avgDwellSec}s | Fuga: ${sec.exitRatePct}%`,
        sec.adoptionStatus === 'Alta Fuga' ? 'Revisar friccion UX y carga' : 'Monitorear'
      ]);
    }
    for (const ux of this.snapshot.uxIncidents) {
      rows.push(['Friccion UX', ux.severity.toUpperCase(), `${ux.route} -> ${ux.targetLabel}`, `${ux.type}: ${ux.occurrences}x`, ux.diagnosis]);
    }
    for (const qa of this.snapshot.qaIssues) {
      rows.push(['QA / API', qa.severity.toUpperCase(), qa.routeOrEndpoint, `${qa.title} (${qa.occurrences}x)`, qa.lastBreadcrumb]);
    }

    const csvContent =
      '\uFEFF' +
      rows.map((r) => r.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');

    this.downloadBlob(csvContent, `velisse-analitica-sprint-${this.selectedRange}.csv`, 'text/csv;charset=utf-8;');
    this.showToast('Reporte CSV descargado.');
  }

  exportSnapshotJson(): void {
    if (!this.snapshot) return;
    const json = JSON.stringify(this.snapshot, null, 2);
    this.downloadBlob(json, `velisse-analitica-${this.selectedRange}.json`, 'application/json');
    this.showToast('Snapshot JSON exportado.');
  }

  formatDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return '0s';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const rem = Math.round(seconds % 60);
    return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`;
  }

  formatStorageSize(kb: number): string {
    if (!kb || kb <= 0) return '0 KB';
    if (kb < 1024) return `${kb} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  }

  formatRelativeDate(iso?: string | null): string {
    if (!iso) return 'Nunca';
    const ts = new Date(iso).getTime();
    if (Number.isNaN(ts)) return String(iso);
    const diffSec = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (diffSec < 60) return `Hace ${diffSec}s`;
    if (diffSec < 3600) return `Hace ${Math.floor(diffSec / 60)} min`;
    if (diffSec < 86400) return `Hace ${Math.floor(diffSec / 3600)} h`;
    return new Date(ts).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  formatRoleLabel(role: string): string {
    const map: Record<string, string> = {
      guest: 'Invitados Públicos',
      client: 'Clientes (Anfitriones)',
      organizer: 'Organizadores / Planners',
      venue_owner: 'Salones / Venues',
      vendor: 'Proveedores',
      admin: 'Administradores'
    };
    return map[role] || role;
  }

  formatEventBadgeClass(evName: string): string {
    if (['qa_runtime_error', 'qa_api_error'].includes(evName)) return 'danger';
    if (['ux_rage_click', 'ux_dead_click', 'ux_form_abandoned', 'qa_slow_api', 'qa_layout_shift', 'qa_slow_lcp'].includes(evName)) return 'warning';
    if (['feature_used', 'ux_form_submitted'].includes(evName)) return 'success';
    return 'info';
  }

  formatUxTypeLabel(type: UxFrictionIncident['type']): string {
    if (type === 'rage_click') return 'Rage Click (Frustración)';
    if (type === 'dead_click') return 'Dead Click (Sin Acción)';
    return 'Formulario Abandonado';
  }

  formatQaKindLabel(kind: QaIssueMetric['kind']): string {
    if (kind === 'runtime_exception') return 'Excepción JS/Angular';
    if (kind === 'http_error') return 'Error API HTTP';
    if (kind === 'slow_endpoint') return 'API Lenta';
    return 'Rendimiento / CLS';
  }

  priorityBadgeClass(priority: ActionableRoadmapInsight['priority']): string {
    if (priority.startsWith('P0')) return 'danger';
    if (priority.startsWith('P1')) return 'warning';
    return 'info';
  }

  adoptionBadgeClass(status: SectionUsageMetric['adoptionStatus']): string {
    if (status === 'Estrella') return 'accent';
    if (status === 'Saludable') return 'success';
    if (status === 'Alta Fuga') return 'danger';
    return 'warning';
  }

  getTrendPolyline(metric: 'sessions' | 'conversions' | 'frictions'): string {
    const pts = this.snapshot?.dailyTrend || [];
    if (!pts.length) return '';
    const width = 640;
    const height = 170;
    const padX = 28;
    const padY = 20;

    const maxVal = Math.max(10, ...pts.map((p) => Math.max(p.sessions, p.conversions, p.frictions * 4)));

    return pts
      .map((p, idx) => {
        const x = pts.length === 1 ? width / 2 : padX + (idx / (pts.length - 1)) * (width - padX * 2);
        const raw = metric === 'frictions' ? p.frictions * 4 : p[metric];
        const y = height - padY - (raw / maxVal) * (height - padY * 2);
        return `${Math.round(x)},${Math.round(y)}`;
      })
      .join(' ');
  }

  getTrendPointCoords(metric: 'sessions' | 'conversions' | 'frictions'): Array<{ x: number; y: number; val: number; label: string }> {
    const pts = this.snapshot?.dailyTrend || [];
    if (!pts.length) return [];
    const width = 640;
    const height = 170;
    const padX = 28;
    const padY = 20;
    const maxVal = Math.max(10, ...pts.map((p) => Math.max(p.sessions, p.conversions, p.frictions * 4)));

    return pts.map((p, idx) => {
      const x = pts.length === 1 ? width / 2 : padX + (idx / (pts.length - 1)) * (width - padX * 2);
      const scaled = metric === 'frictions' ? p.frictions * 4 : p[metric];
      const y = height - padY - (scaled / maxVal) * (height - padY * 2);
      return {
        x: Math.round(x),
        y: Math.round(y),
        val: p[metric],
        label: p.label
      };
    });
  }

  private showToast(msg: string): void {
    this.toastMessage = msg;
    setTimeout(() => {
      if (this.toastMessage === msg) {
        this.toastMessage = '';
      }
    }, 4000);
  }

  private downloadBlob(content: string, filename: string, mime: string): void {
    if (typeof document === 'undefined') return;
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
