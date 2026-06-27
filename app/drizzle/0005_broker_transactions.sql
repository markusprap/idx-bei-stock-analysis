CREATE TABLE "broker_transactions" (
	"stock_code" text NOT NULL,
	"trade_date" date NOT NULL,
	"broker_code" text NOT NULL,
	"broker_name" text,
	"buy_volume" double precision,
	"buy_value" double precision,
	"sell_volume" double precision,
	"sell_value" double precision,
	"scraped_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "broker_transactions_pk" PRIMARY KEY("stock_code","trade_date","broker_code")
);
