import json
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
import psycopg2

load_dotenv()

PG_CONFIG = {
    "host": os.getenv("POSTGRES_HOST", "localhost"),
    "port": int(os.getenv("POSTGRES_PORT", 5432)),
    "database": os.getenv("POSTGRES_DB", "postgres"),
    "user": os.getenv("POSTGRES_USER", "postgres"),
    "password": os.getenv("POSTGRES_PASSWORD", ""),
}

INPUT_FILE = os.path.join(os.path.dirname(__file__), "index_summary.json")

UPSERT_SQL = """
INSERT INTO index_summary (
    index_code, trade_date, previous, highest, lowest, close, change,
    volume, value, frequency, market_capital, number_of_stock, scraped_at
) VALUES (
    %(index_code)s, %(trade_date)s, %(previous)s, %(highest)s, %(lowest)s,
    %(close)s, %(change)s, %(volume)s, %(value)s, %(frequency)s,
    %(market_capital)s, %(number_of_stock)s, %(scraped_at)s
)
ON CONFLICT (index_code, trade_date) DO UPDATE SET
    previous      = EXCLUDED.previous,
    highest       = EXCLUDED.highest,
    lowest        = EXCLUDED.lowest,
    close         = EXCLUDED.close,
    change        = EXCLUDED.change,
    volume        = EXCLUDED.volume,
    value         = EXCLUDED.value,
    frequency     = EXCLUDED.frequency,
    market_capital = EXCLUDED.market_capital,
    number_of_stock = EXCLUDED.number_of_stock,
    scraped_at    = EXCLUDED.scraped_at;
"""


def parse_trade_date(raw: str) -> str:
    return raw[:10]


def load_json(path: str) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        payload = json.load(f)
    return payload.get("data", [])


def upsert_rows(conn: psycopg2.extensions.connection, rows: list[dict], scraped_at: datetime) -> int:
    with conn.cursor() as cur:
        count = 0
        for row in rows:
            cur.execute(
                UPSERT_SQL,
                {
                    "index_code": row["IndexCode"],
                    "trade_date": parse_trade_date(row["Date"]),
                    "previous": row.get("Previous"),
                    "highest": row.get("Highest"),
                    "lowest": row.get("Lowest"),
                    "close": row.get("Close"),
                    "change": row.get("Change"),
                    "volume": row.get("Volume"),
                    "value": row.get("Value"),
                    "frequency": row.get("Frequency"),
                    "market_capital": row.get("MarketCapital"),
                    "number_of_stock": row.get("NumberOfStock"),
                    "scraped_at": scraped_at,
                },
            )
            count += 1
    conn.commit()
    return count


def main() -> None:
    print(f"Reading {INPUT_FILE}...")
    rows = load_json(INPUT_FILE)
    print(f"Loaded {len(rows)} index rows")

    scraped_at = datetime.now(tz=timezone.utc)

    conn = psycopg2.connect(**PG_CONFIG)
    try:
        count = upsert_rows(conn, rows, scraped_at)
        print(f"Upserted {count} rows into index_summary (scraped_at={scraped_at.isoformat()})")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
