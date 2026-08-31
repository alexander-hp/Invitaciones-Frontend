import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Html5Qrcode, Html5QrcodeCameraScanConfig, CameraDevice } from 'html5-qrcode';

@Component({
  selector: 'app-qr-scanner-modal',
  templateUrl: './qr-scanner-modal.component.html',
  styleUrls: ['./qr-scanner-modal.component.css']
})
export class QrScannerModalComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() codeScanned = new EventEmitter<string>();

  cameras: CameraDevice[] = [];
  selectedCameraId = '';
  isScanning = false;
  isContinuous = true;
  lastScannedCode = '';
  errorMessage = '';
  fileScanning = false;

  private html5QrCode?: Html5Qrcode;
  private scannerElementId = 'qr-reader-viewport';

  ngOnInit(): void {
    if (this.isOpen) {
      this.initScanner();
    }
  }

  ngOnDestroy(): void {
    this.stopScanner();
  }

  async startCamera(): Promise<void> {
    this.errorMessage = '';
    try {
      if (!this.html5QrCode) {
        this.html5QrCode = new Html5Qrcode(this.scannerElementId);
      }

      this.cameras = await Html5Qrcode.getCameras();
      
      const config: Html5QrcodeCameraScanConfig = {
        fps: 10,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minDim = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.floor(minDim * 0.7);
          return { width: size, height: size };
        },
        aspectRatio: 1.0
      };

      const cameraConstraint = this.selectedCameraId
        ? { deviceId: { exact: this.selectedCameraId } }
        : { facingMode: 'environment' };

      await this.html5QrCode.start(
        cameraConstraint,
        config,
        (decodedText) => this.onScanSuccess(decodedText),
        () => {}
      );

      this.isScanning = true;
    } catch (err: any) {
      console.error('Error starting camera scanner:', err);
      this.isScanning = false;
      this.errorMessage = err?.message || 'No se pudo acceder a la cámara. Verifica los permisos de tu navegador.';
    }
  }

  async onCameraChange(deviceId: string): Promise<void> {
    this.selectedCameraId = deviceId;
    if (this.isScanning) {
      await this.stopScanner();
      await this.startCamera();
    }
  }

  async stopScanner(): Promise<void> {
    if (this.html5QrCode && this.isScanning) {
      try {
        await this.html5QrCode.stop();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
      this.isScanning = false;
    }
  }

  private initScanner(): void {
    setTimeout(() => {
      this.startCamera();
    }, 100);
  }

  onScanSuccess(decodedText: string): void {
    const extractedCode = this.extractCheckInCode(decodedText);
    if (!extractedCode) return;

    if (extractedCode === this.lastScannedCode && this.isContinuous) {
      return; // prevent duplicate rapid scans of same code in continuous mode
    }

    this.lastScannedCode = extractedCode;
    this.provideFeedback();
    this.codeScanned.emit(extractedCode);

    if (!this.isContinuous) {
      this.closeModal();
    } else {
      // Clear last scanned code after 3 seconds so same QR can be scanned again later if needed
      setTimeout(() => {
        if (this.lastScannedCode === extractedCode) {
          this.lastScannedCode = '';
        }
      }, 3000);
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    this.fileScanning = true;
    this.errorMessage = '';

    try {
      if (!this.html5QrCode) {
        this.html5QrCode = new Html5Qrcode(this.scannerElementId);
      }
      const result = await this.html5QrCode.scanFileV2(file, true);
      this.fileScanning = false;
      if (result && result.decodedText) {
        this.onScanSuccess(result.decodedText);
      }
    } catch (err: any) {
      this.fileScanning = false;
      this.errorMessage = 'No se encontró un código QR válido en la imagen seleccionada.';
    }
  }

  closeModal(): void {
    this.stopScanner().then(() => {
      this.close.emit();
    });
  }

  extractCheckInCode(rawText: string): string {
    if (!rawText) return '';
    const trimmed = rawText.trim();
    try {
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        const url = new URL(trimmed);
        const codeParam = url.searchParams.get('t') ||
                          url.searchParams.get('code') ||
                          url.searchParams.get('token') ||
                          url.searchParams.get('id');
        if (codeParam) return codeParam.trim();
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length > 0) {
          return parts[parts.length - 1].trim();
        }
      }
    } catch (_) {}
    return trimmed;
  }

  private provideFeedback(): void {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(200);
      }
    } catch (_) {}
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (_) {}
  }
}
