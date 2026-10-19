"use client";

import { useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, Clock3, XCircle } from "lucide-react";
import Sidebar from "@/components/Sidebar";

const records = [
  { date: "Oct 19, 2026", course: "CS 101", classTime: "9:00 AM", status: "Present" },
  { date: "Oct 18, 2026", course: "MATH 202", classTime: "11:00 AM", status: "Present" },
  { date: "Oct 17, 2026", course: "ENG 101", classTime: "1:00 PM", status: "Late" },
  { date: "Oct 16, 2026", course: "PHYS 110", classTime: "8:00 AM", status: "Absent" },
  { date: "Oct 15, 2026", course: "CS 101", classTime: "9:00 AM", status: "Present" },
  { date: "Oct 14, 2026", course: "MATH 202", classTime: "11:00 AM", status: "Late" },
  { date: "Oct 13, 2026", course: "HUM 105", classTime: "2:00 PM", status: "Present" },
];

export default function AttendancePage() {
  const [course, setCourse] = useState("All courses");
  const [status, setStatus] = useState("All statuses");
  const filtered = useMemo(() => records.filter((item) => (course === "All courses" || item.course === course) && (status === "All statuses" || item.status === status)), [course, status]);
  const present = records.filter((item) => item.status === "Present").length;
  const late = records.filter((item) => item.status === "Late").length;
  const absent = records.filter((item) => item.status === "Absent").length;

  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="student"/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-6xl">
    <div className="mb-7"><p className="text-sm font-medium text-blue-600">Fall 2025–2026 · 1st semester</p><h1 className="mt-1 text-2xl font-bold">Attendance</h1><p className="mt-1 text-sm text-slate-500">Track your class attendance and review each recorded session.</p></div>
    <div className="mb-5 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border bg-white p-5"><div className="flex items-center gap-2 text-sm text-slate-500"><CalendarCheck size={16}/>Attendance rate</div><p className="mt-2 text-3xl font-bold">86%</p><p className="mt-1 text-xs text-slate-500">Across all active courses</p></div><div className="rounded-2xl border bg-white p-5"><div className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 size={16}/>Present</div><p className="mt-2 text-3xl font-bold">{present}</p><p className="mt-1 text-xs text-slate-500">Recorded sessions</p></div><div className="rounded-2xl border bg-white p-5"><div className="flex items-center gap-2 text-sm text-amber-700"><Clock3 size={16}/>Late / absent</div><p className="mt-2 text-3xl font-bold">{late + absent}</p><p className="mt-1 text-xs text-slate-500">{late} late · {absent} absent</p></div></div>
    <section className="overflow-hidden rounded-2xl border bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><div><h2 className="font-semibold">Attendance log</h2><p className="mt-1 text-sm text-slate-500">Latest recorded class sessions.</p></div><div className="flex gap-2"><select aria-label="Filter attendance by course" value={course} onChange={(event) => setCourse(event.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm"><option>All courses</option>{Array.from(new Set(records.map((item) => item.course))).map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Filter attendance by status" value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm"><option>All statuses</option><option>Present</option><option>Late</option><option>Absent</option></select></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-medium">Date</th><th className="px-5 py-3 font-medium">Course</th><th className="px-5 py-3 font-medium">Class time</th><th className="px-5 py-3 font-medium">Status</th></tr></thead><tbody>{filtered.map((item) => <tr key={`${item.course}-${item.date}`} className="border-t"><td className="px-5 py-4">{item.date}</td><td className="px-5 py-4 font-medium">{item.course}</td><td className="px-5 py-4 text-slate-600">{item.classTime}</td><td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${item.status === "Present" ? "bg-emerald-50 text-emerald-700" : item.status === "Late" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>{item.status === "Absent" ? <XCircle size={13}/> : item.status === "Late" ? <Clock3 size={13}/> : <CheckCircle2 size={13}/>} {item.status}</span></td></tr>)}{filtered.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">No attendance records match those filters.</td></tr>}</tbody></table></div>
      <p className="border-t px-5 py-3 text-xs text-slate-500">Showing {filtered.length} of {records.length} sample records · Contact your instructor if a record needs correction.</p>
    </section>
  </div></main></div>;
}
