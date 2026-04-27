"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, AuthUser } from "@/lib/api";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

  useEffect(() => {
    if (!api.getStoredToken()) {
      router.push("/login");
      return;
    }
    api.getProfile()
      .then((data) => setProfile(data))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [router]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const updated = await api.updateProfile(profile);
      setProfile(updated);
      setMessage("Profil mis a jour avec succes.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur de mise a jour");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await api.logout();
    router.push("/login");
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    setPasswordSaving(true);
    try {
      const res = await api.changePassword(oldPassword, newPassword, newPasswordConfirm);
      setMessage(res.message);
      setOldPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur de changement de mot de passe");
    } finally {
      setPasswordSaving(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-slate-500">Chargement du profil...</div>;
  }

  if (!profile) {
    return <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error || "Profil introuvable."}</div>;
  }

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mon profil</h1>
          <p className="text-sm text-slate-500">Role: {profile.role}</p>
        </div>
        <button onClick={logout} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Se deconnecter</button>
      </div>

      <form onSubmit={onSave} className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Prenom</label>
          <input value={profile.first_name} onChange={(e) => setProfile({ ...profile, first_name: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nom</label>
          <input value={profile.last_name} onChange={(e) => setProfile({ ...profile, last_name: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>

        {profile.role === "etudiant" && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Niveau d&apos;etude</label>
              <input value={profile.niveau_etude} onChange={(e) => setProfile({ ...profile, niveau_etude: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Section bac</label>
              <input value={profile.section_bac} onChange={(e) => setProfile({ ...profile, section_bac: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </>
        )}

        {profile.role === "admin" && (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Departement</label>
            <input value={profile.departement} onChange={(e) => setProfile({ ...profile, departement: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
        )}

        {message && <p className="sm:col-span-2 rounded-md border border-green-200 bg-green-50 p-2 text-sm text-green-700">{message}</p>}
        {error && <p className="sm:col-span-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>}

        <button type="submit" disabled={saving} className="sm:col-span-2 w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
          {saving ? "Enregistrement..." : "Sauvegarder"}
        </button>
      </form>

      <hr className="my-8 border-slate-200" />

      <form onSubmit={onChangePassword} className="grid gap-4 sm:grid-cols-2">
        <h2 className="sm:col-span-2 text-lg font-semibold text-slate-900">Changer le mot de passe</h2>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">Ancien mot de passe</label>
          <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nouveau mot de passe</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Confirmer nouveau mot de passe</label>
          <input type="password" value={newPasswordConfirm} onChange={(e) => setNewPasswordConfirm(e.target.value)} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>

        <button type="submit" disabled={passwordSaving} className="sm:col-span-2 w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
          {passwordSaving ? "Mise a jour..." : "Mettre a jour le mot de passe"}
        </button>
      </form>
    </div>
  );
}
