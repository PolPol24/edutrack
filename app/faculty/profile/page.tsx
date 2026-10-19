"use client";

import { useState, type FormEvent } from "react";
import { Check, Mail, MapPin, Pencil, Phone, UserRound } from "lucide-react";
import Sidebar from "@/components/Sidebar";

const contactFields = [
  { key: "email", label: "Email address", icon: Mail },
  { key: "phone", label: "Phone number", icon: Phone },
  { key: "office", label: "Office", icon: MapPin },
] as const;

export default function Page() {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState("Maria Elena Santos");
  const [email, setEmail] = useState("maria.santos@edutrack.edu");
  const [phone, setPhone] = useState("+63 917 555 0132");
  const [office, setOffice] = useState("Faculty Building · Room 304");
  function saveProfile(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setEditing(false); setSaved(true); }
  const values = { email, phone, office };

  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="faculty"/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-5xl">
    <div className="mb-7"><p className="text-sm font-medium text-blue-600">Faculty account</p><h1 className="mt-1 text-2xl font-bold">My Profile</h1><p className="mt-1 text-sm text-slate-500">View your faculty information and update your contact details.</p></div>
    {saved && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Profile changes saved.</p>}
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]"><section className="rounded-2xl border bg-white p-6 text-center"><div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-2xl font-semibold text-emerald-700">MS</div><h2 className="mt-4 text-lg font-semibold">{name}</h2><p className="mt-1 text-sm text-slate-500">Faculty · FAC-2018-042</p><span className="mt-4 inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Active faculty</span><div className="mt-6 border-t pt-5 text-left"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Department</p><p className="mt-2 font-medium">Information Systems</p><p className="mt-1 text-sm text-slate-500">College of Computing</p><p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Teaching since</p><p className="mt-2 font-medium">2018</p></div></section>
      <section className="rounded-2xl border bg-white p-6"><div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="font-semibold">Faculty information</h2><p className="mt-1 text-sm text-slate-500">Your academic appointment and contact information.</p></div>{!editing && <button onClick={() => { setEditing(true); setSaved(false); }} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Pencil size={15}/>Edit profile</button>}</div>
        {editing ? <form onSubmit={saveProfile} className="space-y-4"><label className="block text-sm font-medium text-slate-700">Full name<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></label><label className="block text-sm font-medium text-slate-700">Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></label><label className="block text-sm font-medium text-slate-700">Phone number<input value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></label><label className="block text-sm font-medium text-slate-700">Office<input value={office} onChange={(event) => setOffice(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></label><div className="flex gap-2 pt-2"><button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"><Check size={16}/>Save changes</button><button type="button" onClick={() => setEditing(false)} className="rounded-lg border px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button></div></form> : <div className="divide-y"><div className="flex items-center gap-3 py-4"><div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50 text-slate-500"><UserRound size={17}/></div><div><p className="text-xs text-slate-500">Full name</p><p className="mt-0.5 text-sm font-medium">{name}</p></div></div>{contactFields.map(({ key, label, icon: Icon }) => <div key={key} className="flex items-center gap-3 py-4"><div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50 text-slate-500"><Icon size={17}/></div><div><p className="text-xs text-slate-500">{label}</p><p className="mt-0.5 text-sm font-medium">{values[key]}</p></div></div>)}</div>}
      </section>
    </div>
  </div></main></div>;
}
