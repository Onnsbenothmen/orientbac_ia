interface Props {
  totaux: {
    gouvernorats: number;
    universites: number;
    filieres: number;
    scores: number;
  };
}

const cards = [
  { key: "universites" as const, label: "Établissements", icon: "", color: "bg-emerald-50 text-emerald-700" },
  { key: "filieres" as const, label: "Filières", icon: "", color: "bg-amber-50 text-amber-700" },
  { key: "scores" as const, label: "Scores enregistrés", icon: "", color: "bg-purple-50 text-purple-700" },
];

export default function StatsCards({ totaux }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((c) => (
        <div
          key={c.key}
          className={`rounded-xl border p-5 shadow-sm ${c.color}`}
        >
          <div className="text-2xl">{c.icon}</div>
          <div className="mt-2 text-2xl font-bold">{totaux[c.key].toLocaleString("fr-TN")}</div>
          <div className="text-sm opacity-80">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
