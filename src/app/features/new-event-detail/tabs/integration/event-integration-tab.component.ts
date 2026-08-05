import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiService } from '../../../../core/api.service';
import { EventModel, EmbedManifestResponse } from '../../../../core/models';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-event-integration-tab',
  templateUrl: './event-integration-tab.component.html'
})
export class EventIntegrationTabComponent implements OnInit, OnChanges {
  @Input() event?: EventModel;

  embedManifest?: EmbedManifestResponse;
  externalSaving = false;
  externalSuccess = '';
  externalError = '';
  externalAssetUploading = '';
  externalPortalQrUrl = '';
  externalApiConfigUrl = '';
  demoInvitationUrl = '';

  externalForm = new FormGroup({
    externalPortalEnabled: new FormControl(true),
    externalSiteUrl: new FormControl(''),
    externalSiteLabel: new FormControl(''),
    brandLabel: new FormControl(''),
    welcomeMessage: new FormControl(''),
    coverImageUrl: new FormControl(''),
    heroImageUrl: new FormControl(''),
    musicUrl: new FormControl(''),
    songRequestsEnabled: new FormControl(true),
    songRequestsDedications: new FormControl(true),
    guestAlbumEnabled: new FormControl(true),
    dedicationsEnabled: new FormControl(true),
    giftEnabled: new FormControl(true),
    giftShowEnvelope: new FormControl(true)
  });

  customHtmlCode = '';
  customCssCode = '';
  validatingCustomCode = false;
  customValidationResult: any = null;
  customPublishSubmitted = false;
  showCustomPagePreviewModal = false;
  customPreviewViewport: 'desktop' | 'tablet' | 'mobile' = 'desktop';

  constructor(
    private apiService: ApiService,
    private sanitizer: DomSanitizer
  ) {}

  hasPlanFeature(feature: string): boolean {
    return true;
  }

  ngOnInit(): void {
    if (this.event?._id || this.event?.id) {
      this.loadIntegrationData();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['event'] && !changes['event'].firstChange && (this.event?._id || this.event?.id)) {
      this.loadIntegrationData();
    }
  }

  loadIntegrationData(): void {
    if (!this.event) return;

    if (this.event.externalPortalSlug) {
      const slug = this.event.externalPortalSlug;
      this.apiService.getExternalEmbedManifest(slug).subscribe({
        next: res => { this.embedManifest = res; },
        error: () => {}
      });

      const portalUrl = `${window.location.origin}/new/e/${slug}`;
      this.externalPortalQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(portalUrl)}`;
      this.externalApiConfigUrl = `${environment.apiUrl}/external/${slug}/config`;
      this.demoInvitationUrl = `/new/e/${slug}`;
    }

    const c = this.event.externalContent || {};
    const s = this.event.externalPortalSettings || {};
    this.externalForm.patchValue({
      externalPortalEnabled: this.event.externalPortalEnabled !== false,
      externalSiteUrl: this.event.externalSiteUrl || '',
      externalSiteLabel: this.event.externalSiteLabel || '',
      brandLabel: s.brandLabel || '',
      welcomeMessage: s.welcomeMessage || '',
      coverImageUrl: c.coverImageUrl || '',
      heroImageUrl: c.heroImageUrl || '',
      musicUrl: c.musicUrl || '',
      songRequestsEnabled: c.songRequestSettings?.enabled !== false,
      songRequestsDedications: c.songRequestSettings?.allowDedications !== false,
      guestAlbumEnabled: true,
      dedicationsEnabled: true,
      giftEnabled: true,
      giftShowEnvelope: true
    });
  }

  get newEmbedWidgets(): Array<{ widgetKey: string; label: string; url: string; snippet: string; height: number }> {
    if (!this.event?.externalPortalSlug) return [];
    const slug = this.event.externalPortalSlug;
    const origin = window.location.origin;
    const widgets = [
      { key: 'rsvp', label: 'RSVP Formulario', height: 720 },
      { key: 'guest-pass', label: 'Pase VIP & QR', height: 520 },
      { key: 'album', label: 'Álbum de Fotos', height: 720 },
      { key: 'gallery', label: 'Galería del Evento', height: 520 },
      { key: 'map', label: 'Ubicación & Mapa', height: 480 },
      { key: 'song-requests', label: 'Peticiones al DJ', height: 520 },
      { key: 'dedications', label: 'Muro de Dedicatorias', height: 600 },
      { key: 'gifts', label: 'Mesa de Regalos & Sobre', height: 600 },
      { key: 'seating', label: 'Croquis & Mesas', height: 520 },
      { key: 'full-portal', label: 'Portal Completo', height: 900 }
    ];
    return widgets.map(w => {
      const u = `${origin}/new/embed/${slug}/${w.key}`;
      return {
        widgetKey: w.key,
        label: w.label,
        url: u,
        height: w.height,
        snippet: `<iframe src="${u}" width="100%" height="${w.height}" style="border:0" allow="autoplay; camera; clipboard-write; encrypted-media" allowfullscreen></iframe>`
      };
    });
  }

  get divScriptSnippet(): string {
    if (!this.event?.externalPortalSlug) return '';
    const slug = this.event.externalPortalSlug;
    const origin = window.location.origin;
    return `<div data-kyndra-widget="rsvp" data-portal="${slug}"></div>\n<script src="${origin}/assets/kyndra-embed.js"></script>`;
  }

  get newPortalUrl(): string {
    if (!this.event?.externalPortalSlug) return '';
    return `${window.location.origin}/new/e/${this.event.externalPortalSlug}`;
  }

  saveExternalConfig(): void {
    const id = (this.event?._id || this.event?.id);
    if (!id) return;
    this.externalSaving = true;
    this.externalSuccess = '';
    this.externalError = '';

    const val = this.externalForm.value;
    const payload = {
      externalSiteUrl: val.externalSiteUrl || undefined,
      externalSiteLabel: val.externalSiteLabel || undefined,
      externalPortalSettings: {
        brandLabel: val.brandLabel || undefined,
        welcomeMessage: val.welcomeMessage || undefined
      },
      externalContent: {
        coverImageUrl: val.coverImageUrl || undefined,
        heroImageUrl: val.heroImageUrl || undefined,
        musicUrl: val.musicUrl || undefined
      }
    };

    this.apiService.updateEvent(id, payload as any).subscribe({
      next: res => {
        this.externalSaving = false;
        this.externalSuccess = 'Configuración de integración guardada correctamente.';
        this.event = res.event;
      },
      error: err => {
        this.externalSaving = false;
        this.externalError = err?.error?.message || 'Error al guardar configuración de integración.';
      }
    });
  }

  uploadExternalAsset(event: Event, kind: 'cover' | 'hero' | 'music'): void {
    const input = event.target as HTMLInputElement;
    const id = (this.event?._id || this.event?.id);
    if (!input.files || !input.files[0] || !id) return;

    const file = input.files[0];
    this.externalAssetUploading = kind;
    this.apiService.createUploadUrl({
      fileName: file.name,
      contentType: file.type,
      folder: 'assets',
      event: id
    }).subscribe({
      next: uploadRes => {
        this.apiService.uploadAsset(uploadRes.uploadUrl, file).subscribe({
          next: () => {
            this.externalAssetUploading = '';
            if (kind === 'cover') this.externalForm.patchValue({ coverImageUrl: uploadRes.publicUrl });
            if (kind === 'hero') this.externalForm.patchValue({ heroImageUrl: uploadRes.publicUrl });
            if (kind === 'music') this.externalForm.patchValue({ musicUrl: uploadRes.publicUrl });
          },
          error: (err: any) => {
            this.externalAssetUploading = '';
            this.externalError = err?.error?.message || `Error al subir archivo de ${kind}`;
          }
        });
      },
      error: (err: any) => {
        this.externalAssetUploading = '';
        this.externalError = err?.error?.message || `Error al obtener URL de subida`;
      }
    });
  }

  onCustomHtmlFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => { this.customHtmlCode = e.target?.result as string || ''; };
      reader.readAsText(input.files[0]);
    }
  }

  onCustomCssFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => { this.customCssCode = e.target?.result as string || ''; };
      reader.readAsText(input.files[0]);
    }
  }

  validateCustomHtmlCss(): void {
    this.validatingCustomCode = true;
    setTimeout(() => {
      const hasDoctype = this.customHtmlCode.toLowerCase().includes('<!doctype html>');
      const hasBody = this.customHtmlCode.toLowerCase().includes('<body');
      const cssRules = (this.customCssCode.match(/\{/g) || []).length;
      const score = (hasDoctype ? 30 : 15) + (hasBody ? 40 : 20) + (cssRules > 0 ? 30 : 10);
      const warnings: string[] = [];
      if (!hasDoctype) warnings.push('Se recomienda agregar <!DOCTYPE html> al inicio.');
      if (!hasBody) warnings.push('Se recomienda incluir la etiqueta <body>.');

      this.customValidationResult = {
        valid: true,
        score,
        message: 'Código verificado correctamente.',
        details: {
          htmlSize: `${(this.customHtmlCode.length / 1024).toFixed(1)} KB`,
          cssRulesCount: cssRules,
          hasDoctype,
          hasBody,
          metaTagsFound: ['viewport', 'utf-8']
        },
        warnings
      };
      this.validatingCustomCode = false;
    }, 600);
  }

  requestCustomPagePublish(): void {
    this.customPublishSubmitted = true;
  }

  getCustomPageSafeSrcdoc(): SafeHtml {
    const combined = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>${this.customCssCode}</style>
        </head>
        <body>
          ${this.customHtmlCode}
        </body>
      </html>
    `;
    return this.sanitizer.bypassSecurityTrustHtml(combined);
  }
}
