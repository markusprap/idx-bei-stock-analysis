import { IhsgSummary } from "../components/market/IhsgSummary";
import "./search.css";

export function SearchRoute() {
  return (
    <main className="search-page">
      <IhsgSummary />
      <section className="search-coming-soon">
        <p>Saham trending, sektor, dan berita akan hadir di sini.</p>
      </section>
    </main>
  );
}
