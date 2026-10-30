"use client";

import { useEffect, useState } from "react";
import { Check, Clock3, Download, FileText, X } from "lucide-react";
import { apiDownload, apiRequest } from "@/lib/api";

type DocumentStatus = "pending" | "approved" | "rejected";
type RegistrationDocument = {
  document_id: number;
  slot_number: number;
  original_filename: string;
  size_bytes: number;
};
type RegistrationRequest = {
  request_id: number;
  request_status: DocumentStatus;
  submitted_at: string;
  reviewed_at: string | null;
  decision_note: string | null;
  full_name: string;
  student_number: string | null;
  program_name: string | null;
  year_level: number | null;
  term_name: string;
  year_label: string;
  documents: RegistrationDocument[];
};
type Review = { request: RegistrationRequest; status: "approved" | "rejected" } | null;

const slotLabels = ["Document 1", "Document 2", "Document 3"];

function formatDate(value: string) {
  return new Date(value.replace(" ", "T")).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatSize(bytes: number) {
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function StudentDocumentRegistrationApprovals() {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [review, setReview] = useState<Review>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const visible = requests.filter((request) => filter === "all" || request.request_status === filter);
  const pendingCount = requests.filter((request) => request.request_status === "pending").length;

  async function load() {
    const result = await apiRequest<{ requests: RegistrationRequest[] }>("registrar_student_document_registrations");
    setRequests(result.requests);
    setError("");
  }

  useEffect(() => {
    load()
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load submitted registration documents."))
      .finally(() => setLoading(false));
  }, []);

  async function decide() {
    if (!review || saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await apiRequest<{ message: string }>("registrar_student_document_registrations", {
        method: "PATCH",
        body: JSON.stringify({ request_id: review.request.request_id, status: review.status }),
      });
      await load();
      setMessage(result.message);
      setReview(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to review this registration.");
    } finally {
      setSaving(false);
    }
  }

  async function download(document: RegistrationDocument) {
    setDownloadingId(document.document_id);
    setError("");
    try {
      const blob = await apiDownload("student_registration_document_file", { document_id: document.document_id });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = document.original_filename;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to download this document.");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border bg-white">
      {review && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <section role="alertdialog" aria-modal="true" aria-labelledby="document-review-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="document-review-title" className="text-lg font-semibold">
              {review.status === "approved" ? "Approve submitted documents?" : "Reject submitted documents?"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {review.status === "approved" ? "Mark the uploaded documents as approved for registrar registration." : "Mark these documents as rejected so the student can submit corrected files."}
            </p>
            {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={saving} onClick={() => { setReview(null); setError(""); }} className="rounded-xl border px-4 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-50">
                Cancel
              </button>
              <button type="button" disabled={saving} onClick={decide} className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${review.status === "approved" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}>
                {saving ? "Saving…" : review.status === "approved" ? "Approve documents" : "Reject documents"}
              </button>
            </div>
          </section>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
        <div>
          <p className="text-sm font-medium text-amber-700">First-year, first-semester</p>
          <h2 className="mt-1 font-semibold">Student registration documents</h2>
          <p className="mt-1 text-sm text-slate-500">Review the three submitted PDF files and approve or reject the request.</p>
        </div>
        <label className="text-sm text-slate-600">
          Show{" "}
          <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="ml-2 rounded-lg border bg-white px-3 py-2">
            <option value="pending">Pending ({pendingCount})</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All requests</option>
          </select>
        </label>
      </div>
      {message && <p role="status" className="mx-5 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
      {error && !review && <p role="alert" className="mx-5 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
      <div className="divide-y">
        {visible.map((request) => {
          const pending = request.request_status === "pending";
          return (
            <article key={request.request_id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{request.full_name}</h3>
                    {request.student_number && <span className="text-xs text-slate-500">Student #{request.student_number}</span>}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{request.program_name ?? "Program unavailable"} · Year {request.year_level ?? "—"}</p>
                  <p className="mt-1 text-xs text-slate-500">{request.term_name} · {request.year_label} · Submitted {formatDate(request.submitted_at)}</p>
                  <p className="mt-1 text-xs text-slate-400">Request REG-DOC-{String(request.request_id).padStart(6, "0")}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${pending ? "bg-amber-50 text-amber-700" : request.request_status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                  {pending ? <Clock3 size={13} /> : request.request_status === "approved" ? <Check size={13} /> : <X size={13} />}
                  {request.request_status}
                </span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {request.documents.map((document) => (
                  <button
                    key={document.document_id}
                    type="button"
                    disabled={downloadingId === document.document_id}
                    onClick={() => download(document)}
                    className="flex min-w-0 items-center gap-2 rounded-xl border p-3 text-left hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50"
                  >
                    {downloadingId === document.document_id ? <Download size={16} className="shrink-0 animate-pulse text-blue-600" /> : <FileText size={16} className="shrink-0 text-blue-600" />}
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-slate-700">{slotLabels[document.slot_number - 1]}</span>
                      <span className="block truncate text-xs text-slate-500">{document.original_filename} · {formatSize(document.size_bytes)}</span>
                    </span>
                  </button>
                ))}
              </div>
              {request.decision_note && <p className="mt-3 text-sm text-slate-600">Decision note: {request.decision_note}</p>}
              {pending && (
                <div className="mt-4 flex justify-end gap-2 border-t pt-4">
                  <button type="button" disabled={saving} onClick={() => { setError(""); setReview({ request, status: "rejected" }); }} className="rounded-lg border px-3.5 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50">Reject</button>
                  <button type="button" disabled={saving} onClick={() => { setError(""); setReview({ request, status: "approved" }); }} className="rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">Approve documents</button>
                </div>
              )}
            </article>
          );
        })}
        {!loading && visible.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No document registration requests in this category.</p>}
        {loading && <p className="p-8 text-center text-sm text-slate-500">Loading student document requests…</p>}
      </div>
    </section>
  );
}
