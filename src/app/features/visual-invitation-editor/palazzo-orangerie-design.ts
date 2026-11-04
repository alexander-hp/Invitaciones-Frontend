import {
  EventModel,
  GiftRegistryItem,
  InvitationContent,
  InvitationLocation,
  VisualInvitationDesign,
  VisualInvitationLayer,
  VisualInvitationSection,
  VisualInvitationLayerStyle,
  VisualLayerType,
  VisualPluginPartDesign
} from '../../core/models';

const ASSET_DIR = 'assets/templates/palazzo-orangerie';

export const PALAZZO_ORANGERIE_THEME: NonNullable<VisualInvitationDesign['theme']> = {
  backgroundColor: '#f6efe2',
  textColor: '#152820',
  accentColor: '#c89d4c',
  headingFont: "'Cinzel Decorative', 'Playfair Display', Georgia, serif",
  bodyFont: 'Montserrat, sans-serif',
  buttonBackgroundColor: '#152820',
  buttonTextColor: '#f4e2b8',
  buttonStyle: 'solid',
  buttonRadius: 30
};

export function isPalazzoOrangerieDesign(design?: VisualInvitationDesign | null, invitationTemplate?: string): boolean {
  if (!design) return false;
  if (invitationTemplate === 'palazzo-orangerie') return true;
  const theme = design.theme;
  const bg = String(theme?.backgroundColor || '').toLowerCase().trim();
  const text = String(theme?.textColor || '').toLowerCase().trim();
  const accent = String(theme?.accentColor || '').toLowerCase().trim();
  if ((bg === '#f6efe2' || bg === '#13221d') && text === '#152820' && accent === '#c89d4c') {
    return true;
  }
  if (design.sections?.some((s) => s.background?.imageUrl?.includes('palazzo-orangerie'))) {
    return true;
  }
  if (design.sections?.some((s) => s.layers?.some((l) => l.url?.includes('palazzo-orangerie')))) {
    return true;
  }
  return false;
}

export function resolveGiftStoreLogo(gift?: Partial<GiftRegistryItem> | null, fallbackUrl?: string): string {
  const rawUrl = String(gift?.imageUrl || '').trim();
  const isLocalOrUploaded =
    rawUrl.startsWith('assets/') ||
    rawUrl.startsWith('/assets/') ||
    rawUrl.includes('/uploads/') ||
    rawUrl.startsWith('data:image/png') ||
    rawUrl.startsWith('data:image/jpeg') ||
    rawUrl.startsWith('data:image/webp');
  if (isLocalOrUploaded) {
    return rawUrl;
  }
  const key = `${gift?.store || ''} ${gift?.title || ''}`.toLowerCase();
  if (key.includes('liverpool')) return 'assets/giftTable/liverpool-logo.jpg';
  if (key.includes('palacio')) return 'assets/giftTable/palacio-logo.png';
  if (key.includes('sears')) return 'assets/giftTable/sears_logo.jpg';
  if (key.includes('uniko') || key.includes('efectivo')) return 'assets/giftTable/logo_uniko.webp';
  if (key.includes('amazon')) return 'assets/giftTable/logo-amazon.png';
  if (key.includes('mercado')) return 'assets/giftTable/mercado-libre-logo.png';
  if (rawUrl && !rawUrl.includes('clearbit.com') && !rawUrl.startsWith('data:image/svg')) {
    return rawUrl;
  }
  return fallbackUrl || `${ASSET_DIR}/gift-crest-badge.svg`;
}

export function buildPalazzoOrangerieDesign(
  content: InvitationContent,
  event: EventModel | undefined,
  nextId: (prefix: string) => string,
  includeModules = true
): VisualInvitationDesign {
  let zCounter = 1;
  const resetZ = () => { zCounter = 1; };

  const headingFont = PALAZZO_ORANGERIE_THEME.headingFont;
  const editorialSerif = "'Cormorant Garamond', 'Playfair Display', Georgia, serif";
  const scriptFont = "'Great Vibes', cursive";
  const bodyFont = PALAZZO_ORANGERIE_THEME.bodyFont;

  const makeSection = (
    type: string,
    title: string,
    bgColor: string,
    height: number,
    bgImage?: string,
    overlay = 0
  ): VisualInvitationSection => {
    resetZ();
    return {
      id: nextId('section'),
      type,
      title,
      enabled: true,
      layout: 'canvas',
      height,
      background: {
        color: bgColor,
        imageUrl: bgImage || '',
        overlay
      },
      moduleStyle: {
        layout: 'grid',
        columns: 2,
        alignment: 'center',
        surface: 'transparent',
        cardStyle: 'bordered',
        gap: 16,
        showTitle: true
      },
      layers: []
    };
  };

  const makeLayer = (
    type: VisualLayerType,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    style: VisualInvitationLayerStyle = {},
    extras: Partial<VisualInvitationLayer> = {}
  ): VisualInvitationLayer => ({
    id: nextId('layer'),
    type,
    name: extras.name || text.trim().slice(0, 32) || type,
    text,
    x,
    y,
    width,
    height,
    rotation: extras.rotation ?? 0,
    zIndex: extras.zIndex ?? zCounter++,
    locked: Boolean(extras.locked),
    hidden: Boolean(extras.hidden),
    animation: extras.animation || { type: 'none', duration: 1, delay: 0, repeat: false },
    style: { opacity: 1, ...style },
    ...extras
  });

  const makeSeparatedFieldWithLabel = (
    sectionLayers: VisualInvitationLayer[],
    binding: string,
    labelText: string,
    placeholder: string,
    x: number,
    y: number,
    width: number,
    height: number,
    darkSurface = false,
    extras: Partial<VisualInvitationLayerStyle> = {}
  ) => {
    const labelHeight = Math.min(4.8, Math.max(3.4, height * 0.32));
    const inputY = Math.min(96, y + labelHeight + 0.8);
    const inputHeight = Math.max(4.5, height - labelHeight - 0.8);

    const labelLayer = makeLayer(
      'text',
      labelText,
      x,
      y,
      width,
      labelHeight,
      {
        fontFamily: bodyFont,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.5,
        color: darkSurface ? '#ebd197' : '#7c5b24',
        textAlign: 'left',
        backgroundColor: 'transparent',
        borderWidth: 0,
        padding: 0
      },
      {
        name: `Etiqueta: ${labelText}`,
        binding: `display.label.${binding}`
      }
    );

    const fieldLayer = makeLayer(
      'field',
      labelText,
      x,
      inputY,
      width,
      inputHeight,
      {
        fontFamily: bodyFont,
        fontSize: 13.5,
        fontWeight: 500,
        color: darkSurface ? '#faf6ed' : '#152820',
        backgroundColor: darkSurface ? 'rgba(255, 252, 245, 0.08)' : '#fdfbf6',
        borderColor: darkSurface ? 'rgba(212, 175, 99, 0.55)' : '#c89d4c',
        borderWidth: 1.2,
        borderStyle: 'solid',
        borderRadius: 12,
        padding: 10,
        textAlign: 'left',
        showPlaceholder: true,
        boxShadow: darkSurface
          ? 'inset 0 2px 6px rgba(0, 0, 0, 0.35)'
          : '0 4px 12px rgba(21, 40, 32, 0.05)',
        ...extras
      },
      {
        name: labelText,
        binding,
        placeholder
      }
    );

    sectionLayers.push(labelLayer, fieldLayer);
  };

  const coverUrl =
    content.coverImageUrl ||
    content.galleryItems?.find((item) => item.url)?.url ||
    content.gallery?.find(Boolean) ||
    `${ASSET_DIR}/garden-portrait.webp`;

  const secondPhoto =
    content.galleryItems?.[1]?.url ||
    content.gallery?.[1] ||
    `${ASSET_DIR}/villa-painting.png`;

  const titleToken = content.headline ? '{{invitation.headline}}' : '{{event.title}}';

  // =========================================================================
  // 1. HERO — PORTADA L'ORANGERIE IMPERIAL (920px)
  // =========================================================================
  const hero = makeSection(
    'hero',
    'Portada · Villa L’Orangerie',
    '#f6efe2',
    920,
    `${ASSET_DIR}/fresco-parchment-bg.svg`
  );

  hero.layers.push(
    makeLayer(
      'text',
      'EDICIÓN DE COLECCIÓN · ATELIER IV',
      7, 3.2, 52, 2.8,
      { fontFamily: bodyFont, fontSize: 9.5, fontWeight: 700, letterSpacing: 2.4, color: '#8f651e', textAlign: 'left' },
      { name: 'Cabecera editorial izq' }
    ),
    makeLayer(
      'text',
      'VILLA L’ORANGERIE',
      60, 3.2, 33, 2.8,
      { fontFamily: bodyFont, fontSize: 9.5, fontWeight: 700, letterSpacing: 2.4, color: '#152820', textAlign: 'right' },
      { name: 'Cabecera editorial der' }
    ),
    makeLayer(
      'shape',
      '',
      7, 6.4, 86, 0.22,
      { backgroundColor: '#c89d4c', shapeKind: 'rectangle' },
      { name: 'Regla superior dorada' }
    ),
    makeLayer(
      'shape',
      '',
      11, 9.0, 78, 46.5,
      {
        backgroundColor: '#13241d',
        borderRadius: 240,
        borderColor: '#d4af63',
        borderWidth: 2,
        borderStyle: 'solid',
        boxShadow: '0 26px 56px rgba(10, 22, 17, 0.34)'
      },
      { name: 'Nicho imperial esmeralda' }
    ),
    makeLayer(
      'shape',
      '',
      13, 10.1, 74, 44.3,
      {
        backgroundColor: '#faf5eb',
        borderRadius: 220,
        borderColor: '#c89d4c',
        borderWidth: 1.2,
        borderStyle: 'solid'
      },
      { name: 'Paspartú de museo en arco' }
    ),
    makeLayer(
      'image',
      '',
      14.5, 11.0, 71, 42.5,
      {
        preserveAspectRatio: false,
        frameEnabled: true,
        objectFit: 'cover',
        objectPositionX: 50,
        objectPositionY: 50,
        imageMask: 'arch',
        borderWidth: 0,
        boxShadow: '0 14px 34px rgba(0, 0, 0, 0.28)'
      },
      { url: coverUrl, name: 'Retrato principal en arco', animation: { type: 'zoom', duration: 1.2, delay: 0, repeat: false } }
    ),
    makeLayer(
      'image',
      '',
      8, 7.6, 84, 49.4,
      { preserveAspectRatio: true, objectFit: 'contain' },
      { url: `${ASSET_DIR}/baroque-arch-frame.svg`, name: 'Marco arquitectónico barroco', locked: true }
    ),
    makeLayer(
      'image',
      '',
      67.5, 43.2, 23, 13,
      {
        preserveAspectRatio: false,
        frameEnabled: true,
        objectFit: 'cover',
        objectPositionX: 50,
        objectPositionY: 50,
        imageMask: 'none',
        borderRadius: 999,
        borderColor: '#f4e2b8',
        borderWidth: 2.5,
        borderStyle: 'solid',
        backgroundColor: '#152820',
        padding: 4,
        boxShadow: '0 16px 34px rgba(10, 20, 16, 0.45)'
      },
      {
        url: secondPhoto,
        name: 'Camafeo secundario de la villa',
        animation: { type: 'float', duration: 4.5, delay: 0.2, repeat: true }
      }
    ),
    makeLayer(
      'image',
      '',
      65.5, 42.1, 27, 15.2,
      { preserveAspectRatio: true, objectFit: 'contain' },
      { url: `${ASSET_DIR}/renaissance-oval-cameo.svg`, name: 'Engaste de camafeo renacentista', locked: true }
    ),
    makeLayer(
      'image',
      '',
      9, 46.8, 16, 9.2,
      { objectFit: 'contain' },
      { url: `${ASSET_DIR}/wax-seal-monogram.svg`, name: 'Sello de lacre imperial' }
    ),
    makeLayer(
      'text',
      'La Gran Celebración de',
      10, 57.2, 80, 5.2,
      { fontFamily: scriptFont, fontSize: 34, fontWeight: 400, color: '#9c7025', textAlign: 'center' },
      { name: 'Preludio caligráfico' }
    ),
    makeLayer(
      'text',
      titleToken,
      6, 62.6, 88, 9.4,
      {
        fontFamily: headingFont,
        fontSize: 31,
        fontWeight: 700,
        letterSpacing: 1.8,
        lineHeight: 1.18,
        color: '#13241d',
        textAlign: 'center'
      },
      { name: 'Título monumental del evento', animation: { type: 'slide-up', duration: 0.9, delay: 0.1, repeat: false } }
    ),
    makeLayer(
      'image',
      '',
      18, 72.5, 64, 3.8,
      { objectFit: 'contain' },
      { url: `${ASSET_DIR}/botanical-crest-divider.svg`, name: 'Divisor botánico de oro' }
    ),
    makeLayer(
      'shape',
      '',
      10, 77.2, 80, 8.8,
      {
        backgroundColor: 'rgba(255, 252, 246, 0.92)',
        borderColor: '#c89d4c',
        borderWidth: 1.2,
        borderStyle: 'solid',
        borderRadius: 16,
        boxShadow: '0 10px 26px rgba(21, 40, 32, 0.08)'
      },
      { name: 'Cartela de fecha y recinto' }
    ),
    makeLayer(
      'text',
      event?.date ? '{{event.date}}' : 'Sábado · 24 de Octubre de 2026',
      13, 78.2, 74, 3.6,
      {
        fontFamily: headingFont,
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: 2,
        color: '#152820',
        textAlign: 'center'
      },
      { name: 'Fecha de gala' }
    ),
    makeLayer(
      'text',
      event?.venue?.name ? '{{event.venue}} · {{event.time}}' : 'Palazzo & Giardino · Recepción de Honor',
      13, 82, 74, 3.2,
      {
        fontFamily: bodyFont,
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: 1.6,
        color: '#8f651e',
        textAlign: 'center'
      },
      { name: 'Sede principal' }
    ),
    makeLayer(
      'button',
      'CONFIRMAR ASISTENCIA',
      10, 88.2, 48, 6.6,
      {
        backgroundColor: '#152820',
        color: '#f4e2b8',
        fontFamily: bodyFont,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 1.5,
        textAlign: 'center',
        borderRadius: 30,
        borderColor: '#d4af63',
        borderWidth: 1.5,
        borderStyle: 'solid',
        boxShadow: '0 10px 24px rgba(19, 36, 29, 0.3)'
      },
      { name: 'Ir a RSVP', binding: 'section:rsvp' }
    ),
    makeLayer(
      'button',
      'AGENDAR FECHA',
      60, 88.2, 30, 6.6,
      {
        backgroundColor: '#fbf7ef',
        color: '#152820',
        fontFamily: bodyFont,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: 1.2,
        textAlign: 'center',
        borderRadius: 30,
        borderColor: '#b8893a',
        borderWidth: 1.5,
        borderStyle: 'solid',
        boxShadow: '0 6px 18px rgba(21, 40, 32, 0.08)'
      },
      { name: 'Agendar en calendario', binding: 'calendar' }
    )
  );

  const sections: VisualInvitationSection[] = [hero];
  if (!includeModules) {
    return {
      version: 1,
      active: false,
      mode: 'easy',
      presentationMode: 'continuous',
      responsiveMode: 'shared',
      theme: { ...PALAZZO_ORANGERIE_THEME },
      sections
    };
  }

  // =========================================================================
  // 2. CUSTOM — MANIFIESTO & BIENVENIDA (560px)
  // =========================================================================
  const welcome = makeSection(
    'custom',
    'Manifiesto & Bienvenida',
    '#13221d',
    560,
    `${ASSET_DIR}/cypress-nocturne-bg.svg`
  );
  welcome.layers.push(
    makeLayer(
      'text',
      'CAPÍTULO I · EL PRELUDIO',
      12, 6.2, 76, 4,
      { fontFamily: bodyFont, fontSize: 10.5, fontWeight: 700, letterSpacing: 3, color: '#ebd197', textAlign: 'center' },
      { name: 'Capítulo I' }
    ),
    makeLayer(
      'shape',
      '',
      9.5, 16.5, 83, 72,
      {
        backgroundColor: 'transparent',
        borderColor: 'rgba(235, 209, 151, 0.42)',
        borderWidth: 1.4,
        borderStyle: 'solid',
        borderRadius: 22
      },
      { name: 'Marco desplazado de oro' }
    ),
    makeLayer(
      'shape',
      '',
      7.5, 14.5, 83, 72,
      {
        backgroundColor: '#f9f4ea',
        borderColor: '#c89d4c',
        borderWidth: 1.5,
        borderStyle: 'solid',
        borderRadius: 22,
        boxShadow: '0 22px 48px rgba(0, 0, 0, 0.45)'
      },
      { name: 'Pergamino de bienvenida' }
    ),
    makeLayer(
      'image',
      '',
      43.5, 10.8, 13, 9.2,
      { objectFit: 'contain' },
      { url: `${ASSET_DIR}/wax-seal-monogram.svg`, name: 'Lacre de bienvenida' }
    ),
    makeLayer(
      'text',
      'Hay instantes que se vuelven eternos',
      13, 22.8, 72, 9.5,
      {
        fontFamily: headingFont,
        fontSize: 21,
        fontWeight: 700,
        letterSpacing: 1,
        color: '#152820',
        textAlign: 'center'
      },
      { name: 'Epígrafe de bienvenida' }
    ),
    makeLayer(
      'text',
      content.message || content.subheadline
        ? '{{invitation.message}}'
        : 'Entre jardines de cipreses, música bajo las estrellas y el afecto de quienes más amamos, abrimos las puertas de nuestra celebración para compartir contigo un capítulo irrepetible.',
      13, 33, 72, 28,
      {
        fontFamily: editorialSerif,
        fontSize: 18,
        fontWeight: 500,
        lineHeight: 1.48,
        color: '#2b3832',
        textAlign: 'center'
      },
      { name: 'Mensaje de los anfitriones' }
    ),
    makeLayer(
      'image',
      '',
      22, 62.5, 54, 5,
      { objectFit: 'contain' },
      { url: `${ASSET_DIR}/botanical-crest-divider.svg`, name: 'Divisor floral' }
    ),
    makeLayer(
      'text',
      'Con todo nuestro cariño y gratitud',
      15, 69, 68, 9,
      { fontFamily: scriptFont, fontSize: 31, fontWeight: 400, color: '#9c7025', textAlign: 'center' },
      { name: 'Firma caligráfica' }
    ),
    makeLayer(
      'text',
      'L’ORANGERIE · EDIZIONE PRIVATA · MMXXVI',
      12, 91.5, 76, 3.8,
      { fontFamily: bodyFont, fontSize: 9, fontWeight: 600, letterSpacing: 3.2, color: 'rgba(235, 209, 151, 0.72)', textAlign: 'center' },
      { name: 'Pie de capítulo' }
    )
  );
  sections.push(welcome);

  const settings = content.sectionSettings || {};

  // =========================================================================
  // 3. COUNTDOWN — EL RELOJ DEL PALAZZO (500px)
  // =========================================================================
  const countdownSec = makeSection(
    'countdown',
    'La Cuenta Regresiva',
    '#f5efe2',
    500,
    `${ASSET_DIR}/fresco-parchment-bg.svg`
  );
  countdownSec.pluginSettings = {
    eyebrow: 'CAPÍTULO II · EL TIEMPO SE DETIENE',
    introText: 'Cada segundo nos acerca al instante en que brindaremos juntos.',
    expiredText: '¡Llegó el gran día de nuestra celebración!'
  };
  countdownSec.layers.push(
    makeLayer(
      'text',
      'CAPÍTULO II · EL TIEMPO SE DETIENE',
      12, 5.5, 76, 4.5,
      { fontFamily: bodyFont, fontSize: 10.5, fontWeight: 700, letterSpacing: 3, color: '#8f651e', textAlign: 'center' },
      { binding: 'display.countdown.eyebrow', name: 'Eyebrow cuenta regresiva' }
    ),
    makeLayer(
      'text',
      'La Cuenta Regresiva',
      8, 11.5, 84, 9.5,
      { fontFamily: headingFont, fontSize: 29, fontWeight: 700, color: '#152820', textAlign: 'center', letterSpacing: 1.2 },
      { binding: 'display.countdown.title', name: 'Título cuenta regresiva' }
    ),
    makeLayer(
      'text',
      'Cada segundo nos acerca al instante en que brindaremos juntos.',
      12, 22, 76, 6.5,
      { fontFamily: editorialSerif, fontSize: 17, fontWeight: 500, color: '#3b4741', textAlign: 'center' },
      { binding: 'display.countdown.intro', name: 'Intro cuenta regresiva' }
    ),
    makeLayer(
      'shape',
      '',
      5, 31.5, 90, 50,
      {
        backgroundColor: '#152820',
        borderColor: '#c89d4c',
        borderWidth: 1.8,
        borderStyle: 'solid',
        borderRadius: 24,
        boxShadow: '0 22px 46px rgba(19, 34, 29, 0.25)'
      },
      { binding: 'display.countdown.plaque', name: 'Placa horológica imperial' }
    ),
    // 4 Pedestal Arch Cards inside the plaque
    makeLayer(
      'shape',
      '',
      8, 36, 19.5, 41,
      { backgroundColor: '#faf5eb', borderColor: '#d4af63', borderWidth: 1.4, borderStyle: 'solid', borderRadius: 16, boxShadow: '0 8px 20px rgba(0,0,0,0.28)' },
      { binding: 'display.countdown.cardDays', name: 'Pedestal Días' }
    ),
    makeLayer(
      'shape',
      '',
      29.5, 36, 19.5, 41,
      { backgroundColor: '#faf5eb', borderColor: '#d4af63', borderWidth: 1.4, borderStyle: 'solid', borderRadius: 16, boxShadow: '0 8px 20px rgba(0,0,0,0.28)' },
      { binding: 'display.countdown.cardHours', name: 'Pedestal Horas' }
    ),
    makeLayer(
      'shape',
      '',
      51, 36, 19.5, 41,
      { backgroundColor: '#faf5eb', borderColor: '#d4af63', borderWidth: 1.4, borderStyle: 'solid', borderRadius: 16, boxShadow: '0 8px 20px rgba(0,0,0,0.28)' },
      { binding: 'display.countdown.cardMinutes', name: 'Pedestal Minutos' }
    ),
    makeLayer(
      'shape',
      '',
      72.5, 36, 19.5, 41,
      { backgroundColor: '#faf5eb', borderColor: '#d4af63', borderWidth: 1.4, borderStyle: 'solid', borderRadius: 16, boxShadow: '0 8px 20px rgba(0,0,0,0.28)' },
      { binding: 'display.countdown.cardSeconds', name: 'Pedestal Segundos' }
    ),
    // Numbers & Labels
    makeLayer(
      'text',
      '48',
      8, 40, 19.5, 20,
      { fontFamily: headingFont, fontSize: 32, fontWeight: 700, color: '#152820', textAlign: 'center' },
      { binding: 'countdown.days', name: 'Días' }
    ),
    makeLayer(
      'text',
      'DÍAS',
      8, 62, 19.5, 9,
      { fontFamily: bodyFont, fontSize: 9.5, fontWeight: 700, letterSpacing: 2, color: '#8f651e', textAlign: 'center' },
      { binding: 'display.countdown.daysLabel', name: 'Etiqueta Días' }
    ),
    makeLayer(
      'text',
      '14',
      29.5, 40, 19.5, 20,
      { fontFamily: headingFont, fontSize: 32, fontWeight: 700, color: '#152820', textAlign: 'center' },
      { binding: 'countdown.hours', name: 'Horas' }
    ),
    makeLayer(
      'text',
      'HORAS',
      29.5, 62, 19.5, 9,
      { fontFamily: bodyFont, fontSize: 9.5, fontWeight: 700, letterSpacing: 2, color: '#8f651e', textAlign: 'center' },
      { binding: 'display.countdown.hoursLabel', name: 'Etiqueta Horas' }
    ),
    makeLayer(
      'text',
      '32',
      51, 40, 19.5, 20,
      { fontFamily: headingFont, fontSize: 32, fontWeight: 700, color: '#152820', textAlign: 'center' },
      { binding: 'countdown.minutes', name: 'Minutos' }
    ),
    makeLayer(
      'text',
      'MINUTOS',
      51, 62, 19.5, 9,
      { fontFamily: bodyFont, fontSize: 9.5, fontWeight: 700, letterSpacing: 2, color: '#8f651e', textAlign: 'center' },
      { binding: 'display.countdown.minutesLabel', name: 'Etiqueta Minutos' }
    ),
    makeLayer(
      'text',
      '19',
      72.5, 40, 19.5, 20,
      { fontFamily: headingFont, fontSize: 32, fontWeight: 700, color: '#152820', textAlign: 'center' },
      { binding: 'countdown.seconds', name: 'Segundos' }
    ),
    makeLayer(
      'text',
      'SEGUNDOS',
      72.5, 62, 19.5, 9,
      { fontFamily: bodyFont, fontSize: 9.5, fontWeight: 700, letterSpacing: 2, color: '#8f651e', textAlign: 'center' },
      { binding: 'display.countdown.secondsLabel', name: 'Etiqueta Segundos' }
    ),
    makeLayer(
      'text',
      '¡Llegó el gran día de nuestra celebración!',
      12, 48, 76, 16,
      { fontFamily: scriptFont, fontSize: 34, fontWeight: 400, color: '#ebd197', textAlign: 'center' },
      { binding: 'countdown.expired', name: 'Texto al finalizar' }
    ),
    makeLayer(
      'image',
      '',
      22, 86, 56, 7.5,
      { objectFit: 'contain' },
      { binding: 'display.countdown.divider', url: `${ASSET_DIR}/botanical-crest-divider.svg`, name: 'Ornamento inferior' }
    )
  );
  sections.push(countdownSec);

  // =========================================================================
  // 4. STORY — CRÓNICA DE NUESTRA HISTORIA (680px)
  // =========================================================================
  if (settings.story !== false) {
    const storySec = makeSection(
      'story',
      content.storyTitle || 'Nuestra Crónica',
      '#152620',
      680,
      `${ASSET_DIR}/cypress-nocturne-bg.svg`
    );
    storySec.layers.push(
      makeLayer(
        'text',
        'CAPÍTULO III · NUESTRA CRÓNICA',
        10, 4.5, 80, 3.8,
        { fontFamily: bodyFont, fontSize: 10.5, fontWeight: 700, letterSpacing: 3, color: '#ebd197', textAlign: 'center' },
        { name: 'Capítulo III' }
      ),
      makeLayer(
        'text',
        content.storyTitle ? '{{invitation.storyTitle}}' : 'Nuestra Historia',
        8, 9.2, 84, 7.5,
        { fontFamily: headingFont, fontSize: 28, fontWeight: 700, color: '#faf6ed', textAlign: 'center', letterSpacing: 1.4 },
        { name: 'Título de la historia' }
      ),
      makeLayer(
        'text',
        'Un destino tejido con paciencia y luz',
        12, 16.8, 76, 5.2,
        { fontFamily: scriptFont, fontSize: 28, fontWeight: 400, color: '#d4af63', textAlign: 'center' },
        { name: 'Subtítulo caligráfico' }
      ),
      makeLayer(
        'shape',
        '',
        6.5, 22.8, 44.5, 28.4,
        {
          backgroundColor: '#faf5eb',
          borderColor: '#c89d4c',
          borderWidth: 1.5,
          borderStyle: 'solid',
          borderRadius: 16,
          boxShadow: '0 18px 38px rgba(0, 0, 0, 0.42)'
        },
        { name: 'Paspartú del grabado' }
      ),
      makeLayer(
        'image',
        '',
        8.2, 24.2, 41.1, 25.6,
        {
          preserveAspectRatio: false,
          frameEnabled: true,
          objectFit: 'cover',
          objectPositionX: 50,
          objectPositionY: 50,
          imageMask: 'none',
          borderRadius: 11,
          borderColor: '#c89d4c',
          borderWidth: 1.2,
          borderStyle: 'solid'
        },
        { url: `${ASSET_DIR}/villa-etching-illustration.svg`, name: 'Grabado de Villa L’Orangerie' }
      ),
      makeLayer(
        'image',
        '',
        7.2, 23.4, 43.1, 27.2,
        { preserveAspectRatio: true, objectFit: 'contain' },
        { url: `${ASSET_DIR}/venetian-triptych-frame.svg`, name: 'Filigrana veneciana del grabado', locked: true }
      ),
      makeLayer(
        'shape',
        '',
        49.5, 20.8, 44, 31.4,
        {
          backgroundColor: '#152820',
          borderColor: '#d4af63',
          borderWidth: 2,
          borderStyle: 'solid',
          borderRadius: 18,
          boxShadow: '0 22px 46px rgba(0, 0, 0, 0.52)'
        },
        { name: 'Marco imperial de la crónica' }
      ),
      makeLayer(
        'shape',
        '',
        51.3, 22.1, 40.4, 28.8,
        {
          backgroundColor: '#faf5eb',
          borderColor: '#c89d4c',
          borderWidth: 1.2,
          borderStyle: 'solid',
          borderRadius: 13
        },
        { name: 'Paspartú marfil de la crónica' }
      ),
      makeLayer(
        'image',
        '',
        52.8, 23.2, 37.4, 26.6,
        {
          preserveAspectRatio: false,
          frameEnabled: true,
          objectFit: 'cover',
          objectPositionX: 50,
          objectPositionY: 50,
          imageMask: 'none',
          borderRadius: 9,
          borderColor: '#d4af63',
          borderWidth: 1.5,
          borderStyle: 'solid',
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)'
        },
        { url: secondPhoto, name: 'Retrato enmarcado de la historia' }
      ),
      makeLayer(
        'image',
        '',
        50.3, 21.3, 42.4, 30.4,
        { preserveAspectRatio: true, objectFit: 'contain' },
        { url: `${ASSET_DIR}/gilded-gallery-frame.svg`, name: 'Moldura florentina de oro', locked: true }
      ),
      makeLayer(
        'shape',
        '',
        7, 54.5, 86, 37,
        {
          backgroundColor: '#f9f4ea',
          borderColor: '#c89d4c',
          borderWidth: 1.5,
          borderStyle: 'solid',
          borderRadius: 20,
          boxShadow: '0 20px 44px rgba(0, 0, 0, 0.45)'
        },
        { name: 'Pergamino narrativo' }
      ),
      makeLayer(
        'text',
        'I · EL ENCUENTRO     ✦     II · LA PROMESA     ✦     III · LA VELADA',
        12, 57.5, 76, 3.8,
        { fontFamily: bodyFont, fontSize: 9.5, fontWeight: 700, letterSpacing: 2, color: '#8f651e', textAlign: 'center' },
        { name: 'Hitos de la crónica' }
      ),
      makeLayer(
        'text',
        '{{invitation.storyBody}}',
        12, 62.5, 76, 22.5,
        {
          fontFamily: editorialSerif,
          fontSize: 17,
          fontWeight: 500,
          lineHeight: 1.48,
          color: '#1e2c26',
          textAlign: 'center'
        },
        { name: 'Relato de nuestra historia' }
      ),
      makeLayer(
        'image',
        '',
        81.5, 85.2, 10.5, 8.2,
        { objectFit: 'contain' },
        { url: `${ASSET_DIR}/wax-seal-monogram.svg`, name: 'Lacre de la historia' }
      )
    );
    sections.push(storySec);
  }

  // =========================================================================
  // 5. LOCATIONS — COORDENADAS & RECINTOS (840px+)
  // =========================================================================
  if (settings.locations !== false) {
    const configuredLocations: InvitationLocation[] = content.locations?.length
      ? content.locations
      : event?.venue?.name || event?.venue?.address
      ? [
          {
            type: 'ceremonia',
            name: event.venue.name || 'Capilla & Duomo Real',
            address: event.venue.address || 'Piazza Centrale 14 · Centro Histórico',
            notes: 'Recepción de invitados 30 minutos antes.',
            mapUrl: event.venue.mapUrl || 'https://maps.google.com'
          },
          {
            type: 'recepcion',
            name: 'Villa L’Orangerie · Salón Imperial',
            address: 'Via dei Cipressi 88 · Jardines del Palazzo',
            notes: 'Valet parking y terraza de bienvenida disponibles.',
            mapUrl: 'https://maps.google.com'
          }
        ]
      : [
          {
            type: 'ceremonia',
            name: 'Duomo di Santa Maria',
            address: 'Via delle Belle Arti 12 · Recinto de Honor',
            notes: 'Ceremonia solemne · Se sugiere puntualidad.',
            mapUrl: 'https://maps.google.com'
          },
          {
            type: 'recepcion',
            name: 'Villa L’Orangerie · Giardino',
            address: 'Paseo de los Cipreses 240 · Terraza Principal',
            notes: 'Cóctel de bienvenida, banquete de gala y velada.',
            mapUrl: 'https://maps.google.com'
          }
        ];

    const isSingle = configuredLocations.length === 1;
    const rows = isSingle ? 1 : Math.max(1, Math.ceil(configuredLocations.length / 2));
    const cardHeightPx = 490;
    const totalHeight = Math.max(780, 220 + rows * (cardHeightPx + 36));
    const pct = (px: number) => Number(((px / totalHeight) * 100).toFixed(2));

    const locSec = makeSection(
      'locations',
      'Recintos & Ubicaciones',
      '#f8f3e8',
      totalHeight,
      `${ASSET_DIR}/fresco-parchment-bg.svg`
    );
    locSec.pluginSettings = {
      eyebrow: 'CAPÍTULO IV · COORDENADAS DE GALA',
      introText: 'Los escenarios elegidos para enmarcar cada momento de nuestra celebración.',
      primaryButtonText: 'ABRIR MAPA',
      locationLimit: 0
    };
    locSec.layers.push(
      makeLayer(
        'text',
        'CAPÍTULO IV · COORDENADAS DE GALA',
        12, pct(32), 76, pct(28),
        { fontFamily: bodyFont, fontSize: 10.5, fontWeight: 700, letterSpacing: 3, color: '#8f651e', textAlign: 'center' },
        { binding: 'display.locations.eyebrow', name: 'Eyebrow ubicaciones' }
      ),
      makeLayer(
        'text',
        'Recintos & Ubicaciones',
        8, pct(66), 84, pct(52),
        { fontFamily: headingFont, fontSize: 29, fontWeight: 700, color: '#152820', textAlign: 'center', letterSpacing: 1.2 },
        { binding: 'display.locations.title', name: 'Título ubicaciones' }
      ),
      makeLayer(
        'text',
        'Los escenarios elegidos para enmarcar cada momento de nuestra celebración.',
        12, pct(124), 76, pct(42),
        { fontFamily: editorialSerif, fontSize: 17, fontWeight: 500, color: '#3b4741', textAlign: 'center' },
        { binding: 'display.locations.intro', name: 'Intro ubicaciones' }
      ),
      makeLayer(
        'image',
        '',
        24, pct(168), 52, pct(28),
        { objectFit: 'contain' },
        { binding: 'display.locations.divider', url: `${ASSET_DIR}/botanical-crest-divider.svg`, name: 'Divisor ubicaciones' }
      )
    );

    configuredLocations.forEach((loc, idx) => {
      const left = isSingle ? 10 : idx % 2 === 0 ? 5 : 51;
      const cardW = isSingle ? 80 : 44;
      const innerLeft = left + 3;
      const innerW = cardW - 6;
      const topPx = 208 + (isSingle ? 0 : Math.floor(idx / 2) * (cardHeightPx + 34));
      const prefix = `location.${idx}`;
      const defaultArt = idx % 2 === 0
        ? `${ASSET_DIR}/chapel-duomo-illustration.svg`
        : `${ASSET_DIR}/villa-etching-illustration.svg`;

      locSec.layers.push(
        makeLayer(
          'shape',
          '',
          left, pct(topPx), cardW, pct(cardHeightPx),
          {
            backgroundColor: '#ffffff',
            borderColor: '#c89d4c',
            borderWidth: 1.5,
            borderStyle: 'solid',
            borderRadius: 22,
            boxShadow: '0 18px 40px rgba(21, 40, 32, 0.1)'
          },
          { binding: `${prefix}.card`, name: `Tarjeta recinto ${idx + 1}` }
        ),
        makeLayer(
          'text',
          idx === 0 ? 'RECINTO I · CEREMONIA' : `RECINTO ${idx + 1} · RECEPCIÓN`,
          innerLeft, pct(topPx + 16), innerW, pct(22),
          { fontFamily: bodyFont, fontSize: 9, fontWeight: 700, letterSpacing: 2.2, color: '#8f651e', textAlign: 'center' },
          { binding: `display.locations.badge.${idx}`, name: `Insignia recinto ${idx + 1}` }
        ),
        makeLayer(
          'shape',
          '',
          innerLeft + 0.5, pct(topPx + 40), innerW - 1, pct(169),
          {
            backgroundColor: '#152820',
            borderColor: '#c89d4c',
            borderWidth: 1.8,
            borderStyle: 'solid',
            borderRadius: 14,
            boxShadow: '0 12px 26px rgba(21, 40, 32, 0.16)'
          },
          { binding: `display.locations.frame.${idx}`, name: `Paspartú recinto ${idx + 1}` }
        ),
        makeLayer(
          'image',
          loc.name || `Recinto ${idx + 1}`,
          innerLeft + 2, pct(topPx + 46), innerW - 4, pct(157),
          {
            preserveAspectRatio: false,
            frameEnabled: true,
            objectFit: 'cover',
            objectPositionX: 50,
            objectPositionY: 50,
            imageMask: 'none',
            borderRadius: 10,
            borderColor: '#ebd197',
            borderWidth: 1.5,
            borderStyle: 'solid',
            backgroundColor: '#faf5eb',
            padding: 4,
            boxShadow: '0 6px 16px rgba(0, 0, 0, 0.18)'
          },
          { binding: `${prefix}.image`, url: loc.imageUrl || defaultArt, name: `Ilustración recinto ${idx + 1}` }
        ),
        makeLayer(
          'image',
          '',
          innerLeft + 1, pct(topPx + 42), innerW - 2, pct(165),
          { preserveAspectRatio: true, objectFit: 'contain' },
          {
            binding: `display.locations.filigree.${idx}`,
            url: `${ASSET_DIR}/venetian-triptych-frame.svg`,
            name: `Moldura veneciana recinto ${idx + 1}`,
            locked: true
          }
        ),
        makeLayer(
          'text',
          loc.name || loc.type || `Recinto ${idx + 1}`,
          innerLeft, pct(topPx + 220), innerW, pct(48),
          {
            fontFamily: headingFont,
            fontSize: isSingle ? 22 : 17,
            fontWeight: 700,
            color: '#152820',
            textAlign: 'center',
            lineHeight: 1.2
          },
          { binding: `${prefix}.name`, name: `Nombre recinto ${idx + 1}` }
        ),
        makeLayer(
          'text',
          loc.address || 'Dirección confirmada del evento',
          innerLeft, pct(topPx + 274), innerW, pct(48),
          { fontFamily: bodyFont, fontSize: 11.5, fontWeight: 500, color: '#424e48', textAlign: 'center', lineHeight: 1.35 },
          { binding: `${prefix}.address`, name: `Dirección recinto ${idx + 1}` }
        ),
        makeLayer(
          'text',
          loc.notes || 'Consulta las indicaciones de llegada y estacionamiento.',
          innerLeft, pct(topPx + 326), innerW, pct(44),
          { fontFamily: editorialSerif, fontSize: 14, fontStyle: 'italic', color: '#8f651e', textAlign: 'center', lineHeight: 1.3 },
          { binding: `${prefix}.notes`, name: `Notas recinto ${idx + 1}` }
        ),
        makeLayer(
          'button',
          'ABRIR MAPA',
          innerLeft + 1, pct(topPx + 382), innerW - 2, pct(42),
          {
            backgroundColor: '#152820',
            color: '#f4e2b8',
            fontFamily: bodyFont,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: 1.4,
            borderRadius: 30,
            borderColor: '#d4af63',
            borderWidth: 1.2,
            borderStyle: 'solid',
            boxShadow: '0 8px 18px rgba(21, 40, 32, 0.22)'
          },
          { binding: `${prefix}.map`, name: `Mapa recinto ${idx + 1}`, url: loc.mapUrl || 'https://maps.google.com' }
        ),
        makeLayer(
          'button',
          'IR CON WAZE',
          innerLeft + 3, pct(topPx + 432), innerW - 6, pct(38),
          {
            backgroundColor: '#faf5eb',
            color: '#152820',
            fontFamily: bodyFont,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1.2,
            borderRadius: 30,
            borderColor: '#c89d4c',
            borderWidth: 1.2,
            borderStyle: 'solid'
          },
          { binding: `${prefix}.waze`, name: `Waze recinto ${idx + 1}`, url: loc.wazeUrl || 'https://waze.com' }
        )
      );
    });

    sections.push(locSec);
  }

  // =========================================================================
  // 6. ITINERARY — EL PROGRAMA DE LA VELADA (860px+)
  // =========================================================================
  if (settings.itinerary !== false) {
    const items = content.itinerary?.length
      ? content.itinerary
      : [
          { time: '17:00 HRS', title: 'Ceremonia de Honor', description: 'Recepción solemne y votos en el recinto histórico.', icon: '✦', locationLabel: 'Ver mapa' },
          { time: '18:30 HRS', title: 'Cóctel en L’Orangerie', description: 'Cuarteto de cuerdas, mixología botánica y aperitivos en el jardín.', icon: '🥂', locationLabel: 'Jardín' },
          { time: '20:00 HRS', title: 'Banquete Imperial', description: 'Cena de autor a la luz de las velas y brindis de honor.', icon: '🍽', locationLabel: 'Salón' },
          { time: '22:00 HRS', title: 'Gran Soirée & Baile', description: 'Apertura de pista, música en vivo y celebración bajo las estrellas.', icon: '✨', locationLabel: 'Terraza' }
        ];

    const rowH = 152;
    const totalHeight = Math.max(820, 220 + items.length * rowH);
    const pct = (px: number) => Number(((px / totalHeight) * 100).toFixed(2));

    const itinSec = makeSection(
      'itinerary',
      'Programa de la Velada',
      '#13221d',
      totalHeight,
      `${ASSET_DIR}/cypress-nocturne-bg.svg`
    );
    itinSec.pluginSettings = {
      eyebrow: 'CAPÍTULO V · ORDEN DE LA VELADA',
      introText: 'Una sucesión de momentos diseñados para disfrutarse sin prisa.',
      showDescription: true
    };
    itinSec.layers.push(
      makeLayer(
        'text',
        'CAPÍTULO V · ORDEN DE LA VELADA',
        12, pct(30), 76, pct(28),
        { fontFamily: bodyFont, fontSize: 10.5, fontWeight: 700, letterSpacing: 3, color: '#ebd197', textAlign: 'center' },
        { binding: 'display.itinerary.eyebrow', name: 'Eyebrow itinerario' }
      ),
      makeLayer(
        'text',
        'Programa de la Velada',
        8, pct(64), 84, pct(52),
        { fontFamily: headingFont, fontSize: 29, fontWeight: 700, color: '#faf6ed', textAlign: 'center', letterSpacing: 1.2 },
        { binding: 'display.itinerary.title', name: 'Título itinerario' }
      ),
      makeLayer(
        'text',
        'Una sucesión de momentos diseñados para disfrutarse sin prisa.',
        12, pct(120), 76, pct(40),
        { fontFamily: editorialSerif, fontSize: 17, fontWeight: 500, color: '#d9ceb8', textAlign: 'center' },
        { binding: 'display.itinerary.intro', name: 'Intro itinerario' }
      ),
      makeLayer(
        'shape',
        '',
        10.5, pct(192), 0.6, pct(items.length * rowH - 28),
        { backgroundColor: '#c89d4c', shapeKind: 'rectangle' },
        { binding: 'display.itinerary.spine', name: 'Eje cronológico dorado' }
      )
    );

    items.forEach((item, idx) => {
      const topPx = 190 + idx * rowH;
      const prefix = `itinerary.${idx}`;
      const isWarmCard = idx % 2 === 0;

      itinSec.layers.push(
        makeLayer(
          'shape',
          '',
          15, pct(topPx), 78, pct(132),
          {
            backgroundColor: isWarmCard ? '#f9f4ea' : 'rgba(26, 49, 40, 0.92)',
            borderColor: '#d4af63',
            borderWidth: 1.5,
            borderStyle: 'solid',
            borderRadius: 18,
            boxShadow: '0 14px 32px rgba(0, 0, 0, 0.38)'
          },
          { binding: `${prefix}.card`, name: `Tarjeta programa ${idx + 1}` }
        ),
        makeLayer(
          'text',
          item.icon || '✦',
          7, pct(topPx + 42), 8, pct(42),
          {
            fontFamily: headingFont,
            fontSize: 16,
            fontWeight: 700,
            color: '#152820',
            backgroundColor: '#ebd197',
            borderRadius: 999,
            borderColor: '#ffffff',
            borderWidth: 1.5,
            borderStyle: 'solid',
            textAlign: 'center',
            boxShadow: '0 6px 16px rgba(0,0,0,0.35)'
          },
          { binding: `${prefix}.icon`, name: `Icono actividad ${idx + 1}` }
        ),
        makeLayer(
          'text',
          item.time || `1${7 + idx}:00 HRS`,
          19, pct(topPx + 14), 28, pct(28),
          {
            fontFamily: bodyFont,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: 1.8,
            color: isWarmCard ? '#8f651e' : '#ebd197',
            textAlign: 'left'
          },
          { binding: `${prefix}.time`, name: `Hora actividad ${idx + 1}` }
        ),
        makeLayer(
          'text',
          item.title || `Momento ${idx + 1}`,
          19, pct(topPx + 42), 50, pct(34),
          {
            fontFamily: headingFont,
            fontSize: 18,
            fontWeight: 700,
            color: isWarmCard ? '#152820' : '#faf6ed',
            textAlign: 'left'
          },
          { binding: `${prefix}.title`, name: `Título actividad ${idx + 1}` }
        ),
        makeLayer(
          'text',
          item.description || 'Detalle especial del programa de celebración.',
          19, pct(topPx + 78), 50, pct(42),
          {
            fontFamily: bodyFont,
            fontSize: 11.5,
            fontWeight: 400,
            color: isWarmCard ? '#424e48' : '#d9ceb8',
            textAlign: 'left',
            lineHeight: 1.35
          },
          { binding: `${prefix}.description`, name: `Descripción actividad ${idx + 1}` }
        ),
        makeLayer(
          'button',
          item.locationLabel || 'Ubicación ↗',
          71, pct(topPx + 46), 19, pct(38),
          {
            backgroundColor: isWarmCard ? '#152820' : '#ebd197',
            color: isWarmCard ? '#f4e2b8' : '#152820',
            fontFamily: bodyFont,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.8,
            borderRadius: 24,
            borderColor: '#c89d4c',
            borderWidth: 1,
            borderStyle: 'solid'
          },
          { binding: `${prefix}.location`, name: `Enlace actividad ${idx + 1}`, url: item.locationUrl || '#locations' }
        )
      );
    });

    sections.push(itinSec);
  }

  // =========================================================================
  // 7. DRESS CODE — ATELIER SARTORIAL (800px)
  // =========================================================================
  if (settings.dressCode !== false) {
    const dressOptions = content.dressCodeOptions?.length
      ? content.dressCodeOptions
      : [
          { title: 'Damas · Gala Palazzo', description: 'Vestido largo fluido de noche. Evitar blanco, marfil y crema.', color: '#c89d4c' },
          { title: 'Caballeros · Black Tie', description: 'Esmoquin clásico o traje formal oscuro con corbata o moño.', color: '#152820' }
        ];

    const rows = Math.max(1, Math.ceil(dressOptions.length / 2));
    const totalHeight = Math.max(840, 540 + rows * 165);
    const pct = (px: number) => Number(((px / totalHeight) * 100).toFixed(2));

    const dressSec = makeSection(
      'dressCode',
      'Código de Etiqueta',
      '#f5efe2',
      totalHeight,
      `${ASSET_DIR}/fresco-parchment-bg.svg`
    );
    dressSec.pluginSettings = {
      eyebrow: 'CAPÍTULO VI · ESTÉTICA & PROTOCOLO',
      introText: 'Tu elegancia forma parte de la atmósfera visual de nuestra celebración.',
      showImage: true,
      showDescription: true
    };
    dressSec.layers.push(
      makeLayer(
        'text',
        'CAPÍTULO VI · ESTÉTICA & PROTOCOLO',
        12, pct(30), 76, pct(28),
        { fontFamily: bodyFont, fontSize: 10.5, fontWeight: 700, letterSpacing: 3, color: '#8f651e', textAlign: 'center' },
        { binding: 'display.dressCode.eyebrow', name: 'Eyebrow vestimenta' }
      ),
      makeLayer(
        'text',
        'Código de Etiqueta',
        8, pct(64), 84, pct(52),
        { fontFamily: headingFont, fontSize: 29, fontWeight: 700, color: '#152820', textAlign: 'center', letterSpacing: 1.2 },
        { binding: 'display.dressCode.title', name: 'Título vestimenta' }
      ),
      makeLayer(
        'text',
        'Tu elegancia forma parte de la atmósfera visual de nuestra celebración.',
        12, pct(120), 76, pct(40),
        { fontFamily: editorialSerif, fontSize: 17, fontWeight: 500, color: '#3b4741', textAlign: 'center' },
        { binding: 'display.dressCode.intro', name: 'Intro vestimenta' }
      ),
      makeLayer(
        'shape',
        '',
        7, pct(172), 86, pct(310),
        {
          backgroundColor: '#ffffff',
          borderColor: '#c89d4c',
          borderWidth: 1.5,
          borderStyle: 'solid',
          borderRadius: 22,
          boxShadow: '0 18px 42px rgba(21, 40, 32, 0.1)'
        },
        { binding: 'dress.mainCard', name: 'Vitrina sartorial' }
      ),
      makeLayer(
        'shape',
        '',
        9.8, pct(186), 35.4, pct(282),
        {
          backgroundColor: '#152820',
          borderColor: '#d4af63',
          borderWidth: 2,
          borderStyle: 'solid',
          borderRadius: 16,
          boxShadow: '0 16px 34px rgba(21, 40, 32, 0.18)'
        },
        { binding: 'display.dressCode.photoMat', name: 'Paspartú sartorial' }
      ),
      makeLayer(
        'image',
        'Ilustración de etiqueta',
        11.2, pct(194), 32.6, pct(266),
        {
          preserveAspectRatio: false,
          frameEnabled: true,
          objectFit: 'cover',
          objectPositionX: 50,
          objectPositionY: 50,
          imageMask: 'none',
          borderRadius: 11,
          borderColor: '#ebd197',
          borderWidth: 1.5,
          borderStyle: 'solid',
          backgroundColor: '#faf5eb',
          padding: 5,
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)'
        },
        {
          binding: 'dress.image',
          url: content.dressCodeImageUrl || `${ASSET_DIR}/couture-dresscode-art.svg`,
          name: 'Figurín de alta costura'
        }
      ),
      makeLayer(
        'image',
        '',
        10.2, pct(188), 34.6, pct(278),
        { preserveAspectRatio: true, objectFit: 'contain' },
        {
          binding: 'display.dressCode.photoFrame',
          url: `${ASSET_DIR}/gilded-gallery-frame.svg`,
          name: 'Moldura dorada de etiqueta',
          locked: true
        }
      ),
      makeLayer(
        'text',
        'ATELIER SARTORIAL · GALA',
        48, pct(196), 41, pct(24),
        { fontFamily: bodyFont, fontSize: 9.5, fontWeight: 700, letterSpacing: 2.2, color: '#8f651e', textAlign: 'left' },
        { binding: 'display.dressCode.badge', name: 'Insignia sartorial' }
      ),
      makeLayer(
        'text',
        content.dressCode || 'Rigurosa Etiqueta · Black Tie',
        48, pct(224), 41, pct(54),
        { fontFamily: headingFont, fontSize: 21, fontWeight: 700, color: '#152820', textAlign: 'left', lineHeight: 1.2 },
        { binding: 'dress.code', name: 'Código de vestimenta' }
      ),
      makeLayer(
        'text',
        content.dressCodeDescription ||
          'Damas: Vestido largo de noche en tonos joya, tierra o profundos.\nCaballeros: Esmoquin clásico o traje formal oscuro.',
        48, pct(284), 41, pct(112),
        { fontFamily: bodyFont, fontSize: 12, fontWeight: 400, color: '#424e48', textAlign: 'left', lineHeight: 1.45 },
        { binding: 'dress.description', name: 'Descripción de etiqueta' }
      ),
      makeLayer(
        'text',
        'PALETA SUGERIDA DEL PALAZZO',
        48, pct(404), 41, pct(20),
        { fontFamily: bodyFont, fontSize: 8.5, fontWeight: 700, letterSpacing: 2, color: '#8f651e', textAlign: 'left' },
        { binding: 'display.dressCode.paletteLabel', name: 'Etiqueta de paleta' }
      ),
      // 5 Color Swatch Medallions
      ...['#152820', '#c89d4c', '#3d2329', '#4b5d4e', '#b88a68'].map((hex, sIdx) =>
        makeLayer(
          'shape',
          '',
          48 + sIdx * 7.5, pct(428), 6, pct(34),
          {
            backgroundColor: hex,
            borderColor: '#d4af63',
            borderWidth: 1.5,
            borderStyle: 'solid',
            borderRadius: 999,
            boxShadow: '0 4px 10px rgba(0,0,0,0.16)'
          },
          { binding: `display.dressCode.swatch.${sIdx}`, name: `Muestra de color ${sIdx + 1}` }
        )
      )
    );

    dressOptions.forEach((opt, idx) => {
      const left = idx % 2 === 0 ? 7 : 51;
      const topPx = 504 + Math.floor(idx / 2) * 150;
      const prefix = `dress.option.${idx}`;
      dressSec.layers.push(
        makeLayer(
          'shape',
          '',
          left, pct(topPx), 42, pct(132),
          {
            backgroundColor: '#152820',
            borderColor: '#c89d4c',
            borderWidth: 1.4,
            borderStyle: 'solid',
            borderRadius: 18,
            boxShadow: '0 12px 28px rgba(21, 40, 32, 0.18)'
          },
          { binding: `${prefix}.card`, name: `Tarjeta opción ${idx + 1}` }
        ),
        makeLayer(
          'shape',
          '',
          left + 3, pct(topPx + 22), 6.5, pct(42),
          {
            backgroundColor: opt.color || (idx === 0 ? '#c89d4c' : '#ebd197'),
            borderColor: '#faf6ed',
            borderWidth: 1.5,
            borderStyle: 'solid',
            borderRadius: 999
          },
          { binding: `${prefix}.color`, name: `Color opción ${idx + 1}` }
        ),
        makeLayer(
          'text',
          opt.title || `Guía ${idx + 1}`,
          left + 11.5, pct(topPx + 18), 28, pct(34),
          { fontFamily: headingFont, fontSize: 14.5, fontWeight: 700, color: '#ebd197', textAlign: 'left' },
          { binding: `${prefix}.title`, name: `Título opción ${idx + 1}` }
        ),
        makeLayer(
          'text',
          opt.description || 'Recomendación especial de vestimenta.',
          left + 11.5, pct(topPx + 54), 28, pct(64),
          { fontFamily: bodyFont, fontSize: 11, fontWeight: 400, color: '#f4efe6', textAlign: 'left', lineHeight: 1.35 },
          { binding: `${prefix}.description`, name: `Descripción opción ${idx + 1}` }
        )
      );
    });

    sections.push(dressSec);
  }

  // =========================================================================
  // 8. GALLERY — EL SALÓN DE LOS RECUERDOS (880px+)
  // =========================================================================
  if (settings.gallery !== false) {
    const rawGallery = content.galleryItems?.length
      ? content.galleryItems
      : content.gallery?.length
      ? content.gallery.map((url, i) => ({ id: `g-${i}`, url, title: `Instante 0${i + 1}`, description: 'Colección privada L’Orangerie' }))
      : [
          { id: 'g-1', url: `${ASSET_DIR}/garden-portrait.webp`, title: 'I · El Jardín de los Cipreses', description: 'Tarde dorada en la terraza' },
          { id: 'g-2', url: `${ASSET_DIR}/villa-painting.png`, title: 'II · La Loggia del Palazzo', description: 'Arquitectura y memoria' },
          { id: 'g-3', url: `${ASSET_DIR}/floral-bouquet.png`, title: 'III · Botánica de Gala', description: 'Detalles en flor y oro viejo' },
          { id: 'g-4', url: `${ASSET_DIR}/grand-hotel-1.png`, title: 'IV · La Velada Eterna', description: 'Bajo el cielo estrellado' }
        ];

    const rows = Math.max(1, Math.ceil(rawGallery.length / 2));
    const totalHeight = Math.max(860, 220 + rows * 320);
    const pct = (px: number) => Number(((px / totalHeight) * 100).toFixed(2));

    const galSec = makeSection(
      'gallery',
      'El Salón de los Recuerdos',
      '#151311',
      totalHeight,
      `${ASSET_DIR}/cypress-nocturne-bg.svg`,
      0.22
    );
    galSec.pluginSettings = {
      eyebrow: 'CAPÍTULO VII · EXPOSICIÓN VISUAL',
      introText: 'Fragmentos de luz y complicidad que nos trajeron hasta aquí.',
      displayMode: 'inherit',
      showCaptions: true,
      imageHeight: 210
    };
    galSec.layers.push(
      makeLayer(
        'text',
        'CAPÍTULO VII · EXPOSICIÓN VISUAL',
        12, pct(30), 76, pct(28),
        { fontFamily: bodyFont, fontSize: 10.5, fontWeight: 700, letterSpacing: 3, color: '#ebd197', textAlign: 'center' },
        { binding: 'display.gallery.eyebrow', name: 'Eyebrow galería' }
      ),
      makeLayer(
        'text',
        'El Salón de los Recuerdos',
        8, pct(64), 84, pct(52),
        { fontFamily: headingFont, fontSize: 28, fontWeight: 700, color: '#faf6ed', textAlign: 'center', letterSpacing: 1.2 },
        { binding: 'display.gallery.title', name: 'Título galería' }
      ),
      makeLayer(
        'text',
        'Fragmentos de luz y complicidad que nos trajeron hasta aquí.',
        12, pct(120), 76, pct(40),
        { fontFamily: editorialSerif, fontSize: 17, fontWeight: 500, color: '#d9ceb8', textAlign: 'center' },
        { binding: 'display.gallery.intro', name: 'Intro galería' }
      )
    );

    const fallbackUrls = [
      `${ASSET_DIR}/garden-portrait.webp`,
      `${ASSET_DIR}/villa-painting.png`,
      `${ASSET_DIR}/floral-bouquet.png`,
      `${ASSET_DIR}/grand-hotel-1.png`
    ];

    rawGallery.forEach((item, idx) => {
      const isLeft = idx % 2 === 0;
      const left = isLeft ? 6 : 52;
      const staggerOffset = isLeft ? 0 : 22;
      const topPx = 186 + Math.floor(idx / 2) * 310 + staggerOffset;
      const prefix = `gallery.item.${idx}`;
      const imgUrl = item.url || fallbackUrls[idx % fallbackUrls.length];

      galSec.layers.push(
        makeLayer(
          'shape',
          '',
          left, pct(topPx), 42, pct(288),
          {
            backgroundColor: '#faf5eb',
            borderColor: '#c89d4c',
            borderWidth: 2,
            borderStyle: 'solid',
            borderRadius: 18,
            boxShadow: '0 22px 44px rgba(0, 0, 0, 0.48)'
          },
          { binding: `${prefix}.card`, name: `Marco de galería ${idx + 1}` }
        ),
        makeLayer(
          'shape',
          '',
          left + 2, pct(topPx + 12), 38, pct(206),
          {
            backgroundColor: '#152820',
            borderColor: '#d4af63',
            borderWidth: 1.5,
            borderStyle: 'solid',
            borderRadius: 13,
            boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.38)'
          },
          { binding: `display.gallery.mat.${idx}`, name: `Paspartú esmeralda ${idx + 1}` }
        ),
        makeLayer(
          'image',
          item.title || `Fotografía ${idx + 1}`,
          left + 3.4, pct(topPx + 19), 35.2, pct(192),
          {
            preserveAspectRatio: false,
            frameEnabled: true,
            objectFit: 'cover',
            objectPositionX: 50,
            objectPositionY: 50,
            imageMask: 'none',
            borderRadius: 9,
            borderColor: '#ebd197',
            borderWidth: 1.5,
            borderStyle: 'solid',
            backgroundColor: '#faf5eb',
            padding: 3,
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.28)'
          },
          { binding: `${prefix}.image`, url: imgUrl, name: `Fotografía ${idx + 1}` }
        ),
        makeLayer(
          'image',
          '',
          left + 2.2, pct(topPx + 13), 37.6, pct(204),
          { preserveAspectRatio: true, objectFit: 'contain' },
          {
            binding: `display.gallery.frame.${idx}`,
            url: `${ASSET_DIR}/gilded-gallery-frame.svg`,
            name: `Moldura florentina ${idx + 1}`,
            locked: true
          }
        ),
        makeLayer(
          'shape',
          '',
          left + 3.5, pct(topPx + 225), 35, pct(50),
          {
            backgroundColor: '#f3ead8',
            borderColor: '#d4af63',
            borderWidth: 1,
            borderStyle: 'solid',
            borderRadius: 10
          },
          { binding: `display.gallery.plaque.${idx}`, name: `Cartela de museo ${idx + 1}` }
        ),
        makeLayer(
          'text',
          item.title || `Instante 0${idx + 1}`,
          left + 4.5, pct(topPx + 229), 33, pct(24),
          { fontFamily: headingFont, fontSize: 13.5, fontWeight: 700, color: '#152820', textAlign: 'center', letterSpacing: 0.8 },
          { binding: `${prefix}.title`, name: `Título foto ${idx + 1}` }
        ),
        makeLayer(
          'text',
          item.description || 'Colección L’Orangerie',
          left + 4.5, pct(topPx + 251), 33, pct(20),
          { fontFamily: editorialSerif, fontSize: 12.5, fontStyle: 'italic', color: '#7c5b24', textAlign: 'center' },
          { binding: `${prefix}.description`, name: `Descripción foto ${idx + 1}` }
        )
      );
    });

    // Carousel mode bindings (hidden unless user switches gallery to carousel mode)
    const firstItem = rawGallery[0];
    galSec.layers.push(
      makeLayer(
        'image',
        firstItem?.title || 'Fotografía actual',
        14, pct(195), 72, pct(350),
        {
          preserveAspectRatio: false,
          frameEnabled: true,
          objectFit: 'cover',
          objectPositionX: 50,
          objectPositionY: 50,
          imageMask: 'none',
          borderRadius: 18,
          borderColor: '#d4af63',
          borderWidth: 2,
          borderStyle: 'solid',
          backgroundColor: '#faf5eb',
          padding: 5
        },
        { binding: 'gallery.carousel.image', url: firstItem?.url || fallbackUrls[0], name: 'Carrusel: Foto actual' }
      ),
      makeLayer(
        'text',
        firstItem?.title || 'Instante 01',
        18, pct(560), 64, pct(36),
        { fontFamily: headingFont, fontSize: 20, fontWeight: 700, color: '#faf6ed', textAlign: 'center' },
        { binding: 'gallery.carousel.title', name: 'Carrusel: Título' }
      ),
      makeLayer(
        'text',
        firstItem?.description || 'Colección L’Orangerie',
        18, pct(600), 64, pct(28),
        { fontFamily: editorialSerif, fontSize: 15, fontStyle: 'italic', color: '#ebd197', textAlign: 'center' },
        { binding: 'gallery.carousel.description', name: 'Carrusel: Descripción' }
      ),
      makeLayer(
        'button',
        '‹',
        4, pct(345), 8, pct(48),
        { backgroundColor: '#152820', color: '#ebd197', borderColor: '#d4af63', borderWidth: 1.2, borderStyle: 'solid', borderRadius: 999, fontSize: 20 },
        { binding: 'gallery.carousel.previous', name: 'Carrusel: Anterior' }
      ),
      makeLayer(
        'button',
        '›',
        88, pct(345), 8, pct(48),
        { backgroundColor: '#152820', color: '#ebd197', borderColor: '#d4af63', borderWidth: 1.2, borderStyle: 'solid', borderRadius: 999, fontSize: 20 },
        { binding: 'gallery.carousel.next', name: 'Carrusel: Siguiente' }
      ),
      makeLayer(
        'text',
        `1 / ${Math.max(1, rawGallery.length)}`,
        40, pct(636), 20, pct(26),
        { fontFamily: bodyFont, fontSize: 11, fontWeight: 700, color: '#ebd197', textAlign: 'center' },
        { binding: 'gallery.carousel.counter', name: 'Carrusel: Contador' }
      )
    );

    sections.push(galSec);
  }

  // =========================================================================
  // 9. GIFTS — PRESENTES & SOBRE DIGITAL (940px)
  // =========================================================================
  if (settings.giftRegistry !== false || settings.digitalEnvelope !== false) {
    const gifts: GiftRegistryItem[] = content.giftRegistry?.length
      ? content.giftRegistry
      : [
          {
            store: 'EL PALACIO DE HIERRO',
            title: 'Mesa de Gala · Celebra',
            note: 'Artículos seleccionados para nuestro nuevo hogar.',
            url: 'https://www.elpalaciodehierro.com',
            imageUrl: 'assets/giftTable/palacio-logo.png'
          },
          {
            store: 'AMAZON & LIVERPOOL',
            title: 'Wishlist Internacional',
            note: 'Experiencias de viaje y piezas de colección.',
            url: 'https://www.amazon.com.mx',
            imageUrl: 'assets/giftTable/logo-amazon.png'
          }
        ];

    const rows = Math.max(1, Math.ceil(gifts.length / 2));
    const envTop = 215 + rows * 285;
    const totalHeight = Math.max(960, envTop + 340);
    const pct = (px: number) => Number(((px / totalHeight) * 100).toFixed(2));

    const giftSec = makeSection(
      'gifts',
      'Mesa de Regalos & Sobre Digital',
      '#f8f3e8',
      totalHeight,
      `${ASSET_DIR}/fresco-parchment-bg.svg`
    );
    giftSec.pluginSettings = {
      eyebrow: 'CAPÍTULO VIII · MUESTRAS DE AFECTO',
      introText: content.giftSettings?.introText || 'Tu presencia es nuestro mayor tesoro; si deseas tener un detalle con nosotros, hemos dispuesto estas opciones.',
      primaryButtonText: 'ABRIR MESA DE REGALOS',
      envelopeButtonText: 'COPIAR CLABE',
      showRegistry: true,
      showEnvelope: true
    };
    giftSec.layers.push(
      makeLayer(
        'text',
        'CAPÍTULO VIII · MUESTRAS DE AFECTO',
        12, pct(30), 76, pct(28),
        { fontFamily: bodyFont, fontSize: 10.5, fontWeight: 700, letterSpacing: 3, color: '#8f651e', textAlign: 'center' },
        { binding: 'display.gifts.eyebrow', name: 'Eyebrow regalos' }
      ),
      makeLayer(
        'text',
        'Mesa de Regalos & Sobre Digital',
        8, pct(64), 84, pct(52),
        { fontFamily: headingFont, fontSize: 27, fontWeight: 700, color: '#152820', textAlign: 'center', letterSpacing: 1 },
        { binding: 'display.gifts.title', name: 'Título regalos' }
      ),
      makeLayer(
        'text',
        content.giftSettings?.introText ||
          'Tu presencia es nuestro mayor tesoro; si deseas tener un detalle con nosotros, hemos dispuesto estas opciones.',
        10, pct(120), 80, pct(44),
        { fontFamily: editorialSerif, fontSize: 16.5, fontWeight: 500, color: '#3b4741', textAlign: 'center' },
        { binding: 'display.gifts.intro', name: 'Intro regalos' }
      )
    );

    const isSingleGift = gifts.length === 1;
    gifts.forEach((gift, idx) => {
      const left = isSingleGift ? 10 : idx % 2 === 0 ? 6 : 51;
      const cardW = isSingleGift ? 80 : 43;
      const innerLeft = left + 3;
      const innerW = cardW - 6;
      const topPx = 195 + Math.floor(idx / 2) * 285;
      const prefix = `gift.${idx}`;
      const logoUrl = resolveGiftStoreLogo(gift);

      giftSec.layers.push(
        makeLayer(
          'shape',
          '',
          left, pct(topPx), cardW, pct(258),
          {
            backgroundColor: '#ffffff',
            borderColor: '#c89d4c',
            borderWidth: 1.5,
            borderStyle: 'solid',
            borderRadius: 20,
            boxShadow: '0 16px 36px rgba(21, 40, 32, 0.09)'
          },
          { binding: `${prefix}.card`, name: `Tarjeta mesa ${idx + 1}` }
        ),
        makeLayer(
          'image',
          gift.store || `Mesa ${idx + 1}`,
          left + cardW / 2 - 9, pct(topPx + 16), 18, pct(54),
          {
            objectFit: 'contain',
            backgroundColor: '#faf5eb',
            borderColor: '#e5d4b7',
            borderWidth: 1,
            borderStyle: 'solid',
            borderRadius: 12,
            padding: 6
          },
          { binding: `${prefix}.image`, url: logoUrl, name: `Logo mesa ${idx + 1}` }
        ),
        makeLayer(
          'text',
          gift.store || 'MESA DE REGALOS',
          innerLeft, pct(topPx + 78), innerW, pct(22),
          { fontFamily: bodyFont, fontSize: 9.5, fontWeight: 700, letterSpacing: 2, color: '#8f651e', textAlign: 'center' },
          { binding: `${prefix}.store`, name: `Tienda ${idx + 1}` }
        ),
        makeLayer(
          'text',
          gift.title || gift.store || `Registro ${idx + 1}`,
          innerLeft, pct(topPx + 102), innerW, pct(36),
          { fontFamily: headingFont, fontSize: 17, fontWeight: 700, color: '#152820', textAlign: 'center' },
          { binding: `${prefix}.title`, name: `Título mesa ${idx + 1}` }
        ),
        makeLayer(
          'text',
          gift.note || 'Gracias por acompañarnos con tu cariño.',
          innerLeft, pct(topPx + 142), innerW, pct(46),
          { fontFamily: editorialSerif, fontSize: 14, fontStyle: 'italic', color: '#424e48', textAlign: 'center', lineHeight: 1.35 },
          { binding: `${prefix}.note`, name: `Nota mesa ${idx + 1}` }
        ),
        makeLayer(
          'button',
          'ABRIR MESA',
          innerLeft + 2, pct(topPx + 198), innerW - 4, pct(42),
          {
            backgroundColor: '#152820',
            color: '#f4e2b8',
            fontFamily: bodyFont,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: 1.4,
            borderRadius: 30,
            borderColor: '#d4af63',
            borderWidth: 1.2,
            borderStyle: 'solid'
          },
          { binding: `${prefix}.open`, name: `Botón mesa ${idx + 1}`, url: gift.url || 'https://www.elpalaciodehierro.com' }
        )
      );
    });

    // Digital Envelope Card
    const envelope = content.digitalEnvelope || {};
    giftSec.layers.push(
      makeLayer(
        'shape',
        '',
        6, pct(envTop), 88, pct(300),
        {
          backgroundColor: '#152820',
          borderColor: '#d4af63',
          borderWidth: 1.8,
          borderStyle: 'solid',
          borderRadius: 24,
          boxShadow: '0 22px 48px rgba(15, 28, 22, 0.28)'
        },
        { binding: 'envelope.card', name: 'Cofre de sobre digital' }
      ),
      makeLayer(
        'image',
        'Sobre de gala con lacre',
        10, pct(envTop + 22), 24, pct(135),
        { objectFit: 'contain' },
        {
          binding: 'display.gifts.envelopeArt',
          url: `${ASSET_DIR}/heirloom-envelope-seal.svg`,
          name: 'Ilustración sobre lacrado'
        }
      ),
      makeLayer(
        'text',
        'Sobre Digital & Transferencia',
        36, pct(envTop + 22), 54, pct(38),
        { fontFamily: headingFont, fontSize: 20, fontWeight: 700, color: '#faf6ed', textAlign: 'left' },
        { binding: 'display.gifts.envelopeTitle', name: 'Título sobre digital' }
      ),
      makeLayer(
        'text',
        envelope.bank || 'BBVA Bancomer · Banca Privada',
        36, pct(envTop + 66), 26, pct(28),
        { fontFamily: bodyFont, fontSize: 11.5, fontWeight: 700, color: '#ebd197', textAlign: 'left' },
        { binding: 'envelope.bank', name: 'Banco' }
      ),
      makeLayer(
        'text',
        envelope.holder || 'Titular: Anfitriones del Evento',
        63, pct(envTop + 66), 27, pct(28),
        { fontFamily: bodyFont, fontSize: 11.5, fontWeight: 600, color: '#faf6ed', textAlign: 'left' },
        { binding: 'envelope.holder', name: 'Titular' }
      ),
      makeLayer(
        'text',
        envelope.account ? `Cuenta: ${envelope.account}` : 'Cuenta: 0192 8374 65',
        36, pct(envTop + 100), 26, pct(28),
        { fontFamily: 'monospace', fontSize: 11.5, fontWeight: 700, color: '#ebd197', textAlign: 'left' },
        { binding: 'envelope.account', name: 'Número de cuenta' }
      ),
      makeLayer(
        'text',
        envelope.clabe ? `CLABE: ${envelope.clabe}` : 'CLABE: 0121 8000 1928 3746 51',
        63, pct(envTop + 100), 27, pct(28),
        { fontFamily: 'monospace', fontSize: 11.5, fontWeight: 700, color: '#ebd197', textAlign: 'left' },
        { binding: 'envelope.clabe', name: 'CLABE interbancaria' }
      ),
      makeLayer(
        'text',
        envelope.note || 'Agradecemos infinitamente tu generosidad y presencia en esta nueva etapa.',
        12, pct(envTop + 165), 76, pct(36),
        { fontFamily: editorialSerif, fontSize: 15, fontStyle: 'italic', color: '#d9ceb8', textAlign: 'center' },
        { binding: 'envelope.note', name: 'Dedicatoria de sobre' }
      ),
      makeLayer(
        'button',
        'COPIAR CUENTA',
        16, pct(envTop + 214), 31, pct(44),
        {
          backgroundColor: 'rgba(255, 252, 245, 0.1)',
          color: '#faf6ed',
          fontFamily: bodyFont,
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: 1.2,
          borderRadius: 30,
          borderColor: '#d4af63',
          borderWidth: 1.2,
          borderStyle: 'solid'
        },
        { binding: 'envelope.copyAccount', name: 'Copiar cuenta' }
      ),
      makeLayer(
        'button',
        'COPIAR CLABE',
        53, pct(envTop + 214), 31, pct(44),
        {
          backgroundColor: '#d4af63',
          color: '#152820',
          fontFamily: bodyFont,
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: 1.2,
          borderRadius: 30,
          borderColor: '#f4e2b8',
          borderWidth: 1.2,
          borderStyle: 'solid',
          boxShadow: '0 8px 20px rgba(212, 175, 99, 0.35)'
        },
        { binding: 'envelope.copyClabe', name: 'Copiar CLABE' }
      ),
      makeLayer(
        'text',
        'Datos copiados al portapapeles',
        20, pct(envTop + 266), 60, pct(24),
        { fontFamily: bodyFont, fontSize: 11, fontWeight: 600, color: '#ebd197', textAlign: 'center' },
        { binding: 'envelope.feedback', name: 'Confirmación de copiado' }
      )
    );

    sections.push(giftSec);
  }

  // =========================================================================
  // 10. LODGING — CONCIERGE DE HOSPITALIDAD (780px+)
  // =========================================================================
  if (settings.lodging !== false) {
    const hotels = content.lodging?.length
      ? content.lodging
      : [
          {
            name: 'Grand Hotel Villa d’Este & Spa',
            description: 'A 5 minutos del recinto principal, frente a los jardines.',
            address: 'Via Regina 40 · Zona Hotelera Imperial',
            priceLabel: 'Tarifa preferencial desde $2,850 MXN',
            agreementLabel: 'Convenio Gala L’Orangerie',
            discountCode: 'ORANGERIE26',
            discountDescription: '15% de descuento en suite clásica',
            services: ['Desayuno buffet', 'Valet Parking', 'Shuttle al evento', 'Late Check-out'],
            notes: 'Menciona el código al reservar por teléfono o en línea.',
            url: 'https://maps.google.com',
            mapUrl: 'https://maps.google.com',
            phone: '+525500000000',
            imageUrl: `${ASSET_DIR}/grand-hotel-1.png`
          }
        ];

    const cardH = 380;
    const totalHeight = Math.max(660, 210 + hotels.length * (cardH + 30));
    const pct = (px: number) => Number(((px / totalHeight) * 100).toFixed(2));

    const lodgSec = makeSection(
      'lodging',
      'Concierge de Hospedaje',
      '#efe6d5',
      totalHeight,
      `${ASSET_DIR}/fresco-parchment-bg.svg`
    );
    lodgSec.pluginSettings = {
      eyebrow: 'CAPÍTULO IX · HOSPITALIDAD & ESTANCIA',
      introText: 'Opciones exclusivas seleccionadas para el descanso y confort de nuestros invitados.',
      primaryButtonText: 'RESERVAR ESTANCIA',
      showPrice: true,
      showDiscount: true,
      showServices: true,
      showMap: true,
      showPhone: true
    };
    lodgSec.layers.push(
      makeLayer(
        'text',
        'CAPÍTULO IX · HOSPITALIDAD & ESTANCIA',
        12, pct(30), 76, pct(28),
        { fontFamily: bodyFont, fontSize: 10.5, fontWeight: 700, letterSpacing: 3, color: '#8f651e', textAlign: 'center' },
        { binding: 'display.lodging.eyebrow', name: 'Eyebrow hospedaje' }
      ),
      makeLayer(
        'text',
        'Concierge de Hospedaje',
        8, pct(64), 84, pct(52),
        { fontFamily: headingFont, fontSize: 28, fontWeight: 700, color: '#152820', textAlign: 'center', letterSpacing: 1.2 },
        { binding: 'display.lodging.title', name: 'Título hospedaje' }
      ),
      makeLayer(
        'text',
        'Opciones exclusivas seleccionadas para el descanso y confort de nuestros invitados.',
        12, pct(120), 76, pct(40),
        { fontFamily: editorialSerif, fontSize: 17, fontWeight: 500, color: '#3b4741', textAlign: 'center' },
        { binding: 'display.lodging.intro', name: 'Intro hospedaje' }
      )
    );

    hotels.forEach((hotel, idx) => {
      const topPx = 186 + idx * (cardH + 28);
      const prefix = `lodging.${idx}`;
      const hotelImg = hotel.imageUrl || (idx % 2 === 0 ? `${ASSET_DIR}/grand-hotel-1.png` : `${ASSET_DIR}/grand-hotel-2.png`);

      lodgSec.layers.push(
        makeLayer(
          'shape',
          '',
          7, pct(topPx), 86, pct(cardH),
          {
            backgroundColor: '#ffffff',
            borderColor: '#c89d4c',
            borderWidth: 1.5,
            borderStyle: 'solid',
            borderRadius: 22,
            boxShadow: '0 18px 42px rgba(21, 40, 32, 0.1)'
          },
          { binding: `${prefix}.card`, name: `Tarjeta hotel ${idx + 1}` }
        ),
        makeLayer(
          'shape',
          '',
          9.8, pct(topPx + 16), 30.4, pct(160),
          {
            backgroundColor: '#152820',
            borderColor: '#c89d4c',
            borderWidth: 1.8,
            borderStyle: 'solid',
            borderRadius: 15,
            boxShadow: '0 12px 26px rgba(21, 40, 32, 0.16)'
          },
          { binding: `display.lodging.frame.${idx}`, name: `Paspartú hotel ${idx + 1}` }
        ),
        makeLayer(
          'image',
          hotel.name || `Hotel ${idx + 1}`,
          11, pct(topPx + 22), 28, pct(148),
          {
            preserveAspectRatio: false,
            frameEnabled: true,
            objectFit: 'cover',
            objectPositionX: 50,
            objectPositionY: 50,
            imageMask: 'none',
            borderRadius: 11,
            borderColor: '#ebd197',
            borderWidth: 1.5,
            borderStyle: 'solid',
            backgroundColor: '#faf5eb',
            padding: 4,
            boxShadow: '0 8px 18px rgba(0, 0, 0, 0.18)'
          },
          { binding: `${prefix}.image`, url: hotelImg, name: `Foto hotel ${idx + 1}` }
        ),
        makeLayer(
          'image',
          '',
          10.2, pct(topPx + 18), 29.6, pct(156),
          { preserveAspectRatio: true, objectFit: 'contain' },
          {
            binding: `display.lodging.filigree.${idx}`,
            url: `${ASSET_DIR}/venetian-triptych-frame.svg`,
            name: `Moldura veneciana hotel ${idx + 1}`,
            locked: true
          }
        ),
        makeLayer(
          'text',
          '★★★★★ · HOTEL RECOMENDADO',
          43, pct(topPx + 20), 46, pct(20),
          { fontFamily: bodyFont, fontSize: 9, fontWeight: 700, letterSpacing: 2, color: '#8f651e', textAlign: 'left' },
          { binding: `display.lodging.stars.${idx}`, name: `Categoría hotel ${idx + 1}` }
        ),
        makeLayer(
          'text',
          hotel.name || `Grand Hotel ${idx + 1}`,
          43, pct(topPx + 42), 46, pct(38),
          { fontFamily: headingFont, fontSize: 20, fontWeight: 700, color: '#152820', textAlign: 'left' },
          { binding: `${prefix}.name`, name: `Nombre hotel ${idx + 1}` }
        ),
        makeLayer(
          'text',
          hotel.description || 'Estancia de lujo a pocos minutos de la celebración.',
          43, pct(topPx + 82), 46, pct(42),
          { fontFamily: bodyFont, fontSize: 12, fontWeight: 400, color: '#424e48', textAlign: 'left', lineHeight: 1.35 },
          { binding: `${prefix}.description`, name: `Descripción hotel ${idx + 1}` }
        ),
        makeLayer(
          'text',
          hotel.address || 'Avenida Principal · Zona Hotelera',
          43, pct(topPx + 126), 46, pct(32),
          { fontFamily: bodyFont, fontSize: 11, fontWeight: 600, color: '#7c5b24', textAlign: 'left' },
          { binding: `${prefix}.address`, name: `Dirección hotel ${idx + 1}` }
        ),
        makeLayer(
          'text',
          hotel.priceLabel || 'Tarifa preferencial disponible',
          11, pct(topPx + 186), 25, pct(30),
          { fontFamily: bodyFont, fontSize: 11, fontWeight: 700, color: '#152820', backgroundColor: '#f6efe2', borderRadius: 8, padding: 6, textAlign: 'center' },
          { binding: `${prefix}.price`, name: `Tarifa hotel ${idx + 1}` }
        ),
        makeLayer(
          'text',
          hotel.agreementLabel || 'Convenio Especial',
          38, pct(topPx + 186), 24, pct(30),
          { fontFamily: bodyFont, fontSize: 11, fontWeight: 700, color: '#8f651e', backgroundColor: '#f6efe2', borderRadius: 8, padding: 6, textAlign: 'center' },
          { binding: `${prefix}.agreement`, name: `Convenio hotel ${idx + 1}` }
        ),
        makeLayer(
          'text',
          [hotel.discountCode, hotel.discountDescription].filter(Boolean).join(' · ') || 'Código: ORANGERIE',
          64, pct(topPx + 186), 25, pct(30),
          { fontFamily: bodyFont, fontSize: 10.5, fontWeight: 700, color: '#152820', backgroundColor: '#ebd197', borderRadius: 8, padding: 6, textAlign: 'center' },
          { binding: `${prefix}.discount`, name: `Código descuento ${idx + 1}` }
        ),
        makeLayer(
          'text',
          (hotel.services || []).join('  ·  ') || 'Desayuno incluido  ·  Valet Parking  ·  Transportación',
          11, pct(topPx + 226), 78, pct(30),
          { fontFamily: bodyFont, fontSize: 11.5, fontWeight: 500, color: '#424e48', textAlign: 'center' },
          { binding: `${prefix}.services`, name: `Servicios hotel ${idx + 1}` }
        ),
        makeLayer(
          'text',
          hotel.notes || 'Reserva mencionando el convenio del evento.',
          11, pct(topPx + 260), 78, pct(28),
          { fontFamily: editorialSerif, fontSize: 14, fontStyle: 'italic', color: '#8f651e', textAlign: 'center' },
          { binding: `${prefix}.notes`, name: `Notas hotel ${idx + 1}` }
        ),
        makeLayer(
          'button',
          'RESERVAR ESTANCIA',
          11, pct(topPx + 306), 30, pct(44),
          {
            backgroundColor: '#152820',
            color: '#f4e2b8',
            fontFamily: bodyFont,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: 1.2,
            borderRadius: 30,
            borderColor: '#d4af63',
            borderWidth: 1.2,
            borderStyle: 'solid'
          },
          { binding: `${prefix}.reserve`, name: `Reservar hotel ${idx + 1}`, url: hotel.url || 'https://maps.google.com' }
        ),
        makeLayer(
          'button',
          'VER MAPA',
          44, pct(topPx + 306), 21, pct(44),
          {
            backgroundColor: '#faf5eb',
            color: '#152820',
            fontFamily: bodyFont,
            fontSize: 10.5,
            fontWeight: 700,
            borderRadius: 30,
            borderColor: '#c89d4c',
            borderWidth: 1.2,
            borderStyle: 'solid'
          },
          { binding: `${prefix}.map`, name: `Mapa hotel ${idx + 1}`, url: hotel.mapUrl || 'https://maps.google.com' }
        ),
        makeLayer(
          'button',
          'LLAMAR',
          68, pct(topPx + 306), 21, pct(44),
          {
            backgroundColor: '#faf5eb',
            color: '#152820',
            fontFamily: bodyFont,
            fontSize: 10.5,
            fontWeight: 700,
            borderRadius: 30,
            borderColor: '#c89d4c',
            borderWidth: 1.2,
            borderStyle: 'solid'
          },
          { binding: `${prefix}.phone`, name: `Teléfono hotel ${idx + 1}`, url: hotel.phone ? `tel:${hotel.phone}` : 'tel:+525500000000' }
        )
      );
    });

    sections.push(lodgSec);
  }

  // =========================================================================
  // 11. GUEST PASS — PASE IMPERIAL DE ACCESO & MESA (700px)
  // =========================================================================
  const passSec = makeSection(
    'guestPass',
    'Tu Pase Real & Mesa',
    '#13221d',
    700,
    `${ASSET_DIR}/cypress-nocturne-bg.svg`
  );
  passSec.pluginSettings = {
    eyebrow: 'CAPÍTULO X · ACCESO PERSONALIZADO',
    introText: 'Presenta este pase digital en la recepción para conocer tu mesa asignada.',
    identifyButtonText: 'REVELAR MI PASE PERSONAL',
    showGuestName: true,
    showGroup: true,
    showTable: true,
    showSeat: true,
    showCompanions: true,
    showQr: true,
    nativeFieldPartsSeparated: true
  };
  passSec.layers.push(
    makeLayer(
      'text',
      'CAPÍTULO X · ACCESO PERSONALIZADO',
      12, 9.5, 76, 4,
      { fontFamily: bodyFont, fontSize: 10.5, fontWeight: 700, letterSpacing: 3, color: '#ebd197', textAlign: 'center' },
      { binding: 'display.guestPass.eyebrow', name: 'Eyebrow pase' }
    ),
    makeLayer(
      'text',
      'Tu Pase Real & Mesa',
      8, 14.5, 84, 7.2,
      { fontFamily: headingFont, fontSize: 28, fontWeight: 700, color: '#faf6ed', textAlign: 'center', letterSpacing: 1.2 },
      { binding: 'display.guestPass.title', name: 'Título pase' }
    ),
    makeLayer(
      'text',
      'Presenta este pase digital en la recepción para conocer tu mesa asignada.',
      12, 22.5, 76, 5.5,
      { fontFamily: editorialSerif, fontSize: 17, fontWeight: 500, color: '#d9ceb8', textAlign: 'center' },
      { binding: 'display.guestPass.intro', name: 'Intro pase' }
    ),
    makeLayer(
      'shape',
      '',
      7, 30, 86, 60,
      {
        backgroundColor: '#faf5eb',
        borderColor: '#d4af63',
        borderWidth: 2,
        borderStyle: 'solid',
        borderRadius: 22,
        boxShadow: '0 22px 48px rgba(0, 0, 0, 0.5)'
      },
      { binding: 'pass.card', name: 'Boleto de gala L’Orangerie' }
    ),
    makeLayer(
      'image',
      '',
      8, 31.5, 84, 57,
      { objectFit: 'contain' },
      { binding: 'display.guestPass.crest', url: `${ASSET_DIR}/vip-boarding-crest.svg`, name: 'Filigrana de boleto real' }
    ),
    makeLayer(
      'field',
      'Código QR',
      12, 37, 28, 35,
      {
        backgroundColor: '#ffffff',
        borderColor: '#c89d4c',
        borderWidth: 1.5,
        borderStyle: 'solid',
        borderRadius: 14,
        padding: 8,
        textAlign: 'center',
        boxShadow: '0 8px 20px rgba(21, 40, 32, 0.12)'
      },
      { binding: 'pass.qr', name: 'Código QR de acceso' }
    ),
    makeLayer(
      'text',
      'Invitado de Honor',
      45, 36.5, 42, 7,
      { fontFamily: headingFont, fontSize: 20, fontWeight: 700, color: '#152820', textAlign: 'left' },
      { binding: 'pass.name', name: 'Nombre del invitado' }
    ),
    makeLayer(
      'text',
      'FAMILIA & AMIGOS DE HONOR',
      45, 44.5, 42, 4.2,
      { fontFamily: bodyFont, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: '#8f651e', textAlign: 'left' },
      { binding: 'pass.group', name: 'Grupo del invitado' }
    ),
    makeLayer(
      'text',
      'Mesa Imperial 05',
      45, 50, 42, 6.5,
      { fontFamily: headingFont, fontSize: 17.5, fontWeight: 700, color: '#152820', textAlign: 'left' },
      { binding: 'pass.table', name: 'Mesa asignada' }
    ),
    makeLayer(
      'text',
      'Lugar A-12',
      45, 57.5, 42, 4.8,
      { fontFamily: bodyFont, fontSize: 11.5, fontWeight: 600, color: '#424e48', textAlign: 'left' },
      { binding: 'pass.seat', name: 'Asiento asignado' }
    ),
    makeLayer(
      'text',
      '2 pases reservados',
      45, 63, 42, 4.8,
      { fontFamily: bodyFont, fontSize: 11.5, fontWeight: 700, color: '#8f651e', textAlign: 'left' },
      { binding: 'pass.companions', name: 'Acompañantes permitidos' }
    ),
    makeLayer(
      'text',
      'Estado de verificación del pase',
      14, 78, 72, 4.8,
      { fontFamily: bodyFont, fontSize: 11, fontWeight: 600, color: '#9d2626', textAlign: 'center' },
      { binding: 'pass.feedback', name: 'Mensaje de validación' }
    )
  );
  makeSeparatedFieldWithLabel(passSec.layers, 'pass.email', 'Correo electrónico registrado', 'invitado@ejemplo.com', 14, 36, 72, 13.5, false);
  makeSeparatedFieldWithLabel(passSec.layers, 'pass.phone', 'Teléfono móvil registrado', 'Número a 10 dígitos', 14, 51.5, 72, 13.5, false);
  passSec.layers.push(
    makeLayer(
      'button',
      'REVELAR MI PASE PERSONAL',
      20, 68, 60, 8,
      {
        backgroundColor: '#152820',
        color: '#f4e2b8',
        fontFamily: bodyFont,
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: 1.5,
        borderRadius: 30,
        borderColor: '#d4af63',
        borderWidth: 1.5,
        borderStyle: 'solid',
        boxShadow: '0 10px 24px rgba(21, 40, 32, 0.25)'
      },
      { binding: 'pass.identify', name: 'Botón ver pase' }
    )
  );
  sections.push(passSec);

  // =========================================================================
  // 12. RSVP — CONFIRMACIÓN DE ASISTENCIA (920px)
  // =========================================================================
  if (settings.rsvp !== false) {
    const rsvpSec = makeSection(
      'rsvp',
      'Confirma tu Asistencia',
      '#f8f3e8',
      920,
      `${ASSET_DIR}/fresco-parchment-bg.svg`
    );
    rsvpSec.pluginSettings = {
      eyebrow: 'CAPÍTULO XI · RÉPONDEZ S’IL VOUS PLAÎT',
      introText: 'Por favor confírmanos tu asistencia para preparar cada detalle en tu honor.',
      primaryButtonText: 'CONFIRMAR MI ASISTENCIA',
      identifyButtonText: 'Continuar',
      showDietary: true,
      showMessage: true,
      nativeFieldPartsSeparated: true
    };
    const rsvpPartBase = (x: number, y: number, width: number, height: number, extras: Partial<VisualPluginPartDesign> = {}): VisualPluginPartDesign => ({
      x, y, width, height,
      fontFamily: bodyFont,
      fontSize: 13.5,
      fontWeight: 500,
      color: '#152820',
      backgroundColor: '#fdfbf6',
      borderColor: '#c89d4c',
      borderWidth: 1.2,
      borderRadius: 12,
      padding: 10,
      textAlign: 'left',
      shape: 'rectangle',
      ...extras
    });
    rsvpSec.pluginDesign = {
      layout: 'free',
      minHeight: 740,
      parts: {
        eyebrow: rsvpPartBase(12, 5.2, 76, 4, { fontSize: 10.5, fontWeight: 700, textAlign: 'center', backgroundColor: 'transparent', borderWidth: 0, color: '#8f651e' }),
        title: rsvpPartBase(8, 10, 84, 7.2, { fontFamily: headingFont, fontSize: 28, fontWeight: 700, textAlign: 'center', backgroundColor: 'transparent', borderWidth: 0, color: '#152820' }),
        intro: rsvpPartBase(12, 17.8, 76, 5, { fontFamily: editorialSerif, fontSize: 17, textAlign: 'center', backgroundColor: 'transparent', borderWidth: 0, color: '#3b4741' }),
        name: rsvpPartBase(11, 29, 37, 12.5),
        contact: rsvpPartBase(52, 29, 37, 12.5),
        response: rsvpPartBase(11, 43.5, 53, 12.5, { variant: 'cards' }),
        companions: rsvpPartBase(66, 43.5, 23, 12.5),
        dietary: rsvpPartBase(11, 58.5, 37, 14),
        message: rsvpPartBase(52, 58.5, 37, 14),
        submit: rsvpPartBase(20, 76, 60, 7.5, { textAlign: 'center', fontWeight: 700, backgroundColor: '#152820', color: '#f4e2b8', borderColor: '#d4af63', borderWidth: 1.5, borderRadius: 30 }),
        feedback: rsvpPartBase(15, 85.5, 70, 4.5, { textAlign: 'center', backgroundColor: 'transparent', borderWidth: 0, fontSize: 12, color: '#152820' })
      }
    };

    rsvpSec.layers.push(
      makeLayer(
        'text',
        'CAPÍTULO XI · RÉPONDEZ S’IL VOUS PLAÎT',
        12, 5.2, 76, 4,
        { fontFamily: bodyFont, fontSize: 10.5, fontWeight: 700, letterSpacing: 3, color: '#8f651e', textAlign: 'center' },
        { binding: 'display.rsvp.eyebrow', name: 'Eyebrow RSVP' }
      ),
      makeLayer(
        'text',
        'Confirma tu Asistencia',
        8, 10, 84, 7.2,
        { fontFamily: headingFont, fontSize: 28, fontWeight: 700, color: '#152820', textAlign: 'center', letterSpacing: 1.2 },
        { binding: 'display.rsvp.title', name: 'Título RSVP' }
      ),
      makeLayer(
        'text',
        'Por favor confírmanos tu asistencia para preparar cada detalle en tu honor.',
        12, 17.8, 76, 5,
        { fontFamily: editorialSerif, fontSize: 17, fontWeight: 500, color: '#3b4741', textAlign: 'center' },
        { binding: 'display.rsvp.intro', name: 'Intro RSVP' }
      ),
      makeLayer(
        'shape',
        '',
        6, 24.5, 88, 68,
        {
          backgroundColor: '#ffffff',
          borderColor: '#c89d4c',
          borderWidth: 1.8,
          borderStyle: 'solid',
          borderRadius: 24,
          boxShadow: '0 24px 56px rgba(21, 40, 32, 0.14)'
        },
        { binding: 'display.rsvp.card', name: 'Pliego de confirmación L’Orangerie' }
      ),
      makeLayer(
        'image',
        '',
        44, 20.8, 12, 7.5,
        { objectFit: 'contain' },
        { binding: 'display.rsvp.seal', url: `${ASSET_DIR}/wax-seal-monogram.svg`, name: 'Sello de lacre RSVP' }
      )
    );

    makeSeparatedFieldWithLabel(rsvpSec.layers, 'rsvp.name', 'Nombre completo del invitado', 'Tu nombre y apellido', 11, 29, 37, 12.5, false);
    makeSeparatedFieldWithLabel(rsvpSec.layers, 'rsvp.email', 'Correo electrónico o teléfono', 'contacto@ejemplo.com', 52, 29, 37, 12.5, false);
    makeSeparatedFieldWithLabel(
      rsvpSec.layers,
      'rsvp.response',
      '¿Nos acompañarás en la celebración?',
      'Selecciona tu respuesta',
      11, 43.5, 53, 12.5,
      false,
      { controlVariant: 'cards', textAlign: 'center', fontWeight: 700, fontSize: 11, padding: 6 }
    );
    makeSeparatedFieldWithLabel(rsvpSec.layers, 'rsvp.companions', 'Acompañantes', '0', 66, 43.5, 23, 12.5, false);
    makeSeparatedFieldWithLabel(rsvpSec.layers, 'rsvp.dietaryRestrictions', 'Alergias o menú especial', 'Vegetariano, sin gluten...', 11, 58.5, 37, 14, false);
    makeSeparatedFieldWithLabel(rsvpSec.layers, 'rsvp.message', 'Mensaje para los anfitriones', 'Escribe tus buenos deseos...', 52, 58.5, 37, 14, false);

    rsvpSec.layers.push(
      makeLayer(
        'button',
        'CONFIRMAR MI ASISTENCIA',
        20, 76, 60, 7.5,
        {
          backgroundColor: '#152820',
          color: '#f4e2b8',
          fontFamily: bodyFont,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 1.8,
          borderRadius: 30,
          borderColor: '#d4af63',
          borderWidth: 1.5,
          borderStyle: 'solid',
          boxShadow: '0 12px 28px rgba(21, 40, 32, 0.28)'
        },
        { binding: 'rsvp.submit', name: 'Enviar confirmación' }
      ),
      makeLayer(
        'text',
        'Aquí aparecerá la confirmación de tu registro',
        14, 85, 72, 4.5,
        { fontFamily: bodyFont, fontSize: 11.5, fontWeight: 600, color: '#152820', textAlign: 'center' },
        { binding: 'rsvp.feedback', name: 'Mensaje de confirmación' }
      )
    );
    sections.push(rsvpSec);
  }

  // =========================================================================
  // 13. ALBUM — EL LENTE COLECTIVO (680px)
  // =========================================================================
  if (settings.guestAlbum !== false) {
    const albumSec = makeSection(
      'album',
      'Álbum Colectivo en Vivo',
      '#152620',
      680,
      `${ASSET_DIR}/cypress-nocturne-bg.svg`
    );
    albumSec.pluginSettings = {
      eyebrow: 'CAPÍTULO XII · MIRADAS COMPARTIDAS',
      introText: 'Captura la magia desde tu perspectiva y súbela en tiempo real a nuestra galería.',
      primaryButtonText: 'SUBIR FOTOGRAFÍA AL ÁLBUM',
      showGallery: true
    };
    albumSec.layers.push(
      makeLayer(
        'text',
        'CAPÍTULO XII · MIRADAS COMPARTIDAS',
        12, 5, 76, 4.5,
        { fontFamily: bodyFont, fontSize: 10.5, fontWeight: 700, letterSpacing: 3, color: '#ebd197', textAlign: 'center' },
        { binding: 'display.album.eyebrow', name: 'Eyebrow álbum' }
      ),
      makeLayer(
        'text',
        'Álbum Colectivo en Vivo',
        8, 10.5, 84, 8,
        { fontFamily: headingFont, fontSize: 28, fontWeight: 700, color: '#faf6ed', textAlign: 'center', letterSpacing: 1.2 },
        { binding: 'display.album.title', name: 'Título álbum' }
      ),
      makeLayer(
        'text',
        'Captura la magia desde tu perspectiva y súbela en tiempo real a nuestra galería.',
        12, 19.5, 76, 6,
        { fontFamily: editorialSerif, fontSize: 17, fontWeight: 500, color: '#d9ceb8', textAlign: 'center' },
        { binding: 'display.album.intro', name: 'Intro álbum' }
      ),
      makeLayer(
        'shape',
        '',
        7, 28, 86, 62,
        {
          backgroundColor: '#f9f4ea',
          borderColor: '#d4af63',
          borderWidth: 1.8,
          borderStyle: 'solid',
          borderRadius: 22,
          boxShadow: '0 22px 48px rgba(0, 0, 0, 0.46)'
        },
        { binding: 'album.card', name: 'Tarjeta de cámara colectiva' }
      ),
      makeLayer(
        'text',
        '',
        45, 31, 10, 7,
        { color: '#8f651e', iconName: 'camera', iconStrokeWidth: 1.8 },
        { binding: 'display.album.icon', name: 'Icono cámara' }
      ),
      makeLayer(
        'button',
        'SUBIR FOTOGRAFÍA AL ÁLBUM',
        18, 40, 64, 9,
        {
          backgroundColor: '#152820',
          color: '#f4e2b8',
          fontFamily: bodyFont,
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: 1.6,
          borderRadius: 30,
          borderColor: '#d4af63',
          borderWidth: 1.5,
          borderStyle: 'solid',
          boxShadow: '0 10px 24px rgba(21, 40, 32, 0.25)'
        },
        { binding: 'album.upload', name: 'Subir fotografía' }
      ),
      makeLayer(
        'text',
        'Aquí aparecerá el estado de tu fotografía subida',
        14, 51, 72, 5,
        { fontFamily: bodyFont, fontSize: 11.5, fontWeight: 600, color: '#8f651e', textAlign: 'center' },
        { binding: 'album.feedback', name: 'Estado de subida' }
      ),
      makeLayer(
        'field',
        'Fotografías aprobadas del evento',
        11, 58, 78, 28,
        {
          backgroundColor: '#ffffff',
          borderColor: '#e2d2b5',
          borderWidth: 1,
          borderStyle: 'solid',
          borderRadius: 14,
          padding: 10,
          color: '#424e48'
        },
        { binding: 'album.gallery', name: 'Muro de fotografías del álbum' }
      )
    );
    sections.push(albumSec);
  }

  // =========================================================================
  // 14. SONGS — SOIRÉE MUSICALE & DJ (720px)
  // =========================================================================
  if (settings.songRequests !== false) {
    const songSec = makeSection(
      'songs',
      'Soirée Musicale · Peticiones al DJ',
      '#141210',
      720,
      `${ASSET_DIR}/cypress-nocturne-bg.svg`,
      0.32
    );
    songSec.pluginSettings = {
      eyebrow: 'CAPÍTULO XIII · CURADURÍA MUSICAL',
      introText: '¿Qué pieza musical no puede faltar para hacerte bailar bajo las estrellas?',
      primaryButtonText: 'ENVIAR CANCIÓN AL DJ',
      songLabel: 'Título de la canción',
      showSourceUrl: true,
      showArtist: true,
      showDedication: true,
      nativeFieldPartsSeparated: true
    };
    songSec.layers.push(
      makeLayer(
        'image',
        '',
        42, 3.5, 16, 12.5,
        { objectFit: 'contain' },
        {
          binding: 'display.songs.vinyl',
          url: `${ASSET_DIR}/vintage-vinyl-gramophone.svg`,
          name: 'Vinilo de oro Soirée',
          animation: { type: 'pulse', duration: 3.5, delay: 0, repeat: true }
        }
      ),
      makeLayer(
        'text',
        'CAPÍTULO XIII · CURADURÍA MUSICAL',
        12, 17, 76, 4,
        { fontFamily: bodyFont, fontSize: 10.5, fontWeight: 700, letterSpacing: 3, color: '#ebd197', textAlign: 'center' },
        { binding: 'display.songs.eyebrow', name: 'Eyebrow música' }
      ),
      makeLayer(
        'text',
        'Soirée Musicale & DJ',
        8, 22, 84, 7.5,
        { fontFamily: headingFont, fontSize: 28, fontWeight: 700, color: '#faf6ed', textAlign: 'center', letterSpacing: 1.2 },
        { binding: 'display.songs.title', name: 'Título música' }
      ),
      makeLayer(
        'text',
        '¿Qué pieza musical no puede faltar para hacerte bailar bajo las estrellas?',
        12, 30, 76, 5.5,
        { fontFamily: editorialSerif, fontSize: 17, fontWeight: 500, color: '#d9ceb8', textAlign: 'center' },
        { binding: 'display.songs.intro', name: 'Intro música' }
      ),
      makeLayer(
        'shape',
        '',
        7, 37.5, 86, 55,
        {
          backgroundColor: 'rgba(21, 40, 32, 0.92)',
          borderColor: '#d4af63',
          borderWidth: 1.6,
          borderStyle: 'solid',
          borderRadius: 22,
          backdropFilter: 'blur(12px)',
          boxShadow: '0 22px 48px rgba(0, 0, 0, 0.55)'
        },
        { binding: 'song.card', name: 'Consola musical del Palazzo' }
      )
    );

    makeSeparatedFieldWithLabel(songSec.layers, 'song.title', 'Nombre de la canción', 'Ej. Volare / September...', 11, 41.5, 37, 13, true);
    makeSeparatedFieldWithLabel(songSec.layers, 'song.sourceUrl', 'Enlace Spotify o YouTube', 'https://open.spotify.com/...', 52, 41.5, 37, 13, true);
    makeSeparatedFieldWithLabel(songSec.layers, 'song.artist', 'Artista o intérprete', 'Nombre del artista', 11, 56.5, 37, 13, true);
    makeSeparatedFieldWithLabel(songSec.layers, 'song.dedication', '¿Por qué debe sonar?', 'Para abrir la pista...', 52, 56.5, 37, 13, true);

    songSec.layers.push(
      makeLayer(
        'button',
        'ENVIAR CANCIÓN AL DJ',
        22, 73.5, 56, 8,
        {
          backgroundColor: '#d4af63',
          color: '#13221d',
          fontFamily: bodyFont,
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: 1.5,
          borderRadius: 30,
          borderColor: '#f4e2b8',
          borderWidth: 1.2,
          borderStyle: 'solid',
          boxShadow: '0 10px 24px rgba(212, 175, 99, 0.35)'
        },
        { binding: 'song.submit', name: 'Enviar al DJ' }
      ),
      makeLayer(
        'text',
        'Aquí aparecerá la confirmación de tu sugerencia musical',
        14, 83.5, 72, 4.5,
        { fontFamily: bodyFont, fontSize: 11, fontWeight: 600, color: '#ebd197', textAlign: 'center' },
        { binding: 'song.feedback', name: 'Estado de canción' }
      )
    );
    sections.push(songSec);
  }

  // =========================================================================
  // 15. DEDICATIONS — EL LIBRO DE HONOR (780px)
  // =========================================================================
  if (settings.dedications !== false) {
    const dedSec = makeSection(
      'dedications',
      'Palabras para la Posteridad',
      '#f5efe2',
      780,
      `${ASSET_DIR}/fresco-parchment-bg.svg`
    );
    dedSec.pluginSettings = {
      eyebrow: 'CAPÍTULO XIV · EL LIBRO DE HONOR',
      introText: 'Déjanos un deseo, un consejo o un recuerdo que podamos leer en los años venideros.',
      primaryButtonText: 'FIRMAR EL LIBRO DE HONOR',
      publicNameLabel: 'Tu nombre o familia',
      messageLabel: 'Tu dedicatoria',
      showWall: true,
      nativeFieldPartsSeparated: true
    };
    dedSec.layers.push(
      makeLayer(
        'text',
        'CAPÍTULO XIV · EL LIBRO DE HONOR',
        12, 4.5, 76, 4,
        { fontFamily: bodyFont, fontSize: 10.5, fontWeight: 700, letterSpacing: 3, color: '#8f651e', textAlign: 'center' },
        { binding: 'display.dedications.eyebrow', name: 'Eyebrow dedicatorias' }
      ),
      makeLayer(
        'text',
        'Palabras para la Posteridad',
        8, 9.5, 84, 7.5,
        { fontFamily: headingFont, fontSize: 27, fontWeight: 700, color: '#152820', textAlign: 'center', letterSpacing: 1.2 },
        { binding: 'display.dedications.title', name: 'Título dedicatorias' }
      ),
      makeLayer(
        'text',
        'Déjanos un deseo, un consejo o un recuerdo que podamos leer en los años venideros.',
        12, 17.5, 76, 5.5,
        { fontFamily: editorialSerif, fontSize: 17, fontWeight: 500, color: '#3b4741', textAlign: 'center' },
        { binding: 'display.dedications.intro', name: 'Intro dedicatorias' }
      ),
      makeLayer(
        'shape',
        '',
        7, 25, 86, 44,
        {
          backgroundColor: '#ffffff',
          borderColor: '#c89d4c',
          borderWidth: 1.5,
          borderStyle: 'solid',
          borderRadius: 22,
          boxShadow: '0 18px 42px rgba(21, 40, 32, 0.1)'
        },
        { binding: 'dedication.card', name: 'Libro de honor' }
      )
    );

    makeSeparatedFieldWithLabel(dedSec.layers, 'dedication.publicName', 'Tu nombre o familia', 'Ej. Familia Montenegro', 11, 28.5, 34, 14, false);
    makeSeparatedFieldWithLabel(dedSec.layers, 'dedication.message', 'Tu mensaje o dedicatoria', 'Escribe aquí tus palabras de afecto...', 48, 28.5, 41, 22, false);

    dedSec.layers.push(
      makeLayer(
        'button',
        'FIRMAR EL LIBRO DE HONOR',
        22, 53.5, 56, 7.5,
        {
          backgroundColor: '#152820',
          color: '#f4e2b8',
          fontFamily: bodyFont,
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: 1.5,
          borderRadius: 30,
          borderColor: '#d4af63',
          borderWidth: 1.5,
          borderStyle: 'solid',
          boxShadow: '0 10px 24px rgba(21, 40, 32, 0.24)'
        },
        { binding: 'dedication.submit', name: 'Enviar dedicatoria' }
      ),
      makeLayer(
        'text',
        'Aquí aparecerá el estado de tu dedicatoria',
        16, 62.5, 68, 4.5,
        { fontFamily: bodyFont, fontSize: 11, fontWeight: 600, color: '#8f651e', textAlign: 'center' },
        { binding: 'dedication.feedback', name: 'Estado dedicatoria' }
      ),
      makeLayer(
        'field',
        'Dedicatorias aprobadas del Libro de Honor',
        7, 72, 86, 22,
        {
          backgroundColor: 'rgba(255, 255, 255, 0.78)',
          borderColor: '#d4af63',
          borderWidth: 1,
          borderStyle: 'solid',
          borderRadius: 16,
          padding: 12,
          color: '#152820'
        },
        { binding: 'dedication.wall', name: 'Muro de dedicatorias' }
      )
    );
    sections.push(dedSec);
  }

  // =========================================================================
  // 16. GUEST ACTIVITY — CONCIERGE PERSONAL & COLOFÓN (660px)
  // =========================================================================
  const actSec = makeSection(
    'guestActivity',
    'Concierge Personal · Mi Actividad',
    '#13221d',
    720,
    `${ASSET_DIR}/cypress-nocturne-bg.svg`
  );
  actSec.pluginSettings = {
    eyebrow: 'CAPÍTULO XV · CONCIERGE DEL INVITADO',
    introText: 'Consulta en un solo lugar tu confirmación, mesa, fotografías y canciones enviadas.',
    identifyButtonText: 'CONSULTAR MI ACTIVIDAD',
    primaryButtonText: 'ABRIR CENTRO COMPLETO',
    showRsvp: true,
    showPass: true,
    showAlbum: true,
    showSongs: true,
    showDedications: true,
    nativeFieldPartsSeparated: true
  };
  actSec.layers.push(
    makeLayer(
      'text',
      'CAPÍTULO XV · CONCIERGE DEL INVITADO',
      12, 9.5, 76, 4,
      { fontFamily: bodyFont, fontSize: 10.5, fontWeight: 700, letterSpacing: 3, color: '#ebd197', textAlign: 'center' },
      { binding: 'display.guestActivity.eyebrow', name: 'Eyebrow actividad' }
    ),
    makeLayer(
      'text',
      'Mi Pase & Actividad',
      8, 14.2, 84, 7,
      { fontFamily: headingFont, fontSize: 28, fontWeight: 700, color: '#faf6ed', textAlign: 'center', letterSpacing: 1.2 },
      { binding: 'display.guestActivity.title', name: 'Título actividad' }
    ),
    makeLayer(
      'text',
      'Consulta en un solo lugar tu confirmación, mesa, fotografías y canciones enviadas.',
      12, 22, 76, 5.2,
      { fontFamily: editorialSerif, fontSize: 17, fontWeight: 500, color: '#d9ceb8', textAlign: 'center' },
      { binding: 'display.guestActivity.intro', name: 'Intro actividad' }
    ),
    makeLayer(
      'text',
      'Bienvenido, Invitado de Honor',
      10, 28.5, 80, 4.8,
      { fontFamily: headingFont, fontSize: 17, fontWeight: 700, color: '#ebd197', textAlign: 'center' },
      { binding: 'activity.greeting', name: 'Saludo al invitado' }
    ),
    makeLayer(
      'field',
      'Estado RSVP',
      8, 34.5, 40, 14.5,
      {
        backgroundColor: '#f9f4ea',
        borderColor: '#d4af63',
        borderWidth: 1.5,
        borderStyle: 'solid',
        borderRadius: 16,
        color: '#152820',
        fontWeight: 700,
        textAlign: 'center',
        padding: 10
      },
      { binding: 'activity.rsvp', name: 'Resumen RSVP' }
    ),
    makeLayer(
      'field',
      'Mesa y Pase',
      52, 34.5, 40, 14.5,
      {
        backgroundColor: '#f9f4ea',
        borderColor: '#d4af63',
        borderWidth: 1.5,
        borderStyle: 'solid',
        borderRadius: 16,
        color: '#152820',
        fontWeight: 700,
        textAlign: 'center',
        padding: 10
      },
      { binding: 'activity.pass', name: 'Resumen Pase' }
    ),
    makeLayer(
      'field',
      'Fotografías',
      7.5, 51, 27, 13.5,
      {
        backgroundColor: 'rgba(26, 49, 40, 0.92)',
        borderColor: '#d4af63',
        borderWidth: 1.2,
        borderStyle: 'solid',
        borderRadius: 14,
        color: '#faf6ed',
        fontSize: 11.5,
        textAlign: 'center',
        padding: 6
      },
      { binding: 'activity.album', name: 'Contador Fotos' }
    ),
    makeLayer(
      'field',
      'Canciones',
      36.5, 51, 27, 13.5,
      {
        backgroundColor: 'rgba(26, 49, 40, 0.92)',
        borderColor: '#d4af63',
        borderWidth: 1.2,
        borderStyle: 'solid',
        borderRadius: 14,
        color: '#faf6ed',
        fontSize: 11.5,
        textAlign: 'center',
        padding: 6
      },
      { binding: 'activity.songs', name: 'Contador Canciones' }
    ),
    makeLayer(
      'field',
      'Dedicatorias',
      65.5, 51, 27, 13.5,
      {
        backgroundColor: 'rgba(26, 49, 40, 0.92)',
        borderColor: '#d4af63',
        borderWidth: 1.2,
        borderStyle: 'solid',
        borderRadius: 14,
        color: '#faf6ed',
        fontSize: 11.5,
        textAlign: 'center',
        padding: 6
      },
      { binding: 'activity.dedications', name: 'Contador Dedicatorias' }
    ),
    makeLayer(
      'button',
      'ADMINISTRAR AQUÍ',
      10, 67.5, 38, 7.5,
      {
        backgroundColor: 'rgba(255, 252, 245, 0.1)',
        color: '#faf6ed',
        fontFamily: bodyFont,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: 1.2,
        borderRadius: 30,
        borderColor: '#d4af63',
        borderWidth: 1.2,
        borderStyle: 'solid'
      },
      { binding: 'activity.manage', name: 'Administrar actividad' }
    ),
    makeLayer(
      'button',
      'VER TODA MI ACTIVIDAD',
      52, 67.5, 38, 7.5,
      {
        backgroundColor: '#d4af63',
        color: '#13221d',
        fontFamily: bodyFont,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: 1.2,
        borderRadius: 30,
        borderColor: '#f4e2b8',
        borderWidth: 1.2,
        borderStyle: 'solid'
      },
      { binding: 'activity.full', name: 'Abrir centro completo' }
    )
  );
  makeSeparatedFieldWithLabel(actSec.layers, 'activity.email', 'Correo electrónico registrado', 'invitado@ejemplo.com', 14, 32, 72, 13, true);
  makeSeparatedFieldWithLabel(actSec.layers, 'activity.phone', 'Teléfono móvil registrado', 'Número a 10 dígitos', 14, 47, 72, 13, true);
  actSec.layers.push(
    makeLayer(
      'button',
      'CONSULTAR MI ACTIVIDAD',
      20, 63, 60, 8,
      {
        backgroundColor: '#d4af63',
        color: '#13221d',
        fontFamily: bodyFont,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 1.5,
        borderRadius: 30,
        borderColor: '#f4e2b8',
        borderWidth: 1.2,
        borderStyle: 'solid'
      },
      { binding: 'activity.identify', name: 'Identificar actividad' }
    ),
    makeLayer(
      'image',
      '',
      24, 80, 52, 5.5,
      { objectFit: 'contain' },
      { binding: 'display.guestActivity.divider', url: `${ASSET_DIR}/botanical-crest-divider.svg`, name: 'Divisor colofón' }
    ),
    makeLayer(
      'text',
      'GRAZIE MILLE · NOS VEMOS EN LA CELEBRACIÓN',
      10, 87.5, 80, 4.5,
      { fontFamily: headingFont, fontSize: 11.5, fontWeight: 700, letterSpacing: 3, color: '#ebd197', textAlign: 'center' },
      { binding: 'display.guestActivity.colophon', name: 'Colofón imperial' }
    )
  );
  sections.push(actSec);

  sections.forEach((sec) => {
    sec.pluginSettings = {
      ...(sec.pluginSettings || {}),
      palazzoLayoutVersion: 3
    };
  });

  return {
    version: 1,
    active: true,
    mode: 'easy',
    presentationMode: 'continuous',
    responsiveMode: 'shared',
    theme: { ...PALAZZO_ORANGERIE_THEME },
    accessScreen: {
      backgroundType: 'image',
      backgroundColor: '#13221d',
      backgroundImageUrl: `${ASSET_DIR}/cypress-nocturne-bg.svg`,
      backgroundOverlayOpacity: 0.25,
      cardStyle: 'glass',
      cardBgColor: '#162821',
      cardRadius: 24,
      accentColor: '#d4af63',
      textColor: '#faf6ed',
      buttonBgColor: '#d4af63',
      buttonTextColor: '#13221d',
      buttonRadius: 30,
      headingFont,
      bodyFont,
      showBadge: true,
      badgeText: 'VILLA L’ORANGERIE · ATELIER',
      showIcon: true,
      iconName: 'sparkles',
      logoUrl: `${ASSET_DIR}/wax-seal-monogram.svg`,
      title: 'Invitación Personal de Gala',
      subtitle: 'Ingresa tu correo o teléfono registrado para abrir tu invitación y pase personal.',
      inputLabel: 'Correo o teléfono registrado',
      inputPlaceholder: 'invitado@ejemplo.com o 55 0000 0000',
      buttonText: 'ABRIR INVITACIÓN'
    },
    sections
  };
}
