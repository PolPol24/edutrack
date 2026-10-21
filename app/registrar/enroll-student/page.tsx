"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ClipboardCheck, GraduationCap, LoaderCircle } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { apiRequest } from "@/lib/api";

type Student = { user_id: number; student_number: string; student_name: string; program_id: string; program_code: string; program_name: string; year_level: number };
type Term = { term_id: number; term_name: string; term_status: "active" | "upcoming"; year_label: string };
type CurriculumCourse = { course_id: string; course_code: string; course_title: string; units: number | string; already_enrolled: number | string };
type EnrollmentData = { students: Student[]; terms: Term[]; curriculum: CurriculumCourse[] };

export default function Page() {
  const [students, setStudents] = useState<Student[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [studentId, setStudentId] = useState("");
  const [termId, setTermId] = useState("");
  const [curriculum, setCurriculum] = useState<CurriculumCourse[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiRequest<EnrollmentData>("registrar_enrollment")
      .then((result) => {
        setStudents(result.students);
        setTerms(result.terms);
        setTermId(String(result.terms[0]?.term_id ?? ""));
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load enrollment options."))
      .finally(() => setLoadingOptions(false));
  }, []);

  useEffect(() => {
    if (!studentId || !termId) {
      setCurriculum([]);
      return;
    }
    let current = true;
    setLoadingCurriculum(true);
    setError("");
    apiRequest<EnrollmentData>("registrar_enrollment", {}, { student_user_id: studentId, term_id: termId })
      .then((result) => { if (current) setCurriculum(result.curriculum); })
      .catch((cause: unknown) => { if (current) setError(cause instanceof Error ? cause.message : "Unable to load the program curriculum."); })
      .finally(() => { if (current) setLoadingCurriculum(false); });
    return () => { current = false; };
  }, [studentId, termId]);

  const student = students.find((item) => String(item.user_id) === studentId);
  const term = terms.find((item) => String(item.term_id) === termId);
  const totalUnits = useMemo(() => curriculum.reduce((sum, course) => sum + Number(course.units), 0), [curriculum]);
  const alreadyAssigned = curriculum.filter((course) => Number(course.already_enrolled) === 1).length;
  const canEnroll = Boolean(student && term && curriculum.length > 0 && totalUnits >= 21 && !loadingCurriculum && !saving);

  async function enroll() {
    if (!canEnroll) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await apiRequest<{ message: string }>("registrar_enrollment", {
        method: "POST",
        body: JSON.stringify({ student_user_id: Number(studentId), term_id: Number(termId) }),
      });
      setMessage(result.message);
      setConfirm(false);
      const refreshed = await apiRequest<EnrollmentData>("registrar_enrollment", {}, { student_user_id: studentId, term_id: termId });
      setCurriculum(refreshed.curriculum);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to enroll this student.");
      setConfirm(false);
    } finally {
      setSaving(false);
    }
  }

  return <div className="flex min-h-screen bg-[#f8fafc]">
    <Sidebar role="registrar" />
    {confirm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><section role="alertdialog" aria-modal="true" aria-labelledby="enroll-confirm-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 id="enroll-confirm-title" className="text-lg font-semibold">Confirm semester enrollment</h2><p className="mt-2 text-sm leading-6 text-slate-600">Enroll {student?.student_name} in all {curriculum.length} required subjects for {term?.term_name}, {term?.year_label}? This assigns {totalUnits} units to {student?.program_code} Year {student?.year_level}.</p>{error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3.5 py-3 text-sm text-rose-700">{error}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" disabled={saving} onClick={() => setConfirm(false)} className="rounded-xl border px-4 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-50">Cancel</button><button type="button" disabled={saving} onClick={enroll} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Enrolling…" : "Confirm enrollment"}</button></div></section></div>}
    <main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-5xl">
      <Link href="/registrar/enrollments" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"><ArrowLeft size={16}/>Back to enrollments</Link>
      <div className="mb-7"><p className="text-sm font-medium text-amber-700">Registrar workflow</p><h1 className="mt-1 text-2xl font-bold">Enroll a student</h1><p className="mt-1 max-w-2xl text-sm text-slate-500">Select an active student and semester. EduTrack will enroll them in the required subjects for their current program and year.</p></div>
      {message && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
      {error && !confirm && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
      <section className="rounded-2xl border bg-white p-5 sm:p-6"><div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">Student<select aria-label="Student" disabled={loadingOptions} value={studentId} onChange={(event)=>{setStudentId(event.target.value);setMessage("");}} className="mt-1.5 block w-full rounded-lg border bg-white px-3 py-2.5"><option value="">Select a student</option>{students.map((item)=><option value={item.user_id} key={item.user_id}>{item.student_number} · {item.student_name}</option>)}</select></label>
        <label className="text-sm font-medium text-slate-700">Semester<select aria-label="Semester" disabled={loadingOptions} value={termId} onChange={(event)=>{setTermId(event.target.value);setMessage("");}} className="mt-1.5 block w-full rounded-lg border bg-white px-3 py-2.5"><option value="">Select a semester</option>{terms.map((item)=><option value={item.term_id} key={item.term_id}>{item.year_label} · {item.term_name}{item.term_status === "upcoming" ? " · Upcoming" : " · Active"}</option>)}</select></label>
      </div>
      {student && <div className="mt-5 flex items-start gap-3 rounded-xl bg-slate-50 p-4"><GraduationCap size={19} className="mt-0.5 shrink-0 text-amber-600"/><div><p className="font-semibold">{student.program_code} · {student.program_name}</p><p className="mt-1 text-sm text-slate-600">Student #{student.student_number} · Year {student.year_level}</p></div></div>}
      </section>

      <section className="mt-5 overflow-hidden rounded-2xl border bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><div><h2 className="font-semibold">Semester curriculum</h2><p className="mt-1 text-sm text-slate-500">{term ? `${term.term_name} · ${term.year_label}` : "Choose a student and semester to preview required subjects."}</p></div><div className="rounded-xl bg-blue-50 px-4 py-2 text-right"><p className="text-xs font-medium text-blue-700">Total units</p><p className="text-xl font-bold text-blue-900">{totalUnits}<span className="ml-1 text-xs font-medium">/ 21 min</span></p></div></div>
        {loadingCurriculum ? <p className="p-8 text-center text-sm text-slate-500"><LoaderCircle size={17} className="mr-2 inline animate-spin"/>Loading program subjects…</p> : !studentId || !termId ? <p className="p-8 text-center text-sm text-slate-500">Select a student and semester to preview their curriculum.</p> : curriculum.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No semester curriculum is configured for this student’s current year and program.</p> : <><div className="divide-y">{curriculum.map((course)=><div key={course.course_id} className="flex items-center justify-between gap-4 px-5 py-3.5"><div><p className="font-medium">{course.course_code} · {course.course_title}</p><p className="mt-0.5 text-xs text-slate-500">{Number(course.units)} units</p></div>{Number(course.already_enrolled) === 1 && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><CheckCircle2 size={13}/>Enrolled</span>}</div>)}</div><div className="flex flex-wrap items-center justify-between gap-3 border-t bg-slate-50 px-5 py-4"><p className="text-sm text-slate-600">{alreadyAssigned} of {curriculum.length} subjects already enrolled. Existing enrollments will be kept.</p><button type="button" disabled={!canEnroll} onClick={()=>{setError("");setConfirm(true);}} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"><ClipboardCheck size={16}/>Enroll in semester</button></div></>}
      </section>
    </div></main>
  </div>;
}
