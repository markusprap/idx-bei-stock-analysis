import { IhsgSummary } from "../components/market/IhsgSummary";
import { TrendingStocks } from "../components/market/TrendingStocks";
import { StockSearch } from "../components/market/StockSearch";
import { SectorPerformance } from "../components/market/SectorPerformance";
import "./search.css";

export function SearchRoute() {
  return (
    <main className="search-page">
      <StockSearch />
      <IhsgSummary />
      <TrendingStocks />
      <SectorPerformance />
      <section className="search-coming-soon">
        <p>Berita pasar akan hadir di sini.</p>
      </section>
    </main>
  );
}
