"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, Search, UserRound, X } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import ActionConfirmation from "@/components/ActionConfirmation";
import { apiRequest } from "@/lib/api";

type Role = "student" | "faculty" | "registrar" | "admin";
type Account = { user_id: number; account_number: string; full_name: string; email: string; role: Role; account_status: "active" | "suspended" };
type UserAction = { kind: "create" } | { kind: "status"; user: Account; status: "active" | "suspended" } | null;
const labels: Record<Role, string> = { student: "Student", faculty: "Faculty", registrar: "Registrar", admin: "Admin" };

export default function Page() {
  const [users, setUsers] = useState<Account[]>([]);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("All roles");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password");
  const [newRole, setNewRole] = useState<Role>("student");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<UserAction>(null);
  const [actionError, setActionError] = useState("");
  const visible = useMemo(() => users.filter((user) => `${user.full_name} ${user.email} ${user.account_number}`.toLowerCase().includes(query.toLowerCase()) && (role === "All roles" || labels[user.role] === role)), [users, query, role]);
  async function load() {
    setBusy(true); setError("");
    try { const result = await apiRequest<{ users: Account[] }>("admin_users"); setUsers(result.users); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load user accounts."); }
    finally { setBusy(false); }
  }
  useEffect(() => { void load(); }, []);
  function reviewNewUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setActionError(""); setAction({ kind: "create" });
  }
  async function addUser() {
    setMessage(""); setActionError(""); setBusy(true);
    try {
      const result = await apiRequest<{ user: Account }>("admin_users", { method: "POST", body: JSON.stringify({ full_name: name, email, password, role: newRole }) });
      setMessage(`${result.user.full_name} was added to edutrack_db. Initial password: ${password}.`);
      setName(""); setEmail(""); setPassword("password"); setShowForm(false); setAction(null); await load();
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Unable to create the account."); }
    finally { setBusy(false); }
  }
  async function toggleStatus(user: Account) {
    setActionError(""); setMessage(""); setBusy(true);
    try {
      const status = user.account_status === "active" ? "suspended" : "active";
      const result = await apiRequest<{ message: string }>("admin_users", { method: "PATCH", body: JSON.stringify({ user_id: user.user_id, account_status: status }) });
      setMessage(result.message); setAction(null); await load();
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Unable to update the account."); }
    finally { setBusy(false); }
  }
  const counts = (Object.keys(labels) as Role[]).map((item) => ({ role: item, count: users.filter((user) => user.role === item).length }));
  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="admin"/><ActionConfirmation open={action !== null} title={action?.kind === "create" ? "Create this account?" : action?.status === "suspended" ? "Suspend this account?" : "Reactivate this account?"} description={action?.kind === "create" ? `Create ${name || "this user"} with the ${labels[newRole]} role and save it in edutrack_db?` : action ? `${action.user.full_name} (${labels[action.user.role]}) will be ${action.status}.` : "Confirm this account change."} confirmLabel={action?.kind === "create" ? "Create account" : action?.status === "suspended" ? "Suspend account" : "Reactivate account"} danger={action?.kind === "status" && action.status === "suspended"} busy={busy} error={actionError} onCancel={() => { setAction(null); setActionError(""); }} onConfirm={() => action?.kind === "create" ? addUser() : action?.kind === "status" ? toggleStatus(action.user) : undefined}/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-6xl">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-blue-600">Access administration</p><h1 className="mt-1 text-2xl font-bold">Users</h1><p className="mt-1 text-sm text-slate-500">Manage student, faculty, registrar, and admin accounts in the database.</p></div><button onClick={() => { setShowForm(true); setMessage(""); }} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"><Plus size={16}/>Add user</button></div>
    {message && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}{error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
    <div className="mb-5 grid gap-4 sm:grid-cols-4">{counts.map(({role: item, count})=><div key={item} className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">{labels[item]} accounts</p><p className="mt-1 text-2xl font-bold">{count}</p></div>)}</div>
    <section className="overflow-hidden rounded-2xl border bg-white"><div className="flex flex-wrap gap-3 border-b p-4"><label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-lg border px-3"><Search size={17} className="text-slate-400"/><input aria-label="Search users" value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search by name, email, or user ID" className="w-full py-2.5 text-sm outline-none"/></label><select aria-label="Filter by role" value={role} onChange={(event)=>setRole(event.target.value)} className="rounded-lg border bg-white px-3 text-sm"><option>All roles</option><option>Student</option><option>Faculty</option><option>Registrar</option><option>Admin</option></select></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-medium">Account</th><th className="px-5 py-3 font-medium">Role</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 text-right font-medium">Action</th></tr></thead><tbody>{visible.map((user)=><tr key={user.user_id} className="border-t"><td className="px-5 py-4"><p className="font-medium">{user.full_name}</p><p className="text-xs text-slate-500">{user.email} · {user.account_number}</p></td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{labels[user.role]}</span></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${user.account_status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{user.account_status}</span></td><td className="px-5 py-4 text-right"><button disabled={busy} onClick={()=>{setActionError("");setAction({kind:"status",user,status:user.account_status === "active" ? "suspended" : "active"});}} className={`text-sm font-medium disabled:opacity-50 ${user.account_status === "active" ? "text-rose-600 hover:text-rose-800" : "text-emerald-700 hover:text-emerald-900"}`}>{user.account_status === "active" ? "Suspend" : "Reactivate"}</button></td></tr>)}{!busy && visible.length===0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">No accounts match your filters.</td></tr>}</tbody></table></div><p className="border-t px-5 py-3 text-xs text-slate-500">{busy ? "Loading database accounts…" : `Showing ${visible.length} database accounts.`}</p>
    </section>
    {showForm && <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/30 p-4" role="presentation" onClick={()=>setShowForm(false)}><section role="dialog" aria-modal="true" aria-labelledby="add-user-title" onClick={(event)=>event.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between"><div><h2 id="add-user-title" className="text-lg font-semibold">Add a user</h2><p className="mt-1 text-sm text-slate-500">Accounts are created in edutrack_db.</p></div><button aria-label="Close add user form" onClick={()=>setShowForm(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18}/></button></div><form onSubmit={reviewNewUser} className="mt-5 space-y-4"><label className="block text-sm font-medium">Full name<input required value={name} onChange={(event)=>setName(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal"/></label><label className="block text-sm font-medium">Email address<input required type="email" value={email} onChange={(event)=>setEmail(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal"/></label><label className="block text-sm font-medium">Role<select value={newRole} onChange={(event)=>setNewRole(event.target.value as Role)} className="mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 font-normal">{(Object.keys(labels) as Role[]).map((item)=><option value={item} key={item}>{labels[item]}</option>)}</select></label><label className="block text-sm font-medium">Initial password<input required minLength={8} value={password} onChange={(event)=>setPassword(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal"/><span className="mt-1 block text-xs font-normal text-slate-500">For local demo accounts, use “password”.</span></label><button disabled={busy} type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"><UserRound size={16}/>{busy ? "Creating…" : "Create account"}</button></form></section></div>}
  </div></main></div>;
}
