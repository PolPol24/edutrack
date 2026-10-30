"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Clock3, KeyRound, Wifi } from "lucide-react";
import FaceEnrollmentCapture, { FaceCapture } from "@/components/FaceEnrollmentCapture";
import { apiRequest } from "@/lib/api";

type Pairing = { kiosk_id: number; secret: string };
type KioskState = {
  kiosk: { kiosk_name: string; room: string };
  next: { course_code: string; course_title: string; section_code: string; starts_at: string } | null;
  session: null | { session_id: number; status: string; course_code: string; course_title: string; section_code: string; instructor_name: string | null; starts_at: string; attendance_deadline: string; checked_in: number };
  checkin?: { success: boolean; message: string } | null;
};

const pairingKey = "edutrack-attendance-kiosk";

export default function AttendanceKioskPage() {
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [kioskId, setKioskId] = useState(""); const [secret, setSecret] = useState("");
  const [state, setState] = useState<KioskState | null>(null); const [error, setError] = useState("");
  const [result, setResult] = useState(""); const [captureKey, setCaptureKey] = useState(0);
  const [exitOpen, setExitOpen] = useState(false); const [exitPassword, setExitPassword] = useState(""); const [exitError, setExitError] = useState(""); const [exitBusy, setExitBusy] = useState(false);
  const router = useRouter();

  useEffect(() => { const saved = window.localStorage.getItem(pairingKey); if (saved) { try { setPairing(JSON.parse(saved)); } catch { window.localStorage.removeItem(pairingKey); } } }, []);
  const poll = useCallback(async (credentials: Pairing) => {
    const latest = await apiRequest<KioskState>("kiosk_state", { method: "POST", body: JSON.stringify(credentials) });
    setState(latest); setError("");
  }, []);
  useEffect(() => {
    if (!pairing) return;
    void poll(pairing).catch((cause)=>setError(cause instanceof Error?cause.message:"Kiosk connection failed."));
    const timer=window.setInterval(()=>void poll(pairing).catch((cause)=>setError(cause instanceof Error?cause.message:"Kiosk connection failed.")),5000);
    return()=>window.clearInterval(timer);
  },[pairing,poll]);

  function savePairing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const value={kiosk_id:Number(kioskId),secret:secret.trim()};
    window.localStorage.setItem(pairingKey,JSON.stringify(value));setPairing(value);setSecret("");setError("");
  }

  async function submitFace(face: FaceCapture) {
    if (!pairing || !state?.session) return;
    setResult("Checking face…");
    try {
      const response=await apiRequest<KioskState>("kiosk_state",{method:"POST",body:JSON.stringify({...pairing,...face})});
      setState(response); setResult(response.checkin?.message??"Face check completed."); setCaptureKey((value)=>value+1);
    } catch(cause) { setResult(cause instanceof Error?cause.message:"Attendance check-in failed.");setCaptureKey((value)=>value+1); }
  }

  async function returnToDashboard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setExitBusy(true); setExitError("");
    try {
      await apiRequest<{ verified: boolean }>("verify_dashboard_password", { method: "POST", body: JSON.stringify({ password: exitPassword }) });
      router.push("/admin/dashboard");
    } catch (cause) { setExitError(cause instanceof Error ? cause.message : "Password verification failed."); }
    finally { setExitBusy(false); }
  }

  if (!pairing) return <main className="flex min-h-screen items-center justify-center bg-slate-950 p-5 text-white"><form onSubmit={savePairing} className="w-full max-w-md rounded-3xl bg-white p-8 text-slate-900 shadow-2xl">
    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700"><KeyRound/></div><p className="text-sm font-semibold uppercase tracking-wider text-blue-700">EduTrack attendance</p><h1 className="mt-2 text-2xl font-bold">Pair this classroom kiosk</h1><p className="mt-2 text-sm leading-6 text-slate-600">Enter the kiosk number and one-time secret provided by an administrator. Keep this device on in the classroom.</p>
    <label className="mt-6 block text-sm font-medium">Kiosk number<input required type="number" min="1" value={kioskId} onChange={(event)=>setKioskId(event.target.value)} className="mt-1.5 w-full rounded-xl border px-3 py-2.5"/></label>
    <label className="mt-4 block text-sm font-medium">Pairing secret<input required minLength={64} maxLength={64} value={secret} onChange={(event)=>setSecret(event.target.value)} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 font-mono"/></label>
    {error&&<p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<button className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white">Connect kiosk</button>
  </form></main>;

  return <main className="min-h-screen bg-slate-950 px-5 py-7 text-white sm:px-10">
    <header className="mx-auto flex max-w-7xl items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-300">EduTrack face attendance</p><h1 className="mt-1 text-2xl font-bold">{state?.kiosk.room??"Classroom kiosk"}</h1></div><div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm"><Wifi size={16} className={error?"text-rose-400":"text-emerald-400"}/>{error?"Reconnecting":"Connected"}</div></header>
    <section className="mx-auto mt-7 grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
      <div className="flex min-h-[520px] flex-col justify-center rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-8 sm:p-12">
        {error&&<p role="alert" className="mb-5 rounded-xl bg-rose-950/70 p-4 text-sm text-rose-200">{error}</p>}
        {state?.session?<><div className="mb-8 flex items-center gap-2 text-sm font-semibold text-emerald-300"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400"/>ATTENDANCE {state.session.status.toUpperCase()}</div><p className="text-3xl font-bold">{state.session.course_code} · {state.session.section_code}</p><p className="mt-2 text-lg text-slate-300">{state.session.course_title}</p><p className="mt-2 text-sm text-slate-400">{state.session.instructor_name||"Instructor not listed"} · Check-in closes {new Date(`${state.session.attendance_deadline.replace(" ","T")}+08:00`).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</p><div className="mt-10 flex items-end gap-3"><span className="text-6xl font-bold tabular-nums">{state.session.checked_in}</span><span className="pb-2 text-slate-300">students checked in</span></div></>:<><div className="mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-blue-300"><Clock3 size={30}/></div><h2 className="text-3xl font-bold">Waiting for class</h2><p className="mt-3 max-w-lg text-slate-300">Attendance starts automatically when a scheduled class begins.</p>{state?.next&&<div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Up next</p><p className="mt-2 text-lg font-semibold">{state.next.course_code} · {state.next.section_code}</p><p className="mt-1 text-sm text-slate-300">{state.next.course_title} · {state.next.starts_at.slice(0,5)}</p></div>}</>}
      </div>
      <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-7 text-slate-900 sm:p-10">
        {state?.session?.status==="active"?<div className="w-full max-w-md"><div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Camera size={28}/></div><h2 className="text-xl font-bold">Check in with your face</h2><p className="mt-2 text-sm leading-5 text-slate-500">Stand in front of the camera, center one face, and blink when prompted. Five images are sent to the local CompreFace service for matching.</p><div className="mt-5"><FaceEnrollmentCapture key={captureKey} onCapture={(face)=>{if(face)void submitFace(face);}} buttonLabel="Start face check-in"/></div>{result&&<p role="status" className={`mt-4 rounded-xl p-3 text-sm ${result.includes("marked")?"bg-emerald-50 text-emerald-800":"bg-amber-50 text-amber-800"}`}>{result}</p>}</div>:<><div className="flex h-72 w-full max-w-md items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Camera size={58}/></div><p className="mt-5 text-center font-semibold">{state?.session?.status==="paused"?"Attendance is paused":state?.session?.status==="closed"?"Attendance session complete":"Camera will be ready at class time"}</p><p className="mt-2 max-w-xs text-center text-sm text-slate-500">Ask the registrar for staff-verified attendance if face recognition is unavailable.</p></>}
      </div>
    </section>
    <div className="mx-auto mt-5 flex flex-wrap items-center justify-center gap-2"><button type="button" onClick={()=>{setExitPassword("");setExitError("");setExitOpen(true);}} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20">Return to admin dashboard</button><button type="button" onClick={()=>{window.localStorage.removeItem(pairingKey);setPairing(null);setState(null);}} className="rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-white/10 hover:text-white">Unpair this kiosk</button></div>
    {exitOpen&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"><form onSubmit={(event)=>void returnToDashboard(event)} className="w-full max-w-sm rounded-2xl bg-white p-6 text-slate-900 shadow-2xl"><h2 className="text-lg font-semibold">Confirm dashboard access</h2><p className="mt-1 text-sm leading-5 text-slate-600">Enter the password for the signed-in administrator account to leave kiosk attendance mode.</p><label className="mt-5 block text-sm font-medium">Account password<input autoFocus required type="password" autoComplete="current-password" value={exitPassword} onChange={(event)=>setExitPassword(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5"/></label>{exitError&&<p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{exitError}</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={()=>setExitOpen(false)} className="rounded-lg border px-4 py-2 text-sm font-medium">Stay in kiosk</button><button disabled={exitBusy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{exitBusy?"Checking…":"Verify and return"}</button></div></form></div>}
  </main>;
}
