import { useQuery } from "@tanstack/react-query";

type Indicators = {
  tradeDate: string | null;
  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  ma20: number | null;
  ma50: number | null;
  bbUpper: number | null;
  bbMiddle: number | null;
  bbLower: number | null;
  atr14: number | null;
};

type IndicatorsResponse = {
  code: string;
  indicators: Indicators | null;
  staleness: { ageHours: number; isStale: boolean } | null;
};

function fmt(v: number | null, d = 2) {
  return v === null ? "—" : v.toFixed(d);
}

function rsiZone(rsi: number | null): string {
  if (rsi === null) return "";
  if (rsi >= 70) return "mendekati overbought";
  if (rsi <= 30) return "mendekati oversold";
  return "zona netral";
}

function macdDesc(histogram: number | null): string {
  if (histogram === null) return "";
  if (histogram > 0) return "momentum positif";
  if (histogram < 0) return "momentum negatif";
  return "di garis nol";
}

type RowProps = { label: string; value: string; note?: string };
function Row({ label, value, note }: RowProps) {
  return (
    <div className="tech-ind-row">
      <span className="tech-ind-label">{label}</span>
      <span className="tech-ind-value">
        {value}
        {note && <span className="tech-ind-note"> — {note}</span>}
      </span>
    </div>
  );
}

export function TechnicalIndicators({ code }: { code: string }) {
  const { data, isLoading, isError } = useQuery<IndicatorsResponse>({
    queryKey: ["indicators", code],
    queryFn: async () => {
      const res = await fetch(`/api/stock/${code}/indicators`);
      if (!res.ok) throw new Error("fetch failed");
      return res.json() as Promise<IndicatorsResponse>;
    },
    staleTime: 30 * 60 * 1000,
  });

  if (isLoading) return <p className="tech-ind-state">Memuat indikator...</p>;
  if (isError || !data?.indicators) return null;

  const ind = data.indicators;

  return (
    <section className="tech-ind-section">
      <div className="tech-ind-header">
        <h2 className="tech-ind-title">Indikator Teknikal</h2>
        <div className="tech-ind-badges">
          <span className="tech-ind-badge-eod">EOD</span>
          {ind.tradeDate && <span className="tech-ind-badge-date">{ind.tradeDate}</span>}
          {data.staleness?.isStale && (
            <span className="tech-ind-badge-stale">Data mungkin belum update</span>
          )}
        </div>
      </div>

      <div className="tech-ind-groups">
        <div className="tech-ind-group">
          <p className="tech-ind-group-label">Momentum</p>
          <Row label="RSI (14)" value={fmt(ind.rsi14)} note={rsiZone(ind.rsi14)} />
          <Row label="MACD" value={fmt(ind.macd, 4)} note={macdDesc(ind.macdHistogram)} />
          <Row label="Signal" value={fmt(ind.macdSignal, 4)} />
          <Row label="Histogram" value={fmt(ind.macdHistogram, 4)} />
        </div>
        <div className="tech-ind-group">
          <p className="tech-ind-group-label">Moving Average</p>
          <Row label="MA 20" value={fmt(ind.ma20)} />
          <Row label="MA 50" value={fmt(ind.ma50)} />
        </div>
        <div className="tech-ind-group">
          <p className="tech-ind-group-label">Bollinger Bands (20, 2σ)</p>
          <Row label="Upper" value={fmt(ind.bbUpper)} />
          <Row label="Middle" value={fmt(ind.bbMiddle)} />
          <Row label="Lower" value={fmt(ind.bbLower)} />
        </div>
        <div className="tech-ind-group">
          <p className="tech-ind-group-label">Volatilitas</p>
          <Row label="ATR (14)" value={fmt(ind.atr14)} />
        </div>
      </div>
      <p className="tech-ind-disclaimer">
        Nilai di atas adalah data teknikal EOD — bukan sinyal beli/jual. Apa yang lo simpulkan
        dari angka-angka ini?
      </p>
    </section>
  );
}
