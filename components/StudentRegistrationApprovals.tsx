"use client";

import { useEffect, useState } from "react";
import { Check, Clock3, Download, Eye, UserCheck, X } from "lucide-react";
import { apiRequest, apiUrl } from "@/lib/api";

type RegistrationStatus = "pending" | "approved" | "rejected";
type RegistrationRequest = {
  request_id: number;
  student_number: string | null;
  first_name: string;
  last_name: string;
  name_suffix: string | null;
  date_of_birth: string;
  email: string;
  phone: string | null;
  application_details: Record<string, string>;
  program_id: string | null;
  program_code: string | null;
  program_name: string | null;
  year_level: number | null;
  documents: { document_id: number; slot_number: number; original_filename: string; size_bytes: number }[];
  photo: { original_filename: string } | null;
  processing_fee_receipt_required: boolean | number;
  processing_fee_receipt: { original_filename: string; mime_type: string; size_bytes: number } | null;
  request_status: RegistrationStatus;
  created_at: string;
  reviewed_at: string | null;
};
type Review = { request: RegistrationRequest; status: "approved" | "rejected" } | null;
type ApprovalEmailPreview = { request_id: number; to: string; subject: string; body: string; school_email: string; student_number: string; delivery_status: "sent" | "simulated" | "failed"; delivery_detail: string };

function formatDate(value: string) {
  return new Date(value.replace(" ", "T")).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function applicantName(request: RegistrationRequest) {
  return [request.first_name, request.application_details.middle_name, request.last_name, request.name_suffix]
    .filter(Boolean)
    .join(" ");
}

const applicationDetailLabels: Record<string, string> = {
  organization: "Organization", position: "Position", middle_name: "Middle name", sex: "Sex", permanent_address: "Permanent address",
  place_of_birth: "Place of birth", civil_status: "Civil status", citizenship: "Citizenship", religion: "Religion",
  height_cm: "Height (cm)", weight_kg: "Weight (kg)", father_name: "Father’s name", father_occupation: "Father’s occupation",
  mother_name: "Mother’s name", mother_occupation: "Mother’s occupation", language_dialect: "Language or dialect",
  emergency_contact_person: "Emergency contact person", emergency_contact_address: "Emergency contact address",
  emergency_contact_no: "Emergency contact number", elementary_school: "Elementary school",
  elementary_year_graduated: "Elementary year graduated", high_school: "High school", high_school_year_graduated: "High school year graduated",
  vocational: "Vocational school",
  vocational_year_graduated: "Vocational year graduated", special_skills: "Special skills",
  award_1: "Award 1", award_2: "Award 2", award_3: "Award 3", award_4: "Award 4", award_5: "Award 5",
  reference_1_name: "Reference 1", reference_1_contact: "Reference 1 contact",
  reference_2_name: "Reference 2", reference_2_contact: "Reference 2 contact",
  reference_3_name: "Reference 3", reference_3_contact: "Reference 3 contact",
};

export default function StudentRegistrationApprovals() {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [review, setReview] = useState<Review>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [approvalEmail, setApprovalEmail] = useState<ApprovalEmailPreview | null>(null);
  const [expandedRequestId, setExpandedRequestId] = useState<number | null>(null);
  const visible = requests.filter((request) => filter === "all" || request.request_status === filter);
  const pendingCount = requests.filter((request) => request.request_status === "pending").length;
  const documentLabels = ["PSA Birth Certificate", "Good Moral Certificate", "Medical Certificate"];

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
      const result = await apiRequest<{ message: string; email_preview?: ApprovalEmailPreview | null }>("student_registrations", { method: "PATCH", body: JSON.stringify(body) });
      await load();
      setMessage(result.message);
      setApprovalEmail(result.email_preview ?? null);
      setReview(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to review this registration.");
    } finally {
      setSaving(false);
    }
  }

  async function resendAccountEmail(requestId: number) {
    if (saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await apiRequest<{ message: string; email_preview: ApprovalEmailPreview }>("student_registration_email_retry", {
        method: "POST",
        body: JSON.stringify({ request_id: requestId }),
      });
      setMessage(result.message);
      setApprovalEmail(result.email_preview);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to retry the account email.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="mb-8 overflow-hidden rounded-2xl border bg-white">
    {review && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><section role="alertdialog" aria-modal="true" aria-labelledby="registration-review-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 id="registration-review-title" className="text-lg font-semibold">{review.status === "approved" ? "Approve student application?" : "Reject student application?"}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{review.status === "approved" ? `This approves the application for ${applicantName(review.request)}. Account setup and account details will be handled separately.` : `This will reject the registration request from ${applicantName(review.request)}. No user account will be created.`}</p>{error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}<div className="mt-6 flex justify-end gap-3"><button disabled={saving} onClick={() => { setReview(null); setError(""); }} className="rounded-xl border px-4 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-50">Cancel</button><button disabled={saving} onClick={decide} className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${review.status === "approved" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}>{saving ? "Saving…" : review.status === "approved" ? "Approve application" : "Reject application"}</button></div></section></div>}
    <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><div><p className="text-sm font-medium text-amber-700">Incoming students</p><h2 className="mt-1 font-semibold">Registration requests</h2><p className="mt-1 text-sm text-slate-500">Open a request summary to review applicant information and first-year documents before deciding.</p></div><label className="text-sm text-slate-600">Show <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="ml-2 rounded-lg border bg-white px-3 py-2"><option value="pending">Pending ({pendingCount})</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All requests</option></select></label></div>
    <ol className="mx-5 mt-4 grid gap-2 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950 sm:grid-cols-3">
      <li><span className="font-semibold">1. Review the submitted details.</span> Students no longer need to match a preloaded campus roster.</li>
      <li><span className="font-semibold">2. Confirm program and year level.</span> Review the academic details the student submitted.</li>
      <li><span className="font-semibold">3. Choose an action.</span> Approve or reject the application. Account setup follows separately.</li>
    </ol>
    {message && <p role="status" className="mx-5 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}{approvalEmail && <section className={`mx-5 mt-4 rounded-xl border p-4 ${approvalEmail.delivery_status === "sent" ? "border-emerald-300 bg-emerald-50" : approvalEmail.delivery_status === "failed" ? "border-rose-300 bg-rose-50" : "border-amber-300 bg-amber-50"}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-950">{approvalEmail.delivery_status === "sent" ? "Approval email sent" : approvalEmail.delivery_status === "failed" ? "Email delivery failed · account details preview" : "Demo email preview · not sent"}</h3><p className="mt-1 text-sm text-slate-800">To: {approvalEmail.to}</p><p className="text-sm text-slate-800">Subject: {approvalEmail.subject}</p><p className="mt-1 text-xs leading-5 text-slate-700">{approvalEmail.delivery_detail}</p></div><div className="flex gap-2"><button type="button" disabled={saving} onClick={() => resendAccountEmail(approvalEmail.request_id)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{saving ? "Sending…" : "Retry email"}</button><button type="button" onClick={() => setApprovalEmail(null)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-white">Dismiss</button></div></div><pre className="mt-3 whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700">{approvalEmail.body}</pre></section>}{error && !review && <p role="alert" className="mx-5 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
    <div className="divide-y">{visible.map((request) => { const pending = request.request_status === "pending"; const name = applicantName(request); return <article key={request.request_id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{name}</h3></div><p className="mt-1 text-sm text-slate-600">{request.email}</p><p className="mt-1 text-xs text-slate-500">Date of birth: {formatDate(request.date_of_birth)} · Submitted {formatDate(request.created_at)}</p><p className="mt-1 text-xs text-slate-500">{request.program_code ?? "Program unavailable"} · {request.program_name ?? "Program unavailable"} · Year {request.year_level ?? "—"}</p><p className="mt-1 text-xs text-slate-400">Request REG-{String(request.request_id).padStart(6, "0")}</p></div><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${request.request_status === "pending" ? "bg-amber-50 text-amber-700" : request.request_status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{request.request_status === "pending" ? <Clock3 size={13}/> : request.request_status === "approved" ? <Check size={13}/> : <X size={13}/>} {request.request_status}</span></div>
      <div className="mt-4 flex flex-wrap justify-end gap-2 border-t pt-4">
        <button type="button" onClick={() => setExpandedRequestId((current) => current === request.request_id ? null : request.request_id)} aria-expanded={expandedRequestId === request.request_id} className="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"><Eye size={15}/>{expandedRequestId === request.request_id ? "Hide summary" : "View summary"}</button>
        {pending && <><button disabled={saving} onClick={() => { setError(""); setReview({ request, status: "rejected" }); }} className="rounded-lg border px-3.5 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50">Reject</button><button disabled={saving || !request.program_id || !request.year_level || (request.year_level === 1 && (request.documents.length !== 3 || !request.photo || ((request.processing_fee_receipt_required === true || Number(request.processing_fee_receipt_required) === 1) && !request.processing_fee_receipt)))} onClick={() => { setError(""); setReview({ request, status: "approved" }); }} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"><UserCheck size={15}/>Approve application</button></>}{request.request_status === "approved" && <button disabled={saving} onClick={() => resendAccountEmail(request.request_id)} className="rounded-lg border border-blue-200 px-3.5 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50">{saving ? "Sending…" : "Resend account email"}</button>}
      </div>
      {expandedRequestId === request.request_id && <div className="mt-4 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
        <div><h4 className="text-sm font-semibold text-slate-800">Applicant information</h4><dl className="mt-2 space-y-1.5 text-sm text-slate-600"><div><dt className="inline font-medium">Name: </dt><dd className="inline">{name}</dd></div><div><dt className="inline font-medium">Student number: </dt><dd className="inline">{request.student_number || "Not assigned"}</dd></div><div><dt className="inline font-medium">Email: </dt><dd className="inline">{request.email}</dd></div><div><dt className="inline font-medium">Phone: </dt><dd className="inline">{request.phone || "Not provided"}</dd></div><div><dt className="inline font-medium">Date of birth: </dt><dd className="inline">{formatDate(request.date_of_birth)}</dd></div><div><dt className="inline font-medium">Program: </dt><dd className="inline">{request.program_code ?? "—"} · {request.program_name ?? "Program unavailable"}</dd></div><div><dt className="inline font-medium">Year level: </dt><dd className="inline">{request.year_level ?? "—"}</dd></div><div><dt className="inline font-medium">Submitted: </dt><dd className="inline">{formatDate(request.created_at)}</dd></div></dl></div>
        <div className="sm:col-span-2"><h4 className="text-sm font-semibold text-slate-800">Application form details</h4><dl className="mt-2 grid gap-x-5 gap-y-2 rounded-lg border bg-white p-3 text-sm sm:grid-cols-2 lg:grid-cols-3">{Object.entries(request.application_details ?? {}).filter(([, value]) => Boolean(value?.trim())).map(([key, value])=><div key={key}><dt className="text-xs text-slate-500">{applicationDetailLabels[key] ?? key.replaceAll("_", " ")}</dt><dd className="whitespace-pre-wrap break-words font-medium text-slate-700">{value}</dd></div>)}{!Object.values(request.application_details ?? {}).some((value)=>Boolean(value?.trim()))&&<dd className="text-slate-500">No additional application details.</dd>}</dl></div>
        <div><h4 className="text-sm font-semibold text-slate-800">Uploaded documents</h4>{request.year_level === 1 ? <ul className="mt-2 space-y-2 text-sm">{documentLabels.map((label, index) => { const document = request.documents.find((item) => item.slot_number === index + 1); return <li key={label} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2"><span className="text-slate-700">{label}</span>{document ? <span className="flex items-center gap-3"><a href={apiUrl("student_registration_request_document_file", { document_id: document.document_id })} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-700 underline">View</a><a href={apiUrl("student_registration_request_document_file", { document_id: document.document_id, disposition: "attachment" })} className="inline-flex items-center gap-1 font-medium text-blue-700 hover:text-blue-900"><Download size={14}/>Download</a></span> : <span className="text-rose-600">Not submitted</span>}</li>; })}</ul> : <p className="mt-2 text-sm text-slate-500">Document uploads are required for first-year applicants only.</p>}</div>
        <div><h4 className="text-sm font-semibold text-slate-800">Applicant photo</h4>{request.photo ? <div className="mt-2"><img src={apiUrl("student_registration_request_photo", { request_id: request.request_id })} alt={`${name} applicant photo`} className="h-36 w-36 rounded-lg border border-slate-200 object-cover"/><p className="mt-1 text-xs text-slate-500">{request.photo.original_filename}</p></div> : <p className="mt-2 text-sm text-rose-600">No 2×2 photo submitted</p>}</div>
        <div><h4 className="text-sm font-semibold text-slate-800">Processing fee receipt</h4>{request.processing_fee_receipt ? <div className="mt-2"><a href={apiUrl("student_registration_request_processing_fee_receipt", { request_id: request.request_id })} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-700 underline">View receipt screenshot</a><p className="mt-1 text-xs text-slate-500">{request.processing_fee_receipt.original_filename}</p></div> : <p className="mt-2 text-sm text-slate-500">{request.processing_fee_receipt_required === true || Number(request.processing_fee_receipt_required) === 1 ? <span className="text-rose-600">Required receipt not submitted</span> : "Not required for this application"}</p>}</div>
      </div>}
    </article>; })}{!loading && visible.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No student registration requests in this category.</p>}{loading && <p className="p-8 text-center text-sm text-slate-500">Loading student registration requests…</p>}</div>
  </section>;
}
