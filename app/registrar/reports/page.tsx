"use client";

import { useState } from "react";
import { Download, FileBarChart, Users } from "lucide-react";
import Sidebar from "@/components/Sidebar";

const enrollmentRows = [
  ["ENR-2601", "Alyssa Cruz", "IT 205", "3", "Pending"],
  ["ENR-2600", "Miguel Reyes", "MATH 202", "3", "Pending"],
  ["ENR-2599", "Sofia Garcia", "CS 205", "3", "Pending"],
  ["ENR-2598", "Isabella Flores", "IT 310", "3", "Approved"],
  ["ENR-2597", "Liam Mendoza", "CS 101", "3", "Rejected"],
  ["ENR-2596", "Noah Lim", "ENG 101", "3", "Approved"],
];
const studentRows = [
  ["2025-00118", "Alyssa Cruz", "BS Information Systems", "1st Year", "Active"],
  ["2025-00123", "Miguel Reyes", "BS Information Systems", "1st Year", "Active"],
  ["2025-00131", "Sofia Garcia", "BS Computer Science", "2nd Year", "Active"],
  ["2024-00067", "Isabella Flores", "BS Information Technology", "3rd Year", "Active"],
  ["2023-00042", "Liam Mendoza", "BS Computer Science", "4th Year", "On leave"],
];

export default function Page() {
  const [reportType, setReportType] = useState("Enrollment summary");
  const [period, setPeriod] = useState("Fall 2025–2026");
  const [generated, setGenerated] = useState(false);
  const isEnrollment = reportType === "Enrollment summary";
  const rows = isEnrollment ? enrollmentRows : studentRows;
  const headers = isEnrollment ? ["Request ID", "Student", "Course", "Units", "Status"] : ["Student ID", "Name", "Program", "Year", "Status"];

  function exportCsv() {
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportType.toLowerCase().replaceAll(" ", "-")}-${period.toLowerCase().replaceAll(" ", "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setGenerated(true);
  }

  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="registrar"/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-6xl">
    <div className="mb-7"><p className="text-sm font-medium text-amber-700">Registrar insights</p><h1 className="mt-1 text-2xl font-bold">Reports</h1><p className="mt-1 text-sm text-slate-500">Review academic activity and export sample records.</p></div>
    <section className="mb-6 rounded-2xl border bg-white p-5"><div className="mb-4"><h2 className="font-semibold">Build a report</h2><p className="mt-1 text-sm text-slate-500">Choose a report and term, then download the displayed sample rows as CSV.</p></div><div className="flex flex-wrap items-end gap-3"><label className="text-sm font-medium text-slate-700">Report type<select value={reportType} onChange={(event) => { setReportType(event.target.value); setGenerated(false); }} className="mt-1.5 block rounded-lg border bg-white px-3 py-2.5"><option>Enrollment summary</option><option>Student directory</option></select></label><label className="text-sm font-medium text-slate-700">Academic period<select value={period} onChange={(event) => { setPeriod(event.target.value); setGenerated(false); }} className="mt-1.5 block rounded-lg border bg-white px-3 py-2.5"><option>Fall 2025–2026</option><option>Spring 2025–2026</option><option>Fall 2024–2025</option></select></label><button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"><Download size={16}/>Generate & download</button></div>{generated && <p role="status" className="mt-3 text-sm text-emerald-700">Your {reportType.toLowerCase()} CSV has been generated.</p>}</section>
    <div className="mb-5 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border bg-white p-5"><FileBarChart size={19} className="mb-3 text-amber-600"/><p className="text-sm text-slate-500">Enrollment requests</p><p className="mt-1 text-2xl font-bold">1,240</p><p className="mt-1 text-xs text-slate-500">Current academic year</p></div><div className="rounded-2xl border bg-white p-5"><Users size={19} className="mb-3 text-blue-600"/><p className="text-sm text-slate-500">Active students</p><p className="mt-1 text-2xl font-bold">1,206</p><p className="mt-1 text-xs text-slate-500">Across 12 programs</p></div><div className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">Awaiting approval</p><p className="mt-1 text-2xl font-bold">24</p><p className="mt-1 text-xs text-slate-500">Enrollment requests</p></div></div>
    <section className="overflow-hidden rounded-2xl border bg-white"><div className="border-b p-5"><h2 className="font-semibold">{reportType} · {period}</h2><p className="mt-1 text-sm text-slate-500">Preview of the sample data included in the export.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{headers.map((header)=><th key={header} className="px-5 py-3 font-medium">{header}</th>)}</tr></thead><tbody>{rows.map((row,index)=><tr key={index} className="border-t">{row.map((cell,column)=><td key={column} className="px-5 py-4">{cell}</td>)}</tr>)}</tbody></table></div><p className="border-t px-5 py-3 text-xs text-slate-500">Sample report data for preview purposes.</p></section>
  </div></main></div>;
}
