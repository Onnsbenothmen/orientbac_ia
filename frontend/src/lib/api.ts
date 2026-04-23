/**
 * API helper — centralise les appels vers le backend Django.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }
  return res.json();
}

/* ── Types ──────────────────────────────────────────── */

export interface DashboardStats {
  meta?: {
    zone_label?: string;
    score_scale?: string;
  };
  totaux: {
    gouvernorats: number;
    universites: number;
    filieres: number;
    scores: number;
  };
  scores_par_annee: {
    annee: number;
    score_moyen: number;
    score_min: number;
    score_max: number;
    nb_filieres: number;
  }[];
  scores_par_gouvernorat: {
    filiere__universite__gouvernorat__nom: string;
    score_moyen: number;
    nb_filieres: number;
  }[];
  scores_par_section: {
    section_bac: string;
    score_moyen: number;
    nb_scores: number;
  }[];
  top_filieres_selectives: {
    filiere__code: string;
    filiere__nom: string;
    filiere__universite__nom: string;
    score_dernier_admis: number;
    section_bac: string;
  }[];
}

export interface PredictionResult {
  filiere_code: string;
  filiere_nom: string;
  probabilite_admission: number;
  score_dernier_admis_precedent: number | null;
  conseil: string;
}

export interface RecommendationItem {
  filiere_code: string;
  filiere_nom: string;
  universite_nom: string;
  gouvernorat: string;
  type_diplome: string;
  score_min: number;
  score_moyen: number;
  score_max: number;
  dernier_seuil: number;
  marge: number;
  probabilite_estimee: number;
  niveau: string;
}

export interface RecommendationResponse {
  section_bac: string;
  score: number;
  total: number;
  results: RecommendationItem[];
}

export interface ChatResponse {
  response: string;
  model: string;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export interface FiliereItem {
  id: number;
  code: string;
  nom: string;
  universite_nom?: string;
  gouvernorat?: string;
  type_diplome?: string;
  duree_annees?: number;
  sections_admises?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/* ── API Calls ──────────────────────────────────────── */

export const api = {
  getDashboard: () => apiFetch<DashboardStats>("/api/stats/dashboard/"),

  predict: (score: number, section_bac: string, filiere_code: string) =>
    apiFetch<PredictionResult>("/api/predict/", {
      method: "POST",
      body: JSON.stringify({ score, section_bac, filiere_code }),
    }),

  recommend: (score: number, section_bac: string, limit = 10) =>
    apiFetch<RecommendationResponse>("/api/recommendations/", {
      method: "POST",
      body: JSON.stringify({ score, section_bac, limit }),
    }),
  recommendWithFilter: (score: number, section_bac: string, limit = 10, type_diplome?: string) =>
    apiFetch<RecommendationResponse>("/api/recommendations/", {
      method: "POST",
      body: JSON.stringify({ score, section_bac, limit, type_diplome }),
    }),

  chat: (
    message: string,
    history: { role: string; content: string }[] = [],
    verbosity: "short" | "detailed" | "full" = "short"
  ) =>
    apiFetch<ChatResponse>("/api/chat/", {
      method: "POST",
      body: JSON.stringify({ message, history, verbosity }),
    }),

  getFilieres: (params?: string) =>
    apiFetch<PaginatedResponse<FiliereItem>>(
      `/api/filieres/${params ? `?${params}` : ""}`
    ).then((r) => r.results),
  getFiliereHistory: (code: string) => apiFetch<{ annee: number; section_bac: string; score_dernier_admis: number }[]>(`/api/filieres/${encodeURIComponent(code)}/history/`),
};
