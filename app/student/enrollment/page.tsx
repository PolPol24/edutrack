"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, Plus, X } from "lucide-react";
import Sidebar from "@/components/Sidebar";

type Enrollment = { code: string; name: string; units: number; status: "Enrolled" | "Pending approval" };
const initialEnrollments: Enrollment[] = [
  { code: "CS 101", name: "Introduction to Computing", units: 3, status: "Enrolled" },
  { code: "MATH 202", name: "Discrete Mathematics", units: 3, status: "Enrolled" },
  { code: "ENG 101", name: "Technical Writing", units: 3, status: "Enrolled" },
  { code: "PHYS 110", name: "Physics for Computing", units: 4, status: "Pending approval" },
  { code: "HUM 105", name: "Ethics and Society", units: 3, status: "Pending approval" },
];
const catalog = [
  { code: "BIO 120", name: "Science, Technology and Society", units: 3 },
  { code: "IT 205", name: "Web Application Development", units: 3 },
];

export default function EnrollmentPage() {
  const [enrollments, setEnrollments] = useState(initialEnrollments);
  const [message, setMessage] = useState("");
  const enrolledCodes = new Set(enrollments.map((item) => item.code));
  const totalUnits = enrollments.reduce((total, item) => total + item.units, 0);

  function cancel(code: string) {
    setEnrollments((items) => items.filter((item) => item.code !== code));
    setMessage(`${code} was removed from your enrollment request.`);
  }

  function addCourse(course: (typeof catalog)[number]) {
    setEnrollments((items) => [...items, { ...course, status: "Pending approval" }]);
    setMessage(`${course.code} was submitted for registrar approval.`);
  }

  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="student"/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-6xl">
    <div className="mb-7"><p className="text-sm font-medium text-blue-600">Academic year 2025–2026</p><h1 className="mt-1 text-2xl font-bold">Enrollment</h1><p className="mt-1 text-sm text-slate-500">Review your course requests and current registration.</p></div>
    <div className="mb-5 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Semester</p><p className="mt-1 font-semibold">1st semester</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Registered courses</p><p className="mt-1 text-2xl font-bold">{enrollments.length}</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Requested units</p><p className="mt-1 text-2xl font-bold">{totalUnits} <span className="text-sm font-normal text-slate-500">/ 21 maximum</span></p></div></div>
    {message && <p role="status" className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{message}</p>}
    <section className="overflow-hidden rounded-2xl border bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><div><h2 className="font-semibold">My enrollment</h2><p className="mt-1 text-sm text-slate-500">Pending requests need registrar approval.</p></div><Link href="/student/courses" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">View my courses</Link></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-medium">Course</th><th className="px-5 py-3 font-medium">Units</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 text-right font-medium">Action</th></tr></thead><tbody>{enrollments.map((item) => <tr key={item.code} className="border-t"><td className="px-5 py-4"><span className="font-semibold">{item.code}</span><span className="ml-2 text-slate-600">{item.name}</span></td><td className="px-5 py-4">{item.units}</td><td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${item.status === "Enrolled" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{item.status === "Enrolled" ? <CheckCircle2 size={13}/> : <Clock3 size={13}/>} {item.status}</span></td><td className="px-5 py-4 text-right">{item.status === "Pending approval" ? <button onClick={() => cancel(item.code)} className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-800"><X size={15}/>Cancel request</button> : <span className="text-slate-400">Registered</span>}</td></tr>)}{enrollments.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">No courses in your enrollment yet.</td></tr>}</tbody></table></div>
    </section>
    <section className="mt-6 rounded-2xl border bg-white p-5"><h2 className="font-semibold">Course catalog</h2><p className="mt-1 text-sm text-slate-500">Available courses you can request to add.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{catalog.map((course) => <div key={course.code} className="flex items-center justify-between gap-3 rounded-xl border p-4"><div><p className="font-semibold">{course.code} · {course.name}</p><p className="mt-1 text-sm text-slate-500">{course.units} units · Request requires registrar approval</p></div>{enrolledCodes.has(course.code) ? <span className="text-xs text-emerald-700">Requested</span> : <button onClick={() => addCourse(course)} className="inline-flex shrink-0 items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"><Plus size={15}/>Add</button>}</div>)}</div></section>
  </div></main></div>;
}
