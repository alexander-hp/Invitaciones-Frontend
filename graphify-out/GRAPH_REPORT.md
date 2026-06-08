# Graph Report - Invitaciones-FrontendAngular  (2026-06-08)

## Corpus Check
- 24 files · ~8,746 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 287 nodes · 709 edges · 11 communities (9 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ceeb950c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]

## God Nodes (most connected - your core abstractions)
1. `EventDetailComponent` - 70 edges
2. `ApiService` - 64 edges
3. `InvitationEditorComponent` - 32 edges
4. `GuestModel` - 29 edges
5. `PublicInvitationComponent` - 28 edges
6. `AuthService` - 19 edges
7. `EventModel` - 17 edges
8. `InvitationModel` - 16 edges
9. `CheckInStaffComponent` - 13 edges
10. `GuestMessageType` - 9 edges

## Surprising Connections (you probably didn't know these)
- `CheckInStaffComponent` --references--> `EventModel`  [EXTRACTED]
  src/app/features/check-in-staff/check-in-staff.component.ts → src/app/core/models.ts
- `EventDetailComponent` --references--> `EventModel`  [EXTRACTED]
  src/app/features/event-detail/event-detail.component.ts → src/app/core/models.ts
- `InvitationEditorComponent` --references--> `EventModel`  [EXTRACTED]
  src/app/features/invitation-editor/invitation-editor.component.ts → src/app/core/models.ts
- `PublicInvitationComponent` --references--> `EventModel`  [EXTRACTED]
  src/app/features/public-invitation/public-invitation.component.ts → src/app/core/models.ts
- `EventDetailComponent` --references--> `InvitationModel`  [EXTRACTED]
  src/app/features/event-detail/event-detail.component.ts → src/app/core/models.ts

## Import Cycles
- None detected.

## Communities (11 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.12
Nodes (4): CheckInStaffComponent, GuestCommunicationStatus, GuestMessageChannel, GuestModel

### Community 1 - "Community 1"
Cohesion: 0.14
Nodes (7): AppComponent, AuthServiceStub, AuthService, AuthResponse, User, LoginComponent, RegisterComponent

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (5): AlbumAssetModel, EventTableModel, GuestMessageType, EventDetailComponent, MessageTemplateOption

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (10): AppModule, AppRoutingModule, routes, ContactComponent, AuthGuard, DashboardMetrics, DashboardComponent, environment (+2 more)

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (5): AssetFolder, PaymentPackage, PlanDefinition, TemplateModel, InvitationEditorComponent

### Community 5 - "Community 5"
Cohesion: 0.14
Nodes (3): RsvpCustomQuestion, RsvpResponse, PublicInvitationComponent

### Community 7 - "Community 7"
Cohesion: 0.20
Nodes (7): apiTarget, fs, http, path, port, root, types

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (24): ApiService, CheckoutResponse, ContactPayload, EventAgendaItem, EventPayload, EventStatus, EventType, GuestAccessResponse (+16 more)

## Knowledge Gaps
- **18 isolated node(s):** `http`, `fs`, `path`, `port`, `apiTarget` (+13 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `EventDetailComponent` connect `Community 2` to `Community 0`, `Community 9`, `Community 3`, `Community 8`?**
  _High betweenness centrality (0.218) - this node is a cross-community bridge._
- **Why does `ApiService` connect `Community 8` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 9`?**
  _High betweenness centrality (0.151) - this node is a cross-community bridge._
- **Why does `InvitationEditorComponent` connect `Community 4` to `Community 8`, `Community 9`, `Community 3`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **What connects `http`, `fs`, `path` to the rest of the system?**
  _18 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.11666666666666667 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.14022988505747128 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05888376856118792 - nodes in this community are weakly interconnected._