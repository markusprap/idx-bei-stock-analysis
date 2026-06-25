import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
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

describe("Golden Rule — no visual verdict element (AC 2, Story 1.3)", () => {
  test("ChatView markup and styles carry no badge/color/icon tied to a buy/sell/hold verdict", () => {
    const tsx = readFileSync(
      new URL("../src/web/components/chat/ChatView.tsx", import.meta.url),
      "utf-8",
    );
    const css = readFileSync(
      new URL("../src/web/components/chat/ChatView.css", import.meta.url),
      "utf-8",
    );
    const forbidden = /\b(buy|sell|verdict|badge|beli|jual|tahan)\b/i;

    expect(forbidden.test(tsx)).toBe(false);
    expect(forbidden.test(css)).toBe(false);
  });
});
