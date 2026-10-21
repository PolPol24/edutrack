"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, ClipboardCheck, Users } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { apiRequest } from "@/lib/api";

type FacultyClass = { offering_id: number; course_code: string; course_title: string; section_code: string; capacity: number; student_count: number; schedule: string | null };

export default function Page() {
  const [classes, setClasses] = useState<FacultyClass[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiRequest<{ classes: FacultyClass[] }>("faculty_classes").then(({ classes: rows }) => setClasses(rows)).catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load faculty data.")).finally(() => setLoading(false)); }, []);
  const students = classes.reduce((sum, item) => sum + Number(item.student_count), 0);
  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="faculty"/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-6xl">
    <div className="mb-7"><p className="text-sm font-medium text-blue-600">Faculty dashboard</p><h1 className="mt-1 text-2xl font-bold">Teaching overview</h1><p className="mt-1 text-sm text-slate-500">Your assigned classes and approved rosters from edutrack_db.</p></div>
    {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
    <div className="mb-6 grid gap-4 sm:grid-cols-3">{[[BookOpen,"Assigned classes",classes.length],[Users,"Approved students",students],[ClipboardCheck,"Classes with students",classes.filter((item)=>Number(item.student_count)>0).length]].map(([Icon,label,value]:any)=><div key={label} className="rounded-2xl border bg-white p-5"><Icon size={20} className="mb-3 text-blue-600"/><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>)}</div>
    <section className="overflow-hidden rounded-2xl border bg-white"><div className="flex items-center justify-between border-b p-5"><div><h2 className="font-semibold">Your classes</h2><p className="mt-1 text-sm text-slate-500">Schedules and roster sizes reflect the active term.</p></div><Link href="/faculty/classes" className="text-sm font-medium text-blue-600">All classes</Link></div><div className="divide-y">{classes.map((item)=><div key={item.offering_id} className="flex flex-wrap items-center justify-between gap-3 p-5"><div><p className="font-semibold">{item.course_code} · {item.course_title}</p><p className="mt-1 text-sm text-slate-500">Section {item.section_code} · {item.student_count} / {item.capacity} approved students</p><p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><CalendarDays size={13}/>{item.schedule || "Schedule not assigned"}</p></div><div className="flex gap-3"><Link href={`/faculty/grading?course=${encodeURIComponent(item.course_code)}`} className="rounded-lg border px-3 py-2 text-sm font-medium text-slate-700">Grades</Link><Link href={`/faculty/attendance?course=${encodeURIComponent(item.course_code)}`} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600">Attendance <ArrowRight size={15}/></Link></div></div>)}{!loading && classes.length===0 && <p className="p-8 text-center text-sm text-slate-500">No classes are assigned to your faculty account in the active term.</p>}{loading && <p className="p-8 text-center text-sm text-slate-500">Loading classes…</p>}</div></section>
  </div></main></div>;
}
