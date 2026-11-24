"use client";

import { useEffect, useState } from "react";
import { Download, FileText, LoaderCircle, UserRound } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { apiRequest, apiUrl } from "@/lib/api";

type Application = {
  request_id: number;
  student_number: string;
  school_email: string;
  first_name: string;
  last_name: string;
  name_suffix: string | null;
  date_of_birth: string;
  applicant_email: string;
  phone: string | null;
  application_details: Record<string, string>;
  request_status: string;
  created_at: string;
  reviewed_at: string | null;
  year_level: number;
  program_code: string | null;
  program_name: string | null;
  documents: { document_id: number; slot_number: number; original_filename: string; size_bytes: number | string; uploaded_at: string }[];
  photo: { original_filename: string; mime_type: string } | null;
};
type RegistrationCourse = { enrollment_id: number; course_code: string; course_title: string; course_number: string | null; units: number; section_code: string; instructor: string | null };
type AcademicProfile = { active_term_name: string | null; active_year_label: string | null };

const detailLabels: Record<string, string> = {
  middle_name: "Middle name", sex: "Sex", permanent_address: "Permanent address", place_of_birth: "Place of birth", civil_status: "Civil status",
  citizenship: "Citizenship", religion: "Religion", height_cm: "Height (cm)", weight_kg: "Weight (kg)",
  father_name: "Father’s name", father_occupation: "Father’s occupation", mother_name: "Mother’s name",
  mother_occupation: "Mother’s occupation", language_dialect: "Language or dialect spoken/written",
  emergency_contact_person: "Person to contact in case of emergency", emergency_contact_address: "Emergency contact address",
  emergency_contact_no: "Emergency contact number", elementary_school: "Elementary school",
  elementary_year_graduated: "Elementary year graduated", high_school: "High school",
  high_school_year_graduated: "High school year graduated",
  vocational: "Vocational school", vocational_year_graduated: "Vocational year graduated", special_skills: "Special skills",
  award_1: "Award or recognition 1", award_2: "Award or recognition 2", award_3: "Award or recognition 3",
  award_4: "Award or recognition 4", award_5: "Award or recognition 5", reference_1_name: "Reference 1 name",
  reference_1_contact: "Reference 1 contact number", reference_2_name: "Reference 2 name",
  reference_2_contact: "Reference 2 contact number", reference_3_name: "Reference 3 name",
  reference_3_contact: "Reference 3 contact number",
};
const documentLabels = ["PSA Birth Certificate", "Good Moral Certificate", "Medical Certificate"];

function dateLabel(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function ReadOnlyField({ label, value }: { label: string; value: string | number | null | undefined }) {
  return <div className="min-w-0 rounded-lg bg-slate-50 px-3 py-2.5"><dt className="text-xs font-medium text-slate-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm font-medium text-slate-800">{value === null || value === undefined || value === "" ? "—" : value}</dd></div>;
}

function RegistrationField({ label, value, className = "col-span-1" }: { label: string; value: string | number | null | undefined; className?: string }) {
  return <div className={`min-w-0 bg-white px-2.5 py-2 ${className}`}><dt className="text-[11px] font-medium text-blue-700">{label}</dt><dd className="mt-0.5 min-h-5 whitespace-pre-wrap break-words text-sm font-medium leading-5 text-slate-900">{value === null || value === undefined || value === "" ? "—" : value}</dd></div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="overflow-hidden border border-blue-200 bg-white"><h2 className="border-b border-blue-900 bg-blue-800 px-4 py-2 text-sm font-bold uppercase tracking-wide text-white">{title}</h2><div className="p-4 sm:p-5">{children}</div></section>;
}

function PrintCell({ label, value }: { label: string; value: string | number | null | undefined }) {
  return <div className="application-print-cell"><span className="application-print-label">{label}</span><span className="application-print-value">{value === null || value === undefined || value === "" ? "—" : value}</span></div>;
}

function PrintBar({ children }: { children: React.ReactNode }) {
  return <h2 className="application-print-bar">{children}</h2>;
}

export default function StudentApplicationProfile() {
  const [application, setApplication] = useState<Application | null>(null);
  const [courses, setCourses] = useState<RegistrationCourse[]>([]);
  const [academicProfile, setAcademicProfile] = useState<AcademicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiRequest<{ application: Application | null }>("student_application"),
      apiRequest<{ courses: RegistrationCourse[] }>("student_courses"),
      apiRequest<{ profile: AcademicProfile }>("profile"),
    ])
      .then(([applicationResult, coursesResult, profileResult]) => {
        setApplication(applicationResult.application);
        setCourses(coursesResult.courses);
        setAcademicProfile(profileResult.profile);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load your submitted application."))
      .finally(() => setLoading(false));
  }, []);

  const details = application?.application_details ?? {};
  const detailField = (key: string) => <ReadOnlyField key={key} label={detailLabels[key] ?? key} value={details[key]}/>;
  const educationKeys = ["elementary_school", "elementary_year_graduated", "high_school", "high_school_year_graduated", "vocational", "vocational_year_graduated"];
  const awardsKeys = ["award_1", "award_2", "award_3", "award_4", "award_5"];
  const referenceKeys = ["reference_1_name", "reference_1_contact", "reference_2_name", "reference_2_contact", "reference_3_name", "reference_3_contact"];
  const printDetail = (key: string) => <PrintCell key={key} label={detailLabels[key] ?? key} value={details[key]}/>;
  const totalUnits = courses.reduce((total, course) => total + Number(course.units || 0), 0);
  const sectionCode = courses[0]?.section_code ?? "—";
  const printDocument = (documentType: "application" | "registration") => {
    document.body.dataset.printDocument = documentType;
    const clearPrintMode = () => {
      delete document.body.dataset.printDocument;
      window.removeEventListener("afterprint", clearPrintMode);
    };
    window.addEventListener("afterprint", clearPrintMode);
    window.setTimeout(() => window.print(), 50);
  };

  return <div className="student-application-profile flex min-h-screen bg-[#f8fafc]"><Sidebar role="student"/><main className="screen-main min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8"><div className="mx-auto max-w-5xl">
    <header className="mb-6"><p className="text-sm font-medium uppercase tracking-wider text-blue-700">Student profile</p><h1 className="mt-1 text-2xl font-bold text-slate-900">My registration form</h1><p className="mt-1 text-sm text-slate-600">Your read-only student information and current enrolled subjects.</p></header>
    {error && <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
    {loading ? <div className="rounded-2xl border bg-white p-10 text-center text-slate-500"><LoaderCircle className="mx-auto mb-2 animate-spin"/>Loading your application…</div> : !application ? <section className="rounded-2xl border bg-white p-8 text-center"><UserRound className="mx-auto mb-3 text-slate-400"/><h2 className="font-semibold text-slate-900">No approved application is linked to this account</h2><p className="mt-2 text-sm text-slate-500">If you believe this is incorrect, contact the registrar.</p></section> : <div className="space-y-5">
      <section className="flex flex-wrap items-start justify-between gap-4 border border-blue-200 bg-blue-50 p-5"><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-900">EduTrack University · Student copy</p><h2 className="mt-1 text-xl font-semibold text-slate-950">{application.first_name} {details.middle_name ? `${details.middle_name} ` : ""}{application.last_name}{application.name_suffix ? ` ${application.name_suffix}` : ""}</h2><p className="mt-1 text-sm text-slate-700">{application.program_code ?? "Program"} · {application.program_name ?? ""} · Year {application.year_level}</p></div><div className="text-sm sm:text-right"><p className="font-semibold text-slate-800">Student number: {application.student_number}</p><p className="mt-1 text-slate-700">School email: {application.school_email}</p><p className="mt-1 text-slate-700">Registration status: Approved</p><p className="text-slate-700">Approved {dateLabel(application.reviewed_at)}</p></div></section>

      <Section title="Personal Data"><dl className="grid grid-cols-2 gap-px border border-blue-300 bg-blue-300 sm:grid-cols-6"><RegistrationField label="First name" value={application.first_name} className="sm:col-span-2"/><RegistrationField label="Middle name" value={details.middle_name} className="sm:col-span-2"/><RegistrationField label="Last name" value={application.last_name} className="sm:col-span-2"/><RegistrationField label="Permanent address" value={details.permanent_address} className="col-span-2 sm:col-span-6"/><RegistrationField label="Sex" value={details.sex} className="sm:col-span-2"/><RegistrationField label="Contact number" value={application.phone} className="sm:col-span-2"/><RegistrationField label="Email address" value={application.applicant_email} className="col-span-2 sm:col-span-2"/><RegistrationField label="Date of birth" value={dateLabel(application.date_of_birth)} className="sm:col-span-2"/><RegistrationField label="Place of birth" value={details.place_of_birth} className="sm:col-span-2"/><RegistrationField label="Civil status" value={details.civil_status} className="sm:col-span-2"/><RegistrationField label="Citizenship" value={details.citizenship} className="sm:col-span-2"/><RegistrationField label="Religion" value={details.religion} className="sm:col-span-2"/><RegistrationField label="Height (cm)" value={details.height_cm} className="sm:col-span-2"/><RegistrationField label="Weight (kg)" value={details.weight_kg} className="sm:col-span-3"/><RegistrationField label="Year & course" value={`${application.program_code ?? "—"} · Year ${application.year_level}`} className="sm:col-span-3"/><RegistrationField label="Father’s name" value={details.father_name} className="sm:col-span-3"/><RegistrationField label="Father’s occupation" value={details.father_occupation} className="sm:col-span-3"/><RegistrationField label="Mother’s name" value={details.mother_name} className="sm:col-span-3"/><RegistrationField label="Mother’s occupation" value={details.mother_occupation} className="sm:col-span-3"/><RegistrationField label="Language or dialect spoken/written" value={details.language_dialect} className="col-span-2 sm:col-span-6"/><RegistrationField label="Emergency contact person" value={details.emergency_contact_person} className="sm:col-span-2"/><RegistrationField label="Emergency contact number" value={details.emergency_contact_no} className="sm:col-span-2"/><RegistrationField label="Emergency contact address" value={details.emergency_contact_address} className="col-span-2 sm:col-span-2"/></dl></Section>

      <Section title="Enrolled Subjects"><div className="overflow-x-auto"><table className="w-full min-w-[650px] border-collapse text-left text-sm"><thead><tr className="bg-blue-50 text-xs uppercase tracking-wide text-blue-950">{["Course number", "Section", "Course code", "Course title", "Instructor", "Units"].map((label) => <th key={label} className="border border-blue-200 px-3 py-2">{label}</th>)}</tr></thead><tbody>{courses.map((course) => <tr key={course.enrollment_id} className="even:bg-slate-50"><td className="border border-slate-300 px-3 py-2">{course.course_number || "—"}</td><td className="border border-slate-300 px-3 py-2">{course.section_code}</td><td className="border border-slate-300 px-3 py-2 font-medium">{course.course_code}</td><td className="border border-slate-300 px-3 py-2 font-medium">{course.course_title}</td><td className="border border-slate-300 px-3 py-2">{course.instructor || "Unassigned"}</td><td className="border border-slate-300 px-3 py-2 text-right">{Number(course.units).toFixed(2)}</td></tr>)}{courses.length === 0 && <tr><td colSpan={6} className="border border-slate-300 px-3 py-6 text-center text-slate-500">No active enrolled subjects are available.</td></tr>}</tbody><tfoot><tr className="bg-blue-50 font-semibold"><td colSpan={5} className="border border-blue-200 px-3 py-2 text-right">Total units</td><td className="border border-blue-200 px-3 py-2 text-right">{totalUnits.toFixed(2)}</td></tr></tfoot></table></div><p className="mt-3 text-xs text-slate-500">Academic term: {academicProfile?.active_term_name || "—"} · School year: {academicProfile?.active_year_label || "—"}</p></Section>
      <Section title="Educational Background"><dl className="grid gap-3 sm:grid-cols-2">{educationKeys.map(detailField)}</dl></Section>
      <Section title="Awards and Recognition"><dl className="grid gap-3 sm:grid-cols-2">{awardsKeys.map(detailField)}</dl></Section>
      <Section title="Character References"><dl className="grid gap-3 sm:grid-cols-2">{referenceKeys.map(detailField)}</dl></Section>

      <Section title="Submitted Documents"><ul className="space-y-2">{application.photo && <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><div className="flex items-center gap-3"><FileText size={18} className="shrink-0 text-blue-600"/><div><p className="text-sm font-medium text-slate-800">2×2 applicant photo</p><p className="text-xs text-slate-500">{application.photo.original_filename}</p></div></div><img src={apiUrl("student_application_photo")} alt="Applicant 2×2 photo" className="h-24 w-24 rounded-lg border border-slate-200 object-cover"/></li>}{documentLabels.map((label, index) => { const file = application.documents.find((item) => item.slot_number === index + 1); return <li key={label} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><div className="flex min-w-0 items-center gap-3"><FileText size={18} className="shrink-0 text-blue-600"/><div className="min-w-0"><p className="text-sm font-medium text-slate-800">{label}</p><p className="truncate text-xs text-slate-500">{file?.original_filename ?? "Not available"}</p></div></div>{file && <span className="flex shrink-0 items-center gap-3"><a href={apiUrl("student_registration_request_document_file", { document_id: file.document_id })} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-700 underline">View</a><a href={apiUrl("student_registration_request_document_file", { document_id: file.document_id, disposition: "attachment" })} className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-900"><Download size={14}/>Download</a></span>}</li>; })}</ul></Section>
      <div className="flex flex-wrap justify-end gap-3"><button type="button" onClick={() => printDocument("application")} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Download size={16}/>Download application form (PDF)</button><button type="button" onClick={() => printDocument("registration")} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"><Download size={16}/>Download registration form (PDF)</button></div>
    </div>}
  </div></main>{application && <div className="print-application"><article className="application-print-page">
    <header className="application-print-header"><div><p className="application-print-brand">EDUTRACK · STUDENT SERVICES</p><h1>STUDENT INFORMATION FORM</h1><p>Application REG-{String(application.request_id).padStart(6, "0")} · Submitted {dateLabel(application.created_at)}</p><p>Student No. {application.student_number} · {application.program_code ?? "—"} · Year {application.year_level}</p><p>School email: {application.school_email}</p></div>{application.photo && <img src={apiUrl("student_application_photo")} alt="2×2 applicant photograph" className="application-print-photo"/>}</header>
    <PrintBar>Personal Data</PrintBar>
    <div className="application-print-grid application-print-grid-3"><div className="application-print-span-3">{<PrintCell label="Name" value={`${application.first_name} ${details.middle_name ? `${details.middle_name} ` : ""}${application.last_name}${application.name_suffix ? ` ${application.name_suffix}` : ""}`}/>}</div><div className="application-print-span-3">{printDetail("permanent_address")}</div><PrintCell label="Sex" value={details.sex}/><PrintCell label="Contact No." value={application.phone}/><PrintCell label="E-mail address" value={application.applicant_email}/><PrintCell label="Date of Birth" value={dateLabel(application.date_of_birth)}/>{printDetail("place_of_birth")}<PrintCell label="Civil Status" value={details.civil_status}/>{printDetail("citizenship")}{printDetail("religion")}<PrintCell label="Height (cm)" value={details.height_cm}/><PrintCell label="Weight (kg)" value={details.weight_kg}/><PrintCell label="Year & Course" value={`${application.program_code ?? "—"} · Year ${application.year_level}`}/><PrintCell label="Father’s Name" value={details.father_name}/><PrintCell label="Father’s Occupation" value={details.father_occupation}/><PrintCell label="Mother’s Name" value={details.mother_name}/><PrintCell label="Mother’s Occupation" value={details.mother_occupation}/><div className="application-print-span-3">{printDetail("language_dialect")}</div><PrintCell label="Emergency Contact Person" value={details.emergency_contact_person}/><PrintCell label="Emergency Contact No." value={details.emergency_contact_no}/><div className="application-print-span-3">{printDetail("emergency_contact_address")}</div></div>
    <PrintBar>Educational Background</PrintBar><div className="application-print-grid application-print-grid-2">{educationKeys.map(printDetail)}</div>
    <PrintBar>Awards and Recognition</PrintBar><div className="application-print-grid application-print-grid-2">{awardsKeys.map(printDetail)}<div className="application-print-span-2 application-print-special-skills">{printDetail("special_skills")}</div></div>
    <PrintBar>Character References</PrintBar><div className="application-print-grid application-print-grid-2">{referenceKeys.map(printDetail)}</div>
  </article></div>}{application && <div className="print-registration"><article className="application-print-page registration-print-page">
    <header className="registration-print-header"><div><p className="registration-print-school">EduTrack University</p><p className="registration-print-subtitle">Student copy</p><h1>REGISTRATION FORM</h1><p>Generated {new Date().toLocaleString()}</p></div>{application.photo && <img src={apiUrl("student_application_photo")} alt="Student 2×2 photograph" className="application-print-photo"/>}</header>
    <PrintBar>Student Information</PrintBar>
    <div className="application-print-grid application-print-grid-3 registration-student-grid"><PrintCell label="Student number" value={application.student_number}/><div className="application-print-span-2"><PrintCell label="Student name" value={`${application.first_name} ${details.middle_name ? `${details.middle_name} ` : ""}${application.last_name}${application.name_suffix ? ` ${application.name_suffix}` : ""}`}/></div><PrintCell label="Course / program" value={`${application.program_code ?? "—"} · ${application.program_name ?? ""}`}/><PrintCell label="Major" value="—"/><PrintCell label="Year level" value={application.year_level}/><PrintCell label="Semester" value={academicProfile?.active_term_name}/><PrintCell label="School year" value={academicProfile?.active_year_label}/><PrintCell label="Date" value={dateLabel(new Date().toISOString())}/><div className="application-print-span-3"><PrintCell label="Address" value={details.permanent_address}/></div><PrintCell label="Contact number" value={application.phone}/><div className="application-print-span-2"><PrintCell label="E-mail address" value={application.applicant_email}/></div></div>
    <PrintBar>Enrolled Subjects</PrintBar><table className="registration-print-table"><thead><tr><th>Course number</th><th>Section</th><th>Course code</th><th>Course title</th><th>Instructor</th><th>Units</th></tr></thead><tbody>{courses.map((course) => <tr key={course.enrollment_id}><td>{course.course_number || "—"}</td><td>{course.section_code}</td><td>{course.course_code}</td><td>{course.course_title}</td><td>{course.instructor || "Unassigned"}</td><td>{Number(course.units).toFixed(2)}</td></tr>)}{courses.length === 0 && <tr><td colSpan={6}>No active enrolled subjects are available.</td></tr>}</tbody><tfoot><tr><td colSpan={5}>Total units</td><td>{totalUnits.toFixed(2)}</td></tr></tfoot></table>
    <PrintBar>Fees and Assessment</PrintBar><div className="registration-print-note">Fee assessment is not currently managed by EduTrack. Contact the registrar or cashier for official fee details.</div>
    <PrintBar>Registration Status</PrintBar><div className="registration-print-validation"><strong>APPROVED</strong><span>Application approved {dateLabel(application.reviewed_at)}</span><span>Student signature: __________________________________________</span></div>
    <footer className="registration-print-footer">This registration form is generated from the student record in EduTrack. Course load and fee details should be confirmed with the Registrar and Cashier.</footer>
  </article></div>}</div>;
}
