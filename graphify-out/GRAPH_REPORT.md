# Graph Report - .  (2026-06-07)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 174 nodes · 324 edges · 12 communities (4 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b15d4f60`
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

## God Nodes (most connected - your core abstractions)
1. `InvitationModel` - 12 edges
2. `EventModel` - 11 edges
3. `GuestModel` - 9 edges
4. `AuthResponse` - 8 edges
5. `RsvpModel` - 6 edges
6. `User` - 5 edges
7. `MessageResponse` - 5 edges
8. `EventPayload` - 5 edges
9. `TemplateModel` - 5 edges
10. `AssetFolder` - 5 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (12 total, 8 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.10
Nodes (20): CheckoutResponse, ContactPayload, DashboardMetrics, EventAgendaItem, EventStatus, EventType, GuestAccessResponse, GuestPayload (+12 more)

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (3): AuthServiceStub, AuthResponse, User

### Community 7 - "Community 7"
Cohesion: 0.20
Nodes (7): apiTarget, fs, http, path, port, root, types

## Knowledge Gaps
- **16 isolated node(s):** `http`, `fs`, `path`, `port`, `apiTarget` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `InvitationModel` connect `Community 8` to `Community 0`, `Community 2`, `Community 4`, `Community 5`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `EventModel` connect `Community 6` to `Community 0`, `Community 2`, `Community 4`, `Community 5`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `http`, `fs`, `path` to the rest of the system?**
  _16 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09672830725462304 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.09846153846153846 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.1383399209486166 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.13157894736842105 - nodes in this community are weakly interconnected._