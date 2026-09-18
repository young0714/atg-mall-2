"use client";

import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import {
  setPinAction,
  disablePinLockAction,
  startWebAuthnRegistrationAction,
  finishWebAuthnRegistrationAction,
  removeWebAuthnDeviceAction,
} from "@/app/account/security/actions";

interface Device {
  id: string;
  deviceLabel: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

function guessDeviceLabel(): string {
  if (typeof navigator === "undefined") return "This device";
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android device";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows PC";
  return "This device";
}

export function SecuritySettings({
  pinEnabled: initialPinEnabled,
  initialDevices,
}: {
  pinEnabled: boolean;
  initialDevices: Device[];
}) {
  const [pinEnabled, setPinEnabled] = useState(initialPinEnabled);
  const [devices, setDevices] = useState(initialDevices);
  const [showPinForm, setShowPinForm] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSavePin() {
    if (pin.length !== 4 || pin !== confirmPin) return;
    setSubmitting(true);
    setErrorMsg(null);
    const result = await setPinAction(pin);
    setSubmitting(false);
    if (result.ok) {
      setPinEnabled(true);
      setShowPinForm(false);
      setPin("");
      setConfirmPin("");
    } else {
      setErrorMsg(result.error ?? "Could not save that PIN.");
    }
  }

  async function handleDisable() {
    if (!confirm("Turn off PIN lock? This also removes any Face ID / Touch ID devices you've added.")) return;
    setSubmitting(true);
    const result = await disablePinLockAction();
    setSubmitting(false);
    if (result.ok) {
      setPinEnabled(false);
      setDevices([]);
    }
  }

  async function handleAddDevice() {
    setErrorMsg(null);
    const optionsResult = await startWebAuthnRegistrationAction();
    if (!optionsResult.ok || !optionsResult.options) {
      setErrorMsg(optionsResult.error ?? "Could not start registration.");
      return;
    }
    try {
      const response = await startRegistration({
        optionsJSON: optionsResult.options as Parameters<typeof startRegistration>[0]["optionsJSON"],
      });
      const label = guessDeviceLabel();
      const result = await finishWebAuthnRegistrationAction(response, label);
      if (result.ok && result.credentialRowId) {
        setDevices((prev) => [{ id: result.credentialRowId!, deviceLabel: label, createdAt: new Date().toISOString(), lastUsedAt: null }, ...prev]);
      } else {
        setErrorMsg(result.error ?? "Could not register this device.");
      }
    } catch {
      setErrorMsg("Face ID / Touch ID setup was cancelled or isn't available on this device.");
    }
  }

  async function handleRemoveDevice(id: string) {
    setDevices((prev) => prev.filter((d) => d.id !== id));
    await removeWebAuthnDeviceAction(id);
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="card p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-navy-900">PIN Lock</h2>
            <p className="mt-0.5 text-sm text-navy-500">
              {pinEnabled ? "Enabled — required every time you reopen ATG Mall." : "Off — anyone who opens ATG Mall on your device sees your account."}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${pinEnabled ? "bg-atggreen-50 text-atggreen-700" : "bg-navy-100 text-navy-500"}`}>
            {pinEnabled ? "On" : "Off"}
          </span>
        </div>

        {!showPinForm ? (
          <div className="mt-4 flex gap-2">
            <button className="btn-primary" onClick={() => setShowPinForm(true)}>
              {pinEnabled ? "Change PIN" : "Set a PIN"}
            </button>
            {pinEnabled && (
              <button className="btn-outline" disabled={submitting} onClick={handleDisable}>
                Turn off
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div>
              <p className="label mb-1.5">New 4-digit PIN</p>
              <input
                type="password"
                className="input text-center tracking-[0.5em]"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </div>
            <div>
              <p className="label mb-1.5">Confirm PIN</p>
              <input
                type="password"
                className="input text-center tracking-[0.5em]"
                inputMode="numeric"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </div>
            {pin.length === 4 && confirmPin.length === 4 && pin !== confirmPin && (
              <p className="text-sm font-medium text-red-600">PINs don&apos;t match.</p>
            )}
            {errorMsg && <p className="text-sm font-medium text-red-600">{errorMsg}</p>}
            <div className="flex gap-2">
              <button
                className="btn-outline"
                onClick={() => {
                  setShowPinForm(false);
                  setPin("");
                  setConfirmPin("");
                  setErrorMsg(null);
                }}
              >
                Cancel
              </button>
              <button
                className="btn-primary flex-1"
                disabled={pin.length !== 4 || pin !== confirmPin || submitting}
                onClick={handleSavePin}
              >
                {submitting ? "Saving…" : "Save PIN"}
              </button>
            </div>
          </div>
        )}
      </div>

      {pinEnabled && (
        <div className="card p-5">
          <h2 className="font-semibold text-navy-900">Face ID / Touch ID</h2>
          <p className="mt-0.5 text-sm text-navy-500">
            Unlock with your device's biometrics instead of typing your PIN. Works per device — add each one you use.
          </p>

          {devices.length > 0 && (
            <div className="mt-4 divide-y divide-navy-100 rounded-lg border border-navy-100">
              {devices.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 p-3">
                  <div>
                    <p className="text-sm font-medium text-navy-800">{d.deviceLabel ?? "Unnamed device"}</p>
                    <p className="text-xs text-navy-400">
                      {d.lastUsedAt ? `Last used ${new Date(d.lastUsedAt).toLocaleDateString()}` : "Never used yet"}
                    </p>
                  </div>
                  <button className="text-sm font-medium text-red-600" onClick={() => handleRemoveDevice(d.id)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {errorMsg && !showPinForm && <p className="mt-3 text-sm font-medium text-red-600">{errorMsg}</p>}

          <button className="btn-outline mt-4" onClick={handleAddDevice}>
            + Add this device
          </button>
        </div>
      )}
    </div>
  );
}
