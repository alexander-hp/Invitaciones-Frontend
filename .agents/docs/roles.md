

## 👥 Colaboradores y Equipo Interno (`EventMember.js`)

El sistema permite invitar y asignar roles al equipo que trabaja en la organización y ejecución del evento. 

### 🎭 Roles Disponibles (8 Roles)

| Rol (`role`) | Nombre del Rol | Permisos Asignados por Defecto |
|---|---|---|
| `owner` | Propietario / Dueño | Todos los permisos (acceso total, edición y gestión financiera). |
| `organizer` | Organizador / Wedding Planner | Ver/editar evento, métricas, invitados, mesas, check-in, álbum, dedicatorias y música. |
| `client` | Cliente / Anfitrión principal | Visualización del evento (`view_event`). |
| `venue_owner` | Salón / Lugar del Evento | Ver evento, métricas, gestión de mesas y acceso a recepción/check-in. |
| `vendor` | Proveedor Externo General | Visualización del evento (`view_event`). |
| `staff` | Staff / Recepción en Puerta | Ver evento y escanear QR / realizar check-in de invitados en puerta (`check_in`). |
| `dj` | DJ / Sonido | Ver evento y moderar/organizar peticiones de canciones (`manage_songs`). |
| `photographer` | Fotógrafo | Ver evento y moderar/aprobar fotos subidas al álbum de invitados (`review_album`). |

### 🔑 Lista Granular de Permisos (`PERMISSIONS`)

* `view_event`: Ver información general del evento.
* `edit_event`: Editar detalles, horarios y secciones del evento.
* `view_metrics`: Ver tablero de métricas y estadísticas.
* `manage_guests`: Crear, editar y eliminar invitados.
* `manage_tables`: Crear y asignar mesas a invitados.
* `check_in`: Escanear pases / confirmar entrada de invitados en puerta.
* `review_album`: Moderar y aprobar/rechazar fotos del álbum de invitados.
* `review_dedications`: Moderar y aprobar mensajes del libro de firmas.
* `manage_songs`: Aprobar, rechazar u ordenar canciones solicitadas para el DJ.
* `view_payments`: Ver reporte financiero y registro de pagos.

