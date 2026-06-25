import type { FinancialRatioRow } from "../db/schema";

const DIRECTIVE_VERB_PATTERN =
  /\b(beli|jual|tahan)(lah)?\b|\b(buy|sell|hold|take\s*profit)\b/i;
const HEDGED_ACCUMULATE_PATTERN = /akumulasi/i;
const STOP_LOSS_PATTERN = /cut[\s-]*loss|stop[\s-]*loss/i;
const PRE_EMPTIVE_VERDICT_PATTERN = /worth[\s-]*(di[\s-]*)?beli/i;
const ESCALATION_OFFER_PATTERN =
  /(bantu\s+(rangkum|buat|susun)kan.*rekomendasi)|(buatkan\s+rekomendasi)|(ingin.*rekomendasi\s*(sederhana)?\s*\(?\s*(beli|jual|tahan))/i;

/**
 * Fixed collocations where a directive-looking word is actually neutral —
 * "jual rugi" (panic-sell, as a description of OTHER investors' behavior,
 * not advice to the user) and "tahan ... emosi/diri" (emotional self-control,
 * not "hold the stock"). Stripped before pattern matching so these specific,
 * known-benign phrases don't trip the guard. This is a fixed-phrase
 * allowlist, not semantic understanding — adding a new entry here must stay
 * that narrow (see Dev Notes: anything requiring intent/meaning is T1 scope).
 */
const BENIGN_COLLOCATIONS = /\bjual\s+rugi\b|\btahan\b(?:\s+\w+){0,2}\s+(emosi|diri)\b/gi;

/**
 * Lexical backstop for FR-3 (Golden Rule). Catches the literal/near-literal
 * violation patterns from golden-rule-test-cases.md cases 1, 2, 4, 5, 8.
 * Deliberately does NOT attempt cases 3 (historical-pattern framing) or 6
 * (visual-only) — those have no lexical signature to match and are out of
 * scope for a regex guard per ADR-004 (no judge-model/implication layer at T0).
 *
 * Known, accepted limitation (per the Story 1.3 team review): a hedged
 * paraphrase that avoids every listed keyword (e.g. "pertimbangkan untuk
 * nambah posisi" instead of "akumulasi") will not be caught. Catching
 * arbitrary paraphrases requires understanding intent, not matching text —
 * that is explicitly T1 scope (ADR-004), not a bug to chase here. The
 * system prompt (Task 1) is the first line of defense against those; this
 * guard is the backstop for the literal/near-literal cases only.
 *
 * Deliberately biased toward false positives over false negatives: for a
 * hard regulatory constraint, replacing an occasional good answer with the
 * safe fallback (still data + a reflective question) is an accepted cost;
 * letting a real verdict through is not.
 */
export function containsGoldenRuleViolation(text: string): boolean {
  const sanitized = text.replace(BENIGN_COLLOCATIONS, "");

  return (
    DIRECTIVE_VERB_PATTERN.test(sanitized) ||
    HEDGED_ACCUMULATE_PATTERN.test(sanitized) ||
    STOP_LOSS_PATTERN.test(sanitized) ||
    PRE_EMPTIVE_VERDICT_PATTERN.test(sanitized) ||
    ESCALATION_OFFER_PATTERN.test(sanitized)
  );
}

const REFLECTIVE_QUESTION =
  "Menurut kamu, gimana data itu dibandingkan sama ekspektasi kamu sendiri?";

const NO_LICENSE_NOTE =
  "Sahamigo nggak menyimpulkan keputusan investasi seperti itu — itu butuh izin penasihat investasi yang nggak kami punya.";

/**
 * Returned instead of the LLM's text whenever containsGoldenRuleViolation()
 * trips, so the product promise (data + a reflective question) holds even
 * when the model drafted something unsafe.
 */
export function buildSafeFallbackReply(row: FinancialRatioRow | null): string {
  if (!row) {
    return [NO_LICENSE_NOTE, REFLECTIVE_QUESTION].join(" ");
  }

  const metrics = [
    row.per != null ? `PER ${row.per}` : null,
    row.priceBv != null ? `PBV ${row.priceBv}` : null,
    row.roe != null ? `ROE ${row.roe}` : null,
  ]
    .filter((metric): metric is string => metric !== null)
    .join(", ");

  return [
    NO_LICENSE_NOTE,
    metrics ? `Yang bisa kami tunjukkan untuk ${row.code}: ${metrics}.` : null,
    REFLECTIVE_QUESTION,
  ]
    .filter(Boolean)
    .join(" ");
}
