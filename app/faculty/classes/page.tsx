import Link from "next/link";
import { BookOpen, CalendarDays, ClipboardCheck, MapPin, Users } from "lucide-react";
import Sidebar from "@/components/Sidebar";

const classes = [
  { code: "CS 101", name: "Introduction to Computing", section: "BSIS 1A", students: 32, schedule: "Mon & Wed · 9:00–10:30 AM", room: "Room 201", progress: "Week 8 of 16" },
  { code: "CS 205", name: "Data Structures", section: "BSIS 2A", students: 28, schedule: "Mon & Wed · 1:00–2:30 PM", room: "Room 301", progress: "Week 8 of 16" },
  { code: "IT 310", name: "Database Systems", section: "BSIT 3B", students: 25, schedule: "Tue & Thu · 3:00–4:30 PM", room: "Computer Lab 2", progress: "Week 7 of 16" },
  { code: "IT 225", name: "Human-Computer Interaction", section: "BSIT 2A", students: 30, schedule: "Fri · 10:00 AM–1:00 PM", room: "Room 212", progress: "Week 7 of 16" },
];

export default function Page() {
  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="faculty"/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-6xl">
    <div className="mb-7"><p className="text-sm font-medium text-blue-600">Fall 2025–2026 · 1st semester</p><h1 className="mt-1 text-2xl font-bold">My Classes</h1><p className="mt-1 text-sm text-slate-500">Your assigned courses, sections, and class tools.</p></div>
    <div className="mb-5 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Assigned classes</p><p className="mt-1 text-2xl font-bold">4</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Total students</p><p className="mt-1 text-2xl font-bold">115</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Average attendance</p><p className="mt-1 text-2xl font-bold">96%</p></div></div>
    <div className="grid gap-4 md:grid-cols-2">{classes.map((item) => <article key={item.code} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-blue-600">{item.code} · {item.section}</p><h2 className="mt-1 font-semibold">{item.name}</h2></div><span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"><Users size={13}/>{item.students}</span></div><div className="mt-4 space-y-2 border-t pt-4 text-sm text-slate-600"><p className="flex items-center gap-2"><CalendarDays size={15} className="text-slate-400"/>{item.schedule}</p><p className="flex items-center gap-2"><MapPin size={15} className="text-slate-400"/>{item.room}</p><p className="text-xs text-slate-500">Course progress · {item.progress}</p></div><div className="mt-4 flex gap-2"><Link href={`/faculty/grading?course=${item.code}`} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"><ClipboardCheck size={14}/>Gradebook</Link><Link href={`/faculty/attendance?course=${item.code}`} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"><BookOpen size={14}/>Attendance</Link></div></article>)}</div>
  </div></main></div>;
}
