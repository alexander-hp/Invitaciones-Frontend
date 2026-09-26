import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { VISUAL_FONT_CATALOG, VISUAL_FONT_CATEGORIES, VisualFontCategory, VisualFontOption } from './visual-font-catalog';

@Component({
  selector: 'app-visual-font-picker',
  templateUrl: './visual-font-picker.component.html',
  styleUrls: ['./visual-font-picker.component.css']
})
export class VisualFontPickerComponent {
  @Input() label = 'Tipografía';
  @Input() value?: string;
  @Output() valueChange = new EventEmitter<string>();

  readonly categories = VISUAL_FONT_CATEGORIES;
  readonly fonts = VISUAL_FONT_CATALOG;
  open = false;
  query = '';
  category: 'all' | VisualFontCategory = 'all';
  recentFamilies: string[] = [];

  constructor(private elementRef: ElementRef<HTMLElement>) {
    this.recentFamilies = this.readRecentFonts();
  }

  get selectedFont(): VisualFontOption {
    return this.fonts.find((font) => font.family === this.value)
      || { name: this.cleanFamilyName(this.value), family: this.value || 'Arial, sans-serif', category: 'classic' };
  }

  get filteredFonts(): VisualFontOption[] {
    const normalizedQuery = this.normalize(this.query);
    return this.fonts.filter((font) => {
      const categoryMatches = this.category === 'all' || font.category === this.category;
      return categoryMatches && (!normalizedQuery || this.normalize(font.name).includes(normalizedQuery));
    });
  }

  get recentFonts(): VisualFontOption[] {
    return this.recentFamilies
      .map((family) => this.fonts.find((font) => font.family === family))
      .filter((font): font is VisualFontOption => !!font);
  }

  toggle(): void {
    this.open = !this.open;
    if (!this.open) this.query = '';
  }

  select(font: VisualFontOption): void {
    this.value = font.family;
    this.valueChange.emit(font.family);
    this.remember(font.family);
    this.open = false;
    this.query = '';
  }

  setCategory(category: 'all' | VisualFontCategory): void {
    this.category = category;
  }

  trackFont(_index: number, font: VisualFontOption): string {
    return font.family;
  }

  @HostListener('document:pointerdown', ['$event'])
  closeOnOutsidePointer(event: PointerEvent): void {
    if (this.open && !this.elementRef.nativeElement.contains(event.target as Node)) this.open = false;
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.open = false;
  }

  private remember(family: string): void {
    this.recentFamilies = [family, ...this.recentFamilies.filter((item) => item !== family)].slice(0, 4);
    try {
      localStorage.setItem('visual-editor-recent-fonts', JSON.stringify(this.recentFamilies));
    } catch {}
  }

  private readRecentFonts(): string[] {
    try {
      const value = JSON.parse(localStorage.getItem('visual-editor-recent-fonts') || '[]');
      return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').slice(0, 4) : [];
    } catch {
      return [];
    }
  }

  private cleanFamilyName(family?: string): string {
    return String(family || 'Arial').split(',')[0].replace(/["']/g, '').trim();
  }

  private normalize(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
}
