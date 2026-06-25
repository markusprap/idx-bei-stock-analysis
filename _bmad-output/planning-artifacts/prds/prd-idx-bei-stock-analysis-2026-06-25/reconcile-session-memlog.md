---
title: Input Reconciliation — Session Memlog vs PRD
input: .memlog.md (party-mode session, Sahamigo)
target: prd.md (prd-idx-bei-stock-analysis-2026-06-25)
date: 2026-06-25
---

# Reconciliation: Session Memlog → PRD

Method: each bullet (by line) in `.memlog.md` checked against the full PRD body (Vision, Glossary, Features/FRs, Non-Goals, MVP Scope, NFRs, Risk Register, Success Metrics, Adapt-In sections, Open Questions, Assumptions Index).

## Line-by-line coverage

### Line 5 — Product definition, golden rule, MVP-for-Markus-first, EOD-only, own scraper
**Covered.** §1 Vision, Glossary (Golden Rule, EOD), FR-3, NFR1.

### Line 6 — John's contradiction catch: metafire.metasora.com screenshots (Setup Score/Entry/SL/TP/REKOMENDASI) vs. Markus's clarification that it's inspiration for generative-UI data *presentation* only, not recommendation behavior
**GAP.** No reference to metafire.metasora.com, the screenshots, or this specific near-miss anywhere in the PRD (grep confirms zero hits for "metafire," "metasora," "REKOMENDASI," "Setup Score"). The *principle* that survived this moment (AI shows data, never concludes) is well-covered by FR-3 and Non-Goals — but the qualitative provenance of *why the data-presentation density/format looks the way it does* (i.e., "inspired by a recommendation-style dashboard, stripped of the recommendation") is lost. This matters because a future reader of the PRD alone would not know the generative-UI data density was explicitly benchmarked against a signal-selling competitor's UI and *intentionally* kept the data depth while removing the verdict — they'd only see "shows data, doesn't conclude," not the specific tension that was resolved.
**Severity:** Low-medium — doesn't change behavior, but loses design rationale / provenance that could resurface during UX or Architecture handoff when someone asks "why does Stock Detail look this dense?"

### Line 7 — UI shell (ChatGPT/Claude-style layout, sidebar composition, Search mimics Stockbit market page, 'Beli'→'Tanya AI' swap, MVP sidebar scope)
**Covered.** §10 Adapt-In: IA, FR-14, §6.1.

### Line 8 — Architecture decisions (Bun+Hono, React19+TanStack, Drizzle+Postgres, Neo4j self-hosted, OpenRouter/Sonnet 4.6 default, dropped Next.js+Vercel+FastAPI, Python scrapers decoupled via DB, Hetzner CX32 8GB)
**Intentionally deferred, not a gap.** PRD explicitly states implementation/architecture detail is "held in architecture, not this PRD" (NFR3) and references Postgres/Neo4j + Hetzner CX32 8GB only as much as needed for NFR3's cost-control framing. This is consistent with §0's stated scope (PRD doesn't duplicate architecture artifacts). Not flagging.

### Line 9 — Mary's business analysis (KSEI 22.97M investors / 54.69% under 30), competitor scan (FITStock/Invezgo/Pluang Aura AI all sell signals), Murat's OJK reframe (regulatory boundary, not just philosophy), five open items before "deal"
**Covered.** KSEI stat verbatim in §1 Vision. Competitor scan named explicitly in §1 Vision (same three competitors). OJK reframe is central to Vision §1, Glossary, NFR2, Risk R1. The "five open items" were themselves resolved per Line 10 and don't need separate tracking.

### Line 10 — Five resolved items: risk register w/ OJK as top entry; monetization tiers (Free 30 chat/3 watchlist/basic; Pro 300 chat/25 watchlist/deeper data incl. ownership graph + peer comparison; price range Rp49k-99k vs. Stockbit Pro Rp250k/ChatGPT Go Rp75k); MVP success metrics (3-4 weeks organic use, ≥1 weekly insight, zero golden-rule violations, manual journal tracking); design reference doc path; "deal" declared
**Covered, with one numeric nuance to flag.** Risk register R1 matches. Tiers match FR-18 exactly (30/3/basic, 300/25/deeper-incl-ownership-graph-and-peer-comparison). Price comparables match §12 (Rp250k Stockbit Pro, Rp75k ChatGPT Go) and Rp49k-99k range matches FR-18/§13. Success metrics match SM-1/SM-2/SM-3 and manual-journal tracking note (§9). Design reference doc path (`docs/design-references/sahamigo-design-reference.md`) matches §11. No gap.

### Line 11 — DesignSync prototype: 4 screens (Chat, Search/IHSG, Stock Detail BBCA, Watchlist), specific UI details (progressive-disclosure "Selengkapnya" links, annual-only tables, sparkline+company-name in Watchlist rows, quota banner), and three caught/fixed issues during build:
  (a) **emoji-as-nav-icons flagged as "AI-slop" → replaced with thin-stroke SVG line icons**
  (b) **inconsistent sidebar across screens → unified to one canonical sidebar**
  (c) **initial density mismatch → resolved via Sally's progressive-disclosure compromise** (tighter spacing + curated previews with "lihat semua," not full Stockbit-level density, because audience is beginners not power traders)

**Partially covered — one clear gap (c), two covered (a, b):**

- **(a) Covered.** "No emoji as UI iconography — thin-stroke SVG line icons only" appears verbatim in §11.
- **(b) Covered.** §10 explicitly notes "Sidebar is identical across all four screens except which nav pill is active (a known consistency bug was caught and fixed during prototyping...)" with a pointer back to the memlog.
- **(c) GAP — the progressive-disclosure / density compromise is missing.** The memlog records a specific, deliberate UX decision: curated/tighter-spaced previews with "lihat semua" (see more) links rather than Stockbit's full information density, justified by audience (beginners, not power traders). This is exactly the kind of "qualitative UX nuance" a feature-requirement structure tends to drop. FR-6 through FR-10 (Search & IHSG features) describe *what* data is shown (IHSG summary, search, trending/movers, sector performance, news) but say nothing about *how* it should be presented — no mention of progressive disclosure, curated previews, "Selengkapnya"/"lihat semua" pattern, or the explicit beginner-vs-power-trader density rationale. §10 (Adapt-In: IA) and §11 (Adapt-In: Aesthetic/Tone) also don't mention it. This is a real gap: a developer or UX designer reading only the PRD would not know that Search/IHSG and Stock Detail should default to compact, progressively-disclosed views rather than dense Stockbit-style tables — they'd have to discover this only by independently reading the memlog or the prototype.
**Severity:** Medium — this is a concrete interaction-design decision (not just a stylistic preference) that directly affects how FR-6–FR-10 and FR-12 should be implemented, and it has an explicit audience-fit rationale ("beginners not power traders") that reinforces the product's whole "tutor not signal-seller" thesis. Worth a line in §10 or §11, or a new FR/NFR-adjacent note under Search & IHSG.

- The DesignSync project metadata (claude.ai/design project name "Sahamigo UI Prototype," projectId `fdbab7aa-8c08-43e9-aeee-430595d2991a`) is not referenced in the PRD. **Not flagging as a gap** — this is implementation/tooling provenance, not a product decision, and has no bearing on requirements.
- BBCA as the specific Stock Detail prototype example is reused in the PRD's UJ-1 example narrative ("Bang Markus checks BBCA's fair value...") and FR-13 — consistent, not contradictory.

## Contradictions found
None. Every fact that does appear in the PRD is consistent with the memlog (KSEI stats, competitor list, tier/quota numbers, price comparables, golden rule framing, OJK rationale, design language, sidebar scope, EOD-only data, annual-only granularity).

## Items correctly NOT flagged (legitimately out of scope per PRD's own sections)
- Full architecture stack (Bun+Hono, React/TanStack, Drizzle, Neo4j hosting, OpenRouter model choice) — deferred to architecture artifact per §0 and NFR3.
- DesignSync tooling/project IDs — implementation provenance, not a requirement.
- Scale-phase (Tn) infra — explicitly TBD per §6.2 and Open Question 3.

## Summary of gaps to address

| # | Gap | Memlog source | Where it should land in PRD | Severity |
|---|---|---|---|---|
| 1 | metafire.metasora.com reference-screenshot moment and the "inspiration for data presentation, not recommendation behavior" distinction is unrecorded | Line 6 | Could be a short note in §1 Vision or a footnote near FR-3 explaining the design-inspiration provenance | Low-medium |
| 2 | Progressive-disclosure / curated-preview density pattern ("Selengkapnya"/"lihat semua," tighter spacing, beginner-vs-power-trader rationale) absent from Search & IHSG (FR-6–FR-10) and Adapt-In IA/Aesthetic sections | Line 11(c) | §10 Adapt-In: IA, and/or a new consequence under FR-8/FR-9/FR-10, and/or §11 | Medium |

No other substantive gaps found. All quantitative facts (KSEI 22.97M/54.69%, tier quotas 30/300, watchlist caps 3/25, price range Rp49k-99k, comparables Rp250k/Rp75k, VPS spec) reconcile cleanly between memlog and PRD.
