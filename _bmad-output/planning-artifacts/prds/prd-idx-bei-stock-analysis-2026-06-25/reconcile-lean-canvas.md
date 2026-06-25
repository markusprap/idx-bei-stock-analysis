# Reconciliation: Lean Canvas → PRD

**Source input:** `docs/business/lean-canvas.md` (Sahamigo Lean Canvas)
**Target:** `_bmad-output/planning-artifacts/prds/prd-idx-bei-stock-analysis-2026-06-25/prd.md`

## Block-by-block check

| Lean Canvas Block | Status | Evidence in PRD |
|---|---|---|
| Problem | ✅ Covered | PRD §1 Vision — same competitor list (Stockbit, FITStock, Invezgo, Pluang Aura AI), same "teach reading data, not give signals" framing. |
| Customer Segments | ✅ Covered | PRD §1, §2 — same KSEI stat (22.97M investors, 54.69% under-30), MVP = Bang Markus only (n=1), public freemium deferred to T1/T2. |
| UVP | ✅ Covered | PRD §1 Vision + §3 Glossary "Golden Rule" — "never concludes buy/sell/hold... reflects decision back as a question" matches canvas UVP almost verbatim. |
| Solution | ✅ Covered | PRD §4 Features: Chat (4.1), Search/IHSG (4.2), Stock Detail (4.3), Watchlist (4.4); NFR1 confirms Postgres/Neo4j as the only data source. Minor: PRD never names "OpenRouter" or "Sonnet 4.6" explicitly in the body (FR-2 just says "the AI") — these are implementation details correctly deferred to architecture, not a contradiction. |
| Unfair Advantage | ✅ Covered | (1) Own scraper/pipeline → NFR1. (2) OJK regulatory white space → §1, NFR2, Risk R1. (3) Founder-as-target-user → §1 ("MVP scoped for one user: Bang Markus"), UJ-1 persona framing. All three sub-points present. |
| Revenue Streams | ✅ Covered | FR-18 — Free: 30 chat/mo, 3 Watchlist; Pro: 300 chat/mo, 25 Watchlist, Rp49k–99k/mo — exact match to canvas figures. "Hard-capped, not unlimited" reiterated in §4.5 intro and FR-19/NFR3. |
| Cost Structure | ⚠️ Partially covered | LLM token cost → NFR3, Risk R2. Hetzner CX32 VPS → NFR3 (explicitly named, even with added "8GB" detail). **Gap:** "maintenance scraper" as a cost line item is not mentioned anywhere in the PRD — the scraper is referenced only as a data source (NFR1), never as an ongoing cost/maintenance burden. Minor omission, not a contradiction. |
| Key Metrics | ✅ Covered | §9 Success Metrics — SM-1 (3-4 consecutive weeks organic usage) = canvas's "usage organik 3-4 minggu beruntun"; SM-2 (≥1 concrete insight/week) = canvas's "≥1 insight konkret/minggu"; SM-3 (zero Golden Rule violations) = canvas's "nol pelanggaran golden-rule." Full 1:1 match. |
| Channels | ✅ Correctly deferred (expected) | Canvas marks this **Pending** until pre-T1. PRD §6.2 ("Public acquisition channels — deferred to just before T1") and §13 Open Question #2 ("T1 beta group size and invite mechanism — depends on the Channels decision") mirror this deferral. Not a gap — consistent with the canvas's own stated status. |

## Findings

**Gaps found:**
1. **Cost Structure — scraper maintenance not carried forward.** The canvas lists "maintenance scraper" as a cost-structure line item alongside LLM tokens and VPS hosting. The PRD's NFR3/Risk R2 cover LLM cost and infra (VPS) cost explicitly, but ongoing scraper maintenance effort/cost is never mentioned as a cost concern anywhere in the PRD body — it only appears implicitly as a data-source dependency (NFR1). This is a minor omission (a cost-structure detail that didn't make it into the NFRs/Risk Register), not a contradiction.

**No contradictions found.** Every other block (Problem, Customer Segments, UVP, Solution, Unfair Advantage, Revenue Streams, Key Metrics) is faithfully and consistently reflected in the PRD, often with verbatim figures (KSEI stats, tier quotas, pricing range, success-metric thresholds). Channels' "pending" status is consistently carried through as an open/deferred item, exactly as expected per the canvas's own framing.

## Conclusion

The PRD is a faithful downstream reflection of the Lean Canvas. Only one minor, low-severity gap was identified (scraper maintenance cost not explicitly named in NFRs/Risk Register). No actual contradictions exist between the two documents.
