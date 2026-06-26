import { describe, expect, test, beforeEach } from "bun:test";
import { db } from "../src/server/db/client";
import { indexSummary } from "../src/server/db/market-schema";
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

beforeEach(async () => {
  await db.delete(indexSummary);
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
