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
  tradeDate: string | null;
  close: number | null;
  change: number | null;
  changePct: number | null;
  volume: number | null;
  value: number | null;
  foreignBuy: number | null;
  foreignSell: number | null;
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

function fmtPrice(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function fmtVolume(value: number | null): string {
  if (value === null || value === undefined) return "—";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}M lot`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}rb`;
  return value.toLocaleString("id-ID");
}

function fmtBillions(value: number | null): string {
  if (value === null || value === undefined) return "—";
  const b = value / 1_000_000_000;
  return `Rp ${b.toFixed(1)}M`;
}

function changePctClass(change: number | null): string {
  if (change === null) return "fund-card-change-neutral";
  if (change > 0) return "fund-card-change-up";
  if (change < 0) return "fund-card-change-down";
  return "fund-card-change-neutral";
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

  const hasPrice = data.close !== null;
  const changeSign = data.change !== null && data.change > 0 ? "+" : "";

  return (
    <div className="fund-card">
      <div className="fund-card-header">
        <div className="fund-card-identity">
          <span className="fund-card-ticker">{data.ticker}</span>
          {data.stockName && <span className="fund-card-name">{data.stockName}</span>}
        </div>
        <div className="fund-card-badges">
          <span className="fund-card-badge-eod">EOD</span>
          {data.tradeDate && <span className="fund-card-badge-date">{data.tradeDate}</span>}
          {fiscalYear && <span className="fund-card-badge-year">Tahunan {fiscalYear}</span>}
          {data.sharia === "Yes" && <span className="fund-card-badge-syariah">Syariah</span>}
        </div>
      </div>

      {(data.sector || data.subSector) && (
        <p className="fund-card-sector">
          {[data.sector, data.subSector].filter(Boolean).join(" › ")}
        </p>
      )}

      {hasPrice && (
        <div className="fund-card-price-panel">
          <span className="fund-card-price-close">{fmtPrice(data.close)}</span>
          <span className={`fund-card-price-change ${changePctClass(data.change)}`}>
            {changeSign}{fmt(data.change, 0)}{" "}
            ({changeSign}{fmt(data.changePct, 2)}%)
          </span>
        </div>
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

        {hasPrice && (
          <div className="fund-card-section">
            <p className="fund-card-section-label">Aktivitas Trading</p>
            <MetricRow label="Volume" value={fmtVolume(data.volume)} />
            <MetricRow label="Nilai Transaksi" value={fmtBillions(data.value)} />
            <MetricRow label="Asing Beli" value={fmtBillions(data.foreignBuy)} />
            <MetricRow label="Asing Jual" value={fmtBillions(data.foreignSell)} />
          </div>
        )}
      </div>

      <p className="fund-card-disclaimer">
        Data di atas adalah fakta finansial EOD. Interpretasi dan keputusan investasi sepenuhnya ada
        di tangan lo — apa yang lo simpulkan dari angka-angka ini?
      </p>
    </div>
  );
}
