"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Save } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { apiRequest } from "@/lib/api";

type GradeKey = "Quiz" | "Project" | "Exam";
type GradeValue = number | "";
type FacultyClass = {
  offering_id: number | string;
  course_code: string;
  course_title: string;
  section_code: string;
};
type GradeRow = {
  enrollment_id: number | string;
  student_number: string;
  student_name: string;
  assessment_name: GradeKey | null;
  max_score: number | string | null;
  score: number | string | null;
};
type StudentGrade = {
  enrollmentId: number;
  id: string;
  name: string;
  Quiz: GradeValue;
  Project: GradeValue;
  Exam: GradeValue;
};

function mapGrades(rows: GradeRow[]): StudentGrade[] {
  const students = new Map<number, StudentGrade>();
  for (const row of rows) {
    const enrollmentId = Number(row.enrollment_id);
    let student = students.get(enrollmentId);
    if (!student) {
      student = {
        enrollmentId,
        id: row.student_number,
        name: row.student_name,
        Quiz: "",
        Project: "",
        Exam: "",
      };
      students.set(enrollmentId, student);
    }
    if (row.assessment_name && row.score !== null) student[row.assessment_name] = Number(row.score);
  }
  return Array.from(students.values());
}

export default function Page() {
  const [classes, setClasses] = useState<FacultyClass[]>([]);
  const [offeringId, setOfferingId] = useState("");
  const [students, setStudents] = useState<StudentGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [confirmSave, setConfirmSave] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest<{ classes: FacultyClass[] }>("faculty_classes")
      .then(({ classes: results }) => {
        if (!active) return;
        setClasses(results);
        const requestedCourse = new URLSearchParams(window.location.search).get("course");
        const selected = results.find((item) => item.course_code === requestedCourse) ?? results[0];
        setOfferingId(selected ? String(selected.offering_id) : "");
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Unable to load your classes.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!offeringId) {
      setStudents([]);
      return;
    }
    let active = true;
    setLoading(true);
    setError("");
    setSaved(false);
    apiRequest<{ grades: GradeRow[] }>("faculty_grades", {}, { offering_id: offeringId })
      .then(({ grades }) => {
        if (active) setStudents(mapGrades(grades));
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load grades.");
          setStudents([]);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [offeringId]);

  const selectedClass = classes.find((item) => String(item.offering_id) === offeringId);
  const pendingCount = useMemo(
    () => students.reduce((count, student) => count + (student.Quiz === "" || student.Project === "" || student.Exam === "" ? 1 : 0), 0),
    [students],
  );

  function updateGrade(enrollmentId: number, key: GradeKey, value: GradeValue) {
    setStudents((rows) => rows.map((student) => student.enrollmentId === enrollmentId ? { ...student, [key]: value } : student));
    setSaved(false);
  }

  async function saveGrades() {
    if (!offeringId) return;
    setSaving(true);
    setSaveError("");
    try {
      const result = await apiRequest<{ message: string }>("faculty_grades", {
        method: "PUT",
        body: JSON.stringify({
          offering_id: Number(offeringId),
          grades: students.map((student) => ({
            enrollment_id: student.enrollmentId,
            Quiz: student.Quiz === "" ? null : student.Quiz,
            Project: student.Project === "" ? null : student.Project,
            Exam: student.Exam === "" ? null : student.Exam,
          })),
        }),
      });
      setSaved(true);
      setConfirmSave(false);
      if (result.message) setError("");
    } catch (requestError) {
      setSaveError(requestError instanceof Error ? requestError.message : "Unable to save grades.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="faculty"/>{confirmSave && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><section role="alertdialog" aria-modal="true" aria-labelledby="grade-confirm-title" aria-describedby="grade-confirm-description" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 id="grade-confirm-title" className="text-lg font-semibold text-slate-900">Verify grades before saving</h2><p id="grade-confirm-description" className="mt-2 text-sm leading-6 text-slate-600">Save the current Quiz, Project, and Exam scores for {students.length} students in {selectedClass?.course_code ?? "this class"} to the database?</p>{saveError && <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3.5 py-3 text-sm text-rose-700">{saveError}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" disabled={saving} onClick={() => { setConfirmSave(false); setSaveError(""); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button><button type="button" disabled={saving} onClick={saveGrades} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-50">{saving ? "Saving…" : "Save grades"}</button></div></section></div>}<main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-6xl">
    <div className="mb-7"><p className="text-sm font-medium text-blue-600">2026–2027 · 1st semester</p><h1 className="mt-1 text-2xl font-bold">Grading</h1><p className="mt-1 text-sm text-slate-500">Review and update assessment scores for your students.</p></div>
    {error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
    <div className="mb-5 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Students in class</p><p className="mt-1 text-2xl font-bold">{students.length}</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Pending grade entries</p><p className="mt-1 text-2xl font-bold">{pendingCount}</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Selected class</p><p className="mt-1 text-2xl font-bold">{selectedClass?.course_code ?? "—"}</p></div></div>
    <section className="overflow-hidden rounded-2xl border bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><div><h2 className="font-semibold">Gradebook</h2><p className="mt-1 text-sm text-slate-500">Enter scores between 0 and 100. Grades are stored in the database.</p></div><label className="text-sm font-medium text-slate-700">Class <select aria-label="Class" value={offeringId} onChange={(event) => setOfferingId(event.target.value)} className="ml-2 rounded-lg border bg-white px-3 py-2">{classes.map((item) => <option key={item.offering_id} value={item.offering_id}>{item.course_code} · {item.section_code}</option>)}</select></label></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-medium">Student</th><th className="px-5 py-3 font-medium">Quiz / 100</th><th className="px-5 py-3 font-medium">Project / 100</th><th className="px-5 py-3 font-medium">Exam / 100</th><th className="px-5 py-3 font-medium">Average</th></tr></thead><tbody>{students.map((student) => { const scores = [student.Quiz, student.Project, student.Exam]; const complete = scores.every((score) => typeof score === "number"); const average = complete ? Math.round(scores.reduce<number>((sum, score) => sum + (typeof score === "number" ? score : 0), 0) / scores.length) : null; return <tr key={student.enrollmentId} className="border-t"><td className="px-5 py-3"><p className="font-medium">{student.name}</p><p className="text-xs text-slate-500">{student.id}</p></td>{(["Quiz", "Project", "Exam"] as const).map((key) => <td key={key} className="px-5 py-3"><input aria-label={`${key.toLowerCase()} grade for ${student.name}`} type="number" min="0" max="100" value={student[key]} onChange={(event) => { const rawValue = event.target.value; const value = rawValue === "" ? "" : Math.min(100, Math.max(0, Number(rawValue))); updateGrade(student.enrollmentId, key, value); }} className="w-20 rounded-lg border px-2.5 py-2 outline-none focus:border-blue-500"/></td>)}<td className="px-5 py-3">{average === null ? <span className="text-slate-400">—</span> : <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${average >= 75 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{average}%</span>}</td></tr>; })}{!loading && students.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">{classes.length ? `No approved students are enrolled in ${selectedClass?.course_code ?? "this class"}.` : "No classes are currently assigned to your account."}</td></tr>}{loading && <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">Loading grade records…</td></tr>}</tbody></table></div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t p-5">{saved ? <p role="status" className="inline-flex items-center gap-2 text-sm text-emerald-700"><Check size={16}/>Grades saved to the database for {selectedClass?.course_code}.</p> : <p className="text-xs text-slate-500">Changes are not saved until you select Save grades.</p>}<button onClick={() => { setSaveError(""); setConfirmSave(true); }} disabled={saving || loading || students.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"><Save size={16}/>{saving ? "Saving…" : "Save grades"}</button></div>
    </section>
  </div></main></div>;
}
