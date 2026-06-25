# ADR-004: Golden Rule Enforcement Mechanism — Scope and T0/T1 Split

- **Status:** Accepted
- **Date:** 2026-06-25
- **Supersedes:** Narrows/extends the enforcement spec implied by ADR-B-001 (does not change the rule itself, only how it's verified).

## Context

During the PRD reviewer pass, two independent reviewers (Murat, Sally) found real loopholes in the original Golden Rule enforcement spec (FR-3): it only matched literal words ("buy/sell/hold"), missing implication-based advice (hedged language, historical-pattern framing, pre-emptive verdicts); and it only constrained text, not visual presentation (colors, badges, button labels could imply a verdict without using the literal words). Murat also flagged two missing risk categories: adversarial jailbreak/prompt-injection attempts, and post-launch runtime drift with no monitoring mechanism beyond pre-ship review.

## Decision

FR-3 broadened to explicitly cover implication-based phrasing and visual presentation, not just literal directive words. Two new risks added: R5 (jailbreak/prompt-injection) and R6 (runtime drift / no post-launch monitoring). Both gaps are explicitly **not built for T0** (single trusted, non-adversarial user) — they are a hard gate before T1 opens access to anyone else, tracked as PRD Open Question 6.

## Alternatives Rejected

- **Building the judge-model/implication-detection layer and jailbreak defenses now, before shipping T0** — rejected as premature; T0's only user has no adversarial motive against his own product, and building this now would delay the actual MVP loop for a threat that doesn't exist yet at this scale.
- **Leaving the lexical-only/text-only spec as-is since T0 is low-risk anyway** — rejected; the PRD-text-level fix (precise wording, explicit risk entries) is cheap and worth doing now even though the deeper mechanism is deferred — writing the gap down is different from ignoring it.

## Consequences

PRD FR-3, NFR2, Risk R5/R6, Open Question 6. `CLAUDE.md`'s "what NOT to build yet" section encodes this split directly so it isn't accidentally built early, nor accidentally skipped before T1.
