import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VisualInvitationRendererComponent } from './visual-invitation-renderer.component';

@NgModule({
  declarations: [VisualInvitationRendererComponent],
  imports: [CommonModule, FormsModule],
  exports: [VisualInvitationRendererComponent]
})
export class VisualInvitationRendererModule { }
