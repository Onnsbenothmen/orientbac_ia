"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: {
    annee: number;
    score_moyen: number;
    score_min: number;
    score_max: number;
    nb_filieres: number;
  }[];
}

export default function ScoresByYearChart({ data }: Props) {
  const maxScore = data.length
    ? Math.max(...data.map((d) => Math.max(d.score_max, d.score_moyen, d.score_min)))
    : 0;
  const axisMax = Math.max(20, Math.ceil((maxScore + 5) / 10) * 10);

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-700">
        Evolution des scores par annee
      </h2>
      {data.length === 0 ? (
        <p className="text-sm text-slate-400">Aucune donnée disponible</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="annee" />
            <YAxis domain={[0, axisMax]} />
            <Tooltip
              formatter={(value: number) => value.toFixed(2)}
              labelFormatter={(label) => `Année ${label}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="score_moyen"
              name="Score moyen"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="score_min"
              name="Score min"
              stroke="#10b981"
              strokeDasharray="5 5"
            />
            <Line
              type="monotone"
              dataKey="score_max"
              name="Score max"
              stroke="#ef4444"
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
