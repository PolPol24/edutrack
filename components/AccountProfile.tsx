"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, LoaderCircle, Mail, MapPin, Pencil, Phone, UserRound } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import ActionConfirmation from "@/components/ActionConfirmation";
import { apiRequest } from "@/lib/api";

type Role = "student" | "faculty" | "registrar" | "admin";
type Profile = {
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  role: Role;
  student_number?: string | null;
  year_level?: number | null;
  student_status?: string | null;
  program_name?: string | null;
  department_name?: string | null;
  employee_number?: string | null;
  office?: string | null;
};

const titles: Record<Role, string> = { student: "Student", faculty: "Faculty", registrar: "Registrar", admin: "Administrator" };

export default function AccountProfile({ role }: { role: Role }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", address: "", office: "" });
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmSave, setConfirmSave] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function load() {
    setBusy(true);
    try {
      const result = await apiRequest<{ profile: Profile }>("profile");
      setProfile(result.profile);
      setForm({ full_name: result.profile.full_name, email: result.profile.email, phone: result.profile.phone ?? "", address: result.profile.address ?? "", office: result.profile.office ?? "" });
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load your profile.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function requestSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError("");
    setConfirmSave(true);
  }

  async function save() {
    setSaving(true); setSaveError(""); setMessage("");
    try {
      await apiRequest("profile", { method: "PATCH", body: JSON.stringify(form) });
      await load();
      setEditing(false);
      setMessage("Your profile was saved to the database.");
      setConfirmSave(false);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  }

  const initials = profile?.full_name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase() ?? "";
  const profileNumber = profile?.student_number ?? profile?.employee_number ?? "";
  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role={role}/><ActionConfirmation open={confirmSave} title="Save profile changes?" description="Verify these account details before saving them to the database." confirmLabel="Save changes" busy={saving} error={saveError} onCancel={() => { setConfirmSave(false); setSaveError(""); }} onConfirm={save}/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-5xl">
    <div className="mb-7"><p className="text-sm font-medium text-blue-600">{titles[role]} account</p><h1 className="mt-1 text-2xl font-bold">My Profile</h1><p className="mt-1 text-sm text-slate-500">View and update your account information.</p></div>
    {message && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
    {error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
    {busy ? <div className="rounded-2xl border bg-white p-10 text-center text-slate-500"><LoaderCircle className="mx-auto mb-2 animate-spin"/>Loading profile…</div> : profile && <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <section className="rounded-2xl border bg-white p-6 text-center"><div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-blue-100 text-2xl font-semibold text-blue-700">{initials}</div><h2 className="mt-4 text-lg font-semibold">{profile.full_name}</h2><p className="mt-1 text-sm text-slate-500">{titles[role]}{profileNumber ? ` · ${profileNumber}` : ""}</p>{role === "student" && <><div className="mt-5 border-t pt-5 text-left"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Academic program</p><p className="mt-2 font-medium">{profile.program_name || "Not assigned"}</p><p className="mt-1 text-sm text-slate-500">Year {profile.year_level ?? "—"} · {profile.department_name || "Department not assigned"}</p></div></>}</section>
      <section className="rounded-2xl border bg-white p-6"><div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="font-semibold">Account information</h2><p className="mt-1 text-sm text-slate-500">Changes save to your EduTrack account.</p></div>{!editing && <button onClick={() => { setEditing(true); setMessage(""); }} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Pencil size={15}/>Edit profile</button>}</div>
        {editing ? <form onSubmit={requestSave} className="space-y-4">{([["Full name", "full_name", "text"], ["Email address", "email", "email"], ["Phone number", "phone", "tel"], ...(role === "student" ? [["Address", "address", "text"]] : role === "faculty" || role === "registrar" ? [["Office", "office", "text"]] : [])] as string[][]).map(([label, key, type]) => <label key={key} className="block text-sm font-medium text-slate-700">{label}<input required={key === "full_name" || key === "email"} type={type} value={form[key as keyof typeof form]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal outline-none focus:border-blue-500"/></label>)}<div className="flex gap-2 pt-2"><button disabled={saving} type="submit" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"><Check size={16}/>{saving ? "Saving…" : "Save changes"}</button><button type="button" onClick={() => { setEditing(false); setForm({ full_name: profile.full_name, email: profile.email, phone: profile.phone ?? "", address: profile.address ?? "", office: profile.office ?? "" }); }} className="rounded-lg border px-4 py-2.5 text-sm">Cancel</button></div></form> : <div className="divide-y">{([[UserRound, "Full name", profile.full_name], [Mail, "Email address", profile.email], [Phone, "Phone number", profile.phone || "Not provided"], ...(role === "student" ? [[MapPin, "Address", profile.address || "Not provided"]] : role === "faculty" || role === "registrar" ? [[MapPin, "Office", profile.office || "Not provided"]] : [])] as [typeof UserRound, string, string | null][]).map(([Icon, label, value]) => <div key={label} className="flex items-center gap-3 py-4"><div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50 text-slate-500"><Icon size={17}/></div><div><p className="text-xs text-slate-500">{label}</p><p className="mt-0.5 text-sm font-medium">{value || "Not provided"}</p></div></div>)}</div>}
      </section>
    </div>}
  </div></main></div>;
}
