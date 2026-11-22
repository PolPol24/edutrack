"use client";

import { useMemo, useState } from "react";

export type AttendanceAnalyticsRecord = {
  session_date: string;
  attendance_status: string;
};

type Period = "day" | "week" | "month";
type Status = "all" | "present" | "late" | "absent";
type CountStatus = Exclude<Status, "all">;

const statuses: CountStatus[] = ["present", "late", "absent"];
const colors: Record<CountStatus, string> = {
  present: "#059669",
  late: "#d97706",
  absent: "#e11d48",
};

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shortDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function AttendanceAnalytics({
  records,
  accent = "blue",
  showFilters = true,
}: {
  records: AttendanceAnalyticsRecord[];
  accent?: "blue" | "amber";
  showFilters?: boolean;
}) {
  const [period, setPeriod] = useState<Period>("week");
  const [status, setStatus] = useState<Status>("all");
  const periodDays = period === "day" ? 1 : period === "week" ? 7 : 30;
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - periodDays + 1);
  const startKey = dateKey(startDate);

  const buckets = useMemo(() => {
    const counts = new Map<string, Record<CountStatus, number>>();
    if (showFilters) {
      for (let offset = 0; offset < periodDays; offset += 1) {
        const date = new Date(`${startKey}T00:00:00`);
        date.setDate(date.getDate() + offset);
        counts.set(dateKey(date), { present: 0, late: 0, absent: 0 });
      }
    }
    for (const record of records) {
      const key = record.session_date.slice(0, 10);
      if (!showFilters && !counts.has(key)) counts.set(key, { present: 0, late: 0, absent: 0 });
      const bucket = counts.get(key);
      if (bucket && statuses.includes(record.attendance_status as CountStatus)) {
        bucket[record.attendance_status as CountStatus] += 1;
      }
    }
    return [...counts.entries()]
      .map(([date, values]) => ({ date, values }))
      .sort((left, right) => left.date.localeCompare(right.date));
  }, [periodDays, records, showFilters, startKey]);

  const selectedStatuses = showFilters && status !== "all" ? [status] : statuses;
  const visibleCounts = statuses.reduce((result, item) => {
    result[item] = buckets.reduce((sum, bucket) => sum + (selectedStatuses.includes(item) ? bucket.values[item] : 0), 0);
    return result;
  }, { present: 0, late: 0, absent: 0 });
  const maxValue = Math.max(1, ...buckets.map(({ values }) => selectedStatuses.reduce((sum, item) => sum + values[item], 0)));
  const chartWidth = 760;
  const chartHeight = 150;
  const slotWidth = chartWidth / Math.max(1, buckets.length);
  const barWidth = Math.min(24, Math.max(5, slotWidth * 0.48));
  const labelStep = showFilters && period === "week" ? 1 : showFilters && period === "day" ? 1 : Math.max(1, Math.ceil(buckets.length / 10));
  const muted = accent === "amber" ? "text-amber-700" : "text-blue-700";
  const total = visibleCounts.present + visibleCounts.late + visibleCounts.absent;

  return (
    <section className="mb-5 overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b p-5">
        <div>
          <h2 className="font-semibold">Attendance trends</h2>
          <p className="mt-1 text-sm text-slate-500">
            {showFilters ? "Daily present, late, and absent records over the selected period." : "Daily present, late, and absent totals for the report filters above."}
          </p>
        </div>
        {showFilters && <div className="flex flex-wrap gap-3">
          <label className="text-xs font-semibold text-slate-500">Period
            <select aria-label="Attendance period" value={period} onChange={(event) => setPeriod(event.target.value as Period)} className="mt-1 block rounded-lg border bg-white px-3 py-2 text-sm text-slate-800">
              <option value="day">Day (today)</option><option value="week">Week (7 days)</option><option value="month">Month (30 days)</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-500">Status
            <select aria-label="Attendance status" value={status} onChange={(event) => setStatus(event.target.value as Status)} className="mt-1 block rounded-lg border bg-white px-3 py-2 text-sm text-slate-800">
              <option value="all">All statuses</option><option value="present">Present</option><option value="late">Late</option><option value="absent">Absent</option>
            </select>
          </label>
        </div>}
      </div>
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
            {statuses.map((item) => <span key={item} className="inline-flex items-center gap-1.5 capitalize"><i className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: colors[item] }} />{item}</span>)}
          </div>
          <div className="overflow-x-auto">
            <svg role="img" aria-label={`Attendance records for ${showFilters ? `the last ${periodDays} days` : "the applied report filters"}`} viewBox={`0 0 ${chartWidth} 190`} className="h-[190px] min-w-[560px] w-full">
              <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#e2e8f0" />
              {buckets.map(({ date, values }, index) => {
                const count = selectedStatuses.reduce((sum, item) => sum + values[item], 0);
                const x = index * slotWidth + (slotWidth - barWidth) / 2;
                let stackHeight = 0;
                const bars = selectedStatuses.map((item) => {
                  const value = values[item];
                  const height = (value / maxValue) * 112;
                  const y = chartHeight - stackHeight - height;
                  stackHeight += height;
                  return value ? <rect key={item} x={x} y={y} width={barWidth} height={Math.max(2, height)} fill={colors[item]} /> : null;
                });
                const showLabel = index % labelStep === 0 || index === buckets.length - 1;
                return <g key={date}>
                  {bars}
                  {count > 0 && <text x={x + barWidth / 2} y={chartHeight - stackHeight - 6} textAnchor="middle" fontSize="10" fill="#475569">{count}</text>}
                  {showLabel && <text x={x + barWidth / 2} y="172" textAnchor="middle" fontSize="10" fill="#64748b">{shortDate(date)}</text>}
                </g>;
              })}
            </svg>
          </div>
          {total === 0 && <p className="-mt-2 text-center text-sm text-slate-500">No attendance records match this report.</p>}
        </div>
        <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
          {statuses.map((item) => <div key={item} className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs capitalize text-slate-500">{item}</p><p className={`mt-1 text-xl font-bold ${muted}`}>{visibleCounts[item]}</p>
          </div>)}
          <p className="col-span-3 text-xs text-slate-400 lg:col-span-1">
            {showFilters ? (period === "day" ? `Today, ${shortDate(dateKey(new Date()))}` : `Showing ${periodDays} days through today`) : `${total.toLocaleString()} attendance records in this chart`}
          </p>
        </div>
      </div>
    </section>
  );
}
