# Graph Report - Invitaciones-FrontendAngular  (2026-06-08)

## Corpus Check
- 24 files · ~10,508 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 337 nodes · 818 edges · 18 communities (8 shown, 10 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0c36d72d`
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
- [[_COMMUNITY_Community 17|Community 17]]

## God Nodes (most connected - your core abstractions)
1. `EventDetailComponent` - 88 edges
2. `ApiService` - 72 edges
3. `InvitationEditorComponent` - 42 edges
4. `PublicInvitationComponent` - 34 edges
5. `GuestModel` - 32 edges
6. `AuthService` - 19 edges
7. `EventModel` - 17 edges
8. `InvitationModel` - 16 edges
9. `GuestMessageType` - 13 edges
10. `CheckInStaffComponent` - 13 edges

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

## Communities (18 total, 10 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.19
Nodes (3): GuestCommunicationStatus, GuestMessageChannel, GuestModel

### Community 1 - "Community 1"
Cohesion: 0.13
Nodes (7): AppComponent, AuthServiceStub, AuthGuard, AuthService, AuthResponse, User, RegisterComponent

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (10): AppModule, AppRoutingModule, routes, ContactComponent, DashboardMetrics, DashboardComponent, environment, environment (+2 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (7): AssetFolder, EventAgendaItem, InvitationLocation, PaymentPackage, PlanDefinition, TemplateModel, InvitationEditorComponent

### Community 7 - "Community 7"
Cohesion: 0.20
Nodes (7): apiTarget, fs, http, path, port, root, types

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (30): ApiService, CheckoutResponse, ContactPayload, EmailBulkResponse, EmailSendResponse, EventPayload, EventStatus, EventType (+22 more)

## Knowledge Gaps
- **17 isolated node(s):** `http`, `fs`, `path`, `port`, `apiTarget` (+12 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `EventDetailComponent` connect `Community 2` to `Community 0`, `Community 3`, `Community 6`, `Community 8`, `Community 9`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`?**
  _High betweenness centrality (0.257) - this node is a cross-community bridge._
- **Why does `ApiService` connect `Community 8` to `Community 0`, `Community 1`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 9`, `Community 12`, `Community 13`, `Community 15`, `Community 17`?**
  _High betweenness centrality (0.152) - this node is a cross-community bridge._
- **Why does `InvitationEditorComponent` connect `Community 4` to `Community 8`, `Community 9`, `Community 3`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **What connects `http`, `fs`, `path` to the rest of the system?**
  _17 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.12701612903225806 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.0812807881773399 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.12873563218390804 - nodes in this community are weakly interconnected._