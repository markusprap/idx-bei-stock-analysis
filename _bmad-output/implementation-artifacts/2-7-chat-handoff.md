---
baseline_commit: 61a9e7635f90664d7b2887db39c4b3e5fa0f0158
---

# Story 2.7: "Tanya AI soal saham ini" CTA and Chat Context Handoff

Status: done

## Story

As a user, I want to jump straight into chat about a stock I'm viewing, with its context already loaded, so that I don't have to retype the ticker or lose my train of thought.

## Acceptance Criteria

1. Given I'm on a stock's detail page, When I click "Tanya AI soal saham ini" (pill CTA, chat-bubble icon, no buy/transact action anywhere near it), Then I'm taken to Chat with that ticker's context already applied.
2. Given the chat thread was entered via this handoff, When the thread renders, Then a visible ticker chip/pill appears at the top — context is never applied invisibly (UX-DR7).
3. Given this CTA replaces what would be a buy/transact button in a typical trading app, When the page is reviewed against the Golden Rule, Then no buy/sell/transact affordance exists anywhere on Stock Detail.

(Source: Linear MAR-126, FR-14, FR-5)

## Tasks / Subtasks

- [x] Task 1: Router — add `validateSearch` to `indexRoute`
  - [x] Add `validateSearch` to `indexRoute` in `router.tsx` accepting `{ ticker?: string }`.

- [x] Task 2: Stock Detail CTA
  - [x] Add "Tanya AI soal saham ini" pill button with chat-bubble icon at the bottom of `StockDetailRoute`.
  - [x] On click: navigate to `{ to: "/", search: { ticker: code } }`.
  - [x] Style as pill (CSS in `stock-detail.css`).

- [x] Task 3: Chat ticker chip
  - [x] Update `ChatRoute` in `chat.tsx` to read `ticker` from search params and pass to `ChatView`.
  - [x] Update `ChatViewProps` to accept `ticker?: string`.
  - [x] In `ChatView`, store ticker in state (preserved across URL navigation to `/chat/$threadId`).
  - [x] Show ticker chip/pill at the top of the chat view when ticker is set (UX-DR7).
  - [x] Pre-fill input with `{ticker} ` so the user's message naturally contains the ticker.
  - [x] Style the chip in `ChatView.css`.

- [x] Task 4: Tests
  - [x] Add CTA test to `stock-detail-route.test.tsx`.
  - [x] Add ticker chip render test to a new or existing chat test file.

## Dev Notes

- **Navigation**: `navigate({ to: "/", search: { ticker: code } })` — routes to chat new thread with ticker in URL search param.
- **UX-DR7**: ticker chip is always visible, never invisible context injection — the chip IS the visible signal.
- **Input pre-fill**: pre-fill with `{ticker} ` so user types their question after it; the backend regex finds the ticker naturally.
- **No backend changes needed**: the backend already extracts ticker via regex from message text.
- **Golden Rule**: CTA is chat-only, no buy/sell/hold affordance. CTA label is "Tanya AI soal saham ini" — "tanya" (ask/learn) not "beli" (buy).
- **`validateSearch`**: TanStack Router v1 pattern — add to `indexRoute` so TypeScript knows `/` accepts `?ticker=`.
- **Stock detail has no buy/sell affordance** — satisfies AC3 automatically since we only add a chat CTA.

### Project Structure Notes

Updated:
- `app/src/web/router.tsx` — add `validateSearch` to `indexRoute`
- `app/src/web/routes/chat.tsx` — read ticker from search, pass to ChatView
- `app/src/web/components/chat/ChatView.tsx` — ticker chip, pre-fill
- `app/src/web/routes/stock-detail.tsx` — add CTA button
- `app/src/web/routes/stock-detail.css` — CTA styles
- `app/src/web/components/chat/ChatView.css` — ticker chip styles
- `app/tests/stock-detail-route.test.tsx` — CTA test
- `app/tests/chat-view-ticker.test.tsx` OR existing chat tests — chip render test

### References

- Linear: MAR-126 (this story) under MAR-111 (Epic 2)
- FR-14: CTA on stock detail; FR-5: chat context handoff
- UX-DR7: context is never applied invisibly

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

- `_bmad-output/implementation-artifacts/2-7-chat-handoff.md` (this file)
- `app/src/web/router.tsx` — validateSearch added to indexRoute
- `app/src/web/routes/stock-detail.tsx` — CTA button
- `app/src/web/routes/stock-detail.css` — CTA pill styles
- `app/src/web/routes/chat.tsx` — reads ticker from search, passes to ChatView
- `app/src/web/components/chat/ChatView.tsx` — ticker prop, chip, pre-filled input
- `app/src/web/components/chat/ChatView.css` — ticker chip styles
- `app/src/web/components/layout/Sidebar.tsx` — navigate to "/" now passes search: { ticker: undefined }
- `app/tests/stock-detail-route.test.tsx` — CTA button test
- `app/tests/chat-view.test.tsx` — ticker chip render tests

### Change Log

- 2026-06-26: Story created. Status set to in-progress.
- 2026-06-26: All 4 tasks complete. 83/83 tests passing. Status → done.
