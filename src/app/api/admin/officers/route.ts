import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit, errorResponse, serverErrorResponse } from "@/lib/api";
import { getActiveYear } from "@/lib/admin-db";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { officerCreateSchema, parseJson } from "@/lib/validation";

async function buildOfficerList(activeYear: string) {
  const supabase = getSupabaseServerClient();

  const { data: officers, error: officerError } = await supabase
    .from("officer_roles")
    .select("id, member_id, role, school_year, semester")
    .eq("school_year", activeYear)
    .order("semester", { ascending: true })
    .order("role", { ascending: true });

  if (officerError) {
    return { error: true as const, message: "Unable to fetch officers." };
  }

  const memberIds = Array.from(new Set((officers ?? []).map((officer) => officer.member_id)));

  const membersById = new Map<number, { first_name: string; last_name: string; net_id: string }>();

  if (memberIds.length > 0) {
    const { data: members, error: memberError } = await supabase
      .from("members")
      .select("id, first_name, last_name, net_id")
      .in("id", memberIds);

    if (memberError) {
      return { error: true as const, message: "Unable to fetch officer member details." };
    }

    for (const member of members ?? []) {
      membersById.set(member.id as number, {
        first_name: member.first_name as string,
        last_name: member.last_name as string,
        net_id: member.net_id as string
      });
    }
  }

  return {
    error: false as const,
    officers: (officers ?? []).map((officer) => ({
      ...officer,
      member: membersById.get(officer.member_id as number) ?? null
    }))
  };
}

export async function GET(request: NextRequest) {
  const limited = applyRateLimit(request, "admin-officers-get");
  if (limited) {
    return limited;
  }

  try {
    const active = await getActiveYear();
    if (!active.ok) {
      return errorResponse(active.error, 500);
    }

    const list = await buildOfficerList(active.data.active_year);
    if (list.error) {
      return errorResponse(list.message, 500);
    }

    return NextResponse.json({
      active_year: active.data.active_year,
      officers: list.officers
    });
  } catch (error) {
    return serverErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const limited = applyRateLimit(request, "admin-officers-post");
  if (limited) {
    return limited;
  }

  try {
    const active = await getActiveYear();
    if (!active.ok) {
      return errorResponse(active.error, 500);
    }

    const payload = await request.json();
    const parsed = parseJson(
      {
        ...payload,
        member_id: Number(payload?.member_id),
        school_year: active.data.active_year
      },
      officerCreateSchema
    );

    if (!parsed.success) {
      return errorResponse(parsed.error);
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("officer_roles")
      .insert(parsed.data)
      .select("id, member_id, role, school_year, semester")
      .single();

    if (error || !data) {
      return errorResponse("Unable to add officer role.", 500);
    }

    return NextResponse.json({ officer: data }, { status: 201 });
  } catch (error) {
    return serverErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  const limited = applyRateLimit(request, "admin-officers-delete");
  if (limited) {
    return limited;
  }

  try {
    const idValue = request.nextUrl.searchParams.get("id");
    const id = Number(idValue);

    if (!Number.isInteger(id) || id < 1) {
      return errorResponse("Valid officer role id is required.");
    }

    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("officer_roles").delete().eq("id", id);

    if (error) {
      return errorResponse("Unable to remove officer role.", 500);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
