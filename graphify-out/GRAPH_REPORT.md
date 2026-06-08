# Graph Report - Invitaciones-FrontendAngular  (2026-06-07)

## Corpus Check
- 23 files · ~6,671 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 230 nodes · 596 edges · 13 communities (10 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a32cebc8`
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

## God Nodes (most connected - your core abstractions)
1. `EventDetailComponent` - 55 edges
2. `ApiService` - 50 edges
3. `InvitationEditorComponent` - 24 edges
4. `GuestModel` - 21 edges
5. `AuthService` - 19 edges
6. `PublicInvitationComponent` - 19 edges
7. `InvitationModel` - 16 edges
8. `EventModel` - 15 edges
9. `GuestMessageType` - 9 edges
10. `EventsComponent` - 9 edges

## Surprising Connections (you probably didn't know these)
- `EventDetailComponent` --references--> `EventModel`  [EXTRACTED]
  src/app/features/event-detail/event-detail.component.ts → src/app/core/models.ts
- `InvitationEditorComponent` --references--> `EventModel`  [EXTRACTED]
  src/app/features/invitation-editor/invitation-editor.component.ts → src/app/core/models.ts
- `PublicInvitationComponent` --references--> `EventModel`  [EXTRACTED]
  src/app/features/public-invitation/public-invitation.component.ts → src/app/core/models.ts
- `EventDetailComponent` --references--> `InvitationModel`  [EXTRACTED]
  src/app/features/event-detail/event-detail.component.ts → src/app/core/models.ts
- `InvitationEditorComponent` --references--> `InvitationModel`  [EXTRACTED]
  src/app/features/invitation-editor/invitation-editor.component.ts → src/app/core/models.ts

## Import Cycles
- None detected.

## Communities (13 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.24
Nodes (6): CheckoutResponse, GuestPayload, ImportGuestsResponse, RsvpModel, RsvpPayload, UploadUrlResponse

### Community 1 - "Community 1"
Cohesion: 0.14
Nodes (7): AppComponent, AuthServiceStub, AuthGuard, AuthService, AuthResponse, User, LoginComponent

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (6): GuestCommunicationStatus, GuestMessageChannel, GuestMessageType, GuestModel, EventDetailComponent, MessageTemplateOption

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (10): AppModule, AppRoutingModule, routes, ContactComponent, DashboardMetrics, DashboardComponent, environment, environment (+2 more)

### Community 4 - "Community 4"
Cohesion: 0.19
Nodes (5): AssetFolder, PaymentPackage, PlanDefinition, TemplateModel, InvitationEditorComponent

### Community 6 - "Community 6"
Cohesion: 0.28
Nodes (3): EventModel, EventPayload, EventsComponent

### Community 7 - "Community 7"
Cohesion: 0.20
Nodes (7): apiTarget, fs, http, path, port, root, types

### Community 8 - "Community 8"
Cohesion: 0.15
Nodes (3): ApiService, ContactPayload, MessageResponse

### Community 9 - "Community 9"
Cohesion: 0.18
Nodes (10): EventAgendaItem, EventStatus, EventType, GuestStatus, InvitationAccessMode, InvitationContent, InvitationStatus, RsvpResponse (+2 more)

## Knowledge Gaps
- **17 isolated node(s):** `http`, `fs`, `path`, `port`, `apiTarget` (+12 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `EventDetailComponent` connect `Community 2` to `Community 0`, `Community 3`, `Community 6`, `Community 8`, `Community 12`?**
  _High betweenness centrality (0.183) - this node is a cross-community bridge._
- **Why does `ApiService` connect `Community 8` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 9`, `Community 12`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Why does `InvitationEditorComponent` connect `Community 4` to `Community 3`, `Community 12`, `Community 6`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **What connects `http`, `fs`, `path` to the rest of the system?**
  _17 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.14022988505747128 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08563134978229318 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.12873563218390804 - nodes in this community are weakly interconnected._