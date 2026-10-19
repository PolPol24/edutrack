"use client";

import { useState } from "react";
import { Check, Save } from "lucide-react";
import Sidebar from "@/components/Sidebar";

const initialStudents = [
  { id: "2025-00118", name: "Alyssa Cruz", course: "CS 101", quiz: 88, project: 94, exam: 91 },
  { id: "2025-00123", name: "Miguel Reyes", course: "CS 101", quiz: 76, project: 84, exam: 82 },
  { id: "2025-00131", name: "Sofia Garcia", course: "CS 101", quiz: 93, project: 96, exam: 90 },
  { id: "2025-00144", name: "Noah Lim", course: "CS 101", quiz: 81, project: 78, exam: 85 },
  { id: "2024-00067", name: "Isabella Flores", course: "CS 205", quiz: 91, project: 88, exam: 94 },
  { id: "2024-00072", name: "Ethan Dela Cruz", course: "CS 205", quiz: 79, project: 86, exam: 80 },
  { id: "2024-00081", name: "Mia Torres", course: "CS 205", quiz: 87, project: 92, exam: 89 },
];

type GradeKey = "quiz" | "project" | "exam";

export default function Page() {
  const [course, setCourse] = useState("CS 101");
  const [students, setStudents] = useState(initialStudents);
  const [saved, setSaved] = useState(false);
  const visible = students.filter((student) => student.course === course);
  function updateGrade(id: string, key: GradeKey, value: number) {
    setStudents((rows) => rows.map((student) => student.id === id ? { ...student, [key]: value } : student));
    setSaved(false);
  }
  function saveGrades() { setSaved(true); }

  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="faculty"/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-6xl">
    <div className="mb-7"><p className="text-sm font-medium text-blue-600">Fall 2025–2026 · 1st semester</p><h1 className="mt-1 text-2xl font-bold">Grading</h1><p className="mt-1 text-sm text-slate-500">Review and update assessment scores for your students.</p></div>
    <div className="mb-5 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Students in class</p><p className="mt-1 text-2xl font-bold">{visible.length}</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Pending grade entries</p><p className="mt-1 text-2xl font-bold">12</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Selected class</p><p className="mt-1 text-2xl font-bold">{course}</p></div></div>
    <section className="overflow-hidden rounded-2xl border bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><div><h2 className="font-semibold">Gradebook</h2><p className="mt-1 text-sm text-slate-500">Enter scores from 0 to 100. Changes are sample-only.</p></div><label className="text-sm font-medium text-slate-700">Class <select value={course} onChange={(event) => { setCourse(event.target.value); setSaved(false); }} className="ml-2 rounded-lg border bg-white px-3 py-2"><option>CS 101</option><option>CS 205</option></select></label></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-medium">Student</th><th className="px-5 py-3 font-medium">Quiz / 100</th><th className="px-5 py-3 font-medium">Project / 100</th><th className="px-5 py-3 font-medium">Exam / 100</th><th className="px-5 py-3 font-medium">Average</th></tr></thead><tbody>{visible.map((student) => { const average = Math.round((student.quiz + student.project + student.exam) / 3); return <tr key={student.id} className="border-t"><td className="px-5 py-3"><p className="font-medium">{student.name}</p><p className="text-xs text-slate-500">{student.id}</p></td>{(["quiz", "project", "exam"] as const).map((key) => <td key={key} className="px-5 py-3"><input aria-label={`${key} grade for ${student.name}`} type="number" min="0" max="100" value={student[key]} onChange={(event) => updateGrade(student.id, key, Math.min(100, Math.max(0, Number(event.target.value))))} className="w-20 rounded-lg border px-2.5 py-2 outline-none focus:border-blue-500"/></td>)}<td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${average >= 75 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{average}%</span></td></tr>; })}</tbody></table></div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t p-5">{saved ? <p role="status" className="inline-flex items-center gap-2 text-sm text-emerald-700"><Check size={16}/>Grades saved for {course}.</p> : <p className="text-xs text-slate-500">Changes are kept in this demo page while you stay here.</p>}<button onClick={saveGrades} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"><Save size={16}/>Save grades</button></div>
    </section>
  </div></main></div>;
}
