"use client";

import { useEffect, useState } from "react";
import { requestJson } from "@/lib/client-api";

type MemberStatusSemester = "Fall" | "Spring";

type SettingsResponse = {
  settings: {
    id: number;
    active_year: string;
    member_status_year?: number | null;
    member_status_semester?: MemberStatusSemester | null;
  };
};

function computeNextYearLabel(activeYear: string) {
  const [start, end] = activeYear.split("-").map((item) => Number(item));
  if (!Number.isInteger(start) || !Number.isInteger(end) || end !== start + 1) {
    const current = new Date().getFullYear();
    return `${current}-${current + 1}`;
  }

  return `${start + 1}-${end + 1}`;
}

function periodIndex(year: number, semester: MemberStatusSemester) {
  return semester === "Fall" ? year * 2 : year * 2 - 1;
}

function encodePeriod(year: number, semester: MemberStatusSemester) {
  return `${semester}-${year}`;
}

function decodePeriod(value: string): { year: number; semester: MemberStatusSemester } | null {
  const [semester, yearString] = value.split("-");
  const year = Number(yearString);
  if ((semester !== "Fall" && semester !== "Spring") || !Number.isInteger(year)) {
    return null;
  }
  return { year, semester };
}

export default function SettingsPage() {
  const [activeYear, setActiveYear] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [memberStatusYear, setMemberStatusYear] = useState<number | null>(null);
  const [memberStatusSemester, setMemberStatusSemester] = useState<MemberStatusSemester | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadSettings() {
    setLoading(true);
    setError(null);
    try {
      const data = await requestJson<SettingsResponse>("/api/admin/settings");
      setActiveYear(data.settings.active_year);
      setSelectedYear(data.settings.active_year);
      setMemberStatusYear(data.settings.member_status_year ?? null);
      setMemberStatusSemester(data.settings.member_status_semester ?? null);
      if (data.settings.member_status_year && data.settings.member_status_semester) {
        setSelectedPeriod(encodePeriod(data.settings.member_status_year, data.settings.member_status_semester));
      } else {
        setSelectedPeriod(encodePeriod(new Date().getFullYear(), "Fall"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  const now = new Date().getFullYear();
  const quickYears = Array.from({ length: 7 }, (_, index) => {
    const start = now - 2 + index;
    return `${start}-${start + 1}`;
  });

  if (activeYear && !quickYears.includes(activeYear)) {
    quickYears.push(activeYear);
  }

  quickYears.sort();

  const periodOptions = Array.from({ length: 7 }, (_, index) => {
    const start = now - 2 + index;
    return [encodePeriod(start, "Fall"), encodePeriod(start + 1, "Spring")];
  }).flat();

  if (
    memberStatusYear &&
    memberStatusSemester &&
    !periodOptions.includes(encodePeriod(memberStatusYear, memberStatusSemester))
  ) {
    periodOptions.push(encodePeriod(memberStatusYear, memberStatusSemester));
  }

  periodOptions.sort((a, b) => {
    const decodedA = decodePeriod(a);
    const decodedB = decodePeriod(b);
    if (!decodedA || !decodedB) {
      return 0;
    }
    return periodIndex(decodedA.year, decodedA.semester) - periodIndex(decodedB.year, decodedB.semester);
  });

  async function updateActiveYear(nextYear: string) {
    setUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = await requestJson<SettingsResponse>("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ active_year: nextYear })
      });

      setActiveYear(payload.settings.active_year);
      setSelectedYear(payload.settings.active_year);
      setSuccess(`Active school year updated to ${payload.settings.active_year}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update active year.");
    } finally {
      setUpdating(false);
    }
  }

  async function handleStartNewYear() {
    const nextYear = computeNextYearLabel(activeYear);
    const confirmed = window.confirm(
      `Start a new school year and update active year from ${activeYear} to ${nextYear}?`
    );

    if (!confirmed) {
      return;
    }
    await updateActiveYear(nextYear);
  }

  async function handleSetSelectedYear() {
    const valid = /^\d{4}-\d{4}$/.test(selectedYear);
    if (!valid) {
      setError("Use school year format YYYY-YYYY.");
      return;
    }

    if (selectedYear === activeYear) {
      setSuccess("Active year is already set to that value.");
      return;
    }

    const confirmed = window.confirm(`Set active year to ${selectedYear}?`);
    if (!confirmed) {
      return;
    }

    await updateActiveYear(selectedYear);
  }

  async function handleSetMemberStatusPeriod() {
    const decoded = decodePeriod(selectedPeriod);
    if (!decoded) {
      setError("Choose a valid semester and year.");
      return;
    }

    if (memberStatusYear === decoded.year && memberStatusSemester === decoded.semester) {
      setSuccess("Member status period is already set to that value.");
      return;
    }

    const confirmed = window.confirm(
      `Set member status period to ${decoded.semester} ${decoded.year}?`
    );
    if (!confirmed) {
      return;
    }

    setUpdatingStatus(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = await requestJson<SettingsResponse>("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({
          member_status_year: decoded.year,
          member_status_semester: decoded.semester
        })
      });

      setMemberStatusYear(payload.settings.member_status_year ?? null);
      setMemberStatusSemester(payload.settings.member_status_semester ?? null);
      setSuccess(`Member statuses updated for ${decoded.semester} ${decoded.year}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update member status period.");
    } finally {
      setUpdatingStatus(false);
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="text-slate-600">Manage dashboard-wide settings.</p>
      </div>

      {error ? <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="rounded-md bg-green-100 px-3 py-2 text-sm text-green-700">{success}</p> : null}

      <div className="panel max-w-xl rounded-xl p-4">
        <h3 className="mb-2 text-lg font-semibold">Current Active Year</h3>
        {loading ? (
          <p className="text-sm text-slate-600">Loading settings...</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-3xl font-bold text-blue-700">{activeYear}</p>
              <p className="text-sm text-slate-500">
                Current active year — scopes events and other year-based views.
              </p>
              <div className="space-y-2">
                <label className="text-sm text-slate-600">Set Active Year</label>
                <div className="flex flex-wrap gap-2">
                  <select
                    className="field max-w-xs"
                    value={selectedYear}
                    onChange={(event) => setSelectedYear(event.target.value)}
                  >
                    {quickYears.map((yearOption) => (
                      <option key={yearOption} value={yearOption} className="bg-white">
                        {yearOption}
                      </option>
                    ))}
                  </select>
                  <button className="btn-secondary" onClick={() => void handleSetSelectedYear()} disabled={updating}>
                    Save Selected Year
                  </button>
                </div>
              </div>
            </div>
            <button className="btn-primary" onClick={() => void handleStartNewYear()} disabled={updating}>
              {updating ? "Updating..." : `Start New School Year (${computeNextYearLabel(activeYear)})`}
            </button>
          </div>
        )}
      </div>

      <div className="panel max-w-xl rounded-xl p-4">
        <h3 className="mb-2 text-lg font-semibold">Member Status Period</h3>
        {loading ? (
          <p className="text-sm text-slate-600">Loading settings...</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-3xl font-bold text-blue-700">
                {memberStatusYear && memberStatusSemester
                  ? `${memberStatusSemester} ${memberStatusYear}`
                  : "Not set"}
              </p>
              <p className="text-sm text-slate-500">
                {memberStatusYear && memberStatusSemester
                  ? "Last applied member status period."
                  : "No member-status update has been applied yet."}
              </p>
              <div className="space-y-2">
                <label className="text-sm text-slate-600">Set Member Status Period</label>
                <div className="flex flex-wrap gap-2">
                  <select
                    className="field max-w-xs"
                    value={selectedPeriod}
                    onChange={(event) => setSelectedPeriod(event.target.value)}
                  >
                    {periodOptions.map((option) => {
                      const decoded = decodePeriod(option);
                      return (
                        <option key={option} value={option} className="bg-white">
                          {decoded ? `${decoded.semester} ${decoded.year}` : option}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    className="btn-secondary"
                    onClick={() => void handleSetMemberStatusPeriod()}
                    disabled={updatingStatus}
                  >
                    {updatingStatus ? "Updating..." : "Save Member Status Period"}
                  </button>
                </div>
                <p className="text-xs text-amber-700">
                  Warning: this is a real database change.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
