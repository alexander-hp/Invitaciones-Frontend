import { VisualInvitationDesign } from '../../core/models';
import { applyPaletteToVisualDesign, paletteFromVisualDesign, validPaletteColor } from './visual-palette';

describe('visual invitation palette', () => {
  const design = (): VisualInvitationDesign => ({
    version: 2,
    active: true,
    mode: 'advanced',
    theme: {
      backgroundColor: '#FFF9E8', textColor: '#4A3A25', accentColor: '#F5B82E',
      headingFont: 'Georgia', bodyFont: 'Arial', buttonBackgroundColor: '#E8A91B',
      buttonTextColor: '#FFFFFF', buttonStyle: 'solid', buttonRadius: 24
    },
    sections: [{
      id: 'hero', type: 'hero', enabled: true, layout: 'canvas', height: 700,
      background: { color: '#FFF9E8' },
      layers: [
        { id: 'title', type: 'text', x: 0, y: 0, width: 50, height: 20, style: { color: '#4a3a25' } },
        { id: 'button', type: 'button', x: 0, y: 30, width: 50, height: 20, style: { backgroundColor: '#E8A91B', color: '#FFFFFF' } },
        { id: 'custom', type: 'shape', x: 0, y: 60, width: 50, height: 20, style: { backgroundColor: '#FFE9A5' } }
      ]
    }]
  });

  it('reads current colors from the visual design', () => {
    expect(paletteFromVisualDesign(design())).toEqual({
      primary: '#4A3A25', secondary: '#FFF9E8', accent: '#F5B82E'
    });
  });

  it('updates themed elements without replacing custom colors', () => {
    const current = design();
    applyPaletteToVisualDesign(current, { primary: '#123456', secondary: '#F0F0F0', accent: '#008877' });
    expect(current.theme?.textColor).toBe('#123456');
    expect(current.theme?.backgroundColor).toBe('#F0F0F0');
    expect(current.theme?.buttonBackgroundColor).toBe('#008877');
    expect(current.theme?.buttonTextColor).toBe('#FFFFFF');
    expect(current.sections[0].background?.color).toBe('#F0F0F0');
    expect(current.sections[0].layers[0].style?.color).toBe('#123456');
    expect(current.sections[0].layers[1].style?.backgroundColor).toBe('#008877');
    expect(current.sections[0].layers[2].style?.backgroundColor).toBe('#FFE9A5');
  });

  it('ignores incomplete manual hex colors', () => {
    expect(validPaletteColor('#12')).toBeFalse();
    expect(validPaletteColor('#123456')).toBeTrue();
  });
});
