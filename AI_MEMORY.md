# AI Memory - Invitaciones Frontend Angular

## Objetivo del producto

Construir el frontend web responsive de un SaaS de invitaciones digitales interactivas. La app debe permitir a usuarios y organizadores crear eventos, editar invitaciones, administrar invitados, publicar una pagina publica, recibir RSVP y consultar estadisticas.

La propuesta de valor frente a editores como Canva es crear una experiencia completa del evento, no solo una imagen o PDF: link publico, RSVP, invitados, musica, mapa, QR, galeria, recordatorios y metricas.

## Stack actual

- Framework: Angular 13.
- Estilos: CSS plano en `app.component.css` y `styles.css`.
- Forms: `FormsModule` con `ngModel`.
- HTTP: `HttpClientModule`.
- Auth client: interceptor que toma `invitaciones_token` desde `localStorage` y lo envia como Bearer token.
- API esperada: `http://localhost:4000/api` en desarrollo.
- App actual: una pantalla principal tipo SaaS shell con vistas internas controladas por estado local.

## Que hace ahora

La app corre en:

```txt
http://localhost:4200
```

Pantallas/vistas visuales actuales:

- Dashboard:
  - Muestra metricas demo de eventos, invitaciones, invitados, confirmados, pendientes y acompanantes.
  - Incluye bloque de alta rapida para crear usuario demo contra el backend.
  - Muestra diferenciadores del producto.
- Editor:
  - Permite editar estado local de tipo de evento, titulo, fecha, lugar, direccion, slug, titular, subtitulo y mensaje.
  - Permite seleccionar una plantilla local.
- Invitados:
  - Muestra tabla demo de invitados.
  - Incluye texto sobre importacion CSV/XLSX.
- Publica:
  - Muestra preview visual de la invitacion con mensaje, lugar y botones RSVP demo.

Servicios existentes en `ApiService`:

```ts
getDashboard()
register(payload)
createEvent(payload)
createInvitation(payload)
publishInvitation(id)
submitRsvp(slug, payload)
```

Auth existente:

- `registerDemo()` llama `POST /api/auth/register`.
- Si el registro funciona, guarda el JWT en `localStorage` con la key `invitaciones_token`.
- `AuthTokenInterceptor` agrega `Authorization: Bearer <token>` a requests posteriores.

## Que esta simulado

- Metricas del dashboard estan hardcodeadas.
- Invitados estan hardcodeados.
- Plantillas estan hardcodeadas en el componente.
- `saveDraft()` no llama backend; solo actualiza texto local.
- `publish()` no llama backend; solo cambia `status` local.
- Vista publica no usa rutas ni slug real.
- Botones RSVP de preview no envian datos.
- No hay login real en UI, solo registro demo.
- No hay logout.
- No hay guards ni rutas reales por modulo.
- No hay carga/importacion real de archivos desde UI.
- No hay integracion visual con Stripe ni S3.

## Que falta

- Crear estructura de rutas reales:
  - `/login`
  - `/register`
  - `/dashboard`
  - `/events`
  - `/events/:id`
  - `/invitations/:id/editor`
  - `/i/:slug` para pagina publica.
- Separar componentes por feature. Hoy casi todo vive en `AppComponent`.
- Implementar login/logout y manejo de sesion.
- Agregar route guards para pantallas privadas.
- Cambiar formularios importantes a Reactive Forms.
- Conectar dashboard a `GET /api/dashboard/summary`.
- Crear flujo real:
  - registrar/login,
  - crear evento,
  - crear invitacion asociada,
  - editar invitacion,
  - publicar,
  - abrir link publico,
  - enviar RSVP.
- Crear UI real para invitados:
  - lista por evento,
  - alta manual,
  - importacion CSV/XLSX,
  - estados RSVP.
- Crear UI para assets:
  - pedir presigned URL,
  - subir a S3,
  - guardar URL en invitacion.
- Crear UI para pagos premium:
  - seleccionar paquete,
  - abrir Stripe Checkout,
  - manejar success/cancel.
- Reemplazar datos demo por datos desde API.
- Mejorar manejo de loading, errores, empty states y validaciones.
- Migrar Angular 13 a una version moderna antes de produccion.

## Riesgos tecnicos conocidos

- Angular 13 tiene vulnerabilidades conocidas reportadas por `npm audit`; actualizar Angular implica cambio mayor.
- La app esta en un solo componente grande; si crece asi, sera dificil mantenerla.
- No hay modelos TypeScript completos para respuestas reales del backend.
- `ApiService` usa `any` en varios metodos.
- El token se guarda en `localStorage`; es aceptable para MVP, pero debe revisarse seguridad antes de produccion.
- No hay guards; un usuario podria navegar visualmente a pantallas privadas cuando existan rutas.
- No hay tests utiles todavia; el spec generado por Angular no cubre los flujos reales.
- No hay manejo de expiracion de token ni refresh.

## Proximos pasos recomendados

1. Crear routing real y separar componentes principales.
2. Implementar auth UI: login, register, logout y guard.
3. Conectar dashboard al backend.
4. Convertir editor demo en flujo real de crear evento + crear invitacion.
5. Crear pagina publica por slug usando `GET /api/invitations/public/:slug`.
6. Conectar RSVP publico con `POST /api/rsvps/public/:slug`.
7. Crear gestion real de invitados e importacion.
8. Agregar manejo de assets con S3.
9. Agregar flujo visual de pagos con Stripe.
10. Planear upgrade de Angular.

## Comandos utiles

Instalar dependencias:

```bash
npm install
```

Arrancar frontend:

```bash
npm start
```

Build:

```bash
npm run build
```

Test generado por Angular:

```bash
npm test
```

URLs locales:

```txt
Frontend: http://localhost:4200
Backend API: http://localhost:4000/api
Backend health: http://localhost:4000/health
```

## Reglas para futuras IAs

- No asumir que los botones del frontend guardan/publican de verdad; varias acciones siguen siendo demo.
- Mantener frontend separado del backend.
- Mantener Angular como base inicial porque el usuario lo maneja, aunque se recomienda migrar version antes de produccion.
- No convertir el frontend en landing page; la primera pantalla debe seguir siendo una experiencia usable del producto.
- Antes de agregar UI nueva, revisar si el backend ya tiene endpoint seguro para soportarla.
- Si se cambia un contrato API, actualizar `ApiService`, modelos TypeScript y este archivo.
- Documentar cualquier feature parcial o mock nuevo para no confundir a futuras sesiones.

## Actualizacion 2026-06-06 - Frontend Auth + MVP conectado

Se reemplazo la pantalla unica demo por una estructura Angular con rutas reales y flujo MVP conectado al backend Express:

- Rutas creadas: `/login`, `/register`, `/dashboard`, `/events`, `/events/:id`, `/invitations/:id/editor`, `/i/:slug`.
- `AppComponent` ahora funciona como shell con navegacion, usuario actual y logout.
- Se agregaron `AuthService` y `AuthGuard`.
- `ApiService` quedo tipado para auth, dashboard, eventos, invitaciones publicadas y RSVP publico.
- Login/registro guardan `invitaciones_token` en `localStorage` y el interceptor lo envia como Bearer token.
- Dashboard consume `GET /api/dashboard/summary`.
- Eventos permite listar y crear contra `GET/POST /api/events`.
- Detalle de evento permite crear invitacion asociada y navegar al editor.
- Editor carga invitaciones via `GET /api/invitations`, actualiza con `PATCH /api/invitations/:id` y publica con `POST /api/invitations/:id/publish`.
- Pagina publica `/i/:slug` consume `GET /api/invitations/public/:slug` y envia RSVP con `POST /api/rsvps/public/:slug`.

Notas de coordinacion con backend:

- El frontend normaliza ids porque auth puede devolver `id` y Mongo documentos devuelven `_id`.
- El frontend no envia campos internos como `owner`, `status`, `publishedAt` o `premiumLocked` en updates de invitacion.
- Invitados/importacion y RSVP privado siguen fuera del primer flujo real hasta que backend cierre ownership y DTOs.
- El token en `localStorage` sigue siendo decision MVP; revisar seguridad antes de produccion.

Siguientes pasos frontend:

1. Probar flujo end-to-end con backend y Mongo levantados.
2. Ajustar UI segun contratos finales que cierre el agente backend.
3. Agregar manejo global de `401` para limpiar sesion desde interceptor si el token expira.
4. Crear UI real de invitados cuando backend cierre seguridad de ownership.
5. Planear migracion Angular despues del MVP conectado.

Nota de hosting SPA: las rutas directas como /login, /events/:id y /i/:slug requieren fallback del servidor a index.html en produccion y en cualquier servidor local que no sea el router cliente.
