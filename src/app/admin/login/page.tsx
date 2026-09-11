import { Logo } from "@/components/ui/Logo";
import { Field, Input } from "@/components/ui/Form";
import { loginAction } from "@/app/login/actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin Sign In" };

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo size="hero" /></div>
        <div className="rounded-xl2 bg-white p-7 shadow-card-hover">
          <h1 className="text-lg font-display font-bold text-navy-900">ATG Mall Admin Console</h1>
          <p className="mt-1 text-sm text-navy-500">Staff sign-in only.</p>

          {searchParams.error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>
          )}

          <form action={loginAction} className="mt-5 space-y-4">
            <input type="hidden" name="next" value="/admin" />
            <Field label="Email" htmlFor="email" required>
              <Input id="email" name="email" type="email" required autoFocus />
            </Field>
            <Field label="Password" htmlFor="password" required>
              <Input id="password" name="password" type="password" required />
            </Field>
            <button type="submit" className="btn-secondary w-full">Sign In</button>
          </form>
        </div>
        <div className="mt-6 rounded-xl2 bg-white/5 p-4 text-xs text-navy-300">
          <p className="font-semibold text-white">Demo staff logins (password: AtgMall#2026)</p>
          <p className="mt-1">admin@atgmall.com — Super Admin</p>
          <p>ops@atgmall.com — Operations Admin</p>
          <p>sourcing@atgmall.com — Sourcing Staff</p>
          <p>warehouse@atgmall.com — Warehouse Staff</p>
          <p>shipping@atgmall.com — Shipping Staff</p>
          <p>finance@atgmall.com — Finance Staff</p>
          <p>support@atgmall.com — Customer Support</p>
        </div>
      </div>
    </div>
  );
}
