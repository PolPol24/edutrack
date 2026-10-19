import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, ClipboardCheck, Clock3 } from "lucide-react";
import Sidebar from "@/components/Sidebar";

const classes = [
  { code: "CS 101", name: "Introduction to Computing", section: "BSIS 1A", time: "9:00–10:30 AM", room: "Room 201", students: 32 },
  { code: "CS 205", name: "Data Structures", section: "BSIS 2A", time: "1:00–2:30 PM", room: "Room 301", students: 28 },
  { code: "IT 310", name: "Database Systems", section: "BSIT 3B", time: "3:00–4:30 PM", room: "Lab 2", students: 25 },
];

export default function Page() {
  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="faculty"/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-6xl">
    <div className="mb-7"><p className="text-sm font-medium text-blue-600">Fall 2025–2026 · 1st semester</p><h1 className="mt-1 text-2xl font-bold">Faculty Dashboard</h1><p className="mt-1 text-sm text-slate-500">Good morning, Prof. Maria Santos. Here’s your teaching overview.</p></div>
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[[BookOpen,"Classes handled","4","Across 3 programs","/faculty/classes"],[ClipboardCheck,"Pending grades","12","Across 2 classes","/faculty/grading"],[CalendarDays,"Attendance today","96%","CS 101 · 31 of 32 marked","/faculty/attendance"],[Clock3,"Next class","1:00 PM","CS 205 · Room 301","/faculty/classes"]].map(([Icon,title,value,sub,href]: any) => <Link key={title} href={href} className="rounded-2xl border bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"><Icon className="mb-3 text-blue-600" size={20}/><p className="text-sm text-slate-500">{title}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-slate-500">{sub}</p></Link>)}
    </div>
    <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      <section className="overflow-hidden rounded-2xl border bg-white"><div className="flex items-center justify-between border-b p-5"><div><h2 className="font-semibold">Today’s schedule</h2><p className="mt-1 text-sm text-slate-500">Monday, October 20, 2026</p></div><Link href="/faculty/classes" className="text-sm font-medium text-blue-600">All classes</Link></div><div className="divide-y">{classes.map((item) => <div key={item.code} className="flex flex-wrap items-center justify-between gap-3 p-5"><div className="flex items-start gap-3"><div className="rounded-xl bg-blue-50 p-2.5 text-blue-600"><BookOpen size={18}/></div><div><p className="font-semibold">{item.code} · {item.name}</p><p className="mt-1 text-sm text-slate-500">{item.section} · {item.students} students</p><p className="mt-1 text-xs text-slate-500">{item.time} · {item.room}</p></div></div><Link href="/faculty/classes" aria-label={`View ${item.code}`} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-blue-600"><ArrowRight size={18}/></Link></div>)}</div></section>
      <div className="space-y-5"><section className="rounded-2xl border bg-white p-5"><h2 className="font-semibold">To do</h2><div className="mt-4 space-y-3"><Link href="/faculty/grading" className="flex items-center justify-between rounded-xl bg-amber-50 p-4 hover:bg-amber-100"><span><span className="block text-sm font-medium text-amber-900">Review submitted grades</span><span className="mt-1 block text-xs text-amber-700">12 scores need attention</span></span><ArrowRight size={17} className="text-amber-700"/></Link><Link href="/faculty/attendance" className="flex items-center justify-between rounded-xl bg-blue-50 p-4 hover:bg-blue-100"><span><span className="block text-sm font-medium text-blue-900">Complete attendance</span><span className="mt-1 block text-xs text-blue-700">1 student not marked for CS 101</span></span><ArrowRight size={17} className="text-blue-700"/></Link></div></section><section className="rounded-2xl border bg-white p-5"><h2 className="font-semibold">Quick links</h2><div className="mt-3 grid grid-cols-2 gap-2"><Link href="/faculty/grading" className="rounded-lg border px-3 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">Open gradebook</Link><Link href="/faculty/profile" className="rounded-lg border px-3 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">My profile</Link></div></section></div>
    </div>
  </div></main></div>;
}
