"use client";

import { useEffect, useMemo, useState } from "react";
import { requestJson } from "@/lib/client-api";
import type { Member } from "@/types/admin";

type MembersResponse = { members: Member[] };
type SortKey = "name" | "net_id" | "graduation_year" | "member_type" | "points";

const memberTypes = ["student", "GRADUATING", "alumni"] as const;

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

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[#1A202C]">Members</h2>
        <p className="text-[#4A5568]">Search, review, and update member details.</p>
      </div>

      {error ? <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="panel flex flex-wrap items-end gap-3 rounded-xl p-4">
        <input
          className="field max-w-md"
          placeholder="Search by name, NetID, major, or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="text-sm text-[#4A5568]">
          Member Status
          <select
            className="field mt-1 min-w-44"
            value={memberTypeFilter}
            onChange={(e) => setMemberTypeFilter(e.target.value as "all" | Member["member_type"])}
          >
            <option value="all">All</option>
            <option value="student">student</option>
            <option value="GRADUATING">GRADUATING</option>
            <option value="alumni">alumni</option>
          </select>
        </label>
        <label className="text-sm text-[#4A5568]">
          Graduation Year
          <select
            className="field mt-1 min-w-36"
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
        <label className="text-sm text-[#4A5568]">
          Personal Email
          <select
            className="field mt-1 min-w-44"
            value={personalEmailFilter}
            onChange={(e) => setPersonalEmailFilter(e.target.value as "all" | "has" | "missing")}
          >
            <option value="all">All</option>
            <option value="has">Has personal email</option>
            <option value="missing">Missing personal email</option>
          </select>
        </label>
        <label className="text-sm text-[#4A5568]">
          Major
          <select
            className="field mt-1 min-w-56"
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
          className="btn-secondary"
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
        <button className="btn-secondary" onClick={() => void loadMembers(search)}>
          Refresh From Server
        </button>
      </div>

      <p className="text-sm text-[#4A5568]">
        Showing <span className="font-semibold text-[#1A202C]">{results.length}</span> of{" "}
        <span className="font-semibold text-[#1A202C]">{members.length}</span> members
      </p>

      <div className="space-y-4">
        <aside className="panel rounded-xl p-4">
          <h3 className="mb-3 text-lg font-semibold">Edit Member</h3>
          {!activeMember ? (
            <p className="text-sm text-[#4A5568]">Select a member row to edit.</p>
          ) : (
            <div className="space-y-3 text-sm">
              <label>
                First Name
                <input
                  className="field mt-1"
                  value={activeMember.first_name}
                  onChange={(e) => setActiveMember((cur) => (cur ? { ...cur, first_name: e.target.value } : cur))}
                />
              </label>

              <label>
                Last Name
                <input
                  className="field mt-1"
                  value={activeMember.last_name}
                  onChange={(e) => setActiveMember((cur) => (cur ? { ...cur, last_name: e.target.value } : cur))}
                />
              </label>

              <label>
                NetID (read-only)
                <input className="field mt-1 opacity-70" readOnly value={activeMember.net_id} />
              </label>

              <label>
                Email (read-only)
                <input className="field mt-1 opacity-70" readOnly value={activeMember.email} />
              </label>

              <label>
                Graduation Year
                <input
                  className="field mt-1"
                  type="number"
                  value={activeMember.graduation_year ?? ""}
                  onChange={(e) =>
                    setActiveMember((cur) =>
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

              <label>
                Graduation Semester
                <input
                  className="field mt-1"
                  value={activeMember.graduation_semester ?? ""}
                  onChange={(e) =>
                    setActiveMember((cur) =>
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

              <label>
                Member Type
                <select
                  className="field mt-1"
                  value={activeMember.member_type}
                  onChange={(e) =>
                    setActiveMember((cur) =>
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

              <label>
                Major
                <input
                  className="field mt-1"
                  value={activeMember.major ?? ""}
                  onChange={(e) =>
                    setActiveMember((cur) =>
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

              <label>
                Personal Email
                <input
                  className="field mt-1"
                  value={activeMember.personal_email ?? ""}
                  onChange={(e) =>
                    setActiveMember((cur) =>
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

              <div className="rounded-lg border border-[#E2E8F0] bg-slate-50 p-3">
                <p className="text-sm font-semibold text-[#1A202C]">
                  Active Year Points: {activeMember.points_total ?? 0}
                </p>
                <p className="mt-2 text-sm font-semibold text-[#1A202C]">Attendance History (Active School Year)</p>
                {activeMember.attendance_history && activeMember.attendance_history.length > 0 ? (
                  <ul className="mt-2 space-y-2">
                    {activeMember.attendance_history.map((entry) => (
                      <li key={`${entry.event_id}-${entry.checked_in_at ?? entry.event_name}`} className="rounded border border-[#E2E8F0] bg-white p-2">
                        <p className="font-medium text-[#1A202C]">{entry.event_name}</p>
                        <p className="text-xs text-[#4A5568]">
                          {entry.event_date ? new Date(entry.event_date).toLocaleString() : "No event date"}
                        </p>
                        <p className="text-xs text-[#2B6CB0]">Points: {entry.points_awarded}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-[#4A5568]">No attendance records for the active school year.</p>
                )}
              </div>

              <button className="btn-primary" onClick={() => void saveMember()} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </aside>

        <div className="panel overflow-x-auto rounded-xl p-2">
          {loading ? (
            <p className="p-4 text-sm text-[#4A5568]">Loading members...</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-[#4A5568]">
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
                    className={`cursor-pointer border-t border-[#EDF2F7] ${
                      activeMember?.id === member.id ? "bg-[#EBF8FF]" : "bg-white hover:bg-[#EDF2F7]"
                    }`}
                    onClick={() => setActiveMember(member)}
                  >
                    <td className="px-3 py-2 font-medium">{member.first_name} {member.last_name}</td>
                    <td className="px-3 py-2">{member.net_id}</td>
                    <td className="px-3 py-2 font-semibold text-[#2B6CB0]">{member.points_total ?? 0}</td>
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
