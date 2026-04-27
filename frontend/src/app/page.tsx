"use client";

import { useEffect, useState } from "react";
import { api, DashboardStats } from "@/lib/api";
import StatsCards from "@/components/StatsCards";
import ScoresByYearChart from "@/components/ScoresByYearChart";
import ScoresByGovChart from "@/components/ScoresByGovChart";
import ScoresBySectionChart from "@/components/ScoresBySectionChart";
import TopFilieresTable from "@/components/TopFilieresTable";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getDashboard()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );

  if (error)
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
        <h2 className="font-semibold">Erreur de chargement</h2>
        <p className="mt-1 text-sm">{error}</p>
        <p className="mt-2 text-xs text-red-500">
          Vérifiez que le backend Django est lancé sur{" "}
          <code className="rounded bg-red-100 px-1">http://localhost:8000</code>
        </p>
      </div>
    );

  if (!data) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          Dashboard BI — Orientation Universitaire
        </h1>
        <p className="mt-1 text-slate-500">
          Vue d&apos;ensemble des scores d&apos;admission en Tunisie
        </p>
      </div>

      {/* KPI Cards */}
      <StatsCards totaux={data.totaux} />

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ScoresByYearChart data={data.scores_par_annee} />
        <ScoresBySectionChart data={data.scores_par_section} />
      </div>

      {/* Charts Row 2 */}
      <ScoresByGovChart
        data={data.scores_par_gouvernorat}
        zoneLabel={data.meta?.zone_label || "gouvernorat"}
      />

      {/* Top filières table */}
      <TopFilieresTable data={data.top_filieres_selectives} />
    </div>
  );
}
