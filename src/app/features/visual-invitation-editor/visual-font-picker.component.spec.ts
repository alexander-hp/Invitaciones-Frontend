import { ElementRef } from '@angular/core';
import { VisualFontPickerComponent } from './visual-font-picker.component';

describe('VisualFontPickerComponent', () => {
  let component: VisualFontPickerComponent;

  beforeEach(() => {
    localStorage.removeItem('visual-editor-recent-fonts');
    component = new VisualFontPickerComponent(new ElementRef(document.createElement('div')));
  });

  it('shows a safe fallback for designs without a saved font', () => {
    component.value = undefined;

    expect(component.selectedFont.name).toBe('Arial');
    expect(component.selectedFont.family).toBe('Arial, sans-serif');
  });

  it('filters fonts by category and name', () => {
    component.setCategory('script');
    component.query = 'vibes';

    expect(component.filteredFonts.map((font) => font.name)).toEqual(['Great Vibes']);
  });

  it('emits the selected family and remembers it', () => {
    let selected = '';
    component.valueChange.subscribe((value) => selected = value);
    const font = component.fonts.find((item) => item.name === 'Lora')!;

    component.select(font);

    expect(selected).toBe("'Lora', serif");
    expect(component.recentFonts[0].name).toBe('Lora');
  });
});
