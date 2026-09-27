import { Injectable } from '@angular/core';

export type AnimatedExportFormat = 'gif' | 'mp4';
export type AnimatedExportTransition = 'fade' | 'slide' | 'zoom';
export type AnimatedExportDevice = 'mobile' | 'tablet' | 'desktop';

export interface AnimatedExportOptions {
  format: AnimatedExportFormat;
  device: AnimatedExportDevice;
  width: number;
  pageDuration: number;
  transitionDuration: number;
  transition: AnimatedExportTransition;
  fps: number;
  backgroundColor: string;
  audioUrl?: string;
}

export interface AnimatedExportResult {
  blob: Blob;
  extension: AnimatedExportFormat;
  warning?: string;
}

export interface AnimatedExportScene {
  frames: HTMLCanvasElement[];
}

export function animatedFrameSize(device: AnimatedExportDevice, requestedWidth: number): { width: number; height: number } {
  const maxWidth = device === 'mobile' ? 1170 : device === 'tablet' ? 1536 : 1920;
  const width = Math.max(320, Math.min(Math.round(requestedWidth), maxWidth));
  const ratio = device === 'mobile' ? 16 / 9 : device === 'tablet' ? 4 / 3 : 9 / 16;
  return { width, height: Math.round(width * ratio) };
}

@Injectable({ providedIn: 'root' })
export class VisualInvitationAnimatedExportService {
  private readonly mp4Types = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4'
  ];

  supportedMp4Type(): string {
    if (typeof MediaRecorder === 'undefined') return '';
    return this.mp4Types.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  }

  async create(
    scenes: AnimatedExportScene[],
    options: AnimatedExportOptions,
    onProgress: (progress: number) => void
  ): Promise<AnimatedExportResult> {
    if (!scenes.length || scenes.some((scene) => !scene.frames.length)) throw new Error('Selecciona al menos una página para crear la animación.');
    return options.format === 'gif'
      ? this.createGif(scenes, options, onProgress)
      : this.createMp4(scenes, options, onProgress);
  }

  private async createGif(
    scenes: AnimatedExportScene[],
    options: AnimatedExportOptions,
    onProgress: (progress: number) => void
  ): Promise<AnimatedExportResult> {
    const { GIFEncoder, quantize, applyPalette } = await import('gifenc');
    const size = animatedFrameSize(options.device, Math.min(options.width, 720));
    const canvas = this.createCanvas(size.width, size.height);
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('El navegador no pudo preparar el lienzo animado.');
    const gif = GIFEncoder({ initialCapacity: 1024 * 1024 });
    const steps = scenes.length > 1 ? 4 : 0;
    const totalFrames = scenes.reduce((total, scene) => total + scene.frames.length + steps, 0);
    let writtenFrames = 0;

    const write = (delay: number) => {
      const image = context.getImageData(0, 0, size.width, size.height);
      const palette = quantize(image.data, 256, { format: 'rgb565' });
      const indexed = applyPalette(image.data, palette, 'rgb565');
      gif.writeFrame(indexed, size.width, size.height, { palette, delay: Math.max(20, Math.round(delay)), repeat: 0 });
      writtenFrames += 1;
      onProgress(Math.round(writtenFrames / totalFrames * 100));
    };

    for (let index = 0; index < scenes.length; index += 1) {
      const scene = scenes[index];
      const stillDuration = steps ? options.pageDuration - options.transitionDuration : options.pageDuration;
      const stillDelay = Math.max(120, stillDuration * 1000 / scene.frames.length);
      for (const frame of scene.frames) {
        this.drawTransitionFrame(context, canvas, frame, frame, 0, options.transition, options.backgroundColor);
        write(stillDelay);
        await this.yieldToBrowser();
      }
      if (steps) {
        const current = scene.frames[scene.frames.length - 1];
        const next = scenes[(index + 1) % scenes.length].frames[0];
        for (let step = 1; step <= steps; step += 1) {
          this.drawTransitionFrame(context, canvas, current, next, step / steps, options.transition, options.backgroundColor);
          write(options.transitionDuration * 1000 / steps);
          await this.yieldToBrowser();
        }
      }
    }

    gif.finish();
    onProgress(100);
    return { blob: new Blob([gif.bytes()], { type: 'image/gif' }), extension: 'gif' };
  }

  private async createMp4(
    scenes: AnimatedExportScene[],
    options: AnimatedExportOptions,
    onProgress: (progress: number) => void
  ): Promise<AnimatedExportResult> {
    const mimeType = this.supportedMp4Type();
    if (!mimeType) throw new Error('Este navegador no puede codificar MP4. Usa Chrome o Edge actualizado, o descarga GIF.');
    const size = animatedFrameSize(options.device, options.width);
    const canvas = this.createCanvas(size.width, size.height);
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('El navegador no pudo preparar el lienzo de video.');
    const videoStream = canvas.captureStream(options.fps);
    const outputStream = new MediaStream(videoStream.getVideoTracks());
    let audio: HTMLAudioElement | undefined;
    let warning = '';

    if (options.audioUrl) {
      try {
        audio = await this.attachAudio(outputStream, options.audioUrl);
      } catch {
        warning = 'El video se generó sin música porque el archivo de audio no permitió su captura.';
      }
    }

    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(outputStream, {
      mimeType,
      videoBitsPerSecond: size.width >= 1280 ? 8_000_000 : 4_000_000,
      audioBitsPerSecond: 192_000
    });
    recorder.addEventListener('dataavailable', (event) => { if (event.data.size) chunks.push(event.data); });
    const stopped = new Promise<void>((resolve, reject) => {
      recorder.addEventListener('stop', () => resolve(), { once: true });
      recorder.addEventListener('error', () => reject(new Error('El navegador interrumpió la grabación MP4.')), { once: true });
    });
    const totalDuration = Math.max(.5, scenes.length * options.pageDuration);
    const startedAt = performance.now();
    recorder.start(500);

    try {
      while (true) {
        const elapsed = (performance.now() - startedAt) / 1000;
        const bounded = Math.min(elapsed, totalDuration);
        const index = Math.min(scenes.length - 1, Math.floor(bounded / options.pageDuration));
        const local = bounded - index * options.pageDuration;
        const transitionStart = options.pageDuration - options.transitionDuration;
        const hasNext = index < scenes.length - 1;
        const scene = scenes[index];
        const stableProgress = Math.max(0, Math.min(.999, local / Math.max(.1, transitionStart)));
        const frameIndex = Math.min(scene.frames.length - 1, Math.floor(stableProgress * scene.frames.length));
        const current = local > transitionStart ? scene.frames[scene.frames.length - 1] : scene.frames[frameIndex];
        const transitionProgress = hasNext && local > transitionStart
          ? Math.min(1, (local - transitionStart) / options.transitionDuration)
          : 0;
        const next = hasNext ? scenes[index + 1].frames[0] : current;
        this.drawTransitionFrame(context, canvas, current, next, transitionProgress, options.transition, options.backgroundColor, local / options.pageDuration);
        onProgress(Math.min(99, Math.round(bounded / totalDuration * 100)));
        if (elapsed >= totalDuration) break;
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
    } finally {
      if (recorder.state !== 'inactive') recorder.stop();
      await stopped;
      audio?.pause();
      outputStream.getTracks().forEach((track) => track.stop());
    }

    onProgress(100);
    return { blob: new Blob(chunks, { type: mimeType }), extension: 'mp4', warning };
  }

  private async attachAudio(stream: MediaStream, url: string): Promise<HTMLAudioElement> {
    const audio = new Audio();
    try {
      audio.crossOrigin = 'anonymous';
      audio.loop = true;
      audio.preload = 'auto';
      audio.src = url;
      await Promise.race([
        new Promise<void>((resolve, reject) => {
          audio.addEventListener('canplay', () => resolve(), { once: true });
          audio.addEventListener('error', () => reject(new Error('Audio no disponible.')), { once: true });
        }),
        new Promise<void>((_, reject) => setTimeout(() => reject(new Error('El audio tardó demasiado en responder.')), 7000))
      ]);
      await audio.play();
      const capture = (audio as HTMLAudioElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream }).captureStream
        || (audio as HTMLAudioElement & { mozCaptureStream?: () => MediaStream }).mozCaptureStream;
      if (!capture) throw new Error('Captura de audio no disponible.');
      const audioStream = capture.call(audio);
      const tracks = audioStream.getAudioTracks();
      if (!tracks.length) throw new Error('No se recibió una pista de audio.');
      tracks.forEach((track) => stream.addTrack(track));
      return audio;
    } catch (error) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      throw error;
    }
  }

  private drawTransitionFrame(
    context: CanvasRenderingContext2D,
    target: HTMLCanvasElement,
    current: HTMLCanvasElement,
    next: HTMLCanvasElement,
    progress: number,
    transition: AnimatedExportTransition,
    backgroundColor: string,
    pageProgress = .5
  ): void {
    context.save();
    context.fillStyle = backgroundColor || '#ffffff';
    context.fillRect(0, 0, target.width, target.height);
    if (transition === 'slide' && progress > 0) {
      this.drawContained(context, target, current, -progress * target.width, 1);
      this.drawContained(context, target, next, (1 - progress) * target.width, 1);
    } else if (transition === 'zoom' && progress > 0) {
      this.drawContained(context, target, current, 0, 1 + progress * .08, 1 - progress);
      this.drawContained(context, target, next, 0, .92 + progress * .08, progress);
    } else if (progress > 0) {
      this.drawContained(context, target, current, 0, 1, 1 - progress);
      this.drawContained(context, target, next, 0, 1, progress);
    } else {
      this.drawContained(context, target, current, 0, 1 + Math.sin(Math.max(0, Math.min(1, pageProgress)) * Math.PI) * .012);
    }
    context.restore();
  }

  private drawContained(
    context: CanvasRenderingContext2D,
    target: HTMLCanvasElement,
    source: HTMLCanvasElement,
    offsetX: number,
    zoom: number,
    alpha = 1
  ): void {
    const scale = Math.min(target.width / source.width, target.height / source.height) * zoom;
    const width = source.width * scale;
    const height = source.height * scale;
    context.save();
    context.globalAlpha = Math.max(0, Math.min(1, alpha));
    context.drawImage(source, (target.width - width) / 2 + offsetX, (target.height - height) / 2, width, height);
    context.restore();
  }

  private createCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  private yieldToBrowser(): Promise<void> {
    return new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
}
