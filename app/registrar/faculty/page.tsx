"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, BriefcaseBusiness, LoaderCircle, Users } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { apiRequest } from "@/lib/api";

type FacultyAssignment = {
  offering_id: number;
  course_number: string | null;
  course_code: string;
  course_title: string;
  section_code: string;
  term_name: string;
  year_label: string;
  program_code: string | null;
};
type FacultyMember = {
  user_id: number;
  employee_number: string;
  full_name: string;
  email: string;
  department_code: string | null;
  department_name: string | null;
  office: string | null;
  account_status: "active" | "suspended";
  assignment_count: number;
  assignments: FacultyAssignment[];
};

export default function FacultyRosterPage() {
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<{ faculty: FacultyMember[] }>("registrar_faculty")
      .then((data) => setFaculty(data.faculty))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load the faculty roster."))
      .finally(() => setLoading(false));
  }, []);

  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="registrar"/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-6xl">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-amber-700">Registrar directory</p><h1 className="mt-1 text-2xl font-bold">Faculty roster</h1><p className="mt-1 max-w-2xl text-sm text-slate-500">Review instructor profiles and their active or upcoming course assignments. Instructors can teach multiple subjects and sections.</p></div><Link href="/registrar/sections" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Assign classes <ArrowRight size={16}/></Link></div>
    <div className="mb-5 grid gap-4 sm:grid-cols-2"><div className="flex items-center gap-3 rounded-2xl border bg-white p-5"><div className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><Users size={19}/></div><div><p className="text-sm text-slate-500">Faculty accounts</p><p className="text-xl font-bold">{faculty.length}</p></div></div><div className="flex items-center gap-3 rounded-2xl border bg-white p-5"><div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><BookOpen size={19}/></div><div><p className="text-sm text-slate-500">Active and upcoming class assignments</p><p className="text-xl font-bold">{faculty.reduce((sum, member) => sum + Number(member.assignment_count), 0)}</p></div></div></div>
    {error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
    <section className="overflow-hidden rounded-2xl border bg-white"><div className="border-b p-5"><h2 className="font-semibold">Instructor directory</h2><p className="mt-1 text-sm text-slate-500">Every assignment is tied to an individual course number.</p></div>{loading ? <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><LoaderCircle size={17} className="animate-spin"/>Loading faculty…</div> : faculty.length === 0 ? <p className="p-10 text-center text-sm text-slate-500">No faculty accounts are available.</p> : <div className="divide-y">{faculty.map((member) => <article key={member.user_id} className="p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-semibold text-slate-700">{member.full_name.split(/\s+/).map((part) => part[0]).slice(0,2).join("").toUpperCase()}</div><div><h3 className="font-semibold">{member.full_name}</h3><p className="mt-0.5 text-sm text-slate-500">{member.email}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span>{member.employee_number}</span>{member.department_name && <span className="inline-flex items-center gap-1"><BriefcaseBusiness size={13}/>{member.department_code} · {member.department_name}</span>}{member.office && <span>{member.office}</span>}</div></div></div><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${member.account_status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{member.account_status}</span><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{member.assignment_count} {member.assignment_count === 1 ? "class" : "classes"}</span></div></div>
      {member.assignments.length > 0 ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{member.assignments.map((assignment) => <div key={assignment.offering_id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{assignment.course_code} · {assignment.course_title}</p>{assignment.course_number && <span className="font-mono text-xs text-slate-500">{assignment.course_number}</span>}</div><p className="mt-1 text-xs text-slate-500">{assignment.program_code ?? "Program"} · {assignment.section_code} · {assignment.year_label} · {assignment.term_name}</p></div>)}</div> : <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">No classes assigned for the active or upcoming semesters.</p>}
      </article>)}</div>}</section>
  </div></main></div>;
}
