"use client";

import { FormEvent, useState } from "react";
import { BookOpen, Plus, Search, X } from "lucide-react";
import Sidebar from "@/components/Sidebar";

type Course = { code: string; title: string; program: string; units: number; instructor: string; status: "Active" | "Inactive" };
const initialCourses: Course[] = [
  { code: "CS 101", title: "Introduction to Computing", program: "BS Computer Science", units: 3, instructor: "Prof. Maria Santos", status: "Active" },
  { code: "CS 205", title: "Data Structures", program: "BS Computer Science", units: 3, instructor: "Prof. Maria Santos", status: "Active" },
  { code: "IT 205", title: "Web Application Development", program: "BS Information Technology", units: 3, instructor: "Prof. Elena Ramos", status: "Active" },
  { code: "IT 310", title: "Database Systems", program: "BS Information Technology", units: 3, instructor: "Prof. Ramon Villanueva", status: "Active" },
  { code: "MATH 202", title: "Discrete Mathematics", program: "General Education", units: 3, instructor: "Prof. Victor Toledo", status: "Inactive" },
];

export default function Page() {
  const [courses, setCourses] = useState(initialCourses);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [program, setProgram] = useState("BS Information Systems");
  const [units, setUnits] = useState(3);
  const [message, setMessage] = useState("");
  const visible = courses.filter((course) => `${course.code} ${course.title} ${course.program} ${course.instructor}`.toLowerCase().includes(query.toLowerCase()));
  function addCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCode = code.trim().toUpperCase();
    if (courses.some((course) => course.code.toLowerCase() === normalizedCode.toLowerCase())) { setMessage("That course code is already in the catalog."); return; }
    setCourses((current) => [{ code: normalizedCode, title: title.trim(), program, units, instructor: "Unassigned", status: "Active" }, ...current]);
    setMessage(`${normalizedCode} was added to the sample course catalog.`); setCode(""); setTitle(""); setShowForm(false);
  }
  function toggleCourse(course: Course) {
    const next = course.status === "Active" ? "Inactive" : "Active";
    setCourses((current) => current.map((item) => item.code === course.code ? { ...item, status: next } : item));
    setMessage(`${course.code} is now ${next.toLowerCase()} in the sample catalog.`);
  }

  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="admin"/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-6xl">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-blue-600">Academic catalog</p><h1 className="mt-1 text-2xl font-bold">Courses</h1><p className="mt-1 text-sm text-slate-500">Manage the course catalog and program assignments.</p></div><button onClick={()=>{setShowForm(true);setMessage("");}} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"><Plus size={16}/>Add course</button></div>
    {message && <p role="status" className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{message} Changes are demo-only.</p>}
    <div className="mb-5 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Courses listed</p><p className="mt-1 text-2xl font-bold">{courses.length}</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Active courses</p><p className="mt-1 text-2xl font-bold">{courses.filter((course)=>course.status==="Active").length}</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Credit units</p><p className="mt-1 text-2xl font-bold">{courses.filter((course)=>course.status==="Active").reduce((total,course)=>total+course.units,0)}</p></div></div>
    <section className="overflow-hidden rounded-2xl border bg-white"><label className="flex items-center gap-2 border-b px-4"><Search size={17} className="text-slate-400"/><input aria-label="Search courses" value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search course code, title, or program" className="w-full py-3 text-sm outline-none"/></label><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-medium">Course</th><th className="px-5 py-3 font-medium">Program</th><th className="px-5 py-3 font-medium">Units</th><th className="px-5 py-3 font-medium">Instructor</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 text-right font-medium">Action</th></tr></thead><tbody>{visible.map((course)=><tr key={course.code} className="border-t"><td className="px-5 py-4"><p className="font-semibold">{course.code}</p><p className="text-xs text-slate-500">{course.title}</p></td><td className="px-5 py-4">{course.program}</td><td className="px-5 py-4">{course.units}</td><td className="px-5 py-4">{course.instructor}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${course.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{course.status}</span></td><td className="px-5 py-4 text-right"><button onClick={()=>toggleCourse(course)} className={`text-sm font-medium ${course.status === "Active" ? "text-rose-600" : "text-emerald-700"}`}>{course.status === "Active" ? "Deactivate" : "Activate"}</button></td></tr>)}{visible.length===0&&<tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">No courses match your search.</td></tr>}</tbody></table></div><p className="border-t px-5 py-3 text-xs text-slate-500">Changes are kept in this demo page only.</p></section>
    {showForm && <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/30 p-4" role="presentation" onClick={()=>setShowForm(false)}><section role="dialog" aria-modal="true" aria-labelledby="add-course-title" onClick={(event)=>event.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between"><div><h2 id="add-course-title" className="text-lg font-semibold">Add a course</h2><p className="mt-1 text-sm text-slate-500">Create a sample catalog entry.</p></div><button aria-label="Close add course form" onClick={()=>setShowForm(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18}/></button></div><form onSubmit={addCourse} className="mt-5 space-y-4"><label className="block text-sm font-medium">Course code<input required value={code} onChange={(event)=>setCode(event.target.value)} placeholder="e.g. CS 315" className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal"/></label><label className="block text-sm font-medium">Course title<input required value={title} onChange={(event)=>setTitle(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal"/></label><label className="block text-sm font-medium">Program<select value={program} onChange={(event)=>setProgram(event.target.value)} className="mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 font-normal">{["BS Information Systems","BS Information Technology","BS Computer Science","General Education"].map((item)=><option key={item}>{item}</option>)}</select></label><label className="block text-sm font-medium">Credit units<input type="number" required min={1} max={6} value={units} onChange={(event)=>setUnits(Number(event.target.value))} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal"/></label><button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"><BookOpen size={16}/>Add course</button></form></section></div>}
  </div></main></div>;
}
