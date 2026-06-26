---
baseline_commit: 1b6b7c1f01804aed327cbce18f7d0a99cb270e36
---

# Story 2.3: Trending Stocks and Top Movers

Status: done

## Story

As a user, I want to see which stocks are trending or moved the most today,
so that I can discover stocks worth looking into beyond ones I already know.

## Acceptance Criteria

1. Given I open the Search/IHSG view, When the page loads, Then I see top gainer/loser/value/volume lists sourced from EOD trade data.
2. Given the list is dense, When displayed, Then it shows a curated top-N with a "Selengkapnya" expansion link (UX-DR2), not full density by default.
3. Given the ETL writes `daily_trade_summary` rows, When ingested, Then each row has a `scraped_at` timestamp.

(Source: Linear MAR-122, ADR-008 Decision 3 + Decision 6, CLAUDE.md DoD checks)

## Tasks / Subtasks

- [x] Task 1: Scraper — `scrape_company_summary.py`
  - [x] Create `python/scrape_company_summary.py` following `scrape_index_summary.py` pattern: hits `https://www.idx.co.id/primary/TradingSummary/GetStockSummary?length=9999&start=0` with `curl_cffi` Chrome impersonation, writes output to `data/companySummaryByKodeEmiten.json`. Confirmed live: 959 stocks, same field shape as existing JSON (StockCode, StockName, Previous, Close, Change, Volume, Value, Frequency, persen=null, percentage=null).
  - [x] `change_pct` is NOT in the source data (`persen`/`percentage` always null) — must be computed by ETL as `Change/Previous*100` (handle `Previous=0` as null).

- [x] Task 2: DB schema — add `daily_trade_summary` to `market-schema.ts`
  - [x] Add to `app/src/server/db/market-schema.ts` (same file, same ownership pattern as `index_summary`): `daily_trade_summary` table with columns: `stock_code TEXT`, `trade_date DATE`, `stock_name TEXT`, `previous DOUBLE`, `open_price DOUBLE`, `high DOUBLE`, `low DOUBLE`, `close DOUBLE`, `change DOUBLE`, `change_pct DOUBLE`, `volume DOUBLE`, `value DOUBLE`, `frequency DOUBLE`, `scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`. Composite PK: `(stock_code, trade_date)`.
  - [x] Run `cd app && bunx drizzle-kit generate` — generated `0002_classy_catseye.sql`. Applied to local dev Postgres on port 5434.

- [x] Task 3: Python ETL — `daily_trade_summary_json2pg.py`
  - [x] Create `python/daily_trade_summary_json2pg.py`: reads `data/companySummaryByKodeEmiten.json`, computes `change_pct = Change/Previous*100` (null if Previous is 0 or null), upserts all rows into `daily_trade_summary`. ON CONFLICT `(stock_code, trade_date)` DO UPDATE all value columns and `scraped_at`. `scraped_at = now()` at ingestion time, never from source `Date` field.

- [x] Task 4: Backend — `GET /api/market/trending`
  - [x] Added to `app/src/server/routes/market.ts`. Queries `daily_trade_summary` for the most recent `trade_date`, returns top 10 for each category: gainers (change_pct DESC), losers (change_pct ASC), top_value (value DESC), top_volume (volume DESC). Excludes rows where `close IS NULL OR close = 0`. Refactored `computeStaleness()` helper shared with /ihsg.
  - [x] Response: `{ tradeDate, gainers, losers, topValue, topVolume, staleness }`.
  - [x] Empty state: `{ tradeDate: null, gainers: [], losers: [], topValue: [], topVolume: [], staleness: null }` if table is empty.

- [x] Task 5: Frontend — `TrendingStocks` component
  - [x] Created `app/src/web/components/market/TrendingStocks.tsx`: fetches `GET /api/market/trending` via `useQuery`. Renders 4 sections: "Top Gainer", "Top Loser", "Nilai Terbesar", "Volume Terbesar". Each shows top 5 rows by default. "Selengkapnya (N lagi)" button expands inline to show all 10.
  - [x] Each row: ticker badge + stock name + close price + change% (or value/volume for respective sections).
  - [x] EOD badge in heading "Saham Trending <EOD>". Consistent with IhsgSummary.
  - [x] Replaced `<section className="search-coming-soon">` in `search.tsx` with `<TrendingStocks />`. Kept placeholder for sector/news scope (Stories 2.4/2.5).

- [x] Task 6: Tests and CI
  - [x] `app/tests/market.test.ts` — added 5 tests for `GET /api/market/trending`: empty state, gainers order, losers order, excludes null/zero close, staleness, max 10 rows.
  - [x] `app/tests/search-route.test.tsx` — updated `renderSearch` to mock both `/ihsg` and `/trending` endpoints by URL; added test: TrendingStocks renders `trending-stocks` class and "Saham Trending" heading.
  - [x] CI: added migration step for `drizzle/0002_classy_catseye.sql` in `.github/workflows/app-ci.yml`.
  - [x] `bun run lint`, `bun run typecheck`, `bun test` — all clean (60 pass, 0 fail).

## Dev Notes

- **`persen`/`percentage` fields in source JSON are always null** — do NOT use them. Compute `change_pct` in ETL as `Change / Previous * 100`. Handle `Previous = 0` as null change_pct to avoid divide-by-zero.
- **Same `market-schema.ts` file for all market tables** — Winston confirmed this in the stand-up: add `daily_trade_summary` to the existing file, not a new file. `drizzle.config.ts` already includes it.
- **Scraper writes to `data/companySummaryByKodeEmiten.json`** (in `data/` relative to project root, not `python/`). ETL reads from the same path. Scraper confirmed live at `GetStockSummary?length=9999&start=0`.
- **Exclude suspended/non-trading stocks** from trending lists: rows where `close IS NULL OR close = 0` should be filtered out. These exist in the data (stocks with no trades that day).
- **`Selengkapnya` = progressive disclosure (UX-DR2):** default show 5, expand inline to show all 10 on click. No new page, no modal — same pattern as established in the design reference.
- **Golden Rule (DoD check 1):** trending stocks are factual rank data — no AI, no signal. Green/red for change% is factual direction, not a buy/sell verdict. Passes trivially.
- **EOD label (DoD check 2):** subtitle "Data EOD" on the TrendingStocks section heading. Consistent with IhsgSummary's EOD badge.
- **CI note:** the new migration file will be `0002_*.sql` — add it to CI after `0001_worried_mathemanic.sql`.

### Project Structure Notes

New files:
```
python/
  scrape_company_summary.py         # scraper: GetStockSummary → data/companySummaryByKodeEmiten.json
  daily_trade_summary_json2pg.py    # ETL: JSON → daily_trade_summary table
app/
  drizzle/0002_*.sql                # migration for daily_trade_summary
  src/web/components/market/
    TrendingStocks.tsx              # 4-section trending component
```

Updated:
- `app/src/server/db/market-schema.ts` — add `daily_trade_summary` table
- `app/src/server/routes/market.ts` — add `GET /api/market/trending`
- `app/src/web/routes/search.tsx` — replace placeholder with `<TrendingStocks />`
- `app/tests/market.test.ts` — add trending endpoint tests
- `app/tests/search-route.test.tsx` — add TrendingStocks render test
- `.github/workflows/app-ci.yml` — add migration 0002 step

### References

- Linear: MAR-122 (this story) under MAR-111 (Epic 2)
- ADR-008 Decision 3: `daily_trade_summary` sourced from `companySummaryByKodeEmiten.json`
- ADR-008 Decision 6: `scraped_at` mandatory on all new tables
- ADR-009: no production deploy per story — code must be deployable, not deployed
- `python/scrape_index_summary.py` — scraper pattern to follow
- `python/index_summary_json2pg.py` — ETL pattern to follow
- `app/src/server/db/market-schema.ts` — add new table here
- `app/src/server/routes/market.ts` — add new endpoint here

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Local DB on port 5434 (not 5432) — migration applied with `-p 5434`. CI uses 5432 as configured in workflow env.

### Completion Notes List

- `persen`/`percentage` in source JSON are always null; computed `change_pct` in ETL as `Change/Previous*100`.
- Used `sql\`${dailyTradeSummary.close} > 0\`` instead of `gt()` to avoid TypeScript nullable column type friction.
- `Promise.all` for 4 parallel Drizzle queries in `/trending` reduces DB round-trips.
- `renderSearch()` in search-route test updated to dispatch mock by URL so both IHSG and trending fetch correctly.
- Story file is in `_bmad-output/implementation-artifacts/` (not checked into git as src code, only tracked as delivery artifact).

### File List

- `python/scrape_company_summary.py` (new)
- `python/daily_trade_summary_json2pg.py` (new)
- `app/src/server/db/market-schema.ts` (updated — `dailyTradeSummary` table added)
- `app/drizzle/0002_classy_catseye.sql` (new migration)
- `app/drizzle/meta/0002_snapshot.json` (generated)
- `app/drizzle/meta/_journal.json` (updated)
- `app/src/server/routes/market.ts` (updated — `/trending` endpoint, `computeStaleness` helper)
- `app/src/web/components/market/TrendingStocks.tsx` (new)
- `app/src/web/routes/search.tsx` (updated — `<TrendingStocks />` added)
- `app/src/web/routes/search.css` (updated — trending styles added)
- `app/tests/market.test.ts` (updated — 5 trending tests added)
- `app/tests/search-route.test.tsx` (updated — mock updated, 1 trending test added)
- `.github/workflows/app-ci.yml` (updated — migration 0002 step added)
- `_bmad-output/implementation-artifacts/2-3-trending-stocks-and-top-movers.md` (this file)

### Change Log

- 2026-06-26: Story drafted from Linear MAR-122, ADR-008, and live confirmation of GetStockSummary endpoint (959 stocks, 2026-06-25 data, persen/percentage always null). Status set to in-progress.
- 2026-06-26: All tasks complete. 60 tests pass. Status: done.
