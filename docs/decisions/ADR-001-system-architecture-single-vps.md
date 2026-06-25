# ADR-001: System Architecture — Single-VPS, Dokploy-Managed

- **Status:** Accepted
- **Date:** 2026-06-24

## Context

An earlier architecture direction considered a Next.js + Vercel + FastAPI split (multi-service, multi-vendor). Markus wanted one VPS box to manage, not a distributed setup, to keep operational complexity and cost low for a single-founder MVP.

## Decision

Bun + Hono backend (TypeScript), React 19 + TanStack Router/Query frontend (SPA), Drizzle ORM + Postgres, Neo4j self-hosted in Docker on the same box, LLM via OpenRouter (model-agnostic, default Claude Sonnet 4.6). Single VPS, Dokploy-managed, minimum Hetzner CX32 (8GB). This repo's existing Python scrapers stay separate, decoupled via the shared Postgres database — not coupled at runtime.

## Alternatives Rejected

- **Next.js + Vercel + FastAPI split** — rejected; multi-service/multi-vendor topology adds operational surface area Markus explicitly didn't want to manage solo.
- **Coupling the new app's runtime directly to the Python scraper process** — rejected; decoupling via the database lets either side evolve or fail independently, matching the scraper's existing role as a separate brownfield system.

## Consequences

`CLAUDE.md`'s Architecture section locks this; any deviation (splitting services, changing the DB) requires a new ADR, not a silent refactor. RAM headroom on an 8GB VPS running Postgres + Neo4j + the app together is a known watch-item, not yet stress-tested.
