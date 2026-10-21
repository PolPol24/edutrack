"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, Plus, X } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import ActionConfirmation from "@/components/ActionConfirmation";
import { apiRequest } from "@/lib/api";

type EnrollmentStatus = "pending" | "approved" | "rejected";
type Enrollment = {
  request_code: string;
  offering_id: number | string;
  course_code: string;
  course_title: string;
  units: number | string;
  section_code: string;
  enrollment_status: EnrollmentStatus;
};
type CourseOffering = {
  offering_id: number | string;
  course_code: string;
  course_title: string;
  units: number | string;
  section_code: string;
};
type EnrollmentAction = { kind: "add"; course: CourseOffering } | { kind: "cancel"; requestCode: string; courseCode: string } | null;

export default function EnrollmentPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [catalog, setCatalog] = useState<CourseOffering[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmation, setConfirmation] = useState<EnrollmentAction>(null);
  const [confirmationError, setConfirmationError] = useState("");
  const [loading, setLoading] = useState(true);
  const enrolledCodes = new Set(enrollments.map((item) => item.course_code));
  const availableCatalog = catalog.filter((course) => !enrolledCodes.has(course.course_code));
  const totalUnits = enrollments.reduce((total, item) => total + Number(item.units), 0);

  async function refresh() {
    const [enrollmentResponse, courseResponse] = await Promise.all([
      apiRequest<{ enrollments: Enrollment[] }>("enrollments"),
      apiRequest<{ courses: CourseOffering[] }>("courses"),
    ]);
    setEnrollments(enrollmentResponse.enrollments);
    setCatalog(courseResponse.courses);
  }

  useEffect(() => {
    refresh()
      .catch((requestError: unknown) => {
        setError(requestError instanceof Error ? requestError.message : "Unable to load enrollment data.");
      })
      .finally(() => setLoading(false));
  }, []);

  async function cancel(requestCode: string) {
    setMessage("");
    setError("");
    setConfirmationError("");
    setSaving(true);
    try {
      const response = await apiRequest<{ message: string }>("enrollments", {
        method: "DELETE",
        body: JSON.stringify({ request_code: requestCode }),
      });
      setMessage(response.message);
      setConfirmation(null);
      try { await refresh(); } catch (refreshError) { setError(refreshError instanceof Error ? `Request cancelled, but the list could not refresh: ${refreshError.message}` : "Request cancelled, but the list could not refresh."); }
    } catch (requestError) {
      setConfirmationError(requestError instanceof Error ? requestError.message : "Unable to cancel this request.");
    } finally {
      setSaving(false);
    }
  }

  async function addCourse(course: CourseOffering) {
    setMessage("");
    setError("");
    setConfirmationError("");
    setSaving(true);
    try {
      const response = await apiRequest<{ message: string }>("enrollments", {
        method: "POST",
        body: JSON.stringify({ offering_id: course.offering_id }),
      });
      setMessage(response.message);
      setConfirmation(null);
      try { await refresh(); } catch (refreshError) { setError(refreshError instanceof Error ? `Request submitted, but the list could not refresh: ${refreshError.message}` : "Request submitted, but the list could not refresh."); }
    } catch (requestError) {
      setConfirmationError(requestError instanceof Error ? requestError.message : "Unable to submit this request.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar role="student" />
      <ActionConfirmation
        open={confirmation !== null}
        title={confirmation?.kind === "cancel" ? "Cancel enrollment request?" : "Request course enrollment?"}
        description={confirmation?.kind === "cancel"
          ? `Cancel your pending request for ${confirmation.courseCode}?`
          : `Submit a request to enroll in ${confirmation?.course.course_code ?? "this course"} · ${confirmation?.course.course_title ?? ""}? The request will be sent to the registrar for approval.`}
        confirmLabel={confirmation?.kind === "cancel" ? "Cancel request" : "Submit request"}
        danger={confirmation?.kind === "cancel"}
        busy={saving}
        error={confirmationError}
        onCancel={() => { setConfirmation(null); setConfirmationError(""); }}
        onConfirm={() => confirmation?.kind === "cancel" ? cancel(confirmation.requestCode) : confirmation?.kind === "add" ? addCourse(confirmation.course) : undefined}
      />
      <main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-7">
            <p className="text-sm font-medium text-blue-600">Academic year 2026–2027</p>
            <h1 className="mt-1 text-2xl font-bold">Enrollment</h1>
            <p className="mt-1 text-sm text-slate-500">Review your course requests and current registration.</p>
          </div>
          <div className="mb-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border bg-white p-4">
              <p className="text-sm text-slate-500">Semester</p>
              <p className="mt-1 font-semibold">Active term</p>
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <p className="text-sm text-slate-500">Registered courses</p>
              <p className="mt-1 text-2xl font-bold">{enrollments.length}</p>
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <p className="text-sm text-slate-500">Requested units</p>
              <p className="mt-1 text-2xl font-bold">
                {totalUnits} <span className="text-sm font-normal text-slate-500">/ 21 maximum</span>
              </p>
            </div>
          </div>
          {message && (
            <p role="status" className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              {message}
            </p>
          )}
          {error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
          <section className="overflow-hidden rounded-2xl border bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
              <div>
                <h2 className="font-semibold">My enrollment</h2>
                <p className="mt-1 text-sm text-slate-500">Pending requests need registrar approval.</p>
              </div>
              <Link href="/student/courses" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                View my courses
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Course</th>
                    <th className="px-5 py-3 font-medium">Units</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((item) => {
                    const approved = item.enrollment_status === "approved";
                    const label = approved ? "Enrolled" : item.enrollment_status === "pending" ? "Pending approval" : "Rejected";
                    return (
                      <tr key={item.request_code} className="border-t">
                        <td className="px-5 py-4">
                          <span className="font-semibold">{item.course_code}</span>
                          <span className="ml-2 text-slate-600">{item.course_title}</span>
                        </td>
                        <td className="px-5 py-4">{item.units}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                            approved ? "bg-emerald-50 text-emerald-700" :
                            item.enrollment_status === "pending" ? "bg-amber-50 text-amber-700" :
                            "bg-rose-50 text-rose-700"
                          }`}>
                            {approved ? <CheckCircle2 size={13} /> : <Clock3 size={13} />}
                            {label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          {item.enrollment_status === "pending" ? (
                            <button disabled={saving} onClick={() => { setConfirmationError(""); setConfirmation({ kind: "cancel", requestCode: item.request_code, courseCode: item.course_code }); }} className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-800 disabled:opacity-50">
                              <X size={15} />Cancel request
                            </button>
                          ) : item.enrollment_status === "rejected" ? (
                            <button disabled={saving} onClick={() => { setConfirmationError(""); setConfirmation({ kind: "add", course: { offering_id: item.offering_id, course_code: item.course_code, course_title: item.course_title, units: item.units, section_code: item.section_code } }); }} className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 disabled:opacity-50">
                              <Plus size={15} />Submit another request
                            </button>
                          ) : (
                            <span className="text-slate-400">{approved ? "Registered" : "—"}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && enrollments.length === 0 && (
                    <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">No courses in your enrollment yet.</td></tr>
                  )}
                  {loading && (
                    <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">Loading enrollment records…</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <section className="mt-6 rounded-2xl border bg-white p-5">
            <h2 className="font-semibold">Course catalog</h2>
            <p className="mt-1 text-sm text-slate-500">Available courses you can request to add.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {availableCatalog.map((course) => (
                <div key={course.offering_id} className="flex items-center justify-between gap-3 rounded-xl border p-4">
                  <div>
                    <p className="font-semibold">{course.course_code} · {course.course_title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {course.units} units · Section {course.section_code} · Request requires registrar approval
                    </p>
                  </div>
                  <button disabled={saving} onClick={() => { setConfirmationError(""); setConfirmation({ kind: "add", course }); }} className="inline-flex shrink-0 items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50">
                    <Plus size={15} />Add
                  </button>
                </div>
              ))}
              {!loading && catalog.length === 0 && (
                <p className="rounded-xl border border-dashed p-5 text-sm text-slate-500">
                  There are no open course offerings for the active term.
                </p>
              )}
              {!loading && catalog.length > 0 && availableCatalog.length === 0 && (
                <p className="rounded-xl border border-dashed p-5 text-sm text-slate-500">
                  You have already requested or enrolled in all available courses for your program and year.
                </p>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
