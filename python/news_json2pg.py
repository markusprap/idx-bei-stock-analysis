import glob
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

DATA_DIR = os.path.join(os.path.dirname(__file__), "../data/news")

UPSERT_SQL = """
INSERT INTO market_news (
    news_id, published_date, title, summary, tags, image_url, is_headline, scraped_at
) VALUES (
    %(news_id)s, %(published_date)s, %(title)s, %(summary)s,
    %(tags)s, %(image_url)s, %(is_headline)s, %(scraped_at)s
)
ON CONFLICT (news_id) DO UPDATE SET
    published_date = EXCLUDED.published_date,
    title          = EXCLUDED.title,
    summary        = EXCLUDED.summary,
    tags           = EXCLUDED.tags,
    image_url      = EXCLUDED.image_url,
    is_headline    = EXCLUDED.is_headline,
    scraped_at     = EXCLUDED.scraped_at;
"""


def parse_published_date(raw: str) -> datetime | None:
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw)
    except ValueError:
        return None


def load_news_files() -> list[dict]:
    pattern = os.path.join(DATA_DIR, "idx_news_*.json")
    files = sorted(glob.glob(pattern))
    # Exclude detailed files (they have full HTML content, not needed here)
    files = [f for f in files if "detailed" not in os.path.basename(f)]

    all_items: list[dict] = []
    for path in files:
        print(f"Reading {path}...")
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        items = data.get("data", [])
        print(f"  {len(items)} items")
        all_items.extend(items)

    # Deduplicate by Id, keep last seen
    seen: dict[int, dict] = {}
    for item in all_items:
        seen[item["Id"]] = item
    return list(seen.values())


def upsert_rows(conn: psycopg2.extensions.connection, rows: list[dict], scraped_at: datetime) -> int:
    with conn.cursor() as cur:
        count = 0
        for row in rows:
            title = row.get("Title") or ""
            if not title.strip():
                continue
            cur.execute(
                UPSERT_SQL,
                {
                    "news_id": row["Id"],
                    "published_date": parse_published_date(row.get("PublishedDate", "")),
                    "title": title,
                    "summary": row.get("Summary"),
                    "tags": row.get("Tags") or None,
                    "image_url": row.get("ImageUrl") or None,
                    "is_headline": bool(row.get("IsHeadline", False)),
                    "scraped_at": scraped_at,
                },
            )
            count += 1
    conn.commit()
    return count


def main() -> None:
    rows = load_news_files()
    print(f"Total unique news items: {len(rows)}")

    if not rows:
        print("No news items found. Check data/news/ directory.")
        return

    scraped_at = datetime.now(tz=timezone.utc)
    conn = psycopg2.connect(**PG_CONFIG)
    try:
        count = upsert_rows(conn, rows, scraped_at)
        print(f"Upserted {count} rows into market_news (scraped_at={scraped_at.isoformat()})")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
