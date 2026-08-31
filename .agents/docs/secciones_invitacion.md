# Reporte de Secciones y Elementos de la Invitación

Este documento detalla la estructura y lista completa de secciones y elementos configurables en la invitación dentro del sistema (Backend y Frontend).

---

## 📐 Estructura en Base de Datos y Modelos

En el **Backend**, la configuración de las secciones se administra a través de dos modelos principales:

1. **`Invitation.js` (`content.sectionSettings`)**: Controla la visibilidad (booleans) de la mayoría de las secciones de la invitación.
2. **`Event.js` (`externalContent.songRequestSettings`)**: Controla las reglas del módulo de música y peticiones de canciones para el DJ.

---

## 📋 Lista Completa de Secciones y Elementos (12 Elementos)

| # | Clave (`key`) | Icono | Nombre de Sección | Propiedad Backend | Descripción |
|---|---|---|---|---|---|
| 1 | `guestAlbum` | 📸 | Álbum Interactivo de Invitados | `sectionSettings.guestAlbum` | Permite a los invitados subir fotos en tiempo real durante el evento. |
| 2 | `gallery` | 🖼️ | Galería Fotográfica Oficial | `sectionSettings.gallery` | Muestra la galería con fotos del evento o sesión de los novios/festejados. |
| 3 | `songRequests` | 🎵 | Música / Pedir Canciones (DJ) | `songRequestSettings.enabled` | Módulo interactivo para que los invitados sugieran canciones al DJ. |
| 4 | `dedications` | 💬 | Dedicatorias y Libro de Firmas | `sectionSettings.dedications` | Muro de mensajes, felicitaciones y buenos deseos para los festejados. |
| 5 | `rsvp` | 💌 | Confirmación de Asistencia | `sectionSettings.rsvp` | Formulario de confirmación de asistencia, pases y acompañantes. |
| 6 | `story` | 📖 | Nuestra Historia | `sectionSettings.story` | Reseña o historia de la pareja / festejado(a). |
| 7 | `locations` | 📍 | Mapas y Ubicaciones | `sectionSettings.locations` | Direcciones de misa/recepción con enlaces directos a Google Maps o Waze. |
| 8 | `itinerary` | 📅 | Itinerario / Cronograma | `sectionSettings.itinerary` | Agenda con horarios y actividades del evento. |
| 9 | `dressCode` | 👔 | Código de Vestimenta | `sectionSettings.dressCode` | Indicaciones de etiqueta y vestuario sugerido para los asistentes. |
| 10 | `giftRegistry` | 🎁 | Mesa de Regalos | `sectionSettings.giftRegistry` | Catálogo y enlaces externos a tiendas (Amazon, Liverpool, etc.). |
| 11 | `digitalEnvelope` | ✉️ | Sobre Digital / Transferencias | `sectionSettings.digitalEnvelope` | Datos bancarios, CLABE y código QR para obsequios en efectivo. |
| 12 | `lodging` | 🏨 | Hospedaje y Hoteles | `sectionSettings.lodging` | Recomendaciones de alojamiento y hoteles cercanos al evento. |

---

## 🎼 Configuración de Música de Fondo

Además de las peticiones de canciones para el DJ (`songRequests`), la invitación cuenta con soporte para música de ambiente:

* **`content.musicUrl`**: Enlace al archivo de audio principal que suena al navegar por la invitación.
* **`content.sectionMusic`**: Mapa (`Map<key, string>`) para definir canciones o audios específicos por cada sección de la invitación.

---

## 🔐 Restricciones por Plan de Servicio (`plans.js`)

Algunas secciones y funciones están sujetas a los límites del plan contratado:

* **Free Demo:** `galleryImages: 3`, `music: false`, `guestAlbum: false`.
* **Evento Individual (`event_12m`):** `galleryImages: 20`, `music: true`, `guestAlbum: true`.
* **Dashboard Externo / Planner Pro:** Sin restricciones severas en galerías y acceso completo a todos los módulos.
