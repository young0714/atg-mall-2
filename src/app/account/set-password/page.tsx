import { Field, Input } from "@/components/ui/Form";
import { setPasswordAction } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Set a Password" };

export default function SetPasswordPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="max-w-md space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Set a password</h1>
        <p className="mt-1 text-sm text-navy-500">
          Set a password so you can sign in with your email next time, instead of relying on an emailed link.
        </p>
      </div>

      {searchParams.error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>
      )}

      <form action={setPasswordAction} className="space-y-4">
        <Field label="New password" htmlFor="password" required>
          <Input id="password" name="password" type="password" required minLength={8} />
        </Field>
        <Field label="Confirm password" htmlFor="confirmPassword" required>
          <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} />
        </Field>
        <button type="submit" className="btn-primary w-full">Set Password</button>
      </form>
    </div>
  );
}
