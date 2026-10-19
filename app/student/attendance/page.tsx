
import Sidebar from "@/components/Sidebar";
export default function Page() {
  return (
    <div className="flex">
      <Sidebar role="student" />
      <main className="ml-64 flex-1 p-8 bg-[#f8fafc] min-h-screen">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Attendance Log</h1>
<div className="bg-white rounded-2xl border p-6">
  <table className="w-full text-sm">
    <thead className="text-left text-slate-500"><tr><th>Date</th><th>Course</th><th>Status</th></tr></thead>
    <tbody>
      <tr className="border-t"><td className="py-2">2026-10-19</td><td>CS 101</td><td>Present</td></tr>
      <tr className="border-t"><td className="py-2">2026-10-18</td><td>MATH 202</td><td>Present</td></tr>
      <tr className="border-t"><td className="py-2">2026-10-17</td><td>ENG 101</td><td>Late</td></tr>
    </tbody>
  </table>
</div>

        </div>
      </main>
    </div>
  );
}
