
import Sidebar from "@/components/Sidebar";
export default function Page() {
  return (
    <div className="flex">
      <Sidebar role="registrar" />
      <main className="ml-64 flex-1 p-8 bg-[#f8fafc] min-h-screen">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Registrar Dashboard</h1>
<div className="grid grid-cols-3 gap-4">
  <a href="/registrar/enrollments" className="bg-white p-5 rounded-2xl border"><p className="text-xs text-slate-500">PENDING ENROLLMENTS</p><p className="text-2xl font-bold">24</p></a>
  <a href="/registrar/students" className="bg-white p-5 rounded-2xl border"><p className="text-xs text-slate-500">TOTAL STUDENTS</p><p className="text-2xl font-bold">1,240</p></a>
  <a href="/registrar/approvals" className="bg-white p-5 rounded-2xl border"><p className="text-xs text-slate-500">APPROVALS TODAY</p><p className="text-2xl font-bold">8</p></a>
</div>

        </div>
      </main>
    </div>
  );
}
