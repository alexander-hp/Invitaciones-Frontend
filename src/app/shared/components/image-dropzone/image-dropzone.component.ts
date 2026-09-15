import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ViewChild,
  ElementRef
} from '@angular/core';

@Component({
  selector: 'app-image-dropzone',
  templateUrl: './image-dropzone.component.html',
  styleUrls: ['./image-dropzone.component.css']
})
export class ImageDropzoneComponent {
  @Input() label: string = 'Subir foto';
  @Input() sublabel?: string;
  @Input() hint: string = 'Arrastra aquí tu foto o presiona Ctrl + V para pegar';
  @Input() accept: string = 'image/jpeg,image/png,image/webp,image/gif';
  @Input() multiple: boolean = false;
  @Input() disabled: boolean = false;
  @Input() loading: boolean = false;
  @Input() loadingText: string = 'Subiendo foto...';
  @Input() compact: boolean = false;
  @Input() currentImageUrl?: string | null;
  @Input() badgeText: string = 'JPG, PNG, WEBP, GIF (máx. 5MB)';
  @Input() iconType: 'image' | 'gallery' | 'qr' = 'image';
  @Input() maxSizeMb: number = 5;
  @Input() canRemove: boolean = false;

  @Output() filesSelected = new EventEmitter<File[]>();
  @Output() removeImage = new EventEmitter<void>();

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('dropzoneContainer') dropzoneContainer?: ElementRef<HTMLElement>;

  isDragging = false;
  isFocused = false;
  isHovered = false;
  validationError = '';
  private dragCounter = 0;

  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.isHovered = true;
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.isHovered = false;
  }

  @HostListener('focusin')
  onFocusIn(): void {
    this.isFocused = true;
  }

  @HostListener('focusout', ['$event'])
  onFocusOut(event: FocusEvent): void {
    if (!this.dropzoneContainer?.nativeElement.contains(event.relatedTarget as Node)) {
      this.isFocused = false;
    }
  }

  @HostListener('window:paste', ['$event'])
  onWindowPaste(event: ClipboardEvent): void {
    if (this.disabled || this.loading) return;

    // Si el usuario está escribiendo texto en un input o textarea fuera de esta dropzone, no interceptar
    const activeEl = document.activeElement;
    const isTextInput = activeEl && (
      activeEl.tagName === 'INPUT' ||
      activeEl.tagName === 'TEXTAREA' ||
      (activeEl as HTMLElement).isContentEditable
    );

    // Solo procesar si el dropzone está enfocado o bajo el puntero
    if (!this.isFocused && !this.isHovered) {
      return;
    }

    if (isTextInput && !this.dropzoneContainer?.nativeElement.contains(activeEl)) {
      return;
    }

    this.processClipboardEvent(event);
  }

  openFileDialog(): void {
    if (this.disabled || this.loading) return;
    this.validationError = '';
    this.fileInput?.nativeElement.click();
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFiles(Array.from(input.files));
      input.value = '';
    }
  }

  onDragEnter(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled || this.loading) return;
    this.dragCounter++;
    this.isDragging = true;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled || this.loading) return;
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragCounter--;
    if (this.dragCounter <= 0) {
      this.isDragging = false;
      this.dragCounter = 0;
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    this.dragCounter = 0;

    if (this.disabled || this.loading) return;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFiles(Array.from(event.dataTransfer.files));
    }
  }

  onPaste(event: ClipboardEvent): void {
    if (this.disabled || this.loading) return;
    this.processClipboardEvent(event);
  }

  private processClipboardEvent(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    const files = event.clipboardData?.files;
    const extractedFiles: File[] = [];

    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (this.isImageFile(file)) {
          extractedFiles.push(file);
        }
      }
    } else if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file && this.isImageFile(file)) {
            const ext = file.type ? file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png' : 'png';
            const cleanName = (file.name && file.name !== 'image.png')
              ? file.name
              : `foto_pegada_${Date.now()}.${ext}`;
            const renamedFile = new File([file], cleanName, { type: file.type || 'image/png' });
            extractedFiles.push(renamedFile);
          }
        }
      }
    }

    if (extractedFiles.length > 0) {
      event.preventDefault();
      event.stopPropagation();
      this.handleFiles(extractedFiles);
    }
  }

  private isImageFile(file: File): boolean {
    if (file.type && file.type.startsWith('image/')) return true;
    return /\.(jpe?g|png|webp|gif|bmp|heic)$/i.test(file.name);
  }

  private handleFiles(rawFiles: File[]): void {
    this.validationError = '';

    // Filtrar solo imágenes
    const imageFiles = rawFiles.filter(f => this.isImageFile(f));
    if (imageFiles.length === 0) {
      this.validationError = 'El archivo seleccionado no es una imagen válida (JPG, PNG, WEBP, GIF).';
      return;
    }

    // Validar límite de tamaño
    const maxBytes = this.maxSizeMb * 1024 * 1024;
    const oversized = imageFiles.find(f => f.size > maxBytes);
    if (oversized) {
      this.validationError = `"${oversized.name}" sobrepasa el límite de ${this.maxSizeMb}MB.`;
      return;
    }

    const filesToEmit = this.multiple ? imageFiles : [imageFiles[0]];
    this.filesSelected.emit(filesToEmit);
  }
}
