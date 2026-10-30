"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { apiRequest } from "@/lib/api";

const days = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
] as const;

type Day = (typeof days)[number]["key"];
type Meeting = {
  course_code: string;
  course_title: string;
  section_code: string;
  day_of_week: Day | null;
  start_time: string | null;
  end_time: string | null;
  room: string | null;
};
type Schedule = {
  term: { term_name: string; year_label: string } | null;
  meetings: Meeting[];
};

function timeInMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTime(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const twelveHour = hour % 12 || 12;
  return `${twelveHour}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

export default function StudentSchedulePage() {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<Schedule>("student_schedule")
      .then(setSchedule)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load your schedule."))
      .finally(() => setLoading(false));
  }, []);

  const slots = useMemo(
    () => Array.from({ length: 22 }, (_, index) => 7 * 60 + index * 30),
    [],
  );

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar role="student" />
      <main className="min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:ml-64 lg:pb-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-7">
            <p className="text-sm font-medium text-blue-600">
              {schedule?.term ? `${schedule.term.term_name} · ${schedule.term.year_label}` : "Active academic term"}
            </p>
            <h1 className="mt-1 text-2xl font-bold">My Schedule</h1>
            <p className="mt-1 text-sm text-slate-500">
              Weekly timetable, Monday through Saturday, in 30-minute intervals.
            </p>
          </div>
          {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="border-b p-4 sm:p-5">
              <h2 className="font-semibold">Weekly timetable</h2>
              <p className="mt-1 text-sm text-slate-500">
                Class meetings appear here when the registrar publishes their days and times.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th scope="col" className="sticky left-0 z-10 border-b border-r bg-slate-50 px-3 py-3 font-semibold">Time</th>
                    {days.map((day) => <th scope="col" key={day.key} className="border-b border-r px-3 py-3 font-semibold">{day.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {slots.map((start) => (
                    <tr key={start} className="h-14">
                      <th scope="row" className="sticky left-0 z-10 whitespace-nowrap border-b border-r bg-white px-3 py-2 font-medium text-slate-600">
                        {formatTime(start)} – {formatTime(start + 30)}
                      </th>
                      {days.map((day) => {
                        const meetings = (schedule?.meetings ?? []).filter((meeting) => {
                          if (meeting.day_of_week !== day.key || !meeting.start_time || !meeting.end_time) return false;
                          return timeInMinutes(meeting.start_time) < start + 30
                            && timeInMinutes(meeting.end_time) > start;
                        });
                        return (
                          <td key={day.key} className="w-[15%] border-b border-r p-1 align-top">
                            {meetings.map((meeting, index) => (
                              <div key={`${meeting.course_code}-${meeting.start_time}-${index}`} className="mb-1 rounded-md bg-blue-50 px-2 py-1 text-[11px] leading-4 text-blue-900">
                                <span className="font-semibold">{meeting.course_code}</span>
                                {meeting.room && <span className="block text-blue-700">{meeting.room}</span>}
                              </div>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!loading && !error && !schedule?.meetings.some((meeting) => meeting.day_of_week) && (
              <p className="border-t px-5 py-4 text-sm text-slate-500">No class meeting times have been published yet.</p>
            )}
            {loading && <p className="border-t px-5 py-4 text-sm text-slate-500">Loading your schedule…</p>}
          </section>
        </div>
      </main>
    </div>
  );
}
