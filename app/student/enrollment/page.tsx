
import Sidebar from "@/components/Sidebar";
export default function Page() {
  return (
    <div className="flex">
      <Sidebar role="student" />
      <main className="ml-64 flex-1 p-8 bg-[#f8fafc] min-h-screen">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Enrollment</h1>
<div className="bg-white rounded-2xl border p-6">
  <p className="text-slate-500 mb-4">Current Semester: 1st Sem 2025-2026</p>
  <table className="w-full text-sm">
    <thead className="text-left text-slate-500"><tr><th className="pb-3">Course</th><th>Status</th><th>Action</th></tr></thead>
    <tbody>
      <tr className="border-t"><td className="py-3">CS 101</td><td><span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs">Enrolled</span></td><td><a href="/student/enrollment" className="text-blue-600">Details</a></td></tr>
      <tr className="border-t"><td className="py-3">MATH 202</td><td><span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs">Pending Registrar Approval</span></td><td><a href="/student/enrollment" className="text-blue-600">Cancel</a></td></tr>
    </tbody>
  </table>
  <div className="mt-6">
    <a href="/student/courses" className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm">+ Enroll New Course</a>
  </div>
</div>

        </div>
      </main>
    </div>
  );
}
