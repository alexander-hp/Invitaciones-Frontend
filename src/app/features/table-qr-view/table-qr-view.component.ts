import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { EventTableModel } from '../../core/models';

export interface TableQrGuestItem {
  name: string;
  seats: number;
  seatLabel?: string;
  group?: string;
  checkedIn?: boolean;
}

export interface TableQrViewData {
  eventTitle: string;
  eventDate?: string;
  venueName?: string;
  floorName: string;
  tableName: string;
  capacity: number;
  occupied: number;
  invitationSlug?: string;
  guests: TableQrGuestItem[];
}

interface SeatDot {
  cx: number;
  cy: number;
  state: 'checked_in' | 'occupied' | 'available';
}

@Component({
  selector: 'app-table-qr-view',
  template: `
    <div class="tqv-page">
      <!-- Top Bar -->
      <header class="tqv-topbar">
        <div class="tqv-topbar-inner">
          <div class="tqv-brand">
            <span class="tqv-brand-mark">
              <img src="assets/logos/velisse.svg" alt="Velisse" />
            </span>
            <div class="tqv-brand-copy">
              <strong>Velisse</strong>
              <span>Control de Mesas</span>
            </div>
          </div>

          <div class="tqv-topbar-actions">
            <span class="tqv-live-badge" *ngIf="liveSynced">
              <span class="tqv-live-dot"></span>
              En vivo
            </span>
            <button *ngIf="canRefreshLive" type="button" class="tqv-btn tqv-btn-ghost" [disabled]="refreshing" (click)="refreshLive()">
              <svg [class.tqv-spin]="refreshing" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                <path d="M16 16h5v5"></path>
              </svg>
              <span>{{ refreshing ? 'Actualizando' : 'Actualizar' }}</span>
            </button>
            <a *ngIf="canRefreshLive && eventId" [routerLink]="['/new/events', eventId, 'seating']" class="tqv-btn tqv-btn-dark">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
                <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
                <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
                <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
              </svg>
              <span>Croquis</span>
            </a>
          </div>
        </div>
      </header>

      <main class="tqv-main" *ngIf="data; else emptyState">
        <!-- Event Banner -->
        <section class="tqv-event-banner">
          <div class="tqv-event-eyebrow">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m12 3 1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3Z"></path>
            </svg>
            <span>Información oficial de mesa</span>
          </div>
          <h1 class="tqv-event-title">{{ data.eventTitle }}</h1>
          <div class="tqv-event-meta" *ngIf="data.eventDate || data.venueName">
            <span class="tqv-meta-chip" *ngIf="data.eventDate">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              {{ data.eventDate }}
            </span>
            <span class="tqv-meta-chip" *ngIf="data.venueName">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              {{ data.venueName }}
            </span>
          </div>
        </section>

        <!-- 2-Column Editorial Workspace -->
        <div class="tqv-grid">
          <!-- Left Column: Visual Table Card & Metrics -->
          <aside class="tqv-summary-col">
            <div class="tqv-card tqv-table-card">
              <div class="tqv-floor-row">
                <span class="tqv-floor-pill">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                    <polyline points="2 17 12 22 22 17"></polyline>
                    <polyline points="2 12 12 17 22 12"></polyline>
                  </svg>
                  {{ data.floorName }}
                </span>
                <span class="tqv-occupancy-badge" [class.is-full]="availableSeats <= 0" [class.is-over]="data.occupied > data.capacity">
                  {{ data.occupied > data.capacity ? 'Sobrecupo' : (availableSeats <= 0 ? 'Completa' : availableSeats + ' libres') }}
                </span>
              </div>

              <!-- Visual SVG Seat Map around Table -->
              <div class="tqv-diagram-wrap">
                <svg class="tqv-diagram-svg" viewBox="0 0 220 220" role="img" [attr.aria-label]="'Diagrama de lugares para ' + data.tableName">
                  <circle cx="110" cy="110" r="60" fill="#faf7f2" stroke="#c09c78" stroke-width="2"></circle>
                  <circle cx="110" cy="110" r="52" fill="none" stroke="rgba(192, 156, 120, 0.35)" stroke-width="1" stroke-dasharray="3 3"></circle>
                  <text x="110" y="106" text-anchor="middle" fill="#241d17" font-family="'Cormorant Garamond', Georgia, serif" font-size="24" font-weight="700">
                    {{ data.tableName }}
                  </text>
                  <text x="110" y="126" text-anchor="middle" fill="#7c6d5f" font-family="Inter, sans-serif" font-size="11" font-weight="600">
                    {{ data.occupied }} / {{ data.capacity }} lugares
                  </text>
                  <g *ngFor="let dot of seatDots">
                    <circle
                      [attr.cx]="dot.cx"
                      [attr.cy]="dot.cy"
                      r="8"
                      [attr.fill]="dot.state === 'checked_in' ? '#16a34a' : (dot.state === 'occupied' ? '#c09c78' : '#ffffff')"
                      [attr.stroke]="dot.state === 'checked_in' ? '#15803d' : (dot.state === 'occupied' ? '#9e7850' : '#d6c8b6')"
                      stroke-width="2"
                    ></circle>
                  </g>
                </svg>
              </div>

              <!-- Legend -->
              <div class="tqv-legend">
                <span><i class="dot in"></i> Llegó</span>
                <span><i class="dot occ"></i> Asignado</span>
                <span><i class="dot free"></i> Libre</span>
              </div>

              <!-- Occupancy Bar -->
              <div class="tqv-bar-block">
                <div class="tqv-bar-head">
                  <span>Ocupación de la mesa</span>
                  <strong>{{ occupancyPercent }}%</strong>
                </div>
                <div class="tqv-bar-track">
                  <div class="tqv-bar-fill" [style.width.%]="occupancyPercent" [class.is-over]="data.occupied > data.capacity"></div>
                </div>
              </div>

              <!-- 2x2 KPI Grid -->
              <div class="tqv-kpi-grid">
                <div class="tqv-kpi">
                  <span class="tqv-kpi-label">Capacidad</span>
                  <strong class="tqv-kpi-val">{{ data.capacity }}</strong>
                </div>
                <div class="tqv-kpi">
                  <span class="tqv-kpi-label">Asignados</span>
                  <strong class="tqv-kpi-val accent">{{ data.occupied }}</strong>
                </div>
                <div class="tqv-kpi">
                  <span class="tqv-kpi-label">En el evento</span>
                  <strong class="tqv-kpi-val success">{{ checkedInSeatsCount }}</strong>
                </div>
                <div class="tqv-kpi">
                  <span class="tqv-kpi-label">Disponibles</span>
                  <strong class="tqv-kpi-val">{{ availableSeats }}</strong>
                </div>
              </div>
            </div>

            <!-- Invitation CTA Card -->
            <div class="tqv-card tqv-link-card" *ngIf="data.invitationSlug">
              <div class="tqv-link-copy">
                <strong>Invitación interactiva</strong>
                <span>Consulta el itinerario, álbum de fotos en vivo y música del evento.</span>
              </div>
              <a [routerLink]="['/new/i', data.invitationSlug]" class="tqv-btn tqv-btn-gold tqv-btn-full">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                </svg>
                <span>Abrir invitación</span>
              </a>
            </div>
          </aside>

          <!-- Right Column: Guests Roster for Acomodador -->
          <section class="tqv-roster-col">
            <div class="tqv-card tqv-roster-card">
              <div class="tqv-roster-head">
                <div>
                  <h2>Invitados asignados</h2>
                  <p>{{ data.guests.length }} {{ data.guests.length === 1 ? 'registro' : 'registros' }} · {{ data.occupied }} lugares totales</p>
                </div>
                <div class="tqv-checkin-summary" *ngIf="hasCheckInInfo">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <span>{{ checkedInGuestsCount }}/{{ data.guests.length }} llegaron</span>
                </div>
              </div>

              <!-- Search & Filters -->
              <div class="tqv-controls" *ngIf="data.guests.length > 0">
                <div class="tqv-search-box">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input type="text" [(ngModel)]="search" placeholder="Buscar invitado, asiento o grupo..." />
                  <button *ngIf="search" type="button" class="tqv-clear-btn" (click)="search = ''" aria-label="Limpiar búsqueda">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>

                <div class="tqv-filter-pills" *ngIf="hasCheckInInfo || uniqueGroups.length > 1">
                  <button *ngIf="hasCheckInInfo" type="button" class="tqv-filter-pill" [class.active]="statusFilter === 'all'" (click)="statusFilter = 'all'">
                    Todos
                  </button>
                  <button *ngIf="hasCheckInInfo" type="button" class="tqv-filter-pill" [class.active]="statusFilter === 'in'" (click)="statusFilter = 'in'">
                    Llegaron ({{ checkedInGuestsCount }})
                  </button>
                  <button *ngIf="hasCheckInInfo" type="button" class="tqv-filter-pill" [class.active]="statusFilter === 'pending'" (click)="statusFilter = 'pending'">
                    Pendientes ({{ data.guests.length - checkedInGuestsCount }})
                  </button>
                  <button *ngFor="let grp of uniqueGroups" type="button" class="tqv-filter-pill group"
                    [class.active]="groupFilter === grp" (click)="groupFilter = groupFilter === grp ? '' : grp">
                    {{ grp }}
                  </button>
                </div>
              </div>

              <!-- Guest List -->
              <div class="tqv-guest-list" *ngIf="filteredGuests.length; else noGuests">
                <article class="tqv-guest-item" *ngFor="let g of filteredGuests" [class.is-checked-in]="g.checkedIn">
                  <div class="tqv-avatar" [class.is-in]="g.checkedIn">{{ initials(g.name) }}</div>

                  <div class="tqv-guest-body">
                    <div class="tqv-guest-top">
                      <h3 class="tqv-guest-name">{{ g.name }}</h3>
                      <span *ngIf="g.checkedIn !== undefined" class="tqv-status-pill" [class.is-in]="g.checkedIn">
                        <svg *ngIf="g.checkedIn" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <svg *ngIf="!g.checkedIn" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="12" cy="12" r="9"></circle>
                          <polyline points="12 7 12 12 15 14"></polyline>
                        </svg>
                        <span>{{ g.checkedIn ? 'Llegó' : 'Pendiente' }}</span>
                      </span>
                    </div>

                    <div class="tqv-guest-chips">
                      <span class="tqv-chip">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        {{ g.seats }} {{ g.seats === 1 ? 'lugar' : 'lugares' }}
                      </span>

                      <span class="tqv-chip seat" *ngIf="g.seatLabel">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"></path>
                          <path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H7v-2a2 2 0 0 0-4 0Z"></path>
                          <path d="M5 18v2"></path>
                          <path d="M19 18v2"></path>
                        </svg>
                        {{ g.seatLabel }}
                      </span>

                      <span class="tqv-chip group" *ngIf="g.group">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"></path>
                          <path d="M7 7h.01"></path>
                        </svg>
                        {{ g.group }}
                      </span>
                    </div>
                  </div>
                </article>
              </div>

              <ng-template #noGuests>
                <div class="tqv-empty-guests">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <line x1="17" y1="8" x2="22" y2="13"></line>
                    <line x1="22" y1="8" x2="17" y2="13"></line>
                  </svg>
                  <p>{{ search || statusFilter !== 'all' || groupFilter ? 'Ningún invitado coincide con el filtro actual.' : 'Aún no hay invitados asignados a esta mesa.' }}</p>
                </div>
              </ng-template>
            </div>
          </section>
        </div>
      </main>

      <ng-template #emptyState>
        <main class="tqv-main">
          <div class="tqv-card tqv-empty-state">
            <span class="tqv-brand-mark lg">
              <img src="assets/logos/velisse.svg" alt="Velisse" />
            </span>
            <h2>Información de mesa no disponible</h2>
            <p>El código QR escaneado no contiene datos válidos de la mesa o el enlace está incompleto.</p>
            <a routerLink="/" class="tqv-btn tqv-btn-gold">Ir a Velisse</a>
          </div>
        </main>
      </ng-template>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: #f5f1ea;
      color: #241d17;
      font-family: Inter, system-ui, -apple-system, sans-serif;
    }

    .tqv-page {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background:
        radial-gradient(circle at 12% 0%, rgba(192, 156, 120, 0.14), transparent 36%),
        radial-gradient(circle at 88% 8%, rgba(212, 175, 55, 0.09), transparent 34%),
        #f5f1ea;
    }

    /* Top Bar */
    .tqv-topbar {
      position: sticky;
      top: 0;
      z-index: 20;
      background: rgba(250, 247, 242, 0.92);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid #e6dac8;
    }

    .tqv-topbar-inner {
      max-width: 980px;
      margin: 0 auto;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .tqv-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .tqv-brand-mark {
      width: 34px;
      height: 34px;
      padding: 6px;
      border-radius: 10px;
      background: linear-gradient(145deg, #241d17, #130f0c);
      border: 1px solid rgba(212, 175, 55, 0.45);
      box-shadow: 0 3px 10px rgba(36, 29, 23, 0.18);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .tqv-brand-mark.lg {
      width: 52px;
      height: 52px;
      padding: 10px;
      border-radius: 14px;
      margin-bottom: 14px;
    }

    .tqv-brand-mark img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .tqv-brand-copy {
      display: flex;
      flex-direction: column;
      line-height: 1.15;
    }

    .tqv-brand-copy strong {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 19px;
      font-weight: 700;
      color: #241d17;
    }

    .tqv-brand-copy span {
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #9b7a52;
    }

    .tqv-topbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .tqv-live-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 10px;
      border-radius: 999px;
      background: rgba(22, 163, 74, 0.1);
      border: 1px solid rgba(22, 163, 74, 0.28);
      color: #15803d;
      font-size: 11.5px;
      font-weight: 700;
    }

    .tqv-live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #16a34a;
      box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.2);
    }

    /* Main Container */
    .tqv-main {
      width: 100%;
      max-width: 980px;
      margin: 0 auto;
      padding: 24px 20px 44px;
    }

    .tqv-event-banner {
      margin-bottom: 22px;
      padding-bottom: 18px;
      border-bottom: 1px solid #e6dac8;
    }

    .tqv-event-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #9b7a52;
      margin-bottom: 6px;
    }

    .tqv-event-title {
      margin: 0 0 10px;
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 32px;
      font-weight: 700;
      line-height: 1.12;
      color: #241d17;
    }

    .tqv-event-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .tqv-meta-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 11px;
      border-radius: 999px;
      background: #ffffff;
      border: 1px solid #e6dac8;
      font-size: 12.5px;
      font-weight: 500;
      color: #5c5045;
    }

    .tqv-meta-chip svg {
      color: #b08857;
      flex-shrink: 0;
    }

    /* 2-Column Grid */
    .tqv-grid {
      display: grid;
      grid-template-columns: 340px minmax(0, 1fr);
      gap: 20px;
      align-items: start;
    }

    .tqv-summary-col {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .tqv-card {
      background: #ffffff;
      border: 1px solid #e6dac8;
      border-radius: 18px;
      box-shadow: 0 10px 28px rgba(36, 29, 23, 0.05);
    }

    .tqv-table-card {
      padding: 20px;
    }

    .tqv-floor-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 10px;
    }

    .tqv-floor-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      background: #f5efe6;
      border: 1px solid #e6dac8;
      color: #6b5844;
      font-size: 11.5px;
      font-weight: 700;
    }

    .tqv-occupancy-badge {
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      background: rgba(192, 156, 120, 0.16);
      color: #8b6538;
    }

    .tqv-occupancy-badge.is-full {
      background: rgba(22, 163, 74, 0.12);
      color: #15803d;
    }

    .tqv-occupancy-badge.is-over {
      background: rgba(220, 38, 38, 0.12);
      color: #b91c1c;
    }

    .tqv-diagram-wrap {
      display: flex;
      justify-content: center;
      margin: 4px 0 8px;
    }

    .tqv-diagram-svg {
      width: 210px;
      height: 210px;
      display: block;
    }

    .tqv-legend {
      display: flex;
      justify-content: center;
      gap: 14px;
      font-size: 11.5px;
      color: #6e6157;
      margin-bottom: 16px;
    }

    .tqv-legend span {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    .tqv-legend .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
    }

    .tqv-legend .dot.in { background: #16a34a; }
    .tqv-legend .dot.occ { background: #c09c78; }
    .tqv-legend .dot.free { background: #ffffff; border: 1.5px solid #c9bba9; }

    .tqv-bar-block {
      margin-bottom: 16px;
    }

    .tqv-bar-head {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #6e6157;
      margin-bottom: 6px;
    }

    .tqv-bar-head strong {
      color: #241d17;
    }

    .tqv-bar-track {
      height: 7px;
      background: #f1e9dc;
      border-radius: 999px;
      overflow: hidden;
    }

    .tqv-bar-fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, #c09c78, #d4a437);
      transition: width 0.35s ease;
    }

    .tqv-bar-fill.is-over {
      background: linear-gradient(90deg, #ef4444, #dc2626);
    }

    .tqv-kpi-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }

    .tqv-kpi {
      padding: 11px 12px;
      border-radius: 12px;
      background: #faf7f2;
      border: 1px solid #ede3d4;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .tqv-kpi-label {
      font-size: 11px;
      font-weight: 600;
      color: #7c6f63;
    }

    .tqv-kpi-val {
      font-size: 20px;
      font-weight: 800;
      color: #241d17;
    }

    .tqv-kpi-val.accent { color: #9b7444; }
    .tqv-kpi-val.success { color: #15803d; }

    .tqv-link-card {
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .tqv-link-copy strong {
      display: block;
      font-size: 14px;
      color: #241d17;
      margin-bottom: 3px;
    }

    .tqv-link-copy span {
      display: block;
      font-size: 12.5px;
      line-height: 1.45;
      color: #6e6157;
    }

    /* Right Column: Roster */
    .tqv-roster-card {
      padding: 22px;
    }

    .tqv-roster-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
    }

    .tqv-roster-head h2 {
      margin: 0 0 3px;
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 24px;
      font-weight: 700;
      color: #241d17;
    }

    .tqv-roster-head p {
      margin: 0;
      font-size: 12.5px;
      color: #7c6f63;
    }

    .tqv-checkin-summary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 11px;
      border-radius: 999px;
      background: rgba(22, 163, 74, 0.1);
      color: #15803d;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
    }

    .tqv-controls {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 16px;
    }

    .tqv-search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 12px;
      height: 40px;
      border-radius: 11px;
      border: 1px solid #dfd2c0;
      background: #faf7f2;
      color: #7c6f63;
    }

    .tqv-search-box:focus-within {
      border-color: #c09c78;
      background: #ffffff;
    }

    .tqv-search-box input {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      font-size: 13.5px;
      color: #241d17;
    }

    .tqv-clear-btn {
      border: none;
      background: transparent;
      color: #7c6f63;
      padding: 4px;
      cursor: pointer;
      display: inline-flex;
    }

    .tqv-filter-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .tqv-filter-pill {
      padding: 5px 11px;
      border-radius: 999px;
      border: 1px solid #e2d6c5;
      background: #ffffff;
      color: #5c5045;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .tqv-filter-pill.active {
      background: #241d17;
      border-color: #241d17;
      color: #faf7f2;
    }

    .tqv-filter-pill.group.active {
      background: #b08857;
      border-color: #b08857;
      color: #ffffff;
    }

    .tqv-guest-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .tqv-guest-item {
      display: flex;
      align-items: center;
      gap: 13px;
      padding: 13px 14px;
      border-radius: 14px;
      background: #faf7f2;
      border: 1px solid #ebe1d3;
      transition: border-color 0.15s ease, background 0.15s ease;
    }

    .tqv-guest-item.is-checked-in {
      background: #ffffff;
      border-color: rgba(22, 163, 74, 0.32);
    }

    .tqv-avatar {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: linear-gradient(145deg, #2a211a, #17120e);
      border: 1px solid rgba(212, 175, 55, 0.4);
      color: #f4d58d;
      font-size: 13px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .tqv-avatar.is-in {
      background: rgba(22, 163, 74, 0.12);
      border-color: rgba(22, 163, 74, 0.35);
      color: #15803d;
    }

    .tqv-guest-body {
      flex: 1;
      min-width: 0;
    }

    .tqv-guest-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 6px;
    }

    .tqv-guest-name {
      margin: 0;
      font-size: 14.5px;
      font-weight: 700;
      color: #241d17;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .tqv-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 9px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      background: #ede6dc;
      color: #6e6157;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .tqv-status-pill.is-in {
      background: rgba(22, 163, 74, 0.13);
      color: #15803d;
    }

    .tqv-guest-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .tqv-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 7px;
      background: #ffffff;
      border: 1px solid #e6dac8;
      font-size: 11.5px;
      font-weight: 600;
      color: #5c5045;
    }

    .tqv-chip svg {
      color: #9b7a52;
      flex-shrink: 0;
    }

    .tqv-chip.group {
      background: rgba(192, 156, 120, 0.14);
      border-color: rgba(192, 156, 120, 0.35);
      color: #7d5b32;
    }

    .tqv-empty-guests {
      padding: 32px 16px;
      text-align: center;
      color: #7c6f63;
      border: 1px dashed #dfd2c0;
      border-radius: 14px;
      background: #faf7f2;
    }

    .tqv-empty-guests p {
      margin: 8px 0 0;
      font-size: 13px;
    }

    /* Buttons */
    .tqv-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      padding: 8px 13px;
      border-radius: 10px;
      font-size: 12.5px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      border: 1px solid transparent;
      transition: background 0.15s ease, border-color 0.15s ease;
    }

    .tqv-btn-ghost {
      background: #ffffff;
      border-color: #dfd2c0;
      color: #241d17;
    }

    .tqv-btn-ghost:hover {
      background: #f5efe6;
    }

    .tqv-btn-dark {
      background: #241d17;
      color: #faf7f2;
    }

    .tqv-btn-dark:hover {
      background: #362c24;
    }

    .tqv-btn-gold {
      background: linear-gradient(135deg, #c9a24b, #a87b23);
      color: #1a140d;
      padding: 11px 16px;
      font-size: 13px;
    }

    .tqv-btn-full {
      width: 100%;
    }

    .tqv-empty-state {
      max-width: 440px;
      margin: 48px auto;
      padding: 36px 24px;
      text-align: center;
    }

    .tqv-empty-state h2 {
      margin: 0 0 8px;
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 26px;
    }

    .tqv-empty-state p {
      margin: 0 0 18px;
      font-size: 13.5px;
      color: #6e6157;
    }

    .tqv-spin {
      animation: tqvSpin 1.1s linear infinite;
    }

    @keyframes tqvSpin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @media (max-width: 820px) {
      .tqv-grid {
        grid-template-columns: 1fr;
      }

      .tqv-main {
        padding: 18px 14px 36px;
      }

      .tqv-event-title {
        font-size: 26px;
      }

      .tqv-roster-card,
      .tqv-table-card {
        padding: 16px;
      }

      .tqv-topbar-inner {
        padding: 10px 14px;
      }

      .tqv-btn span {
        display: none;
      }

      .tqv-btn-full span {
        display: inline;
      }
    }
  `]
})
export class TableQrViewComponent implements OnInit {
  data?: TableQrViewData;
  eventId = '';
  tableId = '';
  search = '';
  statusFilter: 'all' | 'in' | 'pending' = 'all';
  groupFilter = '';
  liveSynced = false;
  refreshing = false;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private auth: AuthService
  ) {}

  get canRefreshLive(): boolean {
    return Boolean(this.auth.isAuthenticated && this.eventId && this.tableId);
  }

  get availableSeats(): number {
    if (!this.data) return 0;
    return Math.max(0, this.data.capacity - this.data.occupied);
  }

  get occupancyPercent(): number {
    if (!this.data || !this.data.capacity) return 0;
    return Math.min(100, Math.round((this.data.occupied / this.data.capacity) * 100));
  }

  get hasCheckInInfo(): boolean {
    return Boolean(this.data?.guests.some((g) => g.checkedIn !== undefined));
  }

  get checkedInGuestsCount(): number {
    return (this.data?.guests || []).filter((g) => g.checkedIn === true).length;
  }

  get checkedInSeatsCount(): number {
    return (this.data?.guests || [])
      .filter((g) => g.checkedIn === true)
      .reduce((acc, g) => acc + (g.seats || 1), 0);
  }

  get uniqueGroups(): string[] {
    const set = new Set<string>();
    for (const g of this.data?.guests || []) {
      if (g.group?.trim()) set.add(g.group.trim());
    }
    return Array.from(set);
  }

  get seatDots(): SeatDot[] {
    if (!this.data) return [];
    const total = Math.min(20, Math.max(1, this.data.capacity || this.data.occupied || 8));
    const checkedInSeats = this.checkedInSeatsCount;
    const occupiedSeats = this.data.occupied;
    const radius = 84;
    const dots: SeatDot[] = [];
    for (let i = 0; i < total; i++) {
      const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
      const cx = Math.round((110 + Math.cos(angle) * radius) * 10) / 10;
      const cy = Math.round((110 + Math.sin(angle) * radius) * 10) / 10;
      const state: SeatDot['state'] =
        i < checkedInSeats ? 'checked_in' : i < occupiedSeats ? 'occupied' : 'available';
      dots.push({ cx, cy, state });
    }
    return dots;
  }

  get filteredGuests(): TableQrGuestItem[] {
    if (!this.data) return [];
    const q = this.search.trim().toLowerCase();
    return this.data.guests.filter((g) => {
      if (this.statusFilter === 'in' && !g.checkedIn) return false;
      if (this.statusFilter === 'pending' && g.checkedIn) return false;
      if (this.groupFilter && (g.group || '').trim() !== this.groupFilter) return false;
      if (!q) return true;
      return (
        g.name.toLowerCase().includes(q) ||
        (g.group || '').toLowerCase().includes(q) ||
        (g.seatLabel || '').toLowerCase().includes(q)
      );
    });
  }

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    this.eventId = qp.get('eid') || '';
    this.tableId = qp.get('tid') || '';
    const encoded = qp.get('d') || '';
    if (encoded) {
      this.data = this.decodePayload(encoded);
    }
    if (this.canRefreshLive) {
      this.refreshLive();
    }
  }

  refreshLive(): void {
    if (!this.canRefreshLive || this.refreshing) return;
    this.refreshing = true;
    this.api.listTables(this.eventId).subscribe({
      next: ({ tables }) => {
        const match = (tables || []).find((t: EventTableModel) => (t._id || t.id) === this.tableId);
        if (match) {
          this.data = {
            eventTitle: this.data?.eventTitle || 'Evento',
            eventDate: this.data?.eventDate,
            venueName: this.data?.venueName,
            floorName: this.data?.floorName || `Nivel ${match.floor || 1}`,
            tableName: match.name,
            capacity: match.capacity,
            occupied: match.occupied || 0,
            invitationSlug: this.data?.invitationSlug,
            guests: (match.guests || []).map((g) => ({
              name: g.name,
              seats: g.seats || 1,
              seatLabel: g.seatLabel,
              group: g.group,
              checkedIn: g.checkedIn
            }))
          };
          this.liveSynced = true;
        }
        this.refreshing = false;
      },
      error: () => {
        this.refreshing = false;
      }
    });
  }

  initials(name: string): string {
    return (name || '?')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('');
  }

  private decodePayload(encoded: string): TableQrViewData | undefined {
    try {
      const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
      const pad = normalized.length % 4 ? '='.repeat(4 - (normalized.length % 4)) : '';
      const binary = atob(normalized + pad);
      const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
      const json = new TextDecoder().decode(bytes);
      const raw = JSON.parse(json);
      return {
        eventTitle: raw.e || 'Evento Especial',
        eventDate: raw.dt || '',
        venueName: raw.v || '',
        floorName: raw.f || 'Planta Baja',
        tableName: raw.t || 'Mesa',
        capacity: Number(raw.c) || 0,
        occupied: Number(raw.o) || 0,
        invitationSlug: raw.s || '',
        guests: Array.isArray(raw.g)
          ? raw.g.map((item: any) => ({
              name: item.n || 'Invitado',
              seats: Number(item.s) || 1,
              seatLabel: item.st || '',
              group: item.gr || '',
              checkedIn: item.ci
            }))
          : []
      };
    } catch {
      return undefined;
    }
  }
}
