import { useQuery } from "@tanstack/react-query";

type FundamentalsRow = {
  fsDate: string | null;
  per: number | null;
  priceBv: number | null;
  eps: number | null;
  bookValue: number | null;
  roa: number | null;
  roe: number | null;
  npm: number | null;
  assets: number | null;
  liabilities: number | null;
  equity: number | null;
  sales: number | null;
};

type FundamentalsResponse = {
  code: string;
  stockName: string | null;
  rows: FundamentalsRow[];
};

async function fetchFundamentals(code: string): Promise<FundamentalsResponse> {
  const res = await fetch(`/api/stock/${code}/fundamentals`);
  if (!res.ok) throw new Error(`Failed to fetch fundamentals: ${res.status}`);
  return res.json() as Promise<FundamentalsResponse>;
}

function extractYear(fsDate: string | null): string {
  if (!fsDate) return "—";
  return fsDate.slice(0, 4);
}

function fmt(val: number | null, suffix = ""): string {
  if (val === null || val === undefined) return "—";
  return `${val.toFixed(2)}${suffix}`;
}

function fmtIDR(val: number | null): string {
  if (val === null || val === undefined) return "—";
  const abs = Math.abs(val);
  if (abs >= 1e12) return `${(val / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(val / 1e9).toFixed(2)}M`;
  if (abs >= 1e6) return `${(val / 1e6).toFixed(2)}Jt`;
  return val.toFixed(0);
}

type TableSection = {
  label: string;
  rows: { label: string; getValue: (r: FundamentalsRow) => string }[];
};

const SECTIONS: TableSection[] = [
  {
    label: "Valuasi",
    rows: [
      { label: "PER", getValue: (r) => fmt(r.per, "x") },
      { label: "P/BV", getValue: (r) => fmt(r.priceBv, "x") },
      { label: "EPS", getValue: (r) => fmt(r.eps) },
      { label: "Book Value", getValue: (r) => fmtIDR(r.bookValue) },
    ],
  },
  {
    label: "Profitabilitas",
    rows: [
      { label: "ROA", getValue: (r) => fmt(r.roa, "%") },
      { label: "ROE", getValue: (r) => fmt(r.roe, "%") },
      { label: "NPM", getValue: (r) => fmt(r.npm, "%") },
    ],
  },
  {
    label: "Neraca",
    rows: [
      { label: "Total Aset", getValue: (r) => fmtIDR(r.assets) },
      { label: "Total Liabilitas", getValue: (r) => fmtIDR(r.liabilities) },
      { label: "Ekuitas", getValue: (r) => fmtIDR(r.equity) },
      { label: "Pendapatan", getValue: (r) => fmtIDR(r.sales) },
    ],
  },
];

export function FundamentalsTable({ code }: { code: string }) {
  const { data, isLoading, isError } = useQuery<FundamentalsResponse>({
    queryKey: ["fundamentals", code],
    queryFn: () => fetchFundamentals(code),
    staleTime: 60 * 60 * 1000,
  });

  const years = (data?.rows ?? []).slice(0, 3);

  return (
    <section className="fundamentals-table">
      <h2 className="fundamentals-title">
        Fundamental <span className="fundamentals-annual-badge">(Tahunan)</span>
      </h2>

      {isLoading && <p className="fundamentals-state">Memuat data fundamental...</p>}
      {isError && <p className="fundamentals-state fundamentals-error">Gagal memuat data fundamental.</p>}

      {data && years.length === 0 && (
        <p className="fundamentals-state">Data fundamental tidak tersedia.</p>
      )}

      {years.length > 0 && (
        <div className="fundamentals-sections">
          {SECTIONS.map((section) => (
            <div key={section.label} className="fundamentals-section">
              <p className="fundamentals-section-label">{section.label}</p>
              <table className="fundamentals-data-table">
                <thead>
                  <tr>
                    <th className="fundamentals-col-metric"></th>
                    {years.map((r) => (
                      <th key={r.fsDate} className="fundamentals-col-year">
                        {extractYear(r.fsDate)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row) => (
                    <tr key={row.label}>
                      <td className="fundamentals-metric-label">{row.label}</td>
                      {years.map((r) => (
                        <td key={r.fsDate} className="fundamentals-value">
                          {row.getValue(r)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
