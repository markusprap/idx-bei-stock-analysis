import { describe, expect, test, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree, stockDetailRoute } from "../src/web/router";
import { StockDetailRoute } from "../src/web/routes/stock-detail";

const MOCK_CHART_RESPONSE = {
  code: "BBCA",
  stockName: "Bank Central Asia Tbk.",
  data: [],
  staleness: null,
};

const MOCK_FUNDAMENTALS_RESPONSE = {
  code: "BBCA",
  stockName: "Bank Central Asia Tbk.",
  rows: [],
};

async function renderStockDetail(
  code = "BBCA",
  mockChart: unknown = MOCK_CHART_RESPONSE,
  mockFundamentals: unknown = MOCK_FUNDAMENTALS_RESPONSE,
): Promise<string> {
  global.fetch = mock(async (url: RequestInfo | URL) => {
    const urlStr = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
    if (urlStr.includes("/fundamentals")) {
      return new Response(JSON.stringify(mockFundamentals), { status: 200 });
    }
    if (urlStr.includes("/chart")) {
      return new Response(JSON.stringify(mockChart), { status: 200 });
    }
    return new Response(JSON.stringify({}), { status: 200 });
  }) as unknown as typeof fetch;

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const testRouter = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [`/stock/${code}`] }),
  });
  await testRouter.load();

  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={testRouter} />
    </QueryClientProvider>,
  );
}

describe("/stock/:code route", () => {
  test("route is wired to StockDetailRoute component", () => {
    expect(stockDetailRoute.fullPath).toBe("/stock/$code");
    expect(stockDetailRoute.options.component).toBe(StockDetailRoute);
  });

  test("renders stock code in header", async () => {
    const html = await renderStockDetail("BBCA");
    expect(html).toContain("BBCA");
  });

  test("renders price chart section with EOD badge", async () => {
    const html = await renderStockDetail();
    expect(html).toContain("price-chart");
    expect(html).toContain("Grafik Harga");
    expect(html).toContain("EOD");
  });

  test("renders timeframe selector buttons", async () => {
    const html = await renderStockDetail();
    expect(html).toContain("1B");
    expect(html).toContain("3B");
    expect(html).toContain("1T");
  });

  test("renders fundamentals section with (Tahunan) label", async () => {
    const html = await renderStockDetail();
    expect(html).toContain("fundamentals-table");
    expect(html).toContain("Fundamental");
    expect(html).toContain("Tahunan");
  });

  test("renders chart loading state before query resolves", async () => {
    const html = await renderStockDetail();
    expect(html).toContain("Memuat grafik");
  });

  test("renders fundamentals loading state before query resolves", async () => {
    const html = await renderStockDetail();
    expect(html).toContain("Memuat data fundamental");
  });

  test("renders back button", async () => {
    const html = await renderStockDetail();
    expect(html).toContain("Kembali");
  });

  test("renders 'Tanya AI soal saham ini' CTA button with no buy/sell affordance", async () => {
    const html = await renderStockDetail();
    expect(html).toContain("stock-detail-cta-btn");
    expect(html).toContain("Tanya AI soal saham ini");
    expect(html).not.toMatch(/\b(beli|jual|buy|sell)\b/i);
  });
});
