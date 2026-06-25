# Reconciliation: PRD vs. Blueprint Bertingkat (T0→Tn)

**Input compared:**
- PRD: `_bmad-output/planning-artifacts/prds/prd-idx-bei-stock-analysis-2026-06-25/prd.md`
- Blueprint: `docs/business/blueprint-bertingkat.md`

## 1. T0 → T1 trigger (MVP success metrics)

Blueprint, verbatim (3 conditions, framed explicitly as "= metrik sukses MVP yang sudah dikunci"):
1. Usage organik 3-4 minggu beruntun
2. Minimal 1 insight konkret per minggu
3. Nol pelanggaran golden-rule (AI tidak pernah menyimpulkan buy/sell/hold)

PRD §9 Success Metrics:
- SM-1: organic usage 3-4 consecutive weeks — matches condition 1.
- SM-2: concrete weekly insight — matches condition 2.
- SM-3: zero Golden Rule violations — matches condition 3, but demoted from a primary trigger condition to "Secondary."

**Finding:** All three trigger conditions are present and substantively accurate — no dropped condition, no contradiction. One fidelity nuance: the blueprint treats all three as equally load-bearing (a single AND-gated trigger; none is optional), but the PRD's Primary/Secondary split implies SM-3 is less important than SM-1/SM-2. That's a framing risk, not a content gap — flag for PM awareness, not a hard error.

## 2. T1 → T2 trigger (beta retention + referral)

Blueprint, verbatim (3 conditions):
1. Mayoritas member beta kembali memakai produk mingguan selama ≥2 minggu berturut (majority of beta members return weekly for ≥2 consecutive weeks)
2. Nol pelanggaran golden-rule
3. Minimal 1 referral organik (orang di luar grup awal yang dengar dari mulut ke mulut) — bukti produk *worth* dibawa publik, bukan sekadar sopan-sopan teman

**Finding — GAP:** The PRD never restates any of these three T1→T2 conditions anywhere. It only references the blueprint by pointer, three times:
- §1 (Vision): "Public freemium (T1→T2) only happens after T0 proves itself on its own terms — see `blueprint-bertingkat.md` for the exact triggers."
- §6.2 (Out of Scope): "Public acquisition channels — deferred to just before T1 per `blueprint-bertingkat.md`."
- §13 Open Question #2: "T1 beta group size and invite mechanism — depends on the Channels decision, explicitly deferred until just before T1."

None of these mention the retention bar (≥2 consecutive weeks majority-weekly return), the repeated golden-rule-zero condition, or — most notably — the **organic referral signal**, which the blueprint calls out as the qualitative proof bar ("bukti produk worth dibawa publik, bukan sekadar sopan-sopan teman"). This is the most specific, hardest-to-satisfy, and most distinctive of the three T1→T2 conditions, and it is completely absent from the PRD — not paraphrased loosely, just dropped entirely. A downstream reader of the PRD alone (without re-opening the blueprint) would not know T1→T2 requires a referral signal, not just retention.

**Severity:** Medium-high. The PRD's own stated scope (§0) is "T0→Tn staged rollout with measurable triggers" as a thing it "builds on, and does not duplicate" — so omission is arguably intentional per the PRD's own non-duplication policy. But because Open Questions §13.2 and Out-of-Scope §6.2 both *gesture at* T1 without stating the actual trigger, a reader could mistake "beta group size is undecided" for "the T1→T2 trigger is undecided" — it is not; the blueprint already locks the trigger condition, only group size/invite mechanism is open. The PRD doesn't make this distinction clear.

## 3. T2 and Tn

Blueprint:
- T2: "Billing Pro aktif. Channels diputuskan dan dijalankan mulai tier ini." (Billing activates; channels decided and run starting this tier.)
- Tn: "TBD — evaluasi ulang setelah T2 stabil, tergantung keputusan funding vs bootstrap yang belum dibahas."

PRD:
- §12 (Monetization) correctly notes "T0→T2 triggers, including when billing actually activates" — consistent with T2 = billing activation, no contradiction.
- §6.2 and §13.3 correctly flag Tn as TBD pending funding-vs-bootstrap, matching blueprint almost verbatim.

**Finding:** No gap here — T2/Tn treatment is accurate.

## 4. MVP Scope section (§6)

- §6.1 In-Scope items map cleanly to T0 functional surface; no blueprint contradiction.
- §6.2 Out-of-Scope: "Public acquisition channels — deferred to just before T1" is *roughly* right directionally (blueprint says Channels decision happens "begitu T0 lolos" / once T0 passes, at T1 kickoff, not literally "just before T1" in the sense of pre-T1) — minor wording drift, not a contradiction, but worth tightening: the blueprint's actual phrasing is that channels are decided once you invite the beta group (start of T1), not in a "just before T1" gap state. Low severity.

## 5. Open Questions section (§13)

Compares against what the blueprint leaves genuinely undecided:
- Blueprint explicitly undecided: T1 invite size/mechanism (pending Channels decision in lean-canvas.md), and Tn funding-vs-bootstrap.
- PRD §13.2 and §13.3 capture both correctly.

**Gap:** Open Questions does not surface a question that arguably should exist: *"Is the T1→T2 referral condition something the team can actively instrument/detect (e.g., via a referral code or self-report), or is it purely anecdotal ('we heard about it')?"* The blueprint's phrasing implies a qualitative/anecdotal signal, which has measurement ambiguity the PRD doesn't flag anywhere — not even as an assumption. This compounds gap #2: because the trigger condition itself is absent from the PRD, the team also has no recorded open question about how it would be measured.

## Summary of Gaps

| # | Gap | Severity |
|---|---|---|
| 1 | T1→T2 trigger conditions (weekly retention ≥2wk, zero golden-rule, **organic referral**) are never restated in the PRD — only referenced by pointer; the referral condition specifically is dropped with no trace | Medium-High |
| 2 | PRD's Primary/Secondary split for SM-1/SM-2 vs SM-3 implies golden-rule-zero is less critical than the blueprint's flat AND-gated framing suggests | Low-Medium |
| 3 | §6.2 "deferred to just before T1" slightly mischaracterizes blueprint's timing (Channels decided at T1 kickoff, not in a pre-T1 gap) | Low |
| 4 | No open question recorded about how the T1→T2 referral signal would be measured/instrumented, despite it being the most qualitative of the three T1→T2 conditions | Low-Medium |

No outright contradictions were found — all gaps are omissions or framing drift, not factual conflicts with the blueprint.
