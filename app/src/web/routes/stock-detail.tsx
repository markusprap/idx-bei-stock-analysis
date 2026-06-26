import { useParams, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "../components/layout/Sidebar";
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

  function handleAskAI() {
    void navigate({ to: "/", search: { ticker: code } });
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="stock-detail-page app-main">
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

        <div className="stock-detail-cta-wrap">
          <button type="button" className="stock-detail-cta-btn" onClick={handleAskAI}>
            <svg className="stock-detail-cta-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                clipRule="evenodd"
              />
            </svg>
            Tanya AI soal saham ini
          </button>
        </div>
      </main>
    </div>
  );
}
