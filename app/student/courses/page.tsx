"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Clock, Search } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { apiRequest } from "@/lib/api";

type Course = { enrollment_id: number; course_code: string; course_title: string; units: number; section_code: string; instructor: string | null; schedule: string | null; room: string | null; numeric_grade: number | string | null; letter_grade: string | null; quiz_grade: number | string | null; project_grade: number | string | null; exam_grade: number | string | null };
type StudentProfile = { program_name: string; year_level: number };

export default function CoursesPage() {
  const [query, setQuery] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
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
    <div className="grid gap-4 md:grid-cols-2">{filtered.map((course)=><article key={course.enrollment_id} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><span className="text-xs font-semibold text-blue-600">{course.course_code} · {course.units} units · {course.section_code}</span><h2 className="mt-1 font-semibold">{course.course_title}</h2><p className="mt-1 text-sm text-slate-500">Instructor: {course.instructor || "Unassigned"}</p></div><span className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">{course.letter_grade || (course.numeric_grade != null ? `${course.numeric_grade}%` : "No grade")}</span></div><div className="mt-4 space-y-2 border-t pt-4 text-sm text-slate-600"><p className="flex items-center gap-2"><CalendarDays size={15} className="text-slate-400"/>{course.schedule || "Schedule to be announced"}</p><p className="flex items-center gap-2"><Clock size={15} className="text-slate-400"/>{course.room || "Room to be announced"}</p><p className="pt-2 text-xs text-slate-500">Quiz {course.quiz_grade != null ? `${course.quiz_grade}%` : "—"} · Project {course.project_grade != null ? `${course.project_grade}%` : "—"} · Exam {course.exam_grade != null ? `${course.exam_grade}%` : "—"}</p></div></article>)}{!loading && filtered.length===0 && <p className="col-span-full rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">{query ? `No courses match “${query}”.` : "You do not have approved courses for the active term yet."}</p>}{loading && <p className="col-span-full rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">Loading your courses…</p>}</div>
  </div></main></div>;
}
