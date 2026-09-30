"use client";

import { useEffect, useMemo, useState } from "react";
import { requestJson } from "@/lib/client-api";
import type { AttendanceRecord } from "@/types/admin";

type AttendanceResponse = { active_year: string; attendance: AttendanceRecord[] };
type SortKey = "name" | "event" | "checked_in_at";

const checkedInFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York"
});

function formatCheckedIn(value: string | null) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : checkedInFormatter.format(date);
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [activeYear, setActiveYear] = useState("");
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("checked_in_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAttendance() {
    setLoading(true);
    setError(null);
    try {
      const data = await requestJson<AttendanceResponse>("/api/admin/attendance");
      setRecords(data.attendance);
      setActiveYear(data.active_year);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load attendance.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAttendance();
  }, []);

  const events = useMemo(() => {
    const byId = new Map<number, string>();
    for (const record of records) {
      if (record.event_id !== null) {
        byId.set(record.event_id, record.event_name);
      }
    }
    return Array.from(byId.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [records]);

  const results = useMemo(() => {
    const term = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesSearch =
        !term ||
        record.member_name.toLowerCase().includes(term) ||
        record.net_id.toLowerCase().includes(term) ||
        record.event_name.toLowerCase().includes(term);
      const matchesEvent = eventFilter === "all" || String(record.event_id) === eventFilter;
      return matchesSearch && matchesEvent;
    });
  }, [records, search, eventFilter]);

  const sortedResults = useMemo(() => {
    const sorted = [...results].sort((a, b) => {
      if (sortKey === "name") {
        return a.member_last_first.localeCompare(b.member_last_first, undefined, { sensitivity: "base" });
      }
      if (sortKey === "event") {
        return a.event_name.localeCompare(b.event_name, undefined, { sensitivity: "base" });
      }
      const aTime = a.checked_in_at ? new Date(a.checked_in_at).getTime() : 0;
      const bTime = b.checked_in_at ? new Date(b.checked_in_at).getTime() : 0;
      return aTime - bTime;
    });
    if (sortDirection === "desc") {
      sorted.reverse();
    }
    return sorted;
  }, [results, sortKey, sortDirection]);

  function handleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection(nextKey === "checked_in_at" ? "desc" : "asc");
  }

  function sortIndicator(targetKey: SortKey) {
    if (sortKey !== targetKey) {
      return "↕";
    }
    return sortDirection === "asc" ? "↑" : "↓";
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Attendance</h2>
        <p className="text-slate-600">Active school year: {activeYear || "Loading..."}</p>
      </div>

      {error ? <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="panel grid grid-cols-1 gap-3 rounded-xl p-4 sm:grid-cols-2 lg:grid-cols-5">
        <input
          className="field sm:col-span-2 lg:col-span-2"
          placeholder="Search by name, NetID, or event"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="text-sm text-slate-600">
          Event
          <select className="field mt-1" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
            <option value="all">All</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className="btn-secondary w-full sm:w-auto"
          onClick={() => {
            setEventFilter("all");
            setSearch("");
          }}
        >
          Clear Filters
        </button>
        <button className="btn-secondary w-full sm:w-auto" onClick={() => void loadAttendance()}>
          Refresh From Server
        </button>
      </div>

      <p className="text-sm text-slate-600">
        Showing <span className="font-semibold text-slate-900">{results.length}</span> of{" "}
        <span className="font-semibold text-slate-900">{records.length}</span> check-ins
      </p>

      <div className="panel overflow-x-auto rounded-xl p-2">
        {loading ? (
          <p className="p-4 text-sm text-slate-600">Loading attendance...</p>
        ) : sortedResults.length === 0 ? (
          <p className="p-4 text-sm text-slate-600">No check-ins found.</p>
        ) : (
          <table className="w-full min-w-[560px] text-xs sm:text-sm">
            <thead>
              <tr className="text-left text-slate-600">
                <th className="px-3 py-2">
                  <button className="font-semibold" onClick={() => handleSort("name")}>
                    Name {sortIndicator("name")}
                  </button>
                </th>
                <th className="px-3 py-2">
                  <button className="font-semibold" onClick={() => handleSort("event")}>
                    Event {sortIndicator("event")}
                  </button>
                </th>
                <th className="px-3 py-2">
                  <button className="font-semibold" onClick={() => handleSort("checked_in_at")}>
                    Checked In {sortIndicator("checked_in_at")}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedResults.map((record) => (
                <tr key={record.id} className="border-t border-slate-100 bg-white hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium">{record.member_name}</td>
                  <td className="px-3 py-2">{record.event_name}</td>
                  <td className="px-3 py-2">{formatCheckedIn(record.checked_in_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
