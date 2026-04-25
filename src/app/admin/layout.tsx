import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/sidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin-shell px-5 py-5 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 md:flex-row md:items-start md:gap-6">
        <AdminSidebar />
        <main className="min-h-[calc(100vh-3rem)] w-full rounded-xl bg-slate-50 p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
