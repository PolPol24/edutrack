"use client";

import { useEffect, useState } from "react";
import { Check, Clock3, UserCheck, X } from "lucide-react";
import { apiRequest } from "@/lib/api";

type RegistrationStatus = "pending" | "approved" | "rejected";
type RegistrationRequest = {
  request_id: number;
  student_number: string;
  first_name: string;
  last_name: string;
  name_suffix: string | null;
  date_of_birth: string;
  email: string;
  request_status: RegistrationStatus;
  created_at: string;
  reviewed_at: string | null;
  roster_first_name: string | null;
  roster_last_name: string | null;
  roster_student_email: string | null;
  roster_name_suffix: string | null;
  roster_date_of_birth: string | null;
  roster_program_id: string | null;
  roster_program_code: string | null;
  roster_program_name: string | null;
  roster_year_level: number | null;
  roster_identity_match: number | string;
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
  const visible = requests.filter((request) => filter === "all" || request.request_status === filter);
  const pendingCount = requests.filter((request) => request.request_status === "pending").length;

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
    {review && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><section role="alertdialog" aria-modal="true" aria-labelledby="registration-review-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 id="registration-review-title" className="text-lg font-semibold">{review.status === "approved" ? "Approve student registration?" : "Reject student registration?"}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{review.status === "approved" ? `This creates an active student account for ${review.request.first_name} ${review.request.last_name} and adds their student profile to the database.` : `This will reject the registration request from ${review.request.first_name} ${review.request.last_name}. No user account will be created.`}</p>{error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}<div className="mt-6 flex justify-end gap-3"><button disabled={saving} onClick={() => { setReview(null); setError(""); }} className="rounded-xl border px-4 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-50">Cancel</button><button disabled={saving} onClick={decide} className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${review.status === "approved" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}>{saving ? "Saving…" : review.status === "approved" ? "Approve and create account" : "Reject request"}</button></div></section></div>}
    <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><div><p className="text-sm font-medium text-amber-700">Student accounts</p><h2 className="mt-1 font-semibold">Registration requests</h2><p className="mt-1 text-sm text-slate-500">Approve a request before its student account is added.</p></div><label className="text-sm text-slate-600">Show <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="ml-2 rounded-lg border bg-white px-3 py-2"><option value="pending">Pending ({pendingCount})</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All requests</option></select></label></div>
    {message && <p role="status" className="mx-5 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}{error && !review && <p role="alert" className="mx-5 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
    <div className="divide-y">{visible.map((request) => { const pending = request.request_status === "pending"; const name = [request.first_name, request.last_name, request.name_suffix].filter(Boolean).join(" "); return <article key={request.request_id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{name}</h3><span className="text-xs text-slate-500">Student #{request.student_number}</span></div><p className="mt-1 text-sm text-slate-600">{request.email}</p><p className="mt-1 text-xs text-slate-500">Date of birth: {formatDate(request.date_of_birth)} · Submitted {formatDate(request.created_at)}</p><p className="mt-1 text-xs text-slate-400">Request REG-{String(request.request_id).padStart(6, "0")}</p></div><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${request.request_status === "pending" ? "bg-amber-50 text-amber-700" : request.request_status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{request.request_status === "pending" ? <Clock3 size={13}/> : request.request_status === "approved" ? <Check size={13}/> : <X size={13}/>} {request.request_status}</span></div>
      {pending && <div className="mt-4 border-t pt-4"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${Number(request.roster_identity_match) === 1 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{Number(request.roster_identity_match) === 1 ? "Campus record verified" : request.roster_program_id ? "Identity details do not match" : "No campus record found"}</span><span className="text-sm text-slate-600">{request.roster_program_id ? `${request.roster_program_code} · ${request.roster_program_name} · Year ${request.roster_year_level}` : "This student number is not in the campus roster."}</span></div>{request.roster_program_id && <p className="mt-2 text-xs text-slate-500">Roster identity: {[request.roster_first_name, request.roster_last_name, request.roster_name_suffix].filter(Boolean).join(" ")} · Date of birth: {request.roster_date_of_birth ? formatDate(request.roster_date_of_birth) : "—"} · {request.roster_student_email}</p>}<div className="mt-3 flex justify-end gap-2"><button disabled={saving} onClick={() => { setError(""); setReview({ request, status: "rejected" }); }} className="rounded-lg border px-3.5 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50">Reject</button><button disabled={saving || Number(request.roster_identity_match) !== 1} onClick={() => { setError(""); setReview({ request, status: "approved" }); }} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"><UserCheck size={15}/>Approve registration</button></div></div>}
    </article>; })}{!loading && visible.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No student registration requests in this category.</p>}{loading && <p className="p-8 text-center text-sm text-slate-500">Loading student registration requests…</p>}</div>
  </section>;
}
