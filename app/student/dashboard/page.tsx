"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { GraduationCap, LayoutDashboard, BookOpen, ClipboardList, CalendarCheck, User, Settings, HelpCircle, Bell, ChevronDown, Calendar as CalendarIcon, Clock, PieChart, Check, TrendingUp, Book, AlertCircle, Dot, LogOut } from "lucide-react";

const NAV = [
  { id: "dashboard", label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
  { id: "courses", label: "My Courses", href: "/student/courses", icon: BookOpen },
  { id: "enrollment", label: "Enrollment", href: "/student/enrollment", icon: ClipboardList },
  { id: "attendance", label: "Attendance", href: "/student/attendance", icon: CalendarCheck },
  { id: "profile", label: "Profile", href: "/student/profile", icon: User },
];

const STATS = [
  { label: "Enrolled Subjects", value: "5", sub: "For Fall 2025–2026 Semester", icon: Book },
  { label: "Attendance Rate", value: "92%", sub: "On track this semester", trend: "+2.4%", icon: PieChart },
  { label: "Pending Enrollment", value: "2", sub: "Awaiting approval", icon: Clock },
  { label: "GPA", value: "3.6", sub: "Out of 4.0 • Good standing", icon: GraduationCap },
];

const SCHEDULE = [
  { course: "Calculus I", schedule: "Mon • Wed • 9:00-10:30 AM", room: "Room 201" },
  { course: "Physics 101", schedule: "Tue • Thu • 11:00-12:30 PM", room: "Room 104" },
  { course: "Data Structures", schedule: "Mon • Wed • Fri • 1:00-2:00 PM", room: "Room 301" },
  { course: "Intro to Philosophy", schedule: "Fri • 2:00-3:30 PM", room: "Room 110" },
  { course: "Chemistry Lab", schedule: "Thu • 3:00-5:00 PM", room: "Room 215" },
];

const ATT = [
  { course: "CS 101", date: "Oct 19, 2026 • 09:00 AM", status: "Present" },
  { course: "MATH 202", date: "Oct 18, 2026 • 11:00 AM", status: "Present" },
  { course: "ENG 101", date: "Oct 17, 2026 • 01:00 PM", status: "Late" },
  { course: "PHYS 110", date: "Oct 16, 2026 • 08:00 AM", status: "Absent" },
];

export default function Dashboard() {
  const [notif, setNotif] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setNotif(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);


  return (
    <div className="min-h-screen flex bg-[#f5f7fb]">
      <aside className="hidden lg:flex w-[268px] shrink-0 bg-white border-r border-[#eef2f7] flex-col sticky top-0 h-screen">
        <div className="px-7 pt-8 pb-7">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px] bg-[#2563EB] flex items-center justify-center"><GraduationCap className="w-5 h-5 text-white" /></div>
            <div><div className="font-bold text-[16px]">EduTrack</div><div className="text-[11px] text-gray-500 uppercase">Student System</div></div>
          </div>
        </div>
        <div className="px-3 flex-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === "dashboard";
            return <Link key={item.id} href={item.href} aria-current={isActive ? "page" : undefined} className={`w-full flex items-center gap-3 px-3.5 py-[10px] rounded-[10px] text-[13.5px] font-medium mb-[2px] ${isActive ? "bg-[#2563EB] text-white shadow" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"}`}><Icon className="w-[18px] h-[18px]" />{item.label}</Link>;
          })}
        </div>
        <div className="p-3 border-t mt-auto">
          <button className="w-full flex items-center gap-3 px-3.5 py-2 rounded-[10px] text-[13.5px] text-gray-500 hover:bg-gray-50"><Settings className="w-[18px] h-[18px]" />Settings</button>
          <button className="w-full flex items-center gap-3 px-3.5 py-2 rounded-[10px] text-[13.5px] text-gray-500 hover:bg-gray-50"><HelpCircle className="w-[18px] h-[18px]" />Help & Support</button>
          <Link href="/" className="w-full flex items-center gap-3 px-3.5 py-2 rounded-[10px] text-[13.5px] text-gray-500 hover:bg-gray-50 hover:text-rose-600"><LogOut className="w-[18px] h-[18px]" />Log out</Link>
        </div>
      </aside>

      <nav aria-label="Student navigation" className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t bg-white/95 px-1 py-2 shadow-[0_-4px_18px_rgba(15,23,42,0.06)] backdrop-blur lg:hidden">
        {NAV.map((item) => { const Icon = item.icon; return <Link key={item.id} href={item.href} aria-current={item.id === "dashboard" ? "page" : undefined} className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-medium ${item.id === "dashboard" ? "text-blue-600" : "text-slate-500"}`}><Icon className="h-[19px] w-[19px]"/><span className="max-w-full truncate">{item.label}</span></Link>; })}
        <Link href="/" className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-medium text-slate-500"><LogOut className="h-[19px] w-[19px]"/><span className="max-w-full truncate">Log out</span></Link>
      </nav>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-[#eef2f7] px-8 py-5 flex justify-between items-center sticky top-0 z-10">
          <div><h1 className="text-[26px] font-bold">Dashboard</h1><p className="text-[13px] text-gray-500">Overview of your academic activity</p></div>
          <div className="flex items-center gap-4 relative" ref={ref}>
            <Link href="/student/profile" className="flex items-center gap-3 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/20" aria-label="View student profile">
              <div className="w-10 h-10 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-semibold">PA</div>
              <div className="hidden sm:block"><div className="text-[13px] font-semibold">Paul Andrew Samson</div><div className="text-[11px] text-gray-500">STU-2024-1187</div></div>
            </Link>
            <button onClick={() => setNotif(!notif)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"><Bell className="w-4 h-4" /></button>
            {notif && <div className="absolute top-12 right-0 w-72 bg-white border rounded-xl shadow-xl p-4 text-sm"><div className="font-semibold mb-2">Notifications</div><div className="space-y-2 text-[12px] text-gray-600"><div>• Enrollment approved for Calculus I</div><div>• Attendance marked for Physics 101</div><div>• New announcement from registrar</div></div></div>}
          </div>
        </header>

        <main className="p-6 pb-24 lg:p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STATS.map((s, i) => {
              const Icon = s.icon;
              return <div key={i} className="bg-white rounded-[16px] border border-[#eef2f7] shadow-sm p-5"><div className="w-9 h-9 rounded-full bg-[#eff6ff] flex items-center justify-center mb-3"><Icon className="w-5 h-5 text-[#2563EB]" /></div><div className="text-[13px] text-gray-700">{s.label}</div><div className="text-[36px] font-bold leading-none my-1">{s.value}</div><div className="text-[11.5px] text-gray-500">{s.sub} {s.trend && <span className="text-green-600 ml-1">{s.trend}</span>}</div></div>;
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-white rounded-[16px] border border-[#eef2f7] shadow-sm overflow-hidden">
              <div className="flex justify-between items-center p-5 pb-3"><h2 className="font-semibold text-[15px]">My Schedule</h2><Link href="/student/courses" className="text-[12.5px] text-[#2563EB] font-medium flex items-center gap-1"><CalendarIcon className="w-4 h-4" />View courses</Link></div>
              <div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-[#f1f1f1] text-[12px] text-gray-500"><th className="text-left font-medium px-5 py-2">Course</th><th className="text-left font-medium px-5 py-2">Schedule</th><th className="text-left font-medium px-5 py-2">Room</th></tr></thead><tbody>{SCHEDULE.map((r, i) => <tr key={i} className="border-t border-gray-50"><td className="px-5 py-3.5 text-[13px] font-medium">{r.course}</td><td className="px-5 py-3.5 text-[13px] text-gray-600">{r.schedule}</td><td className="px-5 py-3.5 text-[13px]">{r.room}</td></tr>)}</tbody></table></div>
            </div>

            <div className="space-y-5">
              <div className="bg-white rounded-[16px] border border-[#eef2f7] shadow-sm p-5">
                <div className="flex justify-between items-center mb-4"><h2 className="font-semibold text-[14px] flex items-center gap-2"><Clock className="w-4 h-4" />Recent Attendance Log</h2><Link href="/student/attendance" className="text-[12px] text-[#2563EB]">View all</Link></div>
                <div className="space-y-3">{ATT.map((a, i) => <div key={i} className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-[#2563EB] shadow-[0_0_0_3px_#dbeafe]" /><div className="flex-1 min-w-0"><div className="text-[13px] font-medium truncate">{a.course}</div><div className="text-[11px] text-gray-500">{a.date}</div></div><span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold border ${a.status==="Present"?"bg-green-50 text-green-700 border-green-200":a.status==="Late"?"bg-amber-50 text-amber-700 border-amber-200":"bg-red-50 text-red-700 border-red-200"}`}>{a.status}</span></div>)}</div>
              </div>

              <div className="bg-white rounded-[16px] border border-[#eef2f7] shadow-sm p-5">
                <h2 className="font-semibold text-[15px] flex items-center gap-2"><TrendingUp className="w-4 h-4" />Enrollment Status</h2>
                <p className="text-[12px] text-gray-500 mt-1">Fall 2025–2026 Enrollment • 3 of 5 approved</p>
                <div className="mt-4 h-2.5 bg-[#eef2ff] rounded-full overflow-hidden"><div className="h-full w-[60%] bg-[#2563EB] rounded-full" /></div>
                <div className="flex justify-between mt-2 text-[11.5px] text-gray-500"><span>60% Complete</span><span>2 Pending</span></div>
              </div>
            </div>
          </div>
        </main>
      </div>

    </div>
  );
}
