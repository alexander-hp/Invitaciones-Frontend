declare module 'gifenc' {
  export interface GifEncoder {
    writeFrame(index: Uint8Array, width: number, height: number, options?: {
      palette?: number[][];
      delay?: number;
      repeat?: number;
      transparent?: boolean;
      transparentIndex?: number;
    }): void;
    finish(): void;
    bytes(): Uint8Array;
  }

  export function GIFEncoder(options?: { initialCapacity?: number }): GifEncoder;
  export function quantize(data: Uint8Array | Uint8ClampedArray, maxColors: number, options?: { format?: string }): number[][];
  export function applyPalette(data: Uint8Array | Uint8ClampedArray, palette: number[][], format?: string): Uint8Array;
}
