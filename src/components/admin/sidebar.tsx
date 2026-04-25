"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin/events", label: "Events" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/officers", label: "Officers" },
  { href: "/admin/settings", label: "Settings" }
];

export function AdminSidebar() {
  const pathname = usePathname();

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
    </aside>
  );
}
