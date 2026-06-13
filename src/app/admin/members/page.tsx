"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { requestJson } from "@/lib/client-api";
import type { Member } from "@/types/admin";

type MembersResponse = { members: Member[] };
type SortKey = "name" | "net_id" | "graduation_year" | "member_type" | "points";
type ContactCopyField = "email" | "personal_email" | "phone_number";

const memberTypes = ["student", "GRADUATING", "alumni"] as const;
const contactCopyFieldLabels: Record<ContactCopyField, string> = {
  email: "School email",
  personal_email: "Personal email",
  phone_number: "Phone number"
};

function toCsvCell(value: string) {
  const escaped = value.replace(/"/g, "\"\"");
  return `"${escaped}"`;
}

type EditMemberPanelProps = {
  activeMember: Member | null;
  saving: boolean;
  onChange: (updater: (current: Member | null) => Member | null) => void;
  onClose: () => void;
  onSave: () => void;
  compact?: boolean;
};

function EditMemberPanel({ activeMember, saving, onChange, onClose, onSave, compact = false }: EditMemberPanelProps) {
  const titleClass = compact ? "text-base font-semibold text-white" : "text-lg font-semibold text-slate-900";
  const bodyTextClass = compact ? "text-sm text-slate-300" : "text-sm text-slate-600";
  const labelClass = compact ? "block text-sm font-medium text-slate-200" : "block text-sm text-slate-700";
  const closeButtonClass = compact
    ? "rounded-md px-2 py-1 text-sm font-bold text-slate-200 hover:bg-slate-600 hover:text-white"
    : "rounded-md px-2 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900";
  const historyClass = compact
    ? "rounded-lg border border-slate-600 bg-slate-900/35 p-3"
    : "rounded-lg border border-slate-200 bg-slate-50 p-3";
  const historyTitleClass = compact ? "text-sm font-semibold text-white" : "text-sm font-semibold text-slate-900";
  const historyMutedClass = compact ? "text-sm text-slate-300" : "text-sm text-slate-600";

  return (
    <aside
      className={
        compact
          ? "rounded-xl border border-slate-600/70 bg-slate-700/35 p-4"
          : "panel rounded-xl p-4"
      }
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className={titleClass}>Edit Member</h3>
        {activeMember ? (
          <button
            type="button"
            className={closeButtonClass}
            onClick={onClose}
            aria-label="Close edit member panel"
            title="Close"
          >
            X
          </button>
        ) : null}
      </div>
      {!activeMember ? (
        <p className={bodyTextClass}>Select a member row to edit.</p>
      ) : (
        <div className="space-y-3 text-sm">
          <label className={labelClass}>
            First Name
            <input
              className="field mt-1"
              value={activeMember.first_name}
              onChange={(e) => onChange((cur) => (cur ? { ...cur, first_name: e.target.value } : cur))}
            />
          </label>

          <label className={labelClass}>
            Last Name
            <input
              className="field mt-1"
              value={activeMember.last_name}
              onChange={(e) => onChange((cur) => (cur ? { ...cur, last_name: e.target.value } : cur))}
            />
          </label>

          <label className={labelClass}>
            NetID (read-only)
            <input className="field mt-1 opacity-70" readOnly value={activeMember.net_id} />
          </label>

          <label className={labelClass}>
            Email (read-only)
            <input className="field mt-1 opacity-70" readOnly value={activeMember.email} />
          </label>

          <label className={labelClass}>
            Graduation Year
            <input
              className="field mt-1"
              type="number"
              value={activeMember.graduation_year ?? ""}
              onChange={(e) =>
                onChange((cur) =>
                  cur
                    ? {
                        ...cur,
                        graduation_year: e.target.value ? Number(e.target.value) : null
                      }
                    : cur
                )
              }
            />
          </label>

          <label className={labelClass}>
            Graduation Semester
            <input
              className="field mt-1"
              value={activeMember.graduation_semester ?? ""}
              onChange={(e) =>
                onChange((cur) =>
                  cur
                    ? {
                        ...cur,
                        graduation_semester: e.target.value
                      }
                    : cur
                )
              }
            />
          </label>

          <label className={labelClass}>
            Member Type
            <select
              className="field mt-1"
              value={activeMember.member_type}
              onChange={(e) =>
                onChange((cur) =>
                  cur
                    ? {
                        ...cur,
                        member_type: e.target.value as Member["member_type"]
                      }
                    : cur
                )
              }
            >
              {memberTypes.map((value) => (
                <option key={value} value={value} className="bg-white">
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className={labelClass}>
            Major
            <input
              className="field mt-1"
              value={activeMember.major ?? ""}
              onChange={(e) =>
                onChange((cur) =>
                  cur
                    ? {
                        ...cur,
                        major: e.target.value
                      }
                    : cur
                )
              }
            />
          </label>

          <label className={labelClass}>
            Personal Email
            <input
              className="field mt-1"
              value={activeMember.personal_email ?? ""}
              onChange={(e) =>
                onChange((cur) =>
                  cur
                    ? {
                        ...cur,
                        personal_email: e.target.value
                      }
                    : cur
                )
              }
            />
          </label>

          <div className={historyClass}>
            <p className={historyTitleClass}>Active Year Points: {activeMember.points_total ?? 0}</p>
            <p className={`mt-2 ${historyTitleClass}`}>Attendance History (Active School Year)</p>
            {activeMember.attendance_history && activeMember.attendance_history.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {activeMember.attendance_history.map((entry) => (
                  <li
                    key={`${entry.event_id}-${entry.checked_in_at ?? entry.event_name}`}
                    className="rounded border border-slate-200 bg-white p-2"
                  >
                    <p className="font-medium text-slate-900">{entry.event_name}</p>
                    <p className="text-xs text-slate-600">
                      {entry.event_date ? new Date(entry.event_date).toLocaleString() : "No event date"}
                    </p>
                    <p className="text-xs text-blue-700">Points: {entry.points_awarded}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={`mt-2 ${historyMutedClass}`}>No attendance records for the active school year.</p>
            )}
          </div>

          <button className="btn-primary w-full" onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </aside>
  );
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [memberTypeFilter, setMemberTypeFilter] = useState<"all" | Member["member_type"]>("all");
  const [graduationYearFilter, setGraduationYearFilter] = useState<string>("all");
  const [personalEmailFilter, setPersonalEmailFilter] = useState<"all" | "has" | "missing">("all");
  const [majorFilter, setMajorFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [activeMember, setActiveMember] = useState<Member | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContactFields, setSelectedContactFields] = useState<ContactCopyField[]>([]);
  const [includeNameColumn, setIncludeNameColumn] = useState(false);
  const [includeNetIdColumn, setIncludeNetIdColumn] = useState(false);
  const [includeEmptyContactValues, setIncludeEmptyContactValues] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [sidebarSlot, setSidebarSlot] = useState<HTMLElement | null>(null);

  async function loadMembers(query = "") {
    setLoading(true);
    setError(null);
    try {
      const path = query ? `/api/admin/members?q=${encodeURIComponent(query)}` : "/api/admin/members";
      const data = await requestJson<MembersResponse>(path);
      setMembers(data.members);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load members.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMembers();
  }, []);

  useEffect(() => {
    setSidebarSlot(document.getElementById("admin-sidebar-slot"));
  }, []);

  const graduationYears = useMemo(() => {
    const years = Array.from(
      new Set(members.map((member) => member.graduation_year).filter((value): value is number => value !== null))
    );
    years.sort((a, b) => a - b);
    return years;
  }, [members]);

  const majors = useMemo(() => {
    const values = Array.from(
      new Set(
        members
          .map((member) => (member.major ?? "").trim())
          .filter((value): value is string => value.length > 0)
      )
    );
    values.sort((a, b) => a.localeCompare(b));
    return values;
  }, [members]);

  const results = useMemo(() => {
    const term = search.trim().toLowerCase();
    return members.filter((member) => {
      const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
      const major = (member.major ?? "").toLowerCase();
      const email = member.email.toLowerCase();
      const matchesSearch =
        !term ||
        fullName.includes(term) ||
        member.net_id.toLowerCase().includes(term) ||
        major.includes(term) ||
        email.includes(term);

      const matchesType = memberTypeFilter === "all" || member.member_type === memberTypeFilter;
      const matchesGradYear =
        graduationYearFilter === "all" || String(member.graduation_year ?? "") === graduationYearFilter;
      const hasPersonalEmail = Boolean(member.personal_email && member.personal_email.trim());
      const matchesPersonalEmail =
        personalEmailFilter === "all" ||
        (personalEmailFilter === "has" && hasPersonalEmail) ||
        (personalEmailFilter === "missing" && !hasPersonalEmail);
      const matchesMajor = majorFilter === "all" || (member.major ?? "").trim() === majorFilter;

      return matchesSearch && matchesType && matchesGradYear && matchesPersonalEmail && matchesMajor;
    });
  }, [members, search, memberTypeFilter, graduationYearFilter, personalEmailFilter, majorFilter]);

  const sortedResults = useMemo(() => {
    const sorted = [...results].sort((a, b) => {
      if (sortKey === "name") {
        const aName = `${a.last_name} ${a.first_name}`.toLowerCase();
        const bName = `${b.last_name} ${b.first_name}`.toLowerCase();
        return aName.localeCompare(bName);
      }
      if (sortKey === "net_id") {
        return a.net_id.toLowerCase().localeCompare(b.net_id.toLowerCase());
      }
      if (sortKey === "graduation_year") {
        const aYear = a.graduation_year ?? 0;
        const bYear = b.graduation_year ?? 0;
        if (aYear !== bYear) {
          return aYear - bYear;
        }
        return (a.graduation_semester ?? "").localeCompare(b.graduation_semester ?? "");
      }
      if (sortKey === "member_type") {
        return a.member_type.localeCompare(b.member_type);
      }
      return (a.points_total ?? 0) - (b.points_total ?? 0);
    });

    if (sortDirection === "desc") {
      sorted.reverse();
    }
    return sorted;
  }, [results, sortKey, sortDirection]);

  const copyRows = useMemo(() => {
    return sortedResults
      .map((member) => {
        const selectedValues = selectedContactFields.map((field) => {
          const rawValue = member[field];
          return typeof rawValue === "string" ? rawValue.trim() : "";
        });
        const hasAnySelectedValue = selectedValues.some((value) => value.length > 0);
        if (!includeEmptyContactValues && !hasAnySelectedValue) {
          return null;
        }

        const fullName = `${member.first_name} ${member.last_name}`.trim();
        return {
          fullName,
          netId: member.net_id,
          values: selectedValues
        };
      })
      .filter((row): row is { fullName: string; netId: string; values: string[] } => row !== null);
  }, [sortedResults, selectedContactFields, includeEmptyContactValues]);

  const hasCsvColumns = selectedContactFields.length > 0 || includeNameColumn || includeNetIdColumn;

  const csvContent = useMemo(() => {
    const identityHeader = [
      ...(includeNameColumn ? ["name"] : []),
      ...(includeNetIdColumn ? ["net_id"] : [])
    ];
    const csvHeader = [...identityHeader, ...selectedContactFields];
    const csvRows = copyRows.map((row) => [
      ...(includeNameColumn ? [row.fullName] : []),
      ...(includeNetIdColumn ? [row.netId] : []),
      ...row.values
    ]);
    return [csvHeader, ...csvRows].map((row) => row.map((cell) => toCsvCell(cell)).join(",")).join("\n");
  }, [copyRows, selectedContactFields, includeNameColumn, includeNetIdColumn]);

  const csvPreview = useMemo(() => {
    const lines = csvContent.split("\n");
    const maxPreviewLines = 13;
    if (lines.length <= maxPreviewLines) {
      return csvContent;
    }
    return `${lines.slice(0, maxPreviewLines).join("\n")}\n...`;
  }, [csvContent]);

  function handleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection("asc");
  }

  function sortIndicator(targetKey: SortKey) {
    if (sortKey !== targetKey) {
      return "↕";
    }
    return sortDirection === "asc" ? "↑" : "↓";
  }

  async function saveMember() {
    if (!activeMember) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = await requestJson<{ member: Member }>("/api/admin/members", {
        method: "PATCH",
        body: JSON.stringify(activeMember)
      });

      setMembers((current) => current.map((item) => (item.id === payload.member.id ? payload.member : item)));
      setActiveMember(payload.member);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save member changes.");
    } finally {
      setSaving(false);
    }
  }

  async function copyCsvToClipboard() {
    const selectedLabel = selectedContactFields.length > 0
      ? selectedContactFields.map((field) => contactCopyFieldLabels[field]).join(", ")
      : "selected columns";
    try {
      await navigator.clipboard.writeText(csvContent);
      setCopyStatus(`Copied ${copyRows.length} rows (${selectedLabel}) as CSV.`);
    } catch {
      const element = document.createElement("textarea");
      element.value = csvContent;
      element.style.position = "fixed";
      element.style.opacity = "0";
      document.body.appendChild(element);
      element.focus();
      element.select();
      document.execCommand("copy");
      document.body.removeChild(element);
      setCopyStatus(`Copied ${copyRows.length} rows (${selectedLabel}) as CSV.`);
    }
  }

  function toggleContactField(field: ContactCopyField) {
    setSelectedContactFields((current) => {
      const exists = current.includes(field);
      if (exists) {
        return current.filter((value) => value !== field);
      }
      return [...current, field];
    });
    setCopyStatus(null);
  }

  const editMemberPanel = (
    <EditMemberPanel
      activeMember={activeMember}
      saving={saving}
      onChange={setActiveMember}
      onClose={() => setActiveMember(null)}
      onSave={() => void saveMember()}
    />
  );

  const sidebarEditMemberPanel = sidebarSlot
    ? createPortal(
        <div className="hidden xl:block">
          <EditMemberPanel
            activeMember={activeMember}
            saving={saving}
            onChange={setActiveMember}
            onClose={() => setActiveMember(null)}
            onSave={() => void saveMember()}
            compact
          />
        </div>,
        sidebarSlot
      )
    : null;

  return (
    <section className="space-y-5">
      {sidebarEditMemberPanel}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Members</h2>
        <p className="text-slate-600">Search, review, and update member details.</p>
      </div>

      {error ? <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="panel grid grid-cols-1 gap-3 rounded-xl p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <input
          className="field sm:col-span-2 lg:col-span-2 xl:col-span-2"
          placeholder="Search by name, NetID, major, or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="text-sm text-slate-600">
          Member Status
          <select
            className="field mt-1"
            value={memberTypeFilter}
            onChange={(e) => setMemberTypeFilter(e.target.value as "all" | Member["member_type"])}
          >
            <option value="all">All</option>
            <option value="student">student</option>
            <option value="GRADUATING">GRADUATING</option>
            <option value="alumni">alumni</option>
          </select>
        </label>
        <label className="text-sm text-slate-600">
          Graduation Year
          <select
            className="field mt-1"
            value={graduationYearFilter}
            onChange={(e) => setGraduationYearFilter(e.target.value)}
          >
            <option value="all">All</option>
            {graduationYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-600">
          Personal Email
          <select
            className="field mt-1"
            value={personalEmailFilter}
            onChange={(e) => setPersonalEmailFilter(e.target.value as "all" | "has" | "missing")}
          >
            <option value="all">All</option>
            <option value="has">Has personal email</option>
            <option value="missing">Missing personal email</option>
          </select>
        </label>
        <label className="text-sm text-slate-600">
          Major
          <select
            className="field mt-1"
            value={majorFilter}
            onChange={(e) => setMajorFilter(e.target.value)}
          >
            <option value="all">All</option>
            {majors.map((major) => (
              <option key={major} value={major}>
                {major}
              </option>
            ))}
          </select>
        </label>
        <button
          className="btn-secondary w-full sm:w-auto"
          onClick={() => {
            setMemberTypeFilter("all");
            setGraduationYearFilter("all");
            setPersonalEmailFilter("all");
            setMajorFilter("all");
            setSearch("");
          }}
        >
          Clear Filters
        </button>
        <button className="btn-secondary w-full sm:w-auto" onClick={() => void loadMembers(search)}>
          Refresh From Server
        </button>
      </div>

      <p className="text-sm text-slate-600">
        Showing <span className="font-semibold text-slate-900">{results.length}</span> of{" "}
        <span className="font-semibold text-slate-900">{members.length}</span> members
      </p>

      <div className="panel overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-sky-50 p-4 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Copy Filtered Contacts</h3>
            <p className="text-sm text-slate-600">
              Export exactly what you filtered above, in CSV format, with a quick preview.
            </p>
          </div>
          <p className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700">
            {copyRows.length} rows ready
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-2">
            <p className="mb-1 text-sm font-medium text-slate-700">Contact columns</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["email", "School emails"],
                  ["personal_email", "Personal emails"],
                  ["phone_number", "Phone numbers"]
                ] as const
              ).map(([field, label]) => (
                <label
                  key={field}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                    selectedContactFields.includes(field)
                      ? "border-sky-300 bg-sky-100 text-sky-900"
                      : "border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedContactFields.includes(field)}
                    onChange={() => toggleContactField(field)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white/70 px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={includeNameColumn}
              onChange={(e) => {
                setIncludeNameColumn(e.target.checked);
                setCopyStatus(null);
              }}
            />
            Include names
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white/70 px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={includeNetIdColumn}
              onChange={(e) => {
                setIncludeNetIdColumn(e.target.checked);
                setCopyStatus(null);
              }}
            />
            Include NetIDs
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white/70 px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={includeEmptyContactValues}
              onChange={(e) => {
                setIncludeEmptyContactValues(e.target.checked);
                setCopyStatus(null);
              }}
            />
            Include members with blank values
          </label>
          <button
            className="btn-primary sm:self-end"
            onClick={() => void copyCsvToClipboard()}
            disabled={!hasCsvColumns || copyRows.length === 0}
          >
            Copy CSV
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white/80 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            CSV Preview (
            {selectedContactFields.length > 0
              ? selectedContactFields.map((field) => contactCopyFieldLabels[field]).join(", ")
              : "no contact columns selected"}
          </p>
          <pre className="max-h-60 overflow-auto whitespace-pre-wrap rounded-md bg-slate-900 p-3 text-[11px] text-slate-100 sm:text-xs">
            {csvPreview}
          </pre>
          {copyStatus ? <p className="mt-2 text-sm font-medium text-slate-700">{copyStatus}</p> : null}
        </div>
      </div>

      <div className="space-y-4">
        <div className="xl:hidden">{editMemberPanel}</div>
        <div className="panel overflow-x-auto rounded-xl p-2">
          {loading ? (
            <p className="p-4 text-sm text-slate-600">Loading members...</p>
          ) : (
            <table className="min-w-[820px] text-xs sm:text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="px-3 py-2">
                    <button className="font-semibold" onClick={() => handleSort("name")}>
                      Name {sortIndicator("name")}
                    </button>
                  </th>
                  <th className="px-3 py-2">
                    <button className="font-semibold" onClick={() => handleSort("net_id")}>
                      NetID {sortIndicator("net_id")}
                    </button>
                  </th>
                  <th className="px-3 py-2">
                    <button className="font-semibold" onClick={() => handleSort("points")}>
                      Points {sortIndicator("points")}
                    </button>
                  </th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Major</th>
                  <th className="px-3 py-2">
                    <button className="font-semibold" onClick={() => handleSort("graduation_year")}>
                      Grad {sortIndicator("graduation_year")}
                    </button>
                  </th>
                  <th className="px-3 py-2">
                    <button className="font-semibold" onClick={() => handleSort("member_type")}>
                      Type {sortIndicator("member_type")}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((member) => (
                  <tr
                    key={member.id}
                    className={`cursor-pointer border-t border-slate-100 ${
                      activeMember?.id === member.id ? "bg-blue-50" : "bg-white hover:bg-slate-50"
                    }`}
                    onClick={() => setActiveMember(member)}
                  >
                    <td className="px-3 py-2 font-medium">{member.first_name} {member.last_name}</td>
                    <td className="px-3 py-2">{member.net_id}</td>
                    <td className="px-3 py-2 font-semibold text-blue-700">{member.points_total ?? 0}</td>
                    <td className="px-3 py-2">{member.email}</td>
                    <td className="px-3 py-2">{member.major || "-"}</td>
                    <td className="px-3 py-2">
                      {member.graduation_year ? `${member.graduation_semester || ""} ${member.graduation_year}` : "-"}
                    </td>
                    <td className="px-3 py-2">{member.member_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
