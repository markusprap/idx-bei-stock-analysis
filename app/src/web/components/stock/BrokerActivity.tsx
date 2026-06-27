import { useQuery } from "@tanstack/react-query";
import "./BrokerActivity.css";

type BrokerRow = {
  brokerCode: string;
  brokerName: string | null;
  buyVolume: number | null;
  buyValue: number | null;
  sellVolume: number | null;
  sellValue: number | null;
  netValue: number | null;
};

type BrokerResponse = {
  code: string;
  tradeDate: string | null;
  brokers: BrokerRow[];
  staleness: { ageHours: number; isStale: boolean } | null;
};

function fmtBillions(v: number | null): string {
  if (v === null) return "—";
  const b = v / 1_000_000_000;
  return `${b.toFixed(1)}B`;
}

function fmtNet(v: number | null): string {
  if (v === null) return "—";
  const b = v / 1_000_000_000;
  return `${b >= 0 ? "+" : ""}${b.toFixed(1)}B`;
}

const DISPLAY_LIMIT = 20;

export function BrokerActivity({ code }: { code: string }) {
  const { data, isLoading, isError } = useQuery<BrokerResponse>({
    queryKey: ["brokers", code],
    queryFn: async () => {
      const res = await fetch(`/api/stock/${code}/brokers`);
      if (!res.ok) throw new Error("fetch failed");
      return res.json() as Promise<BrokerResponse>;
    },
    staleTime: 30 * 60 * 1000,
  });

  if (isLoading) return <p className="ba-state">Memuat aktivitas broker...</p>;
  if (isError || !data || data.brokers.length === 0) return null;

  const rows = data.brokers.slice(0, DISPLAY_LIMIT);

  return (
    <section className="ba-section">
      <div className="ba-header">
        <h2 className="ba-title">Aktivitas Broker</h2>
        <div className="ba-badges">
          <span className="ba-badge-eod">EOD</span>
          {data.tradeDate && <span className="ba-badge-date">{data.tradeDate}</span>}
          {data.staleness?.isStale && (
            <span className="ba-badge-stale">Data mungkin belum update</span>
          )}
        </div>
      </div>

      <div className="ba-table-wrap">
        <table className="ba-table">
          <thead>
            <tr>
              <th>Broker</th>
              <th>Beli</th>
              <th>Jual</th>
              <th>Net</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.brokerCode}>
                <td className="ba-broker">
                  <span className="ba-broker-code">{r.brokerCode}</span>
                  {r.brokerName && <span className="ba-broker-name">{r.brokerName}</span>}
                </td>
                <td className="ba-buy">{fmtBillions(r.buyValue)}</td>
                <td className="ba-sell">{fmtBillions(r.sellValue)}</td>
                <td className="ba-net">{fmtNet(r.netValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="ba-disclaimer">
        Data aktivitas broker EOD — bukan sinyal beli/jual. Apa pola yang lo lihat dari data ini?
      </p>
    </section>
  );
}
