---
baseline_commit: 0bc8e85c31c3bf9ba4359f12219474263257f50c
---

# Story 2.4: Sector Performance Breakdown

Status: review

## Story

As a user, I want to see how different sectors performed, so that I can understand which parts of the market are moving and explore from a sector lens.

## Acceptance Criteria

1. Given I open the Search/IHSG view, When the page loads, Then I see a performance breakdown grouped by sector.
2. Given `GetIndexSummary`'s actual response shape was left unconfirmed at SPIKE time (ADR-008), When this story starts, Then the first implementation step confirms whether `index_summary` (Story 2.1) already contains sectoral indices.
3. Given `index_summary` does contain sectoral data, When sector performance is shown, Then it's served directly from `index_summary` — no new table.
4. Given `index_summary` does NOT contain sectoral data, When sector performance is computed instead, Then it's aggregated from `daily_trade_summary` (Story 2.3) grouped by `financial_ratios.sector`/`sub_sector`.

(Source: Linear MAR-123, ADR-008 Decision 4)

## Tasks / Subtasks

- [x] Task 0: Confirm `GetIndexSummary` response shape
  - [x] Ran `python/scrape_index_summary.py` live — confirmed 45 records including 11 sector indices (IDXENERGY, IDXBASIC, IDXINDUST, IDXNONCYC, IDXCYCLIC, IDXHEALTH, IDXFINANCE, IDXPROPERT, IDXTECHNO, IDXINFRA, IDXTRANS). AC2 confirmed: path is "index_summary contains sector data." AC4 path (aggregation fallback) is NOT needed.

- [x] Task 1: Backend — `GET /api/market/sectors`
  - [x] Add endpoint to `app/src/server/routes/market.ts`. Query `index_summary` for latest `tradeDate`, filter `indexCode IN (SECTOR_CODES)`, return sorted by `changePct` DESC (computed as `(change/previous)*100` where previous > 0).
  - [x] Response: `{ tradeDate, sectors: [{ indexCode, sectorName, close, change, changePct, numberOfStock }], staleness }`.
  - [x] Include `staleness` using the shared `computeStaleness` helper (same pattern as `/ihsg` and `/trending`).

- [x] Task 2: Frontend — `SectorPerformance` component
  - [x] Create `app/src/web/components/market/SectorPerformance.tsx`. `useQuery` fetches `/api/market/sectors`. Show each sector as a row: sector name + changePct badge (green if positive, red if negative, gray if zero/null). EOD badge in section header.
  - [x] Add to `app/src/web/routes/search.tsx` below TrendingStocks.
  - [x] Add CSS to `app/src/web/routes/search.css`.

- [x] Task 3: Tests
  - [x] Added `describe("GET /sectors")` in `app/tests/market.test.ts`: 6 tests — empty table, sorted DESC, excludes non-sector codes, changePct computation, changePct null when previous=0, uses latest tradeDate.
  - [x] Added render test in `app/tests/search-route.test.tsx`: SectorPerformance renders on page.

## Dev Notes

- **AC2 resolved**: `GetIndexSummary` returns 45 rows including all 11 IDX sector indices. Sector codes confirmed 2026-06-26. ETL unchanged — `scrape_index_summary.py` + `index_summary_json2pg.py` already captures them.
- **Sector codes** (11 total): `IDXENERGY`, `IDXBASIC`, `IDXINDUST`, `IDXNONCYC`, `IDXCYCLIC`, `IDXHEALTH`, `IDXFINANCE`, `IDXPROPERT`, `IDXTECHNO`, `IDXINFRA`, `IDXTRANS`.
- **Sector name map** (Bahasa Indonesia per IDX standard): IDXENERGY→Energi, IDXBASIC→Barang Baku, IDXINDUST→Industri, IDXNONCYC→Kons. Non-Siklus, IDXCYCLIC→Kons. Siklus, IDXHEALTH→Kesehatan, IDXFINANCE→Keuangan, IDXPROPERT→Properti & RE, IDXTECHNO→Teknologi, IDXINFRA→Infrastruktur, IDXTRANS→Transportasi.
- **`changePct` computation**: IDX API provides `Change` (absolute) and `Previous` — compute `changePct = change/previous*100`. If `previous` is null or 0, `changePct = null`. Same pattern as `daily_trade_summary_json2pg.py`.
- **No new migration**: `index_summary` table already exists (Story 2.1). Sector rows are stored there as-is.
- **`computeStaleness`**: already exists in `market.ts` — reuse same helper.
- **`noUncheckedIndexedAccess`**: use `.map()`, never index access on arrays.
- **EOD badge**: required per CLAUDE.md EOD-honesty constraint and 3-point DoD.
- **Golden Rule check**: sector performance is pure data display — no AI, no recommendation. Passes automatically.

### Project Structure Notes

New files:
```
app/src/web/components/market/SectorPerformance.tsx
```

Updated:
- `app/src/server/routes/market.ts` — add `GET /api/market/sectors`
- `app/src/web/routes/search.tsx` — add `<SectorPerformance />`
- `app/src/web/routes/search.css` — add sector styles
- `app/tests/market.test.ts` — add sector endpoint tests
- `app/tests/search-route.test.tsx` — add SectorPerformance render test

### References

- Linear: MAR-123 (this story) under MAR-111 (Epic 2)
- ADR-008 Decision 4: sector data from `index_summary` (path A confirmed)
- `app/src/server/db/market-schema.ts` — `indexSummary` table
- `app/src/server/routes/market.ts` — add here

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- AC2 check: `GetIndexSummary` returns 45 rows with IndexCode including IDXENERGY..IDXTRANS. Path A (index_summary has sector data) confirmed. Path B (aggregation from daily_trade_summary) not needed.

### Completion Notes List

- `GetIndexSummary` returns 45 rows including all 11 sector indices — `index_summary` path confirmed, no new table or aggregation needed.
- `SECTOR_CODES` const array + `SECTOR_NAMES` map defined in `market.ts`; `inArray` from drizzle-orm used for the filter.
- `changePct` computed in app layer (not stored): `change/previous*100`, null when previous=0 or null.
- Sorting done in app layer (`.sort()`) since multiple columns would be needed for DB-layer ORDER BY with computed values.
- `renderSearch()` in `search-route.test.tsx` updated with 3rd arg `mockSectors` dispatched by `/sectors` URL.

### File List

- `_bmad-output/implementation-artifacts/2-4-sector-performance.md` (this file)
- `app/src/server/routes/market.ts` (updated — `GET /api/market/sectors`, `SECTOR_CODES`, `SECTOR_NAMES`, `inArray` import)
- `app/src/web/components/market/SectorPerformance.tsx` (new)
- `app/src/web/routes/search.tsx` (updated — `<SectorPerformance />` added, placeholder text updated)
- `app/src/web/routes/search.css` (updated — sector styles appended)
- `app/tests/market.test.ts` (updated — 6 new `/sectors` tests)
- `app/tests/search-route.test.tsx` (updated — `mockSectors` arg, 1 new render test)

### Change Log

- 2026-06-26: Story created and implemented. Task 0 (data confirmation): index_summary path confirmed. Tasks 1–3 complete. 75 tests pass (0 fail). Status: review.
