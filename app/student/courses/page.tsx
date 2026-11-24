"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Search, X } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { apiRequest } from "@/lib/api";

type Course = { enrollment_id: number; course_code: string; course_title: string; description: string | null; course_number: string | null; units: number; section_code: string; instructor: string | null };
type StudentProfile = { program_name: string; year_level: number };

export default function CoursesPage() {
  const [query, setQuery] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([
      apiRequest<{ courses: Course[] }>("student_courses"),
      apiRequest<{ profile: StudentProfile }>("profile"),
    ])
      .then(([courseResult, profileResult]) => { setCourses(courseResult.courses); setProfile(profileResult.profile); })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load your courses."))
      .finally(() => setLoading(false));
  }, []);
  const filtered = useMemo(() => courses.filter((course) => `${course.course_code} ${course.course_title} ${course.instructor ?? ""}`.toLowerCase().includes(query.toLowerCase())), [courses, query]);
  const credits = courses.reduce((sum, course) => sum + Number(course.units), 0);

  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="student"/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-6xl">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-blue-600 font-medium">Current active term</p><h1 className="mt-1 text-2xl font-bold">My Courses</h1><p className="mt-1 text-sm text-slate-500">{profile ? `${profile.program_name} · Year ${profile.year_level} courses only.` : "Courses for your program and year level."}</p></div><Link href="/student/enrollment" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">Browse courses</Link></div>
    {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
    <div className="mb-5 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Enrolled courses</p><p className="mt-1 text-2xl font-bold">{courses.length}</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Credit units</p><p className="mt-1 text-2xl font-bold">{credits}</p></div></div>
    <div className="mb-4 flex items-center gap-3 rounded-xl border bg-white px-3.5"><Search size={17} className="text-slate-400"/><input aria-label="Search courses" value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search by course, code, or instructor" className="w-full bg-transparent py-3 text-sm outline-none"/></div>
    <div className="grid gap-4 md:grid-cols-2">{filtered.map((course)=><button type="button" key={course.enrollment_id} onClick={()=>setSelectedCourse(course)} aria-label={`View details for ${course.course_code} ${course.course_title}`} className="rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-500/15"><span className="text-xs font-semibold text-blue-600">{course.course_code} · {course.units} units · {course.section_code}</span><h2 className="mt-1 font-semibold">{course.course_title}</h2><p className="mt-1 text-sm text-slate-500">Instructor: {course.instructor || "Unassigned"}</p><span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700"><BookOpen size={14}/>Course no. {course.course_number || "Pending"} · View details</span></button>)}{!loading && filtered.length===0 && <p className="col-span-full rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">{query ? `No courses match “${query}”.` : "You do not have approved courses for the active term yet."}</p>}{loading && <p className="col-span-full rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">Loading your courses…</p>}</div>
    {selectedCourse && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event)=>{if(event.target===event.currentTarget)setSelectedCourse(null);}}><section role="dialog" aria-modal="true" aria-labelledby="course-detail-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><BookOpen size={21}/></span><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{selectedCourse.course_code}</p><h2 id="course-detail-title" className="mt-1 text-xl font-bold text-slate-900">{selectedCourse.course_title}</h2></div></div><button type="button" autoFocus aria-label="Close course details" onClick={()=>setSelectedCourse(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={19}/></button></div><dl className="mt-6 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm"><div><dt className="text-xs text-slate-500">Course code</dt><dd className="mt-1 font-medium">{selectedCourse.course_number || "Pending"}</dd></div><div><dt className="text-xs text-slate-500">Section</dt><dd className="mt-1 font-medium">{selectedCourse.section_code}</dd></div><div><dt className="text-xs text-slate-500">Credit units</dt><dd className="mt-1 font-medium">{selectedCourse.units}</dd></div><div><dt className="text-xs text-slate-500">Instructor</dt><dd className="mt-1 font-medium">{selectedCourse.instructor || "Unassigned"}</dd></div></dl><div className="mt-5"><h3 className="text-sm font-semibold text-slate-900">Course description</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{selectedCourse.description?.trim() || "A course description has not been added to the catalog yet."}</p></div><button type="button" onClick={()=>setSelectedCourse(null)} className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Close</button></section></div>}
  </div></main></div>;
}
