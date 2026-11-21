export type AccessCornerStyle =
  | 'baroque'
  | 'botanical'
  | 'artdeco'
  | 'laurel'
  | 'celestial'
  | 'rustic'
  | 'festive'
  | 'minimal';

export type AccessFrameVariant =
  | 'envelope-flap'
  | 'velvet-curtain'
  | 'arch-royal'
  | 'botanical-frame'
  | 'watercolor-wash'
  | 'editorial-border'
  | 'glass-aura'
  | 'double-hairline';

export type AccessDividerStyle =
  | 'diamond'
  | 'floral'
  | 'artdeco'
  | 'laurel'
  | 'stars'
  | 'heart'
  | 'sunflower'
  | 'crown';

export type AccessBackdropPattern =
  | 'damask'
  | 'linen'
  | 'botanical'
  | 'constellation'
  | 'artdeco-rays'
  | 'marble'
  | 'clouds'
  | 'confetti-dots'
  | 'envelope-grid'
  | 'velvet-folds'
  | 'watercolor-blue'
  | 'sunflower-field';

export interface TemplateAccessVisualEnhancement {
  cornerStyle: AccessCornerStyle;
  frameVariant: AccessFrameVariant;
  dividerStyle: AccessDividerStyle;
  backdropPattern: AccessBackdropPattern;
  ambientGlowColor: string;
  secondaryGlowColor: string;
  footerLabel: string;
  isDark: boolean;
}

export const TEMPLATE_VISUAL_ENHANCEMENTS: Record<string, TemplateAccessVisualEnhancement> = {
  'envelope-cards': {
    cornerStyle: 'laurel',
    frameVariant: 'envelope-flap',
    dividerStyle: 'diamond',
    backdropPattern: 'envelope-grid',
    ambientGlowColor: 'rgba(197, 155, 108, 0.28)',
    secondaryGlowColor: 'rgba(180, 130, 80, 0.16)',
    footerLabel: 'SOBRE DIGITAL PRIVADO · EDICIÓN DE AUTOR',
    isDark: false
  },
  'classic-vertical': {
    cornerStyle: 'laurel',
    frameVariant: 'editorial-border',
    dividerStyle: 'laurel',
    backdropPattern: 'marble',
    ambientGlowColor: 'rgba(179, 142, 93, 0.24)',
    secondaryGlowColor: 'rgba(220, 198, 162, 0.22)',
    footerLabel: 'INVITACIÓN CLÁSICA · EDICIÓN IMPERIAL',
    isDark: false
  },
  'modern-minimal': {
    cornerStyle: 'artdeco',
    frameVariant: 'glass-aura',
    dividerStyle: 'diamond',
    backdropPattern: 'constellation',
    ambientGlowColor: 'rgba(196, 165, 116, 0.28)',
    secondaryGlowColor: 'rgba(99, 102, 241, 0.16)',
    footerLabel: 'GALLERY EDITION · ACCESO PRIVADO',
    isDark: true
  },
  'boda-mobile-first': {
    cornerStyle: 'festive',
    frameVariant: 'glass-aura',
    dividerStyle: 'heart',
    backdropPattern: 'botanical',
    ambientGlowColor: 'rgba(219, 112, 147, 0.26)',
    secondaryGlowColor: 'rgba(244, 180, 198, 0.22)',
    footerLabel: 'NUESTRA HISTORIA · PASE PERSONAL',
    isDark: false
  },
  'boda-desktop-first': {
    cornerStyle: 'artdeco',
    frameVariant: 'editorial-border',
    dividerStyle: 'diamond',
    backdropPattern: 'marble',
    ambientGlowColor: 'rgba(212, 175, 55, 0.25)',
    secondaryGlowColor: 'rgba(148, 163, 184, 0.14)',
    footerLabel: 'ÉDITION PRIVÉE · BLACK TIE GALA',
    isDark: true
  },
  'boda-cards-lateral': {
    cornerStyle: 'minimal',
    frameVariant: 'glass-aura',
    dividerStyle: 'heart',
    backdropPattern: 'constellation',
    ambientGlowColor: 'rgba(181, 140, 99, 0.28)',
    secondaryGlowColor: 'rgba(232, 200, 164, 0.18)',
    footerLabel: 'EXPERIENCIA INTERACTIVA · ACCESO VIP',
    isDark: false
  },
  'boda-creativa-premium': {
    cornerStyle: 'artdeco',
    frameVariant: 'arch-royal',
    dividerStyle: 'artdeco',
    backdropPattern: 'artdeco-rays',
    ambientGlowColor: 'rgba(212, 175, 55, 0.32)',
    secondaryGlowColor: 'rgba(161, 118, 42, 0.18)',
    footerLabel: 'ART DÉCO COLLECTION · GALA EXCLUSIVA',
    isDark: true
  },
  'maison-dore': {
    cornerStyle: 'baroque',
    frameVariant: 'arch-royal',
    dividerStyle: 'crown',
    backdropPattern: 'damask',
    ambientGlowColor: 'rgba(212, 175, 55, 0.34)',
    secondaryGlowColor: 'rgba(245, 224, 156, 0.16)',
    footerLabel: 'MAISON DORÉE · HAUTE COUTURE PARIS',
    isDark: true
  },
  'template-boda': {
    cornerStyle: 'botanical',
    frameVariant: 'botanical-frame',
    dividerStyle: 'floral',
    backdropPattern: 'botanical',
    ambientGlowColor: 'rgba(186, 152, 108, 0.26)',
    secondaryGlowColor: 'rgba(236, 218, 194, 0.24)',
    footerLabel: 'CELEBRACIÓN NUPCIAL · PASE RESERVADO',
    isDark: false
  },
  'template-xv': {
    cornerStyle: 'baroque',
    frameVariant: 'arch-royal',
    dividerStyle: 'crown',
    backdropPattern: 'damask',
    ambientGlowColor: 'rgba(224, 142, 177, 0.32)',
    secondaryGlowColor: 'rgba(212, 175, 55, 0.22)',
    footerLabel: 'MIS XV AÑOS · NOCHE DE ENSUEÑO',
    isDark: false
  },
  'template-graduacion': {
    cornerStyle: 'laurel',
    frameVariant: 'editorial-border',
    dividerStyle: 'laurel',
    backdropPattern: 'artdeco-rays',
    ambientGlowColor: 'rgba(212, 175, 55, 0.30)',
    secondaryGlowColor: 'rgba(30, 58, 138, 0.22)',
    footerLabel: 'CLASE DE HONOR · CEREMONIA DE GRADUACIÓN',
    isDark: true
  },
  'template-cumpleanos': {
    cornerStyle: 'festive',
    frameVariant: 'glass-aura',
    dividerStyle: 'stars',
    backdropPattern: 'confetti-dots',
    ambientGlowColor: 'rgba(245, 158, 11, 0.30)',
    secondaryGlowColor: 'rgba(236, 72, 153, 0.20)',
    footerLabel: 'CELEBRACIÓN ESPECIAL · ACCESO DE INVITADO',
    isDark: true
  },
  'template-bautizo': {
    cornerStyle: 'celestial',
    frameVariant: 'watercolor-wash',
    dividerStyle: 'stars',
    backdropPattern: 'clouds',
    ambientGlowColor: 'rgba(147, 197, 253, 0.35)',
    secondaryGlowColor: 'rgba(212, 175, 55, 0.18)',
    footerLabel: 'BENDICIÓN Y GRACIA · INVITACIÓN FAMILIAR',
    isDark: false
  },
  'template-otro': {
    cornerStyle: 'minimal',
    frameVariant: 'double-hairline',
    dividerStyle: 'diamond',
    backdropPattern: 'linen',
    ambientGlowColor: 'rgba(148, 163, 184, 0.26)',
    secondaryGlowColor: 'rgba(203, 213, 225, 0.20)',
    footerLabel: 'EVENTO PRIVADO · ACCESO PERSONALIZADO',
    isDark: false
  },
  'boda-villa-perle': {
    cornerStyle: 'botanical',
    frameVariant: 'watercolor-wash',
    dividerStyle: 'laurel',
    backdropPattern: 'linen',
    ambientGlowColor: 'rgba(14, 116, 144, 0.22)',
    secondaryGlowColor: 'rgba(212, 175, 55, 0.24)',
    footerLabel: 'VILLA L’ORANGERIE · ATELIER ITALIANO',
    isDark: false
  },
  'boda-teatro': {
    cornerStyle: 'baroque',
    frameVariant: 'velvet-curtain',
    dividerStyle: 'crown',
    backdropPattern: 'velvet-folds',
    ambientGlowColor: 'rgba(212, 175, 55, 0.32)',
    secondaryGlowColor: 'rgba(153, 27, 27, 0.30)',
    footerLabel: 'GRAN ESTRENO · PALCO RESERVADO',
    isDark: true
  },
  'boda-eleganza': {
    cornerStyle: 'botanical',
    frameVariant: 'editorial-border',
    dividerStyle: 'laurel',
    backdropPattern: 'linen',
    ambientGlowColor: 'rgba(180, 128, 86, 0.26)',
    secondaryGlowColor: 'rgba(214, 192, 165, 0.24)',
    footerLabel: 'ELEGANZA ITALIANA · LAGO DI COMO',
    isDark: false
  },
  'boda-rosas': {
    cornerStyle: 'botanical',
    frameVariant: 'botanical-frame',
    dividerStyle: 'floral',
    backdropPattern: 'botanical',
    ambientGlowColor: 'rgba(225, 128, 152, 0.30)',
    secondaryGlowColor: 'rgba(251, 207, 232, 0.26)',
    footerLabel: 'ROMANCE FLORAL · JARDÍN DE ROSAS',
    isDark: false
  },
  'boda-girasoles': {
    cornerStyle: 'rustic',
    frameVariant: 'botanical-frame',
    dividerStyle: 'sunflower',
    backdropPattern: 'sunflower-field',
    ambientGlowColor: 'rgba(234, 179, 8, 0.28)',
    secondaryGlowColor: 'rgba(161, 98, 7, 0.18)',
    footerLabel: 'ELEGANCIA RÚSTICA · CAMPO DE GIRASOLES',
    isDark: false
  },
  'boda-navy-blue': {
    cornerStyle: 'celestial',
    frameVariant: 'watercolor-wash',
    dividerStyle: 'floral',
    backdropPattern: 'watercolor-blue',
    ambientGlowColor: 'rgba(212, 175, 55, 0.28)',
    secondaryGlowColor: 'rgba(37, 99, 235, 0.26)',
    footerLabel: 'NAVY BLUE & GOLD · NOCHE DE ZAFIRO',
    isDark: true
  },
  'xv-burgundy': {
    cornerStyle: 'baroque',
    frameVariant: 'arch-royal',
    dividerStyle: 'crown',
    backdropPattern: 'damask',
    ambientGlowColor: 'rgba(212, 175, 55, 0.36)',
    secondaryGlowColor: 'rgba(136, 19, 55, 0.38)',
    footerLabel: 'MIS XV BORGOÑA REAL · CORONA IMPERIAL',
    isDark: true
  }
};

export function getTemplateVisualEnhancement(templateId: string): TemplateAccessVisualEnhancement {
  return TEMPLATE_VISUAL_ENHANCEMENTS[templateId] || TEMPLATE_VISUAL_ENHANCEMENTS['envelope-cards'];
}

export function getCornerOrnamentSvg(style: AccessCornerStyle, color: string): string {
  const c = color || '#c59b6c';
  switch (style) {
    case 'baroque':
      return `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 66V16C4 9.373 9.373 4 16 4H66" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M10 56V18C10 13.582 13.582 10 18 10H56" stroke="${c}" stroke-width="0.9" stroke-opacity="0.65"/>
        <path d="M16 16C24 16 28 12 32 8C28 14 26 20 26 26C20 26 14 28 8 32C12 28 16 24 16 16Z" fill="${c}" fill-opacity="0.22" stroke="${c}" stroke-width="1.1"/>
        <path d="M14 38C18 35 22 36 22 40C22 43 19 45 16 44" stroke="${c}" stroke-width="1" stroke-linecap="round"/>
        <path d="M38 14C35 18 36 22 40 22C43 22 45 19 44 16" stroke="${c}" stroke-width="1" stroke-linecap="round"/>
        <circle cx="16" cy="16" r="2.2" fill="${c}"/>
        <circle cx="48" cy="10" r="1.4" fill="${c}" fill-opacity="0.75"/>
        <circle cx="10" cy="48" r="1.4" fill="${c}" fill-opacity="0.75"/>
      </svg>`;

    case 'botanical':
      return `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 64C6 34 18 14 64 6" stroke="${c}" stroke-width="1.2" stroke-linecap="round" stroke-opacity="0.8"/>
        <path d="M16 32C22 28 28 29 30 34C24 36 18 36 16 32Z" fill="${c}" fill-opacity="0.24" stroke="${c}" stroke-width="1"/>
        <path d="M32 16C28 22 29 28 34 30C36 24 36 18 32 16Z" fill="${c}" fill-opacity="0.24" stroke="${c}" stroke-width="1"/>
        <path d="M10 46C15 44 19 46 20 50C15 51 12 50 10 46Z" fill="${c}" fill-opacity="0.2" stroke="${c}" stroke-width="0.9"/>
        <path d="M46 10C44 15 46 19 50 20C51 15 50 12 46 10Z" fill="${c}" fill-opacity="0.2" stroke="${c}" stroke-width="0.9"/>
        <circle cx="19" cy="19" r="4" fill="${c}" fill-opacity="0.18" stroke="${c}" stroke-width="1"/>
        <circle cx="19" cy="19" r="1.6" fill="${c}"/>
        <circle cx="40" cy="12" r="1.3" fill="${c}" fill-opacity="0.7"/>
        <circle cx="12" cy="40" r="1.3" fill="${c}" fill-opacity="0.7"/>
      </svg>`;

    case 'artdeco':
      return `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 66V4H66" stroke="${c}" stroke-width="1.5"/>
        <path d="M11 54V11H54" stroke="${c}" stroke-width="1" stroke-opacity="0.75"/>
        <path d="M18 38V18H38" stroke="${c}" stroke-width="0.9" stroke-opacity="0.55"/>
        <path d="M4 4L26 26" stroke="${c}" stroke-width="1" stroke-opacity="0.6"/>
        <path d="M4 18L18 4" stroke="${c}" stroke-width="1" stroke-opacity="0.6"/>
        <polygon points="18,12 24,18 18,24 12,18" fill="${c}" fill-opacity="0.28" stroke="${c}" stroke-width="1"/>
        <circle cx="18" cy="18" r="1.8" fill="${c}"/>
      </svg>`;

    case 'laurel':
      return `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 64V14C6 9.582 9.582 6 14 6H64" stroke="${c}" stroke-width="1.3"/>
        <path d="M12 56V16C12 13.79 13.79 12 16 12H56" stroke="${c}" stroke-width="0.8" stroke-dasharray="3 3" stroke-opacity="0.7"/>
        <ellipse cx="22" cy="16" rx="5" ry="2.4" transform="rotate(-20 22 16)" fill="${c}" fill-opacity="0.28" stroke="${c}" stroke-width="0.9"/>
        <ellipse cx="16" cy="22" rx="5" ry="2.4" transform="rotate(-70 16 22)" fill="${c}" fill-opacity="0.28" stroke="${c}" stroke-width="0.9"/>
        <ellipse cx="33" cy="14" rx="4.5" ry="2" transform="rotate(-10 33 14)" fill="${c}" fill-opacity="0.22" stroke="${c}" stroke-width="0.8"/>
        <ellipse cx="14" cy="33" rx="4.5" ry="2" transform="rotate(-80 14 33)" fill="${c}" fill-opacity="0.22" stroke="${c}" stroke-width="0.8"/>
        <circle cx="13" cy="13" r="2" fill="${c}"/>
      </svg>`;

    case 'celestial':
      return `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 62V16C6 10.477 10.477 6 16 6H62" stroke="${c}" stroke-width="1.1" stroke-opacity="0.75"/>
        <path d="M12 46C12 24 24 12 46 12" stroke="${c}" stroke-width="0.85" stroke-dasharray="2 3" stroke-opacity="0.65"/>
        <path d="M22 12L23.6 17.4L29 19L23.6 20.6L22 26L20.4 20.6L15 19L20.4 17.4L22 12Z" fill="${c}" fill-opacity="0.85"/>
        <path d="M38 11L38.9 13.8L41.8 14.7L38.9 15.6L38 18.4L37.1 15.6L34.2 14.7L37.1 13.8L38 11Z" fill="${c}" fill-opacity="0.6"/>
        <path d="M14 35L14.9 37.8L17.8 38.7L14.9 39.6L14 42.4L13.1 39.6L10.2 38.7L13.1 37.8L14 35Z" fill="${c}" fill-opacity="0.6"/>
        <circle cx="52" cy="11" r="1.4" fill="${c}" fill-opacity="0.5"/>
        <circle cx="11" cy="52" r="1.4" fill="${c}" fill-opacity="0.5"/>
      </svg>`;

    case 'rustic':
      return `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 64C7 38 16 18 64 6" stroke="${c}" stroke-width="1.3" stroke-linecap="round"/>
        <circle cx="20" cy="20" r="6" fill="${c}" fill-opacity="0.22" stroke="${c}" stroke-width="1.1"/>
        <circle cx="20" cy="20" r="2.6" fill="${c}"/>
        <path d="M20 10V13M20 27V30M10 20H13M27 20H30M13 13L15.5 15.5M24.5 24.5L27 27M27 13L24.5 15.5M15.5 24.5L13 27" stroke="${c}" stroke-width="1.1" stroke-linecap="round"/>
        <path d="M34 15C38 12 43 13 45 16C40 18 36 18 34 15Z" fill="${c}" fill-opacity="0.25" stroke="${c}" stroke-width="0.9"/>
        <path d="M15 34C12 38 13 43 16 45C18 40 18 36 15 34Z" fill="${c}" fill-opacity="0.25" stroke="${c}" stroke-width="0.9"/>
      </svg>`;

    case 'festive':
      return `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 56V14C6 9.582 9.582 6 14 6H56" stroke="${c}" stroke-width="1.2" stroke-opacity="0.8"/>
        <path d="M20 12L21.5 16.5L26 18L21.5 19.5L20 24L18.5 19.5L14 18L18.5 16.5L20 12Z" fill="${c}"/>
        <circle cx="34" cy="14" r="2.5" fill="${c}" fill-opacity="0.35"/>
        <circle cx="14" cy="34" r="2.5" fill="${c}" fill-opacity="0.35"/>
        <circle cx="44" cy="12" r="1.5" fill="${c}" fill-opacity="0.7"/>
        <circle cx="12" cy="44" r="1.5" fill="${c}" fill-opacity="0.7"/>
        <path d="M28 24C32 22 36 24 38 20" stroke="${c}" stroke-width="1" stroke-linecap="round" stroke-opacity="0.65"/>
      </svg>`;

    case 'minimal':
    default:
      return `<svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 48V6H48" stroke="${c}" stroke-width="1.3" stroke-opacity="0.85"/>
        <path d="M14 28V14H28" stroke="${c}" stroke-width="0.85" stroke-opacity="0.5"/>
        <polygon points="14,10 18,14 14,18 10,14" fill="${c}" fill-opacity="0.65"/>
      </svg>`;
  }
}

export function getDividerFlourishSvg(style: AccessDividerStyle, color: string): string {
  const c = color || '#c59b6c';
  switch (style) {
    case 'floral':
      return `<svg viewBox="0 0 280 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 12H114" stroke="${c}" stroke-width="0.9" stroke-opacity="0.55"/>
        <path d="M166 12H264" stroke="${c}" stroke-width="0.9" stroke-opacity="0.55"/>
        <path d="M114 12C120 7 128 7 132 12C128 17 120 17 114 12Z" fill="${c}" fill-opacity="0.22" stroke="${c}" stroke-width="0.9"/>
        <path d="M166 12C160 7 152 7 148 12C152 17 160 17 166 12Z" fill="${c}" fill-opacity="0.22" stroke="${c}" stroke-width="0.9"/>
        <circle cx="140" cy="12" r="4.5" fill="${c}" fill-opacity="0.25" stroke="${c}" stroke-width="1.1"/>
        <circle cx="140" cy="12" r="1.8" fill="${c}"/>
      </svg>`;

    case 'artdeco':
      return `<svg viewBox="0 0 280 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 12H116M164 12H266" stroke="${c}" stroke-width="1" stroke-opacity="0.6"/>
        <path d="M34 9H106M174 9H246" stroke="${c}" stroke-width="0.6" stroke-opacity="0.35"/>
        <path d="M34 15H106M174 15H246" stroke="${c}" stroke-width="0.6" stroke-opacity="0.35"/>
        <polygon points="140,4 154,12 140,20 126,12" fill="${c}" fill-opacity="0.22" stroke="${c}" stroke-width="1.1"/>
        <polygon points="140,8 147,12 140,16 133,12" fill="${c}"/>
        <polygon points="118,9 123,12 118,15 113,12" fill="${c}" fill-opacity="0.7"/>
        <polygon points="162,9 167,12 162,15 157,12" fill="${c}" fill-opacity="0.7"/>
      </svg>`;

    case 'laurel':
      return `<svg viewBox="0 0 280 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 12H112M168 12H262" stroke="${c}" stroke-width="0.9" stroke-opacity="0.5"/>
        <ellipse cx="122" cy="10" rx="5.5" ry="2.2" transform="rotate(-18 122 10)" fill="${c}" fill-opacity="0.28" stroke="${c}" stroke-width="0.85"/>
        <ellipse cx="131" cy="13" rx="5" ry="2" transform="rotate(14 131 13)" fill="${c}" fill-opacity="0.28" stroke="${c}" stroke-width="0.85"/>
        <ellipse cx="158" cy="10" rx="5.5" ry="2.2" transform="rotate(18 158 10)" fill="${c}" fill-opacity="0.28" stroke="${c}" stroke-width="0.85"/>
        <ellipse cx="149" cy="13" rx="5" ry="2" transform="rotate(-14 149 13)" fill="${c}" fill-opacity="0.28" stroke="${c}" stroke-width="0.85"/>
        <circle cx="140" cy="12" r="2.2" fill="${c}"/>
      </svg>`;

    case 'stars':
      return `<svg viewBox="0 0 280 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 12H114M166 12H262" stroke="${c}" stroke-width="0.85" stroke-dasharray="3 3" stroke-opacity="0.55"/>
        <path d="M140 3L142 9.5L148.5 11.5L142 13.5L140 20L138 13.5L131.5 11.5L138 9.5L140 3Z" fill="${c}"/>
        <path d="M122 7L123 10.5L126.5 11.5L123 12.5L122 16L121 12.5L117.5 11.5L121 10.5L122 7Z" fill="${c}" fill-opacity="0.65"/>
        <path d="M158 7L159 10.5L162.5 11.5L159 12.5L158 16L157 12.5L153.5 11.5L157 10.5L158 7Z" fill="${c}" fill-opacity="0.65"/>
      </svg>`;

    case 'heart':
      return `<svg viewBox="0 0 280 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 12H122M158 12H262" stroke="${c}" stroke-width="0.9" stroke-opacity="0.5"/>
        <path d="M140 18.5C140 18.5 131 13.4 131 8.8C131 6.7 132.7 5.2 134.8 5.2C136.4 5.2 137.9 6.1 138.8 7.4L140 9L141.2 7.4C142.1 6.1 143.6 5.2 145.2 5.2C147.3 5.2 149 6.7 149 8.8C149 13.4 140 18.5 140 18.5Z" fill="${c}" fill-opacity="0.28" stroke="${c}" stroke-width="1.1"/>
        <circle cx="122" cy="12" r="1.5" fill="${c}" fill-opacity="0.7"/>
        <circle cx="158" cy="12" r="1.5" fill="${c}" fill-opacity="0.7"/>
      </svg>`;

    case 'sunflower':
      return `<svg viewBox="0 0 280 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 12H122M158 12H262" stroke="${c}" stroke-width="1" stroke-opacity="0.55"/>
        <circle cx="140" cy="12" r="6" fill="${c}" fill-opacity="0.24" stroke="${c}" stroke-width="1.1"/>
        <circle cx="140" cy="12" r="2.6" fill="${c}"/>
        <path d="M140 3V5M140 19V21M131 12H133M147 12H149" stroke="${c}" stroke-width="1.1" stroke-linecap="round"/>
      </svg>`;

    case 'crown':
      return `<svg viewBox="0 0 280 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 13H114M166 13H266" stroke="${c}" stroke-width="0.95" stroke-opacity="0.55"/>
        <path d="M128 17L125 8L134 12L140 5L146 12L155 8L152 17H128Z" fill="${c}" fill-opacity="0.24" stroke="${c}" stroke-width="1.1" stroke-linejoin="round"/>
        <circle cx="140" cy="4.2" r="1.3" fill="${c}"/>
        <circle cx="118" cy="13" r="1.4" fill="${c}" fill-opacity="0.75"/>
        <circle cx="162" cy="13" r="1.4" fill="${c}" fill-opacity="0.75"/>
      </svg>`;

    case 'diamond':
    default:
      return `<svg viewBox="0 0 280 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 12H124M156 12H262" stroke="${c}" stroke-width="0.9" stroke-opacity="0.55"/>
        <polygon points="140,5 147,12 140,19 133,12" fill="${c}" fill-opacity="0.24" stroke="${c}" stroke-width="1.1"/>
        <circle cx="140" cy="12" r="1.8" fill="${c}"/>
        <circle cx="124" cy="12" r="1.4" fill="${c}" fill-opacity="0.7"/>
        <circle cx="156" cy="12" r="1.4" fill="${c}" fill-opacity="0.7"/>
      </svg>`;
  }
}

export function getTopHeaderArtworkSvg(variant: AccessFrameVariant, accentColor: string, primaryColor: string): string {
  const c = accentColor || '#c59b6c';
  const p = primaryColor || c;

  switch (variant) {
    case 'envelope-flap':
      return `<svg viewBox="0 0 420 74" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 0H420L210 66L0 0Z" fill="${c}" fill-opacity="0.08"/>
        <path d="M0 2L210 68L420 2" stroke="${c}" stroke-width="1.4" stroke-opacity="0.55"/>
        <path d="M18 2L210 60L402 2" stroke="${c}" stroke-width="0.75" stroke-dasharray="4 4" stroke-opacity="0.45"/>
      </svg>`;

    case 'velvet-curtain':
      return `<svg viewBox="0 0 420 62" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 0H420V16C370 46 310 50 260 22C230 38 190 38 160 22C110 50 50 46 0 16V0Z" fill="${p}" fill-opacity="0.24"/>
        <path d="M0 16C50 46 110 50 160 22C190 38 230 38 260 22C310 50 370 46 420 16" stroke="${c}" stroke-width="1.6" stroke-opacity="0.75"/>
        <path d="M0 21C50 51 110 55 160 27C190 43 230 43 260 27C310 55 370 51 420 21" stroke="${c}" stroke-width="0.7" stroke-dasharray="3 3" stroke-opacity="0.5"/>
      </svg>`;

    case 'arch-royal':
      return `<svg viewBox="0 0 420 56" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 52C65 18 135 6 210 6C285 6 355 18 396 52" stroke="${c}" stroke-width="1.2" stroke-opacity="0.5"/>
        <path d="M48 52C85 24 145 14 210 14C275 14 335 24 372 52" stroke="${c}" stroke-width="0.75" stroke-dasharray="3 3" stroke-opacity="0.4"/>
        <path d="M180 12L210 3L240 12" stroke="${c}" stroke-width="1.2" stroke-opacity="0.7"/>
        <circle cx="210" cy="4" r="2.2" fill="${c}" fill-opacity="0.85"/>
      </svg>`;

    case 'botanical-frame':
      return `<svg viewBox="0 0 420 52" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M36 42C95 16 155 10 210 10C265 10 325 16 384 42" stroke="${c}" stroke-width="1" stroke-opacity="0.45"/>
        <ellipse cx="145" cy="14" rx="10" ry="3.5" transform="rotate(-12 145 14)" fill="${c}" fill-opacity="0.18" stroke="${c}" stroke-width="0.8"/>
        <ellipse cx="112" cy="21" rx="9" ry="3" transform="rotate(-18 112 21)" fill="${c}" fill-opacity="0.16" stroke="${c}" stroke-width="0.8"/>
        <ellipse cx="275" cy="14" rx="10" ry="3.5" transform="rotate(12 275 14)" fill="${c}" fill-opacity="0.18" stroke="${c}" stroke-width="0.8"/>
        <ellipse cx="308" cy="21" rx="9" ry="3" transform="rotate(18 308 21)" fill="${c}" fill-opacity="0.16" stroke="${c}" stroke-width="0.8"/>
      </svg>`;

    case 'watercolor-wash':
      return `<svg viewBox="0 0 420 64" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="210" cy="0" rx="220" ry="44" fill="${p}" fill-opacity="0.12"/>
        <ellipse cx="120" cy="6" rx="110" ry="26" fill="${c}" fill-opacity="0.10"/>
        <ellipse cx="300" cy="6" rx="110" ry="26" fill="${c}" fill-opacity="0.10"/>
        <path d="M56 14H364" stroke="${c}" stroke-width="0.8" stroke-opacity="0.35"/>
      </svg>`;

    case 'editorial-border':
      return `<svg viewBox="0 0 420 38" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M28 16H178M242 16H392" stroke="${c}" stroke-width="1" stroke-opacity="0.5"/>
        <path d="M44 20H186M234 20H376" stroke="${c}" stroke-width="0.6" stroke-opacity="0.35"/>
        <polygon points="210,10 218,18 210,26 202,18" fill="${c}" fill-opacity="0.2" stroke="${c}" stroke-width="1"/>
      </svg>`;

    case 'glass-aura':
      return `<svg viewBox="0 0 420 52" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="210" cy="0" rx="180" ry="36" fill="${c}" fill-opacity="0.14"/>
        <path d="M90 12C130 22 170 26 210 26C250 26 290 22 330 12" stroke="${c}" stroke-width="0.9" stroke-opacity="0.4"/>
      </svg>`;

    case 'double-hairline':
    default:
      return `<svg viewBox="0 0 420 30" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M36 14H384" stroke="${c}" stroke-width="0.85" stroke-opacity="0.4"/>
        <circle cx="210" cy="14" r="2.2" fill="${c}" fill-opacity="0.7"/>
      </svg>`;
  }
}

export function getBackdropPatternDataUri(pattern: AccessBackdropPattern, color: string): string {
  const c = encodeURIComponent(color || '#c59b6c');
  let svg = '';

  switch (pattern) {
    case 'damask':
      svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64' fill='none'><path d='M32 6C38 14 44 18 52 32C44 46 38 50 32 58C26 50 20 46 12 32C20 18 26 14 32 6Z' stroke='${c}' stroke-opacity='0.14' stroke-width='0.9'/><circle cx='32' cy='32' r='5' stroke='${c}' stroke-opacity='0.14' stroke-width='0.8'/><circle cx='32' cy='32' r='1.5' fill='${c}' fill-opacity='0.16'/></svg>`;
      break;
    case 'linen':
      svg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'><path d='M0 12H24M12 0V24' stroke='${c}' stroke-opacity='0.09' stroke-width='0.7'/></svg>`;
      break;
    case 'botanical':
      svg = `<svg xmlns='http://www.w3.org/2000/svg' width='72' height='72' viewBox='0 0 72 72' fill='none'><path d='M18 36C24 24 36 22 42 30C34 38 24 40 18 36Z' stroke='${c}' stroke-opacity='0.14' stroke-width='0.9'/><path d='M54 36C48 48 36 50 30 42C38 34 48 32 54 36Z' stroke='${c}' stroke-opacity='0.11' stroke-width='0.8'/><circle cx='36' cy='12' r='1.5' fill='${c}' fill-opacity='0.15'/></svg>`;
      break;
    case 'constellation':
      svg = `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80' fill='none'><circle cx='20' cy='24' r='1.2' fill='${c}' fill-opacity='0.22'/><circle cx='60' cy='16' r='1.5' fill='${c}' fill-opacity='0.18'/><circle cx='48' cy='58' r='1.2' fill='${c}' fill-opacity='0.22'/><path d='M20 24L60 16L48 58' stroke='${c}' stroke-opacity='0.09' stroke-width='0.7'/></svg>`;
      break;
    case 'artdeco-rays':
      svg = `<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60' fill='none'><path d='M0 60C0 26.863 26.863 0 60 0' stroke='${c}' stroke-opacity='0.13' stroke-width='0.9'/><path d='M0 60C0 38 18 20 40 20' stroke='${c}' stroke-opacity='0.10' stroke-width='0.8'/><path d='M0 60L42 18' stroke='${c}' stroke-opacity='0.08' stroke-width='0.7'/></svg>`;
      break;
    case 'marble':
      svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96' fill='none'><path d='M0 24C28 20 44 48 96 42' stroke='${c}' stroke-opacity='0.11' stroke-width='0.9'/><path d='M0 72C36 62 60 88 96 78' stroke='${c}' stroke-opacity='0.08' stroke-width='0.8'/></svg>`;
      break;
    case 'clouds':
      svg = `<svg xmlns='http://www.w3.org/2000/svg' width='72' height='72' viewBox='0 0 72 72' fill='none'><path d='M12 44C12 36 20 32 28 36C34 28 48 30 52 38C58 38 62 42 62 46' stroke='${c}' stroke-opacity='0.14' stroke-width='0.9' stroke-linecap='round'/><circle cx='36' cy='18' r='1.4' fill='${c}' fill-opacity='0.18'/></svg>`;
      break;
    case 'confetti-dots':
      svg = `<svg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56' fill='none'><circle cx='14' cy='16' r='2' fill='${c}' fill-opacity='0.16'/><polygon points='42,10 45,14 42,18 39,14' fill='${c}' fill-opacity='0.18'/><circle cx='28' cy='42' r='1.6' fill='${c}' fill-opacity='0.16'/></svg>`;
      break;
    case 'velvet-folds':
      svg = `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40' fill='none'><rect x='0' y='0' width='20' height='40' fill='${c}' fill-opacity='0.04'/><path d='M20 0V40' stroke='${c}' stroke-opacity='0.09' stroke-width='0.8'/></svg>`;
      break;
    case 'watercolor-blue':
      svg = `<svg xmlns='http://www.w3.org/2000/svg' width='76' height='76' viewBox='0 0 76 76' fill='none'><circle cx='38' cy='38' r='22' stroke='${c}' stroke-opacity='0.10' stroke-width='0.8' stroke-dasharray='3 4'/><path d='M38 14L40 20L46 22L40 24L38 30L36 24L30 22L36 20L38 14Z' fill='${c}' fill-opacity='0.13'/></svg>`;
      break;
    case 'sunflower-field':
      svg = `<svg xmlns='http://www.w3.org/2000/svg' width='68' height='68' viewBox='0 0 68 68' fill='none'><circle cx='34' cy='34' r='6' stroke='${c}' stroke-opacity='0.15' stroke-width='0.9'/><circle cx='34' cy='34' r='2' fill='${c}' fill-opacity='0.18'/><path d='M34 22V26M34 42V46M22 34H26M42 34H46' stroke='${c}' stroke-opacity='0.14' stroke-width='0.9'/></svg>`;
      break;
    case 'envelope-grid':
    default:
      svg = `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48' fill='none'><path d='M0 24L24 0L48 24L24 48L0 24Z' stroke='${c}' stroke-opacity='0.11' stroke-width='0.8'/><circle cx='24' cy='24' r='1.3' fill='${c}' fill-opacity='0.16'/></svg>`;
      break;
  }

  return `url("data:image/svg+xml,${svg}")`;
}
