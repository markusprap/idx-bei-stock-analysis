import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/db/chat-schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
