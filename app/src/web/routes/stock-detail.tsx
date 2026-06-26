import { useParams } from "@tanstack/react-router";

export function StockDetailRoute() {
  const { code } = useParams({ from: "/stock/$code" });

  return (
    <main className="stock-detail-page">
      <h1 className="stock-detail-title">{code}</h1>
      <p className="stock-detail-placeholder">
        Detail saham akan hadir di sini.
      </p>
    </main>
  );
}
