import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { VisualInvitationEditorComponent } from './visual-invitation-editor.component';
import { VisualInvitationRendererModule } from '../../shared/components/visual-invitation-renderer/visual-invitation-renderer.module';

@NgModule({
  declarations: [VisualInvitationEditorComponent],
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    VisualInvitationRendererModule,
    RouterModule.forChild([{ path: '', component: VisualInvitationEditorComponent }])
  ]
})
export class VisualInvitationEditorModule { }
