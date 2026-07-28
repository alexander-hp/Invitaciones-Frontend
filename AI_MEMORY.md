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
  - Muestra metricas desde `GET /api/dashboard/summary`.
- Editor:
  - Edita invitaciones reales, selecciona plantillas del backend, elige modo de acceso RSVP, sube assets a S3 y persiste URLs en `Invitation.content`.
- Invitados:
  - Lista invitados reales, permite alta manual e importacion CSV/XLSX.
- Publica:
  - Renderiza invitacion por slug, muestra portada/musica/galeria y envia RSVP real.
  - Si la invitacion es `guest_list`, primero valida email contra la lista de invitados.

Servicios existentes en `ApiService`:

```ts
auth, dashboard, events, invitations, guests/import, templates,
assets S3, payments checkout, contact, password reset y RSVP
```

Auth existente:

- Login/registro reales contra backend.
- Si auth funciona, guarda el JWT en `localStorage` con la key `invitaciones_token`.
- `AuthTokenInterceptor` agrega `Authorization: Bearer <token>` a requests posteriores.

## Que sigue parcial o inicial

- Stripe tiene UI inicial y checkout, pero falta confirmar keys/flujo real success/cancel en beta.
- Assets S3 ya suben, se guardan y se renderizan; falta UX avanzada para borrar/reordenar galeria.
- Lista cerrada usa validacion por email para MVP; falta link unico/codigo QR/token por invitado para mayor seguridad.
- Dashboard sigue siendo basico, sin series temporales ni filtros por evento.
- Formularios siguen con `FormsModule`; migrar a Reactive Forms cuando crezca validacion.
- Angular 13 sigue pendiente de migracion antes de produccion.

## Que falta

- Cambiar formularios importantes a Reactive Forms.
- Completar flujo visual de pagos premium: success/cancel, estados y desbloqueo real.
- Mejorar manejo de loading, errores, empty states y validaciones.
- Migrar Angular 13 a una version moderna antes de produccion.

## Riesgos tecnicos conocidos

- Angular 13 tiene vulnerabilidades conocidas reportadas por `npm audit`; actualizar Angular implica cambio mayor.
- La app esta en un solo componente grande; si crece asi, sera dificil mantenerla.
- No hay modelos TypeScript completos para respuestas reales del backend.
- `ApiService` usa `any` en varios metodos.
- El token se guarda en `localStorage`; es aceptable para MVP, pero debe revisarse seguridad antes de produccion.
- No hay tests utiles todavia; el spec generado por Angular no cubre los flujos reales.
- No hay manejo de expiracion de token ni refresh.

## Proximos pasos recomendados

1. Cerrar QA beta end-to-end y commitear backend/frontend.
2. Completar flujo visual de Stripe si hay keys listas; si no, mantener `501` visible.
3. Mejorar UX de editor/assets: borrar/reordenar galeria y mensajes de carga mas finos.
4. Agregar pruebas E2E o colecciones Postman para flujos criticos.
5. Preparar deploy beta y planear upgrade de Angular.

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

- No asumir que Stripe esta listo; confirmar keys y flujo antes de depender de pagos.
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

## Actualizacion 2026-06-06 - Integracion E2E e invitados

- `AuthTokenInterceptor` ahora maneja `401`: elimina `invitaciones_token` y redirige a `/login`, excepto en login/register.
- `ApiService` agrega `listGuests(eventId)` y `createGuest(payload)` contra `/api/guests/event/:eventId` y `/api/guests`.
- El detalle de evento ahora lista invitados reales, permite alta manual y muestra estado `pending/confirmed/declined`.
- La importacion CSV/XLSX queda indicada como siguiente iteracion; backend ya expone `/api/guests/import`.
- Se agrego `nginx.conf` y el Dockerfile lo copia para que rutas SPA directas (`/login`, `/events/:id`, `/i/:slug`) hagan fallback a `index.html`.

Nota QA local SPA: se agrego `npm run serve:spa` para servir `dist/invitaciones-frontend-angular` en `http://localhost:4300` con fallback a `index.html`. Usarlo despues de `npm run build` para probar rutas directas como `/login` y `/i/:slug`.

## Actualizacion 2026-06-06 - Beta templates/assets/payments

- Detalle de evento ahora importa invitados CSV/XLSX usando `/api/guests/import`.
- `ApiService` consume templates, assets presignados y checkout.
- Editor de invitacion lista plantillas reales por tipo de evento y guarda `template` junto con el contenido.
- Editor permite seleccionar portada, musica y galeria; si S3 no esta configurado muestra el error `501` del backend.
- Editor muestra paquetes basic/premium/organizer y abre Stripe Checkout cuando `STRIPE_SECRET_KEY` esta configurado.
- Para QA local sin S3/Stripe se espera manejo visible de `AWS_S3_BUCKET no configurado` y `STRIPE_SECRET_KEY no configurado`.

## Actualizacion 2026-06-06 - Contacto y password reset

- Se agrego ruta publica `/contact` con formulario `{ name, email, message }` conectado a `POST /api/contact`.
- `ApiService` agrega `sendContact(payload)` y tipos `ContactPayload`/`MessageResponse`.
- Se agregaron rutas publicas:
  - `/password-reset` para solicitar recuperacion con `{ email }`.
  - `/password-reset/confirm` para confirmar con `{ token, password }`; toma `token` desde query param y permite pegarlo manualmente si falta.
- `ApiService` agrega `requestPasswordReset({ email })` y `confirmPasswordReset({ token, password })`.
- Login ahora enlaza a recuperacion de password.
- El shell muestra acceso a contacto para usuarios autenticados y visitantes.
- El build Angular pasa con estas rutas nuevas.

Notas de coordinacion con backend:

- Backend genera enlaces usando `FRONTEND_URL`, recomendado local `http://localhost:4200`.
- La solicitud de reset siempre muestra mensaje generico aunque el email no exista.
- Emails transaccionales de RSVP/publicacion son best-effort en backend; el frontend no debe asumir que un RSVP/publicacion fallido implica fallo de email.

## Actualizacion 2026-06-06 - QA beta RSVP visible y S3 upload

- `ApiService` agrega `listRsvps(eventId)` contra `GET /api/rsvps/event/:eventId`.
- El detalle de evento muestra una seccion "Respuestas recibidas" con nombre, email, respuesta, acompanantes, comida, mensaje y fecha.
- El flujo publico de RSVP puede reflejarse ahora en dos lugares:
  - en la tabla de RSVPs siempre que se cree la respuesta,
  - en la tabla de invitados si el email coincide con un invitado del evento y backend lo vincula.
- `AuthTokenInterceptor` ya solo agrega `Authorization` a requests hacia `environment.apiUrl`; esto evita mandar Bearer token al `PUT` presignado de S3.
- El editor diferencia errores de preparacion de URL S3 contra errores del `PUT` directo al bucket, con mensajes orientados a region/bucket/credenciales o CORS/permisos.

Notas QA:

- Para probar S3, iniciar sesion, elegir asset, confirmar que `POST /api/assets/upload-url` funciona y que el `PUT` a S3 ya no incluye header `Authorization`.
- Si el `PUT` sigue fallando con status 0, configurar CORS en el bucket para `PUT` desde `http://localhost:4200`.

## Actualizacion 2026-06-06 - Assets S3 persistidos y visibles

- Al subir portada, musica o galeria desde el editor, el frontend ahora hace autoguardado con `PATCH /api/invitations/:id` despues de que el `PUT` a S3 termina OK.
- Ya no depende de que el usuario recuerde presionar "Guardar" para conservar URLs de S3.
- El editor muestra preview de portada, reproductor de musica y galeria cargada.
- La pagina publica `/i/:slug` renderiza portada, musica y galeria guardadas en `invitation.content`.
- Si el objeto S3 no es publico o no puede leerse, el tag `img/audio` no renderizara aunque la URL este guardada; revisar acceso `GetObject`/CloudFront.

## Actualizacion 2026-06-06 - RSVP abierto vs lista cerrada

- `InvitationModel` y `InvitationPayload` soportan `accessMode: 'open' | 'guest_list'`.
- `InvitationModel` y `InvitationPayload` soportan `rsvpSettings` para fecha limite, cambios, `maybe`, confirmacion al declinar y recordatorios.
- El editor permite elegir:
  - `guest_list`: solo invitados registrados pueden responder.
  - `open`: cualquiera con el link puede responder.
- Al crear invitacion desde detalle de evento, el frontend envia `accessMode: 'guest_list'` por defecto.
- La pagina publica:
  - mantiene formulario directo para `open`,
  - en `guest_list` pide email, llama `POST /api/invitations/public/:slug/guest-access`, precarga nombre/email y limita acompanantes.
- Invitaciones antiguas sin `accessMode` se tratan como `open` para no romper links ya publicados.

## Actualizacion 2026-06-06 - Reglas RSVP, maybe y duplicados

- `RsvpResponse` ahora permite `confirmed`, `declined` y `maybe`.
- El editor muestra reglas RSVP:
  - fecha limite,
  - permitir "No estoy seguro",
  - permitir cambios hasta la fecha limite,
  - confirmacion extra al declinar,
  - dias antes para recordatorio.
- La pagina publica muestra la fecha limite si existe.
- Si el invitado elige `declined`:
  - oculta acompanantes y comida,
  - muestra advertencia,
  - exige checkbox cuando `declineRequiresConfirmation` esta activo.
- Si el invitado elige `maybe`:
  - oculta acompanantes y comida,
  - muestra mensaje de recordatorio antes del deadline.
- Si el backend actualiza una respuesta existente, la UI muestra "Tu respuesta fue actualizada".

## Actualizacion 2026-06-06 - Telefono internacional RSVP

- `RsvpPayload` soporta telefono opcional:
  - `phoneCountryCode`,
  - `phoneNationalNumber`.
- `RsvpModel` muestra:
  - `phoneE164`,
  - `phoneVerified`,
  - `phoneVerificationStatus`.
- La pagina publica captura codigo de pais y telefono nacional; default visual `+52`.
- Si no se captura telefono, el frontend no envia campos vacios para no disparar validacion.
- El detalle de evento muestra `phoneE164` y estado de verificacion en la tabla RSVP.
- WhatsApp no esta implementado todavia; el texto indica que se usara para recordatorios cuando este disponible.

## Actualizacion 2026-06-07 - Duplicados y edicion de invitados

- `ApiService` agrega `updateGuest(id, payload)` contra `PATCH /api/guests/:id`.
- La lista del evento permite editar invitados desde la tabla reutilizando el formulario de alta.
- El formulario valida localmente email/telefono duplicados dentro del mismo evento antes de enviar.
- Si backend responde `409`, la UI muestra que el contacto ya pertenece a otro invitado y sugiere editarlo.
- Importacion CSV/XLSX muestra importados, filas invalidas, duplicados omitidos y hasta 5 detalles de conflicto.

## Actualizacion 2026-07-23 - Soporte de Almacenamiento Local de Imagenes

- Backend configurado para servir uploads locales (`/uploads/...`) con cabeceras `Cross-Origin-Resource-Policy: cross-origin` y `Access-Control-Allow-Origin: *`.
- Cuando AWS S3 no esta configurado (o `STORAGE_PROVIDER=local`), la app puede subir y mostrar imagenes locales en la portada, galeria y audios directamente desde `http://localhost:4000/uploads/...` sin requerir bucket AWS.
