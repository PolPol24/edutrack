
import Sidebar from "@/components/Sidebar";
export default function Page() {
  return (
    <div className="flex">
      <Sidebar role="faculty" />
      <main className="ml-64 flex-1 p-8 bg-[#f8fafc] min-h-screen">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Class Attendance</h1>
          <div className='bg-white rounded-2xl border p-6'>Mark attendance - writes to Attendance table.</div>
        </div>
      </main>
    </div>
  );
}
