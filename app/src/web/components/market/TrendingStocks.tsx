import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

type TrendingRow = {
  stockCode: string;
  stockName: string | null;
  tradeDate: string;
  previous: number | null;
  close: number | null;
  change: number | null;
  changePct: number | null;
  volume: number | null;
  value: number | null;
};

type TrendingResponse = {
  tradeDate: string | null;
  gainers: TrendingRow[];
  losers: TrendingRow[];
  topValue: TrendingRow[];
  topVolume: TrendingRow[];
  staleness: { scrapedAt: string; ageHours: number; isStale: boolean } | null;
};

async function fetchTrending(): Promise<TrendingResponse> {
  const res = await fetch("/api/market/trending");
  if (!res.ok) throw new Error(`Failed to fetch trending: ${res.status}`);
  return res.json() as Promise<TrendingResponse>;
}

function formatPrice(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatPct(n: number | null): string {
  if (n === null) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function formatValue(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1_000_000_000_000) return `${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}M`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}jt`;
  return n.toLocaleString("id-ID");
}

function StockRow({ row, showValue, showVolume }: { row: TrendingRow; showValue?: boolean; showVolume?: boolean }) {
  const positive = (row.changePct ?? row.change ?? 0) >= 0;
  const changeClass = positive ? "trending-positive" : "trending-negative";
  return (
    <div className="trending-row">
      <span className="trending-ticker">{row.stockCode}</span>
      <span className="trending-name">{row.stockName ?? "—"}</span>
      <span className="trending-close">{formatPrice(row.close)}</span>
      {showValue ? (
        <span className="trending-meta">{formatValue(row.value)}</span>
      ) : showVolume ? (
        <span className="trending-meta">{formatValue(row.volume)}</span>
      ) : (
        <span className={`trending-pct ${changeClass}`}>{formatPct(row.changePct)}</span>
      )}
    </div>
  );
}

function TrendingSection({
  title,
  rows,
  showValue,
  showVolume,
}: {
  title: string;
  rows: TrendingRow[];
  showValue?: boolean;
  showVolume?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, 5);

  return (
    <div className="trending-section">
      <h3 className="trending-section-title">{title}</h3>
      {visible.map((row) => (
        <StockRow key={row.stockCode} row={row} showValue={showValue} showVolume={showVolume} />
      ))}
      {rows.length > 5 && !expanded && (
        <button type="button" className="trending-expand" onClick={() => setExpanded(true)}>
          Selengkapnya ({rows.length - 5} lagi)
        </button>
      )}
    </div>
  );
}

export function TrendingStocks() {
  const { data, isLoading, isError } = useQuery<TrendingResponse>({
    queryKey: ["trending"],
    queryFn: fetchTrending,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <section className="trending-stocks">
      <h2 className="trending-title">
        Saham Trending <span className="trending-eod-badge">EOD</span>
      </h2>

      {isLoading && <p className="trending-state">Memuat data saham trending...</p>}
      {isError && <p className="trending-state trending-error">Gagal memuat data saham trending.</p>}

      {data && data.staleness?.isStale && (
        <p className="trending-stale-warning">
          ⚠ Data mungkin sudah lebih dari {data.staleness.ageHours} jam yang lalu.
        </p>
      )}

      {data && data.gainers.length === 0 && data.losers.length === 0 && (
        <p className="trending-state">Data saham trending belum tersedia.</p>
      )}

      {data && (data.gainers.length > 0 || data.losers.length > 0 || data.topValue.length > 0 || data.topVolume.length > 0) && (
        <div className="trending-grid">
          <TrendingSection title="Top Gainer" rows={data.gainers} />
          <TrendingSection title="Top Loser" rows={data.losers} />
          <TrendingSection title="Nilai Terbesar" rows={data.topValue} showValue />
          <TrendingSection title="Volume Terbesar" rows={data.topVolume} showVolume />
        </div>
      )}
    </section>
  );
}
