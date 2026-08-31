import { Injectable } from '@angular/core';

/**
 * TemplateTextOverlayService
 *
 * Universal service that applies edited text overlays onto live Angular templates.
 * Instead of replacing the entire template with static HTML (which kills all Angular
 * bindings and interactivity), this service applies only the text changes as a
 * post-render overlay, preserving buttons, RSVP, music, photo upload, etc.
 *
 * Works with any template (envelope-cards, classic-vertical, modern-minimal, future ones).
 */
@Injectable({ providedIn: 'root' })
export class TemplateTextOverlayService {

  /**
   * Generates unique text keys for all editable text elements in a document/element.
   * Called during edit mode to tag elements with data-text-key attributes.
   */
  tagEditableElements(root: Document | HTMLElement): void {
    const selectors = [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'span:not(.nw-dot):not(.nw-pill)', 'li',
      'blockquote', 'strong', 'em',
      '.nw-pub-headline', '.nw-pub-subheadline',
      '.nw-sec-card-title', '.nw-sec-card-desc',
      '.card-title', '.card-body',
      '.env-title', '.env-sub',
      '.headline-modern', '.title-modern',
      '.timeline-content h4', '.timeline-content p'
    ].join(', ');

    const elements = root.querySelectorAll(selectors);
    const keyCounter: Record<string, number> = {};
    console.log('test edit: [OverlayService] tagEditableElements() called, found', elements.length, 'candidate elements');

    elements.forEach(el => {
      if (
        el.tagName === 'BUTTON' ||
        el.tagName === 'INPUT' ||
        el.tagName === 'SELECT' ||
        el.tagName === 'TEXTAREA' ||
        el.closest('button') ||
        el.closest('svg') ||
        el.classList.contains('nw-pill') ||
        el.classList.contains('vte-pill-tag')
      ) {
        return;
      }

      // Skip elements that already have a key
      if (el.getAttribute('data-text-key')) return;

      const key = this.generateKeyForElement(el as HTMLElement, keyCounter);
      el.setAttribute('data-text-key', key);
    });

    const taggedCount = root.querySelectorAll('[data-text-key]').length;
    console.log('test edit: [OverlayService] tagEditableElements() finished, total tagged elements:', taggedCount);
  }

  /**
   * Extracts the current text content from all tagged elements.
   * Returns a map of { textKey → textContent }.
   */
  extractTexts(root: Document | HTMLElement): Record<string, string> {
    const texts: Record<string, string> = {};
    const elements = root.querySelectorAll('[data-text-key]');

    elements.forEach(el => {
      const key = el.getAttribute('data-text-key');
      if (key) {
        // Use innerHTML to preserve inline formatting (bold, italic, etc.)
        texts[key] = (el as HTMLElement).innerHTML.trim();
      }
    });

    console.log('test edit: [OverlayService] extractTexts() extracted', Object.keys(texts).length, 'texts');
    console.log('test edit: [OverlayService] extractTexts() sample keys:', Object.keys(texts).slice(0, 5));
    return texts;
  }

  /**
   * Compares original texts with current texts and returns only the changes.
   */
  diffTexts(
    original: Record<string, string>,
    current: Record<string, string>
  ): Record<string, string> {
    const diff: Record<string, string> = {};

    for (const key of Object.keys(current)) {
      if (original[key] !== current[key]) {
        diff[key] = current[key];
      }
    }

    console.log('test edit: [OverlayService] diffTexts() found', Object.keys(diff).length, 'changes out of', Object.keys(current).length, 'total elements');
    if (Object.keys(diff).length > 0) {
      console.log('test edit: [OverlayService] diffTexts() changed keys & values:', diff);
    }
    return diff;
  }

  /**
   * Applies edited texts onto a live DOM.
   * Called after Angular renders the template to overlay text changes.
   *
   * @param root - The root element (document or component root) to apply texts to
   * @param editedTexts - Map of { textKey → newTextContent }
   */
  applyTexts(root: Document | HTMLElement, editedTexts: Record<string, string>): void {
    if (!editedTexts || Object.keys(editedTexts).length === 0) {
      console.log('test edit: [OverlayService] applyTexts() called but no editedTexts to apply');
      return;
    }
    console.log('test edit: [OverlayService] applyTexts() called with', Object.keys(editedTexts).length, 'keys to apply');

    // First, tag elements if they don't have keys yet
    this.tagEditableElements(root);

    // Then apply the text changes only if content actually changed
    let applied = 0;
    let notFound = 0;
    for (const [key, text] of Object.entries(editedTexts)) {
      const el = root.querySelector(`[data-text-key="${key}"]`);
      if (el) {
        const currentHtml = (el as HTMLElement).innerHTML.trim();
        const targetHtml = text.trim();
        if (currentHtml !== targetHtml) {
          console.log('test edit: [OverlayService] applyTexts() applying key:', key, '-> from [', currentHtml.substring(0, 30), '] to [', targetHtml.substring(0, 30), ']');
          (el as HTMLElement).innerHTML = text;
          applied++;
        }
      } else {
        console.log('test edit: [OverlayService] applyTexts() KEY NOT FOUND in DOM:', key);
        notFound++;
      }
    }
    console.log('test edit: [OverlayService] applyTexts() summary -> Applied/Updated:', applied, ', Not found:', notFound);
  }

  /**
   * Loads edited texts from localStorage for a given slug.
   */
  loadEditedTexts(slug: string): Record<string, string> | null {
    const raw = localStorage.getItem(`inv_edited_texts_${slug}`);
    console.log('test edit: [OverlayService] loadEditedTexts() for slug:', slug, '-> found raw in localStorage:', raw ? raw.substring(0, 100) + '...' : 'null');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      console.log('test edit: [OverlayService] loadEditedTexts() parsed keys count:', Object.keys(parsed).length);
      return parsed;
    } catch (e) {
      console.error('test edit: [OverlayService] loadEditedTexts() JSON parse error:', e);
      return null;
    }
  }

  /**
   * Saves edited texts to localStorage for a given slug.
   */
  saveEditedTexts(slug: string, texts: Record<string, string>): void {
    console.log('test edit: [OverlayService] saveEditedTexts() saving', Object.keys(texts).length, 'keys for slug:', slug);
    localStorage.setItem(`inv_edited_texts_${slug}`, JSON.stringify(texts));
  }

  /**
   * Loads the source template key (the original Angular template) for a given slug.
   */
  loadSourceTemplateKey(slug: string): string | null {
    const key = localStorage.getItem(`inv_source_tpl_${slug}`);
    console.log('test edit: [OverlayService] loadSourceTemplateKey() for slug:', slug, '->', key);
    return key;
  }

  /**
   * Saves the source template key for a given slug.
   */
  saveSourceTemplateKey(slug: string, key: string): void {
    console.log('test edit: [OverlayService] saveSourceTemplateKey() saving key:', key, 'for slug:', slug);
    localStorage.setItem(`inv_source_tpl_${slug}`, key);
  }

  /**
   * Generates a stable, unique key for an element based on its tag,
   * classes, and position in the document.
   */
  private generateKeyForElement(
    el: HTMLElement,
    counter: Record<string, number>
  ): string {
    const tag = el.tagName.toLowerCase();

    // Get stable classes (filter out Angular dynamic classes and utility noise)
    const stableClasses = Array.from(el.classList)
      .filter(cls =>
        !cls.startsWith('ng-') &&
        !cls.startsWith('_ng') &&
        !cls.startsWith('cdk-') &&
        cls !== 'ng-star-inserted'
      )
      .sort()
      .join('.');

    // Build a parent context path (up to 2 levels)
    const parentCtx = this.getParentContext(el, 2);

    // Build base key
    const baseKey = [parentCtx, tag, stableClasses].filter(Boolean).join('__');

    // Add counter for uniqueness
    if (!counter[baseKey]) {
      counter[baseKey] = 0;
    }
    counter[baseKey]++;
    const idx = counter[baseKey];

    return `${baseKey}__${idx}`;
  }

  /**
   * Gets a context string from parent elements for key stability.
   */
  private getParentContext(el: HTMLElement, depth: number): string {
    const parts: string[] = [];
    let current = el.parentElement;
    let level = 0;

    while (current && level < depth) {
      const tag = current.tagName.toLowerCase();
      if (tag === 'body' || tag === 'html') break;

      // Get data-section-key if available (template sections)
      const sectionKey = current.getAttribute('data-section-key');
      if (sectionKey) {
        parts.unshift(`sec:${sectionKey}`);
        break; // section key is specific enough
      }

      // Get stable class identifier
      const cls = Array.from(current.classList)
        .filter(c =>
          !c.startsWith('ng-') &&
          !c.startsWith('_ng') &&
          c !== 'ng-star-inserted'
        )
        .sort()
        .slice(0, 2) // max 2 classes for brevity
        .join('.');

      if (cls) {
        parts.unshift(`${tag}.${cls}`);
      }

      current = current.parentElement;
      level++;
    }

    return parts.join('/');
  }
}
