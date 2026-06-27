import { describe, expect, test, beforeEach, afterAll } from "bun:test";
import { db } from "../src/server/db/client";
import { financialRatios } from "../src/server/db/schema";
import { createScreenerRoute } from "../src/server/routes/screener";
import { inArray } from "drizzle-orm";

const app = createScreenerRoute({ db });

const TEST_CODES = ["SCRA", "SCRB", "SCRC", "SCRD"];

function makeRow(code: string, overrides: Partial<typeof financialRatios.$inferInsert> = {}) {
  return {
    code,
    stockName: `${code} Tbk.`,
    sector: "Keuangan",
    fsDate: "2024-12-31",
    per: 15.0,
    priceBv: 2.0,
    roe: 12.0,
    roa: 2.0,
    npm: 25.0,
    eps: 500.0,
    assets: 1e14,
    liabilities: 8e13,
    equity: 2e13,
    sales: 5e13,
    ...overrides,
  };
}

beforeEach(async () => {
  await db.delete(financialRatios).where(inArray(financialRatios.code, TEST_CODES));
});

afterAll(async () => {
  await db.delete(financialRatios).where(inArray(financialRatios.code, TEST_CODES));
});

describe("GET /fundamental", () => {
  test("returns results without any filters", async () => {
    await db.insert(financialRatios).values([makeRow("SCRA")]);

    const res = await app.request("/fundamental");
    expect(res.status).toBe(200);
    const body = await res.json() as { results: unknown[]; total: number };
    expect(body.total).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(body.results)).toBe(true);
  });

  test("filters by per_min", async () => {
    await db.insert(financialRatios).values([
      makeRow("SCRA", { per: 10 }),
      makeRow("SCRB", { per: 25 }),
    ]);

    const res = await app.request("/fundamental?per_min=20");
    const body = await res.json() as { results: { code: string | null }[] };
    const codes = body.results.map((r) => r.code);
    expect(codes).toContain("SCRB");
    expect(codes).not.toContain("SCRA");
  });

  test("filters by per_max", async () => {
    await db.insert(financialRatios).values([
      makeRow("SCRA", { per: 10 }),
      makeRow("SCRB", { per: 25 }),
    ]);

    const res = await app.request("/fundamental?per_max=15");
    const body = await res.json() as { results: { code: string | null }[] };
    const codes = body.results.map((r) => r.code);
    expect(codes).toContain("SCRA");
    expect(codes).not.toContain("SCRB");
  });

  test("filters by roe_min", async () => {
    await db.insert(financialRatios).values([
      makeRow("SCRA", { roe: 5 }),
      makeRow("SCRB", { roe: 20 }),
    ]);

    const res = await app.request("/fundamental?roe_min=15");
    const body = await res.json() as { results: { code: string | null }[] };
    const codes = body.results.map((r) => r.code);
    expect(codes).toContain("SCRB");
    expect(codes).not.toContain("SCRA");
  });

  test("filters by sector (case-insensitive)", async () => {
    await db.insert(financialRatios).values([
      makeRow("SCRA", { sector: "Keuangan" }),
      makeRow("SCRB", { sector: "Energi" }),
    ]);

    const res = await app.request("/fundamental?sector=keuangan");
    const body = await res.json() as { results: { code: string | null }[] };
    const codes = body.results.map((r) => r.code);
    expect(codes).toContain("SCRA");
    expect(codes).not.toContain("SCRB");
  });

  test("combines multiple filters (AND)", async () => {
    await db.insert(financialRatios).values([
      makeRow("SCRA", { per: 12, roe: 18 }),
      makeRow("SCRB", { per: 12, roe: 8 }),
      makeRow("SCRC", { per: 30, roe: 18 }),
    ]);

    const res = await app.request("/fundamental?per_max=15&roe_min=15");
    const body = await res.json() as { results: { code: string | null }[] };
    const codes = body.results.map((r) => r.code);
    expect(codes).toContain("SCRA");
    expect(codes).not.toContain("SCRB");
    expect(codes).not.toContain("SCRC");
  });

  test("excludes rows that don't match the filter", async () => {
    await db.insert(financialRatios).values([makeRow("SCRA", { per: 50 })]);

    // per_max=5 should exclude SCRA (per=50) even if other real rows pass through
    const res = await app.request("/fundamental?per_max=5");
    const body = await res.json() as { results: { code: string | null }[] };
    const codes = body.results.map((r) => r.code);
    expect(codes).not.toContain("SCRA");
  });

  test("result rows contain expected fields", async () => {
    await db.insert(financialRatios).values([makeRow("SCRD")]);

    const res = await app.request("/fundamental");
    const body = await res.json() as { results: Record<string, unknown>[] };
    const row = body.results.find((r) => r.code === "SCRD");
    expect(row).toBeDefined();
    expect(row).toHaveProperty("code");
    expect(row).toHaveProperty("stockName");
    expect(row).toHaveProperty("sector");
    expect(row).toHaveProperty("per");
    expect(row).toHaveProperty("roe");
    expect(row).toHaveProperty("roa");
    expect(row).not.toHaveProperty("verdict");
    expect(row).not.toHaveProperty("recommendation");
  });
});
