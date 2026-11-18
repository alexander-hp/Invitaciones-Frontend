import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { VisualInvitationRendererModule } from '../../shared/components/visual-invitation-renderer/visual-invitation-renderer.module';
import { VisualPassEditorComponent } from './visual-pass-editor.component';

@NgModule({
  declarations: [VisualPassEditorComponent],
  imports: [
    CommonModule,
    FormsModule,
    VisualInvitationRendererModule,
    RouterModule.forChild([{ path: '', component: VisualPassEditorComponent }])
  ]
})
export class VisualPassEditorModule {}
