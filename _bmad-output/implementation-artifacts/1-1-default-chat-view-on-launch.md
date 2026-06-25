---
baseline_commit: 9462e8cd74155c0b16bf0519491bc6fab97e3390
---

# Story 1.1: Default Chat View on Launch

Status: ready-for-review

## Story

As Bang Markus (Sahamigo's T0 user),
I want Sahamigo to open directly to the Chat view,
so that I can start asking about a stock immediately without navigating anywhere first.

## Acceptance Criteria

1. Given I open Sahamigo with no prior session, When the app loads, Then I see the Chat view (not Search/IHSG or Watchlist).
2. Given I have prior chat history, When I open the app, Then it still opens to Chat, not another view.

(Source: PRD FR-1; Linear MAR-115.)

## Tasks / Subtasks

- [x] Task 1: Bootstrap the app project — this is the FIRST story in the repo, no scaffold exists yet (prerequisite for AC 1-2)
  - [x] Create `app/` at repo root (sibling to `python/`), `bun init` style layout
  - [x] `package.json` deps: `hono@4.12.27`, `react@19.2.7`, `react-dom@19.2.7`, `@tanstack/react-router@1.170.16`, `@tanstack/react-query@5.101.1`; devDeps: `vite@8.1.0`, `@vitejs/plugin-react`, `typescript@6.0.3`, `@types/bun@1.3.14`, `@types/react`, `@types/react-dom`
  - [x] `tsconfig.json` (strict mode on), `vite.config.ts` (React plugin)
  - [x] `src/server/index.ts` — Hono entry; in dev, just needs to boot (Vite handles the frontend dev server separately); in prod it will serve the built SPA from `dist/` — implement the prod static-serve path now even though only dev mode is exercised by this story, so Task 1 isn't revisited later
  - [x] `package.json` scripts: `dev` (Vite dev server), `build` (`vite build`), `start` (`bun run src/server/index.ts`)
- [x] Task 2: Default route → Chat (AC 1, 2)
  - [x] `src/web/router.tsx` — TanStack Router; index route (`/`) renders the Chat route directly (no separate splash/landing, no redirect chain)
  - [x] `src/web/routes/chat.tsx` — renders `<ChatView />` inside `<Sidebar />`
- [x] Task 3: Canonical Sidebar component (AC 1) — shared by every future screen, build it right once
  - [x] `src/web/components/layout/Sidebar.tsx`: logo + tagline ("belajar baca saham, bukan ikut sinyal"), "+ Chat Baru" button, Watchlist + Search nav pills, "Riwayat" section, profile/tier footer
  - [x] Watchlist/Search pills, "+Chat Baru", Riwayat list, and profile footer are visually complete but functionally inert in this story — wiring belongs to Story 1.4 (history), Epic 2 (Search), Epic 3 (Watchlist), Epic 4 (tier). Don't build their logic now; don't omit their presence either — that's the whole point of ADR-002 (one shared component, not rebuilt per screen).
  - [x] No emoji anywhere — thin-stroke SVG line icons only (chat-bubble, star outline, magnifier outline). This is a corrected mistake (ADR-002), not a style option.
- [x] Task 4: Chat view shell (AC 1, 2) — empty state only, no chat functionality (that's Story 1.2/1.3/1.4)
  - [x] `src/web/components/chat/ChatView.tsx`: empty-state placeholder (no messages yet), disabled input bar stub, footer note: "Sahamigo menyajikan data, bukan rekomendasi — keputusan tetap di tangan lo."
- [x] Task 5: Design tokens (AC 1) — first time these get concretized into code; see Dev Notes for which values are carried over vs newly set now
  - [x] `src/web/styles/tokens.css`: CSS custom properties for canvas, 4-tier sage-teal accent, text color, heading/body fonts (Google Fonts CDN: Fraunces + Inter)
- [x] Task 6: Smoke test (testing standard, see Dev Notes)
  - [x] `bun test` — assert the index route renders the Chat view's empty-state copy

## Dev Notes

- **Scope boundary:** no Postgres/Neo4j connection, no LLM call, no persistence in this story. Story 1.2 adds data/LLM, Story 1.4 adds persisted chat history. Don't reach ahead into those.
- **This is the first story in the repo.** No existing app code to read or preserve. The Python scraper (`python/`) is a separate, decoupled system per ADR-001 — don't touch it, don't import from it. This story doesn't even reach the database, so the decoupling question doesn't bite yet.
- **Single deployable process:** Hono serves both the future API and the built SPA — matches the single-VPS constraint (ADR-001, CLAUDE.md Architecture section). Do not introduce a separate frontend server/host; that's the kind of architecture change CLAUDE.md says requires a new ADR.
- **Sidebar is the one component every later epic depends on getting right.** Prototyping caught a real bug where each screen's sidebar was hand-built independently and drifted (ADR-002). Build `Sidebar.tsx` once now as the single source of truth — Epic 2/3/4 stories will reuse it unchanged except for which nav pill is `.active`.
- **No emoji as iconography, anywhere, ever** — an early prototype pass used emoji, Markus flagged it as reading like generic AI output ("AI slop"), it was replaced everywhere (ADR-002). Treat this as a fixed regression, not a pending style decision.
- **Design tokens — provenance matters here:** the original DesignSync prototype (4 HTML screens Markus approved across several rounds) is *not* a file in this repo — it lives in an external tool and isn't accessible to read directly. Two concrete values from it survive in the project's written record and should be reused exactly, not reinvented: the mid-tier sage-teal accent `#3E7A5C` (used on the Watchlist sparkline), and the type pairing **Fraunces** (serif, headings) + **Inter** (humanist sans, body). Everything else in the 4-tier accent scale (darkest, light-tint, near-cream) and the canvas/text colors below are being set for the first time in this story, in the documented *direction* (warm cream canvas, warm dark brown/charcoal text, never pure black) — not copied from a file that doesn't exist locally. Once written to `tokens.css`, that file becomes the canonical source; don't rederive these later without a reason.
  - Suggested starting values: canvas `#FBF7F0`; text `#2B2620`; accent-1 (darkest) `#2F5D4F`; accent-2 (mid, **known**) `#3E7A5C`; accent-3 (light tint) `#9FC2AE`; accent-4 (near-cream) `#EAF2EC`.
- **Testing standard:** none established yet (first story) — use Bun's built-in test runner (`bun test`), no new test framework dependency. One smoke test is enough for this story; don't over-build test infra here.
- **Copy language:** Bahasa Indonesia for all UI strings (tagline, footer note, nav labels) — matches every prototype screen and `[ASSUMPTION]` in PRD §4.1. Not yet a hard requirement per the PRD, but there is no prior instance of English UI copy to follow, so default to Indonesian.
- **`@tanstack/react-query` is installed now** even though this story makes no server calls — Epic 2 (Search/IHSG) and Story 1.2 will need it immediately after, and it's a dependency-install decision, not a behavior decision, so doing it once now avoids two passes.
- **`drizzle-orm`/`drizzle-kit`/`postgres` are NOT installed in this story** — no DB access yet (Database/Entity Creation Principle: only add what the story needs). Versions to use when a later story needs them: `drizzle-orm@0.45.2`, `drizzle-kit@0.31.10`, `postgres@3.4.9` (verified 2026-06-25, pin these rather than re-checking).

### Project Structure Notes

No existing structure to conflict with — this story establishes it:

```
app/
  package.json
  tsconfig.json
  vite.config.ts
  index.html
  src/
    server/
      index.ts              # Hono entry: dev boot now, prod static-serve path stubbed in
    web/
      main.tsx              # React entry, mounts router
      router.tsx            # TanStack Router, index route -> Chat
      routes/
        chat.tsx
      components/
        layout/
          Sidebar.tsx        # canonical, reused unchanged by Epics 2-4
        chat/
          ChatView.tsx       # empty-state shell only
      styles/
        tokens.css
```

No monorepo/workspaces split — one Bun process, one deployable, matches the single-VPS constraint.

### References

- [Source: PRD §4.1 Chat (AI Tutor) FR-1, §10 Information Architecture, §11 Aesthetic and Tone — `_bmad-output/planning-artifacts/prds/prd-idx-bei-stock-analysis-2026-06-25/prd.md`]
- [Source: CLAUDE.md — Architecture, Definition of Done sections]
- [Source: docs/decisions/ADR-001-system-architecture-single-vps.md]
- [Source: docs/decisions/ADR-002-ux-conventions-shell-disclosure-iconography.md]
- [Source: docs/design-references/sahamigo-design-reference.md]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 1, Story 1.1]
- Linear: MAR-115 (this story) under MAR-110 (epic)
- Package versions verified against local npm registry, 2026-06-25 (see Dev Notes)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Bun auto-detects a default-exported object with a `.fetch` method in an entry run directly (`bun run src/server/index.ts`) and serves it itself; an additional explicit `Bun.serve()` call on the same port caused `EADDRINUSE`. Fixed by exporting `{ fetch: app.fetch, port }` directly from `src/server/index.ts` and removing the manual `Bun.serve` call.
- `tsconfig.json` needed `"types": ["bun"]` explicitly — without it, `tsc --noEmit` couldn't resolve `process` globals or `bun:test` module types even though `@types/bun`/`bun-types` were installed.
- Added `src/web/vite-env.d.ts` with `/// <reference types="vite/client" />` so `tsc` recognizes side-effect CSS imports (`import "./Sidebar.css"`, `import "./ChatView.css"`).

### Completion Notes List

- Scaffolded `app/` (Bun + Hono + React 19 + TanStack Router/Query + Vite), per the pinned versions in Dev Notes — all verified to exist on the npm registry before install.
- Verified manually: `bun run src/server/index.ts` boots and responds; `bun run dev` (Vite) boots; loaded the rendered page in a real browser via Playwright MCP and confirmed visually — Chat view renders by default with the canonical Sidebar (sage-teal accent, Fraunces/Inter fonts, no emoji, thin-stroke SVG icons only), disabled input stub, and the Golden-Rule footer note. Screenshot reviewed then discarded (not committed).
- `bun test` (2 pass) and `tsc --noEmit` (clean) both pass.
- AC 2 ("prior chat history → still opens to Chat") is satisfied by construction: the index route unconditionally renders `ChatRoute` with no session/history-based branching — there is no code path that could open elsewhere. No persisted history exists yet (Story 1.4), so this is the full extent of what AC 2 can mean in this story.
- Sidebar's Watchlist/Search pills, "+Chat Baru", Riwayat list, and profile footer are present but functionally inert (no `onClick`/navigation), per Dev Notes — wiring is out of scope for this story.

### File List

- `app/package.json`
- `app/bun.lock`
- `app/.gitignore`
- `app/eslint.config.js`
- `app/.prettierrc.json`
- `app/tsconfig.json`
- `app/vite.config.ts`
- `app/src/server/index.ts`
- `app/src/web/index.html`
- `app/src/web/main.tsx`
- `app/src/web/router.tsx`
- `app/src/web/vite-env.d.ts`
- `app/src/web/routes/chat.tsx`
- `app/src/web/components/layout/Sidebar.tsx`
- `app/src/web/components/layout/Sidebar.css`
- `app/src/web/components/chat/ChatView.tsx`
- `app/src/web/components/chat/ChatView.css`
- `app/src/web/components/icons.tsx`
- `app/src/web/styles/tokens.css`
- `app/tests/chat-view.test.tsx`

### Change Log

- 2026-06-25: Story 1.1 implemented — Bun/Hono/React app scaffold, default Chat route, canonical Sidebar, Chat view empty-state shell, design tokens, smoke test. All tasks complete, all tests passing.
- 2026-06-25: Senior Developer Review follow-ups #1 and #3 resolved (see below) — Sidebar nav pills changed to `<button disabled>`, ESLint + Prettier added to `app/`. Follow-up #2 deferred to Story 1.4 by design (logged, not fixed).

## Senior Developer Review (AI)

**Reviewers:** John (PM), Sally (UX), Winston (Architect), Murat (Test Architect) — roundtable review, not a single-agent pass.
**Date:** 2026-06-25
**Outcome:** Approved, with 3 non-blocking follow-ups (2 resolved same-day, 1 deferred by design)

### Findings

1. **[Low][Sally]** Sidebar nav pills (`Watchlist`/`Search`) were `<span>` elements — not keyboard-focusable, not announced as interactive to screen readers, despite being visually identical to a future clickable pill. Risk: nobody remembers to fix this once Epic 2/3 wires real navigation onto them.
2. **[Low][Murat]** AC 2 ("prior chat history → still opens to Chat") has no executable test exercising actual history/session state, because no persistence exists yet in this story — the smoke test only confirms the index route unconditionally renders `ChatRoute` with no branching. Accepted as a known gap, not a defect: there is no code path to test against yet.
3. **[Low][Winston]** No ESLint/Prettier tooling existed in `app/`. Not a defect in this story's code, but a gap worth closing before Story 1.2 adds significantly more code surface.

### Action Items

- [x] [AI-Review][Low] Change Sidebar nav pills from `<span>` to `<button type="button" disabled>` (Sally, #1) — `src/web/components/layout/Sidebar.tsx`, `Sidebar.css` updated; reverified visually via Playwright, layout unaffected by Prettier's reformatting.
- [ ] [AI-Review][Low] Re-verify AC 2 with a real test once chat history persistence lands (Murat, #2) — tracked for Story 1.4 (MAR-118), not this story.
- [x] [AI-Review][Low] Add ESLint (flat config, typescript-eslint + react-hooks + react-refresh) and Prettier to `app/` (Winston, #3) — `eslint.config.js`, `.prettierrc.json`, `lint`/`format` scripts added; `eslint .` and `prettier --check .` both clean.
