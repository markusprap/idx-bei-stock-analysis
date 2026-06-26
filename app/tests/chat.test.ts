import { describe, expect, test, mock } from "bun:test";
import {
  extractTicker,
  asksAboutPriceOrTechnicalData,
  noDataReply,
  handleChatMessage,
  type FundamentalCardReply,
} from "../src/server/routes/chat";
import { db } from "../src/server/db/client";
import { financialRatios, type FinancialRatioRow } from "../src/server/db/schema";
import { eq } from "drizzle-orm";
import type { llm as LlmClient } from "../src/server/llm/client";
import type { db as DbClient } from "../src/server/db/client";
import { buildSafeFallbackReply } from "../src/server/golden-rule/guard";

function fakeLlm(reply: string) {
  const create = mock(async (_params: { messages: { content: string }[] }) => ({
    choices: [{ message: { content: reply } }],
  }));
  const llm = { chat: { completions: { create } } } as unknown as typeof LlmClient;
  return { llm, create };
}

function dbReturning(rows: unknown[]) {
  return {
    select: () => ({
      from: () => ({
        where: async () => rows,
      }),
    }),
  } as unknown as typeof DbClient;
}

describe("extractTicker", () => {
  test("extracts a 4-uppercase-letter ticker from a message", () => {
    expect(extractTicker("Gimana valuasi BBCA sekarang?")).toBe("BBCA");
  });

  test("takes the first match only when multiple tickers appear", () => {
    expect(extractTicker("Bandingkan BBCA dan BMRI")).toBe("BBCA");
  });

  test("returns null when no ticker-shaped token exists", () => {
    expect(extractTicker("Halo, kamu siapa?")).toBeNull();
  });
});

describe("asksAboutPriceOrTechnicalData", () => {
  test("detects a price question", () => {
    expect(asksAboutPriceOrTechnicalData("Harga BBCA hari ini berapa?")).toBe(true);
  });

  test("detects a technical-indicator question", () => {
    expect(asksAboutPriceOrTechnicalData("Gimana RSI BBCA?")).toBe(true);
  });

  test("does not flag an ordinary fundamental question", () => {
    expect(asksAboutPriceOrTechnicalData("Gimana valuasi BBCA?")).toBe(false);
  });
});

describe("handleChatMessage — price/technical out of scope", () => {
  test("short-circuits without calling the LLM or the DB", async () => {
    const { llm, create } = fakeLlm("should never be called");

    const reply = await handleChatMessage("Harga BBCA berapa?", { db: dbReturning([]), llm });

    expect(reply.type).toBe("text");
    if (reply.type === "text") expect(reply.message).toContain("belum punya data harga");
    expect(create).not.toHaveBeenCalled();
  });
});

describe("handleChatMessage — unknown ticker", () => {
  test("returns a deterministic no-data text reply without calling the LLM", async () => {
    const { llm, create } = fakeLlm("should never be called");

    const reply = await handleChatMessage("Gimana valuasi ZZZZ?", { db: dbReturning([]), llm });

    expect(reply.type).toBe("text");
    if (reply.type === "text") expect(reply.message).toBe(noDataReply("ZZZZ"));
    expect(create).not.toHaveBeenCalled();
  });
});

describe("handleChatMessage — no ticker (chitchat)", () => {
  test("calls the LLM and returns a text reply", async () => {
    const { llm, create } = fakeLlm("Halo! Saya Sahamigo.");

    const reply = await handleChatMessage("Halo, kamu siapa?", { db: dbReturning([]), llm });

    expect(reply.type).toBe("text");
    if (reply.type === "text") expect(reply.message).toBe("Halo! Saya Sahamigo.");
    expect(create).toHaveBeenCalledTimes(1);
  });
});

describe("handleChatMessage — ticker with fundamental data (AC 1 + AC 2)", () => {
  test("returns a fundamental_card with correct fields — no LLM called", async () => {
    const row = {
      code: "BBCA",
      stockName: "Bank Central Asia Tbk",
      sector: "Keuangan",
      subSector: "Bank",
      sharia: "No",
      fsDate: "2024-12-31",
      fiscalYearEnd: "2024-12-31",
      per: 22.38,
      priceBv: 4.66,
      eps: 1200.0,
      bookValue: 5500.0,
      roe: 20.82,
      roa: 3.1,
      npm: 40.0,
      deRatio: 5.2,
      assets: 1_500_000_000_000_000,
      liabilities: 1_200_000_000_000_000,
      equity: 300_000_000_000_000,
    } as unknown as FinancialRatioRow;

    const { llm, create } = fakeLlm("should never be called");

    const reply = await handleChatMessage("Gimana valuasi BBCA?", { db: dbReturning([row]), llm });

    expect(reply.type).toBe("fundamental_card");
    expect(create).not.toHaveBeenCalled();

    const card = reply as FundamentalCardReply;
    expect(card.ticker).toBe("BBCA");
    expect(card.stockName).toBe("Bank Central Asia Tbk");
    expect(card.per).toBe(22.38);
    expect(card.roe).toBe(20.82);
    expect(card.fsDate).toBe("2024-12-31");
  });

  test("card has no buy/sell/hold field — Golden Rule AC 5", async () => {
    const row = { code: "BBCA", per: 22.38 } as unknown as FinancialRatioRow;
    const { llm } = fakeLlm("");

    const reply = await handleChatMessage("Gimana BBCA?", { db: dbReturning([row]), llm });

    expect(reply.type).toBe("fundamental_card");
    const keys = Object.keys(reply);
    expect(keys).not.toContain("verdict");
    expect(keys).not.toContain("recommendation");
    expect(keys).not.toContain("signal");
  });

  test("AC 1 (real Postgres) — queries financial_ratios and returns fundamental_card", async () => {
    const { llm, create } = fakeLlm("should never be called");

    const reply = await handleChatMessage("Gimana valuasi BBCA?", { db, llm });

    expect(reply.type).toBe("fundamental_card");
    expect(create).not.toHaveBeenCalled();

    const card = reply as FundamentalCardReply;
    expect(card.ticker).toBe("BBCA");
    expect(card.per).not.toBeNull();

    const rows = await db.select().from(financialRatios).where(eq(financialRatios.code, "BBCA"));
    expect(rows.length).toBeGreaterThan(0);
  });
});

describe("handleChatMessage — Golden Rule guard (chitchat path)", () => {
  test("replaces a violating LLM reply with safe fallback on chitchat path", async () => {
    const { llm } = fakeLlm("Beli aja BBCA, lagi murah.");

    const reply = await handleChatMessage("Halo, kamu siapa?", { db: dbReturning([]), llm });

    expect(reply.type).toBe("text");
    if (reply.type === "text") expect(reply.message).toBe(buildSafeFallbackReply(null));
  });
});
