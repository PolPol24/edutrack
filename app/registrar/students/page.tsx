"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Search, UserPlus, UserX, X, CheckCircle2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import ActionConfirmation from "@/components/ActionConfirmation";
import FaceEnrollmentCapture, { FaceCapture } from "@/components/FaceEnrollmentCapture";
import { apiRequest } from "@/lib/api";

type Student = { user_id: number; student_number: string; name: string; email: string; program: string; year: number; status: string; units: number; is_irregular: number | string };
type StudentRow = { user_id: number; student_number: string; full_name: string; email: string; program_name: string; year_level: number; student_status: string; units: number; is_irregular: number | string };
type Program = { program_id: string; program_name: string };
type StudentAccount = { user_id: number; full_name: string; email: string };
type AcademicCourse = { course_id: string; course_code: string; course_title: string; recommended_year: number; recommended_semester: number };
type AcademicTerm = { term_id: number; term_name: string; year_label: string };
type CourseResult = { course_code: string; course_title: string; term_name: string; year_label: string; result_status: string };
const statusName = (status: string) => status.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());

export default function Page() {
  const [students, setStudents] = useState<Student[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [selected, setSelected] = useState<Student | null>(null);
  const [academicCourses, setAcademicCourses] = useState<AcademicCourse[]>([]);
  const [academicTerms, setAcademicTerms] = useState<AcademicTerm[]>([]);
  const [courseResults, setCourseResults] = useState<CourseResult[]>([]);
  const [resultCourseId, setResultCourseId] = useState("");
  const [resultTermId, setResultTermId] = useState("");
  const [resultStatus, setResultStatus] = useState("passed");
  const [savingResult, setSavingResult] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [studentAccount, setStudentAccount] = useState<StudentAccount | null>(null);
  const [programId, setProgramId] = useState("");
  const [year, setYear] = useState("");
  const [isIrregular, setIsIrregular] = useState(false);
  const [faceCapture, setFaceCapture] = useState<FaceCapture | null>(null);
  const [faceConsent, setFaceConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [confirmAdd, setConfirmAdd] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [dropTarget, setDropTarget] = useState<Student | null>(null);
  const [dropping, setDropping] = useState(false);
  const [dropError, setDropError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await apiRequest<{ students: StudentRow[]; programs: Program[] }>("registrar_students");
      setStudents(result.students.map((row) => ({ user_id: row.user_id, student_number: row.student_number, name: row.full_name, email: row.email, program: row.program_name, year: row.year_level, status: row.student_status, units: row.units, is_irregular: row.is_irregular })));
      setPrograms(result.programs);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load student records."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!selected) { setAcademicCourses([]); setAcademicTerms([]); setCourseResults([]); return; }
    apiRequest<{ courses: AcademicCourse[]; terms: AcademicTerm[]; results: CourseResult[] }>("registrar_course_results", {}, { student_user_id: selected.user_id })
      .then((data) => { setAcademicCourses(data.courses); setAcademicTerms(data.terms); setCourseResults(data.results); })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load course history."));
  }, [selected]);

  const visible = useMemo(() => students.filter((student) => `${student.student_number} ${student.name} ${student.email} ${student.program}`.toLowerCase().includes(query.toLowerCase()) && (status === "All statuses" || statusName(student.status) === status)), [students, query, status]);
  async function lookupAccount() {
    setStudentAccount(null); setLookupError("");
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) { setLookupError("Enter a valid student account email address."); return; }
    setLookingUp(true);
    try {
      const result = await apiRequest<{ account: StudentAccount }>("registrar_students", {}, { lookup_email: normalized });
      setStudentAccount(result.account);
    } catch (cause) { setLookupError(cause instanceof Error ? cause.message : "Unable to find this student account."); }
    finally { setLookingUp(false); }
  }
  async function reviewStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setConfirmError(""); setLookupError("");
    if (!studentAccount) { await lookupAccount(); return; }
    if (!faceCapture || !faceConsent) { setLookupError("Capture the student’s face and confirm the face data notice first."); return; }
    setConfirmAdd(true);
  }
  const formReady = Boolean(studentAccount && programId && year && faceCapture && faceConsent);
  async function addStudent() {
    if (!studentAccount) return;
    setSaving(true); setConfirmError(""); setMessage("");
    try {
      const result = await apiRequest<{ message: string; user: { full_name: string; student_number: string } }>("registrar_students", { method: "POST", body: JSON.stringify({ student_user_id: studentAccount.user_id, program_id: programId, year_level: Number(year), is_irregular: isIrregular, ...faceCapture, face_consent: faceConsent }) });
      setMessage(`${result.user.full_name} was added as student record ${result.user.student_number} and linked to the existing account.`);
      setEmail(""); setStudentAccount(null); setProgramId(""); setYear(""); setIsIrregular(false); setFaceCapture(null); setFaceConsent(false); setConfirmAdd(false); setShowForm(false); await load();
    } catch (cause) { setConfirmError(cause instanceof Error ? cause.message : "Unable to add the student record."); }
    finally { setSaving(false); }
  }
  async function withdrawStudent() {
    if (!dropTarget) return;
    setDropping(true); setDropError(""); setMessage("");
    try {
      await apiRequest<{ message: string }>("registrar_students", { method: "PATCH", body: JSON.stringify({ user_id: dropTarget.user_id }) });
      setMessage(`${dropTarget.name} was withdrawn. Their academic records were retained.`);
      setDropTarget(null); setSelected(null); await load();
    } catch (cause) { setDropError(cause instanceof Error ? cause.message : "Unable to withdraw this student."); }
    finally { setDropping(false); }
  }
  async function saveCourseResult(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected || !resultCourseId || !resultTermId) return;
    setSavingResult(true); setError(""); setMessage("");
    try {
      await apiRequest("registrar_course_results", { method: "POST", body: JSON.stringify({ student_user_id: selected.user_id, course_id: resultCourseId, term_id: Number(resultTermId), result_status: resultStatus }) });
      const data = await apiRequest<{ courses: AcademicCourse[]; terms: AcademicTerm[]; results: CourseResult[] }>("registrar_course_results", {}, { student_user_id: selected.user_id });
      setAcademicCourses(data.courses); setAcademicTerms(data.terms); setCourseResults(data.results); setMessage("Past course result saved. This history is used to check listed course prerequisites.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save this course result."); }
    finally { setSavingResult(false); }
  }

  const activeCount = students.filter((student) => student.status === "active").length;
  const programCount = new Set(students.map((student) => student.program)).size;
  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="registrar"/>
    <ActionConfirmation open={confirmAdd} title="Add this student record?" description={`Link an academic record for ${studentAccount?.full_name ?? "this existing student account"} as a Year ${year} ${isIrregular ? "irregular " : ""}student?`} confirmLabel="Add Student Record" busy={saving} error={confirmError} confirmDisabled={!formReady} onCancel={() => { setConfirmAdd(false); setConfirmError(""); }} onConfirm={addStudent}/>
    <ActionConfirmation open={Boolean(dropTarget)} title="Withdraw this student?" description={`${dropTarget?.name ?? "This student"} will no longer be able to sign in. Their academic and enrollment records will be retained.`} confirmLabel="Withdraw student" busy={dropping} error={dropError} danger onCancel={() => { setDropTarget(null); setDropError(""); }} onConfirm={withdrawStudent}/>
    <main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-6xl">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-amber-700">Student records</p><h1 className="mt-1 text-2xl font-bold">Students</h1><p className="mt-1 text-sm text-slate-500">Academic records are attached to existing student login accounts.</p></div><button onClick={() => { setShowForm(true); setMessage(""); setError(""); }} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"><UserPlus size={16}/>Add Student Record</button></div>
      {message && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}{error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
      <div className="mb-5 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Total student records</p><p className="mt-1 text-2xl font-bold">{students.length}</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Active students</p><p className="mt-1 text-2xl font-bold">{activeCount}</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Programs represented</p><p className="mt-1 text-2xl font-bold">{programCount}</p></div></div>
      <section className="overflow-hidden rounded-2xl border bg-white"><div className="flex flex-wrap gap-3 border-b p-4"><label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-lg border px-3"><Search size={17} className="text-slate-400"/><input aria-label="Search students" value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search name, student number, email, or program" className="w-full py-2.5 text-sm outline-none"/></label><select aria-label="Filter students by status" value={status} onChange={(event)=>setStatus(event.target.value)} className="rounded-lg border bg-white px-3 text-sm"><option>All statuses</option><option>Active</option><option>On Leave</option><option>Graduated</option><option>Withdrawn</option></select></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-medium">Student</th><th className="px-5 py-3 font-medium">Program</th><th className="px-5 py-3 font-medium">Year</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 text-right font-medium">Action</th></tr></thead><tbody>{visible.map((student)=><tr key={student.user_id} className="border-t"><td className="px-5 py-4"><p className="font-medium">{student.name}</p><p className="text-xs text-slate-500">{student.student_number}</p></td><td className="px-5 py-4">{student.program}</td><td className="px-5 py-4">Year {student.year}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${student.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{statusName(student.status)}</span></td><td className="px-5 py-4 text-right"><div className="inline-flex items-center gap-2"><button onClick={() => setSelected(student)} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700"><Eye size={14}/>View</button>{student.status !== "withdrawn" && <button onClick={() => { setDropError(""); setDropTarget(student); }} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700"><UserX size={14}/>Drop</button>}</div></td></tr>)}{!loading && visible.length===0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">No students match your search.</td></tr>}{loading && <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">Loading student records…</td></tr>}</tbody></table></div><p className="border-t px-5 py-3 text-xs text-slate-500">Showing {visible.length} student records.</p>
      </section>
      {selected && <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/30 p-4" role="presentation" onClick={() => setSelected(null)}><section role="dialog" aria-modal="true" aria-labelledby="student-detail-title" onClick={(event) => event.stopPropagation()} className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between"><div><h2 id="student-detail-title" className="text-lg font-semibold">Student record</h2><p className="mt-1 text-sm text-slate-500">{selected.student_number}</p></div><button aria-label="Close student details" onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18}/></button></div><div className="mt-5 space-y-3 text-sm"><p><span className="text-slate-500">Name</span><br/><span className="font-medium">{selected.name}</span></p><p><span className="text-slate-500">Login account</span><br/><span className="font-medium">{selected.email}</span></p><p><span className="text-slate-500">Program and year</span><br/><span className="font-medium">{selected.program} · Year {selected.year}</span></p><p><span className="text-slate-500">Current enrollment</span><br/><span className="font-medium">{selected.units} units</span></p><label className="flex items-start gap-2 rounded-lg border p-3"><input type="checkbox" checked={Number(selected.is_irregular)===1} onChange={async(event)=>{const next=event.target.checked;try{await apiRequest('registrar_students',{method:'PATCH',body:JSON.stringify({user_id:selected.user_id,is_irregular:next})});setSelected({...selected,is_irregular:next?1:0});await load()}catch(cause){setError(cause instanceof Error?cause.message:'Unable to update student classification.')}}}/><span><strong>Irregular student</strong><span className="mt-0.5 block text-xs text-slate-500">Allows eligible courses outside the normal year plan.</span></span></label><p><span className="text-slate-500">Record status</span><br/><span className="font-medium">{statusName(selected.status)}</span></p></div>
        <div className="mt-5 border-t pt-4"><h3 className="font-semibold">Past course results</h3><p className="mt-1 text-xs text-amber-700">A higher-year course is available if it has no listed prerequisites or the student has passed every listed prerequisite. Record course results here to check eligibility.</p><form onSubmit={saveCourseResult} className="mt-3 grid gap-2 sm:grid-cols-4"><select required value={resultCourseId} onChange={(event)=>setResultCourseId(event.target.value)} className="rounded-lg border px-2 py-2 text-sm sm:col-span-2"><option value="">Select course</option>{academicCourses.map((course)=><option key={course.course_id} value={course.course_id}>{course.course_code} · Y{course.recommended_year}/S{course.recommended_semester}</option>)}</select><select required value={resultTermId} onChange={(event)=>setResultTermId(event.target.value)} className="rounded-lg border px-2 py-2 text-sm"><option value="">Select term</option>{academicTerms.map((term)=><option key={term.term_id} value={term.term_id}>{term.year_label} · {term.term_name}</option>)}</select><select value={resultStatus} onChange={(event)=>setResultStatus(event.target.value)} className="rounded-lg border px-2 py-2 text-sm"><option value="passed">Passed</option><option value="failed">Failed</option><option value="incomplete">Incomplete</option></select><button disabled={savingResult} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-4">{savingResult ? "Saving…" : "Save past result"}</button></form><div className="mt-3 max-h-36 divide-y overflow-y-auto rounded-lg border">{courseResults.map((result,index)=><div key={`${result.course_code}-${result.year_label}-${index}`} className="flex justify-between gap-3 px-3 py-2 text-xs"><span>{result.course_code} · {result.year_label} {result.term_name}</span><span className={`font-semibold ${result.result_status==='passed'?'text-emerald-700':result.result_status==='failed'?'text-rose-700':'text-amber-700'}`}>{statusName(result.result_status)}</span></div>)}{courseResults.length===0&&<p className="p-3 text-xs text-slate-500">No past results have been entered.</p>}</div></div><Link href="/registrar/enrollments" className="mt-5 inline-block text-sm font-medium text-blue-600">View enrollment records →</Link></section></div>}
      {showForm && <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/30 p-4" role="presentation" onClick={()=>setShowForm(false)}><section role="dialog" aria-modal="true" aria-labelledby="add-student-title" onClick={(event)=>event.stopPropagation()} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between"><div><h2 id="add-student-title" className="text-lg font-semibold">Add Student Record</h2><p className="mt-1 text-sm text-slate-500">The student login account must already exist.</p></div><button aria-label="Close add student record form" onClick={()=>setShowForm(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18}/></button></div>
        <form onSubmit={reviewStudent} className="mt-5 max-h-[75vh] space-y-4 overflow-y-auto pr-1"><div className="flex gap-2"><label className="block flex-1 text-sm font-medium">Student account email<input required type="email" value={email} onChange={(event)=>{setEmail(event.target.value);setStudentAccount(null);setLookupError("");}} onBlur={()=>{if (email.trim()) void lookupAccount();}} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal"/></label><button type="button" disabled={lookingUp} onClick={()=>void lookupAccount()} className="mt-6 rounded-lg border px-3 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50">{lookingUp ? "Checking…" : "Find account"}</button></div>
          {studentAccount && <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={17}/><span><strong>{studentAccount.full_name}</strong> · {studentAccount.email}</span></div>}{lookupError && <p role="alert" className="text-sm text-rose-700">{lookupError}</p>}
          <fieldset disabled={!studentAccount} className="space-y-4 disabled:opacity-50"><label className="block text-sm font-medium">Program<select required value={programId} onChange={(event)=>setProgramId(event.target.value)} className="mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 font-normal"><option value="">Select a program</option>{programs.map((program)=><option key={program.program_id} value={program.program_id}>{program.program_name}</option>)}</select></label><label className="block text-sm font-medium">Year level<select required value={year} onChange={(event)=>setYear(event.target.value)} className="mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 font-normal"><option value="">Select a year level</option>{[1,2,3,4].map((item)=><option key={item} value={item}>Year {item}</option>)}</select></label><label className="flex items-start gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" checked={isIrregular} onChange={(event)=>setIsIrregular(event.target.checked)} className="mt-1"/><span><strong>Irregular student</strong><span className="mt-0.5 block text-xs text-slate-500">Allows eligible courses beyond the normal year sequence after prerequisites are checked.</span></span></label>
            <div className="space-y-2 rounded-xl border bg-slate-50 p-3"><p className="text-xs leading-5 text-slate-600">The camera is checked for liveness on this device. Face images are sent to and stored by the local CompreFace service for attendance recognition.</p><FaceEnrollmentCapture onCapture={setFaceCapture}/><label className="flex items-start gap-2 text-xs leading-5"><input required type="checkbox" checked={faceConsent} onChange={(event)=>setFaceConsent(event.target.checked)} className="mt-1"/>I confirm the student was informed and agreed to sending and storing their face images in EduTrack’s local CompreFace service.</label></div></fieldset>
          <button disabled={saving || lookingUp || !formReady} type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"><UserPlus size={16}/>{saving ? "Adding…" : "Add Student Record"}</button></form></section></div>}
    </div></main></div>;
}
