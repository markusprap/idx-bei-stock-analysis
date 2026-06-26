import { useParams, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PriceChart } from "../components/stock/PriceChart";
import { FundamentalsTable } from "../components/stock/FundamentalsTable";
import "./stock-detail.css";

type ChartResponse = {
  code: string;
  stockName: string | null;
  data: unknown[];
  staleness: unknown;
};

async function fetchStockName(code: string): Promise<string | null> {
  const res = await fetch(`/api/stock/${code}/chart?timeframe=1M`);
  if (!res.ok) return null;
  const json = (await res.json()) as ChartResponse;
  return json.stockName;
}

export function StockDetailRoute() {
  const { code } = useParams({ from: "/stock/$code" });
  const navigate = useNavigate();

  const { data: stockName } = useQuery<string | null>({
    queryKey: ["stockName", code],
    queryFn: () => fetchStockName(code),
    staleTime: 10 * 60 * 1000,
  });

  return (
    <main className="stock-detail-page">
      <div className="stock-detail-header">
        <button
          type="button"
          className="stock-detail-back"
          onClick={() => void navigate({ to: "/search" })}
          aria-label="Kembali ke pencarian"
        >
          ← Kembali
        </button>
        <div className="stock-detail-identity">
          <h1 className="stock-detail-code">{code}</h1>
          {stockName && <p className="stock-detail-name">{stockName}</p>}
        </div>
      </div>

      <PriceChart code={code} />
      <FundamentalsTable code={code} />
    </main>
  );
}
