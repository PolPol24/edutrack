"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleCheck, History, ShieldCheck } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import FaceEnrollmentCapture, { FaceCapture } from "@/components/FaceEnrollmentCapture";
import { apiRequest } from "@/lib/api";

type RecordItem = { attendance_status: string; checked_in_at: string | null; session_date: string; course_code: string; course_title: string; section_code: string; room: string; start_time: string; end_time: string };
type FaceEnrollment = { template_status: string; model_version: string; consent_at: string; created_at: string } | null;

export default function StudentAttendancePage() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [enrollment, setEnrollment] = useState<FaceEnrollment>(null);
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const [capture, setCapture] = useState<FaceCapture | null>(null);
  const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [history, face] = await Promise.all([
      apiRequest<{ records: RecordItem[] }>("student_attendance"),
      apiRequest<{ enrollment: FaceEnrollment }>("student_face"),
    ]);
    setRecords(history.records); setEnrollment(face.enrollment);
  }, []);
  useEffect(() => { void load().catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load attendance." )).finally(() => setLoading(false)); }, [load]);

  async function saveFace() {
    if (!capture || !consent) { setError("Capture your face and confirm the notice first."); return; }
    setBusy(true); setError(""); setMessage("");
    try { const result = await apiRequest<{ message: string }>("student_face", { method: "POST", body: JSON.stringify({ ...capture, face_consent: consent }) }); setMessage(result.message); setCapture(null); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to enroll your face."); }
    finally { setBusy(false); }
  }

  async function revokeFace() {
    setBusy(true); setError("");
    try { const result = await apiRequest<{ message: string }>("student_face", { method: "DELETE" }); setMessage(result.message); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to revoke face enrollment."); }
    finally { setBusy(false); }
  }

  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="student"/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-6xl">
    <div className="mb-7"><p className="text-sm font-medium text-blue-600">Student services</p><h1 className="mt-1 text-2xl font-bold">Face attendance</h1><p className="mt-1 text-sm text-slate-500">Enroll your face once, then check in at the classroom kiosk.</p></div>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-7"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><ShieldCheck/></div><div><h2 className="font-semibold">Face enrollment</h2><p className="text-sm text-slate-500">Local CompreFace enrollment status</p></div></div>
        {enrollment?.template_status === "active" ? <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"><p className="flex items-center gap-2 font-semibold"><CircleCheck size={18}/>Face enrollment is active</p><p className="mt-2">Registered {enrollment.created_at.slice(0, 10)} · {enrollment.model_version}</p><button type="button" disabled={busy} onClick={()=>void revokeFace()} className="mt-3 rounded-lg border border-emerald-300 px-3 py-2 text-xs font-semibold disabled:opacity-50">Revoke face enrollment</button></div> : <>
          <div className="mt-5 space-y-3"><FaceEnrollmentCapture onCapture={setCapture} buttonLabel="Capture my face"/><label className="flex items-start gap-2 text-sm leading-5 text-slate-700"><input type="checkbox" checked={consent} onChange={(event)=>setConsent(event.target.checked)} className="mt-1 accent-blue-600"/>I consent to sending and storing my face images in EduTrack’s local CompreFace service for attendance recognition. I can revoke this enrollment and ask the registrar to verify attendance manually.</label><button type="button" disabled={busy||!capture||!consent} onClick={()=>void saveFace()} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-40">{busy?"Saving…":"Save face enrollment"}</button></div>
        </>}
        {message&&<p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}{error&&<p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <p className="mt-5 text-xs leading-5 text-slate-500">The kiosk checks for one face and a blink on this device, then sends camera images to the local CompreFace service through the PHP API for matching. For accessibility or recognition problems, ask a registrar to verify you.</p>
      </section>
      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="flex items-center gap-3 border-b p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><History/></div><div><h2 className="font-semibold">My attendance history</h2><p className="text-sm text-slate-500">Your latest class attendance records.</p></div></div><div className="divide-y">{records.map((item,index)=><div key={`${item.session_date}-${item.course_code}-${item.section_code}-${index}`} className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5"><div><p className="font-medium">{item.course_code} · {item.section_code}</p><p className="mt-1 text-sm text-slate-500">{item.course_title}</p><p className="mt-1 text-xs text-slate-400">{item.session_date} · {item.room}{item.checked_in_at?` · ${item.checked_in_at.slice(11,16)}`:""}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize">{item.attendance_status}</span></div>)}{!loading&&records.length===0&&<p className="p-10 text-center text-sm text-slate-500">No attendance records yet.</p>}{loading&&<p className="p-8 text-center text-sm text-slate-500">Loading attendance history…</p>}</div></section>
    </div>
  </div></main></div>;
}
