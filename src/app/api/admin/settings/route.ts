import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit, errorResponse, serverErrorResponse } from "@/lib/api";
import { applyMemberStatusForPeriod, getActiveYear } from "@/lib/admin-db";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { memberStatusPeriodSchema, parseJson, schoolYearSchema } from "@/lib/validation";

const SETTINGS_COLUMNS = "id, active_year, member_status_year, member_status_semester";

export async function GET(request: NextRequest) {
  const limited = applyRateLimit(request, "admin-settings-get");
  if (limited) {
    return limited;
  }

  try {
    const active = await getActiveYear();
    if (!active.ok) {
      return errorResponse(active.error, 500);
    }

    return NextResponse.json({ settings: active.data });
  } catch (error) {
    return serverErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  const limited = applyRateLimit(request, "admin-settings-patch");
  if (limited) {
    return limited;
  }

  try {
    const payload = await request.json();
    const current = await getActiveYear();
    if (!current.ok) {
      return errorResponse(current.error, 500);
    }

    const supabase = getSupabaseServerClient();

    if (payload?.member_status_year !== undefined || payload?.member_status_semester !== undefined) {
      const parsed = parseJson(payload, memberStatusPeriodSchema);
      if (!parsed.success) {
        return errorResponse(parsed.error);
      }

      const statusResult = await applyMemberStatusForPeriod(
        parsed.data.member_status_year,
        parsed.data.member_status_semester
      );
      if (!statusResult.ok) {
        return errorResponse("Unable to update member statuses for that period.", 500);
      }

      const { data, error } = await supabase
        .from("settings")
        .update({
          member_status_year: parsed.data.member_status_year,
          member_status_semester: parsed.data.member_status_semester
        })
        .eq("id", current.data.id)
        .select(SETTINGS_COLUMNS)
        .single();

      if (error || !data) {
        return errorResponse("Unable to persist member status period.", 500);
      }

      return NextResponse.json({ settings: data });
    }

    const parsed = parseJson(payload, schoolYearSchema);
    if (!parsed.success) {
      return errorResponse(parsed.error);
    }

    const { data, error } = await supabase
      .from("settings")
      .update({ active_year: parsed.data.active_year })
      .eq("id", current.data.id)
      .select(SETTINGS_COLUMNS)
      .single();

    if (error || !data) {
      return errorResponse("Unable to update active school year.", 500);
    }

    return NextResponse.json({ settings: data });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
