import { VisualDesignImporterService } from './visual-design-importer.service';
import { createVisualDesignExchange } from './visual-design-exchange';

describe('VisualDesignImporterService', () => {
  let service: VisualDesignImporterService;
  const theme = {
    backgroundColor: '#ffffff',
    textColor: '#292523',
    accentColor: '#b57c62',
    headingFont: 'Georgia, serif',
    bodyFont: 'Arial, sans-serif',
    buttonBackgroundColor: '#292523',
    buttonTextColor: '#ffffff',
    buttonStyle: 'solid',
    buttonRadius: 8
  } as any;

  beforeEach(() => {
    service = new VisualDesignImporterService();
  });

  it('imports an exported design from another chat without losing presentation or actions', () => {
    const original = {
      version: 2, active: true, mode: 'advanced' as const, presentationMode: 'chapters' as const,
      responsiveMode: 'independent' as const, theme, sections: [
        { id: 'hero', type: 'hero', title: 'Portada', enabled: true, layout: 'canvas' as const, height: 760,
          layers: [{ id: 'title', type: 'text' as const, text: '{{event.title}}', x: 10, y: 20, width: 80, height: 20 },
            { id: 'cta', type: 'button' as const, text: 'Confirmar', binding: 'section:rsvp', x: 20, y: 80, width: 60, height: 9 }] },
        { id: 'rsvp', type: 'rsvp', enabled: true, layout: 'canvas' as const, height: 920, layers: [] }
      ]
    };
    const json = `\`\`\`json\n${JSON.stringify(createVisualDesignExchange(original))}\n\`\`\``;
    const result = service.fromJson(json);
    expect(result.design.presentationMode).toBe('chapters');
    expect(result.design.responsiveMode).toBe('independent');
    expect(result.design.sections[0].layers[1].binding).toBe('section:rsvp');
    expect(result.review[1].status).toBe('connected');
  });

  it('rejects empty designs, unsupported versions and unsafe media URLs', () => {
    expect(() => service.fromJson('')).toThrowError(/Pega el JSON/);
    expect(() => service.fromJson('aquí está tu diseño')).toThrowError(/JSON válido/);
    expect(() => service.fromJson('{"sections":[]}')).toThrowError(/secciones/);
    expect(() => service.fromJson('{"format":"kyndrasoft-visual-design","version":9,"design":{"sections":[]}}')).toThrowError(/versión/);
    const result = service.fromJson(JSON.stringify({ sections: [{ id: 'one', type: 'hero', enabled: true, layout: 'canvas', height: 640,
      layers: [{ id: 'bad', type: 'image', url: 'javascript:alert(1)', x: 0, y: 0, width: 50, height: 50 }] }] }));
    expect(result.design.sections[0].layers[0].url).toBeUndefined();
  });

  it('preserves layers crossing sections in continuous designs and repairs invalid numbers', () => {
    const result = service.fromJson(JSON.stringify({ presentationMode: 'continuous', sections: [
      { id: 'one', type: 'hero', enabled: true, layout: 'canvas', height: 640, layers: [
        { id: 'crossing', type: 'text', x: 10, y: 125, width: 40, height: 12 },
        { id: 'invalid', type: 'text', x: 'bad', y: -12, width: 'bad', height: 10 }
      ] },
      { id: 'two', type: 'custom', enabled: true, layout: 'canvas', height: 640, layers: [] }
    ] }));
    expect(result.design.sections[0].layers[0].y).toBe(125);
    expect(result.design.sections[0].layers[1].x).toBe(0);
    expect(result.design.sections[0].layers[1].width).toBe(20);
    expect(result.design.sections[0].layers[1].y).toBe(-12);
  });

  it('keeps decorative bleed and converts supported AI animation and rotation', () => {
    const result = service.fromJson(JSON.stringify({ format: 'kyndrasoft-visual-design', version: 1, design: {
      version: 2, active: true, mode: 'advanced', presentationMode: 'continuous', sections: [
        { id: 'bee-hero', type: 'hero', enabled: true, layout: 'canvas', height: 820, layers: [
          { id: 'sun', type: 'shape', x: 68, y: 3, width: 38, height: 28,
            style: { backgroundColor: '#ffe9a5', animation: 'float 7s ease-in-out infinite', transform: 'rotate(5deg)', fontStyle: 'italic' } },
          { id: 'cloud', type: 'shape', x: -10, y: 9, width: 48, height: 15, style: { backgroundColor: '#ffffff' } }
        ] }
      ]
    } }));
    const [sun, cloud] = result.design.sections[0].layers;
    expect(sun.x + sun.width).toBe(106);
    expect(cloud.x).toBe(-10);
    expect(sun.animation).toEqual({ type: 'float', duration: 7, delay: 0, repeat: true });
    expect(sun.rotation).toBe(5);
    expect(sun.style?.fontStyle).toBe('italic');
    expect((sun.style as Record<string, unknown>)['animation']).toBeUndefined();
    expect((sun.style as Record<string, unknown>)['transform']).toBeUndefined();
    expect(result.warnings.join(' ')).toContain('sobresalen del ancho');
    expect(result.warnings.join(' ')).toContain('Se conservó su posición');
    expect(result.warnings.join(' ')).toContain('solo visual');
  });

  it('converts the animation names used by an external AI without dropping styles', () => {
    const names = ['fadeIn', 'fadeInUp', 'fadeInLeft', 'fadeInRight', 'pulse', 'bounce'];
    const result = service.fromJson(JSON.stringify({ sections: [{ id: 'hero', type: 'hero', enabled: true, layout: 'canvas', height: 640,
      layers: names.map((name, index) => ({ id: `layer-${index}`, type: 'text', text: name, x: 5, y: 5, width: 20, height: 10,
        style: { animation: `${name} 1.2s ease-in-out infinite` } })) }] }));
    expect(result.design.sections[0].layers.map((layer) => layer.animation?.type)).toEqual(['fade', 'slide-up', 'slide-right', 'slide-left', 'pulse', 'bounce']);
    expect(result.warnings.join(' ')).not.toContain('no compatibles');
  });

  it('converts an imported RSVP form into a complete native module', async () => {
    const result = await service.fromHtml(`
      <section data-kyndra-component="rsvp" aria-label="Confirma tu asistencia">
        <h2>Confirmacion RSVP</h2>
        <form>
          <label>Nombre <input name="name" placeholder="Tu nombre"></label>
          <label>Correo <input name="email" type="email"></label>
          <label>Asistiras <select name="response"><option>Si</option></select></label>
          <button>Confirmar asistencia</button>
        </form>
      </section>
    `, 'section { min-height: 640px; } input, select, button { display: block; width: 280px; height: 44px; }', theme);

    const section = result.design.sections[0];
    const bindings = section.layers.map((layer) => layer.binding);
    expect(section.type).toBe('rsvp');
    expect(bindings).toContain('rsvp.name');
    expect(bindings).toContain('rsvp.email');
    expect(bindings).toContain('rsvp.response');
    expect(bindings).toContain('rsvp.companions');
    expect(bindings).toContain('rsvp.submit');
    expect(bindings).toContain('rsvp.feedback');
    expect(result.warnings.join(' ')).toContain('RSVP');
    expect(result.review[0].status).toBe('connected');
  });

  it('recognizes a DJ form by its content and preserves editable controls', async () => {
    const result = await service.fromHtml(`
      <section aria-label="Peticiones al DJ">
        <h2>Pide una cancion</h2>
        <form>
          <input name="song" placeholder="Nombre de la cancion">
          <input name="artist" placeholder="Artista">
          <input name="spotify" placeholder="Enlace de Spotify o YouTube">
          <button type="submit">Enviar al DJ</button>
        </form>
      </section>
    `, 'section { min-height: 560px; } input, button { display: block; width: 260px; height: 42px; }', theme);

    const section = result.design.sections[0];
    const bindings = section.layers.map((layer) => layer.binding);
    expect(section.type).toBe('songs');
    expect(bindings).toContain('song.title');
    expect(bindings).toContain('song.artist');
    expect(bindings).toContain('song.sourceUrl');
    expect(bindings).toContain('song.submit');
    expect(bindings).toContain('song.feedback');
    expect(result.review[0].status).toBe('connected');
  });

  it('marks an unknown imported form for manual review', async () => {
    const result = await service.fromHtml(`
      <section aria-label="Formulario personalizado">
        <h2>Pregunta especial</h2>
        <form><input name="custom-answer"><button>Guardar respuesta</button></form>
      </section>
    `, 'section { min-height: 400px; }', theme);

    expect(result.design.sections[0].type).toBe('custom');
    expect(result.review[0].status).toBe('review');
    expect(result.design.sections[0].layers.some((layer) => layer.type === 'field' && layer.name === 'Campo 1')).toBeTrue();
  });
});
