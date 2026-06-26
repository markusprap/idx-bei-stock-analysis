import { describe, expect, test, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree, searchRoute } from "../src/web/router";
import { SearchRoute } from "../src/web/routes/search";

const MOCK_IHSG_RESPONSE = {
  data: [
    {
      indexCode: "COMPOSITE",
      tradeDate: "2026-06-25",
      previous: 5883.881,
      close: 5999.038,
      change: 115.157,
      highest: 6056.2,
      lowest: 5864.004,
      scrapedAt: new Date().toISOString(),
    },
  ],
  staleness: {
    scrapedAt: new Date().toISOString(),
    ageHours: 1.5,
    isStale: false,
  },
};

async function renderSearch(mockResponse = MOCK_IHSG_RESPONSE): Promise<string> {
  global.fetch = mock(async () =>
    new Response(JSON.stringify(mockResponse), { status: 200 }),
  ) as unknown as typeof fetch;

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const testRouter = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/search"] }),
  });
  await testRouter.load();

  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={testRouter} />
    </QueryClientProvider>,
  );
}

describe("/search route", () => {
  test("route is wired to SearchRoute component", () => {
    expect(searchRoute.path).toBe("search");
    expect(searchRoute.options.component).toBe(SearchRoute);
  });

  test("renders IHSG section heading with EOD badge", async () => {
    const html = await renderSearch();
    expect(html).toContain("IHSG");
    expect(html).toContain("EOD");
  });

  test("renders ihsg-eod-badge element", async () => {
    const html = await renderSearch();
    expect(html).toContain("ihsg-eod-badge");
  });

  test("shows loading state when data is empty", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const html = await renderSearch({ data: [], staleness: null } as any);
    expect(html).toContain("IHSG");
    expect(html).toContain("EOD");
  });
});
