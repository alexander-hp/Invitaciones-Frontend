import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiService } from '../../core/api.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { CustomTemplateSubmission } from '../../core/models';

@Component({
  selector: 'app-new-custom-templates',
  templateUrl: './new-custom-templates.component.html',
  styleUrls: ['./new-custom-templates.component.css']
})
export class NewCustomTemplatesComponent implements OnInit {
  submissions: CustomTemplateSubmission[] = [];
  loading = true;
  activeTab: 'all' | 'pending' | 'approved' | 'rejected' = 'all';
  searchQuery = '';

  // Modal de Previsualización
  selectedSubmission?: CustomTemplateSubmission;
  showPreviewModal = false;
  previewViewport: 'desktop' | 'tablet' | 'mobile' = 'desktop';
  previewActiveTab: 'preview' | 'html' | 'css' = 'preview';
  previewSafeSrcdoc: SafeHtml = '';

  // Modal de Aprobación
  showApproveModal = false;
  approving = false;
  approveFeedback = '';

  // Modal de Rechazo
  showRejectModal = false;
  rejecting = false;
  rejectFeedback = '';

  // Modal de Edición Rápida
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
  ) {}

  ngOnInit(): void {
    this.loadSubmissions();
  }

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

  get counts(): { total: number; pending: number; approved: number; rejected: number } {
    const total = this.submissions.length;
    const pending = this.submissions.filter(s => s.status === 'pending').length;
    const approved = this.submissions.filter(s => s.status === 'approved').length;
    const rejected = this.submissions.filter(s => s.status === 'rejected').length;
    return { total, pending, approved, rejected };
  }

  get filteredSubmissions(): CustomTemplateSubmission[] {
    return this.submissions.filter(sub => {
      const matchTab = this.activeTab === 'all' || sub.status === this.activeTab;
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
    if (!this.selectedSubmission) return;
    this.approving = true;
    const subId = this.selectedSubmission.id || this.selectedSubmission._id || '';

    console.log('test edit: [AdminCustomTemplates] confirmApprove called for sub ID:', subId, ', submission:', this.selectedSubmission);

    this.apiService.approveCustomTemplateSubmission(subId, this.approveFeedback).subscribe({
      next: res => {
        console.log('test edit: [AdminCustomTemplates] approveCustomTemplateSubmission success:', res);
        this.approving = false;
        this.showApproveModal = false;
        this.showToast(`¡Plantilla "${res.submission.name}" aprobada y publicada con éxito!`);
        this.loadSubmissions();
      },
      error: err => {
        console.error('test edit: [AdminCustomTemplates] approveCustomTemplateSubmission error:', err);
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
    if (!this.selectedSubmission) return;
    if (!this.rejectFeedback.trim()) {
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
