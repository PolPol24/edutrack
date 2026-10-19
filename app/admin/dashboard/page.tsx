
import Sidebar from "@/components/Sidebar";
export default function Page() {
  return (
    <div className="flex">
      <Sidebar role="admin" />
      <main className="ml-64 flex-1 p-8 bg-[#f8fafc] min-h-screen">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
<div className="grid grid-cols-4 gap-4">
  <a href="/admin/users" className="bg-white p-5 rounded-2xl border"><p className="text-xs text-slate-500">USERS</p><p className="text-2xl font-bold">1,350</p></a>
  <a href="/admin/courses" className="bg-white p-5 rounded-2xl border"><p className="text-xs text-slate-500">COURSES</p><p className="text-2xl font-bold">42</p></a>
  <a href="/admin/reports" className="bg-white p-5 rounded-2xl border"><p className="text-xs text-slate-500">REPORTS</p><p className="text-2xl font-bold">18</p></a>
  <a href="/admin/settings" className="bg-white p-5 rounded-2xl border"><p className="text-xs text-slate-500">SYSTEM</p><p className="text-2xl font-bold">Healthy</p></a>
</div>

        </div>
      </main>
    </div>
  );
}
