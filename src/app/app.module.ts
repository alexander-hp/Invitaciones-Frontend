import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';

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
import { NewLoginComponent } from './features/new-login/new-login.component';
import { NewRegisterComponent } from './features/new-register/new-register.component';
import { NewDashboardComponent } from './features/new-dashboard/new-dashboard.component';
import { NewEventsComponent } from './features/new-events/new-events.component';
import { NewEventDetailComponent } from './features/new-event-detail/new-event-detail.component';

// Tab Subcomponents
import { EventInfoTabComponent } from './features/new-event-detail/tabs/info/event-info-tab.component';
import { EventGuestsTabComponent } from './features/new-event-detail/tabs/guests/event-guests-tab.component';
import { EventTablesTabComponent } from './features/new-event-detail/tabs/tables/event-tables-tab.component';
import { EventRsvpsTabComponent } from './features/new-event-detail/tabs/rsvps/event-rsvps-tab.component';
import { EventAlbumTabComponent } from './features/new-event-detail/tabs/album/event-album-tab.component';
import { EventCommunicationTabComponent } from './features/new-event-detail/tabs/communication/event-communication-tab.component';
import { EventDjTabComponent } from './features/new-event-detail/tabs/dj/event-dj-tab.component';
import { EventDedicationsTabComponent } from './features/new-event-detail/tabs/dedications/event-dedications-tab.component';
import { EventIntegrationTabComponent } from './features/new-event-detail/tabs/integration/event-integration-tab.component';
import { EventLogsTabComponent } from './features/new-event-detail/tabs/logs/event-logs-tab.component';

import { SeatingChartComponent } from './features/seating-chart/seating-chart.component';
import { PasswordResetConfirmComponent } from './features/password-reset-confirm/password-reset-confirm.component';
import { PasswordResetComponent } from './features/password-reset/password-reset.component';
import { NewPasswordResetComponent } from './features/new-password-reset/new-password-reset.component';
import { NewPasswordResetConfirmComponent } from './features/new-password-reset-confirm/new-password-reset-confirm.component';
import { PublicInvitationComponent } from './features/public-invitation/public-invitation.component';
import { RegisterComponent } from './features/register/register.component';
import { NewContactComponent } from './features/new-contact/new-contact.component';
import { NewSidebarComponent } from './features/new-sidebar/new-sidebar.component';
import { NewPlanComponent } from './features/new-plan/new-plan.component';
import { NewEventAccessComponent } from './features/new-event-access/new-event-access.component';
import { AccessDjViewComponent } from './features/new-event-access/views/access-dj-view.component';
import { AccessCheckinViewComponent } from './features/new-event-access/views/access-checkin-view.component';
import { AccessGuestopsViewComponent } from './features/new-event-access/views/access-guestops-view.component';
import { AccessClientViewComponent } from './features/new-event-access/views/access-client-view.component';
import { AccessAlbumViewComponent } from './features/new-event-access/views/access-album-view.component';
import { AccessPhotographerViewComponent } from './features/new-event-access/views/access-photographer-view.component';
import { AccessAlbumGalleryViewComponent } from './features/new-event-access/views/access-album-gallery-view.component';
import { AccessIntegrationApiViewComponent } from './features/new-event-access/views/access-integration-api-view.component';
import { NewCheckInStaffComponent } from './features/new-check-in-staff/new-check-in-staff.component';
import { NewExternalEmbedComponent } from './features/new-external-embed/new-external-embed.component';
import { NewExternalPortalComponent } from './features/new-external-portal/new-external-portal.component';
import { NewPublicInvitationComponent } from './features/new-public-invitation/new-public-invitation.component';
import { NewPublicInvitationClassicVerticalComponent } from './features/new-public-invitation/templates/classic-vertical/new-public-invitation-classic-vertical.component';
import { NewPublicInvitationEnvelopeCardsComponent } from './features/new-public-invitation/templates/envelope-cards/new-public-invitation-envelope-cards.component';
import { NewPublicInvitationTemplate3Component } from './features/new-public-invitation/templates/template-3/new-public-invitation-template3.component';
import { NewPublicInvitationBodaMobileFirstComponent } from './features/new-public-invitation/templates/boda-mobile-first/new-public-invitation-boda-mobile-first.component';
import { NewPublicInvitationBodaDesktopFirstComponent } from './features/new-public-invitation/templates/boda-desktop-first/new-public-invitation-boda-desktop-first.component';
import { NewPublicInvitationBodaCardsLateralComponent } from './features/new-public-invitation/templates/boda-cards-lateral/new-public-invitation-boda-cards-lateral.component';
import { NewPublicInvitationBodaCreativaPremiumComponent } from './features/new-public-invitation/templates/boda-creativa-premium/new-public-invitation-boda-creativa-premium.component';
import { NewPublicInvitationTemplateBodaComponent } from './features/new-public-invitation/templates/template-boda/new-public-invitation-template-boda.component';
import { NewPublicInvitationTemplateXvComponent } from './features/new-public-invitation/templates/template-xv/new-public-invitation-template-xv.component';
import { NewPublicInvitationTemplateGraduacionComponent } from './features/new-public-invitation/templates/template-graduacion/new-public-invitation-template-graduacion.component';
import { NewPublicInvitationTemplateCumpleanosComponent } from './features/new-public-invitation/templates/template-cumpleanos/new-public-invitation-template-cumpleanos.component';
import { NewPublicInvitationTemplateBautizoComponent } from './features/new-public-invitation/templates/template-bautizo/new-public-invitation-template-bautizo.component';
import { NewPublicInvitationTemplateOtroComponent } from './features/new-public-invitation/templates/template-otro/new-public-invitation-template-otro.component';
import { NewPublicInvitationMaisonDoreComponent } from './features/new-public-invitation/templates/maison-dore/new-public-invitation-maison-dore.component';
import { NewPublicInvitationBodaVillaPerleComponent } from './features/new-public-invitation/templates/template-boda-villa-perle/new-public-invitation-boda-villa-perle.component';
import { NewPublicInvitationBodaTeatroComponent } from './features/new-public-invitation/templates/template-boda-teatro/new-public-invitation-boda-teatro.component';
import { NewPublicInvitationBodaEleganzaComponent } from './features/new-public-invitation/templates/template-boda-eleganza/new-public-invitation-boda-eleganza.component';
import { NewPublicInvitationBodaRosasComponent } from './features/new-public-invitation/templates/template-boda-rosas/new-public-invitation-boda-rosas.component';
import { NewPublicInvitationBodaGirasolesComponent } from './features/new-public-invitation/templates/template-boda-girasoles/new-public-invitation-boda-girasoles.component';
import { NewPublicInvitationBodaNavyBlueComponent } from './features/new-public-invitation/templates/template-boda-navy-blue/new-public-invitation-boda-navy-blue.component';
import { NewCustomTemplatesComponent } from './features/new-custom-templates/new-custom-templates.component';
import { NewInvitationSectionsComponent } from './features/new-invitation-sections/new-invitation-sections.component';
import { NewMemberInviteComponent } from './features/new-member-invite/new-member-invite.component';
import { NewUserGuideComponent } from './features/new-user-guide/new-user-guide.component';
import { DocumentationComponent } from './features/documentation/documentation.component';
import { UnauthorizedComponent } from './features/unauthorized/unauthorized.component';
import { EditorContentTabComponent } from './features/new-invitation-editor/tabs/content/editor-content-tab.component';
import { EditorStyleTabComponent } from './features/new-invitation-editor/tabs/style/editor-style-tab.component';
import { EditorItineraryTabComponent } from './features/new-invitation-editor/tabs/itinerary/editor-itinerary-tab.component';
import { EditorLocationsTabComponent } from './features/new-invitation-editor/tabs/locations/editor-locations-tab.component';
import { EditorRsvpRulesTabComponent } from './features/new-invitation-editor/tabs/rsvp-rules/editor-rsvp-rules-tab.component';
import { EditorGiftsTabComponent } from './features/new-invitation-editor/tabs/gifts/editor-gifts-tab.component';
import { EditorDedicationsTabComponent } from './features/new-invitation-editor/tabs/dedications/editor-dedications-tab.component';
import { EditorAssetsTabComponent } from './features/new-invitation-editor/tabs/assets/editor-assets-tab.component';
import { EditorPlansTabComponent } from './features/new-invitation-editor/tabs/plans/editor-plans-tab.component';
import { AiTemplateWizardModalComponent } from './features/new-invitation-editor/modals/ai-template-wizard-modal/ai-template-wizard-modal.component';
import { VisualTemplateTextEditorModalComponent } from './features/new-invitation-editor/modals/visual-template-text-editor-modal/visual-template-text-editor-modal.component';
import { VisualTemplateCustomizerModalComponent } from './features/new-invitation-editor/modals/visual-template-customizer-modal/visual-template-customizer-modal.component';

import { ConfirmDialogComponent } from './core/confirm-dialog/confirm-dialog.component';
import { QrScannerModalComponent } from './core/qr-scanner-modal/qr-scanner-modal.component';
import { EventHeaderComponent } from './core/event-header/event-header.component';
import { EventBookWidgetComponent } from './shared/components/event-book-widget/event-book-widget.component';
import { ImageDropzoneComponent } from './shared/components/image-dropzone/image-dropzone.component';
import { VisualInvitationEditorComponent } from './features/visual-invitation-editor/visual-invitation-editor.component';
import { VisualInvitationRendererComponent } from './shared/components/visual-invitation-renderer/visual-invitation-renderer.component';

@NgModule({
  declarations: [
    AppComponent,
    ConfirmDialogComponent,
    QrScannerModalComponent,
    EventHeaderComponent,
    EventBookWidgetComponent,
    ImageDropzoneComponent,
    VisualInvitationEditorComponent,
    VisualInvitationRendererComponent,
    DocumentationComponent,
    UnauthorizedComponent,
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
    EditorContentTabComponent,
    EditorStyleTabComponent,
    EditorItineraryTabComponent,
    EditorLocationsTabComponent,
    EditorRsvpRulesTabComponent,
    EditorGiftsTabComponent,
    EditorDedicationsTabComponent,
    EditorAssetsTabComponent,
    EditorPlansTabComponent,
    AiTemplateWizardModalComponent,
    VisualTemplateTextEditorModalComponent,
    VisualTemplateCustomizerModalComponent,
    NewInvitationSectionsComponent,
    NewMemberInviteComponent,
    NewUserGuideComponent,
    NewCustomTemplatesComponent,
    LoginComponent,
    NewLoginComponent,
    NewRegisterComponent,
    NewDashboardComponent,
    NewEventsComponent,
    NewEventDetailComponent,
    EventInfoTabComponent,
    EventGuestsTabComponent,
    EventTablesTabComponent,
    EventRsvpsTabComponent,
    EventAlbumTabComponent,
    EventCommunicationTabComponent,
    EventDjTabComponent,
    EventDedicationsTabComponent,
    EventIntegrationTabComponent,
    EventLogsTabComponent,
    SeatingChartComponent,
    PasswordResetConfirmComponent,
    PasswordResetComponent,
    NewPasswordResetComponent,
    NewPasswordResetConfirmComponent,
    PublicInvitationComponent,
    NewPublicInvitationComponent,
    NewPublicInvitationClassicVerticalComponent,
    NewPublicInvitationEnvelopeCardsComponent,
    NewPublicInvitationTemplate3Component,
    NewPublicInvitationBodaMobileFirstComponent,
    NewPublicInvitationBodaDesktopFirstComponent,
    NewPublicInvitationBodaCardsLateralComponent,
    NewPublicInvitationBodaCreativaPremiumComponent,
    NewPublicInvitationTemplateBodaComponent,
    NewPublicInvitationTemplateXvComponent,
    NewPublicInvitationTemplateGraduacionComponent,
    NewPublicInvitationTemplateCumpleanosComponent,
    NewPublicInvitationTemplateBautizoComponent,
    NewPublicInvitationTemplateOtroComponent,
    NewPublicInvitationMaisonDoreComponent,
    NewPublicInvitationBodaVillaPerleComponent,
    NewPublicInvitationBodaTeatroComponent,
    NewPublicInvitationBodaEleganzaComponent,
    NewPublicInvitationBodaRosasComponent,
    NewPublicInvitationBodaGirasolesComponent,
    NewPublicInvitationBodaNavyBlueComponent,
    RegisterComponent,
    NewContactComponent,
    NewSidebarComponent,
    NewPlanComponent,
    NewEventAccessComponent,
    AccessDjViewComponent,
    AccessCheckinViewComponent,
    AccessGuestopsViewComponent,
    AccessClientViewComponent,
    AccessAlbumViewComponent,
    AccessPhotographerViewComponent,
    AccessAlbumGalleryViewComponent,
    AccessIntegrationApiViewComponent,
    NewCheckInStaffComponent,
    NewExternalEmbedComponent,
    NewExternalPortalComponent
  ],
  imports: [BrowserModule, AppRoutingModule, HttpClientModule, FormsModule, ReactiveFormsModule, DragDropModule],
  providers: [{ provide: HTTP_INTERCEPTORS, useClass: AuthTokenInterceptor, multi: true }],
  bootstrap: [AppComponent]
})
export class AppModule { }
