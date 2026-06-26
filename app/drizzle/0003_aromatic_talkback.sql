CREATE TABLE "market_news" (
	"news_id" integer PRIMARY KEY NOT NULL,
	"published_date" timestamp,
	"title" text,
	"summary" text,
	"tags" text,
	"image_url" text,
	"is_headline" boolean DEFAULT false,
	"scraped_at" timestamp with time zone DEFAULT now() NOT NULL
);
