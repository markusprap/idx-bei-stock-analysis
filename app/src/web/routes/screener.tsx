import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Sidebar } from "../components/layout/Sidebar";
import "./screener.css";

type ScreenerRow = {
  code: string | null;
  stockName: string | null;
  sector: string | null;
  fsDate: string | null;
  per: number | null;
  priceBv: number | null;
  roe: number | null;
  roa: number | null;
  npm: number | null;
  eps: number | null;
};

type ScreenerResponse = {
  results: ScreenerRow[];
  total: number;
};

type Filters = {
  perMin: string;
  perMax: string;
  pbvMin: string;
  pbvMax: string;
  roeMin: string;
  roaMin: string;
  sector: string;
};

const EMPTY_FILTERS: Filters = {
  perMin: "",
  perMax: "",
  pbvMin: "",
  pbvMax: "",
  roeMin: "",
  roaMin: "",
  sector: "",
};

function buildQueryString(f: Filters): string {
  const p = new URLSearchParams();
  if (f.perMin) p.set("per_min", f.perMin);
  if (f.perMax) p.set("per_max", f.perMax);
  if (f.pbvMin) p.set("pbv_min", f.pbvMin);
  if (f.pbvMax) p.set("pbv_max", f.pbvMax);
  if (f.roeMin) p.set("roe_min", f.roeMin);
  if (f.roaMin) p.set("roa_min", f.roaMin);
  if (f.sector) p.set("sector", f.sector);
  return p.toString();
}

function fmt(v: number | null, d = 2): string {
  return v === null ? "—" : v.toFixed(d);
}

export function ScreenerRoute() {
  const navigate = useNavigate();
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);

  const qs = buildQueryString(applied);

  const { data, isLoading, isError } = useQuery<ScreenerResponse>({
    queryKey: ["screener", qs],
    queryFn: async () => {
      const res = await fetch(`/api/screener/fundamental${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("fetch failed");
      return res.json() as Promise<ScreenerResponse>;
    },
    staleTime: 5 * 60 * 1000,
  });

  function handleApply(e: React.FormEvent) {
    e.preventDefault();
    setApplied({ ...draft });
  }

  function handleReset() {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
  }

  function setField(key: keyof Filters) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setDraft((prev) => ({ ...prev, [key]: e.target.value }));
    };
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="screener-page app-main">
        <h1 className="screener-title">Screener Fundamental</h1>
        <p className="screener-subtitle">
          Filter saham berdasarkan data fundamental tahunan EOD. Hasil bukan rekomendasi beli/jual.
        </p>

        <form className="screener-filters" onSubmit={handleApply}>
          <div className="screener-filter-grid">
            <fieldset className="screener-fieldset">
              <legend>PER</legend>
              <div className="screener-range">
                <input
                  type="number"
                  placeholder="Min"
                  value={draft.perMin}
                  onChange={setField("perMin")}
                  min="0"
                  step="0.1"
                />
                <span>—</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={draft.perMax}
                  onChange={setField("perMax")}
                  min="0"
                  step="0.1"
                />
              </div>
            </fieldset>

            <fieldset className="screener-fieldset">
              <legend>PBV</legend>
              <div className="screener-range">
                <input
                  type="number"
                  placeholder="Min"
                  value={draft.pbvMin}
                  onChange={setField("pbvMin")}
                  min="0"
                  step="0.1"
                />
                <span>—</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={draft.pbvMax}
                  onChange={setField("pbvMax")}
                  min="0"
                  step="0.1"
                />
              </div>
            </fieldset>

            <fieldset className="screener-fieldset">
              <legend>ROE min (%)</legend>
              <input
                type="number"
                placeholder="Min"
                value={draft.roeMin}
                onChange={setField("roeMin")}
                step="0.1"
              />
            </fieldset>

            <fieldset className="screener-fieldset">
              <legend>ROA min (%)</legend>
              <input
                type="number"
                placeholder="Min"
                value={draft.roaMin}
                onChange={setField("roaMin")}
                step="0.1"
              />
            </fieldset>

            <fieldset className="screener-fieldset screener-fieldset--sector">
              <legend>Sektor</legend>
              <input
                type="text"
                placeholder="e.g. Keuangan"
                value={draft.sector}
                onChange={setField("sector")}
              />
            </fieldset>
          </div>

          <div className="screener-actions">
            <button type="submit" className="screener-btn-apply">Terapkan Filter</button>
            <button type="button" className="screener-btn-reset" onClick={handleReset}>Reset</button>
          </div>
        </form>

        <div className="screener-results">
          {isLoading && <p className="screener-state">Memuat hasil...</p>}
          {isError && <p className="screener-state screener-state--error">Gagal memuat data. Coba lagi.</p>}
          {!isLoading && !isError && data && (
            <>
              <p className="screener-count">
                {data.total} saham ditemukan
                {data.total === 100 && <span className="screener-cap"> (maks 100 ditampilkan)</span>}
                <span className="screener-eod-badge">EOD • Tahunan</span>
              </p>
              <div className="screener-table-wrap">
                <table className="screener-table">
                  <thead>
                    <tr>
                      <th>Kode</th>
                      <th>Nama</th>
                      <th>Sektor</th>
                      <th>fs Date</th>
                      <th>PER</th>
                      <th>PBV</th>
                      <th>ROE%</th>
                      <th>ROA%</th>
                      <th>NPM%</th>
                      <th>EPS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.results.map((row) => (
                      <tr
                        key={row.code}
                        className="screener-row"
                        onClick={() => row.code && void navigate({ to: "/stock/$code", params: { code: row.code } })}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && row.code) {
                            void navigate({ to: "/stock/$code", params: { code: row.code } });
                          }
                        }}
                      >
                        <td className="screener-cell-code">{row.code ?? "—"}</td>
                        <td className="screener-cell-name">{row.stockName ?? "—"}</td>
                        <td>{row.sector ?? "—"}</td>
                        <td>{row.fsDate ?? "—"}</td>
                        <td>{fmt(row.per)}</td>
                        <td>{fmt(row.priceBv)}</td>
                        <td>{fmt(row.roe)}</td>
                        <td>{fmt(row.roa)}</td>
                        <td>{fmt(row.npm)}</td>
                        <td>{fmt(row.eps, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.results.length === 0 && (
                <p className="screener-empty">Tidak ada saham yang sesuai filter. Coba perluas kriteria.</p>
              )}
            </>
          )}
        </div>

        <p className="screener-disclaimer">
          Data tahunan EOD dari scraper sendiri — bukan data realtime. Hasil screener bukan rekomendasi
          investasi. Apa yang lo cari dari kombinasi filter ini?
        </p>
      </main>
    </div>
  );
}
