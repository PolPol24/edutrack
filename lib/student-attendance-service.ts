import { apiRequest } from "./api";
import type { FaceCapture } from "@/components/FaceEnrollmentCapture";

export type AttendanceRecord = {
  attendance_status: string;
  checked_in_at: string | null;
  session_date: string;
  course_code: string;
  course_title: string;
  section_code: string;
  room: string;
  start_time: string;
  end_time: string;
};

export type FaceEnrollment = {
  template_status: string;
  model_version: string;
  consent_at: string;
  created_at: string;
} | null;

export async function getStudentAttendance() {
  const [history, face] = await Promise.all([
    apiRequest<{ records: AttendanceRecord[] }>("student_attendance"),
    apiRequest<{ enrollment: FaceEnrollment }>("student_face"),
  ]);
  return { records: history.records, enrollment: face.enrollment };
}

export function saveStudentFace(capture: FaceCapture, consent: boolean) {
  return apiRequest<{ message: string }>("student_face", {
    method: "POST",
    body: JSON.stringify({ ...capture, face_consent: consent }),
  });
}

export function revokeStudentFace() {
  return apiRequest<{ message: string }>("student_face", { method: "DELETE" });
}
