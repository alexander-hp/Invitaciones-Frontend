# Graph Report - Invitaciones-FrontendAngular  (2026-06-13)

## Corpus Check
- 27 files · ~16,024 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 490 nodes · 1137 edges · 27 communities (14 shown, 13 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ea10a36f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]

## God Nodes (most connected - your core abstractions)
1. `EventDetailComponent` - 148 edges
2. `ApiService` - 102 edges
3. `InvitationEditorComponent` - 47 edges
4. `GuestModel` - 36 edges
5. `PublicInvitationComponent` - 36 edges
6. `EventModel` - 24 edges
7. `ExternalEmbedComponent` - 22 edges
8. `ExternalPortalComponent` - 20 edges
9. `AuthService` - 19 edges
10. `InvitationModel` - 16 edges

## Surprising Connections (you probably didn't know these)
- `EventDetailComponent` --references--> `DashboardMetrics`  [EXTRACTED]
  src/app/features/event-detail/event-detail.component.ts → src/app/core/models.ts
- `CheckInStaffComponent` --references--> `EventModel`  [EXTRACTED]
  src/app/features/check-in-staff/check-in-staff.component.ts → src/app/core/models.ts
- `EventDetailComponent` --references--> `EventModel`  [EXTRACTED]
  src/app/features/event-detail/event-detail.component.ts → src/app/core/models.ts
- `ExternalEmbedComponent` --references--> `EventModel`  [EXTRACTED]
  src/app/features/external-embed/external-embed.component.ts → src/app/core/models.ts
- `InvitationEditorComponent` --references--> `EventModel`  [EXTRACTED]
  src/app/features/invitation-editor/invitation-editor.component.ts → src/app/core/models.ts

## Import Cycles
- None detected.

## Communities (27 total, 13 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (5): CheckInStaffComponent, GuestCommunicationStatus, GuestMessageChannel, GuestModel, EventAccessComponent

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (15): AppComponent, AuthServiceStub, AppModule, AppRoutingModule, routes, ContactComponent, AuthGuard, AuthService (+7 more)

### Community 3 - "Community 3"
Cohesion: 0.25
Nodes (4): DashboardMetrics, PaymentModel, SubscriptionStatus, DashboardComponent

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (6): AssetFolder, EventAgendaItem, InvitationLocation, PlanDefinition, TemplateModel, InvitationEditorComponent

### Community 7 - "Community 7"
Cohesion: 0.20
Nodes (7): apiTarget, fs, http, path, port, root, types

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (21): BillingType, EmailBulkResponse, EmailSendResponse, EmbedManifestResponse, EventAccessRole, EventStatus, ExternalAssetsResponse, ExternalConfigResponse (+13 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (5): EventMode, EventModel, EventPayload, EventsComponent, ExternalPortalComponent

### Community 14 - "Community 14"
Cohesion: 0.20
Nodes (4): WhatsAppBulkResponse, WhatsAppMediaAssetModel, WhatsAppMediaPayload, WhatsAppSendResponse

### Community 18 - "Community 18"
Cohesion: 0.12
Nodes (5): ApiService, AlbumAssetModel, EventTableModel, GuestAccessResponse, RsvpResponse

### Community 19 - "Community 19"
Cohesion: 0.13
Nodes (9): CheckoutResponse, EventType, GuestPayload, ImportGuestsResponse, InvitationModel, InvitationPayload, PaymentPackage, TemplateTier (+1 more)

## Knowledge Gaps
- **20 isolated node(s):** `http`, `fs`, `path`, `port`, `apiTarget` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `EventDetailComponent` connect `Community 2` to `Community 0`, `Community 1`, `Community 3`, `Community 4`, `Community 6`, `Community 8`, `Community 9`, `Community 12`, `Community 14`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`?**
  _High betweenness centrality (0.354) - this node is a cross-community bridge._
- **Why does `ApiService` connect `Community 18` to `Community 0`, `Community 1`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 8`, `Community 9`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 19`, `Community 21`, `Community 23`, `Community 24`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._
- **Why does `InvitationEditorComponent` connect `Community 4` to `Community 1`, `Community 19`, `Community 9`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **What connects `http`, `fs`, `path` to the rest of the system?**
  _20 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06923076923076923 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07597402597402597 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.03773584905660377 - nodes in this community are weakly interconnected._