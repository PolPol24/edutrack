"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Plus, Search, X } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import ActionConfirmation from "@/components/ActionConfirmation";
import { apiRequest } from "@/lib/api";

type Course = { course_id: string; course_code: string; course_title: string; program: string; units: number; instructor: string; course_status: "active" | "inactive" };
type Program = { program_id: string; program_name: string };
type CourseAction = { kind: "create" } | { kind: "status"; course: Course; status: "active" | "inactive" } | null;

export default function Page() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [programId, setProgramId] = useState("");
  const [units, setUnits] = useState(3);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<CourseAction>(null);
  const [actionError, setActionError] = useState("");
  const visible = useMemo(() => courses.filter((course) => `${course.course_code} ${course.course_title} ${course.program} ${course.instructor}`.toLowerCase().includes(query.toLowerCase())), [courses, query]);

  const load = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const result = await apiRequest<{ courses: Course[]; programs: Program[] }>("admin_courses");
      setCourses(result.courses); setPrograms(result.programs);
      if (result.programs.length) setProgramId((current) => current || String(result.programs[0].program_id));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load the course catalog."); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  function reviewCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setActionError(""); setAction({ kind: "create" });
  }
  async function addCourse() {
    setActionError(""); setMessage(""); setBusy(true);
    try {
      const result = await apiRequest<{ message: string }>("admin_courses", { method: "POST", body: JSON.stringify({ course_code: code, course_title: title, program_id: programId, units }) });
      setMessage(result.message); setCode(""); setTitle(""); setShowForm(false); setAction(null); await load();
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Unable to add the course."); }
    finally { setBusy(false); }
  }
  async function toggleCourse(course: Course) {
    setActionError(""); setMessage(""); setBusy(true);
    try {
      const status = course.course_status === "active" ? "inactive" : "active";
      const result = await apiRequest<{ message: string }>("admin_courses", { method: "PATCH", body: JSON.stringify({ course_id: course.course_id, course_status: status }) });
      setMessage(result.message); setAction(null); await load();
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Unable to update course status."); }
    finally { setBusy(false); }
  }

  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="admin"/><ActionConfirmation open={action !== null} title={action?.kind === "create" ? "Add this course?" : action?.status === "inactive" ? "Deactivate this course?" : "Activate this course?"} description={action?.kind === "create" ? `Add ${code || "this course"} · ${title || ""} to ${programs.find((program) => String(program.program_id) === programId)?.program_name ?? "the selected program"} and save it in edutrack_db?` : action ? `${action.course.course_code} · ${action.course.course_title} will be set to ${action.status}.` : "Confirm this course change."} confirmLabel={action?.kind === "create" ? "Add course" : action?.status === "inactive" ? "Deactivate course" : "Activate course"} danger={action?.kind === "status" && action.status === "inactive"} busy={busy} error={actionError} onCancel={() => { setAction(null); setActionError(""); }} onConfirm={() => action?.kind === "create" ? addCourse() : action?.kind === "status" ? toggleCourse(action.course) : undefined}/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-6xl">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-blue-600">Academic catalog</p><h1 className="mt-1 text-2xl font-bold">Courses</h1><p className="mt-1 text-sm text-slate-500">Manage the course catalog and program assignments.</p></div><button onClick={()=>{setShowForm(true);setMessage("");}} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"><Plus size={16}/>Add course</button></div>
    {message && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message} Saved in edutrack_db.</p>}{error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
    <div className="mb-5 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Courses listed</p><p className="mt-1 text-2xl font-bold">{courses.length}</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Active courses</p><p className="mt-1 text-2xl font-bold">{courses.filter((course)=>course.course_status==="active").length}</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Active credit units</p><p className="mt-1 text-2xl font-bold">{courses.filter((course)=>course.course_status==="active").reduce((total,course)=>total+Number(course.units),0)}</p></div></div>
    <section className="overflow-hidden rounded-2xl border bg-white"><label className="flex items-center gap-2 border-b px-4"><Search size={17} className="text-slate-400"/><input aria-label="Search courses" value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search course code, title, or program" className="w-full py-3 text-sm outline-none"/></label><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-medium">Course</th><th className="px-5 py-3 font-medium">Program</th><th className="px-5 py-3 font-medium">Units</th><th className="px-5 py-3 font-medium">Instructor</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 text-right font-medium">Action</th></tr></thead><tbody>{visible.map((course)=><tr key={course.course_id} className="border-t"><td className="px-5 py-4"><p className="font-semibold">{course.course_code}</p><p className="text-xs text-slate-500">{course.course_title}</p></td><td className="px-5 py-4">{course.program}</td><td className="px-5 py-4">{course.units}</td><td className="px-5 py-4">{course.instructor}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${course.course_status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{course.course_status}</span></td><td className="px-5 py-4 text-right"><button disabled={busy} onClick={()=>{setActionError("");setAction({kind:"status",course,status:course.course_status === "active" ? "inactive" : "active"});}} className={`text-sm font-medium disabled:opacity-50 ${course.course_status === "active" ? "text-rose-600" : "text-emerald-700"}`}>{course.course_status === "active" ? "Deactivate" : "Activate"}</button></td></tr>)}{!busy && visible.length===0&&<tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">No courses match your search.</td></tr>}</tbody></table></div><p className="border-t px-5 py-3 text-xs text-slate-500">{busy ? "Loading database records…" : `Showing ${visible.length} database courses.`}</p></section>
    {showForm && <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/30 p-4" role="presentation" onClick={()=>setShowForm(false)}><section role="dialog" aria-modal="true" aria-labelledby="add-course-title" onClick={(event)=>event.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between"><div><h2 id="add-course-title" className="text-lg font-semibold">Add a course</h2><p className="mt-1 text-sm text-slate-500">The new course will be saved in the database.</p></div><button aria-label="Close add course form" onClick={()=>setShowForm(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18}/></button></div><form onSubmit={reviewCourse} className="mt-5 space-y-4"><label className="block text-sm font-medium">Course code<input required value={code} onChange={(event)=>setCode(event.target.value)} placeholder="e.g. CS 315" className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal"/></label><label className="block text-sm font-medium">Course title<input required value={title} onChange={(event)=>setTitle(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal"/></label><label className="block text-sm font-medium">Program<select required value={programId} onChange={(event)=>setProgramId(event.target.value)} className="mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 font-normal">{programs.map((item)=><option value={item.program_id} key={item.program_id}>{item.program_name}</option>)}</select></label><label className="block text-sm font-medium">Credit units<input type="number" required min={1} max={6} value={units} onChange={(event)=>setUnits(Number(event.target.value))} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal"/></label><button disabled={busy} type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"><BookOpen size={16}/>{busy ? "Saving…" : "Add course"}</button></form></section></div>}
  </div></main></div>;
}
