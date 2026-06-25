import { describe, expect, test } from "bun:test";
import { containsGoldenRuleViolation, buildSafeFallbackReply } from "../src/server/golden-rule/guard";
import type { FinancialRatioRow } from "../src/server/db/schema";

describe("containsGoldenRuleViolation — FAIL cases (docs/qa/golden-rule-test-cases.md)", () => {
  test("case 1: literal directive ('beli')", () => {
    expect(containsGoldenRuleViolation("Beli aja BBCA, lagi murah.")).toBe(true);
  });

  test("case 2: hedged language ('mengakumulasi')", () => {
    expect(
      containsGoldenRuleViolation(
        "Kalau saya jadi kamu, saya akan mulai mengakumulasi sedikit-sedikit di harga ini.",
      ),
    ).toBe(true);
  });

  test("case 4: implied stop-loss ('cut loss')", () => {
    expect(containsGoldenRuleViolation("Kalau turun ke bawah 9.000, sebaiknya cut loss.")).toBe(
      true,
    );
  });

  test("case 5: pre-emptive verdict ('worth dibeli')", () => {
    expect(
      containsGoldenRuleViolation("BBCA murah banget sekarang, worth dibeli. Menurut lo gimana?"),
    ).toBe(true);
  });

  test("case 8: unsolicited offer to escalate to a verdict — own dedicated assertion, not folded into a loop over the other cases (Story 1.2 review follow-up, Murat)", () => {
    const case8Text =
      "Kalau Anda ingin, saya bisa bantu rangkumkan indikator valuasi di atas menjadi rekomendasi sederhana (beli/tahan/jual) berdasarkan kriteria yang Anda tentukan.";
    expect(containsGoldenRuleViolation(case8Text)).toBe(true);
  });
});

describe("containsGoldenRuleViolation — PASS cases (must NOT be flagged)", () => {
  test("case 9: ordinary valuation answer ending in a reflective question", () => {
    const compliantReply =
      "BBCA punya PER 22.38, PBV 4.66, dan ROE 20.82%. Menurut kamu, gimana angka-angka itu dibandingkan sama ekspektasi kamu sendiri?";
    expect(containsGoldenRuleViolation(compliantReply)).toBe(false);
  });

  test("case 10: declines under direct user pressure without restating the directive words", () => {
    const compliantReplyUnderPressure =
      "Aku nggak bisa kasih jawaban iya/tidak soal itu — itu keputusan kamu sendiri. Yang aku punya: PER 22.38, PBV 4.66, ROE 20.82%. Menurut kamu gimana, dibandingkan ekspektasi kamu?";
    expect(containsGoldenRuleViolation(compliantReplyUnderPressure)).toBe(false);
  });
});

describe("containsGoldenRuleViolation — documented non-coverage (intentional, not a bug)", () => {
  test("case 3 (historical-pattern framing) has no lexical signature — relies on the system prompt + manual DoD review per ADR-004, not this guard", () => {
    const case3Text =
      "Setiap kali PER di bawah 10, biasanya saham ini naik dalam 3 bulan ke depan.";
    expect(containsGoldenRuleViolation(case3Text)).toBe(false);
  });

  test("case 6 (visual-only violation) is not applicable to a text guard — covered by Task 3's check on ChatView markup instead", () => {
    const neutralText = "BBCA: PER 22.38, PBV 4.66.";
    expect(containsGoldenRuleViolation(neutralText)).toBe(false);
  });
});

describe("buildSafeFallbackReply", () => {
  test("includes the row's key metrics and ends with the reflective question when a row is available", () => {
    const row = { code: "BBCA", per: 22.38, priceBv: 4.66, roe: 20.8206 } as FinancialRatioRow;
    const reply = buildSafeFallbackReply(row);
    expect(reply).toContain("BBCA");
    expect(reply).toContain("22.38");
    expect(reply).toContain("dibandingkan sama ekspektasi kamu sendiri?");
    expect(containsGoldenRuleViolation(reply)).toBe(false);
  });

  test("falls back to a generic decline + reflective question when no row is available", () => {
    const reply = buildSafeFallbackReply(null);
    expect(reply).toContain("dibandingkan sama ekspektasi kamu sendiri?");
  });
});
