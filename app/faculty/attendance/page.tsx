"use client";

import { useState } from "react";
import { Check, CheckCheck, CircleHelp, Save } from "lucide-react";
import Sidebar from "@/components/Sidebar";

type Status = "Present" | "Late" | "Absent" | "Unmarked";
const initialRoster = [
  { id: "2025-00118", name: "Alyssa Cruz", status: "Present" as Status },
  { id: "2025-00123", name: "Miguel Reyes", status: "Present" as Status },
  { id: "2025-00131", name: "Sofia Garcia", status: "Late" as Status },
  { id: "2025-00144", name: "Noah Lim", status: "Unmarked" as Status },
  { id: "2025-00152", name: "Daniel Bautista", status: "Present" as Status },
];
const statusStyles: Record<Status, string> = { Present: "bg-emerald-50 text-emerald-700", Late: "bg-amber-50 text-amber-700", Absent: "bg-rose-50 text-rose-700", Unmarked: "bg-slate-100 text-slate-600" };

export default function Page() {
  const [course, setCourse] = useState("CS 101");
  const [roster, setRoster] = useState(initialRoster);
  const [saved, setSaved] = useState(false);
  const markedCount = roster.filter((student) => student.status !== "Unmarked").length;
  function markAllPresent() { setRoster((rows) => rows.map((student) => ({ ...student, status: "Present" }))); setSaved(false); }
  function updateStatus(id: string, status: Status) { setRoster((rows) => rows.map((student) => student.id === id ? { ...student, status } : student)); setSaved(false); }

  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="faculty"/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-6xl">
    <div className="mb-7"><p className="text-sm font-medium text-blue-600">Fall 2025–2026 · 1st semester</p><h1 className="mt-1 text-2xl font-bold">Attendance</h1><p className="mt-1 text-sm text-slate-500">Record attendance for your class sessions.</p></div>
    <section className="mb-5 rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-end justify-between gap-4"><div className="flex flex-wrap gap-3"><label className="text-sm font-medium text-slate-700">Class<select value={course} onChange={(event) => { setCourse(event.target.value); setSaved(false); }} className="mt-1.5 block rounded-lg border bg-white px-3 py-2"><option>CS 101</option><option>CS 205</option></select></label><label className="text-sm font-medium text-slate-700">Session date<input type="date" defaultValue="2026-10-20" className="mt-1.5 block rounded-lg border bg-white px-3 py-2"/></label></div><button onClick={markAllPresent} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><CheckCheck size={16}/>Mark all present</button></div></section>
    <div className="mb-5 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Students in class</p><p className="mt-1 text-2xl font-bold">{roster.length}</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Marked</p><p className="mt-1 text-2xl font-bold">{markedCount} <span className="text-sm font-normal text-slate-500">/ {roster.length}</span></p></div><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Present</p><p className="mt-1 text-2xl font-bold">{roster.filter((student) => student.status === "Present").length}</p></div></div>
    <section className="overflow-hidden rounded-2xl border bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><div><h2 className="font-semibold">Class roster · {course}</h2><p className="mt-1 text-sm text-slate-500">Choose an attendance status for each student.</p></div>{saved && <span role="status" className="inline-flex items-center gap-1.5 text-sm text-emerald-700"><Check size={16}/>Attendance saved</span>}</div><div className="divide-y">{roster.map((student) => <div key={student.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="font-medium">{student.name}</p><p className="mt-0.5 text-xs text-slate-500">{student.id}</p></div><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[student.status]}`}>{student.status}</span><select aria-label={`Attendance status for ${student.name}`} value={student.status} onChange={(event) => updateStatus(student.id, event.target.value as Status)} className="rounded-lg border bg-white px-2.5 py-2 text-sm"><option>Unmarked</option><option>Present</option><option>Late</option><option>Absent</option></select></div></div>)}</div><div className="flex flex-wrap items-center justify-between gap-3 border-t p-5"><p className="inline-flex items-center gap-1.5 text-xs text-slate-500"><CircleHelp size={14}/>Sample attendance data; not sent to a school record.</p><button onClick={() => setSaved(true)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"><Save size={16}/>Save attendance</button></div></section>
  </div></main></div>;
}
