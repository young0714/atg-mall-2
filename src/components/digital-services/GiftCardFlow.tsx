"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AIRTIME_COUNTRIES, type AirtimeCountry } from "@/lib/constants";
import { formatMoney } from "@/lib/money";
import type { GiftCardProduct } from "@/lib/services/reloadlyGiftCardService";
import {
  initiateGiftCardOtpAction,
  confirmGiftCardOtpAction,
  previewGiftCardChargeAction,
  type WalletChargePreview,
} from "@/app/digital-services/gift-cards/actions";
import { OtpVerificationStep } from "./OtpVerificationStep";
import type { Currency } from "@prisma/client";

const SUPPORTED_WALLET_CURRENCIES = ["NGN", "GMD", "USD", "EUR", "GBP", "CNY"];

type Step = 1 | 2 | 3 | "confirm" | "otp" | "success";

export function GiftCardFlow() {
  const [step, setStep] = useState<Step>(1);

  const [countryQuery, setCountryQuery] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [country, setCountry] = useState<AirtimeCountry>(AIRTIME_COUNTRIES[0]);

  const [products, setProducts] = useState<GiftCardProduct[] | null>(null);
  const [productsLoading, setProductsLoading] = useState(false);
  const [product, setProduct] = useState<GiftCardProduct | null>(null);

  const [customAmount, setCustomAmount] = useState("");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  const [email, setEmail] = useState("");

  const [preview, setPreview] = useState<WalletChargePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  const [otpId, setOtpId] = useState("");
  const [otpEmail, setOtpEmail] = useState("");

  useEffect(() => {
    let cancelled = false;
    setProductsLoading(true);
    setProducts(null);
    setProduct(null);
    setSelectedAmount(null);
    setCustomAmount("");
    fetch(`/api/v1/digital-services/gift-card-products?country=${country.isoCode}`)
      .then((r) => r.json())
      .then((body) => {
        if (!cancelled) setProducts(Array.isArray(body?.data) ? body.data : []);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [country]);

  const chargeCurrency = (product?.currencyCode ?? undefined) as Currency | undefined;
  const fixedAmounts = product?.fixedDenominations;
  const minAmount = product?.minDenomination;
  const maxAmount = product?.maxDenomination;

  const filteredCountries = countryQuery.trim()
    ? AIRTIME_COUNTRIES.filter((c) => c.name.toLowerCase().includes(countryQuery.trim().toLowerCase()))
    : AIRTIME_COUNTRIES;

  function selectCountry(c: AirtimeCountry) {
    setCountry(c);
    setCountryOpen(false);
    setCountryQuery("");
  }

  function displayAmount(v: number) {
    return chargeCurrency && SUPPORTED_WALLET_CURRENCIES.includes(chargeCurrency)
      ? formatMoney(Math.round(v * 100), chargeCurrency)
      : `${v} ${product?.currencyCode ?? ""}`;
  }

  async function goToConfirm() {
    if (!product || !selectedAmount || !chargeCurrency) return;
    setPreviewLoading(true);
    setErrorMsg(null);
    try {
      const p = await previewGiftCardChargeAction({ amount: selectedAmount, chargeCurrency });
      setPreview(p);
      setStep("confirm");
    } catch {
      setErrorMsg("Could not check your wallet balance. Please try again.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function initiateOtp() {
    if (!product || !selectedAmount || !chargeCurrency) return;
    setSubmitting(true);
    setErrorMsg(null);
    const result = await initiateGiftCardOtpAction({
      countryIso: country.isoCode,
      productId: product.productId,
      brandName: product.brandName,
      recipientEmail: email,
      amount: selectedAmount,
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
    const result = await confirmGiftCardOtpAction(otpId, code);
    setSubmitting(false);
    if (result.ok) {
      setOrderId(result.orderId ?? null);
      setStep("success");
    } else {
      setErrorMsg(result.error ?? "The gift card order could not be completed.");
    }
  }

  function reset() {
    setStep(1);
    setProduct(null);
    setSelectedAmount(null);
    setCustomAmount("");
    setEmail("");
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

          <div>
            <p className="label mb-2">Brand</p>
            {productsLoading ? (
              <p className="text-sm text-navy-400">Loading gift cards…</p>
            ) : !products || products.length === 0 ? (
              <p className="text-sm text-navy-400">No gift cards available for {country.name} right now.</p>
            ) : (
              <select
                className="input"
                value={product?.productId ?? ""}
                onChange={(e) => {
                  const p = products.find((pr) => pr.productId === Number(e.target.value));
                  setProduct(p ?? null);
                }}
              >
                <option value="" disabled>
                  Select a brand…
                </option>
                {products.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.productName}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button className="btn-primary w-full" disabled={!product} onClick={() => setStep(2)}>
            Continue
          </button>
        </>
      )}

      {step === 2 && product && (
        <>
          <p className="text-sm text-navy-500">
            {product.brandName} · {product.productName}
          </p>

          {fixedAmounts && fixedAmounts.length > 0 ? (
            <div>
              <p className="label mb-2">Amount</p>
              <select
                className="input"
                value={selectedAmount ?? ""}
                onChange={(e) => {
                  setSelectedAmount(e.target.value ? Number(e.target.value) : null);
                  setCustomAmount("");
                }}
              >
                <option value="" disabled>
                  Select an amount…
                </option>
                {fixedAmounts.map((v) => (
                  <option key={v} value={v}>
                    {displayAmount(v)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <p className="label mb-2">
                Amount ({product.currencyCode}
                {minAmount != null && maxAmount != null ? ` · ${minAmount}–${maxAmount}` : ""})
              </p>
              <input
                className="input"
                inputMode="decimal"
                placeholder={minAmount != null ? String(minAmount) : "Amount"}
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  const n = Number(e.target.value);
                  setSelectedAmount(e.target.value && n > 0 ? n : null);
                }}
              />
            </div>
          )}

          <div className="flex gap-2">
            <button className="btn-outline" onClick={() => setStep(1)}>
              Back
            </button>
            <button className="btn-primary flex-1" disabled={!selectedAmount} onClick={() => setStep(3)}>
              Continue
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div>
            <p className="label mb-2">Deliver to</p>
            <input
              className="input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-navy-400">The redeem code is emailed here and saved to your order history.</p>
          </div>
          {errorMsg && <p className="text-sm font-medium text-red-600">{errorMsg}</p>}
          <div className="flex gap-2">
            <button className="btn-outline" onClick={() => setStep(2)}>
              Back
            </button>
            <button
              className="btn-primary flex-1"
              disabled={!email.includes("@") || previewLoading}
              onClick={goToConfirm}
            >
              {previewLoading ? "Checking wallet…" : "Review order"}
            </button>
          </div>
        </>
      )}

      {step === "confirm" && product && selectedAmount && preview && (
        <>
          <div className="space-y-1 rounded-xl2 bg-sand-100 p-4 text-sm">
            <div className="flex justify-between py-1.5">
              <span className="text-navy-500">Brand</span>
              <span className="font-semibold">{product.brandName}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-navy-500">Delivered to</span>
              <span className="font-semibold">{email}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-navy-500">Value</span>
              <span className="font-semibold">{displayAmount(selectedAmount)}</span>
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
            <button className="btn-outline" onClick={() => setStep(3)}>
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

      {step === "success" && product && selectedAmount && (
        <div className="py-2 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-atggreen-50 text-2xl text-atggreen-600">
            ✓
          </div>
          <h3 className="text-lg font-bold text-navy-900">Gift card ordered</h3>
          <p className="mt-1 text-sm text-navy-500">
            {displayAmount(selectedAmount)} {product.brandName} sent to {email}.
          </p>
          {orderId && (
            <p className="mt-1 text-xs text-navy-400">
              Order {orderId} — view the redeem code in{" "}
              <Link href="/digital-services" className="text-atgblue-600 underline">
                your order history
              </Link>
              .
            </p>
          )}
          <div className="mt-5 flex justify-center gap-2">
            <button className="btn-outline" onClick={reset}>
              Buy again
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
