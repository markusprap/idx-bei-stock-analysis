---
reviewer: Sally (UX Designer)
review-type: ad-hoc UX/IA consistency check
reviewed-doc: prd.md
date: 2026-06-25
---

# Sally's Review — Sahamigo PRD (UX/IA Consistency)

Okay, I built the clickable prototype for this thing across however many rounds it took, so I'm reading §10 and §11 less like a reviewer and more like — "did anyone actually write down what we shipped, or did they write down what they remember shipping?" Those are different documents. Let's see which one this is.

I also pulled the original session memlog (`.memlog.md`) and the prototype's own build notes to cross-check, since that's the actual ground truth for what got decided, not my memory of it five rounds later.

## Verdict

**Mostly faithful, but thinner than the prototype in two places that matter, and silent on the one question that actually protects the Golden Rule visually.** Nothing here is wrong, exactly — it's just under-specified in spots where "under-specified" is exactly how a Golden Rule violation sneaks in through the UI instead of the copy. I'd pass this with revisions, not block it, but I want the gaps below logged before this goes to Architecture, because once Winston starts laying out components against §10 as if it's complete, the gaps become load-bearing.

---

## 1. Does §10/§11 capture what we actually decided?

**§10 (Information Architecture) — mostly yes, with one real omission.**

What's there is accurate:
- Sidebar composition matches what we converged on: logo+tagline, "+ Chat Baru," Watchlist/Search nav pills, "Riwayat" history, profile/tier footer. ✓ matches memlog exactly.
- The sidebar-consistency bug callout ("a known consistency bug was caught and fixed during prototyping") — good, I'm glad that's preserved as institutional memory instead of getting lost. That bug was annoying and worth remembering why the rule exists.
- Stock Detail and Search/IHSG summaries are accurate at the level of "what sections exist."

**What's missing:** §10 doesn't carry forward the progressive-disclosure pattern as an IA decision. It only shows up in §4.2's feature *description* ("Selengkapnya"/"lihat semua" expansion links... a deliberate progressive-disclosure compromise"). But §10 is supposed to be the IA section — and progressive disclosure isn't just a Search/IHSG copy detail, it's a structural decision about information density that should apply as a *pattern*, not a one-screen footnote. If someone builds Stock Detail's fundamental/valuation/profitability tabs without knowing progressive disclosure was the resolved compromise (vs. full Stockbit-density tables), they might over-build density there too, since FR-12 doesn't repeat the constraint. **This is the same compromise that resolved our "density mismatch" build note — it deserves to live in §10, not just buried in one feature's description.**

**§10 also doesn't mention Watchlist row layout at all** — it stops at "quota banner + capped list of tracked tickers." No mention of sparkline, no mention of company-name display. That detail only shows up in FR-16, which I'll get to in §2 below, because it's actually under-specified *there* too.

**§11 (Aesthetic and Tone) — accurate but incomplete relative to what we actually fixed.**

The cream/sage-teal/serif-heading/no-emoji summary is correct and matches `sahamigo-design-reference.md` faithfully — good, that doc and this section agree with each other, no drift there.

But §11 presents "no emoji as UI iconography — thin-stroke SVG line icons only" as if it were always the plan. It wasn't — it was a **correction**, caught mid-build when Markus flagged emoji nav icons as "AI-slop." That's not just trivia: the *reason* it's a rule (a real failure mode someone shipped and caught) is more durable guidance for whoever builds this next than the rule stated as a bare style preference. As written, a future contributor could reintroduce an emoji somewhere § 11 doesn't explicitly cover (e.g., an empty-state illustration, a toast notification icon) because they don't know *why* the rule exists, only that nav icons specifically should be SVG. I'd tighten this to "no emoji anywhere in UI iconography (corrected from an early build pass that used emoji as nav icons and read as AI-generated/generic — see design reference)."

---

## 2. FR ambiguities that will bite during implementation

**FR-16 (Watchlist row content) — yes, this one's real.**

> "Each row shows ticker, full company name, current price + change, and a mini sparkline trend chart."

This is a *list* of elements with zero layout guidance. Compare to the prototype build note, which was specific: *"sparkline charts + company full name under ticker."* That's a layout decision — company name sits subordinate to ticker, not beside it, not above it. FR-16 as written doesn't tell whoever builds this screen that the ticker is the primary label and the company name is secondary/smaller text underneath it. Without that, I'd bet money someone builds it as a table row (ticker | name | price | sparkline, all equal visual weight) instead of the card-style hierarchy we actually designed and clicked through. That's not a nitpick — Watchlist is a tier-monetization surface (FR-17 quota banner lives right next to it), and visual hierarchy there affects how "premium" or "cluttered" it feels at the exact moment we're trying to upsell. I'd add a line to FR-16's Consequences: "Company name renders as secondary text beneath the ticker, not as a separate column" — or send it to me/Caravaggio to spec properly before dev picks it up.

**FR-5 (context handoff to Chat) — partially ambiguous, and the PRD knows it.**

To its credit, the PRD flags this with an inline assumption: *"seeding is done via a pre-filled context message, not a separate UI field — exact mechanism left to technical design."* Fair, that's an honest deferral. But there's a UX-specific sub-question that isn't deferred to technical design — it's a UX decision, not an engineering one, and it's currently nowhere:

- **Does the seeded context appear as a visible chip/pill ("Membahas: BBCA") that the user can see and dismiss, or is it an invisible system message the user just has to infer from the AI's first reply?**

This matters because of UJ-2's actual flow: user is browsing, taps "Tanya AI soal saham ini" on BBCA, lands in Chat. If there's no visible indicator that the chat now "knows" about BBCA, and the AI's first message doesn't immediately make that obvious, the user's first reaction is "wait, does it know what stock I meant?" — a trust-eroding hesitation at exactly the on-ramp moment we're trying to make frictionless. I built the prototype with BBCA's context implied through the AI's opening line referencing BBCA directly, no separate chip — but that was *my* call during prototyping, made on the fly, never ratified as a requirement. It should be ratified one way or the other before Architecture/dev treats FR-5 as fully specified, because "pre-filled context message" alone doesn't tell you whether that's user-visible.

**Also worth a line:** FR-5 says nothing about what happens if the user is *already* mid-conversation in an existing thread when they tap "Tanya AI soal saham ini" for a different ticker. Does it force a new thread, or inject into the current one? FR-4 implies "+ Chat Baru" is the only way to start fresh, so my read is FR-5 always forces a new thread — but that's an inference, not a stated consequence. Worth making explicit since it changes Riwayat's behavior (does a new "BBCA" thread silently appear in history every time someone taps the CTA from Stock Detail?).

---

## 3. Does anything protect the Golden Rule *visually*, not just textually?

**No — and this is the gap I'd push back hardest on.**

FR-3's Consequences are entirely about *language*: no directive words ("buy/sell/hold/enter/exit"), every valuation comparison ends with a question. That's the right floor for a DoD/QA check (NFR2, Risk R1) — Murat can grep for that, basically. But the Golden Rule is also a **visual/interaction design problem**, and the PRD is completely silent on it.

Here's the actual risk, and it's not hypothetical — it's *the exact thing Markus's own reference screenshots did wrong* (per memlog: metafire.metasora.com showed "Setup Score/Entry/SL/TP/'REKOMENDASI'" as inspiration for data presentation, explicitly *not* for the recommendation behavior). That contradiction got caught once already, in the data-presentation layer. Nothing in this PRD guarantees it doesn't resurface in the *chat UI* layer:

- If the AI's response renders fundamentals in a styled card with a big bolded number and a colored badge (green/red), that *reads* as a verdict regardless of what the text says underneath it. A PER comparison rendered like a "Setup Score" card is a Golden Rule violation in spirit even if FR-3's textual consequences pass.
- Nothing says how the closing reflective question should be visually distinguished from the data above it — is it part of the same chat bubble, italicized, in a distinct "for you to consider" callout? If it's not visually set apart, it reads as a throwaway sign-off line, not the actual point of the interaction (which, per the Vision section, *is* the point — "reflects the decision back as a question" is supposed to be the product's whole differentiator, not a tacked-on disclaimer).
- Button/CTA labels inside chat aren't addressed at all. Is there ever a button like "Compare to current price"? "See verdict"? Even a well-intentioned button label can smuggle in advice-shaped framing that the text itself avoids ("Should I buy?" as a suggested quick-reply chip would be a problem, for instance, if the AI's canned response to it implies anything close to "yes/no").

I'd flag this as a **DoD checklist gap, not just a PRD gap** — §3's Glossary says the DoD (owned by QA/Murat) "verifies a feature does not violate the Golden Rule before it ships," but if that checklist is scoped only to textual output (matching FR-3's stated Consequences), it will pass a chat UI that visually implies a verdict through layout, color, or button copy while the words stay clean. Someone needs to own "visual Golden Rule compliance" the same way FR-3 owns linguistic compliance — and right now nobody does, because §10/§11 don't address chat-bubble/card visual design at all, and FR-3 only covers text.

**My ask:** either (a) add a line to FR-3's Consequences extending the constraint to visual presentation ("no chat UI element — badge, color, button label, card styling — implies a verdict independent of the text"), or (b) explicitly hand this to UX spec work downstream with a named owner, so it doesn't fall through the crack between "PRD says text-only" and "DoD checks text-only."

---

## Summary Table

| # | Finding | Section | Severity |
|---|---|---|---|
| 1 | Progressive disclosure is a structural IA pattern, not a one-screen footnote — missing from §10 | §10 | Medium |
| 2 | Watchlist row layout/hierarchy (company name subordinate to ticker) missing from FR-16 | §4.4 FR-16 | Medium |
| 3 | No-emoji rule stated as preference, not as the corrected failure mode it actually was | §11 | Low |
| 4 | Context-handoff visibility (chip vs. invisible system message) unresolved in FR-5 | §4.1 FR-5 | Medium-High |
| 5 | FR-5 silent on existing-thread vs. new-thread behavior when CTA tapped mid-conversation | §4.1 FR-5 | Low-Medium |
| 6 | Golden Rule (FR-3) has zero visual/interaction-design teeth — only covers text, not layout/badges/buttons that could imply a verdict | §4.1 FR-3 | **High** |

Finding 6 is the one I'd lose sleep over. Everything else is a "tighten this before dev picks it up" note. That one's a "decide who owns this before Architecture locks in a chat-bubble component design that nobody checked against the actual rule the whole product is named after."

— Sally
