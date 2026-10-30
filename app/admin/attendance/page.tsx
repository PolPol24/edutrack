"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarPlus, KeyRound, MonitorUp, Settings2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { apiRequest } from "@/lib/api";

type Offering = { offering_id: number; section_code: string; course_code: string; course_title: string; instructor_name: string | null };
type Meeting = { meeting_id: number; offering_id: number; section_code: string; course_code: string; course_title: string; instructor_name: string | null; day_of_week: string; start_time: string; end_time: string; room: string };
type Kiosk = { kiosk_id: number; kiosk_name: string; room: string; kiosk_status: string };
type Session = { session_id: number; session_date: string; starts_at: string; session_status: string; room: string; course_code: string; course_title: string; section_code: string; checked_in: number };
type AdminData = { offerings: Offering[]; meetings: Meeting[]; kiosks: Kiosk[]; sessions: Session[]; settings: { grace_minutes: number; attendance_window_minutes:number; face_similarity_threshold: number; face_quality_threshold: number } };

const inputClass = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

export default function AttendanceAdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [offering, setOffering] = useState(""); const [day, setDay] = useState("friday"); const [start, setStart] = useState("16:30"); const [end, setEnd] = useState("18:00"); const [room, setRoom] = useState("Room 201");
  const [kioskName, setKioskName] = useState(""); const [kioskRoom, setKioskRoom] = useState("");
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [grace, setGrace] = useState(10); const [similarity, setSimilarity] = useState(0.5); const [quality, setQuality] = useState(0.6);
  const [windowMinutes,setWindowMinutes]=useState(360);
  const [pairingSecret, setPairingSecret] = useState(""); const [pairingId, setPairingId] = useState(0);
  const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const result = await apiRequest<AdminData>("attendance_admin"); setData(result);
    setGrace(Number(result.settings.grace_minutes)); setWindowMinutes(Number(result.settings.attendance_window_minutes)); setSimilarity(Number(result.settings.face_similarity_threshold)); setQuality(Number(result.settings.face_quality_threshold));
    if (!offering && result.offerings[0]) setOffering(String(result.offerings[0].offering_id));
    if (!kioskRoom && result.meetings[0]) setKioskRoom(result.meetings[0].room);
  }, [offering, kioskRoom]);
  useEffect(() => { void load().catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load attendance administration.")); }, [load]);

  async function submit(event: FormEvent, type: string, body: Record<string, unknown>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const result = await apiRequest<{message:string;secret?:string;kiosk?:{kiosk_id:number}}>("attendance_admin", { method: "POST", body: JSON.stringify({type, ...body}) });
      setMessage(result.message);
      if (result.secret && result.kiosk) { setPairingSecret(result.secret); setPairingId(result.kiosk.kiosk_id); }
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save attendance settings."); }
    finally { setBusy(false); }
  }
  async function setSession(session: Session, status: string) {
    setBusy(true); setError(""); setMessage("");
    try { const result=await apiRequest<{message:string}>("attendance_admin",{method:"PATCH",body:JSON.stringify({session_id:session.session_id,session_status:status})}); setMessage(result.message); await load(); }
    catch(cause){setError(cause instanceof Error?cause.message:"Unable to update this session.");} finally{setBusy(false);}
  }
  async function saveMeeting(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const body={offering_id:Number(offering),day_of_week:day,start_time:start,end_time:end,room};
      const result=await apiRequest<{message:string}>("attendance_admin",{method:editingMeeting?"PATCH":"POST",body:JSON.stringify(editingMeeting?{...body,meeting_id:editingMeeting.meeting_id}:{type:"meeting",...body})});
      setMessage(result.message); setEditingMeeting(null); setRoom(""); await load();
    } catch(cause){setError(cause instanceof Error?cause.message:"Unable to save the class meeting.");} finally{setBusy(false);}
  }
  async function removeMeeting(meeting: Meeting) {
    if(!window.confirm(`Remove ${meeting.course_code} from ${meeting.room} on ${meeting.day_of_week}?`))return;
    setBusy(true);setError("");setMessage("");
    try{const result=await apiRequest<{message:string}>("attendance_admin",{method:"PATCH",body:JSON.stringify({meeting_id:meeting.meeting_id,delete:true})});setMessage(result.message);await load();}
    catch(cause){setError(cause instanceof Error?cause.message:"Unable to remove this class meeting.");}finally{setBusy(false);}
  }
  async function startSession(meeting:Meeting){
    setBusy(true);setError("");setMessage("");
    try{const result=await apiRequest<{message:string}>("attendance_admin",{method:"POST",body:JSON.stringify({type:"start_session",meeting_id:meeting.meeting_id})});setMessage(result.message);await load();}
    catch(cause){setError(cause instanceof Error?cause.message:"Unable to start this session.");}finally{setBusy(false);}
  }
  async function manageKiosk(kiosk:Kiosk, action:"reissue"|"revoke") {
    if(action==="revoke"&&!window.confirm(`Revoke access for ${kiosk.kiosk_name}?`))return;
    setBusy(true);setError("");setMessage("");
    try{const result=await apiRequest<{message:string;secret?:string}>("attendance_admin",{method:"PATCH",body:JSON.stringify({kiosk_id:kiosk.kiosk_id,kiosk_action:action})});setMessage(result.message);if(result.secret){setPairingSecret(result.secret);setPairingId(kiosk.kiosk_id);}await load();}
    catch(cause){setError(cause instanceof Error?cause.message:"Unable to update this kiosk.");}finally{setBusy(false);}
  }
  function editSchedule(meeting:Meeting){setEditingMeeting(meeting);setOffering(String(meeting.offering_id));setDay(meeting.day_of_week);setStart(meeting.start_time.slice(0,5));setEnd(meeting.end_time.slice(0,5));setRoom(meeting.room);window.scrollTo({top:0,behavior:"smooth"});}

  const rooms = [...new Set(data?.meetings.map((meeting)=>meeting.room) ?? [])];
  return <div className="flex min-h-screen bg-[#f8fafc]"><Sidebar role="admin"/><main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-7xl">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-blue-600">Classroom attendance</p><h1 className="mt-1 text-2xl font-bold">Schedules & kiosks</h1><p className="mt-1 text-sm text-slate-500">Set classroom meetings, pair display devices, and manage attendance windows.</p></div><Link href="/attendance/kiosk" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Enter Room 201 kiosk mode</Link></div>
    {message&&<p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}{error&&<p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
    {pairingSecret&&<section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex items-start gap-3"><KeyRound className="mt-0.5 text-amber-700"/><div className="min-w-0 flex-1"><h2 className="font-semibold text-amber-950">Save this kiosk pairing secret</h2><p className="mt-1 text-sm text-amber-900">Kiosk {pairingId}. This secret is shown only once. Enter it on the classroom display at <span className="font-medium">/attendance/kiosk</span>.</p><code className="mt-3 block break-all rounded-xl bg-white p-3 text-xs text-slate-800">{pairingSecret}</code><button onClick={()=>navigator.clipboard?.writeText(pairingSecret)} className="mt-3 rounded-lg border border-amber-300 px-3 py-1.5 text-sm font-medium text-amber-900">Copy secret</button><button onClick={()=>setPairingSecret("")} className="ml-2 rounded-lg px-3 py-1.5 text-sm text-amber-900">Dismiss</button></div></div></section>}
    <div className="grid gap-5 xl:grid-cols-3">
      <form onSubmit={(event)=>void saveMeeting(event)} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><CalendarPlus className="text-blue-600" size={19}/><h2 className="font-semibold">{editingMeeting?"Edit class schedule":"Schedule a class"}</h2></div><label className="mt-5 block text-sm font-medium">Course and section<select required value={offering} onChange={(event)=>setOffering(event.target.value)} className={inputClass}>{data?.offerings.map((item)=><option key={item.offering_id} value={item.offering_id}>{item.course_code} · {item.section_code} — {item.course_title}</option>)}</select></label><label className="mt-3 block text-sm font-medium">Day<select value={day} onChange={(event)=>setDay(event.target.value)} className={inputClass}>{["monday","tuesday","wednesday","thursday","friday","saturday"].map((item)=><option key={item} value={item}>{item[0].toUpperCase()+item.slice(1)}</option>)}</select></label><div className="mt-3 grid grid-cols-2 gap-3"><label className="text-sm font-medium">Starts<input type="time" required value={start} onChange={(event)=>setStart(event.target.value)} className={inputClass}/></label><label className="text-sm font-medium">Ends<input type="time" required value={end} onChange={(event)=>setEnd(event.target.value)} className={inputClass}/></label></div><label className="mt-3 block text-sm font-medium">Classroom<input required value={room} onChange={(event)=>setRoom(event.target.value)} maxLength={100} className={inputClass} placeholder="Room 201"/></label><button disabled={busy||!data?.offerings.length} className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{editingMeeting?"Update schedule":"Save schedule"}</button>{editingMeeting&&<button type="button" onClick={()=>{setEditingMeeting(null);setRoom("");}} className="mt-2 w-full rounded-xl border px-4 py-2 text-sm">Cancel edit</button>}</form>
      <form onSubmit={(event)=>void submit(event,"kiosk",{kiosk_name:kioskName,room:kioskRoom})} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><MonitorUp className="text-blue-600" size={19}/><h2 className="font-semibold">Register classroom kiosk</h2></div><p className="mt-2 text-sm leading-5 text-slate-500">A kiosk is tied to one room and can only show that room’s scheduled class.</p><label className="mt-4 block text-sm font-medium">Device name<input required value={kioskName} onChange={(event)=>setKioskName(event.target.value)} className={inputClass} placeholder="Room 201 display"/></label><label className="mt-3 block text-sm font-medium">Classroom<select required value={kioskRoom} onChange={(event)=>setKioskRoom(event.target.value)} className={inputClass}>{rooms.map((item)=><option key={item}>{item}</option>)}</select></label><button disabled={busy||!rooms.length} className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Register device</button><div className="mt-4 space-y-2">{data?.kiosks.map((item)=><div key={item.kiosk_id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm"><div className="flex justify-between"><span>{item.kiosk_name} · {item.room}</span><span className={item.kiosk_status==="active"?"text-emerald-700":"text-rose-700"}>{item.kiosk_status}</span></div><div className="mt-2 flex gap-2"><button type="button" disabled={busy} onClick={()=>void manageKiosk(item,"reissue")} className="rounded-md border bg-white px-2 py-1 text-xs">Re-pair device</button>{item.kiosk_status==="active"&&<button type="button" disabled={busy} onClick={()=>void manageKiosk(item,"revoke")} className="rounded-md border border-rose-200 bg-white px-2 py-1 text-xs text-rose-700">Revoke</button>}</div>{item.kiosk_status==="active"&&<Link href="/attendance/kiosk" className="mt-2 inline-flex rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100">{item.room === "Room 201" ? "Enter Room 201 kiosk mode" : "Enter kiosk attendance mode"}</Link>}</div>)}</div></form>
      <form onSubmit={(event)=>void submit(event,"settings",{grace_minutes:grace,attendance_window_minutes:windowMinutes,face_similarity_threshold:similarity,face_quality_threshold:quality})} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Settings2 className="text-blue-600" size={19}/><h2 className="font-semibold">Attendance rules</h2></div><label className="mt-5 block text-sm font-medium">Grace period (minutes)<input type="number" min="0" max="60" value={grace} onChange={(event)=>setGrace(Number(event.target.value))} className={inputClass}/></label><label className="mt-3 block text-sm font-medium">Attendance window (minutes)<input type="number" min="15" max="480" value={windowMinutes} onChange={(event)=>setWindowMinutes(Number(event.target.value))} className={inputClass}/></label><label className="mt-3 block text-sm font-medium">Face match threshold (0.30–0.90)<input type="number" min="0.3" max="0.9" step="0.01" value={similarity} onChange={(event)=>setSimilarity(Number(event.target.value))} className={inputClass}/></label><label className="mt-3 block text-sm font-medium">Anti-spoof and liveness confidence (0.40–0.95)<input type="number" min="0.4" max="0.95" step="0.01" value={quality} onChange={(event)=>setQuality(Number(event.target.value))} className={inputClass}/></label><p className="mt-3 text-xs leading-5 text-slate-500">Attendance closes at the earlier of the configured window or class end. Higher face thresholds reduce false matches but can make check-in harder.</p><button disabled={busy} className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Save rules</button></form>
    </div>
    <section className="mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="border-b p-5"><h2 className="font-semibold">Scheduled classroom meetings</h2><p className="mt-1 text-sm text-slate-500">Room conflicts are rejected. Meetings with attendance history are locked against edits.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Day","Time","Course","Section","Room","Instructor",""].map((label)=><th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y">{data?.meetings.map((item)=><tr key={item.meeting_id}><td className="px-4 py-3 capitalize">{item.day_of_week}</td><td className="px-4 py-3">{item.start_time.slice(0,5)}–{item.end_time.slice(0,5)}</td><td className="px-4 py-3">{item.course_code} · {item.course_title}</td><td className="px-4 py-3">{item.section_code}</td><td className="px-4 py-3">{item.room}</td><td className="px-4 py-3">{item.instructor_name||"—"}</td><td className="px-4 py-3"><div className="flex gap-2"><button disabled={busy} onClick={()=>void startSession(item)} className="rounded-md border border-emerald-200 px-2 py-1 text-xs text-emerald-700">Start today</button><button onClick={()=>editSchedule(item)} className="rounded-md border px-2 py-1 text-xs">Edit</button><button disabled={busy} onClick={()=>void removeMeeting(item)} className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700">Remove</button></div></td></tr>)}</tbody></table>{!data?.meetings.length&&<p className="p-8 text-center text-sm text-slate-500">No class meetings are scheduled yet.</p>}</div></section>
    <section className="mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="border-b p-5"><h2 className="font-semibold">Attendance sessions</h2><p className="mt-1 text-sm text-slate-500">One session is created per scheduled class and date; Face recognition is used for each scheduled class and date.</p></div><div className="divide-y">{data?.sessions.map((item)=><div key={item.session_id} className="flex flex-wrap items-center justify-between gap-4 p-4 sm:px-5"><div><p className="font-medium">{item.course_code} · {item.section_code} <span className="font-normal text-slate-500">· {item.room}</span></p><p className="mt-1 text-sm text-slate-500">{item.session_date} · {item.starts_at.slice(11,16)} · {item.checked_in} checked in</p></div><div className="flex items-center gap-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs capitalize text-slate-700">{item.session_status}</span>{item.session_status!=="closed"&&<><button disabled={busy} onClick={()=>void setSession(item,item.session_status==="paused"?"active":"paused")} className="rounded-lg border px-3 py-1.5 text-xs font-medium">{item.session_status==="paused"?"Resume":"Pause"}</button><button disabled={busy} onClick={()=>void setSession(item,"closed")} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700">Close</button></>}</div></div>)}{!data?.sessions.length&&<p className="p-8 text-center text-sm text-slate-500">Sessions appear automatically when scheduled classes begin.</p>}</div></section>
  </div></main></div>;
}
