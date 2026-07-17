import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthTokenInterceptor } from './core/auth-token.interceptor';
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
import { NewDashboardComponent } from './features/new-dashboard/new-dashboard.component';
import { NewEventsComponent } from './features/new-events/new-events.component';
import { NewEventDetailComponent } from './features/new-event-detail/new-event-detail.component';
import { SeatingChartComponent } from './features/seating-chart/seating-chart.component';
import { PasswordResetConfirmComponent } from './features/password-reset-confirm/password-reset-confirm.component';
import { PasswordResetComponent } from './features/password-reset/password-reset.component';
import { PublicInvitationComponent } from './features/public-invitation/public-invitation.component';
import { RegisterComponent } from './features/register/register.component';
import { NewContactComponent } from './features/new-contact/new-contact.component';
import { NewSidebarComponent } from './features/new-sidebar/new-sidebar.component';
import { NewPlanComponent } from './features/new-plan/new-plan.component';
import { NewEventAccessComponent } from './features/new-event-access/new-event-access.component';
import { NewCheckInStaffComponent } from './features/new-check-in-staff/new-check-in-staff.component';

@NgModule({
  declarations: [
    AppComponent,
    CheckInStaffComponent,
    ContactComponent,
    DashboardComponent,
    EventAccessComponent,
    EventDetailComponent,
    EventsComponent,
    ExternalEmbedComponent,
    ExternalPortalComponent,
    InvitationEditorComponent,
    NewInvitationEditorComponent,
    LoginComponent,
    NewDashboardComponent,
    NewEventsComponent,
    NewEventDetailComponent,
    SeatingChartComponent,
    PasswordResetConfirmComponent,
    PasswordResetComponent,
    PublicInvitationComponent,
    RegisterComponent,
    NewContactComponent,
    NewSidebarComponent,
    NewPlanComponent,
    NewEventAccessComponent,
    NewCheckInStaffComponent
  ],
  imports: [BrowserModule, AppRoutingModule, HttpClientModule, FormsModule, ReactiveFormsModule],
  providers: [{ provide: HTTP_INTERCEPTORS, useClass: AuthTokenInterceptor, multi: true }],
  bootstrap: [AppComponent]
})
export class AppModule {}
