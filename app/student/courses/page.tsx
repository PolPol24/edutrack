"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, CalendarDays, Clock, Search } from "lucide-react";
import Sidebar from "@/components/Sidebar";

const courses = [
  { code: "CS 101", name: "Introduction to Computing", units: 3, instructor: "Prof. Tan", schedule: "Mon & Wed · 9:00–10:30 AM", room: "Room 201", grade: "A−" },
  { code: "MATH 202", name: "Discrete Mathematics", units: 3, instructor: "Prof. Toledo", schedule: "Tue & Thu · 11:00 AM–12:30 PM", room: "Room 104", grade: "B+" },
  { code: "ENG 101", name: "Technical Writing", units: 3, instructor: "Prof. Tolentino", schedule: "Mon & Wed · 1:00–2:30 PM", room: "Room 301", grade: "A" },
  { code: "PHYS 110", name: "Physics for Computing", units: 4, instructor: "Prof. Vista", schedule: "Fri · 8:00–11:00 AM", room: "Science Lab 2", grade: "B" },
  { code: "HUM 105", name: "Ethics and Society", units: 3, instructor: "Prof. Samson", schedule: "Thu · 2:00–3:30 PM", room: "Room 110", grade: "A−" },
];

export default function CoursesPage() {
  const [query, setQuery] = useState("");
  const filtered = courses.filter((course) => `${course.code} ${course.name} ${course.instructor}`.toLowerCase().includes(query.toLowerCase()));

  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="student" /><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8">
    <div className="mx-auto max-w-6xl">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-blue-600 font-medium">Fall 2025–2026 · 1st semester</p><h1 className="mt-1 text-2xl font-bold">My Courses</h1><p className="mt-1 text-sm text-slate-500">Your active classes, instructors, and current grades.</p></div><Link href="/student/enrollment" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">Browse courses</Link></div>
      <div className="mb-5 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Enrolled courses</p><p className="mt-1 text-2xl font-bold">5</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Credit units</p><p className="mt-1 text-2xl font-bold">16</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Term GPA</p><p className="mt-1 text-2xl font-bold">3.6 <span className="text-sm font-medium text-emerald-600">Good standing</span></p></div></div>
      <div className="mb-4 flex items-center gap-3 rounded-xl border bg-white px-3.5"><Search size={17} className="text-slate-400"/><input aria-label="Search courses" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by course, code, or instructor" className="w-full bg-transparent py-3 text-sm outline-none" /></div>
      <div className="grid gap-4 md:grid-cols-2">{filtered.map((course) => <article key={course.code} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><span className="text-xs font-semibold text-blue-600">{course.code} · {course.units} units</span><h2 className="mt-1 font-semibold">{course.name}</h2><p className="mt-1 text-sm text-slate-500">Instructor: {course.instructor}</p></div><span className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">{course.grade}</span></div><div className="mt-4 space-y-2 border-t pt-4 text-sm text-slate-600"><p className="flex items-center gap-2"><CalendarDays size={15} className="text-slate-400"/>{course.schedule}</p><p className="flex items-center gap-2"><Clock size={15} className="text-slate-400"/>{course.room}</p></div><button type="button" onClick={() => window.alert(`${course.code}: ${course.name}\nInstructor: ${course.instructor}\nCurrent grade: ${course.grade}`)} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"><BookOpen size={15}/>Course details</button></article>)}
      {filtered.length === 0 && <p className="col-span-full rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">No courses match “{query}”.</p>}</div>
    </div>
  </main></div>;
}
