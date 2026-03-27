import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit, errorResponse, serverErrorResponse } from "@/lib/api";
import { getActiveYear } from "@/lib/admin-db";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { memberPatchSchema, parseJson } from "@/lib/validation";

function cleanSearch(raw: string | null | undefined) {
  return (raw ?? "").trim().replace(/[^a-zA-Z0-9\s_-]/g, "");
}

async function listMembers(search: string) {
  const supabase = getSupabaseServerClient();

  let query = supabase
    .from("members")
    .select(
      "id, net_id, first_name, last_name, graduation_year, graduation_semester, email, personal_email, member_type, major"
    )
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,net_id.ilike.%${search}%`
    );
  }

  return query;
}

type MemberRow = {
  id: number;
  net_id: string;
  first_name: string;
  last_name: string;
  graduation_year: number | null;
  graduation_semester: string | null;
  email: string;
  personal_email: string | null;
  member_type: "student" | "GRADUATING" | "alumni";
  major: string | null;
};

type MemberAttendanceHistoryRow = {
  event_id: number;
  event_name: string;
  event_date: string | null;
  points_awarded: number;
  checked_in_at: string | null;
};

type EnrichedMemberRow = MemberRow & {
  points_total: number;
  attendance_history: MemberAttendanceHistoryRow[];
};

async function addPointsForActiveYear(memberRows: MemberRow[]): Promise<EnrichedMemberRow[]> {
  if (memberRows.length === 0) {
    return [];
  }

  const active = await getActiveYear();
  if (!active.ok) {
    return memberRows.map((member) => ({
      ...member,
      points_total: 0,
      attendance_history: []
    }));
  }

  const memberIds = memberRows.map((member) => member.id);
  const supabase = getSupabaseServerClient();
  const { data: attendanceRows } = await supabase
    .from("attendance")
    .select("member_id, event_id, checked_in_at")
    .eq("school_year", active.data.active_year)
    .in("member_id", memberIds)
    .order("checked_in_at", { ascending: false });

  const eventIds = Array.from(
    new Set((attendanceRows ?? []).map((row) => row.event_id).filter((value): value is number => value !== null))
  );

  const eventMetaByEventId = new Map<number, { name: string; date: string | null; points_value: number }>();
  if (eventIds.length > 0) {
    const { data: eventRows } = await supabase
      .from("events")
      .select("id, name, date, points_value")
      .in("id", eventIds);

    for (const event of eventRows ?? []) {
      eventMetaByEventId.set(event.id as number, {
        name: String(event.name ?? "Unknown Event"),
        date: event.date ? String(event.date) : null,
        points_value: Number(event.points_value ?? 0)
      });
    }
  }

  const pointsByMemberId = new Map<number, number>();
  const attendanceByMemberId = new Map<number, MemberAttendanceHistoryRow[]>();
  for (const row of attendanceRows ?? []) {
    const memberId = row.member_id as number;
    const eventId = row.event_id as number;
    const eventMeta = eventMetaByEventId.get(eventId);
    const eventPoints = eventMeta?.points_value ?? 0;
    pointsByMemberId.set(memberId, (pointsByMemberId.get(memberId) ?? 0) + eventPoints);

    const historyEntry: MemberAttendanceHistoryRow = {
      event_id: eventId,
      event_name: eventMeta?.name ?? "Unknown Event",
      event_date: eventMeta?.date ?? null,
      points_awarded: eventPoints,
      checked_in_at: row.checked_in_at ? String(row.checked_in_at) : null
    };

    const current = attendanceByMemberId.get(memberId) ?? [];
    current.push(historyEntry);
    attendanceByMemberId.set(memberId, current);
  }

  return memberRows.map((member) => ({
    ...member,
    points_total: pointsByMemberId.get(member.id) ?? 0,
    attendance_history: attendanceByMemberId.get(member.id) ?? []
  }));
}

export async function GET(request: NextRequest) {
  const limited = applyRateLimit(request, "admin-members-get");
  if (limited) {
    return limited;
  }

  try {
    const search = cleanSearch(request.nextUrl.searchParams.get("q"));
    const { data, error } = await listMembers(search);

    if (error) {
      return errorResponse("Unable to fetch members.", 500);
    }

    const withPoints = await addPointsForActiveYear((data ?? []) as MemberRow[]);
    return NextResponse.json({ members: withPoints });
  } catch (error) {
    return serverErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const limited = applyRateLimit(request, "admin-members-post");
  if (limited) {
    return limited;
  }

  try {
    const body = await request.json();
    const search = cleanSearch(typeof body?.q === "string" ? body.q : "");
    const { data, error } = await listMembers(search);

    if (error) {
      return errorResponse("Unable to fetch members.", 500);
    }

    const withPoints = await addPointsForActiveYear((data ?? []) as MemberRow[]);
    return NextResponse.json({ members: withPoints });
  } catch (error) {
    return serverErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  const limited = applyRateLimit(request, "admin-members-patch");
  if (limited) {
    return limited;
  }

  try {
    const payload = await request.json();
    const parsed = parseJson(
      {
        ...payload,
        id: Number(payload?.id),
        graduation_year:
          payload?.graduation_year === null || payload?.graduation_year === ""
            ? null
            : Number(payload?.graduation_year)
      },
      memberPatchSchema
    );

    if (!parsed.success) {
      return errorResponse(parsed.error);
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("members")
      .update({
        first_name: parsed.data.first_name,
        last_name: parsed.data.last_name,
        graduation_year: parsed.data.graduation_year,
        graduation_semester: parsed.data.graduation_semester || null,
        member_type: parsed.data.member_type,
        major: parsed.data.major || null,
        personal_email: parsed.data.personal_email
      })
      .eq("id", parsed.data.id)
      .select(
        "id, net_id, first_name, last_name, graduation_year, graduation_semester, email, personal_email, member_type, major"
      )
      .single();

    if (error || !data) {
      return errorResponse("Unable to update member.", 500);
    }

    const withPoints = await addPointsForActiveYear([data as MemberRow]);
    return NextResponse.json({ member: withPoints[0] });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
