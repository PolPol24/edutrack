"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, BookOpen, Users } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { apiRequest } from "@/lib/api";

type Account = { user_id: number; full_name: string; email: string; role: string; account_status: string; created_at: string };
type Course = { course_id: string; course_status: string };
type Program = { program_id: string };
export default function Page() {
  const [users, setUsers] = useState<Account[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([apiRequest<{ users: Account[] }>("admin_users"), apiRequest<{ courses: Course[]; programs: Program[] }>("admin_courses")])
      .then(([userResult, courseResult]) => { setUsers(userResult.users); setCourses(courseResult.courses); setPrograms(courseResult.programs); })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load admin data."))
      .finally(() => setLoading(false));
  }, []);
  const activeUsers = users.filter((item) => item.account_status === "active").length;
  const activeCourses = courses.filter((item) => item.course_status === "active").length;
  const recent = users.slice(0, 5);
  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="admin"/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-6xl">
    <div className="mb-7"><p className="text-sm font-medium text-slate-600">System administration</p><h1 className="mt-1 text-2xl font-bold">Admin Dashboard</h1><p className="mt-1 text-sm text-slate-500">Database account and course overview.</p></div>
    {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[[Users,"User accounts",users.length,`${activeUsers} active`,"/admin/users"],[BookOpen,"Courses",courses.length,`${activeCourses} active`,"/admin/courses"],[Activity,"Programs",programs.length,"Academic programs","/admin/courses"],[Activity,"Database",error?"Unavailable":"Connected","edutrack_db","/admin/settings"]].map(([Icon,title,value,sub,href]:any)=><Link key={title} href={href} className="rounded-2xl border bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"><Icon size={20} className="mb-3 text-blue-600"/><p className="text-sm text-slate-500">{title}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-slate-500">{sub}</p></Link>)}</div>
    <section className="overflow-hidden rounded-2xl border bg-white"><div className="flex items-center justify-between border-b p-5"><div><h2 className="font-semibold">Recently created accounts</h2><p className="mt-1 text-sm text-slate-500">Latest account records stored in the database.</p></div><Link href="/admin/users" className="text-sm font-medium text-blue-600">Manage users</Link></div><div className="divide-y">{recent.map((item)=><div key={item.user_id} className="flex flex-wrap items-center justify-between gap-3 p-5"><div><p className="font-medium">{item.full_name}</p><p className="mt-1 text-sm text-slate-500">{item.email}</p></div><div className="flex items-center gap-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{item.role}</span><span className="text-xs text-slate-500">{new Date(`${item.created_at.replace(" ", "T")}Z`).toLocaleDateString()}</span></div></div>)}{!loading && recent.length===0 && <p className="p-8 text-center text-sm text-slate-500">No accounts are in the database.</p>}{loading && <p className="p-8 text-center text-sm text-slate-500">Loading account data…</p>}</div><div className="border-t p-4"><Link href="/admin/settings" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600">Manage system settings <ArrowRight size={15}/></Link></div></section>
  </div></main></div>;
}
