import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { indexRoute } from "../src/web/router";
import { ChatRoute } from "../src/web/routes/chat";

describe("default route", () => {
  test("index route ('/') is wired to the Chat view, not Search/Watchlist", () => {
    expect(indexRoute.path).toBe("/");
    expect(indexRoute.options.component).toBe(ChatRoute);
  });

  test("Chat view renders its empty-state copy", () => {
    const queryClient = new QueryClient();
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <ChatRoute />
      </QueryClientProvider>,
    );

    expect(html).toContain("Mau tanya soal saham apa hari ini?");
    expect(html).toContain("Sahamigo menyajikan data, bukan rekomendasi");
  });
});
