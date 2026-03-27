import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit, errorResponse, serverErrorResponse } from "@/lib/api";
import { getActiveYear } from "@/lib/admin-db";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { eventPatchSchema, eventSchema, parseJson } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const limited = applyRateLimit(request, "admin-events-get");
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
      .from("events")
      .select("id, name, date, event_type, points_value, is_open, google_form_url, school_year")
      .eq("school_year", active.data.active_year)
      .order("date", { ascending: true });

    if (error) {
      return errorResponse("Unable to fetch events.", 500);
    }

    return NextResponse.json({
      active_year: active.data.active_year,
      events: data ?? []
    });
  } catch (error) {
    return serverErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const limited = applyRateLimit(request, "admin-events-post");
  if (limited) {
    return limited;
  }

  try {
    const payload = await request.json();
    const parsed = parseJson(
      {
        ...payload,
        points_value: Number(payload?.points_value)
      },
      eventSchema
    );

    if (!parsed.success) {
      return errorResponse(parsed.error);
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("events")
      .insert(parsed.data)
      .select("id, name, date, event_type, points_value, is_open, google_form_url, school_year")
      .single();

    if (error) {
      return errorResponse("Unable to create event.", 500);
    }

    return NextResponse.json({ event: data }, { status: 201 });
  } catch (error) {
    return serverErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  const limited = applyRateLimit(request, "admin-events-patch");
  if (limited) {
    return limited;
  }

  try {
    const payload = await request.json();
    const parsed = parseJson(
      {
        ...payload,
        id: Number(payload?.id)
      },
      eventPatchSchema
    );

    if (!parsed.success) {
      return errorResponse(parsed.error);
    }

    const supabase = getSupabaseServerClient();

    if (parsed.data.action === "toggle_open") {
      if (typeof parsed.data.is_open !== "boolean") {
        return errorResponse("is_open is required for toggle updates.");
      }

      const { data, error } = await supabase
        .from("events")
        .update({ is_open: parsed.data.is_open })
        .eq("id", parsed.data.id)
        .select("id, is_open")
        .single();

      if (error || !data) {
        return errorResponse("Unable to update event status.", 500);
      }

      return NextResponse.json({ event: data });
    }

    const { error } = await supabase.from("events").delete().eq("id", parsed.data.id);

    if (error) {
      return errorResponse("Unable to delete event.", 500);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
