import {
  VisualInvitationDesign,
  VisualInvitationSection
} from '../../core/models';
import { createPassLayer, PASS_CANVAS_PRESETS } from './visual-pass-presets';

export interface PassTemplateSetOption {
  key: string;
  name: string;
  tag: string;
  description: string;
  icon: string;
  previewBg: string;
  previewCardBg: string;
  previewAccent: string;
  previewText: string;
  previewIsArch?: boolean;
  headingFont: string;
  bodyFont: string;
  qrAccent: string;
}

export const PASS_TEMPLATE_SETS: PassTemplateSetOption[] = [
  {
    key: 'palais-celeste-astral',
    name: 'Palais Céleste · Astral VIP',
    tag: 'Nuevo · Gala Astral',
    description: 'Zafiro medianoche y nácar Art-Déco con astrolabio de oro champagne y código QR de gala estelar.',
    icon: 'sparkles',
    previewBg: '#0b1428',
    previewCardBg: '#122140',
    previewAccent: '#d4aa5a',
    previewText: '#faf6ee',
    previewIsArch: true,
    headingFont: "'Cinzel', serif",
    bodyFont: "'Montserrat', sans-serif",
    qrAccent: '#d4aa5a'
  },
  {
    key: 'boda-imperial-oro',
    name: 'Boda Imperial · Arco Dorado',
    tag: 'Boda Clásica',
    description: 'Papelería en marfil algodón con arco arquitectónico, doble filete oro antiguo y QR con anillos.',
    icon: 'sparkles',
    previewBg: '#f6efe4',
    previewCardBg: '#fffdfa',
    previewAccent: '#b8925a',
    previewText: '#2c2421',
    previewIsArch: true,
    headingFont: "'Playfair Display', serif",
    bodyFont: "'Montserrat', sans-serif",
    qrAccent: '#b8925a'
  },
  {
    key: 'velada-noir-gala',
    name: 'Gala Nocturna · Noir VIP',
    tag: 'Black Tie · VIP',
    description: 'Obsidiana profunda con barra metálica champagne, tipografía Cinzel y QR de gala con corona.',
    icon: 'crown',
    previewBg: '#0b101b',
    previewCardBg: '#121a2b',
    previewAccent: '#d4af37',
    previewText: '#f8f5ee',
    headingFont: "'Cinzel', serif",
    bodyFont: "'Montserrat', sans-serif",
    qrAccent: '#d4af37'
  },
  {
    key: 'jardin-botanico-esmeralda',
    name: 'Jardín Botánico · Esmeralda',
    tag: 'Romántico · Hacienda',
    description: 'Bosque esmeralda aterciopelado con marco orgánico en oro rosado, caligrafía fina y QR botánico.',
    icon: 'flower-2',
    previewBg: '#0d2620',
    previewCardBg: '#13352c',
    previewAccent: '#e5c1a0',
    previewText: '#f7f4ee',
    headingFont: "'Cormorant Garamond', serif",
    bodyFont: "'Montserrat', sans-serif",
    qrAccent: '#047857'
  },
  {
    key: 'atelier-vogue-editorial',
    name: 'Atelier Editorial · Vogue',
    tag: 'Minimal · Editorial',
    description: 'Blanco puro y tinta grafito tipo revista europea con retícula editorial y QR de doble filete.',
    icon: 'shapes',
    previewBg: '#f3f1ed',
    previewCardBg: '#ffffff',
    previewAccent: '#18181b',
    previewText: '#18181b',
    headingFont: "'Cormorant Garamond', serif",
    bodyFont: "'Montserrat', sans-serif",
    qrAccent: '#18181b'
  }
];

export function getPassTemplateSetByKey(key?: string): PassTemplateSetOption | undefined {
  if (!key) return undefined;
  return PASS_TEMPLATE_SETS.find((p) => p.key === key);
}

const DEMO_QR_URL = 'https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=VIP-ACCESO-DEMO';

export function buildPassDesignFromTemplateSet(
  templateKey: string,
  uid: (prefix: string) => string,
  currentPresetKey?: string
): VisualInvitationDesign {
  const tpl = getPassTemplateSetByKey(templateKey) || PASS_TEMPLATE_SETS[0];
  const canvasPreset = PASS_CANVAS_PRESETS.find((p) => p.preset === currentPresetKey) || PASS_CANVAS_PRESETS[0];
  const w = canvasPreset.width;
  const h = canvasPreset.height;

  const baseSheetMeta = {
    type: 'passSheet' as const,
    enabled: true,
    layout: 'canvas' as const,
    height: h,
    pluginSettings: {
      sheetWidth: w,
      sheetHeight: h,
      sheetPreset: canvasPreset.preset,
      passTemplateKey: tpl.key
    }
  };

  let sheet1: VisualInvitationSection;
  let sheet2: VisualInvitationSection;

  if (tpl.key === 'palais-celeste-astral') {
    // ═══ SET ASTRAL: PALAIS CÉLESTE · GALA ASTRAL & ART-DÉCO ═══
    sheet1 = {
      ...baseSheetMeta,
      id: uid('sheet'),
      title: 'Hoja 1 (Frente Astral)',
      background: { color: '#081020', overlay: 0 },
      layers: [
        createPassLayer(uid, 'shape', 'Tarjeta Zafiro Medianoche', 5, 3, 90, 94, 1, {
          backgroundColor: '#0e1b36',
          borderColor: '#d4aa5a',
          borderWidth: 1.8,
          borderRadius: 22,
          boxShadow: '0 22px 52px rgba(0,0,0,0.68)'
        }),
        createPassLayer(uid, 'shape', 'Arco Art-Déco Interior', 8, 5, 84, 90, 2, {
          backgroundColor: 'transparent',
          borderColor: 'rgba(212, 170, 90, 0.42)',
          borderWidth: 1.2,
          borderRadius: 180
        }),
        createPassLayer(uid, 'image', 'Astrolabio Dorado', 41, 6.5, 18, 9, 3, {
          objectFit: 'contain'
        }, { url: 'assets/templates/palais-celeste/celestial-astrolabe-crest.svg' }),
        createPassLayer(uid, 'text', 'Insignia Astral', 12, 16, 76, 3.6, 4, {
          color: '#ebd094',
          fontSize: 10,
          fontWeight: '700',
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center',
          letterSpacing: 2.6
        }, { text: '★ PALAIS CÉLESTE · PASE VIP ★' }),
        createPassLayer(uid, 'text', 'Título del Evento', 10, 20.5, 80, 9, 5, {
          color: '#faf6ee',
          fontSize: 23,
          fontWeight: '700',
          fontFamily: "'Cinzel', serif",
          textAlign: 'center',
          letterSpacing: 1.4,
          lineHeight: 1.18
        }, { text: '{{event.title}}' }),
        createPassLayer(uid, 'text', 'Nombre del Invitado', 10, 31, 80, 6.5, 6, {
          color: '#ebd094',
          fontSize: 18,
          fontWeight: '600',
          fontFamily: "'Cormorant Garamond', serif",
          textAlign: 'center'
        }, { text: '{{guest.name}}' }),
        createPassLayer(uid, 'text', 'Mesa y Lugares', 12, 38, 76, 5, 7, {
          color: '#cbd5e1',
          fontSize: 11.5,
          fontWeight: '600',
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center',
          letterSpacing: 1
        }, { text: '{{guest.table}}  ·  {{guest.companions}} LUGARES' }),
        createPassLayer(uid, 'image', 'Código QR Astral', 25, 45.5, 50, 38, 8, {
          objectFit: 'contain',
          qrFrameStyle: 'banner-bottom',
          qrFrameColor: '#d4aa5a',
          qrFrameText: '★ ACCESO ASTRAL VIP ★',
          qrFrameTextColor: '#0b1428',
          qrBgColor: '#ffffff',
          qrCenterLogo: 'crown',
          qrCenterLogoBg: '#d4aa5a',
          borderRadius: 14
        }, { url: DEMO_QR_URL, binding: 'guest.qrCode' }),
        createPassLayer(uid, 'text', 'Folio Check-in', 16, 86.5, 68, 4, 9, {
          color: 'rgba(235, 208, 148, 0.85)',
          fontSize: 10.5,
          fontWeight: '700',
          fontFamily: 'monospace',
          textAlign: 'center',
          letterSpacing: 2
        }, { text: 'FOLIO: {{guest.checkInCode}}' })
      ]
    };
    sheet2 = {
      ...baseSheetMeta,
      id: uid('sheet'),
      title: 'Hoja 2 (Reverso Nacarado)',
      background: { color: '#f6f1e6', overlay: 0 },
      layers: [
        createPassLayer(uid, 'shape', 'Pliego Nacarado Reverso', 5, 3, 90, 94, 1, {
          backgroundColor: '#ffffff',
          borderColor: '#c89d4c',
          borderWidth: 1.6,
          borderRadius: 22
        }),
        createPassLayer(uid, 'text', 'Cabecera Reverso', 14, 10, 72, 4, 2, {
          color: '#9c7125',
          fontSize: 10.5,
          fontWeight: '700',
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center',
          letterSpacing: 2.5
        }, { text: 'COORDENADAS & PROTOCOLO' }),
        createPassLayer(uid, 'text', 'Evento Reverso', 12, 15.5, 76, 7.5, 3, {
          color: '#0b1428',
          fontSize: 21,
          fontWeight: '700',
          fontFamily: "'Cinzel', serif",
          textAlign: 'center'
        }, { text: '{{event.title}}' }),
        createPassLayer(uid, 'shape', 'Caja Sede', 12, 25, 76, 18, 4, {
          backgroundColor: '#f8f4ec',
          borderColor: 'rgba(200, 157, 76, 0.45)',
          borderWidth: 1,
          borderRadius: 14
        }),
        createPassLayer(uid, 'text', 'Sede y Fecha', 14, 27.5, 72, 13, 5, {
          color: '#1e293b',
          fontSize: 12,
          lineHeight: 1.6,
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center'
        }, { text: '{{event.venue}}\n{{event.date}} · {{event.time}}' }),
        createPassLayer(uid, 'text', 'Indicaciones de Gala', 13, 47, 74, 28, 6, {
          color: '#334155',
          fontSize: 12,
          lineHeight: 1.7,
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'left'
        }, {
          text: '• Presenta tu código QR digital o impreso al llegar.\n\n• Acceso personal válido para {{guest.companions}} personas en {{guest.table}}.\n\n• Gracias por ser parte de nuestra gran velada bajo las estrellas.'
        }),
        createPassLayer(uid, 'text', 'Despedida', 12, 79, 76, 8, 7, {
          color: '#9c7125',
          fontSize: 28,
          fontFamily: "'Great Vibes', cursive",
          textAlign: 'center'
        }, { text: '¡Nos vemos bajo las estrellas!' })
      ]
    };
  } else if (tpl.key === 'velada-noir-gala') {
    // ═══ SET 2: GALA NOCTURNA · NOIR VIP ═══
    sheet1 = {
      ...baseSheetMeta,
      id: uid('sheet'),
      title: 'Hoja 1 (Frente)',
      background: { color: '#090d16', overlay: 0 },
      layers: [
        createPassLayer(uid, 'shape', 'Tarjeta Obsidiana', 5, 3, 90, 94, 1, {
          backgroundColor: '#111827',
          borderColor: 'rgba(212, 175, 55, 0.55)',
          borderWidth: 1.5,
          borderRadius: 16,
          boxShadow: '0 18px 48px rgba(0,0,0,0.65)'
        }),
        createPassLayer(uid, 'shape', 'Barra Metálica Superior', 5, 3, 90, 1.4, 2, {
          backgroundColor: '#d4af37',
          borderRadius: 16
        }),
        createPassLayer(uid, 'shape', 'Marco Interior Champagne', 8, 5.5, 84, 89, 3, {
          backgroundColor: 'transparent',
          borderColor: 'rgba(212, 175, 55, 0.22)',
          borderWidth: 1,
          borderRadius: 12
        }),
        createPassLayer(uid, 'text', 'Insignia VIP', 12, 7.5, 76, 3.8, 4, {
          color: '#d4af37',
          fontSize: 10.5,
          fontWeight: '700',
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center',
          letterSpacing: 2.6
        }, { text: '★ BLACK TIE · PASE VIP ★' }),
        createPassLayer(uid, 'text', 'Título del Evento', 10, 12, 80, 9.5, 5, {
          color: '#f8f5ee',
          fontSize: 24,
          fontWeight: '700',
          fontFamily: "'Cinzel', serif",
          textAlign: 'center',
          letterSpacing: 1.6,
          lineHeight: 1.18
        }, { text: '{{event.title}}' }),
        createPassLayer(uid, 'text', 'Fecha del Evento', 12, 22, 76, 3.8, 6, {
          color: 'rgba(212, 175, 55, 0.88)',
          fontSize: 11.5,
          fontWeight: '500',
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center',
          letterSpacing: 1
        }, { text: '{{event.date}}' }),
        createPassLayer(uid, 'image', 'Código QR Dinámico', 25, 28, 50, 29, 7, {
          borderRadius: 14,
          qrFrameStyle: 'banner-bottom',
          qrFrameColor: '#d4af37',
          qrFrameText: '★ ACCESO VIP ★',
          qrFrameTextColor: '#090d16',
          qrColor: '#0f172a',
          qrBgColor: '#ffffff',
          qrEyeShape: 'circle',
          qrCenterLogo: 'crown',
          qrCenterLogoBg: '#d4af37'
        }, { binding: 'pass.qrCode', url: DEMO_QR_URL }),
        createPassLayer(uid, 'text', 'Etiqueta Invitado', 14, 60, 72, 3, 8, {
          color: 'rgba(248, 245, 238, 0.55)',
          fontSize: 9.5,
          fontWeight: '600',
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center',
          letterSpacing: 2.2
        }, { text: 'INVITADO DE HONOR' }),
        createPassLayer(uid, 'text', 'Nombre del Invitado', 10, 63.5, 80, 6.5, 9, {
          color: '#ffffff',
          fontSize: 23,
          fontWeight: '700',
          fontFamily: "'Cinzel', serif",
          textAlign: 'center'
        }, { text: '{{guest.name}}' }),
        createPassLayer(uid, 'shape', 'Banda Mesa y Pases', 12, 72, 76, 8, 10, {
          backgroundColor: 'rgba(212, 175, 55, 0.10)',
          borderColor: 'rgba(212, 175, 55, 0.35)',
          borderWidth: 1,
          borderRadius: 10
        }),
        createPassLayer(uid, 'text', 'Mesa y Pases', 14, 74, 72, 4.5, 11, {
          color: '#f3d98b',
          fontSize: 13,
          fontWeight: '700',
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center',
          letterSpacing: 0.8
        }, { text: 'MESA {{guest.table}}  ·  {{guest.companions}} PASES' }),
        createPassLayer(uid, 'text', 'Lugar del Evento', 12, 82.5, 76, 4.5, 12, {
          color: 'rgba(248, 245, 238, 0.78)',
          fontSize: 11.5,
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center'
        }, { text: '{{event.venue}}' }),
        createPassLayer(uid, 'text', 'Folio Check-in', 16, 89, 68, 3.2, 13, {
          color: 'rgba(212, 175, 55, 0.6)',
          fontSize: 10,
          fontWeight: '600',
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center',
          letterSpacing: 1.8
        }, { text: 'FOLIO #{{guest.checkInCode}}' })
      ]
    };

    sheet2 = {
      ...baseSheetMeta,
      id: uid('sheet'),
      title: 'Hoja 2 (Reverso)',
      background: { color: '#090d16', overlay: 0 },
      layers: [
        createPassLayer(uid, 'shape', 'Tarjeta Reverso', 5, 3, 90, 94, 1, {
          backgroundColor: '#111827',
          borderColor: 'rgba(212, 175, 55, 0.55)',
          borderWidth: 1.5,
          borderRadius: 16
        }),
        createPassLayer(uid, 'shape', 'Barra Superior Reverso', 5, 3, 90, 1.4, 2, {
          backgroundColor: '#d4af37',
          borderRadius: 16
        }),
        createPassLayer(uid, 'text', 'Cabecera Reverso', 12, 9, 76, 4.5, 3, {
          color: '#d4af37',
          fontSize: 12,
          fontWeight: '700',
          fontFamily: "'Cinzel', serif",
          textAlign: 'center',
          letterSpacing: 2.5
        }, { text: 'PROTOCOLO DE ACCESO VIP' }),
        createPassLayer(uid, 'shape', 'Divisor Dorado', 32, 15, 36, 0.35, 4, {
          backgroundColor: '#d4af37',
          opacity: 0.65
        }),
        createPassLayer(uid, 'shape', 'Caja Datos Evento', 11, 19, 78, 22, 5, {
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
          borderColor: 'rgba(212, 175, 55, 0.3)',
          borderWidth: 1,
          borderRadius: 12
        }),
        createPassLayer(uid, 'text', 'Datos Dinámicos Evento', 14, 21.5, 72, 17, 6, {
          color: '#f8f5ee',
          fontSize: 12,
          lineHeight: 1.65,
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center'
        }, { text: '{{event.title}}\n{{event.date}} · {{event.time}}\n{{event.venue}}' }),
        createPassLayer(uid, 'text', 'Indicaciones VIP', 12, 46, 76, 32, 7, {
          color: 'rgba(248, 245, 238, 0.82)',
          fontSize: 12,
          lineHeight: 1.75,
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'left'
        }, {
          text: '• Presenta el código QR del frente al llegar a la recepción.\n\n• Este pase es personal e incluye {{guest.companions}} lugares en {{guest.table}}.\n\n• Te sugerimos llegar 15 minutos antes del inicio.'
        }),
        createPassLayer(uid, 'text', 'Firma Gala', 12, 83, 76, 6, 8, {
          color: '#d4af37',
          fontSize: 16,
          fontFamily: "'Cinzel', serif",
          textAlign: 'center',
          letterSpacing: 1.5
        }, { text: 'UNA NOCHE INOLVIDABLE' }),
        createPassLayer(uid, 'text', 'Pie Invitado', 14, 90, 72, 3, 9, {
          color: 'rgba(248, 245, 238, 0.45)',
          fontSize: 9.5,
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center'
        }, { text: '{{guest.name}} · Folio #{{guest.checkInCode}}' })
      ]
    };
  } else if (tpl.key === 'jardin-botanico-esmeralda') {
    // ═══ SET 3: JARDÍN BOTÁNICO · ESMERALDA & ORO ROSADO ═══
    sheet1 = {
      ...baseSheetMeta,
      id: uid('sheet'),
      title: 'Hoja 1 (Frente)',
      background: { color: '#0d2620', overlay: 0 },
      layers: [
        createPassLayer(uid, 'shape', 'Tarjeta Esmeralda', 5, 3, 90, 94, 1, {
          backgroundColor: '#13352c',
          borderColor: 'rgba(229, 193, 160, 0.5)',
          borderWidth: 1.5,
          borderRadius: 28,
          boxShadow: '0 16px 42px rgba(0,0,0,0.45)'
        }),
        createPassLayer(uid, 'shape', 'Marco Botánico Interior', 8, 5, 84, 90, 2, {
          backgroundColor: 'transparent',
          borderColor: 'rgba(229, 193, 160, 0.26)',
          borderWidth: 1,
          borderRadius: 22
        }),
        createPassLayer(uid, 'shape', 'Acento Superior Oro Rosado', 36, 7.2, 28, 0.55, 3, {
          backgroundColor: '#e5c1a0',
          borderRadius: 99
        }),
        createPassLayer(uid, 'text', 'Etiqueta Botánica', 12, 9.5, 76, 3.8, 4, {
          color: '#e5c1a0',
          fontSize: 10.5,
          fontWeight: '700',
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center',
          letterSpacing: 2.2
        }, { text: '🌿 INVITADO DE HONOR 🌿' }),
        createPassLayer(uid, 'text', 'Título del Evento', 10, 14, 80, 9.5, 5, {
          color: '#f7f4ee',
          fontSize: 29,
          fontWeight: '600',
          fontFamily: "'Cormorant Garamond', serif",
          textAlign: 'center',
          lineHeight: 1.12
        }, { text: '{{event.title}}' }),
        createPassLayer(uid, 'text', 'Fecha', 12, 24, 76, 3.5, 6, {
          color: 'rgba(229, 193, 160, 0.85)',
          fontSize: 11.5,
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center'
        }, { text: '{{event.date}}' }),
        createPassLayer(uid, 'image', 'Código QR Botánico', 25, 29.5, 50, 28.5, 7, {
          borderRadius: 16,
          qrFrameStyle: 'banner-bottom',
          qrFrameColor: '#047857',
          qrFrameText: 'BIENVENIDO AL EVENTO',
          qrFrameTextColor: '#ffffff',
          qrColor: '#064e3b',
          qrBgColor: '#ffffff',
          qrEyeShape: 'leaf',
          qrCenterLogo: 'heart',
          qrCenterLogoBg: '#047857'
        }, { binding: 'pass.qrCode', url: DEMO_QR_URL }),
        createPassLayer(uid, 'text', 'Nombre Invitado', 10, 61, 80, 7, 8, {
          color: '#ffffff',
          fontSize: 27,
          fontWeight: '600',
          fontFamily: "'Cormorant Garamond', serif",
          textAlign: 'center'
        }, { text: '{{guest.name}}' }),
        createPassLayer(uid, 'shape', 'Cápsula Mesa y Pases', 14, 70, 72, 6.8, 9, {
          backgroundColor: 'rgba(229, 193, 160, 0.14)',
          borderColor: 'rgba(229, 193, 160, 0.4)',
          borderWidth: 1,
          borderRadius: 99
        }),
        createPassLayer(uid, 'text', 'Mesa y Pases', 16, 71.7, 68, 4, 10, {
          color: '#f3d9bf',
          fontSize: 12.5,
          fontWeight: '600',
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center'
        }, { text: '{{guest.table}}  ·  {{guest.companions}} pases válidos' }),
        createPassLayer(uid, 'text', 'Sede Recepción', 12, 79.5, 76, 5, 11, {
          color: 'rgba(247, 244, 238, 0.82)',
          fontSize: 11.5,
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center'
        }, { text: '{{event.venue}}' }),
        createPassLayer(uid, 'text', 'Folio', 16, 88.5, 68, 3, 12, {
          color: 'rgba(229, 193, 160, 0.65)',
          fontSize: 10,
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center',
          letterSpacing: 1.5
        }, { text: 'Folio #{{guest.checkInCode}}' })
      ]
    };

    sheet2 = {
      ...baseSheetMeta,
      id: uid('sheet'),
      title: 'Hoja 2 (Reverso)',
      background: { color: '#0d2620', overlay: 0 },
      layers: [
        createPassLayer(uid, 'shape', 'Tarjeta Reverso', 5, 3, 90, 94, 1, {
          backgroundColor: '#13352c',
          borderColor: 'rgba(229, 193, 160, 0.5)',
          borderWidth: 1.5,
          borderRadius: 28
        }),
        createPassLayer(uid, 'text', 'Título Caligráfico', 12, 10, 76, 9, 2, {
          color: '#e5c1a0',
          fontSize: 34,
          fontFamily: "'Great Vibes', cursive",
          textAlign: 'center'
        }, { text: 'Te esperamos' }),
        createPassLayer(uid, 'shape', 'Tarjeta Recepción', 11, 22, 78, 22, 3, {
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
          borderColor: 'rgba(229, 193, 160, 0.3)',
          borderWidth: 1,
          borderRadius: 18
        }),
        createPassLayer(uid, 'text', 'Información Recepción', 14, 25, 72, 17, 4, {
          color: '#f7f4ee',
          fontSize: 12.5,
          lineHeight: 1.65,
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center'
        }, { text: '{{event.venue}}\n{{event.date}} · {{event.time}}\nMesa asignada: {{guest.table}}' }),
        createPassLayer(uid, 'text', 'Notas de Recepción', 13, 49, 74, 30, 5, {
          color: 'rgba(247, 244, 238, 0.85)',
          fontSize: 12,
          lineHeight: 1.75,
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'left'
        }, {
          text: '• Muestra tu código QR en la entrada principal.\n\n• Tu pase ampara {{guest.companions}} lugares reservados.\n\n• Agradecemos confirmar tu asistencia con anticipación.'
        }),
        createPassLayer(uid, 'text', 'Pie Botánico', 14, 86, 72, 4, 6, {
          color: '#e5c1a0',
          fontSize: 11,
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center',
          letterSpacing: 1.2
        }, { text: '{{guest.name}} · #{{guest.checkInCode}}' })
      ]
    };
  } else if (tpl.key === 'atelier-vogue-editorial') {
    // ═══ SET 4: ATELIER EDITORIAL · VOGUE ═══
    sheet1 = {
      ...baseSheetMeta,
      id: uid('sheet'),
      title: 'Hoja 1 (Frente)',
      background: { color: '#f3f1ed', overlay: 0 },
      layers: [
        createPassLayer(uid, 'shape', 'Tarjeta Editorial', 5, 3, 90, 94, 1, {
          backgroundColor: '#ffffff',
          borderColor: '#18181b',
          borderWidth: 1.5,
          borderRadius: 4,
          boxShadow: '6px 6px 0px rgba(24, 24, 27, 0.12)'
        }),
        createPassLayer(uid, 'shape', 'Filete Superior', 10, 7, 80, 0.3, 2, {
          backgroundColor: '#18181b'
        }),
        createPassLayer(uid, 'text', 'Cabecera Editorial', 10, 8.5, 80, 3.5, 3, {
          color: '#18181b',
          fontSize: 9.5,
          fontWeight: '700',
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center',
          letterSpacing: 3.2
        }, { text: 'EDICIÓN PRIVADA · ADMISIÓN PERSONAL' }),
        createPassLayer(uid, 'text', 'Título Editorial', 10, 13, 80, 10, 4, {
          color: '#18181b',
          fontSize: 32,
          fontWeight: '600',
          fontFamily: "'Cormorant Garamond', serif",
          textAlign: 'center',
          lineHeight: 1.08
        }, { text: '{{event.title}}' }),
        createPassLayer(uid, 'text', 'Fecha Editorial', 12, 23.5, 76, 3.5, 5, {
          color: '#52525b',
          fontSize: 11,
          fontWeight: '500',
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center',
          letterSpacing: 1.2
        }, { text: '{{event.date}}' }),
        createPassLayer(uid, 'image', 'Código QR Minimal', 26, 29, 48, 27, 6, {
          borderRadius: 4,
          qrFrameStyle: 'double-border',
          qrFrameColor: '#18181b',
          qrFrameText: '',
          qrColor: '#18181b',
          qrBgColor: '#ffffff',
          qrEyeShape: 'rounded',
          qrCenterLogo: 'monogram',
          qrCenterLogoBg: '#18181b'
        }, { binding: 'pass.qrCode', url: DEMO_QR_URL }),
        createPassLayer(uid, 'shape', 'Línea Divisoria', 10, 59.5, 80, 0.25, 7, {
          backgroundColor: '#18181b',
          opacity: 0.25
        }),
        createPassLayer(uid, 'text', 'Etiqueta Invitado', 12, 61.5, 76, 2.8, 8, {
          color: '#71717a',
          fontSize: 9,
          fontWeight: '700',
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center',
          letterSpacing: 2.5
        }, { text: 'INVITADO' }),
        createPassLayer(uid, 'text', 'Nombre Invitado', 10, 65, 80, 6.5, 9, {
          color: '#18181b',
          fontSize: 26,
          fontWeight: '600',
          fontFamily: "'Cormorant Garamond', serif",
          textAlign: 'center'
        }, { text: '{{guest.name}}' }),
        createPassLayer(uid, 'shape', 'Banda Datos Editorial', 10, 73.5, 80, 7.5, 10, {
          backgroundColor: '#18181b',
          borderRadius: 2
        }),
        createPassLayer(uid, 'text', 'Mesa Pases Folio', 12, 75.5, 76, 4, 11, {
          color: '#ffffff',
          fontSize: 11,
          fontWeight: '600',
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center',
          letterSpacing: 1.6
        }, { text: '{{guest.table}}  |  {{guest.companions}} PASES  |  #{{guest.checkInCode}}' }),
        createPassLayer(uid, 'text', 'Lugar Editorial', 12, 84, 76, 5, 12, {
          color: '#3f3f46',
          fontSize: 11,
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center'
        }, { text: '{{event.venue}}' }),
        createPassLayer(uid, 'shape', 'Filete Inferior', 10, 91.5, 80, 0.3, 13, {
          backgroundColor: '#18181b'
        })
      ]
    };

    sheet2 = {
      ...baseSheetMeta,
      id: uid('sheet'),
      title: 'Hoja 2 (Reverso)',
      background: { color: '#f3f1ed', overlay: 0 },
      layers: [
        createPassLayer(uid, 'shape', 'Tarjeta Editorial Reverso', 5, 3, 90, 94, 1, {
          backgroundColor: '#ffffff',
          borderColor: '#18181b',
          borderWidth: 1.5,
          borderRadius: 4
        }),
        createPassLayer(uid, 'text', 'Título Reverso', 10, 9, 80, 4, 2, {
          color: '#18181b',
          fontSize: 10.5,
          fontWeight: '700',
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center',
          letterSpacing: 3
        }, { text: 'GUÍA DE ACCESO · RSVP' }),
        createPassLayer(uid, 'shape', 'Regla Editorial', 12, 14.5, 76, 0.3, 3, {
          backgroundColor: '#18181b'
        }),
        createPassLayer(uid, 'text', 'Resumen Evento', 12, 19, 76, 18, 4, {
          color: '#18181b',
          fontSize: 13,
          lineHeight: 1.7,
          fontFamily: "'Cormorant Garamond', serif",
          textAlign: 'center'
        }, { text: '{{event.title}}\n{{event.date}} · {{event.time}}\n{{event.venue}}' }),
        createPassLayer(uid, 'text', 'Instrucciones', 13, 42, 74, 34, 5, {
          color: '#3f3f46',
          fontSize: 11.5,
          lineHeight: 1.8,
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'left'
        }, {
          text: '01. Presenta tu código QR en recepción.\n\n02. Acceso reservado para {{guest.companions}} personas en {{guest.table}}.\n\n03. Agradecemos puntualidad para iniciar juntos.'
        }),
        createPassLayer(uid, 'text', 'Pie Editorial', 12, 86, 76, 4, 6, {
          color: '#71717a',
          fontSize: 9.5,
          fontWeight: '600',
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center',
          letterSpacing: 2
        }, { text: 'PASE PERSONAL · {{guest.name}}' })
      ]
    };
  } else {
    // ═══ SET 1 (DEFAULT): BODA IMPERIAL · ARCO DORADO & MARFIL ═══
    sheet1 = {
      ...baseSheetMeta,
      id: uid('sheet'),
      title: 'Hoja 1 (Frente)',
      background: { color: '#f4ede2', overlay: 0 },
      layers: [
        createPassLayer(uid, 'shape', 'Marco Exterior Marfil', 5, 3, 90, 94, 1, {
          backgroundColor: '#fffdfa',
          borderColor: 'rgba(184, 146, 90, 0.55)',
          borderWidth: 1.5,
          borderRadius: 24,
          boxShadow: '0 14px 36px rgba(44, 36, 33, 0.12)'
        }),
        createPassLayer(uid, 'shape', 'Arco Dorado Interior', 9, 5.5, 82, 89, 2, {
          backgroundColor: 'transparent',
          borderColor: 'rgba(184, 146, 90, 0.38)',
          borderWidth: 1,
          borderRadius: 160
        }),
        createPassLayer(uid, 'text', 'Encabezado Gala', 14, 9.5, 72, 3.5, 3, {
          color: '#b8925a',
          fontSize: 10,
          fontWeight: '700',
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center',
          letterSpacing: 2.4
        }, { text: '✦ PASE PERSONAL DE BODA ✦' }),
        createPassLayer(uid, 'text', 'Título del Evento', 12, 13.5, 76, 9.5, 4, {
          color: '#2c2421',
          fontSize: 27,
          fontWeight: '700',
          fontFamily: "'Playfair Display', serif",
          textAlign: 'center',
          lineHeight: 1.15
        }, { text: '{{event.title}}' }),
        createPassLayer(uid, 'text', 'Fecha de Celebración', 14, 23.5, 72, 3.5, 5, {
          color: '#8a6b43',
          fontSize: 11.5,
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center'
        }, { text: '{{event.date}}' }),
        createPassLayer(uid, 'image', 'Código QR Dorado', 25, 29, 50, 28.5, 6, {
          borderRadius: 14,
          qrFrameStyle: 'banner-bottom',
          qrFrameColor: '#b8925a',
          qrFrameText: '★ ESCANEAR AL ENTRAR ★',
          qrFrameTextColor: '#ffffff',
          qrColor: '#2c2421',
          qrBgColor: '#ffffff',
          qrEyeShape: 'leaf',
          qrCenterLogo: 'rings',
          qrCenterLogoBg: '#faf5ec'
        }, { binding: 'pass.qrCode', url: DEMO_QR_URL }),
        createPassLayer(uid, 'text', 'Etiqueta Reservado', 14, 59.5, 72, 3, 7, {
          color: '#9e8463',
          fontSize: 9.5,
          fontWeight: '600',
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center',
          letterSpacing: 1.8
        }, { text: 'RESERVADO CON CARIÑO PARA' }),
        createPassLayer(uid, 'text', 'Nombre del Invitado', 11, 63, 78, 7, 8, {
          color: '#2c2421',
          fontSize: 25,
          fontWeight: '700',
          fontFamily: "'Playfair Display', serif",
          textAlign: 'center'
        }, { text: '{{guest.name}}' }),
        createPassLayer(uid, 'shape', 'Cápsula Mesa y Pases', 14, 71.5, 72, 6.5, 9, {
          backgroundColor: 'rgba(184, 146, 90, 0.12)',
          borderColor: 'rgba(184, 146, 90, 0.4)',
          borderWidth: 1,
          borderRadius: 99
        }),
        createPassLayer(uid, 'text', 'Mesa y Pases', 16, 73.2, 68, 3.8, 10, {
          color: '#7a5c34',
          fontSize: 12.5,
          fontWeight: '700',
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center'
        }, { text: '{{guest.table}}  ·  {{guest.companions}} lugares' }),
        createPassLayer(uid, 'text', 'Lugar del Evento', 12, 80.5, 76, 4.8, 11, {
          color: '#5a4b41',
          fontSize: 11.5,
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center'
        }, { text: '{{event.venue}}' }),
        createPassLayer(uid, 'text', 'Folio Check-in', 16, 88, 68, 3, 12, {
          color: '#a38d74',
          fontSize: 10,
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center',
          letterSpacing: 1.4
        }, { text: 'Folio #{{guest.checkInCode}}' })
      ]
    };

    sheet2 = {
      ...baseSheetMeta,
      id: uid('sheet'),
      title: 'Hoja 2 (Reverso)',
      background: { color: '#f4ede2', overlay: 0 },
      layers: [
        createPassLayer(uid, 'shape', 'Marco Reverso', 5, 3, 90, 94, 1, {
          backgroundColor: '#fffdfa',
          borderColor: 'rgba(184, 146, 90, 0.55)',
          borderWidth: 1.5,
          borderRadius: 24
        }),
        createPassLayer(uid, 'shape', 'Arco Interior Reverso', 9, 5.5, 82, 89, 2, {
          backgroundColor: 'transparent',
          borderColor: 'rgba(184, 146, 90, 0.32)',
          borderWidth: 1,
          borderRadius: 160
        }),
        createPassLayer(uid, 'text', 'Cabecera Reverso', 14, 11, 72, 4, 3, {
          color: '#b8925a',
          fontSize: 11,
          fontWeight: '700',
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center',
          letterSpacing: 2.4
        }, { text: 'DETALLES & RECEPCIÓN' }),
        createPassLayer(uid, 'text', 'Título Reverso', 12, 16, 76, 7.5, 4, {
          color: '#2c2421',
          fontSize: 22,
          fontWeight: '700',
          fontFamily: "'Playfair Display', serif",
          textAlign: 'center'
        }, { text: '{{event.title}}' }),
        createPassLayer(uid, 'shape', 'Tarjeta Ubicación', 12, 25.5, 76, 17, 5, {
          backgroundColor: 'rgba(184, 146, 90, 0.08)',
          borderColor: 'rgba(184, 146, 90, 0.3)',
          borderWidth: 1,
          borderRadius: 14
        }),
        createPassLayer(uid, 'text', 'Ubicación y Horario', 14, 28, 72, 13, 6, {
          color: '#3f342d',
          fontSize: 12,
          lineHeight: 1.65,
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'center'
        }, { text: '{{event.venue}}\n{{event.date}} · {{event.time}}' }),
        createPassLayer(uid, 'text', 'Recomendaciones', 13, 47, 74, 28, 7, {
          color: '#5a4b41',
          fontSize: 12,
          lineHeight: 1.7,
          fontFamily: "'Montserrat', sans-serif",
          textAlign: 'left'
        }, {
          text: '• Presenta el código QR en la recepción para registrar tu llegada.\n\n• Pase válido para {{guest.companions}} lugares en {{guest.table}}.\n\n• Agradecemos tu puntualidad para celebrar juntos.'
        }),
        createPassLayer(uid, 'text', 'Despedida Caligráfica', 12, 79, 76, 8, 8, {
          color: '#b8925a',
          fontSize: 28,
          fontFamily: "'Great Vibes', cursive",
          textAlign: 'center'
        }, { text: '¡Gracias por acompañarnos!' })
      ]
    };
  }

  return {
    version: 1,
    active: true,
    mode: 'advanced',
    documentType: 'pass',
    canvasSize: {
      preset: canvasPreset.preset,
      name: canvasPreset.label,
      width: w,
      height: h,
      unit: canvasPreset.unit,
      orientation: canvasPreset.orientation
    },
    presentationMode: 'continuous',
    responsiveMode: 'shared',
    theme: {
      backgroundColor: tpl.previewBg,
      textColor: tpl.previewText,
      accentColor: tpl.previewAccent,
      headingFont: tpl.headingFont,
      bodyFont: tpl.bodyFont,
      buttonBackgroundColor: tpl.previewAccent,
      buttonTextColor: '#ffffff',
      buttonStyle: 'solid',
      buttonRadius: 16
    },
    assets: [],
    sections: [sheet1, sheet2]
  };
}
