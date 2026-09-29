import { PHOTO_COMPOSITION_PRESETS, photoCompositionLayouts, photoCompositionSpacing, reflowPhotoCompositionLayouts, withPhotoCompositionSpacing } from './photo-composition-presets';

describe('photo composition presets', () => {
  it('keeps every photo inside the canvas and separate at each device width', () => {
    for (const preset of PHOTO_COMPOSITION_PRESETS) {
      expect(preset.slots.length).toBeGreaterThan(1);
      const layouts = photoCompositionLayouts(preset, 600);
      for (const device of ['mobile', 'tablet', 'desktop'] as const) {
        const slots = layouts[device];
        expect(slots.length).toBe(preset.slots.length);
        for (const slot of slots) {
          expect(slot.x).toBeGreaterThanOrEqual(0);
          expect(slot.y).toBeGreaterThanOrEqual(0);
          expect(slot.x + slot.width).toBeLessThanOrEqual(100);
          expect(slot.y + slot.height).toBeLessThanOrEqual(100);
        }
        for (let i = 0; i < slots.length; i++) for (let j = i + 1; j < slots.length; j++) {
          const a = slots[i], b = slots[j];
          const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
          const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
          expect(overlapX <= 0 || overlapY <= 0).toBeTrue();
        }
      }
    }
  });

  it('offers at least two distributions for each supported photo count', () => {
    for (const count of [2, 3, 4]) {
      expect(PHOTO_COMPOSITION_PRESETS.filter((preset) => preset.slots.length === count).length).toBeGreaterThan(1);
    }
  });

  it('reflows around the current center on each device without overlap', () => {
    const original = PHOTO_COMPOSITION_PRESETS.find((preset) => preset.key === 'triptych')!;
    const target = PHOTO_COMPOSITION_PRESETS.find((preset) => preset.key === 'filmstrip')!;
    const current = photoCompositionLayouts(original, 820);
    for (const device of ['mobile', 'tablet', 'desktop'] as const) {
      current[device].forEach((slot) => { slot.x += 8; slot.y += 5; });
    }
    const next = reflowPhotoCompositionLayouts(target, 820, current);
    for (const device of ['mobile', 'tablet', 'desktop'] as const) {
      const bounds = (layers: typeof next.mobile) => ({
        left: Math.min(...layers.map((slot) => slot.x)),
        right: Math.max(...layers.map((slot) => slot.x + slot.width)),
        top: Math.min(...layers.map((slot) => slot.y)),
        bottom: Math.max(...layers.map((slot) => slot.y + slot.height))
      });
      const before = bounds(current[device]);
      const after = bounds(next[device]);
      expect(Math.abs((before.left + before.right) / 2 - (after.left + after.right) / 2)).toBeLessThan(.05);
      expect(Math.abs((before.top + before.bottom) / 2 - (after.top + after.bottom) / 2)).toBeLessThan(.05);
      expect(after.left).toBeGreaterThanOrEqual(0);
      expect(after.right).toBeLessThanOrEqual(100);
      expect(after.top).toBeGreaterThanOrEqual(0);
      expect(after.bottom).toBeLessThanOrEqual(100);
      expect(next[device][0].x + next[device][0].width).toBeLessThanOrEqual(next[device][1].x);
    }
  });

  it('adjusts photo gaps without changing frame centers or aspect ratios', () => {
    const preset = PHOTO_COMPOSITION_PRESETS.find((item) => item.key === 'grid')!;
    const layouts = photoCompositionLayouts(preset, 820);
    for (const [device, width] of [['mobile', 390], ['tablet', 768], ['desktop', 1180]] as const) {
      const original = layouts[device];
      const gap = photoCompositionSpacing(original, width, 820);
      const adjusted = withPhotoCompositionSpacing(original, width, 820, gap + 10);
      expect(Math.abs(photoCompositionSpacing(adjusted, width, 820) - (gap + 10))).toBeLessThan(.3);
      adjusted.forEach((frame, index) => {
        const before = original[index];
        expect(Math.abs(frame.x + frame.width / 2 - before.x - before.width / 2)).toBeLessThan(.02);
        expect(Math.abs(frame.y + frame.height / 2 - before.y - before.height / 2)).toBeLessThan(.02);
        expect(Math.abs(frame.width / before.width - frame.height / before.height)).toBeLessThan(.002);
        expect(frame.x).toBeGreaterThanOrEqual(0);
        expect(frame.y).toBeGreaterThanOrEqual(0);
        expect(frame.x + frame.width).toBeLessThanOrEqual(100);
        expect(frame.y + frame.height).toBeLessThanOrEqual(100);
      });
      const restored = withPhotoCompositionSpacing(adjusted, width, 820, gap);
      expect(Math.abs(photoCompositionSpacing(restored, width, 820) - gap)).toBeLessThan(.3);
    }
  });
});
