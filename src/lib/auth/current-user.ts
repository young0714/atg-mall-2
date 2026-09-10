import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "./session";
import { db } from "@/lib/db";
import { can, type Permission, ADMIN_ROLES } from "@/lib/rbac";

/** Returns the logged-in user's full DB record, or null if not authenticated. */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.isActive) return null;
  return user;
}

/** Redirects to /login if not authenticated; otherwise returns the user. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Redirects to /admin/login if not authenticated as any staff role. */
export async function requireStaff() {
  const user = await getCurrentUser();
  if (!user || !ADMIN_ROLES.includes(user.role)) {
    redirect("/admin/login");
  }
  return user;
}

/** Redirects to /admin if authenticated staff lacks the given permission. */
export async function requirePermission(permission: Permission) {
  const user = await requireStaff();
  if (!can(user.role, permission)) {
    redirect("/admin?error=forbidden");
  }
  return user;
}

/** Redirects to /login if not authenticated as a SELLER-role user. */
export async function requireSeller() {
  const user = await requireUser();
  if (user.role !== "SELLER") {
    redirect("/login");
  }
  return user;
}
