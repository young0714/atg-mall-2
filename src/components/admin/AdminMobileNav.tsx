"use client";

import { useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { Logo } from "@/components/ui/Logo";
import type { Permission } from "@/lib/rbac";

export function AdminMobileNav({ allowed }: { allowed: Permission[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="rounded-lg p-2 text-navy-600 hover:bg-sand-100 lg:hidden"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-navy-900 p-4">
            <div className="mb-6 flex items-center justify-between px-2">
              <Logo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            {/* Closing on click lets a nav link tap both navigate and dismiss the drawer. */}
            <div onClick={() => setOpen(false)}>
              <AdminSidebar allowed={allowed} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
