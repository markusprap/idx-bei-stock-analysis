import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";

type SearchResult = {
  code: string | null;
  stockName: string | null;
};

type SearchResponse = {
  results: SearchResult[];
  query: string;
};

export function StockSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim()) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = (await res.json()) as SearchResponse;
          setResults(data.results);
          setIsOpen(true);
        }
      } catch {
        setIsOpen(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (!val.trim()) {
      setResults([]);
      setIsOpen(false);
    }
  }

  function handleSelect(code: string | null) {
    if (!code) return;
    setIsOpen(false);
    setQuery("");
    setResults([]);
    void navigate({ to: "/stock/$code", params: { code } });
  }

  function handleClear() {
    setQuery("");
    setResults([]);
    setIsOpen(false);
  }

  function handleBlur() {
    setTimeout(() => setIsOpen(false), 150);
  }

  function handleFocus() {
    if (results.length > 0) setIsOpen(true);
  }

  return (
    <div className="stock-search">
      <div className="stock-search-input-wrapper">
        <svg className="stock-search-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          className="stock-search-input"
          placeholder="Cari saham... (mis. BBCA, Bank Central)"
          value={query}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            className="stock-search-clear"
            onClick={handleClear}
            aria-label="Hapus pencarian"
          >
            ×
          </button>
        )}
      </div>

      {isOpen && (
        <ul className="stock-search-results" role="listbox">
          {results.length === 0 ? (
            <li className="stock-search-empty">
              Tidak ada saham yang cocok dengan &ldquo;{query}&rdquo;
            </li>
          ) : (
            results.map((r) => (
              <li key={r.code} role="option" aria-selected="false">
                <button
                  type="button"
                  className="stock-search-result-btn"
                  onMouseDown={() => handleSelect(r.code)}
                >
                  <span className="stock-search-ticker">{r.code}</span>
                  <span className="stock-search-name">{r.stockName ?? "—"}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
