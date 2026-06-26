import { Hono } from "hono";
import { and, gte, lte, isNotNull, sql } from "drizzle-orm";
import type { db as DbClient } from "../db/client";
import { financialRatios } from "../db/schema";

const MAX_RESULTS = 100;

export function createScreenerRoute(deps: { db: typeof DbClient }) {
  const app = new Hono();

  app.get("/fundamental", async (c) => {
    const perMin = c.req.query("per_min") ? Number(c.req.query("per_min")) : null;
    const perMax = c.req.query("per_max") ? Number(c.req.query("per_max")) : null;
    const pbvMin = c.req.query("pbv_min") ? Number(c.req.query("pbv_min")) : null;
    const pbvMax = c.req.query("pbv_max") ? Number(c.req.query("pbv_max")) : null;
    const roeMin = c.req.query("roe_min") ? Number(c.req.query("roe_min")) : null;
    const roaMin = c.req.query("roa_min") ? Number(c.req.query("roa_min")) : null;
    const sector = c.req.query("sector") ?? null;

    const conditions = [
      isNotNull(financialRatios.code),
      isNotNull(financialRatios.per),
    ];

    if (perMin !== null && !Number.isNaN(perMin)) conditions.push(gte(financialRatios.per, perMin));
    if (perMax !== null && !Number.isNaN(perMax)) conditions.push(lte(financialRatios.per, perMax));
    if (pbvMin !== null && !Number.isNaN(pbvMin)) conditions.push(gte(financialRatios.priceBv, pbvMin));
    if (pbvMax !== null && !Number.isNaN(pbvMax)) conditions.push(lte(financialRatios.priceBv, pbvMax));
    if (roeMin !== null && !Number.isNaN(roeMin)) conditions.push(gte(financialRatios.roe, roeMin));
    if (roaMin !== null && !Number.isNaN(roaMin)) conditions.push(gte(financialRatios.roa, roaMin));
    if (sector) conditions.push(sql`lower(${financialRatios.sector}) = lower(${sector})`);

    const rows = await deps.db
      .select({
        code: financialRatios.code,
        stockName: financialRatios.stockName,
        sector: financialRatios.sector,
        fsDate: financialRatios.fsDate,
        per: financialRatios.per,
        priceBv: financialRatios.priceBv,
        roe: financialRatios.roe,
        roa: financialRatios.roa,
        npm: financialRatios.npm,
        eps: financialRatios.eps,
      })
      .from(financialRatios)
      .where(and(...conditions))
      .limit(MAX_RESULTS);

    return c.json({ results: rows, total: rows.length });
  });

  return app;
}
