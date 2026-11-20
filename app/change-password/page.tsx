"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, GraduationCap, LockKeyhole } from "lucide-react";
import { apiRequest } from "@/lib/api";

type Role = "student" | "registrar" | "admin";
const roleRoutes: Record<Role, string> = { student: "/student/dashboard", registrar: "/registrar/dashboard", admin: "/admin/dashboard" };

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) { setError("The new passwords do not match."); return; }
    setSaving(true);
    try {
      await apiRequest<{ message: string }>("change_password", {
        method: "POST",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const { user } = await apiRequest<{ user: { role: Role } }>("me");
      router.replace(roleRoutes[user.role]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update your password.");
    } finally {
      setSaving(false);
    }
  }

  return <main className="grid min-h-screen place-items-center bg-slate-100 px-4 py-10">
    <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
      <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-blue-700"><GraduationCap size={24}/></div>
      <p className="text-sm font-medium text-blue-700">EduTrack account security</p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">Change your temporary password</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">For your security, choose a new password before continuing to your account.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-slate-700">Temporary password<input required autoComplete="current-password" type="password" value={currentPassword} onChange={(event)=>setCurrentPassword(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></label>
        <label className="block text-sm font-medium text-slate-700">New password<div className="relative"><LockKeyhole size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input required minLength={8} maxLength={200} autoComplete="new-password" type="password" value={newPassword} onChange={(event)=>setNewPassword(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></div><span className="mt-1 block text-xs font-normal text-slate-500">Use at least 8 characters.</span></label>
        <label className="block text-sm font-medium text-slate-700">Confirm new password<input required minLength={8} maxLength={200} autoComplete="new-password" type="password" value={confirmPassword} onChange={(event)=>setConfirmPassword(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></label>
        {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</p>}
        <button disabled={saving} type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? "Updating…" : "Change password and continue"}<ArrowRight size={16}/></button>
      </form>
    </section>
  </main>;
}
