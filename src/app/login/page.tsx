import type { Metadata } from "next";
import { GoogleSignInButton } from "./google-signin-button";

export const metadata: Metadata = {
  title: "Sign in — SHPE Cornell Admin"
};

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="panel w-full max-w-sm rounded-xl p-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900">SHPE Cornell Admin</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in with your Google account to continue.
        </p>

        {error === "not_allowed" && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            That Google account isn&apos;t authorized for this dashboard.
          </p>
        )}
        {error === "auth_failed" && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Sign-in failed. Please try again.
          </p>
        )}

        <div className="mt-6">
          <GoogleSignInButton />
        </div>
      </div>
    </div>
  );
}
