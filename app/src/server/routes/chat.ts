import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { db as DbClient } from "../db/client";
import { financialRatios, type FinancialRatioRow } from "../db/schema";
import type { llm as LlmClient } from "../llm/client";
import { CHAT_MODEL } from "../llm/client";

const TICKER_PATTERN = /\b[A-Z]{4}\b/;
const PRICE_OR_TECHNICAL_PATTERN =
  /harga|price|grafik|\bchart\b|ohlc|volume|\brsi\b|macd|bollinger|stochastic|teknikal|technical/i;

const NO_PRICE_DATA_REPLY =
  "Sahamigo belum punya data harga, grafik, atau indikator teknikal — sumber data kami baru mencakup data fundamental/valuasi (PER, PBV, ROE, dan sejenisnya). Coba tanya soal valuasi atau fundamental sahamnya, ya.";

export function extractTicker(message: string): string | null {
  const match = message.match(TICKER_PATTERN);
  return match ? match[0] : null;
}

export function asksAboutPriceOrTechnicalData(message: string): boolean {
  return PRICE_OR_TECHNICAL_PATTERN.test(message);
}

export function noDataReply(ticker: string): string {
  return `Sahamigo belum punya data fundamental/valuasi untuk ticker ${ticker} di data store kami. Coba ticker IDX lain, atau cek lagi penulisannya.`;
}

export function buildSystemPrompt(row: FinancialRatioRow): string {
  return [
    "Kamu adalah Sahamigo, asisten belajar saham IDX/BEI.",
    "Jawab HANYA berdasarkan data berikut, jangan mengarang angka:",
    JSON.stringify(row),
    "Data ini adalah data fundamental/valuasi EOD (end-of-day), bukan data realtime.",
  ].join("\n");
}

type ChatDeps = {
  db: typeof DbClient;
  llm: typeof LlmClient;
};

export async function handleChatMessage(message: string, deps: ChatDeps): Promise<string> {
  if (asksAboutPriceOrTechnicalData(message)) {
    return NO_PRICE_DATA_REPLY;
  }

  const ticker = extractTicker(message);
  if (!ticker) {
    const completion = await deps.llm.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        {
          role: "system",
          content: "Kamu adalah Sahamigo, asisten belajar saham IDX/BEI. Jawab singkat dan ramah.",
        },
        { role: "user", content: message },
      ],
    });
    return completion.choices[0]?.message.content ?? "";
  }

  const rows = await deps.db.select().from(financialRatios).where(eq(financialRatios.code, ticker));
  const row = rows[0];

  if (!row) {
    return noDataReply(ticker);
  }

  const completion = await deps.llm.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: buildSystemPrompt(row) },
      { role: "user", content: message },
    ],
  });

  return completion.choices[0]?.message.content ?? "";
}

export function createChatRoute(deps: ChatDeps) {
  const route = new Hono();

  route.post("/api/chat", async (c) => {
    const body = await c.req.json<{ message?: string }>();
    const message = body.message?.trim();

    if (!message) {
      return c.json({ error: "message is required" }, 400);
    }

    const reply = await handleChatMessage(message, deps);
    return c.json({ reply });
  });

  return route;
}
