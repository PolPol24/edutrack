"use client";

import { useState, type FormEvent } from "react";
import { Check, KeyRound, Mail, Pencil, Phone, UserRound } from "lucide-react";
import Sidebar from "@/components/Sidebar";

export default function Page() {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState("EduTrack Administrator");
  const [email, setEmail] = useState("admin@edutrack.edu");
  const [phone, setPhone] = useState("+63 917 555 0100");
  function saveProfile(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setEditing(false); setSaved(true); }
  const fields = [[UserRound,"Full name",name],[Mail,"Email address",email],[Phone,"Phone number",phone]];
  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="admin"/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-5xl">
    <div className="mb-7"><p className="text-sm font-medium text-blue-600">Administrator account</p><h1 className="mt-1 text-2xl font-bold">My Profile</h1><p className="mt-1 text-sm text-slate-500">View your account information and security details.</p></div>
    {saved && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Profile changes saved in this demo.</p>}
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]"><section className="rounded-2xl border bg-white p-6 text-center"><div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-slate-200 text-2xl font-semibold text-slate-700">EA</div><h2 className="mt-4 text-lg font-semibold">{name}</h2><p className="mt-1 text-sm text-slate-500">System Administrator · ADM-00001</p><span className="mt-4 inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Active administrator</span><div className="mt-6 border-t pt-5 text-left"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Access level</p><p className="mt-2 font-medium">Full system access</p><p className="mt-1 text-sm text-slate-500">Users, courses, reports, settings</p></div></section>
      <section className="rounded-2xl border bg-white p-6"><div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="font-semibold">Account information</h2><p className="mt-1 text-sm text-slate-500">Administrator identity and sign-in details.</p></div>{!editing && <button onClick={()=>{setEditing(true);setSaved(false);}} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Pencil size={15}/>Edit profile</button>}</div>
        {editing ? <form onSubmit={saveProfile} className="space-y-4">{([["Full name",name,setName,"text"],["Email address",email,setEmail,"email"],["Phone number",phone,setPhone,"tel"]] as const).map(([label,value,setValue,type])=><label key={label} className="block text-sm font-medium text-slate-700">{label}<input required={label!=="Phone number"} type={type} value={value} onChange={(event)=>setValue(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal outline-none focus:border-blue-500"/></label>)}<div className="flex gap-2"><button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white"><Check size={16}/>Save changes</button><button type="button" onClick={()=>setEditing(false)} className="rounded-lg border px-4 py-2.5 text-sm">Cancel</button></div></form> : <div className="divide-y">{fields.map(([Icon,label,value]:any)=><div key={label} className="flex items-center gap-3 py-4"><div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50 text-slate-500"><Icon size={17}/></div><div><p className="text-xs text-slate-500">{label}</p><p className="mt-0.5 text-sm font-medium">{value}</p></div></div>)}<div className="flex items-center gap-3 py-4"><div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50 text-slate-500"><KeyRound size={17}/></div><div><p className="text-xs text-slate-500">Password</p><p className="mt-0.5 text-sm font-medium">••••••••••</p></div></div><div className="flex items-center justify-between gap-3 py-4"><div><p className="text-xs text-slate-500">Two-step verification</p><p className="mt-0.5 text-sm font-medium">Enabled</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Protected</span></div></div>}
      </section>
    </div>
  </div></main></div>;
}
