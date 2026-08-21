import { DocEndpoint, DocEventType, DocAccessRole, DocMemberPermission } from './documentation.models';

export const DOC_CATEGORY_ICONS: Record<string, string> = {
  "Autenticación": "🔐",
  "Eventos": "🌟",
  "Invitaciones": "💌",
  "Invitados (Guests)": "👥",
  "RSVP (Confirmaciones)": "✉️",
  "Mesas y Asientos": "🪑",
  "Álbum Colaborativo": "📸",
  "Solicitudes de Canciones": "🎵",
  "Dedicatorias": "✍️",
  "Regalos y Sobre Digital": "🎁",
  "Dashboard y Métricas": "📊",
  "Check-In con QR": "🎟️",
  "Access Links (Staff / Integración)": "🗝️",
  "Miembros del Equipo": "👥",
  "Assets y Uploads": "📁",
  "Pagos": "💳",
  "Templates": "🎨",
  "Contacto": "💬",
  "Webhooks WhatsApp": "💬",
  "API de Integración Externa": "⚡",
  "Health Check": "🩺"
};

export const DOC_EVENT_TYPES: DocEventType[] = [
  { value: 'boda', label: 'Boda', description: 'Boda / Enlace Nupcial' },
  { value: 'xv', label: 'XV Años', description: 'Fiesta de XV Años' },
  { value: 'graduacion', label: 'Graduación', description: 'Graduación Escolar o Universitaria' },
  { value: 'cumpleanos', label: 'Cumpleaños', description: 'Cumpleaños / Aniversario' },
  { value: 'bautizo', label: 'Bautizo', description: 'Bautizo / Primera Comunión' },
  { value: 'otro', label: 'Otro', description: 'Evento Corporativo o Personalizado' }
];

export const DOC_ACCESS_ROLES: DocAccessRole[] = [
  { role: 'check_in', permissions: 'Check-in con código QR', useCase: 'Personal de puerta / Recepción' },
  { role: 'album_review', permissions: 'Revisar y moderar fotos de invitados', useCase: 'Organizador / Asistente' },
  { role: 'photographer', permissions: 'Subir fotos directamente al álbum', useCase: 'Fotógrafo oficial' },
  { role: 'album_view', permissions: 'Ver fotos del álbum en tiempo real', useCase: 'Pantalla gigante en salón' },
  { role: 'client_view', permissions: 'Ver lista de confirmaciones y mesas', useCase: 'Anfitriones / Novios' },
  { role: 'guest_ops', permissions: 'Check-in + álbum + vista de clientes', useCase: 'Coordinador general del evento' },
  { role: 'dj', permissions: 'Ver y moderar canciones pedidas', useCase: 'DJ / Sonido' },
  { role: 'integration_api', permissions: 'Consumir API REST externa', useCase: 'Sitio web externo / Webflow / WordPress' }
];

export const DOC_MEMBER_PERMISSIONS: DocMemberPermission[] = [
  { permission: 'view_event', description: 'Ver información general y configuración del evento' },
  { permission: 'edit_event', description: 'Editar detalles, itinerario, portadas y textos' },
  { permission: 'view_metrics', description: 'Consultar métricas y analíticas de asistencia' },
  { permission: 'manage_guests', description: 'Crear, editar, importar y exportar invitados' },
  { permission: 'manage_tables', description: 'Gestionar croquis de mesas y asignación de asientos' },
  { permission: 'check_in', description: 'Escanear QR y marcar asistencia de invitados' },
  { permission: 'review_album', description: 'Aprobar o rechazar fotos del álbum colaborativo' },
  { permission: 'review_dedications', description: 'Moderar mensajes del libro de visitas' },
  { permission: 'manage_songs', description: 'Aprobar y marcar canciones reproducidas' },
  { permission: 'view_payments', description: 'Ver planes y estados de facturación' }
];

export const DOC_ENDPOINTS: DocEndpoint[] = [
  {
    "method": "POST",
    "path": "/api/auth/register",
    "summary": "Registra un nuevo usuario",
    "tag": "Autenticación",
    "auth": "Público",
    "desc": "Registra un nuevo usuario.",
    "payload": "{\n  \"name\": \"string (mín. 2 caracteres)\",\n  \"email\": \"string (email válido)\",\n  \"password\": \"string (mín. 8 caracteres)\",\n  \"role\": \"client | organizer | venue_owner | vendor\",\n  \"accountType\": \"client | organizer | venue_owner | vendor | planner | staff\"\n}",
    "response": "{\n  \"user\": { \"id\", \"name\", \"email\", \"role\", \"accountType\" },\n  \"token\": \"JWT string\"\n}"
  },
  {
    "method": "POST",
    "path": "/api/auth/login",
    "summary": "Inicia sesión con email y contraseña",
    "tag": "Autenticación",
    "auth": "Público",
    "desc": "Inicia sesión con email y contraseña.",
    "payload": "{\n  \"email\": \"string\",\n  \"password\": \"string\"\n}",
    "response": "{\n  \"user\": { \"id\", \"name\", \"email\", \"role\", \"accountType\" },\n  \"token\": \"JWT string\"\n}"
  },
  {
    "method": "POST",
    "path": "/api/auth/social",
    "summary": "Login social con Google, Facebook o Apple",
    "tag": "Autenticación",
    "auth": "Público",
    "desc": "Login social con Google, Facebook o Apple.",
    "payload": "{\n  \"provider\": \"google | facebook | apple\",\n  \"idToken\": \"string (opcional)\",\n  \"accessToken\": \"string (opcional)\",\n  \"profile\": {\n    \"email\": \"string (requerido)\",\n    \"name\": \"string (opcional)\",\n    \"providerUserId\": \"string (opcional)\",\n    \"avatarUrl\": \"string URL (opcional)\"\n  },\n  \"role\": \"client | organizer | venue_owner | vendor\",\n  \"accountType\": \"client | organizer | venue_owner | vendor | planner | staff\"\n}",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/auth/password-reset",
    "summary": "Solicita un reset de contraseña",
    "tag": "Autenticación",
    "auth": "Público",
    "desc": "Solicita un reset de contraseña.",
    "payload": "{\n  \"email\": \"string\"\n}",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/auth/password-reset/confirm",
    "summary": "Confirma el reset de contraseña con el token recibido por email",
    "tag": "Autenticación",
    "auth": "Público",
    "desc": "Confirma el reset de contraseña con el token recibido por email.",
    "payload": "{\n  \"token\": \"string (mín. 32 caracteres)\",\n  \"password\": \"string (mín. 8 caracteres)\"\n}",
    "response": ""
  },
  {
    "method": "GET",
    "path": "/api/auth/me",
    "summary": "Devuelve el perfil del usuario autenticado",
    "tag": "Autenticación",
    "auth": "JWT Bearer",
    "desc": "Devuelve el perfil del usuario autenticado.",
    "payload": "",
    "response": "{\n  \"user\": { \"id\", \"name\", \"email\", \"role\", \"accountType\", \"avatarUrl\", \"plan\" }\n}"
  },
  {
    "method": "GET",
    "path": "/api/events",
    "summary": "Lista todos los eventos del usuario (propios + donde es miembro)",
    "tag": "Eventos",
    "auth": "JWT Bearer",
    "desc": "Lista todos los eventos del usuario (propios + donde es miembro).",
    "payload": "",
    "response": "{\n  \"events\": [\n    {\n      \"_id\": \"string\",\n      \"mode\": \"invitation | external_dashboard\",\n      \"type\": \"boda | xv | graduacion | cumpleanos | bautizo | otro\",\n      \"title\": \"string\",\n      \"hosts\": [\"string\"],\n      \"date\": \"ISO date\",\n      \"venue\": { \"name\", \"address\", \"mapUrl\" },\n      \"agenda\": [{ \"time\", \"title\", \"description\" }],\n      \"status\": \"draft | published | archived\",\n      \"externalPortalSlug\": \"string\",\n      \"externalPortalEnabled\": true,\n      \"externalPortalSettings\": { },\n      \"externalContent\": { },\n      \"access\": {\n        \"owner\": true,\n        \"permissions\": [\"view_event\", \"edit_event\"]\n      }\n    }\n  ]\n}"
  },
  {
    "method": "POST",
    "path": "/api/events",
    "summary": "Crea un nuevo evento",
    "tag": "Eventos",
    "auth": "JWT Bearer",
    "desc": "Crea un nuevo evento.",
    "payload": "{\n  \"type\": \"boda | xv | graduacion | cumpleanos | bautizo | otro\",\n  \"title\": \"string (mín. 2)\",\n  \"mode\": \"invitation | external_dashboard\",\n  \"hosts\": [\"string\"],\n  \"date\": \"ISO date string\",\n  \"venue\": {\n    \"name\": \"string\",\n    \"address\": \"string\",\n    \"mapUrl\": \"string URL\"\n  },\n  \"agenda\": [\n    { \"time\": \"string\", \"title\": \"string\", \"description\": \"string\" }\n  ],\n  \"status\": \"draft | published | archived\",\n  \"externalSiteUrl\": \"string URL\",\n  \"externalSiteLabel\": \"string (máx. 120)\",\n  \"externalPortalSlug\": \"string (3-80, solo a-z 0-9 y guiones)\",\n  \"externalPortalEnabled\": true,\n  \"externalPortalSettings\": {\n    \"rsvpEnabled\": true,\n    \"albumEnabled\": true,\n    \"passEnabled\": true,\n    \"calendarEnabled\": true,\n    \"showLocation\": true,\n    \"brandLabel\": \"string\",\n    \"welcomeMessage\": \"string (máx. 600)\"\n  },\n  \"externalContent\": {\n    \"coverImageUrl\": \"URL\",\n    \"heroImageUrl\": \"URL\",\n    \"gallery\": [\"URL\"],\n    \"carousel\": [\"URL\"],\n    \"spectacularImages\": [\"URL\"],\n    \"musicUrl\": \"URL\",\n    \"audioSections\": [{ \"title\": \"\", \"url\": \"URL\", \"description\": \"\" }],\n    \"sectionMusic\": { \"sectionKey\": \"URL\" },\n    \"locations\": [\n      {\n        \"type\": \"string\",\n        \"name\": \"string\",\n        \"address\": \"string\",\n        \"mapUrl\": \"URL\",\n        \"wazeUrl\": \"URL\",\n        \"notes\": \"string\",\n        \"time\": \"string\"\n      }\n    ],\n    \"sections\": [\n      {\n        \"key\": \"string\",\n        \"type\": \"text | image | video | cta | iframe | timeline | story | dress_code | gift_registry | dedications | lodging | faq | people\",\n        \"title\": \"string\",\n        \"body\": \"string\",\n        \"url\": \"URL\",\n        \"imageUrl\": \"URL\",\n        \"roles\": [\"string\"],\n        \"order\": 0\n      }\n    ],\n    \"rsvpSettings\": {\n      \"deadline\": \"ISO date\",\n      \"allowMaybe\": true,\n      \"allowChangesUntilDeadline\": true,\n      \"declineRequiresConfirmation\": true,\n      \"reminderDaysBeforeDeadline\": 3,\n      \"customQuestions\": [\n        {\n          \"key\": \"string\",\n          \"label\": \"string\",\n          \"type\": \"text | textarea | select | boolean\",\n          \"required\": false,\n          \"options\": [\"string\"]\n        }\n      ]\n    },\n    \"songRequestSettings\": {\n      \"enabled\": true,\n      \"maxRequestsPerGuest\": 3,\n      \"allowDedications\": true,\n      \"requireApproval\": true\n    },\n    \"moderationSettings\": {\n      \"notifyOnReview\": true,\n      \"autoApproveRoles\": [\"string\"],\n      \"autoApproveGroups\": [\"string\"],\n      \"autoApproveEmails\": [\"email\"],\n      \"autoApprovePhones\": [\"string\"],\n      \"autoApproveAlbum\": false,\n      \"autoApproveSongs\": false,\n      \"autoApproveDedications\": false\n    },\n    \"giftRegistry\": [\n      {\n        \"store\": \"string\",\n        \"title\": \"string\",\n        \"label\": \"string\",\n        \"url\": \"URL\",\n        \"imageUrl\": \"URL\",\n        \"note\": \"string\",\n        \"priority\": 0\n      }\n    ],\n    \"digitalEnvelope\": {\n      \"bank\": \"string\",\n      \"account\": \"string\",\n      \"clabe\": \"string\",\n      \"holder\": \"string\",\n      \"note\": \"string\",\n      \"qrImageUrl\": \"URL\"\n    },\n    \"giftSettings\": {\n      \"enabled\": true,\n      \"introText\": \"string (máx. 600)\",\n      \"showRegistry\": true,\n      \"showEnvelope\": true\n    },\n    \"dedicationSettings\": {\n      \"enabled\": true,\n      \"requireApproval\": true,\n      \"introText\": \"string (máx. 600)\"\n    }\n  }\n}",
    "response": "{ \"event\": { } }"
  },
  {
    "method": "GET",
    "path": "/api/events/:id",
    "summary": "Obtiene los detalles de un evento (propio o donde es miembro)",
    "tag": "Eventos",
    "auth": "JWT Bearer",
    "desc": "Obtiene los detalles de un evento (propio o donde es miembro).",
    "payload": "",
    "response": "{\n  \"event\": { },\n  \"access\": {\n    \"owner\": true,\n    \"permissions\": [\"view_event\", \"edit_event\", \"manage_guests\"]\n  }\n}"
  },
  {
    "method": "PATCH",
    "path": "/api/events/:id",
    "summary": "Actualiza un evento (solo el owner). Acepta cualquier campo parcial del body de creación",
    "tag": "Eventos",
    "auth": "JWT Bearer",
    "desc": "Actualiza un evento (solo el owner). Acepta cualquier campo parcial del body de creación.",
    "payload": "",
    "response": ""
  },
  {
    "method": "GET",
    "path": "/api/events/public/:portalSlug",
    "summary": "Obtiene la información pública de un evento por su slug de portal externo",
    "tag": "Eventos",
    "auth": "Público",
    "desc": "Obtiene la información pública de un evento por su slug de portal externo.",
    "payload": "",
    "response": "{\n  \"event\": {\n    \"id\": \"string\",\n    \"mode\": \"external_dashboard\",\n    \"type\": \"boda\",\n    \"title\": \"string\",\n    \"hosts\": [],\n    \"date\": \"ISO\",\n    \"venue\": {},\n    \"agenda\": [],\n    \"externalSiteUrl\": \"URL\",\n    \"externalSiteLabel\": \"string\",\n    \"externalPortalSlug\": \"string\",\n    \"externalPortalEnabled\": true,\n    \"externalPortalSettings\": { }\n  }\n}"
  },
  {
    "method": "POST",
    "path": "/api/events/public/:portalSlug/guest-access",
    "summary": "Permite a un invitado identificarse con su email en el portal externo",
    "tag": "Eventos",
    "auth": "Público",
    "desc": "Permite a un invitado identificarse con su email en el portal externo.",
    "payload": "{ \"email\": \"invitado@email.com\" }",
    "response": "{\n  \"guest\": {\n    \"id\": \"string\",\n    \"name\": \"string\",\n    \"email\": \"string\",\n    \"allowedCompanions\": 2,\n    \"status\": \"pending | confirmed | declined\",\n    \"communicationStatus\": \"string\",\n    \"checkInCode\": \"ABC123\",\n    \"qrCode\": \"string\",\n    \"tableName\": \"Mesa 1\",\n    \"seatLabel\": \"1\",\n    \"companions\": []\n  }\n}"
  },
  {
    "method": "GET",
    "path": "/api/events/public/:portalSlug/guest-token/:token",
    "summary": "Acceso por token personalizado de invitado (link directo)",
    "tag": "Eventos",
    "auth": "Público",
    "desc": "Acceso por token personalizado de invitado (link directo).",
    "payload": "",
    "response": ""
  },
  {
    "method": "GET",
    "path": "/api/events/public/:portalSlug/album",
    "summary": "Obtiene fotos aprobadas del álbum del evento",
    "tag": "Eventos",
    "auth": "Público",
    "desc": "Obtiene fotos aprobadas del álbum del evento.",
    "payload": "",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/events/public/:portalSlug/album",
    "summary": "Sube una foto al álbum del evento desde el portal público. `file` multipart (máx 8MB)",
    "tag": "Eventos",
    "auth": "Multipart / JWT",
    "desc": "Sube una foto al álbum del evento desde el portal público. `file` multipart (máx 8MB).",
    "payload": "",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/events/:eventId/send-email",
    "summary": "Envío masivo de emails a invitados de un evento",
    "tag": "Eventos",
    "auth": "JWT Bearer",
    "desc": "Envío masivo de emails a invitados de un evento.",
    "payload": "{\n  \"confirm\": true,\n  \"messageType\": \"invitation | reminder | event_reminder | location_change | thanks\",\n  \"guestIds\": [\"id1\", \"id2\"]\n}",
    "response": "{\n  \"requested\": 50,\n  \"sent\": 48,\n  \"skipped\": 0,\n  \"failed\": 2,\n  \"results\": [\n    { \"guest\": \"guestId\", \"status\": \"sent\" },\n    { \"guest\": \"guestId\", \"status\": \"failed\", \"error\": \"...\" }\n  ]\n}"
  },
  {
    "method": "GET",
    "path": "/api/invitations",
    "summary": "Lista todas las invitaciones del usuario",
    "tag": "Invitaciones",
    "auth": "JWT Bearer",
    "desc": "Lista todas las invitaciones del usuario.",
    "payload": "",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/invitations",
    "summary": "Crea una nueva invitación vinculada a un evento",
    "tag": "Invitaciones",
    "auth": "JWT Bearer",
    "desc": "Crea una nueva invitación vinculada a un evento.",
    "payload": "{\n  \"event\": \"eventId (requerido)\",\n  \"template\": \"templateId (opcional)\",\n  \"slug\": \"mi-boda-2026 (opcional, se genera automático)\",\n  \"accessMode\": \"open | public | guest_list | specific_users\",\n  \"rsvpSettings\": {\n    \"deadline\": \"ISO date\",\n    \"allowMaybe\": true,\n    \"allowChangesUntilDeadline\": true,\n    \"declineRequiresConfirmation\": true,\n    \"reminderDaysBeforeDeadline\": 3,\n    \"identityMethods\": [\"email\", \"phone\"],\n    \"allowCompanionsDefault\": false,\n    \"defaultAllowedCompanions\": 0,\n    \"maxAttendees\": 200,\n    \"allowedGuestIds\": [\"guestId\"],\n    \"allowedRoles\": [\"familia\"],\n    \"allowedGroups\": [\"grupo-a\"],\n    \"allowedEmails\": [\"email@example.com\"],\n    \"allowedPhones\": [\"+5212345678\"],\n    \"customQuestions\": [\n      {\n        \"key\": \"dietary\",\n        \"label\": \"¿Tienes restricciones alimenticias?\",\n        \"type\": \"text | textarea | select | boolean\",\n        \"required\": false,\n        \"options\": [\"Vegano\", \"Sin gluten\"]\n      }\n    ]\n  },\n  \"content\": {\n    \"headline\": \"string\",\n    \"subheadline\": \"string\",\n    \"message\": \"string\",\n    \"palette\": { \"primary\": \"#hex\", \"secondary\": \"#hex\", \"accent\": \"#hex\" },\n    \"musicUrl\": \"URL\",\n    \"sectionMusic\": { \"hero\": \"URL\", \"gallery\": \"URL\" },\n    \"coverImageUrl\": \"URL\",\n    \"gallery\": [\"URL\"],\n    \"itinerary\": [{ \"time\": \"18:00\", \"title\": \"Ceremonia\", \"description\": \"\" }],\n    \"locations\": [\n      { \"type\": \"ceremonia\", \"name\": \"Iglesia\", \"address\": \"...\", \"mapUrl\": \"URL\", \"wazeUrl\": \"URL\", \"notes\": \"\" }\n    ],\n    \"dressCode\": \"Formal\",\n    \"giftRegistry\": [\n      { \"store\": \"Liverpool\", \"title\": \"Mesa de regalos\", \"label\": \"\", \"url\": \"URL\", \"imageUrl\": \"URL\", \"note\": \"\", \"priority\": 0 }\n    ],\n    \"digitalEnvelope\": { \"bank\": \"\", \"account\": \"\", \"clabe\": \"\", \"holder\": \"\", \"note\": \"\", \"qrImageUrl\": \"URL\" },\n    \"giftSettings\": { \"enabled\": true, \"introText\": \"\", \"showRegistry\": true, \"showEnvelope\": true },\n    \"dedicationSettings\": { \"enabled\": true, \"requireApproval\": true, \"introText\": \"\" },\n    \"moderationSettings\": { \"notifyOnReview\": true, \"autoApproveAlbum\": false, \"autoApproveDedications\": false },\n    \"sectionSettings\": {\n      \"story\": true, \"locations\": true, \"itinerary\": true, \"dressCode\": true,\n      \"rsvp\": true, \"giftRegistry\": true, \"digitalEnvelope\": true,\n      \"lodging\": true, \"gallery\": true, \"guestAlbum\": true, \"dedications\": true\n    },\n    \"lodging\": [{ \"name\": \"Hotel\", \"description\": \"\", \"url\": \"URL\" }],\n    \"brandLogoUrl\": \"URL\",\n    \"hideBranding\": false,\n    \"privateAlbumEnabled\": true\n  }\n}",
    "response": "{\n  \"invitation\": { },\n  \"publicUrl\": \"https://tu-dominio.com/i/mi-boda-2026\"\n}"
  },
  {
    "method": "PATCH",
    "path": "/api/invitations/:id",
    "summary": "Actualiza una invitación existente (mismos campos que creación, parcial)",
    "tag": "Invitaciones",
    "auth": "JWT Bearer",
    "desc": "Actualiza una invitación existente (mismos campos que creación, parcial).",
    "payload": "",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/invitations/:id/publish",
    "summary": "Publica una invitación (la hace accesible públicamente)",
    "tag": "Invitaciones",
    "auth": "JWT Bearer",
    "desc": "Publica una invitación (la hace accesible públicamente).",
    "payload": "",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/invitations/:id/unpublish",
    "summary": "Despublica una invitación",
    "tag": "Invitaciones",
    "auth": "JWT Bearer",
    "desc": "Despublica una invitación.",
    "payload": "",
    "response": ""
  },
  {
    "method": "GET",
    "path": "/api/invitations/public/:slug",
    "summary": "Obtiene la invitación pública por su slug",
    "tag": "Invitaciones",
    "auth": "Público",
    "desc": "Obtiene la invitación pública por su slug.",
    "payload": "",
    "response": "{\n  \"invitation\": {\n    \"id\": \"string\",\n    \"slug\": \"mi-boda-2026\",\n    \"status\": \"published\",\n    \"accessMode\": \"open\",\n    \"rsvpSettings\": { },\n    \"content\": { },\n    \"publishedAt\": \"ISO date\",\n    \"event\": { \"id\", \"type\", \"title\", \"hosts\", \"date\", \"venue\", \"agenda\" },\n    \"template\": { \"id\", \"name\", \"eventType\", \"tier\", \"previewImageUrl\", \"config\" }\n  }\n}"
  },
  {
    "method": "GET",
    "path": "/api/invitations/public/:slug/album",
    "summary": "Obtiene las fotos aprobadas del álbum de la invitación",
    "tag": "Invitaciones",
    "auth": "Público",
    "desc": "Obtiene las fotos aprobadas del álbum de la invitación.",
    "payload": "",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/invitations/public/:slug/album-upload",
    "summary": "Sube una foto al álbum de la invitación. `file` multipart",
    "tag": "Invitaciones",
    "auth": "Multipart / JWT",
    "desc": "Sube una foto al álbum de la invitación. `file` multipart.",
    "payload": "",
    "response": ""
  },
  {
    "method": "GET",
    "path": "/api/invitations/public/:slug/dedications",
    "summary": "Lista las dedicatorias aprobadas y públicas de la invitación",
    "tag": "Invitaciones",
    "auth": "Público",
    "desc": "Lista las dedicatorias aprobadas y públicas de la invitación.",
    "payload": "",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/invitations/public/:slug/dedications",
    "summary": "Crea una dedicatoria en la invitación",
    "tag": "Invitaciones",
    "auth": "Público",
    "desc": "Crea una dedicatoria en la invitación.",
    "payload": "{\n  \"guest\": \"guestId (opcional)\",\n  \"publicName\": \"string (mín. 2, máx. 120)\",\n  \"email\": \"string (opcional)\",\n  \"message\": \"string (2-1000 caracteres, requerido)\",\n  \"type\": \"dedication | wish | memory | toast\",\n  \"visibility\": \"public | hosts_only\"\n}",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/invitations/public/:slug/guest-access",
    "summary": "Identifica a un invitado por email o teléfono",
    "tag": "Invitaciones",
    "auth": "Público",
    "desc": "Identifica a un invitado por email o teléfono.",
    "payload": "{\n  \"email\": \"string (opcional)\",\n  \"phone\": \"string (opcional, mín. 6)\"\n}",
    "response": ""
  },
  {
    "method": "GET",
    "path": "/api/invitations/public/:slug/guest-token/:token",
    "summary": "Acceso por token personalizado de invitado (link directo en la invitación)",
    "tag": "Invitaciones",
    "auth": "Público",
    "desc": "Acceso por token personalizado de invitado (link directo en la invitación).",
    "payload": "",
    "response": ""
  },
  {
    "method": "GET",
    "path": "/api/guests/event/:eventId",
    "summary": "Lista todos los invitados de un evento",
    "tag": "Invitados (Guests)",
    "auth": "JWT Bearer",
    "desc": "Lista todos los invitados de un evento.",
    "payload": "",
    "response": ""
  },
  {
    "method": "GET",
    "path": "/api/guests/event/:eventId/export",
    "summary": "Exporta la lista de invitados como CSV",
    "tag": "Invitados (Guests)",
    "auth": "JWT Bearer",
    "desc": "Exporta la lista de invitados como CSV.",
    "payload": "",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/guests",
    "summary": "Crea un invitado",
    "tag": "Invitados (Guests)",
    "auth": "JWT Bearer",
    "desc": "Crea un invitado.",
    "payload": "{\n  \"event\": \"eventId (requerido)\",\n  \"name\": \"string (mín. 2, requerido)\",\n  \"email\": \"string email (opcional)\",\n  \"phone\": \"string (opcional)\",\n  \"group\": \"string (opcional)\",\n  \"roles\": [\"familia\", \"amigos\"],\n  \"tags\": [\"vip\", \"vegetariano\"],\n  \"relationshipLabel\": \"string (opcional)\",\n  \"visibilityGroup\": \"string (opcional)\",\n  \"tableName\": \"string (nombre de mesa, opcional)\",\n  \"seatLabel\": \"string (etiqueta de asiento, opcional)\",\n  \"companions\": [\n    {\n      \"name\": \"string\",\n      \"tableName\": \"string\",\n      \"seatLabel\": \"string\",\n      \"checkedIn\": false\n    }\n  ],\n  \"allowedCompanions\": 2,\n  \"checkedIn\": false\n}",
    "response": ""
  },
  {
    "method": "PATCH",
    "path": "/api/guests/:id",
    "summary": "Actualiza un invitado (todos los campos parciales excepto `event`)",
    "tag": "Invitados (Guests)",
    "auth": "JWT Bearer",
    "desc": "Actualiza un invitado (todos los campos parciales excepto `event`).",
    "payload": "",
    "response": ""
  },
  {
    "method": "DELETE",
    "path": "/api/guests/:id",
    "summary": "Elimina un invitado",
    "tag": "Invitados (Guests)",
    "auth": "JWT Bearer",
    "desc": "Elimina un invitado.",
    "payload": "",
    "response": ""
  },
  {
    "method": "PATCH",
    "path": "/api/guests/:id/communication",
    "summary": "Actualiza el estado de comunicación del invitado",
    "tag": "Invitados (Guests)",
    "auth": "JWT Bearer",
    "desc": "Actualiza el estado de comunicación del invitado.",
    "payload": "{\n  \"communicationStatus\": \"pending | sent | delivered | read | opened | failed | confirmed\",\n  \"messageType\": \"invitation | reminder | event_reminder | location_change | thanks\",\n  \"channel\": \"whatsapp | email\"\n}",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/guests/:id/send-email",
    "summary": "Envía un email individual a un invitado",
    "tag": "Invitados (Guests)",
    "auth": "JWT Bearer",
    "desc": "Envía un email individual a un invitado.",
    "payload": "{\n  \"messageType\": \"invitation | reminder | event_reminder | location_change | thanks\"\n}",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/guests/:id/whatsapp",
    "summary": "Envía un mensaje de WhatsApp individual",
    "tag": "Invitados (Guests)",
    "auth": "JWT Bearer",
    "desc": "Envía un mensaje de WhatsApp individual.",
    "payload": "{\n  \"messageType\": \"invitation | reminder | event_reminder | location_change | thanks\",\n  \"text\": \"string (máx. 3000, opcional)\",\n  \"media\": {\n    \"type\": \"image | video | audio | document\",\n    \"url\": \"URL (o base64)\",\n    \"base64\": \"string\",\n    \"mimetype\": \"string\",\n    \"filename\": \"string\",\n    \"caption\": \"string (máx. 1024)\"\n  }\n}",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/guests/event/:eventId/whatsapp/bulk",
    "summary": "Envío masivo de WhatsApp",
    "tag": "Invitados (Guests)",
    "auth": "JWT Bearer",
    "desc": "Envío masivo de WhatsApp.",
    "payload": "{\n  \"confirm\": true,\n  \"messageType\": \"invitation | reminder | event_reminder | location_change | thanks\",\n  \"media\": { \"type\": \"\", \"url\": \"\", \"base64\": \"\", \"mimetype\": \"\", \"filename\": \"\", \"caption\": \"\" },\n  \"guestIds\": [\"id1\", \"id2\"],\n  \"filters\": {\n    \"search\": \"string\",\n    \"status\": \"string\",\n    \"communicationStatus\": \"string\",\n    \"group\": \"string\"\n  }\n}",
    "response": ""
  },
  {
    "method": "GET",
    "path": "/api/guests/event/:eventId/whatsapp/logs",
    "summary": "Lista los logs de mensajes WhatsApp para un evento",
    "tag": "Invitados (Guests)",
    "auth": "JWT Bearer",
    "desc": "Lista los logs de mensajes WhatsApp para un evento.",
    "payload": "",
    "response": ""
  },
  {
    "method": "GET",
    "path": "/api/guests/whatsapp/status",
    "summary": "Verifica el estado de la sesión de WhatsApp",
    "tag": "Invitados (Guests)",
    "auth": "JWT Bearer",
    "desc": "Verifica el estado de la sesión de WhatsApp.",
    "payload": "",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/guests/import",
    "summary": "Importa invitados desde un archivo CSV/Excel",
    "tag": "Invitados (Guests)",
    "auth": "JWT Bearer",
    "desc": "Importa invitados desde un archivo CSV/Excel. **Form Data**: - `file` — Archivo CSV/Excel - `event` — ID del evento",
    "payload": "",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/guests/check-in",
    "summary": "Check-in de un invitado por código",
    "tag": "Invitados (Guests)",
    "auth": "JWT Bearer",
    "desc": "Check-in de un invitado por código.",
    "payload": "{ \"code\": \"string (mín. 4 caracteres)\" }",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/rsvps/public/:slug",
    "summary": "Envía una confirmación de asistencia en una invitación pública",
    "tag": "RSVP (Confirmaciones)",
    "auth": "Público",
    "desc": "Envía una confirmación de asistencia en una invitación pública.",
    "payload": "{\n  \"guest\": \"guestId (opcional, para vincular a invitado existente)\",\n  \"name\": \"string (mín. 2, requerido)\",\n  \"email\": \"string email (opcional)\",\n  \"phone\": \"string (6-30 dígitos, opcional)\",\n  \"phoneCountryCode\": \"+52\",\n  \"phoneNationalNumber\": \"1234567890\",\n  \"response\": \"confirmed | declined | maybe\",\n  \"companions\": 2,\n  \"companionNames\": [\"Ana\", \"Pedro\"],\n  \"dietaryRestrictions\": \"string\",\n  \"mealPreference\": \"string\",\n  \"menuSelection\": \"string\",\n  \"customAnswers\": [\n    { \"key\": \"dietary\", \"label\": \"Restricciones\", \"value\": \"Vegano\" }\n  ],\n  \"message\": \"string (mensaje opcional)\",\n  \"declineConfirmed\": true\n}",
    "response": "{\n  \"rsvp\": {\n    \"_id\": \"string\",\n    \"invitation\": \"string\",\n    \"event\": \"string\",\n    \"guest\": \"string\",\n    \"name\": \"string\",\n    \"email\": \"string\",\n    \"response\": \"confirmed\",\n    \"companions\": 2,\n    \"companionNames\": [\"Ana\", \"Pedro\"],\n    \"attendingCount\": 3,\n    \"mealPreference\": \"string\",\n    \"dietaryRestrictions\": \"string\",\n    \"menuSelection\": \"string\",\n    \"customAnswers\": [],\n    \"message\": \"string\",\n    \"createdAt\": \"ISO date\",\n    \"updatedAt\": \"ISO date\"\n  },\n  \"updated\": false\n}"
  },
  {
    "method": "POST",
    "path": "/api/rsvps/public-event/:portalSlug",
    "summary": "RSVP para portal externo de evento (mismos campos que arriba)",
    "tag": "RSVP (Confirmaciones)",
    "auth": "Público",
    "desc": "RSVP para portal externo de evento (mismos campos que arriba).",
    "payload": "",
    "response": ""
  },
  {
    "method": "GET",
    "path": "/api/rsvps/event/:eventId",
    "summary": "Lista todos los RSVPs de un evento (requiere permiso `manage_guests`)",
    "tag": "RSVP (Confirmaciones)",
    "auth": "JWT Bearer",
    "desc": "Lista todos los RSVPs de un evento (requiere permiso `manage_guests`).",
    "payload": "",
    "response": ""
  },
  {
    "method": "GET",
    "path": "/api/rsvps/event/:eventId/export",
    "summary": "Exporta RSVPs como CSV",
    "tag": "RSVP (Confirmaciones)",
    "auth": "JWT Bearer",
    "desc": "Exporta RSVPs como CSV.",
    "payload": "",
    "response": ""
  },
  {
    "method": "GET",
    "path": "/api/events/:eventId/tables",
    "summary": "Lista todas las mesas con detalle de ocupación y guests asignados",
    "tag": "Mesas y Asientos",
    "auth": "JWT Bearer",
    "desc": "Lista todas las mesas con detalle de ocupación y guests asignados.",
    "payload": "",
    "response": "{\n  \"tables\": [\n    {\n      \"_id\": \"string\",\n      \"name\": \"Mesa 1\",\n      \"capacity\": 10,\n      \"notes\": \"string\",\n      \"order\": 0,\n      \"x\": 100, \"y\": 200,\n      \"floor\": 1,\n      \"floorName\": \"Salón principal\",\n      \"shape\": \"round\",\n      \"width\": 200, \"height\": 200,\n      \"occupied\": 7,\n      \"available\": 3,\n      \"overCapacity\": false,\n      \"guests\": [\n        { \"id\": \"string\", \"name\": \"string\", \"group\": \"string\", \"seatLabel\": \"1\", \"seats\": 3, \"checkedIn\": false }\n      ]\n    }\n  ]\n}"
  },
  {
    "method": "POST",
    "path": "/api/events/:eventId/tables",
    "summary": "Crea una mesa",
    "tag": "Mesas y Asientos",
    "auth": "JWT Bearer",
    "desc": "Crea una mesa.",
    "payload": "{\n  \"name\": \"string (requerido)\",\n  \"capacity\": 10,\n  \"notes\": \"string\",\n  \"order\": 0,\n  \"x\": 100, \"y\": 200,\n  \"floor\": 1,\n  \"floorName\": \"string\",\n  \"shape\": \"round | rectangle | square\",\n  \"width\": 200,\n  \"height\": 200\n}",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/events/:eventId/tables/batch",
    "summary": "Crea múltiples mesas en lote (máx. 100)",
    "tag": "Mesas y Asientos",
    "auth": "JWT Bearer",
    "desc": "Crea múltiples mesas en lote (máx. 100).",
    "payload": "{\n  \"tables\": [\n    { \"name\": \"Mesa 1\", \"capacity\": 10 },\n    { \"name\": \"Mesa 2\", \"capacity\": 8 }\n  ]\n}",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/events/:eventId/tables/auto-assign",
    "summary": "Asigna invitados automáticamente a las mesas",
    "tag": "Mesas y Asientos",
    "auth": "JWT Bearer",
    "desc": "Asigna invitados automáticamente a las mesas.",
    "payload": "{\n  \"strategy\": \"fill_order | by_group\",\n  \"includeStatuses\": [\"confirmed\"],\n  \"overwrite\": false\n}",
    "response": "{\n  \"assigned\": [\n    { \"guest\": { \"id\": \"\", \"name\": \"\", \"group\": \"\", \"seats\": 3 }, \"table\": \"Mesa 1\", \"seatLabel\": \"1\" }\n  ],\n  \"skipped\": [\n    { \"guest\": { \"id\": \"\", \"name\": \"\", \"group\": \"\", \"seats\": 5 }, \"reason\": \"Sin mesa con capacidad suficiente\" }\n  ],\n  \"tables\": []\n}"
  },
  {
    "method": "PATCH",
    "path": "/api/events/:eventId/tables/:tableId",
    "summary": "Actualiza una mesa",
    "tag": "Mesas y Asientos",
    "auth": "JWT Bearer",
    "desc": "Actualiza una mesa.",
    "payload": "",
    "response": ""
  },
  {
    "method": "DELETE",
    "path": "/api/events/:eventId/tables/:tableId",
    "summary": "Elimina una mesa",
    "tag": "Mesas y Asientos",
    "auth": "JWT Bearer",
    "desc": "Elimina una mesa.",
    "payload": "",
    "response": ""
  },
  {
    "method": "GET",
    "path": "/api/events/:eventId/album",
    "summary": "Lista todas las fotos del álbum del evento (requiere permiso `review_album`)",
    "tag": "Álbum Colaborativo",
    "auth": "JWT Bearer",
    "desc": "Lista todas las fotos del álbum del evento (requiere permiso `review_album`).",
    "payload": "",
    "response": "{\n  \"assets\": [\n    {\n      \"_id\": \"string\",\n      \"owner\": \"string\",\n      \"event\": \"string\",\n      \"invitation\": \"string\",\n      \"guest\": \"string\",\n      \"uploaderName\": \"string\",\n      \"uploaderEmail\": \"string\",\n      \"key\": \"string\",\n      \"url\": \"string URL\",\n      \"status\": \"pending | approved | rejected\",\n      \"reviewedAt\": \"ISO date\",\n      \"createdAt\": \"ISO date\",\n      \"updatedAt\": \"ISO date\"\n    }\n  ]\n}"
  },
  {
    "method": "PATCH",
    "path": "/api/events/:eventId/album/:assetId",
    "summary": "Cambia el estado de una foto del álbum (aprobar/rechazar)",
    "tag": "Álbum Colaborativo",
    "auth": "JWT Bearer",
    "desc": "Cambia el estado de una foto del álbum (aprobar/rechazar).",
    "payload": "{ \"status\": \"pending | approved | rejected\" }",
    "response": ""
  },
  {
    "method": "GET",
    "path": "/api/events/:eventId/song-requests",
    "summary": "Lista todas las solicitudes de canciones del evento",
    "tag": "Solicitudes de Canciones",
    "auth": "JWT Bearer",
    "desc": "Lista todas las solicitudes de canciones del evento.",
    "payload": "",
    "response": "{\n  \"songRequests\": [\n    {\n      \"_id\": \"string\",\n      \"event\": \"string\",\n      \"guest\": { \"name\": \"\", \"group\": \"\" },\n      \"requesterName\": \"string\",\n      \"requesterEmail\": \"string\",\n      \"title\": \"string\",\n      \"artist\": \"string\",\n      \"dedication\": \"string\",\n      \"sourceProvider\": \"youtube | spotify | url | manual\",\n      \"sourceUrl\": \"URL\",\n      \"externalId\": \"string\",\n      \"thumbnailUrl\": \"URL\",\n      \"previewUrl\": \"URL\",\n      \"durationMs\": 210000,\n      \"status\": \"pending | approved | rejected | played\",\n      \"sortOrder\": 1,\n      \"reviewedAt\": \"ISO date\",\n      \"playedAt\": \"ISO date\",\n      \"createdAt\": \"ISO date\",\n      \"updatedAt\": \"ISO date\"\n    }\n  ]\n}"
  },
  {
    "method": "POST",
    "path": "/api/events/:eventId/song-requests",
    "summary": "Crea una solicitud de canción (como organizador)",
    "tag": "Solicitudes de Canciones",
    "auth": "JWT Bearer",
    "desc": "Crea una solicitud de canción (como organizador).",
    "payload": "{\n  \"title\": \"string\",\n  \"artist\": \"string\",\n  \"query\": \"búsqueda de YouTube\",\n  \"url\": \"URL de YouTube/Spotify\",\n  \"sourceUrl\": \"URL directa\",\n  \"dedication\": \"string (máx. 500)\",\n  \"requesterName\": \"string\",\n  \"requesterEmail\": \"string email\",\n  \"status\": \"pending | approved | played | rejected\"\n}",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/events/:eventId/song-requests/lookup-youtube",
    "summary": "Busca un video en YouTube por texto",
    "tag": "Solicitudes de Canciones",
    "auth": "JWT Bearer",
    "desc": "Busca un video en YouTube por texto.",
    "payload": "{ \"query\": \"Cielito Lindo\" }",
    "response": "{\n  \"video\": {\n    \"videoId\": \"abc123\",\n    \"sourceUrl\": \"https://www.youtube.com/watch?v=abc123\",\n    \"thumbnailUrl\": \"https://img.youtube.com/vi/abc123/hqdefault.jpg\",\n    \"title\": \"Cielito Lindo\",\n    \"artist\": \"Channel Name\"\n  },\n  \"query\": \"Cielito Lindo\"\n}"
  },
  {
    "method": "PATCH",
    "path": "/api/events/:eventId/song-requests/:songRequestId",
    "summary": "Actualiza estado u orden de una solicitud",
    "tag": "Solicitudes de Canciones",
    "auth": "JWT Bearer",
    "desc": "Actualiza estado u orden de una solicitud.",
    "payload": "{\n  \"status\": \"pending | approved | rejected | played\",\n  \"sortOrder\": 5\n}",
    "response": ""
  },
  {
    "method": "GET",
    "path": "/api/events/:eventId/dedications",
    "summary": "Lista todas las dedicatorias del evento (vista admin, requiere permiso `review_dedications`)",
    "tag": "Dedicatorias",
    "auth": "JWT Bearer",
    "desc": "Lista todas las dedicatorias del evento (vista admin, requiere permiso `review_dedications`).",
    "payload": "",
    "response": "{\n  \"dedications\": [\n    {\n      \"id\": \"string\",\n      \"event\": \"string\",\n      \"invitation\": \"string\",\n      \"guest\": { \"name\": \"\", \"group\": \"\" },\n      \"publicName\": \"string\",\n      \"email\": \"string\",\n      \"message\": \"string\",\n      \"type\": \"dedication | wish | memory | toast\",\n      \"status\": \"pending | approved | rejected | hidden\",\n      \"visibility\": \"public | hosts_only\",\n      \"createdAt\": \"ISO date\",\n      \"reviewedAt\": \"ISO date\"\n    }\n  ]\n}"
  },
  {
    "method": "PATCH",
    "path": "/api/events/:eventId/dedications/:dedicationId",
    "summary": "Cambia el estado de una dedicatoria",
    "tag": "Dedicatorias",
    "auth": "JWT Bearer",
    "desc": "Cambia el estado de una dedicatoria.",
    "payload": "{ \"status\": \"pending | approved | rejected | hidden\" }",
    "response": ""
  },
  {
    "method": "GET",
    "path": "/api/external/:portalSlug/gifts",
    "summary": "Obtiene la mesa de regalos y datos del sobre digital",
    "tag": "Regalos y Sobre Digital",
    "auth": "Público",
    "desc": "Obtiene la información de mesa de regalos externa y datos bancarios del sobre digital configurados para el portal.",
    "payload": "",
    "response": "{\n  \"gifts\": {\n    \"giftRegistry\": [\n      { \"store\": \"\", \"title\": \"\", \"label\": \"\", \"url\": \"\", \"imageUrl\": \"\", \"note\": \"\", \"priority\": 0 }\n    ],\n    \"digitalEnvelope\": {\n      \"bank\": \"\", \"account\": \"\", \"clabe\": \"\", \"holder\": \"\", \"note\": \"\", \"qrImageUrl\": \"\"\n    },\n    \"giftSettings\": {\n      \"enabled\": true, \"introText\": \"\", \"showRegistry\": true, \"showEnvelope\": true\n    }\n  }\n}"
  },
  {
    "method": "GET",
    "path": "/api/dashboard/summary",
    "summary": "Métricas globales del usuario",
    "tag": "Dashboard y Métricas",
    "auth": "JWT Bearer",
    "desc": "Métricas globales del usuario.",
    "payload": "",
    "response": "{\n  \"metrics\": {\n    \"events\": 3,\n    \"invitations\": 5,\n    \"guests\": 250,\n    \"confirmed\": 180,\n    \"declined\": 20,\n    \"pending\": 50,\n    \"companions\": 120,\n    \"emailSent\": 200,\n    \"whatsappSent\": 150,\n    \"opened\": 180,\n    \"failed\": 5,\n    \"checkedIn\": 100\n  }\n}"
  },
  {
    "method": "GET",
    "path": "/api/dashboard/event/:eventId",
    "summary": "Métricas de un evento específico (requiere permiso `view_metrics`)",
    "tag": "Dashboard y Métricas",
    "auth": "JWT Bearer",
    "desc": "Métricas de un evento específico (requiere permiso `view_metrics`).",
    "payload": "",
    "response": "{\n  \"metrics\": {\n    \"guests\": 100,\n    \"confirmed\": 80,\n    \"declined\": 10,\n    \"pending\": 10,\n    \"emailSent\": 90,\n    \"whatsappSent\": 60,\n    \"opened\": 85,\n    \"failed\": 2,\n    \"checkedIn\": 50\n  }\n}"
  },
  {
    "method": "POST",
    "path": "/api/events/:eventId/check-in-link",
    "summary": "Genera un link de check-in para staff",
    "tag": "Check-In con QR",
    "auth": "JWT Bearer",
    "desc": "Genera un link de check-in para staff.",
    "payload": "{\n  \"label\": \"string (opcional)\",\n  \"days\": 7\n}",
    "response": "{\n  \"token\": \"string hex\",\n  \"expiresAt\": \"ISO date\",\n  \"url\": \"https://tu-dominio.com/check-in/<token>\"\n}"
  },
  {
    "method": "GET",
    "path": "/api/check-in/:token",
    "summary": "Obtiene la sesión de check-in (lista de invitados y evento)",
    "tag": "Check-In con QR",
    "auth": "Token de Acceso",
    "desc": "Obtiene la sesión de check-in (lista de invitados y evento).",
    "payload": "",
    "response": "{\n  \"event\": { \"title\": \"\", \"date\": \"\", \"venue\": {} },\n  \"guests\": [\n    {\n      \"id\": \"string\",\n      \"name\": \"string\",\n      \"group\": \"string\",\n      \"tableName\": \"string\",\n      \"seatLabel\": \"string\",\n      \"allowedCompanions\": 2,\n      \"companions\": [],\n      \"checkInCode\": \"ABC123\",\n      \"checkedIn\": false,\n      \"checkedInAt\": null,\n      \"status\": \"confirmed\"\n    }\n  ],\n  \"expiresAt\": \"ISO date\"\n}"
  },
  {
    "method": "POST",
    "path": "/api/check-in/:token",
    "summary": "Realiza el check-in de un invitado por código QR",
    "tag": "Check-In con QR",
    "auth": "Token de Acceso",
    "desc": "Realiza el check-in de un invitado por código QR.",
    "payload": "{ \"code\": \"ABC123\" }",
    "response": ""
  },
  {
    "method": "GET",
    "path": "/api/events/:eventId/access-links",
    "summary": "Lista los links de acceso del evento",
    "tag": "Access Links (Staff / Integración)",
    "auth": "JWT Bearer",
    "desc": "Lista los links de acceso del evento.",
    "payload": "",
    "response": "{\n  \"links\": [\n    {\n      \"id\": \"string\",\n      \"role\": \"check_in | album_review | photographer | album_view | client_view | guest_ops | dj | integration_api\",\n      \"label\": \"string\",\n      \"tokenPreview\": \"abc123...wxyz\",\n      \"accessToken\": \"solo visible para integration_api\",\n      \"expiresAt\": \"ISO date\",\n      \"revokedAt\": null,\n      \"lastUsedAt\": \"ISO date\",\n      \"createdAt\": \"ISO date\",\n      \"url\": \"https://tu-dominio.com/external-access/<token>\"\n    }\n  ]\n}"
  },
  {
    "method": "POST",
    "path": "/api/events/:eventId/access-links",
    "summary": "Crea un access link",
    "tag": "Access Links (Staff / Integración)",
    "auth": "JWT Bearer",
    "desc": "Crea un access link.",
    "payload": "{\n  \"role\": \"check_in | album_review | photographer | album_view | client_view | guest_ops | dj | integration_api\",\n  \"label\": \"string (máx. 120)\",\n  \"days\": 30\n}",
    "response": ""
  },
  {
    "method": "DELETE",
    "path": "/api/events/:eventId/access-links/:linkId",
    "summary": "Revoca un access link",
    "tag": "Access Links (Staff / Integración)",
    "auth": "JWT Bearer",
    "desc": "Revoca un access link.",
    "payload": "",
    "response": ""
  },
  {
    "method": "GET",
    "path": "/api/event-access/:token",
    "summary": "Obtiene la sesión completa del access link (datos según rol)",
    "tag": "Access Links (Staff / Integración)",
    "auth": "Token de Acceso",
    "desc": "Obtiene la sesión completa del access link (datos según rol).",
    "payload": "",
    "response": "{\n  \"role\": \"guest_ops\",\n  \"permissions\": [\"check_in\", \"album_review\", \"client_view\", \"guest_ops\", \"song_review\"],\n  \"event\": { \"title\": \"\", \"type\": \"\", \"date\": \"\", \"venue\": {} },\n  \"guests\": [],\n  \"rsvps\": [],\n  \"tables\": [],\n  \"albumAssets\": [],\n  \"songRequests\": [],\n  \"expiresAt\": \"ISO date\"\n}"
  },
  {
    "method": "POST",
    "path": "/api/event-access/:token/check-in",
    "summary": "Check-in vía access link (requiere rol con permiso `check_in`)",
    "tag": "Access Links (Staff / Integración)",
    "auth": "Token de Acceso",
    "desc": "Check-in vía access link (requiere rol con permiso `check_in`).",
    "payload": "{ \"code\": \"ABC123\" }",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/event-access/:token/album",
    "summary": "Sube foto al álbum vía access link (requiere rol `photographer`)",
    "tag": "Access Links (Staff / Integración)",
    "auth": "Token de Acceso",
    "desc": "Sube foto al álbum vía access link (requiere rol `photographer`). **Form Data**: `file`, `uploaderName`, `uploaderEmail`, `status`",
    "payload": "",
    "response": ""
  },
  {
    "method": "PATCH",
    "path": "/api/event-access/:token/album/:assetId",
    "summary": "Revisa foto del álbum (requiere rol con `album_review`)",
    "tag": "Access Links (Staff / Integración)",
    "auth": "Token de Acceso",
    "desc": "Revisa foto del álbum (requiere rol con `album_review`).",
    "payload": "{ \"status\": \"pending | approved | rejected\" }",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/event-access/:token/song-requests",
    "summary": "Agrega canción vía access link (requiere rol `dj`)",
    "tag": "Access Links (Staff / Integración)",
    "auth": "Token de Acceso",
    "desc": "Agrega canción vía access link (requiere rol `dj`).",
    "payload": "{\n  \"title\": \"string\",\n  \"artist\": \"string\",\n  \"query\": \"string\",\n  \"sourceUrl\": \"URL\",\n  \"url\": \"URL\",\n  \"dedication\": \"string\",\n  \"requesterName\": \"string\"\n}",
    "response": ""
  },
  {
    "method": "PATCH",
    "path": "/api/event-access/:token/song-requests/:songRequestId",
    "summary": "Actualiza canción vía access link (requiere rol `dj`)",
    "tag": "Access Links (Staff / Integración)",
    "auth": "Token de Acceso",
    "desc": "Actualiza canción vía access link (requiere rol `dj`).",
    "payload": "{\n  \"status\": \"pending | approved | rejected | played\",\n  \"sortOrder\": 5\n}",
    "response": ""
  },
  {
    "method": "GET",
    "path": "/api/events/:eventId/members",
    "summary": "Lista los miembros del equipo del evento",
    "tag": "Miembros del Equipo",
    "auth": "JWT Bearer",
    "desc": "Lista los miembros del equipo del evento.",
    "payload": "",
    "response": "{\n  \"members\": [\n    {\n      \"id\": \"string\",\n      \"user\": \"string\",\n      \"email\": \"string\",\n      \"name\": \"string\",\n      \"role\": \"organizer | client | venue_owner | vendor | staff | dj | photographer\",\n      \"permissions\": [\"view_event\", \"edit_event\", \"manage_guests\"],\n      \"status\": \"invited | active | disabled\",\n      \"invitedAt\": \"ISO date\",\n      \"acceptedAt\": \"ISO date\",\n      \"lastUsedAt\": \"ISO date\",\n      \"createdAt\": \"ISO date\",\n      \"updatedAt\": \"ISO date\"\n    }\n  ],\n  \"permissions\": [\"view_event\", \"edit_event\", \"view_metrics\", \"manage_guests\", \"manage_tables\", \"check_in\", \"review_album\", \"review_dedications\", \"manage_songs\", \"view_payments\"],\n  \"rolePermissions\": {\n    \"organizer\": [\"view_event\", \"edit_event\"],\n    \"client\": []\n  }\n}"
  },
  {
    "method": "POST",
    "path": "/api/events/:eventId/members",
    "summary": "Invita a un miembro al equipo del evento",
    "tag": "Miembros del Equipo",
    "auth": "JWT Bearer",
    "desc": "Invita a un miembro al equipo del evento.",
    "payload": "{\n  \"email\": \"miembro@email.com\",\n  \"name\": \"string (opcional)\",\n  \"role\": \"organizer | client | venue_owner | vendor | staff | dj | photographer\",\n  \"permissions\": [\"view_event\", \"edit_event\"]\n}",
    "response": ""
  },
  {
    "method": "PATCH",
    "path": "/api/events/:eventId/members/:memberId",
    "summary": "Actualiza un miembro",
    "tag": "Miembros del Equipo",
    "auth": "JWT Bearer",
    "desc": "Actualiza un miembro.",
    "payload": "{\n  \"name\": \"string (opcional)\",\n  \"role\": \"organizer | client | venue_owner | vendor | staff | dj | photographer\",\n  \"permissions\": [\"view_event\", \"edit_event\"],\n  \"status\": \"invited | active | disabled\"\n}",
    "response": ""
  },
  {
    "method": "DELETE",
    "path": "/api/events/:eventId/members/:memberId",
    "summary": "Desactiva un miembro",
    "tag": "Miembros del Equipo",
    "auth": "JWT Bearer",
    "desc": "Desactiva un miembro.",
    "payload": "",
    "response": ""
  },
  {
    "method": "GET",
    "path": "/api/events/member-invites/:token",
    "summary": "Obtiene información de una invitación de miembro por token",
    "tag": "Miembros del Equipo",
    "auth": "Público",
    "desc": "Obtiene información de una invitación de miembro por token.",
    "payload": "",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/events/member-invites/:token/accept",
    "summary": "Acepta una invitación de equipo (requiere estar logueado con el email correcto)",
    "tag": "Miembros del Equipo",
    "auth": "JWT Bearer",
    "desc": "Acepta una invitación de equipo (requiere estar logueado con el email correcto).",
    "payload": "",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/assets/upload-url",
    "summary": "Obtiene una URL firmada para subir archivos a S3",
    "tag": "Assets y Uploads",
    "auth": "JWT Bearer",
    "desc": "Obtiene una URL firmada para subir archivos a S3.",
    "payload": "{\n  \"fileName\": \"mi-foto.jpg\",\n  \"contentType\": \"image/jpeg | image/png | image/webp | image/gif | audio/mpeg | audio/mp3 | audio/wav | video/mp4 | video/webm | video/quicktime | application/pdf\",\n  \"folder\": \"covers | gallery | music | assets | whatsapp-media\",\n  \"event\": \"eventId (opcional)\",\n  \"size\": 2048576\n}",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/assets/inspect-url",
    "summary": "Inspecciona una URL pública y devuelve metadata",
    "tag": "Assets y Uploads",
    "auth": "JWT Bearer",
    "desc": "Inspecciona una URL pública y devuelve metadata.",
    "payload": "{ \"url\": \"https://example.com/image.jpg\" }",
    "response": ""
  },
  {
    "method": "GET",
    "path": "/api/assets/events/:eventId/whatsapp-media",
    "summary": "Lista archivos multimedia de WhatsApp del evento",
    "tag": "Assets y Uploads",
    "auth": "JWT Bearer",
    "desc": "Lista archivos multimedia de WhatsApp del evento.",
    "payload": "",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/assets/events/:eventId/whatsapp-media",
    "summary": "Registra un archivo multimedia de WhatsApp",
    "tag": "Assets y Uploads",
    "auth": "JWT Bearer",
    "desc": "Registra un archivo multimedia de WhatsApp.",
    "payload": "{\n  \"key\": \"string\",\n  \"url\": \"URL\",\n  \"type\": \"image | video | audio | document\",\n  \"fileName\": \"string\",\n  \"mimetype\": \"string\",\n  \"size\": 1024000,\n  \"caption\": \"string\"\n}",
    "response": ""
  },
  {
    "method": "DELETE",
    "path": "/api/assets/events/:eventId/whatsapp-media/:assetId",
    "summary": "Elimina un archivo multimedia de WhatsApp",
    "tag": "Assets y Uploads",
    "auth": "JWT Bearer",
    "desc": "Elimina un archivo multimedia de WhatsApp.",
    "payload": "",
    "response": ""
  },
  {
    "method": "GET",
    "path": "/api/payments/plans",
    "summary": "Lista los planes disponibles",
    "tag": "Pagos",
    "auth": "JWT Bearer",
    "desc": "Lista los planes disponibles.",
    "payload": "",
    "response": ""
  },
  {
    "method": "GET",
    "path": "/api/payments/status",
    "summary": "Obtiene el estado de suscripción del usuario",
    "tag": "Pagos",
    "auth": "JWT Bearer",
    "desc": "Obtiene el estado de suscripción del usuario.",
    "payload": "",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/payments/checkout",
    "summary": "Crea una sesión de checkout (Stripe)",
    "tag": "Pagos",
    "auth": "JWT Bearer",
    "desc": "Crea una sesión de checkout (Stripe).",
    "payload": "{\n  \"package\": \"event | pro | basic | premium | organizer | event_12m | external_dashboard_12m | planner_pro_monthly | planner_pro_yearly\",\n  \"event\": \"eventId (opcional)\",\n  \"billingCycle\": \"monthly | yearly\",\n  \"invitation\": \"invitationId (opcional)\"\n}",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/webhook",
    "summary": "Webhook de Stripe para procesar pagos. Requiere `Content-Type: application/json` raw",
    "tag": "Pagos",
    "auth": "Público",
    "desc": "Webhook de Stripe para procesar pagos. Requiere `Content-Type: application/json` raw.",
    "payload": "",
    "response": ""
  },
  {
    "method": "GET",
    "path": "/api/templates",
    "summary": "Lista las plantillas disponibles",
    "tag": "Templates",
    "auth": "Público",
    "desc": "Lista las plantillas disponibles.",
    "payload": "",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/templates",
    "summary": "Crea una nueva plantilla",
    "tag": "Templates",
    "auth": "JWT Bearer",
    "desc": "Crea una nueva plantilla.",
    "payload": "{\n  \"name\": \"string (mín. 2)\",\n  \"eventType\": \"boda | xv | graduacion | cumpleanos | bautizo | otro\",\n  \"tier\": \"free | premium\",\n  \"previewImageUrl\": \"URL\",\n  \"config\": {},\n  \"active\": true\n}",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/contact",
    "summary": "Envía un mensaje de contacto",
    "tag": "Contacto",
    "auth": "Público",
    "desc": "Envía un mensaje de contacto.",
    "payload": "{\n  \"name\": \"string (2-120)\",\n  \"email\": \"string email\",\n  \"message\": \"string (10-3000)\"\n}",
    "response": ""
  },
  {
    "method": "GET",
    "path": "/api/webhooks/whatsapp/meta",
    "summary": "Verificación de webhook de Meta (WhatsApp Business API)",
    "tag": "Webhooks WhatsApp",
    "auth": "Público",
    "desc": "Verificación de webhook de Meta (WhatsApp Business API).",
    "payload": "",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/webhooks/whatsapp/meta",
    "summary": "Recibe eventos de Meta",
    "tag": "Webhooks WhatsApp",
    "auth": "Público",
    "desc": "Recibe eventos de Meta.",
    "payload": "",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/webhooks/whatsapp/openwa",
    "summary": "Recibe eventos de OpenWA",
    "tag": "Webhooks WhatsApp",
    "auth": "Público",
    "desc": "Recibe eventos de OpenWA.",
    "payload": "",
    "response": ""
  },
  {
    "method": "GET",
    "path": "/api/external/:portalSlug/config",
    "summary": "Configuración completa del portal: evento, content, secciones, features, dedicatorias aprobadas",
    "tag": "API de Integración Externa",
    "auth": "Público",
    "desc": "Configuración completa del portal: evento, content, secciones, features, dedicatorias aprobadas.",
    "payload": "",
    "response": "{\n  \"event\": {\n    \"id\": \"string\",\n    \"portalSlug\": \"mi-boda\",\n    \"mode\": \"external_dashboard\",\n    \"type\": \"boda\",\n    \"title\": \"Boda de Ana y Carlos\",\n    \"hosts\": [\"Ana\", \"Carlos\"],\n    \"date\": \"2026-12-15T18:00:00.000Z\",\n    \"venue\": { \"name\": \"Hacienda\", \"address\": \"...\" },\n    \"agenda\": [],\n    \"externalSiteUrl\": \"URL\",\n    \"externalSiteLabel\": \"string\",\n    \"settings\": { \"rsvpEnabled\": true, \"albumEnabled\": true },\n    \"content\": {\n      \"coverImageUrl\": \"URL\",\n      \"heroImageUrl\": \"URL\",\n      \"gallery\": [],\n      \"carousel\": [],\n      \"spectacularImages\": [],\n      \"musicUrl\": \"URL\",\n      \"audioSections\": [],\n      \"sectionMusic\": {},\n      \"locations\": [],\n      \"sections\": [],\n      \"rsvpSettings\": {},\n      \"songRequestSettings\": {},\n      \"moderationSettings\": {},\n      \"giftRegistry\": [],\n      \"digitalEnvelope\": {},\n      \"giftSettings\": {},\n      \"dedicationSettings\": {}\n    },\n    \"features\": {\n      \"rsvp\": true,\n      \"album\": true,\n      \"pass\": true,\n      \"calendar\": true,\n      \"songRequests\": true,\n      \"gifts\": true,\n      \"dedications\": true\n    },\n    \"dedications\": [\n      { \"id\": \"\", \"publicName\": \"\", \"message\": \"\", \"type\": \"\", \"status\": \"approved\", \"createdAt\": \"\" }\n    ]\n  }\n}"
  },
  {
    "method": "GET",
    "path": "/api/external/:portalSlug/assets?type=all",
    "summary": "Obtiene assets del portal. `type`: `cover`, `carousel`, `gallery`, `audio`, `map`, `gifts`, `all`",
    "tag": "API de Integración Externa",
    "auth": "Público",
    "desc": "Obtiene assets del portal. `type`: `cover`, `carousel`, `gallery`, `audio`, `map`, `gifts`, `all`.",
    "payload": "",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/external/:portalSlug/guest/identify",
    "summary": "Identifica a un invitado y genera un token de sesión",
    "tag": "API de Integración Externa",
    "auth": "Público",
    "desc": "Identifica a un invitado y genera un token de sesión.",
    "payload": "{\n  \"email\": \"string (opcional)\",\n  \"phone\": \"string (opcional)\",\n  \"token\": \"string (opcional, invitationToken del guest)\"\n}",
    "response": "{\n  \"guest\": {\n    \"id\": \"string\",\n    \"name\": \"string\",\n    \"group\": \"string\",\n    \"roles\": [],\n    \"tags\": [],\n    \"relationshipLabel\": \"string\",\n    \"visibilityGroup\": \"string\",\n    \"allowedCompanions\": 2,\n    \"status\": \"pending\",\n    \"communicationStatus\": \"string\",\n    \"checkInCode\": \"ABC123\",\n    \"qrCode\": \"string\",\n    \"tableName\": \"string\",\n    \"seatLabel\": \"string\",\n    \"companions\": []\n  },\n  \"guestSessionToken\": \"JWT string para endpoints que requieren sesión de invitado\"\n}"
  },
  {
    "method": "GET",
    "path": "/api/external/:portalSlug/my-status",
    "summary": "Estado completo del invitado autenticado: RSVP, álbum, canciones, dedicatorias",
    "tag": "API de Integración Externa",
    "auth": "Token de Acceso",
    "desc": "Estado completo del invitado autenticado: RSVP, álbum, canciones, dedicatorias.",
    "payload": "",
    "response": "{\n  \"guest\": {},\n  \"rsvp\": { \"id\": \"\", \"response\": \"confirmed\", \"companions\": 1, \"attendingCount\": 2 },\n  \"albumUploads\": [],\n  \"songRequests\": [],\n  \"dedications\": []\n}"
  },
  {
    "method": "POST",
    "path": "/api/external/:portalSlug/rsvp",
    "summary": "Envía RSVP por portal externo (el invitado debe existir en el evento)",
    "tag": "API de Integración Externa",
    "auth": "Público",
    "desc": "Envía RSVP por portal externo (el invitado debe existir en el evento).",
    "payload": "{\n  \"guest\": \"guestId (requerido)\",\n  \"name\": \"string (opcional)\",\n  \"email\": \"string (opcional)\",\n  \"response\": \"confirmed | declined | maybe\",\n  \"companions\": 2,\n  \"companionNames\": [\"Ana\"],\n  \"dietaryRestrictions\": \"string\",\n  \"mealPreference\": \"string\",\n  \"menuSelection\": \"string\",\n  \"customAnswers\": [{ \"key\": \"\", \"label\": \"\", \"value\": \"\" }],\n  \"message\": \"string\"\n}",
    "response": ""
  },
  {
    "method": "GET",
    "path": "/api/external/:portalSlug/album",
    "summary": "Lista fotos aprobadas del álbum",
    "tag": "API de Integración Externa",
    "auth": "Público",
    "desc": "Lista fotos aprobadas del álbum.",
    "payload": "",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/external/:portalSlug/album",
    "summary": "Sube foto al álbum del portal externo. `file` multipart",
    "tag": "API de Integración Externa",
    "auth": "Multipart / JWT",
    "desc": "Sube foto al álbum del portal externo. `file` multipart.",
    "payload": "",
    "response": ""
  },
  {
    "method": "GET",
    "path": "/api/external/:portalSlug/dedications",
    "summary": "Lista dedicatorias aprobadas y públicas",
    "tag": "API de Integración Externa",
    "auth": "Público",
    "desc": "Lista dedicatorias aprobadas y públicas.",
    "payload": "",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/external/:portalSlug/dedications",
    "summary": "Crea una dedicatoria",
    "tag": "API de Integración Externa",
    "auth": "Público",
    "desc": "Crea una dedicatoria.",
    "payload": "{\n  \"guest\": \"guestId (opcional)\",\n  \"publicName\": \"string (mín. 2, máx. 120)\",\n  \"email\": \"string (opcional)\",\n  \"message\": \"string (2-1000 caracteres, requerido)\",\n  \"type\": \"dedication | wish | memory | toast\",\n  \"visibility\": \"public | hosts_only\"\n}",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/external/:portalSlug/song-lookup",
    "summary": "Busca información de una canción (YouTube/Spotify/manual)",
    "tag": "API de Integración Externa",
    "auth": "Público",
    "desc": "Busca información de una canción (YouTube/Spotify/manual).",
    "payload": "{\n  \"query\": \"string\",\n  \"url\": \"URL\",\n  \"title\": \"string\",\n  \"artist\": \"string\"\n}",
    "response": ""
  },
  {
    "method": "POST",
    "path": "/api/external/:portalSlug/song-requests",
    "summary": "Crea una solicitud de canción",
    "tag": "API de Integración Externa",
    "auth": "Público",
    "desc": "Crea una solicitud de canción.",
    "payload": "{\n  \"guest\": \"guestId (opcional)\",\n  \"requesterName\": \"string\",\n  \"requesterEmail\": \"string email\",\n  \"title\": \"string (máx. 180)\",\n  \"artist\": \"string (máx. 180)\",\n  \"dedication\": \"string (máx. 500)\",\n  \"query\": \"string (máx. 300)\",\n  \"url\": \"URL\",\n  \"sourceUrl\": \"URL\",\n  \"status\": \"pending | approved | played | rejected\"\n}",
    "response": ""
  },
  {
    "method": "GET",
    "path": "/api/external/:portalSlug/gifts",
    "summary": "Obtiene mesa de regalos y sobre digital",
    "tag": "API de Integración Externa",
    "auth": "Público",
    "desc": "Obtiene la información de mesa de regalos externa y datos bancarios del sobre digital configurados para el portal.",
    "payload": "",
    "response": ""
  },
  {
    "method": "GET",
    "path": "/api/external/:portalSlug/embed-manifest",
    "summary": "Obtiene el manifiesto de widgets embebibles y snippets de integración",
    "tag": "API de Integración Externa",
    "auth": "Público",
    "desc": "Obtiene el manifiesto de widgets embebibles y snippets de integración.",
    "payload": "",
    "response": "{\n  \"portalSlug\": \"mi-boda\",\n  \"widgets\": {\n    \"rsvp\": \"https://tu-dominio.com/embed/mi-boda/rsvp\",\n    \"guestPass\": \"https://tu-dominio.com/embed/mi-boda/guest-pass\",\n    \"album\": \"https://tu-dominio.com/embed/mi-boda/album\",\n    \"gallery\": \"https://tu-dominio.com/embed/mi-boda/gallery\",\n    \"map\": \"https://tu-dominio.com/embed/mi-boda/map\",\n    \"songRequests\": \"https://tu-dominio.com/embed/mi-boda/song-requests\",\n    \"gifts\": \"https://tu-dominio.com/embed/mi-boda/gifts\",\n    \"dedications\": \"https://tu-dominio.com/embed/mi-boda/dedications\",\n    \"fullDetails\": \"https://tu-dominio.com/embed/mi-boda/full-details\",\n    \"fullPortal\": \"https://tu-dominio.com/embed/mi-boda/full-portal\"\n  },\n  \"apiAuth\": {\n    \"header\": \"Authorization: Bearer <integration_api_token>\",\n    \"alternateHeader\": \"X-Kyndra-Access-Token: <integration_api_token>\",\n    \"verifyEndpoint\": \"/api/external/mi-boda/integration-token/status\",\n    \"note\": \"El token integration_api identifica a la pagina externa cliente; los datos publicos siguen sanitizados.\"\n  },\n  \"snippets\": {\n    \"rsvp\": \"<iframe src=\\\"...\\\" width=\\\"100%\\\" height=\\\"720\\\" style=\\\"border:0\\\"></iframe>\",\n    \"album\": \"<iframe src=\\\"...\\\" width=\\\"100%\\\" height=\\\"720\\\" style=\\\"border:0\\\"></iframe>\",\n    \"map\": \"<iframe src=\\\"...\\\" width=\\\"100%\\\" height=\\\"480\\\" style=\\\"border:0\\\"></iframe>\",\n    \"songRequests\": \"<iframe src=\\\"...\\\" width=\\\"100%\\\" height=\\\"520\\\" style=\\\"border:0\\\"></iframe>\",\n    \"gifts\": \"<iframe src=\\\"...\\\" width=\\\"100%\\\" height=\\\"520\\\" style=\\\"border:0\\\"></iframe>\",\n    \"dedications\": \"<iframe src=\\\"...\\\" width=\\\"100%\\\" height=\\\"640\\\" style=\\\"border:0\\\"></iframe>\",\n    \"fullDetails\": \"<iframe src=\\\"...\\\" width=\\\"100%\\\" height=\\\"760\\\" style=\\\"border:0\\\"></iframe>\",\n    \"script\": \"<div data-kyndra-widget=\\\"rsvp\\\" data-portal=\\\"mi-boda\\\"></div><script src=\\\".../kyndra-embed.js\\\"></script>\"\n  }\n}"
  },
  {
    "method": "GET",
    "path": "/api/external/:portalSlug/integration-token/status",
    "summary": "Verifica que un token de integración sea válido",
    "tag": "API de Integración Externa",
    "auth": "Token de Acceso",
    "desc": "Verifica que un token de integración sea válido.",
    "payload": "",
    "response": "{\n  \"ok\": true,\n  \"portalSlug\": \"mi-boda\",\n  \"event\": { \"id\": \"string\", \"title\": \"string\", \"mode\": \"external_dashboard\" },\n  \"access\": { \"role\": \"integration_api\", \"label\": \"Mi Web\", \"expiresAt\": \"ISO date\", \"lastUsedAt\": \"ISO date\" }\n}"
  },
  {
    "method": "GET",
    "path": "/health",
    "summary": "Verifica que el servicio está activo",
    "tag": "Health Check",
    "auth": "Público",
    "desc": "Verifica que el servicio y la base de datos están activos y respondiendo correctamente.",
    "payload": "",
    "response": "{\n  \"ok\": true,\n  \"service\": \"invitaciones-api\"\n}"
  }
];
