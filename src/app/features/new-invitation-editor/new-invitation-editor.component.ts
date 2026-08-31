import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AssetFolder, EventAgendaItem, EventModel, ExternalContent, GuestModel, InvitationLocation, InvitationModel, PaymentPackage, PlanDefinition, TemplateModel, CustomTemplateSubmission, SongRequestSettings } from '../../core/models';
import { EditorPlansTabComponent } from './tabs/plans/editor-plans-tab.component';

@Component({ selector: 'app-new-invitation-editor', templateUrl: './new-invitation-editor.component.html' })
export class NewInvitationEditorComponent implements OnInit {
  @ViewChild(EditorPlansTabComponent) plansTab?: EditorPlansTabComponent;

  private readonly imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  private readonly audioTypes = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav']);
  private readonly maxImageSize = 5 * 1024 * 1024;
  private readonly maxAudioSize = 10 * 1024 * 1024;

  sidebarOpen = false;
  invitation?: InvitationModel;
  event?: EventModel;
  loadedGuests: GuestModel[] = [];
  templates: TemplateModel[] = [];
  plans: PlanDefinition[] = [];
  currentPlan?: PlanDefinition;
  payments: any[] = [];

  loading = false;
  saving = false;
  publishing = false;
  assetUploading = false;
  checkoutLoading = '';
  message = '';
  error = '';
  assetMessage = '';
  publicUrl = '';
  musicError = false;
  lodgingText = '';
  customQuestionsText = '';
  customQuestionsList: Array<{
    key: string;
    label: string;
    type: 'text' | 'textarea' | 'select' | 'boolean';
    required: boolean;
    optionsText?: string;
    options?: string[];
  }> = [];
  allowedRolesText = '';
  allowedGroupsText = '';
  allowedEmailsText = '';
  allowedPhonesText = '';
  locationSearchResults: Record<number, Array<{ name: string; address: string; lat: number; lon: number; mapUrl: string; wazeUrl: string }>> = {};
  locationSearchLoading: Record<number, boolean> = {};
  locationExtractLoading: Record<number, boolean> = {};
  private searchTimeouts: Record<number, any> = {};

  activeSection = 'plans';
  activeTab: string = 'plans';
  collapsedSections: Record<string, boolean> = {};

  showAiWizardModal = false;
  showTextEditorModal = false;
  textEditorTemplateKey = '';
  textEditorSubmission?: CustomTemplateSubmission;
  textEditorCleanBase = false;

  openTextEditor(event: string | { templateKey: string; submission?: CustomTemplateSubmission; clean?: boolean }): void {
    if (typeof event === 'string') {
      this.textEditorTemplateKey = event;
      this.textEditorSubmission = undefined;
      this.textEditorCleanBase = true;
    } else if (event) {
      this.textEditorTemplateKey = event.templateKey;
      this.textEditorSubmission = event.submission;
      this.textEditorCleanBase = event.clean ?? (!event.submission);
    }
    this.showTextEditorModal = true;
  }

  onTextEditSubmitted(): void {
    this.showTextEditorModal = false;
    this.message = '¡Edición de textos enviada a revisión exitosamente!';
    if (this.plansTab) {
      this.plansTab.loadCustomSubmissions();
    }
  }

  openAiWizard(): void {
    this.showAiWizardModal = true;
  }

  onAiTemplateApplied(result: { htmlCode: string; cssCode: string; name: string }): void {
    if (this.invitation) {
      if (!this.invitation.content) this.invitation.content = {};
      this.invitation.content.template = 'custom-html';
      this.invitation.content.customHtml = result.htmlCode;
      this.invitation.content.customCss = result.cssCode;
      this.invitation.content.customPageApproved = true;
      const invId = this.invitation._id || this.invitation.id;
      const slug = this.invitation.slug;
      if (slug) {
        localStorage.setItem(`inv_custom_html_${slug}`, result.htmlCode);
        localStorage.setItem(`inv_custom_css_${slug}`, result.cssCode || '');
        localStorage.setItem(`inv_tpl_${slug}`, 'custom-html');
      }
      if (invId) {
        localStorage.setItem(`inv_tpl_${invId}`, 'custom-html');
      }
    }
    this.message = `¡Plantilla "${result.name}" aplicada exitosamente a tu evento!`;
    this.save();
    if (this.plansTab) {
      this.plansTab.loadCustomSubmissions();
    }
  }

  activeSectionsCollapsed = false;
  inactiveSectionsCollapsed = true;

  toggleActiveSections(): void {
    this.activeSectionsCollapsed = !this.activeSectionsCollapsed;
  }

  toggleInactiveSections(): void {
    this.inactiveSectionsCollapsed = !this.inactiveSectionsCollapsed;
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    if (tab === 'plans') {
      setTimeout(() => {
        this.plansTab?.loadCustomSubmissions();
      }, 50);
    }
  }

  toggleSection(sectionKey: string): void {
    this.collapsedSections[sectionKey] = !this.collapsedSections[sectionKey];
  }

  isSectionCollapsed(sectionKey: string): boolean {
    return Boolean(this.collapsedSections[sectionKey]);
  }

  expandAllSections(): void {
    this.collapsedSections = {};
  }

  collapseAllSections(): void {
    const keys = ['content', 'style', 'itinerary', 'locations', 'rsvp_rules', 'gifts', 'dedications', 'guest_album', 'lodging', 'assets', 'templates', 'plans', 'preview'];
    keys.forEach(k => this.collapsedSections[k] = true);
  }

  readonly configurableSectionsList = [
    { key: 'guestAlbum', title: 'Álbum Interactivo de Invitados', description: 'Permite a los invitados subir sus fotos en tiempo real.' },
    { key: 'gallery', title: 'Galería Fotográfica Oficial', description: 'Galería oficial con fotos del evento o novios.' },
    { key: 'songRequests', title: 'Música / Pedir Canciones (DJ)', description: 'Permite a los invitados sugerir temas para el DJ.' },
    { key: 'dedications', title: 'Dedicatorias y Libro de Firmas', description: 'Muro de firmas, felicitaciones y mensajes.' },
    { key: 'rsvp', title: 'Confirmación de Asistencia (RSVP)', description: 'Formulario, reglas y preguntas personalizadas de RSVP.' },
    { key: 'story', title: 'Nuestra Historia', description: 'Reseña o historia de los novios / festejados.' },
    { key: 'locations', title: 'Mapas y Ubicaciones', description: 'Direcciones con enlaces directos a Google Maps o Waze.' },
    { key: 'itinerary', title: 'Itinerario / Cronograma', description: 'Agenda y horarios de las actividades del evento.' },
    { key: 'dressCode', title: 'Código de Vestimenta', description: 'Instrucciones de etiqueta y vestuario sugerido.' },
    { key: 'giftRegistry', title: 'Mesa de Regalos', description: 'Catálogo y enlaces a tiendas externas (Amazon, Liverpool, etc.).' },
    { key: 'digitalEnvelope', title: 'Sobre Digital / Transferencias', description: 'Datos bancarios, CLABE y QR para obsequios en efectivo.' },
    { key: 'lodging', title: 'Hospedaje y Hoteles', description: 'Recomendaciones de alojamiento y hoteles cercanos.' },
    { key: 'backgroundMusic', title: 'Música de Fondo', description: 'Audio principal que suena al navegar por la invitación.' }
  ];

  readonly categorizedSections: Array<{
    category: string;
    description: string;
    items: Array<{ key: string; title: string; description: string; isMandatory?: boolean }>;
  }> = [
      {
        category: 'Esenciales y Estilo',
        description: 'Información principal y diseño visual de la invitación',
        items: [
          { key: 'content', title: 'Contenido Principal', description: 'Nombres, fecha, mensaje principal e imagen de portada.', isMandatory: true },
          { key: 'style', title: 'Estilo y Colores', description: 'Paleta de colores, tipografía y estética visual.', isMandatory: true }
        ]
      },
      {
        category: 'Interacción y Confirmación',
        description: 'Módulos interactivos y gestión de invitados',
        items: [
          { key: 'rsvp', title: 'Confirmación RSVP', description: 'Formulario de pases, asistencia y preguntas personalizadas.', isMandatory: false },
          { key: 'guestAlbum', title: 'Álbum Interactivo', description: 'Permite a los invitados subir fotos en vivo durante el evento.', isMandatory: false },
          { key: 'songRequests', title: 'Música / DJ', description: 'Sugerencias de canciones de los invitados para la fiesta.', isMandatory: false },
          { key: 'dedications', title: 'Libro de Firmas', description: 'Muro de mensajes, felicidades y buenos deseos.', isMandatory: false },
          { key: 'backgroundMusic', title: 'Música de Fondo', description: 'Audio ambiental que suena al recorrer la invitación.', isMandatory: false }
        ]
      },
      {
        category: 'Detalles del Evento',
        description: 'Ubicaciones, tiempos e información para los asistentes',
        items: [
          { key: 'story', title: 'Mensaje & Nuestra Historia', description: 'Mensaje especial de bienvenida, historia o reseña para los invitados.', isMandatory: false },
          { key: 'locations', title: 'Mapas y Ubicaciones', description: 'Direcciones directas con Waze y Google Maps.', isMandatory: false },
          { key: 'itinerary', title: 'Itinerario / Cronograma', description: 'Agenda y horarios de las actividades del evento.', isMandatory: false },
          { key: 'dressCode', title: 'Código de Vestimenta', description: 'Instrucciones de etiqueta y estilo recomendado.', isMandatory: false },
          { key: 'lodging', title: 'Hospedaje y Hoteles', description: 'Recomendaciones de hoteles cercanos y hospedaje.', isMandatory: false }
        ]
      },
      {
        category: 'Regalos y Galería',
        description: 'Mesa de regalos, datos de obsequios y fotos oficiales',
        items: [
          { key: 'giftRegistry', title: 'Mesa de Regalos', description: 'Enlaces a mesas de regalos externas (Amazon, Liverpool, etc.).', isMandatory: false },
          { key: 'digitalEnvelope', title: 'Sobre Digital', description: 'Datos bancarios y CLABE para obsequios en efectivo.', isMandatory: false },
          { key: 'gallery', title: 'Galería Oficial', description: 'Fotografías oficiales de los festejados o del evento.', isMandatory: false }
        ]
      }
    ];

  getActiveCountForCategory(cat: any): number {
    if (!cat?.items) return 0;
    return cat.items.filter((item: any) => this.isSectionActive(item.key)).length;
  }

  onToggleSectionClick(key: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    this.toggleSectionActive(key, Boolean(target?.checked));
  }

  readonly dressCodePresets = [
    'Formal / Etiqueta Rigurosa',
    'Formal / Traje Oscuro',
    'Semiformal / Coctel',
    'Guayabera Elegante / Lino',
    'Playa / Casual Elegante',
    'Blanco / All White',
    'Casual / Libre',
    'Otro (Especificar personalizado...)'
  ];

  selectedDressCodePreset = '';

  onDressCodePresetChange(value: string): void {
    this.selectedDressCodePreset = value;
    if (!this.invitation?.content) return;
    if (value !== 'Otro (Especificar personalizado...)') {
      this.invitation.content.dressCode = value;
    }
  }

  isCustomDressCode(): boolean {
    if (this.selectedDressCodePreset === 'Otro (Especificar personalizado...)') return true;
    if (!this.invitation?.content?.dressCode) return false;
    return !this.dressCodePresets.slice(0, -1).includes(this.invitation.content.dressCode);
  }

  get activeConfigurableSections() {
    return this.configurableSectionsList.filter(sec => this.isSectionActive(sec.key));
  }

  get inactiveConfigurableSections() {
    return this.configurableSectionsList.filter(sec => !this.isSectionActive(sec.key));
  }

  isSectionActive(key: string): boolean {
    if (!this.invitation?.content) return true;
    const settings = this.invitation.content.sectionSettings || {};

    if (key === 'content' || key === 'style') return true;
    if (key === 'songRequests') {
      if (settings.songRequests !== undefined) {
        return Boolean(settings.songRequests);
      }
      return Boolean(this.event?.externalContent?.songRequestSettings?.enabled !== false);
    }
    if (key === 'guestAlbum' || key === 'guest_album') {
      return Boolean(settings.guestAlbum !== false && this.invitation.content.privateAlbumEnabled !== false);
    }
    if (key === 'dedications') {
      return Boolean(settings.dedications !== false && this.invitation.content.dedicationSettings?.enabled !== false);
    }
    if (key === 'giftRegistry' || key === 'gifts') {
      return Boolean(settings.giftRegistry !== false && this.invitation.content.giftSettings?.showRegistry !== false);
    }
    if (key === 'digitalEnvelope') {
      return Boolean(settings.digitalEnvelope !== false && this.invitation.content.giftSettings?.showEnvelope !== false);
    }
    if (key === 'backgroundMusic') {
      return Boolean(settings.backgroundMusic !== false);
    }
    if (key === 'rsvp' || key === 'rsvp_rules') {
      return settings.rsvp !== false;
    }

    return (settings as any)[key] !== false;
  }

  toggleSectionActive(key: string, active: boolean, event?: Event): void {
    if (event) event.stopPropagation();
    if (!this.invitation) return;
    this.ensureContentCollections();
    if (!this.invitation.content.sectionSettings) {
      this.invitation.content.sectionSettings = {};
    }
    const settings = this.invitation.content.sectionSettings as any;

    if (key === 'songRequests') {
      settings.songRequests = active;
      if (this.event) {
        if (!this.event.externalContent) this.event.externalContent = {};
        if (!this.event.externalContent.songRequestSettings) {
          this.event.externalContent.songRequestSettings = {};
        }
        this.event.externalContent.songRequestSettings.enabled = active;
      }
    } else if (key === 'guestAlbum' || key === 'guest_album') {
      this.invitation.content.privateAlbumEnabled = active;
      settings.guestAlbum = active;
    } else if (key === 'dedications') {
      if (!this.invitation.content.dedicationSettings) {
        this.invitation.content.dedicationSettings = { enabled: active };
      } else {
        this.invitation.content.dedicationSettings.enabled = active;
      }
      settings.dedications = active;
    } else if (key === 'giftRegistry' || key === 'gifts') {
      if (!this.invitation.content.giftSettings) {
        this.invitation.content.giftSettings = { enabled: active, showRegistry: active };
      } else {
        this.invitation.content.giftSettings.showRegistry = active;
      }
      settings.giftRegistry = active;
    } else if (key === 'digitalEnvelope') {
      if (!this.invitation.content.giftSettings) {
        this.invitation.content.giftSettings = { enabled: active, showEnvelope: active };
      } else {
        this.invitation.content.giftSettings.showEnvelope = active;
      }
      settings.digitalEnvelope = active;
    } else if (key === 'backgroundMusic') {
      settings.backgroundMusic = active;
    } else if (key === 'rsvp' || key === 'rsvp_rules') {
      settings.rsvp = active;
    } else {
      settings[key] = active;
    }

    if (!active) {
      this.collapsedSections[key] = true;
    } else {
      this.collapsedSections[key] = false;
    }
  }

  palettePresets = [
    { name: 'Imperial & Oro', primary: '#1a1612', secondary: '#fdfbf7', accent: '#d4af37' },
    { name: 'Jardín Esmeralda', primary: '#0d3b2e', secondary: '#f4f9f6', accent: '#c8963e' },
    { name: 'Zafiro & Noche', primary: '#0a192f', secondary: '#f0f4f8', accent: '#3b82f6' },
    { name: 'Borgoña Elegante', primary: '#4a0e17', secondary: '#fdf4f5', accent: '#e0a96d' },
    { name: 'Terracota & Eucalipto', primary: '#a0522d', secondary: '#f8f6f0', accent: '#5f8575' },
    { name: 'Lavanda & Menta', primary: '#4a3b6b', secondary: '#f7f4fb', accent: '#88d49e' },
    { name: 'Negro & Oro Minimalista', primary: '#111111', secondary: '#f9f9f9', accent: '#e5c158' },
    { name: 'Coral Romántico', primary: '#8b263e', secondary: '#fff5f2', accent: '#ff7e67' },
    { name: 'Verde Olivo & Arena', primary: '#3b4d32', secondary: '#f6f5ef', accent: '#d4b26f' },
    { name: 'Orquídea & Plata', primary: '#5c1d42', secondary: '#fcf5fa', accent: '#9eabc0' },
    { name: 'Azul Marino & Cobre', primary: '#1b263b', secondary: '#f4f6f8', accent: '#e07a5f' },
    { name: 'Malva & Perla Nácar', primary: '#4a3a4b', secondary: '#faf6fa', accent: '#c7a4b5' }
  ];

  constructor(private route: ActivatedRoute, private router: Router, private api: ApiService) { }

  ngOnInit(): void {
    this.load();
  }

  eventTypeIcon(type?: string): string {
    switch (type) {
      case 'boda': return '💍';
      case 'xv': return '👑';
      case 'bautizo': return '🕊️';
      case 'cumpleanos': return '🎂';
      case 'graduacion': return '🎓';
      case 'baby_shower': return '🍼';
      case 'corporativo': return '💼';
      default: return '🎉';
    }
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.loading = true;
    this.error = '';
    this.api.listInvitations().subscribe({
      next: ({ invitations }) => {
        this.invitation = invitations.find((item) => this.getInvitationId(item) === id);
        if (!this.invitation) {
          this.error = 'Invitación no encontrada.';
          this.loading = false;
          return;
        }
        const backendTpl = this.invitation.content?.template || (this.invitation.template && !/^[0-9a-fA-F]{24}$/.test(this.invitation.template) ? this.invitation.template : undefined);
        const storedTplKey = (id ? localStorage.getItem(`inv_tpl_${id}`) : null) || (this.invitation.slug ? localStorage.getItem(`inv_tpl_${this.invitation.slug}`) : null);
        const effectiveTemplate = backendTpl || storedTplKey || 'envelope-cards';
        if (this.invitation.content) {
          this.invitation.content.template = effectiveTemplate;
        }
        if (id) localStorage.setItem(`inv_tpl_${id}`, effectiveTemplate);
        if (this.invitation.slug) localStorage.setItem(`inv_tpl_${this.invitation.slug}`, effectiveTemplate);

        const eventId = typeof this.invitation.event === 'string' ? this.invitation.event : (this.invitation.event?._id || this.invitation.event?.id);
        if (typeof this.invitation.event === 'object' && this.invitation.event) {
          this.event = this.invitation.event;
        }

        if (eventId) {
          this.api.getEvent(eventId).subscribe({
            next: ({ event }) => {
              this.event = event;
              if (this.invitation?.content?.sectionSettings && event.externalContent?.songRequestSettings?.enabled !== undefined) {
                if (this.invitation.content.sectionSettings.songRequests === undefined) {
                  this.invitation.content.sectionSettings.songRequests = Boolean(event.externalContent.songRequestSettings.enabled);
                }
              }
            },
            error: () => { }
          });
        }

        this.ensureContentCollections();
        this.ensureRsvpSettings();
        this.syncEditorTextFields();
        this.publicUrl = `${window.location.origin}/new/i/${this.invitation.slug}`;
        this.loadTemplates();
        this.loadPlans();
        this.loadGuestsForEvent();
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo cargar la invitación.';
        this.loading = false;
      }
    });
  }

  loadGuestsForEvent(): void {
    const eventId = this.getEventId();
    if (!eventId) return;
    this.api.listGuests(eventId).subscribe({
      next: ({ guests }) => this.loadedGuests = guests || [],
      error: () => this.loadedGuests = []
    });
  }

  loadTemplates(): void {
    this.api.listTemplates(this.event?.type).subscribe({
      next: ({ templates }) => this.templates = templates,
      error: () => this.templates = []
    });
  }

  loadPlans(): void {
    this.api.listPlans().subscribe({
      next: ({ plans }) => this.plans = plans,
      error: () => this.plans = []
    });
    this.api.getPaymentStatus(this.getEventId()).subscribe({
      next: ({ eventPlanDefinition, planDefinition, payments }) => {
        this.currentPlan = eventPlanDefinition || planDefinition;
        this.payments = payments || [];
      },
      error: () => {
        this.currentPlan = undefined;
        this.payments = [];
      }
    });
  }

  hasPendingPayment(pack: string): boolean {
    return this.payments.some(p => p.package === pack && p.status === 'pending');
  }

  onSelectTemplateKey(key: string): void {
    if (!this.invitation) return;
    if (!this.invitation.content) this.invitation.content = {};
    this.invitation.content.template = key;
    const invId = this.getInvitationId(this.invitation);
    const slug = this.invitation.slug;
    if (invId) {
      localStorage.setItem(`inv_tpl_${invId}`, key);
    }
    if (slug) {
      localStorage.setItem(`inv_tpl_${slug}`, key);
    }
    if (key && /^[0-9a-fA-F]{24}$/.test(key)) {
      this.invitation.template = key;
    } else {
      delete this.invitation.template;
    }
  }

  applyTemplate(template: TemplateModel): void {
    if (!this.invitation) return;
    if (template.tier === 'premium' && !this.currentPlan?.limits?.premiumTemplates) {
      this.error = 'Esta plantilla requiere Evento Individual o Pro.';
      return;
    }
    const templateId = template._id || template.id;
    if (templateId && /^[0-9a-fA-F]{24}$/.test(templateId)) {
      this.invitation.template = templateId;
    } else {
      delete this.invitation.template;
    }
    if (!this.invitation.content) this.invitation.content = {};
    const tplKey = template.key || templateId || 'envelope-cards';
    this.invitation.content.template = tplKey;
    const invId = this.getInvitationId(this.invitation);
    if (invId) {
      localStorage.setItem(`inv_tpl_${invId}`, tplKey);
    }
    if (template.config?.palette) {
      this.invitation.content.palette = {
        ...this.invitation.content.palette,
        ...template.config.palette
      };
    }
    this.invitation.content.subheadline = template.name;
    this.message = `Plantilla seleccionada: ${template.name}`;
    this.clearMessageAfterDelay();
  }

  applyPalette(palette: { primary: string; secondary: string; accent: string; name?: string }): void {
    if (!this.invitation) return;
    this.invitation.content.palette = {
      primary: palette.primary,
      secondary: palette.secondary,
      accent: palette.accent
    };
    this.message = palette.name ? `Estilo aplicado: ${palette.name}` : 'Estilo aplicado.';
    this.clearMessageAfterDelay();
  }

  applyStoryPreset(type: 'story' | 'welcome' | 'thanks'): void {
    if (!this.invitation) return;
    if (!this.invitation.content) this.invitation.content = {};
    if (type === 'story') {
      this.invitation.content.storyTitle = 'Nuestra Historia';
      this.invitation.content.storyBody = 'Hace unos años nuestros caminos se cruzaron por casualidad y desde ese momento supimos que queríamos caminar juntos para siempre. Hoy comenzamos un nuevo capítulo y nos encantaría compartirlo contigo.';
    } else if (type === 'welcome') {
      this.invitation.content.storyTitle = 'Mensaje de Invitación';
      this.invitation.content.storyBody = 'Con gran alegría y emoción te invitamos a celebrar con nosotros este día tan especial. Tu presencia es el mejor regalo que podemos recibir y significará todo para nosotros.';
    } else if (type === 'thanks') {
      this.invitation.content.storyTitle = 'Reflexión & Agradecimiento';
      this.invitation.content.storyBody = 'Acompañados del amor de nuestras familias y amigos, iniciamos esta hermosa etapa. Gracias por ser parte de nuestras vidas y por acompañarnos a celebrar el amor y la felicidad.';
    }
    this.message = 'Ejemplo aplicado a la sección.';
    this.clearMessageAfterDelay();
  }

  applyTextVariant(style: 'formal' | 'warm' | 'brief'): void {
    if (!this.invitation || !this.event) return;
    const title = this.event.title;
    const hostText = this.event.hosts?.length ? this.event.hosts.join(' y ') : 'Nosotros';
    const variants = {
      formal: {
        subheadline: `${hostText} tienen el honor de invitarte`,
        message: `Será un gusto contar con tu presencia en ${title}. Te invitamos a confirmar tu asistencia y acompañarnos en esta celebración especial.`
      },
      warm: {
        subheadline: 'Queremos compartir este día contigo',
        message: `Estamos preparando ${title} con mucha ilusión. Tu presencia haría este momento aún más especial; confirma tu asistencia desde esta invitación.`
      },
      brief: {
        subheadline: 'Estás invitado',
        message: `Acompáñanos en ${title}. Confirma tu asistencia y guarda esta invitación para los detalles del evento.`
      }
    };
    this.invitation.content.subheadline = variants[style].subheadline;
    this.invitation.content.message = variants[style].message;
    this.message = 'Variante de texto aplicada.';
    this.clearMessageAfterDelay();
  }

  save(): void {
    if (!this.invitation) return;
    this.saving = true;
    this.message = '';
    this.error = '';

    const invId = this.getInvitationId(this.invitation);
    const slug = this.invitation.slug;
    const activeTemplateKey = this.invitation.content?.template || (invId ? localStorage.getItem(`inv_tpl_${invId}`) : undefined) || (slug ? localStorage.getItem(`inv_tpl_${slug}`) : undefined) || 'envelope-cards';
    if (invId) {
      localStorage.setItem(`inv_tpl_${invId}`, activeTemplateKey);
    }
    if (slug) {
      localStorage.setItem(`inv_tpl_${slug}`, activeTemplateKey);
    }

    const rootTemplate = (this.invitation.template && /^[0-9a-fA-F]{24}$/.test(this.invitation.template)) ? this.invitation.template : undefined;

    this.api.updateInvitation(invId, {
      slug: this.invitation.slug,
      accessMode: this.invitation.accessMode,
      rsvpSettings: this.sanitizePayload(this.getRsvpSettingsPayload()),
      template: rootTemplate,
      content: this.sanitizePayload(this.getContentPayload())
    }).subscribe({
      next: ({ invitation }) => {
        this.invitation = invitation;
        if (rootTemplate) this.invitation.template = rootTemplate;
        if (!this.invitation.content) this.invitation.content = {};
        this.invitation.content.template = activeTemplateKey;
        if (!this.invitation.content.palette) this.invitation.content.palette = { primary: '#1f2a44', secondary: '#f7f2ea', accent: '#b67b4b' };
        if (!this.invitation.accessMode) this.invitation.accessMode = 'open';
        if (!this.invitation.accessMode) this.invitation.accessMode = 'open';
        this.ensureContentCollections();
        this.ensureRsvpSettings();
        this.syncEditorTextFields();
        this.publicUrl = `${window.location.origin}/new/i/${invitation.slug}`;

        const eventId = this.getEventId();
        if (eventId && this.event) {
          const cleanDj = this.getCleanSongRequestSettings();
          if (!this.event.externalContent) this.event.externalContent = {};
          this.event.externalContent.songRequestSettings = cleanDj;
          if (this.invitation?.content) {
            this.invitation.content.songRequestSettings = { ...cleanDj };
          }

          const rawExternalContent: ExternalContent = {
            ...(this.event.externalContent || {}),
            songRequestSettings: cleanDj
          };

          this.api.updateEvent(eventId, { externalContent: this.sanitizePayload(rawExternalContent) }).subscribe({
            next: ({ event }) => {
              this.event = event;
              this.message = '✅ Cambios guardados correctamente en el servidor (HTTP 200).';
              this.saving = false;
              this.clearMessageAfterDelay();
            },
            error: () => {
              this.message = '✅ Cambios guardados en la invitación.';
              this.saving = false;
              this.clearMessageAfterDelay();
            }
          });
        } else {
          this.message = '✅ Cambios guardados correctamente en el servidor (HTTP 200).';
          this.saving = false;
          this.clearMessageAfterDelay();
        }
      },
      error: (error) => {
        const friendly = this.getFriendlyErrorMessage(error);
        if (friendly.includes('ya está ocupada')) {
          this.error = friendly;
        } else {
          const statusCode = error.status ? ` (HTTP ${error.status})` : '';
          this.error = `❌ Error al guardar${statusCode}: ${friendly}`;
        }
        this.saving = false;
      }
    });
  }

  syncSongRequestActive(active: boolean): void {
    if (!this.invitation) return;
    this.ensureContentCollections();
    if (this.invitation.content?.sectionSettings) {
      this.invitation.content.sectionSettings.songRequests = active;
    }
    if (this.event) {
      if (!this.event.externalContent) this.event.externalContent = {};
      if (!this.event.externalContent.songRequestSettings) {
        this.event.externalContent.songRequestSettings = {};
      }
      this.event.externalContent.songRequestSettings.enabled = active;
    }
  }

  publish(): void {
    if (!this.invitation) return;
    const invitationId = this.getInvitationId(this.invitation);
    this.publishing = true;
    this.message = '';
    this.error = '';

    const rootTemplate = (this.invitation.template && /^[0-9a-fA-F]{24}$/.test(this.invitation.template)) ? this.invitation.template : undefined;

    this.api.updateInvitation(invitationId, {
      slug: this.invitation.slug,
      accessMode: this.invitation.accessMode,
      rsvpSettings: this.sanitizePayload(this.getRsvpSettingsPayload()),
      template: rootTemplate,
      content: this.sanitizePayload(this.getContentPayload())
    }).subscribe({
      next: () => {
        const eventId = this.getEventId();
        if (eventId && this.event) {
          const cleanDj = this.getCleanSongRequestSettings();
          if (!this.event.externalContent) this.event.externalContent = {};
          this.event.externalContent.songRequestSettings = cleanDj;
          if (this.invitation?.content) {
            this.invitation.content.songRequestSettings = { ...cleanDj };
          }

          const rawExternalContent: ExternalContent = {
            ...(this.event.externalContent || {}),
            songRequestSettings: cleanDj
          };

          this.api.updateEvent(eventId, { externalContent: this.sanitizePayload(rawExternalContent) }).subscribe({
            next: ({ event }) => this.event = event,
            error: () => { }
          });
        }

        this.api.publishInvitation(invitationId).subscribe({
          next: (res) => {
            const { invitation, publicUrl, message, warning } = res as any;
            this.invitation = invitation;
            if (this.invitation) {
              if (!this.invitation.content.palette) this.invitation.content.palette = { primary: '#1f2a44', secondary: '#f7f2ea', accent: '#b67b4b' };
              if (!this.invitation.accessMode) this.invitation.accessMode = 'open';
              this.ensureContentCollections();
              this.ensureRsvpSettings();
              this.syncEditorTextFields();
            }
            this.publicUrl = publicUrl ? publicUrl.replace('/i/', '/new/i/') : `${window.location.origin}/new/i/${invitation.slug}`;
            let successMsg = '🎉 ¡Invitación guardada y publicada exitosamente (HTTP 200)!';
            if (message && message.includes('SMTP')) {
              successMsg += ' (Nota: no se envió correo por SMTP no configurado)';
            } else if (warning) {
              successMsg += ` (${warning})`;
            }
            this.message = successMsg;
            this.publishing = false;
            this.clearMessageAfterDelay();
          },
          error: (error) => {
            const friendly = this.getFriendlyErrorMessage(error);
            if (friendly.includes('ya está ocupada')) {
              this.error = friendly;
            } else {
              const statusCode = error.status ? ` (HTTP ${error.status})` : '';
              this.error = `❌ Error al publicar la invitación${statusCode}: ${friendly}`;
            }
            this.publishing = false;
          }
        });
      },
      error: (error) => {
        const friendly = this.getFriendlyErrorMessage(error);
        if (friendly.includes('ya está ocupada')) {
          this.error = friendly;
        } else {
          const statusCode = error.status ? ` (HTTP ${error.status})` : '';
          this.error = `❌ Error al guardar antes de publicar${statusCode}: ${friendly}`;
        }
        this.publishing = false;
      }
    });
  }

  viewPublic(): void {
    if (!this.invitation) return;
    if (this.invitation.status !== 'published') {
      this.message = '⚠️ La invitación está en borrador. Guardando y publicando para abrir la versión en vivo...';
      this.publish();
      return;
    }
    window.open(this.publicUrl || `/new/i/${this.invitation.slug}`, '_blank');
  }

  selectAsset(event: Event, folder: AssetFolder): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.invitation) return;

    const validationError = this.validateAsset(file, folder);
    if (validationError) {
      this.error = validationError;
      input.value = '';
      return;
    }

    if (folder === 'music' && !this.canUseMusic()) {
      this.error = 'La música requiere Evento Individual o Pro. Actívalo en la sección "Plan del evento".';
      input.value = '';
      return;
    }

    if (folder === 'assets' && !this.canUseGuestAlbum()) {
      this.error = 'El álbum colaborativo requiere Evento Individual o Pro. Actívalo en la sección "Plan del evento".';
      input.value = '';
      return;
    }

    this.assetUploading = true;
    this.assetMessage = '';
    this.error = '';
    this.api.createUploadUrl({ fileName: file.name, contentType: file.type, folder, event: this.getEventId(), size: file.size }).subscribe({
      next: (upload) => {
        this.api.uploadAsset(upload.uploadUrl, file).subscribe({
          next: () => {
            if (!this.invitation) return;
            if (folder === 'covers') this.invitation.content.coverImageUrl = upload.publicUrl;
            if (folder === 'music') {
              this.invitation.content.musicUrl = upload.publicUrl;
              this.message = '🎉 ¡Archivo de música de fondo subido exitosamente en el servidor (HTTP 200)!';
            }
            if (folder === 'gallery') this.invitation.content.gallery = [...(this.invitation.content.gallery || []), upload.publicUrl];
            if (folder === 'assets') {
              this.invitation.content.privateAlbumEnabled = true;
              this.invitation.content.privateAlbum = [...(this.invitation.content.privateAlbum || []), upload.publicUrl];
            }
            this.persistUploadedAsset();
            input.value = '';
          },
          error: () => {
            this.error = 'S3 rechazó la subida. Revisa CORS del bucket, permisos PutObject y que el archivo coincida con el tipo permitido.';
            this.assetUploading = false;
          }
        });
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo preparar la URL de subida.';
        this.assetUploading = false;
      }
    });
  }

  uploadEnvelopeQr(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.invitation) return;

    this.assetUploading = true;
    this.assetMessage = '';
    this.error = '';
    this.api.createUploadUrl({ fileName: file.name, contentType: file.type, folder: 'covers', event: this.getEventId(), size: file.size }).subscribe({
      next: (upload) => {
        this.api.uploadAsset(upload.uploadUrl, file).subscribe({
          next: () => {
            if (!this.invitation) return;
            if (!this.invitation.content.digitalEnvelope) {
              this.invitation.content.digitalEnvelope = { bank: '', account: '', clabe: '', holder: '', note: '', qrImageUrl: '' };
            }
            this.invitation.content.digitalEnvelope.qrImageUrl = upload.publicUrl;
            this.persistUploadedAsset();
            this.message = '✅ Foto de código QR bancario subida exitosamente (HTTP 200).';
            input.value = '';
          },
          error: () => {
            this.error = '❌ Error al subir la foto del código QR bancario.';
            this.assetUploading = false;
          }
        });
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo preparar la URL para subir la imagen del QR.';
        this.assetUploading = false;
      }
    });
  }

  private validateAsset(file: File, folder: AssetFolder): string {
    const isMusic = folder === 'music';
    const allowedTypes = isMusic ? this.audioTypes : this.imageTypes;
    const maxSize = isMusic ? this.maxAudioSize : this.maxImageSize;
    if (!allowedTypes.has(file.type)) return isMusic ? 'Formato de audio no soportado.' : 'Formato de imagen no soportado.';
    if (file.size > maxSize) return isMusic ? 'El audio no debe exceder 10MB.' : 'La imagen no debe exceder 5MB.';
    return '';
  }

  checkout(pack: PaymentPackage): void {
    if (!this.invitation || pack === 'free') return;
    this.checkoutLoading = pack;
    this.error = '';
    this.message = '';
    this.api.createCheckout({ package: pack, event: this.getEventId(), invitation: this.getInvitationId(this.invitation) }).subscribe({
      next: ({ checkoutUrl, manualPayment, message }) => {
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
          return;
        }
        this.message = manualPayment ? (message || 'Pago manual registrado como pendiente.') : (message || 'Plan activado con éxito.');
        this.checkoutLoading = '';
        this.loadPlans();
      },
      error: (error) => {
        this.error = error.error?.message || 'No se pudo iniciar el checkout.';
        this.checkoutLoading = '';
      }
    });
  }

  formatPrice(plan: PlanDefinition): string {
    return plan.amount ? `$${Math.round(plan.amount / 100).toLocaleString('es-MX')} MXN` : 'Gratis';
  }

  planLimitText(plan: PlanDefinition): string {
    const limits = plan.limits;
    const items = [
      `${limits.guests} invitados`,
      `${limits.galleryImages} imágenes`,
      limits.music ? 'música' : 'sin música',
      limits.premiumTemplates ? 'plantillas premium' : 'plantillas free',
      limits.exportData ? 'exportación' : 'sin exportación',
      limits.whatsappMessaging ? 'WhatsApp individual' : '',
      limits.whatsappBulk ? 'WhatsApp masivo' : '',
      limits.checkIn ? 'check-in QR' : '',
      limits.seating ? 'mesas' : '',
      limits.guestAlbum ? 'álbum invitados' : '',
      limits.customDomain ? 'dominio custom' : '',
      limits.whiteLabel ? 'marca blanca' : ''
    ].filter(Boolean);
    return items.join(' · ');
  }

  isProPlan(key?: string): boolean {
    return ['pro', 'planner_pro_monthly', 'planner_pro_yearly', 'organizer'].includes(key || '');
  }

  isEventPlan(key?: string): boolean {
    return ['event', 'event_12m', 'external_dashboard_12m'].includes(key || '');
  }

  canCheckoutPlan(plan: PlanDefinition): boolean {
    if (!plan || plan.key === 'free') return false;
    const currentKey = this.currentPlan?.key;
    if (this.isProPlan(currentKey)) return false;
    if (this.isEventPlan(plan.key) && this.isEventPlan(currentKey)) return false;
    if (plan.key === currentKey) return false;
    return true;
  }

  checkoutScopeText(plan: PlanDefinition): string {
    if (this.isEventPlan(plan.key)) return 'Aplica a este evento completo y a todas sus invitaciones.';
    if (this.isProPlan(plan.key)) return 'Aplica a toda la cuenta. Desbloquea funciones Pro para todos tus eventos.';
    return 'Plan gratuito para pruebas iniciales.';
  }

  getInvitationId(invitation?: InvitationModel): string {
    return invitation?._id || invitation?.id || '';
  }

  getEventId(): string {
    return this.event?._id || this.event?.id || '';
  }

  addItineraryItem(): void {
    if (!this.invitation) return;
    this.ensureContentCollections();
    this.invitation.content.itinerary!.push({ time: '', title: '', description: '' });
  }

  removeItineraryItem(index: number): void {
    if (!this.invitation?.content.itinerary) return;
    this.invitation.content.itinerary.splice(index, 1);
  }

  moveItineraryItem(index: number, direction: -1 | 1): void {
    const items = this.invitation?.content.itinerary;
    if (!items) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const [item] = items.splice(index, 1);
    items.splice(nextIndex, 0, item);
  }

  addLocation(): void {
    if (!this.invitation) return;
    this.ensureContentCollections();
    this.invitation.content.locations!.push({ type: 'recepción', name: '', address: '', mapUrl: '', wazeUrl: '', notes: '' });
  }

  removeLocation(index: number): void {
    if (!this.invitation?.content.locations) return;
    this.invitation.content.locations.splice(index, 1);
    delete this.locationSearchResults[index];
    delete this.locationSearchLoading[index];
    delete this.locationExtractLoading[index];
  }

  onLocationNameInput(index: number, query?: string): void {
    if (this.searchTimeouts[index]) clearTimeout(this.searchTimeouts[index]);
    const trimmed = (query || '').trim();
    if (!trimmed || trimmed.length < 3) {
      this.locationSearchResults[index] = [];
      this.locationSearchLoading[index] = false;
      return;
    }
    this.locationSearchLoading[index] = true;
    this.searchTimeouts[index] = setTimeout(() => {
      this.api.searchPlaces(trimmed).subscribe({
        next: (results) => {
          this.locationSearchResults[index] = results;
          this.locationSearchLoading[index] = false;
        },
        error: () => {
          this.locationSearchResults[index] = [];
          this.locationSearchLoading[index] = false;
        }
      });
    }, 450);
  }

  selectLocationSearchResult(index: number, result: { name: string; address: string; mapUrl: string; wazeUrl: string }): void {
    if (!this.invitation?.content.locations?.[index]) return;
    const loc = this.invitation.content.locations[index];
    if (result.name) loc.name = result.name;
    if (result.address) loc.address = result.address;
    if (result.mapUrl) loc.mapUrl = result.mapUrl;
    if (result.wazeUrl) loc.wazeUrl = result.wazeUrl;
    this.locationSearchResults[index] = [];
  }

  async extractInfoFromMapUrl(index: number): Promise<void> {
    if (!this.invitation?.content.locations?.[index]) return;
    const loc = this.invitation.content.locations[index];
    if (!loc.mapUrl) return;

    this.locationExtractLoading[index] = true;
    try {
      const parsed = await this.api.parseGoogleMapsUrl(loc.mapUrl);
      if (parsed.name) loc.name = parsed.name;
      if (parsed.address) loc.address = parsed.address;
      if (parsed.wazeUrl) loc.wazeUrl = parsed.wazeUrl;
      this.message = 'Información extraída del enlace de Google Maps.';
    } catch (e) {
      this.error = 'No se pudo extraer la información del enlace.';
    } finally {
      this.locationExtractLoading[index] = false;
    }
  }

  addGiftRegistryItem(): void {
    if (!this.invitation) return;
    this.ensureContentCollections();
    this.invitation.content.giftRegistry!.push({ store: '', title: '', label: '', url: '', imageUrl: '', note: '', priority: this.invitation.content.giftRegistry!.length });
  }

  removeGiftRegistryItem(index: number): void {
    if (!this.invitation?.content.giftRegistry) return;
    this.invitation.content.giftRegistry.splice(index, 1);
  }

  toggleIdentityMethod(method: 'email' | 'phone', checked: boolean): void {
    if (!this.invitation?.rsvpSettings) return;
    const current = this.invitation.rsvpSettings.identityMethods || ['email', 'phone'];
    this.invitation.rsvpSettings.identityMethods = checked
      ? (Array.from(new Set([...current, method])) as Array<'email' | 'phone'>)
      : (current.filter((item) => item !== method) as Array<'email' | 'phone'>);
  }

  removeMusic(): void {
    if (!this.invitation) return;
    this.invitation.content.musicUrl = '';
    this.musicError = false;
    this.assetMessage = 'Música quitada. Guarda la invitación para confirmar.';
    this.clearMessageAfterDelay();
  }


  removeCover(): void {
    if (!this.invitation) return;
    this.invitation.content.coverImageUrl = '';
    this.assetMessage = 'Portada quitada. Guarda la invitación para confirmar.';
    this.clearMessageAfterDelay();
  }

  removeGalleryImage(index: number): void {
    if (!this.invitation?.content.gallery) return;
    this.invitation.content.gallery.splice(index, 1);
    this.assetMessage = 'Imagen quitada. Guarda la invitación para confirmar.';
    this.clearMessageAfterDelay();
  }

  removePrivateAlbumImage(index: number): void {
    if (!this.invitation?.content.privateAlbum) return;
    this.invitation.content.privateAlbum.splice(index, 1);
    if (this.invitation.content.privateAlbum.length === 0) {
      this.invitation.content.privateAlbumEnabled = false;
    }
    this.assetMessage = 'Imagen del álbum quitada. Guarda la invitación para confirmar.';
    this.clearMessageAfterDelay();
  }

  togglePrivateAlbum(): void {
    if (!this.invitation) return;
    if (!this.canUseGuestAlbum()) {
      this.error = 'El álbum de invitados requiere el plan Evento Individual o Pro. Actívalo en la sección "Plan del evento".';
      return;
    }
    this.invitation.content.privateAlbumEnabled = !this.invitation.content.privateAlbumEnabled;
  }

  canUsePremiumTemplates(): boolean {
    return Boolean(this.currentPlan?.limits?.premiumTemplates);
  }

  canUseWhiteLabel(): boolean {
    return Boolean(this.currentPlan?.limits?.whiteLabel);
  }

  canUseGuestAlbum(): boolean {
    return Boolean(this.currentPlan?.limits?.guestAlbum);
  }

  canUseMusic(): boolean {
    return Boolean(this.currentPlan?.limits?.music);
  }

  onMusicPlaybackError(): void {
    this.musicError = true;
    this.error = 'La música está guardada, pero no se puede reproducir. Revisa la URL o sube un archivo en formato MP3/AAC.';
  }

  goBackToEvent(): void {
    if (this.event) {
      this.router.navigate(['/new/events', this.getEventId()]);
    } else {
      this.router.navigate(['/new/events']);
    }
  }

  private sanitizePayload<T>(obj: T): T {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizePayload(item)) as unknown as T;
    }
    if (obj !== null && typeof obj === 'object') {
      const cleaned: Record<string, unknown> = {};
      for (const key of Object.keys(obj as Record<string, unknown>)) {
        if (key !== '_id' && key !== 'id') {
          cleaned[key] = this.sanitizePayload((obj as Record<string, unknown>)[key]);
        }
      }
      return cleaned as T;
    }
    return obj;
  }

  private getFriendlyErrorMessage(err: any): string {
    const raw = err.error?.message || err.message || (typeof err === 'string' ? err : '');
    const strError = JSON.stringify(err || {});

    if (
      raw.includes('E11000') ||
      raw.includes('duplicate key') ||
      raw.includes('slug_1') ||
      raw.includes('findAndModify') ||
      strError.includes('E11000') ||
      strError.includes('slug_1')
    ) {
      return '❌ Esta URL (slug) ya está ocupada por otra invitación. Por favor elige una dirección o enlace diferente.';
    }

    if (err.error?.details?.fieldErrors?.body) {
      return `Error de validación: ${JSON.stringify(err.error.details.fieldErrors.body)}`;
    }

    return raw || 'Error al procesar la solicitud.';
  }

  private clearMessageAfterDelay(): void {
    setTimeout(() => {
      this.message = '';
      this.assetMessage = '';
    }, 4000);
  }

  private persistUploadedAsset(): void {
    if (!this.invitation) return;
    const rootTemplate = (this.invitation.template && /^[0-9a-fA-F]{24}$/.test(this.invitation.template)) ? this.invitation.template : undefined;

    this.api.updateInvitation(this.getInvitationId(this.invitation), {
      slug: this.invitation.slug,
      accessMode: this.invitation.accessMode,
      rsvpSettings: this.sanitizePayload(this.getRsvpSettingsPayload()),
      template: rootTemplate,
      content: this.sanitizePayload(this.getContentPayload())
    }).subscribe({
      next: ({ invitation }) => {
        this.invitation = invitation;
        if (rootTemplate) this.invitation.template = rootTemplate;
        if (!this.invitation.content) this.invitation.content = {};
        if (!this.invitation.content.palette) this.invitation.content.palette = { primary: '#1f2a44', secondary: '#f7f2ea', accent: '#b67b4b' };
        if (!this.invitation.accessMode) this.invitation.accessMode = 'open';
        this.ensureContentCollections();
        this.ensureRsvpSettings();
        this.syncEditorTextFields();
        this.publicUrl = `${window.location.origin}/new/i/${invitation.slug}`;
        this.assetMessage = 'Asset subido y guardado.';
        this.assetUploading = false;
        this.clearMessageAfterDelay();
      },
      error: (error) => {
        this.error = this.getFriendlyErrorMessage(error);
        this.assetUploading = false;
      }
    });
  }

  private formatDateForDateTimeLocalInput(dateVal: any): string {
    if (!dateVal) return '';
    if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateVal)) {
      return dateVal;
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return typeof dateVal === 'string' ? dateVal : '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private ensureRsvpSettings(): void {
    if (!this.invitation) return;
    this.invitation.rsvpSettings = {
      ...this.invitation.rsvpSettings,
      deadline: this.formatDateForDateTimeLocalInput(this.invitation.rsvpSettings?.deadline),
      allowMaybe: this.invitation.rsvpSettings?.allowMaybe !== false,
      allowChangesUntilDeadline: this.invitation.rsvpSettings?.allowChangesUntilDeadline !== false,
      declineRequiresConfirmation: this.invitation.rsvpSettings?.declineRequiresConfirmation !== false,
      reminderDaysBeforeDeadline: this.invitation.rsvpSettings?.reminderDaysBeforeDeadline ?? 3,
      identityMethods: this.invitation.rsvpSettings?.identityMethods?.length ? this.invitation.rsvpSettings.identityMethods : ['email', 'phone'],
      allowCompanionsDefault: this.invitation.rsvpSettings?.allowCompanionsDefault === true,
      defaultAllowedCompanions: this.invitation.rsvpSettings?.defaultAllowedCompanions ?? 0,
      maxAttendees: this.invitation.rsvpSettings?.maxAttendees,
      allowedRoles: this.invitation.rsvpSettings?.allowedRoles || [],
      allowedGroups: this.invitation.rsvpSettings?.allowedGroups || [],
      allowedEmails: this.invitation.rsvpSettings?.allowedEmails || [],
      allowedPhones: this.invitation.rsvpSettings?.allowedPhones || [],
      customQuestions: this.invitation.rsvpSettings?.customQuestions || []
    };
  }

  sectionMusicOptions = [
    { key: 'rsvp', label: '💌 Confirmación RSVP' },
    { key: 'dressCode', label: '👔 Código de Vestimenta' },
    { key: 'locations', label: '📍 Ubicaciones / Lugares' },
    { key: 'itinerary', label: '🗓️ Itinerario del Evento' },
    { key: 'gallery', label: '📸 Galería de Fotos' },
    { key: 'giftRegistry', label: '🎁 Mesa de Regalos / Sobres' },
    { key: 'dedications', label: '💬 Dedicatorias de Invitados' },
    { key: 'lodging', label: '🏨 Recomendaciones de Hospedaje' }
  ];

  setSectionMusicUrl(sectionKey: string, url: string): void {
    if (!this.invitation) return;
    if (!this.invitation.content.sectionMusic || typeof (this.invitation.content.sectionMusic as any).entries === 'function') {
      this.invitation.content.sectionMusic = this.cleanSectionMusic(this.invitation.content.sectionMusic);
    }
    const trimmed = (url || '').trim();
    if (trimmed) {
      this.invitation.content.sectionMusic[sectionKey] = trimmed;
    } else {
      delete this.invitation.content.sectionMusic[sectionKey];
    }
  }

  removeSectionMusic(sectionKey: string): void {
    if (!this.invitation?.content?.sectionMusic) return;
    if (typeof (this.invitation.content.sectionMusic as any).delete === 'function') {
      (this.invitation.content.sectionMusic as any).delete(sectionKey);
    }
    delete this.invitation.content.sectionMusic[sectionKey];
  }

  uploadSectionMusic(event: Event, sectionKey: string): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.invitation) return;

    const validationError = this.validateAsset(file, 'music');
    if (validationError) {
      this.error = validationError;
      input.value = '';
      return;
    }

    if (!this.canUseMusic()) {
      this.error = 'La música requiere Evento Individual o Pro. Actívalo en la sección "Plan del evento".';
      input.value = '';
      return;
    }

    const eventId = this.getEventId();
    const contentType = file.type || (file.name.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg');

    this.assetUploading = true;
    this.assetMessage = 'Subiendo música para la sección...';
    this.api.createUploadUrl({
      fileName: file.name,
      contentType: contentType === 'audio/mp3' ? 'audio/mpeg' : contentType,
      folder: 'music',
      event: eventId && eventId.length >= 12 ? eventId : undefined,
      size: file.size
    }).subscribe({
      next: (upload) => {
        this.api.uploadAsset(upload.uploadUrl, file).subscribe({
          next: () => {
            this.setSectionMusicUrl(sectionKey, upload.publicUrl);
            this.persistUploadedAsset();
            input.value = '';
          },
          error: () => {
            this.error = 'S3 rechazó la subida de música de la sección.';
            this.assetUploading = false;
          }
        });
      },
      error: (err) => {
        if (err.error?.details?.fieldErrors?.body) {
          this.error = `Error de validación al preparar subida: ${JSON.stringify(err.error.details.fieldErrors.body)}`;
        } else {
          this.error = err.error?.message || 'Error al preparar URL de subida para música.';
        }
        this.assetUploading = false;
      }
    });
  }

  private ensureContentCollections(): void {
    if (!this.invitation) return;
    if (!this.invitation.content.gallery) this.invitation.content.gallery = [];
    if (!this.invitation.content.giftRegistry) this.invitation.content.giftRegistry = [];
    if (!this.invitation.content.sectionMusic || typeof (this.invitation.content.sectionMusic as any).entries === 'function') {
      this.invitation.content.sectionMusic = this.cleanSectionMusic(this.invitation.content.sectionMusic);
    }
    if (!this.invitation.content.giftSettings) this.invitation.content.giftSettings = { enabled: true, introText: '', showRegistry: true, showEnvelope: true };
    if (!this.invitation.content.dedicationSettings) this.invitation.content.dedicationSettings = { enabled: true, requireApproval: true, introText: '' };
    this.invitation.content.sectionSettings = {
      story: this.invitation.content.sectionSettings?.story !== false,
      locations: this.invitation.content.sectionSettings?.locations !== false,
      itinerary: this.invitation.content.sectionSettings?.itinerary !== false,
      dressCode: this.invitation.content.sectionSettings?.dressCode !== false,
      rsvp: this.invitation.content.sectionSettings?.rsvp !== false,
      giftRegistry: this.invitation.content.sectionSettings?.giftRegistry !== false,
      digitalEnvelope: this.invitation.content.sectionSettings?.digitalEnvelope !== false,
      lodging: this.invitation.content.sectionSettings?.lodging !== false,
      gallery: this.invitation.content.sectionSettings?.gallery !== false,
      guestAlbum: this.invitation.content.sectionSettings?.guestAlbum !== false,
      dedications: this.invitation.content.sectionSettings?.dedications !== false,
      backgroundMusic: this.invitation.content.sectionSettings?.backgroundMusic !== false,
      songRequests: this.invitation.content.sectionSettings?.songRequests !== false
    };
    if (!this.invitation.content.digitalEnvelope) this.invitation.content.digitalEnvelope = { bank: '', account: '', clabe: '', holder: '', note: '', qrImageUrl: '' };
    if (!this.invitation.content.itinerary) this.invitation.content.itinerary = [];
    if (!this.invitation.content.locations) {
      const venue = this.event?.venue;
      this.invitation.content.locations = venue?.name || venue?.address || venue?.mapUrl
        ? [{ type: 'principal', name: venue.name || '', address: venue.address || '', mapUrl: venue.mapUrl || '', wazeUrl: '', notes: '' }]
        : [];
    }
  }

  private getRsvpSettingsPayload() {
    if (!this.invitation?.rsvpSettings) return undefined;
    this.syncCustomQuestionsToPayload();
    return {
      ...this.invitation.rsvpSettings,
      deadline: this.invitation.rsvpSettings.deadline || undefined,
      reminderDaysBeforeDeadline: Number(this.invitation.rsvpSettings.reminderDaysBeforeDeadline ?? 3),
      identityMethods: (this.invitation.rsvpSettings.identityMethods?.length ? this.invitation.rsvpSettings.identityMethods : ['email', 'phone']) as Array<'email' | 'phone'>,
      defaultAllowedCompanions: Number(this.invitation.rsvpSettings.defaultAllowedCompanions || 0),
      maxAttendees: this.invitation.rsvpSettings.maxAttendees ? Number(this.invitation.rsvpSettings.maxAttendees) : undefined,
      allowedRoles: this.parseLines(this.allowedRolesText),
      allowedGroups: this.parseLines(this.allowedGroupsText),
      allowedEmails: this.parseLines(this.allowedEmailsText),
      allowedPhones: this.parseLines(this.allowedPhonesText),
      customQuestions: this.invitation.rsvpSettings.customQuestions || []
    };
  }

  private cleanSectionMusic(mapObj?: any): Record<string, string> {
    if (!mapObj) return {};
    const cleaned: Record<string, string> = {};
    if (typeof mapObj === 'object') {
      if (typeof mapObj.entries === 'function') {
        for (const [key, val] of mapObj.entries()) {
          if (key && val && typeof val === 'string' && val.trim().length > 0) {
            cleaned[key] = val.trim();
          }
        }
      } else {
        for (const [key, val] of Object.entries(mapObj)) {
          if (key && val && typeof val === 'string' && (val as string).trim().length > 0) {
            cleaned[key] = (val as string).trim();
          }
        }
      }
    }
    return cleaned;
  }

  private getCleanSongRequestSettings(): SongRequestSettings {
    const djSettings = (this.event?.externalContent?.songRequestSettings || this.invitation?.content?.songRequestSettings || {}) as any;
    const songEnabled = this.invitation?.content?.sectionSettings?.songRequests !== false;
    const max = Number(djSettings.maxRequestsPerGuest);
    return {
      enabled: songEnabled && djSettings.enabled !== false,
      maxRequestsPerGuest: !isNaN(max) && max > 0 ? max : 3,
      allowDedications: djSettings.allowDedications !== false,
      requireApproval: djSettings.requireApproval !== false
    };
  }

  private getContentPayload() {
    if (!this.invitation) return undefined;
    const invId = this.getInvitationId(this.invitation);
    const slug = this.invitation.slug;
    const activeTemplateKey = this.invitation.content?.template || (invId ? localStorage.getItem(`inv_tpl_${invId}`) : undefined) || (slug ? localStorage.getItem(`inv_tpl_${slug}`) : undefined) || 'envelope-cards';
    const rawContent: any = { ...this.invitation.content, template: activeTemplateKey };

    if (rawContent.storyTitle !== undefined) {
      rawContent.subheadline = rawContent.storyTitle;
    }
    if (rawContent.storyBody !== undefined) {
      rawContent.message = rawContent.storyBody;
    }

    delete rawContent.activeCustomTemplateId;
    delete rawContent.sourceTemplateKey;
    delete rawContent.editedTexts;

    return {
      ...rawContent,
      template: activeTemplateKey,
      songRequestSettings: this.getCleanSongRequestSettings(),
      sectionMusic: this.cleanSectionMusic(this.invitation.content.sectionMusic || {}),
      itinerary: this.cleanItinerary(this.invitation.content.itinerary || []),
      locations: this.cleanLocations(this.invitation.content.locations || []),
      giftRegistry: this.cleanGiftRegistry(this.invitation.content.giftRegistry || []),
      lodging: (this.invitation.content.lodging || []).filter((item) => item.name || item.description || item.url)
    };
  }

  private syncEditorTextFields(): void {
    if (!this.invitation) return;
    if (!this.invitation.content) this.invitation.content = {};
    this.invitation.content.storyTitle = this.invitation.content.storyTitle || this.invitation.content.subheadline || '';
    this.invitation.content.storyBody = this.invitation.content.storyBody || this.invitation.content.message || '';
    if (!this.invitation.content.lodging) this.invitation.content.lodging = [];
    this.lodgingText = (this.invitation.content.lodging || [])
      .map((item) => [item.name, item.description, item.url].filter(Boolean).join(' | '))
      .join('\n');
    this.allowedRolesText = (this.invitation.rsvpSettings?.allowedRoles || []).join('\n');
    this.allowedGroupsText = (this.invitation.rsvpSettings?.allowedGroups || []).join('\n');
    this.allowedEmailsText = (this.invitation.rsvpSettings?.allowedEmails || []).join('\n');
    this.allowedPhonesText = (this.invitation.rsvpSettings?.allowedPhones || []).join('\n');
    this.syncCustomQuestionsFromInvitation();
  }

  addLodgingItem(): void {
    if (!this.invitation) return;
    if (!this.invitation.content.lodging) this.invitation.content.lodging = [];
    this.invitation.content.lodging.push({ name: '', description: '', url: '' });
  }

  removeLodgingItem(index: number): void {
    if (!this.invitation?.content?.lodging) return;
    this.invitation.content.lodging.splice(index, 1);
  }

  syncCustomQuestionsFromInvitation(): void {
    const questions = this.invitation?.rsvpSettings?.customQuestions || [];
    this.customQuestionsList = questions.map(q => ({
      key: q.key || this.slugify(q.label || ''),
      label: q.label || '',
      type: q.type || 'text',
      required: Boolean(q.required),
      optionsText: (q.options || []).join('; '),
      options: q.options || []
    }));
  }

  syncCustomQuestionsToPayload(): void {
    if (!this.invitation) return;
    if (!this.invitation.rsvpSettings) this.ensureRsvpSettings();
    if (!this.invitation.rsvpSettings) return;

    this.invitation.rsvpSettings.customQuestions = this.customQuestionsList
      .filter(q => q.label && q.label.trim().length > 0)
      .map((q, index) => ({
        key: q.key || this.slugify(q.label) || `pregunta_${index + 1}`,
        label: q.label.trim(),
        type: q.type,
        required: Boolean(q.required),
        options: q.type === 'select'
          ? (q.optionsText || '').split(';').map(o => o.trim()).filter(Boolean)
          : []
      }));
  }

  addCustomQuestion(label = '', type: 'text' | 'textarea' | 'select' | 'boolean' = 'text', optionsText = '', required = false): void {
    this.customQuestionsList.push({
      key: this.slugify(label) || `pregunta_${this.customQuestionsList.length + 1}`,
      label,
      type,
      required,
      optionsText,
      options: optionsText ? optionsText.split(';').map(o => o.trim()).filter(Boolean) : []
    });
    this.syncCustomQuestionsToPayload();
  }

  removeCustomQuestion(index: number): void {
    this.customQuestionsList.splice(index, 1);
    this.syncCustomQuestionsToPayload();
  }

  addQuestionPreset(presetKey: string): void {
    if (presetKey === 'song') {
      this.addCustomQuestion('Canción preferida para la fiesta', 'text', '', false);
    } else if (presetKey === 'diet') {
      this.addCustomQuestion('Restricciones o alergias alimenticias', 'textarea', '', false);
    } else if (presetKey === 'menu') {
      this.addCustomQuestion('Opción de platillo preferido', 'select', 'Pollo supremo; Filete de res; Opción vegetariana; Menú infantil', true);
    } else if (presetKey === 'transport') {
      this.addCustomQuestion('¿Requieres transporte del hotel a la recepción?', 'boolean', '', false);
    }
  }

  parseOptionsText(optionsText: string = ''): string[] {
    return optionsText.split(';').map(o => o.trim()).filter(Boolean);
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }

  private cleanItinerary(items: Array<Partial<EventAgendaItem>>) {
    return items
      .map((item) => ({
        time: String(item.time || '').trim(),
        title: String(item.title || '').trim(),
        description: String(item.description || '').trim()
      }))
      .filter((item) => item.time || item.title || item.description);
  }

  private cleanLocations(items: InvitationLocation[]) {
    return items
      .map((item) => ({
        type: String(item.type || '').trim(),
        name: String(item.name || '').trim(),
        address: String(item.address || '').trim(),
        mapUrl: String(item.mapUrl || '').trim(),
        wazeUrl: String(item.wazeUrl || '').trim(),
        notes: String(item.notes || '').trim()
      }))
      .filter((item) => item.type || item.name || item.address || item.mapUrl || item.wazeUrl || item.notes);
  }

  private cleanGiftRegistry(values: any[] = []) {
    return (values || []).map((item, index) => ({
      store: String(item.store || '').trim() || undefined,
      title: String(item.title || '').trim() || undefined,
      label: String(item.label || item.title || item.store || '').trim() || undefined,
      url: String(item.url || '').trim() || undefined,
      imageUrl: String(item.imageUrl || '').trim() || undefined,
      note: String(item.note || '').trim() || undefined,
      priority: item.priority !== '' && item.priority !== undefined && item.priority !== null ? Number(item.priority) : index
    })).filter((item) => item.store || item.title || item.label || item.url || item.imageUrl || item.note);
  }

  private parseLodging() {
    return this.lodgingText.split('\n').map((line) => {
      const [name, description, url] = line.split('|').map((part) => part.trim());
      return { name, description, url };
    }).filter((item) => item.name || item.description || item.url);
  }

  private parseCustomQuestions() {
    return this.customQuestionsText.split('\n').map((line, index) => {
      const [label, type, required, options] = line.split('|').map((part) => part.trim());
      return {
        key: label ? label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `pregunta_${index + 1}` : `pregunta_${index + 1}`,
        label,
        type: ['text', 'textarea', 'select', 'boolean'].includes(type) ? type as 'text' | 'textarea' | 'select' | 'boolean' : 'text',
        required: required === 'required' || required === 'si' || required === 'true',
        options: options ? options.split(';').map((option) => option.trim()).filter(Boolean) : []
      };
    }).filter((question) => question.label);
  }

  private parseLines(text: string): string[] {
    return text.split('\n').map((value) => value.trim()).filter(Boolean);
  }
}
