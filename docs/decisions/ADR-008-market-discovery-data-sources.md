# ADR-008: Data Sources for Market Discovery (FR-6..FR-11) — delta on ADR-006

- **Status:** Accepted
- **Date:** 2026-06-25
- **SUPERSEDES:** ADR-006's narrowing of FR-2 scope to `financial_ratios` only — that narrowing was correct for Epic 1, this ADR extends scope for Epic 2.
- **CHANGED:** Confirms a concrete data-sourcing plan for each of FR-6 through FR-11 (Epic 2: Market Discovery & Stock Detail), resolving SPIKE MAR-119.
- **UNCHANGED:** ADR-006's core rule still applies — `idx-stock-data-api` remains out of scope; any new data need is met by extending this repo's own `python/` scraper, never by reaching into that other project. ADR-003's EOD-only/no-realtime constraint is unaffected, only reinforced (see Decision 6 below).
- **REASON:** Epic 1 retrospective (party-mode, 2026-06-25) flagged a risk: Epic 2's data surface (IHSG, trending, sector, news) is much larger than Epic 1's single read-only table, and Story 1.2 had already shown what happens when a data-source assumption goes unverified until mid-implementation (Postgres wasn't running; no price/OHLCV table existed). SPIKE MAR-119 was opened to verify each FR's data source before any Epic 2 story gets written.

## Context

Investigation of `python/` and the current Postgres schema (`app/src/server/db/schema.ts`) found:

- The only table Sahamigo currently reads is `financial_ratios` (fundamental/valuation metrics, annual, plus `sector`/`sub_sector`/`industry`/`sub_industry` classification columns) — confirmed by ADR-006.
- `python/`'s scrapers produce more data than what's ETL'd into Postgres today. Specifically:
  - `companySummaryByKodeEmiten.json` already contains daily OHLCV + change% per ticker, scraped and on disk.
  - `neo4j_ingest.py` already has a `TradeDay` node schema in Neo4j with that same daily OHLCV shape — proving the data is already structured, just not in Postgres.
  - `scrape_idx_news.py` already scrapes IDX market news into `data/news/idx_news_*.json` — working, just JSON-only.
  - `scrape_index_summary.py` already fetches IDX's own official `GetIndexSummary` endpoint (`https://www.idx.co.id/primary/TradingSummary/GetIndexSummary`) — covering IHSG and, per the endpoint's `length=9999` parameter, plausibly all of IDX's published indices (which would include sectoral indices, not just the composite). It writes to `index_summary.json` only, never to Postgres. The exact response shape (whether sectoral indices are actually present alongside IHSG) was not confirmed live — the endpoint is Cloudflare-protected and only reachable via the scraper's `curl_cffi` Chrome-impersonation, which this SPIKE did not run. Confirming the response shape is a first-step task of whichever story implements FR-6/FR-9, not assumed here.
  - No table anywhere has a `scraped_at`/`ingested_at` column. `financial_ratios.fs_date` is a fiscal statement date (e.g. "2024-06-30"), not a scrape-recency timestamp — using it to label data "EOD" would overstate freshness.

## Decision

1. **FR-6 (IHSG summary/chart):** no new scraper required. `scrape_index_summary.py` already fetches this from IDX's own official endpoint. New Postgres table for index daily values (e.g. `index_summary`), ETL'd from its existing JSON output — same pattern as Decisions 3 and 5 below. The data collection gap is "never ETL'd to Postgres," not "never scraped."
2. **FR-7 (ticker search):** no scraper/schema change needed. `financial_ratios.code`/`stock_name` already cover this — implement as an app-layer query (and an index if search latency becomes a real problem, not preemptively).
3. **FR-8 (trending/top movers):** no new scraping required. Extend the ETL layer (same pattern as `financial_ratios_json2pg.py`) to write `companySummaryByKodeEmiten.json`'s already-scraped daily OHLCV/change data into a new Postgres table (e.g. `daily_trade_summary`). The data collection gap that blocked this under ADR-006 ("no daily price/OHLCV table anywhere in this repo's pipeline") is resolved by this ETL addition — the underlying data was already being collected, just not persisted to Postgres.
4. **FR-9 (sector performance):** likely no new data source, but unconfirmed. If `GetIndexSummary` (Decision 1) turns out to include IDX's sectoral indices (plausible given it returns all indices, not just IHSG), FR-9 may be served directly from the same `index_summary` table with no aggregation needed. If not, fall back to aggregating the `daily_trade_summary` table (Decision 3) grouped by `financial_ratios.sector`/`sub_sector`. Whichever story implements this confirms the actual `GetIndexSummary` response shape first, rather than assuming either path.
5. **FR-10 (market news):** no new scraping required. New Postgres table (e.g. `market_news`) ETL'd from `scrape_idx_news.py`'s existing JSON output, same pattern as Decision 3.
6. **FR-11 (EOD labeling):** every new table introduced by Decisions 1, 3, 4, and 5 must include an explicit `scraped_at` (or equivalent) timestamp column, populated by the ETL step itself — not derived from `fs_date` or any source-side date field, which may not reflect actual scrape recency. This is a required AC on any story that introduces one of these tables, not an optional nice-to-have.

## Alternatives Rejected

- **Sourcing IHSG/news/trade data from a third-party live API** — rejected; violates ADR-003's EOD-only/no-realtime-third-party-feed constraint and ADR-006's "extend this repo's scraper, don't reach outside it" rule. Every gap identified above is fully addressable by extending data already being collected or trivially reachable via yfinance, so there is no case for an exception here.
- **Reaching into `idx-stock-data-api`** — rejected again, for the same reason ADR-006 rejected it: separate, unrelated project: Sahamigo must not depend on it.
- **Deriving EOD freshness from `fs_date` or source JSON date fields** — rejected; conflates "what period this data describes" with "when we actually scraped it," which is exactly the kind of data-honesty gap CLAUDE.md's EOD constraint exists to prevent.

## Consequences

- Epic 2 story breakdown (MAR-111) can proceed — no further SPIKE needed before writing stories, the data-sourcing question SPIKE MAR-119 was opened to answer is resolved.
- Up to three new Postgres tables anticipated across Epic 2's stories: `index_summary` (FR-6, possibly also FR-9), `daily_trade_summary` (FR-8, and FR-9 if `index_summary` doesn't cover sectoral indices), `market_news` (FR-10) — each app-owned (Drizzle-migrated), following the same ownership pattern Story 1.4 established for `chat_threads`/`chat_messages`, in contrast to `financial_ratios`'s externally-owned/read-only rule.
- Each of those tables' stories must include an explicit `scraped_at`-style AC (Decision 6) in their Definition of Done, not just in dev notes.
- `python/`'s scraper pipeline gains three new ETL scripts (index summary, trade summary, news) that ingest already-scraped JSON into Postgres — no new scraper and no new third-party data dependency needed; all underlying data is already being collected.
- Whichever story implements FR-6 confirms `GetIndexSummary`'s actual response shape (does it include sectoral indices?) as a first step — this determines whether FR-9 needs Decision 4's aggregation fallback at all.
