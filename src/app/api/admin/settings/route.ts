import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit, errorResponse, serverErrorResponse } from "@/lib/api";
import { getActiveYear } from "@/lib/admin-db";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { parseJson, schoolYearSchema } from "@/lib/validation";

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
    const parsed = parseJson(payload, schoolYearSchema);

    if (!parsed.success) {
      return errorResponse(parsed.error);
    }

    const current = await getActiveYear();
    if (!current.ok) {
      return errorResponse(current.error, 500);
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("settings")
      .update({ active_year: parsed.data.active_year })
      .eq("id", current.data.id)
      .select("id, active_year")
      .single();

    if (error || !data) {
      return errorResponse("Unable to update active school year.", 500);
    }

    return NextResponse.json({ settings: data });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
