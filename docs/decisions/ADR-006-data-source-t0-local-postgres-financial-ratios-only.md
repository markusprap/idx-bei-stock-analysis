# ADR-006: Data Source for T0 — Local Postgres, `financial_ratios` Only (delta on ADR-001)

- **Status:** Accepted
- **Date:** 2026-06-25
- **SUPERSEDES:** ADR-001's implicit assumption of which Postgres instance Sahamigo reads from.
- **CHANGED:** Concrete data source + scope for FR-2 (Story 1.2) at T0.
- **UNCHANGED:** The architectural principle from ADR-001 ("Drizzle ORM + Postgres", "existing Python scraper pipeline stays separate and decoupled — it writes into the same Postgres; Sahamigo's app only reads from it").
- **REASON:** ADR-001 named "Postgres" without specifying which instance. During Story 1.2 execution-readiness review, the team found Postgres was not even running locally, and that a separate, more complete data project (`idx-stock-data-api`, tracked under the Linear project "MVP REST API Data Saham IDX") could be mistaken for the intended source. Markus confirmed: this repo's own `python/` scraper is the intended source — he forked/built this repo specifically because the scraper already existed here. `idx-stock-data-api` is explicitly a different, unrelated project and must not be used.

## Context

ADR-001 specifies "Drizzle ORM + Postgres" and states the existing Python scraper pipeline writes into "the same Postgres" that Sahamigo reads from. It does not say which Postgres. Investigation during Story 1.2 readiness found:

- `docker-compose.yml` only includes `neo4j.yml` — `docker-compose/postgres.yml` is commented out. Postgres was not running.
- No `.env` existed (only `.env.example`) — no DB credentials configured.
- Most of `python/`'s scrapers write JSON to `data/*.json`, not Postgres. Only `financial_ratios_json2pg.py` ETLs into Postgres, into a single table (`financial_ratios`): fundamental/valuation metrics only (PER, PBV, ROE, DER, EPS, book value, sector, etc.) — sourced from `data/financial_ratio.json` (947 IDX-listed companies, FY2024, already scraped).
- **There is no daily price/OHLCV table anywhere in this repo's pipeline.**
- A separate GitHub repo, `idx-stock-data-api` (tracked in Linear as "MVP REST API Data Saham IDX"), has a much more complete schema (11 core tables: companies, daily_prices, technical_indicators, financial_reports, etc.) and was initially mistaken for a candidate data source for Sahamigo, since its Linear comments were visible in the same workspace.

## Decision

1. **Data source for T0:** This repo's own local Postgres, populated by this repo's own `python/` scraper pipeline (`financial_ratios_json2pg.py` → `financial_ratios` table). `docker-compose/postgres.yml` is enabled; `.env` is configured locally (never committed).
2. **`idx-stock-data-api` is explicitly out of scope** — it is a separate, unrelated project. Sahamigo must not connect to it, reference it, or assume access to it, now or as a "fast-follow." Any future need for richer market data must be met by extending *this* repo's scraper, not by reaching into that one.
3. **FR-2 scope is narrowed for Story 1.2 (T0):** the AI answers fundamental/valuation questions only (PER, PBV, ROE, DER, EPS, book value — whatever columns `financial_ratios` actually has). It does **not** answer price/OHLCV/technical-indicator questions, because no such data exists in this repo's pipeline yet. When asked for data that doesn't exist, the AI says so explicitly rather than inventing a figure or silently redirecting — this is itself a testable AC, not an omission.
4. Extending Sahamigo to answer price/technical questions requires this repo's `python/` scraper to be extended first (new scraper + new Postgres table) — tracked as a future story, not assumed available now.

## Alternatives Rejected

- **Connect to `idx-stock-data-api`'s database or REST API** — rejected. Confirmed by Markus as a different, unrelated project; using it would also be an undocumented architecture change (service-to-service API call instead of ADR-001's "shared Postgres" pattern) and introduces an external dependency of unknown deployment status.
- **Write Story 1.2 against an assumed-populated Postgres without verifying** — rejected; this is exactly the kind of wrong assumption that breaks implementation mid-story. Verified file-by-file before writing the story.

## Consequences

- Story 1.2 (MAR-116) implementation is scoped to fundamental/valuation metrics from `financial_ratios` only.
- New AC needed for Story 1.2: (a) ticker valid but `financial_ratios` has no row for it → AI says so; (b) user asks for price/technical data → AI says it doesn't have that data, rather than inventing or silently substituting fundamentals.
- Price/OHLCV data is an explicit gap, not a silent omission — extending `python/` with a price scraper + new Postgres table is a future story, to be scoped when prioritized.
- `docker-compose/postgres.yml` uncommented in `docker-compose.yml`; local `.env` created (gitignored) with Postgres credentials for dev.
