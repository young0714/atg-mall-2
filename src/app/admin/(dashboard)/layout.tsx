import { requireStaff } from "@/lib/auth/current-user";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
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

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-navy-100 bg-white px-6 py-3">
          <div>
            <p className="text-sm font-semibold text-navy-900">{user.fullName}</p>
            <p className="text-xs text-navy-400">{ROLE_LABELS[user.role]}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-navy-500 hover:text-navy-800">View storefront ↗</Link>
            <form action="/api/v1/auth/logout" method="POST">
              <button className="btn-outline btn-sm">Sign out</button>
            </form>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
