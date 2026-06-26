import { describe, expect, test, beforeEach } from "bun:test";
import { db } from "../src/server/db/client";
import { indexSummary, dailyTradeSummary } from "../src/server/db/market-schema";
import { createMarketRoute } from "../src/server/routes/market";

const app = createMarketRoute({ db });

function makeRow(overrides: Partial<typeof indexSummary.$inferInsert> = {}) {
  return {
    indexCode: "COMPOSITE",
    tradeDate: "2026-06-25",
    previous: 5883.881,
    highest: 6056.2,
    lowest: 5864.004,
    close: 5999.038,
    change: 115.157,
    volume: 20913942042,
    value: 13634608712828,
    frequency: 1666851,
    marketCapital: 1.05e16,
    numberOfStock: 913,
    ...overrides,
  };
}

function makeStockRow(overrides: Partial<typeof dailyTradeSummary.$inferInsert> = {}) {
  return {
    stockCode: "BBCA",
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

beforeEach(async () => {
  await db.delete(indexSummary);
  await db.delete(dailyTradeSummary);
});

describe("GET /ihsg", () => {
  test("returns empty data and null staleness when table is empty", async () => {
    const res = await app.request("/ihsg");
    expect(res.status).toBe(200);
    const body = await res.json() as { data: unknown[]; staleness: unknown };
    expect(body.data).toEqual([]);
    expect(body.staleness).toBeNull();
  });

  test("returns COMPOSITE rows ordered by tradeDate DESC", async () => {
    await db.insert(indexSummary).values([
      makeRow({ tradeDate: "2026-06-23" }),
      makeRow({ tradeDate: "2026-06-25" }),
      makeRow({ tradeDate: "2026-06-24" }),
    ]);

    const res = await app.request("/ihsg");
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { tradeDate: string }[]; staleness: unknown };
    expect(body.data).toHaveLength(3);
    expect(body.data[0]?.tradeDate).toBe("2026-06-25");
    expect(body.data[1]?.tradeDate).toBe("2026-06-24");
    expect(body.data[2]?.tradeDate).toBe("2026-06-23");
  });

  test("returns at most 30 rows", async () => {
    const rows = Array.from({ length: 35 }, (_, i) => {
      const d = new Date("2026-01-01");
      d.setDate(d.getDate() + i);
      return makeRow({ tradeDate: d.toISOString().slice(0, 10) });
    });
    await db.insert(indexSummary).values(rows);

    const res = await app.request("/ihsg");
    const body = await res.json() as { data: unknown[] };
    expect(body.data).toHaveLength(30);
  });

  test("staleness ageHours reflects time since scraped_at, not tradeDate", async () => {
    const oldScrapedAt = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString();
    await db.insert(indexSummary).values([
      { ...makeRow(), scrapedAt: new Date(oldScrapedAt) },
    ]);

    const res = await app.request("/ihsg");
    const body = await res.json() as { staleness: { ageHours: number; isStale: boolean } };
    expect(body.staleness.isStale).toBe(true);
    expect(body.staleness.ageHours).toBeGreaterThan(24);
  });

  test("does not return non-COMPOSITE index rows", async () => {
    await db.insert(indexSummary).values([
      makeRow({ indexCode: "LQ45", tradeDate: "2026-06-25" }),
    ]);

    const res = await app.request("/ihsg");
    const body = await res.json() as { data: unknown[]; staleness: unknown };
    expect(body.data).toHaveLength(0);
    expect(body.staleness).toBeNull();
  });
});

describe("GET /trending", () => {
  test("returns empty state when table is empty", async () => {
    const res = await app.request("/trending");
    expect(res.status).toBe(200);
    const body = await res.json() as { tradeDate: unknown; gainers: unknown[]; losers: unknown[]; staleness: unknown };
    expect(body.tradeDate).toBeNull();
    expect(body.gainers).toEqual([]);
    expect(body.losers).toEqual([]);
    expect(body.staleness).toBeNull();
  });

  test("returns top gainers ordered by changePct DESC", async () => {
    await db.insert(dailyTradeSummary).values([
      makeStockRow({ stockCode: "BBCA", changePct: 5.0 }),
      makeStockRow({ stockCode: "TLKM", changePct: 2.5 }),
      makeStockRow({ stockCode: "ASII", changePct: 8.0 }),
    ]);

    const res = await app.request("/trending");
    const body = await res.json() as { gainers: { stockCode: string; changePct: number }[] };
    expect(body.gainers).toHaveLength(3);
    expect(body.gainers[0]?.stockCode).toBe("ASII");
    expect(body.gainers[1]?.stockCode).toBe("BBCA");
    expect(body.gainers[2]?.stockCode).toBe("TLKM");
  });

  test("returns top losers ordered by changePct ASC", async () => {
    await db.insert(dailyTradeSummary).values([
      makeStockRow({ stockCode: "BBCA", changePct: -1.0 }),
      makeStockRow({ stockCode: "TLKM", changePct: -5.0 }),
      makeStockRow({ stockCode: "ASII", changePct: -3.0 }),
    ]);

    const res = await app.request("/trending");
    const body = await res.json() as { losers: { stockCode: string }[] };
    expect(body.losers[0]?.stockCode).toBe("TLKM");
    expect(body.losers[1]?.stockCode).toBe("ASII");
    expect(body.losers[2]?.stockCode).toBe("BBCA");
  });

  test("excludes stocks with null or zero close price", async () => {
    await db.insert(dailyTradeSummary).values([
      makeStockRow({ stockCode: "ACTIVE", close: 5000, changePct: 2.0 }),
      makeStockRow({ stockCode: "NOCLOS", close: null, changePct: 1.0 }),
      makeStockRow({ stockCode: "ZEROCL", close: 0, changePct: 0.5 }),
    ]);

    const res = await app.request("/trending");
    const body = await res.json() as { gainers: { stockCode: string }[]; topValue: { stockCode: string }[] };
    expect(body.gainers.map((r) => r.stockCode)).toContain("ACTIVE");
    expect(body.gainers.map((r) => r.stockCode)).not.toContain("NOCLOS");
    expect(body.gainers.map((r) => r.stockCode)).not.toContain("ZEROCL");
    expect(body.topValue.map((r) => r.stockCode)).not.toContain("NOCLOS");
    expect(body.topValue.map((r) => r.stockCode)).not.toContain("ZEROCL");
  });

  test("staleness reflects time since scraped_at, not tradeDate", async () => {
    const oldScrapedAt = new Date(Date.now() - 26 * 60 * 60 * 1000);
    await db.insert(dailyTradeSummary).values([
      { ...makeStockRow(), scrapedAt: oldScrapedAt },
    ]);

    const res = await app.request("/trending");
    const body = await res.json() as { staleness: { ageHours: number; isStale: boolean } };
    expect(body.staleness.isStale).toBe(true);
    expect(body.staleness.ageHours).toBeGreaterThan(24);
  });

  test("returns at most 10 rows per category", async () => {
    const rows = Array.from({ length: 15 }, (_, i) =>
      makeStockRow({ stockCode: `STK${String(i).padStart(2, "0")}`, changePct: i * 0.5 }),
    );
    await db.insert(dailyTradeSummary).values(rows);

    const res = await app.request("/trending");
    const body = await res.json() as { gainers: unknown[]; losers: unknown[]; topValue: unknown[]; topVolume: unknown[] };
    expect(body.gainers).toHaveLength(10);
    expect(body.losers).toHaveLength(10);
    expect(body.topValue).toHaveLength(10);
    expect(body.topVolume).toHaveLength(10);
  });
});
