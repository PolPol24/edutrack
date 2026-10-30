"use client";

import { useEffect, useState } from "react";
import { Check, Clock3, Download, Eye, UserCheck, X } from "lucide-react";
import { apiRequest, apiUrl } from "@/lib/api";

type RegistrationStatus = "pending" | "approved" | "rejected";
type RegistrationRequest = {
  request_id: number;
  student_number: string;
  first_name: string;
  last_name: string;
  name_suffix: string | null;
  date_of_birth: string;
  email: string;
  phone: string | null;
  program_id: string | null;
  program_code: string | null;
  program_name: string | null;
  year_level: number | null;
  documents: { document_id: number; slot_number: number; original_filename: string; size_bytes: number }[];
  request_status: RegistrationStatus;
  created_at: string;
  reviewed_at: string | null;
};
type Review = { request: RegistrationRequest; status: "approved" | "rejected" } | null;

function formatDate(value: string) {
  return new Date(value.replace(" ", "T")).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function StudentRegistrationApprovals() {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [review, setReview] = useState<Review>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [expandedRequestId, setExpandedRequestId] = useState<number | null>(null);
  const visible = requests.filter((request) => filter === "all" || request.request_status === filter);
  const pendingCount = requests.filter((request) => request.request_status === "pending").length;
  const documentLabels = ["PSA Birth Certificate", "Form 137", "Good Moral Certificate"];

  async function load() {
    const result = await apiRequest<{ requests: RegistrationRequest[] }>("student_registrations");
    setRequests(result.requests);
    setError("");
  }

  useEffect(() => {
    load().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load student registration requests.")).finally(() => setLoading(false));
  }, []);

  async function decide() {
    if (!review || saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const body = { request_id: review.request.request_id, status: review.status };
      const result = await apiRequest<{ message: string }>("student_registrations", { method: "PATCH", body: JSON.stringify(body) });
      await load();
      setMessage(result.message);
      setReview(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to review this registration.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="mb-8 overflow-hidden rounded-2xl border bg-white">
    {review && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><section role="alertdialog" aria-modal="true" aria-labelledby="registration-review-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 id="registration-review-title" className="text-lg font-semibold">{review.status === "approved" ? "Approve student registration?" : "Reject student registration?"}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{review.status === "approved" ? `This creates an active ${review.request.program_code ?? "student"} Year ${review.request.year_level ?? "—"} account for ${review.request.first_name} ${review.request.last_name}.` : `This will reject the registration request from ${review.request.first_name} ${review.request.last_name}. No user account will be created.`}</p>{error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}<div className="mt-6 flex justify-end gap-3"><button disabled={saving} onClick={() => { setReview(null); setError(""); }} className="rounded-xl border px-4 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-50">Cancel</button><button disabled={saving} onClick={decide} className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${review.status === "approved" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}>{saving ? "Saving…" : review.status === "approved" ? "Approve and create account" : "Reject request"}</button></div></section></div>}
    <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><div><p className="text-sm font-medium text-amber-700">Student accounts</p><h2 className="mt-1 font-semibold">Registration requests</h2><p className="mt-1 text-sm text-slate-500">Open a request summary to review applicant information and first-year documents before deciding.</p></div><label className="text-sm text-slate-600">Show <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="ml-2 rounded-lg border bg-white px-3 py-2"><option value="pending">Pending ({pendingCount})</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All requests</option></select></label></div>
    <ol className="mx-5 mt-4 grid gap-2 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950 sm:grid-cols-3">
      <li><span className="font-semibold">1. Review the submitted details.</span> Students no longer need to match a preloaded campus roster.</li>
      <li><span className="font-semibold">2. Confirm program and year level.</span> Review the academic details the student submitted.</li>
      <li><span className="font-semibold">3. Choose an action.</span> Approve to create the account, or reject the request.</li>
    </ol>
    {message && <p role="status" className="mx-5 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}{error && !review && <p role="alert" className="mx-5 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
    <div className="divide-y">{visible.map((request) => { const pending = request.request_status === "pending"; const name = [request.first_name, request.last_name, request.name_suffix].filter(Boolean).join(" "); return <article key={request.request_id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{name}</h3><span className="text-xs text-slate-500">Student #{request.student_number}</span></div><p className="mt-1 text-sm text-slate-600">{request.email}</p><p className="mt-1 text-xs text-slate-500">Date of birth: {formatDate(request.date_of_birth)} · Submitted {formatDate(request.created_at)}</p><p className="mt-1 text-xs text-slate-500">{request.program_code ?? "Program unavailable"} · {request.program_name ?? "Program unavailable"} · Year {request.year_level ?? "—"}</p><p className="mt-1 text-xs text-slate-400">Request REG-{String(request.request_id).padStart(6, "0")}</p></div><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${request.request_status === "pending" ? "bg-amber-50 text-amber-700" : request.request_status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{request.request_status === "pending" ? <Clock3 size={13}/> : request.request_status === "approved" ? <Check size={13}/> : <X size={13}/>} {request.request_status}</span></div>
      <div className="mt-4 flex flex-wrap justify-end gap-2 border-t pt-4">
        <button type="button" onClick={() => setExpandedRequestId((current) => current === request.request_id ? null : request.request_id)} aria-expanded={expandedRequestId === request.request_id} className="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"><Eye size={15}/>{expandedRequestId === request.request_id ? "Hide summary" : "View summary"}</button>
        {pending && <><button disabled={saving} onClick={() => { setError(""); setReview({ request, status: "rejected" }); }} className="rounded-lg border px-3.5 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50">Reject</button><button disabled={saving || !request.program_id || !request.year_level || (request.year_level === 1 && request.documents.length !== 3)} onClick={() => { setError(""); setReview({ request, status: "approved" }); }} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"><UserCheck size={15}/>Approve registration</button></>}
      </div>
      {expandedRequestId === request.request_id && <div className="mt-4 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
        <div><h4 className="text-sm font-semibold text-slate-800">Applicant information</h4><dl className="mt-2 space-y-1.5 text-sm text-slate-600"><div><dt className="inline font-medium">Name: </dt><dd className="inline">{name}</dd></div><div><dt className="inline font-medium">Student number: </dt><dd className="inline">{request.student_number}</dd></div><div><dt className="inline font-medium">Email: </dt><dd className="inline">{request.email}</dd></div><div><dt className="inline font-medium">Phone: </dt><dd className="inline">{request.phone || "Not provided"}</dd></div><div><dt className="inline font-medium">Date of birth: </dt><dd className="inline">{formatDate(request.date_of_birth)}</dd></div><div><dt className="inline font-medium">Program: </dt><dd className="inline">{request.program_code ?? "—"} · {request.program_name ?? "Program unavailable"}</dd></div><div><dt className="inline font-medium">Year level: </dt><dd className="inline">{request.year_level ?? "—"}</dd></div><div><dt className="inline font-medium">Submitted: </dt><dd className="inline">{formatDate(request.created_at)}</dd></div></dl></div>
        <div><h4 className="text-sm font-semibold text-slate-800">Uploaded documents</h4>{request.year_level === 1 ? <ul className="mt-2 space-y-2 text-sm">{documentLabels.map((label, index) => { const document = request.documents.find((item) => item.slot_number === index + 1); return <li key={label} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2"><span className="text-slate-700">{label}</span>{document ? <span className="flex items-center gap-3"><a href={apiUrl("student_registration_request_document_file", { document_id: document.document_id })} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-700 underline">View</a><a href={apiUrl("student_registration_request_document_file", { document_id: document.document_id, disposition: "attachment" })} className="inline-flex items-center gap-1 font-medium text-blue-700 hover:text-blue-900"><Download size={14}/>Download</a></span> : <span className="text-rose-600">Not submitted</span>}</li>; })}</ul> : <p className="mt-2 text-sm text-slate-500">Document uploads are required for first-year applicants only.</p>}</div>
      </div>}
    </article>; })}{!loading && visible.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No student registration requests in this category.</p>}{loading && <p className="p-8 text-center text-sm text-slate-500">Loading student registration requests…</p>}</div>
  </section>;
}
