import Link from "next/link";
export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f7fb]">
      <div className="bg-white p-10 rounded-2xl shadow border text-center">
        <h1 className="text-3xl font-bold mb-2">EduTrack</h1>
        <p className="text-gray-500 mb-6">Students Information and Enrollment System with Attendance Monitoring</p>
        <Link href="/student/dashboard" className="px-6 py-3 bg-[#2563EB] text-white rounded-full font-medium hover:bg-blue-700">Go to Student Dashboard</Link>
      </div>
    </div>
  );
}
