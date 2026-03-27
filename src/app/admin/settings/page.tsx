"use client";

import { useEffect, useState } from "react";
import { requestJson } from "@/lib/client-api";

type SettingsResponse = {
  settings: {
    id: number;
    active_year: string;
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

export default function SettingsPage() {
  const [activeYear, setActiveYear] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadSettings() {
    setLoading(true);
    setError(null);
    try {
      const data = await requestJson<SettingsResponse>("/api/admin/settings");
      setActiveYear(data.settings.active_year);
      setSelectedYear(data.settings.active_year);
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

  async function updateActiveYear(nextYear: string) {
    setUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = await requestJson<SettingsResponse>("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({
          active_year: nextYear
        })
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

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[#1A202C]">Settings</h2>
        <p className="text-[#4A5568]">Manage dashboard-wide settings.</p>
      </div>

      {error ? <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="rounded-md bg-green-100 px-3 py-2 text-sm text-green-700">{success}</p> : null}

      <div className="panel max-w-xl rounded-xl p-4">
        <h3 className="mb-2 text-lg font-semibold">Current Active Year</h3>
        {loading ? (
          <p className="text-sm text-[#4A5568]">Loading settings...</p>
        ) : (
          <div className="space-y-4">
            <p className="text-3xl font-bold text-[#2B6CB0]">{activeYear}</p>
            <div className="space-y-2">
              <label className="text-sm text-[#4A5568]">Set Active Year</label>
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
            <button className="btn-primary" onClick={() => void handleStartNewYear()} disabled={updating}>
              {updating ? "Updating..." : `Start New School Year (${computeNextYearLabel(activeYear)})`}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
