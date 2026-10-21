
import "./globals.css";

export const metadata = {
  title: "EduTrack - Student Information System",
  description: "Lab 4-6 Project",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
