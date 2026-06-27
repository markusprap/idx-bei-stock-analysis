import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { createChatRoute } from "./routes/chat";
import { createMarketRoute } from "./routes/market";
import { createStockRoute } from "./routes/stock";
import { createScreenerRoute } from "./routes/screener";
import { db } from "./db/client";
import { llm } from "./llm/client";

const app = new Hono();

app.route("/", createChatRoute({ db, llm }));
app.route("/api/market", createMarketRoute({ db }));
app.route("/api/stock", createStockRoute({ db }));
app.route("/api/screener", createScreenerRoute({ db }));

const isProd = process.env.NODE_ENV === "production";

if (isProd) {
  app.use("/*", serveStatic({ root: "./dist" }));
  app.get("*", serveStatic({ path: "./dist/index.html" }));
}

const port = Number(process.env.PORT ?? 3000);

export default {
  fetch: app.fetch,
  port,
};
