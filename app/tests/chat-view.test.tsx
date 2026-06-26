import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { indexRoute, routeTree } from "../src/web/router";
import { ChatRoute } from "../src/web/routes/chat";
import { db } from "../src/server/db/client";
import { chatThreads, chatMessages } from "../src/server/db/chat-schema";
import { createThread, appendMessage } from "../src/server/routes/chat-history";

async function renderAtPath(path: string): Promise<string> {
  const queryClient = new QueryClient();
  const testRouter = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await testRouter.load();

  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={testRouter} />
    </QueryClientProvider>,
  );
}

describe("default route", () => {
  test("index route ('/') is wired to the Chat view, not Search/Watchlist", () => {
    expect(indexRoute.path).toBe("/");
    expect(indexRoute.options.component).toBe(ChatRoute);
  });

  test("Chat view renders its empty-state copy when no thread is active", async () => {
    const html = await renderAtPath("/");

    expect(html).toContain("Mau tanya soal saham apa hari ini?");
    expect(html).toContain("Sahamigo menyajikan data, bukan rekomendasi");
  });
});

describe("AC 3 — index opens to a new/empty Chat even with real persisted history (Story 1.1 review follow-up, Murat)", () => {
  test("seeded chat history in Postgres is not auto-resumed at '/'", async () => {
    await db.delete(chatMessages);
    await db.delete(chatThreads);

    const thread = await createThread(db, "Riwayat lama soal BBCA");
    await appendMessage(db, thread.id, "user", "Gimana valuasi BBCA?");
    await appendMessage(db, thread.id, "assistant", "PER-nya 22.38, menurut kamu gimana?");

    const html = await renderAtPath("/");

    expect(html).toContain("Mau tanya soal saham apa hari ini?");
    expect(html).not.toContain("Riwayat lama soal BBCA");
    expect(html).not.toContain("PER-nya 22.38");
  });
});

describe("ticker chip — context handoff from stock detail (Story 2.7)", () => {
  test("renders ticker chip and context label when /?ticker=BBCA", async () => {
    const html = await renderAtPath("/?ticker=BBCA");
    expect(html).toContain("chat-ticker-chip");
    expect(html).toContain("BBCA");
    expect(html).toContain("chat-ticker-context-label");
  });

  test("does not render ticker context bar when no ticker in URL", async () => {
    const html = await renderAtPath("/");
    expect(html).not.toContain("chat-ticker-context");
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
