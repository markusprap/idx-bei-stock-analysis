CREATE TABLE "daily_trade_summary" (
	"stock_code" text NOT NULL,
	"trade_date" date NOT NULL,
	"stock_name" text,
	"previous" double precision,
	"open_price" double precision,
	"high" double precision,
	"low" double precision,
	"close" double precision,
	"change" double precision,
	"change_pct" double precision,
	"volume" double precision,
	"value" double precision,
	"frequency" double precision,
	"scraped_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_trade_summary_stock_code_trade_date_pk" PRIMARY KEY("stock_code","trade_date")
);
