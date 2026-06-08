# Graph Report - Invitaciones-FrontendAngular  (2026-06-07)

## Corpus Check
- 23 files · ~5,384 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 191 nodes · 509 edges · 11 communities (7 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6f737a0c`
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
- [[_COMMUNITY_Community 10|Community 10]]

## God Nodes (most connected - your core abstractions)
1. `ApiService` - 45 edges
2. `EventDetailComponent` - 28 edges
3. `InvitationEditorComponent` - 20 edges
4. `AuthService` - 19 edges
5. `PublicInvitationComponent` - 19 edges
6. `EventModel` - 15 edges
7. `InvitationModel` - 15 edges
8. `GuestModel` - 10 edges
9. `EventsComponent` - 9 edges
10. `AuthResponse` - 8 edges

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

## Communities (11 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (12): ApiService, CheckoutResponse, ContactPayload, EventPayload, GuestPayload, ImportGuestsResponse, InvitationModel, InvitationPayload (+4 more)

### Community 1 - "Community 1"
Cohesion: 0.16
Nodes (6): AppComponent, AuthServiceStub, AuthGuard, AuthService, AuthResponse, User

### Community 3 - "Community 3"
Cohesion: 0.14
Nodes (9): AppModule, AppRoutingModule, routes, ContactComponent, environment, environment, LoginComponent, PasswordResetConfirmComponent (+1 more)

### Community 4 - "Community 4"
Cohesion: 0.26
Nodes (4): AssetFolder, PaymentPackage, TemplateModel, InvitationEditorComponent

### Community 7 - "Community 7"
Cohesion: 0.20
Nodes (7): apiTarget, fs, http, path, port, root, types

### Community 8 - "Community 8"
Cohesion: 0.16
Nodes (12): DashboardMetrics, EventAgendaItem, EventStatus, EventType, GuestStatus, InvitationAccessMode, InvitationContent, InvitationStatus (+4 more)

## Knowledge Gaps
- **17 isolated node(s):** `http`, `fs`, `path`, `port`, `apiTarget` (+12 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ApiService` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 8`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Why does `EventDetailComponent` connect `Community 2` to `Community 0`, `Community 3`, `Community 6`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `InvitationEditorComponent` connect `Community 4` to `Community 0`, `Community 3`, `Community 6`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `http`, `fs`, `path` to the rest of the system?**
  _17 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.11282051282051282 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.14245014245014245 - nodes in this community are weakly interconnected._