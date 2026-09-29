import { VisualInvitationDesign } from '../../core/models';

export interface VisualDesignExchangeFile {
  format: 'kyndrasoft-visual-design';
  version: 1;
  design: VisualInvitationDesign;
}

export function createVisualDesignExchange(design: VisualInvitationDesign): VisualDesignExchangeFile {
  return { format: 'kyndrasoft-visual-design', version: 1, design };
}

export function createVisualDesignAiPrompt(eventType?: string): string {
  const example: VisualDesignExchangeFile = {
    format: 'kyndrasoft-visual-design',
    version: 1,
    design: {
      version: 2, active: true, mode: 'advanced', presentationMode: 'continuous', responsiveMode: 'shared',
      theme: {
        backgroundColor: '#fffaf7', textColor: '#26352f', accentColor: '#bc675e',
        headingFont: 'Georgia, serif', bodyFont: 'Arial, sans-serif',
        buttonBackgroundColor: '#26352f', buttonTextColor: '#ffffff', buttonStyle: 'solid', buttonRadius: 8
      },
      sections: [
        {
          id: 'hero', type: 'hero', title: 'Portada', enabled: true, layout: 'canvas', height: 760,
          background: { color: '#fffaf7' },
          layers: [
            { id: 'title', type: 'text', name: 'Nombre del evento', text: '{{event.title}}', x: 10, y: 30, width: 80, height: 18, style: { fontFamily: 'Georgia, serif', fontSize: 44, color: '#26352f', textAlign: 'center' } },
            { id: 'date', type: 'text', text: '{{event.date}}', x: 20, y: 52, width: 60, height: 8, style: { fontSize: 16, color: '#26352f', textAlign: 'center' } },
            { id: 'rsvp-link', type: 'button', text: 'Confirmar asistencia', binding: 'section:rsvp', x: 12, y: 80, width: 36, height: 8, style: { backgroundColor: '#26352f', color: '#ffffff', borderRadius: 8 } },
            { id: 'pass-link', type: 'button', text: 'Consultar mi mesa', binding: 'section:guest-pass', x: 52, y: 80, width: 36, height: 8, style: { backgroundColor: '#bc675e', color: '#ffffff', borderRadius: 8 } }
          ]
        },
        { id: 'rsvp', type: 'rsvp', title: 'Confirma tu asistencia', enabled: true, layout: 'canvas', height: 920, background: { color: '#fffaf7' }, layers: [] },
        { id: 'guest-pass', type: 'guestPass', title: 'Mi mesa y pase', enabled: true, layout: 'canvas', height: 760, background: { color: '#fffaf7' }, layers: [] },
        {
          id: 'recuerdos', type: 'custom', title: 'Recuerdos', enabled: true, layout: 'canvas', height: 640,
          background: { color: '#fffaf7' },
          layers: [
            { id: 'marco-1', groupId: 'fotos-recuerdos', type: 'image', name: 'Foto izquierda', x: 12, y: 23, width: 35, height: 54, style: { frameEnabled: true, imageMask: 'arch', objectFit: 'cover', objectPositionX: 50, objectPositionY: 50, borderWidth: 3, borderColor: '#bc675e', borderStyle: 'solid' } },
            { id: 'marco-2', groupId: 'fotos-recuerdos', type: 'image', name: 'Foto derecha', x: 53, y: 23, width: 35, height: 54, style: { frameEnabled: true, imageMask: 'arch', objectFit: 'cover', objectPositionX: 50, objectPositionY: 50, borderWidth: 3, borderColor: '#bc675e', borderStyle: 'solid' } }
          ]
        }
      ]
    }
  };
  return [
    'Diseña una invitación digital editable para KyndraSoft.',
    `Tipo de evento: ${eventType || 'celebración'}.`,
    'Devuelve únicamente un objeto JSON válido. No uses Markdown, HTML, CSS, JavaScript ni comentarios.',
    'Usa el formato y las claves exactas del ejemplo. Puedes añadir secciones y capas siguiendo la misma estructura.',
    'Cada sección necesita id único, type, title, enabled, layout, height en píxeles, background y layers.',
    'Cada capa necesita id único, type, x, y, width y height en porcentajes; x puede estar entre -100 y 200 para decoraciones que sobresalgan. La parte fuera del ancho visible se recorta, así que mantén nombres, fecha, botones y formularios dentro de 0..100. Para páginas divididas mantén el contenido esencial también dentro del alto visible.',
    'Tipos de capa útiles: text, image, video, audio, button, shape. Mantén textos legibles, contraste y espacio suficiente para móvil.',
    'Para un marco editable crea una capa type: "image" con style.frameEnabled: true. Elige style.imageMask entre none, circle, rounded, arch, diamond, hexagon o ticket. Puedes usar objectFit: "cover" o "contain", objectPositionX/Y entre 0 y 100, imageScale entre 0.5 y 3, borderColor, borderWidth y borderStyle (solid/dashed/dotted). No dibujes el marco como una imagen aplanada ni uses clipPath CSS: la foto y el marco deben seguir editables.',
    'Si quieres una composición de varias fotos, crea una capa image por foto dentro de la misma sección, con id distinto y el mismo groupId; distribuye x, y, width y height para formar un díptico, tríptico, cuadrícula, tira de fotos o collage editorial. Usa style.frameEnabled: true en todas. Evita superposiciones involuntarias y deja márgenes para los tres tamaños de pantalla. El ejemplo incluye un díptico con marcos vacíos.',
    'Para posiciones diferentes por dispositivo usa design.responsiveMode: "independent" y, en cada capa, layouts.mobile, layouts.tablet y layouts.desktop con x, y, width, height y rotation opcional en porcentajes. Conserva también x, y, width y height base. Si usas responsiveMode: "shared", omite layouts y diseña para que no se recorten fotos ni textos en móvil.',
    'Dentro de style usa solo propiedades del editor como color, backgroundColor, fontFamily, fontSize, fontWeight, fontStyle (normal/italic), textAlign, borderRadius, opacity, borderColor, borderWidth, borderStyle, boxShadow, objectFit y las propiedades de marco descritas arriba. No pongas CSS animation, transform, clipPath ni @keyframes en style; para girar usa rotation en la capa.',
    'Para animar una capa usa animation fuera de style: {"type":"float","duration":7,"delay":0,"repeat":true}. Tipos disponibles: none, fade, slide-up, slide-left (entra desde la derecha), slide-right (entra desde la izquierda), zoom, float, pulse y bounce. No uses nombres CSS como fadeInUp, pulse 2s o @keyframes.',
    'Usa {{event.title}}, {{event.date}}, {{event.time}}, {{event.venue}}, {{event.address}}, {{invitation.headline}} y {{invitation.message}} para datos dinámicos. Para personalización del invitado usa {{guest.name}}, {{guest.group}}, {{guest.table}}, {{guest.seat}} o {{guest.companions}}; estos valores dependen de la identificación del invitado. No incluyas nombres, correos ni teléfonos reales.',
    'Catálogo de secciones conectadas (type exacto): rsvp = confirmar asistencia; guestPass = identificar invitado, consultar mesa y pase QR; guestActivity = ver pase y actividad; countdown = cuenta regresiva; locations = ubicaciones y mapas; itinerary = itinerario; dressCode = vestimenta; gifts = mesa de regalos y sobre digital; lodging = hospedaje; gallery = galería del anfitrión; album = fotos de invitados; dedications = libro de mensajes; songs = solicitudes al DJ. Para historia y contenido libre usa story o custom. Solicita solo las funciones que yo pida, pero para una invitación completa incluye rsvp salvo que indique lo contrario.',
    'Para agregar cualquiera de esas funciones crea una sección con type exacto, id único, enabled: true, layout: "canvas", height, background y layers: []. KyndraSoft generará los controles funcionales editables y consumirá datos ya configurados. La sección guestPass muestra la mesa asignada y el pase: NO asigna mesas ni crea invitados. El JSON tampoco crea fotografías, regalos, ubicaciones, canciones ni registros; esas fuentes se administran en el dashboard. Evita entregar solo secciones custom decorativas.',
    'Para colocar un enlace visual a una función crea una capa type: "button" con binding: "section:<id>" donde <id> coincide exactamente con el id de la sección nativa; por ejemplo section:rsvp o section:guest-pass del ejemplo. Para abrir la ubicación principal usa binding: "map" y para agregar el evento al calendario usa binding: "calendar". No finjas botones funcionales sin binding ni dibujes formularios como texto estático.',
    'Solo si te pido diseñar cada control funcional en el JSON, usa capas type: "field", "button" o "text" dentro de la sección nativa correspondiente, con bindings reales y estilos editables. Referencias: rsvp.name, rsvp.email, rsvp.response, rsvp.companions y botón rsvp.submit; pass.email, pass.phone, botón pass.identify, pass.qr y pass.table; album.upload y album.gallery; dedication.publicName, dedication.message, botón dedication.submit y dedication.wall; song.title, song.sourceUrl, song.artist y botón song.submit. Incluye también los controles necesarios de cada flujo; una sección con algunas capas conectadas no autocompleta las que falten. Por defecto prefiere layers: [] y personaliza los controles después en el editor.',
    'Para imágenes/audio/video usa una URL HTTPS real que yo proporcione; si no la hay, omite la capa multimedia. Excepción: puedes dejar una capa image sin url cuando sea un marco vacío intencional (style.frameEnabled: true); yo arrastraré o subiré la foto al editor después. No inventes URLs ni incluyas archivos base64.',
    'No agregues scripts, iframes, datos de invitados, tokens, contraseñas ni lógica de pagos. El resultado debe poder importarse como diseño, no como una aplicación autónoma.',
    'Ejemplo mínimo de respuesta válida; reemplaza su composición por la que te describa:',
    JSON.stringify(example, null, 2)
  ].join('\n\n');
}
