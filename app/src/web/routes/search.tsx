import { IhsgSummary } from "../components/market/IhsgSummary";
import { TrendingStocks } from "../components/market/TrendingStocks";
import { StockSearch } from "../components/market/StockSearch";
import "./search.css";

export function SearchRoute() {
  return (
    <main className="search-page">
      <StockSearch />
      <IhsgSummary />
      <TrendingStocks />
      <section className="search-coming-soon">
        <p>Data sektor dan berita akan hadir di sini.</p>
      </section>
    </main>
  );
}
