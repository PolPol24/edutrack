
import Sidebar from "@/components/Sidebar";
export default function Page() {
  return (
    <div className="flex">
      <Sidebar role="faculty" />
      <main className="ml-64 flex-1 p-8 bg-[#f8fafc] min-h-screen">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Faculty Dashboard</h1>
<div className="grid grid-cols-3 gap-4 mb-6">
  <a href="/faculty/classes" className="bg-white p-5 rounded-2xl border"><p className="text-xs text-slate-500">CLASSES HANDLED</p><p className="text-2xl font-bold mt-1">4</p></a>
  <a href="/faculty/grading" className="bg-white p-5 rounded-2xl border"><p className="text-xs text-slate-500">PENDING GRADES</p><p className="text-2xl font-bold mt-1">12</p></a>
  <a href="/faculty/attendance" className="bg-white p-5 rounded-2xl border"><p className="text-xs text-slate-500">TODAY&apos;S ATTENDANCE</p><p className="text-2xl font-bold mt-1">96%</p></a>
</div>
<div className="bg-white rounded-2xl border p-6">
  <h3 className="font-semibold mb-3">Today&apos;s Schedule</h3>
  <p className="text-sm text-slate-600">CS 101 - 9:00 AM • Room 201 • <a href="/faculty/classes" className="text-blue-600">View class</a></p>
</div>

        </div>
      </main>
    </div>
  );
}
