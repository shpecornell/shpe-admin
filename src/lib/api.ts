import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";

export function applyRateLimit(request: NextRequest, routeKey: string) {
  const result = enforceRateLimit(request, routeKey);
  if (result.allowed) {
    return null;
  }

  return NextResponse.json(
    {
      error: "Rate limit exceeded. Try again shortly."
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds ?? 60)
      }
    }
  );
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function serverErrorResponse(error?: unknown) {
  if (
    error instanceof Error &&
    error.message === "Supabase environment variables are missing."
  ) {
    return NextResponse.json(
      {
        error:
          "Server configuration missing: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local and restart dev server."
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { error: "An unexpected server error occurred." },
    { status: 500 }
  );
}
