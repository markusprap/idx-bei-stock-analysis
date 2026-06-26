import "./FundamentalCard.css";

export type FundamentalCardData = {
  type: "fundamental_card";
  ticker: string;
  stockName: string | null;
  sector: string | null;
  subSector: string | null;
  sharia: string | null;
  fsDate: string | null;
  fiscalYearEnd: string | null;
  per: number | null;
  priceBv: number | null;
  eps: number | null;
  bookValue: number | null;
  roe: number | null;
  roa: number | null;
  npm: number | null;
  deRatio: number | null;
  assets: number | null;
  liabilities: number | null;
  equity: number | null;
};

function fmt(value: number | null, decimals = 2): string {
  if (value === null || value === undefined) return "—";
  return value.toFixed(decimals);
}

function fmtTrillions(value: number | null): string {
  if (value === null || value === undefined) return "—";
  const trillions = value / 1_000_000_000_000;
  return `Rp ${trillions.toFixed(2)}T`;
}

type MetricRowProps = { label: string; value: string; unit?: string };
function MetricRow({ label, value, unit }: MetricRowProps) {
  return (
    <div className="fund-card-metric-row">
      <span className="fund-card-metric-label">{label}</span>
      <span className="fund-card-metric-value">
        {value}
        {unit && <span className="fund-card-metric-unit">{unit}</span>}
      </span>
    </div>
  );
}

type Props = { data: FundamentalCardData };

export function FundamentalCard({ data }: Props) {
  const fiscalYear = data.fiscalYearEnd
    ? data.fiscalYearEnd.slice(0, 4)
    : data.fsDate
      ? data.fsDate.slice(0, 4)
      : null;

  return (
    <div className="fund-card">
      <div className="fund-card-header">
        <div className="fund-card-identity">
          <span className="fund-card-ticker">{data.ticker}</span>
          {data.stockName && <span className="fund-card-name">{data.stockName}</span>}
        </div>
        <div className="fund-card-badges">
          <span className="fund-card-badge-eod">EOD</span>
          {fiscalYear && <span className="fund-card-badge-year">Tahunan {fiscalYear}</span>}
          {data.sharia === "Yes" && <span className="fund-card-badge-syariah">Syariah</span>}
        </div>
      </div>

      {(data.sector || data.subSector) && (
        <p className="fund-card-sector">
          {[data.sector, data.subSector].filter(Boolean).join(" › ")}
        </p>
      )}

      <div className="fund-card-sections">
        <div className="fund-card-section">
          <p className="fund-card-section-label">Valuasi</p>
          <MetricRow label="PER" value={fmt(data.per)} unit="x" />
          <MetricRow label="PBV" value={fmt(data.priceBv)} unit="x" />
          <MetricRow label="EPS" value={fmt(data.eps)} />
          <MetricRow label="Book Value/share" value={fmt(data.bookValue)} />
        </div>

        <div className="fund-card-section">
          <p className="fund-card-section-label">Profitabilitas</p>
          <MetricRow label="ROE" value={fmt(data.roe)} unit="%" />
          <MetricRow label="ROA" value={fmt(data.roa)} unit="%" />
          <MetricRow label="NPM" value={fmt(data.npm)} unit="%" />
        </div>

        <div className="fund-card-section">
          <p className="fund-card-section-label">Neraca Ringkas</p>
          <MetricRow label="DER" value={fmt(data.deRatio)} unit="x" />
          <MetricRow label="Aset" value={fmtTrillions(data.assets)} />
          <MetricRow label="Liabilitas" value={fmtTrillions(data.liabilities)} />
          <MetricRow label="Ekuitas" value={fmtTrillions(data.equity)} />
        </div>
      </div>

      <p className="fund-card-disclaimer">
        Data di atas adalah fakta finansial. Interpretasi dan keputusan investasi sepenuhnya ada di
        tangan lo — apa yang lo simpulkan dari angka-angka ini?
      </p>
    </div>
  );
}
