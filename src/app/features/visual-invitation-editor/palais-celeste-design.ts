import {
  EventModel,
  InvitationContent,
  InvitationLocation,
  VisualInvitationDesign,
  VisualInvitationLayer,
  VisualInvitationLayerStyle,
  VisualInvitationSection,
  VisualLayerType,
  VisualPluginPartDesign
} from '../../core/models';
import { resolveGiftStoreLogo } from './palazzo-orangerie-design';

const ASSET_DIR = 'assets/templates/palais-celeste';
const FALLBACK_PORTRAIT = 'assets/templates/palais-celeste/preview-cover.jpg';
const FALLBACK_GALLERY_2 = 'assets/templates/palazzo-orangerie/garden-portrait.webp';
const FALLBACK_GALLERY_3 = 'assets/templates/palazzo-orangerie/villa-painting.png';
const FALLBACK_HOTEL = 'assets/templates/palazzo-orangerie/grand-hotel-1.png';

export const PALAIS_CELESTE_THEME: NonNullable<VisualInvitationDesign['theme']> = {
  backgroundColor: '#0b1428',
  textColor: '#faf6ee',
  accentColor: '#d4aa5a',
  headingFont: "'Cinzel', 'Cormorant Garamond', Georgia, serif",
  bodyFont: 'Montserrat, sans-serif',
  buttonBackgroundColor: '#d4aa5a',
  buttonTextColor: '#0b1428',
  buttonStyle: 'solid',
  buttonRadius: 30
};

export function buildPalaisCelesteDesign(
  content: InvitationContent,
  event: EventModel | undefined,
  nextId: (prefix: string) => string,
  includeModules = true
): VisualInvitationDesign {
  let zCounter = 1;
  const resetZ = () => {
    zCounter = 1;
  };

  const headingFont = PALAIS_CELESTE_THEME.headingFont;
  const editorialSerif = "'Cormorant Garamond', 'Playfair Display', Georgia, serif";
  const scriptFont = "'Great Vibes', cursive";
  const bodyFont = PALAIS_CELESTE_THEME.bodyFont;

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
        surface: 'soft',
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
    darkSurface = true,
    extras: Partial<VisualInvitationLayerStyle> = {}
  ) => {
    const labelHeight = Math.min(4.8, Math.max(3.4, height * 0.32));
    const inputY = Math.min(96, y + labelHeight + 0.8);
    const inputHeight = Math.max(4.5, height - labelHeight - 0.8);

    sectionLayers.push(
      makeLayer(
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
          letterSpacing: 0.6,
          color: darkSurface ? '#ebd094' : '#8a6421',
          textAlign: 'left',
          backgroundColor: 'transparent',
          borderWidth: 0,
          padding: 0
        },
        { name: `Etiqueta: ${labelText}`, binding: `display.label.${binding}` }
      ),
      makeLayer(
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
          color: darkSurface ? '#faf6ee' : '#0d1830',
          backgroundColor: darkSurface ? 'rgba(255, 255, 255, 0.07)' : '#ffffff',
          borderColor: darkSurface ? 'rgba(212, 170, 90, 0.55)' : '#c89d4c',
          borderWidth: 1.2,
          borderStyle: 'solid',
          borderRadius: 12,
          padding: 10,
          textAlign: 'left',
          showPlaceholder: true,
          boxShadow: darkSurface
            ? 'inset 0 2px 8px rgba(0, 0, 0, 0.4)'
            : '0 4px 12px rgba(11, 20, 40, 0.06)',
          ...extras
        },
        { name: labelText, binding, placeholder }
      )
    );
  };

  const coverUrl =
    content.coverImageUrl ||
    content.galleryItems?.find((item) => item.url)?.url ||
    content.gallery?.find(Boolean) ||
    FALLBACK_PORTRAIT;

  const secondPhoto =
    content.galleryItems?.[1]?.url ||
    content.gallery?.[1] ||
    FALLBACK_GALLERY_2;

  const titleToken = content.headline ? '{{invitation.headline}}' : '{{event.title}}';
  const settings = content.sectionSettings || {};

  // =========================================================================
  // 1. HERO — CÚPULA ASTRAL & ART-DÉCO (920px)
  // =========================================================================
  const hero = makeSection(
    'hero',
    'Portada · Palais Céleste',
    '#0b1428',
    920,
    `${ASSET_DIR}/astral-midnight-bg.svg`
  );

  hero.layers.push(
    makeLayer(
      'text',
      'ÉDITION ASTRALE · HAUTE COUTURE',
      8, 2.8, 52, 2.8,
      { fontFamily: bodyFont, fontSize: 9.5, fontWeight: 700, letterSpacing: 2.5, color: '#ebd094', textAlign: 'left' },
      { name: 'Cabecera astral izq' }
    ),
    makeLayer(
      'text',
      'PALAIS CÉLESTE',
      62, 2.8, 30, 2.8,
      { fontFamily: bodyFont, fontSize: 9.5, fontWeight: 700, letterSpacing: 2.5, color: '#faf6ee', textAlign: 'right' },
      { name: 'Cabecera astral der' }
    ),
    makeLayer(
      'shape',
      '',
      8, 6.0, 84, 0.2,
      { backgroundColor: '#d4aa5a', shapeKind: 'rectangle' },
      { name: 'Filete superior champagne' }
    ),
    // Art-Deco Arch Portrait Niche
    makeLayer(
      'shape',
      '',
      13, 8.8, 74, 43,
      {
        backgroundColor: '#111f3d',
        borderRadius: 220,
        borderColor: '#d4aa5a',
        borderWidth: 2,
        borderStyle: 'solid',
        boxShadow: '0 26px 60px rgba(0, 0, 0, 0.55), 0 0 28px rgba(212, 170, 90, 0.18)'
      },
      { name: 'Nicho zafiro Art-Déco' }
    ),
    makeLayer(
      'image',
      '',
      15.5, 10.2, 69, 40.2,
      {
        preserveAspectRatio: false,
        frameEnabled: true,
        objectFit: 'cover',
        objectPositionX: 50,
        objectPositionY: 38,
        imageMask: 'arch',
        borderRadius: 200,
        borderColor: '#f3dfa8',
        borderWidth: 1.5,
        borderStyle: 'solid',
        backgroundColor: '#0b1428',
        padding: 4
      },
      { url: coverUrl, name: 'Retrato principal en arco' }
    ),
    makeLayer(
      'image',
      '',
      11.5, 7.6, 77, 45.2,
      { preserveAspectRatio: true, objectFit: 'contain' },
      { url: `${ASSET_DIR}/deco-sunburst-arch.svg`, name: 'Moldura solar Art-Déco', locked: true }
    ),
    makeLayer(
      'image',
      '',
      41, 49.2, 18, 9.2,
      { objectFit: 'contain' },
      { url: `${ASSET_DIR}/celestial-astrolabe-crest.svg`, name: 'Astrolabio nupcial de oro' }
    ),
    makeLayer(
      'text',
      'BAJO UN CIELO DE ESTRELLAS ETERNAS',
      12, 59.2, 76, 3.4,
      { fontFamily: bodyFont, fontSize: 10, fontWeight: 700, letterSpacing: 3, color: '#ebd094', textAlign: 'center' },
      { name: 'Subtítulo superior' }
    ),
    makeLayer(
      'text',
      titleToken,
      6, 63.2, 88, 12.5,
      {
        fontFamily: headingFont,
        fontSize: 38,
        fontWeight: 700,
        letterSpacing: 1.6,
        lineHeight: 1.08,
        color: '#faf6ee',
        textAlign: 'center'
      },
      { name: 'Nombres protagonistas' }
    ),
    makeLayer(
      'image',
      '',
      22, 76.2, 56, 4.2,
      { objectFit: 'contain' },
      { url: `${ASSET_DIR}/constellation-divider.svg`, name: 'Divisor constelación' }
    ),
    makeLayer(
      'text',
      '{{event.date}}',
      12, 81.2, 76, 4.2,
      { fontFamily: bodyFont, fontSize: 12.5, fontWeight: 700, letterSpacing: 2.8, color: '#ebd094', textAlign: 'center' },
      { name: 'Fecha de gala' }
    ),
    makeLayer(
      'button',
      'AGENDAR FECHA',
      54, 87.8, 36, 6.4,
      {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        color: '#faf6ee',
        fontFamily: bodyFont,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: 1.3,
        textAlign: 'center',
        borderRadius: 30,
        borderColor: '#d4aa5a',
        borderWidth: 1.4,
        borderStyle: 'solid'
      },
      { name: 'Agendar en calendario', binding: 'calendar' }
    )
  );

  if (settings.rsvp !== false) {
    hero.layers.push(
      makeLayer(
        'button',
        'CONFIRMAR ASISTENCIA',
        10, 87.8, 41, 6.4,
        {
          backgroundColor: '#d4aa5a',
          color: '#0b1428',
          fontFamily: bodyFont,
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: 1.3,
          textAlign: 'center',
          borderRadius: 30,
          borderColor: '#f6e5b4',
          borderWidth: 1.2,
          borderStyle: 'solid',
          boxShadow: '0 10px 24px rgba(212, 170, 90, 0.35)'
        },
        { name: 'Ir a RSVP', binding: 'section:rsvp' }
      )
    );
  }

  const sections: VisualInvitationSection[] = [hero];
  if (!includeModules) {
    return {
      version: 1,
      active: false,
      mode: 'easy',
      presentationMode: 'continuous',
      responsiveMode: 'shared',
      theme: { ...PALAIS_CELESTE_THEME },
      sections
    };
  }

  // =========================================================================
  // 2. CUSTOM — CARTA DE BIENVENIDA EN NÁCAR (560px)
  // =========================================================================
  const welcome = makeSection(
    'custom',
    'Preludio & Bendición',
    '#f8f4ec',
    560,
    `${ASSET_DIR}/pearl-deco-bg.svg`
  );
  welcome.layers.push(
    makeLayer(
      'shape',
      '',
      7, 10, 86, 80,
      {
        backgroundColor: '#ffffff',
        borderColor: '#c89d4c',
        borderWidth: 1.6,
        borderStyle: 'solid',
        borderRadius: 22,
        boxShadow: '0 22px 50px rgba(11, 20, 40, 0.1)'
      },
      { name: 'Pliego nacarado de bienvenida' }
    ),
    makeLayer(
      'text',
      'CAPÍTULO I · ESCRITO EN EL FIRMAMENTO',
      14, 16, 72, 4.5,
      { fontFamily: bodyFont, fontSize: 10, fontWeight: 700, letterSpacing: 2.8, color: '#9c7125', textAlign: 'center' },
      { name: 'Capítulo I' }
    ),
    makeLayer(
      'text',
      ' Dos almas que se reconocen en la misma luz',
      12, 23, 76, 10,
      { fontFamily: headingFont, fontSize: 21, fontWeight: 700, color: '#0d1830', textAlign: 'center', lineHeight: 1.25 },
      { name: 'Epígrafe astral' }
    ),
    makeLayer(
      'text',
      content.message || content.subheadline
        ? '{{invitation.message}}'
        : 'Cuando dos caminos están destinados a encontrarse, el universo entero conspira para iluminar el instante. Será un honor infinito compartir contigo nuestra noche de gala.',
      13, 35.5, 74, 28,
      {
        fontFamily: editorialSerif,
        fontSize: 18,
        fontWeight: 500,
        lineHeight: 1.5,
        color: '#263248',
        textAlign: 'center'
      },
      { name: 'Mensaje de bienvenida' }
    ),
    makeLayer(
      'image',
      '',
      24, 66, 52, 5.5,
      { objectFit: 'contain' },
      { url: `${ASSET_DIR}/constellation-divider.svg`, name: 'Divisor constelación' }
    ),
    makeLayer(
      'text',
      'Con todo nuestro amor y gratitud',
      16, 74, 68, 10,
      { fontFamily: scriptFont, fontSize: 30, fontWeight: 400, color: '#9c7125', textAlign: 'center' },
      { name: 'Firma caligráfica' }
    )
  );
  sections.push(welcome);

  // =========================================================================
  // 3. COUNTDOWN — RELOJ ASTRONÓMICO (500px)
  // =========================================================================
  const countdownSec = makeSection(
    'countdown',
    'Reloj Astronómico · Cuenta Regresiva',
    '#0b1428',
    500,
    `${ASSET_DIR}/astral-midnight-bg.svg`
  );
  countdownSec.pluginSettings = {
    eyebrow: 'CAPÍTULO II · ALINEACIÓN ASTRAL',
    introText: 'Falta cada vez menos para brindar juntos bajo las estrellas.',
    expiredText: '¡La gran noche ha comenzado!'
  };
  countdownSec.layers.push(
    makeLayer(
      'text',
      'CAPÍTULO II · ALINEACIÓN ASTRAL',
      12, 6, 76, 4.5,
      { fontFamily: bodyFont, fontSize: 10.5, fontWeight: 700, letterSpacing: 3, color: '#ebd094', textAlign: 'center' },
      { binding: 'display.countdown.eyebrow', name: 'Eyebrow cuenta regresiva' }
    ),
    makeLayer(
      'text',
      'La Cuenta Regresiva',
      8, 12, 84, 9,
      { fontFamily: headingFont, fontSize: 28, fontWeight: 700, color: '#faf6ee', textAlign: 'center', letterSpacing: 1.3 },
      { binding: 'display.countdown.title', name: 'Título cuenta regresiva' }
    ),
    makeLayer(
      'text',
      'Falta cada vez menos para brindar juntos bajo las estrellas.',
      12, 22, 76, 6,
      { fontFamily: editorialSerif, fontSize: 17, fontWeight: 500, color: '#cbd5e1', textAlign: 'center' },
      { binding: 'display.countdown.intro', name: 'Intro cuenta regresiva' }
    ),
    makeLayer(
      'shape',
      '',
      5, 32, 90, 49,
      {
        backgroundColor: 'rgba(19, 34, 66, 0.88)',
        borderColor: '#d4aa5a',
        borderWidth: 1.8,
        borderStyle: 'solid',
        borderRadius: 24,
        boxShadow: '0 22px 50px rgba(0, 0, 0, 0.48)'
      },
      { binding: 'display.countdown.plaque', name: 'Placa reloj astronómico' }
    ),
    ...[
      { x: 8, key: 'Days', bind: 'countdown.days', lblBind: 'display.countdown.daysLabel', val: '64', lbl: 'DÍAS' },
      { x: 29.5, key: 'Hours', bind: 'countdown.hours', lblBind: 'display.countdown.hoursLabel', val: '18', lbl: 'HORAS' },
      { x: 51, key: 'Minutes', bind: 'countdown.minutes', lblBind: 'display.countdown.minutesLabel', val: '42', lbl: 'MINUTOS' },
      { x: 72.5, key: 'Seconds', bind: 'countdown.seconds', lblBind: 'display.countdown.secondsLabel', val: '09', lbl: 'SEGUNDOS' }
    ].flatMap((c) => [
      makeLayer(
        'shape',
        '',
        c.x, 36.5, 19.5, 40,
        { backgroundColor: '#faf6ee', borderColor: '#d4aa5a', borderWidth: 1.4, borderStyle: 'solid', borderRadius: 99, boxShadow: '0 8px 20px rgba(0,0,0,0.3)' },
        { binding: `display.countdown.card${c.key}`, name: `Medallón ${c.lbl}` }
      ),
      makeLayer(
        'text',
        c.val,
        c.x, 41, 19.5, 19,
        { fontFamily: headingFont, fontSize: 30, fontWeight: 700, color: '#0b1428', textAlign: 'center' },
        { binding: c.bind, name: c.lbl }
      ),
      makeLayer(
        'text',
        c.lbl,
        c.x, 62, 19.5, 9,
        { fontFamily: bodyFont, fontSize: 9, fontWeight: 700, letterSpacing: 1.8, color: '#9c7125', textAlign: 'center' },
        { binding: c.lblBind, name: `Etiqueta ${c.lbl}` }
      )
    ]),
    makeLayer(
      'text',
      '¡La gran noche ha comenzado!',
      12, 48, 76, 16,
      { fontFamily: scriptFont, fontSize: 34, fontWeight: 400, color: '#ebd094', textAlign: 'center' },
      { binding: 'countdown.expired', name: 'Texto al finalizar' }
    )
  );
  sections.push(countdownSec);

  // =========================================================================
  // 4. STORY — NUESTRA HISTORIA (660px)
  // =========================================================================
  if (settings.story !== false) {
    const storySec = makeSection(
      'story',
      content.storyTitle || 'Nuestra Historia',
      '#f8f4ec',
      660,
      `${ASSET_DIR}/pearl-deco-bg.svg`
    );
    storySec.layers.push(
      makeLayer(
        'text',
        'CAPÍTULO III · NUESTRA CONSTELACIÓN',
        10, 4.5, 80, 4,
        { fontFamily: bodyFont, fontSize: 10, fontWeight: 700, letterSpacing: 3, color: '#9c7125', textAlign: 'center' },
        { name: 'Capítulo III' }
      ),
      makeLayer(
        'text',
        content.storyTitle ? '{{invitation.storyTitle}}' : 'Nuestra Historia',
        8, 9.5, 84, 7.5,
        { fontFamily: headingFont, fontSize: 28, fontWeight: 700, color: '#0d1830', textAlign: 'center', letterSpacing: 1.2 },
        { name: 'Título historia' }
      ),
      makeLayer(
        'image',
        '',
        24, 18.5, 52, 34,
        {
          preserveAspectRatio: false,
          frameEnabled: true,
          objectFit: 'cover',
          imageMask: 'arch',
          borderRadius: 160,
          borderColor: '#c89d4c',
          borderWidth: 2,
          borderStyle: 'solid',
          backgroundColor: '#ffffff',
          padding: 6,
          boxShadow: '0 18px 40px rgba(11, 20, 40, 0.14)'
        },
        { url: secondPhoto, name: 'Fotografía de nuestra historia' }
      ),
      makeLayer(
        'shape',
        '',
        7, 56, 86, 36,
        {
          backgroundColor: '#ffffff',
          borderColor: '#c89d4c',
          borderWidth: 1.5,
          borderStyle: 'solid',
          borderRadius: 20,
          boxShadow: '0 16px 36px rgba(11, 20, 40, 0.08)'
        },
        { name: 'Tarjeta relato' }
      ),
      makeLayer(
        'text',
        '{{invitation.storyBody}}',
        12, 60, 76, 28,
        {
          fontFamily: editorialSerif,
          fontSize: 17.5,
          fontWeight: 500,
          lineHeight: 1.5,
          color: '#1e293b',
          textAlign: 'center'
        },
        { name: 'Relato de la historia' }
      )
    );
    sections.push(storySec);
  }

  // =========================================================================
  // 5. LOCATIONS — COORDENADAS DE GALA (780px+)
  // =========================================================================
  if (settings.locations !== false) {
    const configuredLocations: InvitationLocation[] = content.locations?.length
      ? content.locations
      : [
          {
            type: 'ceremonia',
            name: event?.venue?.name || 'Parroquia de Santa Sofía',
            address: event?.venue?.address || 'Paseo de la Reforma 420 · Ciudad de México',
            notes: 'Recepción de invitados 20 minutos antes.',
            mapUrl: event?.venue?.mapUrl || 'https://maps.google.com'
          },
          {
            type: 'recepcion',
            name: 'Palais Céleste · Gran Salón de Cristal',
            address: 'Av. Presidente Masaryk 510 · Polanco',
            notes: 'Valet parking en puerta principal.',
            mapUrl: 'https://maps.google.com'
          }
        ];

    const isSingle = configuredLocations.length === 1;
    const rows = isSingle ? 1 : Math.max(1, Math.ceil(configuredLocations.length / 2));
    const cardHeightPx = 460;
    const totalHeight = Math.max(760, 210 + rows * (cardHeightPx + 34));
    const pct = (px: number) => Number(((px / totalHeight) * 100).toFixed(2));

    const locSec = makeSection(
      'locations',
      'Coordenadas & Recintos',
      '#0b1428',
      totalHeight,
      `${ASSET_DIR}/astral-midnight-bg.svg`
    );
    locSec.pluginSettings = {
      eyebrow: 'CAPÍTULO IV · COORDENADAS',
      introText: 'Los recintos donde daremos inicio a nuestra celebración.',
      primaryButtonText: 'VER EN MAPS',
      locationLimit: 0
    };
    locSec.layers.push(
      makeLayer(
        'text',
        'CAPÍTULO IV · COORDENADAS',
        12, pct(30), 76, pct(26),
        { fontFamily: bodyFont, fontSize: 10.5, fontWeight: 700, letterSpacing: 3, color: '#ebd094', textAlign: 'center' },
        { binding: 'display.locations.eyebrow', name: 'Eyebrow ubicaciones' }
      ),
      makeLayer(
        'text',
        'Sedes de la Celebración',
        8, pct(62), 84, pct(50),
        { fontFamily: headingFont, fontSize: 28, fontWeight: 700, color: '#faf6ee', textAlign: 'center', letterSpacing: 1.2 },
        { binding: 'display.locations.title', name: 'Título ubicaciones' }
      ),
      makeLayer(
        'text',
        'Los recintos donde daremos inicio a nuestra celebración.',
        12, pct(118), 76, pct(40),
        { fontFamily: editorialSerif, fontSize: 17, fontWeight: 500, color: '#cbd5e1', textAlign: 'center' },
        { binding: 'display.locations.intro', name: 'Intro ubicaciones' }
      )
    );

    configuredLocations.forEach((loc, idx) => {
      const left = isSingle ? 10 : idx % 2 === 0 ? 5 : 51;
      const cardW = isSingle ? 80 : 44;
      const innerLeft = left + 3;
      const innerW = cardW - 6;
      const topPx = 186 + (isSingle ? 0 : Math.floor(idx / 2) * (cardHeightPx + 32));
      const prefix = `location.${idx}`;

      locSec.layers.push(
        makeLayer(
          'shape',
          '',
          left, pct(topPx), cardW, pct(cardHeightPx),
          {
            backgroundColor: '#faf6ee',
            borderColor: '#d4aa5a',
            borderWidth: 1.8,
            borderStyle: 'solid',
            borderRadius: 24,
            boxShadow: '0 20px 44px rgba(0, 0, 0, 0.45)'
          },
          { binding: `${prefix}.card`, name: `Tarjeta sede ${idx + 1}` }
        ),
        makeLayer(
          'text',
          idx === 0 ? 'SEDE I · CEREMONIA' : `SEDE ${idx + 1} · RECEPCIÓN`,
          innerLeft, pct(topPx + 18), innerW, pct(22),
          { fontFamily: bodyFont, fontSize: 9, fontWeight: 700, letterSpacing: 2.2, color: '#9c7125', textAlign: 'center' },
          { binding: `display.locations.badge.${idx}`, name: `Insignia sede ${idx + 1}` }
        ),
        makeLayer(
          'image',
          loc.name || `Sede ${idx + 1}`,
          innerLeft + 2, pct(topPx + 44), innerW - 4, pct(150),
          {
            preserveAspectRatio: false,
            frameEnabled: true,
            objectFit: 'cover',
            borderRadius: 14,
            borderColor: '#d4aa5a',
            borderWidth: 1.5,
            borderStyle: 'solid'
          },
          { binding: `${prefix}.image`, url: loc.imageUrl || FALLBACK_GALLERY_3, name: `Imagen sede ${idx + 1}` }
        ),
        makeLayer(
          'text',
          loc.name || loc.type || `Recinto ${idx + 1}`,
          innerLeft, pct(topPx + 206), innerW, pct(46),
          { fontFamily: headingFont, fontSize: isSingle ? 21 : 17, fontWeight: 700, color: '#0b1428', textAlign: 'center', lineHeight: 1.2 },
          { binding: `${prefix}.name`, name: `Nombre sede ${idx + 1}` }
        ),
        makeLayer(
          'text',
          loc.address || 'Dirección confirmada del evento',
          innerLeft, pct(topPx + 258), innerW, pct(48),
          { fontFamily: bodyFont, fontSize: 11.5, fontWeight: 500, color: '#334155', textAlign: 'center', lineHeight: 1.35 },
          { binding: `${prefix}.address`, name: `Dirección sede ${idx + 1}` }
        ),
        makeLayer(
          'text',
          loc.notes || 'Estacionamiento y recepción disponibles.',
          innerLeft, pct(topPx + 310), innerW, pct(38),
          { fontFamily: editorialSerif, fontSize: 14, fontStyle: 'italic', color: '#9c7125', textAlign: 'center' },
          { binding: `${prefix}.notes`, name: `Notas sede ${idx + 1}` }
        ),
        makeLayer(
          'button',
          'VER EN GOOGLE MAPS',
          innerLeft + 1, pct(topPx + 358), innerW - 2, pct(42),
          {
            backgroundColor: '#0b1428',
            color: '#ebd094',
            fontFamily: bodyFont,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1.3,
            borderRadius: 30,
            borderColor: '#d4aa5a',
            borderWidth: 1.2,
            borderStyle: 'solid'
          },
          { binding: `${prefix}.map`, name: `Mapa sede ${idx + 1}`, url: loc.mapUrl || 'https://maps.google.com' }
        ),
        makeLayer(
          'button',
          'ABRIR WAZE',
          innerLeft + 3, pct(topPx + 408), innerW - 6, pct(36),
          {
            backgroundColor: '#ffffff',
            color: '#0b1428',
            fontFamily: bodyFont,
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: 1.2,
            borderRadius: 30,
            borderColor: '#c89d4c',
            borderWidth: 1.2,
            borderStyle: 'solid'
          },
          { binding: `${prefix}.waze`, name: `Waze sede ${idx + 1}`, url: loc.wazeUrl || 'https://waze.com' }
        )
      );
    });
    sections.push(locSec);
  }

  // =========================================================================
  // 6. ITINERARY — CONSTELACIÓN DE LA VELADA (820px+)
  // =========================================================================
  if (settings.itinerary !== false) {
    const items = content.itinerary?.length
      ? content.itinerary
      : [
          { time: '18:00 HRS', title: 'Ceremonia Solemne', description: 'Votos matrimoniales a la luz de las velas.', icon: '✦', locationLabel: 'Capilla' },
          { time: '19:30 HRS', title: 'Cóctel Astral', description: 'Champagne de bienvenida y ensamble de cuerdas.', icon: '🥂', locationLabel: 'Terraza' },
          { time: '21:00 HRS', title: 'Cena de Gala & Brindis', description: 'Banquete de autor en el Salón de Cristal.', icon: '🍽', locationLabel: 'Salón' },
          { time: '22:30 HRS', title: 'Primer Baile & Fiesta', description: 'Pista iluminada hasta el amanecer.', icon: '✨', locationLabel: 'Pista' }
        ];

    const rowH = 148;
    const totalHeight = Math.max(800, 210 + items.length * rowH);
    const pct = (px: number) => Number(((px / totalHeight) * 100).toFixed(2));

    const itinSec = makeSection(
      'itinerary',
      'Orden de la Velada',
      '#f8f4ec',
      totalHeight,
      `${ASSET_DIR}/pearl-deco-bg.svg`
    );
    itinSec.pluginSettings = {
      eyebrow: 'CAPÍTULO V · PROGRAMA',
      introText: 'Cada instante pensado para brillar junto a ti.',
      showDescription: true
    };
    itinSec.layers.push(
      makeLayer(
        'text',
        'CAPÍTULO V · PROGRAMA',
        12, pct(28), 76, pct(26),
        { fontFamily: bodyFont, fontSize: 10.5, fontWeight: 700, letterSpacing: 3, color: '#9c7125', textAlign: 'center' },
        { binding: 'display.itinerary.eyebrow', name: 'Eyebrow itinerario' }
      ),
      makeLayer(
        'text',
        'Orden de la Velada',
        8, pct(60), 84, pct(50),
        { fontFamily: headingFont, fontSize: 28, fontWeight: 700, color: '#0b1428', textAlign: 'center', letterSpacing: 1.2 },
        { binding: 'display.itinerary.title', name: 'Título itinerario' }
      ),
      makeLayer(
        'text',
        'Cada instante pensado para brillar junto a ti.',
        12, pct(116), 76, pct(38),
        { fontFamily: editorialSerif, fontSize: 17, fontWeight: 500, color: '#334155', textAlign: 'center' },
        { binding: 'display.itinerary.intro', name: 'Intro itinerario' }
      ),
      makeLayer(
        'shape',
        '',
        10.5, pct(184), 0.5, pct(items.length * rowH - 28),
        { backgroundColor: '#c89d4c', shapeKind: 'rectangle' },
        { binding: 'display.itinerary.spine', name: 'Eje dorado' }
      )
    );

    items.forEach((item, idx) => {
      const topPx = 182 + idx * rowH;
      const prefix = `itinerary.${idx}`;
      const isDarkCard = idx % 2 === 1;

      itinSec.layers.push(
        makeLayer(
          'shape',
          '',
          15, pct(topPx), 78, pct(128),
          {
            backgroundColor: isDarkCard ? '#0b1428' : '#ffffff',
            borderColor: '#c89d4c',
            borderWidth: 1.5,
            borderStyle: 'solid',
            borderRadius: 18,
            boxShadow: '0 12px 28px rgba(11, 20, 40, 0.12)'
          },
          { binding: `${prefix}.card`, name: `Tarjeta momento ${idx + 1}` }
        ),
        makeLayer(
          'text',
          item.icon || '✦',
          7, pct(topPx + 42), 8, pct(42),
          {
            fontFamily: headingFont,
            fontSize: 15,
            fontWeight: 700,
            color: '#0b1428',
            backgroundColor: '#ebd094',
            borderRadius: 999,
            borderColor: '#ffffff',
            borderWidth: 1.5,
            borderStyle: 'solid',
            textAlign: 'center'
          },
          { binding: `${prefix}.icon`, name: `Icono momento ${idx + 1}` }
        ),
        makeLayer(
          'text',
          item.time || `1${8 + idx}:00 HRS`,
          19, pct(topPx + 14), 28, pct(26),
          { fontFamily: bodyFont, fontSize: 10.5, fontWeight: 700, letterSpacing: 1.8, color: isDarkCard ? '#ebd094' : '#9c7125', textAlign: 'left' },
          { binding: `${prefix}.time`, name: `Hora momento ${idx + 1}` }
        ),
        makeLayer(
          'text',
          item.title || `Momento ${idx + 1}`,
          19, pct(topPx + 40), 50, pct(34),
          { fontFamily: headingFont, fontSize: 17.5, fontWeight: 700, color: isDarkCard ? '#faf6ee' : '#0b1428', textAlign: 'left' },
          { binding: `${prefix}.title`, name: `Título momento ${idx + 1}` }
        ),
        makeLayer(
          'text',
          item.description || 'Detalle especial de la velada.',
          19, pct(topPx + 76), 50, pct(40),
          { fontFamily: bodyFont, fontSize: 11.5, fontWeight: 400, color: isDarkCard ? '#cbd5e1' : '#475569', textAlign: 'left', lineHeight: 1.35 },
          { binding: `${prefix}.description`, name: `Descripción momento ${idx + 1}` }
        ),
        makeLayer(
          'button',
          item.locationLabel || 'Sede ↗',
          71, pct(topPx + 45), 19, pct(36),
          {
            backgroundColor: isDarkCard ? '#d4aa5a' : '#0b1428',
            color: isDarkCard ? '#0b1428' : '#ebd094',
            fontFamily: bodyFont,
            fontSize: 10,
            fontWeight: 700,
            borderRadius: 24,
            borderColor: '#d4aa5a',
            borderWidth: 1,
            borderStyle: 'solid'
          },
          { binding: `${prefix}.location`, name: `Enlace momento ${idx + 1}`, url: item.locationUrl || '#locations' }
        )
      );
    });
    sections.push(itinSec);
  }

  // =========================================================================
  // 7. DRESS CODE — PROTOCOLO DE GALA (640px)
  // =========================================================================
  if (settings.dressCode !== false) {
    const dressSec = makeSection(
      'dressCode',
      'Código de Etiqueta',
      '#0b1428',
      640,
      `${ASSET_DIR}/astral-midnight-bg.svg`
    );
    dressSec.pluginSettings = {
      eyebrow: 'CAPÍTULO VI · ETIQUETA DE NOCHE',
      introText: 'Inspiración sartorial para una velada inolvidable.',
      showImage: false,
      showDescription: true
    };
    dressSec.layers.push(
      makeLayer(
        'text',
        'CAPÍTULO VI · ETIQUETA DE NOCHE',
        12, 6, 76, 4.5,
        { fontFamily: bodyFont, fontSize: 10.5, fontWeight: 700, letterSpacing: 3, color: '#ebd094', textAlign: 'center' },
        { binding: 'display.dressCode.eyebrow', name: 'Eyebrow etiqueta' }
      ),
      makeLayer(
        'text',
        'Código de Vestimenta',
        8, 12, 84, 8,
        { fontFamily: headingFont, fontSize: 28, fontWeight: 700, color: '#faf6ee', textAlign: 'center', letterSpacing: 1.2 },
        { binding: 'display.dressCode.title', name: 'Título etiqueta' }
      ),
      makeLayer(
        'shape',
        '',
        8, 24, 84, 66,
        {
          backgroundColor: '#faf6ee',
          borderColor: '#d4aa5a',
          borderWidth: 1.8,
          borderStyle: 'solid',
          borderRadius: 24,
          boxShadow: '0 22px 48px rgba(0,0,0,0.45)'
        },
        { binding: 'dress.mainCard', name: 'Tarjeta protocolo' }
      ),
      makeLayer(
        'text',
        content.dressCode || 'Rigurosa Etiqueta · Gala Astral',
        14, 30, 72, 10,
        { fontFamily: headingFont, fontSize: 22, fontWeight: 700, color: '#0b1428', textAlign: 'center' },
        { binding: 'dress.code', name: 'Código vestimenta' }
      ),
      makeLayer(
        'text',
        content.dressCodeDescription ||
          'Damas: Vestido largo de noche (evitar tonos blancos, perla y marfil).\nCaballeros: Esmoquin o traje formal oscuro.',
        14, 42, 72, 20,
        { fontFamily: bodyFont, fontSize: 12.5, color: '#334155', textAlign: 'center', lineHeight: 1.55 },
        { binding: 'dress.description', name: 'Descripción etiqueta' }
      ),
      makeLayer(
        'text',
        'PALETA SUGERIDA DE GALA',
        20, 65, 60, 4.5,
        { fontFamily: bodyFont, fontSize: 9.5, fontWeight: 700, letterSpacing: 2.2, color: '#9c7125', textAlign: 'center' },
        { binding: 'display.dressCode.paletteLabel', name: 'Etiqueta paleta' }
      ),
      ...['#0b1428', '#1e3a5f', '#d4aa5a', '#b89f97', '#1f2937'].map((hex, sIdx) =>
        makeLayer(
          'shape',
          '',
          24 + sIdx * 11, 72, 8, 8,
          { backgroundColor: hex, borderColor: '#d4aa5a', borderWidth: 1.5, borderStyle: 'solid', borderRadius: 999 },
          { binding: `display.dressCode.swatch.${sIdx}`, name: `Tono ${sIdx + 1}` }
        )
      )
    );
    sections.push(dressSec);
  }

  // =========================================================================
  // 8. GALLERY — SALÓN DE RETRATOS (860px+)
  // =========================================================================
  if (settings.gallery !== false) {
    const rawGallery = content.galleryItems?.length
      ? content.galleryItems
      : content.gallery?.length
      ? content.gallery.map((url, i) => ({ id: `pc-g-${i}`, url, title: `Retrato 0${i + 1}`, description: 'Edición Astral' }))
      : [
          { id: 'pc-1', url: coverUrl, title: 'I · Bajo las Estrellas', description: 'Palais Céleste' },
          { id: 'pc-2', url: FALLBACK_GALLERY_2, title: 'II · Luz de Luna', description: 'Promesa Eterna' },
          { id: 'pc-3', url: FALLBACK_GALLERY_3, title: 'III · Noche de Gala', description: 'Instante Inolvidable' },
          { id: 'pc-4', url: FALLBACK_HOTEL, title: 'IV · El Gran Salón', description: 'Celebración' }
        ];

    const rows = Math.max(1, Math.ceil(rawGallery.length / 2));
    const totalHeight = Math.max(840, 210 + rows * 310);
    const pct = (px: number) => Number(((px / totalHeight) * 100).toFixed(2));

    const galSec = makeSection(
      'gallery',
      'Galería Editorial',
      '#f8f4ec',
      totalHeight,
      `${ASSET_DIR}/pearl-deco-bg.svg`
    );
    galSec.pluginSettings = {
      eyebrow: 'CAPÍTULO VII · RETRATOS',
      introText: 'Instantes capturados en el camino hacia nuestro gran día.',
      displayMode: 'inherit',
      showCaptions: true,
      imageHeight: 205
    };
    galSec.layers.push(
      makeLayer(
        'text',
        'CAPÍTULO VII · RETRATOS',
        12, pct(28), 76, pct(26),
        { fontFamily: bodyFont, fontSize: 10.5, fontWeight: 700, letterSpacing: 3, color: '#9c7125', textAlign: 'center' },
        { binding: 'display.gallery.eyebrow', name: 'Eyebrow galería' }
      ),
      makeLayer(
        'text',
        'Galería Editorial',
        8, pct(60), 84, pct(50),
        { fontFamily: headingFont, fontSize: 28, fontWeight: 700, color: '#0b1428', textAlign: 'center', letterSpacing: 1.2 },
        { binding: 'display.gallery.title', name: 'Título galería' }
      ),
      makeLayer(
        'text',
        'Instantes capturados en el camino hacia nuestro gran día.',
        12, pct(116), 76, pct(38),
        { fontFamily: editorialSerif, fontSize: 17, fontWeight: 500, color: '#334155', textAlign: 'center' },
        { binding: 'display.gallery.intro', name: 'Intro galería' }
      )
    );

    rawGallery.forEach((item, idx) => {
      const isOdd = rawGallery.length % 2 === 1 && idx === rawGallery.length - 1;
      const left = isOdd ? 29 : idx % 2 === 0 ? 6 : 52;
      const topPx = 180 + Math.floor(idx / 2) * 300;
      const prefix = `gallery.item.${idx}`;

      galSec.layers.push(
        makeLayer(
          'shape',
          '',
          left, pct(topPx), 42, pct(278),
          {
            backgroundColor: '#0b1428',
            borderColor: '#d4aa5a',
            borderWidth: 1.8,
            borderStyle: 'solid',
            borderRadius: 18,
            boxShadow: '0 18px 38px rgba(11, 20, 40, 0.18)'
          },
          { binding: `${prefix}.card`, name: `Marco galería ${idx + 1}` }
        ),
        makeLayer(
          'image',
          item.title || `Foto ${idx + 1}`,
          left + 2.5, pct(topPx + 14), 37, pct(196),
          {
            preserveAspectRatio: false,
            frameEnabled: true,
            objectFit: 'cover',
            borderRadius: 12,
            borderColor: '#ebd094',
            borderWidth: 1.2,
            borderStyle: 'solid'
          },
          { binding: `${prefix}.image`, url: item.url || coverUrl, name: `Foto ${idx + 1}` }
        ),
        makeLayer(
          'text',
          item.title || `Instante 0${idx + 1}`,
          left + 3, pct(topPx + 220), 36, pct(24),
          { fontFamily: headingFont, fontSize: 13.5, fontWeight: 700, color: '#faf6ee', textAlign: 'center' },
          { binding: `${prefix}.title`, name: `Título foto ${idx + 1}` }
        ),
        makeLayer(
          'text',
          item.description || 'Palais Céleste',
          left + 3, pct(topPx + 244), 36, pct(20),
          { fontFamily: editorialSerif, fontSize: 12.5, fontStyle: 'italic', color: '#ebd094', textAlign: 'center' },
          { binding: `${prefix}.description`, name: `Subtítulo foto ${idx + 1}` }
        )
      );
    });
    sections.push(galSec);
  }

  // =========================================================================
  // 9. GIFTS — MESA DE REGALOS & SOBRE DIGITAL (820px+)
  // =========================================================================
  const hasGiftsOrEnvelope =
    (settings.giftRegistry !== false && (content.giftRegistry?.length || !content.sectionSettings)) ||
    (settings.digitalEnvelope !== false && (content.digitalEnvelope?.clabe || content.digitalEnvelope?.account || !content.sectionSettings));

  if (hasGiftsOrEnvelope && (settings.giftRegistry !== false || settings.digitalEnvelope !== false)) {
    const gifts = content.giftRegistry?.length
      ? content.giftRegistry
      : [
          { store: 'El Palacio de Hierro', title: 'Mesa de Gala #408920', note: 'Gracias por ser parte de nuestro nuevo hogar.', url: 'https://www.elpalaciodehierro.com' },
          { store: 'Liverpool', title: 'Evento #51902411', note: 'Detalle con envío directo a los novios.', url: 'https://www.liverpool.com.mx' }
        ];
    const rows = Math.max(1, Math.ceil(gifts.length / 2));
    const envTop = 195 + rows * 275 + 16;
    const totalHeight = envTop + 320;
    const pct = (px: number) => Number(((px / totalHeight) * 100).toFixed(2));
    const envelope = content.digitalEnvelope || {};

    const giftSec = makeSection(
      'gifts',
      'Mesa de Regalos & Sobre Astral',
      '#0b1428',
      totalHeight,
      `${ASSET_DIR}/astral-midnight-bg.svg`
    );
    giftSec.pluginSettings = {
      eyebrow: 'CAPÍTULO VIII · OBSEQUIOS',
      introText: 'Tu compañía es nuestro mejor regalo; si deseas tener un detalle con nosotros, te compartimos estas opciones.',
      primaryButtonText: 'VER MESA',
      envelopeButtonText: 'COPIAR CLABE',
      showRegistry: true,
      showEnvelope: true
    };
    giftSec.layers.push(
      makeLayer(
        'text',
        'CAPÍTULO VIII · OBSEQUIOS',
        12, pct(28), 76, pct(26),
        { fontFamily: bodyFont, fontSize: 10.5, fontWeight: 700, letterSpacing: 3, color: '#ebd094', textAlign: 'center' },
        { binding: 'display.gifts.eyebrow', name: 'Eyebrow regalos' }
      ),
      makeLayer(
        'text',
        'Mesa de Regalos & Sobre Digital',
        8, pct(60), 84, pct(50),
        { fontFamily: headingFont, fontSize: 27, fontWeight: 700, color: '#faf6ee', textAlign: 'center' },
        { binding: 'display.gifts.title', name: 'Título regalos' }
      ),
      makeLayer(
        'text',
        'Tu compañía es nuestro mejor regalo; si deseas tener un detalle con nosotros, te compartimos estas opciones.',
        10, pct(116), 80, pct(44),
        { fontFamily: editorialSerif, fontSize: 16.5, color: '#cbd5e1', textAlign: 'center' },
        { binding: 'display.gifts.intro', name: 'Intro regalos' }
      )
    );

    const isSingleGift = gifts.length === 1;
    gifts.forEach((gift, idx) => {
      const left = isSingleGift ? 10 : idx % 2 === 0 ? 6 : 51;
      const cardW = isSingleGift ? 80 : 43;
      const innerLeft = left + 3;
      const innerW = cardW - 6;
      const topPx = 185 + Math.floor(idx / 2) * 270;
      const prefix = `gift.${idx}`;

      giftSec.layers.push(
        makeLayer(
          'shape',
          '',
          left, pct(topPx), cardW, pct(248),
          { backgroundColor: '#faf6ee', borderColor: '#d4aa5a', borderWidth: 1.5, borderStyle: 'solid', borderRadius: 20, boxShadow: '0 16px 36px rgba(0,0,0,0.35)' },
          { binding: `${prefix}.card`, name: `Tarjeta mesa ${idx + 1}` }
        ),
        makeLayer(
          'image',
          gift.store || `Mesa ${idx + 1}`,
          left + cardW / 2 - 9, pct(topPx + 16), 18, pct(50),
          { objectFit: 'contain', backgroundColor: '#ffffff', borderRadius: 10, padding: 5, borderColor: '#e2d5bc', borderWidth: 1, borderStyle: 'solid' },
          { binding: `${prefix}.image`, url: resolveGiftStoreLogo(gift, `${ASSET_DIR}/celestial-astrolabe-crest.svg`), name: `Logo mesa ${idx + 1}` }
        ),
        makeLayer(
          'text',
          gift.store || 'MESA DE REGALOS',
          innerLeft, pct(topPx + 74), innerW, pct(20),
          { fontFamily: bodyFont, fontSize: 9.5, fontWeight: 700, letterSpacing: 2, color: '#9c7125', textAlign: 'center' },
          { binding: `${prefix}.store`, name: `Tienda ${idx + 1}` }
        ),
        makeLayer(
          'text',
          gift.title || gift.store || `Mesa ${idx + 1}`,
          innerLeft, pct(topPx + 98), innerW, pct(34),
          { fontFamily: headingFont, fontSize: 16.5, fontWeight: 700, color: '#0b1428', textAlign: 'center' },
          { binding: `${prefix}.title`, name: `Título mesa ${idx + 1}` }
        ),
        makeLayer(
          'text',
          gift.note || 'Gracias por tu cariño y generosidad.',
          innerLeft, pct(topPx + 136), innerW, pct(44),
          { fontFamily: editorialSerif, fontSize: 14, fontStyle: 'italic', color: '#475569', textAlign: 'center' },
          { binding: `${prefix}.note`, name: `Nota mesa ${idx + 1}` }
        ),
        makeLayer(
          'button',
          'ABRIR MESA',
          innerLeft + 2, pct(topPx + 190), innerW - 4, pct(40),
          { backgroundColor: '#0b1428', color: '#ebd094', fontFamily: bodyFont, fontSize: 10.5, fontWeight: 700, letterSpacing: 1.4, borderRadius: 30, borderColor: '#d4aa5a', borderWidth: 1.2, borderStyle: 'solid' },
          { binding: `${prefix}.open`, name: `Botón mesa ${idx + 1}`, url: gift.url || 'https://www.liverpool.com.mx' }
        )
      );
    });

    giftSec.layers.push(
      makeLayer(
        'shape',
        '',
        6, pct(envTop), 88, pct(280),
        { backgroundColor: 'rgba(18, 33, 64, 0.94)', borderColor: '#d4aa5a', borderWidth: 1.8, borderStyle: 'solid', borderRadius: 24, boxShadow: '0 22px 48px rgba(0,0,0,0.45)' },
        { binding: 'envelope.card', name: 'Cofre sobre digital' }
      ),
      makeLayer(
        'text',
        'Sobre Nupcial Digital',
        12, pct(envTop + 22), 76, pct(36),
        { fontFamily: headingFont, fontSize: 20, fontWeight: 700, color: '#faf6ee', textAlign: 'center' },
        { binding: 'display.gifts.envelopeTitle', name: 'Título sobre' }
      ),
      makeLayer(
        'text',
        envelope.bank || 'BBVA · Banca Patrimonial',
        12, pct(envTop + 66), 36, pct(26),
        { fontFamily: bodyFont, fontSize: 11.5, fontWeight: 700, color: '#ebd094', textAlign: 'center' },
        { binding: 'envelope.bank', name: 'Banco' }
      ),
      makeLayer(
        'text',
        envelope.holder || 'Titular: Anfitriones del Evento',
        52, pct(envTop + 66), 36, pct(26),
        { fontFamily: bodyFont, fontSize: 11.5, fontWeight: 600, color: '#faf6ee', textAlign: 'center' },
        { binding: 'envelope.holder', name: 'Titular' }
      ),
      makeLayer(
        'text',
        envelope.clabe ? `CLABE: ${envelope.clabe}` : 'CLABE: 0121 8000 1928 3746 51',
        14, pct(envTop + 102), 72, pct(28),
        { fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#ebd094', textAlign: 'center' },
        { binding: 'envelope.clabe', name: 'CLABE interbancaria' }
      ),
      makeLayer(
        'text',
        envelope.note || 'Gracias por acompañarnos en el inicio de nuestra vida juntos.',
        14, pct(envTop + 142), 72, pct(36),
        { fontFamily: editorialSerif, fontSize: 15, fontStyle: 'italic', color: '#cbd5e1', textAlign: 'center' },
        { binding: 'envelope.note', name: 'Nota sobre' }
      ),
      makeLayer(
        'button',
        'COPIAR CLABE INTERBANCARIA',
        22, pct(envTop + 194), 56, pct(44),
        { backgroundColor: '#d4aa5a', color: '#0b1428', fontFamily: bodyFont, fontSize: 10.5, fontWeight: 700, letterSpacing: 1.3, borderRadius: 30 },
        { binding: 'envelope.copyClabe', name: 'Copiar CLABE' }
      ),
      makeLayer(
        'text',
        'Datos copiados al portapapeles',
        20, pct(envTop + 246), 60, pct(22),
        { fontFamily: bodyFont, fontSize: 11, fontWeight: 600, color: '#ebd094', textAlign: 'center' },
        { binding: 'envelope.feedback', name: 'Feedback sobre' }
      )
    );
    sections.push(giftSec);
  }

  // =========================================================================
  // 10. LODGING — HOSPEDAJE SUGERIDO (680px)
  // =========================================================================
  if (settings.lodging !== false && (content.lodging?.length || !content.sectionSettings)) {
    const hotels = content.lodging?.length
      ? content.lodging
      : [
          {
            name: 'The Ritz-Carlton & Astral Suites',
            description: 'A 5 minutos de la recepción principal con tarifa preferencial.',
            address: 'Av. Paseo de la Reforma 509 · CDMX',
            priceLabel: 'Tarifa especial desde $3,200 MXN',
            agreementLabel: 'Convenio Boda Astral',
            discountCode: 'CELESTE27',
            services: ['Desayuno incluido', 'Valet Parking', 'Late Check-out'],
            url: 'https://maps.google.com',
            mapUrl: 'https://maps.google.com',
            imageUrl: FALLBACK_HOTEL
          }
        ];
    const cardH = 390;
    const totalHeight = Math.max(640, 200 + hotels.length * (cardH + 26));
    const pct = (px: number) => Number(((px / totalHeight) * 100).toFixed(2));

    const lodgSec = makeSection(
      'lodging',
      'Hospedaje Recomendado',
      '#f8f4ec',
      totalHeight,
      `${ASSET_DIR}/pearl-deco-bg.svg`
    );
    lodgSec.pluginSettings = {
      eyebrow: 'CAPÍTULO IX · ESTANCIA',
      introText: 'Hoteles seleccionados con convenio especial para nuestros invitados.',
      primaryButtonText: 'RESERVAR HABITACIÓN',
      showPrice: true,
      showDiscount: true
    };
    lodgSec.layers.push(
      makeLayer(
        'text',
        'CAPÍTULO IX · ESTANCIA',
        12, pct(28), 76, pct(26),
        { fontFamily: bodyFont, fontSize: 10.5, fontWeight: 700, letterSpacing: 3, color: '#9c7125', textAlign: 'center' },
        { binding: 'display.lodging.eyebrow', name: 'Eyebrow hospedaje' }
      ),
      makeLayer(
        'text',
        'Hospedaje Recomendado',
        8, pct(60), 84, pct(50),
        { fontFamily: headingFont, fontSize: 28, fontWeight: 700, color: '#0b1428', textAlign: 'center' },
        { binding: 'display.lodging.title', name: 'Título hospedaje' }
      )
    );

    hotels.forEach((hotel, idx) => {
      const topPx = 150 + idx * (cardH + 24);
      const prefix = `lodging.${idx}`;
      lodgSec.layers.push(
        makeLayer(
          'shape',
          '',
          7, pct(topPx), 86, pct(cardH),
          { backgroundColor: '#ffffff', borderColor: '#c89d4c', borderWidth: 1.5, borderStyle: 'solid', borderRadius: 22, boxShadow: '0 18px 40px rgba(11, 20, 40, 0.09)' },
          { binding: `${prefix}.card`, name: `Tarjeta hotel ${idx + 1}` }
        ),
        makeLayer(
          'image',
          hotel.name || `Hotel ${idx + 1}`,
          11, pct(topPx + 20), 30, pct(140),
          { preserveAspectRatio: false, frameEnabled: true, objectFit: 'cover', borderRadius: 12, borderColor: '#c89d4c', borderWidth: 1.5, borderStyle: 'solid' },
          { binding: `${prefix}.image`, url: hotel.imageUrl || FALLBACK_HOTEL, name: `Imagen hotel ${idx + 1}` }
        ),
        makeLayer(
          'text',
          hotel.name || `Hotel ${idx + 1}`,
          44, pct(topPx + 24), 45, pct(40),
          { fontFamily: headingFont, fontSize: 19, fontWeight: 700, color: '#0b1428', textAlign: 'left' },
          { binding: `${prefix}.name`, name: `Nombre hotel ${idx + 1}` }
        ),
        makeLayer(
          'text',
          hotel.description || 'Confort y cercanía al recinto principal.',
          44, pct(topPx + 70), 45, pct(46),
          { fontFamily: bodyFont, fontSize: 12, color: '#475569', textAlign: 'left', lineHeight: 1.4 },
          { binding: `${prefix}.description`, name: `Descripción hotel ${idx + 1}` }
        ),
        makeLayer(
          'text',
          hotel.address || 'Zona Hotelera Principal',
          44, pct(topPx + 120), 45, pct(32),
          { fontFamily: bodyFont, fontSize: 11, fontWeight: 600, color: '#9c7125', textAlign: 'left' },
          { binding: `${prefix}.address`, name: `Dirección hotel ${idx + 1}` }
        ),
        makeLayer(
          'text',
          [hotel.priceLabel, hotel.discountCode ? `Código: ${hotel.discountCode}` : ''].filter(Boolean).join(' · ') || 'Tarifa preferencial disponible',
          12, pct(topPx + 180), 76, pct(34),
          { fontFamily: bodyFont, fontSize: 11, fontWeight: 700, color: '#0b1428', backgroundColor: '#f5ecd9', borderRadius: 8, padding: 6, textAlign: 'center' },
          { binding: `${prefix}.discount`, name: `Convenio hotel ${idx + 1}` }
        ),
        makeLayer(
          'button',
          'RESERVAR ESTANCIA',
          14, pct(topPx + 240), 72, pct(46),
          { backgroundColor: '#0b1428', color: '#ebd094', fontFamily: bodyFont, fontSize: 11.5, fontWeight: 700, letterSpacing: 1.5, borderRadius: 30, borderColor: '#d4aa5a', borderWidth: 1.2, borderStyle: 'solid' },
          { binding: `${prefix}.reserve`, name: `Reservar hotel ${idx + 1}`, url: hotel.url || 'https://maps.google.com' }
        ),
        makeLayer(
          'button',
          'VER UBICACIÓN EN MAPA',
          22, pct(topPx + 300), 56, pct(40),
          { backgroundColor: '#faf6ee', color: '#0b1428', fontFamily: bodyFont, fontSize: 10.5, fontWeight: 700, borderRadius: 30, borderColor: '#c89d4c', borderWidth: 1.2, borderStyle: 'solid' },
          { binding: `${prefix}.map`, name: `Mapa hotel ${idx + 1}`, url: hotel.mapUrl || 'https://maps.google.com' }
        )
      );
    });
    sections.push(lodgSec);
  }

  // =========================================================================
  // 11. GUEST PASS — BOLETO ASTRAL VIP & MESA (680px)
  // =========================================================================
  const passSec = makeSection(
    'guestPass',
    'Tu Pase VIP & Mesa',
    '#0b1428',
    680,
    `${ASSET_DIR}/astral-midnight-bg.svg`
  );
  passSec.pluginSettings = {
    eyebrow: 'CAPÍTULO X · PASE PERSONAL',
    introText: 'Consulta tu mesa asignada y descarga tu código QR de recepción.',
    identifyButtonText: 'REVELAR MI PASE VIP',
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
      'CAPÍTULO X · PASE PERSONAL',
      12, 8, 76, 4,
      { fontFamily: bodyFont, fontSize: 10.5, fontWeight: 700, letterSpacing: 3, color: '#ebd094', textAlign: 'center' },
      { binding: 'display.guestPass.eyebrow', name: 'Eyebrow pase' }
    ),
    makeLayer(
      'text',
      'Tu Pase Astral & Mesa',
      8, 13, 84, 7.5,
      { fontFamily: headingFont, fontSize: 28, fontWeight: 700, color: '#faf6ee', textAlign: 'center' },
      { binding: 'display.guestPass.title', name: 'Título pase' }
    ),
    makeLayer(
      'shape',
      '',
      7, 26, 86, 62,
      { backgroundColor: '#faf6ee', borderColor: '#d4aa5a', borderWidth: 2, borderStyle: 'solid', borderRadius: 22, boxShadow: '0 22px 50px rgba(0,0,0,0.5)' },
      { binding: 'pass.card', name: 'Boleto VIP Palais Céleste' }
    ),
    makeLayer(
      'field',
      'Código QR',
      12, 34, 28, 36,
      { backgroundColor: '#ffffff', borderColor: '#c89d4c', borderWidth: 1.5, borderStyle: 'solid', borderRadius: 14, padding: 8, textAlign: 'center' },
      { binding: 'pass.qr', name: 'QR de acceso' }
    ),
    makeLayer(
      'text',
      'Invitado de Honor',
      45, 34, 42, 7,
      { fontFamily: headingFont, fontSize: 20, fontWeight: 700, color: '#0b1428', textAlign: 'left' },
      { binding: 'pass.name', name: 'Nombre invitado' }
    ),
    makeLayer(
      'text',
      'LISTA DE HONOR VIP',
      45, 42, 42, 4.2,
      { fontFamily: bodyFont, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: '#9c7125', textAlign: 'left' },
      { binding: 'pass.group', name: 'Grupo invitado' }
    ),
    makeLayer(
      'text',
      'Mesa Astral 01',
      45, 48, 42, 6.5,
      { fontFamily: headingFont, fontSize: 17.5, fontWeight: 700, color: '#0b1428', textAlign: 'left' },
      { binding: 'pass.table', name: 'Mesa asignada' }
    ),
    makeLayer(
      'text',
      'Asiento A-01',
      45, 55.5, 42, 4.8,
      { fontFamily: bodyFont, fontSize: 11.5, fontWeight: 600, color: '#334155', textAlign: 'left' },
      { binding: 'pass.seat', name: 'Asiento' }
    ),
    makeLayer(
      'text',
      '2 lugares reservados',
      45, 61, 42, 4.8,
      { fontFamily: bodyFont, fontSize: 11.5, fontWeight: 700, color: '#9c7125', textAlign: 'left' },
      { binding: 'pass.companions', name: 'Lugares' }
    ),
    makeLayer(
      'text',
      'Estado de verificación',
      14, 78, 72, 4.8,
      { fontFamily: bodyFont, fontSize: 11, fontWeight: 600, color: '#991b1b', textAlign: 'center' },
      { binding: 'pass.feedback', name: 'Feedback pase' }
    )
  );
  makeSeparatedFieldWithLabel(passSec.layers, 'pass.email', 'Correo electrónico registrado', 'invitado@ejemplo.com', 14, 33, 72, 13.5, false);
  makeSeparatedFieldWithLabel(passSec.layers, 'pass.phone', 'Teléfono móvil registrado', 'Número a 10 dígitos', 14, 49, 72, 13.5, false);
  passSec.layers.push(
    makeLayer(
      'button',
      'REVELAR MI PASE VIP',
      20, 66, 60, 8,
      { backgroundColor: '#0b1428', color: '#ebd094', fontFamily: bodyFont, fontSize: 11.5, fontWeight: 700, letterSpacing: 1.5, borderRadius: 30, borderColor: '#d4aa5a', borderWidth: 1.5, borderStyle: 'solid' },
      { binding: 'pass.identify', name: 'Identificar pase' }
    )
  );
  sections.push(passSec);

  // =========================================================================
  // 12. RSVP — CONFIRMACIÓN DE ASISTENCIA (920px)
  // =========================================================================
  if (settings.rsvp !== false) {
    const rsvpSec = makeSection(
      'rsvp',
      'Confirmación de Asistencia',
      '#f8f4ec',
      920,
      `${ASSET_DIR}/pearl-deco-bg.svg`
    );
    rsvpSec.pluginSettings = {
      eyebrow: 'CAPÍTULO XI · RÉPONDEZ S’IL VOUS PLAÎT',
      introText: 'Confirma tu presencia para reservar tu lugar en nuestra gran velada.',
      primaryButtonText: 'CONFIRMAR ASISTENCIA',
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
      color: '#0b1428',
      backgroundColor: '#ffffff',
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
        eyebrow: rsvpPartBase(12, 5.2, 76, 4, { fontSize: 10.5, fontWeight: 700, textAlign: 'center', backgroundColor: 'transparent', borderWidth: 0, color: '#9c7125' }),
        title: rsvpPartBase(8, 10, 84, 7.2, { fontFamily: headingFont, fontSize: 28, fontWeight: 700, textAlign: 'center', backgroundColor: 'transparent', borderWidth: 0, color: '#0b1428' }),
        intro: rsvpPartBase(12, 17.8, 76, 5, { fontFamily: editorialSerif, fontSize: 17, textAlign: 'center', backgroundColor: 'transparent', borderWidth: 0, color: '#334155' }),
        name: rsvpPartBase(11, 29, 37, 12.5),
        contact: rsvpPartBase(52, 29, 37, 12.5),
        response: rsvpPartBase(11, 43.5, 53, 12.5, { variant: 'cards' }),
        companions: rsvpPartBase(66, 43.5, 23, 12.5),
        dietary: rsvpPartBase(11, 58.5, 37, 14),
        message: rsvpPartBase(52, 58.5, 37, 14),
        submit: rsvpPartBase(20, 76, 60, 7.5, { textAlign: 'center', fontWeight: 700, backgroundColor: '#0b1428', color: '#ebd094', borderColor: '#d4aa5a', borderWidth: 1.5, borderRadius: 30 }),
        feedback: rsvpPartBase(15, 85.5, 70, 4.5, { textAlign: 'center', backgroundColor: 'transparent', borderWidth: 0, fontSize: 12, color: '#0b1428' })
      }
    };

    rsvpSec.layers.push(
      makeLayer(
        'text',
        'CAPÍTULO XI · RÉPONDEZ S’IL VOUS PLAÎT',
        12, 5.2, 76, 4,
        { fontFamily: bodyFont, fontSize: 10.5, fontWeight: 700, letterSpacing: 3, color: '#9c7125', textAlign: 'center' },
        { binding: 'display.rsvp.eyebrow', name: 'Eyebrow RSVP' }
      ),
      makeLayer(
        'text',
        'Confirma tu Asistencia',
        8, 10, 84, 7.2,
        { fontFamily: headingFont, fontSize: 28, fontWeight: 700, color: '#0b1428', textAlign: 'center' },
        { binding: 'display.rsvp.title', name: 'Título RSVP' }
      ),
      makeLayer(
        'text',
        'Confirma tu presencia para reservar tu lugar en nuestra gran velada.',
        12, 17.8, 76, 5,
        { fontFamily: editorialSerif, fontSize: 17, fontWeight: 500, color: '#334155', textAlign: 'center' },
        { binding: 'display.rsvp.intro', name: 'Intro RSVP' }
      ),
      makeLayer(
        'shape',
        '',
        6, 24.5, 88, 68,
        { backgroundColor: '#ffffff', borderColor: '#c89d4c', borderWidth: 1.8, borderStyle: 'solid', borderRadius: 24, boxShadow: '0 24px 56px rgba(11, 20, 40, 0.12)' },
        { binding: 'display.rsvp.card', name: 'Pliego RSVP' }
      ),
      makeLayer(
        'image',
        '',
        44, 20.5, 12, 7.8,
        { objectFit: 'contain' },
        { binding: 'display.rsvp.seal', url: `${ASSET_DIR}/celestial-astrolabe-crest.svg`, name: 'Emblema RSVP' }
      )
    );

    makeSeparatedFieldWithLabel(rsvpSec.layers, 'rsvp.name', 'Nombre completo del invitado', 'Tu nombre y apellido', 11, 29, 37, 12.5, false);
    makeSeparatedFieldWithLabel(rsvpSec.layers, 'rsvp.email', 'Correo electrónico o teléfono', 'contacto@ejemplo.com', 52, 29, 37, 12.5, false);
    makeSeparatedFieldWithLabel(rsvpSec.layers, 'rsvp.response', '¿Nos acompañarás?', 'Selecciona tu respuesta', 11, 43.5, 53, 12.5, false, {
      controlVariant: 'cards', textAlign: 'center', fontWeight: 700, fontSize: 11, padding: 6
    });
    makeSeparatedFieldWithLabel(rsvpSec.layers, 'rsvp.companions', 'Acompañantes', '0', 66, 43.5, 23, 12.5, false);
    makeSeparatedFieldWithLabel(rsvpSec.layers, 'rsvp.dietaryRestrictions', 'Restricción alimentaria', 'Opcional...', 11, 58.5, 37, 14, false);
    makeSeparatedFieldWithLabel(rsvpSec.layers, 'rsvp.message', 'Dedicatoria breve', 'Tus buenos deseos...', 52, 58.5, 37, 14, false);

    rsvpSec.layers.push(
      makeLayer(
        'button',
        'CONFIRMAR MI ASISTENCIA',
        20, 76, 60, 7.5,
        { backgroundColor: '#0b1428', color: '#ebd094', fontFamily: bodyFont, fontSize: 12, fontWeight: 700, letterSpacing: 1.6, borderRadius: 30, borderColor: '#d4aa5a', borderWidth: 1.5, borderStyle: 'solid', boxShadow: '0 12px 28px rgba(11, 20, 40, 0.25)' },
        { binding: 'rsvp.submit', name: 'Enviar RSVP' }
      ),
      makeLayer(
        'text',
        'Aquí aparecerá la confirmación de tu registro',
        14, 85, 72, 4.5,
        { fontFamily: bodyFont, fontSize: 11.5, fontWeight: 600, color: '#0b1428', textAlign: 'center' },
        { binding: 'rsvp.feedback', name: 'Feedback RSVP' }
      )
    );
    sections.push(rsvpSec);
  }

  // =========================================================================
  // 13. ALBUM — ÁLBUM COLECTIVO EN VIVO (660px)
  // =========================================================================
  if (settings.guestAlbum !== false) {
    const albumSec = makeSection(
      'album',
      'Álbum Colectivo en Vivo',
      '#0b1428',
      660,
      `${ASSET_DIR}/astral-midnight-bg.svg`
    );
    albumSec.pluginSettings = {
      eyebrow: 'CAPÍTULO XII · MEMORIAS EN VIVO',
      introText: 'Sube tus fotografías durante la celebración y compártelas con todos.',
      primaryButtonText: 'SUBIR FOTOGRAFÍA',
      showGallery: true
    };
    albumSec.layers.push(
      makeLayer(
        'text',
        'CAPÍTULO XII · MEMORIAS EN VIVO',
        12, 5, 76, 4.5,
        { fontFamily: bodyFont, fontSize: 10.5, fontWeight: 700, letterSpacing: 3, color: '#ebd094', textAlign: 'center' },
        { binding: 'display.album.eyebrow', name: 'Eyebrow álbum' }
      ),
      makeLayer(
        'text',
        'Álbum Colectivo en Vivo',
        8, 11, 84, 8,
        { fontFamily: headingFont, fontSize: 28, fontWeight: 700, color: '#faf6ee', textAlign: 'center' },
        { binding: 'display.album.title', name: 'Título álbum' }
      ),
      makeLayer(
        'shape',
        '',
        7, 24, 86, 66,
        { backgroundColor: '#faf6ee', borderColor: '#d4aa5a', borderWidth: 1.8, borderStyle: 'solid', borderRadius: 22, boxShadow: '0 22px 48px rgba(0,0,0,0.45)' },
        { binding: 'album.card', name: 'Tarjeta álbum' }
      ),
      makeLayer(
        'button',
        'SUBIR FOTOGRAFÍA AL ÁLBUM',
        18, 32, 64, 9,
        { backgroundColor: '#0b1428', color: '#ebd094', fontFamily: bodyFont, fontSize: 11.5, fontWeight: 700, letterSpacing: 1.5, borderRadius: 30, borderColor: '#d4aa5a', borderWidth: 1.5, borderStyle: 'solid' },
        { binding: 'album.upload', name: 'Subir foto' }
      ),
      makeLayer(
        'text',
        'Estado de subida de fotografía',
        14, 43.5, 72, 4.5,
        { fontFamily: bodyFont, fontSize: 11, fontWeight: 600, color: '#9c7125', textAlign: 'center' },
        { binding: 'album.feedback', name: 'Feedback álbum' }
      ),
      makeLayer(
        'field',
        'Muro de fotografías en vivo',
        11, 51, 78, 33,
        { backgroundColor: '#ffffff', borderColor: '#e2d5bc', borderWidth: 1, borderStyle: 'solid', borderRadius: 14, padding: 10, color: '#334155' },
        { binding: 'album.gallery', name: 'Galería colectiva' }
      )
    );
    sections.push(albumSec);
  }

  // =========================================================================
  // 14. SONGS — PETICIONES MUSICALES AL DJ (720px)
  // =========================================================================
  if (settings.songRequests !== false) {
    const songSec = makeSection(
      'songs',
      'Curaduría Musical · DJ',
      '#091020',
      720,
      `${ASSET_DIR}/astral-midnight-bg.svg`
    );
    songSec.pluginSettings = {
      eyebrow: 'CAPÍTULO XIII · PISTA DE BAILE',
      introText: '¿Qué canción debe sonar esta noche para celebrar juntos?',
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
        { binding: 'display.songs.vinyl', url: `${ASSET_DIR}/astral-vinyl-disc.svg`, name: 'Vinilo astral', animation: { type: 'pulse', duration: 3.2, delay: 0, repeat: true } }
      ),
      makeLayer(
        'text',
        'CAPÍTULO XIII · PISTA DE BAILE',
        12, 17, 76, 4,
        { fontFamily: bodyFont, fontSize: 10.5, fontWeight: 700, letterSpacing: 3, color: '#ebd094', textAlign: 'center' },
        { binding: 'display.songs.eyebrow', name: 'Eyebrow DJ' }
      ),
      makeLayer(
        'text',
        'Sugiere tu Canción al DJ',
        8, 22, 84, 7.5,
        { fontFamily: headingFont, fontSize: 28, fontWeight: 700, color: '#faf6ee', textAlign: 'center' },
        { binding: 'display.songs.title', name: 'Título DJ' }
      ),
      makeLayer(
        'shape',
        '',
        7, 35, 86, 57,
        { backgroundColor: 'rgba(18, 33, 64, 0.92)', borderColor: '#d4aa5a', borderWidth: 1.6, borderStyle: 'solid', borderRadius: 22, boxShadow: '0 22px 48px rgba(0,0,0,0.55)' },
        { binding: 'song.card', name: 'Consola DJ' }
      )
    );
    makeSeparatedFieldWithLabel(songSec.layers, 'song.title', 'Nombre de la canción', 'Ej. Fly Me to the Moon...', 11, 39.5, 37, 13, true);
    makeSeparatedFieldWithLabel(songSec.layers, 'song.sourceUrl', 'Enlace Spotify o YouTube', 'https://open.spotify.com/...', 52, 39.5, 37, 13, true);
    makeSeparatedFieldWithLabel(songSec.layers, 'song.artist', 'Artista o grupo', 'Intérprete', 11, 55, 37, 13, true);
    makeSeparatedFieldWithLabel(songSec.layers, 'song.dedication', 'Dedicatoria en pista', 'Opcional...', 52, 55, 37, 13, true);
    songSec.layers.push(
      makeLayer(
        'button',
        'ENVIAR CANCIÓN AL DJ',
        22, 72.5, 56, 8,
        { backgroundColor: '#d4aa5a', color: '#0b1428', fontFamily: bodyFont, fontSize: 11.5, fontWeight: 700, letterSpacing: 1.5, borderRadius: 30 },
        { binding: 'song.submit', name: 'Enviar canción' }
      ),
      makeLayer(
        'text',
        'Confirmación de tu petición musical',
        14, 83, 72, 4.5,
        { fontFamily: bodyFont, fontSize: 11, fontWeight: 600, color: '#ebd094', textAlign: 'center' },
        { binding: 'song.feedback', name: 'Feedback DJ' }
      )
    );
    sections.push(songSec);
  }

  // =========================================================================
  // 15. DEDICATIONS — LIBRO DE DESEOS (760px)
  // =========================================================================
  if (settings.dedications !== false) {
    const dedSec = makeSection(
      'dedications',
      'Libro de Dedicatorias',
      '#f8f4ec',
      760,
      `${ASSET_DIR}/pearl-deco-bg.svg`
    );
    dedSec.pluginSettings = {
      eyebrow: 'CAPÍTULO XIV · LIBRO DE HONOR',
      introText: 'Déjanos unas palabras que atesoraremos por siempre.',
      primaryButtonText: 'PUBLICAR DEDICATORIA',
      publicNameLabel: 'Tu nombre o familia',
      messageLabel: 'Tu mensaje',
      showWall: true,
      nativeFieldPartsSeparated: true
    };
    dedSec.layers.push(
      makeLayer(
        'text',
        'CAPÍTULO XIV · LIBRO DE HONOR',
        12, 4.5, 76, 4,
        { fontFamily: bodyFont, fontSize: 10.5, fontWeight: 700, letterSpacing: 3, color: '#9c7125', textAlign: 'center' },
        { binding: 'display.dedications.eyebrow', name: 'Eyebrow dedicatorias' }
      ),
      makeLayer(
        'text',
        'Dedicatorias & Deseos',
        8, 9.5, 84, 7.5,
        { fontFamily: headingFont, fontSize: 27, fontWeight: 700, color: '#0b1428', textAlign: 'center' },
        { binding: 'display.dedications.title', name: 'Título dedicatorias' }
      ),
      makeLayer(
        'shape',
        '',
        7, 22, 86, 45,
        { backgroundColor: '#ffffff', borderColor: '#c89d4c', borderWidth: 1.5, borderStyle: 'solid', borderRadius: 22, boxShadow: '0 18px 40px rgba(11, 20, 40, 0.09)' },
        { binding: 'dedication.card', name: 'Tarjeta libro de firmas' }
      )
    );
    makeSeparatedFieldWithLabel(dedSec.layers, 'dedication.publicName', 'Tu nombre o familia', 'Ej. Familia Ramírez', 11, 26, 34, 14, false);
    makeSeparatedFieldWithLabel(dedSec.layers, 'dedication.message', 'Mensaje para los novios', 'Escribe tus mejores deseos...', 48, 26, 41, 22, false);
    dedSec.layers.push(
      makeLayer(
        'button',
        'FIRMAR LIBRO DE HONOR',
        22, 52, 56, 7.5,
        { backgroundColor: '#0b1428', color: '#ebd094', fontFamily: bodyFont, fontSize: 11.5, fontWeight: 700, letterSpacing: 1.5, borderRadius: 30, borderColor: '#d4aa5a', borderWidth: 1.5, borderStyle: 'solid' },
        { binding: 'dedication.submit', name: 'Enviar dedicatoria' }
      ),
      makeLayer(
        'text',
        'Estado de tu dedicatoria',
        16, 61, 68, 4.5,
        { fontFamily: bodyFont, fontSize: 11, fontWeight: 600, color: '#9c7125', textAlign: 'center' },
        { binding: 'dedication.feedback', name: 'Feedback dedicatoria' }
      ),
      makeLayer(
        'field',
        'Muro de dedicatorias aprobadas',
        7, 71, 86, 23,
        { backgroundColor: '#ffffff', borderColor: '#d4aa5a', borderWidth: 1, borderStyle: 'solid', borderRadius: 16, padding: 12, color: '#0b1428' },
        { binding: 'dedication.wall', name: 'Muro de dedicatorias' }
      )
    );
    sections.push(dedSec);
  }

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
    theme: { ...PALAIS_CELESTE_THEME },
    accessScreen: {
      templateKey: 'palais-celeste',
      enabled: true,
      backgroundType: 'image',
      backgroundColor: '#0b1428',
      backgroundImageUrl: `${ASSET_DIR}/astral-midnight-bg.svg`,
      backgroundOverlayOpacity: 20,
      cardStyle: 'glass',
      cardBgColor: 'rgba(13, 24, 48, 0.92)',
      cardRadius: 24,
      primaryColor: '#d4aa5a',
      accentColor: '#d4aa5a',
      textColor: '#faf6ee',
      buttonBgColor: '#d4aa5a',
      buttonTextColor: '#0b1428',
      buttonRadius: 30,
      headingFont,
      bodyFont,
      showBadge: true,
      badgeText: '★ PALAIS CÉLESTE · GALA ASTRAL ★',
      showIcon: true,
      iconName: 'sparkles',
      logoUrl: `${ASSET_DIR}/celestial-astrolabe-crest.svg`,
      title: 'Invitación Personal de Gala',
      subtitle: 'Ingresa tu correo o teléfono registrado para desbloquear tu invitación y pase astral.',
      inputLabel: 'Correo o teléfono registrado',
      inputPlaceholder: 'invitado@ejemplo.com o 55 0000 0000',
      buttonText: 'ABRIR INVITACIÓN ASTRAL'
    },
    sections
  };
}
