import { useQuery } from "@tanstack/react-query";
import "./ForeignFlow.css";

type FlowRow = {
  tradeDate: string;
  foreignBuy: number | null;
  foreignSell: number | null;
  netFlow: number | null;
};

type ForeignFlowResponse = {
  code: string;
  data: FlowRow[];
  staleness: { ageHours: number; isStale: boolean } | null;
};

function fmtBillions(v: number | null): string {
  if (v === null) return "—";
  const b = v / 1_000_000_000;
  return `${b >= 0 ? "+" : ""}${b.toFixed(1)}B`;
}

function fmtRaw(v: number | null): string {
  if (v === null) return "—";
  const b = v / 1_000_000_000;
  return `${b.toFixed(1)}B`;
}


export function ForeignFlow({ code }: { code: string }) {
  const { data, isLoading, isError } = useQuery<ForeignFlowResponse>({
    queryKey: ["foreignFlow", code],
    queryFn: async () => {
      const res = await fetch(`/api/stock/${code}/foreign-flow`);
      if (!res.ok) throw new Error("fetch failed");
      return res.json() as Promise<ForeignFlowResponse>;
    },
    staleTime: 30 * 60 * 1000,
  });

  if (isLoading) return <p className="ff-state">Memuat data asing...</p>;
  if (isError || !data || data.data.length === 0) return null;

  const rows = [...data.data].reverse().slice(0, 20);

  return (
    <section className="ff-section">
      <div className="ff-header">
        <h2 className="ff-title">Aliran Dana Asing (30 hari)</h2>
        <div className="ff-badges">
          <span className="ff-badge-eod">EOD</span>
          {data.staleness?.isStale && (
            <span className="ff-badge-stale">Data mungkin belum update</span>
          )}
        </div>
      </div>

      <div className="ff-table-wrap">
        <table className="ff-table">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Beli Asing</th>
              <th>Jual Asing</th>
              <th>Net</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.tradeDate}>
                <td className="ff-date">{r.tradeDate}</td>
                <td className="ff-buy">{fmtRaw(r.foreignBuy)}</td>
                <td className="ff-sell">{fmtRaw(r.foreignSell)}</td>
                <td className="ff-net">{fmtBillions(r.netFlow)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="ff-disclaimer">
        Data aliran dana asing EOD — bukan sinyal beli/jual. Apa yang lo simpulkan dari pola ini?
      </p>
    </section>
  );
}
