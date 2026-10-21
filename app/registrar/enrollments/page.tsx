"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { apiRequest } from "@/lib/api";

type Enrollment = { request_code: string; student_name: string; student_number: string; course_code: string; course_title: string; units: number; requested_at: string; enrollment_status: "pending" | "approved" | "rejected" };
const dateLabel = (value: string) => new Date(`${value.replace(" ", "T")}Z`).toLocaleDateString();

export default function Page() {
  const [rows, setRows] = useState<Enrollment[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiRequest<{ requests: Enrollment[] }>("approvals").then(({ requests }) => setRows(requests)).catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load enrollment requests.")).finally(() => setLoading(false)); }, []);
  const visible = useMemo(() => rows.filter((row) => `${row.request_code} ${row.student_name} ${row.student_number} ${row.course_code} ${row.course_title}`.toLowerCase().includes(query.toLowerCase()) && (status === "All statuses" || row.enrollment_status === status.toLowerCase())), [rows, query, status]);
  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="registrar"/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-6xl">
    <div className="mb-7"><p className="text-sm font-medium text-amber-700">Enrollment records</p><h1 className="mt-1 text-2xl font-bold">Enrollments</h1><p className="mt-1 text-sm text-slate-500">Current term requests and decisions saved in edutrack_db.</p></div>
    {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
    <div className="mb-5 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Pending review</p><p className="mt-1 text-2xl font-bold">{rows.filter((row)=>row.enrollment_status==="pending").length}</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Approved</p><p className="mt-1 text-2xl font-bold">{rows.filter((row)=>row.enrollment_status==="approved").length}</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Rejected</p><p className="mt-1 text-2xl font-bold">{rows.filter((row)=>row.enrollment_status==="rejected").length}</p></div></div>
    <section className="overflow-hidden rounded-2xl border bg-white"><div className="flex flex-wrap gap-3 border-b p-4"><label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-lg border px-3"><Search size={17} className="text-slate-400"/><input aria-label="Search enrollments" value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search student, course, or request ID" className="w-full py-2.5 text-sm outline-none"/></label><select aria-label="Filter enrollments by status" value={status} onChange={(event)=>setStatus(event.target.value)} className="rounded-lg border bg-white px-3 text-sm"><option>All statuses</option><option>Pending</option><option>Approved</option><option>Rejected</option></select></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-medium">Request</th><th className="px-5 py-3 font-medium">Student</th><th className="px-5 py-3 font-medium">Course</th><th className="px-5 py-3 font-medium">Units</th><th className="px-5 py-3 font-medium">Submitted</th><th className="px-5 py-3 font-medium">Status</th></tr></thead><tbody>{visible.map((row)=><tr key={row.request_code} className="border-t"><td className="px-5 py-4 font-medium">{row.request_code}</td><td className="px-5 py-4"><p className="font-medium">{row.student_name}</p><p className="text-xs text-slate-500">{row.student_number}</p></td><td className="px-5 py-4"><p className="font-medium">{row.course_code}</p><p className="text-xs text-slate-500">{row.course_title}</p></td><td className="px-5 py-4">{row.units}</td><td className="px-5 py-4 text-slate-600">{dateLabel(row.requested_at)}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${row.enrollment_status === "approved" ? "bg-emerald-50 text-emerald-700" : row.enrollment_status === "pending" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>{row.enrollment_status}</span></td></tr>)}{!loading && visible.length===0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">No enrollment requests match those filters.</td></tr>}{loading && <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">Loading enrollment records…</td></tr>}</tbody></table></div><p className="border-t px-5 py-3 text-xs text-slate-500">Showing {visible.length} database requests.</p>
    </section>
  </div></main></div>;
}
