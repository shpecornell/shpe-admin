import { getSupabaseServerClient } from "@/lib/supabase-server";

export type MemberStatusSemester = "Fall" | "Spring";

type ActiveYearResult =
  | {
      ok: true;
      data: {
        id: number;
        active_year: string;
        member_status_year: number | null;
        member_status_semester: MemberStatusSemester | null;
      };
    }
  | { ok: false; error: string };

export async function getActiveYear(): Promise<ActiveYearResult> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("settings")
    .select("id, active_year, member_status_year, member_status_semester")
    .limit(1)
    .single();

  if (error || !data) {
    return { ok: false, error: "Unable to load settings." };
  }

  return {
    ok: true,
    data: {
      id: data.id as number,
      active_year: data.active_year as string,
      member_status_year: (data.member_status_year as number | null) ?? null,
      member_status_semester: (data.member_status_semester as MemberStatusSemester | null) ?? null
    }
  };
}

type OperationResult = { ok: true } | { ok: false; error: string };

// A semester is encoded as a single increasing index so "which semester comes next"
// can be compared with plain arithmetic: Fall Y = 2Y, Spring Y = 2Y - 1 (Spring Y
// chronologically follows Fall Y-1, since school year "Y-1 - Y" runs Fall(Y-1) -> Spring(Y)).
function periodIndex(year: number, semester: MemberStatusSemester) {
  return semester === "Fall" ? year * 2 : year * 2 - 1;
}

export async function applyMemberStatusForPeriod(
  year: number,
  semester: MemberStatusSemester
): Promise<OperationResult> {
  const supabase = getSupabaseServerClient();

  const pivot = periodIndex(year, semester);
  const previous = pivot - 1;

  // Members whose graduation semester is "Fall": their index is gy * 2.
  const fallAlumniMaxYear = Math.floor(previous / 2);
  const fallGraduatingYear = pivot % 2 === 0 ? pivot / 2 : null;
  const fallStudentMinYear = fallGraduatingYear ?? fallAlumniMaxYear;

  // Members whose graduation semester is "Spring": their index is gy * 2 - 1.
  const springAlumniMaxYear = Math.floor((previous + 1) / 2);
  const springGraduatingYear = (pivot + 1) % 2 === 0 ? (pivot + 1) / 2 : null;
  const springStudentMinYear = springGraduatingYear ?? springAlumniMaxYear;

  const updateRules = [
    supabase
      .from("members")
      .update({ member_type: "alumni" })
      .ilike("graduation_semester", "fall")
      .lte("graduation_year", fallAlumniMaxYear)
      .not("graduation_year", "is", null),
    supabase
      .from("members")
      .update({ member_type: "alumni" })
      .ilike("graduation_semester", "spring")
      .lte("graduation_year", springAlumniMaxYear)
      .not("graduation_year", "is", null),
    supabase
      .from("members")
      .update({ member_type: "student" })
      .ilike("graduation_semester", "fall")
      .gt("graduation_year", fallStudentMinYear),
    supabase
      .from("members")
      .update({ member_type: "student" })
      .ilike("graduation_semester", "spring")
      .gt("graduation_year", springStudentMinYear),
    ...(fallGraduatingYear !== null
      ? [
          supabase
            .from("members")
            .update({ member_type: "GRADUATING" })
            .ilike("graduation_semester", "fall")
            .eq("graduation_year", fallGraduatingYear)
        ]
      : []),
    ...(springGraduatingYear !== null
      ? [
          supabase
            .from("members")
            .update({ member_type: "GRADUATING" })
            .ilike("graduation_semester", "spring")
            .eq("graduation_year", springGraduatingYear)
        ]
      : [])
  ];

  for (const query of updateRules) {
    const { error } = await query;
    if (error) {
      return { ok: false, error: String(error.message ?? "Unable to update member statuses.") };
    }
  }

  return { ok: true };
}
