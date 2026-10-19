"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardList, Search } from "lucide-react";
import Sidebar from "@/components/Sidebar";

const rows = [
  { id: "ENR-2601", student: "Alyssa Cruz", studentId: "2025-00118", course: "IT 205", title: "Web Application Development", units: 3, date: "Oct 20, 2026", status: "Pending" },
  { id: "ENR-2600", student: "Miguel Reyes", studentId: "2025-00123", course: "MATH 202", title: "Discrete Mathematics", units: 3, date: "Oct 20, 2026", status: "Pending" },
  { id: "ENR-2599", student: "Sofia Garcia", studentId: "2025-00131", course: "CS 205", title: "Data Structures", units: 3, date: "Oct 19, 2026", status: "Pending" },
  { id: "ENR-2598", student: "Isabella Flores", studentId: "2024-00067", course: "IT 310", title: "Database Systems", units: 3, date: "Oct 18, 2026", status: "Approved" },
  { id: "ENR-2597", student: "Liam Mendoza", studentId: "2023-00042", course: "CS 101", title: "Introduction to Computing", units: 3, date: "Oct 17, 2026", status: "Rejected" },
  { id: "ENR-2596", student: "Noah Lim", studentId: "2025-00144", course: "ENG 101", title: "Technical Writing", units: 3, date: "Oct 16, 2026", status: "Approved" },
];

export default function Page() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const filtered = rows.filter((row) => `${row.id} ${row.student} ${row.studentId} ${row.course} ${row.title}`.toLowerCase().includes(query.toLowerCase()) && (status === "All statuses" || row.status === status));
  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="registrar"/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-6xl">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-amber-700">Fall 2025–2026 · 1st semester</p><h1 className="mt-1 text-2xl font-bold">Enrollments</h1><p className="mt-1 text-sm text-slate-500">Track student course registrations and their approval status.</p></div><Link href="/registrar/approvals" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">Review pending requests</Link></div>
    <div className="mb-5 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Pending review</p><p className="mt-1 text-2xl font-bold">24</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Approved this term</p><p className="mt-1 text-2xl font-bold">1,182</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Rejected / returned</p><p className="mt-1 text-2xl font-bold">34</p></div></div>
    <section className="overflow-hidden rounded-2xl border bg-white"><div className="flex flex-wrap gap-3 border-b p-4"><label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-lg border px-3"><Search size={17} className="text-slate-400"/><input aria-label="Search enrollments" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search student, course, or request ID" className="w-full py-2.5 text-sm outline-none"/></label><select aria-label="Filter enrollments by status" value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border bg-white px-3 text-sm"><option>All statuses</option><option>Pending</option><option>Approved</option><option>Rejected</option></select></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-medium">Request</th><th className="px-5 py-3 font-medium">Student</th><th className="px-5 py-3 font-medium">Course</th><th className="px-5 py-3 font-medium">Units</th><th className="px-5 py-3 font-medium">Submitted</th><th className="px-5 py-3 font-medium">Status</th></tr></thead><tbody>{filtered.map((row)=><tr key={row.id} className="border-t"><td className="px-5 py-4 font-medium">{row.id}</td><td className="px-5 py-4"><p className="font-medium">{row.student}</p><p className="text-xs text-slate-500">{row.studentId}</p></td><td className="px-5 py-4"><p className="font-medium">{row.course}</p><p className="text-xs text-slate-500">{row.title}</p></td><td className="px-5 py-4">{row.units}</td><td className="px-5 py-4 text-slate-600">{row.date}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${row.status === "Approved" ? "bg-emerald-50 text-emerald-700" : row.status === "Pending" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>{row.status}</span></td></tr>)}{filtered.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">No enrollment records match your filters.</td></tr>}</tbody></table></div><p className="border-t px-5 py-3 text-xs text-slate-500">Showing {filtered.length} sample requests for the current term.</p>
    </section>
  </div></main></div>;
}
