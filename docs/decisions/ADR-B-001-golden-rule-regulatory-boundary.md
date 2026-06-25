# ADR-B-001: Golden Rule & Regulatory Boundary

- **Status:** Accepted
- **Date:** 2026-06-24

## Context

Sahamigo's core differentiation is teaching users to read stock data rather than following signals, in a market where every visible competitor (Stockbit, FITStock, Invezgo, Pluang Aura AI) sells recommendations instead. The initial framing of "never give buy/sell/hold advice" was purely a product/UX philosophy. During business analysis, Murat (Test Architect) reframed it: giving buy/sell advice in Indonesia requires an OJK (Otoritas Jasa Keuangan) investment-advisor license Sahamigo does not have.

## Decision

The Golden Rule — Sahamigo's AI never concludes a buy/sell/hold recommendation or trading signal, and always reflects the decision back to the user as a question — is locked as a hard, non-negotiable constraint. It is both the product's identity and its compliance boundary, not a relaxable style preference. (Enforcement scope was later broadened to explicitly cover visual presentation, not just text — see ADR-004.)

## Alternatives Rejected

- **Showing Setup Score/Entry/SL/TP-style UI** (as in the metafire.metasora.com reference Markus initially shared) — rejected even when reframed as "UI inspiration only." Visually implying a verdict is exactly the loophole later closed in ADR-004.
- **Treating the rule as a soft UX preference relaxable for power users later** — rejected once the OJK licensing angle was established; relaxing it would create real regulatory exposure, not just a UX inconsistency.

## Consequences

Every feature must pass a Golden Rule DoD check (`CLAUDE.md`). No roadmap item that requires presenting a recommendation can ever be in scope, regardless of demand. This is the single most load-bearing constraint in the product — referenced in PRD FR-3, NFR2, Risk R1/R5/R6, and `CLAUDE.md`.
