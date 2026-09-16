"use client";

import { useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/money";
import {
  lookupRecipientAction,
  previewWalletBalanceAction,
  initiateWalletTransferOtpAction,
  confirmWalletTransferOtpAction,
  type WalletBalancePreview,
} from "@/app/account/wallet/send/actions";
import { OtpVerificationStep } from "@/components/digital-services/OtpVerificationStep";

type Step = "form" | "confirm" | "otp" | "success";

export function WalletTransferFlow() {
  const [step, setStep] = useState<Step>("form");

  const [accountNumber, setAccountNumber] = useState("");
  const [amountText, setAmountText] = useState("");
  const [note, setNote] = useState("");

  const [recipientName, setRecipientName] = useState("");
  const [preview, setPreview] = useState<WalletBalancePreview | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [transferId, setTransferId] = useState<string | null>(null);

  const [otpId, setOtpId] = useState("");
  const [otpEmail, setOtpEmail] = useState("");

  const amount = amountText ? Number(amountText) : null;
  const amountMinor = amount ? Math.round(amount * 100) : 0;

  async function goToConfirm() {
    if (accountNumber.length !== 10 || !amount || amount <= 0) return;
    setReviewLoading(true);
    setErrorMsg(null);
    try {
      const [lookup, balance] = await Promise.all([lookupRecipientAction(accountNumber), previewWalletBalanceAction()]);
      if (!lookup.ok || !lookup.recipientName) {
        setErrorMsg(lookup.error ?? "Could not find that account.");
        return;
      }
      setRecipientName(lookup.recipientName);
      setPreview(balance);
      setStep("confirm");
    } catch {
      setErrorMsg("Could not look up that account. Please try again.");
    } finally {
      setReviewLoading(false);
    }
  }

  async function initiateOtp() {
    setSubmitting(true);
    setErrorMsg(null);
    const result = await initiateWalletTransferOtpAction({
      recipientAccountNumber: accountNumber,
      amount: amount ?? 0,
      note: note.trim() || undefined,
    });
    setSubmitting(false);
    if (result.ok && result.otpId && result.email) {
      setOtpId(result.otpId);
      setOtpEmail(result.email);
      setStep("otp");
    } else {
      setErrorMsg(result.error ?? "Could not start verification. Please try again.");
    }
  }

  async function verifyOtpAndSend(code: string) {
    setSubmitting(true);
    setErrorMsg(null);
    const result = await confirmWalletTransferOtpAction(otpId, code);
    setSubmitting(false);
    if (result.ok) {
      setTransferId(result.transferId ?? null);
      setStep("success");
    } else {
      setErrorMsg(result.error ?? "This transfer could not be completed.");
    }
  }

  function reset() {
    setStep("form");
    setAccountNumber("");
    setAmountText("");
    setNote("");
    setRecipientName("");
    setPreview(null);
    setErrorMsg(null);
    setTransferId(null);
    setOtpId("");
    setOtpEmail("");
  }

  return (
    <div className="card max-w-lg space-y-5 p-6">
      {step === "form" && (
        <>
          <div>
            <p className="label mb-2">Recipient's ATG account number</p>
            <input
              className="input font-mono tracking-wide"
              inputMode="numeric"
              maxLength={10}
              placeholder="1234567890"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
            />
            <p className="mt-1.5 text-xs text-navy-400">Ask them for their account number on their own Wallet page.</p>
          </div>

          <div>
            <p className="label mb-2">Amount</p>
            <input
              className="input"
              inputMode="decimal"
              placeholder="5000"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
            />
          </div>

          <div>
            <p className="label mb-2">Note (optional)</p>
            <input
              className="input"
              maxLength={140}
              placeholder="What's this for?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {errorMsg && <p className="text-sm font-medium text-red-600">{errorMsg}</p>}

          <button
            className="btn-primary w-full"
            disabled={accountNumber.length !== 10 || !amount || amount <= 0 || reviewLoading}
            onClick={goToConfirm}
          >
            {reviewLoading ? "Looking up account…" : "Review transfer"}
          </button>
        </>
      )}

      {step === "confirm" && preview && (
        <>
          <div className="space-y-1 rounded-xl2 bg-sand-100 p-4 text-sm">
            <div className="flex justify-between py-1.5">
              <span className="text-navy-500">Sending to</span>
              <span className="font-semibold">{recipientName}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-navy-500">Account number</span>
              <span className="font-mono font-semibold">{accountNumber}</span>
            </div>
            {note.trim() && (
              <div className="flex justify-between py-1.5">
                <span className="text-navy-500">Note</span>
                <span className="font-semibold">{note.trim()}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-dashed border-navy-200 py-1.5 pt-3">
              <span className="text-navy-500">Amount</span>
              <span className="font-bold text-atgblue-600">{formatMoney(amountMinor, preview.walletCurrency)}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-navy-500">Wallet balance after</span>
              <span className="font-bold text-atggreen-600">
                {formatMoney(preview.walletBalanceMinor - amountMinor, preview.walletCurrency)}
              </span>
            </div>
          </div>

          {errorMsg && <p className="text-sm font-medium text-red-600">{errorMsg}</p>}

          <div className="flex gap-2">
            <button className="btn-outline" onClick={() => setStep("form")}>
              Back
            </button>
            <button className="btn-primary flex-1" disabled={submitting} onClick={initiateOtp}>
              {submitting ? "Sending code…" : "Send"}
            </button>
          </div>
        </>
      )}

      {step === "otp" && (
        <OtpVerificationStep
          email={otpEmail}
          otpId={otpId}
          onOtpIdChange={setOtpId}
          onVerify={verifyOtpAndSend}
          onBack={() => setStep("confirm")}
          submitting={submitting}
          errorMsg={errorMsg}
        />
      )}

      {step === "success" && preview && (
        <div className="py-2 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-atggreen-50 text-2xl text-atggreen-600">
            ✓
          </div>
          <h3 className="text-lg font-bold text-navy-900">Money sent</h3>
          <p className="mt-1 text-sm text-navy-500">
            {formatMoney(amountMinor, preview.walletCurrency)} sent to {recipientName}.
          </p>
          {transferId && <p className="mt-1 text-xs text-navy-400">Transfer {transferId}</p>}
          <div className="mt-5 flex justify-center gap-2">
            <button className="btn-outline" onClick={reset}>
              Send again
            </button>
            <Link href="/account/wallet" className="btn-primary">
              Back to Wallet
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
