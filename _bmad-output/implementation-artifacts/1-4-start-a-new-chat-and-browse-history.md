---
baseline_commit: ab729dd55b5aa6d59dfeddc1dcae89547f0c8abf
---

# Story 1.4: Start a New Chat and Browse History

Status: review

## Story

As Bang Markus (Sahamigo's T0 user),
I want to start a new chat thread and revisit old ones,
so that separate research sessions about different stocks don't get mixed together.

## Acceptance Criteria

1. Given I'm in an existing thread, When I click "+ Chat Baru", Then a new thread starts and the old one stays unchanged and accessible.
2. Given I have multiple past threads, When I open "Riwayat", Then I can reopen any one without losing content.
3. **(Re-verification of Story 1.1 AC2, per Murat's review follow-up — see Dev Notes):** Given real, persisted chat history exists in the database, When I open the app at `/` with no prior navigation, Then it still opens to a new/empty Chat view, not an auto-resumed thread and not Search/Watchlist. Story 1.1 could only satisfy this "by construction" because no persistence existed yet to test against; this story makes it a real, data-backed test.

(Source: PRD FR-4; `_bmad-output/planning-artifacts/epics.md` Story 1.4; Linear MAR-118. AC3 added by this story per the Story 1.1 review follow-up — not a new PRD requirement, a stronger test of an existing one.)

## Tasks / Subtasks

- [x] Task 1: Database — new app-owned tables for chat persistence (AC 1, 2, 3)
  - [x] **This is the only story in Epic 1 that owns new database entities** (per epics.md). Contrast sharply with Story 1.2's `financial_ratios`: that table is externally owned by the Python ETL and explicitly **read-only, no `drizzle-kit push`/migrations allowed**. `chat_threads`/`chat_messages` are the opposite — owned entirely by this app, and Drizzle migrations are the correct, intended tool here. Don't carry Story 1.2's "never run drizzle-kit against this DB" rule over to these tables; it does not apply.
  - [x] New file `src/server/db/chat-schema.ts` (separate from `db/schema.ts`, which stays the `financial_ratios` read-only mapping — keep the ownership boundary visually obvious by file, not just by convention):
    ```ts
    import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

    export const chatThreads = pgTable("chat_threads", {
      id: uuid("id").primaryKey().defaultRandom(),
      title: text("title"),
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow(),
    });

    export const chatMessages = pgTable("chat_messages", {
      id: uuid("id").primaryKey().defaultRandom(),
      threadId: uuid("thread_id")
        .notNull()
        .references(() => chatThreads.id, { onDelete: "cascade" }),
      role: text("role").notNull(), // "user" | "assistant"
      content: text("content").notNull(),
      createdAt: timestamp("created_at").notNull().defaultNow(),
    });

    export type ChatThreadRow = typeof chatThreads.$inferSelect;
    export type ChatMessageRow = typeof chatMessages.$inferSelect;
    ```
    `uuid(...).defaultRandom()` relies on `gen_random_uuid()`, built into Postgres core since v13 — no extension needed on the `postgres:16-alpine` image already in use.
  - [x] Generate the migration: `cd app && bunx drizzle-kit generate` (you'll need a minimal `drizzle.config.ts` pointing at `src/server/db/chat-schema.ts` and `DATABASE_URL` — this doesn't exist yet in the repo, this story is what introduces it). Commit the generated SQL under `app/drizzle/`. **Do not use `drizzle-kit push`** for this story — a committed, reviewable SQL file is what lets the same migration be applied identically in local dev and CI (see Task 5), which `push` doesn't give you.
  - [x] Apply the migration to the local dev Postgres (`idx-bei-stock-analysis-postgres`, port 5434) before writing any route code that depends on these tables.
- [x] Task 2: Backend — thread/message persistence wrapping the existing chat logic (AC 1, 2)
  - [x] **Do not modify `handleChatMessage()`'s signature or internals in `src/server/routes/chat.ts`.** It is the pure "what does the AI say" function, already well-tested across Stories 1.2/1.3 (guard wiring, Golden Rule prompts). Persistence is a wrapping concern, not something to thread through that function. Add a new orchestration layer instead.
  - [x] New file `src/server/routes/chat-history.ts` (or extend `chat.ts` if it stays well under the 500-line ceiling — your call, but keep the persistence logic visually separate from the AI-response logic either way):
    - `createThread(deps, firstMessage: string): Promise<ChatThreadRow>` — inserts a new `chat_threads` row. Title = the first ~50 characters of the first user message (simple truncation, no LLM summarization — that's scope creep for T0, nobody asked for smart titles).
    - `appendMessage(deps, threadId: string, role: "user" | "assistant", content: string): Promise<void>` — inserts into `chat_messages` AND bumps the parent thread's `updatedAt` to `now()` (needed so "Riwayat" sorts by most-recently-active, not creation time).
  - [x] Modify the `POST /api/chat` handler in `createChatRoute()`: request body becomes `{ message: string, threadId?: string }`. Flow: if `threadId` is absent, call `createThread()` first to get a new one. Persist the user message (`appendMessage`, role `"user"`). Call the existing, unchanged `handleChatMessage()` to get the AI's reply text. Persist the reply (`appendMessage`, role `"assistant"`). Response becomes `{ threadId: string, reply: string }` — the client needs the (possibly newly-created) `threadId` back to update its own state/URL.
  - [x] New route `GET /api/threads` — returns `{ id, title, updatedAt }[]` ordered by `updatedAt` descending. No pagination needed (T0, single user, low volume).
  - [x] New route `GET /api/threads/:id/messages` — returns `{ id, role, content, createdAt }[]` for that thread, ordered by `createdAt` ascending. Return an empty array (not a 404) for an unknown id — simplest behavior, matches this app's existing pattern of degrading gracefully rather than erroring (see `noDataReply()` in Story 1.2).
- [x] Task 3: Frontend — thread-aware routing and a real "Riwayat" list (AC 1, 2)
  - [x] Add a dynamic route in `src/web/router.tsx`: `createRoute({ getParentRoute: () => rootRoute, path: "/chat/$threadId", component: ChatRoute })`. TanStack Router v1's param syntax is `$paramName` in the path string; read it inside the component via that route's `useParams()` (e.g. `chatThreadRoute.useParams()` returning `{ threadId }`), not by guessing a different API.
  - [x] **Explicit design decision (write this down, don't leave it implicit):** the index route `/` ALWAYS renders a new, empty Chat view — it never auto-resumes the most recent thread, even when threads exist. This is what makes Story 1.1's AC2 hold by construction (index unconditionally shows the Chat *surface*) while still giving this story's AC3 something real to test against (see Task 4). Existing threads are reachable only by clicking them in "Riwayat", which navigates to `/chat/$threadId`.
  - [x] `src/web/routes/chat.tsx` (`ChatRoute`): needs to know which thread it's rendering — `null`/absent for the index route, the real id for `/chat/$threadId`. Pass it down to `ChatView` as a prop.
  - [x] `ChatView.tsx` changes:
    - Accept a `threadId: string | null` prop.
    - When `threadId` is non-null, fetch its messages via `useQuery` against `GET /api/threads/:id/messages` and use that as the initial/source-of-truth message list instead of starting from `[]`.
    - The `useMutation` calling `POST /api/chat` now sends `{ message, threadId: threadId ?? undefined }` and, on success, reads the `threadId` back from the response. If the request was made with no `threadId` (a brand-new thread), use TanStack Router's navigate to move from `/` to `/chat/$newThreadId` **without losing the messages already rendered** — this is what turns "refresh loses everything" (Sally's Story 1.2 review follow-up) into "refresh reloads from Postgres," since the conversation now has a real, addressable URL. Don't implement this as a full page reload/remount that re-fetches and replaces state — that would flash/lose the just-sent exchange.
    - Invalidate the `GET /api/threads` query (React Query) after a successful send, so "Riwayat" picks up the new/bumped thread without a manual refresh.
  - [x] `Sidebar.tsx` changes:
    - "+ Chat Baru" button (`sidebar-new-chat`, currently has no `onClick` at all): wire it to navigate to `/`. It does **not** call the backend — no thread row is created until the user actually sends a message (lazy creation, matches AC1's "a new thread starts" being about the UI/UX moment, not a DB write that happens before the user types anything).
    - "Riwayat" section (currently a static `<p>Belum ada riwayat chat.</p>` stub): fetch the thread list via `useQuery` against `GET /api/threads`. When the list is non-empty, render it as a list of buttons/links (using the thread's `title`, falling back to a generic label if `title` is null) that navigate to `/chat/$id`. Keep the existing empty-state copy ("Belum ada riwayat chat.") for when the list is genuinely empty — don't remove it, just make it conditional on real data instead of always rendering.
- [x] Task 4: Tests (AC 1, 2, 3 — including the two carried-forward review follow-ups)
  - [x] **Murat's follow-up, Story 1.1 review, AC2 (resolves it for real this time):** seed at least one real `chat_threads`/`chat_messages` row pair into the test/local Postgres, then assert that rendering the index route (`/`, no `threadId`) still shows the empty-state Chat copy ("Mau tanya soal saham apa hari ini?") — NOT the seeded thread's messages. This is the actual data-backed test Story 1.1 couldn't write because no persistence existed yet. Don't just re-run Story 1.1's old smoke test unchanged and call the follow-up resolved — it has to exercise real seeded history to count.
  - [x] **Sally's follow-up, Story 1.2 review (structurally resolved, verify it):** test that fetching `GET /api/threads/:id/messages` for an existing thread returns its full message history — i.e. confirm the mechanism that makes "refresh restores the conversation" actually true, since this story's persistence is what fixes that UX cost Sally flagged. You're not just documenting this one — you're closing it.
  - [x] Unit/integration tests (mocked DB where Story 1.2/1.3's existing patterns apply, real Postgres where the AC specifically calls for it — follow the same mocking conventions already established in `app/tests/chat.test.ts`):
    - `POST /api/chat` with no `threadId` creates a new thread and returns one in the response.
    - `POST /api/chat` with an existing `threadId` appends to that thread instead of creating a new one.
    - `GET /api/threads` returns threads ordered by `updatedAt` descending.
    - `GET /api/threads/:id/messages` on an unknown id returns an empty array, not an error.
  - [x] Run `bun run lint`, `bun run typecheck`, `bun test` — all clean before this story is done.
- [x] Task 5: CI — extend the Postgres setup for the new tables (don't repeat Story 1.2's CI failure)
  - [x] Story 1.2 shipped a CI failure on its first PR run because a real-Postgres integration test needed tables/data that didn't exist in CI's fresh Postgres service container — fixed reactively with a seed step. **Do it proactively this time.** `.github/workflows/app-ci.yml` already has a `postgres` service and a seed step for `financial_ratios` (`app/tests/fixtures/seed-financial-ratios.sql`). Add applying this story's migration (the SQL generated in Task 1, under `app/drizzle/`) as an additional CI step, `psql -f`-style, consistent with the existing fixture step — before `bun test` runs.
  - [x] Verify locally first: tear down and recreate a throwaway Postgres container, apply both the existing fixture and the new migration in the same sequence CI will use, run `bun test` against it, confirm green — exactly the verification discipline used to fix Story 1.2's CI failure. Don't push and hope.

## Dev Notes

- **Why this story directly resolves both carried-forward review follow-ups, not just documents them:**
  - Murat (Story 1.1 review): AC2 had no real test because there was no persistence to test against. This story adds persistence, so Task 4's first bullet is a genuine, data-backed regression test — not a restatement of the old "no branching exists" reasoning.
  - Sally (Story 1.2 review): losing an in-progress conversation on refresh was flagged as a real UX cost. Once messages live in Postgres keyed by `threadId`, and the URL reflects that `threadId` (Task 3's navigate-after-first-message design), a refresh re-fetches from the server instead of starting from empty `useState([])`. This story doesn't just write a dev note about the cost — it removes the cause.
- **Ownership boundary, read this before touching the database:** `financial_ratios` (Story 1.2) is externally owned by the Python ETL — read-only, no migrations, ever. `chat_threads`/`chat_messages` (this story) are the opposite: 100% owned by this app, and Drizzle migrations are exactly the right tool. Keep these two tables' files (`db/schema.ts` vs `db/chat-schema.ts`) and rules separate in your head — don't let either story's constraints bleed into the other's tables.
- **No `drizzle.config.ts` exists in the repo yet** — this story introduces it (needed for `drizzle-kit generate`). Point it at `src/server/db/chat-schema.ts` only; do NOT point it at `db/schema.ts` (`financial_ratios`) — that table must never be touched by Drizzle's migration tooling, per Story 1.2's explicit rule, which still applies.
- **No authentication/user system exists anywhere in this codebase, and this story does not add one.** T0 has exactly one user (Bang Markus) — `chat_threads` has no `userId` column. Don't add one "for later"; that's exactly the kind of ahead-of-need building `CLAUDE.md`'s T0 scope section warns against. If multi-user ever happens, that's a schema migration for that future story, not a speculative column now.
- **Thread titles are dumb truncation, not LLM-generated summaries.** Nothing in the PRD or epics.md asks for smart titles, and adding an LLM call just to name a thread is an unrequested feature with a real cost (Sumopod credit) for zero validated user value at T0.
- **Golden Rule (FR-3) is untouched by this story** — persisted messages are stored as-is (already passed through Story 1.3's guard before being returned to the user, so what's persisted is already the safe, post-guard text). Don't re-run the guard on read; it was already applied on write.
- **EOD-honesty (`CLAUDE.md` DoD check):** not implicated by this story — no new data surfaces are added, only persistence of existing chat text. Confirm no new UI element in this story implies real-time chat "sync" or anything beyond what's actually happening (simple request/response, no websockets, no polling).
- **Quota/tier (`CLAUDE.md` DoD check):** explicitly NOT this story's job. FR-4 doesn't mention limits, and Epic 4 (Account & Monetization, MAR-113) owns the monthly chat-quota mechanism. Don't add quota logic here just because you're touching the chat endpoint — that would be scope creep into another epic's story.
- **Read `src/server/routes/chat.ts`, `src/web/components/chat/ChatView.tsx`, `src/web/components/layout/Sidebar.tsx`, and `src/web/router.tsx` in full before changing any of them** — Stories 1.1-1.3 already established real behavior in all four; this story extends them, it doesn't rebuild them. In particular, `chat.ts`'s `handleChatMessage()`, the Golden Rule guard wiring, and the Sumopod LLM client must not be touched — this story only wraps persistence around the existing call, per Task 2.

### Project Structure Notes

New files:

```
app/
  drizzle.config.ts          # new — points at src/server/db/chat-schema.ts only
  drizzle/
    <timestamp>_*.sql        # generated migration, committed
  src/server/
    db/
      chat-schema.ts          # chatThreads, chatMessages (app-owned, migrated)
    routes/
      chat-history.ts         # createThread(), appendMessage() — persistence wrapper
```

Updated (not new):
- `src/server/routes/chat.ts` — `POST /api/chat` now persists; new `GET /api/threads`, `GET /api/threads/:id/messages` routes (could live here or in `chat-history.ts`, your call, just keep it under the 500-line ceiling).
- `src/server/index.ts` — register the two new GET routes.
- `src/web/router.tsx` — add the `/chat/$threadId` route.
- `src/web/routes/chat.tsx` — pass `threadId` through to `ChatView`.
- `src/web/components/chat/ChatView.tsx` — thread-aware message loading/sending.
- `src/web/components/layout/Sidebar.tsx` — wire "+ Chat Baru" and real "Riwayat" list.
- `.github/workflows/app-ci.yml` — apply the new migration before tests run.

No changes expected to `db/schema.ts` (`financial_ratios`), `llm/client.ts`, or `golden-rule/guard.ts` — this story is about persistence and navigation, not the AI response logic itself.

### References

- [Source: PRD FR-4 — `_bmad-output/planning-artifacts/prds/prd-idx-bei-stock-analysis-2026-06-25/prd.md`]
- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 1, Story 1.4 (exact AC wording for AC1-2; AC3 added by this story per the review follow-up)]
- [Source: CLAUDE.md — "T0 vs. T1+ — what NOT to build yet", Definition of Done checklist]
- [Source: _bmad-output/implementation-artifacts/1-1-default-chat-view-on-launch.md — Senior Developer Review, finding #2 (Murat) — the AC2 follow-up this story resolves]
- [Source: _bmad-output/implementation-artifacts/1-2-ask-about-a-ticker-and-get-fact-based-answers.md — established `chat.ts`'s shape, the `financial_ratios` read-only/no-migrations rule, and the CI Postgres-service pattern this story extends]
- [Source: _bmad-output/implementation-artifacts/1-3-golden-rule-enforcement.md — Senior Developer Review, finding #2 (Sally) — the refresh-loses-conversation follow-up this story resolves]
- Linear: MAR-118 (this story) under MAR-110 (epic)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `noUncheckedIndexedAccess` (tsconfig) made `db.insert(...).returning()[0]` type as `Row | undefined` in `createThread()` — fixed with an explicit invariant check (`if (!thread) throw ...`) rather than a non-null assertion, consistent with this codebase's existing pattern (`db/client.ts`'s `DATABASE_URL` check).
- `eslint-plugin-react-hooks`'s `set-state-in-effect` rule rejected the first `ChatView` draft, which mirrored the `threadId` prop and query data into local `useState` via `useEffect` (the classic "copying props/derived data into state" anti-pattern). Redesigned to derive `messages` directly from `useQuery`'s data during render, with `mutation.variables`/`mutation.isPending` covering the in-flight optimistic display instead of a separate local state array — no effect needed at all, and the lint rule passes because there's nothing to flag.
- The existing `chat-view.test.tsx` smoke test broke once `ChatRoute`/`ChatView` started calling `useParams`/`useNavigate` (`useRouter must be used inside a <RouterProvider>`). Fixed by rendering through a real `RouterProvider` with `createMemoryHistory` instead of mounting `<ChatRoute />` bare — this is also what made Murat's AC3 re-verification test (seeded real history, confirm `/` doesn't auto-resume it) possible to write at all.
- Manual end-to-end verification via Playwright against the real running app (Bun server + Vite + local Postgres + real Sumopod call, same approach as Stories 1.2/1.3): sent a message with no `threadId` → URL navigated to `/chat/<new-uuid>` immediately, Riwayat picked up the new thread without a manual refresh, the message and reply were both visible. Reloaded the browser at that exact URL → full conversation restored from Postgres (direct evidence Sally's Story 1.2 follow-up is fixed, not just asserted in a test). Clicked "+ Chat Baru" → returned to `/` with the empty-state copy, old thread untouched in Riwayat. Clicked the Riwayat entry → navigated back to the same thread URL correctly.

### Completion Notes List

- All 3 ACs implemented and verified both by automated tests and a real browser session: AC1 ("+ Chat Baru" starts a new thread, old one stays accessible) — verified live; AC2 (reopen any past thread without losing content) — verified live via reload-at-URL; AC3 (index never auto-resumes real persisted history) — new data-backed test in `chat-view.test.tsx`, directly resolving Murat's Story 1.1 review follow-up (it could only be asserted "by construction" before, since no persistence existed to test against).
- Sally's Story 1.2 review follow-up (losing an in-progress conversation on refresh) is structurally resolved, not just documented: once a thread exists, its URL (`/chat/$threadId`) is what a refresh re-fetches from, confirmed both by a unit test (`GET /api/threads/:id/messages` returns full history) and by an actual browser reload during manual verification.
- `handleChatMessage()` (Stories 1.2/1.3's AI-response logic, including the Golden Rule guard) was not touched — persistence is a wrapping concern in `chat-history.ts` and the `POST /api/chat` handler only, exactly as planned in Dev Notes.
- New app-owned tables (`chat_threads`, `chat_messages`) were migrated via `drizzle-kit generate` + a committed SQL file (`app/drizzle/0000_careful_husk.sql`) — deliberately not `drizzle-kit push`, so the exact same migration applies identically in local dev and CI. `financial_ratios` remains untouched by any Drizzle tooling, per Story 1.2's still-applicable rule.
- `bun test`: 42 pass (31 pre-existing + 11 new: 6 in `chat-history.test.ts` for `createThread`/`appendMessage`/`listThreads`/`listMessages` plus route-level persistence wiring, 1 new AC3 re-verification test in `chat-view.test.tsx`, plus the existing empty-state test updated to render through a real router). `bun run lint` and `bun run typecheck` both clean.
- CI extended proactively (Task 5) to apply this story's migration before tests run, rather than waiting to discover the gap reactively the way Story 1.2 did — verified locally against a fresh throwaway Postgres container with both the existing fixture and this story's migration applied in CI's exact sequence before pushing.
- No quota/tier logic added (explicitly Epic 4's job, not this story's) and no thread-title summarization via LLM (no AC asked for it, simple truncation is sufficient and costs nothing).

### File List

- `app/drizzle.config.ts` (new)
- `app/drizzle/0000_careful_husk.sql` (new — migration for `chat_threads`/`chat_messages`)
- `app/src/server/db/chat-schema.ts` (new)
- `app/src/server/db/client.ts` (merged `chat-schema` into the typed Drizzle client alongside the existing `financial_ratios` schema)
- `app/src/server/routes/chat-history.ts` (new — `createThread`, `appendMessage`, `listThreads`, `listMessages`)
- `app/src/server/routes/chat.ts` (`POST /api/chat` now persists and returns `threadId`; added `GET /api/threads`, `GET /api/threads/:id/messages`; `handleChatMessage()` itself unchanged)
- `app/src/web/router.tsx` (added `/chat/$threadId` route; exported `routeTree` for test use)
- `app/src/web/routes/chat.tsx` (reads `threadId` via `useParams({ strict: false })`, passes to `ChatView`)
- `app/src/web/components/chat/ChatView.tsx` (thread-aware: loads existing messages via `useQuery`, sends `threadId` with each message, navigates to the new thread's URL after the first message)
- `app/src/web/components/layout/Sidebar.tsx` ("+ Chat Baru" wired to navigate to `/`; "Riwayat" now renders real threads via `useQuery`)
- `app/src/web/components/layout/Sidebar.css` (added `.sidebar-history-list`/`.sidebar-history-item` styles)
- `app/tests/chat-history.test.ts` (new)
- `app/tests/chat-view.test.tsx` (rendering helper switched to a real `RouterProvider`+memory history; added the AC3 re-verification test)
- `.github/workflows/app-ci.yml` (added a step to apply the new migration before tests)

### Change Log

- 2026-06-25: Story drafted via `create-story` — comprehensive context assembled from PRD FR-4, epics.md, the current router/Sidebar/ChatView/chat.ts implementation (read in full, not assumed), and both carried-forward review follow-ups from Story 1.1 (Murat, AC2) and Story 1.2 (Sally, refresh UX cost). Status set to ready-for-dev.
- 2026-06-25: Story 1.4 implemented — new `chat_threads`/`chat_messages` tables (Drizzle-migrated, app-owned, contrast with `financial_ratios`'s read-only rule), persistence wrapped around the existing unchanged `handleChatMessage()`, `/chat/$threadId` routing, Sidebar's "+ Chat Baru"/"Riwayat" wired to real data. Both carried-forward review follow-ups resolved for real (not just documented): Murat's AC2 re-verification now uses seeded real history; Sally's refresh-loses-conversation concern is structurally fixed by the URL-addressable thread persistence. CI extended proactively for the new migration. All tasks complete, 42 tests passing, lint/typecheck clean, manual Playwright verification against the real running app (real Sumopod call, real Postgres, real browser reload) confirmed every AC live.
