# PRODUCT_CONTEXT.md — Sahamigo (condensed)

Condensed, agent-readable summary of the full PRD (`_bmad-output/planning-artifacts/prds/prd-idx-bei-stock-analysis-2026-06-25/prd.md`), for technical decisions. Read `CLAUDE.md` first for hard constraints — this file is scope, not rules.

## One-line

AI chat tutor for IDX/BEI stocks that shows data exhaustively and never concludes a buy/sell/hold recommendation. T0 = single user (Bang Markus) only.

## Scope — P0 (build for T0, all required for the T0→T1 trigger)

- **Chat** (FR-1→FR-5): default view, fact-based answers, Golden Rule enforcement, chat history, context handoff from Stock Detail (visible ticker chip).
- **Search & IHSG** (FR-6→FR-11): IHSG summary, ticker search, trending/movers, sector performance, market news, EOD labeling. Progressive-disclosure rendering (curated preview + "Selengkapnya"), never full density.
- **Stock Detail** (FR-12→FR-14): chart + fundamental/valuation/profitability tables (annual-only), "Tanya AI soal saham ini" CTA replacing any transact action.
- **Watchlist** (FR-15→FR-17): add/list tickers, tier-capped slots (Free 3 / Pro 25), sparkline + company name per row (company name subordinate to ticker).
- **Account & Monetization** (FR-18→FR-20): Free/Pro tier definitions, monthly (not daily) quota, upgrade prompt at limit. Built now even though T0 has one user — not retrofitted later.

## Scope — P1 (deferred, has a stated trigger condition)

- Quarterly financial data — deferred until the scraper supports it.
- Acquisition channels — deferred to just before T1 starts.
- Judge-model/implication-detection layer + jailbreak defenses for Golden Rule enforcement — gate before T1 (Risk R5, R6).
- Post-launch Golden Rule monitoring mechanism — gate before T1 (Risk R6).
- Any nav surface beyond Watchlist + Search — no concrete trigger yet, revisit after T1 beta feedback.

## Scope — P2 / explicitly not decided

- Tn (scale phase) infra — depends on funding vs. bootstrap, not decided.
- Exact Pro price point (working range Rp49k–99k/month).
- T1 beta group size/invite mechanism.

## Explicit non-scope (never build, not just "later")

- Realtime/live market data.
- Real trade execution / brokerage connection.
- Any trading signal, setup, entry, stop-loss, take-profit — in any form.
- Expansion beyond IDX/BEI equities.
- Pursuing an OJK investment-advisor license.

## Success looks like (T0 → T1 trigger, AND-gated — all must hold together)

- 3-4 consecutive weeks of organic usage.
- ≥1 concrete weekly insight.
- Zero Golden Rule violations.
- Counter-metric — do NOT optimize raw chat volume/session length: that pressure is exactly what could erode the Golden Rule.

## Key glossary (full definitions in PRD §3)

Golden Rule, EOD, Watchlist, Tier, Quota, T0/T1/T2/Tn, DoD, OJK.
