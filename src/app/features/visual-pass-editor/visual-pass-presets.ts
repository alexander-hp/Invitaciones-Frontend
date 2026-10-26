import {
  EventModel,
  InvitationModel,
  VisualCanvasSize,
  VisualInvitationDesign,
  VisualInvitationLayer,
  VisualInvitationLayerStyle,
  VisualInvitationSection,
  VisualLayerType
} from '../../core/models';

export interface PassCanvasPresetOption {
  preset: string;
  label: string;
  description: string;
  icon: string;
  width: number;
  height: number;
  unit: 'px' | 'mm' | 'cm';
  widthMm?: number;
  heightMm?: number;
  orientation: 'portrait' | 'landscape';
}

export const PASS_CANVAS_PRESETS: PassCanvasPresetOption[] = [
  {
    preset: 'phone-story',
    label: 'Pase Móvil / WhatsApp (9:16)',
    description: '450 × 800 px · Proporción vertical para celular',
    icon: '📱',
    width: 450,
    height: 800,
    unit: 'px',
    orientation: 'portrait'
  },
  {
    preset: 'badge-vertical',
    label: 'Gafete VIP Vertical (CR80)',
    description: '420 × 660 px (~85 × 134 mm credencial)',
    icon: '🪪',
    width: 420,
    height: 660,
    unit: 'mm',
    widthMm: 85,
    heightMm: 134,
    orientation: 'portrait'
  },
  {
    preset: 'badge-horizontal',
    label: 'Gafete VIP Horizontal (CR80)',
    description: '660 × 420 px (~134 × 85 mm credencial)',
    icon: '🏷️',
    width: 660,
    height: 420,
    unit: 'mm',
    widthMm: 134,
    heightMm: 85,
    orientation: 'landscape'
  },
  {
    preset: 'ticket-horizontal',
    label: 'Boleto Clásico con Talón (2.5:1)',
    description: '750 × 300 px (~200 × 80 mm ticket)',
    icon: '🎟️',
    width: 750,
    height: 300,
    unit: 'mm',
    widthMm: 200,
    heightMm: 80,
    orientation: 'landscape'
  },
  {
    preset: 'card-a6',
    label: 'Tarjetón Postal / A6',
    description: '450 × 636 px (105 × 148 mm sobre)',
    icon: '✉️',
    width: 450,
    height: 636,
    unit: 'mm',
    widthMm: 105,
    heightMm: 148,
    orientation: 'portrait'
  },
  {
    preset: 'custom',
    label: 'Personalizado...',
    description: 'Dimensiones libres a medida',
    icon: '📐',
    width: 450,
    height: 750,
    unit: 'px',
    orientation: 'portrait'
  }
];

export function createPassLayer(
  uid: (p: string) => string,
  type: VisualLayerType,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  zIndex: number,
  style: VisualInvitationLayerStyle,
  extras: Partial<VisualInvitationLayer> = {}
): VisualInvitationLayer {
  return {
    id: uid('layer'),
    type,
    name,
    x,
    y,
    width,
    height,
    zIndex,
    rotation: 0,
    locked: false,
    hidden: false,
    layouts: {
      mobile: { x, y, width, height }
    },
    style,
    ...extras
  };
}

export function buildDefaultPassDesign(
  invitation: InvitationModel | undefined,
  event: EventModel | undefined,
  uid: (prefix: string) => string,
  inferTheme: () => NonNullable<VisualInvitationDesign['theme']>
): VisualInvitationDesign {
  const preset = PASS_CANVAS_PRESETS[0]; // 'phone-story' (450 x 800)
  const theme = inferTheme();
  const primary = theme.backgroundColor || '#0b1426';
  const accent = theme.accentColor || '#c9a87c';
  const textColor = theme.textColor || '#ffffff';
  const eventTitle = event?.title || invitation?.content?.headline || 'Nuestra Celebración';
  const venueName = event?.venue?.name || 'Recepción del Evento';

  const sheet1: VisualInvitationSection = {
    id: uid('sheet'),
    type: 'passSheet',
    title: 'Hoja 1 (Frente)',
    enabled: true,
    layout: 'canvas',
    height: preset.height,
    pluginSettings: {
      sheetWidth: preset.width,
      sheetHeight: preset.height,
      sheetPreset: preset.preset
    },
    background: { color: primary, overlay: 0 },
    layers: [
      // Marco y fondo de la tarjeta
      createPassLayer(uid, 'shape', 'Fondo Tarjeta', 5, 3, 90, 94, 1, {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderColor: accent,
        borderWidth: 1.5,
        borderRadius: 24,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        shapeKind: 'rounded'
      }),
      // Badge VIP
      createPassLayer(uid, 'text', 'Badge VIP', 10, 7, 80, 4, 2, {
        color: accent,
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: 2
      }, { text: '★ PASE DE ACCESO VIP ★' }),
      // Título del Evento
      createPassLayer(uid, 'text', 'Título del Evento', 8, 12, 84, 8, 3, {
        color: textColor,
        fontSize: 26,
        fontWeight: '700',
        textAlign: 'center',
        fontFamily: theme.headingFont || "'Playfair Display', serif"
      }, { text: eventTitle }),
      // Subtítulo
      createPassLayer(uid, 'text', 'Subtítulo', 10, 20, 80, 4, 4, {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 13,
        textAlign: 'center'
      }, { text: 'Queremos compartir este día contigo' }),
      // Fondo para el Código QR
      createPassLayer(uid, 'shape', 'Fondo QR', 25, 27, 50, 28, 5, {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        shapeKind: 'rounded'
      }),
      // Código QR Dinámico
      createPassLayer(uid, 'image', 'Código QR Dinámico', 28, 29, 44, 24, 6, {
        borderRadius: 8
      }, {
        binding: 'pass.qrCode',
        url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=VIP-ACCESO-DEMO'
      }),
      // Etiqueta escaneo
      createPassLayer(uid, 'text', 'Etiqueta escaneo', 10, 57, 80, 3, 7, {
        color: 'rgba(255, 255, 255, 0.65)',
        fontSize: 10,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: 1.5
      }, { text: 'ESCANEA PARA ACCEDER' }),
      // Nombre del Invitado
      createPassLayer(uid, 'text', 'Nombre del Invitado', 8, 62, 84, 6, 8, {
        color: '#ffffff',
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'center'
      }, { text: '{{guest.name}}' }),
      // Mesa y Pases
      createPassLayer(uid, 'text', 'Mesa y Pases', 10, 69, 80, 5, 9, {
        color: accent,
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center'
      }, { text: 'Mesa: {{guest.table}}  ·  {{guest.companions}} pases' }),
      // Lugar del evento
      createPassLayer(uid, 'text', 'Lugar del Evento', 10, 77, 80, 4, 10, {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 12,
        textAlign: 'center'
      }, { text: venueName }),
      // Folio de acceso
      createPassLayer(uid, 'text', 'Folio de Acceso', 15, 88, 70, 3, 11, {
        color: 'rgba(255, 255, 255, 0.45)',
        fontSize: 10,
        textAlign: 'center',
        letterSpacing: 1
      }, { text: 'Folio: #{{guest.checkInCode}}' })
    ]
  };

  const sheet2: VisualInvitationSection = {
    id: uid('sheet'),
    type: 'passSheet',
    title: 'Hoja 2 (Reverso)',
    enabled: true,
    layout: 'canvas',
    height: preset.height,
    pluginSettings: {
      sheetWidth: preset.width,
      sheetHeight: preset.height,
      sheetPreset: preset.preset
    },
    background: { color: primary, overlay: 0 },
    layers: [
      createPassLayer(uid, 'shape', 'Fondo Tarjeta Reverso', 5, 3, 90, 94, 1, {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderColor: accent,
        borderWidth: 1.5,
        borderRadius: 24,
        shapeKind: 'rounded'
      }),
      createPassLayer(uid, 'text', 'Encabezado Reverso', 10, 9, 80, 5, 2, {
        color: accent,
        fontSize: 13,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: 2
      }, { text: 'INFORMACIÓN Y ACCESO' }),
      createPassLayer(uid, 'text', 'Instrucciones', 12, 20, 76, 42, 3, {
        color: 'rgba(255, 255, 255, 0.85)',
        fontSize: 12.5,
        lineHeight: 1.7,
        textAlign: 'left'
      }, {
        text: '• Presenta este código QR en la recepción para registrar tu acceso.\n\n• El pase es personal y válido por el número de lugares asignados.\n\n• Agradecemos tu puntualidad para disfrutar juntos de cada momento especial.\n\n• Si tienes alguna duda, ponte en contacto con los anfitriones.'
      }),
      createPassLayer(uid, 'text', 'Despedida', 10, 78, 80, 8, 4, {
        color: accent,
        fontSize: 18,
        fontFamily: theme.headingFont || "'Playfair Display', serif",
        textAlign: 'center'
      }, { text: '¡Esperamos verte pronto!' })
    ]
  };

  return {
    version: 1,
    active: true,
    mode: 'advanced',
    documentType: 'pass',
    canvasSize: {
      preset: preset.preset,
      name: preset.label,
      width: preset.width,
      height: preset.height,
      unit: preset.unit,
      orientation: preset.orientation
    },
    presentationMode: 'continuous',
    responsiveMode: 'shared',
    theme,
    assets: [],
    sections: [sheet1, sheet2]
  };
}
