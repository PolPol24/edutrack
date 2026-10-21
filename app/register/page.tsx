"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Eye, EyeOff, GraduationCap, LockKeyhole, Mail, UserRound } from "lucide-react";
import { apiRequest } from "@/lib/api";

function localDateString(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export default function StudentRegistrationPage() {
  const [studentNumber, setStudentNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [suffix, setSuffix] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const maxDate = useMemo(() => localDateString(new Date()), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await apiRequest<{ request_id: number }>("student_registrations", {
        method: "POST",
        body: JSON.stringify({
          student_number: studentNumber,
          first_name: firstName,
          last_name: lastName,
          suffix,
          date_of_birth: dateOfBirth,
          email,
          password,
        }),
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
            <label className="text-sm font-medium text-slate-700">Student number<input required maxLength={30} autoComplete="off" value={studentNumber} onChange={(event)=>setStudentNumber(event.target.value)} placeholder="Enter your assigned student number" className="mt-1.5 w-full rounded-xl border px-3.5 py-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></label>
            <label className="text-sm font-medium text-slate-700">Date of birth<input required type="date" max={maxDate} value={dateOfBirth} onChange={(event)=>setDateOfBirth(event.target.value)} className="mt-1.5 w-full rounded-xl border px-3.5 py-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></label>
            <label className="text-sm font-medium text-slate-700">First name<input required maxLength={80} autoComplete="given-name" value={firstName} onChange={(event)=>setFirstName(event.target.value)} className="mt-1.5 w-full rounded-xl border px-3.5 py-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></label>
            <label className="text-sm font-medium text-slate-700">Last name<input required maxLength={80} autoComplete="family-name" value={lastName} onChange={(event)=>setLastName(event.target.value)} className="mt-1.5 w-full rounded-xl border px-3.5 py-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></label>
            <label className="text-sm font-medium text-slate-700">Suffix <span className="font-normal text-slate-400">(optional)</span><input maxLength={20} value={suffix} onChange={(event)=>setSuffix(event.target.value)} placeholder="Jr., III, etc." className="mt-1.5 w-full rounded-xl border px-3.5 py-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></label>
            <label className="text-sm font-medium text-slate-700">Email address<div className="relative mt-1.5"><Mail size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/><input required type="email" maxLength={254} autoComplete="email" value={email} onChange={(event)=>setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-xl border py-3 pl-10 pr-3.5 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></div></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">Password<div className="relative mt-1.5"><LockKeyhole size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/><input required minLength={8} autoComplete="new-password" type={showPassword ? "text" : "password"} value={password} onChange={(event)=>setPassword(event.target.value)} className="w-full rounded-xl border py-3 pl-10 pr-11 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={()=>setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div><span className="mt-1 block text-xs font-normal text-slate-500">At least 8 characters.</span></label>
            <label className="text-sm font-medium text-slate-700">Confirm password<input required minLength={8} autoComplete="new-password" type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(event)=>setConfirmPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border px-3.5 py-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></label>
          </div>
          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          <button disabled={submitting} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">{submitting ? "Submitting request…" : "Submit registration request"}<ArrowRight size={17}/></button>
          <p className="text-center text-xs leading-5 text-slate-400">Student accounts remain unavailable until a registrar approves the request. Your password is stored securely as a hash.</p>
        </form>}
      </section>
      <p className="mt-5 text-center text-xs text-slate-400">Registration is available for student accounts only.</p>
    </div>
  </main>;
}
