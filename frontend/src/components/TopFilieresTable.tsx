interface Props {
  data: {
    filiere__code: string;
    filiere__nom: string;
    filiere__universite__nom: string;
    score_dernier_admis: number;
    section_bac: string;
  }[];
}

export default function TopFilieresTable({ data }: Props) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-700">
        Top 10 — Filieres les plus selectives
      </h2>
      {data.length === 0 ? (
        <p className="text-sm text-slate-400">Aucune donnée disponible</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-slate-500">
                <th className="pb-3 pr-4">#</th>
                <th className="pb-3 pr-4">Code</th>
                <th className="pb-3 pr-4">Filière</th>
                <th className="pb-3 pr-4">Établissement</th>
                <th className="pb-3 pr-4">Section</th>
                <th className="pb-3 text-right">Score dernier admis</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 pr-4 font-medium text-slate-400">{i + 1}</td>
                  <td className="py-3 pr-4 font-mono text-xs">{row.filiere__code}</td>
                  <td className="py-3 pr-4 font-medium text-slate-700">{row.filiere__nom}</td>
                  <td className="py-3 pr-4 text-slate-500">{row.filiere__universite__nom}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                      {row.section_bac}
                    </span>
                  </td>
                  <td className="py-3 text-right font-bold text-primary-600">
                    {row.score_dernier_admis.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
