import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VisualInvitationRendererComponent } from './visual-invitation-renderer.component';
import { VisualMediaPlayerComponent } from './visual-media-player.component';

@NgModule({
  declarations: [VisualInvitationRendererComponent, VisualMediaPlayerComponent],
  imports: [CommonModule, FormsModule],
  exports: [VisualInvitationRendererComponent, VisualMediaPlayerComponent]
})
export class VisualInvitationRendererModule { }
