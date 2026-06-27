"""
Scrape IDX broker transaction summary per stock per date.

Usage:
  uv run python scrape_broker_transactions.py --code BBCA              # latest date
  uv run python scrape_broker_transactions.py --code BBCA --date 20260625
  uv run python scrape_broker_transactions.py --codes-file codes.txt --date 20260625
"""

import os
import json
import argparse
import time
from curl_cffi import requests

BASE_URL = "https://www.idx.co.id/primary/TradingSummary/GetBrokerSummary"
DATA_DIR = os.path.join(os.path.dirname(__file__), "../data/broker_transactions")
HEADERS = {
    "accept": "application/json, text/plain, */*",
    "Referer": "https://www.idx.co.id/id/market-data/stocks-data/broker-summary/",
}


def fetch_broker_transactions(stock_code: str, trade_date: str | None = None) -> dict | None:
    """Fetch broker transaction summary for one stock. trade_date format: YYYYMMDD."""
    params = {"stockcode": stock_code, "length": 9999, "start": 0}
    if trade_date:
        params["date"] = trade_date

    url = f"{BASE_URL}?" + "&".join(f"{k}={v}" for k, v in params.items())
    try:
        resp = requests.get(url, headers=HEADERS, impersonate="chrome", timeout=30)
        if resp.status_code == 200:
            return resp.json()
        print(f"  HTTP {resp.status_code} for {stock_code} date={trade_date}")
    except Exception as e:
        print(f"  Error fetching {stock_code}: {e}")

    return None


def save_json(stock_code: str, trade_date: str | None, data: dict) -> str:
    """Save data to data/broker_transactions/<date>/<code>.json. Returns path."""
    date_key = trade_date or "latest"
    out_dir = os.path.join(DATA_DIR, date_key)
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"{stock_code}.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    return out_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape IDX broker transactions per stock")
    parser.add_argument("--code", help="Single stock code (e.g. BBCA)")
    parser.add_argument("--codes-file", help="File with one stock code per line")
    parser.add_argument("--date", help="Trade date in YYYYMMDD format")
    args = parser.parse_args()

    codes: list[str] = []
    if args.code:
        codes = [args.code.upper()]
    elif args.codes_file:
        with open(args.codes_file, encoding="utf-8") as f:
            codes = [line.strip().upper() for line in f if line.strip()]
    else:
        parser.error("Specify --code or --codes-file")

    trade_date: str | None = args.date

    for i, code in enumerate(codes):
        print(f"[{i+1}/{len(codes)}] Fetching {code} date={trade_date or 'latest'}...")
        data = fetch_broker_transactions(code, trade_date)
        if data is None:
            print(f"  Skipped {code}")
            continue

        count = data.get("recordsTotal", 0)
        path = save_json(code, trade_date, data)
        print(f"  Saved {count} rows → {os.path.relpath(path)}")

        if i < len(codes) - 1:
            time.sleep(0.3)  # polite rate limit


if __name__ == "__main__":
    main()
