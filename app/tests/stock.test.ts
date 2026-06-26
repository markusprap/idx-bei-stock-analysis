import { describe, expect, test, beforeEach, afterAll } from "bun:test";
import { eq, or } from "drizzle-orm";
import { db } from "../src/server/db/client";
import { dailyTradeSummary } from "../src/server/db/market-schema";
import { financialRatios } from "../src/server/db/schema";
import { createStockRoute } from "../src/server/routes/stock";

const app = createStockRoute({ db });

// Test codes that don't conflict with chat.test.ts (which uses "BBCA")
const CHART_CODE = "BBCA";
const FUND_CODE = "TSTX";
const FUND_CODE_2 = "TSTS";

function makeStockRow(overrides: Partial<typeof dailyTradeSummary.$inferInsert> = {}) {
  return {
    stockCode: CHART_CODE,
    tradeDate: "2026-06-25",
    stockName: "Bank Central Asia Tbk.",
    previous: 9000,
    openPrice: 9100,
    high: 9200,
    low: 8950,
    close: 9150,
    change: 150,
    changePct: 1.67,
    volume: 50000000,
    value: 457500000000,
    frequency: 12000,
    ...overrides,
  };
}

function makeFundamentalsRow(overrides: Partial<typeof financialRatios.$inferInsert> = {}) {
  return {
    code: FUND_CODE,
    stockName: "Test Saham Tbk.",
    fsDate: "2024-12-31",
    per: 22.5,
    priceBv: 4.1,
    eps: 1234.56,
    bookValue: 7890.12,
    roa: 3.21,
    roe: 18.7,
    npm: 42.3,
    assets: 1.2e15,
    liabilities: 1.1e15,
    equity: 1.0e14,
    sales: 1.5e14,
    ...overrides,
  };
}

beforeEach(async () => {
  await db.delete(dailyTradeSummary);
  await db.delete(financialRatios).where(
    or(eq(financialRatios.code, FUND_CODE), eq(financialRatios.code, FUND_CODE_2)),
  );
});

afterAll(async () => {
  await db.delete(dailyTradeSummary);
  await db.delete(financialRatios).where(
    or(eq(financialRatios.code, FUND_CODE), eq(financialRatios.code, FUND_CODE_2)),
  );
});

describe("GET /:code/chart", () => {
  test("returns empty state when table is empty", async () => {
    const res = await app.request(`/${CHART_CODE}/chart`);
    expect(res.status).toBe(200);
    const body = await res.json() as { code: string; stockName: unknown; data: unknown[]; staleness: unknown };
    expect(body.code).toBe(CHART_CODE);
    expect(body.stockName).toBeNull();
    expect(body.data).toEqual([]);
    expect(body.staleness).toBeNull();
  });

  test("normalizes code to uppercase", async () => {
    const res = await app.request("/bbca/chart");
    expect(res.status).toBe(200);
    const body = await res.json() as { code: string };
    expect(body.code).toBe("BBCA");
  });

  test("returns data ordered by tradeDate ASC", async () => {
    await db.insert(dailyTradeSummary).values([
      makeStockRow({ tradeDate: "2026-06-25", close: 9150 }),
      makeStockRow({ tradeDate: "2026-06-23", close: 9000 }),
      makeStockRow({ tradeDate: "2026-06-24", close: 9100 }),
    ]);

    const res = await app.request(`/${CHART_CODE}/chart`);
    const body = await res.json() as { data: { tradeDate: string }[] };
    expect(body.data[0]?.tradeDate).toBe("2026-06-23");
    expect(body.data[1]?.tradeDate).toBe("2026-06-24");
    expect(body.data[2]?.tradeDate).toBe("2026-06-25");
  });

  test("only returns rows for the requested stock code", async () => {
    await db.insert(dailyTradeSummary).values([
      makeStockRow({ stockCode: "BBCA" }),
      makeStockRow({ stockCode: "BMRI" }),
    ]);

    const res = await app.request("/BBCA/chart");
    const body = await res.json() as { data: { tradeDate: string }[] };
    expect(body.data).toHaveLength(1);
  });

  test("returns stockName from the most recent row", async () => {
    await db.insert(dailyTradeSummary).values([
      makeStockRow({ stockName: "Bank Central Asia Tbk." }),
    ]);

    const res = await app.request(`/${CHART_CODE}/chart`);
    const body = await res.json() as { stockName: string };
    expect(body.stockName).toBe("Bank Central Asia Tbk.");
  });

  test("staleness reflects time since scraped_at", async () => {
    const oldScrapedAt = new Date(Date.now() - 26 * 60 * 60 * 1000);
    await db.insert(dailyTradeSummary).values([
      { ...makeStockRow(), scrapedAt: oldScrapedAt },
    ]);

    const res = await app.request(`/${CHART_CODE}/chart`);
    const body = await res.json() as { staleness: { ageHours: number; isStale: boolean } };
    expect(body.staleness.isStale).toBe(true);
    expect(body.staleness.ageHours).toBeGreaterThan(24);
  });

  test("timeframe filters rows by cutoff date", async () => {
    await db.insert(dailyTradeSummary).values([
      makeStockRow({ tradeDate: "2025-01-01", close: 8000 }),
      makeStockRow({ tradeDate: "2026-06-20", close: 9100 }),
      makeStockRow({ tradeDate: "2026-06-25", close: 9150 }),
    ]);

    const res = await app.request(`/${CHART_CODE}/chart?timeframe=1M`);
    const body = await res.json() as { data: { tradeDate: string }[] };
    const dates = body.data.map((d) => d.tradeDate);
    expect(dates).not.toContain("2025-01-01");
    expect(dates).toContain("2026-06-25");
  });
});

describe("GET /:code/fundamentals", () => {
  test("returns empty state when table is empty", async () => {
    const res = await app.request(`/${FUND_CODE}/fundamentals`);
    expect(res.status).toBe(200);
    const body = await res.json() as { code: string; stockName: unknown; rows: unknown[] };
    expect(body.code).toBe(FUND_CODE);
    expect(body.stockName).toBeNull();
    expect(body.rows).toEqual([]);
  });

  test("normalizes code to uppercase", async () => {
    const res = await app.request(`/${FUND_CODE.toLowerCase()}/fundamentals`);
    expect(res.status).toBe(200);
    const body = await res.json() as { code: string };
    expect(body.code).toBe(FUND_CODE);
  });

  test("returns rows ordered by fsDate DESC", async () => {
    await db.insert(financialRatios).values([
      makeFundamentalsRow({ fsDate: "2022-12-31" }),
      makeFundamentalsRow({ fsDate: "2024-12-31" }),
      makeFundamentalsRow({ fsDate: "2023-12-31" }),
    ]);

    const res = await app.request(`/${FUND_CODE}/fundamentals`);
    const body = await res.json() as { rows: { fsDate: string }[] };
    expect(body.rows[0]?.fsDate).toBe("2024-12-31");
    expect(body.rows[1]?.fsDate).toBe("2023-12-31");
    expect(body.rows[2]?.fsDate).toBe("2022-12-31");
  });

  test("only returns rows for the requested stock code", async () => {
    await db.insert(financialRatios).values([
      makeFundamentalsRow({ code: FUND_CODE }),
      makeFundamentalsRow({ code: FUND_CODE_2 }),
    ]);

    const res = await app.request(`/${FUND_CODE}/fundamentals`);
    const body = await res.json() as { rows: { fsDate: string }[] };
    expect(body.rows).toHaveLength(1);
  });

  test("returns stockName from the first row", async () => {
    await db.insert(financialRatios).values([
      makeFundamentalsRow({ stockName: "Test Saham Tbk." }),
    ]);

    const res = await app.request(`/${FUND_CODE}/fundamentals`);
    const body = await res.json() as { stockName: string };
    expect(body.stockName).toBe("Test Saham Tbk.");
  });
});
