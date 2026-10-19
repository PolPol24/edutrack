import "./globals.css";
export const metadata = { title: "EduTrack - Student System", description: "Students Information and Enrollment System with Attendance Monitoring" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
