import { VisualInvitationLayer } from '../../../core/models';

export function isSingleInstanceControl(layer: VisualInvitationLayer): boolean {
  const binding = String(layer.binding || '');
  return Boolean(binding) && !binding.startsWith('display.') && (
    layer.type === 'field' || layer.type === 'button' ||
    binding === 'album.gallery' || binding === 'dedication.wall' || binding === 'pass.qr'
  );
}

export function visibleControlDuplicates(layers: VisualInvitationLayer[]): Array<{ original: VisualInvitationLayer; duplicate: VisualInvitationLayer }> {
  const firstByBinding = new Map<string, VisualInvitationLayer>();
  const duplicates: Array<{ original: VisualInvitationLayer; duplicate: VisualInvitationLayer }> = [];
  for (const layer of layers) {
    if (layer.hidden || !isSingleInstanceControl(layer)) continue;
    const binding = layer.binding!;
    const original = firstByBinding.get(binding);
    if (original) duplicates.push({ original, duplicate: layer });
    else firstByBinding.set(binding, layer);
  }
  return duplicates;
}

export function uniqueVisibleControls(layers: VisualInvitationLayer[]): VisualInvitationLayer[] {
  const duplicates = new Set(visibleControlDuplicates(layers).map(({ duplicate }) => duplicate.id));
  return layers.filter((layer) => !duplicates.has(layer.id));
}
