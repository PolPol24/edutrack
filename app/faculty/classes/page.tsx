"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, CalendarDays, Clock3, Users } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { apiRequest } from "@/lib/api";

type FacultyClass = { offering_id: number; course_code: string; course_title: string; section_code: string; capacity: number; student_count: number; schedule: string | null };

export default function Page() {
  const [classes, setClasses] = useState<FacultyClass[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiRequest<{ classes: FacultyClass[] }>("faculty_classes").then(({ classes: rows }) => setClasses(rows)).catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load your classes.")).finally(() => setLoading(false)); }, []);
  const students = classes.reduce((sum, item) => sum + Number(item.student_count), 0);
  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="faculty"/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-6xl">
    <div className="mb-7"><p className="text-sm font-medium text-blue-600">Active academic term</p><h1 className="mt-1 text-2xl font-bold">My Classes</h1><p className="mt-1 text-sm text-slate-500">Classes assigned to your faculty account.</p></div>
    {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
    <div className="mb-6 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border bg-white p-5"><div className="flex items-center gap-2 text-sm text-slate-500"><BookOpen size={17}/>Assigned classes</div><p className="mt-2 text-3xl font-bold">{classes.length}</p></div><div className="rounded-2xl border bg-white p-5"><div className="flex items-center gap-2 text-sm text-slate-500"><Users size={17}/>Approved students</div><p className="mt-2 text-3xl font-bold">{students}</p></div></div>
    <section className="overflow-hidden rounded-2xl border bg-white"><div className="border-b p-5"><h2 className="font-semibold">Assigned classes</h2><p className="mt-1 text-sm text-slate-500">Class roster and schedule from edutrack_db.</p></div><div className="divide-y">{classes.map((item)=><div key={item.offering_id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div className="flex items-start gap-3"><div className="rounded-xl bg-blue-50 p-2.5 text-blue-600"><BookOpen size={18}/></div><div><p className="font-semibold">{item.course_code} · {item.course_title}</p><p className="mt-1 text-sm text-slate-500">Section {item.section_code} · {item.student_count} / {item.capacity} approved students</p><p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><CalendarDays size={13}/>{item.schedule || "Schedule not assigned"}</p></div></div><div className="flex gap-3"><Link href={`/faculty/grading?course=${encodeURIComponent(item.course_code)}`} className="rounded-lg border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Grades</Link><Link href={`/faculty/attendance?course=${encodeURIComponent(item.course_code)}`} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"><Clock3 size={15} className="mr-1 inline"/>Attendance</Link></div></div>)}{!loading && classes.length===0 && <p className="p-8 text-center text-sm text-slate-500">No classes are assigned to your account in the active term.</p>}{loading && <p className="p-8 text-center text-sm text-slate-500">Loading classes…</p>}</div></section>
  </div></main></div>;
}
