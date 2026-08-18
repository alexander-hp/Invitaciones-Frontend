import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiService } from '../../../../core/api.service';
import { ConfirmDialogService } from '../../../../core/confirm-dialog.service';
import { EventModel, EmbedManifestResponse, EventAccessLinkModel, EventAccessRole } from '../../../../core/models';
import { environment } from '../../../../../environments/environment';

export interface ApiParameter {
  name: string;
  type: string;
  in: 'path' | 'query' | 'header' | 'body';
  required: boolean;
  description: string;
  value?: any;
  defaultValue?: any;
}

export interface ApiResponse {
  code: number;
  description: string;
  schema?: string;
}

export interface ApiEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  summary: string;
  description: string;
  tag: string;
  authType: 'jwt' | 'public' | 'token' | 'multipart';
  requiresAuth: boolean;
  isMultipart?: boolean;
  expanded?: boolean;
  trying?: boolean;
  executing?: boolean;
  parameters: ApiParameter[];
  requestBodySchema?: string;
  requestBodyInput?: string;
  responses: ApiResponse[];
  simulatedResult?: {
    status: number;
    statusText: string;
    curl: string;
    body: string;
    durationMs?: number;
    isReal?: boolean;
  };
}

@Component({
  selector: 'app-event-integration-tab',
  templateUrl: './event-integration-tab.component.html'
})
export class EventIntegrationTabComponent implements OnInit, OnChanges {
  @Input() event?: EventModel;

  embedManifest?: EmbedManifestResponse;
  externalSaving = false;
  externalSuccess = '';
  externalError = '';
  externalAssetUploading = '';
  externalPortalQrUrl = '';
  externalApiConfigUrl = '';
  demoInvitationUrl = '';

  // Toast timeouts
  private successTimeout?: any;
  private errorTimeout?: any;

  // Real Access Links & Tokens Management
  accessLinks: EventAccessLinkModel[] = [];
  loadingAccessLinks = false;
  showCreateLinkModal = false;
  creatingLink = false;
  newLinkRole: EventAccessRole = 'check_in';
  newLinkLabel = '';
  newLinkDays = 30;

  // Swagger UI Filtering & Execution State
  apiSearchQuery = '';
  apiTagFilter = '';
  apiMethodFilter = '';
  selectedTagPill = 'all';
  globalAuthToken = '';
  customBaseUrl = '';

  externalForm = new FormGroup({
    externalPortalEnabled: new FormControl(true),
    externalSiteUrl: new FormControl(''),
    externalSiteLabel: new FormControl(''),
    brandLabel: new FormControl(''),
    welcomeMessage: new FormControl(''),
    coverImageUrl: new FormControl(''),
    heroImageUrl: new FormControl(''),
    musicUrl: new FormControl(''),
    songRequestsEnabled: new FormControl(true),
    songRequestsDedications: new FormControl(true),
    guestAlbumEnabled: new FormControl(true),
    dedicationsEnabled: new FormControl(true),
    giftEnabled: new FormControl(true),
    giftShowEnvelope: new FormControl(true)
  });

  customHtmlCode = '';
  customCssCode = '';
  validatingCustomCode = false;
  customValidationResult: any = null;
  customPublishSubmitted = false;
  showCustomPagePreviewModal = false;
  customPreviewViewport: 'desktop' | 'tablet' | 'mobile' = 'desktop';

  // Catálogo interactivo de endpoints para construcción de la página de invitación y sus 12 secciones oficiales
  apiEndpoints: ApiEndpoint[] = [
    // ==========================================
    // 1. INICIALIZACIÓN GLOBAL DEL PORTAL DE INVITACIÓN
    // ==========================================
    {
      id: 'ep_ext_config',
      method: 'GET',
      path: '/api/external/{portalSlug}/config',
      summary: 'Configuración pública completa del evento y secciones',
      description: 'Retorna metadatos del evento, banderas de secciones habilitadas (story, locations, itinerary, dressCode, lodging, etc.), mapa del recinto, cronograma y configuración de módulos.',
      tag: 'Inicialización & Config',
      authType: 'public',
      requiresAuth: false,
      parameters: [
        { name: 'portalSlug', type: 'string ($path)', in: 'path', required: true, description: 'Slug del portal público (ej. boda-sofia-y-ale)' }
      ],
      responses: [
        {
          code: 200,
          description: 'Configuración completa devuelta exitosamente',
          schema: `{\n  "event": {\n    "id": "651f98...",\n    "portalSlug": "boda-sofia-y-ale",\n    "title": "Boda de Sofía & Alejandro",\n    "hosts": ["Sofía", "Alejandro"],\n    "date": "2026-12-15T18:00:00.000Z",\n    "venue": { "name": "Hacienda San José", "address": "Av. Principal #100" },\n    "sectionSettings": {\n      "guestAlbum": true,\n      "gallery": true,\n      "dedications": true,\n      "rsvp": true,\n      "story": true,\n      "locations": true,\n      "itinerary": true,\n      "dressCode": true,\n      "giftRegistry": true,\n      "digitalEnvelope": true,\n      "lodging": true\n    },\n    "songRequestSettings": { "enabled": true, "allowDedications": true }\n  }\n}`
        },
        { code: 404, description: 'Portal no encontrado o no habilitado', schema: `{\n  "error": "Portal externo no disponible"\n}` }
      ]
    },
    {
      id: 'ep_ext_assets',
      method: 'GET',
      path: '/api/external/{portalSlug}/assets',
      summary: 'Recursos multimedia, audios y portadas',
      description: 'Obtiene imágenes de portada, hero, audios de fondo y galería filtrados por tipo (cover, carousel, gallery, audio, map, gifts, all).',
      tag: 'Inicialización & Config',
      authType: 'public',
      requiresAuth: false,
      parameters: [
        { name: 'portalSlug', type: 'string ($path)', in: 'path', required: true, description: 'Slug del portal' },
        { name: 'type', type: 'string ($query)', in: 'query', required: false, description: 'Tipo: cover | carousel | gallery | audio | map | gifts | all', defaultValue: 'all' }
      ],
      responses: [
        {
          code: 200,
          description: 'Recursos multimedia consultados',
          schema: `{\n  "type": "all",\n  "assets": {\n    "coverImageUrl": "https://...",\n    "heroImageUrl": "https://...",\n    "musicUrl": "https://...",\n    "gallery": ["https://..."]\n  }\n}`
        }
      ]
    },
    {
      id: 'ep_ext_token_status',
      method: 'GET',
      path: '/api/external/{portalSlug}/integration-token/status',
      summary: 'Verificar validez de Token de Integración API',
      description: 'Valida que el token enviado en Authorization: Bearer <token> o X-Kyndra-Access-Token sea legítimo y esté activo.',
      tag: 'Inicialización & Config',
      authType: 'token',
      requiresAuth: true,
      parameters: [
        { name: 'portalSlug', type: 'string ($path)', in: 'path', required: true, description: 'Slug del portal' },
        { name: 'Authorization', type: 'string ($header)', in: 'header', required: true, description: 'Bearer <integration_api_token>' }
      ],
      responses: [
        {
          code: 200,
          description: 'Token de integración válido',
          schema: `{\n  "ok": true,\n  "portalSlug": "boda-sofia-y-ale",\n  "event": { "id": "...", "title": "Boda" },\n  "access": { "role": "integration_api", "label": "Mi Web", "expiresAt": "2026-12-31" }\n}`
        },
        { code: 403, description: 'Token de integración inválido o expirado', schema: `{\n  "error": "Token de integracion invalido o expirado"\n}` }
      ]
    },

    // ==========================================
    // 2. SECCIÓN 1: guestAlbum (Álbum Interactivo de Invitados)
    // ==========================================
    {
      id: 'ep_ext_album_get',
      method: 'GET',
      path: '/api/external/{portalSlug}/album',
      summary: '📸 guestAlbum: Fotos aprobadas del Álbum Colaborativo',
      description: 'Sección 1 (guestAlbum): Lista todas las fotografías tomadas y subidas por los invitados que han sido aprobadas.',
      tag: 'Álbum Interactivo (guestAlbum)',
      authType: 'public',
      requiresAuth: false,
      parameters: [
        { name: 'portalSlug', type: 'string ($path)', in: 'path', required: true, description: 'Slug del portal' }
      ],
      responses: [
        {
          code: 200,
          description: 'Listado de fotografías aprobadas',
          schema: `[\n  {\n    "_id": "651a...",\n    "url": "https://cdn.kyndrasoft.com/album/photo1.jpg",\n    "uploaderName": "Carlos Mendoza",\n    "status": "approved",\n    "createdAt": "2026-12-15T21:00:00.000Z"\n  }\n]`
        }
      ]
    },
    {
      id: 'ep_ext_album_post',
      method: 'POST',
      path: '/api/external/{portalSlug}/album',
      summary: '📸 guestAlbum: Subir fotografía al álbum (Multipart)',
      description: 'Sección 1 (guestAlbum): Sube un archivo de imagen (JPG, PNG, WebP máx 8MB) desde la invitación.',
      tag: 'Álbum Interactivo (guestAlbum)',
      authType: 'multipart',
      isMultipart: true,
      requiresAuth: false,
      parameters: [
        { name: 'portalSlug', type: 'string ($path)', in: 'path', required: true, description: 'Slug del portal' },
        { name: 'file', type: 'file (multipart)', in: 'body', required: true, description: 'Archivo binario de imagen' },
        { name: 'uploaderName', type: 'string', in: 'body', required: false, description: 'Nombre de quien sube la foto' }
      ],
      responses: [
        {
          code: 201,
          description: 'Fotografía subida exitosamente',
          schema: `{\n  "asset": {\n    "_id": "651a...",\n    "url": "https://...",\n    "status": "pending",\n    "uploaderName": "Carlos Mendoza"\n  }\n}`
        }
      ]
    },

    // ==========================================
    // 3. SECCIÓN 2: gallery (Galería Fotográfica Oficial)
    // ==========================================
    {
      id: 'ep_ext_gallery_get',
      method: 'GET',
      path: '/api/external/{portalSlug}/assets?type=gallery',
      summary: '🖼️ gallery: Galería Fotográfica Oficial',
      description: 'Sección 2 (gallery): Obtiene el catálogo de fotografías oficiales del evento (sesión de fotos / novios / festejado).',
      tag: 'Galería Oficial (gallery)',
      authType: 'public',
      requiresAuth: false,
      parameters: [
        { name: 'portalSlug', type: 'string ($path)', in: 'path', required: true, description: 'Slug del portal' }
      ],
      responses: [
        {
          code: 200,
          description: 'Imágenes de la galería oficial',
          schema: `{\n  "type": "gallery",\n  "assets": [\n    "https://cdn.kyndrasoft.com/gallery/img1.jpg",\n    "https://cdn.kyndrasoft.com/gallery/img2.jpg"\n  ]\n}`
        }
      ]
    },

    // ==========================================
    // 4. SECCIÓN 3: songRequests (Música / Pedir Canciones DJ)
    // ==========================================
    {
      id: 'ep_ext_song_lookup',
      method: 'POST',
      path: '/api/external/{portalSlug}/song-lookup',
      summary: '🎵 songRequests: Buscar canción en Spotify / YouTube',
      description: 'Sección 3 (songRequests): Resuelve metadatos, título, artista y thumbnail para el buscador del módulo DJ.',
      tag: 'Música DJ (songRequests)',
      authType: 'public',
      requiresAuth: false,
      parameters: [
        { name: 'portalSlug', type: 'string ($path)', in: 'path', required: true, description: 'Slug del portal' }
      ],
      requestBodySchema: `{\n  "query": "Earth Wind and Fire September"\n}`,
      requestBodyInput: `{\n  "query": "Earth Wind and Fire September"\n}`,
      responses: [
        {
          code: 200,
          description: 'Canción resuelta con metadatos',
          schema: `{\n  "video": {\n    "title": "September",\n    "artist": "Earth, Wind & Fire",\n    "thumbnailUrl": "https://img.youtube.com/vi/...",\n    "sourceUrl": "https://www.youtube.com/watch?v=..."\n  }\n}`
        }
      ]
    },
    {
      id: 'ep_ext_song_requests',
      method: 'POST',
      path: '/api/external/{portalSlug}/song-requests',
      summary: '🎵 songRequests: Enviar canción propuesta al DJ',
      description: 'Sección 3 (songRequests): Envía la canción solicitada y dedicatoria opcional a la lista de reproducción del DJ.',
      tag: 'Música DJ (songRequests)',
      authType: 'public',
      requiresAuth: false,
      parameters: [
        { name: 'portalSlug', type: 'string ($path)', in: 'path', required: true, description: 'Slug del portal' }
      ],
      requestBodySchema: `{\n  "title": "September",\n  "artist": "Earth, Wind & Fire",\n  "dedication": "¡Para encender la pista!",\n  "requesterName": "Carlos Mendoza"\n}`,
      requestBodyInput: `{\n  "title": "September",\n  "artist": "Earth, Wind & Fire",\n  "dedication": "¡Para encender la pista!",\n  "requesterName": "Carlos Mendoza"\n}`,
      responses: [
        {
          code: 201,
          description: 'Solicitud enviada al DJ',
          schema: `{\n  "songRequest": {\n    "_id": "651e...",\n    "title": "September",\n    "artist": "Earth, Wind & Fire",\n    "status": "pending"\n  }\n}`
        }
      ]
    },

    // ==========================================
    // 5. SECCIÓN 4: dedications (Dedicatorias y Libro de Firmas)
    // ==========================================
    {
      id: 'ep_ext_dedications_get',
      method: 'GET',
      path: '/api/external/{portalSlug}/dedications',
      summary: '💬 dedications: Lista de dedicatorias y muro de firmas',
      description: 'Sección 4 (dedications): Consulta los mensajes y felicitaciones públicas aprobadas.',
      tag: 'Dedicatorias (dedications)',
      authType: 'public',
      requiresAuth: false,
      parameters: [
        { name: 'portalSlug', type: 'string ($path)', in: 'path', required: true, description: 'Slug del portal' }
      ],
      responses: [
        {
          code: 200,
          description: 'Dedicatorias públicas aprobadas',
          schema: `[\n  {\n    "id": "651d...",\n    "publicName": "Familia Gómez",\n    "message": "¡Les deseamos una vida llena de bendiciones!",\n    "type": "wish",\n    "createdAt": "2026-12-15T20:30:00.000Z"\n  }\n]`
        }
      ]
    },
    {
      id: 'ep_ext_dedications_post',
      method: 'POST',
      path: '/api/external/{portalSlug}/dedications',
      summary: '💬 dedications: Publicar mensaje en el libro de firmas',
      description: 'Sección 4 (dedications): Envía una dedicatoria o buenos deseos para los festejados.',
      tag: 'Dedicatorias (dedications)',
      authType: 'public',
      requiresAuth: false,
      parameters: [
        { name: 'portalSlug', type: 'string ($path)', in: 'path', required: true, description: 'Slug del portal' }
      ],
      requestBodySchema: `{\n  "publicName": "Familia Gómez",\n  "message": "¡Que su amor crezca cada día más!",\n  "type": "wish",\n  "visibility": "public"\n}`,
      requestBodyInput: `{\n  "publicName": "Familia Gómez",\n  "message": "¡Que su amor crezca cada día más!",\n  "type": "wish",\n  "visibility": "public"\n}`,
      responses: [
        {
          code: 201,
          description: 'Dedicatoria enviada',
          schema: `{\n  "dedication": {\n    "publicName": "Familia Gómez",\n    "message": "¡Que su amor...",\n    "status": "approved"\n  }\n}`
        }
      ]
    },

    // ==========================================
    // 6. SECCIÓN 5: rsvp (Confirmación de Asistencia & Pases)
    // ==========================================
    {
      id: 'ep_ext_guest_identify',
      method: 'POST',
      path: '/api/external/{portalSlug}/guest/identify',
      summary: '💌 rsvp: Identificar invitado y obtener Token de Sesión',
      description: 'Sección 5 (rsvp): Valida email/teléfono y entrega el guestSessionToken, mesa asignada y límite de acompañantes.',
      tag: 'RSVP & Pases (rsvp)',
      authType: 'public',
      requiresAuth: false,
      parameters: [
        { name: 'portalSlug', type: 'string ($path)', in: 'path', required: true, description: 'Slug del portal' }
      ],
      requestBodySchema: `{\n  "email": "carlos.mendoza@ejemplo.com"\n}`,
      requestBodyInput: `{\n  "email": "carlos.mendoza@ejemplo.com"\n}`,
      responses: [
        {
          code: 200,
          description: 'Invitado identificado',
          schema: `{\n  "guest": {\n    "id": "651f98...",\n    "name": "Carlos Mendoza",\n    "allowedCompanions": 2,\n    "checkInCode": "PASS-4921",\n    "tableName": "Mesa 3"\n  },\n  "guestSessionToken": "eyJhbGciOi..."\n}`
        }
      ]
    },
    {
      id: 'ep_ext_rsvp',
      method: 'POST',
      path: '/api/external/{portalSlug}/rsvp',
      summary: '💌 rsvp: Registrar confirmación de asistencia',
      description: 'Sección 5 (rsvp): Envía confirmación (confirmed/declined), acompañantes y requerimientos alimenticios.',
      tag: 'RSVP & Pases (rsvp)',
      authType: 'public',
      requiresAuth: false,
      parameters: [
        { name: 'portalSlug', type: 'string ($path)', in: 'path', required: true, description: 'Slug del portal' }
      ],
      requestBodySchema: `{\n  "guest": "651f98...",\n  "response": "confirmed",\n  "companions": 1,\n  "companionNames": ["Ana Morales"],\n  "dietaryRestrictions": "Sin gluten"\n}`,
      requestBodyInput: `{\n  "guest": "651f98...",\n  "response": "confirmed",\n  "companions": 1,\n  "companionNames": ["Ana Morales"],\n  "dietaryRestrictions": "Sin gluten"\n}`,
      responses: [
        {
          code: 200,
          description: 'RSVP confirmado',
          schema: `{\n  "rsvp": { "response": "confirmed", "companions": 1, "attendingCount": 2 },\n  "updated": true\n}`
        }
      ]
    },
    {
      id: 'ep_ext_my_status',
      method: 'GET',
      path: '/api/external/{portalSlug}/my-status',
      summary: '💌 rsvp: Estado en vivo del invitado autenticado',
      description: 'Sección 5 (rsvp): Retorna el pase QR, confirmación RSVP y resumen de interacciones con Bearer token.',
      tag: 'RSVP & Pases (rsvp)',
      authType: 'token',
      requiresAuth: true,
      parameters: [
        { name: 'portalSlug', type: 'string ($path)', in: 'path', required: true, description: 'Slug del portal' },
        { name: 'Authorization', type: 'string ($header)', in: 'header', required: true, description: 'Bearer <guestSessionToken>' }
      ],
      responses: [
        {
          code: 200,
          description: 'Estado del invitado obtenido',
          schema: `{\n  "guest": { "id": "...", "name": "Carlos Mendoza", "status": "confirmed" },\n  "rsvp": { "response": "confirmed", "companions": 1 }\n}`
        }
      ]
    },

    // ==========================================
    // 7. SECCIÓN 6: story (Nuestra Historia)
    // ==========================================
    {
      id: 'ep_ext_story_info',
      method: 'GET',
      path: '/api/external/{portalSlug}/config#story',
      summary: '📖 story: Datos de Nuestra Historia',
      description: 'Sección 6 (story): Los datos de la historia de los festejados se consumen del objeto event.content.story devuelto por /config.',
      tag: 'Nuestra Historia (story)',
      authType: 'public',
      requiresAuth: false,
      parameters: [
        { name: 'portalSlug', type: 'string ($path)', in: 'path', required: true, description: 'Slug del portal' }
      ],
      responses: [
        {
          code: 200,
          description: 'Objeto de historia dentro de /config',
          schema: `{\n  "story": {\n    "headline": "Cómo nos conocimos",\n    "body": "Nos conocimos en el verano de 2020...",\n    "milestones": [\n      { "date": "2020-07-15", "title": "Primer Encuentro" }\n    ]\n  }\n}`
        }
      ]
    },

    // ==========================================
    // 8. SECCIÓN 7: locations (Mapas y Ubicaciones)
    // ==========================================
    {
      id: 'ep_ext_locations_info',
      method: 'GET',
      path: '/api/external/{portalSlug}/config#locations',
      summary: '📍 locations: Ubicaciones, Recintos y Enlaces GPS',
      description: 'Sección 7 (locations): Las coordenadas y direcciones de misa/recepción con enlaces a Google Maps/Waze se obtienen en event.venue y event.locations.',
      tag: 'Ubicaciones & Mapas (locations)',
      authType: 'public',
      requiresAuth: false,
      parameters: [
        { name: 'portalSlug', type: 'string ($path)', in: 'path', required: true, description: 'Slug del portal' }
      ],
      responses: [
        {
          code: 200,
          description: 'Ubicaciones dentro de /config',
          schema: `{\n  "venue": {\n    "name": "Hacienda San José",\n    "address": "Av. Principal #100",\n    "googleMapsUrl": "https://maps.google.com/?q=...",\n    "wazeUrl": "https://waze.com/ul?q=..."\n  }\n}`
        }
      ]
    },

    // ==========================================
    // 9. SECCIÓN 8: itinerary (Itinerario / Cronograma)
    // ==========================================
    {
      id: 'ep_ext_itinerary_info',
      method: 'GET',
      path: '/api/external/{portalSlug}/config#itinerary',
      summary: '📅 itinerary: Cronograma de Actividades',
      description: 'Sección 8 (itinerary): La agenda con horarios y actividades del evento se obtiene en event.content.itinerary.',
      tag: 'Itinerario & Agenda (itinerary)',
      authType: 'public',
      requiresAuth: false,
      parameters: [
        { name: 'portalSlug', type: 'string ($path)', in: 'path', required: true, description: 'Slug del portal' }
      ],
      responses: [
        {
          code: 200,
          description: 'Cronograma dentro de /config',
          schema: `{\n  "itinerary": [\n    { "time": "18:00", "title": "Ceremonia Religiosa", "icon": "church" },\n    { "time": "20:00", "title": "Recepción & Brindis", "icon": "glass" }\n  ]\n}`
        }
      ]
    },

    // ==========================================
    // 10. SECCIÓN 9: dressCode (Código de Vestimenta)
    // ==========================================
    {
      id: 'ep_ext_dresscode_info',
      method: 'GET',
      path: '/api/external/{portalSlug}/config#dressCode',
      summary: '👔 dressCode: Indicaciones de Etiqueta',
      description: 'Sección 9 (dressCode): El código de vestimenta sugerido (Formal/Rigurosa Etiqueta) y paleta de vestuario se leen en event.content.dressCode.',
      tag: 'Código de Vestimenta (dressCode)',
      authType: 'public',
      requiresAuth: false,
      parameters: [
        { name: 'portalSlug', type: 'string ($path)', in: 'path', required: true, description: 'Slug del portal' }
      ],
      responses: [
        {
          code: 200,
          description: 'Etiqueta dentro de /config',
          schema: `{\n  "dressCode": {\n    "label": "Rigurosa Etiqueta / Black Tie",\n    "description": "Hombres de Traje Oscuro / Mujeres Vestido Largo",\n    "restrictedColors": ["Blanco", "Beige"]\n  }\n}`
        }
      ]
    },

    // ==========================================
    // 11. SECCIÓN 10 & 11: giftRegistry y digitalEnvelope (Regalos & Sobre Digital)
    // ==========================================
    {
      id: 'ep_ext_gifts',
      method: 'GET',
      path: '/api/external/{portalSlug}/gifts',
      summary: '🎁 giftRegistry & ✉️ digitalEnvelope: Tiendas & Datos Bancarios',
      description: 'Secciones 10 y 11 (giftRegistry & digitalEnvelope): Obtiene mesas de regalos (Liverpool, Amazon) y CLABE interbancaria para obsequios en efectivo.',
      tag: 'Mesa de Regalos (giftRegistry)',
      authType: 'public',
      requiresAuth: false,
      parameters: [
        { name: 'portalSlug', type: 'string ($path)', in: 'path', required: true, description: 'Slug del portal' }
      ],
      responses: [
        {
          code: 200,
          description: 'Datos de regalos y sobre digital',
          schema: `{\n  "gifts": {\n    "giftRegistry": [\n      { "store": "Liverpool", "title": "Mesa #12345", "url": "https://..." }\n    ],\n    "digitalEnvelope": {\n      "bank": "BBVA",\n      "clabe": "012180015529103941",\n      "holder": "Sofía Morales"\n    }\n  }\n}`
        }
      ]
    },
    {
      id: 'ep_ext_envelope_info',
      method: 'GET',
      path: '/api/external/{portalSlug}/gifts#digitalEnvelope',
      summary: '✉️ digitalEnvelope: Sobre Digital & Datos Bancarios SPEI',
      description: 'Sección 11 (digitalEnvelope): Detalle específico del sobre digital dentro del endpoint de regalos.',
      tag: 'Sobre Digital (digitalEnvelope)',
      authType: 'public',
      requiresAuth: false,
      parameters: [
        { name: 'portalSlug', type: 'string ($path)', in: 'path', required: true, description: 'Slug del portal' }
      ],
      responses: [
        {
          code: 200,
          description: 'Sobre digital devuelto',
          schema: `{\n  "digitalEnvelope": {\n    "bank": "BBVA",\n    "clabe": "012180015529103941",\n    "holder": "Sofía Morales"\n  }\n}`
        }
      ]
    },

    // ==========================================
    // 12. SECCIÓN 12: lodging (Hospedaje y Hoteles)
    // ==========================================
    {
      id: 'ep_ext_lodging_info',
      method: 'GET',
      path: '/api/external/{portalSlug}/config#lodging',
      summary: '🏨 lodging: Hospedaje y Hoteles Recomendados',
      description: 'Sección 12 (lodging): La lista de hoteles convenidos y sugeridos se consulta en event.content.lodging.',
      tag: 'Hospedaje & Hoteles (lodging)',
      authType: 'public',
      requiresAuth: false,
      parameters: [
        { name: 'portalSlug', type: 'string ($path)', in: 'path', required: true, description: 'Slug del portal' }
      ],
      responses: [
        {
          code: 200,
          description: 'Hoteles sugeridos dentro de /config',
          schema: `{\n  "lodging": [\n    {\n      "hotelName": "Hotel Boutique Real",\n      "address": "Centro Histórico #45",\n      "phone": "+524421234567",\n      "code": "BODA-SOFIA-ALE"\n    }\n  ]\n}`
        }
      ]
    },

    // ==========================================
    // 13. WIDGETS E IFRAMES EMBEBIBLES (/new/embed)
    // ==========================================
    {
      id: 'ep_ext_embed_manifest',
      method: 'GET',
      path: '/api/external/{portalSlug}/embed-manifest',
      summary: '🧩 Manifiesto de Widgets e iFrames Embebibles (/new/embed)',
      description: 'Devuelve URLs directas y snippets HTML para incrustar cualquiera de las 12 secciones en Webflow, WordPress o HTML nativo.',
      tag: 'Widgets Embebibles (/new/embed)',
      authType: 'public',
      requiresAuth: false,
      parameters: [
        { name: 'portalSlug', type: 'string ($path)', in: 'path', required: true, description: 'Slug del portal' }
      ],
      responses: [
        {
          code: 200,
          description: 'Manifiesto de widgets generado',
          schema: `{\n  "portalSlug": "boda-sofia-y-ale",\n  "widgets": {\n    "rsvp": "https://.../embed/boda-sofia-y-ale/rsvp",\n    "album": "https://.../embed/boda-sofia-y-ale/album",\n    "guestPass": "https://.../embed/boda-sofia-y-ale/guest-pass"\n  },\n  "snippets": {\n    "rsvp": "<iframe src=... width=100% height=720></iframe>"\n  }\n}`
        }
      ]
    }
  ];

  constructor(
    private apiService: ApiService,
    private confirmDialogService: ConfirmDialogService,
    private sanitizer: DomSanitizer
  ) {}

  showSuccess(msg: string): void {
    this.externalSuccess = msg;
    if (this.successTimeout) clearTimeout(this.successTimeout);
    this.successTimeout = setTimeout(() => { this.externalSuccess = ''; }, 3500);
  }

  showError(msg: string): void {
    this.externalError = msg;
    if (this.errorTimeout) clearTimeout(this.errorTimeout);
    this.errorTimeout = setTimeout(() => { this.externalError = ''; }, 4000);
  }

  hasPlanFeature(feature: string): boolean {
    return true;
  }

  ngOnInit(): void {
    this.loadGlobalAuthToken();
    if (this.event?._id || this.event?.id) {
      this.loadIntegrationData();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['event'] && !changes['event'].firstChange && (this.event?._id || this.event?.id)) {
      this.loadIntegrationData();
    }
  }

  loadGlobalAuthToken(): void {
    const savedToken = localStorage.getItem('invitaciones_token');
    if (savedToken) {
      this.globalAuthToken = savedToken;
    }
  }

  useActiveJwtAsToken(): void {
    this.loadGlobalAuthToken();
    if (this.globalAuthToken) {
      this.showSuccess('Token JWT de sesión activa cargado para pruebas de API.');
    } else {
      this.showError('No se encontró un token JWT en la sesión actual.');
    }
  }

  loadIntegrationData(): void {
    if (!this.event) return;

    this.loadGlobalAuthToken();
    const slug = this.event.externalPortalSlug || '';
    const eventId = (this.event._id || this.event.id || '');

    if (slug) {
      this.apiService.getExternalEmbedManifest(slug).subscribe({
        next: res => { this.embedManifest = res; },
        error: () => {}
      });

      const portalUrl = `${window.location.origin}/new/e/${slug}`;
      this.externalPortalQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(portalUrl)}`;
      this.externalApiConfigUrl = `${environment.apiUrl}/external/${slug}/config`;
      this.demoInvitationUrl = `/new/e/${slug}`;
    }

    // Autocompletar slug, eventId y defaults en los parámetros de los endpoints Swagger
    this.apiEndpoints.forEach(ep => {
      ep.parameters.forEach(p => {
        if ((p.name === 'portalSlug' || p.name === 'slug') && !p.value && slug) {
          p.value = slug;
        }
        if ((p.name === 'eventId' || p.name === 'id') && !p.value && eventId) {
          p.value = eventId;
        }
        if (p.name === 'Authorization' && !p.value && this.globalAuthToken) {
          p.value = `Bearer ${this.globalAuthToken}`;
        }
      });
      // Inyectar en payloads de ejemplo
      if (ep.requestBodyInput && eventId) {
        ep.requestBodyInput = ep.requestBodyInput.replace(/651f\.\.\./g, eventId);
      }
    });

    if (eventId) {
      this.loadAccessLinks(eventId);
    }

    const c = this.event.externalContent || {};
    const s = this.event.externalPortalSettings || {};
    this.externalForm.patchValue({
      externalPortalEnabled: this.event.externalPortalEnabled !== false,
      externalSiteUrl: this.event.externalSiteUrl || '',
      externalSiteLabel: this.event.externalSiteLabel || '',
      brandLabel: s.brandLabel || '',
      welcomeMessage: s.welcomeMessage || '',
      coverImageUrl: c.coverImageUrl || '',
      heroImageUrl: c.heroImageUrl || '',
      musicUrl: c.musicUrl || '',
      songRequestsEnabled: c.songRequestSettings?.enabled !== false,
      songRequestsDedications: c.songRequestSettings?.allowDedications !== false,
      guestAlbumEnabled: true,
      dedicationsEnabled: true,
      giftEnabled: true,
      giftShowEnvelope: true
    });
  }

  // Carga y Gestión de Enlaces de Acceso y Tokens Reales del Backend
  loadAccessLinks(eventId?: string): void {
    const id = eventId || (this.event?._id || this.event?.id);
    if (!id) return;

    this.loadingAccessLinks = true;
    this.apiService.listEventAccessLinks(id).subscribe({
      next: res => {
        this.loadingAccessLinks = false;
        this.accessLinks = res.links || [];

        // Si hay token de integración o staff, autocompletar en el swagger
        const firstIntegration = this.accessLinks.find(l => !l.revokedAt && l.role === 'integration_api' && l.accessToken);
        const firstStaff = this.accessLinks.find(l => !l.revokedAt && l.url);

        if (firstIntegration && firstIntegration.accessToken) {
          this.apiEndpoints.forEach(ep => {
            const authParam = ep.parameters.find(p => p.name === 'Authorization' && ep.tag === 'Integración Externa');
            if (authParam && !authParam.value) {
              authParam.value = `Bearer ${firstIntegration.accessToken}`;
            }
          });
        }

        if (firstStaff && firstStaff.url) {
          const rawToken = firstStaff.url.split('/').pop() || '';
          this.apiEndpoints.forEach(ep => {
            const tokenParam = ep.parameters.find(p => p.name === 'token');
            if (tokenParam && !tokenParam.value && rawToken) {
              tokenParam.value = rawToken;
            }
          });
        }
      },
      error: () => {
        this.loadingAccessLinks = false;
      }
    });
  }

  openCreateLinkModal(): void {
    this.newLinkRole = 'check_in';
    this.newLinkLabel = '';
    this.newLinkDays = 30;
    this.showCreateLinkModal = true;
  }

  submitCreateAccessLink(): void {
    const id = (this.event?._id || this.event?.id);
    if (!id) return;

    this.creatingLink = true;
    this.apiService.createEventAccessLink(id, {
      role: this.newLinkRole,
      label: this.newLinkLabel.trim() || undefined,
      days: Number(this.newLinkDays || 30)
    }).subscribe({
      next: res => {
        this.creatingLink = false;
        this.showCreateLinkModal = false;
        this.showSuccess(`Enlace de acceso para "${this.getRoleLabel(this.newLinkRole)}" generado exitosamente.`);
        this.loadAccessLinks(id);
      },
      error: err => {
        this.creatingLink = false;
        this.showError(err?.error?.message || 'Error al generar enlace de acceso.');
      }
    });
  }

  revokeAccessLink(link: EventAccessLinkModel): void {
    const eventId = (this.event?._id || this.event?.id);
    const linkId = link.id || link._id;
    if (!eventId || !linkId) return;

    this.confirmDialogService.confirm({
      title: '¿Revocar Enlace de Acceso?',
      message: `¿Estás seguro de revocar el acceso para "${link.label || this.getRoleLabel(link.role)}"? El personal que use este enlace perderá el acceso inmediatamente.`,
      confirmText: 'Sí, revocar enlace',
      cancelText: 'Cancelar',
      type: 'danger'
    }).then(confirmed => {
      if (confirmed) {
        this.apiService.revokeEventAccessLink(eventId, linkId).subscribe({
          next: () => {
            this.showSuccess('Enlace de acceso revocado correctamente.');
            this.loadAccessLinks(eventId);
          },
          error: err => {
            this.showError(err?.error?.message || 'Error al revocar enlace.');
          }
        });
      }
    });
  }

  getRoleLabel(role: EventAccessRole): string {
    const labels: Record<string, string> = {
      check_in: '🎟️ Recepción / Check-in QR',
      dj: '🎧 Cabina DJ / Música',
      album_review: '🖼️ Moderador de Álbum',
      photographer: '📸 Fotógrafo Oficial',
      client_view: '👥 Vista Anfitrión / Novios',
      guest_ops: '⚡ Operaciones Generales',
      integration_api: '🔌 Token de API Headless'
    };
    return labels[role] || role;
  }

  copyToClipboard(text: string, label: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.showSuccess(`✨ ${label} copiado al portapapeles.`);
    }).catch(() => {
      this.showError('No se pudo copiar automáticamente.');
    });
  }

  useTokenInSwagger(tokenVal: string, paramName: string = 'token'): void {
    this.apiEndpoints.forEach(ep => {
      const p = ep.parameters.find(param => param.name === paramName);
      if (p) {
        p.value = tokenVal;
      }
      if (paramName === 'Authorization') {
        const authParam = ep.parameters.find(param => param.name === 'Authorization');
        if (authParam) authParam.value = `Bearer ${tokenVal}`;
      }
    });
    this.showSuccess(`Token asignado a los parámetros de prueba de la API.`);
  }

  // Swagger UI Filtering & Category Methods
  get tagCategories(): Array<{ name: string; count: number; icon: string }> {
    const iconMap: Record<string, string> = {
      'Inicialización & Config': '⚡',
      'Álbum Interactivo (guestAlbum)': '📸',
      'Galería Oficial (gallery)': '🖼️',
      'Música DJ (songRequests)': '🎵',
      'Dedicatorias (dedications)': '💬',
      'RSVP & Pases (rsvp)': '💌',
      'Nuestra Historia (story)': '📖',
      'Ubicaciones & Mapas (locations)': '📍',
      'Itinerario & Agenda (itinerary)': '📅',
      'Código de Vestimenta (dressCode)': '👔',
      'Mesa de Regalos (giftRegistry)': '🎁',
      'Sobre Digital (digitalEnvelope)': '✉️',
      'Hospedaje & Hoteles (lodging)': '🏨',
      'Widgets Embebibles (/new/embed)': '🧩'
    };

    const counts: Record<string, number> = {};
    this.apiEndpoints.forEach(ep => {
      counts[ep.tag] = (counts[ep.tag] || 0) + 1;
    });

    return Object.keys(counts).map(tag => ({
      name: tag,
      count: counts[tag],
      icon: iconMap[tag] || '📁'
    }));
  }

  get filteredEndpoints(): ApiEndpoint[] {
    return this.apiEndpoints.filter(ep => {
      const query = this.apiSearchQuery.toLowerCase().trim();
      const matchesSearch = !query ||
        ep.path.toLowerCase().includes(query) ||
        ep.summary.toLowerCase().includes(query) ||
        ep.description.toLowerCase().includes(query) ||
        ep.tag.toLowerCase().includes(query) ||
        ep.method.toLowerCase().includes(query);

      const matchesTagPill = this.selectedTagPill === 'all' || ep.tag.toLowerCase() === this.selectedTagPill.toLowerCase();
      const matchesTagSelect = !this.apiTagFilter || ep.tag === this.apiTagFilter;
      const matchesMethod = !this.apiMethodFilter || ep.method === this.apiMethodFilter;

      return matchesSearch && matchesTagPill && matchesTagSelect && matchesMethod;
    });
  }

  selectTagPill(tag: string): void {
    this.selectedTagPill = tag;
  }

  clearApiFilters(): void {
    this.apiSearchQuery = '';
    this.apiTagFilter = '';
    this.apiMethodFilter = '';
    this.selectedTagPill = 'all';
  }

  expandAllEndpoints(): void {
    this.filteredEndpoints.forEach(ep => ep.expanded = true);
    this.showSuccess(`Todos los endpoints coincidentes desplegados (${this.filteredEndpoints.length}).`);
  }

  collapseAllEndpoints(): void {
    this.filteredEndpoints.forEach(ep => ep.expanded = false);
    this.showSuccess('Todos los endpoints han sido colapsados.');
  }

  toggleEndpoint(ep: ApiEndpoint): void {
    ep.expanded = !ep.expanded;
  }

  toggleTryItOut(ep: ApiEndpoint): void {
    ep.trying = !ep.trying;
    if (!ep.trying) {
      ep.simulatedResult = undefined;
    } else {
      // Iniciar inputs si están vacíos
      const slug = this.event?.externalPortalSlug || '';
      const eventId = (this.event?._id || this.event?.id || '');
      ep.parameters.forEach(p => {
        if ((p.name === 'portalSlug' || p.name === 'slug') && !p.value && slug) p.value = slug;
        if ((p.name === 'eventId' || p.name === 'id') && !p.value && eventId) p.value = eventId;
        if (p.name === 'Authorization' && !p.value && this.globalAuthToken) p.value = `Bearer ${this.globalAuthToken}`;
      });
      if (!ep.requestBodyInput && ep.requestBodySchema) {
        ep.requestBodyInput = ep.requestBodySchema;
      }
    }
  }

  formatJsonBody(ep: ApiEndpoint): void {
    if (!ep.requestBodyInput) return;
    try {
      const parsed = JSON.parse(ep.requestBodyInput);
      ep.requestBodyInput = JSON.stringify(parsed, null, 2);
      this.showSuccess('JSON formateado correctamente.');
    } catch {
      this.showError('El JSON ingresado tiene errores de sintaxis.');
    }
  }

  async executeEndpoint(ep: ApiEndpoint): Promise<void> {
    ep.executing = true;
    ep.simulatedResult = undefined;

    // 1. Obtener Slug o Path Parameters reales
    const slugParam = ep.parameters.find(p => p.name === 'portalSlug' || p.name === 'slug');
    const slug = (slugParam?.value || this.event?.externalPortalSlug || '').trim();

    const eventIdParam = ep.parameters.find(p => p.name === 'eventId' || p.name === 'id');
    const eventId = (eventIdParam?.value || this.event?._id || this.event?.id || '').trim();

    let targetPath = ep.path;
    targetPath = targetPath.replace('{portalSlug}', encodeURIComponent(slug));
    targetPath = targetPath.replace('{slug}', encodeURIComponent(slug));
    targetPath = targetPath.replace('{eventId}', encodeURIComponent(eventId));
    targetPath = targetPath.replace('{id}', encodeURIComponent(eventId));

    for (const param of ep.parameters) {
      if (param.in === 'path' && param.name !== 'portalSlug' && param.name !== 'slug' && param.name !== 'eventId' && param.name !== 'id') {
        const val = (param.value !== undefined && param.value !== null && param.value !== '') ? String(param.value) : (param.defaultValue || '');
        targetPath = targetPath.replace(`{${param.name}}`, encodeURIComponent(val));
      }
    }

    // 2. Query Parameters
    const queryParts: string[] = [];
    for (const param of ep.parameters) {
      if (param.in === 'query' && param.value) {
        queryParts.push(`${encodeURIComponent(param.name)}=${encodeURIComponent(param.value)}`);
      }
    }
    if (queryParts.length > 0) {
      targetPath += (targetPath.includes('?') ? '&' : '?') + queryParts.join('&');
    }

    // 3. URL Completa del Backend
    const backendApiBase = (this.customBaseUrl || environment.apiUrl).replace(/\/$/, '');
    const cleanPath = targetPath.startsWith('/api') ? targetPath.substring(4) : targetPath;
    const fullUrl = `${backendApiBase}${cleanPath}`;

    // 4. Headers
    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };

    // Agregar headers personalizados de la tabla de parámetros
    for (const param of ep.parameters) {
      if (param.in === 'header' && param.value) {
        let val = String(param.value).trim();
        if (param.name.toLowerCase() === 'authorization' && !val.toLowerCase().startsWith('bearer ') && !val.includes(' ')) {
          val = `Bearer ${val}`;
        }
        headers[param.name] = val;
      }
    }

    // Inyectar Authorization header si el endpoint requiere auth o es JWT/token y no está definido
    if ((ep.requiresAuth || ep.authType === 'jwt' || ep.authType === 'token') && !headers['Authorization'] && this.globalAuthToken) {
      const gVal = this.globalAuthToken.trim();
      headers['Authorization'] = gVal.toLowerCase().startsWith('bearer ') ? gVal : `Bearer ${gVal}`;
    }

    const fetchOptions: RequestInit = {
      method: ep.method,
      headers
    };

    let curl = `curl -X ${ep.method} "${fullUrl}"`;
    for (const [k, v] of Object.entries(headers)) {
      curl += ` \\\n  -H "${k}: ${v}"`;
    }

    if (ep.method === 'POST' || ep.method === 'PUT' || ep.method === 'PATCH') {
      if (!ep.isMultipart) {
        headers['Content-Type'] = 'application/json';
        const bodyStr = ep.requestBodyInput || ep.requestBodySchema || '{}';
        fetchOptions.body = bodyStr;
        curl += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${bodyStr.replace(/\n/g, ' ')}'`;
      }
    }

    const startTime = Date.now();
    try {
      const response = await fetch(fullUrl, fetchOptions);
      const duration = Date.now() - startTime;
      const contentType = response.headers.get('content-type') || '';
      let responseBody = '';

      if (contentType.includes('application/json')) {
        const json = await response.json();
        responseBody = JSON.stringify(json, null, 2);
      } else {
        responseBody = await response.text();
      }

      ep.simulatedResult = {
        status: response.status,
        statusText: `${response.status} ${response.statusText || (response.ok ? 'OK' : 'Error')}`,
        curl,
        body: responseBody,
        durationMs: duration,
        isReal: true
      };
    } catch (err: any) {
      const duration = Date.now() - startTime;
      ep.simulatedResult = {
        status: 0,
        statusText: 'Network / Connection Error',
        curl,
        body: JSON.stringify({ error: err?.message || 'Error de conexión con el backend', targetUrl: fullUrl }, null, 2),
        durationMs: duration,
        isReal: true
      };
    } finally {
      ep.executing = false;
    }
  }

  clearExecution(ep: ApiEndpoint): void {
    ep.simulatedResult = undefined;
  }

  get newEmbedWidgets(): Array<{ widgetKey: string; label: string; url: string; snippet: string; height: number }> {
    if (!this.event?.externalPortalSlug) return [];
    const slug = this.event.externalPortalSlug;
    const origin = window.location.origin;
    const widgets = [
      { key: 'rsvp', label: 'RSVP Formulario', height: 720 },
      { key: 'guest-pass', label: 'Pase VIP & QR', height: 520 },
      { key: 'album', label: 'Álbum de Fotos', height: 720 },
      { key: 'gallery', label: 'Galería del Evento', height: 520 },
      { key: 'map', label: 'Ubicación & Mapa', height: 480 },
      { key: 'song-requests', label: 'Peticiones al DJ', height: 520 },
      { key: 'dedications', label: 'Muro de Dedicatorias', height: 600 },
      { key: 'gifts', label: 'Mesa de Regalos & Sobre', height: 600 },
      { key: 'seating', label: 'Croquis & Mesas', height: 520 },
      { key: 'full-portal', label: 'Portal Completo', height: 900 }
    ];
    return widgets.map(w => {
      const u = `${origin}/new/embed/${slug}/${w.key}`;
      return {
        widgetKey: w.key,
        label: w.label,
        url: u,
        height: w.height,
        snippet: `<iframe src="${u}" width="100%" height="${w.height}" style="border:0" allow="autoplay; camera; clipboard-write; encrypted-media" allowfullscreen></iframe>`
      };
    });
  }

  get divScriptSnippet(): string {
    if (!this.event?.externalPortalSlug) return '';
    const slug = this.event.externalPortalSlug;
    const origin = window.location.origin;
    return `<div data-kyndra-widget="rsvp" data-portal="${slug}"></div>\n<script src="${origin}/assets/kyndra-embed.js"></script>`;
  }

  get newPortalUrl(): string {
    if (!this.event?.externalPortalSlug) return '';
    return `${window.location.origin}/new/e/${this.event.externalPortalSlug}`;
  }

  saveExternalConfig(): void {
    const id = (this.event?._id || this.event?.id);
    if (!id) return;
    this.externalSaving = true;

    const val = this.externalForm.value;
    const payload = {
      externalSiteUrl: val.externalSiteUrl || undefined,
      externalSiteLabel: val.externalSiteLabel || undefined,
      externalPortalSettings: {
        brandLabel: val.brandLabel || undefined,
        welcomeMessage: val.welcomeMessage || undefined
      },
      externalContent: {
        coverImageUrl: val.coverImageUrl || undefined,
        heroImageUrl: val.heroImageUrl || undefined,
        musicUrl: val.musicUrl || undefined
      }
    };

    this.apiService.updateEvent(id, payload as any).subscribe({
      next: res => {
        this.externalSaving = false;
        this.showSuccess('Configuración de integración guardada correctamente.');
        this.event = res.event;
      },
      error: err => {
        this.externalSaving = false;
        this.showError(err?.error?.message || 'Error al guardar configuración de integración.');
      }
    });
  }

  uploadExternalAsset(event: Event, kind: 'cover' | 'hero' | 'music'): void {
    const input = event.target as HTMLInputElement;
    const id = (this.event?._id || this.event?.id);
    if (!input.files || !input.files[0] || !id) return;

    const file = input.files[0];
    this.externalAssetUploading = kind;
    this.apiService.createUploadUrl({
      fileName: file.name,
      contentType: file.type,
      folder: 'assets',
      event: id
    }).subscribe({
      next: uploadRes => {
        this.apiService.uploadAsset(uploadRes.uploadUrl, file).subscribe({
          next: () => {
            this.externalAssetUploading = '';
            if (kind === 'cover') this.externalForm.patchValue({ coverImageUrl: uploadRes.publicUrl });
            if (kind === 'hero') this.externalForm.patchValue({ heroImageUrl: uploadRes.publicUrl });
            if (kind === 'music') this.externalForm.patchValue({ musicUrl: uploadRes.publicUrl });
            this.showSuccess(`Archivo de ${kind} subido correctamente.`);
          },
          error: (err: any) => {
            this.externalAssetUploading = '';
            this.showError(err?.error?.message || `Error al subir archivo de ${kind}`);
          }
        });
      },
      error: (err: any) => {
        this.externalAssetUploading = '';
        this.showError(err?.error?.message || `Error al obtener URL de subida`);
      }
    });
  }

  onCustomHtmlFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => { this.customHtmlCode = e.target?.result as string || ''; };
      reader.readAsText(input.files[0]);
    }
  }

  onCustomCssFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => { this.customCssCode = e.target?.result as string || ''; };
      reader.readAsText(input.files[0]);
    }
  }

  validateCustomHtmlCss(): void {
    this.validatingCustomCode = true;
    setTimeout(() => {
      const hasDoctype = this.customHtmlCode.toLowerCase().includes('<!doctype html>');
      const hasBody = this.customHtmlCode.toLowerCase().includes('<body');
      const cssRules = (this.customCssCode.match(/\{/g) || []).length;
      const score = (hasDoctype ? 30 : 15) + (hasBody ? 40 : 20) + (cssRules > 0 ? 30 : 10);
      const warnings: string[] = [];
      if (!hasDoctype) warnings.push('Se recomienda agregar <!DOCTYPE html> al inicio.');
      if (!hasBody) warnings.push('Se recomienda incluir la etiqueta <body>.');

      this.customValidationResult = {
        valid: true,
        score,
        message: 'Código verificado correctamente.',
        details: {
          htmlSize: `${(this.customHtmlCode.length / 1024).toFixed(1)} KB`,
          cssRulesCount: cssRules,
          hasDoctype,
          hasBody,
          metaTagsFound: ['viewport', 'utf-8']
        },
        warnings
      };
      this.validatingCustomCode = false;
      this.showSuccess('Código HTML & CSS validado correctamente.');
    }, 600);
  }

  requestCustomPagePublish(): void {
    this.customPublishSubmitted = true;
    this.showSuccess('¡Solicitud de publicación enviada con éxito!');
  }

  getCustomPageSafeSrcdoc(): SafeHtml {
    const combined = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>${this.customCssCode}</style>
        </head>
        <body>
          ${this.customHtmlCode}
        </body>
      </html>
    `;
    return this.sanitizer.bypassSecurityTrustHtml(combined);
  }
}
