import { EventModel, InvitationContent, VisualInvitationDesign, VisualInvitationLayer, VisualInvitationSection } from '../../core/models';

export interface CompleteDesignPreset {
  key: string;
  name: string;
  description: string;
  category: 'boda' | 'xv' | 'graduacion' | 'cumpleanos' | 'bautizo' | 'general';
  colors: [string, string, string];
}

export const COMPLETE_DESIGN_PRESETS: CompleteDesignPreset[] = [
  { key: 'editorial', name: 'Editorial de autor', description: 'Fotograf\u00eda protagonista, tipograf\u00eda amplia y lectura limpia.', category: 'general', colors: ['#f7f5f1', '#202d2a', '#dc705b'] },
  { key: 'romantic', name: 'Jard\u00edn rom\u00e1ntico', description: 'Retrato en arco, detalles delicados y una historia cercana.', category: 'boda', colors: ['#fff8f6', '#684755', '#7c946e'] },
  { key: 'night', name: 'Noche de gala', description: 'Composici\u00f3n asim\u00e9trica y contraste para una celebraci\u00f3n formal.', category: 'xv', colors: ['#191c22', '#f4e9d4', '#c6a677'] },
  { key: 'celebration', name: 'Celebraci\u00f3n moderna', description: 'Color expresivo, bloques din\u00e1micos y botones visibles.', category: 'graduacion', colors: ['#f9f8ef', '#223b43', '#e16c4b'] },
  { key: 'birthday', name: 'Fiesta con color', description: 'Fotograf\u00eda, fecha y una invitaci\u00f3n alegre para celebrar.', category: 'cumpleanos', colors: ['#fffaf1', '#234951', '#e45f52'] },
  { key: 'baptism', name: 'Un d\u00eda especial', description: 'Portada serena y recorrido pensado para ceremonia y familia.', category: 'bautizo', colors: ['#fafbf7', '#3a594b', '#c47e65'] }
];

type DesignPalette = {
  background: string; foreground: string; accent: string; secondary: string; muted: string;
  headingFont: string; bodyFont: string; button: string; buttonText: string;
};

const PALETTES: Record<string, DesignPalette> = {
  editorial: { background: '#f7f5f1', foreground: '#202d2a', accent: '#dc705b', secondary: '#e9eee9', muted: '#6a706c', headingFont: "'Playfair Display', serif", bodyFont: 'Montserrat, sans-serif', button: '#202d2a', buttonText: '#ffffff' },
  romantic: { background: '#fff8f6', foreground: '#684755', accent: '#7c946e', secondary: '#f3e7e8', muted: '#725f65', headingFont: "'Cormorant Garamond', serif", bodyFont: 'Montserrat, sans-serif', button: '#684755', buttonText: '#ffffff' },
  night: { background: '#191c22', foreground: '#f4e9d4', accent: '#c6a677', secondary: '#30383d', muted: '#d5c8b7', headingFont: 'Cinzel, serif', bodyFont: 'Montserrat, sans-serif', button: '#c6a677', buttonText: '#191c22' },
  celebration: { background: '#f9f8ef', foreground: '#223b43', accent: '#e16c4b', secondary: '#e6efeb', muted: '#556669', headingFont: "'Playfair Display', serif", bodyFont: 'Montserrat, sans-serif', button: '#167b70', buttonText: '#ffffff' },
  birthday: { background: '#fffaf1', foreground: '#234951', accent: '#e45f52', secondary: '#e7f1e8', muted: '#596b68', headingFont: "'Playfair Display', serif", bodyFont: 'Montserrat, sans-serif', button: '#25685e', buttonText: '#ffffff' },
  baptism: { background: '#fafbf7', foreground: '#3a594b', accent: '#c47e65', secondary: '#e6eee7', muted: '#667168', headingFont: "'Cormorant Garamond', serif", bodyFont: 'Montserrat, sans-serif', button: '#3a594b', buttonText: '#ffffff' }
};

function layer(id: string, type: VisualInvitationLayer['type'], text: string, x: number, y: number, width: number, height: number, style: VisualInvitationLayer['style'], extras: Partial<VisualInvitationLayer> = {}): VisualInvitationLayer {
  return { id, type, text, x, y, width, height, style, ...extras };
}

function section(id: string, type: string, title: string, background: string, height: number, layers: VisualInvitationLayer[] = []): VisualInvitationSection {
  return { id, type, title, enabled: true, layout: 'canvas', height, background: { color: background, overlay: 0 }, layers };
}

export function buildCompleteDesign(
  key: string,
  content: InvitationContent,
  event: EventModel | undefined,
  nextId: (prefix: string) => string,
  includeModules = true
): VisualInvitationDesign {
  const variant = PALETTES[key] ? key : 'editorial';
  const palette = PALETTES[variant];
  const coverUrl = content.coverImageUrl || content.galleryItems?.find((item) => item.url)?.url || content.gallery?.find(Boolean) || '';
  const title = content.headline ? '{{invitation.headline}}' : '{{event.title}}';
  const titleStyle: VisualInvitationLayer['style'] = { color: palette.foreground, fontFamily: palette.headingFont, fontSize: 44, fontWeight: 600, lineHeight: 1.08, textAlign: 'center', backgroundColor: 'transparent', padding: 0 };
  const bodyStyle: VisualInvitationLayer['style'] = { color: palette.muted, fontFamily: palette.bodyFont, fontSize: 16, fontWeight: 500, lineHeight: 1.45, textAlign: 'center', backgroundColor: 'transparent', padding: 0 };
  const hero = section(nextId('section'), 'hero', 'Portada', palette.background, 760);
  const add = (type: VisualInvitationLayer['type'], text: string, x: number, y: number, width: number, height: number, style: VisualInvitationLayer['style'], extras: Partial<VisualInvitationLayer> = {}) => {
    hero.layers.push(layer(nextId('layer'), type, text, x, y, width, height, style, extras));
  };
  const image = (x: number, y: number, width: number, height: number, mask: NonNullable<VisualInvitationLayer['style']>['imageMask'] = 'none') => {
    if (coverUrl) add('image', '', x, y, width, height, { objectFit: 'cover', preserveAspectRatio: true, imageMask: mask, borderRadius: 0 }, { url: coverUrl, name: 'Imagen de portada' });
  };
  const rule = (x: number, y: number, width: number) => add('shape', '', x, y, width, .4, { backgroundColor: palette.accent, shapeKind: 'rectangle' }, { name: 'Linea decorativa' });

  if (variant === 'editorial') {
    image(9, 7, 82, 45);
    add('text', 'UNA CELEBRACI\u00d3N ESPECIAL', 12, 54, 76, 5, { ...bodyStyle, color: palette.accent, fontSize: 11, fontWeight: 700, letterSpacing: 2 });
    add('text', title, 10, 61, 80, 19, titleStyle, { name: 'Nombre del evento' });
    rule(42, 83, 16);
  } else if (variant === 'romantic') {
    rule(19, 9, 62);
    image(24, 13, 52, 42, 'arch');
    add('text', 'UN DIA PARA RECORDAR', 12, 59, 76, 5, { ...bodyStyle, color: palette.accent, fontSize: 11, fontWeight: 700, letterSpacing: 2 });
    add('text', title, 10, 67, 80, 18, { ...titleStyle, fontSize: 47 }, { name: 'Nombre del evento' });
  } else if (variant === 'night') {
    image(7, 8, 86, 43);
    rule(12, 57, 76);
    add('text', 'TE ESPERAMOS', 12, 61, 76, 5, { ...bodyStyle, color: palette.accent, fontSize: 11, fontWeight: 700, letterSpacing: 1.5 });
    add('text', title, 10, 69, 80, 16, { ...titleStyle, fontSize: 37 }, { name: 'Nombre del evento' });
    if (event?.date) add('text', '{{event.date}}', 12, 86, 76, 5, { ...bodyStyle, color: palette.foreground, fontSize: 13 });
  } else if (variant === 'birthday') {
    add('shape', '', 0, 0, 100, 9, { backgroundColor: palette.secondary, shapeKind: 'rectangle' }, { name: 'Franja de color' });
    add('text', 'FIESTA DE CUMPLEA\u00d1OS', 11, 10, 78, 6, { ...bodyStyle, color: palette.accent, fontSize: 11, fontWeight: 700, letterSpacing: 1.6 });
    image(12, 19, 76, 36, 'rounded');
    add('text', title, 9, 59, 82, 20, { ...titleStyle, fontSize: 38 }, { name: 'Nombre del evento' });
    rule(35, 81, 30);
    if (event?.date) add('text', '{{event.date}}', 12, 83, 76, 6, { ...bodyStyle, color: palette.foreground, fontSize: 14 });
  } else if (variant === 'baptism') {
    rule(24, 8, 52);
    add('shape', '', 15, 15, 70, 42, { backgroundColor: palette.secondary, shapeKind: 'rectangle', borderRadius: 3 }, { name: 'Marco de portada' });
    image(22, 12, 56, 42, 'arch');
    add('text', 'CELEBRAMOS EL BAUTIZO', 12, 59, 76, 6, { ...bodyStyle, color: palette.accent, fontSize: 11, fontWeight: 700, letterSpacing: 1.2 });
    add('text', title, 9, 67, 82, 18, { ...titleStyle, fontSize: 43 }, { name: 'Nombre del evento' });
    if (event?.date) add('text', '{{event.date}}', 12, 86, 76, 5, { ...bodyStyle, color: palette.muted, fontSize: 13 });
  } else {
    add('shape', '', 0, 0, 44, 56, { backgroundColor: palette.secondary, shapeKind: 'rectangle' }, { name: 'Bloque de color' });
    add('text', 'CELEBREMOS JUNTOS', 8, 22, 36, 7, { ...bodyStyle, color: palette.accent, fontSize: 11, fontWeight: 700, textAlign: 'left', letterSpacing: 1.5 });
    image(50, 10, 43, 47);
    add('text', title, 8, 61, 84, 21, { ...titleStyle, textAlign: 'left', fontSize: 37 }, { name: 'Nombre del evento' });
    rule(8, 85, 25);
  }

  const sections: VisualInvitationSection[] = [hero];
  if (!includeModules) return { version: 1, active: false, mode: 'easy', presentationMode: 'continuous', responsiveMode: 'shared', theme: theme(palette), sections };

  const intro = section(nextId('section'), 'custom', 'Bienvenida', variant === 'night' ? '#252a2e' : palette.secondary, 410);
  const introEyebrow = variant === 'birthday' ? 'NOS VEMOS EN LA FIESTA' : variant === 'baptism' ? 'UN D\u00cdA PARA COMPARTIR' : 'NOS VEMOS PRONTO';
  const introFallback = variant === 'birthday' ? 'Acomp\u00e1\u00f1anos a festejar' : variant === 'baptism' ? 'Celebremos este momento en familia' : 'Acomp\u00e1\u00f1anos a celebrar';
  intro.layers = [
    layer(nextId('layer'), 'text', introEyebrow, 15, 19, 70, 8, { ...bodyStyle, color: palette.accent, fontSize: 11, fontWeight: 700, letterSpacing: 2 }),
    layer(nextId('layer'), 'text', content.message || content.subheadline ? '{{invitation.message}}' : introFallback, 12, 35, 76, 28, { ...titleStyle, fontSize: 35 }, { name: 'Mensaje de bienvenida' })
  ];
  if (event?.date) intro.layers.push(layer(nextId('layer'), 'text', '{{event.date}}', 15, 72, 70, 9, { ...bodyStyle, color: palette.accent, fontSize: 16 }));
  sections.push(intro);

  const settings = content.sectionSettings || {};
  const modules: Array<{ type: string; title: string; show: boolean; height: number }> = [
    { type: 'story', title: content.storyTitle || 'Nuestra historia', show: settings.story !== false && Boolean(content.storyBody), height: 620 },
    { type: 'countdown', title: 'Cuenta regresiva', show: Boolean(event?.date), height: 760 },
    { type: 'locations', title: 'Ubicaci\u00f3n y mapa', show: settings.locations !== false && Boolean(content.locations?.length), height: 760 },
    { type: 'itinerary', title: 'Itinerario', show: settings.itinerary !== false && Boolean(content.itinerary?.length), height: 760 },
    { type: 'dressCode', title: 'C\u00f3digo de vestimenta', show: settings.dressCode !== false && Boolean(content.dressCode || content.dressCodeDescription), height: 760 },
    { type: 'gallery', title: 'Galer\u00eda', show: settings.gallery !== false && Boolean(content.galleryItems?.length || content.gallery?.length), height: 760 },
    { type: 'gifts', title: 'Mesa de regalos', show: (settings.giftRegistry !== false && Boolean(content.giftRegistry?.length)) || (settings.digitalEnvelope !== false && Boolean(content.digitalEnvelope?.clabe || content.digitalEnvelope?.account)), height: 760 },
    { type: 'lodging', title: 'Hospedaje', show: settings.lodging !== false && Boolean(content.lodging?.length), height: 760 },
    { type: 'rsvp', title: 'Confirma tu asistencia', show: settings.rsvp !== false, height: 920 },
    { type: 'album', title: '\u00c1lbum colectivo', show: settings.guestAlbum !== false, height: 760 },
    { type: 'dedications', title: 'Dedicatorias', show: settings.dedications !== false, height: 760 },
    { type: 'songs', title: 'Peticiones al DJ', show: settings.songRequests !== false, height: 760 }
  ];
  const order = variant === 'birthday'
    ? ['countdown', 'locations', 'itinerary', 'gallery', 'rsvp', 'gifts', 'dressCode', 'story', 'album', 'songs', 'dedications', 'lodging']
    : variant === 'baptism'
      ? ['story', 'countdown', 'locations', 'itinerary', 'dressCode', 'gallery', 'rsvp', 'gifts', 'dedications', 'album', 'lodging', 'songs']
      : variant === 'romantic'
    ? ['story', 'countdown', 'gallery', 'locations', 'itinerary', 'dressCode', 'gifts', 'lodging', 'rsvp', 'dedications', 'album', 'songs']
    : variant === 'night'
      ? ['countdown', 'locations', 'itinerary', 'story', 'gallery', 'dressCode', 'gifts', 'lodging', 'rsvp', 'songs', 'album', 'dedications']
      : ['countdown', 'story', 'locations', 'itinerary', 'gallery', 'dressCode', 'gifts', 'lodging', 'rsvp', 'album', 'dedications', 'songs'];
  order.forEach((type) => {
    const module = modules.find((item) => item.type === type);
    if (!module?.show) return;
    const index = sections.length;
    const background = index % 2 ? palette.background : (variant === 'night' ? '#252a2e' : palette.secondary);
    const item = section(nextId('section'), type, module.title, background, module.height);
    item.moduleStyle = { layout: ['itinerary', 'locations', 'gallery'].includes(type) ? 'grid' : 'list', columns: type === 'gallery' ? 3 : 2, alignment: 'center', surface: 'transparent', cardStyle: 'none', gap: 14, showTitle: true };
    sections.push(item);
  });
  if (sections.some((item) => item.type === 'rsvp')) {
    const buttonY = ['night', 'celebration', 'birthday', 'baptism'].includes(variant) ? 91 : 88;
    hero.layers.push(layer(nextId('layer'), 'button', 'Confirmar asistencia', variant === 'celebration' ? 8 : 29, buttonY, 42, 7,
      { backgroundColor: palette.button, color: palette.buttonText, fontFamily: palette.bodyFont, fontSize: 14, fontWeight: 700, textAlign: 'center', borderRadius: variant === 'romantic' ? 30 : 4, padding: 8 },
      { name: 'Ir a RSVP', binding: 'section:rsvp' }));
  }
  return { version: 1, active: true, mode: 'easy', presentationMode: 'continuous', responsiveMode: 'shared', theme: theme(palette), sections };
}

function theme(palette: DesignPalette): NonNullable<VisualInvitationDesign['theme']> {
  return { backgroundColor: palette.background, textColor: palette.foreground, accentColor: palette.accent, headingFont: palette.headingFont, bodyFont: palette.bodyFont, buttonBackgroundColor: palette.button, buttonTextColor: palette.buttonText, buttonStyle: 'solid', buttonRadius: 4 };
}
