"""
Scrape IDX daily stock summary (OHLCV + foreign flow) for one or more trading dates.

Usage:
  uv run python scrape_company_summary.py                    # today
  uv run python scrape_company_summary.py --date 20260625   # specific date
  uv run python scrape_company_summary.py --backfill-days 365  # last N calendar days
"""

from curl_cffi import requests
import json
import os
import argparse
import time
from datetime import date, timedelta

BASE_URL = "https://www.idx.co.id/primary/TradingSummary/GetStockSummary"
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "../data/companySummaryByKodeEmiten.json")


def fetch_for_date(trade_date: str | None = None) -> dict | None:
    """Fetch all IDX stocks for a given date (YYYYMMDD) or today if None."""
    url = f"{BASE_URL}?length=9999&start=0"
    if trade_date:
        url += f"&date={trade_date}"

    try:
        resp = requests.get(url, impersonate="chrome", timeout=30)
        if resp.status_code == 200:
            return resp.json()
        print(f"  HTTP {resp.status_code} for date={trade_date}")
    except Exception as e:
        print(f"  Error fetching date={trade_date}: {e}")

    return None


def fetch_today_and_save() -> None:
    """Fetch today and overwrite the output file (original behaviour)."""
    print(f"Fetching today from {BASE_URL}...")
    data = fetch_for_date()
    if data is None:
        print("Failed.")
        return

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print(f"Saved {data.get('recordsTotal', 0)} records to {OUTPUT_FILE}")


def backfill(days: int) -> None:
    """
    Fetch and write one JSON file per calendar date going back `days` days.
    Files are written to data/daily/<YYYYMMDD>.json so the ETL can consume them.
    Skips weekends; IDX holidays are not filtered (those dates return 0 records
    and the ETL will upsert nothing for them).
    """
    out_dir = os.path.join(os.path.dirname(OUTPUT_FILE), "daily")
    os.makedirs(out_dir, exist_ok=True)

    today = date.today()
    dates = []
    for i in range(days):
        d = today - timedelta(days=i)
        if d.weekday() < 5:  # skip Saturday(5) and Sunday(6)
            dates.append(d.strftime("%Y%m%d"))

    print(f"Backfilling {len(dates)} weekdays over last {days} calendar days...")
    fetched = 0
    for dt_str in dates:
        out_path = os.path.join(out_dir, f"{dt_str}.json")
        if os.path.exists(out_path):
            continue  # already fetched

        data = fetch_for_date(dt_str)
        if data is None:
            continue

        count = data.get("recordsTotal", 0)
        if count == 0:
            continue  # IDX holiday or no data, skip file

        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(data, f)

        fetched += 1
        if fetched % 20 == 0:
            print(f"  fetched {fetched}/{len(dates)} dates so far...")
        time.sleep(0.4)  # be polite to IDX servers

    print(f"Done. Fetched {fetched} new date files into {out_dir}/")


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape IDX daily stock summary")
    parser.add_argument("--date", metavar="YYYYMMDD", help="Fetch a specific date (default: today)")
    parser.add_argument(
        "--backfill-days",
        type=int,
        metavar="N",
        help="Backfill last N calendar days, writing per-date JSON files to data/daily/",
    )
    args = parser.parse_args()

    if args.backfill_days:
        backfill(args.backfill_days)
    elif args.date:
        data = fetch_for_date(args.date)
        if data:
            with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            print(f"Saved {data.get('recordsTotal', 0)} records for {args.date} to {OUTPUT_FILE}")
    else:
        fetch_today_and_save()


if __name__ == "__main__":
    main()
