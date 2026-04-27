import type { Metadata } from "next";
import AppNavbar from "@/components/AppNavbar";
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
        <AppNavbar />

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
