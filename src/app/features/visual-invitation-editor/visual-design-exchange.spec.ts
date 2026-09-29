import { createVisualDesignAiPrompt, createVisualDesignExchange } from './visual-design-exchange';
import { VisualDesignImporterService } from './visual-design-importer.service';

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
    expect(prompt).toContain('style.frameEnabled: true');
    expect(prompt).toContain('layouts.mobile, layouts.tablet y layouts.desktop');
    expect(prompt).toContain('marco vacío intencional');
    const example = JSON.parse(prompt.slice(prompt.indexOf('{\n  "format"')));
    expect(example.format).toBe('kyndrasoft-visual-design');
    expect(example.design.sections[0].layers[0].text).toBe('{{event.title}}');
    const frames = example.design.sections.find((section: { id: string }) => section.id === 'recuerdos').layers;
    expect(frames.length).toBe(2);
    expect(frames[0].groupId).toBe(frames[1].groupId);
    expect(frames.every((frame: { type: string; url?: string; style: { frameEnabled: boolean; imageMask: string } }) =>
      frame.type === 'image' && !frame.url && frame.style.frameEnabled && frame.style.imageMask === 'arch')).toBeTrue();
    const importedFrames = new VisualDesignImporterService().fromJson(JSON.stringify(example)).design.sections
      .find((section) => section.id === 'recuerdos')?.layers || [];
    expect(importedFrames.map((frame) => frame.groupId)).toEqual(['fotos-recuerdos', 'fotos-recuerdos']);
    expect(importedFrames.every((frame) => frame.style?.frameEnabled && frame.style?.imageMask === 'arch')).toBeTrue();
  });

  it('documents connected modules and imports the example table/pass flow', () => {
    const prompt = createVisualDesignAiPrompt();
    for (const type of ['rsvp', 'guestPass', 'guestActivity', 'countdown', 'locations', 'itinerary', 'dressCode',
      'gifts', 'lodging', 'gallery', 'album', 'dedications', 'songs']) {
      expect(prompt).toContain(`${type} =`);
    }
    expect(prompt).toContain('NO asigna mesas ni crea invitados');
    expect(prompt).toContain('pass.identify');
    expect(prompt).toContain('rsvp.submit');
    const example = JSON.parse(prompt.slice(prompt.indexOf('{\n  "format"')));
    const result = new VisualDesignImporterService().fromJson(JSON.stringify(example));
    expect(result.design.sections.find((section) => section.id === 'guest-pass')?.type).toBe('guestPass');
    expect(result.design.sections[0].layers.find((layer) => layer.id === 'pass-link')?.binding).toBe('section:guest-pass');
    expect(result.review.find((section) => section.title === 'Mi mesa y pase')?.status).toBe('connected');
  });
});
