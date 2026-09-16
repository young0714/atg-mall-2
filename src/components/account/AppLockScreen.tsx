"use client";

import { useEffect, useState } from "react";
import { startAuthentication, platformAuthenticatorIsAvailable } from "@simplewebauthn/browser";
import {
  verifyPinUnlockAction,
  startWebAuthnAuthenticationAction,
  finishWebAuthnAuthenticationAction,
  initiatePinResetOtpAction,
  confirmPinResetOtpAction,
} from "@/app/account/security/actions";

type Mode = "biometric-checking" | "pin" | "forgot";

export function AppLockScreen({ onUnlocked }: { onUnlocked: () => void }) {
  const [mode, setMode] = useState<Mode>("biometric-checking");
  const [pin, setPin] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [otpId, setOtpId] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [resetSent, setResetSent] = useState(false);

  // Try biometric automatically on load, only if this device has a
  // platform authenticator AND this account has one enrolled — never
  // prompt biometric for an account that only has a PIN.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const available = await platformAuthenticatorIsAvailable();
        if (!available) {
          if (!cancelled) setMode("pin");
          return;
        }
        const optionsResult = await startWebAuthnAuthenticationAction();
        if (!optionsResult.ok || !optionsResult.options) {
          if (!cancelled) setMode("pin");
          return;
        }
        const response = await startAuthentication({
          optionsJSON: optionsResult.options as Parameters<typeof startAuthentication>[0]["optionsJSON"],
        });
        const verified = await finishWebAuthnAuthenticationAction(response);
        if (cancelled) return;
        if (verified.ok) {
          onUnlocked();
        } else {
          setMode("pin");
        }
      } catch {
        // User cancelled the prompt, or the browser/device doesn't support it — fall back silently.
        if (!cancelled) setMode("pin");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleTryBiometricAgain() {
    setMode("biometric-checking");
    setErrorMsg(null);
    try {
      const optionsResult = await startWebAuthnAuthenticationAction();
      if (!optionsResult.ok || !optionsResult.options) {
        setMode("pin");
        return;
      }
      const response = await startAuthentication({
        optionsJSON: optionsResult.options as Parameters<typeof startAuthentication>[0]["optionsJSON"],
      });
      const verified = await finishWebAuthnAuthenticationAction(response);
      if (verified.ok) onUnlocked();
      else setMode("pin");
    } catch {
      setMode("pin");
    }
  }

  async function handlePinSubmit() {
    if (pin.length !== 4) return;
    setSubmitting(true);
    setErrorMsg(null);
    const result = await verifyPinUnlockAction(pin);
    setSubmitting(false);
    if (result.ok) {
      onUnlocked();
    } else {
      setPin("");
      setErrorMsg(result.error ?? "Incorrect PIN.");
    }
  }

  async function handleForgotPin() {
    setMode("forgot");
    setErrorMsg(null);
    setSubmitting(true);
    const result = await initiatePinResetOtpAction();
    setSubmitting(false);
    if (result.ok && result.otpId && result.email) {
      setOtpId(result.otpId);
      setOtpEmail(result.email);
      setResetSent(true);
    } else {
      setErrorMsg(result.error ?? "Could not send a reset code. Please try again.");
    }
  }

  async function handleResetSubmit() {
    if (resetCode.length !== 6 || newPin.length !== 4 || newPin !== confirmPin) return;
    setSubmitting(true);
    setErrorMsg(null);
    const result = await confirmPinResetOtpAction(otpId, resetCode, newPin);
    setSubmitting(false);
    if (result.ok) {
      onUnlocked();
    } else {
      setErrorMsg(result.error ?? "Could not reset your PIN. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-navy-gradient p-6">
      <div className="w-full max-w-sm rounded-xl2 bg-white p-6 shadow-card-hover">
        {mode === "biometric-checking" && (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-full bg-atgblue-100" />
            <p className="text-sm text-navy-500">Checking for Face ID / Touch ID…</p>
          </div>
        )}

        {mode === "pin" && (
          <>
            <h1 className="text-center text-lg font-display font-bold text-navy-900">Enter your PIN</h1>
            <p className="mt-1 text-center text-sm text-navy-500">ATG Mall is locked. Enter your 4-digit PIN to continue.</p>

            <input
              className="input mt-5 text-center text-2xl tracking-[0.5em]"
              inputMode="numeric"
              maxLength={4}
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />

            {errorMsg && <p className="mt-3 text-center text-sm font-medium text-red-600">{errorMsg}</p>}

            <button
              className="btn-primary mt-4 w-full"
              disabled={pin.length !== 4 || submitting}
              onClick={handlePinSubmit}
            >
              {submitting ? "Checking…" : "Unlock"}
            </button>

            <div className="mt-4 flex items-center justify-between text-sm">
              <button type="button" onClick={handleTryBiometricAgain} className="font-medium text-atgblue-600">
                Try Face ID / Touch ID
              </button>
              <button type="button" onClick={handleForgotPin} className="font-medium text-navy-400">
                Forgot PIN?
              </button>
            </div>
          </>
        )}

        {mode === "forgot" && (
          <>
            <h1 className="text-center text-lg font-display font-bold text-navy-900">Reset your PIN</h1>

            {!resetSent ? (
              <p className="mt-3 text-center text-sm text-navy-500">Sending a verification code…</p>
            ) : (
              <>
                <p className="mt-1 text-center text-sm text-navy-500">
                  We sent a 6-digit code to <span className="font-medium text-navy-700">{otpEmail}</span>.
                </p>

                <div className="mt-5 space-y-3">
                  <div>
                    <p className="label mb-1.5">Verification code</p>
                    <input
                      className="input text-center tracking-[0.3em]"
                      inputMode="numeric"
                      maxLength={6}
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    />
                  </div>
                  <div>
                    <p className="label mb-1.5">New PIN</p>
                    <input
                      className="input text-center tracking-[0.5em]"
                      inputMode="numeric"
                      maxLength={4}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    />
                  </div>
                  <div>
                    <p className="label mb-1.5">Confirm new PIN</p>
                    <input
                      className="input text-center tracking-[0.5em]"
                      inputMode="numeric"
                      maxLength={4}
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    />
                  </div>
                </div>

                {newPin.length === 4 && confirmPin.length === 4 && newPin !== confirmPin && (
                  <p className="mt-2 text-center text-sm font-medium text-red-600">PINs don&apos;t match.</p>
                )}
                {errorMsg && <p className="mt-2 text-center text-sm font-medium text-red-600">{errorMsg}</p>}

                <button
                  className="btn-primary mt-4 w-full"
                  disabled={resetCode.length !== 6 || newPin.length !== 4 || newPin !== confirmPin || submitting}
                  onClick={handleResetSubmit}
                >
                  {submitting ? "Resetting…" : "Reset PIN & Unlock"}
                </button>
              </>
            )}

            <button type="button" onClick={() => setMode("pin")} className="mt-4 block w-full text-center text-sm font-medium text-navy-400">
              Back to PIN entry
            </button>
          </>
        )}
      </div>
    </div>
  );
}
