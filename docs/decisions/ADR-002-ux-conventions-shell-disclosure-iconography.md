# ADR-002: Product UX Conventions — Shell, Progressive Disclosure, Iconography

- **Status:** Accepted
- **Date:** 2026-06-24

## Context

The DesignSync UI prototype surfaced three drift issues across iteration: (1) each screen's sidebar was hand-built independently and drifted out of sync with `chat.html`'s canonical version; (2) Search/IHSG and Stock Detail initially felt too sparse ("lega") despite having real data to show, but matching full Stockbit-level density risked overwhelming a beginner audience; (3) an early pass used emoji as nav icons, which Markus flagged as reading like generic AI-generated output ("AI slop").

## Decision

One canonical sidebar, conceptually shared across all four screens (Chat default, Watchlist + Search nav pills, chat history, profile/tier footer) — varies only in which nav pill is active. Data-dense surfaces (Search/IHSG's movers/sectors/news, Stock Detail's fundamental tables) render curated top-N previews with "Selengkapnya"/"lihat semua" expansion links, never full density by default — a deliberate progressive-disclosure compromise for a beginner audience. No emoji as UI iconography anywhere — thin-stroke SVG line icons only.

## Alternatives Rejected

- **Matching Stockbit's full data density on Search/Stock Detail** — rejected; the audience is beginners learning to read data, not power traders scanning dense tables.
- **Keeping emoji icons for speed of production** — rejected outright by Markus as "AI slop."

## Consequences

PRD §10 names progressive disclosure as a structural pattern, not a one-off Search-page choice. `CLAUDE.md` and the design-reference doc both flag the no-emoji rule as a corrected mistake, not a preference, so future contributors don't reconsider it as a neutral option.
