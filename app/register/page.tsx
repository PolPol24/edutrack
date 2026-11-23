"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, FileUp, GraduationCap, ImagePlus, Mail, Phone, UserRound } from "lucide-react";
import { apiRequest } from "@/lib/api";
import FaceEnrollmentCapture, { FaceCapture } from "@/components/FaceEnrollmentCapture";
import { decimalNumber, digitsOnly, lettersAndNamePunctuation, phoneNumber } from "@/lib/input-sanitizers";

type Program = { program_id: string; program_code: string; program_name: string };
type ApplicationDetails = Record<string, string>;

const inputClass = "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";
const labelClass = "block text-sm font-medium text-slate-700";
const blackSectionClass = "bg-slate-950 px-3 py-2 text-sm font-bold uppercase tracking-wide text-white";
const educationRows = [
  ["Elementary", "elementary_school", "elementary_year_graduated"],
  ["High school", "high_school", "high_school_year_graduated"],
  ["Vocational", "vocational", "vocational_year_graduated"],
] as const;
const documentLabels = ["PSA Birth Certificate", "Good Moral Certificate", "Medical Certificate"];
const demoPayment = { recipient: "Campus Payment Demo 4827", accountNumber: "DEMO-0000-0000-0075" };

function localDateString(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function emptyApplicationDetails(): ApplicationDetails {
  const details: ApplicationDetails = {};
  for (const key of [
    "middle_name", "sex", "permanent_address", "place_of_birth", "civil_status", "citizenship", "religion",
    "height_cm", "weight_kg", "father_name", "father_occupation", "mother_name", "mother_occupation", "language_dialect",
    "emergency_contact_person", "emergency_contact_address", "emergency_contact_no", "elementary_school", "elementary_year_graduated",
    "high_school", "high_school_year_graduated", "vocational", "vocational_year_graduated",
    "special_skills", "reference_1_name", "reference_1_contact", "reference_2_name", "reference_2_contact", "reference_3_name", "reference_3_contact",
    "award_1", "award_2", "award_3", "award_4", "award_5",
  ]) details[key] = "";
  return details;
}

export default function StudentRegistrationPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programId, setProgramId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [details, setDetails] = useState<ApplicationDetails>(emptyApplicationDetails);
  const [documentFiles, setDocumentFiles] = useState<(File | null)[]>([null, null, null]);
  const [processingFeeReceipt, setProcessingFeeReceipt] = useState<File | null>(null);
  const [applicationPhoto, setApplicationPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [faceCapture, setFaceCapture] = useState<FaceCapture | null>(null);
  const [faceConsent, setFaceConsent] = useState(false);
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const maxDate = useMemo(() => localDateString(new Date()), []);
  const yearLevel = 1;

  useEffect(() => {
    void apiRequest<{ programs: Program[] }>("student_registration_options")
      .then(({ programs: availablePrograms }) => {
        setPrograms(availablePrograms);
        if (availablePrograms.length === 1) setProgramId(availablePrograms[0].program_id);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load academic programs."));
  }, []);

  useEffect(() => {
    if (!applicationPhoto) { setPhotoPreview(""); return; }
    const previewUrl = URL.createObjectURL(applicationPhoto);
    setPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [applicationPhoto]);

  function updateDetail(key: string, value: string) {
    if (["height_cm", "weight_kg"].includes(key)) value = decimalNumber(value, 1);
    else if (key.endsWith("_year_graduated")) value = digitsOnly(value, 4);
    else if (key.endsWith("_contact") || key === "emergency_contact_no") value = phoneNumber(value);
    else if (["middle_name", "place_of_birth", "citizenship", "religion", "father_name", "father_occupation", "mother_name", "mother_occupation", "language_dialect", "emergency_contact_person", "elementary_school", "high_school", "vocational", "reference_1_name", "reference_2_name", "reference_3_name"].includes(key)) value = lettersAndNamePunctuation(value);
    setDetails((current) => ({ ...current, [key]: value }));
  }

  function detailInput(label: string, key: string, options: { required?: boolean; type?: string; maxLength?: number; step?: string } = {}) {
    const required = options.required !== false;
    return <label key={key} className={labelClass}><span>{label}{required&&<span className="ml-1 text-red-600" aria-label="required">*</span>}</span><input type={options.type === "number" ? "text" : options.type ?? "text"} inputMode={options.type === "number" ? "decimal" : undefined} required={required} maxLength={options.maxLength ?? 180} value={details[key] ?? ""} onChange={(event) => updateDetail(key, event.target.value)} className={inputClass}/></label>;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!faceCapture || !faceConsent) { setError("Complete face enrollment and confirm the face data notice to submit your application."); return; }
    if (documentFiles.some((file) => !file)) { setError("Upload all three required freshman documents."); return; }
    if (documentFiles.some((file) => file && file.size > 10 * 1024 * 1024)) { setError("Each document must be 10 MB or smaller."); return; }
    if (!processingFeeReceipt) { setError("Upload a screenshot of the ₱75 processing fee receipt."); return; }
    if (processingFeeReceipt.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png"].includes(processingFeeReceipt.type)) { setError("The processing fee receipt must be a JPG or PNG image up to 5 MB."); return; }
    if (!applicationPhoto) { setError("Upload your required 2×2 applicant photo."); return; }
    if (applicationPhoto.size > 5 * 1024 * 1024) { setError("The applicant photo must be 5 MB or smaller."); return; }

    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("registration_data", JSON.stringify({
        program_id: programId,
        year_level: yearLevel,
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth,
        email,
        phone,
        application_details: details,
        ...faceCapture,
        face_consent: faceConsent,
      }));
      documentFiles.forEach((file, index) => { if (file) body.append(`document_${index + 1}`, file); });
      body.append("processing_fee_receipt", processingFeeReceipt);
      body.append("application_photo", applicationPhoto);
      const result = await apiRequest<{ request_id: number }>("student_registrations", { method: "POST", body });
      setRequestId(result.request_id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to submit your application.");
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6">
    <div className="mx-auto max-w-5xl">
      <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-700"><ArrowLeft size={16}/>Back to sign in</Link>
      <section className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        <div className="bg-slate-950 px-6 py-7 text-white sm:px-9"><div className="mb-4 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600"><GraduationCap size={22}/></div><span className="text-lg font-semibold">EduTrack</span><span className="rounded-full bg-blue-500/20 px-2.5 py-1 text-xs font-medium text-blue-200">Incoming freshman application</span></div><h1 className="text-2xl font-semibold">Freshman application form</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Complete the information below and upload the required documents. Account setup and account details are handled separately after registrar approval.</p></div>
        {requestId ? <div className="p-8 sm:p-10"><div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-700"><UserRound size={22}/></div><h2 className="text-xl font-semibold">Application submitted</h2><p className="mt-2 text-sm leading-6 text-slate-600">Your application <span className="font-semibold">#{requestId}</span> is waiting for registrar review. Account setup and account details are handled separately after approval.</p><Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700">Return to sign in <ArrowRight size={16}/></Link></div> : <form onSubmit={submit} className="space-y-7 p-5 sm:p-8">
          <section className="space-y-4">
            <h2 className={blackSectionClass}>Personal Data</h2>
            <div className="grid gap-4 sm:grid-cols-3"><label className={labelClass}><span>First name<span className="ml-1 text-red-600" aria-label="required">*</span></span><input required maxLength={80} autoComplete="given-name" value={firstName} onChange={(event)=>setFirstName(lettersAndNamePunctuation(event.target.value))} className={inputClass}/></label>{detailInput("Middle name", "middle_name", { maxLength: 80 })}<label className={labelClass}><span>Last name<span className="ml-1 text-red-600" aria-label="required">*</span></span><input required maxLength={80} autoComplete="family-name" value={lastName} onChange={(event)=>setLastName(lettersAndNamePunctuation(event.target.value))} className={inputClass}/></label></div>
            <div className="grid gap-4 sm:grid-cols-2"><label className={labelClass}><span>Sex<span className="ml-1 text-red-600" aria-label="required">*</span></span><select required value={details.sex} onChange={(event)=>updateDetail("sex",event.target.value)} className={inputClass}><option value="">Select</option><option>Male</option><option>Female</option></select></label>{detailInput("Permanent address", "permanent_address", { maxLength: 255 })}</div>
            <div className="grid gap-4 sm:grid-cols-2"><label className={labelClass}><span>Contact number<span className="ml-1 text-red-600" aria-label="required">*</span></span><div className="relative"><Phone size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input required type="tel" maxLength={40} autoComplete="tel" value={phone} onChange={(event)=>setPhone(phoneNumber(event.target.value))} className={`${inputClass} pl-9`}/></div></label><label className={labelClass}><span>Email address<span className="ml-1 text-red-600" aria-label="required">*</span></span><div className="relative"><Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input required type="email" maxLength={254} autoComplete="email" value={email} onChange={(event)=>setEmail(event.target.value)} className={`${inputClass} pl-9`}/></div></label></div>
            <div className="grid gap-4 sm:grid-cols-2"><label className={labelClass}><span>Date of birth<span className="ml-1 text-red-600" aria-label="required">*</span></span><input required type="date" max={maxDate} value={dateOfBirth} onChange={(event)=>setDateOfBirth(event.target.value)} className={inputClass}/></label>{detailInput("Place of birth", "place_of_birth")}</div>
            <div className="grid gap-4 sm:grid-cols-3"><label className={labelClass}><span>Civil status<span className="ml-1 text-red-600" aria-label="required">*</span></span><select required value={details.civil_status} onChange={(event)=>updateDetail("civil_status",event.target.value)} className={inputClass}><option value="">Select</option>{["Single","Married","Widowed","Separated","Other"].map((item)=><option key={item}>{item}</option>)}</select></label>{detailInput("Citizenship", "citizenship")}{detailInput("Religion", "religion")}</div>
            <div className="grid gap-4 sm:grid-cols-3">{detailInput("Height (cm)", "height_cm", { type: "number", step: "0.1" })}{detailInput("Weight (kg)", "weight_kg", { type: "number", step: "0.1" })}<label className={labelClass}><span>Year & course<span className="ml-1 text-red-600" aria-label="required">*</span></span><select required value={programId} onChange={(event)=>setProgramId(event.target.value)} className={inputClass}><option value="">Select program · Year 1</option>{programs.map((program)=><option key={program.program_id} value={program.program_id}>Year 1 · {program.program_code} — {program.program_name}</option>)}</select></label></div>
            <div className="grid gap-4 sm:grid-cols-2">{detailInput("Father’s name", "father_name")}{detailInput("Father’s occupation", "father_occupation")}{detailInput("Mother’s name", "mother_name")}{detailInput("Mother’s occupation", "mother_occupation")}</div>
            {detailInput("Language or dialect spoken/written", "language_dialect")}
            <div className="grid gap-4 sm:grid-cols-2">{detailInput("Emergency contact person", "emergency_contact_person")}{detailInput("Emergency contact number", "emergency_contact_no", { maxLength: 40 })}</div>
            {detailInput("Emergency contact address", "emergency_contact_address", { maxLength: 255 })}
          </section>

          <section className="space-y-4">
            <h2 className={blackSectionClass}>Educational Background</h2>
            <div className="space-y-3">{educationRows.map(([label, schoolKey, yearKey])=>{const required=label!=="Vocational";return <div key={schoolKey} className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[minmax(0,1fr)_220px]"><label className={labelClass}><span>{label}{required&&<span className="ml-1 text-red-600" aria-label="required">*</span>}</span><input required={required} value={details[schoolKey]} onChange={(event)=>updateDetail(schoolKey,event.target.value)} className={inputClass}/></label><label className={labelClass}><span>Year graduated{required&&<span className="ml-1 text-red-600" aria-label="required">*</span>}</span><input required={required} type="text" inputMode="numeric" maxLength={4} pattern={required?"\\d{4}":undefined} value={details[yearKey]} onChange={(event)=>updateDetail(yearKey,event.target.value.replace(/\D/g, ""))} placeholder="YYYY" className={inputClass}/></label></div>;})}</div>
          </section>

          <section className="space-y-4">
            <h2 className={blackSectionClass}>Awards and Recognition</h2>
            <div className="space-y-2">{[1,2,3,4,5].map((number)=><label key={number} className="flex items-center gap-3 text-sm text-slate-700"><span className="w-5 text-slate-500">{number}</span><input aria-label={`Award or recognition ${number}`} value={details[`award_${number}`]} onChange={(event)=>updateDetail(`award_${number}`,event.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"/></label>)}</div>
            <label className={labelClass}>Special skills<textarea rows={4} value={details.special_skills} onChange={(event)=>updateDetail("special_skills",event.target.value)} className={inputClass}/></label>
          </section>

          <section className="space-y-4">
            <h2 className={blackSectionClass}>Character References</h2>
            {[1,2,3].map((number)=><div key={number} className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-2"><label className={labelClass}><span>Name<span className="ml-1 text-red-600" aria-label="required">*</span></span><input required value={details[`reference_${number}_name`]} onChange={(event)=>updateDetail(`reference_${number}_name`,event.target.value)} className={inputClass}/></label><label className={labelClass}><span>Contact number<span className="ml-1 text-red-600" aria-label="required">*</span></span><input required type="tel" maxLength={40} value={details[`reference_${number}_contact`]} onChange={(event)=>updateDetail(`reference_${number}_contact`,event.target.value)} className={inputClass}/></label></div>)}
          </section>

          <section className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
            <div><h2 className="font-semibold text-slate-800">Face enrollment for attendance<span className="ml-1 text-red-600" aria-label="required">*</span></h2><p className="mt-1 text-sm leading-5 text-slate-600">Your camera is checked for liveness on this device. Five face images are sent to EduTrack’s self-hosted CompreFace service for attendance matching after your application is approved.</p></div>
            <FaceEnrollmentCapture onCapture={setFaceCapture}/>
            <label className="flex items-start gap-2 text-sm leading-5 text-slate-700"><input required type="checkbox" checked={faceConsent} onChange={(event)=>setFaceConsent(event.target.checked)} className="mt-1 accent-blue-600"/>I consent to sending and storing my face images in EduTrack’s local CompreFace service for attendance recognition.<span className="text-red-600" aria-label="required">*</span></label>
          </section>

          <section className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
            <div><h2 className="font-semibold text-slate-800">Required freshman documents</h2><p className="mt-1 text-sm leading-5 text-slate-600">Upload one PDF for each required document and your 2×2 applicant photo. The registrar will review them with your application. PDFs may be up to 10 MB each.</p></div>
            {documentLabels.map((label,index)=><label key={label} className="block rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm font-medium text-slate-700"><span className="mb-2 block">{label}<span className="ml-1 text-red-600" aria-label="required">*</span></span><span className="mb-3 flex items-center gap-2 text-xs font-normal text-slate-500"><FileUp size={15}/>PDF file, up to 10 MB</span><input required type="file" accept=".pdf,application/pdf" onChange={(event)=>{const file=event.target.files?.[0]??null;setDocumentFiles((current)=>current.map((item,itemIndex)=>itemIndex===index?file:item));}} className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"/>{documentFiles[index]&&<span className="mt-2 block text-xs font-normal text-slate-500">{documentFiles[index]?.name}</span>}</label>)}

            <section className="space-y-3 rounded-xl border border-dashed border-slate-300 bg-white p-4"><div><h2 className="font-semibold text-slate-900">2×2 applicant photo<span className="ml-1 text-red-600" aria-label="required">*</span></h2><p className="mt-1 text-sm leading-5 text-slate-600">Upload a clear JPG or PNG photo, at least 300×300 pixels and up to 5 MB. It will be cropped to a 2×2 square on your downloadable application form.</p></div><div className="flex flex-wrap items-center gap-4">{photoPreview ? <img src={photoPreview} alt="Applicant photo preview" className="h-32 w-32 rounded-lg border border-slate-200 object-cover"/> : <div className="grid h-32 w-32 place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400"><ImagePlus size={26}/></div>}<label className="min-w-[220px] flex-1 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-medium text-slate-700"><span className="mb-2 block">Choose photo<span className="ml-1 text-red-600" aria-label="required">*</span></span><input required type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" onChange={(event)=>setApplicationPhoto(event.target.files?.[0]??null)} className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"/>{applicationPhoto && <span className="mt-2 block text-xs font-normal text-slate-500">{applicationPhoto.name}</span>}</label></div></section>
          </section>

          <section className="space-y-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
            <div><h2 className="font-semibold text-slate-900">Processing fee receipt<span className="ml-1 text-red-600" aria-label="required">*</span></h2><p className="mt-1 text-sm leading-5 text-slate-700">Submit a screenshot of your ₱75 processing fee transfer. Upload a JPG or PNG image up to 5 MB.</p></div>
            <div className="rounded-xl border border-amber-300 bg-white p-4 text-sm text-slate-700"><p><span className="font-semibold">Transfer amount:</span> ₱75.00</p><p className="mt-1"><span className="font-semibold">Demo account name:</span> {demoPayment.recipient}</p><p className="mt-1"><span className="font-semibold">Demo account number:</span> {demoPayment.accountNumber}</p><p className="mt-3 font-semibold text-rose-700">Presentation demo only. These are not real bank details. Do not transfer real money.</p></div>
            <label className="block rounded-xl border border-dashed border-amber-400 bg-white p-4 text-sm font-medium text-slate-700"><span className="mb-2 block">Screenshot of Processing Fee Receipt<span className="ml-1 text-red-600" aria-label="required">*</span></span><span className="mb-3 flex items-center gap-2 text-xs font-normal text-slate-500"><FileUp size={15}/>JPG or PNG image, up to 5 MB</span><input required type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" onChange={(event)=>setProcessingFeeReceipt(event.target.files?.[0]??null)} className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"/>{processingFeeReceipt&&<span className="mt-2 block text-xs font-normal text-slate-500">{processingFeeReceipt.name}</span>}</label>
          </section>

          {error&&<p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          <button disabled={submitting} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">{submitting?"Submitting application…":"Submit freshman application"}<ArrowRight size={17}/></button>
          <p className="text-center text-xs leading-5 text-slate-500">Account setup and account details will be handled separately after registrar approval.</p>
        </form>}
      </section>
    </div>
  </main>;
}
