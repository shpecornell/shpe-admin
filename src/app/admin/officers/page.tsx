"use client";

import { useEffect, useMemo, useState } from "react";
import { requestJson } from "@/lib/client-api";
import type { Member, OfficerRole } from "@/types/admin";

type OfficersResponse = {
  active_year: string;
  officers: (OfficerRole & {
    member: { first_name: string; last_name: string; net_id: string } | null;
  })[];
};

type MembersResponse = { members: Member[] };

export default function OfficersPage() {
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
      const [officerData, memberData] = await Promise.all([
        requestJson<OfficersResponse>("/api/admin/officers"),
        requestJson<MembersResponse>("/api/admin/members")
      ]);
      setOfficers(officerData.officers);
      setActiveYear(officerData.active_year);
      setMembers(memberData.members);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load officers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPageData();
  }, []);

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
        <h2 className="text-2xl font-bold text-[#1A202C]">Officers</h2>
        <p className="text-[#4A5568]">Active school year: {activeYear || "Loading..."}</p>
      </div>

      {error ? <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p> : null}

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
            <input className="field mt-1" required value={role} onChange={(e) => setRole(e.target.value)} />
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
            <button className="btn-primary" type="submit" disabled={submitting || selectedMemberId < 1}>
              {submitting ? "Adding..." : "Add Officer"}
            </button>
          </div>
        </form>
      </div>

      <div className="panel overflow-x-auto rounded-xl p-2">
        {loading ? (
          <p className="p-4 text-sm text-[#4A5568]">Loading officers...</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-[#4A5568]">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">NetID</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Semester</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {officers.map((officer) => (
                <tr key={officer.id} className="border-t border-[#EDF2F7] bg-white hover:bg-[#EDF2F7]">
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
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
