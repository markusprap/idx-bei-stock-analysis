# ADR-B-002: Staged Rollout — T0 Personal-First, Blueprint Bertingkat

- **Status:** Accepted
- **Date:** 2026-06-25

## Context

Markus wanted to validate Sahamigo on himself before exposing it to anyone else, while also deciding tiering/monetization mechanics early so they would not need retrofitting later. This needed a structure for *when* monetization, channels, and scale decisions actually trigger — measurable conditions, not a fixed calendar (per the ALAN method's "business constraints written down before they're urgently needed" principle).

## Decision

Four-stage blueprint, each transition AND-gated on measurable triggers, not dates:
- **T0** (personal, free, closed — Markus only) → **T1** (small closed beta) requires 3-4 consecutive weeks of organic usage + ≥1 concrete weekly insight + zero Golden Rule violations, all three together.
- **T1 → T2** (public freemium + Pro billing live) requires majority weekly beta retention for ≥2 consecutive weeks + zero Golden Rule violations + ≥1 organic referral from outside the initial beta group.
- **T2 → Tn** (scale) is explicitly TBD, pending a funding-vs-bootstrap decision not yet made.

Channels (acquisition strategy) is decided **before T1 starts**, not at T2 — corrected after a contradiction was caught between `lean-canvas.md` and `blueprint-bertingkat.md` during PRD reconciliation.

## Alternatives Rejected

- **Deciding Channels at T2** (when going public) — this is how `blueprint-bertingkat.md` was initially worded, contradicting the Lean Canvas's own "before T1" framing. Rejected once surfaced: T1's beta invite size/method depends on knowing the channel first.
- **Skipping staged rollout, building for public scale from day one** — rejected; T0 has exactly one user, and building for scale prematurely wastes effort the product doesn't yet need.

## Consequences

Full detail lives in `docs/business/blueprint-bertingkat.md`. PRD §6, §9, §13, and `CLAUDE.md`'s "what NOT to build yet" section all derive from this staging.
