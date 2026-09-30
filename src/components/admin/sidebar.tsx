"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const links = [
  { href: "/admin/events", label: "Events" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/attendance", label: "Attendance" },
  { href: "/admin/officers", label: "Officers" },
  { href: "/admin/settings", label: "Settings" }
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="sticky top-6 h-fit w-full rounded-xl bg-slate-800 p-6 text-slate-100 md:w-72">
      <div className="mb-8 flex items-center gap-3">
        <Image
          src="/shpeBEAR.png"
          alt="SHPE Bear"
          width={44}
          height={44}
          className="h-11 w-11 rounded-md bg-white/10 object-contain p-1"
          priority
        />
        <div>
          <h1 className="text-xl font-bold text-white">SHPE Cornell</h1>
          <p className="text-sm text-slate-300">Admin Dashboard</p>
        </div>
      </div>
      <nav className="space-y-3">
        {links.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg border px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? "border-blue-600 bg-blue-700 text-white"
                  : "border-slate-500/30 bg-slate-700/20 text-slate-100 hover:border-slate-300/40 hover:bg-slate-100/10"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div id="admin-sidebar-slot" className="mt-5 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1" />
      <button
        type="button"
        onClick={handleSignOut}
        className="mt-5 w-full rounded-lg border border-slate-500/30 bg-slate-700/20 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-300/40 hover:bg-slate-100/10"
      >
        Sign out
      </button>
    </aside>
  );
}
