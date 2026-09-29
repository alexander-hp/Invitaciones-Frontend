import { VisualInvitationLayerLayout, VisualInvitationLayerStyle } from '../../core/models';

type Device = 'mobile' | 'tablet' | 'desktop';
type Mask = NonNullable<VisualInvitationLayerStyle['imageMask']>;

export interface PhotoCompositionSlot {
  x: number;
  y: number;
  width: number;
  height: number;
  mask: Mask;
}

export interface PhotoCompositionPreset {
  key: string;
  name: string;
  aspectRatio: number;
  slots: PhotoCompositionSlot[];
}

export const PHOTO_COMPOSITION_PRESETS: PhotoCompositionPreset[] = [
  { key: 'diptych', name: 'Díptico', aspectRatio: 1.5, slots: [
    { x: 0, y: 0, width: 48, height: 100, mask: 'arch' },
    { x: 52, y: 0, width: 48, height: 100, mask: 'arch' }
  ] },
  { key: 'stacked', name: 'Apiladas', aspectRatio: .95, slots: [
    { x: 0, y: 0, width: 100, height: 48, mask: 'rounded' },
    { x: 0, y: 52, width: 100, height: 48, mask: 'rounded' }
  ] },
  { key: 'triptych', name: 'Tríptico', aspectRatio: 1.55, slots: [
    { x: 0, y: 0, width: 56, height: 100, mask: 'rounded' },
    { x: 60, y: 0, width: 40, height: 48, mask: 'rounded' },
    { x: 60, y: 52, width: 40, height: 48, mask: 'rounded' }
  ] },
  { key: 'grid', name: 'Cuadrícula', aspectRatio: 1.5, slots: [
    { x: 0, y: 0, width: 48, height: 48, mask: 'rounded' },
    { x: 52, y: 0, width: 48, height: 48, mask: 'rounded' },
    { x: 0, y: 52, width: 48, height: 48, mask: 'rounded' },
    { x: 52, y: 52, width: 48, height: 48, mask: 'rounded' }
  ] },
  { key: 'editorial', name: 'Editorial', aspectRatio: 1.5, slots: [
    { x: 0, y: 0, width: 62, height: 100, mask: 'rounded' },
    { x: 66, y: 0, width: 34, height: 30, mask: 'rounded' },
    { x: 66, y: 35, width: 34, height: 30, mask: 'rounded' },
    { x: 66, y: 70, width: 34, height: 30, mask: 'rounded' }
  ] },
  { key: 'filmstrip', name: 'Tira de fotos', aspectRatio: 2.2, slots: [
    { x: 0, y: 0, width: 31, height: 100, mask: 'rounded' },
    { x: 34.5, y: 0, width: 31, height: 100, mask: 'rounded' },
    { x: 69, y: 0, width: 31, height: 100, mask: 'rounded' }
  ] }
];

const DEVICE_WIDTHS: Record<Device, number> = { mobile: 390, tablet: 768, desktop: 1180 };
const DEVICE_FRACTIONS: Record<Device, number> = { mobile: .82, tablet: .68, desktop: .58 };

export function photoCompositionLayouts(preset: PhotoCompositionPreset, sectionHeight: number): Record<Device, VisualInvitationLayerLayout[]> {
  const result = {} as Record<Device, VisualInvitationLayerLayout[]>;
  for (const device of ['mobile', 'tablet', 'desktop'] as Device[]) {
    const canvasWidth = DEVICE_WIDTHS[device];
    const widthPx = Math.min(canvasWidth * DEVICE_FRACTIONS[device], sectionHeight * .56 * preset.aspectRatio);
    const heightPx = widthPx / preset.aspectRatio;
    const widthPercent = widthPx / canvasWidth * 100;
    const heightPercent = heightPx / sectionHeight * 100;
    const left = (100 - widthPercent) / 2;
    const top = (100 - heightPercent) / 2;
    result[device] = preset.slots.map((slot) => ({
      x: round(left + widthPercent * slot.x / 100),
      y: round(top + heightPercent * slot.y / 100),
      width: round(widthPercent * slot.width / 100),
      height: round(heightPercent * slot.height / 100),
      rotation: 0
    }));
  }
  return result;
}

export function reflowPhotoCompositionLayouts(
  preset: PhotoCompositionPreset,
  sectionHeight: number,
  current: Record<Device, VisualInvitationLayerLayout[]>
): Record<Device, VisualInvitationLayerLayout[]> {
  const result = {} as Record<Device, VisualInvitationLayerLayout[]>;
  for (const device of ['mobile', 'tablet', 'desktop'] as Device[]) {
    const layers = current[device];
    const left = Math.min(...layers.map((layer) => layer.x));
    const top = Math.min(...layers.map((layer) => layer.y));
    const right = Math.max(...layers.map((layer) => layer.x + layer.width));
    const bottom = Math.max(...layers.map((layer) => layer.y + layer.height));
    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;
    const height = Math.max(1, sectionHeight);
    const widthPx = Math.min(
      (right - left) / 100 * DEVICE_WIDTHS[device],
      DEVICE_WIDTHS[device] * .9,
      height * .8 * preset.aspectRatio
    );
    const width = widthPx / DEVICE_WIDTHS[device] * 100;
    const groupHeight = widthPx / preset.aspectRatio / height * 100;
    const groupLeft = clamp(centerX - width / 2, 0, 100 - width);
    const groupTop = clamp(centerY - groupHeight / 2, 0, 100 - groupHeight);
    result[device] = preset.slots.map((slot, index) => ({
      x: round(groupLeft + width * slot.x / 100),
      y: round(groupTop + groupHeight * slot.y / 100),
      width: round(width * slot.width / 100),
      height: round(groupHeight * slot.height / 100),
      rotation: layers[index]?.rotation || 0
    }));
  }
  return result;
}

export function photoCompositionSpacing(layouts: VisualInvitationLayerLayout[], canvasWidth: number, sectionHeight: number): number {
  if (layouts.length < 2) return 0;
  const rects = layouts.map((layout) => ({
    left: layout.x * canvasWidth / 100,
    right: (layout.x + layout.width) * canvasWidth / 100,
    top: layout.y * sectionHeight / 100,
    bottom: (layout.y + layout.height) * sectionHeight / 100
  }));
  const gaps: number[] = [];
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const a = rects[i], b = rects[j];
    if (Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top)) {
      gaps.push(Math.max(a.left - b.right, b.left - a.right));
    }
    if (Math.min(a.right, b.right) > Math.max(a.left, b.left)) {
      gaps.push(Math.max(a.top - b.bottom, b.top - a.bottom));
    }
  }
  return gaps.length ? Math.max(0, Math.min(...gaps)) : 0;
}

export function withPhotoCompositionSpacing(
  layouts: VisualInvitationLayerLayout[], canvasWidth: number, sectionHeight: number, desiredGap: number
): VisualInvitationLayerLayout[] {
  if (layouts.length < 2) return layouts.map((layout) => ({ ...layout }));
  const minScale = Math.max(.35, ...layouts.map((layout) => Math.max(4 / layout.width, 4 / layout.height)));
  const maxScale = Math.min(2, ...layouts.map((layout) => {
    const cx = layout.x + layout.width / 2;
    const cy = layout.y + layout.height / 2;
    return Math.min(2 * cx / layout.width, 2 * (100 - cx) / layout.width,
      2 * cy / layout.height, 2 * (100 - cy) / layout.height);
  }));
  if (minScale > maxScale) return layouts.map((layout) => ({ ...layout }));
  const scaled = (scale: number): VisualInvitationLayerLayout[] => layouts.map((layout) => ({
    ...layout,
    x: layout.x + layout.width * (1 - scale) / 2,
    y: layout.y + layout.height * (1 - scale) / 2,
    width: layout.width * scale,
    height: layout.height * scale
  }));
  const target = Math.max(0, desiredGap);
  let low = minScale;
  let high = maxScale;
  if (photoCompositionSpacing(scaled(low), canvasWidth, sectionHeight) <= target) high = low;
  else if (photoCompositionSpacing(scaled(high), canvasWidth, sectionHeight) >= target) low = high;
  else for (let iteration = 0; iteration < 28; iteration++) {
    const middle = (low + high) / 2;
    if (photoCompositionSpacing(scaled(middle), canvasWidth, sectionHeight) > target) low = middle;
    else high = middle;
  }
  return scaled((low + high) / 2).map((layout) => ({
    ...layout, x: round(layout.x), y: round(layout.y), width: round(layout.width), height: round(layout.height)
  }));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
