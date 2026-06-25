import { desc, eq, asc } from "drizzle-orm";
import type { db as DbClient } from "../db/client";
import { chatThreads, chatMessages, type ChatThreadRow } from "../db/chat-schema";

const THREAD_TITLE_MAX_LENGTH = 50;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidThreadId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function deriveTitle(firstMessage: string): string {
  const trimmed = firstMessage.trim();
  return trimmed.length > THREAD_TITLE_MAX_LENGTH
    ? `${trimmed.slice(0, THREAD_TITLE_MAX_LENGTH)}…`
    : trimmed;
}

export async function createThread(
  db: typeof DbClient,
  firstMessage: string,
): Promise<ChatThreadRow> {
  const [thread] = await db
    .insert(chatThreads)
    .values({ title: deriveTitle(firstMessage) })
    .returning();

  if (!thread) {
    throw new Error("Insert into chat_threads did not return the new row");
  }

  return thread;
}

export async function appendMessage(
  db: typeof DbClient,
  threadId: string,
  role: "user" | "assistant",
  content: string,
): Promise<void> {
  await db.insert(chatMessages).values({ threadId, role, content });
  await db.update(chatThreads).set({ updatedAt: new Date() }).where(eq(chatThreads.id, threadId));
}

export async function listThreads(
  db: typeof DbClient,
): Promise<{ id: string; title: string | null; updatedAt: Date }[]> {
  return db
    .select({
      id: chatThreads.id,
      title: chatThreads.title,
      updatedAt: chatThreads.updatedAt,
    })
    .from(chatThreads)
    .orderBy(desc(chatThreads.updatedAt));
}

export async function listMessages(
  db: typeof DbClient,
  threadId: string,
): Promise<{ id: string; role: string; content: string; createdAt: Date }[]> {
  return db
    .select({
      id: chatMessages.id,
      role: chatMessages.role,
      content: chatMessages.content,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(eq(chatMessages.threadId, threadId))
    .orderBy(asc(chatMessages.createdAt));
}
