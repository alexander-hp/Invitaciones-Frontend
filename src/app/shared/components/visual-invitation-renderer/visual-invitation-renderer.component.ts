import { Component, Input } from '@angular/core';
import { InvitationModel, VisualInvitationLayer, VisualInvitationSection } from '../../../core/models';

@Component({ selector: 'app-visual-invitation-renderer', templateUrl: './visual-invitation-renderer.component.html', styleUrls: ['./visual-invitation-renderer.component.css'] })
export class VisualInvitationRendererComponent {
  @Input() invitation?: InvitationModel;
  get sections(): VisualInvitationSection[] { return (this.invitation?.content?.visualDesign?.sections || []).filter((section) => section.enabled); }
  sectionStyle(section: VisualInvitationSection): Record<string, string> {
    const background = section.background || {};
    const overlay = Math.round((background.overlay || 0) * 255).toString(16).padStart(2, '0');
    return { height: `${section.height}px`, backgroundColor: background.color || '#fff', backgroundImage: background.imageUrl ? `linear-gradient(#000000${overlay},#000000${overlay}),url("${background.imageUrl}")` : 'none' };
  }
  layerStyle(layer: VisualInvitationLayer): Record<string, string> {
    const style = layer.style || {};
    return { left: `${layer.x}%`, top: `${layer.y}%`, width: `${layer.width}%`, height: `${layer.height}%`, transform: `rotate(${layer.rotation || 0}deg)`, zIndex: String(layer.zIndex || 1), color: String(style.color || '#25211f'), backgroundColor: String(style.backgroundColor || 'transparent'), fontFamily: String(style.fontFamily || 'Arial, sans-serif'), fontSize: `${Number(style.fontSize || 30)}px`, fontWeight: String(style.fontWeight || 400), textAlign: String(style.textAlign || 'center'), borderRadius: `${Number(style.borderRadius || 0)}px`, opacity: String(style.opacity ?? 1) };
  }
}
