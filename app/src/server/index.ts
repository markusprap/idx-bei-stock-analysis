import { Hono } from "hono";
import { serveStatic } from "hono/bun";

const app = new Hono();

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
