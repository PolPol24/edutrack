
import Sidebar from "@/components/Sidebar";
export default function Page() {
  return (
    <div className="flex">
      <Sidebar role="student" />
      <main className="ml-64 flex-1 p-8 bg-[#f8fafc] min-h-screen">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">My Profile</h1>
<div className="bg-white rounded-2xl border p-6 max-w-2xl">
  <p className="font-semibold">Paul Andrew Samson</p>
  <p className="text-sm text-slate-500">BS Information Systems • 3rd Year</p>
  <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
    <div><p className="text-slate-500">Student ID</p><p className="font-medium">2023-00123</p></div>
    <div><p className="text-slate-500">Email</p><p className="font-medium">paul.samson@edu.ph</p></div>
  </div>
  <a href="/student/profile" className="inline-block mt-6 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm">Edit Profile</a>
</div>

        </div>
      </main>
    </div>
  );
}
