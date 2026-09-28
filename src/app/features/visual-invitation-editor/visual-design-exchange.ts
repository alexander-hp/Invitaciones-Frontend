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
            { id: 'rsvp-link', type: 'button', text: 'Confirmar asistencia', binding: 'section:rsvp', x: 25, y: 80, width: 50, height: 8, style: { backgroundColor: '#26352f', color: '#ffffff', borderRadius: 8 } }
          ]
        },
        { id: 'rsvp', type: 'rsvp', title: 'Confirma tu asistencia', enabled: true, layout: 'canvas', height: 920, background: { color: '#fffaf7' }, layers: [] }
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
    'Dentro de style usa solo propiedades del editor como color, backgroundColor, fontFamily, fontSize, fontWeight, fontStyle (normal/italic), textAlign, borderRadius, opacity, borderColor, borderWidth, boxShadow y objectFit. No pongas CSS animation, transform, clipPath ni @keyframes en style; para girar usa rotation en la capa.',
    'Para animar una capa usa animation fuera de style: {"type":"float","duration":7,"delay":0,"repeat":true}. Tipos disponibles: none, fade, slide-up, slide-left (entra desde la derecha), slide-right (entra desde la izquierda), zoom, float, pulse y bounce. No uses nombres CSS como fadeInUp, pulse 2s o @keyframes.',
    'Usa {{event.title}}, {{event.date}}, {{event.time}}, {{event.venue}}, {{invitation.headline}} y {{invitation.message}} para datos dinámicos. No incluyas nombres, correos ni teléfonos reales.',
    'Para una invitación completa incluye una sección nativa type: rsvp con layers: [] salvo que yo pida quitar confirmaciones. Incluye countdown si el evento tiene fecha, y locations si ya hay ubicaciones configuradas. Para galería, regalos, álbum, dedicatorias o DJ usa las secciones nativas gallery, gifts, album, dedications o songs cuando las pida. Evita entregar solo secciones custom decorativas.',
    'Los módulos nativos se agregan como secciones con layers: []; consumen datos ya configurados en KyndraSoft. El JSON no crea por sí solo invitados, fotografías, ubicaciones ni canciones. Nunca dibujes campos de un formulario como texto estático ni finjas un botón funcional sin binding.',
    'Un botón que lleve a otra sección usa binding: "section:rsvp" (o el id de esa sección). Los formularios nativos no necesitan HTML ni llamadas API.',
    'Para imágenes/audio/video usa una URL HTTPS real que yo proporcione; si no la hay, omite esa capa para que yo agregue el archivo en el editor. No inventes URLs ni incluyas archivos base64.',
    'No agregues scripts, iframes, datos de invitados, tokens, contraseñas ni lógica de pagos. El resultado debe poder importarse como diseño, no como una aplicación autónoma.',
    'Ejemplo mínimo de respuesta válida; reemplaza su composición por la que te describa:',
    JSON.stringify(example, null, 2)
  ].join('\n\n');
}
