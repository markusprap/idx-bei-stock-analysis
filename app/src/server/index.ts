import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { createChatRoute } from "./routes/chat";
import { db } from "./db/client";
import { llm } from "./llm/client";

const app = new Hono();

app.route("/", createChatRoute({ db, llm }));

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
