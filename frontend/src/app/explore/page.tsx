"use client";

import { useEffect, useState, useRef } from "react";

interface Filiere {
  id: number;
  code: string;
  nom: string;
  universite_nom: string;
  gouvernorat: string;
  type_diplome: string;
  duree_annees: number;
  sections_admises: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ExplorePage() {
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  const fetchFilieres = async (query: string, pageNum: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("search", query);
      params.set("page", String(pageNum));
      const res = await fetch(`${API_BASE}/api/filieres/?${params}`);
      const data = await res.json();
      setFilieres(data.results || []);
      setHasNext(!!data.next);
    } catch {
      setFilieres([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch when page changes (pagination)
  useEffect(() => {
    fetchFilieres(search, page);
  }, [page]);

  // Real-time search with debounce and minimum characters
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const q = search.trim();

    // If query too short, clear results or fetch all when empty
    if (q.length < 2) {
      if (q === "") {
        fetchFilieres("", 1);
      } else {
        setFilieres([]);
        setHasNext(false);
      }
      return;
    }

    debounceRef.current = window.setTimeout(() => {
      // If we're not on page 1, change page to 1 to trigger pagination effect
      if (page !== 1) {
        setPage(1);
      } else {
        fetchFilieres(q, 1);
      }
    }, 300);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchFilieres(search, 1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Explorer les filieres</h1>
        <p className="mt-1 text-slate-500">
          Recherchez parmi toutes les filières universitaires tunisiennes
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou code (ex: Informatique, 601…)"
          className="flex-1 rounded-xl border border-slate-300 px-4 py-3 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
        />
        <button
          type="submit"
          className="rounded-xl bg-primary-600 px-6 py-3 font-medium text-white transition hover:bg-primary-700"
        >
          Rechercher
        </button>
      </form>

      {/* Results */}
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        </div>
      ) : filieres.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-slate-400">
          Aucune filière trouvée. Essayez un autre terme de recherche.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filieres.map((f) => (
            <div
              key={f.id}
              className="rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-block rounded bg-primary-100 px-2 py-0.5 text-xs font-mono font-medium text-primary-700">
                    {f.code}
                  </span>
                  <h3 className="mt-2 font-semibold text-slate-800">{f.nom}</h3>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                  {f.type_diplome}
                </span>
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-500">
                <p>{f.universite_nom}</p>
                <p>{f.gouvernorat}</p>
                <p>{f.duree_annees} ans</p>
                {f.sections_admises && (
                  <div className="flex items-center gap-1">
                    {f.sections_admises.split(",").map((s) => (
                      <span
                        key={s}
                        className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700"
                      >
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
        >
          ← Précédent
        </button>
        <span className="text-sm text-slate-500">Page {page}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasNext}
          className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
        >
          Suivant →
        </button>
      </div>
    </div>
  );
}
