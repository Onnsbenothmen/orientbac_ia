"use client";

import { useEffect, useState } from "react";
import { api, AuthUser } from "@/lib/api";

export default function AppNavbar() {
  const [profile, setProfile] = useState<AuthUser | null>(null);

  async function handleLogout() {
    await api.logout();
    setProfile(null);
  }

  useEffect(() => {
    if (!api.getStoredToken()) return;
    api.getProfile().then(setProfile).catch(() => {
      api.logout();
      setProfile(null);
    });
  }, []);

  const isLoggedIn = !!profile;
  const isAdmin = profile?.role === "admin";

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <a href="/" className="flex items-center gap-2 text-xl font-bold text-primary-700">
          EduStat-TN
        </a>

        <div className="flex gap-6 text-sm font-medium text-slate-600">
          {!isLoggedIn && (
            <>
              <a href="/login" className="hover:text-primary-600 transition">Login</a>
              <a href="/signup" className="hover:text-primary-600 transition">Sign up</a>
            </>
          )}

          {isLoggedIn && (
            <>
              <a href="/" className="hover:text-primary-600 transition">Dashboard</a>
              <a href="/explore" className="hover:text-primary-600 transition">Explorer</a>
              <a href="/predict" className="hover:text-primary-600 transition">Prediction</a>
              <a href="/chat" className="hover:text-primary-600 transition">Chatbot</a>
              {isAdmin ? (
                <a href="http://localhost:8000/admin/" className="hover:text-primary-600 transition" target="_blank" rel="noreferrer">
                  Admin Panel
                </a>
              ) : (
                <a href="/profile" className="hover:text-primary-600 transition">Espace etudiant</a>
              )}
              <a href="/profile" className="hover:text-primary-600 transition">Profil</a>
              <a
                href="/login"
                className="hover:text-primary-600 transition"
                onClick={handleLogout}
              >
                Logout
              </a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
