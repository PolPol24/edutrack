"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarCheck, Clock3, GraduationCap } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { apiRequest } from "@/lib/api";

type Course = { enrollment_id: number; course_code: string; course_title: string; units: number; schedule: string | null; room: string | null; grade_points: number | null };
type Attendance = { session_date: string; class_time: string | null; course_code: string; attendance_status: "present" | "late" | "absent" };
type Enrollment = { enrollment_status: string };

export default function Dashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [profile, setProfile] = useState<{ full_name: string; student_number: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([
      apiRequest<{ courses: Course[] }>("student_courses"),
      apiRequest<{ records: Attendance[] }>("student_attendance"),
      apiRequest<{ enrollments: Enrollment[] }>("enrollments"),
      apiRequest<{ profile: { full_name: string; student_number: string } }>("profile"),
    ]).then(([courseResult, attendanceResult, enrollmentResult, profileResult]) => {
      setCourses(courseResult.courses); setAttendance(attendanceResult.records); setEnrollments(enrollmentResult.enrollments); setProfile(profileResult.profile);
    }).catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load dashboard data."))
      .finally(() => setLoading(false));
  }, []);
  const pending = enrollments.filter((item) => item.enrollment_status === "pending").length;
  const approved = enrollments.filter((item) => item.enrollment_status === "approved").length;
  const present = attendance.filter((item) => item.attendance_status === "present").length;
  const rate = attendance.length ? Math.round((present / attendance.length) * 100) : 0;
  const points = courses.map((item) => Number(item.grade_points)).filter((value) => Number.isFinite(value) && value > 0);
  const gpa = points.length ? (points.reduce((sum, value) => sum + value, 0) / points.length).toFixed(2) : "—";
  const completion = enrollments.length ? Math.round((approved / enrollments.length) * 100) : 0;
  const stats = [
    { icon: BookOpen, label: "Enrolled courses", value: courses.length, sub: `${courses.reduce((sum, item) => sum + Number(item.units), 0)} credit units`, href: "/student/courses" },
    { icon: CalendarCheck, label: "Attendance rate", value: `${rate}%`, sub: `${attendance.length} recorded sessions`, href: "/student/attendance" },
    { icon: Clock3, label: "Pending enrollment", value: pending, sub: "Awaiting registrar review", href: "/student/enrollment" },
    { icon: GraduationCap, label: "GPA", value: gpa, sub: "Based on recorded final grades", href: "/student/courses" },
  ];
  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="student"/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-6xl">
    <div className="mb-7"><p className="text-sm font-medium text-blue-600">Student dashboard</p><h1 className="mt-1 text-2xl font-bold">Welcome{profile ? `, ${profile.full_name}` : ""}</h1><p className="mt-1 text-sm text-slate-500">{profile?.student_number ? `Student ID ${profile.student_number} · ` : ""}Overview of your academic activity from edutrack_db.</p></div>
    {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({ icon: Icon, label, value, sub, href }) => <Link key={label} href={href} aria-label={`${label}: ${value}. View details`} className="group rounded-2xl border bg-white p-5 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-500/20"><Icon size={20} className="mb-3 text-blue-600"/><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-slate-500">{sub}</p><span className="mt-3 inline-block text-xs font-semibold text-blue-600 opacity-0 transition group-hover:opacity-100 group-focus:opacity-100">View details →</span></Link>)}</div>
    <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]"><section className="overflow-hidden rounded-2xl border bg-white"><div className="flex items-center justify-between border-b p-5"><div><h2 className="font-semibold">My schedule</h2><p className="mt-1 text-sm text-slate-500">Approved classes for the active term</p></div><Link href="/student/courses" className="text-sm font-medium text-blue-600">All courses</Link></div><div className="divide-y">{courses.map((item)=><div key={item.enrollment_id} className="flex items-start justify-between gap-4 p-5"><div><p className="font-semibold">{item.course_code} · {item.course_title}</p><p className="mt-1 text-sm text-slate-500">{item.schedule || "Schedule to be announced"}</p></div><span className="shrink-0 text-sm text-slate-500">{item.room || "—"}</span></div>)}{!loading && courses.length===0 && <p className="p-8 text-center text-sm text-slate-500">No approved courses for the active term yet.</p>}{loading && <p className="p-8 text-center text-sm text-slate-500">Loading your courses…</p>}</div></section>
      <div className="space-y-5"><section className="rounded-2xl border bg-white p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Recent attendance</h2><Link href="/student/attendance" className="text-sm font-medium text-blue-600">View all</Link></div><div className="space-y-3">{attendance.slice(0,5).map((item,index)=><div key={`${item.course_code}-${item.session_date}-${index}`} className="flex items-center justify-between gap-3 text-sm"><span><span className="font-medium">{item.course_code}</span><span className="ml-2 text-xs text-slate-500">{new Date(`${item.session_date}T00:00:00`).toLocaleDateString()}</span></span><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.attendance_status==="present"?"bg-emerald-50 text-emerald-700":item.attendance_status==="late"?"bg-amber-50 text-amber-700":"bg-rose-50 text-rose-700"}`}>{item.attendance_status}</span></div>)}{!loading && attendance.length===0 && <p className="text-sm text-slate-500">No attendance recorded yet.</p>}</div></section>
        <section className="rounded-2xl border bg-white p-5"><h2 className="font-semibold">Enrollment status</h2><p className="mt-1 text-sm text-slate-500">{approved} approved · {pending} pending · {enrollments.length} requests</p><div className="mt-4 h-2.5 overflow-hidden rounded-full bg-blue-50"><div className="h-full rounded-full bg-blue-600" style={{width:`${completion}%`}}/></div><div className="mt-4 flex items-center justify-between"><span className="text-xs text-slate-500">{completion}% approved</span><Link href="/student/enrollment" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600">Manage requests <ArrowRight size={15}/></Link></div></section>
      </div></div>
  </div></main></div>;
}
