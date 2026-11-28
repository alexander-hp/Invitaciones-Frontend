import { Injectable, NgZone } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export type AnalyticsDateRange = '24h' | '7d' | '30d' | '90d';
export type AnalyticsDataSourceMode = 'backend_db' | 'demo_preview';
export type AnalyticsResetScope = 'all' | 'diagnostics' | 'qa' | 'ux';

export interface TrackerServerConfig {
  captureEnabled: boolean;
  trackAdminUsers: boolean;
  captureApiHealthSample: boolean;
  retentionDays: number;
  slowApiThresholdMs: number;
  lastResetAt: string | null;
  lastResetBy: string | null;
}

export interface StorageStatsSummary {
  totalStoredEvents: number;
  estimatedSizeKb: number;
  oldestEventAt: string | null;
  retentionDays: number;
  lastResetAt: string | null;
  lastResetBy: string | null;
}

export interface TelemetryEventRecord {
  _id?: string;
  event: string;
  sessionId: string;
  distinctId: string;
  userRole: string;
  route: string;
  rawPath?: string;
  routeLabel: string;
  moduleGroup?: string;
  sectionTab?: string;
  pageSection?: string;
  deviceType: 'Web Desktop' | 'Web Móvil' | 'Android App';
  browser: string;
  os?: string;
  viewport?: string;
  dwellSeconds?: number | null;
  maxScrollPct?: number | null;
  routeLoadMs?: number | null;
  exitReason?: string;
  targetLabel?: string;
  selector?: string;
  featureKey?: string;
  featureCategory?: string;
  formName?: string;
  fieldsTouched?: number | null;
  endpoint?: string;
  httpMethod?: string;
  statusCode?: number | null;
  durationMs?: number | null;
  errorMessage?: string;
  stackTop?: string;
  lastBreadcrumb?: string;
  isDiagnostic?: boolean;
  occurredAt: string;
}

export interface AnalyticsOverviewKpis {
  activeUsers: number;
  totalSessions: number;
  totalPageviews: number;
  avgDwellSeconds: number;
  globalConversionRate: number;
  uxFrictionCount: number;
  rageClicksCount: number;
  deadClicksCount: number;
  abandonedFormsCount: number;
  qaErrorsCount: number;
  apiErrorRate: number;
  avgApiLatencyMs: number;
}

export interface DailyTrendPoint {
  label: string;
  dateIso: string;
  sessions: number;
  conversions: number;
  frictions: number;
  errors: number;
}

export interface FunnelStepMetric {
  stepNumber: number;
  key: string;
  label: string;
  routeHint: string;
  users: number;
  conversionFromStart: number;
  conversionFromPrev: number;
  dropOffRate: number;
  dropOffUsers: number;
  avgTimeSec: number;
}

export interface FunnelDefinitionReport {
  id: 'creator_journey' | 'guest_rsvp' | 'event_operations';
  title: string;
  subtitle: string;
  totalCompletionRate: number;
  biggestDropStep: string;
  steps: FunnelStepMetric[];
}

export interface SectionUsageMetric {
  route: string;
  label: string;
  moduleGroup: 'Captación' | 'Gestión Evento' | 'Diseño Invitación' | 'Experiencia Invitado' | 'Operación Staff' | 'Cuenta / Admin';
  views: number;
  uniqueUsers: number;
  avgDwellSec: number;
  avgScrollPct: number;
  avgLoadMs?: number;
  exits?: number;
  exitRatePct: number;
  frictionEvents: number;
  adoptionStatus: 'Estrella' | 'Saludable' | 'Subutilizada' | 'Alta Fuga';
}

export interface SubTabUsageMetric {
  route: string;
  routeLabel: string;
  tabName: string;
  opens: number;
  uniqueUsers: number;
}

export interface FeatureAdoptionMetric {
  featureKey: string;
  label: string;
  category: string;
  uses: number;
  uniqueUsers: number;
  adoptionPct: number;
  recommendation: string;
}

export interface UxFrictionIncident {
  id: string;
  type: 'rage_click' | 'dead_click' | 'form_abandon';
  route: string;
  routeLabel: string;
  pageSection?: string;
  targetLabel: string;
  selector: string;
  occurrences: number;
  affectedUsers: number;
  deviceSplit: string;
  lastSeen: string;
  severity: 'alta' | 'media' | 'baja';
  diagnosis: string;
}

export interface FormAbandonmentMetric {
  formName: string;
  route: string;
  starts: number;
  abandoned: number;
  submitted?: number;
  abandonRatePct: number;
  lastTouchedField: string;
  avgTimeBeforeExitSec: number;
}

export interface DeviceExperienceMetric {
  device: string;
  sessions: number;
  sharePct: number;
  avgLoadMs: number;
  frictionRatePct: number;
  errorRatePct: number;
  conversionPct: number;
}

export interface RoleBreakdownMetric {
  role: string;
  users: number;
  sessions: number;
  events: number;
}

export interface QaIssueMetric {
  id: string;
  kind: 'runtime_exception' | 'http_error' | 'slow_endpoint' | 'layout_shift';
  title: string;
  routeOrEndpoint: string;
  pageLabel?: string;
  pageSection?: string;
  occurrences: number;
  affectedUsers: number;
  statusOrCode: string;
  browserDevice: string;
  lastBreadcrumb: string;
  stackTop?: string;
  lastSeen: string;
  severity: 'critica' | 'alta' | 'media';
}

export interface ApiEndpointHealthMetric {
  endpoint: string;
  method: string;
  calls: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  failures: number;
  errorRatePct: number;
}

export interface ActionableRoadmapInsight {
  id: string;
  area: 'UX / Diseño' | 'Producto / Conversión' | 'QA / Estabilidad' | 'Rendimiento';
  priority: 'P0 Urgente' | 'P1 Alta' | 'P2 Mejora';
  title: string;
  pageLabel?: string;
  pageSection?: string;
  evidence: string;
  suggestedAction: string;
  affectedRoute: string;
}

export interface AdminAnalyticsSnapshot {
  generatedAt: string;
  sourceMode: AnalyticsDataSourceMode;
  range: AnalyticsDateRange;
  storageStats: StorageStatsSummary;
  config: TrackerServerConfig;
  kpis: AnalyticsOverviewKpis;
  dailyTrend: DailyTrendPoint[];
  funnels: FunnelDefinitionReport[];
  sections: SectionUsageMetric[];
  exitRoutes: SectionUsageMetric[];
  subTabsUsage: SubTabUsageMetric[];
  features: FeatureAdoptionMetric[];
  uxIncidents: UxFrictionIncident[];
  formAbandonments: FormAbandonmentMetric[];
  devices: DeviceExperienceMetric[];
  rolesBreakdown: RoleBreakdownMetric[];
  qaIssues: QaIssueMetric[];
  apiHealth: ApiEndpointHealthMetric[];
  insights: ActionableRoadmapInsight[];
  recentLiveEvents: TelemetryEventRecord[];
}

const ANON_ID_KEY = 'velisse_anon_distinct_id_v1';
const SESSION_ID_KEY = 'velisse_session_id_v1';
const SESSION_TS_KEY = 'velisse_session_last_ts_v1';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

const ROUTE_CATALOG: Array<{ pattern: RegExp; normalized: string; label: string; group: SectionUsageMetric['moduleGroup'] }> = [
  { pattern: /^\/($|new\/landing|landing|inicio)/i, normalized: '/', label: 'Landing Principal', group: 'Captación' },
  { pattern: /^\/new\/demo\/visual-editor/i, normalized: '/new/demo/visual-editor', label: 'Demo Editor Visual (Público)', group: 'Captación' },
  { pattern: /^\/(new\/)?login/i, normalized: '/new/login', label: 'Inicio de Sesión', group: 'Captación' },
  { pattern: /^\/(new\/)?register/i, normalized: '/new/register', label: 'Registro de Cuenta', group: 'Captación' },
  { pattern: /^\/(new\/)?password-reset/i, normalized: '/new/password-reset', label: 'Recuperación de Contraseña', group: 'Captación' },
  { pattern: /^\/(new\/)?dashboard/i, normalized: '/new/dashboard', label: 'Dashboard General', group: 'Gestión Evento' },
  { pattern: /^\/new\/events\/[^/]+\/seating/i, normalized: '/new/events/:id/seating', label: 'Croquis y Asignación de Mesas', group: 'Gestión Evento' },
  { pattern: /^\/(new\/)?events\/[^/?#]+/i, normalized: '/new/events/:id', label: 'Detalle Operativo del Evento', group: 'Gestión Evento' },
  { pattern: /^\/(new\/)?events($|\?)/i, normalized: '/new/events', label: 'Mis Eventos (Listado y Creación)', group: 'Gestión Evento' },
  { pattern: /^\/new\/invitations\/[^/]+\/visual-editor/i, normalized: '/new/invitations/:id/visual-editor', label: 'Editor Visual 3 en 1 (Lienzo)', group: 'Diseño Invitación' },
  { pattern: /^\/new\/invitations\/[^/]+\/pass-editor/i, normalized: '/new/invitations/:id/pass-editor', label: 'Editor de Pases VIP', group: 'Diseño Invitación' },
  { pattern: /^\/new\/invitations\/[^/]+\/sections/i, normalized: '/new/invitations/:id/sections', label: 'Configurador de Secciones', group: 'Diseño Invitación' },
  { pattern: /^\/(new\/)?invitations\/[^/]+\/editor/i, normalized: '/new/invitations/:id/editor', label: 'Editor Estructurado de Invitación', group: 'Diseño Invitación' },
  { pattern: /^\/(new\/)?i\/[^/]+\/my-activity/i, normalized: '/new/i/:slug/my-activity', label: 'Actividad del Invitado', group: 'Experiencia Invitado' },
  { pattern: /^\/(new\/)?(i|v)\/[^/?#]+/i, normalized: '/new/i/:slug', label: 'Invitación Pública (Vista Invitado)', group: 'Experiencia Invitado' },
  { pattern: /^\/(new\/)?e\/[^/?#]+/i, normalized: '/new/e/:portalSlug', label: 'Portal Externo de Evento', group: 'Experiencia Invitado' },
  { pattern: /^\/(new\/)?check-in\/[^/?#]+/i, normalized: '/new/check-in/:token', label: 'Escáner QR Check-in (Staff)', group: 'Operación Staff' },
  { pattern: /^\/(new\/)?(external-access|dj)/i, normalized: '/new/external-access/:token', label: 'Acceso Staff / DJ / Fotógrafo', group: 'Operación Staff' },
  { pattern: /^\/new\/mesa/i, normalized: '/new/mesa', label: 'Vista QR de Mesa', group: 'Experiencia Invitado' },
  { pattern: /^\/new\/plan/i, normalized: '/new/plan', label: 'Planes y Suscripción', group: 'Cuenta / Admin' },
  { pattern: /^\/(new\/)?contact/i, normalized: '/new/contact', label: 'Soporte y Contacto', group: 'Cuenta / Admin' },
  { pattern: /^\/new\/guia/i, normalized: '/new/guia', label: 'Guía de Usuario', group: 'Cuenta / Admin' },
  { pattern: /^\/new\/template-management/i, normalized: '/new/template-management', label: 'Admin: Moderación Plantillas', group: 'Cuenta / Admin' },
  { pattern: /^\/new\/admin\/analytics/i, normalized: '/new/admin/analytics', label: 'Admin: Centro Analítica UX & QA', group: 'Cuenta / Admin' }
];

@Injectable({ providedIn: 'root' })
export class AnalyticsTrackerService {
  private initialized = false;
  private pendingQueue: Array<Record<string, any>> = [];
  private flushTimer?: ReturnType<typeof setInterval>;
  private flushing = false;

  private runtimeConfig = {
    captureEnabled: true,
    trackAdminUsers: false,
    captureApiHealthSample: true,
    slowApiThresholdMs: 1500
  };

  private currentRouteRaw = '/';
  private currentRouteNormalized = '/';
  private currentRouteLabel = 'Landing Principal';
  private currentModuleGroup: SectionUsageMetric['moduleGroup'] = 'Captación';
  private currentSectionTab = '';
  private activeVisibleMs = 0;
  private lastVisibilityResumeAt = Date.now();
  private maxScrollPct = 0;
  private navStartTimestamp = 0;
  private lastHttpActivityAt = 0;
  private lastBreadcrumb = 'Inicio de navegación';

  private recentClicks: Array<{ ts: number; x: number; y: number; selector: string }> = [];
  private activeFormDraft: {
    formName: string;
    route: string;
    lastField: string;
    touchedFields: Set<string>;
    startedAt: number;
    submitted: boolean;
  } | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private auth: AuthService,
    private ngZone: NgZone
  ) {}

  initialize(): void {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    this.syncPublicConfig();
    this.bindRouterTelemetry();

    this.ngZone.runOutsideAngular(() => {
      this.bindDomUxDetectors();
      this.bindPerformanceObservers();
      this.flushTimer = setInterval(() => {
        this.flushNow();
      }, 6000);
    });
  }

  private syncPublicConfig(): void {
    this.http
      .get<{ config: Partial<TrackerServerConfig> }>(`${environment.apiUrl}/analytics/public-config`)
      .subscribe({
        next: (res) => {
          if (res?.config) {
            this.runtimeConfig = {
              captureEnabled: res.config.captureEnabled ?? this.runtimeConfig.captureEnabled,
              trackAdminUsers: res.config.trackAdminUsers ?? this.runtimeConfig.trackAdminUsers,
              captureApiHealthSample: res.config.captureApiHealthSample ?? this.runtimeConfig.captureApiHealthSample,
              slowApiThresholdMs: res.config.slowApiThresholdMs ?? this.runtimeConfig.slowApiThresholdMs
            };
          }
        },
        error: () => {}
      });
  }

  private bindRouterTelemetry(): void {
    this.currentRouteRaw = this.router.url || '/';
    const initialMeta = this.resolveRouteMeta(this.currentRouteRaw);
    this.currentRouteNormalized = initialMeta.normalized;
    this.currentRouteLabel = initialMeta.label;
    this.currentModuleGroup = initialMeta.group;
    this.currentSectionTab = this.extractTabFromUrl(this.currentRouteRaw);
    this.lastVisibilityResumeAt = Date.now();
    this.maxScrollPct = this.computeScrollPercent();

    setTimeout(() => {
      this.enqueueEvent('pageview', {
        route: this.currentRouteNormalized,
        rawPath: this.sanitizeRawPath(this.currentRouteRaw),
        routeLabel: this.currentRouteLabel,
        moduleGroup: this.currentModuleGroup,
        sectionTab: this.currentSectionTab
      });
    }, 200);

    this.router.events.subscribe((ev) => {
      if (ev instanceof NavigationStart) {
        this.navStartTimestamp = typeof performance !== 'undefined' ? performance.now() : Date.now();
        this.flushPageLeaveAndFormCheck('route_change');
      } else if (ev instanceof NavigationEnd) {
        const url = ev.urlAfterRedirects || ev.url || '/';
        const meta = this.resolveRouteMeta(url);
        const nowPerf = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const loadMs = this.navStartTimestamp > 0 ? Math.max(1, Math.round(nowPerf - this.navStartTimestamp)) : 0;

        this.currentRouteRaw = url;
        this.currentRouteNormalized = meta.normalized;
        this.currentRouteLabel = meta.label;
        this.currentModuleGroup = meta.group;
        this.currentSectionTab = this.extractTabFromUrl(url);
        this.activeVisibleMs = 0;
        this.lastVisibilityResumeAt = Date.now();
        this.maxScrollPct = this.computeScrollPercent();
        this.lastBreadcrumb = `Navegó a ${meta.label} (${meta.normalized})`;

        this.enqueueEvent('pageview', {
          route: meta.normalized,
          rawPath: this.sanitizeRawPath(url),
          routeLabel: meta.label,
          moduleGroup: meta.group,
          sectionTab: this.currentSectionTab,
          routeLoadMs: loadMs
        });
      }
    });
  }

  private flushPageLeaveAndFormCheck(reason: 'route_change' | 'page_unload'): void {
    const now = Date.now();
    if (typeof document !== 'undefined' && !document.hidden) {
      this.activeVisibleMs += Math.max(0, now - this.lastVisibilityResumeAt);
    }
    this.lastVisibilityResumeAt = now;
    const dwellSeconds = Math.max(1, Math.round(this.activeVisibleMs / 1000));

    if (this.activeFormDraft && !this.activeFormDraft.submitted && this.activeFormDraft.touchedFields.size > 0) {
      const formDurationSec = Math.max(1, Math.round((now - this.activeFormDraft.startedAt) / 1000));
      this.enqueueEvent('ux_form_abandoned', {
        route: this.activeFormDraft.route,
        routeLabel: this.currentRouteLabel,
        pageSection: this.activeFormDraft.formName,
        formName: this.activeFormDraft.formName,
        targetLabel: this.activeFormDraft.lastField,
        fieldsTouched: this.activeFormDraft.touchedFields.size,
        dwellSeconds: formDurationSec,
        exitReason: reason
      });
    }
    this.activeFormDraft = null;

    if (this.currentRouteNormalized !== '/new/admin/analytics') {
      this.enqueueEvent('pageleave', {
        route: this.currentRouteNormalized,
        routeLabel: this.currentRouteLabel,
        moduleGroup: this.currentModuleGroup,
        sectionTab: this.currentSectionTab,
        dwellSeconds,
        maxScrollPct: this.maxScrollPct,
        exitReason: reason
      });
    }
  }

  private bindDomUxDetectors(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      const now = Date.now();
      if (document.hidden) {
        this.activeVisibleMs += Math.max(0, now - this.lastVisibilityResumeAt);
        this.flushKeepalive();
      } else {
        this.lastVisibilityResumeAt = now;
      }
    });

    window.addEventListener('pagehide', () => {
      this.flushPageLeaveAndFormCheck('page_unload');
      this.flushKeepalive();
    });

    window.addEventListener(
      'scroll',
      () => {
        const pct = this.computeScrollPercent();
        if (pct > this.maxScrollPct) {
          this.maxScrollPct = pct;
        }
      },
      { passive: true }
    );

    // Detección de abandono de formularios (solo etiqueta del campo, jamás el contenido privado)
    document.addEventListener(
      'input',
      (event: Event) => {
        const target = event.target as HTMLElement | null;
        if (!target || !['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
        if (this.currentRouteNormalized === '/new/admin/analytics') return;

        const fieldLabel = this.describeFormField(target);
        const formName = this.describeFormContainer(target);

        if (!this.activeFormDraft || this.activeFormDraft.formName !== formName) {
          this.activeFormDraft = {
            formName,
            route: this.currentRouteNormalized,
            lastField: fieldLabel,
            touchedFields: new Set([fieldLabel]),
            startedAt: Date.now(),
            submitted: false
          };
        } else {
          this.activeFormDraft.lastField = fieldLabel;
          this.activeFormDraft.touchedFields.add(fieldLabel);
        }
      },
      { capture: true, passive: true }
    );

    document.addEventListener(
      'submit',
      () => {
        if (this.activeFormDraft) {
          this.activeFormDraft.submitted = true;
          this.enqueueEvent('ux_form_submitted', {
            route: this.currentRouteNormalized,
            routeLabel: this.currentRouteLabel,
            formName: this.activeFormDraft.formName,
            fieldsTouched: this.activeFormDraft.touchedFields.size
          });
          this.activeFormDraft = null;
        }
      },
      { capture: true }
    );

    document.addEventListener(
      'click',
      (event: MouseEvent) => {
        const rawTarget = event.target as HTMLElement | null;
        if (!rawTarget) return;
        if (this.currentRouteNormalized === '/new/admin/analytics' && !rawTarget.closest('[data-analytics-probe="true"]')) {
          return;
        }

        const actionable =
          (rawTarget.closest('button, a, [role="button"], .nw-tab, .source-nav-card, input[type="submit"]') as HTMLElement | null) ||
          rawTarget;
        const selector = this.buildSelector(actionable);
        const label = this.extractReadableLabel(actionable);
        const pageSection = this.extractPageSection(actionable);
        const now = Date.now();

        this.lastBreadcrumb = `Clic en "${label}" (${this.currentRouteLabel} · ${pageSection})`;

        if (this.activeFormDraft && actionable.matches('button, [role="button"], input[type="submit"]')) {
          const lower = label.toLowerCase();
          if (/(guardar|crear|registrar|iniciar|enviar|confirmar|publicar|actualizar|importar)/.test(lower)) {
            this.activeFormDraft.submitted = true;
            this.enqueueEvent('ux_form_submitted', {
              route: this.currentRouteNormalized,
              routeLabel: this.currentRouteLabel,
              formName: this.activeFormDraft.formName,
              fieldsTouched: this.activeFormDraft.touchedFields.size
            });
            this.activeFormDraft = null;
          }
        }

        // Seguimiento de sub-pestañas internas (ej. Invitados, Mesas, Estilo, Itinerario)
        if (actionable.classList.contains('nw-tab') || actionable.classList.contains('source-nav-card')) {
          this.currentSectionTab = label;
          this.enqueueEvent('section_tab', {
            route: this.currentRouteNormalized,
            routeLabel: this.currentRouteLabel,
            sectionTab: label,
            targetLabel: label
          });
        }

        const matchedFeature = this.detectProductFeature(label, this.currentRouteNormalized);
        if (matchedFeature) {
          this.enqueueEvent('feature_used', {
            route: this.currentRouteNormalized,
            routeLabel: this.currentRouteLabel,
            featureKey: matchedFeature.key,
            featureCategory: matchedFeature.category,
            targetLabel: matchedFeature.label
          });
        }

        // 1) Rage Click Detector (ignora selección normal de texto con doble/triple clic en párrafos estáticos)
        const selectedText = typeof window.getSelection === 'function' ? (window.getSelection()?.toString() || '').trim() : '';
        const isSemanticInteractive = actionable.matches('button, a, [role="button"], .nw-tab, .source-nav-card, input, select');
        const hasPointerCursor = typeof window !== 'undefined' && window.getComputedStyle(rawTarget).cursor === 'pointer';

        if (selectedText.length > 0 && !isSemanticInteractive && !hasPointerCursor) {
          return;
        }

        this.recentClicks = this.recentClicks.filter((c) => now - c.ts <= 950);
        this.recentClicks.push({ ts: now, x: event.clientX, y: event.clientY, selector });
        const nearby = this.recentClicks.filter((c) => Math.hypot(c.x - event.clientX, c.y - event.clientY) <= 45);
        if (nearby.length >= 3) {
          this.recentClicks = [];
          this.enqueueEvent('ux_rage_click', {
            route: this.currentRouteNormalized,
            routeLabel: this.currentRouteLabel,
            pageSection,
            targetLabel: label,
            selector
          });
          return;
        }

        // 2) Dead Click Detector
        this.evaluatePotentialDeadClick(rawTarget, actionable, label, selector, pageSection, now);
      },
      { capture: true }
    );
  }

  private evaluatePotentialDeadClick(
    rawTarget: HTMLElement,
    actionable: HTMLElement,
    label: string,
    selector: string,
    pageSection: string,
    clickTs: number
  ): void {
    const tag = actionable.tagName;
    if (['INPUT', 'SELECT', 'TEXTAREA', 'LABEL', 'SUMMARY', 'OPTION'].includes(tag)) return;
    if (actionable.closest('.nw-modal-close, .nw-toast-close, [aria-expanded]')) return;

    const computedCursor = typeof window !== 'undefined' ? window.getComputedStyle(rawTarget).cursor : '';
    const isDisabledControl =
      (actionable as HTMLButtonElement).disabled ||
      actionable.getAttribute('aria-disabled') === 'true' ||
      actionable.classList.contains('disabled');

    if (isDisabledControl) {
      this.enqueueEvent('ux_dead_click', {
        route: this.currentRouteNormalized,
        routeLabel: this.currentRouteLabel,
        pageSection,
        targetLabel: label,
        selector
      });
      return;
    }

    const looksClickableNonSemantic =
      !['BUTTON', 'A'].includes(tag) &&
      (computedCursor === 'pointer' || Boolean(rawTarget.closest('.nw-pill, .nw-metric, .card-icon-badge')));

    if (!looksClickableNonSemantic) return;

    const urlBefore = this.router.url;
    const modalCountBefore = document.querySelectorAll('.nw-modal-backdrop, [role="dialog"]').length;

    setTimeout(() => {
      const urlAfter = this.router.url;
      const modalCountAfter = document.querySelectorAll('.nw-modal-backdrop, [role="dialog"]').length;
      const hadHttpSinceClick = this.lastHttpActivityAt >= clickTs;

      if (urlBefore === urlAfter && modalCountBefore === modalCountAfter && !hadHttpSinceClick) {
        this.enqueueEvent('ux_dead_click', {
          route: this.currentRouteNormalized,
          routeLabel: this.currentRouteLabel,
          pageSection,
          targetLabel: label,
          selector
        });
      }
    }, 420);
  }

  private bindPerformanceObservers(): void {
    if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return;
    let wasHiddenBeforeLoad = typeof document !== 'undefined' ? document.hidden : false;
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) wasHiddenBeforeLoad = true;
      }, { once: true });
    }

    try {
      let clsTotal = 0;
      let clsReported = false;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          if (!entry.hadRecentInput && typeof entry.value === 'number') {
            clsTotal += entry.value;
          }
        }
        if (clsTotal >= 0.22 && !clsReported) {
          clsReported = true;
          this.enqueueEvent('qa_layout_shift', {
            route: this.currentRouteNormalized,
            routeLabel: this.currentRouteLabel,
            pageSection: this.currentSectionTab || 'Carga de vista',
            errorMessage: `Salto visual detectado (CLS ${clsTotal.toFixed(3)})`,
            lastBreadcrumb: this.lastBreadcrumb
          });
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true } as any);
    } catch {}

    try {
      const lcpObserver = new PerformanceObserver((list) => {
        if (wasHiddenBeforeLoad) return;
        const entries = list.getEntries();
        const last = entries[entries.length - 1] as any;
        // Ignorar valores inflados (>25s) causados por pestañas abiertas en segundo plano
        if (last && last.startTime > 3500 && last.startTime <= 25000) {
          this.enqueueEvent('qa_slow_lcp', {
            route: this.currentRouteNormalized,
            routeLabel: this.currentRouteLabel,
            pageSection: 'Renderizado inicial',
            durationMs: Math.round(last.startTime),
            errorMessage: `Renderizado inicial lento (LCP ${Math.round(last.startTime)} ms)`,
            lastBreadcrumb: this.lastBreadcrumb
          });
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true } as any);
    } catch {}
  }

  recordRuntimeError(error: unknown): void {
    const rawMsg =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : typeof error === 'string'
        ? error
        : 'Excepción no controlada en cliente';
    const topFrame =
      error instanceof Error && error.stack
        ? (error.stack.split('\n')[1] || '').trim().slice(0, 180)
        : '';

    this.enqueueEvent('qa_runtime_error', {
      route: this.currentRouteNormalized,
      routeLabel: this.currentRouteLabel,
      errorMessage: rawMsg.slice(0, 240),
      stackTop: topFrame,
      lastBreadcrumb: this.lastBreadcrumb
    });
  }

  recordHttpTelemetry(params: {
    method: string;
    url: string;
    status: number;
    durationMs: number;
    ok: boolean;
  }): void {
    if (/\/analytics\//i.test(params.url)) return;

    this.lastHttpActivityAt = Date.now();
    const normalizedEndpoint = this.normalizeApiEndpoint(params.url);
    const slowThreshold = this.runtimeConfig.slowApiThresholdMs || 1500;

    if (!params.ok || params.status === 0 || params.status >= 400) {
      this.enqueueEvent('qa_api_error', {
        route: this.currentRouteNormalized,
        routeLabel: this.currentRouteLabel,
        endpoint: normalizedEndpoint,
        httpMethod: params.method,
        statusCode: params.status,
        durationMs: params.durationMs,
        lastBreadcrumb: this.lastBreadcrumb
      });
    } else if (params.durationMs >= slowThreshold) {
      this.enqueueEvent('qa_slow_api', {
        route: this.currentRouteNormalized,
        routeLabel: this.currentRouteLabel,
        endpoint: normalizedEndpoint,
        httpMethod: params.method,
        statusCode: params.status,
        durationMs: params.durationMs,
        lastBreadcrumb: this.lastBreadcrumb
      });
    } else if (this.runtimeConfig.captureApiHealthSample) {
      this.enqueueEvent('qa_api_ok', {
        route: this.currentRouteNormalized,
        routeLabel: this.currentRouteLabel,
        endpoint: normalizedEndpoint,
        httpMethod: params.method,
        statusCode: params.status,
        durationMs: params.durationMs
      });
    }
  }

  async sendDiagnosticProbe(kind: 'ux_rage' | 'qa_error' | 'funnel_step'): Promise<void> {
    if (kind === 'ux_rage') {
      this.enqueueEvent('ux_rage_click', {
        route: '/new/admin/analytics',
        routeLabel: 'Admin: Prueba Diagnóstica UX',
        targetLabel: 'Botón Sonda Rage Click',
        selector: 'button[data-analytics-probe="ux_rage"]',
        isDiagnostic: true
      });
    } else if (kind === 'qa_error') {
      this.enqueueEvent('qa_runtime_error', {
        route: '/new/admin/analytics',
        routeLabel: 'Admin: Prueba Diagnóstica QA',
        errorMessage: 'DiagnosticProbeError: Excepción controlada para validar guardado en MongoDB',
        stackTop: 'at NewAdminAnalyticsComponent.triggerDiagnostic',
        lastBreadcrumb: 'Ejecución manual de sonda QA desde Admin',
        isDiagnostic: true
      });
    } else {
      this.enqueueEvent('feature_used', {
        route: '/new/admin/analytics',
        routeLabel: 'Admin: Verificación BD',
        featureKey: 'diagnostic_probe',
        featureCategory: 'Verificación QA',
        targetLabel: 'Sonda de Verificación en Base de Datos',
        isDiagnostic: true
      });
    }
    await this.flushNow();
  }

  private enqueueEvent(eventName: string, fields: Record<string, any>): void {
    if (!this.runtimeConfig.captureEnabled && !fields['isDiagnostic']) return;

    const user = this.auth.currentUser;
    if (user?.role === 'admin' && !this.runtimeConfig.trackAdminUsers && !fields['isDiagnostic']) {
      return;
    }

    const eventDoc = {
      event: eventName,
      timestamp: new Date().toISOString(),
      sessionId: this.getOrCreateSessionId(),
      distinctId: String(user?._id || user?.id || this.getOrCreateAnonId()),
      userId: user?._id || user?.id || null,
      userRole: user?.role || 'guest',
      deviceType: this.detectDeviceType(),
      browser: this.detectBrowserName(),
      os: this.detectOsName(),
      viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '',
      ...fields
    };

    this.pendingQueue.push(eventDoc);
    if (this.pendingQueue.length >= 15) {
      this.flushNow();
    }
  }

  async flushNow(): Promise<void> {
    if (this.flushing || this.pendingQueue.length === 0) return;
    this.flushing = true;
    const batch = this.pendingQueue.splice(0, 50);

    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/analytics/ingest`, { events: batch })
      );
    } catch {
      // Si hay pérdida momentánea de red, reencolar hasta máximo 100 eventos
      if (this.pendingQueue.length < 100) {
        this.pendingQueue.unshift(...batch);
      }
    } finally {
      this.flushing = false;
    }
  }

  private flushKeepalive(): void {
    if (this.pendingQueue.length === 0 || typeof window === 'undefined') return;
    const batch = this.pendingQueue.splice(0, 50);
    const body = JSON.stringify({ events: batch });
    const url = `${environment.apiUrl}/analytics/ingest`;
    const token = this.auth.token;

    try {
      if (typeof fetch === 'function') {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        fetch(url, {
          method: 'POST',
          headers,
          body,
          keepalive: true
        }).catch(() => {});
        return;
      }
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' }));
      }
    } catch {}
  }

  // ── Métodos exclusivos de Administración (Consultas y Reset en MongoDB) ──

  async fetchAdminDashboard(options: {
    range: AnalyticsDateRange;
    device?: string;
    role?: string;
    includeDiagnostics?: boolean;
  }): Promise<AdminAnalyticsSnapshot> {
    await this.flushNow();

    let params = new HttpParams().set('range', options.range);
    if (options.device && options.device !== 'ALL') {
      params = params.set('device', options.device);
    }
    if (options.role && options.role !== 'ALL') {
      params = params.set('role', options.role);
    }
    if (options.includeDiagnostics !== undefined) {
      params = params.set('includeDiagnostics', String(options.includeDiagnostics));
    }

    return firstValueFrom(
      this.http.get<AdminAnalyticsSnapshot>(`${environment.apiUrl}/analytics/admin/dashboard`, { params })
    );
  }

  async updateAdminConfig(patch: Partial<TrackerServerConfig>): Promise<{ config: TrackerServerConfig; message: string }> {
    const res = await firstValueFrom(
      this.http.put<{ config: TrackerServerConfig; message: string }>(
        `${environment.apiUrl}/analytics/admin/config`,
        patch
      )
    );
    if (res?.config) {
      this.runtimeConfig = {
        captureEnabled: res.config.captureEnabled,
        trackAdminUsers: res.config.trackAdminUsers,
        captureApiHealthSample: res.config.captureApiHealthSample,
        slowApiThresholdMs: res.config.slowApiThresholdMs
      };
    }
    return res;
  }

  async resetAnalytics(scope: AnalyticsResetScope = 'all'): Promise<{
    ok: boolean;
    deletedCount: number;
    lastResetAt: string;
    lastResetBy: string;
    message: string;
  }> {
    this.pendingQueue = [];
    const params = new HttpParams().set('scope', scope);
    return firstValueFrom(
      this.http.delete<{
        ok: boolean;
        deletedCount: number;
        lastResetAt: string;
        lastResetBy: string;
        message: string;
      }>(`${environment.apiUrl}/analytics/admin/reset`, { params })
    );
  }

  buildReferenceDemoSnapshot(range: AnalyticsDateRange, currentConfig?: TrackerServerConfig): AdminAnalyticsSnapshot {
    const mult = range === '24h' ? 0.18 : range === '7d' ? 1 : range === '30d' ? 3.8 : 9.2;
    const scale = (n: number) => Math.max(1, Math.round(n * mult));

    return {
      generatedAt: new Date().toISOString(),
      sourceMode: 'demo_preview',
      range,
      storageStats: {
        totalStoredEvents: 0,
        estimatedSizeKb: 0,
        oldestEventAt: null,
        retentionDays: currentConfig?.retentionDays || 90,
        lastResetAt: currentConfig?.lastResetAt || null,
        lastResetBy: currentConfig?.lastResetBy || null
      },
      config: currentConfig || {
        captureEnabled: true,
        trackAdminUsers: false,
        captureApiHealthSample: true,
        retentionDays: 90,
        slowApiThresholdMs: 1500,
        lastResetAt: null,
        lastResetBy: null
      },
      kpis: {
        activeUsers: scale(1240),
        totalSessions: scale(3180),
        totalPageviews: scale(14620),
        avgDwellSeconds: 118,
        globalConversionRate: 41,
        uxFrictionCount: scale(94),
        rageClicksCount: scale(38),
        deadClicksCount: scale(31),
        abandonedFormsCount: scale(25),
        qaErrorsCount: scale(17),
        apiErrorRate: 1.4,
        avgApiLatencyMs: 245
      },
      dailyTrend: [
        { label: 'Lun', dateIso: '2026-11-21', sessions: scale(390), conversions: scale(155), frictions: scale(14), errors: scale(3) },
        { label: 'Mar', dateIso: '2026-11-22', sessions: scale(430), conversions: scale(178), frictions: scale(12), errors: scale(2) },
        { label: 'Mié', dateIso: '2026-11-23', sessions: scale(465), conversions: scale(190), frictions: scale(16), errors: scale(4) },
        { label: 'Jue', dateIso: '2026-11-24', sessions: scale(448), conversions: scale(184), frictions: scale(11), errors: scale(2) },
        { label: 'Vie', dateIso: '2026-11-25', sessions: scale(520), conversions: scale(226), frictions: scale(18), errors: scale(3) },
        { label: 'Sáb', dateIso: '2026-11-26', sessions: scale(510), conversions: scale(218), frictions: scale(13), errors: scale(2) },
        { label: 'Dom', dateIso: '2026-11-27', sessions: scale(417), conversions: scale(175), frictions: scale(10), errors: scale(1) }
      ],
      funnels: [
        {
          id: 'creator_journey',
          title: 'Embudo Organizador: Captación a Diseño de Invitación',
          subtitle: 'Muestra de referencia para visualizar caídas paso a paso',
          totalCompletionRate: 41,
          biggestDropStep: 'Personaliza Invitación en Editor (-31%)',
          steps: [
            { stepNumber: 1, key: 'entry', label: 'Entrada / Acceso a Plataforma', routeHint: '/', users: scale(1240), conversionFromStart: 100, conversionFromPrev: 100, dropOffRate: 0, dropOffUsers: 0, avgTimeSec: 34 },
            { stepNumber: 2, key: 'panel', label: 'Ingresa al Panel Organizador', routeHint: '/new/dashboard', users: scale(892), conversionFromStart: 72, conversionFromPrev: 72, dropOffRate: 28, dropOffUsers: scale(348), avgTimeSec: 46 },
            { stepNumber: 3, key: 'event', label: 'Gestiona o Crea Evento', routeHint: '/new/events/:id', users: scale(740), conversionFromStart: 60, conversionFromPrev: 83, dropOffRate: 17, dropOffUsers: scale(152), avgTimeSec: 68 },
            { stepNumber: 4, key: 'editor', label: 'Personaliza Invitación en Editor', routeHint: '/new/invitations/:id/visual-editor', users: scale(511), conversionFromStart: 41, conversionFromPrev: 69, dropOffRate: 31, dropOffUsers: scale(229), avgTimeSec: 245 }
          ]
        },
        {
          id: 'guest_rsvp',
          title: 'Embudo Invitado: Apertura de Enlace a Confirmación RSVP',
          subtitle: 'Recorrido de invitados desde WhatsApp/Email hasta confirmar asistencia',
          totalCompletionRate: 64,
          biggestDropStep: 'Envía Confirmación RSVP (-21%)',
          steps: [
            { stepNumber: 1, key: 'open_inv', label: 'Abre Invitación Pública', routeHint: '/new/i/:slug', users: scale(4820), conversionFromStart: 100, conversionFromPrev: 100, dropOffRate: 0, dropOffUsers: 0, avgTimeSec: 12 },
            { stepNumber: 2, key: 'scroll_inv', label: 'Explora Ubicación e Itinerario (>50% scroll)', routeHint: '/new/i/:slug', users: scale(3904), conversionFromStart: 81, conversionFromPrev: 81, dropOffRate: 19, dropOffUsers: scale(916), avgTimeSec: 47 },
            { stepNumber: 3, key: 'rsvp_done', label: 'Envía Confirmación RSVP', routeHint: 'Formulario RSVP', users: scale(3084), conversionFromStart: 64, conversionFromPrev: 79, dropOffRate: 21, dropOffUsers: scale(820), avgTimeSec: 31 }
          ]
        },
        {
          id: 'event_operations',
          title: 'Embudo Operativo: Evento a Mesas y Check-in QR',
          subtitle: 'Adopción de herramientas operativas antes y durante el evento',
          totalCompletionRate: 36,
          biggestDropStep: 'Diseña Croquis de Mesas (-38%)',
          steps: [
            { stepNumber: 1, key: 'ev_detail', label: 'Configura Detalle del Evento', routeHint: '/new/events/:id', users: scale(680), conversionFromStart: 100, conversionFromPrev: 100, dropOffRate: 0, dropOffUsers: 0, avgTimeSec: 130 },
            { stepNumber: 2, key: 'dispatch', label: 'Importa Lista / Envía WhatsApp', routeHint: 'Invitados & Comunicación', users: scale(524), conversionFromStart: 77, conversionFromPrev: 77, dropOffRate: 23, dropOffUsers: scale(156), avgTimeSec: 88 },
            { stepNumber: 3, key: 'seating', label: 'Diseña Croquis de Mesas', routeHint: '/new/events/:id/seating', users: scale(325), conversionFromStart: 48, conversionFromPrev: 62, dropOffRate: 38, dropOffUsers: scale(199), avgTimeSec: 210 },
            { stepNumber: 4, key: 'checkin', label: 'Opera Check-in QR / Acceso Staff', routeHint: '/new/check-in/:token', users: scale(245), conversionFromStart: 36, conversionFromPrev: 75, dropOffRate: 25, dropOffUsers: scale(80), avgTimeSec: 54 }
          ]
        }
      ],
      sections: [
        { route: '/new/i/:slug', label: 'Invitación Pública (Vista Invitado)', moduleGroup: 'Experiencia Invitado', views: scale(5940), uniqueUsers: scale(4820), avgDwellSec: 74, avgScrollPct: 78, exits: scale(1420), exitRatePct: 24, frictionEvents: scale(12), adoptionStatus: 'Estrella' },
        { route: '/new/events/:id', label: 'Detalle Operativo del Evento', moduleGroup: 'Gestión Evento', views: scale(2690), uniqueUsers: scale(710), avgDwellSec: 162, avgScrollPct: 68, exits: scale(430), exitRatePct: 16, frictionEvents: scale(15), adoptionStatus: 'Estrella' },
        { route: '/new/invitations/:id/visual-editor', label: 'Editor Visual 3 en 1 (Lienzo)', moduleGroup: 'Diseño Invitación', views: scale(1840), uniqueUsers: scale(540), avgDwellSec: 284, avgScrollPct: 92, exits: scale(718), exitRatePct: 39, frictionEvents: scale(34), adoptionStatus: 'Alta Fuga' },
        { route: '/new/dashboard', label: 'Dashboard General', moduleGroup: 'Gestión Evento', views: scale(1510), uniqueUsers: scale(860), avgDwellSec: 52, avgScrollPct: 61, exits: scale(211), exitRatePct: 14, frictionEvents: scale(5), adoptionStatus: 'Saludable' },
        { route: '/new/events/:id/seating', label: 'Croquis y Asignación de Mesas', moduleGroup: 'Gestión Evento', views: scale(620), uniqueUsers: scale(325), avgDwellSec: 198, avgScrollPct: 85, exits: scale(173), exitRatePct: 28, frictionEvents: scale(11), adoptionStatus: 'Saludable' },
        { route: '/new/invitations/:id/pass-editor', label: 'Editor de Pases VIP', moduleGroup: 'Diseño Invitación', views: scale(290), uniqueUsers: scale(165), avgDwellSec: 124, avgScrollPct: 74, exits: scale(61), exitRatePct: 21, frictionEvents: scale(4), adoptionStatus: 'Subutilizada' }
      ],
      exitRoutes: [
        { route: '/new/invitations/:id/visual-editor', label: 'Editor Visual 3 en 1 (Lienzo)', moduleGroup: 'Diseño Invitación', views: scale(1840), uniqueUsers: scale(540), avgDwellSec: 284, avgScrollPct: 92, exits: scale(718), exitRatePct: 39, frictionEvents: scale(34), adoptionStatus: 'Alta Fuga' },
        { route: '/', label: 'Landing Principal', moduleGroup: 'Captación', views: scale(1380), uniqueUsers: scale(1240), avgDwellSec: 41, avgScrollPct: 56, exits: scale(455), exitRatePct: 33, frictionEvents: scale(9), adoptionStatus: 'Saludable' }
      ],
      subTabsUsage: [
        { route: '/new/events/:id', routeLabel: 'Detalle Operativo del Evento', tabName: 'Invitados', opens: scale(1420), uniqueUsers: scale(680) },
        { route: '/new/events/:id', routeLabel: 'Detalle Operativo del Evento', tabName: 'Confirmaciones RSVP', opens: scale(1190), uniqueUsers: scale(640) },
        { route: '/new/events/:id', routeLabel: 'Detalle Operativo del Evento', tabName: 'Comunicación / WhatsApp', opens: scale(980), uniqueUsers: scale(524) },
        { route: '/new/events/:id', routeLabel: 'Detalle Operativo del Evento', tabName: 'Mesas', opens: scale(640), uniqueUsers: scale(390) },
        { route: '/new/events/:id', routeLabel: 'Detalle Operativo del Evento', tabName: 'Cabina DJ', opens: scale(170), uniqueUsers: scale(115) }
      ],
      features: [
        { featureKey: 'excel_import', label: 'Importación Excel de Invitados', category: 'Invitados', uses: scale(1420), uniqueUsers: scale(680), adoptionPct: 79, recommendation: 'Función estrella: mantener botón visible en cabecera.' },
        { featureKey: 'whatsapp_dispatch', label: 'Envío de Pases por WhatsApp', category: 'Comunicación', uses: scale(1190), uniqueUsers: scale(524), adoptionPct: 61, recommendation: 'Alta tracción: sugerir recordatorios automáticos.' },
        { featureKey: 'seating_chart', label: 'Croquis Interactivo de Mesas', category: 'Operación', uses: scale(490), uniqueUsers: scale(325), adoptionPct: 38, recommendation: 'Promocionar auto-asignación tras 20 confirmados.' },
        { featureKey: 'ai_wizard', label: 'Asistente IA de Plantillas', category: 'Asistencia IA / Guía', uses: scale(160), uniqueUsers: scale(104), adoptionPct: 12, recommendation: 'Oportunidad: mostrar acceso directo al crear invitación.' }
      ],
      uxIncidents: [
        { id: 'd1', type: 'rage_click', route: '/new/invitations/:id/visual-editor', routeLabel: 'Editor Visual 3 en 1', pageSection: 'Barra superior · Exportación', targetLabel: 'Exportar / Guardar Vista Previa', selector: 'button.export-action-btn', occurrences: scale(21), affectedUsers: scale(14), deviceSplit: '76% Móvil · 24% Desktop', lastSeen: new Date().toISOString(), severity: 'alta', diagnosis: 'Agregar indicador inmediato de progreso al exportar el lienzo.' },
        { id: 'd2', type: 'dead_click', route: '/new/dashboard', routeLabel: 'Dashboard General', pageSection: 'Sección: Métricas generales', targetLabel: 'Tarjeta KPI "Pendientes"', selector: '.nw-metric.warning', occurrences: scale(19), affectedUsers: scale(16), deviceSplit: '42% Móvil · 58% Desktop', lastSeen: new Date().toISOString(), severity: 'media', diagnosis: 'Los organizadores pulsan la métrica esperando abrir la lista filtrada.' }
      ],
      formAbandonments: [
        { formName: 'Modal: Nuevo evento', route: '/new/dashboard', starts: scale(210), abandoned: scale(54), submitted: scale(156), abandonRatePct: 26, lastTouchedField: 'URL de Google Maps', avgTimeBeforeExitSec: 49 },
        { formName: 'Confirmación RSVP Invitado', route: '/new/i/:slug', starts: scale(3904), abandoned: scale(820), submitted: scale(3084), abandonRatePct: 21, lastTouchedField: 'Mensaje / Alergias', avgTimeBeforeExitSec: 34 }
      ],
      devices: [
        { device: 'Web Móvil', sessions: scale(2035), sharePct: 64, avgLoadMs: 310, frictionRatePct: 3.8, errorRatePct: 1.6, conversionPct: 38 },
        { device: 'Web Desktop', sessions: scale(890), sharePct: 28, avgLoadMs: 195, frictionRatePct: 1.4, errorRatePct: 0.9, conversionPct: 52 },
        { device: 'Android App', sessions: scale(255), sharePct: 8, avgLoadMs: 240, frictionRatePct: 2.1, errorRatePct: 1.2, conversionPct: 46 }
      ],
      rolesBreakdown: [
        { role: 'guest', users: scale(4820), sessions: scale(5940), events: scale(18200) },
        { role: 'client', users: scale(640), sessions: scale(1920), events: scale(9400) },
        { role: 'organizer', users: scale(220), sessions: scale(1260), events: scale(7800) }
      ],
      qaIssues: [
        { id: 'q1', kind: 'http_error', title: 'POST /api/locations/inspect-map-url → HTTP 422', routeOrEndpoint: '/new/dashboard', pageLabel: 'Dashboard General', pageSection: 'Modal: Nuevo evento', occurrences: scale(9), affectedUsers: scale(8), statusOrCode: '422', browserDevice: 'Safari · Web Móvil', lastBreadcrumb: 'Clic en "Extraer ubicación"', lastSeen: new Date().toISOString(), severity: 'alta' },
        { id: 'q2', kind: 'slow_endpoint', title: 'GET /api/visual-design-templates/catalog (2140 ms)', routeOrEndpoint: '/new/invitations/:id/visual-editor', pageLabel: 'Editor Visual 3 en 1', pageSection: 'Galería de Plantillas', occurrences: scale(18), affectedUsers: scale(15), statusOrCode: '2140ms', browserDevice: 'Chrome · Web Móvil', lastBreadcrumb: 'Apertura de catálogo comunitario', lastSeen: new Date().toISOString(), severity: 'media' }
      ],
      apiHealth: [
        { method: 'GET', endpoint: '/api/public/invitations/:slug', calls: scale(5980), avgLatencyMs: 142, p95LatencyMs: 310, failures: scale(6), errorRatePct: 0.1 },
        { method: 'GET', endpoint: '/api/visual-design-templates/catalog', calls: scale(940), avgLatencyMs: 680, p95LatencyMs: 2140, failures: scale(4), errorRatePct: 0.4 }
      ],
      insights: [
        { id: 'i1', area: 'UX / Diseño', priority: 'P0 Urgente', title: 'Clics repetidos en "Exportar / Guardar Vista Previa" (Editor Visual)', pageLabel: 'Editor Visual 3 en 1 (Lienzo)', pageSection: 'Barra superior · Exportación', evidence: `${scale(21)} rage-clicks detectados en Editor Visual (76% móvil).`, suggestedAction: 'Mostrar estado de progreso instantáneo y deshabilitar doble toque mientras renderiza.', affectedRoute: '/new/invitations/:id/visual-editor' },
        { id: 'i2', area: 'Producto / Conversión', priority: 'P1 Alta', title: 'Fuga del 31% antes de finalizar diseño en Editor Visual', pageLabel: 'Editor Visual 3 en 1 (Lienzo)', pageSection: 'Embudo Organizador', evidence: `${scale(229)} organizadores salen sin publicar en la primera sesión.`, suggestedAction: 'Activar autoguardado visible y ofrecer vista previa rápida en 1 paso.', affectedRoute: '/new/invitations/:id/visual-editor' },
        { id: 'i3', area: 'QA / Estabilidad', priority: 'P1 Alta', title: 'Fallo en Dashboard General: enlaces cortos de Maps en Safari móvil (HTTP 422)', pageLabel: 'Dashboard General', pageSection: 'Modal: Nuevo evento', evidence: `${scale(9)} fallos al extraer dirección desde enlace acortado.`, suggestedAction: 'Resolver redirección corta en backend o mostrar guía amigable.', affectedRoute: '/new/dashboard' }
      ],
      recentLiveEvents: []
    };
  }

  // ── Utilidades de normalización y detección ──

  private resolveRouteMeta(rawUrl: string): { normalized: string; label: string; group: SectionUsageMetric['moduleGroup'] } {
    const clean = (rawUrl || '/').split('?')[0].split('#')[0] || '/';
    for (const entry of ROUTE_CATALOG) {
      if (entry.pattern.test(clean)) {
        return { normalized: entry.normalized, label: entry.label, group: entry.group };
      }
    }
    return { normalized: clean, label: clean, group: 'Gestión Evento' };
  }

  private sanitizeRawPath(rawUrl: string): string {
    return ((rawUrl || '/').split('?')[0].split('#')[0] || '/').slice(0, 160);
  }

  private extractTabFromUrl(url: string): string {
    const qIndex = url.indexOf('?');
    if (qIndex < 0) return '';
    try {
      const params = new URLSearchParams(url.slice(qIndex + 1));
      return params.get('tab') || '';
    } catch {
      return '';
    }
  }

  private normalizeApiEndpoint(url: string): string {
    try {
      const parsed = url.startsWith('http') ? new URL(url).pathname : url.split('?')[0];
      return parsed
        .replace(/\/[a-f0-9]{24}(?=\/|$)/gi, '/:id')
        .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27}(?=\/|$)/gi, '/:uuid')
        .replace(/\/(check-in|external-access|public\/invitations|rsvps\/public)\/[^/]+/gi, '/$1/:slug');
    } catch {
      return url.split('?')[0].slice(0, 100);
    }
  }

  private computeScrollPercent(): number {
    if (typeof window === 'undefined' || typeof document === 'undefined') return 0;
    const doc = document.documentElement;
    const scrollTop = window.scrollY || doc.scrollTop || 0;
    const viewport = window.innerHeight || doc.clientHeight || 1;
    const fullHeight = Math.max(doc.scrollHeight || 1, viewport);
    if (fullHeight <= viewport + 20) return 100;
    return Math.min(100, Math.max(0, Math.round(((scrollTop + viewport) / fullHeight) * 100)));
  }

  private describeFormField(el: HTMLElement): string {
    const nameAttr = el.getAttribute('formcontrolname') || el.getAttribute('name') || el.getAttribute('id');
    const placeholder = el.getAttribute('placeholder');
    const aria = el.getAttribute('aria-label');
    const parentLabel = el.closest('label')?.textContent?.trim().split('\n')[0]?.trim();
    const raw = aria || parentLabel || placeholder || nameAttr || el.tagName.toLowerCase();
    return raw.replace(/\s+/g, ' ').slice(0, 70);
  }

  private describeFormContainer(el: HTMLElement): string {
    const modalTitle = el.closest('.nw-modal')?.querySelector('h2, h3')?.textContent?.trim();
    if (modalTitle) return `Modal: ${modalTitle.slice(0, 60)}`;
    const cardTitle = el.closest('.nw-card')?.querySelector('h2, h3')?.textContent?.trim();
    if (cardTitle) return cardTitle.slice(0, 60);
    return `Formulario en ${this.currentRouteLabel}`;
  }

  private extractReadableLabel(el: HTMLElement): string {
    const aria = el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('data-tour');
    if (aria) return aria.trim().slice(0, 70);

    // Si se hizo clic sobre un span/em/strong corto dentro de un bloque o botón, tomar el texto del contenedor inmediato
    let targetForText = el;
    if (['SPAN', 'EM', 'STRONG', 'B', 'I', 'SMALL'].includes(el.tagName) && el.parentElement) {
      const parentTxt = (el.parentElement.innerText || el.parentElement.textContent || '').replace(/\s+/g, ' ').trim();
      if (parentTxt && parentTxt.length <= 80) {
        targetForText = el.parentElement;
      }
    }

    const txt = (targetForText.innerText || targetForText.textContent || '').replace(/\s+/g, ' ').trim();
    if (txt) return txt.slice(0, 70);
    const placeholder = el.getAttribute('placeholder');
    if (placeholder) return placeholder.slice(0, 70);
    return el.tagName.toLowerCase();
  }

  private extractPageSection(el: HTMLElement): string {
    const modalHeading = el.closest('.nw-modal')?.querySelector('h1, h2, h3')?.textContent?.replace(/\s+/g, ' ').trim();
    if (modalHeading) return `Modal: ${modalHeading.slice(0, 55)}`;

    const cardHeading = el.closest('.nw-card')?.querySelector('h2, h3')?.textContent?.replace(/\s+/g, ' ').trim();
    if (cardHeading) return `Bloque: ${cardHeading.slice(0, 55)}`;

    const sectionEl = el.closest('section, header, footer, nav, [data-section], [id]') as HTMLElement | null;
    if (sectionEl) {
      const secTitle = sectionEl.querySelector('h1, h2, h3')?.textContent?.replace(/\s+/g, ' ').trim();
      if (secTitle) return `Sección: ${secTitle.slice(0, 55)}`;
      if (sectionEl.id) return `Sección #${sectionEl.id.slice(0, 45)}`;
      if (sectionEl.tagName === 'HEADER') return 'Encabezado superior';
      if (sectionEl.tagName === 'FOOTER') return 'Pie de página';
      if (sectionEl.tagName === 'NAV') return 'Barra de navegación';
    }

    if (this.currentSectionTab) {
      return `Pestaña: ${this.currentSectionTab.slice(0, 50)}`;
    }
    return 'Vista principal';
  }

  private buildSelector(el: HTMLElement): string {
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : '';
    const tour = el.getAttribute('data-tour');
    if (tour) return `${tag}[data-tour="${tour}"]`;
    const cls = Array.from(el.classList || [])
      .filter((c) => !c.startsWith('ng-'))
      .slice(0, 2)
      .map((c) => `.${c}`)
      .join('');
    return `${tag}${id}${cls}`.slice(0, 90);
  }

  private detectProductFeature(
    label: string,
    route: string
  ): { key: string; label: string; category: string } | null {
    const l = label.toLowerCase();
    if (l.includes('nuevo evento') || l.includes('crear evento')) {
      return { key: 'create_event', label: 'Creación de Eventos', category: 'Operación' };
    }
    if (l.includes('whatsapp')) {
      return { key: 'whatsapp_dispatch', label: 'Envío por WhatsApp', category: 'Comunicación' };
    }
    if (l.includes('excel') || l.includes('importar')) {
      return { key: 'excel_import', label: 'Importación Excel de Invitados', category: 'Invitados' };
    }
    if (l.includes('croquis') || l.includes('mesa') || route.includes('/seating')) {
      return { key: 'seating_chart', label: 'Croquis Interactivo de Mesas', category: 'Operación' };
    }
    if (l.includes('pase') && (l.includes('vip') || l.includes('descargar') || route.includes('pass-editor'))) {
      return { key: 'vip_passes', label: 'Pases VIP / QR', category: 'Diseño' };
    }
    if (l.includes('álbum') || l.includes('album') || l.includes('subir foto')) {
      return { key: 'photo_album', label: 'Álbum Colaborativo de Fotos', category: 'Experiencia' };
    }
    if (l.includes('canción') || l.includes('dj') || l.includes('dedicatoria')) {
      return { key: 'dj_dedications', label: 'Cabina DJ & Dedicatorias', category: 'Experiencia' };
    }
    if (l.includes('ia') || l.includes('mágico') || l.includes('asistente')) {
      return { key: 'ai_wizard', label: 'Asistente IA de Plantillas', category: 'Asistencia IA / Guía' };
    }
    if (l.includes('tutorial') || l.includes('recorrido')) {
      return { key: 'interactive_tutorial', label: 'Tutorial Guiado', category: 'Asistencia IA / Guía' };
    }
    if (l.includes('confirmar asistencia') || l.includes('enviar confirmación')) {
      return { key: 'rsvp_submit', label: 'Confirmación RSVP de Invitado', category: 'Invitados' };
    }
    if (route.includes('visual-editor') && (l.includes('guardar') || l.includes('publicar') || l.includes('exportar'))) {
      return { key: 'visual_editor_save', label: 'Guardado / Publicación en Editor Visual', category: 'Diseño' };
    }
    return null;
  }

  private detectDeviceType(): 'Web Desktop' | 'Web Móvil' | 'Android App' {
    if (Capacitor.isNativePlatform()) return 'Android App';
    if (typeof window !== 'undefined' && (window.innerWidth <= 820 || /Mobi|Android|iPhone/i.test(navigator.userAgent))) {
      return 'Web Móvil';
    }
    return 'Web Desktop';
  }

  private detectBrowserName(): string {
    if (typeof navigator === 'undefined') return 'Web';
    const ua = navigator.userAgent;
    if (/Edg\//i.test(ua)) return 'Edge';
    if (/SamsungBrowser/i.test(ua)) return 'Samsung Internet';
    if (/Chrome\//i.test(ua)) return 'Chrome';
    if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return 'Safari';
    if (/Firefox\//i.test(ua)) return 'Firefox';
    return 'Navegador';
  }

  private detectOsName(): string {
    if (typeof navigator === 'undefined') return '';
    const ua = navigator.userAgent;
    if (/Android/i.test(ua)) return 'Android';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
    if (/Windows/i.test(ua)) return 'Windows';
    if (/Mac OS/i.test(ua)) return 'macOS';
    if (/Linux/i.test(ua)) return 'Linux';
    return 'OS';
  }

  private getOrCreateAnonId(): string {
    try {
      const existing = localStorage.getItem(ANON_ID_KEY);
      if (existing) return existing;
      const next = `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(ANON_ID_KEY, next);
      return next;
    } catch {
      return 'anon_session';
    }
  }

  private getOrCreateSessionId(): string {
    try {
      const now = Date.now();
      const existingId = sessionStorage.getItem(SESSION_ID_KEY);
      const lastTs = Number(sessionStorage.getItem(SESSION_TS_KEY) || 0);

      if (existingId && lastTs > 0 && now - lastTs < SESSION_TIMEOUT_MS) {
        sessionStorage.setItem(SESSION_TS_KEY, String(now));
        return existingId;
      }

      const fresh = `ses_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(SESSION_ID_KEY, fresh);
      sessionStorage.setItem(SESSION_TS_KEY, String(now));
      return fresh;
    } catch {
      return 'ses_fallback';
    }
  }
}
