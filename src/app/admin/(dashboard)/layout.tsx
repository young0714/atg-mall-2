import { requireStaff } from "@/lib/auth/current-user";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import { PERMISSIONS, ROLE_LABELS, can, type Permission } from "@/lib/rbac";
import { Logo } from "@/components/ui/Logo";
import Link from "next/link";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const allowed = Object.values(PERMISSIONS).filter((p) => can(user.role, p)) as Permission[];

  return (
    <div className="flex min-h-screen bg-sand-50">
      <aside className="hidden w-64 shrink-0 bg-navy-900 p-4 lg:block">
        <Link href="/admin" className="mb-6 block px-2">
          <Logo />
        </Link>
        <AdminSidebar allowed={allowed} />
      </aside>

      {/* min-w-0 keeps this column capped at the viewport width — without
          it, a flex child sizes to fit its widest content (e.g. a wide
          table), stretching the whole page instead of letting that one
          table scroll within its own overflow-x-auto wrapper. */}
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between gap-3 border-b border-navy-100 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <AdminMobileNav allowed={allowed} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-navy-900">{user.fullName}</p>
              <p className="text-xs text-navy-400">{ROLE_LABELS[user.role]}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link href="/" className="hidden text-sm text-navy-500 hover:text-navy-800 sm:inline">View storefront ↗</Link>
            <form action="/api/v1/auth/logout" method="POST">
              <button className="btn-outline btn-sm">Sign out</button>
            </form>
          </div>
        </header>
        <main className="overflow-x-hidden p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
