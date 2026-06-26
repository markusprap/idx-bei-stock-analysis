import { useQuery } from "@tanstack/react-query";

type SectorRow = {
  indexCode: string;
  sectorName: string;
  close: number | null;
  change: number | null;
  changePct: number | null;
  numberOfStock: number | null;
};

type SectorsResponse = {
  tradeDate: string | null;
  sectors: SectorRow[];
  staleness: { scrapedAt: string; ageHours: number; isStale: boolean } | null;
};

async function fetchSectors(): Promise<SectorsResponse> {
  const res = await fetch("/api/market/sectors");
  if (!res.ok) throw new Error(`Failed to fetch sectors: ${res.status}`);
  return res.json() as Promise<SectorsResponse>;
}

function formatPct(n: number | null): string {
  if (n === null) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function SectorPerformance() {
  const { data, isLoading, isError } = useQuery<SectorsResponse>({
    queryKey: ["sectors"],
    queryFn: fetchSectors,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <section className="sector-performance">
      <h2 className="sector-title">
        Performa Sektor <span className="sector-eod-badge">EOD</span>
      </h2>

      {isLoading && <p className="sector-state">Memuat data sektor...</p>}
      {isError && <p className="sector-state sector-error">Gagal memuat data sektor.</p>}

      {data?.staleness?.isStale && (
        <p className="sector-stale-warning">
          ⚠ Data mungkin sudah lebih dari {data.staleness.ageHours} jam yang lalu.
        </p>
      )}

      {data && data.sectors.length === 0 && (
        <p className="sector-state">Data sektor belum tersedia.</p>
      )}

      {data && data.sectors.length > 0 && (
        <div className="sector-list">
          {data.sectors.map((s) => {
            const positive = s.changePct !== null && s.changePct > 0;
            const negative = s.changePct !== null && s.changePct < 0;
            const pctClass = positive ? "sector-pct-positive" : negative ? "sector-pct-negative" : "sector-pct-neutral";
            return (
              <div key={s.indexCode} className="sector-row">
                <span className="sector-name">{s.sectorName}</span>
                <span className={`sector-pct ${pctClass}`}>{formatPct(s.changePct)}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
