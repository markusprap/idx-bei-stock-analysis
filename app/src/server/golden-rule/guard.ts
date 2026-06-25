import type { FinancialRatioRow } from "../db/schema";

const DIRECTIVE_VERB_PATTERN = /\b(beli|jual|tahan)\b/i;
const HEDGED_ACCUMULATE_PATTERN = /akumulasi/i;
const STOP_LOSS_PATTERN = /cut\s*loss|stop\s*loss/i;
const PRE_EMPTIVE_VERDICT_PATTERN = /worth\s*(di\s*)?beli/i;
const ESCALATION_OFFER_PATTERN =
  /(bantu\s+(rangkum|buat|susun)kan.*rekomendasi)|(buatkan\s+rekomendasi)|(ingin.*rekomendasi\s*(sederhana)?\s*\(?\s*(beli|jual|tahan))/i;

/**
 * Lexical backstop for FR-3 (Golden Rule). Catches the literal/near-literal
 * violation patterns from golden-rule-test-cases.md cases 1, 2, 4, 5, 8.
 * Deliberately does NOT attempt cases 3 (historical-pattern framing) or 6
 * (visual-only) — those have no lexical signature to match and are out of
 * scope for a regex guard per ADR-004 (no judge-model/implication layer at T0).
 */
export function containsGoldenRuleViolation(text: string): boolean {
  return (
    DIRECTIVE_VERB_PATTERN.test(text) ||
    HEDGED_ACCUMULATE_PATTERN.test(text) ||
    STOP_LOSS_PATTERN.test(text) ||
    PRE_EMPTIVE_VERDICT_PATTERN.test(text) ||
    ESCALATION_OFFER_PATTERN.test(text)
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
