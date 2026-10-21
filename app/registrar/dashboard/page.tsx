"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardList, GraduationCap, Users } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { apiRequest } from "@/lib/api";

type Request = { request_code: string; enrollment_status: "pending" | "approved" | "rejected"; requested_at: string; student_number: string; student_name: string; course_code: string; course_title: string; units: number };
type Student = { user_id: number; student_status: string };
export default function Page() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([apiRequest<{ requests: Request[] }>("approvals"), apiRequest<{ students: Student[] }>("registrar_students")])
      .then(([approvalResult, studentResult]) => { setRequests(approvalResult.requests); setStudents(studentResult.students); })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load registrar data."))
      .finally(() => setLoading(false));
  }, []);
  const pending = requests.filter((item) => item.enrollment_status === "pending").length;
  const approved = requests.filter((item) => item.enrollment_status === "approved").length;
  const recent = requests.slice(0, 4);
  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="registrar"/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-6xl">
    <div className="mb-7"><p className="text-sm font-medium text-amber-700">Registrar dashboard</p><h1 className="mt-1 text-2xl font-bold">Student records overview</h1><p className="mt-1 text-sm text-slate-500">Current term requests and student records from edutrack_db.</p></div>
    {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[[ClipboardList,"Pending enrollments",pending,"Requests to review","/registrar/approvals"],[Users,"Student records",students.length,"All student profiles","/registrar/students"],[CheckCircle2,"Approved enrollments",approved,"Current active term","/registrar/enrollments"],[GraduationCap,"Programs",new Set(students.map((item:any)=>item.program_name)).size,"Programs with student records","/registrar/reports"]].map(([Icon,title,value,sub,href]:any)=><Link href={href} key={title} className="rounded-2xl border bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"><Icon size={20} className="mb-3 text-amber-600"/><p className="text-sm text-slate-500">{title}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-slate-500">{sub}</p></Link>)}</div>
    <section className="overflow-hidden rounded-2xl border bg-white"><div className="flex items-center justify-between border-b p-5"><div><h2 className="font-semibold">Recent enrollment requests</h2><p className="mt-1 text-sm text-slate-500">Most recent active-term submissions.</p></div><Link href="/registrar/approvals" className="text-sm font-medium text-blue-600">Review all</Link></div><div className="divide-y">{recent.map((item)=><div key={item.request_code} className="flex flex-wrap items-center justify-between gap-3 p-5"><div><p className="font-medium">{item.student_name} <span className="font-normal text-slate-500">· {item.student_number}</span></p><p className="mt-1 text-sm text-slate-600">{item.course_code} · {item.course_title}</p><p className="mt-1 text-xs text-slate-400">{new Date(`${item.requested_at.replace(" ", "T")}Z`).toLocaleString()}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.enrollment_status==="approved"?"bg-emerald-50 text-emerald-700":item.enrollment_status==="pending"?"bg-amber-50 text-amber-700":"bg-rose-50 text-rose-700"}`}>{item.enrollment_status}</span></div>)}{!loading && recent.length===0 && <p className="p-8 text-center text-sm text-slate-500">No active-term enrollment requests yet.</p>}{loading && <p className="p-8 text-center text-sm text-slate-500">Loading enrollment data…</p>}</div><div className="border-t p-4"><Link href="/registrar/students" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600">Manage student records <ArrowRight size={15}/></Link></div></section>
  </div></main></div>;
}
