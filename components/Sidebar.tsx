
"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, BookOpen, ClipboardList, CalendarCheck, User, LogOut, Users, GraduationCap, FileBarChart, Settings } from "lucide-react";
import { apiRequest } from "@/lib/api";

type NavItem = { label: string; href: string; icon: any };

const navByRole: Record<string, NavItem[]> = {
  student: [
    { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
    { label: "My Courses", href: "/student/courses", icon: BookOpen },
    { label: "Enrollment", href: "/student/enrollment", icon: ClipboardList },
    { label: "Attendance", href: "/student/attendance", icon: CalendarCheck },
    { label: "Profile", href: "/student/profile", icon: User },
  ],
  faculty: [
    { label: "Dashboard", href: "/faculty/dashboard", icon: LayoutDashboard },
    { label: "My Classes", href: "/faculty/classes", icon: BookOpen },
    { label: "Grading", href: "/faculty/grading", icon: ClipboardList },
    { label: "Attendance", href: "/faculty/attendance", icon: CalendarCheck },
    { label: "Profile", href: "/faculty/profile", icon: User },
  ],
  registrar: [
    { label: "Dashboard", href: "/registrar/dashboard", icon: LayoutDashboard },
    { label: "Students", href: "/registrar/students", icon: GraduationCap },
    { label: "Enrollments", href: "/registrar/enrollments", icon: ClipboardList },
    { label: "Approvals", href: "/registrar/approvals", icon: Users },
    { label: "Reports", href: "/registrar/reports", icon: FileBarChart },
    { label: "Profile", href: "/registrar/profile", icon: User },
  ],
  admin: [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Courses", href: "/admin/courses", icon: BookOpen },
    { label: "Reports", href: "/admin/reports", icon: FileBarChart },
    { label: "Settings", href: "/admin/settings", icon: Settings },
    { label: "Profile", href: "/admin/profile", icon: User },
  ],
};

export default function Sidebar({ role }: { role: "student" | "faculty" | "registrar" | "admin" }) {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const items = navByRole[role];

  async function handleLogout() {
    setLogoutError("");
    setIsLoggingOut(true);
    try {
      await apiRequest("logout", { method: "POST" });
      setShowLogoutConfirm(false);
      router.replace("/");
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Unable to log out. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <>
    {showLogoutConfirm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isLoggingOut) {
          setShowLogoutConfirm(false);
          setLogoutError("");
        }
      }}>
        <section role="alertdialog" aria-modal="true" aria-labelledby="logout-title" aria-describedby="logout-description" className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
          <h2 id="logout-title" className="text-lg font-semibold text-slate-900">Log out?</h2>
          <p id="logout-description" className="mt-2 text-sm leading-6 text-slate-600">Are you sure you want to log out of your EduTrack account?</p>
          {logoutError && <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3.5 py-3 text-sm text-rose-700">{logoutError}</p>}
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" disabled={isLoggingOut} onClick={() => { setShowLogoutConfirm(false); setLogoutError(""); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              Cancel
            </button>
            <button type="button" disabled={isLoggingOut} onClick={handleLogout} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">
              {isLoggingOut ? "Logging out…" : "Log out"}
            </button>
          </div>
        </section>
      </div>
    )}
    <aside className="hidden lg:flex w-64 bg-white border-r min-h-screen p-4 flex-col fixed left-0 top-0">
      <div className="flex items-center gap-2 px-2 py-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center"><GraduationCap size={18}/></div>
        <div>
          <p className="font-bold text-sm leading-none">EduTrack</p>
          <p className="text-[11px] text-slate-500 uppercase tracking-widest">{role}</p>
        </div>
      </div>

      <nav className="space-y-1 flex-1">
        {items.map(item => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${active ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
              <item.icon size={18} /> {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="pt-4 border-t">
        <button type="button" onClick={() => { setLogoutError(""); setShowLogoutConfirm(true); }} className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm text-slate-500 hover:bg-slate-100">
          <LogOut size={18}/> Log out
        </button>
      </div>
    </aside>
    <nav aria-label={`${role} navigation`} className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t bg-white/95 px-1 py-2 shadow-[0_-4px_18px_rgba(15,23,42,0.06)] backdrop-blur lg:hidden">
      {items.map((item) => {
        const active = pathname === item.href;
        return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-medium ${active ? "text-blue-600" : "text-slate-500"}`}>
          <item.icon size={19}/><span className="max-w-full truncate">{item.label}</span>
        </Link>;
      })}
      <button type="button" onClick={() => { setLogoutError(""); setShowLogoutConfirm(true); }} className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-medium text-slate-500 hover:text-rose-600">
        <LogOut size={19}/><span className="max-w-full truncate">Log out</span>
      </button>
    </nav>
    </>
  );
}
