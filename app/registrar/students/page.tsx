"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Search, UserPlus, X } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import ActionConfirmation from "@/components/ActionConfirmation";
import { apiRequest } from "@/lib/api";

type Student = { user_id: number; student_number: string; name: string; email: string; program: string; year: number; status: string; units: number };
type StudentRow = { user_id: number; student_number: string; full_name: string; email: string; program_name: string; year_level: number; student_status: string; units: number };
type Program = { program_id: string; program_name: string };
const statusName = (status: string) => status.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());

export default function Page() {
  const [students, setStudents] = useState<Student[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [selected, setSelected] = useState<Student | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password");
  const [programId, setProgramId] = useState("");
  const [year, setYear] = useState(1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmAdd, setConfirmAdd] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await apiRequest<{ students: StudentRow[]; programs: Program[] }>("registrar_students");
      setStudents(result.students.map((row) => ({ user_id: row.user_id, student_number: row.student_number, name: row.full_name, email: row.email, program: row.program_name, year: row.year_level, status: row.student_status, units: row.units })));
      setPrograms(result.programs);
      if (result.programs.length) setProgramId((current) => current || String(result.programs[0].program_id));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load student records."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const visible = useMemo(() => students.filter((student) => `${student.student_number} ${student.name} ${student.email} ${student.program}`.toLowerCase().includes(query.toLowerCase()) && (status === "All statuses" || statusName(student.status) === status)), [students, query, status]);
  function reviewStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setConfirmError(""); setConfirmAdd(true);
  }
  async function addStudent() {
    setSaving(true); setConfirmError(""); setMessage("");
    try {
      const result = await apiRequest<{ message: string; user: { full_name: string } }>("registrar_students", { method: "POST", body: JSON.stringify({ full_name: name, email, password, program_id: programId, year_level: year }) });
      setMessage(`${result.user.full_name} was added to edutrack_db. Initial password: ${password}.`);
      setName(""); setEmail(""); setPassword("password"); setYear(1); setConfirmAdd(false); setShowForm(false); await load();
    } catch (cause) { setConfirmError(cause instanceof Error ? cause.message : "Unable to add the student."); }
    finally { setSaving(false); }
  }
  const activeCount = students.filter((student) => student.status === "active").length;
  const programCount = new Set(students.map((student) => student.program)).size;
  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="registrar"/><ActionConfirmation open={confirmAdd} title="Create this student account?" description={`Create ${name || "this student"} as a Year ${year} student and save the account in edutrack_db?`} confirmLabel="Create student" busy={saving} error={confirmError} onCancel={() => { setConfirmAdd(false); setConfirmError(""); }} onConfirm={addStudent}/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-6xl">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-amber-700">Student records</p><h1 className="mt-1 text-2xl font-bold">Students</h1><p className="mt-1 text-sm text-slate-500">Student profiles and academic records from edutrack_db.</p></div><button onClick={() => { setShowForm(true); setMessage(""); }} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"><UserPlus size={16}/>Add student</button></div>
    {message && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}{error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
    <div className="mb-5 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Total students</p><p className="mt-1 text-2xl font-bold">{students.length}</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Active students</p><p className="mt-1 text-2xl font-bold">{activeCount}</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Programs represented</p><p className="mt-1 text-2xl font-bold">{programCount}</p></div></div>
    <section className="overflow-hidden rounded-2xl border bg-white"><div className="flex flex-wrap gap-3 border-b p-4"><label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-lg border px-3"><Search size={17} className="text-slate-400"/><input aria-label="Search students" value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search by name, student ID, email, or program" className="w-full py-2.5 text-sm outline-none"/></label><select aria-label="Filter students by status" value={status} onChange={(event)=>setStatus(event.target.value)} className="rounded-lg border bg-white px-3 text-sm"><option>All statuses</option><option>Active</option><option>On Leave</option><option>Graduated</option><option>Withdrawn</option></select></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-medium">Student</th><th className="px-5 py-3 font-medium">Program</th><th className="px-5 py-3 font-medium">Year</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 text-right font-medium">Action</th></tr></thead><tbody>{visible.map((student)=><tr key={student.user_id} className="border-t"><td className="px-5 py-4"><p className="font-medium">{student.name}</p><p className="text-xs text-slate-500">{student.student_number}</p></td><td className="px-5 py-4">{student.program}</td><td className="px-5 py-4">Year {student.year}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${student.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{statusName(student.status)}</span></td><td className="px-5 py-4 text-right"><button onClick={() => setSelected(student)} className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"><Eye size={15}/>View</button></td></tr>)}{!loading && visible.length===0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">No students match your search.</td></tr>}{loading && <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">Loading student records…</td></tr>}</tbody></table></div><p className="border-t px-5 py-3 text-xs text-slate-500">Showing {visible.length} database records.</p>
    </section>
    {selected && <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/30 p-4" role="presentation" onClick={() => setSelected(null)}><section role="dialog" aria-modal="true" aria-labelledby="student-detail-title" onClick={(event) => event.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between"><div><h2 id="student-detail-title" className="text-lg font-semibold">Student record</h2><p className="mt-1 text-sm text-slate-500">{selected.student_number}</p></div><button aria-label="Close student details" onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18}/></button></div><div className="mt-5 space-y-3 text-sm"><p><span className="text-slate-500">Name</span><br/><span className="font-medium">{selected.name}</span></p><p><span className="text-slate-500">Email</span><br/><span className="font-medium">{selected.email}</span></p><p><span className="text-slate-500">Program and year</span><br/><span className="font-medium">{selected.program} · Year {selected.year}</span></p><p><span className="text-slate-500">Current enrollment</span><br/><span className="font-medium">{selected.units} units</span></p><p><span className="text-slate-500">Record status</span><br/><span className="font-medium">{statusName(selected.status)}</span></p></div><Link href="/registrar/enrollments" className="mt-5 inline-block text-sm font-medium text-blue-600">View enrollment records →</Link></section></div>}
    {showForm && <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/30 p-4" role="presentation" onClick={()=>setShowForm(false)}><section role="dialog" aria-modal="true" aria-labelledby="add-student-title" onClick={(event)=>event.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between"><div><h2 id="add-student-title" className="text-lg font-semibold">Add student</h2><p className="mt-1 text-sm text-slate-500">Create a student login and record.</p></div><button aria-label="Close add student form" onClick={()=>setShowForm(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18}/></button></div><form onSubmit={reviewStudent} className="mt-5 space-y-4"><label className="block text-sm font-medium">Full name<input required value={name} onChange={(event)=>setName(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal"/></label><label className="block text-sm font-medium">Email address<input required type="email" value={email} onChange={(event)=>setEmail(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal"/></label><label className="block text-sm font-medium">Program<select required value={programId} onChange={(event)=>setProgramId(event.target.value)} className="mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 font-normal">{programs.map((program)=><option key={program.program_id} value={program.program_id}>{program.program_name}</option>)}</select></label><label className="block text-sm font-medium">Year level<select value={year} onChange={(event)=>setYear(Number(event.target.value))} className="mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 font-normal">{[1,2,3,4].map((item)=><option key={item} value={item}>Year {item}</option>)}</select></label><label className="block text-sm font-medium">Initial password<input required minLength={8} value={password} onChange={(event)=>setPassword(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal"/><span className="mt-1 block text-xs font-normal text-slate-500">For local demo accounts, use “password”.</span></label><button disabled={saving} type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"><UserPlus size={16}/>{saving ? "Creating…" : "Create student"}</button></form></section></div>}
  </div></main></div>;
}
