import { VisualInvitationSection } from '../../../core/models';

export function visualSectionHeight(section: VisualInvitationSection): number {
  return Math.max(240, Number(section.height) || 640);
}

export function visualSectionOffset(sections: VisualInvitationSection[], section: VisualInvitationSection): number {
  const index = sections.indexOf(section);
  return index < 0 ? 0 : sections.slice(0, index).reduce((total, item) => total + visualSectionHeight(item), 0);
}

export function visualCanvasHeight(sections: VisualInvitationSection[]): number {
  return sections.reduce((total, section) => total + visualSectionHeight(section), 0);
}
