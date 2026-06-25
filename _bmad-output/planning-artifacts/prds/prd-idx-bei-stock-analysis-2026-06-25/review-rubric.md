# PRD Quality Review — Sahamigo (idx-bei-stock-analysis)

## Overall verdict

This is an unusually disciplined PRD: it has a real thesis (refuse the buy/sell-signal shape that every competitor converges on), the thesis drives scope and the risk register, and omissions are tagged rather than buried. The main risk is in Done-ness clarity — eight of twenty FRs (FR-6–FR-10, FR-15, FR-16, FR-18, FR-20) carry no testable consequence, which matters because this PRD explicitly feeds downstream story creation. Mechanically the document is clean: IDs are contiguous, cross-references resolve, and the Assumptions Index round-trips correctly.

## Decision-readiness — strong

The PRD states real decisions rather than hedging them. §1 names the regulatory boundary as a hard constraint ("giving buy/sell advice in Indonesia requires an OJK investment-advisor license Sahamigo does not have and does not intend to acquire"), not a soft preference. §6.1 states a real trade-off and defends it explicitly: tier/quota mechanics are built for T0 even though T0 has exactly one user, "so they don't need to be retrofitted before T1" — that's a stated cost (build now, one user benefits) with a named reason, not smoothed-over busywork. §13 Open Questions are genuinely unresolved — e.g. OQ2 admits the Channels decision "hasn't been made yet" rather than answering its own question in the next sentence. The `[NOTE FOR PM]` at §6.2 sits at a real deferred tension (nav scope beyond Watchlist/Search) rather than a safe checkpoint.

No findings — this dimension does what it should.

## Substance over theater — strong

- Only two UJs, both load-bearing (§2.3) — no persona padding. There is no separate "Personas" section at all; the PRD uses JTBD (§2.1) instead, which fits a single-named-user T0 product better than fabricated personas would.
- Vision (§1) is specific, not swappable: it names four real competitors (Stockbit, FITStock, Invezgo, Pluang Aura AI), cites a dated market stat (KSEI, 22.97M investors, Feb 2026, 54.69% under 30), and ties the product's refusal-to-conclude directly to a licensing fact. This could not be pasted into another fintech PRD unchanged.
- NFRs have product-specific thresholds, not boilerplate: NFR3 names an actual VPS spec ("Hetzner CX32, 8GB"); FR-19/NFR3 name concrete quota numbers (30/300 messages per month) rather than "the system must be scalable."

No findings — this dimension does what it should.

## Strategic coherence — strong

The thesis is explicit and named once and reused: "teach me to decide" vs. competitors who "sell the decision itself" (§1). Feature prioritization follows from it — Chat is feature 4.1 and the default view (FR-1), Watchlist is explicitly framed as a re-check loop rather than a portfolio tracker, and Search/IHSG is deliberately under-built relative to Stockbit ("a deliberate progressive-disclosure compromise," §4.2) because the audience is "beginners learning to read data, not power traders." SM-1/SM-2 measure understanding and habit, not raw activity, and SM-C1 explicitly counterbalances the obvious vanity metric (message volume) by naming the exact way it could undermine the thesis (pressure toward "actionable"-sounding language). MVP scope kind is coherent: this is a problem-solving / identity-driven MVP, and the scope logic (defer nav surfaces, defer quarterly data, defer Tn infra) matches that, not "what's easy first."

No findings — this dimension does what it should.

### Findings
- **low** DAU/MAU-style metric absent by design, but worth confirming it stays that way (§9) — SM-1/SM-2 are journal-based and manual; there is no quantitative usage metric backing them up even directionally. For a one-user T0 this is fine and explicitly justified ("no in-app analytics feature is in scope yet"), but if T1 reuses this same metric design at beta scale (multiple users, no automated tracking) it would strain. *Fix:* none needed now — §9's T1→T2 trigger already flags the referral-measurement gap as Open Question 5; consider adding a parallel note that SM-1/SM-2 measurement method itself needs revisiting before T1, not just the referral signal.

## Done-ness clarity — thin

This is the dimension the rubric asks to be unforgiving on, and the PRD is inconsistent here. Where FRs do have a "Consequences (testable)" subsection (FR-1, FR-2, FR-3, FR-4, FR-5, FR-11, FR-13, FR-14, FR-17, FR-19), the bar is genuinely high — e.g. FR-3's consequence ("No AI response contains directive language equivalent to 'buy,' 'sell,' 'hold'...") is concrete enough to write a test against. But eight FRs have no consequence statement at all: FR-6 (IHSG summary), FR-7 (ticker search), FR-8 (trending/movers), FR-9 (sector performance), FR-10 (market news), FR-15 (Add to Watchlist), FR-16 (Watchlist row content), FR-18 (tier definitions), and FR-20 (upgrade prompt at limit). Several of these are simple enough that "done" is arguably implied (FR-7: search either returns the matching ticker or it doesn't), but others are not — FR-16 lists four distinct UI elements (ticker, company name, price+change, sparkline) with no stated bound on what "current price + change" means in an EOD-only product (current vs. EOD-as-of-when? compared to what baseline — previous close?), and FR-18's tier table has numbers but no consequence tying the numbers to an enforceable boundary (that enforcement lives in FR-19/FR-20 instead, which is fine, but FR-18 itself reads as a spec table, not a requirement with a check).

### Findings
- **high** FR-6 through FR-10 have no testable consequences (§4.2, lines covering FR-6–FR-10) — five consecutive FRs ("Shows current IHSG index price and chart," "User can search stocks by ticker or company name," etc.) are stated as capabilities with no verifiable condition attached. Compare to FR-11 two lines later, which does have one. Downstream story creation will have to invent acceptance criteria from scratch for this entire feature group. *Fix:* add at minimum one consequence per FR — e.g. FR-8 could state a concrete list composition rule (top N by which metric, refreshed how often) the way FR-13 states "(Tahunan)" labeling.
- **medium** FR-16 "current price + change" is undefined in an EOD-only product (§4.4) — the product's identity hinges on EOD-only data (Glossary, NFR1, Risk R3), yet FR-16 uses "current price" without clarifying it means "EOD close" and without specifying what "change" is measured against (previous EOD close, presumably, but not stated). This is exactly the kind of adjective-without-bound the rubric flags, and it sits adjacent to a feature (Watchlist) the PRD otherwise treats carefully. *Fix:* restate as "most recent EOD close + change vs. prior EOD close," consistent with NFR1's EOD-only sourcing.
- **medium** FR-18 and FR-20 lack consequences (§4.5) — FR-18 defines tier numbers but no testable statement (the closest is FR-19's consequence, which covers quota timing, not tier gating itself); FR-20 ("user sees an inline upgrade-to-Pro prompt") has no condition for what counts as "at limit" being correctly triggered, unlike FR-17's analogous Watchlist-cap consequence two sections earlier. *Fix:* give FR-20 a consequence mirroring FR-17's pattern: "A Free user sending their 30th chat message in a calendar month sees the upgrade prompt on their next attempt."

## Scope honesty — strong

§5 Non-Goals does real work — each bullet closes a door a reader would otherwise wonder about (realtime data, brokerage execution, trading signals, expanding beyond IDX/BEI, pursuing an OJK license), and R1's mitigation ties directly back to the last one. `[ASSUMPTION: ...]` tags appear inline at genuine inference points (chat language in §4.1, context-handoff mechanism in FR-5, Watchlist-full UI behavior in FR-17) and all three round-trip into §14's Assumptions Index with matching language — no drift. `[NOTE FOR PM]` in §6.2 sits at a real deferred decision (nav scope), not a safe checkpoint. Open-items density (3 assumptions + 5 open questions + 1 NOTE FOR PM = 9 callouts) is proportionate for a single-user T0 PRD that is not yet a green-light-to-build-at-scale document — appropriate, not alarming.

No findings — this dimension does what it should.

## Downstream usability — adequate

Glossary (§3) is comprehensive and terms are used consistently elsewhere in the document — "EOD," "Watchlist," "Tier," "Quota," "Golden Rule," and "DoD" all reappear in FRs/NFRs/Risks with matching capitalization and meaning. ID continuity is clean: FR-1 through FR-20 are contiguous with no gaps or duplicates; NFR1–NFR3, R1–R4, and SM-1/SM-2/SM-3/SM-C1 are likewise contiguous and every cross-reference checked (NFR1→FR-11, NFR2→FR-3/R1, NFR3→FR-19, R1→FR-3/NFR2, R2→FR-19, R3→FR-11/NFR1, R4→FR-13, SM-1→FR-1/2/3, SM-2→FR-2/12, SM-3→FR-3/NFR2) resolves to a real section. The one soft spot: UJ-1 and UJ-2 are both attributed to "Realizes UJ-1, UJ-2" tags scattered across nearly every feature (4.1, 4.2, 4.3, 4.4 description lines) — functionally accurate, but with only two UJs covering five feature groups, the tagging is closer to "this exists in the same product" than a meaningful per-feature traceability signal. That's a minor downstream-extraction friction, not a defect.

### Findings
- **low** UJ traceability tags are present everywhere but thin signal (throughout §4) — nearly every feature section claims to realize UJ-1 and/or UJ-2 ("Chat" §4.1, "Search & IHSG" §4.2, "Stock Detail" §4.3, "Watchlist" §4.4), since the PRD only defines two journeys covering the entire T0 surface. Downstream readers using these tags to scope a feature against a journey will get a near-blanket match every time. *Fix:* none required given only two UJs exist by design (stated explicitly at end of §2.3: "feature surface is intentionally simple for T0") — flagged only so a future PRD revision with more journeys doesn't inherit the same blanket-tagging habit.

## Shape fit — strong

This is a single-operator T0 product (one named user, Bang Markus) that nonetheless has real UX surfaces (Chat, Search, Stock Detail, Watchlist) — the PRD correctly keeps light-but-real UJs (2, not 4+) rather than over-formalizing with personas, and correctly keeps a capability-spec backbone (Features → FRs) as the primary structure rather than forcing a UJ-per-feature shape. The regulatory dimension (OJK licensing) gets genuine constraint traceability — NFR2, R1, the Golden Rule glossary entry, and FR-3 all connect — appropriate weight for a constraint that is "both the product's identity and its compliance boundary" (§1). The brownfield angle is also handled honestly: §10 references a "known consistency bug... caught and fixed during prototyping" with a pointer to prototype build notes, distinguishing prototype-stage decisions from this PRD's own claims.

No findings — this dimension does what it should.

## Mechanical notes

- **Glossary drift**: none found. "EOD," "Watchlist," "Tier," "Quota," "Golden Rule," "DoD," "OJK" are each defined once in §3 and used identically (case and meaning) everywhere they reappear (NFRs, Risk Register, FRs).
- **ID continuity**: FR-1→FR-20 contiguous, no gaps/duplicates. NFR1–3, R1–4, SM-1/2/3/C1 likewise contiguous. All cross-references checked resolve to real sections (verified by grep against the document — no dangling "see FR-X" or "Realizes UJ-X" pointing to a non-existent ID).
- **Assumptions Index roundtrip**: clean. All three inline `[ASSUMPTION: ...]` tags (§4.1 chat language, FR-5 context-handoff mechanism, FR-17 Watchlist-full UI) appear in §14's index with matching content; no index entries lack an inline counterpart.
- **UJ protagonist naming**: both UJ-1 and UJ-2 (§2.3) name "Bang Markus" explicitly as protagonist with inline context ("the product's own first user," "same user, different entry condition") — no floating UJs.
- **Required sections for stakes/type**: present. Given this is a launch-track (not throwaway) PRD for a regulated-adjacent consumer-facing product feeding downstream UX/Architecture/Stories work (§0), the document correctly includes Glossary, Non-Goals, Risk Register, Success Metrics with counter-metrics, and an Assumptions Index — nothing expected for this stakes level is missing.
