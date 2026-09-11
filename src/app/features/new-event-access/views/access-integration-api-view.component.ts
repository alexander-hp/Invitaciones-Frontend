import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EventAccessSession } from '../../../core/models';
import { environment } from '../../../../environments/environment';

export interface PayloadFieldDoc {
  path: string;
  type: string;
  description: string;
  replicateTip: string;
  example: string;
  category: 'event' | 'rsvp' | 'palette' | 'locations' | 'modules' | 'interactive';
}

@Component({
  selector: 'app-access-integration-api-view',
  templateUrl: './access-integration-api-view.component.html',
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
    }
    .nw-filter-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      margin-bottom: 20px;
      background: var(--nw-surface-2, #f5f1ea);
      padding: 10px 14px;
      border-radius: var(--nw-radius-sm, 12px);
      border: 1px solid var(--nw-border, #eadecc);
      width: 100%;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
    }
    .nw-nav-pill-btn {
      height: 42px;
      padding: 0 16px;
      border-radius: var(--nw-radius-sm, 12px);
      border: 1px solid var(--nw-border, #eadecc);
      background: var(--nw-surface, #ffffff);
      color: var(--nw-text-2, #6e6157);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
      transition: all var(--nw-duration, 0.2s) var(--nw-ease, ease);
      box-sizing: border-box;
      vertical-align: middle;
    }
    .nw-nav-pill-btn:hover {
      border-color: var(--nw-accent, #c9a96e);
      color: var(--nw-text, #2e2621);
    }
    .nw-nav-pill-btn.active {
      background: var(--nw-accent, #c9a96e);
      color: #ffffff;
      border-color: var(--nw-accent, #c9a96e);
      box-shadow: var(--nw-shadow-sm);
    }
    .code-box {
      background: #0f172a;
      color: #e2e8f0;
      border-radius: 8px;
      padding: 14px 16px;
      font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
      font-size: 12px;
      line-height: 1.5;
      overflow-x: auto;
      overflow-y: auto;
      position: relative;
      width: 100%;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
    }
    .code-box pre {
      margin: 0;
      min-width: 0;
      max-width: 100%;
      white-space: pre;
    }
    .code-box::-webkit-scrollbar {
      height: 6px;
      width: 6px;
    }
    .code-box::-webkit-scrollbar-track {
      background: rgba(15, 23, 42, 0.6);
      border-radius: 4px;
    }
    .code-box::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.25);
      border-radius: 4px;
    }
    .code-box::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.45);
    }
    .copy-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #f1f5f9;
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 11.5px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.2s;
    }
    .copy-btn:hover {
      background: rgba(255, 255, 255, 0.25);
    }
    .payload-card {
      background: var(--nw-surface, #ffffff);
      border: 1px solid var(--nw-border, #eadecc);
      border-radius: var(--nw-radius-sm, 12px);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      box-shadow: var(--nw-shadow-sm, 0 1px 3px rgba(0,0,0,0.05));
      transition: border-color 0.2s;
      width: 100%;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
    }
    .payload-card:hover {
      border-color: var(--nw-accent, #c9a96e);
    }
  `]
})
export class AccessIntegrationApiViewComponent implements OnInit, OnDestroy {
  @Input() session!: EventAccessSession;
  @Input() token: string = '';

  // Toast State (Patrón Universal)
  message: string = '';
  error: string = '';
  private messageTimeout?: any;
  private errorTimeout?: any;

  // Navigation State
  activeView: 'payload' | 'live' | 'auth' | 'mutations' = 'payload';
  categoryFilter: string = 'all';
  searchQuery: string = '';

  // Collapsible cards state
  collapsedCards: Record<string, boolean> = {
    tokenBox: false,
    eventInfo: false,
    liveViewer: false
  };

  // Live Test State
  liveLoading: boolean = false;
  livePayload: any = null;
  liveStatus: number | null = null;

  // Documentación detallada campo por campo del Payload
  readonly payloadDocs: PayloadFieldDoc[] = [
    {
      path: 'invitation.event.title',
      type: 'string',
      category: 'event',
      description: 'Nombre del evento configurado por los anfitriones (ej. "Nuestra Boda", "XV Sofía").',
      replicateTip: 'Úsalo como título principal <h1> en tu Hero o portada.',
      example: '"Boda María & José"'
    },
    {
      path: 'invitation.event.date',
      type: 'string (ISO 8601 Date)',
      category: 'event',
      description: 'Fecha y hora exacta del evento en formato universal ISO.',
      replicateTip: 'Calcula tu reloj de cuenta regresiva: const diff = new Date(date).getTime() - Date.now(). Extrae días, horas, minutos y segundos.',
      example: '"2026-11-20T18:00:00.000Z"'
    },
    {
      path: 'invitation.event.hosts',
      type: 'string[]',
      category: 'event',
      description: 'Nombres de los anfitriones o festejados.',
      replicateTip: 'Muestra los nombres principales con tipografía de gala o en el subtítulo.',
      example: '["María Fernández", "José Morales"]'
    },
    {
      path: 'invitation.rsvpSettings.deadline',
      type: 'string (ISO 8601 Date)',
      category: 'rsvp',
      description: 'Fecha y hora límite establecida para que los invitados puedan confirmar su asistencia.',
      replicateTip: 'Compara Date.now() > new Date(deadline). Si ya venció, deshabilita el formulario de RSVP y muestra un aviso de confirmación cerrada.',
      example: '"2026-11-01T23:59:59.000Z"'
    },
    {
      path: 'invitation.rsvpSettings.allowMaybe',
      type: 'boolean',
      category: 'rsvp',
      description: 'Indica si se permite a los invitados responder "Tal vez / Por confirmar" además de Sí o No.',
      replicateTip: 'Muestra un tercer radio button u opción "Tal vez" sólo si esta bandera es true.',
      example: 'true'
    },
    {
      path: 'invitation.rsvpSettings.allowCompanionsDefault',
      type: 'boolean',
      category: 'rsvp',
      description: 'Habilita la posibilidad de agregar acompañantes al confirmar asistencia.',
      replicateTip: 'Si es true, muestra un contador de acompañantes numérico (hasta defaultAllowedCompanions) y campos para capturar sus nombres.',
      example: 'true'
    },
    {
      path: 'invitation.rsvpSettings.customQuestions',
      type: 'Array<{ key, label, type, options, required }>',
      category: 'rsvp',
      description: 'Preguntas dinámicas creadas por el anfitrión (ej. preferencias de menú, alergias, autobús de traslado).',
      replicateTip: 'Itera sobre este arreglo para generar inputs dinámicos en tu formulario (text, select, boolean). Envía las respuestas en el POST /rsvp.',
      example: '[{ "key": "menu", "label": "¿Preferencia de menú?", "type": "select", "options": ["Carne", "Pescado", "Vegano"] }]'
    },
    {
      path: 'invitation.content.palette',
      type: '{ primary, secondary, accent }',
      category: 'palette',
      description: 'Colores elegidos por el anfitrión para la estética del evento.',
      replicateTip: 'Inyéctalos directamente como variables CSS en tu :root: --primary, --secondary, --accent para que tu web respete la identidad visual.',
      example: '{ "primary": "#fdfbf7", "secondary": "#ffffff", "accent": "#c9a96e" }'
    },
    {
      path: 'invitation.content.locations',
      type: 'Array<{ type, name, address, mapUrl, wazeUrl, notes }>',
      category: 'locations',
      description: 'Listado de lugares del evento (Ceremonia, Recepción, Fiesta, Tornaboda).',
      replicateTip: 'Genera tarjetas por cada ubicación con botones de navegación directa usando mapUrl (Google Maps) y wazeUrl (Waze).',
      example: '[{ "type": "ceremonia", "name": "Parroquia San Juan", "address": "Av. Reforma 123", "mapUrl": "https://maps.google.com/..." }]'
    },
    {
      path: 'invitation.content.itinerary',
      type: 'Array<{ time, title, description }>',
      category: 'modules',
      description: 'Línea de tiempo u horarios de las diferentes etapas de la celebración.',
      replicateTip: 'Dibuja una línea de tiempo (timeline) vertical o carrusel horizontal ordenado por time.',
      example: '[{ "time": "17:00", "title": "Ceremonia Religiosa" }, { "time": "19:30", "title": "Banquete y Brindis" }]'
    },
    {
      path: 'invitation.content.dressCode',
      type: 'string',
      category: 'modules',
      description: 'Etiqueta requerida para los invitados (ej. "Rigurosa Etiqueta", "Formal", "Playa Guayabera").',
      replicateTip: 'Muestra una tarjeta con un icono de vestimenta, la etiqueta recomendada y las notas de color prohibido/reservado.',
      example: '"Rigurosa Etiqueta: Mujeres vestido largo de noche, Hombres traje oscuro"'
    },
    {
      path: 'invitation.content.giftRegistry',
      type: 'Array<{ store, title, url, imageUrl, note }>',
      category: 'modules',
      description: 'Mesa de regalos en tiendas departamentales (Liverpool, Amazon, etc.).',
      replicateTip: 'Renderiza una cuadrícula de tiendas con sus logotipos y enlaces directos a sus listas externas en target="_blank".',
      example: '[{ "store": "Liverpool", "url": "https://mesaderegalos.liverpool.com.mx/...", "imageUrl": "https://..." }]'
    },
    {
      path: 'invitation.content.digitalEnvelope',
      type: '{ bank, account, clabe, holder, note, qrImageUrl }>',
      category: 'modules',
      description: 'Datos bancarios para regalos en efectivo / transferencia.',
      replicateTip: 'Muestra una tarjeta bancaria elegante con botón de un clic: navigator.clipboard.writeText(digitalEnvelope.clabe).',
      example: '{ "bank": "BBVA", "holder": "María Fernández", "clabe": "012180015487956423" }'
    },
    {
      path: 'invitation.content.musicUrl',
      type: 'string (URL de Audio MP3)',
      category: 'modules',
      description: 'Enlace directo de audio ambiental alojado en almacenamiento seguro CDN.',
      replicateTip: 'Crea un reproductor de audio HTML5: <audio src="musicUrl"> con un botón flotante de Play/Pausa que inicie al primer clic del usuario.',
      example: '"https://storage.googleapis.com/.../cancion.mp3"'
    },
    {
      path: 'invitation.content.gallery',
      type: 'string[] (URLs de Imágenes)',
      category: 'modules',
      description: 'Fotos oficiales de los novios o anfitriones (sesión previa, compromiso).',
      replicateTip: 'Crea una galería fotográfica tipo Masonry o Swiper con visor en Lightbox a pantalla completa.',
      example: '["https://storage.googleapis.com/.../foto1.jpg", "https://storage.googleapis.com/.../foto2.jpg"]'
    },
    {
      path: 'invitation.content.lodging',
      type: 'Array<{ name, description, url }>',
      category: 'modules',
      description: 'Recomendaciones de hoteles y hospedaje para invitados foráneos.',
      replicateTip: 'Muestra tarjetas de hoteles con tarifas de convenio y botones directos de reservación.',
      example: '[{ "name": "Hotel Gran Palacio", "description": "Código de descuento: BODAMJ", "url": "https://..." }]'
    },
    {
      path: 'invitation.content.interactive',
      type: '{ albumEnabled, wishesEnabled, djEnabled, djSongLimit }',
      category: 'interactive',
      description: 'Banderas que habilitan el Álbum Colectivo en Vivo, Muro de Felicitaciones y Peticiones al DJ.',
      replicateTip: 'Habilita los formularios interactivos de subida de fotos, dedicatorias y peticiones musicales conectándolos a sus endpoints POST dedicados.',
      example: '{ "albumEnabled": true, "wishesEnabled": true, "djEnabled": true, "djSongLimit": 3 }'
    }
  ];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // Carga inicial automática del payload en vivo
    this.fetchLivePayload();
  }

  ngOnDestroy(): void {
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
    if (this.errorTimeout) clearTimeout(this.errorTimeout);
  }

  // Slug de la invitación de origen
  invitationSlugOverride: string = '';

  private slugify(text: string): string {
    return (text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  get portalSlug(): string {
    if (this.invitationSlugOverride) return this.invitationSlugOverride;

    // 1. Slug explícito devuelto por el backend
    const fromSession = (this.session as any)?.invitationSlug || (this.session as any)?.invitation?.slug;
    if (fromSession) return fromSession;

    // 2. externalPortalSlug en event
    if (this.session?.event?.externalPortalSlug) {
      return this.session.event.externalPortalSlug;
    }

    // 3. Slug generado a partir del título del evento (ej: "Invitacion Digital Completa Ana y Carlos" -> "invitacion-digital-completa-ana-y-carlos")
    if (this.session?.event?.title) {
      const generated = this.slugify(this.session.event.title);
      if (generated) return generated;
    }

    return '';
  }

  get apiBaseUrl(): string {
    return environment.apiUrl || window.location.origin + '/api';
  }

  get publicInvitationUrl(): string {
    return `${this.apiBaseUrl}/invitations/public/${this.portalSlug}`;
  }

  get bearerHeader(): string {
    return `Authorization: Bearer ${this.token}`;
  }

  // Toasts (Patrón Universal)
  showSuccess(text: string): void {
    this.message = text;
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
    this.messageTimeout = setTimeout(() => { this.message = ''; }, 3500);
  }

  showError(text: string): void {
    this.error = text;
    if (this.errorTimeout) clearTimeout(this.errorTimeout);
    this.errorTimeout = setTimeout(() => { this.error = ''; }, 4000);
  }

  toggleCard(cardName: string): void {
    this.collapsedCards[cardName] = !this.collapsedCards[cardName];
  }

  copyText(text: string, label: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.showSuccess(`✨ ${label} copiado al portapapeles.`);
    }).catch(() => {
      this.showError('No se pudo copiar.');
    });
  }

  get filteredDocs(): PayloadFieldDoc[] {
    const q = this.searchQuery.toLowerCase().trim();
    return this.payloadDocs.filter(doc => {
      const matchCat = this.categoryFilter === 'all' || doc.category === this.categoryFilter;
      const matchQuery = !q || doc.path.toLowerCase().includes(q) || doc.description.toLowerCase().includes(q) || doc.replicateTip.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }

  fetchLivePayload(slugToTry?: string): void {
    const slug = slugToTry || this.portalSlug;
    if (!slug) {
      this.showError('No se encontró el slug de la invitación de origen.');
      return;
    }

    this.liveLoading = true;
    this.livePayload = null;
    this.liveStatus = null;

    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const targetUrl = `${this.apiBaseUrl}/invitations/public/${slug}`;
    this.http.get(targetUrl, { headers, observe: 'response' }).subscribe({
      next: (res) => {
        this.liveLoading = false;
        this.liveStatus = res.status;
        this.livePayload = res.body;
        if (slug !== this.portalSlug) {
          this.invitationSlugOverride = slug;
        }
      },
      error: (err) => {
        const titleSlug = this.slugify(this.session?.event?.title);
        if (slug !== titleSlug && titleSlug) {
          // Intentar automáticamente con el título de la invitación de origen slugificado
          this.fetchLivePayload(titleSlug);
          return;
        }

        this.liveLoading = false;
        this.liveStatus = err.status || 500;
        this.livePayload = err.error || { error: err.message };
        this.showError(`Error al consultar invitación (${this.liveStatus}): ${err.error?.message || 'No encontrada'}`);
      }
    });
  }

  get livePayloadString(): string {
    return this.livePayload ? JSON.stringify(this.livePayload, null, 2) : '';
  }

  get rsvpSnippet(): string {
    return JSON.stringify({
      name: "Juan Pérez",
      email: "juan@ejemplo.com",
      phone: "+52 55 1234 5678",
      status: "confirmed",
      companions: 1,
      companionNames: ["María López"],
      dietaryRestrictions: "Vegetariano",
      message: "¡Muchas felicidades!",
      answers: [
        {
          key: "menu_preferencia",
          answer: "Carne"
        }
      ]
    }, null, 2);
  }
}
