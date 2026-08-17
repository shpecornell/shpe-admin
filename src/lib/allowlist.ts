import "server-only";
import { createClient } from "@supabase/supabase-js";

export async function isEmailAllowed(email: string): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await supabase
    .from("admin_allowlist")
    .select("email")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error) {
    console.error("Allowlist check failed:", error.message);
    return false;
  }

  if (!data) {
    console.warn(`Allowlist: rejected sign-in for "${normalizedEmail}" (no matching row).`);
  }

  return Boolean(data);
}
