---
baseline_commit: a315d395e595b6e28db3b90a6f2ca7bbb2a57267
---

# Story 2.6: Stock Detail Page

Status: review

## Story

As a user, I want to open a stock's detail page and see its price chart and fundamentals, so that I can study one stock in depth before deciding what to ask the AI.

## Acceptance Criteria

1. Given I open a stock's detail page, When it loads, Then I see a price chart with multiple selectable timeframes, sourced from `daily_trade_summary` (Story 2.3).
2. Given I view the fundamental/valuation/profitability tables, When displayed, Then they show annual granularity only, explicitly labeled "(Tahunan)" — never presented as quarterly (FR-13, ADR-003).
3. Given the data store has no row for this ticker, When the page loads, Then it says so explicitly rather than showing blank/broken tables.

(Source: Linear MAR-125, FR-12, FR-13)

## Tasks / Subtasks

- [x] Task 1: Backend — `GET /api/stock/:code/chart` and `GET /api/stock/:code/fundamentals`
  - [x] Create `app/src/server/routes/stock.ts` with `createStockRoute` factory.
  - [x] `GET /:code/chart?timeframe=1M|3M|6M|1Y`: query `dailyTradeSummary` filtered by stockCode and tradeDate >= cutoff; order by tradeDate ASC; return `{ code, stockName, data, staleness }`.
  - [x] `GET /:code/fundamentals`: query `financialRatios` where code=:code, order by fsDate DESC; return `{ code, stockName, rows }`.
  - [x] Register in `app/src/server/index.ts` at `/api/stock`.

- [x] Task 2: Frontend — `PriceChart` component
  - [x] Create `app/src/web/components/stock/PriceChart.tsx`.
  - [x] Timeframe selector buttons: 1B, 3B, 6B, 1T (maps to 1M, 3M, 6M, 1Y params).
  - [x] SVG line chart (no external lib) — polyline of close prices, green if positive, red if negative.
  - [x] EOD badge in section header. Loading/error/empty states. Stale warning.

- [x] Task 3: Frontend — `FundamentalsTable` component
  - [x] Create `app/src/web/components/stock/FundamentalsTable.tsx`.
  - [x] Sections: Valuasi (PER, P/BV, EPS, Book Value), Profitabilitas (ROA, ROE, NPM), Neraca (Aset, Liabilitas, Ekuitas, Pendapatan).
  - [x] Show up to 3 most recent fiscal years as columns; label each column with the year from `fsDate`.
  - [x] Header explicitly labeled "(Tahunan)". Empty state when no rows.

- [x] Task 4: Frontend — Update `StockDetailRoute`
  - [x] Update `app/src/web/routes/stock-detail.tsx`: replace placeholder with PriceChart + FundamentalsTable.
  - [x] Show stock code + name in header. Back button to `/search`.
  - [x] Create `app/src/web/routes/stock-detail.css` and import it.

- [x] Task 5: Tests
  - [x] Create `app/tests/stock.test.ts`: chart endpoint (empty, data ordered ASC, timeframe filter) + fundamentals endpoint (empty, returns rows).
  - [x] Create `app/tests/stock-detail-route.test.tsx`: render test for the stock detail route.

## Dev Notes

- **Chart data**: `daily_trade_summary` columns: stockCode, tradeDate, stockName, close, change, changePct, high, low, volume, scrapedAt.
- **Timeframe map**: 1M=30d, 3M=90d, 6M=180d, 1Y=365d. Default: 3M.
- **Fundamentals**: `financial_ratios` table is externally owned — read-only, no migrations. Multiple rows per code (one per fsDate). `fsDate` is text like "2024-12-31".
- **`noUncheckedIndexedAccess`**: use `.map()`, never array index.
- **No external chart library**: SVG polyline, no deps.
- **EOD badge**: required on chart section per CLAUDE.md EOD-honesty constraint.
- **`(Tahunan)`** label on fundamentals section title — explicit annual-granularity marker (AC2, FR-13).
- **Empty state (AC3)**: chart shows "Data grafik tidak tersedia." when `data.length === 0`; fundamentals shows "Data fundamental tidak tersedia." when `rows.length === 0`.
- **Golden Rule**: this is pure data display, no AI analysis — passes automatically.
- **staleness**: computed from most recent `scrapedAt` in chart data; fundamentals has no `scraped_at` (external table) — omit staleness for fundamentals.

### Project Structure Notes

New files:
```
app/src/server/routes/stock.ts
app/src/web/components/stock/PriceChart.tsx
app/src/web/components/stock/FundamentalsTable.tsx
app/src/web/routes/stock-detail.css
app/tests/stock.test.ts
app/tests/stock-detail-route.test.tsx
```

Updated:
- `app/src/server/index.ts` — register stock route
- `app/src/web/routes/stock-detail.tsx` — replace placeholder

### References

- Linear: MAR-125 (this story) under MAR-111 (Epic 2)
- FR-12: price chart; FR-13: annual fundamentals
- ADR-003: annual-only data labeling

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

- `_bmad-output/implementation-artifacts/2-6-stock-detail.md` (this file)
- `app/src/server/routes/stock.ts` (new)
- `app/src/server/index.ts` (updated — register stock route)
- `app/src/web/router.tsx` (updated — add stockDetailRoute + StockDetailRoute)
- `app/src/web/components/stock/PriceChart.tsx` (new)
- `app/src/web/components/stock/FundamentalsTable.tsx` (new)
- `app/src/web/routes/stock-detail.tsx` (updated — full implementation)
- `app/src/web/routes/stock-detail.css` (new)
- `app/tests/stock.test.ts` (new)
- `app/tests/stock-detail-route.test.tsx` (new)

### Change Log

- 2026-06-26: Story created and fully implemented. 80 tests pass. Status set to review.
