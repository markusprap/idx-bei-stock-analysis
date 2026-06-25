# ADR-003: Data Granularity & EOD-Only Constraint

- **Status:** Accepted
- **Date:** 2026-06-24

## Context

Early UI mockups risked showing Stockbit-equivalent data fields and granularity (e.g. quarterly financials) that the actual scraper/Postgres schema does not produce. This was flagged as an overclaiming risk during prototyping.

## Decision

All data surfaces are explicitly EOD (end-of-day), never realtime, and visually labeled as such. Fundamental/valuation tables on Stock Detail are annual-only, explicitly labeled "(Tahunan)," matching the scraper's real output — not quarterly, regardless of what competitor apps show.

## Alternatives Rejected

- **Showing quarterly-style breakdowns to match Stockbit's perceived data depth** — rejected; the scraper doesn't produce that granularity, and presenting it anyway would be a data-honesty violation.
- **Treating the EOD/realtime distinction as a backend implementation detail with no UI requirement** — rejected; a user mistaking EOD for realtime could make a real-world decision on stale information (PRD Risk R3), so the constraint had to surface in the UI, not stay implicit.

## Consequences

PRD FR-11, FR-13, FR-16, NFR1, Risk R3/R4. `CLAUDE.md`'s domain notes section repeats this as non-negotiable.
