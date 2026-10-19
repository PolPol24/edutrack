
import Sidebar from "@/components/Sidebar";
export default function Page() {
  return (
    <div className="flex">
      <Sidebar role="student" />
      <main className="ml-64 flex-1 p-8 bg-[#f8fafc] min-h-screen">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">My Courses</h1>
<div className="grid gap-4">
  {[
    {code:"CS 101", name:"Introduction to Computing", units:3, instructor:"Prof. Tan"},
    {code:"MATH 202", name:"Discrete Math", units:3, instructor:"Prof. Toledo"},
    {code:"ENG 101", name:"Technical Writing", units:3, instructor:"Prof. Tolentino"},
  ].map(c=>(
    <div key={c.code} className="bg-white p-5 rounded-2xl border flex justify-between items-center">
      <div><p className="font-semibold">{c.code} - {c.name}</p><p className="text-sm text-slate-500">{c.units} units • {c.instructor}</p></div>
      <a href={`/student/courses`} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm">View</a>
    </div>
  ))}
</div>

        </div>
      </main>
    </div>
  );
}
