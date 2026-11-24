"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Download, FileBarChart, PencilLine, Printer, RotateCcw } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import AttendanceAnalytics from "@/components/AttendanceAnalytics";
import { apiRequest } from "@/lib/api";

type RecordItem = {
  attendance_id: number;
  session_date: string;
  course_code: string;
  course_title: string;
  section_code: string;
  room: string;
  student_number: string;
  full_name: string;
  attendance_status: "present" | "late" | "absent" | "excused";
  verification_method: "face" | "staff_verified" | "system";
  checked_in_at: string | null;
  year_label: string;
};

type SummaryItem = {
  total_enrolled: number | string;
  present_count: number | string;
  late_count: number | string;
  absent_count: number | string;
  excused_count: number | string;
};
type SubjectSectionOption = { course_code: string; section_code: string };

type ReportData = {
  records: RecordItem[];
  summaries: SummaryItem[];
  course_codes: string[];
  year_labels: string[];
  section_codes: string[];
  offerings: SubjectSectionOption[];
};
type FilterOptions = Pick<ReportData, "course_codes" | "year_labels" | "section_codes" | "offerings">;

type ReportFilters = {
  date_from: string;
  date_to: string;
  course_code: string;
  section_code: string;
  year_label: string;
};

type EditRecord = { attendance_id: number; attendance_status: string; reason: string } | null;

const emptyFilters: ReportFilters = {
  date_from: "",
  date_to: "",
  course_code: "",
  section_code: "",
  year_label: "",
};
const emptyReport: ReportData = { records: [], summaries: [], course_codes: [], year_labels: [], section_codes: [], offerings: [] };
const emptyFilterOptions: FilterOptions = { course_codes: [], year_labels: [], section_codes: [], offerings: [] };
const filterOptionsFrom = (report: ReportData): FilterOptions => ({
  course_codes: report.course_codes,
  year_labels: report.year_labels,
  section_codes: report.section_codes,
  offerings: report.offerings ?? [],
});

const statuses = ["present", "late", "absent", "excused"] as const;
const inputClass = "mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100";

function csvValue(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function sameFilters(left: ReportFilters, right: ReportFilters) {
  return Object.keys(emptyFilters).every((key) => left[key as keyof ReportFilters] === right[key as keyof ReportFilters]);
}

function statusClass(status: RecordItem["attendance_status"]) {
  switch (status) {
    case "present": return "bg-emerald-50 text-emerald-700";
    case "late": return "bg-amber-50 text-amber-700";
    case "absent": return "bg-rose-50 text-rose-700";
    default: return "bg-blue-50 text-blue-700";
  }
}

export default function RegistrarAttendancePage() {
  const [data, setData] = useState<ReportData>(emptyReport);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(emptyFilterOptions);
  const [draftFilters, setDraftFilters] = useState<ReportFilters>(emptyFilters);
  const [filters, setFilters] = useState<ReportFilters>(emptyFilters);
  const [activeView, setActiveView] = useState<"graph" | "table">("graph");
  const [edit, setEdit] = useState<EditRecord>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const requestReport = useCallback(async (targetFilters: ReportFilters, signal?: AbortSignal) => {
    const query = Object.fromEntries(Object.entries(targetFilters).filter(([, value]) => value));
    return apiRequest<ReportData>("registrar_attendance", { signal }, query);
  }, []);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const result = await requestReport(filters, signal);
      setData(result);
      setFilterOptions(filterOptionsFrom(result));
    } catch (cause) {
      if (!(cause instanceof Error && cause.name === "AbortError")) {
        setError(cause instanceof Error ? cause.message : "Unable to load attendance report.");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [filters, requestReport]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  // Load once on entry. Applying filters performs its own request so the page
  // only commits a new scope after that request succeeds.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveCorrection(event: FormEvent) {
    event.preventDefault();
    if (!edit) return;
    setError("");
    setMessage("");
    try {
      const result = await apiRequest<{ message: string }>("registrar_attendance", {
        method: "PATCH",
        body: JSON.stringify(edit),
      });
      setMessage(result.message);
      setEdit(null);
      setData(await requestReport(filters));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update this attendance record.");
    }
  }

  async function applyFilters(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const result = await requestReport(draftFilters);
      setData(result);
      setFilterOptions(filterOptionsFrom(result));
      setFilters({ ...draftFilters });
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to apply attendance filters.");
    } finally {
      setLoading(false);
    }
  }

  function clearFilters() {
    setDraftFilters({ ...emptyFilters });
  }

  function exportCsv() {
    const header = ["Academic year", "Date", "Course", "Subject", "Section", "Room", "Student number", "Student name", "Status", "Verified by", "Checked in at"];
    const rows = data.records.map((item) => [item.year_label, item.session_date, item.course_code, item.course_title, item.section_code, item.room, item.student_number, item.full_name, item.attendance_status, item.verification_method, item.checked_in_at ?? ""]);
    const contents = [header, ...rows].map((row) => row.map(csvValue).join(",")).join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\ufeff", contents], { type: "text/csv;charset=utf-8" }));
    link.download = "edutrack-attendance.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const counts = {
    enrolled: data.summaries.reduce((sum, item) => sum + Number(item.total_enrolled), 0),
    present: data.summaries.reduce((sum, item) => sum + Number(item.present_count), 0),
    late: data.summaries.reduce((sum, item) => sum + Number(item.late_count), 0),
    absent: data.summaries.reduce((sum, item) => sum + Number(item.absent_count), 0),
    excused: data.summaries.reduce((sum, item) => sum + Number(item.excused_count), 0),
  };
  const eligible = counts.enrolled - counts.excused;
  const attendanceRate = eligible ? Math.round(((counts.present + counts.late) / eligible) * 100) : 0;
  const hasUnappliedFilters = !sameFilters(draftFilters, filters);
  const filteredCourseOptions = draftFilters.section_code
    ? [...new Set(filterOptions.offerings.filter((item) => item.section_code === draftFilters.section_code).map((item) => item.course_code))]
    : filterOptions.course_codes;
  const filteredSectionOptions = draftFilters.course_code
    ? [...new Set(filterOptions.offerings.filter((item) => item.course_code === draftFilters.course_code).map((item) => item.section_code))]
    : filterOptions.section_codes;
  function updateDraft<K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) {
    setMessage("");
    setDraftFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar role="registrar" />
      <main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-amber-700">Registrar dashboard</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">Attendance reports</h1>
              <p className="mt-1 text-sm text-slate-500">Review class attendance, explore trends, and correct verified records.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Printer size={16} />Print / PDF
              </button>
              <button type="button" onClick={exportCsv} disabled={!data.records.length} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40">
                <Download size={16} />Export CSV
              </button>
            </div>
          </header>

          <section className="attendance-report-print" aria-hidden="true">
            <h1>EduTrack University · Attendance report</h1>
            <p className="attendance-print-subtitle">{filters.date_from || filters.date_to ? `${filters.date_from || "Beginning"} to ${filters.date_to || "Present"}` : "All dates"} · {filters.year_label || "All academic years"} · {filters.course_code || "All subjects"} · {filters.section_code || "All sections"}</p>
            <p className="attendance-print-summary">Enrolled: {counts.enrolled} · Present: {counts.present} · Late: {counts.late} · Absent: {counts.absent} · Excused: {counts.excused} · Attendance rate: {attendanceRate}%</p>
            <table>
              <thead><tr>{["Date", "Academic year", "Course", "Section", "Student", "Student number", "Status", "Method", "Check-in"].map((label) => <th key={label}>{label}</th>)}</tr></thead>
              <tbody>{data.records.map((item) => <tr key={item.attendance_id}><td>{item.session_date}</td><td>{item.year_label}</td><td>{item.course_code} · {item.course_title}</td><td>{item.section_code}</td><td>{item.full_name}</td><td>{item.student_number}</td><td>{item.attendance_status}</td><td>{item.verification_method === "staff_verified" ? "Staff verified" : item.verification_method === "face" ? "Face match" : "System"}</td><td>{item.checked_in_at?.slice(11, 16) ?? "—"}</td></tr>)}</tbody>
            </table>
            <p className="attendance-print-footer">Generated from EduTrack attendance records · {data.records.length} records</p>
          </section>

          {message && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
          {error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

          <section aria-label="Attendance totals" className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {[
              { label: "Enrolled", value: counts.enrolled, color: "text-slate-900" },
              { label: "Present", value: counts.present, color: "text-emerald-700" },
              { label: "Late", value: counts.late, color: "text-amber-700" },
              { label: "Absent", value: counts.absent, color: "text-rose-700" },
              { label: "Excused", value: counts.excused, color: "text-blue-700" },
              { label: "Attendance rate", value: `${attendanceRate}%`, color: "text-violet-700" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
                <p className="text-xs font-medium text-slate-500">{item.label}</p>
                <p className={`mt-1 text-2xl font-bold tabular-nums ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </section>

          <form onSubmit={(event) => void applyFilters(event)} className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">Report filters</h2>
              </div>
              <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                <RotateCcw size={14} />Clear filters
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <label className="text-xs font-semibold text-slate-600">From<input type="date" value={draftFilters.date_from} onChange={(event) => updateDraft("date_from", event.target.value)} className={inputClass} /></label>
              <label className="text-xs font-semibold text-slate-600">To<input type="date" value={draftFilters.date_to} onChange={(event) => updateDraft("date_to", event.target.value)} className={inputClass} /></label>
              <label className="text-xs font-semibold text-slate-600">Academic year<select value={draftFilters.year_label} onChange={(event) => updateDraft("year_label", event.target.value)} className={inputClass}><option value="">All years</option>{filterOptions.year_labels.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label className="text-xs font-semibold text-slate-600">Subject<select value={draftFilters.course_code} onChange={(event) => updateDraft("course_code", event.target.value)} className={inputClass}><option value="">All subjects</option>{filteredCourseOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label className="text-xs font-semibold text-slate-600">Section<select value={draftFilters.section_code} onChange={(event) => updateDraft("section_code", event.target.value)} className={inputClass}><option value="">All sections</option>{filteredSectionOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <div className="flex items-end">
                <button type="submit" disabled={loading || !hasUnappliedFilters} className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40">{loading ? "Applying…" : "Apply changes"}</button>
              </div>
            </div>
          </form>

          <section className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5">
            <div>
              <h2 className="font-semibold text-slate-900">Attendance view</h2>
              <p className="mt-0.5 text-sm text-slate-500">{filters.course_code || "All subjects"} <span aria-hidden="true">·</span> {filters.section_code ? `Section ${filters.section_code}` : "All sections"}</p>
            </div>
            <div role="group" aria-label="Choose attendance view" className="inline-flex rounded-xl bg-slate-100 p-1">
              <button type="button" aria-pressed={activeView === "graph"} onClick={() => setActiveView("graph")} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${activeView === "graph" ? "bg-white text-amber-800 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>Graph</button>
              <button type="button" aria-pressed={activeView === "table"} onClick={() => setActiveView("table")} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${activeView === "table" ? "bg-white text-amber-800 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>Table</button>
            </div>

          </section>

          {activeView === "graph" ? <AttendanceAnalytics records={data.records} accent="amber" showFilters={false} /> : <>
          {edit && (
            <form onSubmit={(event) => void saveCorrection(event)} className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
              <div className="mb-4">
                <h2 className="font-semibold text-amber-950">Correct attendance record</h2>
                <p className="mt-1 text-sm text-amber-800">Select the verified status and record a reason for the audit log.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
                <label className="text-sm font-medium text-slate-700">Corrected status<select value={edit.attendance_status} onChange={(event) => setEdit({ ...edit, attendance_status: event.target.value })} className="mt-1 block w-full rounded-lg border border-amber-200 bg-white px-3 py-2.5">{statuses.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label>
                <label className="text-sm font-medium text-slate-700">Reason<input required maxLength={500} value={edit.reason} onChange={(event) => setEdit({ ...edit, reason: event.target.value })} className="mt-1 block w-full rounded-lg border border-amber-200 bg-white px-3 py-2.5" placeholder="Describe the verified correction" /></label>
                <div className="flex gap-2">
                  <button type="submit" className="rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-800">Save correction</button>
                  <button type="button" onClick={() => setEdit(null)} className="rounded-lg border border-amber-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700">Cancel</button>
                </div>
              </div>
            </form>
          )}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><FileBarChart size={19} /></div>
                <div>
                  <h2 className="font-semibold text-slate-900">Attendance records</h2>
                  <p className="mt-0.5 text-sm text-slate-500">{data.records.length.toLocaleString()} records{loading ? " · Updating report…" : ""}</p>
                </div>
              </div>
              {filters.section_code && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Section {filters.section_code}</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>{["Date", "Academic year", "Course / subject", "Section", "Student", "Status", "Method", "Check-in", ""].map((item, index) => <th key={`${item}-${index}`} className="px-4 py-3 font-semibold">{item}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.records.map((item) => (
                    <tr key={item.attendance_id} className="transition-colors hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{item.session_date}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{item.year_label}</td>
                      <td className="px-4 py-3"><span className="font-medium text-slate-900">{item.course_code}</span><span className="block max-w-[220px] truncate text-xs text-slate-500">{item.course_title}</span></td>
                      <td className="px-4 py-3 text-slate-700">{item.section_code}</td>
                      <td className="px-4 py-3"><span className="font-medium text-slate-900">{item.full_name}</span><span className="block text-xs text-slate-500">{item.student_number}</span></td>
                      <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(item.attendance_status)}`}>{item.attendance_status}</span></td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{item.verification_method === "staff_verified" ? "Staff verified" : item.verification_method === "face" ? "Face match" : "System"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{item.checked_in_at?.slice(11, 16) ?? "—"}</td>
                      <td className="px-4 py-3"><button type="button" title={`Correct attendance for ${item.full_name}`} onClick={() => setEdit({ attendance_id: item.attendance_id, attendance_status: item.attendance_status, reason: "" })} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800"><PencilLine size={15} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && data.records.length === 0 && <div className="p-12 text-center"><FileBarChart className="mx-auto text-slate-300" size={28} /><p className="mt-3 text-sm font-medium text-slate-700">No attendance records found</p><p className="mt-1 text-sm text-slate-500">Try changing or clearing your report filters.</p></div>}
              {loading && data.records.length === 0 && <div className="p-10 text-center text-sm text-slate-500">Loading attendance records…</div>}
            </div>

          </section>
          </>}
        </div>
      </main>
    </div>
  );
}
