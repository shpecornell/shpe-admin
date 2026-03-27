import { getSupabaseServerClient } from "@/lib/supabase-server";

type ActiveYearResult =
  | { ok: true; data: { id: number; active_year: string } }
  | { ok: false; error: string };

export async function getActiveYear(): Promise<ActiveYearResult> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("settings")
    .select("id, active_year")
    .limit(1)
    .single();

  if (error || !data) {
    return { ok: false, error: "Unable to load settings." };
  }

  return {
    ok: true,
    data: {
      id: data.id as number,
      active_year: data.active_year as string
    }
  };
}
