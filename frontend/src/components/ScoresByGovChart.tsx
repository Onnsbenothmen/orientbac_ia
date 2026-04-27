"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: {
    filiere__universite__gouvernorat__nom: string;
    score_moyen: number;
    nb_filieres: number;
  }[];
  zoneLabel?: string;
}

export default function ScoresByGovChart({ data, zoneLabel = "gouvernorat" }: Props) {
  const formatted = data.map((d) => ({
    gouvernorat: d.filiere__universite__gouvernorat__nom,
    score_moyen: Number(d.score_moyen.toFixed(2)),
    nb_filieres: d.nb_filieres,
  }));

  const maxScore = formatted.length
    ? Math.max(...formatted.map((d) => d.score_moyen))
    : 0;
  const axisMax = Math.max(20, Math.ceil((maxScore + 5) / 10) * 10);

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-700">
        Score moyen par {zoneLabel}
      </h2>
      {data.length === 0 ? (
        <p className="text-sm text-slate-400">Aucune donnée disponible</p>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={formatted} layout="vertical" margin={{ left: 100 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" domain={[0, axisMax]} />
            <YAxis type="category" dataKey="gouvernorat" width={90} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: number) => value.toFixed(2)}
              labelFormatter={(label) => label}
            />
            <Bar dataKey="score_moyen" name="Score moyen" fill="#2563eb" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
