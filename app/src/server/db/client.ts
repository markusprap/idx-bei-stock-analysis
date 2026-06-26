import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as financialRatiosSchema from "./schema";
import * as chatSchema from "./chat-schema";
import * as marketSchema from "./market-schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const queryClient = postgres(connectionString);

export const db = drizzle(queryClient, {
  schema: { ...financialRatiosSchema, ...chatSchema, ...marketSchema },
});
