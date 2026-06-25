# ADR-B-003: Monetization Model — Free/Pro Tiers, Monthly Hard Caps

- **Status:** Accepted
- **Date:** 2026-06-24

## Context

Markus wanted a freemium model — a limited free tier pushing users toward a paid Pro tier — but explicitly corrected an initial daily-quota proposal ("kalo yg free 10 chat/hari ya bencos kita") because unbounded daily resets risk uncontrolled LLM cost exposure. Pricing also needed real-world anchoring rather than invented numbers.

## Decision

Free = 30 chat/month + 3 Watchlist slots + basic data. Pro = 300 chat/month + 25 Watchlist slots + deeper data (ownership graph, peer comparison). Quota is calculated **per calendar month, not per day**, and hard-capped on both tiers — Pro is never unlimited. Indicative price range Rp49k–99k/month, grounded against real comparables (Stockbit Pro ~Rp250k/mo, ChatGPT Go ~Rp75k/mo) rather than invented.

## Alternatives Rejected

- **Daily quota resets (e.g. Free = 10 chat/day)** — rejected directly by Markus: a daily reset lets usage (and cost) compound unbounded over a month with no real ceiling.
- **Unlimited Pro tier** — rejected; even paying users must stay hard-capped, since LLM cost scales with usage regardless of subscription revenue per seat.

## Consequences

PRD FR-18/FR-19/FR-20, NFR3, Risk R2. `CLAUDE.md` flags the monthly-not-daily distinction explicitly as a corrected mistake, not a design option to reconsider.
