---
title: Sahamigo PRD
status: final
created: 2026-06-25
updated: 2026-06-25
---

# PRD: Sahamigo
*Working title — confirmed product name, not placeholder.*

## 0. Document Purpose

This PRD is for Bang Markus (Product Owner) and any downstream workflow (UX, Architecture, Epics/Stories) that picks up Sahamigo after this point. It builds on, and does not duplicate, two prior artifacts: `docs/business/lean-canvas.md` (why, for whom, unfair advantage, revenue/cost shape) and `docs/business/blueprint-bertingkat.md` (T0→Tn staged rollout with measurable triggers). Features are grouped with FRs nested under them, numbered globally (FR-1 → FR-N) so they stay stable references even if features get reorganized later. Inline `[ASSUMPTION: ...]` tags mark places where this document inferred without explicit confirmation — see §14.

## 1. Vision

Sahamigo is an AI chat companion for learning to read the Indonesian stock market (IDX/BEI) — not for being told what to do with it. Every other app in this space (Stockbit, FITStock, Invezgo, Pluang Aura AI) converges on the same value proposition: tell the user what to buy, sell, or hold. Sahamigo refuses that shape on purpose. It shows the same depth of data a serious retail investor would want — valuation, fundamentals, price action, sector performance — but it never closes the loop with a conclusion. It reflects the decision back as a question, so the habit being built is reading data, not following a signal.

This matters now because of where the market actually is: KSEI counts 22.97M investors as of Feb 2026, with 54.69% under 30 — a generation that grew up with apps that decide for them. None of Sahamigo's competitors serve the "teach me to decide" need; they all sell the decision itself. That gap is also a regulatory one, not just a positioning choice: giving buy/sell advice in Indonesia requires an OJK investment-advisor license Sahamigo does not have and does not intend to acquire. The no-signal rule is therefore both the product's identity and its compliance boundary.

MVP (T0) is scoped for one user: Bang Markus, using his own data pipeline. Public freemium (T1→T2) only happens after T0 proves itself on its own terms — see `blueprint-bertingkat.md` for the exact triggers.

## 2. Target User

### 2.1 Jobs To Be Done
- Functional: "I want to know if a stock's current price is justified by its fundamentals, using data I trust, without redoing the same lookup from scratch every time."
- Emotional: "I want to feel like I understand *why*, not like I'm trusting a black box telling me what to do."
- Contextual: a quick check, usually in the morning, sometimes triggered by noticing a stock while browsing the market, not always starting from a stock already in mind.

### 2.2 Non-Users (v1)
- Day traders / technical-signal seekers — Sahamigo deliberately does not produce entries, stop-losses, or take-profit levels.
- Anyone expecting realtime/live pricing — all data is EOD.
- Non-Indonesian-market investors — scope is IDX/BEI only.

### 2.3 Key User Journeys

- **UJ-1. Bang Markus checks BBCA's fair value before his coffee gets cold.**
  - **Persona + context:** Bang Markus, the product's own first user, opens Sahamigo most mornings with a specific ticker already in mind.
  - **Entry state:** default view, Chat, no prior context needed.
  - **Path:** Opens Chat → asks the AI about BBCA's valuation → AI returns relevant facts (PER, PBV, current price, etc.) without concluding anything → Bang Markus compares the implied fair value against the current price himself.
  - **Climax:** the moment he has enough data points to form his own read on whether the price looks justified.
  - **Resolution:** if fair value is still far from current price, he adds BBCA to Watchlist so tomorrow's check doesn't start from zero — and the session ends.
  - **Edge case:** if fair value is *close* to current price instead, that's what pulls him back into Chat again (the loop that keeps T0 usage organic, per the MVP success metric).

- **UJ-2. Bang Markus doesn't have a ticker in mind yet, so he browses first.**
  - **Persona + context:** same user, different entry condition — no specific stock on his mind that morning.
  - **Entry state:** opens Search/IHSG instead of Chat.
  - **Path:** Reviews trending stocks, top gainers/losers, sector performance → something catches his attention from the data shown (not from any AI suggestion) → opens that stock's Stock Detail, or taps "Tanya AI soal saham ini" directly.
  - **Climax:** converges into UJ-1 from its second beat onward — same valuation Q&A, same self-comparison.
  - **Resolution:** same as UJ-1 — Watchlist if not yet interesting, continued chat if it is.

Two journeys cover T0's full usage pattern: *targeted check* and *discovery browsing*. No further journeys were identified — feature surface is intentionally simple for T0.

## 3. Glossary

- **Sahamigo** — the product. AI chat companion for learning to read IDX/BEI stocks.
- **Golden Rule** — the hard constraint that Sahamigo's AI never concludes a buy/sell/hold recommendation or trading signal; it always reflects the decision back as a question. Both a product principle and a regulatory boundary (see NFR2, Risk R1).
- **EOD (End of Day)** — Sahamigo's only data freshness. All prices/fundamentals are end-of-day, sourced from Sahamigo's own scraper, never realtime/live feeds.
- **Watchlist** — a per-user, tier-capped list of tickers parked for later re-checking without restarting the conversation from scratch.
- **Tier** — Free or Pro, see §4.5. Determines monthly chat quota, Watchlist slot count, and data depth.
- **Quota** — the monthly (not daily) chat-message cap per tier. Hard-capped even on Pro.
- **T0 / T1 / T2 / Tn** — staged rollout phases defined in `blueprint-bertingkat.md`: personal-only (T0) → closed beta (T1) → public freemium (T2) → scale (Tn, undefined).
- **DoD (Definition of Done)** — per-feature checklist (owned by QA — "Murat" is the test-architect role's name from planning sessions, not a separate person) that verifies a feature does not violate the Golden Rule before it ships.
- **OJK** — Otoritas Jasa Keuangan, Indonesia's financial services regulator; licenses investment advisors. Sahamigo does not hold this license (see Risk R1).

## 4. Features

### 4.1 Chat (AI Tutor)
**Description:** The default view and core loop of Sahamigo. User converses with an AI about specific tickers; the AI answers with EOD facts and never with a conclusion. Realizes UJ-1, UJ-2. `[ASSUMPTION: chat language is Bahasa Indonesia by default, matching the "teman belajar" tone already established — not yet explicitly confirmed as a hard requirement.]`

**Functional Requirements:**

#### FR-1: Default view
Sahamigo opens to Chat by default on every session start. Realizes UJ-1, UJ-2.
**Consequences (testable):**
- Landing on the app with no prior navigation shows the Chat view, not Search/IHSG or Watchlist.

#### FR-2: Fact-based answers
The AI answers ticker-related questions using relevant EOD data (price, valuation, fundamentals) actually available from Sahamigo's own data store. Realizes UJ-1.
**Consequences (testable):**
- Every AI response referencing a metric (PER, PBV, ROE, etc.) cites a value drawn from the Postgres/Neo4j data store, not an invented figure.

#### FR-3: Golden Rule enforcement (hard constraint)
The AI never concludes a buy/sell/hold recommendation or trading signal in any form — neither in text nor in how the response is visually presented. Any response touching an investment decision is reframed as a question back to the user. Realizes UJ-1, UJ-2.
**Consequences (testable):**
- No AI response contains directive language equivalent to "buy," "sell," "hold," "enter," "exit," or a setup/target/stop-loss figure presented as advice — including implication-based phrasing that avoids the literal words (hedged language, historical-pattern framing, an implied stop-loss number, or a pre-emptive verdict stated before the reflective question).
- Every response that surfaces a valuation comparison ends with a reflective question, not a verdict.
- No visual element (badge color, card styling, button label, icon) frames a stock as a verdict (e.g. green/red "good/bad" styling) independent of what the response text says — the loophole stays closed even if the wording passes.

**T0 vs. T1 enforcement note:** for T0, enforcement is the DoD checklist above plus the user's own manual review — nothing more. The deeper mechanism this implies is gated before T1 (see Risk R5, R6, Open Question 6).

#### FR-4: Chat history and new chat
User can start a new chat and revisit prior conversations via a sidebar history list.
**Consequences (testable):**
- Starting "+ Chat Baru" creates a new, separate thread; previous threads remain accessible and unmodified in "Riwayat."

#### FR-5: Context handoff from Stock Detail
Arriving in Chat via the "Tanya AI soal saham ini" CTA seeds the conversation with that ticker's context, and that context is shown to the user (e.g. a visible ticker chip/pill at the top of the thread) rather than applied invisibly — consistent with the product's "show data, don't hide it" stance. Realizes UJ-2.
**Consequences (testable):**
- Tapping the CTA from BBCA's Stock Detail opens a chat already aware it's about BBCA, without the user re-typing the ticker, and the user can see a visible indicator that BBCA is the active context.
`[ASSUMPTION: seeding is done via a pre-filled context message plus a visible chip, not a separate UI field — exact rendering left to technical design.]`

### 4.2 Search & IHSG (Market Discovery)
**Description:** Market-wide browsing surface for when the user doesn't start from a known ticker. Realizes UJ-2. Renders as curated previews with "Selengkapnya"/"lihat semua" expansion links rather than full Stockbit-level density — a deliberate progressive-disclosure compromise, since the audience is beginners learning to read data, not power traders scanning dense tables.

**Functional Requirements:**

#### FR-6: IHSG summary
Shows current IHSG index price and chart.
**Consequences (testable):**
- The IHSG value and chart shown reflect the latest EOD close on file, not a stale or placeholder value.

#### FR-7: Ticker/company search
User can search stocks by ticker or company name.
**Consequences (testable):**
- Searching a valid ticker or company name (exact or partial match) returns that stock; searching a string matching no known stock returns an empty/no-result state, not an error.

#### FR-8: Trending and movers
Shows trending stocks and top gainer/loser/value/volume lists.
**Consequences (testable):**
- Each list (gainer/loser/value/volume) is ranked by its named metric over the latest EOD session and shows a curated top-N (per the progressive-disclosure pattern, §10), with a "Selengkapnya" link to see more.

#### FR-9: Sector performance
Shows performance breakdown by sector.
**Consequences (testable):**
- Every IDX sector with at least one tracked stock appears with an EOD-based performance figure; no sector silently missing without explanation.

#### FR-10: Market news
Shows relevant market news items.
**Consequences (testable):**
- News items shown are dated and sourced from Sahamigo's own scraper, with a "Selengkapnya" link rather than an exhaustive feed (progressive-disclosure pattern, §10).

#### FR-11: EOD labeling
Every data point on this surface is visibly labeled EOD (not realtime). Realizes NFR1.
**Consequences (testable):**
- The IHSG hero card and every stock/sector card display an explicit EOD badge or equivalent label.

### 4.3 Stock Detail
**Description:** Single-ticker deep dive — chart, fundamentals, valuation, profitability. Realizes UJ-1, UJ-2.

**Functional Requirements:**

#### FR-12: Stock detail view
Shows price chart (multiple timeframes), fundamental/valuation/profitability tables for a given ticker.
#### FR-13: Annual-only fundamental data
Fundamental and valuation tables show annual granularity only, matching current scraper capability — not quarterly.
**Consequences (testable):**
- No fundamental table on this page implies quarterly data; tables are explicitly labeled "(Tahunan)."
#### FR-14: "Tanya AI soal saham ini" CTA
Primary CTA on this page opens Chat with this ticker's context (FR-5), replacing any buy/sell/transact action. Realizes UJ-2.
**Consequences (testable):**
- No button on this page initiates a real trade or order; the only primary action routes to Chat.

### 4.4 Watchlist
**Description:** Tier-capped parking list for tickers the user wants to re-check later without restarting from scratch. Realizes UJ-1, UJ-2 (resolution step).

**Functional Requirements:**

#### FR-15: Add to Watchlist
User can add a ticker to Watchlist from Stock Detail or Search.
#### FR-16: Watchlist row content
Each row shows, in visual hierarchy: ticker (primary), full company name (secondary, subordinate to ticker — not equal weight), most recent EOD close + change vs. the prior EOD close, and a mini sparkline trend chart. "Current price" always means the latest EOD close, never a live price, consistent with NFR1.
**Consequences (testable):**
- A row's displayed price matches the latest EOD close on file, and "change" is computed against the prior EOD close — not against any intraday or realtime reference.
#### FR-17: Tier-capped slots
Watchlist slot count is hard-capped per tier (Free: 3, Pro: 25), shown via a quota banner.
**Consequences (testable):**
- A Free-tier user with 3 watchlisted tickers sees an "upgrade to Pro" banner instead of an add option when attempting a 4th.
`[ASSUMPTION: a full Watchlist shows a dashed "add slot" banner prompting upgrade, rather than a blocking error modal — per the existing prototype, not yet explicitly reconfirmed for this PRD.]`

### 4.5 Account & Monetization
**Description:** Two-tier freemium model. Both tiers are hard-capped to bound LLM cost exposure — Pro is not unlimited. See `lean-canvas.md` for pricing rationale against market comparables (Stockbit Pro, ChatGPT Go).

**Functional Requirements:**

#### FR-18: Tier definitions
Free: 30 chat/month, 3 Watchlist slots, basic data. Pro: 300 chat/month, 25 Watchlist slots, deeper data (ownership graph, peer comparison). Indicative price range Rp49k–99k/month for Pro (not yet finalized — see §13).
**Consequences (testable):**
- A user's enforced chat quota and Watchlist cap exactly match their current tier's stated numbers (FR-17, FR-19) at all times — no user ever operates under a cap that doesn't match one of these two defined tiers.
#### FR-19: Monthly (not daily) quota
Chat quota is calculated per calendar month, not per day, for both tiers. Realizes NFR3.
**Consequences (testable):**
- A user who sends 30 chat messages on day 1 of the month sees their Free quota as exhausted for the rest of that month, not reset the next day.
#### FR-20: Upgrade prompt at limit
A Free user reaching their monthly limit sees an inline upgrade-to-Pro prompt (quota banner / profile tier indicator).
**Consequences (testable):**
- A Free user sending their 30th chat message in a calendar month sees the upgrade prompt on their next send attempt that same month.

## 5. Non-Goals (Explicit)

- Sahamigo will not provide realtime/live market data — EOD only, by design (see Risk R3).
- Sahamigo will not execute real trades or connect to a brokerage for transactions.
- Sahamigo will not produce trading signals, setups, entries, stop-losses, or take-profits in any form, regardless of how the user phrases the request.
- Sahamigo will not become a general-purpose financial advisor product or expand beyond IDX/BEI equities in v1.
- Sahamigo will not pursue an OJK investment-advisor license; any feature that would require one is out of scope by definition (Risk R1).

## 6. MVP Scope

### 6.1 In Scope (T0)
- Chat (FR-1 → FR-5)
- Search & IHSG (FR-6 → FR-11)
- Stock Detail (FR-12 → FR-14)
- Watchlist (FR-15 → FR-17)
- Free/Pro tier structure and quota enforcement (FR-18 → FR-20) — even though T0 has exactly one user (Bang Markus), the tier/quota mechanics are built now per the launch-track stakes decision, so they don't need to be retrofitted before T1.
- Sidebar navigation limited to: New Chat, Watchlist, Search, chat history, profile — no other nav items.

### 6.2 Out of Scope for MVP
- Quarterly financial data (annual-only for now — FR-13) — deferred until scraper supports it.
- Public acquisition channels — deferred to just before T1 per `blueprint-bertingkat.md`.
- Any nav surface beyond Watchlist + Search (e.g. portfolio tracking, news-only tab) — deferred, no concrete trigger yet. `[NOTE FOR PM]` revisit once T1 beta feedback exists.
- Scale-phase (Tn) infrastructure decisions — explicitly TBD pending funding-vs-bootstrap decision.

## 7. Cross-Cutting NFRs & Guardrails

- **NFR1 — Data integrity:** every data surface (Chat, Search/IHSG, Stock Detail, Watchlist) sources from Sahamigo's own EOD scraper (Postgres/Neo4j) and never a realtime third-party feed. Visually flagged per FR-11.
- **NFR2 — Regulatory:** the product must not require an OJK investment-advisor license to operate. Enforced primarily through FR-3 (Golden Rule, covering both text and visual presentation), backed by a per-feature DoD checklist (owned by QA) that explicitly checks for advice-like output — textual or visual — before any feature ships. See Risk R1, R5, R6.
- **NFR3 — Cost control:** LLM and infrastructure cost per active user must stay bounded. Enforced via FR-19 (hard monthly caps on both tiers) and infra sized for a single small VPS budget (Hetzner CX32, 8GB) — implementation detail held in architecture, not this PRD.

## 8. Risk Register

| ID | Risk | Mitigation |
|---|---|---|
| R1 | AI output implies investment advice → triggers OJK investment-advisor licensing requirement Sahamigo does not have. | Golden Rule (FR-3) is a hard constraint, not a style preference; every feature passes a DoD check for advice-like language before shipping (NFR2). |
| R2 | Unbounded chat usage breaks unit economics (LLM token cost + scraper maintenance vs. subscription price). | Hard monthly caps on both tiers (FR-19), not just Free; cheap/simple queries may route to a smaller model at the architecture layer (held in addendum, not this PRD). |
| R3 | User mistakes EOD data for realtime and makes a real-world decision on stale information. | Explicit EOD labeling across every data surface (FR-11, NFR1). |
| R4 | Fundamental/valuation tables shown without a granularity caveat overclaim what the scraper actually produces (annual vs. quarterly). | FR-13 hard-scopes tables to annual data with explicit "(Tahunan)" labeling — never silently presented as more granular than it is. |
| R5 | A user deliberately jailbreaks/prompt-injects the AI to extract advice it would otherwise refuse to give — a different threat model from accidental drift. | Not mitigated at T0 (single trusted, non-adversarial user). **Gate before T1**: jailbreak-resistance testing must pass before any user other than Bang Markus gets access. See Open Question 6. |
| R6 | Golden Rule compliance drifts at runtime (e.g. over long conversations) without anyone noticing, because the only control today is pre-ship DoD, not continuous monitoring. | Not mitigated at T0 (manual self-review by the single user is the de facto monitor). **Gate before T1**: a post-launch monitoring mechanism (e.g. transcript sampling, automated judge-model pass) must exist before opening to beta users. See Open Question 6. |

## 9. Success Metrics

**T0 → T1 trigger (AND-gated — all three must hold together, not independently optional):**
- **SM-1**: Organic usage — Bang Markus uses Sahamigo across 3-4 consecutive weeks without prompting himself to "go check the app." Validates FR-1, FR-2, FR-3 (the core chat loop is actually useful, not just functional).
- **SM-2**: Concrete weekly insight — at least one specific, articulable insight gained per week (e.g. "I now understand why BBCA's PER looks high relative to its sector"). Validates FR-2, FR-12.
- **SM-3**: Zero Golden Rule violations — no session in which the AI concludes a buy/sell/hold recommendation. Validates FR-3, NFR2.

**Counter-metrics (do not optimize)**
- **SM-C1**: Raw chat message volume / session length. Optimizing for higher engagement could pressure responses toward more "actionable"-sounding language to keep the user hooked — directly threatens SM-3 and the Golden Rule. Counterbalances SM-1.

Tracking is manual (Bang Markus's own journal) for T0 — no in-app analytics feature is in scope yet, per earlier decision to avoid adding dev scope before MVP validates. **Limitation:** SM-3 (zero violations) is a compliance metric being tracked with the same manual-journal instrument as the softer SM-1/SM-2 — without transcript retention, it isn't independently auditable after the fact. Acceptable at T0 (one self-reporting user); revisit before formalizing this metric at T1 scale (see Open Question 6).

**T1 → T2 trigger** (out of T0 scope to build for, recorded here for continuity — see `blueprint-bertingkat.md`): majority of beta users return weekly for ≥2 consecutive weeks, zero Golden Rule violations, and ≥1 organic referral from outside the initial beta group. How the referral signal gets measured is an open question (§13).

## 10. Adapt-In: Information Architecture

- **Chat** (default) — sidebar: logo + tagline, "+ Chat Baru," Watchlist/Search nav pills, "Riwayat" history list, profile/tier footer.
- **Search/IHSG** — IHSG hero, trending, movers, sector performance, news.
- **Stock Detail** — per-ticker chart + fundamental/valuation/profitability tabs, "Tanya AI soal saham ini" CTA.
- **Watchlist** — quota banner + capped list of tracked tickers.

Sidebar is identical across all four screens except which nav pill is active (a known consistency bug was caught and fixed during prototyping — see prototype build notes in `.memlog.md` of the earlier party-mode session).

**Structural pattern — progressive disclosure:** every data-dense surface (Search/IHSG's movers/sectors/news, Stock Detail's fundamental tables) renders a curated preview with a "Selengkapnya"/"lihat semua" expansion link, never full Stockbit-level density by default. This is a deliberate, surface-wide pattern (not a one-off choice on the Search page — see FR-8, FR-10) because the audience is beginners learning to read data, not power traders scanning dense tables.

## 11. Adapt-In: Aesthetic and Tone

Visual direction documented separately in `docs/design-references/sahamigo-design-reference.md`: warm cream canvas + sage-teal accent tiers (structurally inspired by Starbucks, re-hued), serif headings + humanist sans body with soft rounded surfaces (inspired by Notion's warm minimalism) — adapted, not cloned. Tone is "teman belajar yang santai" (a relaxed learning companion), never clinical-dashboard or hype-driven. No emoji as UI iconography — thin-stroke SVG line icons only. This is a corrected mistake, not a neutral style preference: an early prototype pass used emoji for nav icons, was flagged as reading like generic AI-generated output ("AI slop"), and was replaced everywhere — future contributors should treat emoji-as-icon as a regression, not an available option to reconsider.

## 12. Adapt-In: Monetization

See `docs/business/lean-canvas.md` (Revenue Streams, incl. pricing comparables) and `docs/business/blueprint-bertingkat.md` (T0→T2 triggers, including when billing actually activates) for the full rationale — not duplicated here.

## 13. Open Questions

1. Exact Pro price point within the Rp49k–99k working range — not yet fixed.
2. T1 beta group size and invite mechanism — depend on the Channels decision, which happens before T1 starts (confirmed) but the decision itself hasn't been made yet.
3. Tn (scale phase) direction — funding vs. bootstrap not yet decided; infra/cost implications follow from that choice.
4. Whether the per-feature DoD checklist (Risk R1 mitigation) gets formalized as a standalone artifact or lives inside the architecture/test-design workflow — to be resolved when those workflows run.
5. How the T1→T2 organic-referral signal (§9) gets measured in practice — manual journal again, or something else, given it depends on other people's behavior rather than just Bang Markus's own.
6. **Gate before T1** (Risk R5, R6): how the implication-based detection layer (judge-model pass or equivalent), jailbreak/prompt-injection resistance, and post-launch Golden Rule monitoring get built and verified. None of this is built for T0 (single trusted user); all of it must resolve before T1 opens access to anyone else. Owner and exact mechanism not yet decided — likely surfaces during Architecture/Test-Design workflows.

## 14. Assumptions Index

- §4.1 — Chat's default language is Bahasa Indonesia; not yet an explicitly confirmed hard requirement.
- §4.1 (FR-5) — Context handoff from Stock Detail to Chat is implemented via a pre-filled context message plus a visible chip; exact rendering deferred to technical design.
- §4.4 (FR-17) — A full Watchlist shows a dashed "add slot" upgrade banner rather than a blocking modal, per the existing prototype; not yet reconfirmed specifically for this PRD.
