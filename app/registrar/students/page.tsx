
import Sidebar from "@/components/Sidebar";
export default function Page() {
  return (
    <div className="flex">
      <Sidebar role="registrar" />
      <main className="ml-64 flex-1 p-8 bg-[#f8fafc] min-h-screen">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Students</h1>
          <div className='bg-white rounded-2xl border p-6'>Student records table - CRUD linked to Student table.</div>
        </div>
      </main>
    </div>
  );
}
