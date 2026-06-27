import { describe, expect, test, mock } from "bun:test";
import {
  extractTicker,
  asksAboutPriceOrTechnicalData,
  asksAboutIndicators,
  noDataReply,
  handleChatMessage,
  type FundamentalCardReply,
  type IndicatorCardReply,
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

function dbReturning(rows: unknown[], tradeRows: unknown[] = []) {
  let callCount = 0;
  const responses = [rows, tradeRows];

  const makeChainable = (data: unknown[]) => {
    // orderBy returns a thenable array (for the indicator path) that also has .limit (for the trade path)
    const orderByResult = Object.assign(Promise.resolve(data), {
      limit: async () => data,
    });
    return Object.assign(Promise.resolve(data), {
      orderBy: () => orderByResult,
    });
  };

  return {
    select: () => ({
      from: () => ({
        where: (_cond: unknown) => {
          const idx = callCount++;
          return makeChainable(responses[idx] ?? []);
        },
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
  test("detects a chart/grafik question", () => {
    expect(asksAboutPriceOrTechnicalData("Tampilkan grafik BBCA 6 bulan")).toBe(true);
  });

  test("detects the word chart", () => {
    expect(asksAboutPriceOrTechnicalData("Show me the chart BBCA")).toBe(true);
  });

  test("does not flag an ordinary fundamental question", () => {
    expect(asksAboutPriceOrTechnicalData("Gimana valuasi BBCA?")).toBe(false);
  });

  test("does not flag a price/harga question — harga now answered via fundamental_card", () => {
    expect(asksAboutPriceOrTechnicalData("Harga BBCA hari ini berapa?")).toBe(false);
  });

  test("does not flag an RSI/indicator question — answered via indicator_card", () => {
    expect(asksAboutPriceOrTechnicalData("Gimana RSI BBCA?")).toBe(false);
  });
});

describe("asksAboutIndicators", () => {
  test("detects RSI question", () => {
    expect(asksAboutIndicators("Gimana RSI BBCA?")).toBe(true);
  });

  test("detects MACD question", () => {
    expect(asksAboutIndicators("MACD TLKM gimana?")).toBe(true);
  });

  test("detects bollinger question", () => {
    expect(asksAboutIndicators("bollinger bands BBCA")).toBe(true);
  });

  test("detects indikator teknikal question", () => {
    expect(asksAboutIndicators("indikator BBCA gimana?")).toBe(true);
  });

  test("does not flag an ordinary fundamental question", () => {
    expect(asksAboutIndicators("Gimana valuasi BBCA?")).toBe(false);
  });

  test("does not flag a harga question", () => {
    expect(asksAboutIndicators("Harga BBCA berapa?")).toBe(false);
  });
});

describe("handleChatMessage — chart/technical out of scope", () => {
  test("short-circuits without calling the LLM or the DB", async () => {
    const { llm, create } = fakeLlm("should never be called");

    const reply = await handleChatMessage("Tampilkan grafik BBCA 1 tahun", { db: dbReturning([]), llm });

    expect(reply.type).toBe("text");
    if (reply.type === "text") expect(reply.message).toContain("grafik");
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

describe("handleChatMessage — harga query returns fundamental_card with trade data", () => {
  test("'harga BBCA' returns fundamental_card with close/changePct when trade data present", async () => {
    const fundamentalRow = { code: "BBCA", per: 22.38, stockName: "BCA" } as unknown as FinancialRatioRow;
    const tradeRow = {
      stockCode: "BBCA",
      tradeDate: "2026-06-25",
      close: 9450,
      change: 50,
      changePct: 0.53,
      volume: 12000000,
      value: 113400000000,
      foreignBuy: 5000000000,
      foreignSell: 3000000000,
    };
    const { llm, create } = fakeLlm("should never be called");

    const reply = await handleChatMessage("Harga BBCA berapa sekarang?", {
      db: dbReturning([fundamentalRow], [tradeRow]),
      llm,
    });

    expect(reply.type).toBe("fundamental_card");
    expect(create).not.toHaveBeenCalled();

    const card = reply as FundamentalCardReply;
    expect(card.close).toBe(9450);
    expect(card.changePct).toBe(0.53);
    expect(card.tradeDate).toBe("2026-06-25");
    expect(card.foreignBuy).toBe(5000000000);
  });

  test("fundamental_card still works when no trade data available (null fields)", async () => {
    const row = { code: "AAAA", per: 10 } as unknown as FinancialRatioRow;
    const { llm } = fakeLlm("");

    const reply = await handleChatMessage("AAAA gimana fundamentalnya?", {
      db: dbReturning([row], []),
      llm,
    });

    expect(reply.type).toBe("fundamental_card");
    const card = reply as FundamentalCardReply;
    expect(card.close).toBeNull();
    expect(card.tradeDate).toBeNull();
  });
});

describe("handleChatMessage — indicator_card path", () => {
  function makeOhlcvRow(tradeDate: string, close: number, high: number, low: number) {
    return { stockCode: "BBCA", stockName: "BCA", tradeDate, close, high, low, scrapedAt: new Date() };
  }

  function makeOhlcvRows(n: number): unknown[] {
    const rows = [];
    for (let i = 0; i < n; i++) {
      const base = 9000 + i * 10;
      rows.push(makeOhlcvRow(`2025-0${Math.floor(i / 28) + 1}-${String((i % 28) + 1).padStart(2, "0")}`, base, base + 50, base - 30));
    }
    return rows;
  }

  test("returns indicator_card for an RSI query with sufficient data", async () => {
    const { llm, create } = fakeLlm("should never be called");
    const ohlcvRows = makeOhlcvRows(60);

    const reply = await handleChatMessage("Gimana RSI BBCA?", { db: dbReturning(ohlcvRows), llm });

    expect(reply.type).toBe("indicator_card");
    expect(create).not.toHaveBeenCalled();

    const card = reply as IndicatorCardReply;
    expect(card.ticker).toBe("BBCA");
    expect(card.stockName).toBe("BCA");
    expect(card.rsi14).not.toBeNull();
  });

  test("returns indicator_card for a MACD query", async () => {
    const { llm } = fakeLlm("should never be called");
    const reply = await handleChatMessage("MACD BBCA gimana?", { db: dbReturning(makeOhlcvRows(60)), llm });
    expect(reply.type).toBe("indicator_card");
    const card = reply as IndicatorCardReply;
    expect(card.macd).not.toBeNull();
    expect(card.macdSignal).not.toBeNull();
    expect(card.macdHistogram).not.toBeNull();
  });

  test("returns no-data text reply when daily_trade_summary has no rows for the ticker", async () => {
    const { llm, create } = fakeLlm("should never be called");

    const reply = await handleChatMessage("RSI ZZZZ berapa?", { db: dbReturning([]), llm });

    expect(reply.type).toBe("text");
    if (reply.type === "text") expect(reply.message).toBe(noDataReply("ZZZZ"));
    expect(create).not.toHaveBeenCalled();
  });

  test("indicator_card has no verdict/recommendation field — Golden Rule AC 5", async () => {
    const { llm } = fakeLlm("");
    const reply = await handleChatMessage("indikator BBCA", { db: dbReturning(makeOhlcvRows(60)), llm });
    const keys = Object.keys(reply);
    expect(keys).not.toContain("verdict");
    expect(keys).not.toContain("recommendation");
    expect(keys).not.toContain("signal");
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
