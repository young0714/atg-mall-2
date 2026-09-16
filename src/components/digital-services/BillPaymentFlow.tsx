"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AIRTIME_COUNTRIES, type AirtimeCountry } from "@/lib/constants";
import { formatMoney } from "@/lib/money";
import type { UtilityBiller } from "@/lib/services/reloadlyUtilityService";
import {
  initiateUtilityBillOtpAction,
  confirmUtilityBillOtpAction,
  previewUtilityBillChargeAction,
  type WalletChargePreview,
} from "@/app/digital-services/bills/actions";
import { OtpVerificationStep } from "./OtpVerificationStep";

type Step = 1 | 2 | "confirm" | "otp" | "success";

export function BillPaymentFlow() {
  const [step, setStep] = useState<Step>(1);

  const [countryQuery, setCountryQuery] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [country, setCountry] = useState<AirtimeCountry>(AIRTIME_COUNTRIES[0]);

  const [billers, setBillers] = useState<UtilityBiller[] | null>(null);
  const [billersLoading, setBillersLoading] = useState(false);
  const [biller, setBiller] = useState<UtilityBiller | null>(null);

  const [accountNumber, setAccountNumber] = useState("");
  const [amountText, setAmountText] = useState("");

  const [preview, setPreview] = useState<WalletChargePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  const [otpId, setOtpId] = useState("");
  const [otpEmail, setOtpEmail] = useState("");

  // Reloadly's biller pricing (like Airtime) is in that country's own local
  // currency — only offer this where that's one of ATG's Currency values.
  const chargeCurrency = country.currency;
  const amount = amountText ? Number(amountText) : null;

  useEffect(() => {
    if (!chargeCurrency) {
      setBillers(null);
      setBiller(null);
      return;
    }
    let cancelled = false;
    setBillersLoading(true);
    setBillers(null);
    setBiller(null);
    fetch(`/api/v1/digital-services/billers?country=${country.isoCode}`)
      .then((r) => r.json())
      .then((body) => {
        if (!cancelled) setBillers(Array.isArray(body?.data) ? body.data : []);
      })
      .catch(() => {
        if (!cancelled) setBillers([]);
      })
      .finally(() => {
        if (!cancelled) setBillersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [country, chargeCurrency]);

  const filteredCountries = countryQuery.trim()
    ? AIRTIME_COUNTRIES.filter((c) => c.name.toLowerCase().includes(countryQuery.trim().toLowerCase()))
    : AIRTIME_COUNTRIES;

  function selectCountry(c: AirtimeCountry) {
    setCountry(c);
    setCountryOpen(false);
    setCountryQuery("");
  }

  function displayAmount(v: number) {
    return chargeCurrency ? formatMoney(Math.round(v * 100), chargeCurrency) : String(v);
  }

  async function goToConfirm() {
    if (!biller || !amount || !chargeCurrency) return;
    setPreviewLoading(true);
    setErrorMsg(null);
    try {
      const p = await previewUtilityBillChargeAction({ amount, chargeCurrency });
      setPreview(p);
      setStep("confirm");
    } catch {
      setErrorMsg("Could not check your wallet balance. Please try again.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function initiateOtp() {
    if (!biller || !amount || !chargeCurrency) return;
    setSubmitting(true);
    setErrorMsg(null);
    const result = await initiateUtilityBillOtpAction({
      countryIso: country.isoCode,
      billerId: biller.billerId,
      billerName: biller.name,
      subscriberAccountNumber: accountNumber,
      amount,
      chargeCurrency,
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

  async function verifyOtpAndPay(code: string) {
    setSubmitting(true);
    setErrorMsg(null);
    const result = await confirmUtilityBillOtpAction(otpId, code);
    setSubmitting(false);
    if (result.ok) {
      setOrderId(result.orderId ?? null);
      setStep("success");
    } else {
      setErrorMsg(result.error ?? "The bill payment could not be completed.");
    }
  }

  function reset() {
    setStep(1);
    setBiller(null);
    setAccountNumber("");
    setAmountText("");
    setPreview(null);
    setErrorMsg(null);
    setOrderId(null);
    setOtpId("");
    setOtpEmail("");
  }

  return (
    <div className="card max-w-lg space-y-5 p-6">
      {step === 1 && (
        <>
          <div>
            <p className="label mb-2">Country</p>
            <div className="relative">
              <button
                type="button"
                onClick={() => setCountryOpen((v) => !v)}
                className="input flex w-full items-center justify-between gap-2 text-left"
              >
                <span>
                  {country.flag} {country.name}
                </span>
                <span className="text-xs font-semibold text-atgblue-600">Change</span>
              </button>
              {countryOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setCountryOpen(false)} />
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl2 border border-navy-100 bg-white shadow-card-hover">
                    <input
                      autoFocus
                      className="input rounded-b-none border-x-0 border-t-0"
                      placeholder="Search for a country…"
                      value={countryQuery}
                      onChange={(e) => setCountryQuery(e.target.value)}
                    />
                    <div className="max-h-56 overflow-y-auto p-1.5">
                      {filteredCountries.length === 0 ? (
                        <p className="p-3 text-center text-xs text-navy-400">No countries match your search</p>
                      ) : (
                        filteredCountries.slice(0, 8).map((c) => (
                          <button
                            type="button"
                            key={c.isoCode}
                            onClick={() => selectCountry(c)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-sand-100"
                          >
                            <span>{c.flag}</span>
                            <span>{c.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {!chargeCurrency ? (
            <p className="rounded-lg bg-gold-50 p-3 text-sm text-gold-700">
              Bill payments for {country.name} aren&apos;t available yet — check back soon, or pick a different country.
            </p>
          ) : (
            <div>
              <p className="label mb-2">Biller</p>
              {billersLoading ? (
                <p className="text-sm text-navy-400">Loading billers…</p>
              ) : !billers || billers.length === 0 ? (
                <p className="text-sm text-navy-400">No billers available for {country.name} right now.</p>
              ) : (
                <select
                  className="input"
                  value={biller?.billerId ?? ""}
                  onChange={(e) => {
                    const b = billers.find((bl) => bl.billerId === Number(e.target.value));
                    setBiller(b ?? null);
                  }}
                >
                  <option value="" disabled>
                    Select a biller…
                  </option>
                  {billers.map((b) => (
                    <option key={b.billerId} value={b.billerId}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <button className="btn-primary w-full" disabled={!biller} onClick={() => setStep(2)}>
            Continue
          </button>
        </>
      )}

      {step === 2 && biller && (
        <>
          <p className="text-sm text-navy-500">
            {biller.name} · {country.name}
          </p>

          <div>
            <p className="label mb-2">Meter / account number</p>
            <input
              className="input"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="e.g. 04521178932"
            />
          </div>

          <div>
            <p className="label mb-2">Amount ({chargeCurrency})</p>
            <input
              className="input"
              inputMode="decimal"
              placeholder="15000"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
            />
          </div>

          {errorMsg && <p className="text-sm font-medium text-red-600">{errorMsg}</p>}

          <div className="flex gap-2">
            <button className="btn-outline" onClick={() => setStep(1)}>
              Back
            </button>
            <button
              className="btn-primary flex-1"
              disabled={accountNumber.trim().length < 3 || !amount || amount <= 0 || previewLoading}
              onClick={goToConfirm}
            >
              {previewLoading ? "Checking wallet…" : "Review order"}
            </button>
          </div>
        </>
      )}

      {step === "confirm" && biller && amount && preview && (
        <>
          <div className="space-y-1 rounded-xl2 bg-sand-100 p-4 text-sm">
            <div className="flex justify-between py-1.5">
              <span className="text-navy-500">Biller</span>
              <span className="font-semibold">
                {biller.name} ({country.name})
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-navy-500">Account</span>
              <span className="font-semibold">{accountNumber}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-navy-500">Amount</span>
              <span className="font-semibold">{displayAmount(amount)}</span>
            </div>
            <div className="flex justify-between border-t border-dashed border-navy-200 py-1.5 pt-3">
              <span className="text-navy-500">Charged from wallet</span>
              <span className="font-bold text-atgblue-600">{formatMoney(preview.debitAmountMinor, preview.walletCurrency)}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-navy-500">Wallet balance after</span>
              <span className="font-bold text-atggreen-600">
                {formatMoney(preview.walletBalanceMinor - preview.debitAmountMinor, preview.walletCurrency)}
              </span>
            </div>
          </div>

          {errorMsg && <p className="text-sm font-medium text-red-600">{errorMsg}</p>}

          <div className="flex gap-2">
            <button className="btn-outline" onClick={() => setStep(2)}>
              Back
            </button>
            <button className="btn-primary flex-1" disabled={submitting} onClick={initiateOtp}>
              {submitting ? "Sending code…" : "Confirm & Pay"}
            </button>
          </div>
        </>
      )}

      {step === "otp" && (
        <OtpVerificationStep
          email={otpEmail}
          otpId={otpId}
          onOtpIdChange={setOtpId}
          onVerify={verifyOtpAndPay}
          onBack={() => setStep("confirm")}
          submitting={submitting}
          errorMsg={errorMsg}
        />
      )}

      {step === "success" && biller && amount && (
        <div className="py-2 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-atggreen-50 text-2xl text-atggreen-600">
            ✓
          </div>
          <h3 className="text-lg font-bold text-navy-900">Bill paid</h3>
          <p className="mt-1 text-sm text-navy-500">
            {displayAmount(amount)} paid to {biller.name} for {accountNumber}.
          </p>
          {orderId && <p className="mt-1 text-xs text-navy-400">Order {orderId}</p>}
          <div className="mt-5 flex justify-center gap-2">
            <button className="btn-outline" onClick={reset}>
              Pay another bill
            </button>
            <Link href="/digital-services" className="btn-primary">
              Back to Digital Services
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
