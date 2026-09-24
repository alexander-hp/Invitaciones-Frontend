import { VisualDesignImporterService } from './visual-design-importer.service';

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
