"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, AuthUser, DashboardStats } from "@/lib/api";
import ScoresByGovChart from "@/components/ScoresByGovChart";
import ScoresBySectionChart from "@/components/ScoresBySectionChart";
import ScoresByYearChart from "@/components/ScoresByYearChart";
import TopFilieresTable from "@/components/TopFilieresTable";

interface KPIProps {
  label: string;
  value: string;
  hint: string;
}

function KpiCard({ label, value, hint }: KPIProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
      <p className="text-xs uppercase tracking-widest text-slate-500">{label}</p>
      <div className="mt-2 text-3xl font-semibold text-slate-900">{value}</div>
      <p className="mt-2 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!api.getStoredToken()) {
      router.replace("/login");
      return;
    }

    async function load() {
      try {
        const user = await api.getProfile();
        if (user.role !== "admin") {
          router.replace("/");
          return;
        }
        setProfile(user);
        const stats = await api.getDashboard();
        setData(stats);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load admin data");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  const trend = useMemo(() => {
    if (!data || data.scores_par_annee.length < 2) return null;
    const last = data.scores_par_annee[data.scores_par_annee.length - 1];
    const prev = data.scores_par_annee[data.scores_par_annee.length - 2];
    if (!prev || prev.score_moyen === 0) return null;
    const delta = ((last.score_moyen - prev.score_moyen) / prev.score_moyen) * 100;
    return {
      value: delta,
      label: delta >= 0 ? "up" : "down",
    };
  }, [data]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
        <h2 className="font-semibold">Admin dashboard error</h2>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  }

  if (!data || !profile) return null;

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#0E1F1A] via-[#12352C] to-[#132A39] p-10 text-white shadow-xl">
        <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-emerald-400/30 blur-3xl" />
        <div className="absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />

        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.2fr,1fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-emerald-200">Admin cockpit</p>
            <h1 className="font-display mt-4 text-4xl leading-tight">University orientation command center</h1>
            <p className="mt-3 max-w-xl text-sm text-emerald-100/80">
              Welcome {profile.first_name || profile.username}. This view aggregates national admission signals, filters,
              and operational shortcuts for data and content governance.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="http://localhost:8000/admin/"
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-white/15 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-white/25"
              >
                Open Django Admin
              </a>
              <button
                type="button"
                className="rounded-full border border-white/30 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white/90"
              >
                Data Governance
              </button>
              <button
                type="button"
                className="rounded-full border border-white/30 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white/90"
              >
                Reports Export
              </button>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-5">
              <p className="text-xs uppercase tracking-widest text-emerald-200">Score trend</p>
              <div className="mt-2 flex items-end gap-3">
                <span className="text-3xl font-semibold">
                  {trend ? `${trend.value.toFixed(1)}%` : "N/A"}
                </span>
                <span className="rounded-full bg-emerald-500/30 px-2 py-1 text-xs">
                  {trend ? `Last year ${trend.label}` : "Insufficient data"}
                </span>
              </div>
              <p className="mt-3 text-xs text-emerald-100/70">
                Based on the latest average admission score
              </p>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 p-5">
              <p className="text-xs uppercase tracking-widest text-emerald-200">API health</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="text-sm">Operational on port 8000</span>
              </div>
              <p className="mt-3 text-xs text-emerald-100/70">
                Use /api/health for service monitoring
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-4">
        <KpiCard
          label="Gouvernorats"
          value={data.totaux.gouvernorats.toLocaleString("fr-TN")}
          hint="Active regions indexed"
        />
        <KpiCard
          label="Universites"
          value={data.totaux.universites.toLocaleString("fr-TN")}
          hint="Institutions tracked"
        />
        <KpiCard
          label="Filieres"
          value={data.totaux.filieres.toLocaleString("fr-TN")}
          hint="Programs in catalog"
        />
        <KpiCard
          label="Scores"
          value={data.totaux.scores.toLocaleString("fr-TN")}
          hint={data.meta?.score_scale ? `Scale ${data.meta.score_scale}` : "Admission scores stored"}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl text-slate-800">Signals over time</h2>
          <p className="mt-1 text-sm text-slate-500">Longitudinal admission score evolution</p>
          <div className="mt-6">
            <ScoresByYearChart data={data.scores_par_annee} />
          </div>
        </div>
        <div>
          <h2 className="font-display text-2xl text-slate-800">Section balance</h2>
          <p className="mt-1 text-sm text-slate-500">Average scores by baccalaureate section</p>
          <div className="mt-6">
            <ScoresBySectionChart data={data.scores_par_section} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
        <div>
          <h2 className="font-display text-2xl text-slate-800">Regional performance</h2>
          <p className="mt-1 text-sm text-slate-500">Average score by {data.meta?.zone_label || "zone"}</p>
          <div className="mt-6">
            <ScoresByGovChart data={data.scores_par_gouvernorat} zoneLabel={data.meta?.zone_label} />
          </div>
        </div>
        <div>
          <h2 className="font-display text-2xl text-slate-800">Priority insights</h2>
          <p className="mt-1 text-sm text-slate-500">Top selective programs latest year</p>
          <div className="mt-6">
            <TopFilieresTable data={data.top_filieres_selectives} />
          </div>
        </div>
      </section>
    </div>
  );
}
