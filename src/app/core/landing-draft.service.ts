import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ApiService } from './api.service';
import {
  EventModel,
  EventPayload,
  EventType,
  InvitationContent,
  InvitationLocation,
  InvitationModel,
  InvitationPayload
} from './models';

export interface LandingTemplateMeta {
  id: string;
  name: string;
  shortName: string;
  badge: string;
  category: EventType;
  featured?: boolean;
  previewImage: string;
  accentColor: string;
  themeBg: string;
  musicTrackLabel?: string;
  musicUrl?: string;
  description: string;
  features: string[];
  visualPresetKey: string;
}

export interface LandingDraftState {
  version: number;
  mode: 'template' | 'visual';
  templateKey: string;
  visualPresetKey?: string;
  pendingSave: boolean;
  hasUserEdits: boolean;
  updatedAt: string;
  event: EventModel;
  invitation: InvitationModel;
}

const DRAFT_STORAGE_KEY = 'velisse_landing_draft_v1';

export const LANDING_TEMPLATES_CATALOG: LandingTemplateMeta[] = [
  {
    id: 'boda-girasoles',
    name: 'Elegancia Rústica: Girasoles Radiantes, Madera & Anillos Dorados',
    shortName: 'Elegancia Rústica · Girasoles',
    badge: 'Exclusiva Boda Rústica',
    category: 'boda',
    featured: true,
    previewImage: 'assets/template-previews/boda-girasoles.jpg',
    accentColor: '#d49b27',
    themeBg: '#2d2112',
    musicTrackLabel: 'All of Me — John Legend',
    musicUrl: 'assets/boda-girasoles/all-of-me.mp3',
    description:
      'Calidez campestre y rústica iluminada por girasoles dorados, fondo texturizado en madera cálida, emblema de alianzas entrelazadas y melodía romántica integrada.',
    features: [
      'Bouquet de girasoles y anillos dorados',
      'Paleta amarillo dorado, café madera y salvia',
      'Contador rústico y sellos campestres',
      'Canción All of Me integrada'
    ],
    visualPresetKey: 'boda-girasoles'
  },
  {
    id: 'boda-navy-blue',
    name: 'Navy Blue & Gold: Azul Noche, Acuarela & Flores Nobles',
    shortName: 'Navy Blue & Gold',
    badge: 'Exclusiva Gala Nupcial',
    category: 'boda',
    featured: true,
    previewImage: 'assets/template-previews/boda-navy-blue.jpg',
    accentColor: '#d4af37',
    themeBg: '#0d1b2a',
    musicTrackLabel: 'Perfect — Ed Sheeran',
    musicUrl: 'assets/boda-navy-blue/perfect.mp3',
    description:
      'Elegancia nocturna con fondo de acuarela azul medianoche, divisores y ornamentos florales bañados en oro fino, tarjetas de cristal oscuro y atmósfera de gala.',
    features: [
      'Fondo de acuarela azul noche',
      'Divisores florales de oro pulido',
      'Tarjetas glassmorphism azul marino',
      'Canción Perfect integrada'
    ],
    visualPresetKey: 'boda-navy-blue'
  },
  {
    id: 'maison-dore',
    name: 'La Maison Dorée (Haute Couture & Video Envelope)',
    shortName: 'La Maison Dorée',
    badge: 'Video Intro • Súper Lujo',
    category: 'boda',
    previewImage: 'assets/template-previews/maison-dore.jpg',
    accentColor: '#c59b48',
    themeBg: '#1c1917',
    description:
      'Experiencia inmersiva con video cinemático del sobre y apertura al tacto, columnas clásicas, monograma de oro y estética editorial de alta costura.',
    features: [
      'Video de sobre interactivo',
      'Apertura cinemática al tacto',
      'Monograma imperial en oro',
      'Estética editorial Haute Couture'
    ],
    visualPresetKey: 'haute-couture'
  },
  {
    id: 'boda-villa-perle',
    name: 'Villa Perlè: Apertura de Sobre Animada & Faroles de Ensueño',
    shortName: 'Villa Perlè',
    badge: 'Video Intro • Boda',
    category: 'boda',
    previewImage: 'assets/template-previews/boda-villa-perle.jpg',
    accentColor: '#b89f6d',
    themeBg: '#1c241e',
    musicUrl: 'assets/boda-villa-perle/autumn-wind.mp3',
    description:
      'Inspirada en Villa Perlè con apertura de sobre con lacre, fondo dinámico con faroles flotantes, marco floral vintage y tonos salvia y marfil.',
    features: [
      'Apertura de sobre con sello de lacre',
      'Faroles flotantes en movimiento',
      'Paleta marfil, verde salvia y oro viejo',
      'Música ambiental Autumn Wind'
    ],
    visualPresetKey: 'palazzo-orangerie'
  },
  {
    id: 'boda-eleganza',
    name: 'Eleganza Italiana: Lino Toscano, Lago di Como & Cine Clásico',
    shortName: 'Eleganza Italiana',
    badge: 'Video Intro • Cine',
    category: 'boda',
    previewImage: 'assets/template-previews/boda-eleganza.jpg',
    accentColor: '#b67b4b',
    themeBg: '#241e1b',
    musicUrl: 'assets/boda-eleganza/waltz-sentimental.mp3',
    description:
      'Romance de las villas italianas en el Lago di Como, textura de lino toscano, boceto arquitectónico de la villa y marco ovalado editorial.',
    features: [
      'Video y póster editorial italiano',
      'Textura de lino y boceto de villa',
      'Paleta terracota, olivo y crema',
      'Vals clásico integrado'
    ],
    visualPresetKey: 'editorial'
  },
  {
    id: 'boda-rosas',
    name: 'Romance Floral: Pétalos en Movimiento, Rosé & Caligrafía Pinyon',
    shortName: 'Romance Floral',
    badge: 'Video Intro • Floral',
    category: 'boda',
    previewImage: 'assets/template-previews/boda-rosas.jpg',
    accentColor: '#d48c9e',
    themeBg: '#2b1b22',
    musicUrl: 'assets/boda-rosas/ballerina.mp3',
    description:
      'Romance botánico delicado con pétalos flotantes, marco oval floral, torre de champagne para el brindis y caligrafía Pinyon Script.',
    features: [
      'Pétalos y marcos botánicos',
      'Torre de champagne en itinerario',
      'Paleta rosa palo y champagne',
      'Melodía Ballerina integrada'
    ],
    visualPresetKey: 'romantic'
  },
  {
    id: 'xv-burgundy',
    name: 'Mis XV Borgoña Real: Terciopelo, Oro Imperial & Rosas',
    shortName: 'Mis XV Borgoña Real',
    badge: 'Exclusiva Gala XV Años',
    category: 'xv',
    previewImage: 'assets/template-previews/xv-burgundy.jpg',
    accentColor: '#d4af37',
    themeBg: '#5c0d18',
    description:
      'Majestuosidad en terciopelo borgoña profundo con filigranas de oro imperial, corona real, rosas 3D con perlas y caligrafía de gala.',
    features: [
      'Terciopelo borgoña y tiara real',
      'Marco victoriano con rosas y perlas',
      'Cuenta regresiva ornamentada',
      'Módulos completos para XV Años'
    ],
    visualPresetKey: 'xv-burgundy'
  },
  {
    id: 'template-graduacion',
    name: 'Honor Académico & Oxford Blue',
    shortName: 'Graduación Oxford Blue',
    badge: 'Exclusiva Graduación',
    category: 'graduacion',
    previewImage: 'assets/template-previews/template-graduacion.jpg',
    accentColor: '#cfa349',
    themeBg: '#10203a',
    description:
      'Solemnidad académica en azul Oxford, oro universitario y marfil con protocolo de entrega de diplomas, brindis y gala.',
    features: [
      'Emblema académico con laureles',
      'Paleta Azul Oxford & Oro',
      'Cronograma de ceremonia y cena',
      'Muro de dedicatorias de generación'
    ],
    visualPresetKey: 'celebration'
  }
];

@Injectable({ providedIn: 'root' })
export class LandingDraftService {
  constructor(private api: ApiService) {}

  getCatalog(): LandingTemplateMeta[] {
    return LANDING_TEMPLATES_CATALOG;
  }

  getTemplateMeta(templateKey: string): LandingTemplateMeta | undefined {
    return LANDING_TEMPLATES_CATALOG.find((item) => item.id === templateKey);
  }

  getDraft(): LandingDraftState | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as LandingDraftState;
      if (!parsed || !parsed.invitation || !parsed.event) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  hasDraft(): boolean {
    return Boolean(this.getDraft());
  }

  hasPendingSave(): boolean {
    return Boolean(this.getDraft()?.pendingSave);
  }

  getDraftSummaryLabel(): string {
    const draft = this.getDraft();
    if (!draft) return '';
    if (draft.mode === 'visual') {
      return 'Diseño en Editor Visual';
    }
    const meta = this.getTemplateMeta(draft.templateKey);
    return meta ? meta.name : draft.templateKey;
  }

  private defaultFutureDate(daysAhead = 120): string {
    const target = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  buildDefaultDraftForTemplate(templateKey: string): LandingDraftState {
    const meta = this.getTemplateMeta(templateKey);
    const isXv = meta?.category === 'xv' || templateKey.includes('xv');
    const isGrad = meta?.category === 'graduacion' || templateKey.includes('graduacion');
    const isNavy = templateKey === 'boda-navy-blue';

    const eventType: EventType = meta?.category || (isXv ? 'xv' : isGrad ? 'graduacion' : 'boda');
    const defaultDate = this.defaultFutureDate(110);

    const headline = isXv
      ? 'Valentina Sofía'
      : isGrad
      ? 'Generación 2027 · Ingeniería & Negocios'
      : isNavy
      ? 'Valeria & Sebastián'
      : 'Sofía & Mateo';

    const subheadline = isXv
      ? 'Hay momentos inolvidables que se atesoran en el corazón para siempre'
      : isGrad
      ? 'El futuro pertenece a quienes creen en la grandeza de sus sueños'
      : isNavy
      ? 'Una historia de amor escrita bajo el cielo estrellado'
      : 'El amor florece con la luz de cada nuevo amanecer juntos';

    const storyTitle = isXv
      ? 'Mis Quince Primaveras'
      : isGrad
      ? 'Nuestro Logro Académico'
      : isNavy
      ? 'Un Amor Incondicional'
      : 'Unidos por el Destino';

    const storyBody = isXv
      ? 'Con mucha ilusión doy gracias a Dios y a mis padres por acompañarme en cada paso. Será un honor compartir contigo esta noche mágica.'
      : isGrad
      ? 'Después de años de esfuerzo, dedicación y amistad, ha llegado el momento de celebrar juntos esta gran meta.'
      : isNavy
      ? 'Tenemos el honor de invitarte a celebrar con nosotros el día más importante de nuestras vidas. Tu compañía iluminará nuestra velada.'
      : 'Hoy queremos agradecer a la vida por encontrarnos y caminar de la mano. Nada nos hace más felices que celebrar nuestra unión contigo.';

    const venueName = isNavy
      ? 'Salón Imperial & Terraza Azul'
      : isXv
      ? 'Palacio Real de Cristal'
      : 'Hacienda Los Girasoles';

    const venueAddress = isNavy
      ? 'Av. Paseo de la Reforma 505, Juárez, Ciudad de México'
      : 'Camino Real del Valle Km 14, San Miguel de Allende, Gto.';

    const locations: InvitationLocation[] = [
      {
        type: isGrad ? 'Acto Académico' : 'Ceremonia Religiosa',
        name: isNavy ? 'Parroquia de San Agustín' : 'Capilla de Santa María',
        address: isNavy ? 'Horacio 921, Polanco, CDMX' : 'Plaza Principal s/n, Centro Histórico',
        time: '17:00 hrs',
        mapUrl: 'https://maps.google.com/?q=Parroquia+San+Agustin+Polanco'
      },
      {
        type: 'Recepción & Gala',
        name: venueName,
        address: venueAddress,
        time: '19:30 hrs',
        mapUrl: 'https://maps.google.com/?q=San+Miguel+de+Allende'
      }
    ];

    const itinerary = [
      { time: '17:00', title: isGrad ? 'Acto Académico' : 'Ceremonia', description: locations[0].name },
      { time: '19:00', title: 'Cóctel de Bienvenida', description: 'Jardín principal y recepción de invitados' },
      { time: '20:30', title: isXv ? 'Vals Principal & Brindis' : 'Cena & Primer Baile', description: venueName },
      { time: '22:00', title: 'Fiesta & Celebración', description: 'Pista abierta toda la noche' }
    ];

    const dressCode = isNavy
      ? 'Etiqueta Rigurosa / Formal de Noche'
      : 'Formal Campestre / Etiqueta Elegante';

    const hosts = isXv
      ? ['Sr. Alejandro Morales & Sra. Elena Ruiz']
      : isGrad
      ? [' Comité Organizador Generación 2027']
      : ['Familia Hernández García', 'Familia Morales Ruiz'];

    const palette = isNavy
      ? { primary: '#0d1b2a', secondary: '#1b263b', accent: '#d4af37' }
      : { primary: '#3d2b1f', secondary: '#faf3e8', accent: '#d49b27' };

    const event: EventModel = {
      id: 'preview-landing-event',
      mode: 'invitation',
      type: eventType,
      title: isXv ? `Mis XV — ${headline}` : isGrad ? headline : `Boda de ${headline}`,
      hosts,
      date: defaultDate,
      time: '17:00',
      venue: {
        name: venueName,
        address: venueAddress,
        mapUrl: locations[1].mapUrl
      },
      status: 'draft'
    };

    const content: InvitationContent = {
      template: templateKey,
      headline,
      subheadline,
      storyTitle,
      storyBody,
      message: storyBody,
      dressCode,
      musicUrl: meta?.musicUrl || '',
      palette,
      locations,
      itinerary,
      giftRegistry: [
        {
          store: 'Liverpool',
          title: 'Mesa de Regalos Liverpool',
          url: 'https://mesaderegalos.liverpool.com.mx',
          note: 'Evento #51284920'
        },
        {
          store: 'Amazon',
          title: 'Wishlist en Amazon',
          url: 'https://www.amazon.com.mx/wedding',
          note: 'Envío directo a nuestro hogar'
        }
      ],
      digitalEnvelope: {
        bank: 'BBVA',
        holder: headline,
        clabe: '012180001234567895',
        note: 'Tu presencia es nuestro mejor regalo; si deseas tener un detalle con nosotros, agradecemos tu muestra de cariño.'
      },
      giftSettings: {
        enabled: true,
        showRegistry: true,
        showEnvelope: true
      },
      dedicationSettings: {
        enabled: true,
        requireApproval: true
      },
      sectionSettings: {
        story: true,
        locations: true,
        itinerary: true,
        dressCode: true,
        rsvp: true,
        giftRegistry: true,
        digitalEnvelope: true,
        lodging: false,
        gallery: true,
        guestAlbum: false,
        dedications: true,
        backgroundMusic: true,
        songRequests: true
      },
      editedTexts: {}
    };

    const invitation: InvitationModel = {
      id: 'preview-landing-draft',
      _id: 'preview-landing-draft',
      event,
      slug: 'landing-draft',
      status: 'draft',
      accessMode: 'open',
      content,
      rsvpSettings: {
        allowMaybe: true,
        allowCompanionsDefault: true,
        defaultAllowedCompanions: 2,
        identityMethods: ['email', 'phone']
      }
    };

    return {
      version: 1,
      mode: 'template',
      templateKey,
      visualPresetKey: meta?.visualPresetKey || templateKey,
      pendingSave: false,
      hasUserEdits: false,
      updatedAt: new Date().toISOString(),
      event,
      invitation
    };
  }

  ensureDraftForTemplate(templateKey: string): LandingDraftState {
    const existing = this.getDraft();
    const fresh = this.buildDefaultDraftForTemplate(templateKey);

    if (!existing || !existing.hasUserEdits) {
      this.persist(fresh);
      return fresh;
    }

    // Preserve user-customized event & invitation fields while switching template aesthetics
    const meta = this.getTemplateMeta(templateKey);
    const updated: LandingDraftState = {
      ...existing,
      mode: 'template',
      templateKey,
      visualPresetKey: meta?.visualPresetKey || existing.visualPresetKey || templateKey,
      updatedAt: new Date().toISOString(),
      invitation: {
        ...existing.invitation,
        content: {
          ...fresh.invitation.content,
          ...existing.invitation.content,
          template: templateKey,
          musicUrl: meta?.musicUrl || existing.invitation.content?.musicUrl || '',
          palette: fresh.invitation.content?.palette || existing.invitation.content?.palette,
          // Reset template-specific DOM text keys only if switching to a different base template
          editedTexts:
            existing.templateKey === templateKey
              ? existing.invitation.content?.editedTexts || {}
              : {}
        }
      }
    };
    this.persist(updated);
    return updated;
  }

  ensureDraftForVisualEditor(presetKey?: string): LandingDraftState {
    const existing = this.getDraft();
    const effectivePreset =
      presetKey ||
      existing?.visualPresetKey ||
      (existing?.templateKey ? this.getTemplateMeta(existing.templateKey)?.visualPresetKey : undefined) ||
      'boda-girasoles';

    const baseTemplateKey =
      presetKey === 'boda-navy-blue'
        ? 'boda-navy-blue'
        : presetKey === 'boda-girasoles'
        ? 'boda-girasoles'
        : existing?.templateKey && existing.templateKey !== 'visual-builder'
        ? existing.templateKey
        : 'boda-girasoles';

    const base = existing ? { ...existing } : this.buildDefaultDraftForTemplate(baseTemplateKey);
    const shouldResetVisualCanvas = Boolean(
      presetKey && existing?.visualPresetKey && presetKey !== existing.visualPresetKey
    );

    const nextContent: InvitationContent = {
      ...base.invitation.content,
      template: 'visual-builder'
    };

    if (shouldResetVisualCanvas) {
      delete nextContent.visualDesign;
      delete nextContent.visualDesignDraft;
    }

    const updated: LandingDraftState = {
      ...base,
      mode: 'visual',
      visualPresetKey: effectivePreset,
      updatedAt: new Date().toISOString(),
      invitation: {
        ...base.invitation,
        id: 'preview-landing-draft',
        _id: 'preview-landing-draft',
        slug: 'landing-draft',
        content: nextContent
      }
    };

    this.persist(updated);
    return updated;
  }

  saveDraft(patch: Partial<LandingDraftState>, markEdited = true): LandingDraftState {
    const current = this.getDraft() || this.buildDefaultDraftForTemplate('boda-girasoles');
    const merged: LandingDraftState = {
      ...current,
      ...patch,
      hasUserEdits: markEdited ? true : current.hasUserEdits,
      updatedAt: new Date().toISOString(),
      event: patch.event ? { ...current.event, ...patch.event } : current.event,
      invitation: patch.invitation
        ? {
            ...current.invitation,
            ...patch.invitation,
            content: {
              ...(current.invitation.content || {}),
              ...(patch.invitation.content || {})
            }
          }
        : current.invitation
    };
    this.persist(merged);
    return merged;
  }

  markPendingSave(mode?: 'template' | 'visual'): LandingDraftState {
    const current = this.getDraft() || this.buildDefaultDraftForTemplate('boda-girasoles');
    return this.saveDraft(
      {
        mode: mode || current.mode,
        pendingSave: true
      },
      true
    );
  }

  clearPendingSave(): void {
    const current = this.getDraft();
    if (!current) return;
    this.persist({ ...current, pendingSave: false });
  }

  clearDraft(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      localStorage.removeItem('inv_edited_texts_landing-draft');
      localStorage.removeItem('inv_source_tpl_landing-draft');
      localStorage.removeItem('inv_tpl_landing-draft');
    } catch {}
  }

  private persist(state: LandingDraftState): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(state));
      const edited = state.invitation?.content?.editedTexts;
      if (edited && Object.keys(edited).length > 0) {
        localStorage.setItem('inv_edited_texts_landing-draft', JSON.stringify(edited));
        localStorage.setItem('inv_source_tpl_landing-draft', state.templateKey);
      } else {
        localStorage.removeItem('inv_edited_texts_landing-draft');
      }
    } catch {}
  }

  /**
   * Creates the real Event + Invitation in the backend for the newly authenticated user,
   * preserving every customized field, template selection, inline text overlay, or visual design.
   */
  materializeDraftToAccount(): Observable<{
    eventId: string;
    invitationId: string;
    redirectCommands: any[];
  }> {
    const draft = this.getDraft();
    if (!draft) {
      return of({ eventId: '', invitationId: '', redirectCommands: ['/new/dashboard'] });
    }

    const ev = draft.event;
    const inv = draft.invitation;
    const content = inv.content || {};
    const validDate = ev.date && /^\d{4}-\d{2}-\d{2}/.test(ev.date) ? ev.date : this.defaultFutureDate(110);
    const resolvedTitle =
      (ev.title || '').trim() ||
      (content.headline ? `Evento — ${content.headline.trim()}` : 'Mi Evento en Velisse');

    const eventPayload: EventPayload = {
      mode: 'invitation',
      type: ev.type || 'boda',
      title: resolvedTitle,
      date: validDate,
      time: ev.time ? ev.time.trim() : undefined,
      hosts: Array.isArray(ev.hosts) ? ev.hosts.filter(Boolean) : [],
      venue: {
        name: ev.venue?.name || content.locations?.[0]?.name || '',
        address: ev.venue?.address || content.locations?.[0]?.address || '',
        mapUrl: ev.venue?.mapUrl || content.locations?.[0]?.mapUrl || ''
      }
    };

    const isVisual = draft.mode === 'visual';
    const targetTemplate = isVisual ? 'visual-builder' : draft.templateKey || content.template || 'boda-girasoles';
    const editedTexts = content.editedTexts && Object.keys(content.editedTexts).length > 0 ? content.editedTexts : undefined;

    const cleanContent: InvitationContent = {
      ...content,
      template: targetTemplate
    };

    if (isVisual && cleanContent.visualDesignDraft) {
      cleanContent.visualDesignDraft = { ...cleanContent.visualDesignDraft, active: true };
      cleanContent.visualDesign = { ...cleanContent.visualDesignDraft, active: true };
    } else if (!isVisual) {
      if (cleanContent.visualDesign) cleanContent.visualDesign.active = false;
      if (cleanContent.visualDesignDraft) cleanContent.visualDesignDraft.active = false;
    }

    return this.api.createEvent(eventPayload).pipe(
      switchMap(({ event: createdEvent }) => {
        const createdEventId = (createdEvent._id || createdEvent.id || '') as string;
        const invPayload: InvitationPayload = {
          event: createdEventId,
          accessMode: inv.accessMode || 'open',
          content: cleanContent,
          rsvpSettings: inv.rsvpSettings || {
            allowMaybe: true,
            allowCompanionsDefault: true,
            defaultAllowedCompanions: 2
          }
        };

        return this.api.createInvitation(invPayload).pipe(
          switchMap(({ invitation: createdInv }) => {
            const createdInvId = (createdInv._id || createdInv.id || '') as string;
            const createdSlug = createdInv.slug || '';

            if (typeof localStorage !== 'undefined') {
              if (createdInvId) localStorage.setItem(`inv_tpl_${createdInvId}`, targetTemplate);
              if (createdSlug) localStorage.setItem(`inv_tpl_${createdSlug}`, targetTemplate);
            }

            const redirectCommands = isVisual
              ? ['/new/invitations', createdInvId, 'visual-editor']
              : ['/new/invitations', createdInvId, 'editor'];

            if (!isVisual && editedTexts && Object.keys(editedTexts).length > 0) {
              const meta = this.getTemplateMeta(targetTemplate);
              const subName = `Personalización — ${meta?.shortName || targetTemplate}`;
              return this.api
                .submitCustomTemplate({
                  eventId: createdEventId,
                  eventTitle: resolvedTitle,
                  eventSlug: createdSlug,
                  eventType: eventPayload.type,
                  invitationId: createdInvId,
                  name: subName,
                  description: 'Edición personalizada guardada desde la página principal de Velisse.',
                  htmlCode: `<!-- Edición de textos en vivo: ${subName} -->`,
                  cssCode: '',
                  sourceTemplateKey: targetTemplate,
                  editedTexts,
                  status: 'approved'
                })
                .pipe(
                  map(({ submission }) => {
                    const subId = submission.id || submission._id || '';
                    if (typeof localStorage !== 'undefined' && createdSlug) {
                      localStorage.setItem(`inv_edited_texts_${createdSlug}`, JSON.stringify(editedTexts));
                      localStorage.setItem(`inv_source_tpl_${createdSlug}`, targetTemplate);
                      if (subId) {
                        localStorage.setItem(`inv_active_sub_${createdSlug}`, subId);
                        localStorage.setItem(`inv_edited_texts_${createdSlug}_${subId}`, JSON.stringify(editedTexts));
                        localStorage.setItem(`inv_source_tpl_${createdSlug}_${subId}`, targetTemplate);
                        if (createdInvId) localStorage.setItem(`inv_active_sub_${createdInvId}`, subId);
                      }
                    }
                    this.clearDraft();
                    return { eventId: createdEventId, invitationId: createdInvId, redirectCommands };
                  }),
                  catchError(() => {
                    if (typeof localStorage !== 'undefined' && createdSlug) {
                      localStorage.setItem(`inv_edited_texts_${createdSlug}`, JSON.stringify(editedTexts));
                      localStorage.setItem(`inv_source_tpl_${createdSlug}`, targetTemplate);
                    }
                    this.clearDraft();
                    return of({ eventId: createdEventId, invitationId: createdInvId, redirectCommands });
                  })
                );
            }

            this.clearDraft();
            return of({ eventId: createdEventId, invitationId: createdInvId, redirectCommands });
          })
        );
      })
    );
  }
}
