import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/auth.guard';
import { CheckInStaffComponent } from './features/check-in-staff/check-in-staff.component';
import { ContactComponent } from './features/contact/contact.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { EventDetailComponent } from './features/event-detail/event-detail.component';
import { EventsComponent } from './features/events/events.component';
import { EventAccessComponent } from './features/event-access/event-access.component';
import { ExternalPortalComponent } from './features/external-portal/external-portal.component';
import { ExternalEmbedComponent } from './features/external-embed/external-embed.component';
import { InvitationEditorComponent } from './features/invitation-editor/invitation-editor.component';
import { NewInvitationEditorComponent } from './features/new-invitation-editor/new-invitation-editor.component';
import { LoginComponent } from './features/login/login.component';
import { NewLoginComponent } from './features/new-login/new-login.component';
import { NewRegisterComponent } from './features/new-register/new-register.component';
import { NewDashboardComponent } from './features/new-dashboard/new-dashboard.component';
import { NewEventsComponent } from './features/new-events/new-events.component';
import { NewEventDetailComponent } from './features/new-event-detail/new-event-detail.component';
import { SeatingChartComponent } from './features/seating-chart/seating-chart.component';
import { PasswordResetConfirmComponent } from './features/password-reset-confirm/password-reset-confirm.component';
import { PasswordResetComponent } from './features/password-reset/password-reset.component';
import { PublicInvitationComponent } from './features/public-invitation/public-invitation.component';
import { RegisterComponent } from './features/register/register.component';
import { NewContactComponent } from './features/new-contact/new-contact.component';
import { NewPlanComponent } from './features/new-plan/new-plan.component';
import { NewEventAccessComponent } from './features/new-event-access/new-event-access.component';
import { NewCheckInStaffComponent } from './features/new-check-in-staff/new-check-in-staff.component';
import { NewExternalEmbedComponent } from './features/new-external-embed/new-external-embed.component';
import { NewExternalPortalComponent } from './features/new-external-portal/new-external-portal.component';
import { NewPublicInvitationComponent } from './features/new-public-invitation/new-public-invitation.component';
import { NewInvitationSectionsComponent } from './features/new-invitation-sections/new-invitation-sections.component';
import { NewMemberInviteComponent } from './features/new-member-invite/new-member-invite.component';
import { NewPasswordResetComponent } from './features/new-password-reset/new-password-reset.component';
import { NewPasswordResetConfirmComponent } from './features/new-password-reset-confirm/new-password-reset-confirm.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'new/dashboard' },
  { path: 'login', redirectTo: 'new/login' },
  { path: 'register', redirectTo: 'new/register' },
  { path: 'password-reset', redirectTo: 'new/password-reset' },
  { path: 'password-reset/confirm', redirectTo: 'new/password-reset/confirm' },
  { path: 'contact', component: ContactComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'events', component: EventsComponent, canActivate: [AuthGuard] },
  { path: 'events/:id', component: EventDetailComponent, canActivate: [AuthGuard] },
  { path: 'invitations/:id/editor', component: InvitationEditorComponent, canActivate: [AuthGuard] },
  { path: 'check-in/:token', component: CheckInStaffComponent },
  { path: 'external-access/:token', component: EventAccessComponent },
  { path: 'i/:slug', component: NewPublicInvitationComponent },
  { path: 'e/:portalSlug', component: ExternalPortalComponent },
  { path: 'embed/:portalSlug/:widget', component: ExternalEmbedComponent },
  // ── New pages ──
  { path: 'new/login', component: NewLoginComponent },
  { path: 'new/register', component: NewRegisterComponent },
  { path: 'new/password-reset', component: NewPasswordResetComponent },
  { path: 'new/password-reset/confirm', component: NewPasswordResetConfirmComponent },
  { path: 'new/member-invite/:token', component: NewMemberInviteComponent },
  { path: 'new/dashboard', component: NewDashboardComponent, canActivate: [AuthGuard] },
  { path: 'new/events', component: NewEventsComponent, canActivate: [AuthGuard] },
  { path: 'new/events/:id', component: NewEventDetailComponent, canActivate: [AuthGuard] },
  { path: 'new/events/:id/seating', component: SeatingChartComponent, canActivate: [AuthGuard] },
  { path: 'new/contact', component: NewContactComponent, canActivate: [AuthGuard] },
  { path: 'new/plan', component: NewPlanComponent, canActivate: [AuthGuard] },
  { path: 'new/invitations/:id/editor', component: NewInvitationEditorComponent, canActivate: [AuthGuard] },
  { path: 'new/invitations/:id/sections', component: NewInvitationSectionsComponent, canActivate: [AuthGuard] },
  { path: 'new/external-access/:token', component: NewEventAccessComponent },
  { path: 'new/dj/:token', component: NewEventAccessComponent },
  { path: 'new/dj', component: NewEventAccessComponent },
  { path: 'new/check-in/:token', component: NewCheckInStaffComponent },
  { path: 'new/embed/:portalSlug/:widget', component: NewExternalEmbedComponent },
  { path: 'new/e/:portalSlug', component: NewExternalPortalComponent },
  { path: 'new/i/:slug', component: NewPublicInvitationComponent },
  { path: '**', redirectTo: 'new/dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
