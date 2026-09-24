import { Injectable } from '@angular/core';
import { VisualInvitationDesign, VisualInvitationLayer, VisualInvitationLayerStyle, VisualInvitationSection } from '../../core/models';

export interface VisualDesignImportResult {
  design: VisualInvitationDesign;
  warnings: string[];
  stats: { sections: number; layers: number; ignored: number };
}

@Injectable({ providedIn: 'root' })
export class VisualDesignImporterService {
  async fromHtml(html: string, css: string, theme: NonNullable<VisualInvitationDesign['theme']>): Promise<VisualDesignImportResult> {
    const warnings: string[] = [];
    const sanitized = this.sanitize(html, css);
    warnings.push(...sanitized.warnings);
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-same-origin');
    iframe.setAttribute('aria-hidden', 'true');
    Object.assign(iframe.style, {
      position: 'fixed', left: '-100000px', top: '0', width: '390px', height: '1200px',
      opacity: '0.001', pointerEvents: 'none', border: '0'
    });
    try {
      const loaded = new Promise<void>((resolve) => iframe.addEventListener('load', () => resolve(), { once: true }));
      iframe.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}${sanitized.css}</style></head><body>${sanitized.html}</body></html>`;
      document.body.appendChild(iframe);
      await loaded;
      const doc = iframe.contentDocument;
      const win = iframe.contentWindow;
      if (!doc || !win) throw new Error('No fue posible abrir el documento para convertirlo.');
      await this.waitForLayout(doc);
      return this.convertDocument(doc, win, theme, warnings, sanitized.ignored);
    } finally {
      iframe.remove();
    }
  }

  async fromUrl(url: string, theme: NonNullable<VisualInvitationDesign['theme']>): Promise<VisualDesignImportResult> {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    Object.assign(iframe.style, {
      position: 'fixed', left: '-100000px', top: '0', width: '390px', height: '1200px',
      opacity: '0.001', pointerEvents: 'none', border: '0'
    });
    try {
      iframe.src = url;
      document.body.appendChild(iframe);
      await this.waitUntil(() => Boolean(iframe.contentDocument && this.renderedTemplateRoot(iframe.contentDocument)), 15000);
      const doc = iframe.contentDocument;
      const win = iframe.contentWindow;
      if (!doc || !win) throw new Error('No fue posible leer la plantilla seleccionada.');
      await this.waitForLayout(doc);
      return this.convertDocument(doc, win, theme, ['La plantilla renderizada se convirtió a capas editables. Las animaciones complejas se simplificaron.'], 0);
    } finally {
      iframe.remove();
    }
  }

  fromJson(source: string): VisualDesignImportResult {
    const parsed = JSON.parse(source) as Partial<VisualInvitationDesign>;
    if (!parsed || !Array.isArray(parsed.sections)) throw new Error('El JSON no contiene un arreglo de secciones válido.');
    const sections = parsed.sections.slice(0, 50).map((section, sectionIndex) => this.normalizeSection(section, sectionIndex));
    const design: VisualInvitationDesign = {
      version: Number(parsed.version || 2), active: true,
      mode: parsed.mode === 'easy' ? 'easy' : 'advanced',
      responsiveMode: parsed.responsiveMode === 'independent' ? 'independent' : 'shared',
      theme: parsed.theme, assets: Array.isArray(parsed.assets) ? parsed.assets.slice(0, 200) : [], sections
    };
    const warnings = parsed.sections.length > 50 ? ['Solo se importaron las primeras 50 secciones.'] : [];
    return { design, warnings, stats: { sections: sections.length, layers: sections.reduce((sum, section) => sum + section.layers.length, 0), ignored: 0 } };
  }

  private convertDocument(doc: Document, win: Window, theme: NonNullable<VisualInvitationDesign['theme']>, warnings: string[], initialIgnored: number): VisualDesignImportResult {
    const roots = this.sectionRoots(doc);
    const sections: VisualInvitationSection[] = [];
    let ignored = initialIgnored;
    roots.slice(0, 50).forEach((root, sectionIndex) => {
      const converted = this.convertSection(root, sectionIndex, win);
      sections.push(converted.section);
      ignored += converted.ignored;
    });
    if (roots.length > 50) warnings.push(`Se importaron las primeras 50 secciones; ${roots.length - 50} quedaron fuera.`);
    if (doc.querySelector('form,input,select,textarea')) warnings.push('Los formularios se importaron como referencia visual. Agrega el módulo funcional equivalente de KyndraSoft para conservar envíos, validaciones y respuestas.');
    if (ignored) warnings.push(`${ignored} elemento(s) no se convirtieron porque no eran visibles o no tenían un equivalente editable.`);
    if (!sections.length) throw new Error('No se encontraron secciones visibles para importar.');
    const layerCount = sections.reduce((total, section) => total + section.layers.length, 0);
    return {
      design: { version: 2, active: true, mode: 'advanced', responsiveMode: 'shared', theme: { ...theme }, assets: [], sections },
      warnings,
      stats: { sections: sections.length, layers: layerCount, ignored }
    };
  }

  private sanitize(html: string, css: string): { html: string; css: string; warnings: string[]; ignored: number } {
    const doc = new DOMParser().parseFromString(html || '', 'text/html');
    const embeddedCss = Array.from(doc.querySelectorAll('style')).map((node) => node.textContent || '').join('\n');
    doc.querySelectorAll('style').forEach((node) => node.remove());
    const blocked = Array.from(doc.querySelectorAll('script,iframe,object,embed,link[rel="import"]'));
    blocked.forEach((node) => node.remove());
    doc.querySelectorAll('*').forEach((element) => {
      Array.from(element.attributes).forEach((attribute) => {
        if (/^on/i.test(attribute.name)) element.removeAttribute(attribute.name);
        if ((attribute.name === 'href' || attribute.name === 'src') && /^\s*javascript:/i.test(attribute.value)) element.removeAttribute(attribute.name);
      });
    });
    const safeCss = `${embeddedCss}\n${css || ''}`
      .replace(/@import[^;]+;/gi, '')
      .replace(/url\(\s*(['"]?)javascript:[^)]+\)/gi, 'none');
    return {
      html: doc.body.innerHTML,
      css: safeCss,
      warnings: blocked.length ? [`Se omitieron ${blocked.length} bloque(s) con scripts, iframes o contenido ejecutable por seguridad.`] : [],
      ignored: blocked.length
    };
  }

  private sectionRoots(doc: Document): HTMLElement[] {
    const markedSections = Array.from(doc.querySelectorAll<HTMLElement>('[data-section-key]'))
      .filter((element) => !element.parentElement?.closest('[data-section-key]'));
    if (markedSections.length) return markedSections;
    const renderedRoot = this.renderedTemplateRoot(doc);
    if (renderedRoot) {
      const candidates = Array.from(renderedRoot.querySelectorAll<HTMLElement>('section,.card-slide,header[data-section-key]'))
        .filter((element) => !element.parentElement?.closest('section,.card-slide,header[data-section-key]'));
      if (candidates.length) return candidates;
      const visualRoot = Array.from(renderedRoot.children).find((item): item is HTMLElement => item instanceof HTMLElement);
      if (visualRoot) return [visualRoot];
    }
    const children = Array.from(doc.body.children).filter((item): item is HTMLElement => item instanceof HTMLElement && !['SCRIPT', 'STYLE'].includes(item.tagName));
    if (children.length === 1) {
      const wrapperChildren = Array.from(children[0].children).filter((item): item is HTMLElement => item instanceof HTMLElement && this.isSectionLike(item));
      if (wrapperChildren.length > 1) return wrapperChildren;
    }
    return children.length ? children : [doc.body];
  }

  private renderedTemplateRoot(doc: Document): HTMLElement | null {
    return Array.from(doc.querySelectorAll<HTMLElement>('*')).find((element) => {
      const tag = element.tagName.toLowerCase();
      return tag.startsWith('app-new-public-invitation-') && tag !== 'app-new-public-invitation';
    }) || null;
  }

  private isSectionLike(element: HTMLElement): boolean {
    return ['SECTION', 'HEADER', 'MAIN', 'ARTICLE', 'FOOTER'].includes(element.tagName) || element.children.length > 1;
  }

  private convertSection(root: HTMLElement, index: number, win: Window): { section: VisualInvitationSection; ignored: number } {
    const rootRect = root.getBoundingClientRect();
    const naturalHeight = Math.max(root.scrollHeight, rootRect.height, 240);
    const sectionHeight = Math.min(1600, Math.ceil(naturalHeight));
    const width = Math.max(rootRect.width, 1);
    const style = win.getComputedStyle(root);
    const layers: VisualInvitationLayer[] = [];
    let ignored = 0;
    const candidates = Array.from(root.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6,p,blockquote,figcaption,li,img,video,audio,a,button,[data-kyndra-layer]'));
    if (this.matchesCandidate(root)) candidates.unshift(root);
    const unique = [...new Set(candidates)];
    for (const element of unique) {
      if (layers.length >= 100) { ignored += 1; continue; }
      if (element.matches('a,button') && element.querySelector('img,video,audio') && !(element.textContent || '').trim()) continue;
      const layer = this.convertElement(element, rootRect, width, sectionHeight, layers.length, win);
      if (layer) layers.push(layer); else ignored += 1;
    }
    const backgroundImage = this.extractBackgroundUrl(style.backgroundImage);
    const componentType = root.dataset['kyndraComponent'] || 'custom';
    const sectionKey = root.dataset['sectionKey'] || '';
    return {
      section: {
        id: this.id(`import-section-${index + 1}`), type: componentType, title: root.getAttribute('aria-label') || root.dataset['title'] || this.sectionTitle(sectionKey, index),
        enabled: true, layout: 'canvas', height: sectionHeight,
        background: { color: this.visibleColor(style.backgroundColor, '#ffffff'), imageUrl: backgroundImage, overlay: 0 },
        layers
      },
      ignored
    };
  }

  private matchesCandidate(element: HTMLElement): boolean {
    return element.matches('h1,h2,h3,h4,h5,h6,p,blockquote,figcaption,li,img,video,audio,a,button,[data-kyndra-layer]');
  }

  private convertElement(element: HTMLElement, rootRect: DOMRect, rootWidth: number, sectionHeight: number, index: number, win: Window): VisualInvitationLayer | null {
    const rect = element.getBoundingClientRect();
    const computed = win.getComputedStyle(element);
    if (rect.width < 2 || rect.height < 2 || computed.display === 'none' || computed.visibility === 'hidden' || Number(computed.opacity) === 0) return null;
    const mediaType = element.tagName === 'IMG' ? 'image' : element.tagName === 'VIDEO' ? 'video' : element.tagName === 'AUDIO' ? 'audio' : '';
    const isButton = element.matches('a,button') && !mediaType;
    const type = (mediaType || (isButton ? 'button' : 'text')) as VisualInvitationLayer['type'];
    const text = mediaType ? element.getAttribute('alt') || element.getAttribute('aria-label') || '' : (element.textContent || '').replace(/\s+/g, ' ').trim();
    if (type === 'text' && !text) return null;
    const source = mediaType ? (element.getAttribute('src') || '') : '';
    const href = isButton ? element.getAttribute('href') || '' : '';
    const action = this.normalizeAction(element.dataset['kyndraAction'] || element.dataset['kyndraBinding'] || this.hrefAction(href));
    return {
      id: this.id(`import-layer-${index + 1}`), type,
      name: element.getAttribute('aria-label') || element.dataset['name'] || this.layerName(type, text),
      text, url: source || (isButton && /^(https?:\/\/|mailto:|tel:)/i.test(href) ? href : ''), binding: action,
      x: this.clamp((rect.left - rootRect.left) / rootWidth * 100, 0, 99),
      y: this.clamp((rect.top - rootRect.top) / sectionHeight * 100, 0, 99),
      width: this.clamp(rect.width / rootWidth * 100, 1, 100),
      height: this.clamp(rect.height / sectionHeight * 100, 1, 100),
      rotation: 0, zIndex: index + 1, locked: false, hidden: false,
      animation: { type: 'none', duration: .6, delay: 0, repeat: false },
      style: this.elementStyle(computed, type)
    };
  }

  private elementStyle(style: CSSStyleDeclaration, type: VisualInvitationLayer['type']): VisualInvitationLayerStyle {
    const borderWidth = this.px(style.borderTopWidth);
    return {
      color: style.color, backgroundColor: this.visibleColor(style.backgroundColor, 'transparent'),
      fontFamily: style.fontFamily, fontSize: this.px(style.fontSize), fontWeight: Number(style.fontWeight) || style.fontWeight,
      textAlign: style.textAlign, lineHeight: this.lineHeight(style), letterSpacing: this.px(style.letterSpacing),
      textTransform: this.textTransform(style.textTransform), textDecoration: style.textDecorationLine.includes('underline') ? 'underline' : style.textDecorationLine.includes('line-through') ? 'line-through' : 'none',
      borderColor: style.borderTopColor, borderWidth, borderStyle: this.borderStyle(style.borderTopStyle), borderRadius: this.px(style.borderTopLeftRadius),
      boxShadow: style.boxShadow === 'none' ? 'none' : style.boxShadow, opacity: Number(style.opacity || 1), padding: this.px(style.paddingTop),
      objectFit: type === 'image' && style.objectFit === 'contain' ? 'contain' : 'cover', objectPositionX: 50, objectPositionY: 50
    };
  }

  private normalizeSection(section: VisualInvitationSection, index: number): VisualInvitationSection {
    if (!section || !Array.isArray(section.layers)) throw new Error(`La sección ${index + 1} no contiene capas válidas.`);
    return {
      ...section, id: section.id || this.id(`json-section-${index + 1}`), type: section.type || 'custom', enabled: section.enabled !== false,
      layout: section.layout === 'flow' ? 'flow' : 'canvas', height: this.clamp(Number(section.height || 640), 240, 1600),
      layers: section.layers.slice(0, 100).map((layer, layerIndex) => ({
        ...layer, id: layer.id || this.id(`json-layer-${layerIndex + 1}`), x: this.clamp(Number(layer.x || 0), 0, 100), y: this.clamp(Number(layer.y || 0), 0, 100),
        width: this.clamp(Number(layer.width || 20), 1, 100), height: this.clamp(Number(layer.height || 10), 1, 100), zIndex: this.clamp(Number(layer.zIndex || layerIndex + 1), 0, 1000), style: { ...(layer.style || {}) }
      }))
    };
  }

  private hrefAction(href: string): string {
    if (!href) return '';
    if (href.startsWith('#')) return `section:${href.slice(1)}`;
    return '';
  }

  private normalizeAction(action: string): string {
    const value = String(action || '').trim();
    if (!value) return '';
    const aliases: Record<string, string> = {
      rsvp: 'section:rsvp', gifts: 'section:gifts', gallery: 'section:gallery',
      album: 'section:album', dedications: 'section:dedications', songs: 'section:songs',
      lodging: 'section:lodging', itinerary: 'section:itinerary', locations: 'section:locations'
    };
    return aliases[value] || value;
  }

  private layerName(type: VisualInvitationLayer['type'], text: string): string {
    const base = type === 'image' ? 'Imagen importada' : type === 'video' ? 'Video importado' : type === 'audio' ? 'Audio importado' : type === 'button' ? 'Botón importado' : 'Texto importado';
    return text ? `${base}: ${text.slice(0, 60)}` : base;
  }

  private sectionTitle(key: string, index: number): string {
    const labels: Record<string, string> = {
      hero: 'Portada', story: 'Nuestra historia', locations: 'Ubicaciones', itinerary: 'Itinerario', dressCode: 'Código de vestimenta',
      rsvp: 'Confirmación RSVP', giftRegistry: 'Mesa de regalos', digitalEnvelope: 'Sobre digital', lodging: 'Hospedaje', gallery: 'Galería',
      guestAlbum: 'Álbum colectivo', collectiveAlbum: 'Álbum colectivo', dedications: 'Dedicatorias', songRequests: 'Peticiones al DJ',
      vipPass: 'Pase del invitado', countdown: 'Cuenta regresiva', community: 'Comunidad', footer: 'Cierre'
    };
    return labels[key] || key || `Sección importada ${index + 1}`;
  }

  private async waitForLayout(doc: Document): Promise<void> {
    const images = Array.from(doc.images).filter((image) => !image.complete).map((image) => new Promise<void>((resolve) => {
      image.addEventListener('load', () => resolve(), { once: true });
      image.addEventListener('error', () => resolve(), { once: true });
    }));
    const fonts = doc.fonts?.ready?.then(() => undefined).catch(() => undefined) || Promise.resolve();
    await Promise.race([Promise.all([...images, fonts]), this.delay(1800)]);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  }

  private async waitUntil(predicate: () => boolean, timeoutMs: number): Promise<void> {
    const startedAt = Date.now();
    while (!predicate()) {
      if (Date.now() - startedAt >= timeoutMs) throw new Error('La plantilla no terminó de renderizarse para convertirla.');
      await this.delay(100);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  private extractBackgroundUrl(value: string): string {
    const match = /url\(["']?([^"')]+)["']?\)/i.exec(value || '');
    return match?.[1] || '';
  }

  private visibleColor(value: string, fallback: string): string {
    return !value || value === 'rgba(0, 0, 0, 0)' || value === 'transparent' ? fallback : value;
  }

  private lineHeight(style: CSSStyleDeclaration): number {
    const fontSize = Math.max(1, this.px(style.fontSize));
    const lineHeight = this.px(style.lineHeight);
    return lineHeight ? Number((lineHeight / fontSize).toFixed(2)) : 1.2;
  }

  private textTransform(value: string): VisualInvitationLayerStyle['textTransform'] {
    return ['uppercase', 'lowercase', 'capitalize'].includes(value) ? value as VisualInvitationLayerStyle['textTransform'] : 'none';
  }

  private borderStyle(value: string): VisualInvitationLayerStyle['borderStyle'] {
    return ['dashed', 'dotted'].includes(value) ? value as VisualInvitationLayerStyle['borderStyle'] : 'solid';
  }

  private px(value: string): number {
    const parsed = Number.parseFloat(value || '0');
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, Number(value.toFixed(3))));
  }

  private id(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
