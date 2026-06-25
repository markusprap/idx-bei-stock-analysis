# ADR-007: LLM Model for T0 — `gpt-5-mini` via Sumopod, not Claude (delta on ADR-005/ADR-001)

- **Status:** Accepted
- **Date:** 2026-06-25
- **SUPERSEDES:** ADR-001's "default Claude Sonnet 4.6" model choice, for T0 only.
- **CHANGED:** Concrete model for T0 — Claude Sonnet 4.6 → `gpt-5-mini`.
- **UNCHANGED:** The model-agnostic gateway principle (ADR-001), Sumopod as the T0 gateway (ADR-005), the OpenAI-compatible integration pattern.
- **REASON:** Sumopod's Claude models (`claude-sonnet-4-6`, `claude-haiku-4-5`) are not usable for Sahamigo — they refuse all non-software-engineering questions, identifying themselves as "Claude Code." `gpt-5-mini` on the same gateway works correctly.

## Context

During Story 1.2 (MAR-116) implementation, the first real chat completion call against Sumopod's `claude-sonnet-4-6` model — given a system prompt establishing it as "Sahamigo" with real BBCA financial data, asked a plain valuation question — refused, responding: *"Saya adalah Claude Code, asisten CLI resmi dari Anthropic untuk tugas-tugas software engineering... saya tidak bisa membantu dengan pertanyaan di luar bidang software engineering."*

This was reproduced with a second Claude model (`claude-haiku-4-5`) — identical refusal, identical "Claude Code" framing. The response's `usage.cached_tokens` (1359) was far larger than the actual request content (~121 tokens), indicating Sumopod injects a large hidden system prompt ahead of the caller's own — almost certainly Claude Code's own CLI/agent identity. This is consistent with how some small AI gateway resellers serve "Claude" access cheaply: by proxying through an existing Claude Code/Agent SDK session rather than a raw model endpoint.

The same exact system+user prompt sent to `gpt-5-mini` on the same gateway produced a normal, on-topic, relevant answer discussing BBCA's PER/PBV/ROE.

## Decision

For T0, Sahamigo's chat completions use `gpt-5-mini` via Sumopod, not any Claude model. The model-agnostic gateway principle from ADR-001 is preserved — this is a config change (which model string is called), not an integration rewrite. Markus may separately check with Sumopod support whether a non-wrapped Claude access path exists; that investigation does not block development, which proceeds now with `gpt-5-mini`.

## Alternatives Rejected

- **Prompt-engineer around Claude Code's identity (system prompt overrides, role-play framing, etc.)** — explicitly rejected by the team. This would be working around a vendor's embedded behavior, not fixing a bug; even if it worked today it would be fragile (could silently break on any Sumopod-side change) and is the wrong kind of "fix" to rely on in a shipped product.
- **Block Story 1.2 until Markus resolves access to a working Claude route on Sumopod** — rejected; T0 has one user and no hard requirement to use Claude specifically beyond ADR-001's original (now superseded-for-T0) default. Waiting on an unscheduled support response isn't worth stalling the core loop.

## Consequences

- Story 1.2 (MAR-116) implementation targets `gpt-5-mini`.
- Flagged for Story 1.3 (Golden Rule): in manual testing, `gpt-5-mini` proactively computed a "fair value" estimate and growth-rate scenarios when asked a valuation question — exactly the kind of implication-based, quantified language FR-3 must catch. Not a Story 1.2 concern, but a concrete test case Murat should fold into Story 1.3's golden-set test cases (`docs/qa/golden-rule-test-cases.md`).
- Before T1, revisit model choice (and provider — Sumopod vs. OpenRouter, per ADR-005's existing open item) together, now informed by this finding.
