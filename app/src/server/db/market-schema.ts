import { pgTable, text, date, doublePrecision, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";

export const indexSummary = pgTable(
  "index_summary",
  {
    indexCode: text("index_code").notNull(),
    tradeDate: date("trade_date").notNull(),
    previous: doublePrecision("previous"),
    highest: doublePrecision("highest"),
    lowest: doublePrecision("lowest"),
    close: doublePrecision("close"),
    change: doublePrecision("change"),
    volume: doublePrecision("volume"),
    value: doublePrecision("value"),
    frequency: doublePrecision("frequency"),
    marketCapital: doublePrecision("market_capital"),
    numberOfStock: integer("number_of_stock"),
    scrapedAt: timestamp("scraped_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.indexCode, table.tradeDate] })],
);

export type IndexSummaryRow = typeof indexSummary.$inferSelect;
