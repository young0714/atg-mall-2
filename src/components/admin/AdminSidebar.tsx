"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Permission } from "@/lib/rbac";
import { PERMISSIONS } from "@/lib/rbac";

interface NavItem {
  href: string;
  label: string;
  permission: Permission;
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Overview",
    items: [{ href: "/admin", label: "Dashboard", permission: PERMISSIONS.VIEW_ADMIN_DASHBOARD }],
  },
  {
    section: "Catalog",
    items: [
      { href: "/admin/products", label: "Products", permission: PERMISSIONS.MANAGE_PRODUCTS },
      { href: "/admin/product-sources", label: "Product Sources", permission: PERMISSIONS.MANAGE_PRODUCTS },
      { href: "/admin/categories", label: "Categories", permission: PERMISSIONS.MANAGE_CATEGORIES },
      { href: "/admin/suppliers", label: "Suppliers", permission: PERMISSIONS.MANAGE_SUPPLIERS },
    ],
  },
  {
    section: "Sourcing",
    items: [
      { href: "/admin/shop-for-me", label: "Shop for Me", permission: PERMISSIONS.MANAGE_SHOP_FOR_ME },
      { href: "/admin/sourcing", label: "Source a Product", permission: PERMISSIONS.MANAGE_SOURCING },
    ],
  },
  {
    section: "Orders & Logistics",
    items: [
      { href: "/admin/orders", label: "Orders", permission: PERMISSIONS.MANAGE_ORDERS },
      { href: "/admin/packages", label: "Packages", permission: PERMISSIONS.MANAGE_WAREHOUSE },
      { href: "/admin/warehouse", label: "Warehouse", permission: PERMISSIONS.MANAGE_WAREHOUSE },
      { href: "/admin/consolidation", label: "Consolidation", permission: PERMISSIONS.MANAGE_CONSOLIDATION },
      { href: "/admin/shipments", label: "Shipments", permission: PERMISSIONS.MANAGE_SHIPMENTS },
      { href: "/admin/shipping-rates", label: "Shipping Rates", permission: PERMISSIONS.MANAGE_SHIPPING_RATES },
    ],
  },
  {
    section: "Finance",
    items: [
      { href: "/admin/payments", label: "Payments", permission: PERMISSIONS.MANAGE_PAYMENTS },
      { href: "/admin/wallets", label: "Wallets", permission: PERMISSIONS.MANAGE_WALLETS },
      { href: "/admin/refunds", label: "Refunds", permission: PERMISSIONS.MANAGE_REFUNDS },
    ],
  },
  {
    section: "People",
    items: [
      { href: "/admin/customers", label: "Customers", permission: PERMISSIONS.MANAGE_CUSTOMERS },
      { href: "/admin/sellers", label: "Sellers", permission: PERMISSIONS.MANAGE_SELLERS },
    ],
  },
  {
    section: "Marketplace",
    items: [
      { href: "/admin/coupons", label: "Coupons", permission: PERMISSIONS.MANAGE_COUPONS },
      { href: "/admin/reviews", label: "Reviews", permission: PERMISSIONS.MANAGE_REVIEWS },
    ],
  },
  {
    section: "Operations",
    items: [
      { href: "/admin/support", label: "Support", permission: PERMISSIONS.MANAGE_SUPPORT },
      { href: "/admin/reports", label: "Reports", permission: PERMISSIONS.VIEW_REPORTS },
      { href: "/admin/settings", label: "Settings", permission: PERMISSIONS.MANAGE_SETTINGS },
      { href: "/admin/audit-log", label: "Audit Log", permission: PERMISSIONS.VIEW_AUDIT_LOG },
    ],
  },
];

export function AdminSidebar({ allowed }: { allowed: Permission[] }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-5">
      {NAV.map((section) => {
        const items = section.items.filter((i) => allowed.includes(i.permission));
        if (items.length === 0) return null;
        return (
          <div key={section.section}>
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-navy-500">{section.section}</p>
            <div className="space-y-0.5">
              {items.map((item) => {
                const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "block rounded-lg px-3 py-2 text-sm font-medium",
                      active ? "bg-white/10 text-white" : "text-navy-300 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
