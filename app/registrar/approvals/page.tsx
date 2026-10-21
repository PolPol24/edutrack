"use client";

import { useEffect, useState } from "react";
import { Check, CheckCheck, Clock3, X } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { apiRequest } from "@/lib/api";
import StudentRegistrationApprovals from "@/components/StudentRegistrationApprovals";

type RequestStatus = "pending" | "approved" | "rejected";
type EnrollmentRequest = {
  request_code: string;
  enrollment_status: RequestStatus;
  requested_at: string;
  student_number: string;
  student_name: string;
  program_name: string;
  course_code: string;
  course_title: string;
  units: number | string;
};
type Confirmation =
  | { kind: "all" }
  | { kind: "single"; request: EnrollmentRequest; status: "approved" | "rejected" }
  | null;

function formatDate(value: string) {
  return new Date(value.replace(" ", "T")).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function Page() {
  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [confirmationError, setConfirmationError] = useState("");
  const pendingCount = requests.filter((request) => request.enrollment_status === "pending").length;
  const visible = requests.filter((request) => filter === "all" || request.enrollment_status === filter);

  async function refresh(): Promise<EnrollmentRequest[]> {
    const response = await apiRequest<{ requests: EnrollmentRequest[] }>("approvals");
    setRequests(response.requests);
    setLoadError("");
    return response.requests;
  }

  useEffect(() => {
    refresh()
      .catch((requestError: unknown) => {
        setLoadError(requestError instanceof Error ? requestError.message : "Unable to load enrollment requests.");
      })
      .finally(() => setLoading(false));
  }, []);

  async function updateStatus(requestCode: string, status: "approved" | "rejected") {
    if (updating) return;
    setUpdating(true);
    setMessage("");
    setConfirmationError("");
    try {
      const response = await apiRequest<{ message?: string } | null>("approvals", {
        method: "PATCH",
        body: JSON.stringify({ request_code: requestCode, status }),
      });
      await refresh();
      setMessage(response?.message ?? `Request was ${status}.`);
      setConfirmation(null);
    } catch (requestError) {
      setConfirmationError(requestError instanceof Error ? requestError.message : "Unable to update this request.");
    } finally {
      setUpdating(false);
    }
  }

  async function approveAll() {
    if (updating) return;
    setUpdating(true);
    setMessage("");
    setConfirmationError("");
    const pendingRequests = requests.filter((request) => request.enrollment_status === "pending");
    try {
      const results = await Promise.allSettled(
        pendingRequests.map((request) =>
            apiRequest("approvals", {
              method: "PATCH",
              body: JSON.stringify({ request_code: request.request_code, status: "approved" }),
            }),
        ),
      );
      const failedCount = results.filter((result) => result.status === "rejected").length;
      const refreshedRequests = await refresh();
      if (failedCount === 0) {
        setMessage("All pending enrollment requests were approved.");
        setConfirmation(null);
      } else {
        const remainingPending = refreshedRequests.filter((request) => request.enrollment_status === "pending").length;
        setConfirmationError(`Approved ${pendingRequests.length - failedCount} of ${pendingRequests.length} requests. ${remainingPending > 0 ? "Some requests are still pending; you can retry." : "Close this window and review the refreshed list."}`);
      }
    } catch (requestError) {
      setConfirmationError(requestError instanceof Error ? requestError.message : "Unable to approve all requests.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar role="registrar" />
      {confirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <section role="alertdialog" aria-modal="true" aria-labelledby="approval-confirm-title" aria-describedby="approval-confirm-description" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="approval-confirm-title" className="text-lg font-semibold text-slate-900">
              {confirmation.kind === "all" ? "Approve all pending requests?" : confirmation.status === "approved" ? "Approve this request?" : "Reject this request?"}
            </h2>
            <p id="approval-confirm-description" className="mt-2 text-sm leading-6 text-slate-600">
              {confirmation.kind === "all"
                ? `This will approve ${pendingCount} pending enrollment ${pendingCount === 1 ? "request" : "requests"}.`
                : `${confirmation.status === "approved" ? "Approve" : "Reject"} ${confirmation.request.student_name}'s request to enroll in ${confirmation.request.course_code} · ${confirmation.request.course_title}?`}
            </p>
            {confirmationError && <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3.5 py-3 text-sm text-rose-700">{confirmationError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={updating} onClick={() => { setConfirmation(null); setConfirmationError(""); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                {confirmationError && confirmation.kind === "all" && pendingCount === 0 ? "Close" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={updating || (confirmation.kind === "all" && pendingCount === 0)}
                onClick={() => confirmation.kind === "all" ? approveAll() : updateStatus(confirmation.request.request_code, confirmation.status)}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-50 ${confirmation.kind === "single" && confirmation.status === "rejected" ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"}`}
              >
                {updating ? "Saving…" : confirmation.kind === "all" ? "Approve all" : confirmation.status === "approved" ? "Approve request" : "Reject request"}
              </button>
            </div>
          </section>
        </div>
      )}
      <main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8">
        <div className="mx-auto max-w-6xl"><StudentRegistrationApprovals /></div>
        <div className="mx-auto max-w-6xl">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-amber-700">Enrollment workflow</p>
              <h1 className="mt-1 text-2xl font-bold">Approvals</h1>
              <p className="mt-1 text-sm text-slate-500">Review student enrollment requests and record a decision.</p>
            </div>
            <button
              onClick={() => { setConfirmationError(""); setConfirmation({ kind: "all" }); }}
              disabled={!pendingCount || updating}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <CheckCheck size={16} />Approve all pending
            </button>
          </div>
          {message && (
            <p role="status" className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              {message}
            </p>
          )}
          {loadError && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{loadError}</p>}
          <div className="mb-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border bg-white p-4">
              <p className="text-sm text-slate-500">Awaiting review</p>
              <p className="mt-1 text-2xl font-bold">{pendingCount}</p>
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <p className="text-sm text-slate-500">Approved</p>
              <p className="mt-1 text-2xl font-bold">{requests.filter((request) => request.enrollment_status === "approved").length}</p>
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <p className="text-sm text-slate-500">Rejected</p>
              <p className="mt-1 text-2xl font-bold">{requests.filter((request) => request.enrollment_status === "rejected").length}</p>
            </div>
          </div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Enrollment requests</h2>
              <p className="mt-1 text-sm text-slate-500">Confirm prerequisites and available units before approval.</p>
            </div>
            <label className="text-sm text-slate-600">
              Show{" "}
              <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="ml-2 rounded-lg border bg-white px-3 py-2">
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="all">All requests</option>
              </select>
            </label>
          </div>
          <div className="space-y-3">
            {visible.map((request) => {
              const status = request.enrollment_status;
              return (
                <article key={request.request_code} className="rounded-2xl border bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{request.student_name}</h3>
                        <span className="text-xs text-slate-500">
                          {request.student_number} · {request.program_name}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-slate-700">
                        {request.course_code} · {request.course_title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {request.units} units · Submitted {formatDate(request.requested_at)} · Request {request.request_code}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      status === "pending" ? "bg-amber-50 text-amber-700" :
                      status === "approved" ? "bg-emerald-50 text-emerald-700" :
                      "bg-rose-50 text-rose-700"
                    }`}>
                      {status === "pending" ? <Clock3 size={13} /> : status === "approved" ? <Check size={13} /> : <X size={13} />}
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                  </div>
                  {status === "pending" && (
                    <div className="mt-4 flex justify-end gap-2 border-t pt-4">
                      <button disabled={updating} onClick={() => { setConfirmationError(""); setConfirmation({ kind: "single", request, status: "rejected" }); }} className="rounded-lg border px-3.5 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-wait disabled:opacity-50">
                        Reject
                      </button>
                      <button disabled={updating} onClick={() => { setConfirmationError(""); setConfirmation({ kind: "single", request, status: "approved" }); }} className="rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-50">
                        Approve request
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
            {!loading && visible.length === 0 && (
              <p className="rounded-2xl border bg-white p-10 text-center text-sm text-slate-500">No requests in this category.</p>
            )}
            {loading && (
              <p className="rounded-2xl border bg-white p-10 text-center text-sm text-slate-500">Loading enrollment requests…</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
