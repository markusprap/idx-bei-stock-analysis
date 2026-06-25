---
baseline_commit: f36b47c521b19f62bdf67431866c62ff9a127325
---

# Story 1.2: Ask About a Ticker and Get Fact-Based Answers

Status: ready-for-review

## Story

As Bang Markus (Sahamigo's T0 user),
I want to type a stock ticker into chat and get an answer grounded in real EOD data,
so that I can learn what the numbers actually are before forming my own opinion.

## Acceptance Criteria

1. Given I ask about BBCA's valuation, When the AI responds, Then it cites specific metrics (PER, PBV, ROE, etc.) sourced from Sahamigo's own Postgres data store (`financial_ratios` table), not invented.
2. Given the data store has no record for a ticker I ask about, When the AI responds, Then it says so rather than inventing a figure.
3. Given I ask about price, OHLCV, or technical-indicator data for any ticker, When the AI responds, Then it says it doesn't have that kind of data — rather than inventing a number or silently substituting fundamental data instead. (Scope-narrowing AC added per ADR-006: no `daily_prices`/`technical_indicators` table exists in this repo's pipeline yet.)

(Source: PRD FR-2; ADR-006 scope narrowing; Linear MAR-116.)

## Tasks / Subtasks

- [x] Task 1: Backend — Postgres connection + Drizzle schema (AC 1, 2)
  - [x] `app/.env` (gitignored): `DATABASE_URL=postgresql://postgres:postgres@localhost:5434/postgres` — port **5434**, not 5432 (5432 is the host's native system Postgres, unrelated to this project; see ADR-006)
  - [x] Install `drizzle-orm@0.45.2`, `postgres@3.4.9`; devDep `drizzle-kit@0.31.10` (pinned in Story 1.1 Dev Notes, re-verified against npm registry 2026-06-25 — unchanged)
  - [x] `src/server/db/schema.ts` — Drizzle schema for `financial_ratios`, mapping the table's EXACT existing columns (verified via `\d financial_ratios` on the running container 2026-06-25), don't invent or guess columns:
    - text: `sector`, `sub_sector`, `industry`, `sub_industry`, `sector_code`, `sub_sector_code`, `industry_code`, `sub_industry_code`, `sub_name`, `sub_code`, `code`, `stock_name`, `sharia`, `fs_date` (stored as **text**, not a date type), `fiscal_year_end`, `audit`, `opini`
    - double precision: `assets`, `liabilities`, `equity`, `sales`, `ebt`, `profit_period`, `profit_attr_owner`, `eps`, `book_value`, `per`, `price_bv`, `de_ratio`, `roa`, `roe`, `npm`
    - No primary key, no indexes exist on this table today — don't assume `code` is unique at the DB level even though it is in practice (947 rows, 947 distinct codes verified); query defensively (`LIMIT 1` or aggregate) rather than assuming exactly one row.
  - [x] `src/server/db/client.ts` — Drizzle `postgres-js` client init from `DATABASE_URL`
  - [x] **Do NOT run `drizzle-kit push`/`generate` against this table.** `financial_ratios` is owned and created by the Python ETL (`python/financial_ratios_json2pg.py`, via pandas `to_sql`), not by Drizzle migrations. The Drizzle schema here is a read-only mapping onto an externally-owned table.
- [x] Task 2: Backend — Sumopod LLM client (AC 1, 2, 3)
  - [x] Install `openai@6.45.0` (official SDK, pointed at a custom `baseURL` — this is the standard way to talk to any OpenAI-compatible gateway, including Sumopod)
  - [x] `app/.env`: `SUMOPOD_API_KEY` and `SUMOPOD_BASE_URL=https://ai.sumopod.com/v1` — provided by Markus 2026-06-25, already in `app/.env` (gitignored). Verified working via direct `curl` to `/v1/models` and `/v1/chat/completions` before any code was written.
  - [x] `src/server/llm/client.ts` — `new OpenAI({ baseURL: process.env.SUMOPOD_BASE_URL, apiKey: process.env.SUMOPOD_API_KEY })`
  - [x] **Resolved (was ADR-005's open item) — but NOT as originally expected:** `claude-sonnet-4-6` IS present in Sumopod's `/v1/models`, but is unusable — see Debug Log References. Model actually used: `gpt-5-mini`, per ADR-007 (new ADR, team-reviewed). `CHAT_MODEL` constant hardcoded in `src/server/llm/client.ts`.
- [x] Task 3: Backend — chat endpoint (AC 1, 2, 3)
  - [x] `src/server/routes/chat.ts` — Hono route `POST /api/chat`, body `{ message: string }`, response `{ reply: string }`
  - [x] Ticker extraction: simple regex `/\b[A-Z]{4}\b/` against the message, **take the first match only** if multiple appear. This is a deliberate T0 heuristic, not an NLU layer — no story has asked for fuzzy/company-name matching yet (that's Search/Epic 2's `ILIKE` pattern, a different feature). Don't build more than this.
  - [x] If a ticker-shaped match is found: query `financial_ratios WHERE code = <ticker>` (exact match — IDX codes are stored uppercase)
  - [x] If **no** ticker-shaped match is found in the message at all: skip the DB query, call the LLM with just the user's message and the system prompt (no data context) — this lets ordinary chit-chat or vague questions get a plain response instead of erroring. Not covered by an AC, but the endpoint needs defined behavior for it.
  - [x] Build the system prompt to explicitly tell the LLM what data it has access to (the specific row's columns, or explicit "no row found for X") and that it has **no price/OHLCV/technical data at all** — the prompt itself is what prevents the model from inventing numbers or claiming capabilities it lacks (this is what makes AC 2 and AC 3 actually hold, not just AC 1). **Implementation note:** AC 2 (unknown ticker) and AC 3 (price/technical question) are actually implemented as deterministic short-circuits in code (`noDataReply()`, `asksAboutPriceOrTechnicalData()`), not left to the LLM's discretion — this makes them 100% reliable and testable without depending on model compliance, which is a stronger guarantee than prompt-engineering alone for a correctness-critical AC. The system prompt (`buildSystemPrompt()`) only carries the AC 1 happy-path data.
  - [x] Call Sumopod chat completion with the user's message + system prompt + retrieved row (or absence) as context; return `{ reply: completion text }`
  - [x] Register the route in `src/server/index.ts`
- [x] Task 4: Frontend — wire up `ChatView` (AC 1, 2, 3)
  - [x] `src/web/components/chat/ChatView.tsx`: remove the `disabled` attribute from the input and send button — these are currently a static stub from Story 1.1, this story is what makes them live
  - [x] Add a message list via React state (`useState`) — in-memory only, no persistence (Story 1.4 owns persisted history; don't add a DB write path here)
  - [x] On submit: append the user message, `POST /api/chat` via `@tanstack/react-query`'s `useMutation` (already installed since Story 1.1, never used yet), append the AI reply on success
  - [x] Keep the existing empty-state placeholder visible only when the message list is empty
  - [x] Keep the existing Golden Rule footer note exactly as-is — do not remove or reword it
- [x] Task 5: Tests (AC 1, 2, 3)
  - [x] Unit test the ticker-extraction regex as a pure function — no DB/LLM needed
  - [x] Unit test the chat route's "no data for ticker" and "asked for price/technical data" branches with a **mocked** DB client and **mocked** LLM client — don't hit real Postgres/Sumopod in these
  - [x] One integration-style test against the **real** local Postgres (already running, already has 947 rows from Story-1.2-prep) for the BBCA happy path — confirms Task 1's schema mapping is actually correct, not just type-checked
  - [x] **Do NOT call the real Sumopod API in tests** — costs real money against Markus's credit, even though the key is now available. Mock the LLM client boundary.

## Dev Notes

- **Scope boundary (ADR-006):** `financial_ratios` only — sector/fundamental/valuation metrics. No price, OHLCV, or technical-indicator data exists anywhere in this repo's pipeline. AC 3 exists specifically to make that an explicit, tested behavior rather than a silent gap a user discovers by accident.
- **Golden Rule (FR-3) is Story 1.3's job, not this one** — but don't write a system prompt that already leans toward buy/sell-flavored phrasing just because it's convenient now; that paints Story 1.3 into a corner. A neutral, fact-stating system prompt now costs nothing and saves rework.
- **Local Postgres is already running** (container `idx-bei-stock-analysis-postgres`, `postgres:16-alpine`, host port **5434** — set up and verified in the MAR-116 prep PR, see ADR-006). 947 rows already loaded. Don't re-run the ETL unless data looks stale.
- `financial_ratios` is owned by the Python ETL (`python/financial_ratios_json2pg.py`), not Drizzle. Treat it strictly read-only from the Bun/TS side in this story.
- **Sumopod API key + base URL provided 2026-06-25, in `app/.env` (gitignored).** Model `claude-sonnet-4-6` confirmed available and working via direct `curl` smoke test before implementation started — no further verification of "does the gateway work at all" is needed, only the actual feature integration.
- `ChatView.tsx` and `Sidebar.tsx` are canonical from Story 1.1 — don't rebuild them, only wire the input/message-list parts of `ChatView` that this story specifically needs.
- ESLint + Prettier exist in `app/` since Story 1.1's review follow-ups — run `bun run lint` and `bun run format` before considering any task done.
- No chat persistence in this story (Story 1.4's job) — message list is React state only, lost on refresh. Don't add a `chat_messages` table or any DB write path.

### Project Structure Notes

New files under `app/src/server/`:

```
src/server/
  db/
    client.ts      # Drizzle postgres-js client
    schema.ts       # financial_ratios read-only mapping
  llm/
    client.ts        # OpenAI SDK pointed at Sumopod's baseURL
  routes/
    chat.ts           # POST /api/chat
```

Updated (not new): `src/server/index.ts` (register the route), `src/web/components/chat/ChatView.tsx` (wire up input/messages).

### References

- [Source: PRD §4.1 FR-2 — `_bmad-output/planning-artifacts/prds/prd-idx-bei-stock-analysis-2026-06-25/prd.md`]
- [Source: docs/decisions/ADR-001-system-architecture-single-vps.md]
- [Source: docs/decisions/ADR-005-llm-provider-sumopod-t0.md]
- [Source: docs/decisions/ADR-006-data-source-t0-local-postgres-financial-ratios-only.md]
- [Source: _bmad-output/implementation-artifacts/1-1-default-chat-view-on-launch.md — previous story; established `app/` scaffold, canonical `Sidebar`/`ChatView` stub, ESLint/Prettier]
- Linear: MAR-116 (this story) under MAR-110 (epic)
- Sumopod base URL + API key provided by Markus 2026-06-25: `https://ai.sumopod.com/v1` (OpenAI-compatible). Model `claude-sonnet-4-6` confirmed present in `/v1/models` and verified with a real `/v1/chat/completions` call — resolves ADR-005's open item.
- Package versions verified against local npm registry 2026-06-25: `drizzle-orm@0.45.2`, `drizzle-kit@0.31.10`, `postgres@3.4.9` (unchanged from Story 1.1), `openai@6.45.0` (new for this story).
- `financial_ratios` schema verified directly against the running container (`docker exec idx-bei-stock-analysis-postgres psql -U postgres -d postgres -c "\d financial_ratios"`), 2026-06-25 — 947 rows, 947 distinct `code` values, sample query for BBCA confirmed (PER 22.38, PBV 4.66, ROE 20.82%).

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- **Correction to this story's own References section (line ~95):** that line says `claude-sonnet-4-6` "resolves ADR-005's open item" — that was true for *model availability* but turned out false for *usability*. See next entry.
- **Major finding, not a code bug:** Sumopod's Claude models (`claude-sonnet-4-6` and `claude-haiku-4-5`, both tested) refuse all non-software-engineering questions, identifying as "Claude Code, asisten CLI resmi dari Anthropic." Reproduced with a raw `curl` call (no app code involved) — given a system prompt establishing a Sahamigo persona + real BBCA data, both models responded with a refusal and a "Claude Code" identity statement. `usage.cached_tokens` (1359) far exceeded the actual request size (~121 tokens), indicating Sumopod injects a large hidden system prompt — likely Claude Code's own identity — ahead of the caller's. The exact same prompt sent to `gpt-5-mini` on the same gateway produced a normal, on-topic, correct answer.
- Did **not** attempt prompt-engineering/jailbreak workarounds to override this — reviewed with the team (Winston/John/Murat), explicitly rejected as the wrong kind of fix (fragile, and inappropriate to try to defeat a vendor's embedded behavior).
- **Resolution:** ADR-007 written — switched `CHAT_MODEL` to `gpt-5-mini`. Markus may separately check with Sumopod support for a non-wrapped Claude access path; not a blocker.
- **New Golden Rule test case discovered live** (not hypothetical): asked a plain valuation question, `gpt-5-mini` answered correctly with real data but closed with an unsolicited offer to turn the analysis into a buy/hold/sell recommendation. Added as case 8 to `docs/qa/golden-rule-test-cases.md` (existing cases renumbered 9-10) per that doc's own stated policy of capturing newly-discovered failure modes immediately.
- AC 2 and AC 3 are implemented as deterministic code branches (see Task 3 implementation note), not prompt-engineered LLM behavior — deliberate choice for reliability/testability, made stronger in hindsight by the Claude-on-Sumopod finding (don't trust model compliance on correctness-critical branches when avoidable).

### Completion Notes List

- All 3 ACs verified both by automated test (`bun test`, 12 pass — 8 new for this story, 4 pre-existing) and by manual end-to-end testing in a real browser (Playwright): BBCA valuation question returns real PER/PBV/ROE/etc. from `financial_ratios` (AC1); unknown ticker (`ZZZZ`) gets a deterministic "no data" reply (AC2); price/technical question gets a deterministic "don't have that data" reply (AC3, instant, no LLM call).
- `bun run lint`, `bun run typecheck`, `bun test` all clean.
- Fixed a regression in Story 1.1's smoke test (`tests/chat-view.test.tsx`) caused by `ChatView` now using `useMutation` — needed a `QueryClientProvider` wrapper that wasn't required before this story.
- Added a Vite dev-server proxy (`/api` → `http://localhost:3000`) in `vite.config.ts` — not explicitly itemized in Task 4, but required for the frontend (port 5173 in dev) to actually reach the backend (port 3000) in dev mode; without it the feature silently doesn't work in `bun run dev`. In production this isn't needed since Hono serves both from one process (Story 1.1's design).
- Two real architecture findings surfaced during implementation, both resolved with the team before continuing (not silently worked around): (1) ADR-006 — Postgres wasn't running at all, resolved by enabling it locally, scoping FR-2 to fundamental/valuation data only; (2) ADR-007 — Sumopod's Claude models are unusable (hardcoded "Claude Code" identity, refuses non-engineering questions), resolved by switching to `gpt-5-mini`.
- A real, freshly-discovered Golden Rule failure mode (unsolicited offer to produce a buy/hold/sell recommendation) was logged to `docs/qa/golden-rule-test-cases.md` as case 8, for Story 1.3 to build against — not fixed here, since Golden Rule enforcement is explicitly out of scope for this story.

### File List

- `app/.gitignore` (added `.env`)
- `app/package.json` (added drizzle-orm, postgres, drizzle-kit, openai)
- `app/bun.lock`
- `app/eslint.config.js` (added `argsIgnorePattern` for unused-vars)
- `app/vite.config.ts` (added dev-server `/api` proxy)
- `app/src/server/index.ts` (registered chat route)
- `app/src/server/db/schema.ts` (new)
- `app/src/server/db/client.ts` (new)
- `app/src/server/llm/client.ts` (new)
- `app/src/server/routes/chat.ts` (new)
- `app/src/web/components/chat/ChatView.tsx` (wired up input/messages)
- `app/src/web/components/chat/ChatView.css` (message list styles)
- `app/tests/chat.test.ts` (new)
- `app/tests/chat-view.test.tsx` (fixed regression: added `QueryClientProvider`)
- `docs/decisions/ADR-007-llm-model-t0-gpt-5-mini-not-claude.md` (new)
- `docs/decisions/ADR-005-llm-provider-sumopod-t0.md` (resolved open item)
- `docs/qa/golden-rule-test-cases.md` (added case 8, renumbered 9-10)

Not committed (gitignored, local-only): `app/.env` (`DATABASE_URL`, `SUMOPOD_API_KEY`, `SUMOPOD_BASE_URL`).

### Change Log

- 2026-06-25: Story 1.2 implemented — Drizzle/Postgres connection, Sumopod LLM client, `POST /api/chat` endpoint, `ChatView` wired live. All tasks complete, all tests passing (12 pass). Two architecture findings resolved with the team mid-implementation (ADR-006 prep already merged; ADR-007 new — model swap from Claude to `gpt-5-mini` on Sumopod). One new Golden Rule test case logged for Story 1.3.
