import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiService } from '../../../../core/api.service';
import { AiTemplateGenerateRequest, AiTemplateRefineRequest, AiTemplateResult, EventModel, InvitationModel } from '../../../../core/models';

export interface StylePreset {
  id: string;
  name: string;
  description: string;
  vibe: string;
  icon: string;
  palette: { primary: string; secondary: string; accent: string };
  badge: string;
}

export interface SectionOption {
  key: string;
  label: string;
  description: string;
  icon: string;
  recommended: boolean;
}

@Component({
  selector: 'app-ai-template-wizard-modal',
  templateUrl: './ai-template-wizard-modal.component.html',
  styleUrls: ['./ai-template-wizard-modal.component.css']
})
export class AiTemplateWizardModalComponent implements OnInit {
  @Input() event?: EventModel;
  @Input() invitation?: InvitationModel;
  @Output() close = new EventEmitter<void>();
  @Output() templateApplied = new EventEmitter<{ htmlCode: string; cssCode: string; name: string }>();

  step: 'style' | 'palette' | 'sections' | 'inspect-prompt' | 'generating' | 'preview' = 'style';

  stylePresets: StylePreset[] = [
    {
      id: 'luxury-gold',
      name: 'Elegancia Oro & Noir',
      description: 'Fondo oscuro profundo con reflejos dorados, tipografía de lujo y acentos en oro pulido.',
      vibe: 'lujoso',
      icon: 'sparkles',
      palette: { primary: '#111827', secondary: '#1f2937', accent: '#f59e0b' },
      badge: 'Popular'
    },
    {
      id: 'minimal-editorial',
      name: 'Minimalismo Editorial',
      description: 'Líneas limpias, fondos claros crema, tipografía serif contemporánea y elegancia pura.',
      vibe: 'formal',
      icon: 'layout',
      palette: { primary: '#2d3748', secondary: '#faf5f0', accent: '#a07855' },
      badge: 'Moderno'
    },
    {
      id: 'romantic-rosegold',
      name: 'Romántico Rose Gold & Blush',
      description: 'Tonos pastel empolvados, destellos oro rosa, atmósfera suave y romántica.',
      vibe: 'romantico',
      icon: 'heart',
      palette: { primary: '#3b2f2f', secondary: '#fdf7f7', accent: '#e07a5f' },
      badge: 'Romántico'
    },
    {
      id: 'boho-botanical',
      name: 'Boho Chic & Naturaleza',
      description: 'Acentos botánicos, tonos tierra, verde olivo y texturas orgánicas.',
      vibe: 'romantico',
      icon: 'feather',
      palette: { primary: '#2c402e', secondary: '#f7f6f2', accent: '#bc6c25' },
      badge: 'Boho'
    },
    {
      id: 'neon-festive',
      name: 'Neón Cyber & Noche Festiva',
      description: 'Efectos glow luminosos, fondos noche y gran energía para fiestas y graduaciones.',
      vibe: 'festivo',
      icon: 'zap',
      palette: { primary: '#09090b', secondary: '#18181b', accent: '#ec4899' },
      badge: 'Fiesta'
    },
    {
      id: 'classic-royal',
      name: 'Realeza Clásica Azul Zafiro',
      description: 'Marcos ornamentales, azul real majestuoso y acentos en plata y platino.',
      vibe: 'formal',
      icon: 'shield',
      palette: { primary: '#0f172a', secondary: '#f8fafc', accent: '#3b82f6' },
      badge: 'Clásico'
    }
  ];

  selectedStyleId = 'luxury-gold';
  selectedVibe = 'lujoso';
  customPalette = { primary: '#111827', secondary: '#1f2937', accent: '#f59e0b' };

  sectionsList: SectionOption[] = [
    { key: 'hero', label: 'Portada & Cuenta Regresiva', description: 'Título del evento, fecha y temporizador en vivo.', icon: 'clock', recommended: true },
    { key: 'story', label: 'Nuestra Historia', description: 'Mensaje emotivo o reseña de la historia de los novios.', icon: 'book-open', recommended: true },
    { key: 'itinerary', label: 'Itinerario & Cronograma', description: 'Horarios detallados de cada momento de la celebración.', icon: 'calendar', recommended: true },
    { key: 'locations', label: 'Ubicaciones con Mapa & Waze', description: 'Direcciones con botones directos para GPS y transporte.', icon: 'map-pin', recommended: true },
    { key: 'rsvp', label: 'Confirmación RSVP en Vivo', description: 'Formulario para que confirmen asistencia de forma interactiva.', icon: 'check-circle', recommended: true },
    { key: 'giftRegistry', label: 'Mesa de Regalos & Sobre Digital', description: 'Datos bancarios, CLABE y tiendas registradas.', icon: 'gift', recommended: true },
    { key: 'gallery', label: 'Galería de Fotos Oficial', description: 'Álbum con fotografías destacadas del evento.', icon: 'image', recommended: false },
    { key: 'dedications', label: 'Muro de Dedicatorias', description: 'Espacio para que los invitados dejen sus mejores deseos.', icon: 'message-circle', recommended: false },
    { key: 'music', label: 'Música & Peticiones al DJ', description: 'Reproductor de música y módulo para sugerir canciones.', icon: 'music', recommended: false },
    { key: 'dressCode', label: 'Código de Vestimenta', description: 'Indicaciones de etiqueta y sugerencias de vestuario.', icon: 'tag', recommended: true }
  ];

  selectedSections: Record<string, boolean> = {
    hero: true,
    story: true,
    itinerary: true,
    locations: true,
    rsvp: true,
    giftRegistry: true,
    gallery: true,
    dedications: true,
    music: true,
    dressCode: true
  };

  customPrompt = '';
  inspectingPrompt = false;
  compiledPromptData: { systemInstruction: string; userPrompt: string } | null = null;

  inspectPrompt(): void {
    this.inspectingPrompt = true;
    this.saveError = '';

    const selectedPreset = this.stylePresets.find(s => s.id === this.selectedStyleId);
    const payload: AiTemplateGenerateRequest = {
      eventId: (this.event?._id || this.event?.id),
      style: `${selectedPreset?.name || 'Elegante y Moderno'}: ${selectedPreset?.description || ''}`,
      palette: this.customPalette,
      vibe: this.selectedVibe,
      sections: this.getSelectedSectionsLabels(),
      customPrompt: this.customPrompt.trim()
    };

    this.api.previewAiTemplatePrompt(payload).subscribe({
      next: res => {
        this.inspectingPrompt = false;
        if (res.promptPreview) {
          this.compiledPromptData = res.promptPreview;
          this.step = 'inspect-prompt';
        } else {
          this.saveError = 'No se pudo obtener la vista previa de la petición desde el servidor.';
        }
      },
      error: err => {
        this.inspectingPrompt = false;
        this.saveError = err?.error?.message || 'Error al conectar con el servidor para inspeccionar la petición.';
      }
    });
  }

  generating = false;
  generationStepText = 'Iniciando generación con Inteligencia Artificial...';
  generatedResult: AiTemplateResult | null = null;
  previewSafeSrcdoc: SafeHtml = '';
  previewViewport: 'desktop' | 'tablet' | 'mobile' = 'desktop';
  previewActiveTab: 'preview' | 'html' | 'css' = 'preview';

  // Refinamiento por Chat
  refinementInput = '';
  refining = false;
  chatHistory: Array<{ role: 'user' | 'ai'; text: string; timestamp: Date }> = [];

  // Guardado
  saving = false;
  saveSuccess = false;
  saveError = '';

  constructor(
    private api: ApiService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    if (this.invitation?.content?.palette) {
      if (this.invitation.content.palette.primary) this.customPalette.primary = this.invitation.content.palette.primary;
      if (this.invitation.content.palette.secondary) this.customPalette.secondary = this.invitation.content.palette.secondary;
      if (this.invitation.content.palette.accent) this.customPalette.accent = this.invitation.content.palette.accent;
    }
  }

  selectStyle(style: StylePreset): void {
    this.selectedStyleId = style.id;
    this.selectedVibe = style.vibe;
    this.customPalette = { ...style.palette };
  }

  toggleSection(key: string): void {
    this.selectedSections[key] = !this.selectedSections[key];
  }

  get selectedSectionsCount(): number {
    return Object.values(this.selectedSections).filter(Boolean).length;
  }

  getSelectedSectionsLabels(): string[] {
    return this.sectionsList
      .filter(s => this.selectedSections[s.key])
      .map(s => s.label);
  }

  startGeneration(): void {
    this.step = 'generating';
    this.generating = true;
    this.saveError = '';
    this.generationStepText = 'Conectando con Google Gemini AI y analizando estilo...';

    const selectedPreset = this.stylePresets.find(s => s.id === this.selectedStyleId);

    const payload: AiTemplateGenerateRequest = {
      eventId: (this.event?._id || this.event?.id),
      style: `${selectedPreset?.name || 'Elegante y Moderno'}: ${selectedPreset?.description || ''}`,
      palette: this.customPalette,
      vibe: this.selectedVibe,
      sections: this.getSelectedSectionsLabels(),
      customPrompt: this.customPrompt.trim()
    };

    setTimeout(() => {
      this.generationStepText = 'Diseñando estructura HTML5 responsive y tipografías...';
    }, 1800);

    setTimeout(() => {
      this.generationStepText = 'Aplicando paleta de colores, sombras y animaciones CSS...';
    }, 3800);

    setTimeout(() => {
      this.generationStepText = 'Integrando scripts interactivos para cuenta regresiva y RSVP...';
    }, 5800);

    this.api.generateAiTemplate(payload).subscribe({
      next: res => {
        this.generating = false;
        if (res.template && res.template.html) {
          this.generatedResult = res.template;
          this.updatePreviewSrcdoc();
          this.chatHistory = [
            {
              role: 'ai',
              text: `¡He creado la plantilla "${res.template.name}" para tu evento! Puedes ver el diseño en vivo a la derecha, probarlo en diferentes dispositivos y pedirme cualquier cambio que desees.`,
              timestamp: new Date()
            }
          ];
          this.step = 'preview';
        } else {
          this.step = 'style';
          this.saveError = 'No se pudo generar la plantilla. Por favor intenta de nuevo.';
        }
      },
      error: err => {
        this.generating = false;
        this.step = 'style';
        this.saveError = err?.error?.message || 'Error al conectar con la API de Gemini AI. Verifica la configuración.';
      }
    });
  }

  updatePreviewSrcdoc(): void {
    if (!this.generatedResult) return;
    const combined = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            html, body { margin: 0; padding: 0; min-height: 100%; }
            ${this.generatedResult.css || ''}
          </style>
        </head>
        <body>
          ${this.generatedResult.html || ''}
        </body>
      </html>
    `;
    this.previewSafeSrcdoc = this.sanitizer.bypassSecurityTrustHtml(combined);
  }

  sendRefinement(): void {
    if (!this.refinementInput.trim() || !this.generatedResult || this.refining) return;

    const feedback = this.refinementInput.trim();
    this.refinementInput = '';
    this.refining = true;

    this.chatHistory.push({
      role: 'user',
      text: feedback,
      timestamp: new Date()
    });

    const payload: AiTemplateRefineRequest = {
      currentHtml: this.generatedResult.html,
      currentCss: this.generatedResult.css,
      userFeedback: feedback,
      eventId: (this.event?._id || this.event?.id)
    };

    this.api.refineAiTemplate(payload).subscribe({
      next: res => {
        this.refining = false;
        if (res.template && res.template.html) {
          this.generatedResult = res.template;
          this.updatePreviewSrcdoc();
          this.chatHistory.push({
            role: 'ai',
            text: '¡Cambios aplicados con éxito! He actualizado la vista previa.',
            timestamp: new Date()
          });
        }
      },
      error: err => {
        this.refining = false;
        this.chatHistory.push({
          role: 'ai',
          text: `Hubo un inconveniente al refinar: ${err?.error?.message || 'Error de conexión'}. Intenta con otra indicación.`,
          timestamp: new Date()
        });
      }
    });
  }

  applyAndSaveTemplate(): void {
    if (!this.generatedResult) return;

    this.saving = true;
    this.saveError = '';

    const payload = {
      invitationId: (this.invitation?._id || this.invitation?.id),
      eventId: (this.event?._id || this.event?.id),
      name: this.generatedResult.name || 'Plantilla Creada con IA',
      htmlCode: this.generatedResult.html,
      cssCode: this.generatedResult.css,
      description: this.generatedResult.description
    };

    this.api.saveAiTemplate(payload).subscribe({
      next: res => {
        this.saving = false;
        this.saveSuccess = true;
        this.templateApplied.emit({
          htmlCode: this.generatedResult!.html,
          cssCode: this.generatedResult!.css,
          name: this.generatedResult!.name
        });
        setTimeout(() => {
          this.close.emit();
        }, 1200);
      },
      error: err => {
        this.saving = false;
        this.saveError = err?.error?.message || 'Error al guardar la plantilla en el servidor.';
      }
    });
  }
}
