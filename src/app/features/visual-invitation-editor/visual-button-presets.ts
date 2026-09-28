import { VisualInvitationLayerStyle } from '../../core/models';

export interface VisualButtonPreset {
  key: string;
  name: string;
  style: Partial<VisualInvitationLayerStyle>;
}

export const VISUAL_BUTTON_PRESETS: VisualButtonPreset[] = [
  {
    key: 'editorial', name: 'Editorial',
    style: { buttonVariant: 'solid', fontFamily: "'Cormorant Garamond', serif", fontSize: 21, fontWeight: 700,
      color: '#ffffff', backgroundColor: '#252321', borderWidth: 0, borderRadius: 2, padding: 12,
      boxShadow: '0 7px 18px rgba(31,27,25,.18)', hoverBackgroundColor: '#45403c', hoverColor: '#ffffff' }
  },
  {
    key: 'gold', name: 'Gala',
    style: { buttonVariant: 'outline', fontFamily: 'Cinzel, serif', fontSize: 15, fontWeight: 600,
      color: '#6e5030', backgroundColor: '#fffaf0', borderColor: '#b4905d', borderWidth: 2, borderStyle: 'solid', borderRadius: 2,
      padding: 12, boxShadow: '0 4px 14px rgba(95,67,32,.12)', hoverBackgroundColor: '#6e5030', hoverColor: '#ffffff' }
  },
  {
    key: 'romantic', name: 'Romántico',
    style: { buttonVariant: 'solid', fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 600,
      color: '#542e3c', backgroundColor: '#f5d8df', borderWidth: 0, borderRadius: 28, padding: 12,
      boxShadow: '0 7px 16px rgba(124,67,86,.16)', hoverBackgroundColor: '#eebecb', hoverColor: '#542e3c' }
  },
  {
    key: 'garden', name: 'Jardín',
    style: { buttonVariant: 'solid', fontFamily: 'Montserrat, sans-serif', fontSize: 15, fontWeight: 700,
      color: '#ffffff', backgroundColor: '#335b46', borderWidth: 0, borderRadius: 8, padding: 12,
      boxShadow: '0 5px 12px rgba(24,65,44,.18)', hoverBackgroundColor: '#264c39', hoverColor: '#ffffff' }
  },
  {
    key: 'celebration', name: 'Celebración',
    style: { buttonVariant: 'solid', fontFamily: 'Montserrat, sans-serif', fontSize: 15, fontWeight: 700,
      color: '#ffffff', backgroundColor: '#d65253', borderWidth: 0, borderRadius: 8, padding: 12,
      boxShadow: '0 6px 15px rgba(187,68,72,.2)', hoverBackgroundColor: '#b83d43', hoverColor: '#ffffff' }
  },
  {
    key: 'aurora', name: 'Aurora',
    style: { buttonVariant: 'solid', fontFamily: 'Montserrat, sans-serif', fontSize: 15, fontWeight: 700,
      color: '#ffffff', backgroundColor: '#166c70', gradientEnabled: true, gradientStart: '#146d70', gradientEnd: '#364b83',
      gradientAngle: 110, borderWidth: 0, borderRadius: 8, padding: 12,
      boxShadow: '0 8px 18px rgba(21,75,91,.24)', hoverBackgroundColor: '#205b72', hoverColor: '#ffffff' }
  },
  {
    key: 'ticket', name: 'Etiqueta',
    style: { buttonVariant: 'outline', fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 700,
      color: '#704936', backgroundColor: '#fff9ee', borderColor: '#a5674d', borderWidth: 2, borderStyle: 'dashed',
      borderRadius: 2, padding: 12, textTransform: 'uppercase', boxShadow: 'none',
      hoverBackgroundColor: '#f2e1d4', hoverColor: '#704936' }
  },
  {
    key: 'minimal', name: 'Minimal',
    style: { buttonVariant: 'text', fontFamily: 'Montserrat, sans-serif', fontSize: 16, fontWeight: 700,
      color: '#292523', backgroundColor: 'transparent', borderColor: '#292523', borderWidth: 0, borderRadius: 0,
      padding: 8, textDecoration: 'underline', boxShadow: 'none', hoverBackgroundColor: '#29252314', hoverColor: '#292523' }
  }
];

export function buttonPresetStyle(preset: VisualButtonPreset): Record<string, string> {
  const style = preset.style;
  return {
    color: String(style.color || '#25211f'), backgroundColor: String(style.backgroundColor || 'transparent'),
    backgroundImage: style.gradientEnabled ? `linear-gradient(${style.gradientAngle || 0}deg,${style.gradientStart},${style.gradientEnd})` : 'none',
    fontFamily: String(style.fontFamily || 'Arial, sans-serif'), fontSize: `${style.fontSize || 15}px`,
    fontWeight: String(style.fontWeight || 400), textTransform: String(style.textTransform || 'none'),
    border: `${style.borderWidth || 0}px ${style.borderStyle || 'solid'} ${style.borderColor || 'transparent'}`,
    borderRadius: `${style.borderRadius || 0}px`, boxShadow: String(style.boxShadow || 'none'),
    textDecoration: String(style.textDecoration || 'none')
  };
}
