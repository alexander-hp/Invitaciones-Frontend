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

  // Respaldo de respuesta IA para descarga y depuración
  lastRawResponse = '';
  lastFailedRawResponse = '';

  // Modal para importar JSON (archivo o pegar texto)
  showImportJsonModal = false;
  importJsonTab: 'file' | 'paste' = 'file';
  pastedJsonText = '';
  importJsonError = '';

  // Guardado
  saving = false;
  saveSuccess = false;
  saveError = '';

  constructor(
    private api: ApiService,
    private sanitizer: DomSanitizer
  ) {}

  downloadJsonFile(content: any, fileName: string): void {
    try {
      const jsonString = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error al descargar archivo JSON:', e);
    }
  }

  getEventSlug(): string {
    return this.invitation?.slug ||
      (this.event as any)?.externalPortalSlug ||
      (this.event as any)?.slug ||
      (this.event?.title ? this.event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'evento');
  }

  downloadCurrentJson(): void {
    if (!this.generatedResult) return;
    const slug = this.getEventSlug();
    this.downloadJsonFile(this.generatedResult, `plantilla-ia-${slug}-${Date.now()}.json`);
  }

  downloadFailedResponse(): void {
    if (!this.lastFailedRawResponse) return;
    const slug = this.getEventSlug();
    this.downloadJsonFile(this.lastFailedRawResponse, `respuesta-ia-incompleta-${slug}-${Date.now()}.json`);
  }

  openImportModal(): void {
    this.showImportJsonModal = true;
    this.importJsonError = '';
    this.pastedJsonText = '';
  }

  closeImportModal(): void {
    this.showImportJsonModal = false;
    this.importJsonError = '';
  }

  onJsonFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      const content = e.target?.result as string;
      this.processAndLoadJson(content, file.name);
      input.value = '';
    };

    reader.onerror = () => {
      this.saveError = 'No se pudo leer el archivo seleccionado.';
      input.value = '';
    };

    reader.readAsText(file, 'utf-8');
  }

  processAndLoadJson(rawText: string, sourceName?: string): boolean {
    if (!rawText || !rawText.trim()) {
      this.importJsonError = 'El contenido proporcionado está vacío.';
      return false;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(rawText.trim());
    } catch (e1) {
      const cleaned = rawText
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      try {
        parsed = JSON.parse(cleaned);
      } catch (e2: any) {
        this.importJsonError = `Error al interpretar el JSON: ${e2?.message || 'Formato no válido'}. Asegúrate de que las comillas y llaves estén completas.`;
        this.saveError = this.importJsonError;
        return false;
      }
    }

    const data = parsed.template || parsed;
    const html = data.html || data.htmlCode || (typeof data === 'string' ? data : '');
    const css = data.css || data.cssCode || '';
    const name = data.name || (sourceName ? sourceName.replace(/\.json$/i, '') : 'Plantilla Importada');
    const description = data.description || 'Plantilla cargada manualmente desde archivo JSON';
    const features = Array.isArray(data.features) ? data.features : [];

    if (!html || typeof html !== 'string' || !html.trim()) {
      this.importJsonError = 'El JSON debe contener al menos la propiedad "html" con el código HTML de la invitación.';
      this.saveError = this.importJsonError;
      return false;
    }

    this.generatedResult = {
      name,
      description,
      html,
      css,
      features
    };

    this.lastRawResponse = JSON.stringify(parsed, null, 2);
    this.updatePreviewSrcdoc();
    this.step = 'preview';
    this.saveError = '';
    this.importJsonError = '';
    this.showImportJsonModal = false;

    this.chatHistory = [
      {
        role: 'ai',
        text: `¡Plantilla "${name}" cargada exitosamente desde JSON! Puedes verla en vivo a la derecha, probarla y pedirme cambios o guardarla para tu evento.`,
        timestamp: new Date()
      }
    ];

    return true;
  }

  applyPastedJson(): void {
    if (!this.pastedJsonText.trim()) {
      this.importJsonError = 'Por favor ingresa o pega el código JSON.';
      return;
    }
    this.processAndLoadJson(this.pastedJsonText, 'Plantilla Pegada');
  }

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
    this.lastFailedRawResponse = '';
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
          this.lastRawResponse = res.rawResponse || JSON.stringify(res.template, null, 2);
          this.lastFailedRawResponse = '';
          this.updatePreviewSrcdoc();

          // Descarga automática del JSON generado al terminar
          const slug = this.getEventSlug();
          this.downloadJsonFile(res.template, `plantilla-ia-${slug}-${Date.now()}.json`);

          this.chatHistory = [
            {
              role: 'ai',
              text: `¡He creado la plantilla "${res.template.name}" para tu evento! Se descargó automáticamente una copia en formato JSON en tu equipo. Puedes probarla en diferentes dispositivos y pedirme cualquier cambio que desees.`,
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

        // Si el backend devolvió el texto crudo recibido de la IA antes del corte/error
        if (err?.error?.rawResponse) {
          this.lastFailedRawResponse = err.error.rawResponse;
          const slug = this.getEventSlug();
          this.downloadJsonFile(this.lastFailedRawResponse, `respuesta-ia-incompleta-${slug}-${Date.now()}.json`);
        }
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
