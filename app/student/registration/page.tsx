"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, FileUp, XCircle } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { apiRequest } from "@/lib/api";

type DocumentFile = {
  document_id: number;
  slot_number: number;
  original_filename: string;
  size_bytes: number;
};
type RegistrationRequest = {
  request_id: number;
  request_status: "pending" | "approved" | "rejected";
  submitted_at: string;
  reviewed_at: string | null;
  decision_note: string | null;
  documents: DocumentFile[];
};
type RegistrationData = {
  eligible: boolean;
  year_level: number | null;
  term_name: string | null;
  year_label: string | null;
  request: RegistrationRequest | null;
};

const slotLabels = ["Document 1", "Document 2", "Document 3"];
const maximumFileSize = 10 * 1024 * 1024;

function formatDate(value: string) {
  return new Date(value.replace(" ", "T")).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function StudentRegistrationPage() {
  const [data, setData] = useState<RegistrationData | null>(null);
  const [files, setFiles] = useState<(File | null)[]>([null, null, null]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const result = await apiRequest<RegistrationData>("student_document_registrations");
    setData(result);
    setError("");
  }, []);

  useEffect(() => {
    load()
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load registration details."))
      .finally(() => setLoading(false));
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (files.some((file) => !file)) {
      setError("Choose a PDF file for all three document slots.");
      return;
    }
    if (files.some((file) => file && file.size > maximumFileSize)) {
      setError("Each PDF must be 10 MB or smaller.");
      return;
    }

    const body = new FormData();
    files.forEach((file, index) => {
      if (file) body.append(`document_${index + 1}`, file);
    });

    setSaving(true);
    try {
      const result = await apiRequest<{ message: string }>("student_document_registrations", {
        method: "POST",
        body,
      });
      setFiles([null, null, null]);
      setMessage(result.message);
      try {
        await load();
      } catch (refreshError) {
        setError(refreshError instanceof Error
          ? `Documents were submitted, but the status could not refresh: ${refreshError.message}`
          : "Documents were submitted, but the status could not refresh.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to submit your registration documents.");
    } finally {
      setSaving(false);
    }
  }

  const request = data?.request;
  const canSubmit = Boolean(data?.eligible) && request?.request_status !== "pending" && request?.request_status !== "approved";

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar role="student" />
      <main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-7">
            <p className="text-sm font-medium text-blue-600">
              {data?.term_name && data.year_label ? `${data.term_name} · ${data.year_label}` : "First-year student documents"}
            </p>
            <h1 className="mt-1 text-2xl font-bold">Registration</h1>
            <p className="mt-1 text-sm text-slate-500">Submit your supporting PDF files to the registrar for review.</p>
          </div>

          {message && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
          {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

          {loading && <p className="rounded-2xl border bg-white p-6 text-sm text-slate-500">Checking registration eligibility…</p>}
          {!loading && data && !data.eligible && (
            <section className="rounded-2xl border bg-white p-6">
              <h2 className="font-semibold">Registration is not available</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Document registration is available only to first-year students while the active term is the first semester.
              </p>
            </section>
          )}

          {!loading && data?.eligible && (
            <>
              {request && (
                <section className="mb-5 rounded-2xl border bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">Latest submission</h2>
                      <p className="mt-1 text-sm text-slate-500">Submitted {formatDate(request.submitted_at)}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                      request.request_status === "pending" ? "bg-amber-50 text-amber-700"
                        : request.request_status === "approved" ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                    }`}>
                      {request.request_status === "pending" ? <Clock3 size={14} />
                        : request.request_status === "approved" ? <CheckCircle2 size={14} />
                          : <XCircle size={14} />}
                      {request.request_status}
                    </span>
                  </div>
                  {request.decision_note && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">Registrar note: {request.decision_note}</p>}
                  <ul className="mt-3 space-y-1 text-sm text-slate-600">
                    {request.documents.map((document) => (
                      <li key={document.document_id}>{slotLabels[document.slot_number - 1]}: {document.original_filename}</li>
                    ))}
                  </ul>
                </section>
              )}

              {canSubmit ? (
                <form onSubmit={submit} className="space-y-5 rounded-2xl border bg-white p-5 sm:p-6">
                  <div>
                    <h2 className="font-semibold">Required files</h2>
                    <p className="mt-1 text-sm text-slate-500">Upload one PDF in each placeholder slot. Maximum 10 MB per file.</p>
                  </div>
                  {slotLabels.map((label, index) => (
                    <label key={label} className="block rounded-xl border border-dashed border-slate-300 p-4">
                      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
                      <span className="mb-3 flex items-center gap-2 text-xs text-slate-500"><FileUp size={15} /> PDF file, up to 10 MB</span>
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        required
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          setFiles((current) => current.map((item, itemIndex) => itemIndex === index ? file : item));
                        }}
                        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {files[index] && <span className="mt-2 block text-xs text-slate-500">{files[index]?.name}</span>}
                    </label>
                  ))}
                  <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">
                    <FileUp size={17} />{saving ? "Submitting…" : "Submit registration documents"}
                  </button>
                </form>
              ) : (
                <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  {request?.request_status === "pending"
                    ? "Your documents are with the registrar. You can submit again if the request is rejected."
                    : "Your registration documents have been approved for this semester."}
                </p>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
