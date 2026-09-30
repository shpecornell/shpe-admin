"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { requestJson } from "@/lib/client-api";
import type { Member, OfficerRole } from "@/types/admin";
import { OFFICER_UI_MODE } from "@/components/admin/officer-ui-mode";

type OfficersResponse = {
  active_year: string;
  officers: (OfficerRole & {
    member: { first_name: string; last_name: string; net_id: string } | null;
  })[];
};

type MembersResponse = { members: Member[] };

export default function OfficersPage() {
  const showOfficerEditUi = OFFICER_UI_MODE === "yes";
  const [activeYear, setActiveYear] = useState("");
  const [officers, setOfficers] = useState<OfficersResponse["officers"]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberQuery, setMemberQuery] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState(0);
  const [role, setRole] = useState("");
  const [semester, setSemester] = useState<"Fall" | "Spring" | "Year">("Fall");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadPageData() {
    setLoading(true);
    setError(null);

    try {
      const officerData = await requestJson<OfficersResponse>("/api/admin/officers");
      setOfficers(officerData.officers);
      setActiveYear(officerData.active_year);

      if (showOfficerEditUi) {
        const memberData = await requestJson<MembersResponse>("/api/admin/members");
        setMembers(memberData.members);
      } else {
        setMembers([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load officers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPageData();
  }, [showOfficerEditUi]);

  const filteredMembers = useMemo(() => {
    const term = memberQuery.toLowerCase().trim();
    if (!term) {
      return members.slice(0, 60);
    }

    return members
      .filter((member) => {
        const full = `${member.first_name} ${member.last_name}`.toLowerCase();
        return full.includes(term) || member.net_id.toLowerCase().includes(term);
      })
      .slice(0, 60);
  }, [members, memberQuery]);

  const sortedOfficers = useMemo(() => {
    function normalizeRole(role: string) {
      return role.trim().toLowerCase();
    }

    function getGroupKey(role: string): "exec" | "internal" | "external" | "other" {
      const normalized = normalizeRole(role);
      const isInternalVp =
        (normalized.includes("internal") && normalized.includes("vp")) ||
        (normalized.includes("internal") && normalized.includes("vice president"));
      const isExternalVp =
        (normalized.includes("external") && normalized.includes("vp")) ||
        (normalized.includes("external") && normalized.includes("vice president"));

      if (normalized === "president" || normalized === "treasurer" || normalized.includes("secretary")) {
        return "exec";
      }

      if (
        isInternalVp ||
        (normalized.includes("chapter") && normalized.includes("develop")) ||
        normalized.includes("event") ||
        (normalized.includes("academic") && normalized.includes("excellence"))
      ) {
        return "internal";
      }

      if (
        isExternalVp ||
        normalized.includes("alumni") ||
        normalized.includes("corporate") ||
        normalized.includes("publicity") ||
        normalized.includes("web")
      ) {
        return "external";
      }

      return "other";
    }

    function groupPriority(role: string) {
      const key = getGroupKey(role);
      if (key === "exec") return 0;
      if (key === "internal") return 1;
      if (key === "external") return 2;
      return 3;
    }

    return [...officers].sort((a, b) => {
      const byRolePriority = groupPriority(a.role) - groupPriority(b.role);
      if (byRolePriority !== 0) {
        return byRolePriority;
      }

      const byRoleName = a.role.localeCompare(b.role, undefined, { sensitivity: "base" });
      if (byRoleName !== 0) {
        return byRoleName;
      }

      const aFirst = a.member?.first_name ?? "";
      const bFirst = b.member?.first_name ?? "";
      const byFirst = aFirst.localeCompare(bFirst, undefined, { sensitivity: "base" });
      if (byFirst !== 0) {
        return byFirst;
      }

      const aLast = a.member?.last_name ?? "";
      const bLast = b.member?.last_name ?? "";
      const byLast = aLast.localeCompare(bLast, undefined, { sensitivity: "base" });
      if (byLast !== 0) {
        return byLast;
      }

      return (a.member?.net_id ?? "").localeCompare(b.member?.net_id ?? "", undefined, {
        sensitivity: "base"
      });
    });
  }, [officers]);

  const groupedForDisplay = useMemo(
    () => {
      const normalized = (value: string) => value.trim().toLowerCase();
      const isInternalVp = (role: string) => {
        const value = normalized(role);
        return (value.includes("internal") && value.includes("vp")) || (value.includes("internal") && value.includes("vice president"));
      };
      const isExternalVp = (role: string) => {
        const value = normalized(role);
        return (value.includes("external") && value.includes("vp")) || (value.includes("external") && value.includes("vice president"));
      };
      const isAnyVp = (role: string) => {
        const value = normalized(role);
        return value.includes("vp") || value.includes("vice president");
      };

      const sortVpFirst = (items: typeof sortedOfficers) =>
        [...items].sort((a, b) => {
          const aVp = isAnyVp(a.role);
          const bVp = isAnyVp(b.role);
          if (aVp !== bVp) {
            return aVp ? -1 : 1;
          }

          const byRole = a.role.localeCompare(b.role, undefined, { sensitivity: "base" });
          if (byRole !== 0) {
            return byRole;
          }

          const aFirst = a.member?.first_name ?? "";
          const bFirst = b.member?.first_name ?? "";
          const byFirst = aFirst.localeCompare(bFirst, undefined, { sensitivity: "base" });
          if (byFirst !== 0) {
            return byFirst;
          }

          const aLast = a.member?.last_name ?? "";
          const bLast = b.member?.last_name ?? "";
          return aLast.localeCompare(bLast, undefined, { sensitivity: "base" });
        });

      const exec = sortedOfficers.filter((officer) => {
        const role = normalized(officer.role);
        return role === "president" || role === "treasurer" || role.includes("secretary");
      });
      const internal = sortedOfficers.filter((officer) => {
        const role = normalized(officer.role);
        return (
          isInternalVp(role) ||
          (role.includes("chapter") && role.includes("develop")) ||
          role.includes("event") ||
          (role.includes("academic") && role.includes("excellence"))
        );
      });
      const external = sortedOfficers.filter((officer) => {
        const role = normalized(officer.role);
        return (
          isExternalVp(role) ||
          role.includes("alumni") ||
          role.includes("corporate") ||
          role.includes("publicity") ||
          role.includes("web")
        );
      });

      const groupedIds = new Set<number>([...exec, ...internal, ...external].map((officer) => officer.id));
      const others = sortedOfficers.filter((officer) => !groupedIds.has(officer.id));
      const internalSorted = sortVpFirst(internal);
      const externalSorted = sortVpFirst(external);

      const normalizedOtherTitle = (role: string) => {
        const value = role.trim();
        const lowered = value.toLowerCase();
        if (
          lowered.includes("advice chair") ||
          lowered.includes("advisor chair") ||
          lowered.includes("advisory chair")
        ) {
          return "Advice Chair(s)";
        }
        if (lowered.includes("freshman rep")) {
          return "Freshman Representative(s)";
        }
        return value || "Other";
      };

      const otherByRole = new Map<string, typeof others>();
      for (const officer of others) {
        const roleTitle = normalizedOtherTitle(officer.role);
        const current = otherByRole.get(roleTitle) ?? [];
        current.push(officer);
        otherByRole.set(roleTitle, current);
      }

      const otherGroups = Array.from(otherByRole.entries())
        .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: "base" }))
        .map(([title, items]) => ({ title, items }));

      return [
        { title: "President + Treasurer", items: exec },
        { title: "Internal VP Group", items: internalSorted },
        { title: "External VP Group", items: externalSorted },
        ...otherGroups
      ];
    },
    [sortedOfficers]
  );

  function groupTheme(title: string, index: number) {
    const bluePattern = [
      {
        headerRow: "border-blue-300 bg-gradient-to-r from-blue-100 to-sky-50",
        headerText: "text-blue-900",
        itemBorder: "border-blue-200",
        itemBg: "bg-blue-50/40"
      },
      {
        headerRow: "border-sky-300 bg-gradient-to-r from-sky-100 to-blue-50",
        headerText: "text-sky-900",
        itemBorder: "border-sky-200",
        itemBg: "bg-sky-50/40"
      }
    ];

    // Two-blue alternating pattern.
    return bluePattern[index % bluePattern.length];
  }

  async function addOfficer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await requestJson("/api/admin/officers", {
        method: "POST",
        body: JSON.stringify({
          member_id: selectedMemberId,
          role,
          semester
        })
      });

      setSelectedMemberId(0);
      setRole("");
      setSemester("Fall");
      await loadPageData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add officer.");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeOfficer(id: number) {
    const confirmed = window.confirm("Remove this officer role?");
    if (!confirmed) {
      return;
    }

    setError(null);
    try {
      await requestJson(`/api/admin/officers?id=${id}`, {
        method: "DELETE"
      });
      setOfficers((current) => current.filter((officer) => officer.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove officer.");
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Officers</h2>
        {showOfficerEditUi ? <p className="text-slate-600">Active school year: {activeYear || "Loading..."}</p> : null}
      </div>

      {error ? <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {showOfficerEditUi ? (
        <>
          <div className="panel rounded-xl p-4">
            <h3 className="mb-2 text-lg font-semibold">Add New Officer</h3>
            <form className="grid gap-3 md:grid-cols-3" onSubmit={addOfficer}>
              <div>
                <label className="text-sm">Search Member</label>
                <input
                  className="field mt-1"
                  placeholder="Type name or netid"
                  value={memberQuery}
                  onChange={(e) => setMemberQuery(e.target.value)}
                />
              </div>

              <label className="text-sm">
                Select Member
                <select
                  className="field mt-1"
                  required
                  value={selectedMemberId || ""}
                  onChange={(e) => setSelectedMemberId(Number(e.target.value))}
                >
                  <option value="" className="bg-white">
                    Select a member
                  </option>
                  {filteredMembers.map((member) => (
                    <option key={member.id} value={member.id} className="bg-white">
                      {member.first_name} {member.last_name} ({member.net_id})
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                Role
                <input
                  className="field mt-1"
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                />
              </label>

              <label className="text-sm">
                Semester
                <select
                  className="field mt-1"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value as "Fall" | "Spring" | "Year")}
                >
                  <option value="Fall" className="bg-white">Fall</option>
                  <option value="Spring" className="bg-white">Spring</option>
                  <option value="Year" className="bg-white">Year</option>
                </select>
              </label>

              <div className="text-sm">
                School Year
                <input className="field mt-1 opacity-70" readOnly value={activeYear} />
              </div>

              <div className="flex items-end">
                <button
                  className="btn-primary"
                  type="submit"
                  disabled={submitting || selectedMemberId < 1}
                >
                  {submitting ? "Adding..." : "Add Officer"}
                </button>
              </div>
            </form>
          </div>

          <div className="panel overflow-x-auto rounded-xl p-2">
            {loading ? (
              <p className="p-4 text-sm text-slate-600">Loading officers...</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-600">
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">NetID</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Semester</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedForDisplay.map((group, index) => (
                    <Fragment key={group.title}>
                      {(() => {
                        const theme = groupTheme(group.title, index);
                        return group.items.length > 0 ? (
                          <tr className={`border-t-2 ${theme.headerRow}`}>
                            <td
                              className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide ${theme.headerText}`}
                              colSpan={5}
                            >
                              {group.title}
                            </td>
                          </tr>
                        ) : null;
                      })()}
                      {group.items.map((officer) => {
                        const theme = groupTheme(group.title, index);
                        return (
                          <tr
                            key={officer.id}
                            className={`border-t ${theme.itemBorder} ${theme.itemBg} hover:bg-white`}
                          >
                            <td className="px-3 py-2 font-medium">
                              {officer.member ? `${officer.member.first_name} ${officer.member.last_name}` : "Unknown Member"}
                            </td>
                            <td className="px-3 py-2">{officer.member?.net_id || "-"}</td>
                            <td className="px-3 py-2">{officer.role}</td>
                            <td className="px-3 py-2">{officer.semester}</td>
                            <td className="px-3 py-2">
                              <button className="btn-danger" onClick={() => void removeOfficer(officer.id)}>
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        <div className="panel rounded-xl p-4">
          {loading ? (
            <p className="text-sm text-slate-600">Loading officers...</p>
          ) : (
            <div className="space-y-4">
              {groupedForDisplay.map((group, index) =>
                group.items.length > 0 ? (
                  <div key={group.title} className="space-y-2">
                    <p
                      className={`rounded px-2 py-1 text-xs font-semibold uppercase tracking-wide ${
                        groupTheme(group.title, index).headerText
                      } ${groupTheme(group.title, index).headerRow}`}
                    >
                      {group.title}
                    </p>
                    <ul className="space-y-2 text-sm text-slate-900">
                      {group.items.map((officer) => (
                        <li
                          key={officer.id}
                          className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                            groupTheme(group.title, index).itemBorder
                          } ${groupTheme(group.title, index).itemBg}`}
                        >
                          <span className="font-medium">
                            {officer.member ? `${officer.member.first_name} ${officer.member.last_name}` : "Unknown Member"}
                          </span>
                          <span className="text-slate-600">{officer.role}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
