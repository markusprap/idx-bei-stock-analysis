# ADR-009: T0 Deployment Strategy — Single Big-Bang Deploy After Epic 3

- **Status:** Accepted
- **Date:** 2026-06-26
- **SUPERSEDES:** Nothing. ADR-001 (single-VPS architecture) defines *where* we deploy; this ADR defines *when* we deploy for T0.
- **CHANGED:** Clarifies that production deployment is not a per-story or per-epic gate during T0. The per-story Definition of Done does not include "deployed and verified on production."
- **UNCHANGED:** ADR-001's single-VPS/Dokploy target remains the deployment destination. The code must be production-ready at the code level at every story — this ADR only defers the act of deploying, not the discipline of writing deployable code.
- **REASON:** Party-mode roundtable (2026-06-26) surfaced an assumption mismatch. The team assumed "production-ready" meant incremental per-story deployment. Markus clarified: for T0 (single user, personal-use phase), all features from Epic 2 and Epic 3 will be completed first, then a single production deployment will be done once both epics are fully Done.

## Context

Epic 1 (Chat AI Tutor Core Loop) completed all 4 stories and PRs were merged to main. No production deployment to the Hetzner VPS has been done yet — the app has only ever run locally.

Epic 2 (Market Discovery & Stock Detail) and Epic 3 (Watchlist) cover the remaining core features of the T0 product. Markus's goal is to have the full product working end-to-end before deploying, so the first production session is the complete experience — not an iterative rollout.

At T0, Markus is the sole user. There is no external audience to serve incrementally, and there is no urgency to put a partial product in production before it is feature-complete for its intended use.

## Decision

1. **Single production deployment after Epic 3 is fully Done.** All Epic 2 and Epic 3 stories are completed, tested, and merged to main before any Dokploy deployment is executed.

2. **Per-story DoD does not include "deployed to production."** The DoD for every Epic 2 and Epic 3 story is: code correct, tests pass, Drizzle migrations ordered and clean, all configuration sourced from environment variables (no hardcoded local paths), Docker-compatible. The production deployment itself is deferred.

3. **Production deployment setup (Dokploy services, environment variables, Linux cron for Python scraper, Neo4j Docker container) is treated as a distinct step after Epic 3 — not spread across individual stories.** When the time comes, it will be done in one focused session covering: Dokploy project/service setup, env var configuration, migration run, scraper cron (`0 17 * * 1-5` WIB, post-market-close), smoke test end-to-end.

4. **Every story must still be production-deployable at code level.** "Deferred deployment" is not a license for local-only shortcuts. Config via env vars, migrations as proper Drizzle files, no `localhost` hardcodes, all required services referenced by env-var connection strings.

5. **Python scraper ETL scheduling** (Linux cron on VPS, daily at 17:00 WIB post-IDX-close for `index_summary`, `daily_trade_summary`, `market_news` — see ADR-008) is set up at the single deployment step, not per-story.

## Alternatives Rejected

- **Incremental per-story production deployment** — rejected by Markus. Adds friction per story (Dokploy deploy step, smoke test on production, cron verification) that is unnecessary when the sole T0 user is Markus himself. The risk of discovering integration issues late is accepted in exchange for simpler per-story workflow.
- **Deploy after Epic 2, then again after Epic 3** — not discussed explicitly, defaulting to "after Epic 3" per Markus's stated intent. If Epic 2 proves self-contained enough to demo independently, this can be revisited without a new ADR.

## Consequences

- The per-story DoD template for Epic 2 and Epic 3 omits "deployed and verified on production." Tests, migration correctness, and code-level production-readiness remain in DoD.
- Drizzle migrations must accumulate correctly across all Epic 2 and Epic 3 stories — no migration may assume a table that doesn't have its own migration file earlier in the sequence. This is a real risk with big-bang deployment and is a required discipline per story.
- At big-bang deploy time, the likely failure modes are: environment variable misconfiguration, migration ordering errors, Neo4j container RAM issues (flagged in ADR-001 — Hetzner CX32, 8GB, Neo4j + Postgres + app co-resident), and Cloudflare scraper dependencies. These are known risks, accepted for T0.
- When Epic 3 is complete, a dedicated "Epic 3 → Production" session will be run covering full Dokploy setup and verification. That session will produce a production verification log, not an ADR.
