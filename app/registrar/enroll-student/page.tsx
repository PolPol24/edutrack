"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, CheckCircle2, ChevronDown, ClipboardCheck, GraduationCap, LoaderCircle } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { apiRequest } from "@/lib/api";

type Student = { user_id: number; student_number: string; student_name: string; program_id: string; program_code: string; program_name: string; year_level: number };
type Term = { term_id: number; term_name: string; term_status: "active" | "upcoming"; year_label: string };
type CurriculumCourse = { course_id: string; course_code: string; course_title: string; units: number | string; section_letter: "A" | "B" | "C"; already_enrolled: number | string };
type EnrollmentData = { students: Student[]; terms: Term[]; curriculum: CurriculumCourse[] };
type DropdownOption = { value: string; label: string };

function PlaceholderDropdown({ id, label, placeholder, value, options, disabled, onChange }: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  options: DropdownOption[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    rootRef.current?.querySelector<HTMLElement>('[role="option"]')?.focus();
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [open]);

  function handleOptionKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const optionElements = rootRef.current?.querySelectorAll<HTMLElement>('[role="option"]');
    const currentIndex = Array.from(optionElements ?? []).indexOf(event.currentTarget);
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = Math.max(0, Math.min((optionElements?.length ?? 1) - 1, currentIndex + direction));
      optionElements?.[nextIndex]?.focus();
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const option = options[currentIndex];
      if (option) {
        onChange(option.value);
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
  }

  return <div ref={rootRef} className="relative mt-1.5">
    <button ref={triggerRef} id={id} type="button" aria-label={label} aria-haspopup="listbox" aria-expanded={open} disabled={disabled} onClick={() => setOpen((current) => !current)} onKeyDown={(event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); }
      else if (event.key === "Escape") setOpen(false);
    }} className="flex w-full items-center justify-between rounded-lg border bg-white px-3 py-2.5 text-left text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50">
      <span className={selectedOption ? "text-slate-900" : "text-slate-400"}>{selectedOption?.label ?? placeholder}</span>
      <ChevronDown size={16} className="shrink-0 text-slate-600" aria-hidden="true"/>
    </button>
    {open && <div role="listbox" aria-label={label} className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-white p-1 shadow-lg">{options.map((option) => <div key={option.value} role="option" aria-selected={option.value === value} tabIndex={0} onClick={() => { onChange(option.value); setOpen(false); triggerRef.current?.focus(); }} onKeyDown={handleOptionKeyDown} className={`cursor-pointer rounded-md px-3 py-2 text-sm outline-none hover:bg-blue-50 focus:bg-blue-50 ${option.value === value ? "bg-blue-50 font-medium text-blue-800" : "text-slate-700"}`}>{option.label}</div>)}</div>}
  </div>;
}

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
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load enrollment options."))
      .finally(() => setLoadingOptions(false));
  }, []);

  useEffect(() => {
    if (!studentId || !termId) {
      setCurriculum([]);
      setLoadingCurriculum(false);
      return;
    }
    let current = true;
    setLoadingCurriculum(true);
    setError("");
    apiRequest<EnrollmentData>("registrar_enrollment", {}, { student_user_id: studentId, term_id: termId })
      .then((result) => { if (current) setCurriculum(result.curriculum); })
      .catch((cause: unknown) => { if (current) setError(cause instanceof Error ? cause.message : "Unable to load the required subjects."); })
      .finally(() => { if (current) setLoadingCurriculum(false); });
    return () => { current = false; };
  }, [studentId, termId]);

  const student = students.find((item) => String(item.user_id) === studentId);
  const term = terms.find((item) => String(item.term_id) === termId);
  const totalUnits = useMemo(() => curriculum.reduce((sum, course) => sum + Number(course.units), 0), [curriculum]);
  const alreadyAssigned = curriculum.filter((course) => Number(course.already_enrolled) === 1).length;
  const allAlreadyEnrolled = curriculum.length > 0 && alreadyAssigned === curriculum.length;
  const canEnroll = Boolean(student && term && curriculum.length > 0 && totalUnits >= 21 && !loadingCurriculum && !saving && !allAlreadyEnrolled);

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
      try {
        const refreshed = await apiRequest<EnrollmentData>("registrar_enrollment", {}, { student_user_id: studentId, term_id: termId });
        setCurriculum(refreshed.curriculum);
      } catch {
        setError("Enrollment succeeded, but the subject list could not refresh. Reload this page to confirm the latest status.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to enroll this student.");
      setConfirm(false);
    } finally {
      setSaving(false);
    }
  }

  return <div className="flex min-h-screen bg-[#f8fafc]">
    <Sidebar role="registrar" />
    {confirm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><section role="alertdialog" aria-modal="true" aria-labelledby="enroll-confirm-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 id="enroll-confirm-title" className="text-lg font-semibold">Confirm semester enrollment</h2><p className="mt-2 text-sm leading-6 text-slate-600">Enroll {student?.student_name} in all {curriculum.length} required subjects for {term?.term_name}, {term?.year_label}? The subjects will use Section {curriculum[0]?.section_letter} and add {totalUnits} units for {student?.program_code} Year {student?.year_level}.</p>{error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3.5 py-3 text-sm text-rose-700">{error}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" disabled={saving} onClick={() => setConfirm(false)} className="rounded-xl border px-4 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-50">Cancel</button><button type="button" disabled={saving} onClick={enroll} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Enrolling..." : "Confirm enrollment"}</button></div></section></div>}
    <main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-5xl">
      <Link href="/registrar/enrollments" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"><ArrowLeft size={16}/>Back to enrollments</Link>
      <div className="mb-7"><p className="text-sm font-medium text-amber-700">Registrar workflow</p><h1 className="mt-1 text-2xl font-bold">Enroll a student</h1><p className="mt-1 max-w-2xl text-sm text-slate-500">Choose a student and an active or upcoming semester. Review the student&apos;s section and required subjects, then enroll them in all subjects at once.</p></div>
      {message && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
      {error && !confirm && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}

      <section className="rounded-2xl border bg-white p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="text-sm font-medium text-slate-700"><label htmlFor="student-select">Student</label><PlaceholderDropdown id="student-select" label="Student" placeholder={loadingOptions ? "Loading students..." : students.length ? "Select a student" : "No active students available"} value={studentId} options={students.map((item) => ({ value: String(item.user_id), label: `${item.student_number} · ${item.student_name}` }))} disabled={loadingOptions || students.length === 0} onChange={(value) => { setStudentId(value); setMessage(""); setError(""); }}/><p className="mt-1 text-xs font-normal text-slate-500">Only active student accounts are listed.</p></div>
          <div className="text-sm font-medium text-slate-700"><label htmlFor="semester-select">Semester</label><PlaceholderDropdown id="semester-select" label="Semester" placeholder={loadingOptions ? "Loading semesters..." : terms.length ? "Select a semester" : "No active or upcoming semesters"} value={termId} options={terms.map((item) => ({ value: String(item.term_id), label: `${item.year_label} · ${item.term_name} · ${item.term_status === "upcoming" ? "Upcoming" : "Active"}` }))} disabled={loadingOptions || terms.length === 0} onChange={(value) => { setTermId(value); setMessage(""); setError(""); }}/><p className="mt-1 text-xs font-normal text-slate-500">Choose the semester for this enrollment.</p></div>
        </div>
        {student && <div className="mt-5 flex items-start gap-3 rounded-xl bg-blue-50 p-4"><GraduationCap size={19} className="mt-0.5 shrink-0 text-blue-700"/><div><p className="font-semibold">{student.program_code} - {student.program_name}</p><p className="mt-1 text-sm text-slate-600">Student #{student.student_number} - Year {student.year_level}{curriculum[0]?.section_letter ? ` - Section ${curriculum[0].section_letter}` : ""}</p><p className="mt-1 text-xs text-slate-500">EduTrack uses this program, year, and assigned section to select the required classes.</p></div></div>}
      </section>

      <section className="mt-5 overflow-hidden rounded-2xl border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><div><h2 className="font-semibold">Required subjects</h2><p className="mt-1 text-sm text-slate-500">{term ? `${term.term_name} - ${term.year_label}` : "Choose a student and semester to preview required subjects."}</p></div><div className="rounded-xl bg-blue-50 px-4 py-2 text-right"><p className="text-xs font-medium text-blue-700">Total units</p><p className="text-xl font-bold text-blue-900">{totalUnits}<span className="ml-1 text-xs font-medium">/ 21 minimum</span></p></div></div>
        {loadingCurriculum ? <p className="p-8 text-center text-sm text-slate-500"><LoaderCircle size={17} className="mr-2 inline animate-spin"/>Loading required subjects...</p>
          : !studentId || !termId ? <p className="p-8 text-center text-sm text-slate-500">Choose a student and semester above. Their required subjects and section will appear here before you enroll them.</p>
          : curriculum.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No required subjects are configured for this student&apos;s program, year, and semester. Ask the administrator to complete the curriculum.</p>
          : <><div className="border-b bg-slate-50 px-5 py-3 text-xs text-slate-600">These are all the required subjects for this student. Enrollment applies to every subject listed and uses the student&apos;s assigned section.</div>
            <div className="divide-y">{curriculum.map((course) => <div key={course.course_id} className="flex items-center justify-between gap-4 px-5 py-3.5"><div><p className="font-medium">{course.course_code} - {course.course_title}</p><p className="mt-0.5 text-xs text-slate-500">Section {course.section_letter} - {Number(course.units)} units</p></div>{Number(course.already_enrolled) === 1 && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><CheckCircle2 size={13}/>Enrolled</span>}</div>)}</div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-slate-50 px-5 py-4"><p className="text-sm text-slate-600">{allAlreadyEnrolled ? "All required subjects already have enrollment records." : `${alreadyAssigned} of ${curriculum.length} subjects already have enrollment records.`}</p><div className="flex flex-col items-end gap-1"><button type="button" aria-haspopup="dialog" disabled={!canEnroll} onClick={() => { setError(""); setConfirm(true); }} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"><ClipboardCheck size={16}/>{allAlreadyEnrolled ? "Already enrolled" : "Review enrollment"}</button>{totalUnits < 21 && <span className="text-xs text-amber-700">At least 21 curriculum units are needed to enroll.</span>}</div></div>
          </>}
      </section>
    </div></main>
  </div>;
}
