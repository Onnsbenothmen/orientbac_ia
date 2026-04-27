"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, FiliereItem, PredictionResult, RecommendationResponse } from "@/lib/api";

const SECTIONS = [
  { value: "M", label: "Math", full: "Mathématiques" },
  { value: "S", label: "Sciences", full: "Sciences Exp." },
  { value: "T", label: "Technique", full: "Technique" },
  { value: "E", label: "Économie", full: "Économie" },
  { value: "L", label: "Lettres", full: "Lettres" },
  { value: "I", label: "Info", full: "Informatique" },
  { value: "SP", label: "Sport", full: "Sport" },
];

const SCORE_MIN = 100;
const SCORE_MAX = 200;

type Niveau = "Très favorable" | "Favorable" | "Possible" | "Limite" | "Ambitieux";

function niveauFromProba(p: number): Niveau {
  if (p >= 0.80) return "Très favorable";
  if (p >= 0.60) return "Favorable";
  if (p >= 0.45) return "Possible";
  if (p >= 0.30) return "Limite";
  return "Ambitieux";
}

function colorClasses(n: string | Niveau) {
  // normalize accents and case so backend values like "Tres favorable" still match
  const norm = String(n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (norm.includes('tres') || norm.includes('tres favorable') || norm.includes('tresfavor')) {
    return { bg: 'bg-[#3B6D11]', bgLight: 'bg-[#E8F5D6]', border: 'border-[#3B6D11]', text: 'text-[#3B6D11]', textDark: 'text-[#2A4F0C]' };
  }
  if (norm.includes('favorable') && !norm.includes('tres')) {
    return { bg: 'bg-[#3B6D11]', bgLight: 'bg-[#E8F5D6]', border: 'border-[#3B6D11]', text: 'text-[#3B6D11]', textDark: 'text-[#2A4F0C]' };
  }
  if (norm.includes('possible') || norm.includes('limite')) {
    return { bg: 'bg-[#854F0B]', bgLight: 'bg-[#FDF3E2]', border: 'border-[#854F0B]', text: 'text-[#854F0B]', textDark: 'text-[#5E3808]' };
  }
  if (norm.includes('ambitieux')) {
    return { bg: 'bg-[#A32D2D]', bgLight: 'bg-[#FCE8E8]', border: 'border-[#A32D2D]', text: 'text-[#A32D2D]', textDark: 'text-[#7A2020]' };
  }
  // fallback
  return { bg: 'bg-[#3B6D11]', bgLight: 'bg-[#E8F5D6]', border: 'border-[#3B6D11]', text: 'text-[#3B6D11]', textDark: 'text-[#2A4F0C]' };
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 h-4 w-1/3 rounded bg-gray-200" />
      <div className="mb-6 h-12 w-2/3 rounded bg-gray-200" />
      <div className="mb-4 h-4 w-full rounded bg-gray-200" />
      <div className="grid grid-cols-3 gap-4">
        <div className="h-16 rounded bg-gray-200" />
        <div className="h-16 rounded bg-gray-200" />
        <div className="h-16 rounded bg-gray-200" />
      </div>
      
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="h-4 w-1/2 rounded bg-gray-200" />
            <div className="h-6 w-16 rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PredictPage() {
  const router = useRouter();
  const [score, setScore] = useState<number>(145);
  const [section, setSection] = useState<string>("M");
  
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<FiliereItem[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [selectedFiliere, setSelectedFiliere] = useState<FiliereItem | null>(null);
  const [selectedFilieres, setSelectedFilieres] = useState<FiliereItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<"prediction" | "recommendations">("prediction");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null);
  const [history, setHistory] = useState<{annee:number; section_bac:string; score_dernier_admis:number}[] | null>(null);
  const [explainOpen, setExplainOpen] = useState<boolean>(false);
  const [comparisons, setComparisons] = useState<{ f: FiliereItem; r: PredictionResult }[]>([]);

  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!api.getStoredToken()) {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    // Load saved profile from localStorage (filiere, score, section)
    try {
      const raw = localStorage.getItem("predict:profile");
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj.score) setScore(Number(obj.score));
        if (obj.section) setSection(String(obj.section));
        if (obj.selectedFiliere) setSelectedFiliere(obj.selectedFiliere);
        if (obj.selectedFilieres) setSelectedFilieres(obj.selectedFilieres);
        
      }
    } catch (e) {
      // ignore
    }

    if (searchTimer.current) clearTimeout(searchTimer.current);
    // start searching from 1 character to update results as the user types
    if (search.trim().length < 1) { setSearchResults([]); setShowDropdown(false); return; }
    setLoadingSearch(true); setShowDropdown(true);
    // reduce debounce for more responsive typing experience
    searchTimer.current = setTimeout(async () => {
      try {
        const q = search.trim();
        const data = await api.getFilieres(`search=${encodeURIComponent(q)}`);

        // Lightweight client-side scoring to improve ordering and fuzzy matches
        const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const qnorm = normalize(q);

        const scoreMatch = (item: FiliereItem) => {
          const name = normalize(item.nom || "");
          const code = String(item.code || "").toLowerCase();
          if (code === qnorm) return 100; // exact code
          let score = 0;
          if (name.startsWith(qnorm)) score += 30;
          if (name.includes(qnorm)) score += 20;
          if (code.startsWith(qnorm)) score += 25;
          // token match boost
          const tokens = qnorm.split(/\s+/).filter(Boolean);
          for (const t of tokens) {
            if (name.includes(t)) score += 5;
          }
          // slight preference to shorter distance
          score -= Math.max(0, name.length - qnorm.length) * 0.01;
          return score;
        };

        const scored = data.map((d) => ({ d, score: scoreMatch(d) }));
        scored.sort((a, b) => b.score - a.score);
        // limit client-side to top 50 results to avoid overwhelming the UI
        setSearchResults(scored.slice(0, 50).map((s) => s.d));
        setHighlightedIndex(scored.length ? 0 : -1);
      } catch {
        setSearchResults([]);
        setHighlightedIndex(-1);
      } finally { setLoadingSearch(false); }
    }, 100);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  useEffect(() => {
    try {
      const obj = { selectedFiliere, selectedFilieres, score, section };
      localStorage.setItem("predict:profile", JSON.stringify(obj));
    } catch (e) {}
  }, [selectedFiliere, selectedFilieres, score, section]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) { setShowDropdown(false); }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Load history for selected filiere
  useEffect(() => {
    let mounted = true;
    setHistory(null);
    if (!selectedFiliere) return;
    (async () => {
      try {
        const data = await api.getFiliereHistory(String(selectedFiliere.code));
        if (!mounted) return;
        setHistory(data);
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [selectedFiliere]);

  const handleAnalyze = useCallback(async () => {
    setError(""); setPrediction(null); setRecommendations(null); setComparisons([]); setLoading(true);
    try {
      // Validate score
      if (score < SCORE_MIN || score > SCORE_MAX) {
        setError(`Le score doit être entre ${SCORE_MIN} et ${SCORE_MAX}.`);
        setLoading(false);
        return;
      }

      if (activeTab === "prediction") {
        if (selectedFilieres.length > 0) {
          // Compare up to 3 filieres
          const promises = selectedFilieres.slice(0, 3).map(f => api.predict(score, section, f.code).then(r => ({ f, r })).catch(() => null));
          const results = await Promise.all(promises);
          const comps = results.filter(Boolean) as { f: FiliereItem; r: PredictionResult }[];
          setComparisons(comps);
          setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 120);
        } else if (selectedFiliere) {
          const res = await api.predict(score, section, selectedFiliere.code);
          setPrediction(res);
          setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 120);
        }
      } else {
        const res = await api.recommend(score, section, 10);
        setRecommendations(res);
      }
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Erreur inconnue"); }
    finally { setLoading(false); }
  }, [activeTab, score, section, selectedFiliere, selectedFilieres]);

  // Keyboard navigation for dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || searchResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min((searchResults.length - 1), i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const sel = searchResults[highlightedIndex >= 0 ? highlightedIndex : 0];
      if (sel) { setSelectedFiliere(sel); setSearch(sel.nom); setShowDropdown(false); setPrediction(null); }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  const canSubmit = activeTab === "recommendations" || !!selectedFiliere || selectedFilieres.length > 0;
  const niveau = useMemo(() => { if (!prediction) return null; return niveauFromProba(prediction.probabilite_admission); }, [prediction]);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Prédiction d&apos;admission</h1>
        <p className="mt-1 text-base text-slate-500">Entrez votre score et choisissez une filière pour estimer vos chances d&apos;admission.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="mb-5 text-lg font-semibold text-slate-800">Votre profil</h2>
        <div className="space-y-6">
          <div ref={searchRef} className="relative">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Filière</label>
            {selectedFiliere ? (
              <div className="flex items-center gap-2 rounded-lg border border-[#3B6D11] bg-[#E8F5D6] px-4 py-2.5">
                <span className="flex-1 text-sm font-medium text-[#2A4F0C]">
                  [{selectedFiliere.code}] {selectedFiliere.nom}
                  {selectedFiliere.universite_nom ? ` — ${selectedFiliere.universite_nom}` : ""}
                  {selectedFiliere.duree_annees ? ` (${selectedFiliere.duree_annees} ans)` : ""}
                </span>
                <button type="button" onClick={() => { setSelectedFiliere(null); setSearch(""); setPrediction(null); }}
                  className="rounded-md p-1 text-[#3B6D11] transition hover:bg-[#3B6D11] hover:text-white" aria-label="Supprimer">✕</button>
              </div>
            ) : (
              <div className="relative">
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => search.trim().length >= 2 && setShowDropdown(true)}
                  onKeyDown={handleKeyDown}
                  aria-expanded={showDropdown}
                  aria-haspopup="listbox"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#3B6D11] focus:outline-none focus:ring-2 focus:ring-[#3B6D11]/20"
                  placeholder="Ex: Médecine, Informatique, IHEC… (ou tapez le code)" />
                {loadingSearch && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">Chargement…</span>}
              </div>
            )}
            {showDropdown && !selectedFiliere && (
              <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                {searchResults.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-400">{loadingSearch ? "Recherche…" : "Aucune filière trouvée"}</div>
                ) : (
                  searchResults.map((f, idx) => (
                    <button key={f.id} type="button" onClick={(e) => {
                      const multi = e.ctrlKey || e.metaKey;
                      if (multi) {
                        setSelectedFilieres(s => {
                          const exists = s.find(x => x.id === f.id);
                          if (exists) return s.filter(x => x.id !== f.id);
                          if (s.length >= 3) return s; // limit to 3
                          return [...s, f];
                        });
                        return;
                      }
                      setSelectedFiliere(f); setSearch(f.nom); setShowDropdown(false); setPrediction(null);
                    }}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      role="option"
                      aria-selected={idx === highlightedIndex}
                      className={`w-full px-4 py-2.5 text-left text-sm transition ${idx === highlightedIndex ? 'bg-slate-100' : 'hover:bg-slate-50'}`}>
                      <div className="flex items-center justify-between w-full">
                        <div className="min-w-0">
                          <span className="font-medium text-slate-800 truncate">{f.nom}</span>
                          <div className="mt-0.5 text-xs text-slate-400">{f.universite_nom}{f.duree_annees ? ` • ${f.duree_annees} ans` : ""}</div>
                        </div>
                        <div className="ml-3 shrink-0 text-right text-xs text-slate-400">[{f.code}]</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
            {selectedFilieres.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedFilieres.map((sf) => (
                  <div key={sf.id} className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-1 text-sm text-slate-700">
                    <span className="font-medium truncate">{sf.nom}</span>
                    <button onClick={() => setSelectedFilieres(s => s.filter(x => x.id !== sf.id))} className="text-slate-400">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Score</label>
              <span className="text-lg font-bold tabular-nums text-slate-900">{score.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-3">
              <input aria-label="Score slider" type="range" min={SCORE_MIN} max={SCORE_MAX} step={0.5} value={score}
                onChange={(e) => setScore(parseFloat(e.target.value))} className="flex-1 accent-[#3B6D11]" />
              <input aria-label="Score numérique" type="number" min={SCORE_MIN} max={SCORE_MAX} step={0.5}
                value={score} onChange={(e) => setScore(Number(e.target.value || SCORE_MIN))}
                className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-900" />
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-400"><span>{SCORE_MIN}</span><span>{SCORE_MAX}</span></div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Section du bac</label>
            <div className="flex flex-wrap gap-2">
              {SECTIONS.map((s) => {
                const active = section === s.value;
                return (
                  <button key={s.value} type="button" onClick={() => setSection(s.value)}
                    className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${active ? "bg-[#3B6D11] text-white shadow-sm" : "border border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50"}`}>
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 rounded-lg bg-slate-100 p-1">
            <button type="button" onClick={() => setActiveTab("prediction")}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${activeTab === "prediction" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Prédiction ciblée</button>
            <button type="button" onClick={() => setActiveTab("recommendations")}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${activeTab === "recommendations" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Recommandations</button>
          </div>

          <button type="button" onClick={handleAnalyze} disabled={!canSubmit || loading}
            className="w-full rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">
            {loading ? "Analyse en cours…" : "Analyser mon profil →"}
          </button>
          {activeTab === "prediction" && !selectedFiliere && (
            <p className="text-center text-xs text-slate-400">Sélectionnez une filière pour activer la prédiction ciblée.</p>
          )}
        </div>
      </div>


      {/* Results explanation */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-800">Comment est calculée la probabilité ?</h3>
          <button onClick={() => setExplainOpen((v) => !v)} className="text-sm text-slate-500 hover:text-slate-700">{explainOpen ? 'Masquer' : 'En savoir plus'}</button>
        </div>
        <p className="mt-2 text-sm text-slate-500">La probabilité est estimée depuis les données historiques. Le système utilise un modèle de ML si disponible, sinon une règle heuristique.</p>
        {explainOpen && (
          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            <p className="mb-2">Détails :</p>
            <ul className="list-inside list-disc space-y-1">
              <li>Si un modèle ML est entraîné, on prédit via le modèle (XGBoost) sur ton score, ta section et la filière.</li>
              <li>Sinon, heuristique : <strong>proba ≈ clamp(0,1, 0.5 + (score - seuil_historique) / 20)</strong>.</li>
              <li>Les scores historiques sont fournis par la base et peuvent varier chaque année.</li>
            </ul>
          </div>
        )}
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading && <div className="space-y-4">{activeTab === "prediction" ? <SkeletonCard /> : <SkeletonList />}</div>}

      {comparisons.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-800">Comparaison ({comparisons.length})</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {comparisons.map((c, i) => {
              const n = niveauFromProba(c.r.probabilite_admission);
              return (
                <div key={c.f.id} className={`rounded-xl border ${colorClasses(n).border} ${colorClasses(n).bgLight} p-4`}>
                  <p className="text-sm text-slate-600">{c.f.nom}</p>
                  <p className={`mt-2 text-3xl font-bold ${colorClasses(n).text}`}>{(c.r.probabilite_admission*100).toFixed(0)}%</p>
                  <p className="mt-1 text-xs text-slate-500">Seuil précédent: {c.r.score_dernier_admis_precedent ?? '—'}</p>
                  <div className="mt-3 text-sm text-slate-700">{c.r.conseil}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {prediction && !loading && activeTab === "prediction" && niveau && (
        <div className="space-y-6">
          <div className={`rounded-xl border-2 ${colorClasses(niveau).border} ${colorClasses(niveau).bgLight} p-6 sm:p-8`}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{prediction.filiere_nom}</p>
                <p className="text-xs text-slate-400">{SECTIONS.find(s => s.value === section)?.full}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold text-white ${colorClasses(niveau).bg}`}>{niveau}</span>
            </div>
            {history && history.length > 0 && (
              <div className="mb-4">
                <div className="text-xs text-slate-500">Historique (dernier score admis)</div>
                <svg className="mt-2 h-12 w-full" viewBox="0 0 100 20" preserveAspectRatio="none">
                  {(() => {
                    const values = history.map(h => h.score_dernier_admis);
                    const min = Math.min(...values);
                    const max = Math.max(...values);
                    const points = values.map((v, i) => {
                      const x = (i / Math.max(1, values.length - 1)) * 100;
                      const y = max === min ? 10 : 10 - ((v - min) / (max - min)) * 8;
                      return `${x},${y}`;
                    }).join(' ');
                    return <polyline fill="none" stroke="#3B6D11" strokeWidth={1.5} points={points} />;
                  })()}
                </svg>
              </div>
            )}
            <div className="mb-6 text-center">
              <span className={`text-5xl font-extrabold ${colorClasses(niveau).text}`}>{(prediction.probabilite_admission * 100).toFixed(0)}%</span>
              <p className="mt-1 text-sm text-slate-500">Probabilité d&apos;admission</p>
            </div>
            <div className="mb-6">
              <div className="h-3 w-full rounded-full bg-slate-200">
                <div className={`h-3 rounded-full transition-all duration-500 ${colorClasses(niveau).bg}`}
                  style={{ width: `${Math.min(100, prediction.probabilite_admission * 100)}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-white/70 p-3 text-center"><p className="text-xs text-slate-500">Votre score</p><p className="text-lg font-bold text-slate-900">{score.toFixed(1)}</p></div>
              <div className="rounded-lg bg-white/70 p-3 text-center"><p className="text-xs text-slate-500">Seuil historique</p><p className="text-lg font-bold text-slate-900">{prediction.score_dernier_admis_precedent !== null ? prediction.score_dernier_admis_precedent.toFixed(1) : "—"}</p></div>
              <div className="rounded-lg bg-white/70 p-3 text-center"><p className="text-xs text-slate-500">Marge</p><p className="text-lg font-bold text-slate-900">{prediction.score_dernier_admis_precedent !== null ? `${score >= prediction.score_dernier_admis_precedent ? "+" : ""}${(score - prediction.score_dernier_admis_precedent).toFixed(1)}` : "—"}</p></div>
            </div>
            <div className="mt-4 rounded-lg bg-white/60 p-4 text-sm text-slate-700">💡 {prediction.conseil}</div>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={async () => {
                try {
                  const rec = await api.recommend(score, section, 10);
                  setRecommendations(rec);
                  setActiveTab("recommendations");
                  setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 120);
                } catch (e) { setError("Impossible de charger les recommandations."); }
              }} className="rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">Voir recommandations similaires</button>

              <button type="button" onClick={() => {
                const txt = `${prediction.filiere_nom} — Probabilité ${(prediction.probabilite_admission*100).toFixed(0)}% • Score: ${score.toFixed(1)}`;
                navigator.clipboard?.writeText(txt);
              }} className="rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">Copier le résumé</button>
            </div>
            {/* Legend */}
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-8 rounded" style={{ backgroundColor: '#3B6D11' }} />
                <span className="text-xs text-slate-600">Favorable</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-8 rounded" style={{ backgroundColor: '#854F0B' }} />
                <span className="text-xs text-slate-600">Possible / Limite</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-8 rounded" style={{ backgroundColor: '#A32D2D' }} />
                <span className="text-xs text-slate-600">Ambitieux</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {recommendations && !loading && activeTab === "recommendations" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Filières recommandées</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{recommendations.total} compatibles</span>
          </div>
          {recommendations.results.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">Aucune filière trouvée pour ce score et cette section.</div>
          ) : (
            <div className="space-y-3">
              {recommendations.results.map((item, idx) => {
                const min = item.score_min, max = item.score_max;
                const width = max > min ? Math.min(100, Math.max(0, ((score - min) / (max - min)) * 100)) : 100;
                const niveauItem = item.niveau as Niveau;
                const colors = colorClasses(niveauItem);
                return (
                  <div key={`${item.filiere_code}-${idx}`} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><p className="font-semibold text-slate-800 truncate">{idx + 1}. {item.filiere_nom}</p><p className="text-sm text-slate-500">{item.universite_nom} • {item.gouvernorat}</p></div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold text-white ${colors.bg}`}>{(item.probabilite_estimee * 100).toFixed(0)}%</span>
                    </div>
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-400"><span>Plage historique</span><span>{item.score_min.toFixed(1)} — {item.score_max.toFixed(1)}</span></div>
                      <div className="h-2 w-full rounded-full bg-slate-100"><div className={`h-2 rounded-full transition-all ${colors.bg}`} style={{ width: `${width}%` }} /></div>
                      <p className="mt-1 text-xs text-slate-400">Seuil: {item.dernier_seuil.toFixed(1)} • Marge: <span className={item.marge >= 0 ? "text-[#3B6D11]" : "text-[#A32D2D]"}>{item.marge >= 0 ? "+" : ""}{item.marge.toFixed(1)}</span></p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
