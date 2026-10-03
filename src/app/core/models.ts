export type EventType = 'boda' | 'xv' | 'graduacion' | 'cumpleanos' | 'bautizo' | 'otro';
export type EventMode = 'invitation' | 'external_dashboard';
export type EventStatus = 'draft' | 'published' | 'archived';
export type InvitationStatus = 'draft' | 'published' | 'unpublished';
export type RsvpResponse = 'confirmed' | 'declined' | 'maybe';
export type InvitationAccessMode = 'open' | 'public' | 'guest_list' | 'specific_users';
export type UserRole = 'client' | 'organizer' | 'venue_owner' | 'vendor' | 'admin';
export type AccountType = 'client' | 'organizer' | 'venue_owner' | 'vendor' | 'planner' | 'staff';
export type AuthProvider = 'password' | 'google' | 'facebook' | 'apple';
export type EventMemberRole = 'owner' | 'organizer' | 'client' | 'venue_owner' | 'vendor' | 'staff' | 'dj' | 'photographer';
export type EventMemberStatus = 'invited' | 'active' | 'disabled';
export type EventPermission =
  'view_event' | 'edit_event' | 'view_metrics' | 'manage_guests' | 'manage_tables' |
  'check_in' | 'review_album' | 'review_dedications' | 'manage_songs' | 'view_payments';

export interface User {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  accountType?: AccountType;
  avatarUrl?: string;
  authProviders?: AuthProvider[];
  plan?: PaymentPackage | 'basic' | 'premium' | 'organizer';
  subscriptionPlan?: PaymentPackage;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionCurrentPeriodEnd?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface SocialLoginPayload {
  provider: Exclude<AuthProvider, 'password'>;
  idToken?: string;
  accessToken?: string;
  profile?: {
    email: string;
    name?: string;
    providerUserId?: string;
    avatarUrl?: string;
  };
  role?: Exclude<UserRole, 'admin'>;
  accountType?: AccountType;
}

export interface MessageResponse {
  message: string;
}

export interface ContactPayload {
  name: string;
  email: string;
  message: string;
}

export interface DashboardMetrics {
  events: number;
  invitations: number;
  guests: number;
  confirmed: number;
  declined: number;
  pending: number;
  companions: number;
  emailSent?: number;
  whatsappSent?: number;
  opened?: number;
  failed?: number;
  checkedIn?: number;
}

export interface EventAgendaItem {
  time: string;
  title: string;
  description?: string;
}

export interface InvitationLocation {
  type?: string;
  name?: string;
  address?: string;
  mapUrl?: string;
  wazeUrl?: string;
  notes?: string;
  lat?: number;
  lon?: number;
  phone?: string;
  websiteUrl?: string;
  schedule?: string[];
  parking?: string;
  transport?: string;
  accessibility?: string;
  priority?: number;
  time?: string;
}

export interface PlaceSearchResult extends InvitationLocation {
  provider: 'google' | 'openstreetmap';
  externalId?: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  mapUrl: string;
  wazeUrl: string;
}

export interface EventModel {
  _id?: string;
  id?: string;
  mode?: EventMode;
  externalSiteUrl?: string;
  externalSiteLabel?: string;
  externalPortalSlug?: string;
  externalPortalEnabled?: boolean;
  externalPortalSettings?: ExternalPortalSettings;
  externalContent?: ExternalContent;
  type: EventType;
  title: string;
  hosts: string[];
  date: string;
  time?: string;
  venue: {
    name?: string;
    address?: string;
    mapUrl?: string;
    width?: number;
    height?: number;
  };
  agenda?: EventAgendaItem[];
  plan?: PaymentPackage | 'basic' | 'premium' | 'organizer';
  planActivatedAt?: string;
  status: EventStatus;
  access?: { owner: boolean; role?: EventMemberRole; permissions: EventPermission[] };
  createdAt?: string;
  updatedAt?: string;
}

export interface EventMemberModel {
  _id?: string;
  id?: string;
  user?: Partial<User> | string;
  email: string;
  name?: string;
  role: EventMemberRole;
  permissions: EventPermission[];
  status: EventMemberStatus;
  invitedAt?: string;
  inviteTokenExpiresAt?: string;
  inviteEmailSentAt?: string;
  acceptedAt?: string;
  lastUsedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EventMemberPayload {
  email: string;
  name?: string;
  role: EventMemberRole;
  permissions?: EventPermission[];
}

export interface EventPayload {
  mode?: EventMode;
  externalSiteUrl?: string;
  externalSiteLabel?: string;
  externalPortalSlug?: string;
  externalPortalEnabled?: boolean;
  externalPortalSettings?: ExternalPortalSettings;
  externalContent?: ExternalContent;
  type: EventType;
  title: string;
  hosts?: string[];
  date: string;
  time?: string;
  venue?: {
    name?: string;
    address?: string;
    mapUrl?: string;
    width?: number;
    height?: number;
  };
  agenda?: EventAgendaItem[];
  status?: EventStatus;
}

export interface ExternalPortalSettings {
  rsvpEnabled?: boolean;
  albumEnabled?: boolean;
  passEnabled?: boolean;
  calendarEnabled?: boolean;
  showLocation?: boolean;
  brandLabel?: string;
  welcomeMessage?: string;
}

export interface SectionSettings {
  story?: boolean;
  locations?: boolean;
  itinerary?: boolean;
  dressCode?: boolean;
  rsvp?: boolean;
  giftRegistry?: boolean;
  digitalEnvelope?: boolean;
  lodging?: boolean;
  gallery?: boolean;
  guestAlbum?: boolean;
  dedications?: boolean;
  backgroundMusic?: boolean;
  songRequests?: boolean;
}

export interface SongRequestSettings {
  enabled?: boolean;
  maxRequestsPerGuest?: number;
  allowDedications?: boolean;
  requireApproval?: boolean;
}

export interface ExternalContent {
  coverImageUrl?: string;
  heroImageUrl?: string;
  gallery?: string[];
  carousel?: string[];
  spectacularImages?: string[];
  musicUrl?: string;
  musicSettings?: MusicPlaybackSettings;
  audioSections?: Array<{ title?: string; url: string; description?: string }>;
  sectionMusic?: SectionMusicSettings;
  sectionMusicCues?: SectionMusicCueSettings;
  locations?: InvitationLocation[];
  sections?: Array<{
    key?: string;
    type?: 'text' | 'image' | 'video' | 'cta' | 'iframe' | 'timeline' | 'story' | 'dress_code' | 'gift_registry' | 'dedications' | 'lodging' | 'faq' | 'people';
    title?: string;
    body?: string;
    url?: string;
    imageUrl?: string;
    roles?: string[];
    order?: number;
  }>;
  rsvpSettings?: RsvpSettings;
  songRequestSettings?: SongRequestSettings;
  moderationSettings?: {
    notifyOnReview?: boolean;
    autoApproveRoles?: string[];
    autoApproveGroups?: string[];
    autoApproveEmails?: string[];
    autoApprovePhones?: string[];
    autoApproveAlbum?: boolean;
    autoApproveSongs?: boolean;
    autoApproveDedications?: boolean;
  };
  giftRegistry?: GiftRegistryItem[];
  digitalEnvelope?: DigitalEnvelope;
  giftSettings?: GiftSettings;
  dedicationSettings?: DedicationSettings;
}

export interface SectionMusicSettings {
  global?: string;
  rsvp?: string;
  dressCode?: string;
  locations?: string;
  gallery?: string;
  gifts?: string;
  dedications?: string;
  lodging?: string;
  itinerary?: string;
  [key: string]: string | undefined;
}

export interface MusicCueSettings {
  startSeconds?: number;
  endSeconds?: number;
  volume?: number;
  loop?: boolean;
}

export interface MusicPlaybackSettings extends MusicCueSettings {
  playbackMode?: 'manual' | 'first_interaction' | 'after_access';
  sectionChangeMode?: 'automatic' | 'manual';
}

export interface SectionMusicCueSettings {
  [key: string]: MusicCueSettings | undefined;
}

export interface InvitationModerationSettings {
  notifyOnReview?: boolean;
  autoApproveRoles?: string[];
  autoApproveGroups?: string[];
  autoApproveEmails?: string[];
  autoApprovePhones?: string[];
  autoApproveAlbum?: boolean;
  autoApproveSongs?: boolean;
  autoApproveDedications?: boolean;
}

export interface InvitationGalleryItem {
  id?: string;
  url: string;
  featured?: boolean;
  title?: string;
  description?: string;
  dedication?: string;
  alt?: string;
  fit?: 'cover' | 'contain';
  focalX?: number;
  focalY?: number;
}

export interface InvitationGallerySettings {
  displayMode?: 'grid' | 'list' | 'carousel';
  showCaptions?: boolean;
  autoplay?: boolean;
  intervalSeconds?: number;
}

export interface InvitationLodgingItem {
  name?: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  address?: string;
  phone?: string;
  mapUrl?: string;
  wazeUrl?: string;
  websiteUrl?: string;
  schedule?: string[];
  lat?: number;
  lon?: number;
  agreementLabel?: string;
  discountCode?: string;
  discountDescription?: string;
  priceLabel?: string;
  services?: string[];
  notes?: string;
  priority?: number;
}

export type VisualLayerType = 'text' | 'image' | 'video' | 'audio' | 'button' | 'shape' | 'field';

export interface VisualInvitationLayerStyle {
  color?: string;
  backgroundColor?: string;
  backgroundImageUrl?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  fontStyle?: 'normal' | 'italic';
  textAlign?: string;
  borderRadius?: number;
  opacity?: number;
  objectFit?: 'cover' | 'contain';
  objectPositionX?: number;
  objectPositionY?: number;
  imageScale?: number;
  preserveAspectRatio?: boolean;
  imageRotation?: number;
  flipX?: boolean;
  flipY?: boolean;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  blur?: number;
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textDecoration?: 'none' | 'underline' | 'line-through';
  textShadow?: string;
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  boxShadow?: string;
  padding?: number;
  gradientEnabled?: boolean;
  gradientStart?: string;
  gradientEnd?: string;
  gradientAngle?: number;
  imageMask?: 'none' | 'circle' | 'rounded' | 'arch' | 'diamond' | 'hexagon' | 'ticket';
  frameEnabled?: boolean;
  shapeKind?: 'rectangle' | 'circle' | 'ellipse' | 'triangle' | 'diamond' | 'star' | 'hexagon' | 'line';
  controlVariant?: 'default' | 'cards';
  controlShape?: 'rectangle' | 'pill' | 'cloud' | 'notebook';
  showPlaceholder?: boolean;
  buttonVariant?: 'solid' | 'outline' | 'soft' | 'text' | 'glass';
  buttonIcon?: string;
  buttonIconPosition?: 'before' | 'after';
  hoverBackgroundColor?: string;
  hoverColor?: string;
  pressedScale?: number;
  iconName?: string;
  iconStrokeWidth?: number;
  iconFilled?: boolean;
  audioPresentation?: 'native' | 'button';
  audioPosition?: 'inline' | 'fixed';
  audioCorner?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  audioShape?: 'circle' | 'rounded' | 'pill';
  audioVariant?: 'solid' | 'outline' | 'ghost';
  audioIcon?: 'play' | 'note';
  audioShowIcon?: boolean;
  audioShowLabel?: boolean;
  audioAutoplay?: boolean;
  audioLoop?: boolean;
  audioVolume?: number;
  audioStartSeconds?: number;
  audioEndSeconds?: number;
  audioSize?: number;
  audioOffset?: number;
}

export interface VisualInvitationLayerLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export interface VisualInvitationLayer {
  id: string;
  groupId?: string;
  type: VisualLayerType;
  name?: string;
  text?: string;
  placeholder?: string;
  url?: string;
  binding?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex?: number;
  locked?: boolean;
  hidden?: boolean;
  animation?: {
    type: 'none' | 'fade' | 'slide-up' | 'slide-left' | 'slide-right' | 'zoom' | 'float' | 'pulse' | 'bounce';
    duration?: number;
    delay?: number;
    repeat?: boolean;
  };
  layouts?: Partial<Record<'mobile' | 'tablet' | 'desktop', VisualInvitationLayerLayout>>;
  style?: VisualInvitationLayerStyle;
}

export interface VisualInvitationAsset {
  id: string;
  url: string;
  type: 'image' | 'video' | 'audio';
  name: string;
  attribution?: string;
  attributionUrl?: string;
  sourceUrl?: string;
  createdAt?: string;
}

export interface WebImageSearchResult {
  id: string;
  thumbUrl: string;
  url: string;
  width?: number;
  height?: number;
  color?: string;
  alt?: string;
  photographer: string;
  photographerUrl: string;
  sourceUrl: string;
  downloadLocation: string;
}

export interface VisualPluginPartDesign {
  label?: string;
  placeholder?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  backgroundColor?: string;
  backgroundImageUrl?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
  textAlign?: 'left' | 'center' | 'right';
  boxShadow?: string;
  shape?: 'rectangle' | 'pill' | 'cloud' | 'notebook';
  variant?: 'default' | 'cards';
  hidden?: boolean;
}

export interface VisualPluginDesign {
  layout?: 'flow' | 'free';
  minHeight?: number;
  parts?: Record<string, VisualPluginPartDesign>;
}

export interface VisualInvitationSection {
  id: string;
  type: string;
  title?: string;
  enabled: boolean;
  layout: 'flow' | 'canvas';
  height: number;
  background?: {
    color?: string;
    imageUrl?: string;
    overlay?: number;
  };
  moduleStyle?: {
    layout?: 'list' | 'grid';
    columns?: 1 | 2 | 3;
    alignment?: 'left' | 'center';
    surface?: 'transparent' | 'solid' | 'soft';
    cardStyle?: 'none' | 'bordered' | 'elevated';
    gap?: number;
    showTitle?: boolean;
  };
  pluginSettings?: Record<string, string | number | boolean>;
  pluginDesign?: VisualPluginDesign;
  layers: VisualInvitationLayer[];
}

export interface VisualInvitationDesign {
  version: number;
  active: boolean;
  mode: 'easy' | 'advanced';
  presentationMode?: 'continuous' | 'chapters';
  responsiveMode?: 'shared' | 'independent';
  theme?: {
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    headingFont: string;
    bodyFont: string;
    buttonBackgroundColor: string;
    buttonTextColor: string;
    buttonStyle: 'solid' | 'outline' | 'soft';
    buttonRadius: number;
  };
  assets?: VisualInvitationAsset[];
  sections: VisualInvitationSection[];
}

export interface VisualDesignTemplateModel {
  _id: string;
  name: string;
  eventType?: string;
  description?: string;
  previewImageUrl?: string;
  design: VisualInvitationDesign;
  createdAt?: string;
  updatedAt?: string;
}

export interface VisualDesignTemplatePayload {
  name: string;
  eventType?: string;
  description?: string;
  previewImageUrl?: string;
  design: VisualInvitationDesign;
}

export interface VisualDesignRevisionModel {
  _id: string;
  label: string;
  design: VisualInvitationDesign;
  createdAt: string;
  updatedAt?: string;
}

export interface InvitationContent {
  headline?: string;
  subheadline?: string;
  message?: string;
  palette?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  musicUrl?: string;
  musicSettings?: MusicPlaybackSettings;
  sectionMusic?: SectionMusicSettings;
  sectionMusicCues?: SectionMusicCueSettings;
  coverImageUrl?: string;
  gallery?: string[];
  galleryItems?: InvitationGalleryItem[];
  gallerySettings?: InvitationGallerySettings;
  itinerary?: Array<{ time?: string; title?: string; description?: string; icon?: string; locationLabel?: string; locationUrl?: string }>;
  locations?: InvitationLocation[];
  dressCode?: string;
  dressCodeDescription?: string;
  dressCodeImageUrl?: string;
  dressCodeOptions?: Array<{ title?: string; description?: string; color?: string }>;
  dressCodeWomen?: string;
  dressCodeMen?: string;
  dressCodeOption1?: string;
  dressCodeOption2?: string;
  giftRegistry?: GiftRegistryItem[];
  digitalEnvelope?: DigitalEnvelope;
  giftSettings?: GiftSettings;
  dedicationSettings?: DedicationSettings;
  songRequestSettings?: SongRequestSettings;
  moderationSettings?: InvitationModerationSettings;
  sectionSettings?: SectionSettings;
  brandLogoUrl?: string;
  brandMonogramUrl?: string;
  passLogoUrl?: string;
  hideBranding?: boolean;
  lodging?: InvitationLodgingItem[];
  storyTitle?: string;
  storyBody?: string;
  template?: string;
  customHtml?: string;
  customCss?: string;
  customPageApproved?: boolean;
  privateAlbum?: string[];
  privateAlbumEnabled?: boolean;
  visualDesign?: VisualInvitationDesign;
  visualDesignDraft?: VisualInvitationDesign;
  editedTexts?: Record<string, string>;
  sourceTemplateKey?: string;
  activeCustomTemplateId?: string;
}

export interface CustomTemplateSubmission {
  id: string;
  _id?: string;
  eventId?: string;
  eventTitle?: string;
  eventSlug?: string;
  eventType?: EventType;
  invitationId?: string;
  name: string;
  description?: string;
  htmlCode: string;
  cssCode: string;
  authorName?: string;
  authorEmail?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  score?: number;
  submittedAt: string;
  reviewedAt?: string;
  adminFeedback?: string;
  publicUrl?: string;
  sourceTemplateKey?: string;
  editedTexts?: Record<string, string>;
}

export interface AiTemplateGenerateRequest {
  eventId?: string;
  style: string;
  palette?: { primary?: string; secondary?: string; accent?: string };
  vibe?: string;
  sections?: string[];
  customPrompt?: string;
}

export interface AiTemplateRefineRequest {
  currentHtml: string;
  currentCss?: string;
  userFeedback: string;
  eventId?: string;
}

export interface AiTemplateResult {
  name: string;
  description: string;
  html: string;
  css: string;
  features?: string[];
  rawResponse?: string;
}

export interface AiTemplateResponse {
  success: boolean;
  template: AiTemplateResult;
  message?: string;
  rawResponse?: string;
}

export interface AiTemplatePromptPreviewResponse {
  success: boolean;
  isPreview: boolean;
  promptPreview: {
    systemInstruction: string;
    userPrompt: string;
  };
  message?: string;
}

export interface RsvpSettings {
  deadline?: string;
  allowMaybe?: boolean;
  allowChangesUntilDeadline?: boolean;
  declineRequiresConfirmation?: boolean;
  reminderDaysBeforeDeadline?: number;
  identityMethods?: Array<'email' | 'phone'>;
  allowCompanionsDefault?: boolean;
  defaultAllowedCompanions?: number;
  maxAttendees?: number;
  allowedGuestIds?: string[];
  allowedRoles?: string[];
  allowedGroups?: string[];
  allowedEmails?: string[];
  allowedPhones?: string[];
  customQuestions?: RsvpCustomQuestion[];
}

export type InvitationSectionSettings = SectionSettings;

export interface RsvpCustomQuestion {
  key?: string;
  label: string;
  type?: 'text' | 'textarea' | 'select' | 'boolean';
  required?: boolean;
  options?: string[];
}

export interface InvitationModel {
  _id?: string;
  id?: string;
  owner?: string;
  event: string | EventModel;
  template?: string;
  slug: string;
  accessMode?: InvitationAccessMode;
  rsvpSettings?: RsvpSettings;
  status: InvitationStatus;
  content: InvitationContent;
  publishedContent?: InvitationContent;
  premiumLocked?: boolean;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InvitationPayload {
  event: string;
  template?: string;
  slug?: string;
  accessMode?: InvitationAccessMode;
  rsvpSettings?: RsvpSettings;
  content?: InvitationContent;
}

export interface RsvpPayload {
  guest?: string;
  name: string;
  email?: string;
  response: RsvpResponse;
  companions?: number;
  companionNames?: string[];
  dietaryRestrictions?: string;
  mealPreference?: string;
  menuSelection?: string;
  customAnswers?: Array<{ key: string; label?: string; value?: string | number | boolean | null }>;
  message?: string;
  declineConfirmed?: boolean;
  phone?: string;
  phoneCountryCode?: string;
  phoneNationalNumber?: string;
}

export interface RsvpModel extends RsvpPayload {
  _id?: string;
  id?: string;
  invitation: string;
  event: string;
  attendingCount?: number;
  phoneE164?: string;
  phoneVerified?: boolean;
  phoneVerificationStatus?: 'not_started' | 'pending' | 'verified' | 'failed';
  updatedAt?: string;
  createdAt?: string;
}

export type GuestStatus = 'pending' | 'confirmed' | 'declined';
export type GuestCommunicationStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'opened' | 'failed' | 'confirmed';
export type GuestMessageType = 'invitation' | 'reminder' | 'event_reminder' | 'location_change' | 'thanks';
export type GuestMessageChannel = 'whatsapp' | 'email';
export type WhatsAppProvider = 'disabled' | 'meta' | 'openwa';
export type WhatsAppMediaType = 'image' | 'video' | 'audio' | 'document';

export interface WhatsAppMediaPayload {
  type: WhatsAppMediaType;
  url?: string;
  base64?: string;
  mimetype?: string;
  filename?: string;
  caption?: string;
}

export interface WhatsAppMediaAssetModel {
  _id?: string;
  id?: string;
  event: string;
  key: string;
  url: string;
  type: WhatsAppMediaType;
  fileName: string;
  mimetype?: string;
  size?: number;
  caption?: string;
  createdAt?: string;
}

export interface WhatsAppMediaInspection {
  url: string;
  type: WhatsAppMediaType;
  mimetype: string;
  filename: string;
  size?: number;
  previewKind: WhatsAppMediaType | 'document';
  previewUrl: string;
  warnings: string[];
}

export interface GuestModel {
  _id?: string;
  id?: string;
  event: string;
  name: string;
  email?: string;
  phone?: string;
  group?: string;
  roles?: string[];
  tags?: string[];
  relationshipLabel?: string;
  visibilityGroup?: string;
  tableName?: string;
  seatLabel?: string;
  companions?: GuestCompanion[];
  allowedCompanions: number;
  invitationToken?: string;
  personalizedLinkGeneratedAt?: string;
  invitationOpenedAt?: string;
  lastLinkCopiedAt?: string;
  qrCode?: string;
  checkInCode?: string;
  checkedIn?: boolean;
  checkedInAt?: string;
  status: GuestStatus;
  communicationStatus?: GuestCommunicationStatus;
  lastMessageType?: GuestMessageType;
  lastMessageChannel?: GuestMessageChannel;
  lastMessageSentAt?: string;
  lastMessageError?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WhatsAppStatusResponse {
  provider: WhatsAppProvider;
  fallbackProvider?: WhatsAppProvider | '';
  enabled: boolean;
  fallbackEnabled?: boolean;
  openWaConfigured?: boolean;
  metaConfigured?: boolean;
  openWaSession?: {
    configured: boolean;
    ready: boolean;
    status: string;
    phone?: string;
    pushName?: string;
    error?: string;
  };
}

export interface WhatsAppSendResponse {
  guest: GuestModel;
  provider: WhatsAppProvider;
  status: 'pending' | 'skipped' | 'sent' | 'delivered' | 'read' | 'failed';
  manualText?: string;
  messageLog?: {
    _id?: string;
    id?: string;
    status: string;
    provider: WhatsAppProvider;
    messageId?: string;
  };
}

export interface WhatsAppBulkResponse {
  provider: WhatsAppProvider;
  requested: number;
  sent: number;
  skipped: number;
  failed: number;
  results: Array<{ guest: string; status: string; provider?: WhatsAppProvider; error?: string }>;
}

export interface EmailSendResponse {
  guest: GuestModel;
  status: 'sent' | 'failed';
}

export interface EmailBulkResponse {
  requested: number;
  sent: number;
  skipped: number;
  failed: number;
  results: Array<{ guest: string; status: string; error?: string }>;
}

export interface GuestPayload {
  event: string;
  name: string;
  email?: string;
  phone?: string;
  group?: string;
  roles?: string[];
  tags?: string[];
  relationshipLabel?: string;
  visibilityGroup?: string;
  tableName?: string;
  seatLabel?: string;
  companions?: GuestCompanion[];
  allowedCompanions?: number;
  checkedIn?: boolean;
  checkedInAt?: string;
}

export interface GuestCompanion {
  name?: string;
  tableName?: string;
  seatLabel?: string;
  checkedIn?: boolean;
  checkedInAt?: string;
  dietaryRestrictions?: string;
  confirmed?: boolean;
}

export type TemplateTier = 'free' | 'premium';

export interface TemplateModel {
  _id?: string;
  id?: string;
  key?: string;
  name: string;
  eventType: EventType;
  tier: TemplateTier;
  previewImageUrl?: string;
  config?: {
    palette?: {
      primary?: string;
      secondary?: string;
      accent?: string;
    };
    layout?: string;
    [key: string]: unknown;
  };
  active: boolean;
}

export interface GuestAccessResponse {
  guest: {
    id: string;
    name: string;
    email?: string;
    group?: string;
    roles?: string[];
    tags?: string[];
    relationshipLabel?: string;
    visibilityGroup?: string;
    allowedCompanions: number;
    status: GuestStatus;
    checkInCode?: string;
    qrCode?: string;
    tableName?: string;
    seatLabel?: string;
    companions?: GuestCompanion[];
  };
  guestSessionToken?: string;
}

export type SongRequestStatus = 'pending' | 'approved' | 'rejected' | 'played';
export type SongRequestPriority = 'high' | 'normal';
export type SongPromotionTarget = 'global' | 'hero' | 'story' | 'locations' | 'itinerary' | 'dressCode' | 'rsvp' | 'giftRegistry' | 'digitalEnvelope' | 'lodging' | 'gallery' | 'guestAlbum' | 'dedications' | 'songRequests';

export interface SongPromotionPayload {
  invitationId: string;
  target: SongPromotionTarget;
  startSeconds?: number;
  endSeconds?: number;
  volume?: number;
  loop?: boolean;
}

export interface SongRequestModel {
  _id?: string;
  id?: string;
  event: string;
  guest?: string | Partial<GuestModel>;
  requesterName?: string;
  requesterEmail?: string;
  title: string;
  artist?: string;
  dedication?: string;
  sourceProvider?: 'manual' | 'spotify' | 'youtube' | 'url';
  sourceUrl?: string;
  externalId?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  durationMs?: number;
  sortOrder?: number;
  priority?: SongRequestPriority;
  prioritySource?: 'auto' | 'manual';
  priorityReason?: string;
  queuePosition?: number;
  status: SongRequestStatus;
  reviewedAt?: string;
  playedAt?: string;
  promotedAt?: string;
  promotedBy?: string;
  promotedInvitation?: string;
  promotedTarget?: SongPromotionTarget;
  createdAt?: string;
  updatedAt?: string;
}

export interface ImportGuestsResponse {
  created?: number;
  updated?: number;
  skipped?: number;
  errors?: number;
  imported: number;
  invalidRows: number;
  duplicateRows?: number;
  duplicates?: Array<{
    row: number;
    field: 'email' | 'phone' | 'plan';
    value: string;
    guestName: string;
  }>;
  guests: GuestModel[];
}

export interface UploadUrlResponse {
  key: string;
  uploadUrl: string;
  publicUrl: string;
}

export type AssetFolder = 'covers' | 'gallery' | 'music' | 'assets' | 'whatsapp-media';
export type PaymentPackage = 'free' | 'event' | 'pro' | 'event_12m' | 'external_dashboard_12m' | 'planner_pro_monthly' | 'planner_pro_yearly';
export type BillingType = 'free' | 'one_time' | 'subscription';
export type PlanScope = 'event' | 'account';
export type SubscriptionStatus = 'inactive' | 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete';

export interface PlanDefinition {
  key: PaymentPackage;
  name: string;
  amount: number;
  billingType?: BillingType;
  scope?: PlanScope;
  billingCycle?: 'monthly' | 'yearly';
  durationMonths?: number;
  stripePackage?: string | null;
  stripePriceEnv?: string | null;
  limits: {
    guests: number;
    galleryImages: number;
    music: boolean;
    premiumTemplates: boolean;
    exportData: boolean;
    whatsappMessaging: boolean;
    whatsappBulk: boolean;
    whatsappMedia: boolean;
    checkIn: boolean;
    seating: boolean;
    guestAlbum: boolean;
    customDomain: boolean;
    whiteLabel: boolean;
  };
}

export interface PaymentModel {
  _id?: string;
  id?: string;
  event?: string;
  invitation?: string;
  package: PaymentPackage | 'basic' | 'premium' | 'organizer';
  billingType?: 'one_time' | 'subscription';
  scope?: PlanScope;
  stripeSessionId?: string;
  stripeEventId?: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  amount?: number;
  currency?: string;
  paidAt?: string;
  expiresAt?: string;
  createdAt?: string;
}

export interface PaymentStatusResponse {
  plan: PaymentPackage | 'basic' | 'premium' | 'organizer';
  planDefinition: PlanDefinition;
  subscriptionPlan?: PaymentPackage;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionActive?: boolean;
  subscriptionCurrentPeriodEnd?: string;
  eventPlan?: PaymentPackage | 'basic' | 'premium' | 'organizer';
  eventPlanDefinition?: PlanDefinition;
  eventPlanActive?: boolean;
  eventPlanActivatedAt?: string;
  eventPlanExpiresAt?: string;
  eventMode?: EventMode;
  payments: PaymentModel[];
}

export interface CheckoutResponse {
  checkoutUrl: string | null;
  sessionId: string | null;
  payment?: PaymentModel;
  manualPayment?: boolean;
  message?: string;
}

export type TableShape =
  | 'round'
  | 'rect'
  | 'oval'
  | 'square'
  | 'dance_floor'
  | 'stage_dj'
  | 'bar'
  | 'gift_table'
  | 'cake_table'
  | 'photobooth'
  | 'entrance';

export interface EventTableModel {
  _id?: string;
  id?: string;
  name: string;
  capacity: number;
  notes?: string;
  order?: number;
  x?: number;
  y?: number;
  shape?: TableShape;
  width?: number;
  height?: number;
  floor?: number;
  floorName?: string;
  occupied?: number;
  available?: number;
  overCapacity?: boolean;
  guests?: Array<{
    id: string;
    name: string;
    group?: string;
    seatLabel?: string;
    seats: number;
    checkedIn?: boolean;
  }>;
}

export type AutoAssignStrategy = 'fill_order' | 'by_group';
export type TableAutoAssignStrategy = AutoAssignStrategy;

export interface AutoAssignTablesPayload {
  strategy?: AutoAssignStrategy;
  includeStatuses?: (GuestStatus | string)[];
  overwrite?: boolean;
}
export type TableAutoAssignPayload = AutoAssignTablesPayload;

export interface AutoAssignTablesResponse {
  assigned: Array<{
    guest: { id: string; name: string; group?: string; seats: number };
    table: string;
    seatLabel?: string;
  }>;
  skipped: Array<{
    guest: { id: string; name: string; group?: string; seats: number };
    reason: string;
  }>;
  tables: EventTableModel[];
}

export interface StaffCheckInSession {
  event: Pick<EventModel, 'title' | 'date' | 'venue'>;
  guests: GuestModel[];
  expiresAt: string;
}

export type EventAccessRole = 'check_in' | 'album_review' | 'photographer' | 'album_view' | 'client_view' | 'guest_ops' | 'dj' | 'integration_api';

export interface EventAccessLinkModel {
  id?: string;
  _id?: string;
  role: EventAccessRole;
  label?: string;
  tokenPreview?: string;
  accessToken?: string;
  expiresAt: string;
  revokedAt?: string;
  lastUsedAt?: string;
  createdAt?: string;
  url: string;
}

export interface EventAccessSession {
  role: EventAccessRole;
  permissions: string[];
  event: Pick<EventModel, 'title' | 'type' | 'date' | 'venue' | 'mode' | 'externalSiteUrl' | 'externalSiteLabel' | 'externalPortalSlug'>;
  guests: GuestModel[];
  rsvps: RsvpModel[];
  tables: EventTableModel[];
  albumAssets: AlbumAssetModel[];
  songRequests?: SongRequestModel[];
  expiresAt: string;
}

export interface ExternalConfigResponse {
  event: EventModel & {
    portalSlug?: string;
    settings?: ExternalPortalSettings;
    content?: ExternalContent;
    features?: Record<string, boolean>;
  };
}

export interface ExternalAssetsResponse {
  type: string;
  assets: Partial<ExternalContent>;
}

export interface SongRequestPayload {
  guest?: string;
  requesterName?: string;
  requesterEmail?: string;
  title?: string;
  artist?: string;
  dedication?: string;
  query?: string;
  url?: string;
  sourceUrl?: string;
}

export interface GiftRegistryItem {
  store?: string;
  title?: string;
  label?: string;
  url?: string;
  imageUrl?: string;
  note?: string;
  priority?: number;
}

export interface DigitalEnvelope {
  bank?: string;
  account?: string;
  clabe?: string;
  holder?: string;
  note?: string;
  qrImageUrl?: string;
}

export interface GiftSettings {
  enabled?: boolean;
  introText?: string;
  showRegistry?: boolean;
  showEnvelope?: boolean;
}

export interface DedicationSettings {
  enabled?: boolean;
  requireApproval?: boolean;
  introText?: string;
}

export type DedicationStatus = 'pending' | 'approved' | 'rejected' | 'hidden';
export type DedicationType = 'dedication' | 'wish' | 'memory' | 'toast';

export interface DedicationModel {
  _id?: string;
  id?: string;
  event?: string;
  invitation?: string;
  guest?: string | Partial<GuestModel>;
  publicName?: string;
  email?: string;
  message: string;
  type: DedicationType;
  status: DedicationStatus;
  visibility?: 'public' | 'hosts_only';
  createdAt?: string;
  reviewedAt?: string;
}

export interface EmbedManifestResponse {
  portalSlug: string;
  widgets: Record<string, string>;
  snippets: Record<string, string>;
}

export type IntegrationTemplateMode = 'widgets' | 'api' | 'mixed';
export type IntegrationTemplateStack = 'html' | 'react' | 'next' | 'angular' | 'vue' | 'wordpress' | 'webflow' | 'other';
export type IntegrationTemplateModule = 'event' | 'rsvp' | 'guestPass' | 'gallery' | 'album' | 'map' | 'songRequests' | 'gifts' | 'dedications';

export interface IntegrationTemplateModel {
  id: string;
  name: string;
  description?: string;
  mode: IntegrationTemplateMode;
  stack: IntegrationTemplateStack;
  modules: IntegrationTemplateModule[];
  instructions?: string;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface IntegrationTemplatePayload {
  name: string;
  description?: string;
  mode: IntegrationTemplateMode;
  stack: IntegrationTemplateStack;
  modules: IntegrationTemplateModule[];
  instructions?: string;
}

export interface IntegrationGuidePreviewResponse {
  prompt: string;
  configuration: Omit<IntegrationTemplatePayload, 'name' | 'description'>;
  event: { id: string; title: string; portalSlug: string };
  security: { includesSecrets: boolean; integrationTokenPlaceholder: string };
}

export interface AlbumAssetModel {
  _id?: string;
  id?: string;
  uploaderName?: string;
  uploaderEmail?: string;
  url: string;
  status: 'pending' | 'approved' | 'rejected';
  tags?: string[];
  reviewedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExternalGuestStatusResponse {
  guest: GuestAccessResponse['guest'];
  rsvp: RsvpModel | null;
  albumUploads: AlbumAssetModel[];
  songRequests: SongRequestModel[];
  dedications?: DedicationModel[];
}

export interface GuestActivityNotification {
  key: string;
  kind: 'album' | 'song' | 'dedication';
  itemId: string;
  status: string;
  title: string;
}

export interface SongLookupResponse {
  song: Partial<SongRequestModel> & {
    title: string;
    artist?: string;
  };
}

export type EventLogCategory = 'guest' | 'table' | 'rsvp' | 'album' | 'music' | 'dedication' | 'event' | 'access' | 'communication' | 'all';

export interface EventLogActor {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
}

export interface EventLogModel {
  _id?: string;
  id?: string;
  event: string | { _id?: string; id?: string; title?: string; date?: string; venue?: string; type?: string };
  actorType: 'user' | 'guest' | 'staff' | 'system';
  actor?: EventLogActor;
  category: 'guest' | 'table' | 'rsvp' | 'album' | 'music' | 'dedication' | 'event' | 'access' | 'communication';
  action: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

export interface EventLogSummary {
  total: number;
  today: number;
  byCategory: Record<string, number>;
}

export interface EventLogResponse {
  logs: EventLogModel[];
  events?: Array<{ _id?: string; id?: string; title?: string; date?: string; venue?: string; type?: string }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  summary: EventLogSummary;
}

