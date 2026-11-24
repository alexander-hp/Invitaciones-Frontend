import { VisualAccessScreenDesign, VisualInvitationLayer } from './models';

export interface TemplateAccessScreenTheme {
  backgroundType: 'color' | 'gradient' | 'image';
  backgroundColor: string;
  backgroundGradient?: string;
  backgroundImageUrl?: string;
  backgroundOverlayOpacity: number;
  backgroundBlur: number;
  backgroundFilter?: 'none' | 'cinematic' | 'golden' | 'sepia' | 'vintage' | 'moody' | 'emerald' | 'frost' | 'warm' | 'noir';
  backgroundVignette?: boolean;
  backgroundEffect?: 'none' | 'sparkles' | 'petals' | 'starlight' | 'bokeh' | 'fireflies';
  cardStyle: 'glass' | 'solid' | 'minimal' | 'bordered';
  cardBgColor: string;
  cardOpacity: number;
  cardRadius: number;
  cardShadow: 'none' | 'soft' | 'elevated' | 'glow';
  cardBorder: string;
  cardBorderGlow?: string;
  primaryColor: string;
  textColor: string;
  accentColor: string;
  inputBgColor: string;
  inputBorderColor: string;
  inputTextColor: string;
  inputPlaceholderColor: string;
  inputFocusBorderColor: string;
  buttonBgColor: string;
  buttonTextColor: string;
  buttonRadius: number;
  headingFont: string;
  bodyFont: string;
}

export interface TemplateAccessScreenTexts {
  badgeText: string;
  defaultTitle: string;
  defaultSubtitle: string;
  inputLabel: string;
  inputPlaceholder: string;
  pinInputLabel: string;
  pinInputPlaceholder: string;
  buttonText: string;
  selfRegTitle: string;
  selfRegSubtitle: string;
  selfRegButtonText: string;
}

export interface TemplateAccessScreenDecorations {
  crestSvg: string;
  topOrnamentSvg?: string;
  bottomOrnamentSvg?: string;
  frameAssetUrl?: string;
  specialEffect?: 'sparkles' | 'petals' | 'confetti' | 'lanterns' | 'starlight' | 'none';
}

export interface TemplateAccessScreenPreset {
  templateId: string;
  aliases: string[];
  name: string;
  theme: TemplateAccessScreenTheme;
  texts: TemplateAccessScreenTexts;
  decorations: TemplateAccessScreenDecorations;
  buildLayers: (acc: VisualAccessScreenDesign, eventTitle?: string) => VisualInvitationLayer[];
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG ASSETS & CRESTS TAILORED FOR EACH TEMPLATE
// ─────────────────────────────────────────────────────────────────────────────

const CREST_ENVELOPE = `<svg viewBox="0 0 72 72" width="56" height="56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="36" cy="36" r="32" fill="url(#envGoldGrad)" stroke="#c59b6c" stroke-width="1.5" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.15))"/>
  <circle cx="36" cy="36" r="28" stroke="rgba(255,255,255,0.6)" stroke-width="1" stroke-dasharray="2 3"/>
  <path d="M22 28h28v18H22z" fill="#f8f5f0" rx="3"/>
  <path d="M22 28l14 11 14-11" stroke="#c59b6c" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="36" cy="39" r="4.5" fill="#c59b6c"/>
  <path d="M34.5 38.5l1.5 1.5 2.5-2.5" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
  <defs>
    <radialGradient id="envGoldGrad" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#fff8ed"/>
      <stop offset="70%" stop-color="#eed8be"/>
      <stop offset="100%" stop-color="#d9bb93"/>
    </radialGradient>
  </defs>
</svg>`;

const CREST_EDITORIAL_LAUREL = `<svg viewBox="0 0 72 72" width="56" height="56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="36" cy="36" r="32" fill="#ffffff" stroke="#b38e5d" stroke-width="1.2"/>
  <circle cx="36" cy="36" r="29" stroke="rgba(179,142,93,0.3)" stroke-width="0.8"/>
  <path d="M26 44c-4-6-3-14 2-19m18 19c4-6 3-14-2-19" stroke="#b38e5d" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M23 37c2-1 4-1 5 1m-5-8c2-1 4 0 4 2m17 5c-2-1-4-1-5 1m5-8c-2-1-4 0-4 2" stroke="#b38e5d" stroke-width="1.2" stroke-linecap="round"/>
  <text x="36" y="42" font-family="'Cinzel', serif" font-size="18" font-weight="700" fill="#2c2421" text-anchor="middle">V</text>
</svg>`;

const CREST_MODERN_CRYSTAL = `<svg viewBox="0 0 72 72" width="56" height="56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <polygon points="36,8 60,22 60,50 36,64 12,50 12,22" fill="rgba(56,189,248,0.08)" stroke="#38bdf8" stroke-width="1.5"/>
  <polygon points="36,16 52,26 52,46 36,56 20,46 20,26" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
  <path d="M36 8v56M12 22l48 28M12 50l48-28" stroke="rgba(56,189,248,0.25)" stroke-width="1"/>
  <circle cx="36" cy="36" r="5" fill="#38bdf8" filter="drop-shadow(0 0 8px #38bdf8)"/>
</svg>`;

const CREST_STORY_HEART = `<svg viewBox="0 0 72 72" width="56" height="56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="36" cy="36" r="32" fill="#fdf6f0" stroke="#d19589" stroke-width="1.5"/>
  <circle cx="36" cy="36" r="28" stroke="rgba(209,149,137,0.3)" stroke-width="1" stroke-dasharray="3 3"/>
  <path d="M36 47s-13-8-13-16a7.5 7.5 0 0 1 13-4.8A7.5 7.5 0 0 1 49 31c0 8-13 16-13 16z" fill="#d19589" stroke="#b37d6e" stroke-width="1"/>
  <path d="M33 30a3 3 0 0 1 3-3" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round"/>
</svg>`;

const CREST_BLACK_TIE = `<svg viewBox="0 0 72 72" width="56" height="56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="8" width="56" height="56" rx="12" fill="#1c1b1a" stroke="#c59b6c" stroke-width="1.5"/>
  <rect x="12" y="12" width="48" height="48" rx="8" stroke="rgba(197,155,108,0.3)" stroke-width="0.8"/>
  <path d="M26 28h20l-10 16-10-16z" fill="none" stroke="#c59b6c" stroke-width="1.5"/>
  <circle cx="36" cy="44" r="3" fill="#c59b6c"/>
  <path d="M28 48h16" stroke="#c59b6c" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

const CREST_CARDS_COPPER = `<svg viewBox="0 0 72 72" width="56" height="56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="36" cy="36" r="32" fill="#2a201e" stroke="#e0a98b" stroke-width="1.5"/>
  <rect x="22" y="24" width="22" height="28" rx="4" fill="rgba(224,169,139,0.15)" stroke="#e0a98b" stroke-width="1.2"/>
  <rect x="28" y="20" width="22" height="28" rx="4" fill="#2a201e" stroke="#e0a98b" stroke-width="1.5"/>
  <path d="M35 30l4 4-4 4" stroke="#e0a98b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const CREST_CATHEDRAL_ARCH = `<svg viewBox="0 0 72 72" width="56" height="56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M36 8C24 20 18 32 18 64h36C54 32 48 20 36 8z" fill="rgba(223,186,135,0.1)" stroke="#dfba87" stroke-width="1.6"/>
  <circle cx="36" cy="30" r="9" stroke="#dfba87" stroke-width="1.2"/>
  <path d="M36 21v18M27 30h18M30 24l12 12M42 24L30 36" stroke="rgba(223,186,135,0.4)" stroke-width="0.8"/>
  <path d="M36 43v15M30 50h12" stroke="#dfba87" stroke-width="1.4" stroke-linecap="round"/>
</svg>`;

const CREST_MAISON_DORE = `<svg viewBox="0 0 72 72" width="56" height="56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="36" cy="36" r="32" fill="#1b0e13" stroke="#d4af37" stroke-width="1.8"/>
  <circle cx="36" cy="36" r="28" stroke="rgba(212,175,55,0.4)" stroke-width="1" stroke-dasharray="3 3"/>
  <path d="M36 18l3 5 5 1-4 4 1 5-5-3-5 3 1-5-4-4 5-1 3-5z" fill="#d4af37"/>
  <text x="36" y="47" font-family="'Playfair Display', serif" font-size="20" font-weight="700" fill="#d4af37" text-anchor="middle">MD</text>
</svg>`;

const CREST_WEDDING_RINGS = `<svg viewBox="0 0 72 72" width="56" height="56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="36" cy="36" r="32" fill="#faf7f2" stroke="#c59b6c" stroke-width="1.6"/>
  <circle cx="30" cy="38" r="11" stroke="#c59b6c" stroke-width="2.2"/>
  <circle cx="42" cy="38" r="11" stroke="#d9b68a" stroke-width="2.2"/>
  <polygon points="30,22 32,25 28,25" fill="#c59b6c"/>
  <circle cx="30" cy="20" r="2" fill="#c59b6c"/>
</svg>`;

const CREST_XV_TIARA = `<svg viewBox="0 0 72 72" width="56" height="56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="36" cy="36" r="32" fill="#2d142a" stroke="#b76e79" stroke-width="1.6"/>
  <path d="M18 45l4-18 8 10 6-15 6 15 8-10 4 18H18z" fill="rgba(183,110,121,0.2)" stroke="#b76e79" stroke-width="1.8" stroke-linejoin="round"/>
  <circle cx="36" cy="20" r="2.5" fill="#fceef1" stroke="#b76e79" stroke-width="1"/>
  <circle cx="26" cy="26" r="2" fill="#fceef1" stroke="#b76e79" stroke-width="1"/>
  <circle cx="46" cy="26" r="2" fill="#fceef1" stroke="#b76e79" stroke-width="1"/>
  <text x="36" y="43" font-family="'Great Vibes', cursive" font-size="14" fill="#fceef1" text-anchor="middle">15</text>
</svg>`;

const CREST_GRADUATION_CAP = `<svg viewBox="0 0 72 72" width="56" height="56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="36" cy="36" r="32" fill="#0d1f38" stroke="#d97706" stroke-width="1.6"/>
  <path d="M16 32l20-9 20 9-20 9-20-9z" fill="rgba(217,119,6,0.2)" stroke="#d97706" stroke-width="2" stroke-linejoin="round"/>
  <path d="M23 36v10c0 5 6 9 13 9s13-4 13-9V36" stroke="#d97706" stroke-width="1.6"/>
  <path d="M52 32v15c0 1.5 1 2.5 2 2.5s2-1 2-2.5V32" stroke="#d97706" stroke-width="1.4"/>
</svg>`;

const CREST_BIRTHDAY_CAKE = `<svg viewBox="0 0 72 72" width="56" height="56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="36" cy="36" r="32" fill="#251230" stroke="#ec4899" stroke-width="1.6"/>
  <rect x="20" y="38" width="32" height="16" rx="3" fill="rgba(236,72,153,0.2)" stroke="#ec4899" stroke-width="1.6"/>
  <rect x="25" y="29" width="22" height="10" rx="2" fill="rgba(245,158,11,0.2)" stroke="#f59e0b" stroke-width="1.4"/>
  <path d="M36 29v-6M31 29v-4M41 29v-4" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="36" cy="20" r="1.5" fill="#f59e0b"/>
  <circle cx="31" cy="22" r="1.2" fill="#ec4899"/>
  <circle cx="41" cy="22" r="1.2" fill="#ec4899"/>
</svg>`;

const CREST_BAUTIZO_DOVE = `<svg viewBox="0 0 72 72" width="56" height="56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="36" cy="36" r="32" fill="#f0f9ff" stroke="#d4af37" stroke-width="1.6"/>
  <path d="M24 38c4-10 14-16 26-14-2 6-6 10-12 12 3 5 4 8 2 10-5 0-9-3-12-6-3 0-5-1-4-2z" fill="#0284c7" fill-opacity="0.15" stroke="#0284c7" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M36 26v22M29 33h14" stroke="#d4af37" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;

const CREST_OTRO_DIAMOND = `<svg viewBox="0 0 72 72" width="56" height="56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="36" cy="36" r="32" fill="#0f261f" stroke="#10b981" stroke-width="1.6"/>
  <polygon points="24,26 48,26 56,36 36,54 16,36" fill="rgba(16,185,129,0.15)" stroke="#10b981" stroke-width="1.8" stroke-linejoin="round"/>
  <path d="M24 26l12 28 12-28M16 36h40M30 26l6 10 6-10" stroke="#10b981" stroke-width="1.2"/>
</svg>`;

const CREST_LANTERN = `<svg viewBox="0 0 72 72" width="56" height="56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="36" cy="36" r="32" fill="#1b2820" stroke="#c8aa6e" stroke-width="1.6"/>
  <path d="M30 18h12M26 24h20v24H26z" stroke="#c8aa6e" stroke-width="1.6"/>
  <path d="M26 24l5-6h10l5 6" stroke="#c8aa6e" stroke-width="1.4"/>
  <circle cx="36" cy="36" r="5" fill="#fef08a" filter="drop-shadow(0 0 6px #fde047)"/>
  <path d="M30 48l6 6 6-6" stroke="#c8aa6e" stroke-width="1.4"/>
</svg>`;

const CREST_THEATER_MASKS = `<svg viewBox="0 0 72 72" width="56" height="56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="36" cy="36" r="32" fill="#30070c" stroke="#eab308" stroke-width="1.6"/>
  <path d="M20 28c0-8 6-12 12-12s12 4 12 12v10c0 6-6 10-12 10s-12-4-12-10V28z" stroke="#eab308" stroke-width="1.6" fill="rgba(234,179,8,0.1)"/>
  <circle cx="28" cy="27" r="2" fill="#eab308"/>
  <circle cx="36" cy="27" r="2" fill="#eab308"/>
  <path d="M27 38c2 3 8 3 10 0" stroke="#eab308" stroke-width="1.4" stroke-linecap="round"/>
  <path d="M38 32c3-4 8-4 11 0v8c0 4-4 7-9 7" stroke="#eab308" stroke-width="1.2" stroke-dasharray="2 2"/>
</svg>`;

const CREST_COMO_VILLA = `<svg viewBox="0 0 72 72" width="56" height="56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="36" cy="36" r="32" fill="#fcf6ef" stroke="#c86d51" stroke-width="1.6"/>
  <path d="M22 46V32l14-8 14 8v14H22z" fill="rgba(200,109,81,0.15)" stroke="#c86d51" stroke-width="1.5"/>
  <rect x="33" y="38" width="6" height="8" rx="3" stroke="#c86d51" stroke-width="1.2"/>
  <path d="M18 48h36" stroke="#c86d51" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="27" cy="36" r="1.5" fill="#556b2f"/>
  <circle cx="45" cy="36" r="1.5" fill="#556b2f"/>
</svg>`;

const CREST_ROSES_CAMEO = `<svg viewBox="0 0 72 72" width="56" height="56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="36" cy="36" rx="26" ry="30" fill="#fff5f6" stroke="#d48a94" stroke-width="1.6"/>
  <ellipse cx="36" cy="36" rx="22" ry="26" stroke="rgba(212,138,148,0.35)" stroke-width="1" stroke-dasharray="2 3"/>
  <circle cx="36" cy="34" r="8" fill="#d48a94" fill-opacity="0.25" stroke="#d48a94" stroke-width="1.4"/>
  <path d="M36 29c-3 3-2 7 2 8 3-2 4-5 1-8h-3z" fill="#d48a94"/>
  <path d="M30 42c4 4 10 3 13-1" stroke="#849b78" stroke-width="1.4" stroke-linecap="round"/>
</svg>`;

const CREST_SUNFLOWER = `<svg viewBox="0 0 72 72" width="56" height="56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="36" cy="36" r="32" fill="#241910" stroke="#eab308" stroke-width="1.6"/>
  <circle cx="36" cy="36" r="9" fill="#451a03" stroke="#eab308" stroke-width="1.5"/>
  <path d="M36 18l3 7h-6l3-7zm0 36l3-7h-6l3 7zm-18-18l7 3v-6l-7 3zm36 0l-7 3v-6l7 3zm-13-13l7 3-4 5-3-8zm26 26l-7-3 4-5 3 8zm0-26l-7 3 4-5 3-8zm-26 26l7-3-4 5-3 8z" fill="#eab308"/>
</svg>`;

const CREST_NAVY_GOLD = `<svg viewBox="0 0 72 72" width="56" height="56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="36" cy="36" r="32" fill="#0a1a33" stroke="#dfba47" stroke-width="1.6"/>
  <circle cx="36" cy="36" r="28" stroke="rgba(223,186,71,0.3)" stroke-width="1"/>
  <path d="M36 18c-6 8-6 16 0 24 6-8 6-16 0-24z" fill="rgba(223,186,71,0.2)" stroke="#dfba47" stroke-width="1.5"/>
  <path d="M22 36c8-6 16-6 24 0-8 6-16 6-24 0z" stroke="#dfba47" stroke-width="1.2"/>
  <circle cx="36" cy="36" r="3" fill="#dfba47"/>
</svg>`;

const CREST_BURGUNDY_TIARA = `<svg viewBox="0 0 72 72" width="56" height="56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="36" cy="36" r="32" fill="#320613" stroke="#dfba47" stroke-width="1.8"/>
  <circle cx="36" cy="36" r="28" stroke="rgba(223,186,71,0.4)" stroke-width="1" stroke-dasharray="2 3"/>
  <path d="M20 46l4-16 7 8 5-14 5 14 7-8 4 16H20z" fill="rgba(223,186,71,0.2)" stroke="#dfba47" stroke-width="1.8"/>
  <circle cx="36" cy="22" r="2.5" fill="#dfba47"/>
  <circle cx="26" cy="28" r="2" fill="#dfba47"/>
  <circle cx="46" cy="28" r="2" fill="#dfba47"/>
  <text x="36" y="44" font-family="'Great Vibes', cursive" font-size="13" fill="#fceef1" text-anchor="middle">XV</text>
</svg>`;

// Helper function to create WYSIWYG canvas layers for an access screen
function buildStandardLayers(
  theme: TemplateAccessScreenTheme,
  texts: TemplateAccessScreenTexts,
  crestSvg: string,
  acc: VisualAccessScreenDesign,
  eventTitle?: string
): VisualInvitationLayer[] {
  let z = 0;
  const layers: VisualInvitationLayer[] = [];

  const titleText = acc.title || eventTitle || texts.defaultTitle;
  const subtitleText = acc.subtitle || texts.defaultSubtitle;
  const buttonText = acc.buttonText || texts.buttonText;
  const badgeText = acc.badgeText || texts.badgeText;
  const inputLabel = acc.inputLabel || texts.inputLabel;
  const inputPlaceholder = acc.inputPlaceholder || texts.inputPlaceholder;
  const pinInputLabel = acc.pinInputLabel || texts.pinInputLabel;
  const pinInputPlaceholder = acc.pinInputPlaceholder || texts.pinInputPlaceholder;

  // 1. Card Container Shape
  const card: VisualInvitationLayer = {
    id: 'layer-access-card',
    name: 'Tarjeta Contenedora',
    type: 'shape',
    text: '',
    x: 6,
    y: 5,
    width: 88,
    height: 90,
    zIndex: ++z,
    binding: 'access.card',
    style: {
      backgroundColor: theme.cardBgColor,
      borderColor: theme.cardBorder.includes('solid') ? theme.cardBorder.split('solid')[1]?.trim() : theme.accentColor,
      borderWidth: 1.5,
      borderStyle: 'solid',
      borderRadius: theme.cardRadius,
      boxShadow: theme.cardShadow === 'glow'
        ? `0 25px 60px rgba(0,0,0,0.65), 0 0 35px ${theme.cardBorderGlow || 'rgba(197,155,108,0.25)'}`
        : '0 20px 50px rgba(0,0,0,0.25)'
    }
  };
  layers.push(card);

  // 2. Badge
  const badge: VisualInvitationLayer = {
    id: 'layer-access-badge',
    name: 'Insignia / Badge',
    type: 'text',
    text: badgeText,
    x: 14,
    y: 9.5,
    width: 72,
    height: 5,
    zIndex: ++z,
    binding: 'access.badge',
    style: {
      color: theme.accentColor,
      fontFamily: theme.bodyFont,
      fontWeight: 700,
      fontSize: 10.5,
      letterSpacing: 2,
      textAlign: 'center',
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderColor: theme.accentColor,
      borderWidth: 1,
      borderStyle: 'solid',
      borderRadius: 20
    }
  };
  layers.push(badge);

  // 3. Title
  const title: VisualInvitationLayer = {
    id: 'layer-access-title',
    name: 'Título de Acceso',
    type: 'text',
    text: titleText,
    x: 10,
    y: 17,
    width: 80,
    height: 11,
    zIndex: ++z,
    binding: 'access.title',
    style: {
      color: theme.textColor,
      fontFamily: theme.headingFont,
      fontWeight: 700,
      fontSize: 26,
      letterSpacing: 1.2,
      textAlign: 'center',
      lineHeight: 1.2
    }
  };
  layers.push(title);

  // 4. Subtitle
  const subtitle: VisualInvitationLayer = {
    id: 'layer-access-subtitle',
    name: 'Instrucciones / Subtítulo',
    type: 'text',
    text: subtitleText,
    x: 12,
    y: 29.5,
    width: 76,
    height: 7,
    zIndex: ++z,
    binding: 'access.subtitle',
    style: {
      color: theme.textColor,
      fontFamily: theme.bodyFont,
      fontWeight: 400,
      fontSize: 12.5,
      lineHeight: 1.4,
      textAlign: 'center'
    }
  };
  layers.push(subtitle);

  // 5. Contact Input Field
  const contactField: VisualInvitationLayer = {
    id: 'layer-access-contact',
    name: 'Campo de Contacto',
    type: 'field',
    text: inputLabel,
    placeholder: inputPlaceholder,
    x: 12,
    y: 39,
    width: 76,
    height: 8.8,
    zIndex: ++z,
    binding: 'access.contact',
    style: {
      color: theme.inputTextColor,
      fontFamily: theme.bodyFont,
      fontSize: 13,
      backgroundColor: theme.inputBgColor,
      borderColor: theme.inputBorderColor,
      borderWidth: 1,
      borderStyle: 'solid',
      borderRadius: 12,
      textAlign: 'left',
      padding: 12
    }
  };
  layers.push(contactField);

  // 6. PIN Field
  const pinField: VisualInvitationLayer = {
    id: 'layer-access-pin',
    name: 'Campo de NIP',
    type: 'field',
    text: pinInputLabel,
    placeholder: pinInputPlaceholder,
    x: 12,
    y: 50,
    width: 76,
    height: 8.8,
    zIndex: ++z,
    binding: 'access.pin',
    style: {
      color: theme.inputTextColor,
      fontFamily: theme.bodyFont,
      fontSize: 13,
      backgroundColor: theme.inputBgColor,
      borderColor: theme.inputBorderColor,
      borderWidth: 1,
      borderStyle: 'solid',
      borderRadius: 12,
      textAlign: 'left',
      padding: 12
    }
  };
  layers.push(pinField);

  // 7. Submit Button
  const submitBtn: VisualInvitationLayer = {
    id: 'layer-access-submit',
    name: 'Botón de Ingreso',
    type: 'button',
    text: buttonText,
    x: 12,
    y: 62.5,
    width: 76,
    height: 8.5,
    zIndex: ++z,
    binding: 'access.submit',
    style: {
      color: theme.buttonTextColor,
      fontFamily: theme.bodyFont,
      fontWeight: 700,
      fontSize: 13.5,
      letterSpacing: 1.2,
      backgroundColor: theme.buttonBgColor,
      borderRadius: theme.buttonRadius,
      boxShadow: `0 10px 25px ${theme.cardBorderGlow || 'rgba(0,0,0,0.3)'}`,
      textAlign: 'center'
    }
  };
  layers.push(submitBtn);

  // 8. Self-Registration Link
  const selfRegLink: VisualInvitationLayer = {
    id: 'layer-access-selfreg-link',
    name: 'Enlace Auto-registro',
    type: 'text',
    text: '¿No estás en la lista? Solicitar Invitación →',
    x: 12,
    y: 74,
    width: 76,
    height: 4.5,
    zIndex: ++z,
    binding: 'access.selfRegLink',
    style: {
      color: theme.accentColor,
      fontFamily: theme.bodyFont,
      fontSize: 11.5,
      fontWeight: 600,
      textAlign: 'center'
    }
  };
  layers.push(selfRegLink);

  return layers;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETE PRESET CATALOG FOR ALL 21 TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

export const TEMPLATE_ACCESS_PRESETS: TemplateAccessScreenPreset[] = [
  // 1. Envelope Cards
  {
    templateId: 'envelope-cards',
    aliases: ['envelope-cards'],
    name: 'Sobre Interactivo & Cards Deslizables',
    theme: {
      backgroundType: 'gradient',
      backgroundColor: '#faf7f2',
      backgroundGradient: 'radial-gradient(ellipse at 50% 25%, #faf7f2 0%, #ece5d8 60%, #ded3bf 100%)',
      backgroundOverlayOpacity: 25,
      backgroundBlur: 10,
      cardStyle: 'bordered',
      cardBgColor: 'rgba(255, 253, 250, 0.94)',
      cardOpacity: 94,
      cardRadius: 24,
      cardShadow: 'elevated',
      cardBorder: '1.5px solid rgba(197, 155, 108, 0.5)',
      cardBorderGlow: 'rgba(197, 155, 108, 0.25)',
      primaryColor: '#1c2434',
      textColor: '#2c2421',
      accentColor: '#c59b6c',
      inputBgColor: 'rgba(245, 240, 232, 0.7)',
      inputBorderColor: 'rgba(197, 155, 108, 0.4)',
      inputTextColor: '#2c2421',
      inputPlaceholderColor: 'rgba(44, 36, 33, 0.5)',
      inputFocusBorderColor: '#c59b6c',
      buttonBgColor: '#c59b6c',
      buttonTextColor: '#ffffff',
      buttonRadius: 28,
      headingFont: 'Playfair Display',
      bodyFont: 'Montserrat'
    },
    texts: {
      badgeText: '✉ SOBRE INTERACTIVO EXCLUSIVO ✉',
      defaultTitle: 'Invitación de Gala',
      defaultSubtitle: 'Abre tu sobre digital ingresando tu correo o teléfono registrado.',
      inputLabel: 'Correo o teléfono registrado',
      inputPlaceholder: 'invitado@ejemplo.com o 55 0000 0000',
      pinInputLabel: 'NIP de Acceso',
      pinInputPlaceholder: 'Ingresa tu NIP',
      buttonText: 'ABRIR SOBRE VIRTUAL',
      selfRegTitle: 'Solicitar Invitación',
      selfRegSubtitle: 'Si no estás en la lista, ingresa tus datos. El anfitrión revisará tu solicitud.',
      selfRegButtonText: 'ENVIAR SOLICITUD'
    },
    decorations: {
      crestSvg: CREST_ENVELOPE,
      specialEffect: 'sparkles'
    },
    buildLayers: (acc, eventTitle) => buildStandardLayers(
      TEMPLATE_ACCESS_PRESETS[0].theme,
      TEMPLATE_ACCESS_PRESETS[0].texts,
      CREST_ENVELOPE,
      acc,
      eventTitle
    )
  },

  // 2. Clásica Editorial Vertical
  {
    templateId: 'classic-vertical',
    aliases: ['classic-vertical'],
    name: 'Clásica Editorial Vertical',
    theme: {
      backgroundType: 'gradient',
      backgroundColor: '#fbfaf6',
      backgroundGradient: 'radial-gradient(ellipse at 50% 20%, #fcfbf8 0%, #f4f0e6 60%, #e6dfcf 100%)',
      backgroundOverlayOpacity: 20,
      backgroundBlur: 8,
      cardStyle: 'bordered',
      cardBgColor: 'rgba(255, 255, 255, 0.96)',
      cardOpacity: 96,
      cardRadius: 18,
      cardShadow: 'soft',
      cardBorder: '1.2px solid rgba(44, 36, 33, 0.25)',
      cardBorderGlow: 'rgba(179, 142, 93, 0.2)',
      primaryColor: '#2c2421',
      textColor: '#1f1a18',
      accentColor: '#b38e5d',
      inputBgColor: '#fcfbf8',
      inputBorderColor: 'rgba(44, 36, 33, 0.2)',
      inputTextColor: '#1f1a18',
      inputPlaceholderColor: 'rgba(31, 26, 24, 0.45)',
      inputFocusBorderColor: '#b38e5d',
      buttonBgColor: '#24201e',
      buttonTextColor: '#d4af37',
      buttonRadius: 10,
      headingFont: 'Cormorant Garamond',
      bodyFont: 'Montserrat'
    },
    texts: {
      badgeText: '— ÉDITION PRIVÉE • ACCÈS RÉSERVÉ —',
      defaultTitle: 'Invitación Editorial',
      defaultSubtitle: 'Por favor identifícate con tus datos registrados para consultar tu programa oficial.',
      inputLabel: 'Correo o teléfono registrado',
      inputPlaceholder: 'invitado@ejemplo.com o 55 0000 0000',
      pinInputLabel: 'NIP de acceso',
      pinInputPlaceholder: 'Ingresa tu NIP',
      buttonText: 'CONSULTAR INVITACIÓN',
      selfRegTitle: 'Solicitar Pase Editorial',
      selfRegSubtitle: 'Completa tus datos para solicitar admisión a la lista de invitados.',
      selfRegButtonText: 'SOLICITAR ACCESO'
    },
    decorations: {
      crestSvg: CREST_EDITORIAL_LAUREL,
      specialEffect: 'none'
    },
    buildLayers: (acc, eventTitle) => buildStandardLayers(
      TEMPLATE_ACCESS_PRESETS[1].theme,
      TEMPLATE_ACCESS_PRESETS[1].texts,
      CREST_EDITORIAL_LAUREL,
      acc,
      eventTitle
    )
  },

  // 3. Plantilla 3: Glamour Moderno & Minimal
  {
    templateId: 'modern-minimal',
    aliases: ['modern-minimal', 'template-3'],
    name: 'Plantilla 3: Glamour Moderno & Minimal',
    theme: {
      backgroundType: 'gradient',
      backgroundColor: '#070b14',
      backgroundGradient: 'radial-gradient(ellipse at 50% 25%, #152238 0%, #0c1424 60%, #03060d 100%)',
      backgroundOverlayOpacity: 45,
      backgroundBlur: 20,
      cardStyle: 'glass',
      cardBgColor: 'rgba(255, 255, 255, 0.07)',
      cardOpacity: 70,
      cardRadius: 24,
      cardShadow: 'glow',
      cardBorder: '1px solid rgba(255, 255, 255, 0.22)',
      cardBorderGlow: 'rgba(56, 189, 248, 0.35)',
      primaryColor: '#ffffff',
      textColor: '#f1f5f9',
      accentColor: '#38bdf8',
      inputBgColor: 'rgba(255, 255, 255, 0.06)',
      inputBorderColor: 'rgba(56, 189, 248, 0.3)',
      inputTextColor: '#ffffff',
      inputPlaceholderColor: 'rgba(241, 245, 249, 0.5)',
      inputFocusBorderColor: '#38bdf8',
      buttonBgColor: '#0284c7',
      buttonTextColor: '#ffffff',
      buttonRadius: 28,
      headingFont: 'Outfit',
      bodyFont: 'Inter'
    },
    texts: {
      badgeText: '✦ GLAMOUR MINIMAL • ACCESO PRIVADO ✦',
      defaultTitle: 'Pase de Acceso VIP',
      defaultSubtitle: 'Acceso reservado a invitados de la lista exclusiva.',
      inputLabel: 'Correo o teléfono registrado',
      inputPlaceholder: 'tu@correo.com o teléfono',
      pinInputLabel: 'NIP personal',
      pinInputPlaceholder: 'NIP de 4 dígitos',
      buttonText: 'INGRESAR AL EVENTO',
      selfRegTitle: 'Solicitar Acreditación',
      selfRegSubtitle: 'Ingresa tus datos para verificar disponibilidad en la lista VIP.',
      selfRegButtonText: 'SOLICITAR ACREDITACIÓN'
    },
    decorations: {
      crestSvg: CREST_MODERN_CRYSTAL,
      specialEffect: 'starlight'
    },
    buildLayers: (acc, eventTitle) => buildStandardLayers(
      TEMPLATE_ACCESS_PRESETS[2].theme,
      TEMPLATE_ACCESS_PRESETS[2].texts,
      CREST_MODERN_CRYSTAL,
      acc,
      eventTitle
    )
  },

  // 4. Boda Mobile-First (Story Vertical)
  {
    templateId: 'boda-mobile-first',
    aliases: ['boda-mobile-first'],
    name: 'Boda Mobile-First (Story Vertical)',
    theme: {
      backgroundType: 'gradient',
      backgroundColor: '#fdf6f0',
      backgroundGradient: 'radial-gradient(ellipse at 50% 20%, #fef8f4 0%, #f7ebe1 55%, #ecd7ca 100%)',
      backgroundOverlayOpacity: 30,
      backgroundBlur: 12,
      cardStyle: 'bordered',
      cardBgColor: 'rgba(255, 255, 255, 0.93)',
      cardOpacity: 93,
      cardRadius: 28,
      cardShadow: 'elevated',
      cardBorder: '1.5px solid rgba(209, 149, 137, 0.4)',
      cardBorderGlow: 'rgba(209, 149, 137, 0.25)',
      primaryColor: '#2c2523',
      textColor: '#2e2624',
      accentColor: '#d19589',
      inputBgColor: '#faf3ee',
      inputBorderColor: 'rgba(209, 149, 137, 0.4)',
      inputTextColor: '#2e2624',
      inputPlaceholderColor: 'rgba(46, 38, 36, 0.45)',
      inputFocusBorderColor: '#b37d6e',
      buttonBgColor: '#c98a7b',
      buttonTextColor: '#ffffff',
      buttonRadius: 30,
      headingFont: 'Playfair Display',
      bodyFont: 'Outfit'
    },
    texts: {
      badgeText: '✨ HISTORIA DE AMOR • PASE VIP ✨',
      defaultTitle: 'Nuestra Historia Comienza',
      defaultSubtitle: 'Ingresa tus datos para abrir el Story oficial de nuestra boda.',
      inputLabel: 'Correo o teléfono registrado',
      inputPlaceholder: 'invitado@ejemplo.com o teléfono',
      pinInputLabel: 'NIP de acceso',
      pinInputPlaceholder: 'Ingresa tu NIP',
      buttonText: 'ABRIR HISTORIA DE BODA',
      selfRegTitle: 'Solicitar Invitación',
      selfRegSubtitle: 'Si no estás registrado, solicita tu pase a los anfitriones.',
      selfRegButtonText: 'ENVIAR SOLICITUD'
    },
    decorations: {
      crestSvg: CREST_STORY_HEART,
      specialEffect: 'confetti'
    },
    buildLayers: (acc, eventTitle) => buildStandardLayers(
      TEMPLATE_ACCESS_PRESETS[3].theme,
      TEMPLATE_ACCESS_PRESETS[3].texts,
      CREST_STORY_HEART,
      acc,
      eventTitle
    )
  },

  // 5. Boda Desktop-First (Revista Editorial)
  {
    templateId: 'boda-desktop-first',
    aliases: ['boda-desktop-first'],
    name: 'Boda Desktop-First (Revista Editorial)',
    theme: {
      backgroundType: 'gradient',
      backgroundColor: '#111113',
      backgroundGradient: 'radial-gradient(circle at 50% 25%, #232226 0%, #141416 70%, #0a0a0b 100%)',
      backgroundOverlayOpacity: 55,
      backgroundBlur: 16,
      cardStyle: 'bordered',
      cardBgColor: 'rgba(24, 23, 22, 0.92)',
      cardOpacity: 92,
      cardRadius: 20,
      cardShadow: 'glow',
      cardBorder: '1.5px solid rgba(197, 155, 108, 0.55)',
      cardBorderGlow: 'rgba(197, 155, 108, 0.3)',
      primaryColor: '#ffffff',
      textColor: '#f5f0ea',
      accentColor: '#c59b6c',
      inputBgColor: 'rgba(255, 255, 255, 0.05)',
      inputBorderColor: 'rgba(197, 155, 108, 0.35)',
      inputTextColor: '#f5f0ea',
      inputPlaceholderColor: 'rgba(245, 240, 234, 0.45)',
      inputFocusBorderColor: '#c59b6c',
      buttonBgColor: '#c59b6c',
      buttonTextColor: '#141416',
      buttonRadius: 12,
      headingFont: 'Cinzel',
      bodyFont: 'Montserrat'
    },
    texts: {
      badgeText: '✦ BLACK TIE GALA • RESERVED ADMISSION ✦',
      defaultTitle: 'Invitación de Gala de Boda',
      defaultSubtitle: 'Acreditación oficial para la velada de celebración nupcial.',
      inputLabel: 'Correo o teléfono registrado',
      inputPlaceholder: 'invitado@ejemplo.com o 55 0000 0000',
      pinInputLabel: 'NIP de Gala',
      pinInputPlaceholder: 'Ingresa tu NIP',
      buttonText: 'ABRIR INVITACIÓN DE GALA',
      selfRegTitle: 'Acreditación de Gala',
      selfRegSubtitle: 'Solicita tu pase personal para la velada de etiqueta rigurosa.',
      selfRegButtonText: 'SOLICITAR ACREDITACIÓN'
    },
    decorations: {
      crestSvg: CREST_BLACK_TIE,
      specialEffect: 'sparkles'
    },
    buildLayers: (acc, eventTitle) => buildStandardLayers(
      TEMPLATE_ACCESS_PRESETS[4].theme,
      TEMPLATE_ACCESS_PRESETS[4].texts,
      CREST_BLACK_TIE,
      acc,
      eventTitle
    )
  },

  // 6. Boda Cards Lateral (App Deck Deslizable)
  {
    templateId: 'boda-cards-lateral',
    aliases: ['boda-cards-lateral'],
    name: 'Boda Cards Lateral (App Deck Deslizable)',
    theme: {
      backgroundType: 'gradient',
      backgroundColor: '#1f1715',
      backgroundGradient: 'radial-gradient(ellipse at 50% 25%, #2d211f 0%, #191312 65%, #0c0908 100%)',
      backgroundOverlayOpacity: 40,
      backgroundBlur: 14,
      cardStyle: 'bordered',
      cardBgColor: 'rgba(38, 29, 27, 0.9)',
      cardOpacity: 90,
      cardRadius: 24,
      cardShadow: 'elevated',
      cardBorder: '1.5px solid rgba(224, 169, 139, 0.45)',
      cardBorderGlow: 'rgba(224, 169, 139, 0.25)',
      primaryColor: '#ffffff',
      textColor: '#f4ece7',
      accentColor: '#e0a98b',
      inputBgColor: 'rgba(255, 255, 255, 0.06)',
      inputBorderColor: 'rgba(224, 169, 139, 0.35)',
      inputTextColor: '#f4ece7',
      inputPlaceholderColor: 'rgba(244, 236, 231, 0.45)',
      inputFocusBorderColor: '#e0a98b',
      buttonBgColor: '#d49174',
      buttonTextColor: '#ffffff',
      buttonRadius: 28,
      headingFont: 'Playfair Display',
      bodyFont: 'Montserrat'
    },
    texts: {
      badgeText: '❖ TARJETA EXCLUSIVA • SWIPE DECK ❖',
      defaultTitle: 'Acceso al Deck de Boda',
      defaultSubtitle: 'Desliza tu pase exclusivo para acceder al itinerario interactivo.',
      inputLabel: 'Correo o teléfono registrado',
      inputPlaceholder: 'invitado@ejemplo.com o teléfono',
      pinInputLabel: 'NIP de acceso',
      pinInputPlaceholder: 'Ingresa tu NIP',
      buttonText: 'ABRIR TARJETA INTERACTIVA',
      selfRegTitle: 'Solicitar Pase al Deck',
      selfRegSubtitle: 'Ingresa tus datos para que los organizadores te envíen tu pase.',
      selfRegButtonText: 'ENVIAR SOLICITUD'
    },
    decorations: {
      crestSvg: CREST_CARDS_COPPER,
      specialEffect: 'starlight'
    },
    buildLayers: (acc, eventTitle) => buildStandardLayers(
      TEMPLATE_ACCESS_PRESETS[5].theme,
      TEMPLATE_ACCESS_PRESETS[5].texts,
      CREST_CARDS_COPPER,
      acc,
      eventTitle
    )
  },

  // 7. Boda Creativa Premium (Royal Cinematic)
  {
    templateId: 'boda-creativa-premium',
    aliases: ['boda-creativa-premium'],
    name: 'Boda Creativa Premium (Royal Cinematic)',
    theme: {
      backgroundType: 'gradient',
      backgroundColor: '#0c0817',
      backgroundGradient: 'radial-gradient(ellipse at 50% 20%, #201730 0%, #120d1c 65%, #08050e 100%)',
      backgroundOverlayOpacity: 55,
      backgroundBlur: 18,
      cardStyle: 'bordered',
      cardBgColor: 'rgba(20, 15, 30, 0.92)',
      cardOpacity: 92,
      cardRadius: 36,
      cardShadow: 'glow',
      cardBorder: '1.6px solid rgba(223, 186, 135, 0.65)',
      cardBorderGlow: 'rgba(223, 186, 135, 0.35)',
      primaryColor: '#ffffff',
      textColor: '#f5ecdc',
      accentColor: '#dfba87',
      inputBgColor: 'rgba(255, 255, 255, 0.05)',
      inputBorderColor: 'rgba(223, 186, 135, 0.35)',
      inputTextColor: '#f5ecdc',
      inputPlaceholderColor: 'rgba(245, 236, 220, 0.45)',
      inputFocusBorderColor: '#dfba87',
      buttonBgColor: '#dfba87',
      buttonTextColor: '#120d1c',
      buttonRadius: 30,
      headingFont: 'Cinzel',
      bodyFont: 'Montserrat'
    },
    texts: {
      badgeText: '⚜ ROYAL CINEMATIC • ENTRADA DE HONOR ⚜',
      defaultTitle: 'Nuestra Boda Real',
      defaultSubtitle: 'Esta velada es una celebración íntima. Ingresa tus datos para abrir el sobre real.',
      inputLabel: 'Correo o teléfono registrado',
      inputPlaceholder: 'Ingresa tu correo o teléfono...',
      pinInputLabel: 'NIP Real',
      pinInputPlaceholder: 'Ingresa tu NIP Real',
      buttonText: 'ABRIR SOBRE REAL',
      selfRegTitle: 'Solicitud de Entrada Real',
      selfRegSubtitle: 'Si no estás en la lista real, envía tus datos para revisión de los novios.',
      selfRegButtonText: 'SOLICITAR PASE REAL'
    },
    decorations: {
      crestSvg: CREST_CATHEDRAL_ARCH,
      specialEffect: 'starlight'
    },
    buildLayers: (acc, eventTitle) => buildStandardLayers(
      TEMPLATE_ACCESS_PRESETS[6].theme,
      TEMPLATE_ACCESS_PRESETS[6].texts,
      CREST_CATHEDRAL_ARCH,
      acc,
      eventTitle
    )
  },

  // 8. La Maison Dorée (Haute Couture)
  {
    templateId: 'maison-dore',
    aliases: ['maison-dore'],
    name: 'La Maison Dorée (Haute Couture & Video Envelope)',
    theme: {
      backgroundType: 'gradient',
      backgroundColor: '#13080c',
      backgroundGradient: 'radial-gradient(circle at 50% 30%, #29141c 0%, #14090d 65%, #070305 100%)',
      backgroundImageUrl: 'assets/templates/maison-dore/intro-poster-new-B2unBQtC.jpg',
      backgroundOverlayOpacity: 65,
      backgroundBlur: 14,
      cardStyle: 'bordered',
      cardBgColor: 'rgba(24, 12, 17, 0.94)',
      cardOpacity: 94,
      cardRadius: 24,
      cardShadow: 'glow',
      cardBorder: '2px solid rgba(212, 175, 55, 0.7)',
      cardBorderGlow: 'rgba(212, 175, 55, 0.35)',
      primaryColor: '#ffffff',
      textColor: '#fcf4e4',
      accentColor: '#d4af37',
      inputBgColor: 'rgba(255, 255, 255, 0.06)',
      inputBorderColor: 'rgba(212, 175, 55, 0.4)',
      inputTextColor: '#fcf4e4',
      inputPlaceholderColor: 'rgba(252, 244, 228, 0.45)',
      inputFocusBorderColor: '#d4af37',
      buttonBgColor: '#d4af37',
      buttonTextColor: '#180a0f',
      buttonRadius: 28,
      headingFont: 'Playfair Display',
      bodyFont: 'Montserrat'
    },
    texts: {
      badgeText: '⚜ LA MAISON DORÉE • HAUTE COUTURE ⚜',
      defaultTitle: 'Pase de Gala Imperial',
      defaultSubtitle: 'Experiencia de alta costura nupcial. Presenta tus credenciales oficiales.',
      inputLabel: 'Correo o teléfono registrado',
      inputPlaceholder: 'invitado@ejemplo.com o 55 0000 0000',
      pinInputLabel: 'Clave de Palacio',
      pinInputPlaceholder: 'Ingresa tu NIP imperial',
      buttonText: 'ABRIR SOBRE IMPERIAL',
      selfRegTitle: 'Solicitud de Admisión',
      selfRegSubtitle: 'Solicita tu pase personal para la velada imperial de La Maison Dorée.',
      selfRegButtonText: 'SOLICITAR INVITACIÓN'
    },
    decorations: {
      crestSvg: CREST_MAISON_DORE,
      frameAssetUrl: 'assets/templates/maison-dore/monogram-Dd4GSvtc.png',
      specialEffect: 'sparkles'
    },
    buildLayers: (acc, eventTitle) => buildStandardLayers(
      TEMPLATE_ACCESS_PRESETS[7].theme,
      TEMPLATE_ACCESS_PRESETS[7].texts,
      CREST_MAISON_DORE,
      acc,
      eventTitle
    )
  },

  // 9. Temática Boda: Royal Champagne & Marfil Imperial
  {
    templateId: 'template-boda',
    aliases: ['template-boda'],
    name: 'Temática Boda: Royal Champagne & Marfil Imperial',
    theme: {
      backgroundType: 'gradient',
      backgroundColor: '#faf7f2',
      backgroundGradient: 'radial-gradient(ellipse at 50% 25%, #fbf8f2 0%, #ede3d0 60%, #ded0b7 100%)',
      backgroundOverlayOpacity: 25,
      backgroundBlur: 10,
      cardStyle: 'bordered',
      cardBgColor: 'rgba(255, 255, 255, 0.96)',
      cardOpacity: 96,
      cardRadius: 22,
      cardShadow: 'elevated',
      cardBorder: '1.5px solid rgba(197, 155, 108, 0.55)',
      cardBorderGlow: 'rgba(197, 155, 108, 0.25)',
      primaryColor: '#2c2421',
      textColor: '#241e1b',
      accentColor: '#c59b6c',
      inputBgColor: '#faf6ef',
      inputBorderColor: 'rgba(197, 155, 108, 0.4)',
      inputTextColor: '#241e1b',
      inputPlaceholderColor: 'rgba(36, 30, 27, 0.45)',
      inputFocusBorderColor: '#c59b6c',
      buttonBgColor: '#c59b6c',
      buttonTextColor: '#ffffff',
      buttonRadius: 26,
      headingFont: 'Cinzel',
      bodyFont: 'Montserrat'
    },
    texts: {
      badgeText: '💍 SAGRADO MATRIMONIO • PASE NUPCIAL 💍',
      defaultTitle: 'Nuestra Celebración de Boda',
      defaultSubtitle: 'Ingresa tu correo o teléfono para abrir tu sobre sellado de matrimonio.',
      inputLabel: 'Correo o teléfono registrado',
      inputPlaceholder: 'invitado@ejemplo.com o teléfono',
      pinInputLabel: 'NIP nupcial',
      pinInputPlaceholder: 'Ingresa tu NIP',
      buttonText: 'VALIDAR Y ABRIR SOBRE',
      selfRegTitle: 'Solicitar Pase Nupcial',
      selfRegSubtitle: 'Si no estás registrado, ingresa tus datos para solicitar pase a los novios.',
      selfRegButtonText: 'SOLICITAR PASE'
    },
    decorations: {
      crestSvg: CREST_WEDDING_RINGS,
      specialEffect: 'sparkles'
    },
    buildLayers: (acc, eventTitle) => buildStandardLayers(
      TEMPLATE_ACCESS_PRESETS[8].theme,
      TEMPLATE_ACCESS_PRESETS[8].texts,
      CREST_WEDDING_RINGS,
      acc,
      eventTitle
    )
  },

  // 10. Temática XV Años: Gala Rosé Gold & Diamond Dust
  {
    templateId: 'template-xv',
    aliases: ['template-xv'],
    name: 'Temática XV Años: Gala Rosé Gold & Diamond Dust',
    theme: {
      backgroundType: 'gradient',
      backgroundColor: '#261125',
      backgroundGradient: 'radial-gradient(ellipse at 50% 25%, #30172e 0%, #190918 65%, #0c040c 100%)',
      backgroundOverlayOpacity: 45,
      backgroundBlur: 16,
      cardStyle: 'bordered',
      cardBgColor: 'rgba(44, 20, 42, 0.88)',
      cardOpacity: 88,
      cardRadius: 26,
      cardShadow: 'glow',
      cardBorder: '1.6px solid rgba(183, 110, 121, 0.65)',
      cardBorderGlow: 'rgba(183, 110, 121, 0.35)',
      primaryColor: '#ffffff',
      textColor: '#fceef1',
      accentColor: '#b76e79',
      inputBgColor: 'rgba(255, 255, 255, 0.06)',
      inputBorderColor: 'rgba(183, 110, 121, 0.4)',
      inputTextColor: '#fceef1',
      inputPlaceholderColor: 'rgba(252, 238, 241, 0.45)',
      inputFocusBorderColor: '#b76e79',
      buttonBgColor: '#b76e79',
      buttonTextColor: '#ffffff',
      buttonRadius: 28,
      headingFont: 'Playfair Display',
      bodyFont: 'Montserrat'
    },
    texts: {
      badgeText: '👑 GRAN GALA DE MIS XV AÑOS • CORTE DE HONOR 👑',
      defaultTitle: 'Mis Quince Años',
      defaultSubtitle: 'Una noche de ensueño. Valida tu pase de honor para entrar al baile real.',
      inputLabel: 'Correo o teléfono registrado',
      inputPlaceholder: 'invitado@ejemplo.com o teléfono',
      pinInputLabel: 'NIP de Quinceañera',
      pinInputPlaceholder: 'Ingresa tu NIP',
      buttonText: 'ABRIR PASE REAL',
      selfRegTitle: 'Solicitar Pase a la Corte de Honor',
      selfRegSubtitle: 'Ingresa tus datos para solicitar admisión a la fiesta de XV Años.',
      selfRegButtonText: 'SOLICITAR INVITACIÓN'
    },
    decorations: {
      crestSvg: CREST_XV_TIARA,
      specialEffect: 'sparkles'
    },
    buildLayers: (acc, eventTitle) => buildStandardLayers(
      TEMPLATE_ACCESS_PRESETS[9].theme,
      TEMPLATE_ACCESS_PRESETS[9].texts,
      CREST_XV_TIARA,
      acc,
      eventTitle
    )
  },

  // 11. Temática Graduación: Honor Académico & Oxford Blue
  {
    templateId: 'template-graduacion',
    aliases: ['template-graduacion'],
    name: 'Temática Graduación: Honor Académico & Oxford Blue',
    theme: {
      backgroundType: 'gradient',
      backgroundColor: '#0a1628',
      backgroundGradient: 'radial-gradient(ellipse at 50% 25%, #132a4a 0%, #0a192f 65%, #030a14 100%)',
      backgroundOverlayOpacity: 45,
      backgroundBlur: 14,
      cardStyle: 'bordered',
      cardBgColor: 'rgba(11, 26, 49, 0.92)',
      cardOpacity: 92,
      cardRadius: 20,
      cardShadow: 'glow',
      cardBorder: '1.6px solid rgba(217, 119, 6, 0.65)',
      cardBorderGlow: 'rgba(217, 119, 6, 0.3)',
      primaryColor: '#ffffff',
      textColor: '#f1f5f9',
      accentColor: '#d97706',
      inputBgColor: 'rgba(255, 255, 255, 0.05)',
      inputBorderColor: 'rgba(217, 119, 6, 0.35)',
      inputTextColor: '#f1f5f9',
      inputPlaceholderColor: 'rgba(241, 245, 249, 0.45)',
      inputFocusBorderColor: '#d97706',
      buttonBgColor: '#d97706',
      buttonTextColor: '#0a192f',
      buttonRadius: 12,
      headingFont: 'Cinzel',
      bodyFont: 'Montserrat'
    },
    texts: {
      badgeText: '🎓 CEREMONIA DE GRADUACIÓN • PASE DE HONOR 🎓',
      defaultTitle: 'Ceremonia de Graduación',
      defaultSubtitle: 'Valida tu pase solemne para acompañarnos en la entrega de diplomas y gala.',
      inputLabel: 'Correo o teléfono registrado',
      inputPlaceholder: 'invitado@ejemplo.com o teléfono',
      pinInputLabel: 'NIP Académico',
      pinInputPlaceholder: 'Ingresa tu NIP',
      buttonText: 'VALIDAR PASE ACADÉMICO',
      selfRegTitle: 'Solicitar Pase de Acompañante',
      selfRegSubtitle: 'Ingresa tus datos para registrarte como invitado a la ceremonia solemne.',
      selfRegButtonText: 'SOLICITAR PASE'
    },
    decorations: {
      crestSvg: CREST_GRADUATION_CAP,
      specialEffect: 'sparkles'
    },
    buildLayers: (acc, eventTitle) => buildStandardLayers(
      TEMPLATE_ACCESS_PRESETS[10].theme,
      TEMPLATE_ACCESS_PRESETS[10].texts,
      CREST_GRADUATION_CAP,
      acc,
      eventTitle
    )
  },

  // 12. Temática Cumpleaños: Celebration Midnight & Festive Glow
  {
    templateId: 'template-cumpleanos',
    aliases: ['template-cumpleanos'],
    name: 'Temática Cumpleaños: Celebration Midnight & Festive Glow',
    theme: {
      backgroundType: 'gradient',
      backgroundColor: '#1b0c24',
      backgroundGradient: 'radial-gradient(ellipse at 50% 25%, #271233 0%, #120719 65%, #060209 100%)',
      backgroundOverlayOpacity: 45,
      backgroundBlur: 16,
      cardStyle: 'bordered',
      cardBgColor: 'rgba(29, 14, 38, 0.9)',
      cardOpacity: 90,
      cardRadius: 26,
      cardShadow: 'glow',
      cardBorder: '1.6px solid rgba(236, 72, 153, 0.6)',
      cardBorderGlow: 'rgba(236, 72, 153, 0.35)',
      primaryColor: '#ffffff',
      textColor: '#fdf2f8',
      accentColor: '#ec4899',
      inputBgColor: 'rgba(255, 255, 255, 0.06)',
      inputBorderColor: 'rgba(236, 72, 153, 0.35)',
      inputTextColor: '#fdf2f8',
      inputPlaceholderColor: 'rgba(253, 242, 248, 0.45)',
      inputFocusBorderColor: '#ec4899',
      buttonBgColor: '#ec4899',
      buttonTextColor: '#ffffff',
      buttonRadius: 28,
      headingFont: 'Outfit',
      bodyFont: 'Outfit'
    },
    texts: {
      badgeText: '🎉 VIP BIRTHDAY CELEBRATION • FIESTA EXCLUSIVA 🎉',
      defaultTitle: '¡Gran Fiesta de Cumpleaños!',
      defaultSubtitle: '¡La noche es joven! Ingresa tu número o correo para sumarte a la fiesta.',
      inputLabel: 'Correo o teléfono registrado',
      inputPlaceholder: 'invitado@ejemplo.com o teléfono',
      pinInputLabel: 'NIP de la Fiesta',
      pinInputPlaceholder: 'Ingresa tu NIP',
      buttonText: '¡ENTRAR A LA FIESTA!',
      selfRegTitle: 'Pedir Pase para la Fiesta',
      selfRegSubtitle: '¿No estás en la lista? Solicita tu pase de fiesta al cumpleañero.',
      selfRegButtonText: '¡QUIERO IR!'
    },
    decorations: {
      crestSvg: CREST_BIRTHDAY_CAKE,
      specialEffect: 'confetti'
    },
    buildLayers: (acc, eventTitle) => buildStandardLayers(
      TEMPLATE_ACCESS_PRESETS[11].theme,
      TEMPLATE_ACCESS_PRESETS[11].texts,
      CREST_BIRTHDAY_CAKE,
      acc,
      eventTitle
    )
  },

  // 13. Temática Bautizo: Celestial Serenity & Angelic Grace
  {
    templateId: 'template-bautizo',
    aliases: ['template-bautizo'],
    name: 'Temática Bautizo: Celestial Serenity & Angelic Grace',
    theme: {
      backgroundType: 'gradient',
      backgroundColor: '#f0f9ff',
      backgroundGradient: 'radial-gradient(ellipse at 50% 20%, #f0f9ff 0%, #e0f2fe 55%, #c7e6f8 100%)',
      backgroundOverlayOpacity: 20,
      backgroundBlur: 10,
      cardStyle: 'bordered',
      cardBgColor: 'rgba(255, 255, 255, 0.95)',
      cardOpacity: 95,
      cardRadius: 24,
      cardShadow: 'soft',
      cardBorder: '1.5px solid rgba(212, 175, 55, 0.45)',
      cardBorderGlow: 'rgba(2, 132, 199, 0.2)',
      primaryColor: '#0369a1',
      textColor: '#1e293b',
      accentColor: '#0284c7',
      inputBgColor: '#f8fafc',
      inputBorderColor: 'rgba(2, 132, 199, 0.35)',
      inputTextColor: '#1e293b',
      inputPlaceholderColor: 'rgba(30, 41, 59, 0.45)',
      inputFocusBorderColor: '#0284c7',
      buttonBgColor: '#0284c7',
      buttonTextColor: '#ffffff',
      buttonRadius: 26,
      headingFont: 'Playfair Display',
      bodyFont: 'Montserrat'
    },
    texts: {
      badgeText: '🕊️ SAGRADO BAUTISMO • BENDICIÓN Y PASE FAMILIAR 🕊️',
      defaultTitle: 'Celebración de Bautizo',
      defaultSubtitle: 'Acompáñanos a bendecir este santo día. Ingresa tus datos para abrir la invitación.',
      inputLabel: 'Correo o teléfono registrado',
      inputPlaceholder: 'invitado@ejemplo.com o teléfono',
      pinInputLabel: 'NIP de Familia',
      pinInputPlaceholder: 'Ingresa tu NIP',
      buttonText: 'ABRIR BENDICIÓN SACRA',
      selfRegTitle: 'Solicitar Pase Familiar',
      selfRegSubtitle: 'Ingresa tus datos familiares para solicitar pase al bautizo.',
      selfRegButtonText: 'SOLICITAR PASE'
    },
    decorations: {
      crestSvg: CREST_BAUTIZO_DOVE,
      specialEffect: 'starlight'
    },
    buildLayers: (acc, eventTitle) => buildStandardLayers(
      TEMPLATE_ACCESS_PRESETS[12].theme,
      TEMPLATE_ACCESS_PRESETS[12].texts,
      CREST_BAUTIZO_DOVE,
      acc,
      eventTitle
    )
  },

  // 14. Temática General / Otro: Modern Vanguard & Emerald Slate
  {
    templateId: 'template-otro',
    aliases: ['template-otro'],
    name: 'Temática General / Otro: Modern Vanguard & Emerald Slate',
    theme: {
      backgroundType: 'gradient',
      backgroundColor: '#081712',
      backgroundGradient: 'radial-gradient(ellipse at 50% 25%, #132b24 0%, #0a1713 65%, #030806 100%)',
      backgroundOverlayOpacity: 45,
      backgroundBlur: 14,
      cardStyle: 'bordered',
      cardBgColor: 'rgba(13, 28, 23, 0.9)',
      cardOpacity: 90,
      cardRadius: 20,
      cardShadow: 'glow',
      cardBorder: '1.5px solid rgba(16, 185, 129, 0.5)',
      cardBorderGlow: 'rgba(16, 185, 129, 0.3)',
      primaryColor: '#ffffff',
      textColor: '#ecfdf5',
      accentColor: '#10b981',
      inputBgColor: 'rgba(255, 255, 255, 0.05)',
      inputBorderColor: 'rgba(16, 185, 129, 0.35)',
      inputTextColor: '#ecfdf5',
      inputPlaceholderColor: 'rgba(236, 253, 245, 0.45)',
      inputFocusBorderColor: '#10b981',
      buttonBgColor: '#059669',
      buttonTextColor: '#ffffff',
      buttonRadius: 14,
      headingFont: 'Cinzel',
      bodyFont: 'Montserrat'
    },
    texts: {
      badgeText: '✦ EVENTO EXCLUSIVO • ACCESO RESERVADO ✦',
      defaultTitle: 'Pase de Gala Exclusivo',
      defaultSubtitle: 'Ingresa tus credenciales registradas para confirmar tu asistencia.',
      inputLabel: 'Correo o teléfono registrado',
      inputPlaceholder: 'invitado@ejemplo.com o teléfono',
      pinInputLabel: 'NIP de Invitado',
      pinInputPlaceholder: 'Ingresa tu NIP',
      buttonText: 'ACCEDER A LA GALA',
      selfRegTitle: 'Solicitar Acreditación al Evento',
      selfRegSubtitle: 'Ingresa tus datos profesionales o personales para solicitar ingreso.',
      selfRegButtonText: 'SOLICITAR ACREDITACIÓN'
    },
    decorations: {
      crestSvg: CREST_OTRO_DIAMOND,
      specialEffect: 'starlight'
    },
    buildLayers: (acc, eventTitle) => buildStandardLayers(
      TEMPLATE_ACCESS_PRESETS[13].theme,
      TEMPLATE_ACCESS_PRESETS[13].texts,
      CREST_OTRO_DIAMOND,
      acc,
      eventTitle
    )
  },

  // 15. Villa Perlè: Apertura de Sobre Animada & Faroles de Ensueño
  {
    templateId: 'boda-villa-perle',
    aliases: ['boda-villa-perle', 'template-boda-villa-perle'],
    name: 'Villa Perlè: Apertura de Sobre Animada & Faroles de Ensueño',
    theme: {
      backgroundType: 'gradient',
      backgroundColor: '#111b15',
      backgroundGradient: 'radial-gradient(ellipse at 50% 25%, #24352a 0%, #141f18 65%, #0a100c 100%)',
      backgroundImageUrl: 'assets/boda-villa-perle/envelope-frame-v3.png',
      backgroundOverlayOpacity: 45,
      backgroundBlur: 14,
      cardStyle: 'bordered',
      cardBgColor: 'rgba(24, 35, 28, 0.92)',
      cardOpacity: 92,
      cardRadius: 24,
      cardShadow: 'glow',
      cardBorder: '1.6px solid rgba(200, 170, 110, 0.55)',
      cardBorderGlow: 'rgba(200, 170, 110, 0.3)',
      primaryColor: '#ffffff',
      textColor: '#f4ede1',
      accentColor: '#c8aa6e',
      inputBgColor: 'rgba(255, 255, 255, 0.05)',
      inputBorderColor: 'rgba(200, 170, 110, 0.35)',
      inputTextColor: '#f4ede1',
      inputPlaceholderColor: 'rgba(244, 237, 225, 0.45)',
      inputFocusBorderColor: '#c8aa6e',
      buttonBgColor: '#c8aa6e',
      buttonTextColor: '#141f18',
      buttonRadius: 26,
      headingFont: 'Cormorant Garamond',
      bodyFont: 'Montserrat'
    },
    texts: {
      badgeText: '🏮 VILLA PERLÈ • ENTRADA DE ENSUEÑO 🏮',
      defaultTitle: 'Nuestra Boda en Villa Perlè',
      defaultSubtitle: 'Entre faroles flotantes y melodías de otoño. Abre tu sobre interactivo.',
      inputLabel: 'Correo o teléfono registrado',
      inputPlaceholder: 'invitado@ejemplo.com o teléfono',
      pinInputLabel: 'NIP de la Villa',
      pinInputPlaceholder: 'Ingresa tu NIP',
      buttonText: 'ABRIR SOBRE VILLA PERLÈ',
      selfRegTitle: 'Solicitar Invitación a Villa Perlè',
      selfRegSubtitle: 'Solicita tu pase exclusivo para acompañarnos en esta noche mágica.',
      selfRegButtonText: 'ENVIAR SOLICITUD'
    },
    decorations: {
      crestSvg: CREST_LANTERN,
      frameAssetUrl: 'assets/boda-villa-perle/envelope-frame-v3.png',
      specialEffect: 'lanterns'
    },
    buildLayers: (acc, eventTitle) => buildStandardLayers(
      TEMPLATE_ACCESS_PRESETS[14].theme,
      TEMPLATE_ACCESS_PRESETS[14].texts,
      CREST_LANTERN,
      acc,
      eventTitle
    )
  },

  // 16. Gran Teatro: Apertura de Cortinas Cinemáticas & Noche de Gala
  {
    templateId: 'boda-teatro',
    aliases: ['boda-teatro', 'template-boda-teatro'],
    name: 'Gran Teatro: Apertura de Cortinas Cinemáticas & Noche de Gala',
    theme: {
      backgroundType: 'image',
      backgroundColor: '#1b0205',
      backgroundImageUrl: 'assets/boda-teatro/curtain-closed.jpg',
      backgroundOverlayOpacity: 55,
      backgroundBlur: 10,
      cardStyle: 'bordered',
      cardBgColor: 'rgba(38, 7, 12, 0.94)',
      cardOpacity: 94,
      cardRadius: 22,
      cardShadow: 'glow',
      cardBorder: '2px solid rgba(234, 179, 8, 0.7)',
      cardBorderGlow: 'rgba(234, 179, 8, 0.4)',
      primaryColor: '#ffffff',
      textColor: '#fff3d6',
      accentColor: '#eab308',
      inputBgColor: 'rgba(255, 255, 255, 0.06)',
      inputBorderColor: 'rgba(234, 179, 8, 0.4)',
      inputTextColor: '#fff3d6',
      inputPlaceholderColor: 'rgba(255, 243, 214, 0.45)',
      inputFocusBorderColor: '#eab308',
      buttonBgColor: '#eab308',
      buttonTextColor: '#2b0509',
      buttonRadius: 14,
      headingFont: 'Cinzel',
      bodyFont: 'Montserrat'
    },
    texts: {
      badgeText: '🎭 GRAN TEATRO DE LA ÓPERA • BOLETO DE GALA 🎭',
      defaultTitle: 'Noche de Gala en el Gran Teatro',
      defaultSubtitle: 'Las cortinas están a punto de abrirse. Presenta tu boleto de gala.',
      inputLabel: 'Correo o teléfono registrado',
      inputPlaceholder: 'invitado@ejemplo.com o teléfono',
      pinInputLabel: 'Clave de Butaca',
      pinInputPlaceholder: 'Ingresa tu NIP',
      buttonText: 'ABRIR CORTINAS DEL TEATRO',
      selfRegTitle: 'Solicitar Boleto de Entrada',
      selfRegSubtitle: 'Solicita tu pase de gala para asistir al estreno teatral nupcial.',
      selfRegButtonText: 'SOLICITAR BOLETO'
    },
    decorations: {
      crestSvg: CREST_THEATER_MASKS,
      frameAssetUrl: 'assets/boda-teatro/scratch-gold.png',
      specialEffect: 'sparkles'
    },
    buildLayers: (acc, eventTitle) => buildStandardLayers(
      TEMPLATE_ACCESS_PRESETS[15].theme,
      TEMPLATE_ACCESS_PRESETS[15].texts,
      CREST_THEATER_MASKS,
      acc,
      eventTitle
    )
  },

  // 17. Eleganza Italiana: Lino Toscano, Lago di Como & Cine Clásico
  {
    templateId: 'boda-eleganza',
    aliases: ['boda-eleganza', 'template-boda-eleganza'],
    name: 'Eleganza Italiana: Lino Toscano, Lago di Como & Cine Clásico',
    theme: {
      backgroundType: 'gradient',
      backgroundColor: '#fbf7f2',
      backgroundGradient: 'radial-gradient(ellipse at 50% 25%, #fdf8f3 0%, #f4e8dc 60%, #e2d1be 100%)',
      backgroundImageUrl: 'assets/boda-eleganza/eleganza-poster.jpg',
      backgroundOverlayOpacity: 25,
      backgroundBlur: 8,
      cardStyle: 'bordered',
      cardBgColor: 'rgba(255, 255, 255, 0.95)',
      cardOpacity: 95,
      cardRadius: 22,
      cardShadow: 'elevated',
      cardBorder: '1.5px solid rgba(200, 109, 81, 0.45)',
      cardBorderGlow: 'rgba(200, 109, 81, 0.25)',
      primaryColor: '#2e211d',
      textColor: '#2c201c',
      accentColor: '#c86d51',
      inputBgColor: '#faf4ee',
      inputBorderColor: 'rgba(200, 109, 81, 0.35)',
      inputTextColor: '#2c201c',
      inputPlaceholderColor: 'rgba(44, 32, 28, 0.45)',
      inputFocusBorderColor: '#c86d51',
      buttonBgColor: '#c86d51',
      buttonTextColor: '#ffffff',
      buttonRadius: 18,
      headingFont: 'Playfair Display',
      bodyFont: 'Montserrat'
    },
    texts: {
      badgeText: '🎬 VILLA DI COMO • INVITO ESCLUSIVO 🎬',
      defaultTitle: 'Una Storia d\'Amore Italiana',
      defaultSubtitle: 'Un viaggio romantico nel Lago di Como. Inserisci i tuoi dati registrati.',
      inputLabel: 'Correo o teléfono registrado',
      inputPlaceholder: 'invitado@ejemplo.com o teléfono',
      pinInputLabel: 'Codice Segreto (NIP)',
      pinInputPlaceholder: 'Ingresa tu NIP',
      buttonText: 'APRIRE INVITO ESCLUSIVO',
      selfRegTitle: 'Richiesta di Invito',
      selfRegSubtitle: 'Invia i tuoi dati per richiedere l\'accesso alla lista degli ospiti.',
      selfRegButtonText: 'INVIARE RICHIESTA'
    },
    decorations: {
      crestSvg: CREST_COMO_VILLA,
      frameAssetUrl: 'assets/boda-eleganza/villa-illustration.png',
      specialEffect: 'none'
    },
    buildLayers: (acc, eventTitle) => buildStandardLayers(
      TEMPLATE_ACCESS_PRESETS[16].theme,
      TEMPLATE_ACCESS_PRESETS[16].texts,
      CREST_COMO_VILLA,
      acc,
      eventTitle
    )
  },

  // 18. Romance Floral: Pétalos en Movimiento, Rosé & Caligrafía Pinyon
  {
    templateId: 'boda-rosas',
    aliases: ['boda-rosas', 'template-boda-rosas'],
    name: 'Romance Floral: Pétalos en Movimiento, Rosé & Caligrafía Pinyon',
    theme: {
      backgroundType: 'gradient',
      backgroundColor: '#fdf5f6',
      backgroundGradient: 'radial-gradient(ellipse at 50% 25%, #fff5f6 0%, #fae6e9 55%, #eed0d5 100%)',
      backgroundImageUrl: 'assets/boda-rosas/floral-corner.png',
      backgroundOverlayOpacity: 25,
      backgroundBlur: 8,
      cardStyle: 'bordered',
      cardBgColor: 'rgba(255, 255, 255, 0.95)',
      cardOpacity: 95,
      cardRadius: 26,
      cardShadow: 'soft',
      cardBorder: '1.5px solid rgba(212, 138, 148, 0.55)',
      cardBorderGlow: 'rgba(212, 138, 148, 0.25)',
      primaryColor: '#2f1d21',
      textColor: '#2f1e22',
      accentColor: '#d48a94',
      inputBgColor: '#fcf2f4',
      inputBorderColor: 'rgba(212, 138, 148, 0.4)',
      inputTextColor: '#2f1e22',
      inputPlaceholderColor: 'rgba(47, 30, 34, 0.45)',
      inputFocusBorderColor: '#d48a94',
      buttonBgColor: '#d48a94',
      buttonTextColor: '#ffffff',
      buttonRadius: 28,
      headingFont: 'Playfair Display',
      bodyFont: 'Montserrat'
    },
    texts: {
      badgeText: '🌸 ROMANCE FLORAL • INVITACIÓN BOTÁNICA 🌸',
      defaultTitle: 'Romance Botánico',
      defaultSubtitle: 'Entre rosas y pétalos flotantes. Ingresa tus datos para abrir la invitación.',
      inputLabel: 'Correo o teléfono registrado',
      inputPlaceholder: 'invitado@ejemplo.com o teléfono',
      pinInputLabel: 'NIP floral',
      pinInputPlaceholder: 'Ingresa tu NIP',
      buttonText: 'ABRIR INVITACIÓN FLORAL',
      selfRegTitle: 'Solicitar Pase Botánico',
      selfRegSubtitle: 'Ingresa tus datos para solicitar pase a la celebración floral.',
      selfRegButtonText: 'SOLICITAR PASE'
    },
    decorations: {
      crestSvg: CREST_ROSES_CAMEO,
      frameAssetUrl: 'assets/boda-rosas/floral-corner.png',
      specialEffect: 'petals'
    },
    buildLayers: (acc, eventTitle) => buildStandardLayers(
      TEMPLATE_ACCESS_PRESETS[17].theme,
      TEMPLATE_ACCESS_PRESETS[17].texts,
      CREST_ROSES_CAMEO,
      acc,
      eventTitle
    )
  },

  // 19. Elegancia Rústica: Girasoles Radiantes, Madera & Anillos Dorados
  {
    templateId: 'boda-girasoles',
    aliases: ['boda-girasoles', 'template-boda-girasoles'],
    name: 'Elegancia Rústica: Girasoles Radiantes, Madera & Anillos Dorados',
    theme: {
      backgroundType: 'image',
      backgroundColor: '#1c130d',
      backgroundImageUrl: 'assets/boda-girasoles/portada-bg.webp',
      backgroundOverlayOpacity: 45,
      backgroundBlur: 8,
      cardStyle: 'bordered',
      cardBgColor: 'rgba(38, 27, 19, 0.92)',
      cardOpacity: 92,
      cardRadius: 22,
      cardShadow: 'glow',
      cardBorder: '1.6px solid rgba(234, 179, 8, 0.6)',
      cardBorderGlow: 'rgba(234, 179, 8, 0.35)',
      primaryColor: '#ffffff',
      textColor: '#fef9c3',
      accentColor: '#eab308',
      inputBgColor: 'rgba(255, 255, 255, 0.06)',
      inputBorderColor: 'rgba(234, 179, 8, 0.4)',
      inputTextColor: '#fef9c3',
      inputPlaceholderColor: 'rgba(254, 249, 195, 0.45)',
      inputFocusBorderColor: '#eab308',
      buttonBgColor: '#eab308',
      buttonTextColor: '#24180f',
      buttonRadius: 20,
      headingFont: 'Playfair Display',
      bodyFont: 'Montserrat'
    },
    texts: {
      badgeText: '🌻 BODA CAMPESTRE • PASE RÚSTICO DE HONOR 🌻',
      defaultTitle: 'Nuestra Boda Rústica',
      defaultSubtitle: 'Iluminada por el sol de los girasoles. Ingresa tus datos para ver el itinerario.',
      inputLabel: 'Correo o teléfono registrado',
      inputPlaceholder: 'invitado@ejemplo.com o teléfono',
      pinInputLabel: 'NIP Campestre',
      pinInputPlaceholder: 'Ingresa tu NIP',
      buttonText: 'ABRIR INVITACIÓN CAMPESTRE',
      selfRegTitle: 'Solicitar Pase Rústico',
      selfRegSubtitle: 'Ingresa tus datos para solicitar pase a la boda en el campo.',
      selfRegButtonText: 'SOLICITAR PASE'
    },
    decorations: {
      crestSvg: CREST_SUNFLOWER,
      frameAssetUrl: 'assets/boda-girasoles/flores-girasoles.webp',
      specialEffect: 'sparkles'
    },
    buildLayers: (acc, eventTitle) => buildStandardLayers(
      TEMPLATE_ACCESS_PRESETS[18].theme,
      TEMPLATE_ACCESS_PRESETS[18].texts,
      CREST_SUNFLOWER,
      acc,
      eventTitle
    )
  },

  // 20. Navy Blue & Gold: Azul Noche, Acuarela & Flores Nobles
  {
    templateId: 'boda-navy-blue',
    aliases: ['boda-navy-blue', 'template-boda-navy-blue'],
    name: 'Navy Blue & Gold: Azul Noche, Acuarela & Flores Nobles',
    theme: {
      backgroundType: 'image',
      backgroundColor: '#071221',
      backgroundImageUrl: 'assets/boda-navy-blue/watercolor-navy-bg.jpg',
      backgroundOverlayOpacity: 40,
      backgroundBlur: 10,
      cardStyle: 'bordered',
      cardBgColor: 'rgba(10, 23, 44, 0.9)',
      cardOpacity: 90,
      cardRadius: 22,
      cardShadow: 'glow',
      cardBorder: '1.6px solid rgba(223, 186, 71, 0.65)',
      cardBorderGlow: 'rgba(223, 186, 71, 0.35)',
      primaryColor: '#ffffff',
      textColor: '#f1f5f9',
      accentColor: '#dfba47',
      inputBgColor: 'rgba(255, 255, 255, 0.06)',
      inputBorderColor: 'rgba(223, 186, 71, 0.35)',
      inputTextColor: '#f1f5f9',
      inputPlaceholderColor: 'rgba(241, 245, 249, 0.45)',
      inputFocusBorderColor: '#dfba47',
      buttonBgColor: '#dfba47',
      buttonTextColor: '#081527',
      buttonRadius: 24,
      headingFont: 'Cinzel',
      bodyFont: 'Montserrat'
    },
    texts: {
      badgeText: '✦ NOCHE DE GALA NUPCIAL • ROYAL NAVY & GOLD ✦',
      defaultTitle: 'Gala Nupcial Azul Noche',
      defaultSubtitle: 'Elegancia y nobleza bajo las estrellas. Valida tus datos para ingresar.',
      inputLabel: 'Correo o teléfono registrado',
      inputPlaceholder: 'invitado@ejemplo.com o teléfono',
      pinInputLabel: 'NIP de Gala Nupcial',
      pinInputPlaceholder: 'Ingresa tu NIP',
      buttonText: 'ABRIR INVITACIÓN REAL',
      selfRegTitle: 'Solicitar Pase Real',
      selfRegSubtitle: 'Solicita tu pase personal para la gala nocturna bajo las estrellas.',
      selfRegButtonText: 'SOLICITAR INVITACIÓN'
    },
    decorations: {
      crestSvg: CREST_NAVY_GOLD,
      frameAssetUrl: 'assets/boda-navy-blue/flores-divisor-gold.png',
      specialEffect: 'starlight'
    },
    buildLayers: (acc, eventTitle) => buildStandardLayers(
      TEMPLATE_ACCESS_PRESETS[19].theme,
      TEMPLATE_ACCESS_PRESETS[19].texts,
      CREST_NAVY_GOLD,
      acc,
      eventTitle
    )
  },

  // 21. Mis XV Borgoña Real: Terciopelo, Oro Imperial & Rosas
  {
    templateId: 'xv-burgundy',
    aliases: ['xv-burgundy', 'template-xv-burgundy'],
    name: 'Mis XV Borgoña Real: Terciopelo, Oro Imperial & Rosas',
    theme: {
      backgroundType: 'image',
      backgroundColor: '#26040e',
      backgroundImageUrl: 'assets/templates/xv-burgundy/velvet-bg.jpg',
      backgroundOverlayOpacity: 45,
      backgroundBlur: 10,
      cardStyle: 'bordered',
      cardBgColor: 'rgba(38, 7, 16, 0.94)',
      cardOpacity: 94,
      cardRadius: 26,
      cardShadow: 'glow',
      cardBorder: '2px solid rgba(223, 186, 71, 0.7)',
      cardBorderGlow: 'rgba(223, 186, 71, 0.35)',
      primaryColor: '#ffffff',
      textColor: '#fceef1',
      accentColor: '#dfba47',
      inputBgColor: 'rgba(255, 255, 255, 0.06)',
      inputBorderColor: 'rgba(223, 186, 71, 0.4)',
      inputTextColor: '#fceef1',
      inputPlaceholderColor: 'rgba(252, 238, 241, 0.45)',
      inputFocusBorderColor: '#dfba47',
      buttonBgColor: '#dfba47',
      buttonTextColor: '#26050e',
      buttonRadius: 28,
      headingFont: 'Cinzel',
      bodyFont: 'Montserrat'
    },
    texts: {
      badgeText: '👑 CORTE IMPERIAL • GRAN GALA XV BORGOÑA REAL 👑',
      defaultTitle: 'Mis XV Años de Borgoña Real',
      defaultSubtitle: 'Una celebración imperial de alta corte. Valida tu pase oficial de honor.',
      inputLabel: 'Correo o teléfono registrado',
      inputPlaceholder: 'invitado@ejemplo.com o teléfono',
      pinInputLabel: 'NIP Imperial de Gala',
      pinInputPlaceholder: 'Ingresa tu NIP',
      buttonText: 'ABRIR INVITACIÓN REAL',
      selfRegTitle: 'Solicitar Pase a la Corte Imperial',
      selfRegSubtitle: 'Solicita tu pase de honor a la gala imperial de Quince Años.',
      selfRegButtonText: 'SOLICITAR PASE REAL'
    },
    decorations: {
      crestSvg: CREST_BURGUNDY_TIARA,
      frameAssetUrl: 'assets/templates/xv-burgundy/tiara-banner.jpg',
      specialEffect: 'sparkles'
    },
    buildLayers: (acc, eventTitle) => buildStandardLayers(
      TEMPLATE_ACCESS_PRESETS[20].theme,
      TEMPLATE_ACCESS_PRESETS[20].texts,
      CREST_BURGUNDY_TIARA,
      acc,
      eventTitle
    )
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

export function getTemplateAccessPreset(templateKey?: string): TemplateAccessScreenPreset {
  if (!templateKey) return TEMPLATE_ACCESS_PRESETS[0];
  const normalized = templateKey.trim().toLowerCase();
  const match = TEMPLATE_ACCESS_PRESETS.find(p =>
    p.templateId === normalized || p.aliases.some(a => a.toLowerCase() === normalized)
  );
  return match || TEMPLATE_ACCESS_PRESETS[0];
}

export function applyTemplateAccessPreset(
  targetAcc: VisualAccessScreenDesign,
  templateKey: string,
  eventTitle?: string,
  preserveUserCustomTexts: boolean = true
): VisualAccessScreenDesign {
  const preset = getTemplateAccessPreset(templateKey);
  const theme = preset.theme;
  const texts = preset.texts;

  targetAcc.templateKey = preset.templateId;
  targetAcc.enabled = true;

  // Apply visual theme
  targetAcc.backgroundType = theme.backgroundType;
  targetAcc.backgroundColor = theme.backgroundColor;
  if (theme.backgroundGradient) targetAcc.backgroundGradient = theme.backgroundGradient;
  if (theme.backgroundImageUrl) targetAcc.backgroundImageUrl = theme.backgroundImageUrl;
  targetAcc.backgroundOverlayOpacity = theme.backgroundOverlayOpacity;
  targetAcc.backgroundBlur = theme.backgroundBlur;

  targetAcc.cardStyle = theme.cardStyle;
  targetAcc.cardBgColor = theme.cardBgColor;
  targetAcc.cardOpacity = theme.cardOpacity;
  targetAcc.cardRadius = theme.cardRadius;
  targetAcc.cardShadow = theme.cardShadow;

  targetAcc.primaryColor = theme.primaryColor;
  targetAcc.textColor = theme.textColor;
  targetAcc.accentColor = theme.accentColor;

  targetAcc.buttonBgColor = theme.buttonBgColor;
  targetAcc.buttonTextColor = theme.buttonTextColor;
  targetAcc.buttonRadius = theme.buttonRadius;

  targetAcc.headingFont = theme.headingFont;
  targetAcc.bodyFont = theme.bodyFont;

  // Texts: preserve if user already wrote their own, otherwise populate from preset
  if (!preserveUserCustomTexts || !targetAcc.badgeText || targetAcc.badgeText.includes('INVITACIÓN DE GALA') || targetAcc.badgeText === 'Acceso Exclusivo') {
    targetAcc.badgeText = texts.badgeText;
  }
  if (!preserveUserCustomTexts || !targetAcc.title || targetAcc.title === 'PASE DE ACCESO' || targetAcc.title === 'Invitación Personal') {
    targetAcc.title = eventTitle || texts.defaultTitle;
  }
  if (!preserveUserCustomTexts || !targetAcc.subtitle || targetAcc.subtitle.includes('Ingresa tu correo o teléfono registrado para abrir')) {
    targetAcc.subtitle = texts.defaultSubtitle;
  }
  if (!preserveUserCustomTexts || !targetAcc.buttonText || targetAcc.buttonText === 'ABRIR INVITACIÓN' || targetAcc.buttonText === 'Solicitar enlace') {
    targetAcc.buttonText = texts.buttonText;
  }
  if (!preserveUserCustomTexts || !targetAcc.inputLabel) {
    targetAcc.inputLabel = texts.inputLabel;
  }
  if (!preserveUserCustomTexts || !targetAcc.inputPlaceholder) {
    targetAcc.inputPlaceholder = texts.inputPlaceholder;
  }
  if (!preserveUserCustomTexts || !targetAcc.pinInputLabel) {
    targetAcc.pinInputLabel = texts.pinInputLabel;
  }
  if (!preserveUserCustomTexts || !targetAcc.pinInputPlaceholder) {
    targetAcc.pinInputPlaceholder = texts.pinInputPlaceholder;
  }
  if (!preserveUserCustomTexts || !targetAcc.selfRegTitle) {
    targetAcc.selfRegTitle = texts.selfRegTitle;
  }
  if (!preserveUserCustomTexts || !targetAcc.selfRegSubtitle) {
    targetAcc.selfRegSubtitle = texts.selfRegSubtitle;
  }
  if (!preserveUserCustomTexts || !targetAcc.selfRegButtonText) {
    targetAcc.selfRegButtonText = texts.selfRegButtonText;
  }

  // Build the corresponding layers
  targetAcc.layers = preset.buildLayers(targetAcc, eventTitle);

  return targetAcc;
}

export function isLegacyOrMismatchedAccessScreen(
  acc?: VisualAccessScreenDesign,
  currentTemplateKey?: string
): boolean {
  if (!acc) return true;
  // If the access screen already has a recognized preset templateKey, it is valid and configured
  if (acc.templateKey) {
    const recognized = TEMPLATE_ACCESS_PRESETS.some(
      p => p.templateId === acc.templateKey || p.aliases.some(a => a.toLowerCase() === acc.templateKey?.toLowerCase())
    );
    if (recognized) {
      return false;
    }
  }
  if (currentTemplateKey) {
    if (currentTemplateKey === 'visual-builder') {
      return !acc.templateKey;
    }
    const preset = getTemplateAccessPreset(currentTemplateKey);
    // If no templateKey was stored on acc, it's legacy
    if (!acc.templateKey) {
      return true;
    }
    // If stored templateKey does not match the active template ID or any of its aliases
    if (acc.templateKey !== preset.templateId && !preset.aliases.includes(acc.templateKey)) {
      return true;
    }
  }
  return false;
}
