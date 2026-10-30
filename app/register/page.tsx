"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Eye, EyeOff, FileUp, GraduationCap, LockKeyhole, Mail, Phone, UserRound } from "lucide-react";
import { apiRequest } from "@/lib/api";
import FaceEnrollmentCapture, { FaceCapture } from "@/components/FaceEnrollmentCapture";

type Program = { program_id: string; program_code: string; program_name: string };

function localDateString(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export default function StudentRegistrationPage() {
  const [studentNumber, setStudentNumber] = useState("");
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programId, setProgramId] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [suffix, setSuffix] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [documentFiles, setDocumentFiles] = useState<(File | null)[]>([null, null, null]);
  const [faceCapture, setFaceCapture] = useState<FaceCapture | null>(null);
  const [faceConsent, setFaceConsent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const maxDate = useMemo(() => localDateString(new Date()), []);

  useEffect(() => {
    void apiRequest<{ programs: Program[] }>("student_registration_options")
      .then(({ programs: availablePrograms }) => {
        setPrograms(availablePrograms);
        if (availablePrograms.length === 1) setProgramId(availablePrograms[0].program_id);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Unable to load academic programs.");
      });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    if (!faceCapture || !faceConsent) {
      setError("Complete face enrollment and confirm the face data notice to submit your registration.");
      return;
    }
    if (yearLevel === "1" && documentFiles.some((file) => !file)) {
      setError("First-year applicants must upload all three required documents.");
      return;
    }
    if (documentFiles.some((file) => file && file.size > 10 * 1024 * 1024)) {
      setError("Each document must be 10 MB or smaller.");
      return;
    }
    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("registration_data", JSON.stringify({
        student_number: studentNumber,
        program_id: programId,
        year_level: Number(yearLevel),
        first_name: firstName,
        last_name: lastName,
        suffix,
        date_of_birth: dateOfBirth,
        email,
        phone,
        password,
        ...faceCapture,
        face_consent: faceConsent,
      }));
      if (yearLevel === "1") {
        documentFiles.forEach((file, index) => {
          if (file) body.append(`document_${index + 1}`, file);
        });
      }
      const result = await apiRequest<{ request_id: number }>("student_registrations", {
        method: "POST",
        body,
      });
      setRequestId(result.request_id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to submit your registration request.");
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
    <div className="mx-auto max-w-2xl">
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-700"><ArrowLeft size={16}/>Back to sign in</Link>
      <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="bg-slate-950 px-6 py-7 text-white sm:px-9"><div className="mb-4 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600"><GraduationCap size={22}/></div><span className="text-lg font-semibold">EduTrack</span><span className="rounded-full bg-blue-500/20 px-2.5 py-1 text-xs font-medium text-blue-200">Student registration</span></div><h1 className="text-2xl font-semibold">Create your student account</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Submit your details for registrar review. Your account will be created only after your request is approved.</p></div>
        {requestId ? <div className="p-6 sm:p-9"><div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-700"><UserRound size={22}/></div><h2 className="text-xl font-semibold">Request submitted</h2><p className="mt-2 text-sm leading-6 text-slate-600">Your registration request <span className="font-semibold">#{requestId}</span> is now waiting for registrar approval. You can sign in after it is approved.</p><Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700">Return to sign in <ArrowRight size={16}/></Link></div> : <form onSubmit={submit} className="space-y-5 p-6 sm:p-9">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">Student number<input required maxLength={30} autoComplete="off" value={studentNumber} onChange={(event)=>setStudentNumber(event.target.value)} placeholder="Enter your student number" className="mt-1.5 w-full rounded-xl border px-3.5 py-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></label>
            <label className="text-sm font-medium text-slate-700">Program<select required value={programId} onChange={(event)=>setProgramId(event.target.value)} className="mt-1.5 w-full rounded-xl border bg-white px-3.5 py-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"><option value="">Select a program</option>{programs.map((program)=><option key={program.program_id} value={program.program_id}>{program.program_code} · {program.program_name}</option>)}</select></label>
            <label className="text-sm font-medium text-slate-700">Year level<select required value={yearLevel} onChange={(event)=>{ setYearLevel(event.target.value); if (event.target.value !== "1") setDocumentFiles([null, null, null]); }} className="mt-1.5 w-full rounded-xl border bg-white px-3.5 py-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"><option value="">Select year level</option><option value="1">Year 1</option><option value="2">Year 2</option><option value="3">Year 3</option><option value="4">Year 4</option></select></label>
            <label className="text-sm font-medium text-slate-700">Date of birth<input required type="date" max={maxDate} value={dateOfBirth} onChange={(event)=>setDateOfBirth(event.target.value)} className="mt-1.5 w-full rounded-xl border px-3.5 py-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></label>
            <label className="text-sm font-medium text-slate-700">First name<input required maxLength={80} autoComplete="given-name" value={firstName} onChange={(event)=>setFirstName(event.target.value)} className="mt-1.5 w-full rounded-xl border px-3.5 py-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></label>
            <label className="text-sm font-medium text-slate-700">Last name<input required maxLength={80} autoComplete="family-name" value={lastName} onChange={(event)=>setLastName(event.target.value)} className="mt-1.5 w-full rounded-xl border px-3.5 py-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></label>
            <label className="text-sm font-medium text-slate-700">Suffix <span className="font-normal text-slate-400">(optional)</span><input maxLength={20} value={suffix} onChange={(event)=>setSuffix(event.target.value)} placeholder="Jr., III, etc." className="mt-1.5 w-full rounded-xl border px-3.5 py-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></label>
            <label className="text-sm font-medium text-slate-700">Email address<div className="relative mt-1.5"><Mail size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/><input required type="email" maxLength={254} autoComplete="email" value={email} onChange={(event)=>setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-xl border py-3 pl-10 pr-3.5 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></div></label>
            <label className="text-sm font-medium text-slate-700">Phone number <span className="font-normal text-slate-400">(optional)</span><div className="relative mt-1.5"><Phone size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/><input type="tel" maxLength={40} autoComplete="tel" value={phone} onChange={(event)=>setPhone(event.target.value)} placeholder="Enter your phone number" className="w-full rounded-xl border py-3 pl-10 pr-3.5 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></div></label>
          </div>
          <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
            <div><h2 className="font-semibold text-slate-800">Face enrollment for attendance</h2><p className="mt-1 text-sm leading-5 text-slate-600">Your camera is checked for liveness on this device. Five face images are then sent to and stored by EduTrack’s self-hosted CompreFace service on this computer for attendance matching in your enrolled class. You can ask the registrar to remove your enrollment.</p></div>
            <FaceEnrollmentCapture onCapture={setFaceCapture} />
            <label className="flex items-start gap-2 text-sm leading-5 text-slate-700"><input required type="checkbox" checked={faceConsent} onChange={(event)=>setFaceConsent(event.target.checked)} className="mt-1 accent-blue-600"/>I consent to sending and storing my face images in EduTrack’s local CompreFace service for attendance recognition.</label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">Password<div className="relative mt-1.5"><LockKeyhole size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/><input required minLength={8} autoComplete="new-password" type={showPassword ? "text" : "password"} value={password} onChange={(event)=>setPassword(event.target.value)} className="w-full rounded-xl border py-3 pl-10 pr-11 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={()=>setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div><span className="mt-1 block text-xs font-normal text-slate-500">At least 8 characters.</span></label>
            <label className="text-sm font-medium text-slate-700">Confirm password<input required minLength={8} autoComplete="new-password" type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(event)=>setConfirmPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border px-3.5 py-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></label>
          </div>
          <section className={`space-y-4 rounded-2xl border p-4 ${yearLevel === "1" ? "border-amber-200 bg-amber-50/60" : "border-slate-200 bg-slate-50"}`}>
            <div>
              <h2 className="font-semibold text-slate-800">First-year registration documents</h2>
              <p className="mt-1 text-sm leading-5 text-slate-600">
                {yearLevel === "1"
                  ? "Upload one PDF for each required document. The registrar will review them with your registration request. Maximum 10 MB each."
                  : "These documents are required for Year 1 applicants. Select Year 1 above to enable the required upload fields."}
              </p>
            </div>
            {["PSA Birth Certificate", "Form 137", "Good Moral Certificate"].map((label, index) => (
              <label key={label} className={`block rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm font-medium text-slate-700 ${yearLevel !== "1" ? "opacity-60" : ""}`}>
                <span className="mb-2 block">{label}</span>
                <span className="mb-3 flex items-center gap-2 text-xs font-normal text-slate-500"><FileUp size={15}/>PDF file, up to 10 MB</span>
                <input required={yearLevel === "1"} disabled={yearLevel !== "1"} type="file" accept=".pdf,application/pdf" onChange={(event)=>{ const file = event.target.files?.[0] ?? null; setDocumentFiles((current)=>current.map((item,itemIndex)=>itemIndex===index?file:item)); }} className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 disabled:cursor-not-allowed"/>
                {documentFiles[index] && <span className="mt-2 block text-xs font-normal text-slate-500">{documentFiles[index]?.name}</span>}
              </label>
            ))}
          </section>
          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          <button disabled={submitting} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">{submitting ? "Submitting request…" : "Submit registration request"}<ArrowRight size={17}/></button>
          <p className="text-center text-xs leading-5 text-slate-400">Student accounts remain unavailable until a registrar approves the request. Your password is stored securely as a hash.</p>
        </form>}
      </section>
      <p className="mt-5 text-center text-xs text-slate-400">Registration is available for student accounts only.</p>
    </div>
  </main>;
}
