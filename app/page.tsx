"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, GraduationCap, LockKeyhole, Mail } from "lucide-react";

const demoAccounts = [
  { role: "Student", email: "student@edutrack.edu", href: "/student/dashboard", color: "bg-blue-100 text-blue-700" },
  { role: "Faculty", email: "faculty@edutrack.edu", href: "/faculty/dashboard", color: "bg-emerald-100 text-emerald-700" },
  { role: "Registrar", email: "registrar@edutrack.edu", href: "/registrar/dashboard", color: "bg-amber-100 text-amber-700" },
  { role: "Admin", email: "admin@edutrack.edu", href: "/admin/dashboard", color: "bg-slate-200 text-slate-700" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const account = demoAccounts.find((candidate) => candidate.email === email.trim().toLowerCase());

    if (!account || password !== "password") {
      setError("We couldn’t find a matching account. Check your email and password and try again.");
      return;
    }

    router.push(account.href);
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-white">
      <section className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-slate-950 p-12 text-white">
        <div className="absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full border border-white/10" />
        <div className="absolute -right-16 -top-16 h-[22rem] w-[22rem] rounded-full border border-white/10" />
        <div className="absolute -bottom-48 -left-40 h-[34rem] w-[34rem] rounded-full bg-blue-600/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-600"><GraduationCap size={24} /></div>
          <span className="text-xl font-semibold tracking-tight">EduTrack</span>
        </div>
        <div className="relative max-w-lg">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">Student Information System</p>
          <h1 className="text-5xl font-semibold leading-[1.12] tracking-tight">Your campus, all in one place.</h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-slate-300">A simpler way for students and staff to stay connected to learning and campus life.</p>
        </div>
        <p className="relative text-sm text-slate-400">Group: Samson, Tan, Toledo, Tolentino, Vista</p>
      </section>

      <section className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-9 flex items-center gap-3 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white"><GraduationCap size={22} /></div>
            <span className="text-xl font-semibold tracking-tight">EduTrack</span>
          </div>
          <div className="mb-8">
            <p className="mb-2 text-sm font-medium text-blue-600">Welcome back</p>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Sign in to your account</h2>
            <p className="mt-2 text-sm text-slate-500">Use your EduTrack account to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">Email address</label>
              <div className="relative">
                <Mail size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input id="email" type="email" autoComplete="username" required value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} placeholder="you@edutrack.edu" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <LockKeyhole size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} placeholder="Enter your password" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-12 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {error && <p role="alert" className="rounded-lg bg-red-50 px-3.5 py-3 text-sm text-red-700">{error}</p>}
            <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-600/20">
              Sign in <ArrowRight size={17} />
            </button>
          </form>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">Try a demo account</p>
            <p className="mt-1 text-xs text-slate-500">All demo accounts use password <span className="font-semibold text-slate-700">password</span>.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {demoAccounts.map((account) => (
                <button key={account.role} type="button" onClick={() => { setEmail(account.email); setPassword("password"); setError(""); }} className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left transition hover:border-blue-300 hover:bg-blue-50/50">
                  <span className="min-w-0">
                    <span className={`mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${account.color}`}>{account.role}</span>
                    <span className="block truncate text-xs text-slate-600">{account.email}</span>
                  </span>
                  <ArrowRight size={14} className="shrink-0 text-slate-400" />
                </button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-slate-400">Demo sign-in only. Connect an authentication service to verify real accounts.</p>
        </div>
      </section>
    </main>
  );
}
