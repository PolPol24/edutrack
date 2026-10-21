"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileBarChart } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { apiRequest } from "@/lib/api";

type Role = "admin" | "registrar";
type ReportType = "enrollments" | "students" | "users";
type Row = Record<string, string | number | null>;
const reportNames: Record<Role, Record<string, ReportType>> = {
  admin: { "Enrollment activity": "enrollments", "User directory": "users" },
  registrar: { "Enrollment summary": "enrollments", "Student directory": "students" },
};

export default function DatabaseReports({ role }: { role: Role }) {
  const choices = Object.keys(reportNames[role]);
  const [reportType, setReportType] = useState(choices[0]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloaded, setDownloaded] = useState(false);
  const apiType = reportNames[role][reportType];
  const columns = useMemo(() => rows.length ? Object.keys(rows[0]) : [], [rows]);
  useEffect(() => {
    setLoading(true); setError(""); setDownloaded(false);
    apiRequest<{ rows: Row[] }>("reports", {}, { type: apiType })
      .then(({ rows: results }) => setRows(results))
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load report data."))
      .finally(() => setLoading(false));
  }, [apiType]);

  function exportCsv() {
    const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = [columns.map(csvCell).join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `${reportType.toLowerCase().replaceAll(" ", "-")}.csv`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000); setDownloaded(true);
  }

  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role={role}/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-6xl">
    <div className="mb-7"><p className="text-sm font-medium text-blue-600">Database reports</p><h1 className="mt-1 text-2xl font-bold">Reports</h1><p className="mt-1 text-sm text-slate-500">Preview and export live records from edutrack_db.</p></div>
    {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
    <section className="mb-6 rounded-2xl border bg-white p-5"><div className="mb-4"><h2 className="font-semibold">Build a report</h2><p className="mt-1 text-sm text-slate-500">Choose a report, then export the current database records as CSV.</p></div><div className="flex flex-wrap items-end gap-3"><label className="text-sm font-medium text-slate-700">Report type<select value={reportType} onChange={(event)=>setReportType(event.target.value)} className="mt-1.5 block rounded-lg border bg-white px-3 py-2.5">{choices.map((choice)=><option key={choice}>{choice}</option>)}</select></label><button disabled={loading || !!error} onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"><Download size={16}/>Generate & download</button></div>{downloaded&&<p role="status" className="mt-3 text-sm text-emerald-700">{rows.length} database records exported to CSV.</p>}</section>
    <section className="overflow-hidden rounded-2xl border bg-white"><div className="flex items-center gap-2 border-b p-5"><FileBarChart size={18} className="text-blue-600"/><div><h2 className="font-semibold">{reportType}</h2><p className="mt-1 text-sm text-slate-500">{loading ? "Loading report records…" : `${rows.length} database records`}</p></div></div><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{columns.map((column)=><th key={column} className="px-5 py-3 font-medium">{column.replaceAll("_", " ")}</th>)}</tr></thead><tbody>{rows.slice(0, 100).map((row,index)=><tr key={index} className="border-t">{columns.map((column)=><td key={column} className="px-5 py-4">{row[column] ?? "—"}</td>)}</tr>)}{!loading && rows.length===0 && <tr><td colSpan={Math.max(1,columns.length)} className="px-5 py-10 text-center text-slate-500">No database records are available for this report.</td></tr>}{loading && <tr><td colSpan={Math.max(1,columns.length)} className="px-5 py-10 text-center text-slate-500">Loading…</td></tr>}</tbody></table></div><p className="border-t px-5 py-3 text-xs text-slate-500">Showing up to 100 rows in the preview. CSV includes all records returned by the database.</p></section>
  </div></main></div>;
}
