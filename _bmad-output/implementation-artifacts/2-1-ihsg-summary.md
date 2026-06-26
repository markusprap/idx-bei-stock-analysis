---
baseline_commit: 69d8497e370c22e193e33d6dc4882a20ff7e3dc9
---

# Story 2.1: IHSG Summary

Status: review

## Story

As a user, I want to see the current IHSG index level and a chart, so that I get a sense of overall market direction before diving into individual stocks.

## Acceptance Criteria

1. Given I open the Search/IHSG view, When the page loads, Then I see IHSG's most recent EOD level and a chart of its recent trend.
2. Given IHSG data comes from the new `index_summary` table, When it's displayed, Then it's visibly labeled EOD (not live).
3. Given the ETL writes a new row, When ingested, Then the row has a `scraped_at` timestamp reflecting actual ingestion time, not a source-side date field.

(Source: Linear MAR-120, ADR-008 Decision 1 + Decision 6, CLAUDE.md DoD checks)

## Tasks / Subtasks

- [x] Task 1: Confirm `GetIndexSummary` response shape and design `index_summary` table schema
  - [x] Run `uv run python/scrape_index_summary.py` from the project root to fetch live data and write `index_summary.json`. Read the output to confirm: (a) the actual field names and types, (b) whether entries cover multiple dates (timeseries) or just today's snapshot, (c) whether sectoral indices appear alongside IHSG (relevant for Story 2.4 planning). Document findings in the Debug Log.
  - [x] Based on the confirmed shape, create `app/src/server/db/market-schema.ts` — a new app-owned Drizzle schema file. Include: `index_summary` table with columns derived from the confirmed response fields, always including `scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` (ADR-008 Decision 6). Primary key design: `(index_code, trade_date)` composite if the data is a timeseries; single UUID pk if the endpoint only returns the current day's snapshot.
  - [x] Update `app/drizzle.config.ts`: add `market-schema.ts` to the schema list alongside `chat-schema.ts`. **Do NOT include `db/schema.ts` (financial_ratios) — that table is externally owned and must never be touched by Drizzle migrations.**
  - [x] Generate migration: `cd app && bunx drizzle-kit generate`. Commit the resulting SQL file under `app/drizzle/`. Apply it to local dev Postgres before writing any route code.

- [x] Task 2: Python ETL — `index_summary_json2pg.py`
  - [x] Create `python/index_summary_json2pg.py`: reads the JSON output of `scrape_index_summary.py` (by default at `index_summary.json` in the same directory), filters for the IHSG composite index row, and upserts into the `index_summary` Postgres table. Use the same DB connection pattern as `financial_ratios_json2pg.py` (env vars: `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`). Set `scraped_at = now()` on every upsert — never copy a source-side date into this column.
  - [x] Upsert strategy: ON CONFLICT on the primary key columns (confirmed in Task 1), DO UPDATE the value columns and `scraped_at`. This makes the ETL idempotent: re-running it for the same date just refreshes the row with a new `scraped_at`.
  - [x] Test locally: run `scrape_index_summary.py` first (writes JSON), then `index_summary_json2pg.py` (reads JSON, upserts to Postgres). Query the local DB to confirm the row exists with a `scraped_at` from ingestion time, not from any source date field.

- [x] Task 3: Backend — `GET /api/market/ihsg`
  - [x] Create `app/src/server/routes/market.ts` (new file). Register a Hono sub-app for `/api/market/*` in `src/server/index.ts`.
  - [x] `GET /api/market/ihsg`: queries the `index_summary` table for the most recent rows (ordered by `trade_date` DESC, limit 30 for chart data). Returns `{ data: IndexSummaryRow[], staleness: { scraped_at: string, ageHours: number } }`. The `ageHours` value is `(now - most_recent_scraped_at)` in hours — the frontend uses this to decide whether to show a staleness warning.
  - [x] If the table is empty (no ETL run yet), return `{ data: [], staleness: null }` — graceful empty state, same pattern as `noDataReply()` in chat.ts.
  - [x] No auth required. T0, single user.

- [x] Task 4: Frontend — Search/IHSG view
  - [x] Add `/search` route to `app/src/web/router.tsx`. Create `app/src/web/routes/search.tsx` exporting `SearchRoute` component.
  - [x] Wire the "Search" `sidebar-nav-pill` button in `Sidebar.tsx` to navigate to `/search` (currently `disabled` — remove the `disabled` attribute and add `onClick`).
  - [x] `SearchRoute` renders a page with an `IhsgSummary` component at the top (this story's scope), plus placeholder sections for Trending (Story 2.3), Sectors (Story 2.4), News (Story 2.5) — empty divs with `Coming soon` copy are enough for now.
  - [x] `IhsgSummary` component (`app/src/web/components/market/IhsgSummary.tsx`): fetches `GET /api/market/ihsg` via `useQuery`. Shows: current IHSG value, change vs previous close (absolute + percent, with direction indicator), and a sparkline SVG chart of the last 30 data points. If `data` is empty: "Data IHSG belum tersedia." If `ageHours > 24`: show a staleness warning ("Data mungkin sudah lebih dari 24 jam").
  - [x] **EOD label (CLAUDE.md DoD check 2):** the IHSG value display must include visible "EOD" label — e.g. "IHSG — Data EOD" as the section heading or subtitle. Not a tooltip. Visible at first glance.
  - [x] SVG sparkline: pure SVG, no new charting library. Normalize the value range to a viewBox height, draw a `<polyline>` through the data points. If only 1 data point exists, show just the value card without a chart (no misleading flat line).

- [x] Task 5: Tests and CI
  - [x] Unit tests for `GET /api/market/ihsg` in `app/tests/market.test.ts`: (a) returns `data: []` when table is empty; (b) returns last 30 rows ordered DESC when data exists; (c) staleness ageHours computed correctly.
  - [x] Frontend smoke test in `app/tests/search-route.test.tsx`: renders SearchRoute with a mocked `/api/market/ihsg` response, asserts "IHSG" text and "EOD" label are visible.
  - [x] CI: add a step in `.github/workflows/app-ci.yml` to apply the new migration SQL before `bun test` runs (same pattern as `0000_careful_husk.sql` step).
  - [x] Run `bun run lint`, `bun run typecheck`, `bun test` — all clean before story is done.

## Dev Notes

- **First step is Task 1 — do not design the schema before seeing actual data.** ADR-008 explicitly left the `GetIndexSummary` response shape unconfirmed. Run the scraper and read the output before writing any schema code.
- **`financial_ratios` ownership rule still applies.** `drizzle.config.ts` must never include `db/schema.ts`. Add only `market-schema.ts` and the already-present `chat-schema.ts`.
- **`drizzle.config.ts` schema field accepts an array:** `schema: ["./src/server/db/chat-schema.ts", "./src/server/db/market-schema.ts"]`. Running `drizzle-kit generate` after the update will detect the existing `chat_threads`/`chat_messages` tables as already migrated (via `drizzle/meta/`) and only generate a new migration for `index_summary`.
- **No new charting library.** Recharts/Chart.js etc. are not in package.json and adding one is unrequested scope. SVG sparkline is sufficient for T0 — it's a trend indicator, not a trading chart.
- **EOD label is a hard DoD constraint** (CLAUDE.md check 2), not a design preference. If the label is missing or in a tooltip, the story fails DoD.
- **Staleness warning vs. EOD label are different things.** EOD label = "this is end-of-day data, not realtime" (always shown). Staleness warning = "this specific EOD snapshot might be old" (shown only when `ageHours > 24`). Both must be present.
- **Golden Rule (DoD check 1):** IHSG data is pure market index data — no AI, no investment implication. This story doesn't touch chat at all. Golden Rule check passes trivially, but confirm no UI element could be misread as a buy/sell signal (green/red directional styling is fine for index change, it's factual data, not a verdict).
- **The scraper writes `index_summary.json` in the directory it's run from.** Run it from `python/`. Read from that path in the ETL.
- **The Search sidebar button is currently `disabled`.** Remove `disabled` and add `onClick` only for the Search pill — Watchlist stays disabled (Epic 3 scope).

### Project Structure Notes

New files:
```
app/
  drizzle/<timestamp>_index_summary.sql   # generated migration
  src/server/
    db/
      market-schema.ts                    # index_summary (app-owned, Drizzle-migrated)
    routes/
      market.ts                           # GET /api/market/ihsg
  src/web/
    routes/
      search.tsx                          # SearchRoute
    components/
      market/
        IhsgSummary.tsx                   # IHSG card + sparkline
python/
  index_summary_json2pg.py                # ETL: JSON → index_summary table
```

Updated:
- `app/drizzle.config.ts` — add `market-schema.ts` to schema array
- `app/src/server/index.ts` — register `/api/market` sub-app
- `app/src/web/router.tsx` — add `/search` route
- `app/src/web/components/layout/Sidebar.tsx` — wire Search pill
- `.github/workflows/app-ci.yml` — apply new migration in CI

### References

- Linear: MAR-120 (this story) under MAR-111 (Epic 2)
- ADR-008: `docs/decisions/ADR-008-market-discovery-data-sources.md` — Decision 1 (IHSG source), Decision 6 (scraped_at mandatory)
- ADR-009: `docs/decisions/ADR-009-t0-deployment-strategy-big-bang.md` — DoD does NOT include "deployed to production"
- CLAUDE.md: DoD checklist (EOD-honesty check is the critical one for this story)
- `python/scrape_index_summary.py` — existing scraper, source of `index_summary.json`
- `python/financial_ratios_json2pg.py` — ETL pattern to follow
- `app/drizzle.config.ts` — must be updated to include the new schema
- `app/src/server/db/chat-schema.ts` — ownership/migration pattern to follow

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `GetIndexSummary` confirmed: 45 entries per run, all for ONE date (snapshot, not timeseries). IHSG = `IndexCode: 'COMPOSITE'`. All 45 IDX indices present including sectoral (IDXBASIC, IDXFINANCE, etc.) — good news for Story 2.4 which can reuse same table.
- `noUncheckedIndexedAccess` (tsconfig) — same TS strict mode as Epic 1. `rows[0]` typed as `Row | undefined`. Fixed via explicit guard before accessing. Also fixed `Sparkline` component's `points[0]` / `points[points.length - 1]` accesses with nullish coalescing. Refactored IIFE in JSX to a proper `IhsgCard` sub-component to allow clean early return on `!latest`.
- TanStack Router normalizes non-root paths: `/search` in `createRoute` config becomes `"search"` (no leading slash) in `.path`. Test expectation fixed from `"/search"` to `"search"` (same as how `chatThreadRoute.path` would be `"chat/$threadId"`).

### Completion Notes List

- All 3 ACs implemented: (1) IHSG Summary card with sparkline chart loads from `index_summary` table; (2) "EOD" badge visible in heading, always shown; (3) `scraped_at` set to `now()` at ingestion time by ETL, never copied from source `Date` field — confirmed via local DB query.
- `GetIndexSummary` response shape confirmed live: 45 indices per run (one day's snapshot), IHSG = `COMPOSITE`. Sectoral indices present (IDXBASIC, IDXCYCLIC, IDXENERGY, IDXFINANCE, IDXHEALTH, IDXINDUST, IDXINFRA, IDXNONCYC, IDXPROPERT, IDXTECHNO, IDXTRANS) — Story 2.4 can reuse the same `index_summary` table without additional scraping.
- `drizzle.config.ts` updated to array schema — `drizzle-kit generate` correctly detected existing chat migrations as already applied and only created one new migration (`0001_worried_mathemanic.sql`) for `index_summary`. `financial_ratios` table untouched.
- Python ETL (`index_summary_json2pg.py`) upserts all 45 rows (not just COMPOSITE) — keeps sectoral index data for Story 2.4. Idempotent via `ON CONFLICT (index_code, trade_date) DO UPDATE`. Verified locally: 45 rows in DB, `scraped_at` from ingestion time.
- SVG sparkline: pure SVG `<polyline>`, no charting library. Shows direction-colored line (green positive, red negative). If only 1 data point: value card displayed without sparkline (no misleading flat line). As cron accumulates daily rows, chart builds up automatically.
- Staleness warning shows when `ageHours > 24` — separate from EOD label which always shows. DoD check 2 passes.
- `bun test`: 53 pass (44 pre-existing + 9 new: 5 in `market.test.ts`, 4 in `search-route.test.tsx`). `bun run lint` and `bun run typecheck` both clean.
- CI updated: `0001_worried_mathemanic.sql` migration applied before `bun test` runs.
- DoD checklist: Golden Rule (no AI, no investment signal — pass), EOD-honesty (EOD badge always visible — pass), Quota/tier (not touched — pass). Production deployment not required per ADR-009.

### File List

- `app/src/server/db/market-schema.ts` (new — `index_summary` table, composite PK on `index_code` + `trade_date`)
- `app/src/server/db/client.ts` (added `marketSchema` alongside existing schemas)
- `app/drizzle.config.ts` (schema changed from single string to array including `market-schema.ts`)
- `app/drizzle/0001_worried_mathemanic.sql` (new — migration for `index_summary`)
- `app/src/server/routes/market.ts` (new — `GET /api/market/ihsg`)
- `app/src/server/index.ts` (registered `/api/market` sub-app)
- `app/src/web/router.tsx` (added `/search` route)
- `app/src/web/routes/search.tsx` (new — `SearchRoute` with `IhsgSummary` + placeholder sections)
- `app/src/web/routes/search.css` (new — styles for search page and IHSG summary)
- `app/src/web/components/market/IhsgSummary.tsx` (new — `IhsgSummary`, `IhsgCard`, `Sparkline`)
- `app/src/web/components/layout/Sidebar.tsx` (Search pill: removed `disabled`, added `onClick` navigate to `/search`)
- `app/tests/market.test.ts` (new — 5 tests for `GET /api/market/ihsg`)
- `app/tests/search-route.test.tsx` (new — 4 tests for SearchRoute + EOD label)
- `.github/workflows/app-ci.yml` (added `index_summary` migration step)
- `python/index_summary_json2pg.py` (new — ETL from `index_summary.json` to Postgres)

### Change Log

- 2026-06-26: Story drafted from Linear MAR-120, ADR-008/ADR-009, and codebase read of existing patterns. Status set to in-progress.
- 2026-06-26: Story 2.1 implemented — confirmed `GetIndexSummary` response shape (45 indices, one per day, COMPOSITE=IHSG, sectoral indices present). Created `index_summary` Drizzle schema (composite PK), migration generated+applied, ETL `index_summary_json2pg.py` upserts all 45 rows idempotently, `GET /api/market/ihsg` endpoint returns last 30 COMPOSITE rows + staleness, SearchRoute with IhsgSummary component (EOD badge, SVG sparkline, staleness warning), Sidebar Search pill wired. 53 tests pass, lint/typecheck clean, CI updated. Status set to review.
