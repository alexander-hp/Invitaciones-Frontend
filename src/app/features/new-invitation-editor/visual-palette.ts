import { VisualInvitationDesign, VisualInvitationLayerStyle } from '../../core/models';

export interface InvitationPaletteColors {
  primary: string;
  secondary: string;
  accent: string;
}

export function validPaletteColor(value: string): boolean {
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

export function paletteFromVisualDesign(design: VisualInvitationDesign): InvitationPaletteColors | undefined {
  const theme = design.theme;
  if (!theme) return undefined;
  return {
    primary: theme.textColor,
    secondary: theme.backgroundColor,
    accent: theme.accentColor
  };
}

export function applyPaletteToVisualDesign(design: VisualInvitationDesign, palette: InvitationPaletteColors): void {
  const theme = design.theme;
  if (!theme) return;

  const oldColors = new Map<string, string>();
  const replace = (before: string | undefined, after: string): void => {
    if (before && validPaletteColor(before)) oldColors.set(before.toLowerCase(), after);
  };
  replace(theme.textColor, palette.primary);
  replace(theme.backgroundColor, palette.secondary);
  replace(theme.accentColor, palette.accent);
  replace(theme.buttonBackgroundColor, palette.accent);

  const recolor = (value: string | undefined): string | undefined =>
    value && validPaletteColor(value) ? oldColors.get(value.toLowerCase()) || value : value;

  design.theme = {
    ...theme,
    textColor: palette.primary,
    backgroundColor: palette.secondary,
    accentColor: palette.accent,
    buttonBackgroundColor: palette.accent
  };

  const styleKeys: Array<keyof VisualInvitationLayerStyle> = [
    'color', 'backgroundColor', 'borderColor', 'hoverColor', 'hoverBackgroundColor', 'gradientStart', 'gradientEnd'
  ];
  for (const section of design.sections || []) {
    if (section.background?.color) section.background.color = recolor(section.background.color);
    for (const layer of section.layers || []) {
      if (!layer.style) continue;
      for (const key of styleKeys) {
        const value = layer.style[key];
        if (typeof value === 'string') (layer.style as any)[key] = recolor(value);
      }
    }
  }
}
