import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

type ChartPoint = {
  tradeDate: string;
  close: number | null;
  high: number | null;
  low: number | null;
  change: number | null;
  changePct: number | null;
  volume: number | null;
};

type ChartResponse = {
  code: string;
  stockName: string | null;
  data: ChartPoint[];
  staleness: { scrapedAt: string; ageHours: number; isStale: boolean } | null;
};

type Timeframe = "1M" | "3M" | "6M" | "1Y";

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  "1M": "1B",
  "3M": "3B",
  "6M": "6B",
  "1Y": "1T",
};

async function fetchChart(code: string, timeframe: Timeframe): Promise<ChartResponse> {
  const res = await fetch(`/api/stock/${code}/chart?timeframe=${timeframe}`);
  if (!res.ok) throw new Error(`Failed to fetch chart: ${res.status}`);
  return res.json() as Promise<ChartResponse>;
}

function SparkLine({ data }: { data: ChartPoint[] }) {
  const closes = data.map((d) => d.close).filter((v): v is number => v !== null);
  if (closes.length < 2) {
    return <p className="price-chart-empty">Data grafik tidak cukup.</p>;
  }

  const VW = 600, VH = 100;
  const padT = 8, padB = 8, padL = 8, padR = 8;
  const chartW = VW - padL - padR;
  const chartH = VH - padT - padB;

  const minC = Math.min(...closes);
  const maxC = Math.max(...closes);
  const range = maxC - minC || 1;

  const pointsArr = data
    .filter((d) => d.close !== null)
    .map((d, i, arr) => {
      const x = padL + (i / (arr.length - 1)) * chartW;
      const y = padT + ((maxC - (d.close as number)) / range) * chartH;
      return `${x},${y}`;
    });
  const points = pointsArr.join(" ");

  const first = closes[0] ?? 0;
  const last = closes[closes.length - 1] ?? 0;
  const isPositive = last >= first;
  const lineColor = isPositive ? "#16a34a" : "#dc2626";

  const startDate = data[0]?.tradeDate ?? "";
  const endDate = data[data.length - 1]?.tradeDate ?? "";

  return (
    <div className="price-chart-svg-wrap">
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        width="100%"
        preserveAspectRatio="none"
        className="price-chart-svg"
        aria-label="Grafik harga saham"
      >
        <polyline
          points={points}
          fill="none"
          stroke={lineColor}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div className="price-chart-axis-labels">
        <span className="price-chart-date-start">{startDate}</span>
        <span className="price-chart-date-end">{endDate}</span>
      </div>
    </div>
  );
}

export function PriceChart({ code }: { code: string }) {
  const [timeframe, setTimeframe] = useState<Timeframe>("3M");

  const { data, isLoading, isError } = useQuery<ChartResponse>({
    queryKey: ["chart", code, timeframe],
    queryFn: () => fetchChart(code, timeframe),
    staleTime: 5 * 60 * 1000,
  });

  const latestPoint = data?.data[data.data.length - 1];
  const isPositive = (latestPoint?.changePct ?? 0) >= 0;

  return (
    <section className="price-chart">
      <div className="price-chart-header">
        <h2 className="price-chart-title">
          Grafik Harga <span className="price-chart-eod-badge">EOD</span>
        </h2>
        <div className="price-chart-timeframes">
          {(Object.keys(TIMEFRAME_LABELS) as Timeframe[]).map((tf) => (
            <button
              key={tf}
              type="button"
              className={`price-chart-tf-btn${timeframe === tf ? " price-chart-tf-active" : ""}`}
              onClick={() => setTimeframe(tf)}
            >
              {TIMEFRAME_LABELS[tf]}
            </button>
          ))}
        </div>
      </div>

      {data?.staleness?.isStale && (
        <p className="price-chart-stale">
          ⚠ Data mungkin sudah lebih dari {data.staleness.ageHours} jam yang lalu.
        </p>
      )}

      {latestPoint && (
        <div className="price-chart-summary">
          <span className="price-chart-close">
            {latestPoint.close?.toLocaleString("id-ID") ?? "—"}
          </span>
          <span className={`price-chart-change${isPositive ? " positive" : " negative"}`}>
            {latestPoint.changePct !== null
              ? `${isPositive ? "+" : ""}${latestPoint.changePct.toFixed(2)}%`
              : "—"}
          </span>
        </div>
      )}

      {isLoading && <p className="price-chart-state">Memuat grafik...</p>}
      {isError && <p className="price-chart-state price-chart-error">Gagal memuat grafik harga.</p>}

      {data && data.data.length === 0 && (
        <p className="price-chart-empty">Data grafik tidak tersedia untuk periode ini.</p>
      )}

      {data && data.data.length >= 2 && <SparkLine data={data.data} />}
    </section>
  );
}
