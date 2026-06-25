# ADR-005: LLM Provider for T0 — Sumopod (delta on ADR-001)

- **Status:** Accepted
- **Date:** 2026-06-25
- **SUPERSEDES:** ADR-001's specific provider choice for LLM access.
- **CHANGED:** Concrete LLM gateway for T0 — OpenRouter → Sumopod.
- **UNCHANGED:** The architectural principle from ADR-001 ("LLM access via a model-agnostic gateway, default Claude Sonnet 4.6") and everything else in ADR-001 (Bun+Hono, React 19, Drizzle+Postgres, Neo4j, single-VPS Dokploy hosting).
- **REASON:** Markus has existing AI credit on Sumopod from a prior project; using it for T0 avoids new spend while validating the product on a single user.

## Context

ADR-001 named OpenRouter specifically as the LLM gateway. During execution-readiness review for Epic 1 (Story 1.2 needs a working LLM call), Markus flagged that he already has unused AI credit on Sumopod and wants to use that instead for T0, rather than open a fresh OpenRouter account/spend.

## Decision

For T0, Sahamigo's LLM calls go through Sumopod instead of OpenRouter. This is explicitly framed as provisional ("sementara") — tied to using up existing credit, not a permanent vendor commitment. The model-agnostic gateway *principle* from ADR-001 is preserved: Sahamigo's backend should integrate against an OpenAI-compatible interface (which both OpenRouter and Sumopod expose) so swapping the gateway later is a config change, not a rewrite.

## Alternatives Rejected

- **Open a new OpenRouter account now per the original ADR-001 wording** — rejected; spending fresh money when usable credit already exists elsewhere doesn't serve T0's single-user validation phase.
- **Treating this as a permanent architecture change (rewrite ADR-001 outright)** — rejected; Markus was explicit this is a temporary, credit-driven choice, not a vendor preference. Keeping it as a delta avoids overstating the commitment.

## Consequences

- Story 1.2 (MAR-116) implementation targets Sumopod's API for T0.
- **Resolved 2026-06-25:** model availability confirmed — Sumopod exposes `claude-sonnet-4-6` directly (matches ADR-001's default model exactly, no "nearest equivalent" substitution needed) at base URL `https://ai.sumopod.com/v1`, OpenAI-compatible. Verified via `/v1/models` and a real `/v1/chat/completions` call before Story 1.2 implementation began. Pricing not separately investigated — out of scope while spending existing credit per this ADR's REASON.
- Before T1 (more users, sustained cost), revisit whether to stay on Sumopod or move to OpenRouter per ADR-001's original intent — tracked as a new open item, not assumed either way.
