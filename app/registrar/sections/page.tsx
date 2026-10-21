"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Layers3, LoaderCircle, Users } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { apiRequest } from "@/lib/api";

type Program = { program_id: string; program_code: string; program_name: string };
type Term = { term_id: number; term_name: string; term_status: "active" | "upcoming"; year_label: string };
type Faculty = { user_id: number; full_name: string };
type RosterStudent = { student_number: string; first_name: string; last_name: string; name_suffix: string | null; student_email: string; year_level: number; section_code: "A" | "B" | "C" };
type SectionOffering = { course_id: string; course_code: string; course_title: string; units: number | string; recommended_year: number; section_letter: "A" | "B" | "C"; section_code: string; offering_id: number | null; course_number: string | null; offering_status: string | null; faculty_user_id: number | null; faculty_name: string | null; enrolled_count: number | string };
type SectionsData = { programs: Program[]; terms: Term[]; faculty: Faculty[]; roster: RosterStudent[]; offerings: SectionOffering[] };

const letters = ["A", "B", "C"] as const;

export default function Page() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [offerings, setOfferings] = useState<SectionOffering[]>([]);
  const [programId, setProgramId] = useState("");
  const [termId, setTermId] = useState("");
  const [loading, setLoading] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [savingOffering, setSavingOffering] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async (selectedProgram = programId, selectedTerm = termId) => {
    const data = await apiRequest<SectionsData>("registrar_sections", {}, selectedProgram && selectedTerm ? { program_id: selectedProgram, term_id: selectedTerm } : {});
    setPrograms(data.programs);
    setTerms(data.terms);
    setFaculty(data.faculty);
    setRoster(data.roster);
    setOfferings(data.offerings);
    if (!selectedProgram && data.programs.length) setProgramId(data.programs.find((item) => item.program_code === "BSIT")?.program_id ?? data.programs[0].program_id);
    if (!selectedTerm && data.terms.length) setTermId(String(data.terms.find((item) => item.term_status === "active")?.term_id ?? data.terms[0].term_id));
  }, [programId, termId]);

  useEffect(() => {
    load().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load section management."))
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (!programId || !termId) return;
    let active = true;
    setError("");
    apiRequest<SectionsData>("registrar_sections", {}, { program_id: programId, term_id: termId })
      .then((data) => { if (active) { setRoster(data.roster); setOfferings(data.offerings); setFaculty(data.faculty); } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Unable to load program sections."); });
    return () => { active = false; };
  }, [programId, termId]);

  const program = programs.find((item) => item.program_id === programId);
  const term = terms.find((item) => String(item.term_id) === termId);
  const rosterBySection = useMemo(() => Object.fromEntries(letters.map((letter) => [letter, roster.filter((student) => student.section_code === letter)])) as Record<typeof letters[number], RosterStudent[]>, [roster]);
  const curriculum = useMemo(() => {
    const unique = new Map<string, SectionOffering>();
    for (const item of offerings) unique.set(item.course_id, item);
    return [...unique.values()];
  }, [offerings]);
  const ready = offerings.length > 0 && offerings.every((item) => Boolean(item.offering_id && item.course_number));

  async function prepare() {
    setPreparing(true); setError(""); setMessage("");
    try {
      const result = await apiRequest<{ message: string }>("registrar_sections", { method: "POST", body: JSON.stringify({ task: "prepare", program_id: programId, term_id: Number(termId) }) });
      setMessage(result.message);
      await load(programId, termId);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to create the program sections."); }
    finally { setPreparing(false); }
  }

  async function assignFaculty(offering: SectionOffering, value: string) {
    if (!offering.offering_id) return;
    setSavingOffering(offering.offering_id); setError(""); setMessage("");
    try {
      const result = await apiRequest<{ message: string }>("registrar_sections", { method: "PATCH", body: JSON.stringify({ offering_id: offering.offering_id, faculty_user_id: value }) });
      setMessage(result.message);
      await load(programId, termId);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to assign this instructor."); }
    finally { setSavingOffering(null); }
  }

  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="registrar"/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-6xl">
    <div className="mb-7"><p className="text-sm font-medium text-amber-700">Registrar academic setup</p><h1 className="mt-1 text-2xl font-bold">Program sections and course assignments</h1><p className="mt-1 max-w-3xl text-sm text-slate-500">Divide each program roster into sections A, B, and C. Every subject section receives a unique course number, which the registrar uses to assign its faculty member.</p></div>
    {message && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}{error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
      <section className="rounded-2xl border bg-white p-5 sm:p-6"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Program<select value={programId} onChange={(event)=>{setProgramId(event.target.value);setMessage("");}} disabled={loading} className="mt-1.5 block w-full rounded-lg border bg-white px-3 py-2.5">{programs.map((item)=><option value={item.program_id} key={item.program_id}>{item.program_code} · {item.program_name}</option>)}</select></label><label className="text-sm font-medium text-slate-700">Semester<select value={termId} onChange={(event)=>{setTermId(event.target.value);setMessage("");}} disabled={loading} className="mt-1.5 block w-full rounded-lg border bg-white px-3 py-2.5">{terms.map((item)=><option value={item.term_id} key={item.term_id}>{item.year_label} · {item.term_name}{item.term_status === "upcoming" ? " · Upcoming" : " · Active"}</option>)}</select></label></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4"><div><p className="font-semibold">{program?.program_code ?? "Program"} · {term?.term_name ?? "Semester"}</p><p className="mt-1 text-sm text-slate-500">{roster.length} campus students divided across three sections · {curriculum.length} curriculum subjects</p></div><button type="button" onClick={prepare} disabled={!programId || !termId || preparing || loading} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">{preparing ? <LoaderCircle size={16} className="animate-spin"/> : <Layers3 size={16}/>}{ready ? "Refresh sections and course numbers" : "Form sections and assign course numbers"}</button></div></section>

    <div className="mt-5 grid gap-4 lg:grid-cols-3">{letters.map((letter)=><section key={letter} className="overflow-hidden rounded-2xl border bg-white"><div className="flex items-center justify-between border-b p-4"><div><p className="font-semibold">Section {letter}</p><p className="text-xs text-slate-500">{program?.program_code} · {rosterBySection[letter].length} students</p></div><Users size={18} className="text-slate-400"/></div><details className="group"><summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-blue-700">View assigned students</summary><div className="max-h-64 divide-y overflow-y-auto border-t">{rosterBySection[letter].map((student)=><div key={student.student_number} className="px-4 py-2.5"><p className="text-sm font-medium">{student.first_name} {student.last_name}{student.name_suffix ? ` ${student.name_suffix}` : ""}</p><p className="text-xs text-slate-500">{student.student_number} · Year {student.year_level}</p></div>)}{!rosterBySection[letter].length&&<p className="p-4 text-sm text-slate-500">No students assigned.</p>}</div></details></section>)}</div>

    <section className="mt-5 overflow-hidden rounded-2xl border bg-white"><div className="flex items-center gap-3 border-b p-5"><div className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><BookOpen size={18}/></div><div><h2 className="font-semibold">Course numbers and faculty</h2><p className="mt-1 text-sm text-slate-500">Assign faculty separately for each subject and section. Faculty will see the same course number on their class list.</p></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-medium">Subject</th><th className="px-5 py-3 font-medium">Section</th><th className="px-5 py-3 font-medium">Course number</th><th className="px-5 py-3 font-medium">Roster</th><th className="px-5 py-3 font-medium">Faculty assignment</th></tr></thead><tbody>{offerings.map((item)=><tr key={`${item.course_id}-${item.section_letter}`} className="border-t"><td className="px-5 py-3.5"><p className="font-semibold">{item.course_code} · {item.course_title}</p><p className="text-xs text-slate-500">Year {item.recommended_year} · {Number(item.units)} units</p></td><td className="px-5 py-3.5">Section {item.section_letter}</td><td className="px-5 py-3.5"><span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-700">{item.course_number || "Not generated"}</span></td><td className="px-5 py-3.5">{rosterBySection[item.section_letter].filter((student)=>Number(student.year_level) === Number(item.recommended_year)).length}</td><td className="px-5 py-3.5"><select aria-label={`Faculty for ${item.course_code}, section ${item.section_letter}`} disabled={!item.offering_id || savingOffering === item.offering_id} value={item.faculty_user_id ? String(item.faculty_user_id) : ""} onChange={(event)=>void assignFaculty(item,event.target.value)} className="w-full max-w-xs rounded-lg border bg-white px-3 py-2"><option value="">Unassigned</option>{faculty.map((member)=><option key={member.user_id} value={member.user_id}>{member.full_name}</option>)}</select>{savingOffering === item.offering_id && <span className="ml-2 text-xs text-slate-500">Saving…</span>}</td></tr>)}{!loading && offerings.length===0&&<tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">No curriculum is configured for this program and semester.</td></tr>}{loading&&<tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">Loading program sections…</td></tr>}</tbody></table></div>
      <p className="flex items-center gap-2 border-t px-5 py-3 text-xs text-slate-500"><CheckCircle2 size={14} className="text-emerald-600"/>{ready ? `${offerings.length} course sections have unique course numbers.` : "Form sections to generate course numbers and enable faculty assignments."}</p>
    </section>
  </div></main></div>;
}
