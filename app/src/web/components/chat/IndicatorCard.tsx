import "./IndicatorCard.css";

export type IndicatorCardData = {
  type: "indicator_card";
  ticker: string;
  stockName: string | null;
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

function fmt(v: number | null, d = 2): string {
  return v === null ? "—" : v.toFixed(d);
}

function rsiZone(rsi: number | null): string {
  if (rsi === null) return "";
  if (rsi >= 70) return "mendekati overbought";
  if (rsi <= 30) return "mendekati oversold";
  return "zona netral";
}

function macdMomentum(histogram: number | null): string {
  if (histogram === null) return "";
  if (histogram > 0) return "momentum positif";
  if (histogram < 0) return "momentum negatif";
  return "di garis nol";
}

type RowProps = { label: string; value: string; note?: string };
function Row({ label, value, note }: RowProps) {
  return (
    <div className="ind-card-row">
      <span className="ind-card-label">{label}</span>
      <span className="ind-card-value">
        {value}
        {note && <span className="ind-card-note"> — {note}</span>}
      </span>
    </div>
  );
}

export function IndicatorCard({ data }: { data: IndicatorCardData }) {
  return (
    <div className="ind-card">
      <div className="ind-card-header">
        <span className="ind-card-ticker">{data.ticker}</span>
        {data.stockName && <span className="ind-card-name">{data.stockName}</span>}
        <div className="ind-card-badges">
          <span className="ind-card-badge-eod">EOD</span>
          {data.tradeDate && <span className="ind-card-badge-date">{data.tradeDate}</span>}
        </div>
      </div>

      <div className="ind-card-groups">
        <div className="ind-card-group">
          <p className="ind-card-group-label">Momentum</p>
          <Row label="RSI (14)" value={fmt(data.rsi14)} note={rsiZone(data.rsi14)} />
          <Row label="MACD" value={fmt(data.macd, 4)} note={macdMomentum(data.macdHistogram)} />
          <Row label="Signal" value={fmt(data.macdSignal, 4)} />
          <Row label="Histogram" value={fmt(data.macdHistogram, 4)} />
        </div>
        <div className="ind-card-group">
          <p className="ind-card-group-label">Moving Average</p>
          <Row label="MA 20" value={fmt(data.ma20)} />
          <Row label="MA 50" value={fmt(data.ma50)} />
        </div>
        <div className="ind-card-group">
          <p className="ind-card-group-label">Bollinger Bands (20, 2σ)</p>
          <Row label="Upper" value={fmt(data.bbUpper)} />
          <Row label="Middle" value={fmt(data.bbMiddle)} />
          <Row label="Lower" value={fmt(data.bbLower)} />
        </div>
        <div className="ind-card-group">
          <p className="ind-card-group-label">Volatilitas</p>
          <Row label="ATR (14)" value={fmt(data.atr14)} />
        </div>
      </div>

      <p className="ind-card-disclaimer">
        Data teknikal EOD — bukan sinyal beli/jual. Apa yang lo simpulkan dari angka-angka ini?
      </p>
    </div>
  );
}
