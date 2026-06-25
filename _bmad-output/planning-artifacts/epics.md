---
stepsCompleted: ["step-01-validate-prerequisites", "step-02-design-epics", "step-03-create-stories (Epic 1, Epic 2, per ALAN)"]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-idx-bei-stock-analysis-2026-06-25/prd.md
  - CLAUDE.md
  - docs/decisions/ADR-001-system-architecture-single-vps.md
  - docs/decisions/ADR-002-ux-conventions-shell-disclosure-iconography.md
  - docs/decisions/ADR-003-data-granularity-eod-only.md
  - docs/decisions/ADR-004-golden-rule-enforcement-mechanism.md
  - docs/decisions/ADR-008-market-discovery-data-sources.md
  - docs/design-references/sahamigo-design-reference.md
---

# Sahamigo - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Sahamigo, decomposing the requirements from the PRD, design references (in lieu of a formal UX contract), and CLAUDE.md/ADRs (in lieu of a formal Architecture.md) into implementable stories.

## Requirements Inventory

### Functional Requirements

FR-1: Sahamigo opens to Chat by default on every session start.
FR-2: The AI answers ticker-related questions using relevant EOD data (price, valuation, fundamentals) actually available from Sahamigo's own data store.
FR-3: The AI never concludes a buy/sell/hold recommendation or trading signal in any form — neither in text nor in visual presentation. Every response touching an investment decision is reframed as a question back to the user.
FR-4: User can start a new chat and revisit prior conversations via a sidebar history list.
FR-5: Arriving in Chat via the "Tanya AI soal saham ini" CTA seeds the conversation with that ticker's context, shown visibly to the user (e.g. a ticker chip).
FR-6: Shows current IHSG index price and chart.
FR-7: User can search stocks by ticker or company name.
FR-8: Shows trending stocks and top gainer/loser/value/volume lists.
FR-9: Shows performance breakdown by sector.
FR-10: Shows relevant market news items.
FR-11: Every data point on Search/IHSG is visibly labeled EOD (not realtime).
FR-12: Shows price chart (multiple timeframes), fundamental/valuation/profitability tables for a given ticker.
FR-13: Fundamental and valuation tables show annual granularity only, matching current scraper capability — not quarterly.
FR-14: Primary CTA on Stock Detail opens Chat with this ticker's context, replacing any buy/sell/transact action.
FR-15: User can add a ticker to Watchlist from Stock Detail or Search.
FR-16: Each Watchlist row shows, in visual hierarchy: ticker (primary), full company name (secondary), most recent EOD close + change vs. prior EOD close, and a mini sparkline trend chart.
FR-17: Watchlist slot count is hard-capped per tier (Free: 3, Pro: 25), shown via a quota banner.
FR-18: Free: 30 chat/month, 3 Watchlist slots, basic data. Pro: 300 chat/month, 25 Watchlist slots, deeper data (ownership graph, peer comparison).
FR-19: Chat quota is calculated per calendar month, not per day, for both tiers.
FR-20: A Free user reaching their monthly limit sees an inline upgrade-to-Pro prompt.

### NonFunctional Requirements

NFR1: Data integrity — every data surface sources from Sahamigo's own EOD scraper (Postgres/Neo4j), never a realtime third-party feed.
NFR2: Regulatory — the product must not require an OJK investment-advisor license to operate. Enforced via FR-3 + a per-feature DoD checklist (textual and visual).
NFR3: Cost control — LLM and infrastructure cost per active user must stay bounded via hard monthly caps on both tiers and a single small VPS budget.

### Additional Requirements

- Backend: Bun + Hono (TypeScript). (ADR-001)
- Frontend: React 19 + TanStack Router/Query (SPA). (ADR-001)
- ORM/DB: Drizzle ORM + Postgres. (ADR-001)
- Graph: Neo4j, self-hosted in Docker, same VPS as the app. (ADR-001)
- LLM access via OpenRouter (model-agnostic; default Claude Sonnet 4.6). (ADR-001)
- Hosting: single VPS, Dokploy-managed, minimum Hetzner CX32 (8GB) — no second box without flagging the cost trade-off first. (ADR-001, CLAUDE.md)
- This repo's existing Python scraper pipeline stays separate and decoupled — writes into the same Postgres; the new app only reads from it. No runtime coupling. (ADR-001)
- Every feature must pass a 3-point Definition of Done before shipping: Golden Rule check (text + visual), EOD-honesty check, quota/tier check. (CLAUDE.md)
- Explicitly NOT built for T0 (do not schedule into early sprints): a judge-model/implication-detection layer, jailbreak/prompt-injection defenses, acquisition-channel infrastructure, in-app usage analytics. (CLAUDE.md, ADR-004)
- Fundamental/valuation data is annual-only; never implement or display quarterly figures. (ADR-003)
- RAM headroom on the 8GB VPS running Postgres + Neo4j + the app together is an untested assumption — flagged as a SPIKE candidate before deep infra commitment, not yet stress-tested. (ADR-001)

### UX Design Requirements

UX-DR1: Build one shared, canonical sidebar component (logo + tagline, "+ Chat Baru" button, Watchlist/Search nav pills, "Riwayat" history list, profile/tier footer) reused across all four screens — never hand-built per screen, to avoid the drift caught during prototyping. (ADR-002)
UX-DR2: Implement the progressive-disclosure pattern on every data-dense surface (Search/IHSG's trending/movers/sectors/news, Stock Detail's fundamental tables): curated top-N preview + a "Selengkapnya"/"lihat semua" expansion link, never full density by default. (ADR-002, PRD §10)
UX-DR3: No emoji anywhere in the UI as iconography — thin-stroke SVG line icons only (chat bubble, watchlist star outline, search magnifier outline, send arrow). Treat any emoji-as-icon proposal as a regression, not an option. (ADR-002)
UX-DR4: Implement the design token system from `docs/design-references/sahamigo-design-reference.md`: warm cream canvas, 4-tier sage-teal accent scale (darkest/mid/light-tint/near-cream), warm dark brown/charcoal body text (not pure black), serif display headings + humanist sans body, soft rounded card surfaces with no hard shadows, pill-shaped CTA buttons.
UX-DR5: Watchlist row layout — ticker rendered with primary visual weight, full company name secondary/subordinate beneath it, mini sparkline chart positioned adjacent to (not centered away from) the price block, "Tanya AI" button with no emoji prefix.
UX-DR6: Stock Detail primary CTA is a pill-shaped "Tanya AI soal saham ini" button with a chat-bubble SVG icon, replacing any buy/transact button pattern entirely.
UX-DR7: When Chat is entered via context handoff from Stock Detail (FR-5), render a visible ticker chip/pill at the top of the thread — context must never be applied invisibly.

### FR Coverage Map

FR-1: Epic 1 - Default view
FR-2: Epic 1 - Fact-based answers
FR-3: Epic 1 - Golden Rule enforcement (hard constraint)
FR-4: Epic 1 - Chat history and new chat
FR-5: Epic 2 - Context handoff from Stock Detail
FR-6: Epic 2 - IHSG summary
FR-7: Epic 2 - Ticker/company search
FR-8: Epic 2 - Trending and movers
FR-9: Epic 2 - Sector performance
FR-10: Epic 2 - Market news
FR-11: Epic 2 - EOD labeling
FR-12: Epic 2 - Stock detail view
FR-13: Epic 2 - Annual-only fundamental data
FR-14: Epic 2 - "Tanya AI soal saham ini" CTA
FR-15: Epic 3 - Add to Watchlist
FR-16: Epic 3 - Watchlist row content
FR-17: Epic 3 - Tier-capped slots
FR-18: Epic 4 - Tier definitions
FR-19: Epic 4 - Monthly (not daily) quota
FR-20: Epic 4 - Upgrade prompt at limit

## Epic List

### Epic 1: Chat — AI Tutor Core Loop
User can open Sahamigo, type a ticker manually, get fact-based EOD answers that comply with the Golden Rule, and see chat history. Standalone — works without Search/Stock Detail/Watchlist.
**FRs covered:** FR-1, FR-2, FR-3, FR-4
**Linear:** MAR-110

### Epic 2: Market Discovery & Stock Detail
User can browse IHSG/trending/sector performance/news, open a stock's detail (chart + annual fundamentals/valuation/profitability), and jump into Chat with that ticker's context already loaded. Builds on Epic 1 but Epic 1 does not require this to function.
**FRs covered:** FR-5, FR-6, FR-7, FR-8, FR-9, FR-10, FR-11, FR-12, FR-13, FR-14
**Linear:** MAR-111

### Epic 3: Watchlist
User can save a ticker to revisit later without restarting the conversation from scratch, see ticker + company name + EOD price/change + sparkline per row, and hit a tier-based slot cap. Builds on Epic 2.
**FRs covered:** FR-15, FR-16, FR-17
**Linear:** MAR-112

### Epic 4: Account & Monetization
Free/Pro tiers enforced — monthly (not daily) chat quota gates Chat, Watchlist slot cap gates Watchlist, inline upgrade prompt at the limit. Wraps enforcement around Epic 1 + Epic 3.
**FRs covered:** FR-18, FR-19, FR-20
**Linear:** MAR-113

### SPIKE: VPS resource headroom (precedes/parallels Epic 1)
Validates the single-VPS architecture's untested assumption (Postgres + Neo4j + app on Hetzner CX32, 8GB) before deep infra commitment. Per ALAN, must resolve into an ADR update, not just a findings doc.
**Linear:** MAR-114

Per ALAN Layer 4: Epic 1 and Epic 2 are broken into detailed stories (Epic 1 shipped; Epic 2's sprint is starting now, following its SPIKE MAR-119/ADR-008 resolution). Epics 3-4 stay at epic-level detail and get story breakdowns when their own sprint is about to start.

## Epic 1: Chat — AI Tutor Core Loop

User can open Sahamigo, type a ticker manually, get fact-based EOD answers that comply with the Golden Rule, and see chat history. Standalone — works without Search/Stock Detail/Watchlist.

### Story 1.1: Default Chat View on Launch — MAR-115

As a user,
I want Sahamigo to open directly to the Chat view,
So that I can start asking about a stock immediately without navigating anywhere first.

**Acceptance Criteria:**

**Given** I open Sahamigo with no prior session
**When** the app loads
**Then** I see the Chat view (not Search/IHSG or Watchlist)

**Given** I have prior chat history
**When** I open the app
**Then** it still opens to Chat, not another view

Covers: FR-1

### Story 1.2: Ask About a Ticker and Get Fact-Based Answers — MAR-116

As a user,
I want to type a stock ticker into chat and get an answer grounded in real EOD data,
So that I can learn what the numbers actually are before forming my own opinion.

**Acceptance Criteria:**

**Given** I ask about BBCA's valuation
**When** the AI responds
**Then** it cites specific metrics (PER, PBV, price, etc.) sourced from Sahamigo's own data store, not invented

**Given** the data store has no record for a ticker I ask about
**When** the AI responds
**Then** it says so rather than inventing a figure

Covers: FR-2

### Story 1.3: Golden Rule Enforcement in Chat Responses — MAR-117

As a user,
I want the AI to never tell me to buy, sell, or hold — only show me data and ask me what I think,
So that I'm building my own judgment instead of outsourcing it.

**Acceptance Criteria:**

**Given** I ask "should I buy BBCA?"
**When** the AI responds
**Then** it presents data and ends with a reflective question, never a directive verdict

**Given** a response involves a valuation comparison
**When** displayed
**Then** no visual element (badge, color, icon) implies a verdict

**Given** I phrase a question to bait an indirect recommendation (e.g. "historically what happens after this pattern?")
**When** the AI responds
**Then** it still avoids implying a verdict

Covers: FR-3 (hard constraint) — highest-priority story in the epic.

### Story 1.4: Start a New Chat and Browse History — MAR-118

As a user,
I want to start a new chat thread and revisit old ones,
So that separate research sessions about different stocks don't get mixed together.

**Acceptance Criteria:**

**Given** I'm in an existing thread
**When** I click "+ Chat Baru"
**Then** a new thread starts and the old one stays unchanged and accessible

**Given** I have multiple past threads
**When** I open "Riwayat"
**Then** I can reopen any one without losing content

Covers: FR-4. Only story in this epic that needs new DB entities (chat threads/messages).

## Epic 2: Market Discovery & Stock Detail

User can browse IHSG/trending/sector performance/news, open a stock's detail (chart + annual fundamentals/valuation/profitability), and jump into Chat with that ticker's context already loaded. Builds on Epic 1 but Epic 1 does not require this to function.

### Story 2.1: IHSG Summary — MAR-120

As a user,
I want to see the current IHSG index level and a chart,
So that I get a sense of overall market direction before diving into individual stocks.

**Acceptance Criteria:**

**Given** I open the Search/IHSG view
**When** the page loads
**Then** I see IHSG's most recent EOD level and a chart of its recent trend

**Given** IHSG data comes from the new `index_summary` table
**When** it's displayed
**Then** it's visibly labeled EOD (not live)

**Given** the ETL writes a new row
**When** ingested
**Then** the row has a `scraped_at` timestamp reflecting actual ingestion time, not a source-side date field

Covers: FR-6, FR-11. New app-owned table `index_summary` (Drizzle-migrated), ETL'd from `scrape_index_summary.py`'s existing JSON output — per ADR-008 Decision 1. No new scraper needed.

### Story 2.2: Search Stocks by Ticker or Name — MAR-121

As a user,
I want to search for a stock by its ticker or company name,
So that I can quickly find the stock I want to look into.

**Acceptance Criteria:**

**Given** I type a valid ticker or partial company name into search
**When** I submit
**Then** I see matching results from Sahamigo's own data store

**Given** my search matches no stock
**When** results are shown
**Then** I see a clear empty state, not an error

Covers: FR-7. No new table — queries `financial_ratios.code`/`stock_name` (already populated by Epic 1), per ADR-008 Decision 2. App-layer work only.

### Story 2.3: Trending Stocks and Top Movers — MAR-122

As a user,
I want to see which stocks are trending or moved the most today,
So that I can discover stocks worth looking into beyond ones I already know.

**Acceptance Criteria:**

**Given** I open the Search/IHSG view
**When** the page loads
**Then** I see top gainer/loser/value/volume lists sourced from EOD trade data

**Given** the list is dense
**When** displayed
**Then** it shows a curated top-N with a "Selengkapnya" expansion link (UX-DR2), not full density by default

**Given** the ETL writes `daily_trade_summary` rows
**When** ingested
**Then** each row has a `scraped_at` timestamp

Covers: FR-8. New app-owned table `daily_trade_summary`, ETL'd from `companySummaryByKodeEmiten.json`'s already-scraped OHLCV/change data — per ADR-008 Decision 3. No new scraper needed; the data collection gap was "never ETL'd to Postgres," not "never collected."

### Story 2.4: Sector Performance Breakdown — MAR-123

As a user,
I want to see how different sectors performed,
So that I can understand which parts of the market are moving and explore from a sector lens.

**Acceptance Criteria:**

**Given** I open the Search/IHSG view
**When** the page loads
**Then** I see a performance breakdown grouped by sector

**Given** `GetIndexSummary`'s actual response shape was left unconfirmed at SPIKE time (ADR-008)
**When** this story starts
**Then** the first implementation step confirms whether `index_summary` (Story 2.1) already contains sectoral indices

**Given** `index_summary` does contain sectoral data
**When** sector performance is shown
**Then** it's served directly from `index_summary` — no new table

**Given** `index_summary` does NOT contain sectoral data
**When** sector performance is computed instead
**Then** it's aggregated from `daily_trade_summary` (Story 2.3) grouped by `financial_ratios.sector`/`sub_sector`

Covers: FR-9. Depends on Story 2.1 and/or 2.3 (their tables) per ADR-008 Decision 4 — do not start before at least one of those is done.

### Story 2.5: Market News — MAR-124

As a user,
I want to see relevant market news,
So that I have context for why a stock or the market might be moving.

**Acceptance Criteria:**

**Given** I open the Search/IHSG view
**When** the page loads
**Then** I see a curated list of recent market news items

**Given** the list is dense
**When** displayed
**Then** it follows the same progressive-disclosure pattern (UX-DR2) as the rest of the page

**Given** the ETL writes `market_news` rows
**When** ingested
**Then** each row has a `scraped_at` timestamp

Covers: FR-10. New app-owned table `market_news`, ETL'd from `scrape_idx_news.py`'s existing JSON output — per ADR-008 Decision 5. No new scraper needed.

### Story 2.6: Stock Detail Page — MAR-125

As a user,
I want to open a stock's detail page and see its price chart and fundamentals,
So that I can study one stock in depth before deciding what to ask the AI.

**Acceptance Criteria:**

**Given** I open a stock's detail page
**When** it loads
**Then** I see a price chart with multiple selectable timeframes, sourced from `daily_trade_summary` (Story 2.3)

**Given** I view the fundamental/valuation/profitability tables
**When** displayed
**Then** they show annual granularity only, explicitly labeled "(Tahunan)" — never presented as quarterly (FR-13, ADR-003)

**Given** the data store has no row for this ticker
**When** the page loads
**Then** it says so explicitly rather than showing blank/broken tables

Covers: FR-12, FR-13. Depends on Story 2.3 (`daily_trade_summary`) for the chart; uses Epic 1's existing `financial_ratios` for fundamentals — no new table of its own.

### Story 2.7: "Tanya AI soal saham ini" CTA and Chat Context Handoff — MAR-126

As a user,
I want to jump straight into chat about a stock I'm viewing, with its context already loaded,
So that I don't have to retype the ticker or lose my train of thought.

**Acceptance Criteria:**

**Given** I'm on a stock's detail page
**When** I click "Tanya AI soal saham ini" (pill CTA, chat-bubble icon, no buy/transact action anywhere near it)
**Then** I'm taken to Chat with that ticker's context already applied

**Given** the chat thread was entered via this handoff
**When** the thread renders
**Then** a visible ticker chip/pill appears at the top — context is never applied invisibly (UX-DR7)

**Given** this CTA replaces what would be a buy/transact button in a typical trading app
**When** the page is reviewed against the Golden Rule
**Then** no buy/sell/transact affordance exists anywhere on Stock Detail

Covers: FR-14, FR-5. Depends on Story 2.6 (Stock Detail must exist) and Epic 1 (Chat). Closes Epic 2's integration loop back into Epic 1 — last story in the epic.

## Epic 3: Watchlist (MAR-112)
Story breakdown deferred until this epic's sprint is about to start (per ALAN).

## Epic 3: Watchlist (MAR-112)
Story breakdown deferred until this epic's sprint is about to start (per ALAN).

## Epic 4: Account & Monetization (MAR-113)
Story breakdown deferred until this epic's sprint is about to start (per ALAN).
