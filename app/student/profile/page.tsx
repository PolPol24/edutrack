"use client";

import { useState } from "react";
import { Check, Mail, MapPin, Pencil, Phone, UserRound } from "lucide-react";
import Sidebar from "@/components/Sidebar";

export default function ProfilePage() {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState("Paul Andrew Samson");
  const [email, setEmail] = useState("paul.samson@edutrack.edu");
  const [phone, setPhone] = useState("+63 917 555 0187");
  const [address, setAddress] = useState("Quezon City, Metro Manila");

  function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEditing(false);
    setSaved(true);
  }

  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="student"/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-5xl">
    <div className="mb-7"><p className="text-sm font-medium text-blue-600">Student account</p><h1 className="mt-1 text-2xl font-bold">My Profile</h1><p className="mt-1 text-sm text-slate-500">View and update your contact information.</p></div>
    {saved && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Profile changes saved.</p>}
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <section className="rounded-2xl border bg-white p-6 text-center"><div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-blue-100 text-2xl font-semibold text-blue-700">PA</div><h2 className="mt-4 text-lg font-semibold">{name}</h2><p className="mt-1 text-sm text-slate-500">Student · STU-2024-1187</p><span className="mt-4 inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Active student</span><div className="mt-6 border-t pt-5 text-left"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Academic program</p><p className="mt-2 font-medium">BS Information Systems</p><p className="mt-1 text-sm text-slate-500">3rd Year · College of Computing</p><p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Current standing</p><p className="mt-2 font-medium">Good standing · GPA 3.6</p></div></section>
      <section className="rounded-2xl border bg-white p-6"><div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="font-semibold">Personal information</h2><p className="mt-1 text-sm text-slate-500">Your information for school communications.</p></div>{!editing && <button onClick={() => { setEditing(true); setSaved(false); }} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Pencil size={15}/>Edit profile</button>}</div>
        {editing ? <form onSubmit={saveProfile} className="space-y-4"><label className="block text-sm font-medium text-slate-700">Full name<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></label><label className="block text-sm font-medium text-slate-700">Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></label><label className="block text-sm font-medium text-slate-700">Phone number<input value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></label><label className="block text-sm font-medium text-slate-700">Address<input value={address} onChange={(event) => setAddress(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></label><div className="flex gap-2 pt-2"><button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"><Check size={16}/>Save changes</button><button type="button" onClick={() => setEditing(false)} className="rounded-lg border px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button></div></form> : <div className="divide-y">{[[UserRound, "Full name", name], [Mail, "Email address", email], [Phone, "Phone number", phone], [MapPin, "Address", address]].map(([Icon, label, value]: any) => <div key={label} className="flex items-center gap-3 py-4"><div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50 text-slate-500"><Icon size={17}/></div><div><p className="text-xs text-slate-500">{label}</p><p className="mt-0.5 text-sm font-medium">{value}</p></div></div>)}</div>}
      </section>
    </div>
  </div></main></div>;
}
