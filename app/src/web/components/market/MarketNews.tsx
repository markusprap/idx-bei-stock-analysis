import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

type NewsItem = {
  newsId: number;
  title: string | null;
  summary: string | null;
  tags: string | null;
  imageUrl: string | null;
  isHeadline: boolean | null;
  publishedDate: string | null;
};

type NewsResponse = {
  news: NewsItem[];
  staleness: { scrapedAt: string; ageHours: number; isStale: boolean } | null;
};

async function fetchNews(): Promise<NewsResponse> {
  const res = await fetch("/api/market/news");
  if (!res.ok) throw new Error(`Failed to fetch news: ${res.status}`);
  return res.json() as Promise<NewsResponse>;
}

function formatDate(raw: string | null): string {
  if (!raw) return "";
  try {
    return new Date(raw).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export function MarketNews() {
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading, isError } = useQuery<NewsResponse>({
    queryKey: ["news"],
    queryFn: fetchNews,
    staleTime: 5 * 60 * 1000,
  });

  const items = data?.news ?? [];
  const visible = expanded ? items : items.slice(0, 5);
  const remaining = items.length - 5;

  return (
    <section className="market-news">
      <h2 className="news-title">
        Berita Pasar <span className="news-eod-badge">EOD</span>
      </h2>

      {isLoading && <p className="news-state">Memuat berita pasar...</p>}
      {isError && <p className="news-state news-error">Gagal memuat berita pasar.</p>}

      {data?.staleness?.isStale && (
        <p className="news-stale-warning">
          ⚠ Data mungkin sudah lebih dari {data.staleness.ageHours} jam yang lalu.
        </p>
      )}

      {data && items.length === 0 && (
        <p className="news-state">Berita pasar belum tersedia.</p>
      )}

      {visible.length > 0 && (
        <ul className="news-list">
          {visible.map((item) => (
            <li key={item.newsId} className="news-item">
              <p className="news-item-title">{item.title}</p>
              <div className="news-item-meta">
                <span className="news-item-date">{formatDate(item.publishedDate)}</span>
                {item.tags && <span className="news-item-tag">{item.tags}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!expanded && remaining > 0 && (
        <button type="button" className="news-expand" onClick={() => setExpanded(true)}>
          Selengkapnya ({remaining} lagi)
        </button>
      )}
    </section>
  );
}
