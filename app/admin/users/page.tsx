"use client";

import { FormEvent, useState } from "react";
import { Plus, Search, UserRound, X } from "lucide-react";
import Sidebar from "@/components/Sidebar";

type Role = "Student" | "Faculty" | "Registrar" | "Admin";
type Account = { id: string; name: string; email: string; role: Role; status: "Active" | "Suspended" };
const initialUsers: Account[] = [
  { id: "USR-00118", name: "Alyssa Cruz", email: "alyssa.cruz@edutrack.edu", role: "Student", status: "Active" },
  { id: "USR-00042", name: "Maria Elena Santos", email: "maria.santos@edutrack.edu", role: "Faculty", status: "Active" },
  { id: "USR-00015", name: "Ramon Villanueva", email: "ramon.villanueva@edutrack.edu", role: "Registrar", status: "Active" },
  { id: "USR-00001", name: "EduTrack Administrator", email: "admin@edutrack.edu", role: "Admin", status: "Active" },
  { id: "USR-00123", name: "Miguel Reyes", email: "miguel.reyes@edutrack.edu", role: "Student", status: "Suspended" },
  { id: "USR-00051", name: "Elena Ramos", email: "elena.ramos@edutrack.edu", role: "Faculty", status: "Active" },
];

export default function Page() {
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("All roles");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("Student");
  const [message, setMessage] = useState("");
  const visible = users.filter((user) => `${user.name} ${user.email} ${user.id}`.toLowerCase().includes(query.toLowerCase()) && (role === "All roles" || user.role === role));
  function addUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (users.some((user) => user.email.toLowerCase() === email.trim().toLowerCase())) { setMessage("An account with that email already exists."); return; }
    const user = { id: `USR-${String(users.length + 1).padStart(5, "0")}`, name: name.trim(), email: email.trim(), role: newRole, status: "Active" as const };
    setUsers((current) => [user, ...current]); setName(""); setEmail(""); setShowForm(false); setMessage(`${user.name} was added to the sample account list.`);
  }
  function toggleStatus(user: Account) {
    const next = user.status === "Active" ? "Suspended" : "Active";
    setUsers((current) => current.map((item) => item.id === user.id ? { ...item, status: next } : item));
    setMessage(`${user.name}’s sample account is now ${next.toLowerCase()}.`);
  }

  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="admin"/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-6xl">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-blue-600">Access administration</p><h1 className="mt-1 text-2xl font-bold">Users</h1><p className="mt-1 text-sm text-slate-500">Manage student, faculty, registrar, and admin accounts.</p></div><button onClick={() => { setShowForm(true); setMessage(""); }} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"><Plus size={16}/>Add user</button></div>
    {message && <p role="status" className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{message} Changes are demo-only.</p>}
    <div className="mb-5 grid gap-4 sm:grid-cols-4">{(["Student","Faculty","Registrar","Admin"] as Role[]).map((item)=><div key={item} className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">{item}s</p><p className="mt-1 text-2xl font-bold">{users.filter((user)=>user.role===item).length}</p></div>)}</div>
    <section className="overflow-hidden rounded-2xl border bg-white"><div className="flex flex-wrap gap-3 border-b p-4"><label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-lg border px-3"><Search size={17} className="text-slate-400"/><input aria-label="Search users" value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search by name, email, or user ID" className="w-full py-2.5 text-sm outline-none"/></label><select aria-label="Filter by role" value={role} onChange={(event)=>setRole(event.target.value)} className="rounded-lg border bg-white px-3 text-sm"><option>All roles</option><option>Student</option><option>Faculty</option><option>Registrar</option><option>Admin</option></select></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-medium">Account</th><th className="px-5 py-3 font-medium">Role</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 text-right font-medium">Action</th></tr></thead><tbody>{visible.map((user)=><tr key={user.id} className="border-t"><td className="px-5 py-4"><p className="font-medium">{user.name}</p><p className="text-xs text-slate-500">{user.email} · {user.id}</p></td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{user.role}</span></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${user.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{user.status}</span></td><td className="px-5 py-4 text-right"><button onClick={()=>toggleStatus(user)} className={`text-sm font-medium ${user.status === "Active" ? "text-rose-600 hover:text-rose-800" : "text-emerald-700 hover:text-emerald-900"}`}>{user.status === "Active" ? "Suspend" : "Reactivate"}</button></td></tr>)}{visible.length===0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">No accounts match your filters.</td></tr>}</tbody></table></div><p className="border-t px-5 py-3 text-xs text-slate-500">Showing {visible.length} sample accounts. Updates are not saved to an authentication service.</p>
    </section>
    {showForm && <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/30 p-4" role="presentation" onClick={()=>setShowForm(false)}><section role="dialog" aria-modal="true" aria-labelledby="add-user-title" onClick={(event)=>event.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between"><div><h2 id="add-user-title" className="text-lg font-semibold">Add a user</h2><p className="mt-1 text-sm text-slate-500">Create a sample account record.</p></div><button aria-label="Close add user form" onClick={()=>setShowForm(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18}/></button></div><form onSubmit={addUser} className="mt-5 space-y-4"><label className="block text-sm font-medium">Full name<input required value={name} onChange={(event)=>setName(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal"/></label><label className="block text-sm font-medium">Email address<input required type="email" value={email} onChange={(event)=>setEmail(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal"/></label><label className="block text-sm font-medium">Role<select value={newRole} onChange={(event)=>setNewRole(event.target.value as Role)} className="mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 font-normal">{["Student","Faculty","Registrar","Admin"].map((item)=><option key={item}>{item}</option>)}</select></label><button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"><UserRound size={16}/>Create sample user</button></form></section></div>}
  </div></main></div>;
}
