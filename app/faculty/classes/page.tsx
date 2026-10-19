
import Sidebar from "@/components/Sidebar";
export default function Page() {
  return (
    <div className="flex">
      <Sidebar role="faculty" />
      <main className="ml-64 flex-1 p-8 bg-[#f8fafc] min-h-screen">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">My Classes</h1>
          <div className='bg-white rounded-2xl border p-6'>List of classes with <a href='/faculty/grading' className='text-blue-600'>Grade</a> and <a href='/faculty/attendance' className='text-blue-600'>Attendance</a> buttons.</div>
        </div>
      </main>
    </div>
  );
}
