import { EventModel, InvitationContent } from '../../core/models';
import { buildCompleteDesign, COMPLETE_DESIGN_PRESETS } from './complete-design-library';

describe('complete design library', () => {
  let counter: number;
  const event = { title: 'Iris y Alex', type: 'boda', date: '2026-12-12' } as EventModel;
  const nextId = (prefix: string) => `${prefix}-${++counter}`;

  beforeEach(() => { counter = 0; });

  it('provides complete editable designs with different compositions', () => {
    const content: InvitationContent = { coverImageUrl: 'https://example.com/cover.jpg', locations: [{ name: 'Ceremonia', address: 'Centro' }], gallery: ['https://example.com/photo.jpg'] };
    const designs = COMPLETE_DESIGN_PRESETS.map((preset) => buildCompleteDesign(preset.key, content, event, nextId));
    expect(designs.every((design) => design.sections.some((section) => section.type === 'rsvp'))).toBeTrue();
    expect(designs.every((design) => design.sections.some((section) => section.type === 'locations'))).toBeTrue();
    expect(designs.every((design) => design.sections.some((section) => section.type === 'gallery'))).toBeTrue();
    expect(new Set(designs.map((design) => design.sections[0].layers.map((layer) => layer.type).join(','))).size).toBeGreaterThan(1);
    expect(designs.every((design) => design.sections[0].layers.some((layer) => layer.binding === 'section:rsvp'))).toBeTrue();
    expect(designs.every((design) => design.sections[0].layers.some((layer) => layer.url === content.coverImageUrl))).toBeTrue();
  });

  it('omits disabled modules and does not create broken actions', () => {
    const content: InvitationContent = { sectionSettings: { rsvp: false, guestAlbum: false, dedications: false, songRequests: false, locations: false }, locations: [{ name: 'Venue' }] };
    const design = buildCompleteDesign('editorial', content, event, nextId);
    expect(design.sections.map((section) => section.type)).toEqual(['hero', 'custom', 'countdown']);
    expect(design.sections[0].layers.some((layer) => layer.binding === 'section:rsvp')).toBeFalse();
    expect(design.sections[0].layers.some((layer) => layer.type === 'image')).toBeFalse();
  });

  it('uses invitation data bindings and unique IDs without mutating content', () => {
    const content: InvitationContent = { headline: 'Mi evento', message: 'Acompananos', coverImageUrl: 'https://example.com/cover.jpg' };
    const before = JSON.stringify(content);
    const design = buildCompleteDesign('romantic', content, event, nextId);
    const layers = design.sections.flatMap((section) => section.layers);
    const ids = [...design.sections.map((section) => section.id), ...layers.map((layer) => layer.id)];
    expect(new Set(ids).size).toBe(ids.length);
    expect(layers.some((layer) => layer.text === '{{invitation.headline}}')).toBeTrue();
    expect(layers.some((layer) => layer.text === '{{invitation.message}}')).toBeTrue();
    expect(JSON.stringify(content)).toBe(before);
  });

  it('builds the birthday flow from event photos, venue and program', () => {
    const birthday = { ...event, title: 'Cumplea\u00f1os de Iris', type: 'cumpleanos' } as EventModel;
    const content: InvitationContent = {
      headline: 'Celebra conmigo', coverImageUrl: 'https://example.com/iris-cover.jpg',
      galleryItems: [{ url: 'https://example.com/iris-gallery.jpg', title: 'Un recuerdo' }],
      locations: [{ name: 'Sal\u00f3n', address: 'Centro' }], itinerary: [{ time: '17:00', title: 'Fiesta' }],
      sectionSettings: { giftRegistry: false, digitalEnvelope: false }
    };
    const design = buildCompleteDesign('birthday', content, birthday, nextId);
    const types = design.sections.map((item) => item.type);
    expect(types.slice(0, 6)).toEqual(['hero', 'custom', 'countdown', 'locations', 'itinerary', 'gallery']);
    expect(types.indexOf('rsvp')).toBeLessThan(types.indexOf('songs'));
    expect(types).not.toContain('gifts');
    expect(design.sections[0].layers.some((item) => item.url === content.coverImageUrl)).toBeTrue();
    expect(design.sections[0].layers.some((item) => item.binding === 'section:rsvp')).toBeTrue();
  });

  it('builds baptism around story, ceremony and dedications without inventing gifts', () => {
    const baptism = { ...event, title: 'Bautizo de Mateo', type: 'bautizo' } as EventModel;
    const content: InvitationContent = {
      coverImageUrl: 'https://example.com/mateo-cover.jpg', storyBody: 'Nuestra familia comparte este momento.',
      locations: [{ name: 'Parroquia', address: 'Plaza central' }], dressCode: 'Formal',
      sectionSettings: { songRequests: false }
    };
    const design = buildCompleteDesign('baptism', content, baptism, nextId);
    const types = design.sections.map((item) => item.type);
    expect(types.slice(0, 5)).toEqual(['hero', 'custom', 'story', 'countdown', 'locations']);
    expect(types.indexOf('dedications')).toBeGreaterThan(types.indexOf('rsvp'));
    expect(types).not.toContain('gifts');
    expect(types).not.toContain('songs');
    expect(design.sections[0].layers.some((item) => item.url === content.coverImageUrl)).toBeTrue();
  });

  it('builds haute-couture design with luxury art direction, elevated cards and complete modules', () => {
    const wedding = { ...event, title: 'Victoria & Alejandro', type: 'boda', date: '2026-11-20' } as EventModel;
    const content: InvitationContent = {
      coverImageUrl: 'https://example.com/victoria-cover.jpg',
      storyBody: 'Una historia de amor inigualable.',
      locations: [{ name: 'Catedral Metropolitana', address: 'Av. Hidalgo 1' }],
      itinerary: [{ time: '18:00', title: 'Recepción Real' }],
      dressCode: 'Rigurosa Etiqueta / Black Tie',
      galleryItems: [{ url: 'https://example.com/gallery1.jpg', title: 'Editorial 1' }],
      giftRegistry: [{ store: 'Liverpool', url: 'https://liverpool.com' }],
      lodging: [{ name: 'Hotel Four Seasons', address: 'Paseo de la Reforma' }],
      sectionSettings: {}
    };
    const design = buildCompleteDesign('haute-couture', content, wedding, nextId);
    expect(design.theme?.headingFont).toBe("'Cinzel Decorative', serif");
    expect(design.theme?.buttonRadius).toBe(30);

    const hero = design.sections[0];
    expect(hero.type).toBe('hero');
    expect(hero.layers.some((l) => l.type === 'image' && l.style?.imageMask === 'arch')).toBeTrue();
    expect(hero.layers.some((l) => l.type === 'button' && l.binding === 'section:rsvp')).toBeTrue();

    const modules = design.sections.filter((s) => s.type !== 'hero' && s.type !== 'custom');
    expect(modules.every((m) => m.moduleStyle?.surface === 'soft')).toBeTrue();
    expect(modules.every((m) => m.moduleStyle?.cardStyle === 'elevated')).toBeTrue();
    expect(modules.map((m) => m.type)).toEqual([
      'countdown', 'story', 'locations', 'itinerary', 'dressCode', 'gallery', 'gifts', 'lodging', 'rsvp', 'album', 'dedications', 'songs'
    ]);
  });

  it('builds xv-burgundy design with royal quinceanera art direction, velvet palette and Great Vibes calligraphy', () => {
    const xvEvent = { ...event, title: 'María & Juan', type: 'xv', date: '2026-10-24' } as EventModel;
    const content: InvitationContent = {
      coverImageUrl: 'https://example.com/quinceanera.jpg',
      storyBody: 'Una noche soñada rodeada de las personas que más quiero.',
      locations: [{ name: 'Parroquia San Juan Bautista', address: 'Calle Principal 123' }],
      itinerary: [{ time: '19:00', title: 'Recepción y Vals Real' }],
      dressCode: 'Rigurosa Etiqueta / Gala',
      galleryItems: [{ url: 'https://example.com/xv-gallery1.jpg', title: 'Recuerdo XV' }],
      giftRegistry: [{ store: 'Mesa de Regalos Liverpool', url: 'https://liverpool.com' }],
      lodging: [{ name: 'Hotel Gran Plaza', address: 'Centro Histórico' }],
      sectionSettings: {}
    };
    const design = buildCompleteDesign('xv-burgundy', content, xvEvent, nextId);
    expect(design.theme?.headingFont).toBe("'Great Vibes', cursive");
    expect(design.theme?.accentColor).toBe('#d4af37');
    expect(design.theme?.backgroundColor).toBe('#5c0d18');
    expect(design.theme?.buttonRadius).toBe(30);

    const hero = design.sections[0];
    expect(hero.type).toBe('hero');
    expect(hero.layers.some((l) => l.type === 'image' && l.url === 'assets/templates/xv-burgundy/tiara-banner.jpg')).toBeTrue();
    expect(hero.layers.some((l) => l.type === 'image' && l.style?.imageMask === 'circle' && l.url === content.coverImageUrl)).toBeTrue();
    expect(hero.layers.some((l) => l.type === 'image' && l.url === 'assets/templates/xv-burgundy/floral-cluster.jpg')).toBeTrue();
    expect(hero.layers.some((l) => l.type === 'button' && l.binding === 'section:rsvp')).toBeTrue();

    const intro = design.sections[1];
    expect(intro.type).toBe('custom');
    expect(intro.title).toBe('Bienvenida');
    expect(intro.layers.some((l) => l.url === 'assets/templates/xv-burgundy/welcome-card.jpg')).toBeTrue();
    expect(intro.layers.some((l) => l.text === 'MIS QUINCE AÑOS')).toBeTrue();

    const modules = design.sections.filter((s) => s.type !== 'hero' && s.type !== 'custom');
    expect(modules.every((m) => m.moduleStyle?.surface === 'soft')).toBeTrue();
    expect(modules.every((m) => m.moduleStyle?.cardStyle === 'elevated')).toBeTrue();
    expect(modules.map((m) => m.type)).toEqual([
      'countdown', 'gallery', 'dedications', 'locations', 'itinerary', 'dressCode', 'gifts', 'lodging', 'rsvp', 'story', 'album', 'songs'
    ]);

    const locationsSec = design.sections.find((s) => s.type === 'locations');
    expect(locationsSec?.height).toBe(820);
    const itinerarySec = design.sections.find((s) => s.type === 'itinerary');
    expect(itinerarySec?.height).toBe(800);
    const gallerySec = design.sections.find((s) => s.type === 'gallery');
    expect(gallerySec?.height).toBe(840);
    const giftsSec = design.sections.find((s) => s.type === 'gifts');
    expect(giftsSec?.height).toBe(880);
  });
});
