
import Link from "next/link";
import { GraduationCap, Users, ClipboardCheck, Shield } from "lucide-react";

const roles = [
  { name: "Student", desc: "View grades, schedule, enrollment", href: "/student/dashboard", icon: GraduationCap, color: "bg-blue-600" },
  { name: "Faculty", desc: "Manage classes, grading, attendance", href: "/faculty/dashboard", icon: Users, color: "bg-emerald-600" },
  { name: "Registrar", desc: "Approve enrollment, manage records", href: "/registrar/dashboard", icon: ClipboardCheck, color: "bg-amber-600" },
  { name: "Admin", desc: "System, users, courses, reports", href: "/admin/dashboard", icon: Shield, color: "bg-slate-800" },
];

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white mb-4">
          <GraduationCap />
        </div>
        <h1 className="text-4xl font-bold">EduTrack</h1>
        <p className="text-slate-500 mt-2">Student Information System • Group: Samson, Tan, Toledo, Tolentino, Vista</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 w-full max-w-5xl">
        {roles.map(r => (
          <Link key={r.name} href={r.href} className="group bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition-all hover:-translate-y-1">
            <div className={`w-12 h-12 rounded-xl ${r.color} text-white flex items-center justify-center mb-4 group-hover:scale-110 transition`}>
              <r.icon size={22} />
            </div>
            <h3 className="font-semibold text-lg">{r.name} Portal</h3>
            <p className="text-sm text-slate-500 mt-1">{r.desc}</p>
            <span className="mt-4 inline-block text-sm font-medium text-blue-600">Enter →</span>
          </Link>
        ))}
      </div>
      <p className="mt-8 text-xs text-slate-400">Lab 4-6: GitHub • Figma • ERD • Frontend • Backend (MySQL)</p>
    </div>
  );
}
