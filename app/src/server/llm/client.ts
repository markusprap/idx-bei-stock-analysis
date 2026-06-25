import OpenAI from "openai";

const apiKey = process.env.SUMOPOD_API_KEY;
if (!apiKey) {
  throw new Error("SUMOPOD_API_KEY is not set");
}

export const llm = new OpenAI({
  baseURL: process.env.SUMOPOD_BASE_URL ?? "https://ai.sumopod.com/v1",
  apiKey,
});

export const CHAT_MODEL = "gpt-5-mini";
