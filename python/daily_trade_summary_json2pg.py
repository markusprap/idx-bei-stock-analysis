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

INPUT_FILE = os.path.join(os.path.dirname(__file__), "../data/companySummaryByKodeEmiten.json")

UPSERT_SQL = """
INSERT INTO daily_trade_summary (
    stock_code, trade_date, stock_name, previous, open_price,
    high, low, close, change, change_pct,
    volume, value, frequency, scraped_at
) VALUES (
    %(stock_code)s, %(trade_date)s, %(stock_name)s, %(previous)s, %(open_price)s,
    %(high)s, %(low)s, %(close)s, %(change)s, %(change_pct)s,
    %(volume)s, %(value)s, %(frequency)s, %(scraped_at)s
)
ON CONFLICT (stock_code, trade_date) DO UPDATE SET
    stock_name   = EXCLUDED.stock_name,
    previous     = EXCLUDED.previous,
    open_price   = EXCLUDED.open_price,
    high         = EXCLUDED.high,
    low          = EXCLUDED.low,
    close        = EXCLUDED.close,
    change       = EXCLUDED.change,
    change_pct   = EXCLUDED.change_pct,
    volume       = EXCLUDED.volume,
    value        = EXCLUDED.value,
    frequency    = EXCLUDED.frequency,
    scraped_at   = EXCLUDED.scraped_at;
"""


def parse_trade_date(raw: str) -> str:
    return raw[:10]


def compute_change_pct(change: float | None, previous: float | None) -> float | None:
    if change is None or previous is None or previous == 0:
        return None
    return change / previous * 100


def load_json(path: str) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        payload = json.load(f)
    return payload.get("data", [])


def upsert_rows(conn: psycopg2.extensions.connection, rows: list[dict], scraped_at: datetime) -> int:
    with conn.cursor() as cur:
        count = 0
        for row in rows:
            previous = row.get("Previous")
            change = row.get("Change")
            cur.execute(
                UPSERT_SQL,
                {
                    "stock_code": row["StockCode"],
                    "trade_date": parse_trade_date(row["Date"]),
                    "stock_name": row.get("StockName"),
                    "previous": previous,
                    "open_price": row.get("OpenPrice"),
                    "high": row.get("High"),
                    "low": row.get("Low"),
                    "close": row.get("Close"),
                    "change": change,
                    "change_pct": compute_change_pct(change, previous),
                    "volume": row.get("Volume"),
                    "value": row.get("Value"),
                    "frequency": row.get("Frequency"),
                    "scraped_at": scraped_at,
                },
            )
            count += 1
    conn.commit()
    return count


def main() -> None:
    print(f"Reading {INPUT_FILE}...")
    rows = load_json(INPUT_FILE)
    print(f"Loaded {len(rows)} stock rows")

    scraped_at = datetime.now(tz=timezone.utc)

    conn = psycopg2.connect(**PG_CONFIG)
    try:
        count = upsert_rows(conn, rows, scraped_at)
        print(f"Upserted {count} rows into daily_trade_summary (scraped_at={scraped_at.isoformat()})")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
