import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { VisualInvitationRendererComponent } from './visual-invitation-renderer.component';
import { VisualMediaPlayerComponent } from './visual-media-player.component';
import { VISUAL_LUCIDE_ICONS } from './visual-icon-catalog';

@NgModule({
  declarations: [VisualInvitationRendererComponent, VisualMediaPlayerComponent],
  imports: [CommonModule, FormsModule, LucideAngularModule.pick(VISUAL_LUCIDE_ICONS)],
  exports: [VisualInvitationRendererComponent, VisualMediaPlayerComponent, LucideAngularModule]
})
export class VisualInvitationRendererModule { }
