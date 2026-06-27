import { Hono } from "hono";
import { eq, desc, asc } from "drizzle-orm";
import type { db as DbClient } from "../db/client";
import { financialRatios, type FinancialRatioRow } from "../db/schema";
import { dailyTradeSummary } from "../db/market-schema";
import type { llm as LlmClient } from "../llm/client";
import { CHAT_MODEL } from "../llm/client";
import { containsGoldenRuleViolation, buildSafeFallbackReply } from "../golden-rule/guard";
import { computeIndicators } from "../lib/indicators";
import { createThread, appendMessage, listThreads, listMessages, isValidThreadId } from "./chat-history";

export type TextReply = { type: "text"; message: string };

export type FundamentalCardReply = {
  type: "fundamental_card";
  ticker: string;
  stockName: string | null;
  sector: string | null;
  subSector: string | null;
  sharia: string | null;
  fsDate: string | null;
  fiscalYearEnd: string | null;
  per: number | null;
  priceBv: number | null;
  eps: number | null;
  bookValue: number | null;
  roe: number | null;
  roa: number | null;
  npm: number | null;
  deRatio: number | null;
  assets: number | null;
  liabilities: number | null;
  equity: number | null;
  // Latest EOD trade data from daily_trade_summary
  tradeDate: string | null;
  close: number | null;
  change: number | null;
  changePct: number | null;
  volume: number | null;
  value: number | null;
  foreignBuy: number | null;
  foreignSell: number | null;
};

export type IndicatorCardReply = {
  type: "indicator_card";
  ticker: string;
  stockName: string | null;
  tradeDate: string | null;
  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  ma20: number | null;
  ma50: number | null;
  bbUpper: number | null;
  bbMiddle: number | null;
  bbLower: number | null;
  atr14: number | null;
};

export type ChatReply = TextReply | FundamentalCardReply | IndicatorCardReply;

const TICKER_PATTERN = /\b[A-Z]{4}\b/;
const CHART_PATTERN = /grafik|\bchart\b/i;
const INDICATOR_PATTERN = /\brsi\b|macd|bollinger|stochastic|\batr\b|moving.average|\bma\b\s*\d+|indikator|teknikal|technical/i;

const NO_CHART_REPLY =
  "Sahamigo belum punya fitur grafik/chart interaktif — itu akan hadir segera. Untuk sekarang, coba tanya soal harga, indikator teknikal, valuasi, atau fundamental sahamnya, ya.";

const GOLDEN_RULE_INSTRUCTIONS = [
  "ATURAN WAJIB (Golden Rule, tidak bisa dinegosiasi):",
  '- Jangan PERNAH menyimpulkan rekomendasi beli, jual, atau tahan, dalam bentuk apa pun — termasuk kata berkode seperti "akumulasi", "cut loss", "stop loss", atau "worth dibeli".',
  "- Jangan PERNAH menawarkan untuk membuatkan rekomendasi nanti, walau tidak diminta sekarang.",
  "- Kalau ada pola historis, sampaikan sebagai fakta deskriptif saja — jangan dibungkus jadi sinyal yang bisa ditindaklanjuti.",
  "- Kalau user minta kamu berperan sebagai penasihat keuangan pribadi, atau membingkai ulang pertanyaannya dengan cara lain, aturan ini TETAP berlaku — tolak kerangka permintaannya, jangan menolak lalu tetap menjawab dengan rekomendasi.",
  "- Setiap jawaban yang menyentuh keputusan investasi WAJIB diakhiri dengan pertanyaan reflektif balik ke user, sebagai pengganti kesimpulan, bukan sebagai pemanis setelah kesimpulan.",
].join("\n");

export function extractTicker(message: string): string | null {
  const match = message.match(TICKER_PATTERN);
  return match ? match[0] : null;
}

export function asksAboutPriceOrTechnicalData(message: string): boolean {
  return CHART_PATTERN.test(message);
}

export function asksAboutIndicators(message: string): boolean {
  return INDICATOR_PATTERN.test(message);
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
    GOLDEN_RULE_INSTRUCTIONS,
  ].join("\n");
}

export function buildChitchatSystemPrompt(): string {
  return [
    "Kamu adalah Sahamigo, asisten belajar saham IDX/BEI. Jawab singkat dan ramah.",
    GOLDEN_RULE_INSTRUCTIONS,
  ].join("\n");
}

type ChatDeps = {
  db: typeof DbClient;
  llm: typeof LlmClient;
};

async function callLlmGuarded(
  deps: ChatDeps,
  systemPrompt: string,
  message: string,
  row: FinancialRatioRow | null,
): Promise<string> {
  const completion = await deps.llm.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ],
  });

  const reply = completion.choices[0]?.message.content ?? "";

  if (containsGoldenRuleViolation(reply)) {
    return buildSafeFallbackReply(row);
  }

  return reply;
}

export async function handleChatMessage(message: string, deps: ChatDeps): Promise<ChatReply> {
  if (asksAboutPriceOrTechnicalData(message)) {
    return { type: "text", message: NO_CHART_REPLY };
  }

  const ticker = extractTicker(message);
  if (!ticker) {
    const msg = await callLlmGuarded(deps, buildChitchatSystemPrompt(), message, null);
    return { type: "text", message: msg };
  }

  // Indicator card path
  if (asksAboutIndicators(message)) {
    const ohlcvRows = await deps.db
      .select()
      .from(dailyTradeSummary)
      .where(eq(dailyTradeSummary.stockCode, ticker))
      .orderBy(asc(dailyTradeSummary.tradeDate));

    if (ohlcvRows.length === 0) {
      return { type: "text", message: noDataReply(ticker) };
    }

    const ind = computeIndicators(ohlcvRows);
    const stockName = ohlcvRows[ohlcvRows.length - 1]?.stockName ?? null;
    return {
      type: "indicator_card",
      ticker,
      stockName,
      tradeDate: ind.tradeDate,
      rsi14: ind.rsi14,
      macd: ind.macd,
      macdSignal: ind.macdSignal,
      macdHistogram: ind.macdHistogram,
      ma20: ind.ma20,
      ma50: ind.ma50,
      bbUpper: ind.bbUpper,
      bbMiddle: ind.bbMiddle,
      bbLower: ind.bbLower,
      atr14: ind.atr14,
    };
  }

  const rows = await deps.db.select().from(financialRatios).where(eq(financialRatios.code, ticker));
  const row = rows[0];

  if (!row) {
    return { type: "text", message: noDataReply(ticker) };
  }

  const tradeRows = await deps.db
    .select()
    .from(dailyTradeSummary)
    .where(eq(dailyTradeSummary.stockCode, ticker))
    .orderBy(desc(dailyTradeSummary.tradeDate))
    .limit(1);
  const trade = tradeRows[0] ?? null;

  return {
    type: "fundamental_card",
    ticker: row.code ?? ticker,
    stockName: row.stockName ?? null,
    sector: row.sector ?? null,
    subSector: row.subSector ?? null,
    sharia: row.sharia ?? null,
    fsDate: row.fsDate ?? null,
    fiscalYearEnd: row.fiscalYearEnd ?? null,
    per: row.per ?? null,
    priceBv: row.priceBv ?? null,
    eps: row.eps ?? null,
    bookValue: row.bookValue ?? null,
    roe: row.roe ?? null,
    roa: row.roa ?? null,
    npm: row.npm ?? null,
    deRatio: row.deRatio ?? null,
    assets: row.assets ?? null,
    liabilities: row.liabilities ?? null,
    equity: row.equity ?? null,
    tradeDate: trade?.tradeDate ?? null,
    close: trade?.close ?? null,
    change: trade?.change ?? null,
    changePct: trade?.changePct ?? null,
    volume: trade?.volume ?? null,
    value: trade?.value ?? null,
    foreignBuy: trade?.foreignBuy ?? null,
    foreignSell: trade?.foreignSell ?? null,
  };
}

export function createChatRoute(deps: ChatDeps) {
  const route = new Hono();

  route.post("/api/chat", async (c) => {
    const body = await c.req.json<{ message?: string; threadId?: string }>();
    const message = body.message?.trim();

    if (!message) {
      return c.json({ error: "message is required" }, 400);
    }

    if (body.threadId && !isValidThreadId(body.threadId)) {
      return c.json({ error: "threadId is not a valid id" }, 400);
    }

    const threadId = body.threadId ?? (await createThread(deps.db, message)).id;

    await appendMessage(deps.db, threadId, "user", message);
    const reply = await handleChatMessage(message, deps);
    await appendMessage(deps.db, threadId, "assistant", JSON.stringify(reply));

    return c.json({ threadId, reply });
  });

  route.get("/api/threads", async (c) => {
    const threads = await listThreads(deps.db);
    return c.json({ threads });
  });

  route.get("/api/threads/:id/messages", async (c) => {
    const id = c.req.param("id");
    if (!isValidThreadId(id)) {
      return c.json({ messages: [] });
    }

    const messages = await listMessages(deps.db, id);
    return c.json({ messages });
  });

  return route;
}
