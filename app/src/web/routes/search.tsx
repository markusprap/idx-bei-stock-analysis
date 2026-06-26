import { Sidebar } from "../components/layout/Sidebar";
import { IhsgSummary } from "../components/market/IhsgSummary";
import { TrendingStocks } from "../components/market/TrendingStocks";
import { StockSearch } from "../components/market/StockSearch";
import { SectorPerformance } from "../components/market/SectorPerformance";
import { MarketNews } from "../components/market/MarketNews";
import "./search.css";

export function SearchRoute() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="search-page app-main">
        <StockSearch />
        <IhsgSummary />
        <TrendingStocks />
        <SectorPerformance />
        <MarketNews />
      </main>
    </div>
  );
}
