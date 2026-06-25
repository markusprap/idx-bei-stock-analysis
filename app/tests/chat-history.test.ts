import { describe, expect, test, beforeEach, mock } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../src/server/db/client";
import { chatThreads, chatMessages } from "../src/server/db/chat-schema";
import { createThread, appendMessage, listThreads, listMessages } from "../src/server/routes/chat-history";
import { createChatRoute } from "../src/server/routes/chat";
import type { llm as LlmClient } from "../src/server/llm/client";

beforeEach(async () => {
  await db.delete(chatMessages);
  await db.delete(chatThreads);
});

function fakeLlm(reply: string) {
  const create = mock(async (_params: { messages: { content: string }[] }) => ({
    choices: [{ message: { content: reply } }],
  }));
  const llm = { chat: { completions: { create } } } as unknown as typeof LlmClient;
  return llm;
}

describe("createThread", () => {
  test("truncates a long first message into a title with an ellipsis", async () => {
    const thread = await createThread(
      db,
      "Gimana valuasi BBCA dibandingkan sama BBRI tahun ini, lebih murah yang mana ya kira-kira",
    );
    expect(thread.title?.endsWith("…")).toBe(true);
    expect(thread.title?.length).toBeLessThanOrEqual(51);
  });

  test("keeps a short message as the title, unmodified", async () => {
    const thread = await createThread(db, "Halo");
    expect(thread.title).toBe("Halo");
  });
});

describe("appendMessage", () => {
  test("inserts the message and bumps the parent thread's updatedAt", async () => {
    const thread = await createThread(db, "Halo");
    const before = thread.updatedAt.getTime();

    await new Promise((resolve) => setTimeout(resolve, 10));
    await appendMessage(db, thread.id, "user", "Halo");

    const [updated] = await db.select().from(chatThreads).where(eq(chatThreads.id, thread.id));
    expect(updated?.updatedAt.getTime()).toBeGreaterThan(before);
  });
});

describe("listThreads", () => {
  test("orders threads by updatedAt descending", async () => {
    const first = await createThread(db, "Thread pertama");
    await new Promise((resolve) => setTimeout(resolve, 10));
    const second = await createThread(db, "Thread kedua");

    const threads = await listThreads(db);
    expect(threads[0]?.id).toBe(second.id);
    expect(threads[1]?.id).toBe(first.id);
  });
});

describe("listMessages", () => {
  test("returns a thread's messages ordered by createdAt ascending", async () => {
    const thread = await createThread(db, "Halo");
    await appendMessage(db, thread.id, "user", "Pertanyaan 1");
    await appendMessage(db, thread.id, "assistant", "Jawaban 1");

    const messages = await listMessages(db, thread.id);
    expect(messages.map((m) => m.content)).toEqual(["Pertanyaan 1", "Jawaban 1"]);
  });

  test("returns an empty array for an unknown thread id, not an error", async () => {
    const messages = await listMessages(db, "00000000-0000-0000-0000-000000000000");
    expect(messages).toEqual([]);
  });
});

describe("POST /api/chat — thread persistence wiring", () => {
  test("with no threadId: creates a new thread and persists both messages", async () => {
    const route = createChatRoute({ db, llm: fakeLlm("Halo! Saya Sahamigo.") });

    const res = await route.request("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Halo, kamu siapa?" }),
    });
    const body = await res.json();

    expect(body.reply).toBe("Halo! Saya Sahamigo.");
    expect(typeof body.threadId).toBe("string");

    const messages = await listMessages(db, body.threadId);
    expect(messages.map((m) => ({ role: m.role, content: m.content }))).toEqual([
      { role: "user", content: "Halo, kamu siapa?" },
      { role: "assistant", content: "Halo! Saya Sahamigo." },
    ]);
  });

  test("with an existing threadId: appends to that thread instead of creating a new one", async () => {
    const route = createChatRoute({ db, llm: fakeLlm("Jawaban kedua.") });
    const existingThread = await createThread(db, "Thread yang sudah ada");
    await appendMessage(db, existingThread.id, "user", "Pertanyaan pertama");
    await appendMessage(db, existingThread.id, "assistant", "Jawaban pertama.");

    const res = await route.request("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Pertanyaan kedua", threadId: existingThread.id }),
    });
    const body = await res.json();

    expect(body.threadId).toBe(existingThread.id);

    const threadsAfter = await listThreads(db);
    expect(threadsAfter.length).toBe(1);

    const messages = await listMessages(db, existingThread.id);
    expect(messages.length).toBe(4);
  });
});

describe("GET /api/threads", () => {
  test("returns threads ordered by most recently active", async () => {
    const route = createChatRoute({ db, llm: fakeLlm("unused") });
    const first = await createThread(db, "Thread lama");
    await new Promise((resolve) => setTimeout(resolve, 10));
    const second = await createThread(db, "Thread baru");

    const res = await route.request("/api/threads");
    const body = await res.json();

    expect(body.threads[0].id).toBe(second.id);
    expect(body.threads[1].id).toBe(first.id);
  });
});

describe("GET /api/threads/:id/messages", () => {
  test("returns an empty array for an unknown thread id (200, not 404)", async () => {
    const route = createChatRoute({ db, llm: fakeLlm("unused") });

    const res = await route.request("/api/threads/00000000-0000-0000-0000-000000000000/messages");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.messages).toEqual([]);
  });

  test("returns an empty array (not a 500) for a malformed, non-UUID thread id", async () => {
    const route = createChatRoute({ db, llm: fakeLlm("unused") });

    const res = await route.request("/api/threads/not-a-uuid/messages");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.messages).toEqual([]);
  });
});

describe("POST /api/chat — malformed threadId", () => {
  test("rejects a non-UUID threadId with 400 instead of crashing", async () => {
    const route = createChatRoute({ db, llm: fakeLlm("unused") });

    const res = await route.request("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Halo", threadId: "not-a-uuid" }),
    });

    expect(res.status).toBe(400);
  });
});
