import { VisualAccessScreenDesign, VisualInvitationLayer } from './models';

export interface AccessScreenTemplateOption {
  key: string;
  name: string;
  subtitle: string;
  tag: string;
  description: string;
  icon: string;
  previewBg: string;
  previewCardBg: string;
  previewAccent: string;
  previewText: string;
  cardStyle: 'glass' | 'solid' | 'bordered' | 'minimal';
  cardBgColor: string;
  cardOpacity: number;
  cardRadius: number;
  cardShadow: 'soft' | 'elevated' | 'glow' | 'none';
  backgroundType: 'color' | 'gradient' | 'image';
  backgroundColor: string;
  backgroundGradient: string;
  backgroundOverlayOpacity: number;
  backgroundBlur: number;
  backgroundFilter: 'none' | 'golden' | 'cinematic' | 'sepia' | 'warm' | 'moody' | 'emerald' | 'frost' | 'noir';
  backgroundVignette: boolean;
  backgroundEffect: 'none' | 'sparkles' | 'petals' | 'starlight' | 'bokeh' | 'fireflies';
  textColor: string;
  accentColor: string;
  buttonBgColor: string;
  buttonTextColor: string;
  buttonRadius: number;
  headingFont: string;
  bodyFont: string;
  badgeText: string;
  defaultTitle: string;
  defaultSubtitle: string;
  inputLabel: string;
  inputPlaceholder: string;
  pinInputLabel: string;
  pinInputPlaceholder: string;
  buttonText: string;
  selfRegBadgeText: string;
  selfRegTitle: string;
  selfRegSubtitle: string;
  selfRegButtonText: string;
  selfRegLinkText: string;
  selfRegBackLinkText: string;
}

export const ACCESS_SCREEN_TEMPLATES: AccessScreenTemplateOption[] = [
  {
    key: 'gala-imperial',
    name: 'Gala Imperial · Papelería',
    subtitle: 'Marfil crema, doble filete dorado y elegancia clásica',
    tag: 'Boda & Gala',
    description: 'Diseño de alta papelería con doble marco fino en oro antiguo, destellos suaves y botones cápsula.',
    icon: 'sparkles',
    previewBg: 'radial-gradient(ellipse at 50% 25%, #faf6ef 0%, #ede4d4 65%, #dfd1ba 100%)',
    previewCardBg: '#fffdfa',
    previewAccent: '#b8925a',
    previewText: '#2c2421',
    cardStyle: 'bordered',
    cardBgColor: '#fffdfa',
    cardOpacity: 96,
    cardRadius: 22,
    cardShadow: 'elevated',
    backgroundType: 'gradient',
    backgroundColor: '#f6efe4',
    backgroundGradient: 'radial-gradient(ellipse at 50% 25%, #faf6ef 0%, #ede4d4 60%, #dfd1ba 100%)',
    backgroundOverlayOpacity: 15,
    backgroundBlur: 4,
    backgroundFilter: 'golden',
    backgroundVignette: false,
    backgroundEffect: 'sparkles',
    textColor: '#2c2421',
    accentColor: '#b8925a',
    buttonBgColor: '#b8925a',
    buttonTextColor: '#ffffff',
    buttonRadius: 28,
    headingFont: 'Playfair Display',
    bodyFont: 'Montserrat',
    badgeText: '✉ INVITACIÓN EXCLUSIVA ✉',
    defaultTitle: 'Invitación de Gala',
    defaultSubtitle: 'Ingresa tu correo o teléfono registrado para abrir tu sobre digital.',
    inputLabel: 'Correo o teléfono registrado',
    inputPlaceholder: 'invitado@ejemplo.com o 55 0000 0000',
    pinInputLabel: 'NIP de acceso',
    pinInputPlaceholder: 'Ingresa tu clave NIP',
    buttonText: 'ABRIR INVITACIÓN',
    selfRegBadgeText: '✦ SOLICITUD DE ACCESO ✦',
    selfRegTitle: 'Solicitar Invitación',
    selfRegSubtitle: 'Completa tus datos y el anfitrión revisará tu solicitud para enviarte tu pase.',
    selfRegButtonText: 'ENVIAR SOLICITUD',
    selfRegLinkText: '¿No estás en la lista? Solicitar invitación →',
    selfRegBackLinkText: '← Ya tengo invitación, volver al acceso'
  },
  {
    key: 'noir-vip',
    name: 'Noir VIP · Gala Nocturna',
    subtitle: 'Obsidiana profunda, barra metálica dorada y alto contraste',
    tag: 'VIP & Nocturno',
    description: 'Estética de pase exclusivo nocturno con resplandor champagne, polvo de estrellas y líneas afiladas.',
    icon: 'crown',
    previewBg: 'linear-gradient(145deg, #090d16 0%, #162035 55%, #070a10 100%)',
    previewCardBg: '#111726',
    previewAccent: '#d4af37',
    previewText: '#f8f5ee',
    cardStyle: 'bordered',
    cardBgColor: '#111726',
    cardOpacity: 94,
    cardRadius: 14,
    cardShadow: 'glow',
    backgroundType: 'gradient',
    backgroundColor: '#090d16',
    backgroundGradient: 'linear-gradient(145deg, #090d16 0%, #162035 55%, #070a10 100%)',
    backgroundOverlayOpacity: 65,
    backgroundBlur: 6,
    backgroundFilter: 'cinematic',
    backgroundVignette: true,
    backgroundEffect: 'starlight',
    textColor: '#f8f5ee',
    accentColor: '#d4af37',
    buttonBgColor: '#d4af37',
    buttonTextColor: '#090d16',
    buttonRadius: 8,
    headingFont: 'Cinzel',
    bodyFont: 'Montserrat',
    badgeText: '★ ACCESO PRIVADO VIP ★',
    defaultTitle: 'Pase de Gala VIP',
    defaultSubtitle: 'Valida tu registro en lista privada para desbloquear tu pase e itinerario.',
    inputLabel: 'Correo o teléfono de invitado',
    inputPlaceholder: 'tu-correo@ejemplo.com o teléfono',
    pinInputLabel: 'Código NIP VIP',
    pinInputPlaceholder: 'Clave de 4 dígitos',
    buttonText: 'DESBLOQUEAR PASE',
    selfRegBadgeText: '★ ACREDITACIÓN VIP ★',
    selfRegTitle: 'Registro de Invitado',
    selfRegSubtitle: 'Registra tus datos para solicitar tu pase VIP ante los organizadores.',
    selfRegButtonText: 'SOLICITAR ACREDITACIÓN',
    selfRegLinkText: '¿Aún no tienes pase? Solicitar acreditación →',
    selfRegBackLinkText: '← Volver al acceso VIP'
  },
  {
    key: 'atelier-editorial',
    name: 'Atelier Editorial · Vogue',
    subtitle: 'Blanco puro, tinta negra y composición tipo revista',
    tag: 'Minimal & Editorial',
    description: 'Diseño arquitectónico ultra limpio, líneas nítidas en tinta grafito y tipografía editorial de alto impacto.',
    icon: 'shapes',
    previewBg: '#f3f1ed',
    previewCardBg: '#ffffff',
    previewAccent: '#18181b',
    previewText: '#18181b',
    cardStyle: 'solid',
    cardBgColor: '#ffffff',
    cardOpacity: 100,
    cardRadius: 4,
    cardShadow: 'soft',
    backgroundType: 'color',
    backgroundColor: '#f3f1ed',
    backgroundGradient: 'linear-gradient(180deg, #f5f3ef 0%, #ebe7e0 100%)',
    backgroundOverlayOpacity: 0,
    backgroundBlur: 0,
    backgroundFilter: 'none',
    backgroundVignette: false,
    backgroundEffect: 'none',
    textColor: '#18181b',
    accentColor: '#18181b',
    buttonBgColor: '#18181b',
    buttonTextColor: '#ffffff',
    buttonRadius: 4,
    headingFont: 'Cormorant Garamond',
    bodyFont: 'Montserrat',
    badgeText: 'EDICIÓN PRIVADA · RSVP',
    defaultTitle: 'Invitación Personal',
    defaultSubtitle: 'Introduce tu correo o teléfono confirmado para acceder al evento.',
    inputLabel: 'Correo o teléfono',
    inputPlaceholder: 'nombre@correo.com / 55 0000 0000',
    pinInputLabel: 'NIP de verificación',
    pinInputPlaceholder: 'Ingresa tu NIP',
    buttonText: 'INGRESAR',
    selfRegBadgeText: 'LISTA DE INVITADOS',
    selfRegTitle: 'Solicitar Lugar',
    selfRegSubtitle: 'Déjanos tus datos para validar disponibilidad en la lista oficial.',
    selfRegButtonText: 'ENVIAR REGISTRO',
    selfRegLinkText: '¿No apareces en lista? Solicitar lugar →',
    selfRegBackLinkText: '← Volver al ingreso'
  },
  {
    key: 'cristal-botanico',
    name: 'Jardín Cristal · Esmeralda',
    subtitle: 'Glassmorphism translúcido, bosque esmeralda y oro rosado',
    tag: 'Romántico & Moderno',
    description: 'Tarjeta efecto cristal esmerilado sobre fondo esmeralda profundo con luciérnagas y acentos champagne.',
    icon: 'flower-2',
    previewBg: 'linear-gradient(135deg, #0c2922 0%, #1a473a 50%, #091d18 100%)',
    previewCardBg: 'rgba(255, 255, 255, 0.12)',
    previewAccent: '#e5c1a0',
    previewText: '#f7f4ee',
    cardStyle: 'glass',
    cardBgColor: '#13352c',
    cardOpacity: 86,
    cardRadius: 28,
    cardShadow: 'glow',
    backgroundType: 'gradient',
    backgroundColor: '#0c2922',
    backgroundGradient: 'linear-gradient(135deg, #0c2922 0%, #1a473a 50%, #091d18 100%)',
    backgroundOverlayOpacity: 50,
    backgroundBlur: 12,
    backgroundFilter: 'emerald',
    backgroundVignette: true,
    backgroundEffect: 'fireflies',
    textColor: '#f7f4ee',
    accentColor: '#e5c1a0',
    buttonBgColor: '#e5c1a0',
    buttonTextColor: '#0c2922',
    buttonRadius: 24,
    headingFont: 'Playfair Display',
    bodyFont: 'Montserrat',
    badgeText: '🌿 ACCESO RESERVADO 🌿',
    defaultTitle: 'Nuestra Celebración',
    defaultSubtitle: 'Confirma tu correo o teléfono registrado para descubrir todos los detalles.',
    inputLabel: 'Correo o teléfono registrado',
    inputPlaceholder: 'correo@ejemplo.com o WhatsApp',
    pinInputLabel: 'NIP personal',
    pinInputPlaceholder: 'Ingresa tu NIP',
    buttonText: 'ENTRAR AL EVENTO',
    selfRegBadgeText: '🌿 LISTA DE ESPERA 🌿',
    selfRegTitle: 'Únete a la Celebración',
    selfRegSubtitle: 'Compártenos tus datos para solicitar tu invitación personal.',
    selfRegButtonText: 'SOLICITAR ACCESO',
    selfRegLinkText: '¿No estás en la lista? Solicitar acceso →',
    selfRegBackLinkText: '← Ya estoy en la lista, volver'
  }
];

export function getAccessScreenTemplateByKey(key?: string): AccessScreenTemplateOption | undefined {
  if (!key) return undefined;
  return ACCESS_SCREEN_TEMPLATES.find((t) => t.key === key);
}

export function buildAccessTemplateLayers(
  templateKey: string,
  acc: VisualAccessScreenDesign,
  eventTitle?: string
): VisualInvitationLayer[] {
  const tpl = getAccessScreenTemplateByKey(templateKey) || ACCESS_SCREEN_TEMPLATES[0];
  const isDark = tpl.key === 'noir-vip' || tpl.key === 'cristal-botanico';
  const prefix = `tpl-${tpl.key}`;
  let z = 0;

  const layers: VisualInvitationLayer[] = [];

  // Visual theme tokens per template
  const cardBg =
    tpl.key === 'cristal-botanico'
      ? 'rgba(255, 255, 255, 0.11)'
      : tpl.key === 'noir-vip'
        ? 'rgba(17, 23, 38, 0.94)'
        : tpl.key === 'atelier-editorial'
          ? '#ffffff'
          : 'rgba(255, 253, 250, 0.96)';

  const cardBorder =
    tpl.key === 'atelier-editorial'
      ? '#18181b'
      : tpl.key === 'cristal-botanico'
        ? 'rgba(229, 193, 160, 0.45)'
        : tpl.key === 'noir-vip'
          ? 'rgba(212, 175, 55, 0.55)'
          : 'rgba(184, 146, 90, 0.55)';

  const cardShadow =
    tpl.key === 'atelier-editorial'
      ? '6px 6px 0px rgba(24, 24, 27, 0.10)'
      : tpl.key === 'noir-vip'
        ? '0 24px 60px rgba(0, 0, 0, 0.72), 0 0 32px rgba(212, 175, 55, 0.18)'
        : tpl.key === 'cristal-botanico'
          ? '0 24px 55px rgba(0, 0, 0, 0.45), 0 0 28px rgba(229, 193, 160, 0.16)'
          : '0 20px 50px rgba(44, 36, 33, 0.14)';

  const inputBg =
    tpl.key === 'noir-vip'
      ? 'rgba(255, 255, 255, 0.06)'
      : tpl.key === 'cristal-botanico'
        ? 'rgba(255, 255, 255, 0.10)'
        : tpl.key === 'atelier-editorial'
          ? '#ffffff'
          : 'rgba(246, 239, 228, 0.72)';

  const inputBorder =
    tpl.key === 'noir-vip'
      ? 'rgba(212, 175, 55, 0.35)'
      : tpl.key === 'cristal-botanico'
        ? 'rgba(229, 193, 160, 0.35)'
        : tpl.key === 'atelier-editorial'
          ? '#d4d4d8'
          : 'rgba(184, 146, 90, 0.42)';

  const inputRadius =
    tpl.key === 'atelier-editorial' ? 4 : tpl.key === 'noir-vip' ? 8 : tpl.key === 'cristal-botanico' ? 16 : 12;

  // ── SHARED CARD CONTAINER (renders in both Login and Self-Registration) ──
  layers.push({
    id: `${prefix}-card`,
    name: 'Tarjeta Contenedora',
    type: 'shape',
    text: '',
    x: 6,
    y: 4,
    width: 88,
    height: 92,
    zIndex: ++z,
    binding: 'access.card',
    style: {
      backgroundColor: cardBg,
      borderColor: cardBorder,
      borderWidth: tpl.key === 'atelier-editorial' ? 1.5 : 1.5,
      borderStyle: 'solid',
      borderRadius: tpl.cardRadius,
      boxShadow: cardShadow
    }
  });

  // ── TEMPLATE-SPECIFIC SHARED ARCHITECTURAL ACCENTS ──
  if (tpl.key === 'gala-imperial') {
    // Inner gold hairline frame
    layers.push({
      id: `${prefix}-inner-frame`,
      name: 'Marco Interior Dorado',
      type: 'shape',
      text: '',
      x: 8.5,
      y: 5.5,
      width: 83,
      height: 89,
      zIndex: ++z,
      style: {
        backgroundColor: 'transparent',
        borderColor: 'rgba(184, 146, 90, 0.35)',
        borderWidth: 1,
        borderStyle: 'solid',
        borderRadius: 17
      }
    });
  } else if (tpl.key === 'noir-vip') {
    // Metallic gold top ribbon bar
    layers.push({
      id: `${prefix}-top-bar`,
      name: 'Barra Dorada Superior',
      type: 'shape',
      text: '',
      x: 6,
      y: 4,
      width: 88,
      height: 1.4,
      zIndex: ++z,
      style: {
        backgroundColor: '#d4af37',
        borderRadius: 14
      }
    });
  } else if (tpl.key === 'atelier-editorial') {
    // Crisp editorial top ink rule
    layers.push({
      id: `${prefix}-top-rule`,
      name: 'Filete Editorial Superior',
      type: 'shape',
      text: '',
      x: 12,
      y: 6.5,
      width: 76,
      height: 0.3,
      zIndex: ++z,
      style: {
        backgroundColor: '#18181b',
        borderRadius: 0
      }
    });
  } else if (tpl.key === 'cristal-botanico') {
    // Subtle botanical glow pill at top
    layers.push({
      id: `${prefix}-top-glow`,
      name: 'Acento Botánico Superior',
      type: 'shape',
      text: '',
      x: 34,
      y: 5.8,
      width: 32,
      height: 0.6,
      zIndex: ++z,
      style: {
        backgroundColor: 'rgba(229, 193, 160, 0.65)',
        borderRadius: 99
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // VIEW 1: LOGIN / PANTALLA DE ACCESO (access.*)
  // ═══════════════════════════════════════════════════════════════════════
  const loginTitle = acc.title || eventTitle || tpl.defaultTitle;
  const loginSubtitle = acc.subtitle || tpl.defaultSubtitle;
  const loginBadge = acc.badgeText || tpl.badgeText;
  const loginButton = acc.buttonText || tpl.buttonText;
  const contactLabel = acc.inputLabel || tpl.inputLabel;
  const contactPlaceholder = acc.inputPlaceholder || tpl.inputPlaceholder;
  const pinLabel = acc.pinInputLabel || tpl.pinInputLabel;
  const pinPlaceholder = acc.pinInputPlaceholder || tpl.pinInputPlaceholder;

  layers.push({
    id: `${prefix}-access-badge`,
    name: 'Insignia de Acceso',
    type: 'text',
    text: loginBadge,
    x: 14,
    y: 9.5,
    width: 72,
    height: 4.5,
    zIndex: ++z,
    binding: 'access.badge',
    style: {
      color: tpl.accentColor,
      fontFamily: tpl.bodyFont,
      fontWeight: 700,
      fontSize: tpl.key === 'atelier-editorial' ? 9.5 : 10,
      letterSpacing: tpl.key === 'atelier-editorial' ? 3 : 2,
      textAlign: 'center',
      backgroundColor:
        tpl.key === 'atelier-editorial'
          ? 'transparent'
          : isDark
            ? 'rgba(255, 255, 255, 0.06)'
            : 'rgba(184, 146, 90, 0.08)',
      borderColor: tpl.key === 'atelier-editorial' ? 'transparent' : tpl.accentColor,
      borderWidth: tpl.key === 'atelier-editorial' ? 0 : 1,
      borderStyle: 'solid',
      borderRadius: tpl.key === 'noir-vip' ? 6 : 20
    }
  });

  layers.push({
    id: `${prefix}-access-title`,
    name: 'Título de Acceso',
    type: 'text',
    text: loginTitle,
    x: 11,
    y: 16,
    width: 78,
    height: 10.5,
    zIndex: ++z,
    binding: 'access.title',
    style: {
      color: tpl.textColor,
      fontFamily: tpl.headingFont,
      fontWeight: tpl.key === 'atelier-editorial' ? 600 : 700,
      fontSize: tpl.key === 'atelier-editorial' ? 30 : tpl.key === 'noir-vip' ? 24 : 26,
      letterSpacing: tpl.key === 'noir-vip' ? 2.2 : 0.8,
      textAlign: 'center',
      lineHeight: 1.18
    }
  });

  layers.push({
    id: `${prefix}-access-divider`,
    name: 'Divisor Decorativo',
    type: 'shape',
    text: '',
    x: 38,
    y: 28,
    width: 24,
    height: 0.35,
    zIndex: ++z,
    binding: 'access.divider',
    style: {
      backgroundColor: tpl.accentColor,
      opacity: 0.55,
      borderRadius: 4
    }
  });

  layers.push({
    id: `${prefix}-access-subtitle`,
    name: 'Subtítulo de Acceso',
    type: 'text',
    text: loginSubtitle,
    x: 13,
    y: 30,
    width: 74,
    height: 7.5,
    zIndex: ++z,
    binding: 'access.subtitle',
    style: {
      color: isDark ? 'rgba(248, 245, 238, 0.78)' : 'rgba(44, 36, 33, 0.76)',
      fontFamily: tpl.bodyFont,
      fontWeight: 400,
      fontSize: 12.5,
      lineHeight: 1.45,
      textAlign: 'center'
    }
  });

  layers.push({
    id: `${prefix}-access-contact`,
    name: 'Campo de Contacto',
    type: 'field',
    text: contactLabel,
    placeholder: contactPlaceholder,
    x: 13,
    y: 40,
    width: 74,
    height: 10,
    zIndex: ++z,
    binding: 'access.contact',
    style: {
      color: tpl.textColor,
      fontFamily: tpl.bodyFont,
      fontSize: 13,
      backgroundColor: inputBg,
      borderColor: inputBorder,
      borderWidth: 1,
      borderStyle: 'solid',
      borderRadius: inputRadius,
      textAlign: 'left',
      padding: 12
    }
  });

  layers.push({
    id: `${prefix}-access-pin`,
    name: 'Campo de NIP',
    type: 'field',
    text: pinLabel,
    placeholder: pinPlaceholder,
    x: 13,
    y: 52,
    width: 74,
    height: 10,
    zIndex: ++z,
    binding: 'access.pin',
    style: {
      color: tpl.textColor,
      fontFamily: tpl.bodyFont,
      fontSize: 13,
      backgroundColor: inputBg,
      borderColor: inputBorder,
      borderWidth: 1,
      borderStyle: 'solid',
      borderRadius: inputRadius,
      textAlign: 'left',
      padding: 12
    }
  });

  layers.push({
    id: `${prefix}-access-submit`,
    name: 'Botón de Ingreso',
    type: 'button',
    text: loginButton,
    x: 13,
    y: 65.5,
    width: 74,
    height: 8.2,
    zIndex: ++z,
    binding: 'access.submit',
    style: {
      color: tpl.buttonTextColor,
      fontFamily: tpl.bodyFont,
      fontWeight: 700,
      fontSize: 13,
      letterSpacing: 1.4,
      backgroundColor: tpl.buttonBgColor,
      borderRadius: tpl.buttonRadius,
      boxShadow: tpl.key === 'atelier-editorial' ? 'none' : '0 10px 24px rgba(0, 0, 0, 0.22)',
      textAlign: 'center'
    }
  });

  layers.push({
    id: `${prefix}-access-selfreg-link`,
    name: 'Enlace Auto-registro',
    type: 'text',
    text: tpl.selfRegLinkText,
    x: 12,
    y: 77,
    width: 76,
    height: 4.5,
    zIndex: ++z,
    binding: 'access.selfRegLink',
    style: {
      color: tpl.accentColor,
      fontFamily: tpl.bodyFont,
      fontSize: 11.5,
      fontWeight: 600,
      textAlign: 'center'
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // VIEW 2: AUTO-REGISTRO / SOLICITUD DE INVITACIÓN (selfReg.*)
  // ═══════════════════════════════════════════════════════════════════════
  const selfRegLayers = buildSelfRegTemplateLayers(tpl.key, acc, z);
  layers.push(...selfRegLayers);

  return layers;
}

export function buildSelfRegTemplateLayers(
  templateKey: string,
  acc: VisualAccessScreenDesign,
  startZ = 20
): VisualInvitationLayer[] {
  const tpl = getAccessScreenTemplateByKey(templateKey) || ACCESS_SCREEN_TEMPLATES[0];
  const isDark = tpl.key === 'noir-vip' || tpl.key === 'cristal-botanico';
  const prefix = `tpl-${tpl.key}`;
  let z = startZ;

  const inputBg =
    tpl.key === 'noir-vip'
      ? 'rgba(255, 255, 255, 0.06)'
      : tpl.key === 'cristal-botanico'
        ? 'rgba(255, 255, 255, 0.10)'
        : tpl.key === 'atelier-editorial'
          ? '#ffffff'
          : 'rgba(246, 239, 228, 0.72)';

  const inputBorder =
    tpl.key === 'noir-vip'
      ? 'rgba(212, 175, 55, 0.35)'
      : tpl.key === 'cristal-botanico'
        ? 'rgba(229, 193, 160, 0.35)'
        : tpl.key === 'atelier-editorial'
          ? '#d4d4d8'
          : 'rgba(184, 146, 90, 0.42)';

  const inputRadius =
    tpl.key === 'atelier-editorial' ? 4 : tpl.key === 'noir-vip' ? 8 : tpl.key === 'cristal-botanico' ? 16 : 12;

  const fieldStyle = {
    color: tpl.textColor,
    fontFamily: tpl.bodyFont,
    fontSize: 12.5,
    backgroundColor: inputBg,
    borderColor: inputBorder,
    borderWidth: 1,
    borderStyle: 'solid' as const,
    borderRadius: inputRadius,
    textAlign: 'left' as const,
    padding: 10
  };

  const regTitle = acc.selfRegTitle || tpl.selfRegTitle;
  const regSubtitle = acc.selfRegSubtitle || tpl.selfRegSubtitle;
  const regButton = acc.selfRegButtonText || tpl.selfRegButtonText;

  return [
    {
      id: `${prefix}-selfreg-badge`,
      name: 'Insignia Auto-registro',
      type: 'text',
      text: tpl.selfRegBadgeText,
      x: 16,
      y: 7.5,
      width: 68,
      height: 4,
      zIndex: ++z,
      binding: 'selfReg.badge',
      style: {
        color: tpl.accentColor,
        fontFamily: tpl.bodyFont,
        fontWeight: 700,
        fontSize: 9.5,
        letterSpacing: 2,
        textAlign: 'center',
        backgroundColor:
          tpl.key === 'atelier-editorial'
            ? 'transparent'
            : isDark
              ? 'rgba(255, 255, 255, 0.06)'
              : 'rgba(184, 146, 90, 0.08)',
        borderColor: tpl.key === 'atelier-editorial' ? 'transparent' : tpl.accentColor,
        borderWidth: tpl.key === 'atelier-editorial' ? 0 : 1,
        borderStyle: 'solid',
        borderRadius: tpl.key === 'noir-vip' ? 6 : 20
      }
    },
    {
      id: `${prefix}-selfreg-title`,
      name: 'Título Auto-registro',
      type: 'text',
      text: regTitle,
      x: 11,
      y: 12.8,
      width: 78,
      height: 7.2,
      zIndex: ++z,
      binding: 'selfReg.title',
      style: {
        color: tpl.textColor,
        fontFamily: tpl.headingFont,
        fontWeight: 700,
        fontSize: tpl.key === 'atelier-editorial' ? 25 : 22,
        letterSpacing: tpl.key === 'noir-vip' ? 1.8 : 0.6,
        textAlign: 'center',
        lineHeight: 1.15
      }
    },
    {
      id: `${prefix}-selfreg-subtitle`,
      name: 'Subtítulo Auto-registro',
      type: 'text',
      text: regSubtitle,
      x: 13,
      y: 20.5,
      width: 74,
      height: 6,
      zIndex: ++z,
      binding: 'selfReg.subtitle',
      style: {
        color: isDark ? 'rgba(248, 245, 238, 0.76)' : 'rgba(44, 36, 33, 0.74)',
        fontFamily: tpl.bodyFont,
        fontWeight: 400,
        fontSize: 11.5,
        lineHeight: 1.35,
        textAlign: 'center'
      }
    },
    {
      id: `${prefix}-selfreg-name`,
      name: 'Campo Nombre Completo',
      type: 'field',
      text: 'Nombre completo',
      placeholder: 'Ej. María González',
      x: 13,
      y: 28,
      width: 74,
      height: 9.2,
      zIndex: ++z,
      binding: 'selfReg.name',
      style: { ...fieldStyle }
    },
    {
      id: `${prefix}-selfreg-email`,
      name: 'Campo Correo Electrónico',
      type: 'field',
      text: 'Correo electrónico',
      placeholder: 'tu-correo@ejemplo.com',
      x: 13,
      y: 39,
      width: 74,
      height: 9.2,
      zIndex: ++z,
      binding: 'selfReg.email',
      style: { ...fieldStyle }
    },
    {
      id: `${prefix}-selfreg-phone`,
      name: 'Campo Teléfono / WhatsApp',
      type: 'field',
      text: 'Teléfono / WhatsApp',
      placeholder: '55 0000 0000',
      x: 13,
      y: 50,
      width: 74,
      height: 9.2,
      zIndex: ++z,
      binding: 'selfReg.phone',
      style: { ...fieldStyle }
    },
    {
      id: `${prefix}-selfreg-companions`,
      name: 'Selector de Pases / Acompañantes',
      type: 'field',
      text: 'Número de pases',
      placeholder: '1 pase (Solo yo)',
      x: 13,
      y: 61,
      width: 74,
      height: 9.2,
      zIndex: ++z,
      binding: 'selfReg.companions',
      style: { ...fieldStyle }
    },
    {
      id: `${prefix}-selfreg-submit`,
      name: 'Botón Enviar Solicitud',
      type: 'button',
      text: regButton,
      x: 13,
      y: 73,
      width: 74,
      height: 7.8,
      zIndex: ++z,
      binding: 'selfReg.submit',
      style: {
        color: tpl.buttonTextColor,
        fontFamily: tpl.bodyFont,
        fontWeight: 700,
        fontSize: 12.5,
        letterSpacing: 1.3,
        backgroundColor: tpl.buttonBgColor,
        borderRadius: tpl.buttonRadius,
        boxShadow: tpl.key === 'atelier-editorial' ? 'none' : '0 10px 24px rgba(0, 0, 0, 0.22)',
        textAlign: 'center'
      }
    },
    {
      id: `${prefix}-selfreg-back`,
      name: 'Enlace Volver al Acceso',
      type: 'text',
      text: tpl.selfRegBackLinkText,
      x: 13,
      y: 83.5,
      width: 74,
      height: 4.5,
      zIndex: ++z,
      binding: 'selfReg.backLink',
      style: {
        color: tpl.accentColor,
        fontFamily: tpl.bodyFont,
        fontSize: 11,
        fontWeight: 600,
        textAlign: 'center'
      }
    }
  ];
}
