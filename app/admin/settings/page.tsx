"use client";

import { useState } from "react";
import { Check, Database, Globe2, LockKeyhole, Save, ShieldCheck } from "lucide-react";
import Sidebar from "@/components/Sidebar";

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: () => void }) {
  return <div className="flex items-center justify-between gap-4 border-b py-4 last:border-0"><div><p className="text-sm font-medium">{label}</p><p className="mt-1 text-xs text-slate-500">{description}</p></div><button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange} className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-blue-600" : "bg-slate-300"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`}/></button></div>;
}

export default function Page() {
  const [notifications, setNotifications] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  const [twoFactor, setTwoFactor] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState("30 minutes");
  const [saved, setSaved] = useState(false);
  const [savedAt, setSavedAt] = useState("");
  function saveSettings() { setSaved(true); setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })); }
  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="admin"/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-5xl">
    <div className="mb-7"><p className="text-sm font-medium text-blue-600">Platform configuration</p><h1 className="mt-1 text-2xl font-bold">Settings</h1><p className="mt-1 text-sm text-slate-500">Manage general preferences and access controls.</p></div>
    {saved && <p role="status" className="mb-4 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><Check size={16}/>Settings saved in this demo at {savedAt}.</p>}
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]"><div className="space-y-5">
      <section className="rounded-2xl border bg-white p-5"><div className="mb-2 flex items-center gap-2"><Globe2 size={18} className="text-blue-600"/><h2 className="font-semibold">General</h2></div><label className="block border-b py-4 text-sm font-medium">Institution name<input defaultValue="EduTrack University" className="mt-1.5 block w-full rounded-lg border px-3 py-2.5 font-normal outline-none focus:border-blue-500"/></label><label className="block py-4 text-sm font-medium">Academic year<input defaultValue="2025–2026" className="mt-1.5 block w-full rounded-lg border px-3 py-2.5 font-normal outline-none focus:border-blue-500"/></label></section>
      <section className="rounded-2xl border bg-white p-5"><div className="mb-2 flex items-center gap-2"><ShieldCheck size={18} className="text-blue-600"/><h2 className="font-semibold">Access & notifications</h2></div><Toggle label="Email notifications" description="Send account and system updates to users." checked={notifications} onChange={()=>{setNotifications(!notifications);setSaved(false);}}/><Toggle label="Two-step verification" description="Require an additional verification step for administrators." checked={twoFactor} onChange={()=>{setTwoFactor(!twoFactor);setSaved(false);}}/><label className="block pt-4 text-sm font-medium">Session timeout<select value={sessionTimeout} onChange={(event)=>{setSessionTimeout(event.target.value);setSaved(false);}} className="mt-1.5 block w-full rounded-lg border bg-white px-3 py-2.5"><option>15 minutes</option><option>30 minutes</option><option>60 minutes</option><option>Never</option></select></label></section>
      <section className="rounded-2xl border bg-white p-5"><div className="mb-2 flex items-center gap-2"><Database size={18} className="text-blue-600"/><h2 className="font-semibold">System availability</h2></div><Toggle label="Maintenance mode" description="Display a maintenance notice to non-admin users." checked={maintenance} onChange={()=>{setMaintenance(!maintenance);setSaved(false);}}/></section>
      <div className="flex justify-end"><button onClick={saveSettings} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"><Save size={16}/>Save settings</button></div>
    </div>
    <aside className="h-fit rounded-2xl border bg-white p-5"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500"/><h2 className="font-semibold">System status</h2></div><p className="mt-2 text-sm font-medium text-emerald-700">All services operational</p><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span className="text-slate-500">Web application</span><span className="text-emerald-700">Online</span></div><div className="flex justify-between"><span className="text-slate-500">Database</span><span className="text-emerald-700">Connected</span></div><div className="flex justify-between"><span className="text-slate-500">Last backup</span><span className="text-slate-700">Today, 2:00 AM</span></div><div className="flex justify-between"><span className="text-slate-500">Version</span><span className="text-slate-700">1.0.0</span></div></div><p className="mt-5 border-t pt-4 text-xs leading-5 text-slate-400">Configuration is for interface demonstration; connect a settings service to apply changes system-wide.</p></aside>
    </div>
  </div></main></div>;
}
