# ADR-B-004: MVP Success Metrics & Tracking Method

- **Status:** Accepted
- **Date:** 2026-06-24

## Context

Sahamigo needed criteria for knowing when T0 personal validation has succeeded enough to justify moving to T1, and a decision on whether to build in-app analytics now or track manually — building analytics competes with dev time for shipping the core T0 loop itself.

## Decision

Success = 3-4 consecutive weeks of organic usage + ≥1 concrete weekly insight + zero Golden Rule violations, **AND-gated together** — all three required, none independently sufficient. Tracked via Markus's own manual journal (Option A); no in-app analytics feature built for T0. Counter-metric: raw chat volume/session length must **not** be optimized, since engagement pressure could erode the Golden Rule.

## Alternatives Rejected

- **Option B: build a lightweight in-app usage-tracking feature now** — rejected to avoid adding dev scope before the MVP itself validates; premature instrumentation for a single self-reporting user.
- **Treating the three success conditions as independently sufficient (any one counts)** — rejected during PRD reconciliation once the AND-gated nature of the original Blueprint Bertingkat trigger was confirmed; OR-gating would let "success" be declared even alongside Golden Rule violations, which defeats the constraint's purpose.

## Consequences

PRD §9 (SM-1/SM-2/SM-3/SM-C1). Acknowledged limitation: SM-3 isn't independently auditable without transcript retention — acceptable at T0, flagged to revisit before T1 (PRD Open Question 6).
