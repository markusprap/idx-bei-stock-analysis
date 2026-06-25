import { describe, expect, test, mock } from "bun:test";
import {
  extractTicker,
  asksAboutPriceOrTechnicalData,
  noDataReply,
  handleChatMessage,
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

describe("handleChatMessage — AC 3 (price/technical out of scope)", () => {
  test("short-circuits without calling the LLM or the DB", async () => {
    const { llm, create } = fakeLlm("should never be called");

    const reply = await handleChatMessage("Harga BBCA berapa?", { db: dbReturning([]), llm });

    expect(reply).toContain("belum punya data harga");
    expect(create).not.toHaveBeenCalled();
  });
});

describe("handleChatMessage — AC 2 (unknown ticker)", () => {
  test("returns a deterministic no-data reply without calling the LLM", async () => {
    const { llm, create } = fakeLlm("should never be called");

    const reply = await handleChatMessage("Gimana valuasi ZZZZ?", { db: dbReturning([]), llm });

    expect(reply).toBe(noDataReply("ZZZZ"));
    expect(create).not.toHaveBeenCalled();
  });
});

describe("handleChatMessage — no ticker (chitchat)", () => {
  test("calls the LLM with no data context", async () => {
    const { llm, create } = fakeLlm("Halo! Saya Sahamigo.");

    const reply = await handleChatMessage("Halo, kamu siapa?", { db: dbReturning([]), llm });

    expect(reply).toBe("Halo! Saya Sahamigo.");
    expect(create).toHaveBeenCalledTimes(1);
  });
});

describe("handleChatMessage — AC 1 (BBCA happy path, real Postgres)", () => {
  test("queries the real financial_ratios table and passes real data to the LLM", async () => {
    const { llm, create } = fakeLlm("Valuasi BBCA dijelaskan di sini.");

    const reply = await handleChatMessage("Gimana valuasi BBCA?", { db, llm });

    expect(reply).toBe("Valuasi BBCA dijelaskan di sini.");

    const call = create.mock.calls[0]?.[0];
    expect(call?.messages[0]?.content).toContain("BBCA");
    expect(call?.messages[0]?.content).toContain("22.38");

    const rows = await db.select().from(financialRatios).where(eq(financialRatios.code, "BBCA"));
    expect(rows.length).toBeGreaterThan(0);
  });
});

describe("handleChatMessage — Golden Rule guard wired into both LLM call sites (Story 1.3)", () => {
  test("replaces a violating reply with the safe fallback on the chitchat (no-ticker) path", async () => {
    const { llm } = fakeLlm("Beli aja BBCA, lagi murah.");

    const reply = await handleChatMessage("Halo, kamu siapa?", { db: dbReturning([]), llm });

    expect(reply).toBe(buildSafeFallbackReply(null));
  });

  test("replaces a violating reply with the safe fallback on the ticker-found (data) path", async () => {
    const row = { code: "BBCA", per: 22.38, priceBv: 4.66, roe: 20.8206 } as FinancialRatioRow;
    const { llm } = fakeLlm("Beli aja BBCA, lagi murah.");

    const reply = await handleChatMessage("Gimana valuasi BBCA?", { db: dbReturning([row]), llm });

    expect(reply).toBe(buildSafeFallbackReply(row));
  });
});
