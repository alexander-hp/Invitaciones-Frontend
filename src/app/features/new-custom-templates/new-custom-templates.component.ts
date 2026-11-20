import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiService } from '../../core/api.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { CustomTemplateSubmission, VisualDesignTemplateModel } from '../../core/models';

@Component({
  selector: 'app-new-custom-templates',
  templateUrl: './new-custom-templates.component.html',
  styleUrls: ['./new-custom-templates.component.css']
})
export class NewCustomTemplatesComponent implements OnInit {
  // Origen de plantillas
  templateSource: 'visual' | 'custom' = 'visual';

  // Configuración global de publicación automática
  autoApproveTemplates = true;
  loadingSettings = false;
  savingSetting = false;

  // Estados comunes
  loading = true;
  activeTab: 'all' | 'pending' | 'published' | 'featured' | 'rejected' = 'all';
  searchQuery = '';
  previewViewport: 'desktop' | 'tablet' | 'mobile' = 'mobile';

  // 1. Plantillas Comunitarias (Editor Visual 3 en 1)
  visualTemplates: VisualDesignTemplateModel[] = [];
  visualCounts = {
    total: 0,
    pending: 0,
    published: 0,
    featured: 0,
    rejected: 0,
    draft: 0
  };
  selectedVisualTemplate?: VisualDesignTemplateModel;
  showVisualPreviewModal = false;
  visualPreviewTab: 'invitation' | 'pass' | 'access' = 'invitation';
  showRejectVisualModal = false;
  rejectVisualFeedback = '';
  moderatingVisual = false;

  // 2. Plantillas de Integración (HTML / CSS Submissions)
  submissions: CustomTemplateSubmission[] = [];
  selectedSubmission?: CustomTemplateSubmission;
  showPreviewModal = false;
  previewActiveTab: 'preview' | 'html' | 'css' = 'preview';
  previewSafeSrcdoc: SafeHtml = '';
  showApproveModal = false;
  approving = false;
  approveFeedback = '';
  showRejectModal = false;
  rejecting = false;
  rejectFeedback = '';
  showEditModal = false;
  savingEdit = false;
  editForm = {
    name: '',
    htmlCode: '',
    cssCode: '',
    notes: ''
  };

  // Notificaciones Toast
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimeout?: any;

  constructor(
    private apiService: ApiService,
    private confirmDialog: ConfirmDialogService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.loadSettings();
    this.loadData();
  }

  loadSettings(): void {
    this.loadingSettings = true;
    this.apiService.getTemplateManagementSettings().subscribe({
      next: res => {
        this.autoApproveTemplates = Boolean(res.settings?.autoApproveTemplates);
        this.loadingSettings = false;
      },
      error: () => {
        this.autoApproveTemplates = true;
        this.loadingSettings = false;
      }
    });
  }

  toggleAutoApprove(enabled: boolean): void {
    this.savingSetting = true;
    this.apiService.updateTemplateManagementSettings({ autoApproveTemplates: enabled }).subscribe({
      next: res => {
        this.autoApproveTemplates = Boolean(res.settings?.autoApproveTemplates);
        this.savingSetting = false;
        this.showToast(res.message || 'Configuración de aprobación actualizada.');
      },
      error: err => {
        this.savingSetting = false;
        this.showToast(err?.error?.message || 'Error al actualizar la configuración.', 'error');
      }
    });
  }

  setTemplateSource(source: 'visual' | 'custom'): void {
    if (this.templateSource === source) return;
    this.templateSource = source;
    this.activeTab = 'all';
    this.loadData();
  }

  loadData(): void {
    if (this.templateSource === 'visual') {
      this.loadVisualTemplates();
    } else {
      this.loadSubmissions();
    }
  }

  // ══════════════════════════════════════════════════
  // GESTIÓN: PLANTILLAS VISUALES COMUNITARIAS (3 EN 1)
  // ══════════════════════════════════════════════════
  loadVisualTemplates(): void {
    this.loading = true;
    this.apiService.listAdminVisualTemplates({
      status: this.activeTab === 'all' ? undefined : this.activeTab,
      search: this.searchQuery.trim() || undefined
    }).subscribe({
      next: res => {
        this.visualTemplates = res.templates || [];
        if (res.counts) {
          this.visualCounts = res.counts;
        }
        this.loading = false;
      },
      error: err => {
        this.visualTemplates = [];
        this.loading = false;
        this.showToast(err?.error?.message || 'Error al cargar plantillas comunitarias.', 'error');
      }
    });
  }

  get filteredVisualTemplates(): VisualDesignTemplateModel[] {
    return this.visualTemplates.filter(t => {
      const matchTab = this.activeTab === 'all' || t.status === this.activeTab;
      if (!matchTab) return false;
      if (!this.searchQuery.trim()) return true;
      const q = this.searchQuery.toLowerCase().trim();
      return (
        (t.name && t.name.toLowerCase().includes(q)) ||
        (t.authorName && t.authorName.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.eventType && t.eventType.toLowerCase().includes(q))
      );
    });
  }

  getTemplateThumbnail(template?: VisualDesignTemplateModel): string {
    if (!template) return 'assets/templates/palazzo-orangerie/garden-portrait.webp';
    if (template.thumbnailUrl) return template.thumbnailUrl;
    if (template.previewImageUrl) return template.previewImageUrl;

    const id = (template._id || '').toLowerCase();
    const name = (template.name || '').toLowerCase();
    const eventType = (template.eventType || (template as any).category || '').toLowerCase();

    if (id.includes('seed-tpl-1') || id.includes('palazzo') || name.includes('orangerie') || name.includes('atelier')) {
      return 'assets/templates/palazzo-orangerie/garden-portrait.webp';
    }
    if (id.includes('seed-tpl-2') || id.includes('xv-burgundy') || name.includes('borgoña') || name.includes('xv')) {
      return 'assets/templates/xv-burgundy/portrait.jpg';
    }
    if (id.includes('seed-tpl-3') || name.includes('celestial') || name.includes('bautizo') || eventType === 'bautizo') {
      return 'assets/templates/palazzo-orangerie/villa-painting.png';
    }

    if (template.design?.sections) {
      for (const section of template.design.sections) {
        if (section.background?.imageUrl && !section.background.imageUrl.endsWith('.svg')) {
          return section.background.imageUrl;
        }
        if (section.layers) {
          const imgLayer = section.layers.find((l: any) => l.type === 'image' && l.url && !l.url.endsWith('.svg'));
          if (imgLayer?.url) return imgLayer.url;
        }
      }
    }

    return 'assets/templates/palazzo-orangerie/garden-portrait.webp';
  }

  openVisualPreview(template: VisualDesignTemplateModel): void {
    this.selectedVisualTemplate = template;
    this.visualPreviewTab = 'invitation';
    this.previewViewport = 'mobile';
    this.showVisualPreviewModal = true;
  }

  get visualPreviewInvitation(): any {
    if (!this.selectedVisualTemplate) return null;
    let design = this.selectedVisualTemplate.design || (this.selectedVisualTemplate as any).visualDesign;
    if (design) {
      const sections = (design.sections || []).map((sec: any) => ({
        ...sec,
        enabled: sec.enabled !== false
      }));
      design = {
        ...design,
        sections,
        presentationMode: design.presentationMode || 'continuous',
        responsiveMode: design.responsiveMode || 'shared',
        theme: design.theme
      };
    }
    return {
      _id: 'preview-' + (this.selectedVisualTemplate._id || 'tpl'),
      slug: 'preview-slug',
      status: 'published',
      title: this.selectedVisualTemplate.name || 'Invitación Especial',
      content: {
        visualDesign: design,
        hosts: 'Ana & Carlos',
        venue: 'Hacienda San José',
        message: this.selectedVisualTemplate.description || ''
      },
      visualDesign: design
    };
  }

  get visualPreviewEvent(): any {
    if (!this.selectedVisualTemplate) return null;
    return {
      _id: 'preview-event',
      title: this.selectedVisualTemplate.name || 'Invitación Especial',
      type: this.selectedVisualTemplate.eventType || 'boda',
      date: '2026-11-20T18:00:00.000Z',
      location: {
        name: 'Hacienda San José',
        address: 'Valle de Bravo, México'
      }
    };
  }

  layerMediaSource(l: any): string {
    if (!l) return 'assets/templates/palazzo-orangerie/villa-painting.png';
    return l.url || 'assets/templates/palazzo-orangerie/villa-painting.png';
  }

  hasPassDesign(template?: VisualDesignTemplateModel): boolean {
    return Boolean(template?.passDesign?.sections?.length);
  }

  hasAccessScreen(template?: VisualDesignTemplateModel): boolean {
    const acc = template?.accessScreen || (template as any)?.design?.accessScreen;
    return Boolean(acc && acc.enabled !== false);
  }

  evalPassText(text?: string): string {
    if (!text) return '';
    return text
      .replace(/{{guest\.name}}/g, 'Familia Morales')
      .replace(/{{guest\.table}}/g, 'Mesa 3 (VIP)')
      .replace(/{{guest\.companions}}/g, '2')
      .replace(/{{guest\.checkInCode}}/g, '#VIP-082')
      .replace(/{{event\.title}}/g, this.selectedVisualTemplate?.name || 'Nuestra Celebración')
      .replace(/{{event\.date}}/g, 'Sábado, 24 de Octubre de 2026')
      .replace(/{{event\.venue}}/g, 'Salón Jardín Los Arcos');
  }

  getPassSheetWidth(sheet: any): number {
    return sheet?.pluginSettings?.sheetWidth || 450;
  }

  getPassSheetHeight(sheet: any): number {
    return sheet?.pluginSettings?.sheetHeight || sheet?.height || 800;
  }

  getAccessScreenBackgroundStyle(acc: any): Record<string, string> {
    if (!acc) return { background: '#152820' };
    if (acc.backgroundImage) {
      return {
        backgroundImage: `linear-gradient(rgba(0,0,0,${(acc.overlayOpacity || 50) / 100}), rgba(0,0,0,${(acc.overlayOpacity || 50) / 100})), url('${acc.backgroundImage}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
    }
    return { background: acc.backgroundColor || '#152820' };
  }

  getAccessScreenCardStyle(acc: any): Record<string, string> {
    if (!acc) return {};
    const bg = acc.cardBgColor || '#1a221e';
    const opacity = (acc.cardOpacity ?? 90) / 100;
    const radius = acc.cardRadius ?? 16;
    return {
      backgroundColor: bg.startsWith('#') ? `${bg}${Math.round(opacity * 255).toString(16).padStart(2, '0')}` : bg,
      backdropFilter: acc.cardStyle === 'glass' ? 'blur(12px)' : 'none',
      borderRadius: `${radius}px`,
      border: `1px solid ${acc.primaryColor || '#c89b3c'}44`
    };
  }

  approveVisualTemplate(tpl: VisualDesignTemplateModel): void {
    this.moderatingVisual = true;
    this.apiService.updateVisualTemplateModeration(tpl._id, { status: 'published' }).subscribe({
      next: res => {
        this.moderatingVisual = false;
        this.showToast(res.message || 'Plantilla aprobada y visible en el catálogo.');
        this.loadVisualTemplates();
      },
      error: err => {
        this.moderatingVisual = false;
        this.showToast(err?.error?.message || 'Error al aprobar la plantilla.', 'error');
      }
    });
  }

  featureVisualTemplate(tpl: VisualDesignTemplateModel): void {
    const nextStatus = tpl.status === 'featured' ? 'published' : 'featured';
    this.moderatingVisual = true;
    this.apiService.updateVisualTemplateModeration(tpl._id, { status: nextStatus }).subscribe({
      next: res => {
        this.moderatingVisual = false;
        this.showToast(res.message);
        this.loadVisualTemplates();
      },
      error: err => {
        this.moderatingVisual = false;
        this.showToast(err?.error?.message || 'Error al cambiar estado destacado.', 'error');
      }
    });
  }

  openRejectVisualModal(tpl: VisualDesignTemplateModel): void {
    this.selectedVisualTemplate = tpl;
    this.rejectVisualFeedback = tpl.adminFeedback || '';
    this.showRejectVisualModal = true;
  }

  confirmRejectVisual(): void {
    if (!this.selectedVisualTemplate) return;
    this.moderatingVisual = true;
    this.apiService.updateVisualTemplateModeration(this.selectedVisualTemplate._id, {
      status: 'rejected',
      adminFeedback: this.rejectVisualFeedback.trim()
    }).subscribe({
      next: res => {
        this.moderatingVisual = false;
        this.showRejectVisualModal = false;
        this.showToast(res.message);
        this.loadVisualTemplates();
      },
      error: err => {
        this.moderatingVisual = false;
        this.showToast(err?.error?.message || 'Error al rechazar plantilla.', 'error');
      }
    });
  }

  deleteVisualTemplate(tpl: VisualDesignTemplateModel): void {
    this.confirmDialog.confirm({
      title: '¿Eliminar Plantilla del Catálogo?',
      message: `¿Estás seguro de eliminar "${tpl.name}"? Esta acción borrará la plantilla de forma permanente.`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    }).then(confirmed => {
      if (confirmed) {
        this.apiService.deleteVisualDesignTemplate(tpl._id).subscribe({
          next: () => {
            this.showToast('Plantilla eliminada exitosamente.');
            this.loadVisualTemplates();
          },
          error: err => {
            this.showToast(err?.error?.message || 'Error al eliminar plantilla.', 'error');
          }
        });
      }
    });
  }

  // ══════════════════════════════════════════════════
  // GESTIÓN: PLANTILLAS DE INTEGRACIÓN (HTML / CSS)
  // ══════════════════════════════════════════════════
  loadSubmissions(): void {
    this.loading = true;
    this.apiService.listCustomTemplateSubmissions().subscribe({
      next: res => {
        this.submissions = res.submissions || [];
        this.loading = false;
      },
      error: () => {
        this.submissions = [];
        this.loading = false;
      }
    });
  }

  get customCounts(): { total: number; pending: number; approved: number; rejected: number } {
      const total = this.submissions.length;
      const pending = this.submissions.filter(s => s.status === 'pending').length;
      const approved = this.submissions.filter(s => s.status === 'approved').length;
      const rejected = this.submissions.filter(s => s.status === 'rejected').length;
      return { total, pending, approved, rejected };
    }

  get filteredSubmissions(): CustomTemplateSubmission[] {
      return this.submissions.filter(sub => {
        const matchTab = this.activeTab === 'all' ||
          (this.activeTab === 'published' ? sub.status === 'approved' : sub.status === this.activeTab);
        if (!matchTab) return false;

        if (!this.searchQuery.trim()) return true;
        const q = this.searchQuery.toLowerCase().trim();
        return (
          (sub.name && sub.name.toLowerCase().includes(q)) ||
          (sub.eventTitle && sub.eventTitle.toLowerCase().includes(q)) ||
          (sub.eventSlug && sub.eventSlug.toLowerCase().includes(q)) ||
          (sub.authorName && sub.authorName.toLowerCase().includes(q)) ||
          (sub.authorEmail && sub.authorEmail.toLowerCase().includes(q))
        );
      });
    }

    openPreview(sub: CustomTemplateSubmission): void {
      this.selectedSubmission = sub;
      this.previewViewport = 'desktop';
      this.previewActiveTab = 'preview';
      const combined = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${sub.cssCode || ''}</style>
        </head>
        <body>
          ${sub.htmlCode || ''}
        </body>
      </html>
    `;
      this.previewSafeSrcdoc = this.sanitizer.bypassSecurityTrustHtml(combined);
      this.showPreviewModal = true;
    }

    getPreviewSafeSrcdoc(): SafeHtml {
      return this.previewSafeSrcdoc;
    }

    openApproveModal(sub: CustomTemplateSubmission): void {
      this.selectedSubmission = sub;
      this.approveFeedback = 'Página revisada y aprobada para publicación oficial en KyndraSoft.';
      this.showApproveModal = true;
    }

    confirmApprove(): void {
      if(!this.selectedSubmission) return;
      this.approving = true;
      const subId = this.selectedSubmission.id || this.selectedSubmission._id || '';

      this.apiService.approveCustomTemplateSubmission(subId, this.approveFeedback).subscribe({
        next: res => {
          this.approving = false;
          this.showApproveModal = false;
          this.showToast(`¡Plantilla "${res.submission.name}" aprobada y publicada con éxito!`);
          this.loadSubmissions();
        },
        error: err => {
          this.approving = false;
          this.showToast(err?.message || 'Error al aprobar la plantilla.', 'error');
        }
      });
    }

    openRejectModal(sub: CustomTemplateSubmission): void {
      this.selectedSubmission = sub;
      this.rejectFeedback = '';
      this.showRejectModal = true;
    }

    confirmReject(): void {
      if(!this.selectedSubmission) return;
      if(!this.rejectFeedback.trim()) {
      this.showToast('Por favor escribe los motivos o ajustes solicitados.', 'error');
      return;
    }

    this.rejecting = true;
    const subId = this.selectedSubmission.id || this.selectedSubmission._id || '';

    this.apiService.rejectCustomTemplateSubmission(subId, this.rejectFeedback).subscribe({
      next: res => {
        this.rejecting = false;
        this.showRejectModal = false;
        this.showToast(`Plantilla "${res.submission.name}" marcada con ajustes solicitados.`);
        this.loadSubmissions();
      },
      error: err => {
        this.rejecting = false;
        this.showToast(err?.message || 'Error al rechazar la plantilla.', 'error');
      }
    });
  }

  openEditModal(sub: CustomTemplateSubmission): void {
    this.selectedSubmission = sub;
    this.editForm = {
      name: sub.name || '',
      htmlCode: sub.htmlCode || '',
      cssCode: sub.cssCode || '',
      notes: sub.notes || ''
    };
    this.showEditModal = true;
  }

  saveEdit(): void {
    if (!this.selectedSubmission) return;
    if (!this.editForm.htmlCode.trim()) {
      this.showToast('El código HTML no puede estar vacío.', 'error');
      return;
    }

    this.savingEdit = true;
    const updated: Partial<CustomTemplateSubmission> = {
      ...this.selectedSubmission,
      name: this.editForm.name.trim() || this.selectedSubmission.name,
      htmlCode: this.editForm.htmlCode,
      cssCode: this.editForm.cssCode,
      notes: this.editForm.notes.trim()
    };

    this.apiService.submitCustomTemplate(updated).subscribe({
      next: () => {
        this.savingEdit = false;
        this.showEditModal = false;
        this.showToast('Cambios guardados en la plantilla personalizada.');
        this.loadSubmissions();
      },
      error: err => {
        this.savingEdit = false;
        this.showToast(err?.message || 'Error al guardar cambios.', 'error');
      }
    });
  }

  deleteSubmission(sub: CustomTemplateSubmission): void {
    const subId = sub.id || sub._id || '';
    this.confirmDialog.confirm({
      title: '¿Eliminar Solicitud de Plantilla?',
      message: `¿Estás seguro de eliminar "${sub.name}"? Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    }).then(confirmed => {
      if (confirmed) {
        this.apiService.deleteCustomTemplateSubmission(subId).subscribe({
          next: () => {
            this.showToast('Plantilla eliminada correctamente.');
            this.loadSubmissions();
          },
          error: err => {
            this.showToast(err?.message || 'Error al eliminar plantilla.', 'error');
          }
        });
      }
    });
  }

  getPublicUrl(sub: CustomTemplateSubmission): string {
    const slug = sub.eventSlug || 'invitacion-especial';
    return `${window.location.origin}/new/i/${slug}`;
  }

  copyLink(url: string): void {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      this.showToast('Enlace público copiado al portapapeles.');
    }).catch(() => {
      this.showToast('No se pudo copiar automáticamente.', 'error');
    });
  }

  showToast(message: string, type: 'success' | 'error' = 'success'): void {
    this.toastMessage = message;
    this.toastType = type;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toastMessage = '';
    }, 3800);
  }
}
