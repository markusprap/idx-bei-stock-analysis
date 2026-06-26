import { useQuery } from "@tanstack/react-query";

type IndexRow = {
  indexCode: string;
  tradeDate: string;
  previous: number | null;
  close: number | null;
  change: number | null;
  highest: number | null;
  lowest: number | null;
  scrapedAt: string;
};

type IhsgResponse = {
  data: IndexRow[];
  staleness: { scrapedAt: string; ageHours: number; isStale: boolean } | null;
};

async function fetchIhsg(): Promise<IhsgResponse> {
  const res = await fetch("/api/market/ihsg");
  if (!res.ok) throw new Error(`Failed to fetch IHSG: ${res.status}`);
  return res.json() as Promise<IhsgResponse>;
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const width = 200;
  const height = 48;
  const pad = 2;

  const coords = points
    .map((v, i) => {
      const x = pad + (i / (points.length - 1)) * (width - pad * 2);
      const y = pad + (1 - (v - min) / range) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const first = points[0] ?? 0;
  const last = points[points.length - 1] ?? 0;
  const isPositive = last >= first;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <polyline
        points={coords}
        fill="none"
        stroke={isPositive ? "#16a34a" : "#dc2626"}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function formatNumber(n: number | null, decimals = 2): string {
  if (n === null) return "—";
  return n.toLocaleString("id-ID", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function IhsgCard({ rows }: { rows: IndexRow[] }) {
  const latest = rows[0];
  if (!latest) return null;

  const changePositive = (latest.change ?? 0) >= 0;
  const changePct =
    latest.previous && latest.close
      ? ((latest.close - latest.previous) / latest.previous) * 100
      : null;

  const chartPoints = [...rows]
    .reverse()
    .map((r) => r.close ?? 0)
    .filter((v) => v > 0);

  return (
    <div className="ihsg-card">
      <div className="ihsg-value">
        <span className="ihsg-close">{formatNumber(latest.close)}</span>
        <span className={`ihsg-change ${changePositive ? "ihsg-positive" : "ihsg-negative"}`}>
          {changePositive ? "▲" : "▼"} {formatNumber(Math.abs(latest.change ?? 0))}
          {changePct !== null && ` (${changePositive ? "+" : ""}${changePct.toFixed(2)}%)`}
        </span>
      </div>
      <p className="ihsg-date">Per tanggal: {latest.tradeDate}</p>
      <Sparkline points={chartPoints} />
    </div>
  );
}

export function IhsgSummary() {
  const { data, isLoading, isError } = useQuery<IhsgResponse>({
    queryKey: ["ihsg"],
    queryFn: fetchIhsg,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <section className="ihsg-summary">
      <h2 className="ihsg-title">
        IHSG <span className="ihsg-eod-badge">EOD</span>
      </h2>

      {isLoading && <p className="ihsg-state">Memuat data IHSG...</p>}
      {isError && <p className="ihsg-state ihsg-error">Gagal memuat data IHSG.</p>}

      {data && data.data.length === 0 && (
        <p className="ihsg-state">Data IHSG belum tersedia.</p>
      )}

      {data && data.staleness?.isStale && (
        <p className="ihsg-stale-warning">
          ⚠ Data mungkin sudah lebih dari {data.staleness.ageHours} jam yang lalu.
        </p>
      )}

      {data && data.data.length > 0 && <IhsgCard rows={data.data} />}
    </section>
  );
}
