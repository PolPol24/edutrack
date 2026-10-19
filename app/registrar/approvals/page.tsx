"use client";

import { useState } from "react";
import { Check, CheckCheck, Clock3, X } from "lucide-react";
import Sidebar from "@/components/Sidebar";

type RequestStatus = "Pending" | "Approved" | "Rejected";
const initialRequests = [
  { id: "ENR-2601", student: "Alyssa Cruz", studentId: "2025-00118", program: "BS Information Systems · 1st Year", course: "IT 205", title: "Web Application Development", units: 3, date: "Oct 20, 2026", status: "Pending" as RequestStatus },
  { id: "ENR-2600", student: "Miguel Reyes", studentId: "2025-00123", program: "BS Information Systems · 1st Year", course: "MATH 202", title: "Discrete Mathematics", units: 3, date: "Oct 20, 2026", status: "Pending" as RequestStatus },
  { id: "ENR-2599", student: "Sofia Garcia", studentId: "2025-00131", program: "BS Computer Science · 2nd Year", course: "CS 205", title: "Data Structures", units: 3, date: "Oct 19, 2026", status: "Pending" as RequestStatus },
  { id: "ENR-2595", student: "Noah Lim", studentId: "2025-00144", program: "BS Information Technology · 1st Year", course: "ENG 101", title: "Technical Writing", units: 3, date: "Oct 15, 2026", status: "Approved" as RequestStatus },
];

export default function Page() {
  const [requests, setRequests] = useState(initialRequests);
  const [filter, setFilter] = useState("Pending");
  const [message, setMessage] = useState("");
  const pendingCount = requests.filter((request) => request.status === "Pending").length;
  const visible = requests.filter((request) => filter === "All requests" || request.status === filter);
  function updateStatus(id: string, status: RequestStatus) {
    const request = requests.find((item) => item.id === id);
    setRequests((items) => items.map((item) => item.id === id ? { ...item, status } : item));
    if (request) setMessage(`${request.id} for ${request.student} was ${status.toLowerCase()}.`);
  }
  function approveAll() {
    setRequests((items) => items.map((item) => item.status === "Pending" ? { ...item, status: "Approved" } : item));
    setMessage("All pending sample requests were approved.");
  }

  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="registrar"/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-6xl">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-amber-700">Enrollment workflow</p><h1 className="mt-1 text-2xl font-bold">Approvals</h1><p className="mt-1 text-sm text-slate-500">Review student enrollment requests and record a decision.</p></div><button onClick={approveAll} disabled={!pendingCount} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"><CheckCheck size={16}/>Approve all pending</button></div>
    {message && <p role="status" className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{message} Changes are demo-only.</p>}
    <div className="mb-5 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Awaiting review</p><p className="mt-1 text-2xl font-bold">{pendingCount}</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Approved</p><p className="mt-1 text-2xl font-bold">{requests.filter((request) => request.status === "Approved").length}</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-sm text-slate-500">Rejected</p><p className="mt-1 text-2xl font-bold">{requests.filter((request) => request.status === "Rejected").length}</p></div></div>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Enrollment requests</h2><p className="mt-1 text-sm text-slate-500">Confirm prerequisites and available units before approval.</p></div><label className="text-sm text-slate-600">Show <select value={filter} onChange={(event) => setFilter(event.target.value)} className="ml-2 rounded-lg border bg-white px-3 py-2"><option>Pending</option><option>Approved</option><option>Rejected</option><option>All requests</option></select></label></div>
    <div className="space-y-3">{visible.map((request)=><article key={request.id} className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{request.student}</h3><span className="text-xs text-slate-500">{request.studentId} · {request.program}</span></div><p className="mt-2 text-sm font-medium text-slate-700">{request.course} · {request.title}</p><p className="mt-1 text-xs text-slate-500">{request.units} units · Submitted {request.date} · Request {request.id}</p></div><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${request.status === "Pending" ? "bg-amber-50 text-amber-700" : request.status === "Approved" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{request.status === "Pending" ? <Clock3 size={13}/> : request.status === "Approved" ? <Check size={13}/> : <X size={13}/>} {request.status}</span></div>{request.status === "Pending" && <div className="mt-4 flex justify-end gap-2 border-t pt-4"><button onClick={() => updateStatus(request.id, "Rejected")} className="rounded-lg border px-3.5 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50">Reject</button><button onClick={() => updateStatus(request.id, "Approved")} className="rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-700">Approve request</button></div>}</article>)}{visible.length === 0 && <p className="rounded-2xl border bg-white p-10 text-center text-sm text-slate-500">No requests in this category.</p>}</div>
  </div></main></div>;
}
