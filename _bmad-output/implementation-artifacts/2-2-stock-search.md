---
baseline_commit: a315d395e595b6e28db3b90a6f2ca7bbb2a57267
---

# Story 2.2: Search Stocks by Ticker or Name

Status: done

## Story

As a user, I want to search for a stock by its ticker or company name,
so that I can quickly find the stock I want to look into.

## Acceptance Criteria

1. Given I type a valid ticker or partial company name into search, When I type, Then I see matching results instantly (debounced as-you-type, like Stockbit).
2. Given my search matches no stock, When results are shown, Then I see a clear empty state, not an error.
3. Given I click a result, When clicked, Then I navigate to the Stock Detail page for that stock.
4. Given I don't click anything, When I press Enter or clear the input, Then I stay on the search page.

(Source: Linear MAR-121, ADR-008 Decision 2, stand-up decisions 2026-06-26)

## Tasks / Subtasks

- [x] Task 1: Backend — `GET /api/market/search?q=`
  - [x] Added to `app/src/server/routes/market.ts`. Source: `financial_ratios`. `selectDistinct({ code, stockName })`, filter `length(code) = 4`, ILIKE on both fields, limit 20. Empty q → return immediately.
  - [x] Response: `{ results: [{ code, stockName }], query }`.

- [x] Task 2: Frontend — `StockSearch` component
  - [x] Created `app/src/web/components/market/StockSearch.tsx`. Debounce 300ms in useEffect (setState reset moved to onChange/handleClear to satisfy react-hooks/set-state-in-effect ESLint rule). Dropdown closes on blur (150ms delay for click). onMouseDown for result selection (fires before onBlur).
  - [x] Added to `search.tsx` above IhsgSummary. CSS added to `search.css`.

- [x] Task 3: Stock Detail placeholder route
  - [x] Created `app/src/web/routes/stock-detail.tsx`. Added `/stock/$code` route to `router.tsx`.

- [x] Task 4: Tests and CI
  - [x] 6 new tests in `market.test.ts`: empty q, no q param, exact ticker, partial name, no match, max 20 limit.
  - [x] 1 new test in `search-route.test.tsx`: StockSearch renders on page.
  - [x] `bun run lint`, `bun run typecheck`, `bun test` — all clean (67 pass, 0 fail). No CI yml change needed (no new migration).

## Dev Notes

- **Data source**: `financial_ratios` (ADR-008 Decision 2) — not `daily_trade_summary` (that table is empty until ETL is run). `financial_ratios` has 944 distinct 4-char stock codes.
- **Waran exclusion**: `LENGTH(code) = 4` — IDX standard: 4 chars = saham biasa, 5+ chars = waran/right issue/derivatif. Decided in stand-up 2026-06-26.
- **Duplicate rows**: `financial_ratios` may have multiple rows per code (one per annual report). Use `selectDistinct({ code, stockName })` to deduplicate.
- **Behaviour**: As-you-type, debounce 300ms. No submit button. Click = navigate. No click = stay. Like Stockbit's search. Decided by Bang Markus in stand-up 2026-06-26.
- **Stock Detail target**: `/stock/$code` — this route will be built in Story 2.6. For now, render a placeholder page. The navigation link must exist (so clicking works), not disabled.
- **`noUncheckedIndexedAccess`**: use `.map()` not index access on results array — safe.
- **Debounce cleanup**: `useEffect` cleanup must clear the timeout ref to prevent state updates on unmounted components.

### Project Structure Notes

New files:
```
app/src/web/components/market/StockSearch.tsx
app/src/web/routes/stock-detail.tsx
```

Updated:
- `app/src/server/routes/market.ts` — add `GET /api/market/search`
- `app/src/web/routes/search.tsx` — add `<StockSearch />`
- `app/src/web/routes/search.css` — add search styles
- `app/src/web/router.tsx` — add `/stock/$code` route
- `app/tests/market.test.ts` — add search endpoint tests
- `app/tests/search-route.test.tsx` — add StockSearch render test

### References

- Linear: MAR-121 (this story) under MAR-111 (Epic 2)
- ADR-008 Decision 2: search from `financial_ratios`, app-layer only
- `app/src/server/db/schema.ts` — `financialRatios` table (code, stockName)
- `app/src/server/routes/market.ts` — add here
- `app/src/web/routes/search.tsx` — update here

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- ESLint rule `react-hooks/set-state-in-effect` blocks `setState` in synchronous effect body. Fixed by moving reset logic to `handleChange` and `handleClear` event handlers; effect only runs debounced fetch.
- Used `onMouseDown` (not `onClick`) on result buttons so click fires before input `onBlur`, preventing dropdown from closing before navigation.

### Completion Notes List

- `financial_ratios` is the search source (ADR-008 Decision 2) — `daily_trade_summary` was empty (ETL not yet run).
- `selectDistinct` deduplicates annual rows per ticker.
- Stock Detail route `/stock/$code` is placeholder — will be replaced in Story 2.6.
- No CI yml change needed — no new migration.

### File List

- `app/src/server/routes/market.ts` (updated — `GET /api/market/search`)
- `app/src/web/components/market/StockSearch.tsx` (new)
- `app/src/web/routes/stock-detail.tsx` (new)
- `app/src/web/router.tsx` (updated — `/stock/$code` route)
- `app/src/web/routes/search.tsx` (updated — `<StockSearch />`)
- `app/src/web/routes/search.css` (updated — search styles)
- `app/tests/market.test.ts` (updated — 6 search tests)
- `app/tests/search-route.test.tsx` (updated — 1 StockSearch test)
- `_bmad-output/implementation-artifacts/2-2-stock-search.md` (this file)

### Change Log

- 2026-06-26: Story drafted. Decisions from stand-up: instant search (Stockbit behaviour), saham biasa only (LENGTH=4), click result → Stock Detail, no click → stay. Status set to in-progress.
