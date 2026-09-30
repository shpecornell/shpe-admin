import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit, errorResponse, serverErrorResponse } from "@/lib/api";
import { getActiveYear } from "@/lib/admin-db";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type AttendanceRow = {
  id: number;
  checked_in_at: string | null;
  member: { id: number; first_name: string; last_name: string; net_id: string } | null;
  event: { id: number; name: string } | null;
};

export async function GET(request: NextRequest) {
  const limited = applyRateLimit(request, "admin-attendance-get");
  if (limited) {
    return limited;
  }

  try {
    const active = await getActiveYear();
    if (!active.ok) {
      return errorResponse(active.error, 500);
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("attendance")
      .select(
        "id, checked_in_at, member:members(id, first_name, last_name, net_id), event:events!inner(id, name)"
      )
      .eq("event.school_year", active.data.active_year)
      .order("checked_in_at", { ascending: false });

    if (error) {
      return errorResponse("Unable to fetch attendance.", 500);
    }

    const rows = (data ?? []) as unknown as AttendanceRow[];

    return NextResponse.json({
      active_year: active.data.active_year,
      attendance: rows.map((row) => ({
        id: row.id,
        checked_in_at: row.checked_in_at,
        member_id: row.member?.id ?? null,
        member_name: row.member ? `${row.member.first_name} ${row.member.last_name}` : "Unknown Member",
        member_last_first: row.member ? `${row.member.last_name} ${row.member.first_name}` : "",
        net_id: row.member?.net_id ?? "",
        event_id: row.event?.id ?? null,
        event_name: row.event?.name ?? "Unknown Event"
      }))
    });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
