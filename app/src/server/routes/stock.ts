import { Hono } from "hono";
import { desc, asc, eq, and, gte } from "drizzle-orm";
import type { db as DbClient } from "../db/client";
import { dailyTradeSummary } from "../db/market-schema";
import { financialRatios } from "../db/schema";

const STALENESS_THRESHOLD_HOURS = 24;

const TIMEFRAME_DAYS: Record<string, number> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
};

function computeStaleness(scrapedAt: Date) {
  const ageMs = Date.now() - new Date(scrapedAt).getTime();
  const ageHours = Math.round((ageMs / (1000 * 60 * 60)) * 10) / 10;
  return { scrapedAt, ageHours, isStale: ageHours > STALENESS_THRESHOLD_HOURS };
}

export function createStockRoute(deps: { db: typeof DbClient }) {
  const app = new Hono();

  app.get("/:code/chart", async (c) => {
    const code = c.req.param("code").toUpperCase();
    const tf = c.req.query("timeframe") ?? "3M";
    const days = TIMEFRAME_DAYS[tf] ?? 90;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffDate = cutoff.toISOString().slice(0, 10);

    const rows = await deps.db
      .select()
      .from(dailyTradeSummary)
      .where(
        and(
          eq(dailyTradeSummary.stockCode, code),
          gte(dailyTradeSummary.tradeDate, cutoffDate),
        ),
      )
      .orderBy(asc(dailyTradeSummary.tradeDate));

    if (rows.length === 0) {
      return c.json({ code, stockName: null, data: [], staleness: null });
    }

    const latestRow = rows[rows.length - 1];
    if (!latestRow) return c.json({ code, stockName: null, data: [], staleness: null });

    const staleness = computeStaleness(latestRow.scrapedAt);

    return c.json({
      code,
      stockName: latestRow.stockName,
      data: rows.map((r) => ({
        tradeDate: r.tradeDate,
        close: r.close,
        high: r.high,
        low: r.low,
        change: r.change,
        changePct: r.changePct,
        volume: r.volume,
      })),
      staleness,
    });
  });

  app.get("/:code/fundamentals", async (c) => {
    const code = c.req.param("code").toUpperCase();

    const rows = await deps.db
      .select()
      .from(financialRatios)
      .where(eq(financialRatios.code, code))
      .orderBy(desc(financialRatios.fsDate));

    if (rows.length === 0) {
      return c.json({ code, stockName: null, rows: [] });
    }

    const first = rows[0];
    return c.json({ code, stockName: first?.stockName ?? null, rows });
  });

  return app;
}
