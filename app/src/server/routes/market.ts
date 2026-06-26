import { Hono } from "hono";
import { desc, asc, eq, isNotNull, and, or, ilike, sql } from "drizzle-orm";
import type { db as DbClient } from "../db/client";
import { indexSummary, dailyTradeSummary } from "../db/market-schema";
import { financialRatios } from "../db/schema";

const SEARCH_LIMIT = 20;

const IHSG_CODE = "COMPOSITE";
const CHART_LIMIT = 30;
const TRENDING_LIMIT = 10;
const STALENESS_THRESHOLD_HOURS = 24;

function computeStaleness(scrapedAt: Date) {
  const ageMs = Date.now() - new Date(scrapedAt).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  return {
    scrapedAt,
    ageHours: Math.round(ageHours * 10) / 10,
    isStale: ageHours > STALENESS_THRESHOLD_HOURS,
  };
}

export function createMarketRoute(deps: { db: typeof DbClient }) {
  const app = new Hono();

  app.get("/ihsg", async (c) => {
    const rows = await deps.db
      .select()
      .from(indexSummary)
      .where(eq(indexSummary.indexCode, IHSG_CODE))
      .orderBy(desc(indexSummary.tradeDate))
      .limit(CHART_LIMIT);

    if (rows.length === 0) {
      return c.json({ data: [], staleness: null });
    }

    const mostRecentRow = rows[0];
    if (!mostRecentRow) return c.json({ data: [], staleness: null });

    return c.json({
      data: rows,
      staleness: computeStaleness(mostRecentRow.scrapedAt),
    });
  });

  app.get("/trending", async (c) => {
    const latestRows = await deps.db
      .select({ tradeDate: dailyTradeSummary.tradeDate })
      .from(dailyTradeSummary)
      .orderBy(desc(dailyTradeSummary.tradeDate))
      .limit(1);

    const latestRow = latestRows[0];
    if (!latestRow) {
      return c.json({ tradeDate: null, gainers: [], losers: [], topValue: [], topVolume: [], staleness: null });
    }

    const latestDate = latestRow.tradeDate;

    const activeStocks = and(
      eq(dailyTradeSummary.tradeDate, latestDate),
      isNotNull(dailyTradeSummary.close),
      sql`${dailyTradeSummary.close} > 0`,
    );

    const activeWithChangePct = and(activeStocks, isNotNull(dailyTradeSummary.changePct));

    const [gainers, losers, topValue, topVolume] = await Promise.all([
      deps.db.select().from(dailyTradeSummary).where(activeWithChangePct).orderBy(desc(dailyTradeSummary.changePct)).limit(TRENDING_LIMIT),
      deps.db.select().from(dailyTradeSummary).where(activeWithChangePct).orderBy(asc(dailyTradeSummary.changePct)).limit(TRENDING_LIMIT),
      deps.db.select().from(dailyTradeSummary).where(activeStocks).orderBy(desc(dailyTradeSummary.value)).limit(TRENDING_LIMIT),
      deps.db.select().from(dailyTradeSummary).where(activeStocks).orderBy(desc(dailyTradeSummary.volume)).limit(TRENDING_LIMIT),
    ]);

    const scrapedAtRow = await deps.db
      .select({ scrapedAt: dailyTradeSummary.scrapedAt })
      .from(dailyTradeSummary)
      .where(eq(dailyTradeSummary.tradeDate, latestDate))
      .orderBy(desc(dailyTradeSummary.scrapedAt))
      .limit(1);

    const staleness = scrapedAtRow[0] ? computeStaleness(scrapedAtRow[0].scrapedAt) : null;

    return c.json({ tradeDate: latestDate, gainers, losers, topValue, topVolume, staleness });
  });

  app.get("/search", async (c) => {
    const q = c.req.query("q")?.trim() ?? "";
    if (!q) return c.json({ results: [], query: "" });

    const results = await deps.db
      .selectDistinct({ code: financialRatios.code, stockName: financialRatios.stockName })
      .from(financialRatios)
      .where(
        and(
          sql`length(${financialRatios.code}) = 4`,
          or(
            ilike(financialRatios.code, `%${q}%`),
            ilike(financialRatios.stockName, `%${q}%`),
          ),
        ),
      )
      .orderBy(financialRatios.code)
      .limit(SEARCH_LIMIT);

    return c.json({ results, query: q });
  });

  return app;
}
