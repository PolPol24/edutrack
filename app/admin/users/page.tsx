
import Sidebar from "@/components/Sidebar";
export default function Page() {
  return (
    <div className="flex">
      <Sidebar role="admin" />
      <main className="ml-64 flex-1 p-8 bg-[#f8fafc] min-h-screen">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">User Management</h1>
          <div className='bg-white rounded-2xl border p-6'>Manage Student, Faculty, Registrar, Admin accounts.</div>
        </div>
      </main>
    </div>
  );
}
