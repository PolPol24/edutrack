"use client";

import { useEffect, useState } from "react";
import { Check, Database, Globe2, Save, ShieldCheck } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import ActionConfirmation from "@/components/ActionConfirmation";
import { apiRequest } from "@/lib/api";

type Settings = { institution_name: string; academic_year_label: string; email_notifications: boolean; two_factor_required_for_admins: boolean; session_timeout_minutes: number; maintenance_mode: boolean };
const defaultSettings: Settings = { institution_name: "EduTrack University", academic_year_label: "2026-2027", email_notifications: true, two_factor_required_for_admins: true, session_timeout_minutes: 30, maintenance_mode: false };

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: () => void }) {
  return <div className="flex items-center justify-between gap-4 border-b py-4 last:border-0"><div><p className="text-sm font-medium">{label}</p><p className="mt-1 text-xs text-slate-500">{description}</p></div><button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange} className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-blue-600" : "bg-slate-300"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`}/></button></div>;
}

export default function Page() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const [confirmSave, setConfirmSave] = useState(false);
  const [saveError, setSaveError] = useState("");
  useEffect(() => {
    apiRequest<{ settings: Settings }>("admin_settings")
      .then(({ settings: result }) => setSettings({ ...defaultSettings, ...result }))
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load settings."))
      .finally(() => setLoading(false));
  }, []);
  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((current) => ({ ...current, [key]: value })); setSaved(false);
  }
  async function saveSettings() {
    setSaving(true); setSaveError(""); setSaved(false);
    try {
      const result = await apiRequest<{ settings: Settings }>("admin_settings", { method: "PUT", body: JSON.stringify(settings) });
      setSettings(result.settings); setSaved(true); setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })); setConfirmSave(false);
    } catch (cause) { setSaveError(cause instanceof Error ? cause.message : "Unable to save settings."); }
    finally { setSaving(false); }
  }
  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="admin"/><ActionConfirmation open={confirmSave} title="Save system settings?" description="Verify these settings before saving them to the database. Some options are currently stored as configuration flags." confirmLabel="Save settings" busy={saving} error={saveError} onCancel={() => { setConfirmSave(false); setSaveError(""); }} onConfirm={saveSettings}/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-5xl">
    <div className="mb-7"><p className="text-sm font-medium text-blue-600">Platform configuration</p><h1 className="mt-1 text-2xl font-bold">Settings</h1><p className="mt-1 text-sm text-slate-500">Preferences are stored in edutrack_db.</p></div>
    {saved && <p role="status" className="mb-4 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><Check size={16}/>Settings saved to the database at {savedAt}.</p>}{error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]"><div className="space-y-5">
      <section className="rounded-2xl border bg-white p-5"><div className="mb-2 flex items-center gap-2"><Globe2 size={18} className="text-blue-600"/><h2 className="font-semibold">General</h2></div><label className="block border-b py-4 text-sm font-medium">Institution name<input value={settings.institution_name} onChange={(event)=>update("institution_name",event.target.value)} className="mt-1.5 block w-full rounded-lg border px-3 py-2.5 font-normal outline-none focus:border-blue-500"/></label><label className="block py-4 text-sm font-medium">Academic year<input pattern="\d{4}-\d{4}" value={settings.academic_year_label} onChange={(event)=>update("academic_year_label",event.target.value)} className="mt-1.5 block w-full rounded-lg border px-3 py-2.5 font-normal outline-none focus:border-blue-500"/></label></section>
      <section className="rounded-2xl border bg-white p-5"><div className="mb-2 flex items-center gap-2"><ShieldCheck size={18} className="text-blue-600"/><h2 className="font-semibold">Access & notifications</h2></div><Toggle label="Email notifications" description="Send account and system updates to users." checked={settings.email_notifications} onChange={()=>update("email_notifications",!settings.email_notifications)}/><Toggle label="Two-step verification" description="Require an additional verification step for administrators." checked={settings.two_factor_required_for_admins} onChange={()=>update("two_factor_required_for_admins",!settings.two_factor_required_for_admins)}/><label className="block pt-4 text-sm font-medium">Session timeout<select value={settings.session_timeout_minutes} onChange={(event)=>update("session_timeout_minutes",Number(event.target.value))} className="mt-1.5 block w-full rounded-lg border bg-white px-3 py-2.5"><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={60}>60 minutes</option><option value={0}>Never</option></select></label></section>
      <section className="rounded-2xl border bg-white p-5"><div className="mb-2 flex items-center gap-2"><Database size={18} className="text-blue-600"/><h2 className="font-semibold">System availability</h2></div><Toggle label="Maintenance mode" description="Maintenance state saved for system operators." checked={settings.maintenance_mode} onChange={()=>update("maintenance_mode",!settings.maintenance_mode)}/></section>
      <div className="flex justify-end"><button disabled={loading || saving} onClick={()=>{setSaveError("");setConfirmSave(true);}} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"><Save size={16}/>{saving ? "Saving…" : "Save settings"}</button></div>
    </div>
    <aside className="h-fit rounded-2xl border bg-white p-5"><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${error ? "bg-rose-500" : "bg-emerald-500"}`}/><h2 className="font-semibold">System status</h2></div><p className="mt-2 text-sm font-medium text-slate-600">{error ? "Database connection unavailable" : "Connected to edutrack_db"}</p><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span className="text-slate-500">Web application</span><span className="text-slate-700">Running</span></div><div className="flex justify-between"><span className="text-slate-500">Database</span><span className="text-slate-700">{error ? "Unavailable" : "Connected"}</span></div><div className="flex justify-between"><span className="text-slate-500">Last backup</span><span className="text-slate-700">Not configured</span></div><div className="flex justify-between"><span className="text-slate-500">Version</span><span className="text-slate-700">1.0.0</span></div></div><p className="mt-5 border-t pt-4 text-xs leading-5 text-slate-400">Changes are persisted in edutrack_db. Two-step verification and maintenance mode are stored as configuration flags.</p></aside>
    </div>
  </div></main></div>;
}
