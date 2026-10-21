"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, CheckCheck, Save } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { apiRequest } from "@/lib/api";

type Status = "present" | "late" | "absent" | "unmarked";
type FacultyClass = {
  offering_id: number | string;
  course_code: string;
  course_title: string;
  section_code: string;
};
type AttendanceStudent = {
  enrollment_id: number | string;
  student_number: string;
  student_name: string;
  attendance_status: Status;
};
type AttendanceEntry = { enrollmentId: number; id: string; name: string; status: Status };
type ConfirmationAction = "mark-all-present" | "save-attendance" | null;

const statusLabels: Record<Status, string> = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  unmarked: "Unmarked",
};
const statusStyles: Record<Status, string> = {
  present: "bg-emerald-50 text-emerald-700",
  late: "bg-amber-50 text-amber-700",
  absent: "bg-rose-50 text-rose-700",
  unmarked: "bg-slate-100 text-slate-600",
};

function localDateValue() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export default function Page() {
  const [classes, setClasses] = useState<FacultyClass[]>([]);
  const [offeringId, setOfferingId] = useState("");
  const [sessionDate, setSessionDate] = useState(localDateValue);
  const [students, setStudents] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationAction>(null);
  const [confirmationError, setConfirmationError] = useState("");

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
    if (!offeringId || !sessionDate) {
      setStudents([]);
      return;
    }
    let active = true;
    setLoading(true);
    setError("");
    setSaved(false);
    apiRequest<{ students: AttendanceStudent[] }>(
      "faculty_attendance",
      {},
      { offering_id: offeringId, session_date: sessionDate },
    )
      .then(({ students: rows }) => {
        if (active) {
          setStudents(rows.map((student) => ({
            enrollmentId: Number(student.enrollment_id),
            id: student.student_number,
            name: student.student_name,
            status: student.attendance_status,
          })));
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load attendance.");
          setStudents([]);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [offeringId, sessionDate]);

  const selectedClass = classes.find((item) => String(item.offering_id) === offeringId);
  const markedCount = useMemo(() => students.filter((student) => student.status !== "unmarked").length, [students]);
  const presentCount = useMemo(() => students.filter((student) => student.status === "present").length, [students]);

  function markAllPresent() {
    setStudents((current) => current.map((student) => ({ ...student, status: "present" })));
    setSaved(false);
    setConfirmation(null);
  }

  function updateStatus(enrollmentId: number, status: Status) {
    setStudents((current) => current.map((student) => student.enrollmentId === enrollmentId ? { ...student, status } : student));
    setSaved(false);
  }

  async function saveAttendance() {
    if (!offeringId || !sessionDate) return;
    setSaving(true);
    setConfirmationError("");
    try {
      await apiRequest("faculty_attendance", {
        method: "PUT",
        body: JSON.stringify({
          offering_id: Number(offeringId),
          session_date: sessionDate,
          students: students.map(({ enrollmentId, status }) => ({ enrollment_id: enrollmentId, status })),
        }),
      });
      setSaved(true);
      setConfirmation(null);
    } catch (requestError) {
      setConfirmationError(requestError instanceof Error ? requestError.message : "Unable to save attendance.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar role="faculty" />
      {confirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <section role="alertdialog" aria-modal="true" aria-labelledby="attendance-confirm-title" aria-describedby="attendance-confirm-description" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="attendance-confirm-title" className="text-lg font-semibold text-slate-900">
              {confirmation === "mark-all-present" ? "Mark everyone present?" : "Save attendance?"}
            </h2>
            <p id="attendance-confirm-description" className="mt-2 text-sm leading-6 text-slate-600">
              {confirmation === "mark-all-present"
                ? `Set all ${students.length} students in ${selectedClass?.course_code ?? "this class"} to Present. This change will not be saved until you confirm Save attendance.`
                : `Save attendance for ${selectedClass?.course_code ?? "this class"} on ${sessionDate} for ${students.length} students to the database?`}
            </p>
            {confirmationError && <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3.5 py-3 text-sm text-rose-700">{confirmationError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={saving} onClick={() => { setConfirmation(null); setConfirmationError(""); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button type="button" disabled={saving} onClick={confirmation === "mark-all-present" ? markAllPresent : saveAttendance} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-50">
                {saving ? "Saving…" : confirmation === "mark-all-present" ? "Mark all present" : "Save attendance"}
              </button>
            </div>
          </section>
        </div>
      )}
      <main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-7">
            <p className="text-sm font-medium text-blue-600">2026–2027 · 1st semester</p>
            <h1 className="mt-1 text-2xl font-bold">Attendance</h1>
            <p className="mt-1 text-sm text-slate-500">Record attendance for your class sessions.</p>
          </div>
          {error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
          <section className="mb-5 rounded-2xl border bg-white p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-wrap gap-3">
                <label className="text-sm font-medium text-slate-700">
                  Class
                  <select
                    aria-label="Class"
                    value={offeringId}
                    onChange={(event) => setOfferingId(event.target.value)}
                    className="mt-1.5 block rounded-lg border bg-white px-3 py-2"
                  >
                    {classes.map((item) => <option key={item.offering_id} value={item.offering_id}>{item.course_code} · {item.section_code}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Session date
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(event) => setSessionDate(event.target.value)}
                    className="mt-1.5 block rounded-lg border bg-white px-3 py-2"
                  />
                </label>
              </div>
              <button
                onClick={() => { setConfirmationError(""); setConfirmation("mark-all-present"); }}
                disabled={loading || students.length === 0}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCheck size={16} />Mark all present
              </button>
            </div>
          </section>
          <div className="mb-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Students in class</p><p className="mt-1 text-2xl font-bold">{students.length}</p></div>
            <div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Marked</p><p className="mt-1 text-2xl font-bold">{markedCount} <span className="text-sm font-normal text-slate-500">/ {students.length}</span></p></div>
            <div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Present</p><p className="mt-1 text-2xl font-bold">{presentCount}</p></div>
          </div>
          <section className="overflow-hidden rounded-2xl border bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
              <div>
                <h2 className="font-semibold">Class roster · {selectedClass?.course_code ?? "—"}</h2>
                <p className="mt-1 text-sm text-slate-500">Session date · {sessionDate}</p>
              </div>
              {saved && <span role="status" className="inline-flex items-center gap-1.5 text-sm text-emerald-700"><Check size={16}/>Attendance saved to the database.</span>}
            </div>
            {students.length > 0 ? (
              <div className="divide-y">
                {students.map((student) => (
                  <div key={student.enrollmentId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div><p className="font-medium">{student.name}</p><p className="mt-0.5 text-xs text-slate-500">{student.id}</p></div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[student.status]}`}>{statusLabels[student.status]}</span>
                      <select
                        aria-label={`Attendance status for ${student.name}`}
                        value={student.status}
                        onChange={(event) => updateStatus(student.enrollmentId, event.target.value as Status)}
                        className="rounded-lg border bg-white px-2.5 py-2 text-sm"
                      >
                        <option value="unmarked">Unmarked</option><option value="present">Present</option><option value="late">Late</option><option value="absent">Absent</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-8 text-center text-sm text-slate-500">
                {loading ? "Loading attendance records…" : classes.length ? `No approved students are enrolled in ${selectedClass?.course_code ?? "this class"}.` : "No classes are currently assigned to your account."}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t p-5">
              <p className="text-xs text-slate-500">Attendance records are saved for the selected class and date.</p>
              <button
                onClick={() => { setConfirmationError(""); setConfirmation("save-attendance"); }}
                disabled={saving || loading || students.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={16}/>{saving ? "Saving…" : "Save attendance"}
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
