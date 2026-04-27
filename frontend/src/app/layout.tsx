import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduStat-TN — Orientation Universitaire Tunisie",
  description:
    "Plateforme BI & IA d'aide à l'orientation universitaire pour les bacheliers tunisiens",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-50">
        {/* ── Navbar ────────────────────────────────── */}
        <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <a href="/" className="flex items-center gap-2 text-xl font-bold text-primary-700">
              EduStat-TN
            </a>
            <div className="flex gap-6 text-sm font-medium text-slate-600">
              <a href="/" className="hover:text-primary-600 transition">
                Dashboard
              </a>
              <a href="/explore" className="hover:text-primary-600 transition">
                Explorer
              </a>
              <a href="/predict" className="hover:text-primary-600 transition">
                Prédiction
              </a>
              <a href="/chat" className="hover:text-primary-600 transition">
                Chatbot
              </a>
            </div>
          </div>
        </nav>

        {/* ── Main ──────────────────────────────────── */}
        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>

        {/* ── Footer ────────────────────────────────── */}
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
          © 2026 EduStat-TN · Projet 4ème année Data Science
        </footer>
      </body>
    </html>
  );
}
