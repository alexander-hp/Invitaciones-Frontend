import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { VisualInvitationEditorComponent } from './visual-invitation-editor.component';

@NgModule({
  declarations: [VisualInvitationEditorComponent],
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    RouterModule.forChild([{ path: '', component: VisualInvitationEditorComponent }])
  ]
})
export class VisualInvitationEditorModule { }
