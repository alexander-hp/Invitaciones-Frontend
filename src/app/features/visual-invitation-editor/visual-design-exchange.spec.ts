import { createVisualDesignAiPrompt, createVisualDesignExchange } from './visual-design-exchange';

describe('Visual design exchange', () => {
  it('exports the editable design in a versioned format', () => {
    const design = { version: 2, active: true, mode: 'easy' as const, sections: [] };
    expect(createVisualDesignExchange(design)).toEqual({ format: 'kyndrasoft-visual-design', version: 1, design });
  });

  it('generates instructions with valid JSON and without guest data', () => {
    const prompt = createVisualDesignAiPrompt('cumpleanos');
    expect(prompt).toContain('cumpleanos');
    expect(prompt).toContain('{{event.title}}');
    expect(prompt).toContain('section:rsvp');
    expect(prompt).toContain('No incluyas nombres, correos ni teléfonos reales');
    const example = JSON.parse(prompt.slice(prompt.indexOf('{\n  "format"')));
    expect(example.format).toBe('kyndrasoft-visual-design');
    expect(example.design.sections[0].layers[0].text).toBe('{{event.title}}');
  });
});
