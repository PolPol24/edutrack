"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, Clock3, XCircle } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { apiRequest } from "@/lib/api";

type Attendance = { session_date: string; class_time: string | null; course_code: string; attendance_status: "present" | "late" | "absent" };
const statusLabel = (status: Attendance["attendance_status"]) => status[0].toUpperCase() + status.slice(1);

export default function AttendancePage() {
  const [course, setCourse] = useState("All courses");
  const [status, setStatus] = useState("All statuses");
  const [records, setRecords] = useState<Attendance[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiRequest<{ records: Attendance[] }>("student_attendance").then(({ records: rows }) => setRecords(rows)).catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load attendance.")).finally(() => setLoading(false)); }, []);
  const filtered = useMemo(() => records.filter((item) => (course === "All courses" || item.course_code === course) && (status === "All statuses" || statusLabel(item.attendance_status) === status)), [records, course, status]);
  const present = records.filter((item) => item.attendance_status === "present").length;
  const late = records.filter((item) => item.attendance_status === "late").length;
  const absent = records.filter((item) => item.attendance_status === "absent").length;
  const rate = records.length ? Math.round((present / records.length) * 100) : 0;

  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="student"/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-6xl">
    <div className="mb-7"><p className="text-sm font-medium text-blue-600">Current active term</p><h1 className="mt-1 text-2xl font-bold">Attendance</h1><p className="mt-1 text-sm text-slate-500">Class sessions recorded by your instructors.</p></div>
    {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
    <div className="mb-5 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border bg-white p-5"><div className="flex items-center gap-2 text-sm text-slate-500"><CalendarCheck size={16}/>Attendance rate</div><p className="mt-2 text-3xl font-bold">{rate}%</p><p className="mt-1 text-xs text-slate-500">Across {records.length} recorded sessions</p></div><div className="rounded-2xl border bg-white p-5"><div className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 size={16}/>Present</div><p className="mt-2 text-3xl font-bold">{present}</p><p className="mt-1 text-xs text-slate-500">Recorded sessions</p></div><div className="rounded-2xl border bg-white p-5"><div className="flex items-center gap-2 text-sm text-amber-700"><Clock3 size={16}/>Late / absent</div><p className="mt-2 text-3xl font-bold">{late + absent}</p><p className="mt-1 text-xs text-slate-500">{late} late · {absent} absent</p></div></div>
    <section className="overflow-hidden rounded-2xl border bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><div><h2 className="font-semibold">Attendance log</h2><p className="mt-1 text-sm text-slate-500">Latest recorded class sessions from edutrack_db.</p></div><div className="flex gap-2"><select aria-label="Filter attendance by course" value={course} onChange={(event)=>setCourse(event.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm"><option>All courses</option>{Array.from(new Set(records.map((item)=>item.course_code))).map((item)=><option key={item}>{item}</option>)}</select><select aria-label="Filter attendance by status" value={status} onChange={(event)=>setStatus(event.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm"><option>All statuses</option><option>Present</option><option>Late</option><option>Absent</option></select></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-medium">Date</th><th className="px-5 py-3 font-medium">Course</th><th className="px-5 py-3 font-medium">Class time</th><th className="px-5 py-3 font-medium">Status</th></tr></thead><tbody>{filtered.map((item,index)=><tr key={`${item.course_code}-${item.session_date}-${index}`} className="border-t"><td className="px-5 py-4">{new Date(`${item.session_date}T00:00:00`).toLocaleDateString()}</td><td className="px-5 py-4 font-medium">{item.course_code}</td><td className="px-5 py-4 text-slate-600">{item.class_time || "—"}</td><td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${item.attendance_status === "present" ? "bg-emerald-50 text-emerald-700" : item.attendance_status === "late" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>{item.attendance_status === "absent" ? <XCircle size={13}/> : item.attendance_status === "late" ? <Clock3 size={13}/> : <CheckCircle2 size={13}/>} {statusLabel(item.attendance_status)}</span></td></tr>)}{!loading && filtered.length===0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">{records.length ? "No attendance records match those filters." : "No attendance has been recorded for your courses yet."}</td></tr>}{loading && <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">Loading attendance…</td></tr>}</tbody></table></div>
      <p className="border-t px-5 py-3 text-xs text-slate-500">Showing {filtered.length} of {records.length} database attendance records.</p>
    </section>
  </div></main></div>;
}
