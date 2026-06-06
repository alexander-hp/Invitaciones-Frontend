import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/auth.guard';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { EventDetailComponent } from './features/event-detail/event-detail.component';
import { EventsComponent } from './features/events/events.component';
import { InvitationEditorComponent } from './features/invitation-editor/invitation-editor.component';
import { LoginComponent } from './features/login/login.component';
import { PublicInvitationComponent } from './features/public-invitation/public-invitation.component';
import { RegisterComponent } from './features/register/register.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'events', component: EventsComponent, canActivate: [AuthGuard] },
  { path: 'events/:id', component: EventDetailComponent, canActivate: [AuthGuard] },
  { path: 'invitations/:id/editor', component: InvitationEditorComponent, canActivate: [AuthGuard] },
  { path: 'i/:slug', component: PublicInvitationComponent },
  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
