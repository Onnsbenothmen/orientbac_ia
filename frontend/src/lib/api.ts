/**
 * API helper — centralise les appels vers le backend Django.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const AUTH_TOKEN_KEY = "edustat_auth_token";

function getAuthToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(AUTH_TOKEN_KEY) || "";
}

function setAuthToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

function clearAuthToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options?.headers || {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Token ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({} as Record<string, unknown>));

    if (typeof body.error === "string" && body.error.trim()) {
      throw new Error(body.error);
    }

    if (body && typeof body === "object") {
      const details = Object.entries(body as Record<string, unknown>)
        .map(([field, value]) => {
          if (Array.isArray(value)) {
            return `${field}: ${value.join(", ")}`;
          }
          if (typeof value === "string") {
            return `${field}: ${value}`;
          }
          return "";
        })
        .filter(Boolean)
        .join(" | ");

      if (details) {
        throw new Error(details);
      }
    }

    throw new Error(`API error ${res.status}`);
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

export interface AuthUser {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "admin" | "etudiant";
  niveau_etude: string;
  section_bac: string;
  departement: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface ChangePasswordResponse {
  message: string;
  token: string;
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

  signUp: (payload: {
    username: string;
    email?: string;
    password: string;
    password_confirm: string;
    first_name?: string;
    last_name?: string;
  }) =>
    apiFetch<AuthResponse>("/api/auth/signup/", {
      method: "POST",
      body: JSON.stringify(payload),
    }).then((res) => {
      setAuthToken(res.token);
      return res;
    }),

  login: (username: string, password: string) =>
    apiFetch<AuthResponse>("/api/auth/login/", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }).then((res) => {
      setAuthToken(res.token);
      return res;
    }),

  getProfile: () => apiFetch<AuthUser>("/api/auth/profile/"),

  updateProfile: (payload: Partial<AuthUser>) =>
    apiFetch<AuthUser>("/api/auth/profile/", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  logout: async () => {
    try {
      await apiFetch<{ message: string }>("/api/auth/logout/", { method: "POST" });
    } catch {
      // On nettoie localement meme si le backend est deja deconnecte.
    } finally {
      clearAuthToken();
    }
  },

  changePassword: (oldPassword: string, newPassword: string, newPasswordConfirm: string) =>
    apiFetch<ChangePasswordResponse>("/api/auth/change-password/", {
      method: "POST",
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      }),
    }).then((res) => {
      setAuthToken(res.token);
      return res;
    }),

  getStoredToken: () => getAuthToken(),
};
