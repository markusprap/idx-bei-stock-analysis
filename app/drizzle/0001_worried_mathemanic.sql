CREATE TABLE "index_summary" (
	"index_code" text NOT NULL,
	"trade_date" date NOT NULL,
	"previous" double precision,
	"highest" double precision,
	"lowest" double precision,
	"close" double precision,
	"change" double precision,
	"volume" double precision,
	"value" double precision,
	"frequency" double precision,
	"market_capital" double precision,
	"number_of_stock" integer,
	"scraped_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "index_summary_index_code_trade_date_pk" PRIMARY KEY("index_code","trade_date")
);
