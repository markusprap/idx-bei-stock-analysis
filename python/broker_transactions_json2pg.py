"""
ETL: broker transaction JSON files → broker_transactions Postgres table.

Usage:
  uv run python broker_transactions_json2pg.py --dir data/broker_transactions/20260625
  uv run python broker_transactions_json2pg.py --file data/broker_transactions/20260625/BBCA.json
  uv run python broker_transactions_json2pg.py --all     # all date dirs under data/broker_transactions/
"""

import json
import os
import glob
import argparse
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

DATA_ROOT = os.path.join(os.path.dirname(__file__), "../data/broker_transactions")

UPSERT_SQL = """
INSERT INTO broker_transactions (
    stock_code, trade_date, broker_code, broker_name,
    buy_volume, buy_value, sell_volume, sell_value, scraped_at
) VALUES (
    %(stock_code)s, %(trade_date)s, %(broker_code)s, %(broker_name)s,
    %(buy_volume)s, %(buy_value)s, %(sell_volume)s, %(sell_value)s, %(scraped_at)s
)
ON CONFLICT (stock_code, trade_date, broker_code) DO UPDATE SET
    broker_name  = EXCLUDED.broker_name,
    buy_volume   = EXCLUDED.buy_volume,
    buy_value    = EXCLUDED.buy_value,
    sell_volume  = EXCLUDED.sell_volume,
    sell_value   = EXCLUDED.sell_value,
    scraped_at   = EXCLUDED.scraped_at;
"""


def parse_float(v) -> float | None:
    """Parse numeric value, return None for null/empty."""
    if v is None or v == "":
        return None
    try:
        return float(v)
    except (ValueError, TypeError):
        return None


def load_file(path: str) -> list[dict]:
    """Load one JSON file and return list of rows ready for upsert."""
    # Infer stock_code from filename, trade_date from parent dir name
    basename = os.path.splitext(os.path.basename(path))[0]
    stock_code = basename.upper()
    parent = os.path.basename(os.path.dirname(path))

    # Parse trade_date from dir name (YYYYMMDD → YYYY-MM-DD) or skip
    trade_date: str | None = None
    if len(parent) == 8 and parent.isdigit():
        trade_date = f"{parent[:4]}-{parent[4:6]}-{parent[6:]}"

    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    scraped_at = datetime.now(timezone.utc)
    rows = []

    # IDX API returns {"data": [...], "recordsTotal": N}
    records = data.get("data") or data.get("Data") or []
    for rec in records:
        # IDX broker summary field names (as observed in GetBrokerSummary responses)
        broker_code = rec.get("BrokerCode") or rec.get("brokerCode") or rec.get("Broker_Code") or ""
        if not broker_code:
            continue

        # Date from record if available, else from dir name
        raw_date = rec.get("Date") or rec.get("date") or ""
        row_date = trade_date
        if raw_date and len(raw_date) == 8 and raw_date.isdigit():
            row_date = f"{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:]}"

        if not row_date:
            continue

        rows.append({
            "stock_code": stock_code,
            "trade_date": row_date,
            "broker_code": broker_code,
            "broker_name": rec.get("BrokerName") or rec.get("brokerName") or rec.get("Broker_Name"),
            "buy_volume": parse_float(rec.get("BuyVolume") or rec.get("buyVolume") or rec.get("Buy_Volume")),
            "buy_value": parse_float(rec.get("BuyValue") or rec.get("buyValue") or rec.get("Buy_Value")),
            "sell_volume": parse_float(rec.get("SellVolume") or rec.get("sellVolume") or rec.get("Sell_Volume")),
            "sell_value": parse_float(rec.get("SellValue") or rec.get("sellValue") or rec.get("Sell_Value")),
            "scraped_at": scraped_at,
        })

    return rows


def ingest_files(paths: list[str]) -> None:
    conn = psycopg2.connect(**PG_CONFIG)
    cur = conn.cursor()
    total_rows = 0

    for path in paths:
        rows = load_file(path)
        if not rows:
            print(f"  Skipped {os.path.basename(path)} (0 rows parsed)")
            continue

        cur.executemany(UPSERT_SQL, rows)
        conn.commit()
        total_rows += len(rows)
        print(f"  Upserted {len(rows)} rows from {os.path.relpath(path)}")

    cur.close()
    conn.close()
    print(f"Done. Total rows upserted: {total_rows}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Load broker transaction JSONs into Postgres")
    parser.add_argument("--file", help="Single JSON file to load")
    parser.add_argument("--dir", help="Directory of JSON files to load")
    parser.add_argument("--all", action="store_true", help="Load all date dirs under data/broker_transactions/")
    args = parser.parse_args()

    paths: list[str] = []
    if args.file:
        paths = [args.file]
    elif args.dir:
        paths = sorted(glob.glob(os.path.join(args.dir, "*.json")))
    elif args.all:
        paths = sorted(glob.glob(os.path.join(DATA_ROOT, "*", "*.json")))
    else:
        parser.error("Specify --file, --dir, or --all")

    if not paths:
        print("No files found.")
        return

    print(f"Loading {len(paths)} file(s)...")
    ingest_files(paths)


if __name__ == "__main__":
    main()
