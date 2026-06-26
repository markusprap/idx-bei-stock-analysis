import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import type { db as DbClient } from "../db/client";
import { indexSummary } from "../db/market-schema";

const IHSG_CODE = "COMPOSITE";
const CHART_LIMIT = 30;
const STALENESS_THRESHOLD_HOURS = 24;

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
    const mostRecentScrapedAt = mostRecentRow.scrapedAt;
    const ageMs = Date.now() - new Date(mostRecentScrapedAt).getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    return c.json({
      data: rows,
      staleness: {
        scrapedAt: mostRecentScrapedAt,
        ageHours: Math.round(ageHours * 10) / 10,
        isStale: ageHours > STALENESS_THRESHOLD_HOURS,
      },
    });
  });

  return app;
}
