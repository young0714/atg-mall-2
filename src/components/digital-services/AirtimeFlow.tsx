"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AIRTIME_COUNTRIES, type AirtimeCountry } from "@/lib/constants";
import { formatMoney } from "@/lib/money";
import type { Currency } from "@prisma/client";
import type { AirtimeOperator } from "@/lib/services/reloadlyService";
import { purchaseAirtimeAction, previewAirtimeChargeAction, type WalletChargePreview } from "@/app/digital-services/airtime/actions";

// Only offer "local amount" pricing when the operator's own local currency
// is one ATG models as a first-class Currency (today: Nigeria/Gambia's
// operators). Every other country's operators fall back to USD ("Reloadly's
// international amount) — see digitalServiceOrderService.ts for why this
// can't just be inferred from the destination country.
const SUPPORTED_LOCAL_CURRENCIES: Currency[] = ["NGN", "GMD", "USD", "EUR", "GBP", "CNY"];

type Step = 1 | 2 | 3 | "confirm" | "success";

export function AirtimeFlow() {
  const [step, setStep] = useState<Step>(1);

  const [countryQuery, setCountryQuery] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [country, setCountry] = useState<AirtimeCountry>(AIRTIME_COUNTRIES[0]);

  const [operators, setOperators] = useState<AirtimeOperator[] | null>(null);
  const [operatorsLoading, setOperatorsLoading] = useState(false);
  const [operator, setOperator] = useState<AirtimeOperator | null>(null);

  const [customAmount, setCustomAmount] = useState("");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  const [phone, setPhone] = useState("");

  const [preview, setPreview] = useState<WalletChargePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setOperatorsLoading(true);
    setOperators(null);
    setOperator(null);
    setSelectedAmount(null);
    setCustomAmount("");
    fetch(`/api/v1/digital-services/operators?country=${country.isoCode}`)
      .then((r) => r.json())
      .then((body) => {
        if (!cancelled) setOperators(Array.isArray(body?.data) ? body.data : []);
      })
      .catch(() => {
        if (!cancelled) setOperators([]);
      })
      .finally(() => {
        if (!cancelled) setOperatorsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [country]);

  const useLocal =
    !!operator?.localCurrencyCode &&
    SUPPORTED_LOCAL_CURRENCIES.includes(operator.localCurrencyCode as Currency) &&
    !!(operator.localFixedAmounts?.length || (operator.localMinAmount && operator.localMaxAmount));
  const chargeCurrency: Currency = useLocal ? (operator!.localCurrencyCode as Currency) : "USD";
  const fixedAmounts = useLocal ? operator?.localFixedAmounts : operator?.internationalFixedAmounts;
  const minAmount = useLocal ? operator?.localMinAmount : operator?.internationalMinAmount;
  const maxAmount = useLocal ? operator?.localMaxAmount : operator?.internationalMaxAmount;

  const filteredCountries = countryQuery.trim()
    ? AIRTIME_COUNTRIES.filter((c) => c.name.toLowerCase().includes(countryQuery.trim().toLowerCase()))
    : AIRTIME_COUNTRIES;

  function selectCountry(c: AirtimeCountry) {
    setCountry(c);
    setCountryOpen(false);
    setCountryQuery("");
  }

  function displayAmount(v: number) {
    return chargeCurrency === "USD" && !useLocal ? `$${v.toFixed(2)}` : formatMoney(Math.round(v * 100), chargeCurrency);
  }

  async function goToConfirm() {
    if (!operator || !selectedAmount) return;
    setPreviewLoading(true);
    setErrorMsg(null);
    try {
      const p = await previewAirtimeChargeAction({ amount: selectedAmount, chargeCurrency });
      setPreview(p);
      setStep("confirm");
    } catch {
      setErrorMsg("Could not check your wallet balance. Please try again.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function confirmAndPay() {
    if (!operator || !selectedAmount) return;
    setSubmitting(true);
    setErrorMsg(null);
    const result = await purchaseAirtimeAction({
      countryIso: country.isoCode,
      operatorId: operator.operatorId,
      operatorName: operator.name,
      recipientPhone: phone,
      useLocalAmount: useLocal,
      amount: selectedAmount,
      chargeCurrency,
    });
    setSubmitting(false);
    if (result.ok) {
      setOrderId(result.orderId ?? null);
      setStep("success");
    } else {
      setErrorMsg(result.error ?? "The top-up could not be completed.");
    }
  }

  function reset() {
    setStep(1);
    setOperator(null);
    setSelectedAmount(null);
    setCustomAmount("");
    setPhone("");
    setPreview(null);
    setErrorMsg(null);
    setOrderId(null);
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
            <p className="label mb-2">Network</p>
            {operatorsLoading ? (
              <p className="text-sm text-navy-400">Loading networks…</p>
            ) : !operators || operators.length === 0 ? (
              <p className="text-sm text-navy-400">No networks available for {country.name} right now.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {operators.map((op) => (
                  <button
                    type="button"
                    key={op.operatorId}
                    onClick={() => setOperator(op)}
                    className={`rounded-lg border px-3 py-2.5 text-center text-sm font-medium ${
                      operator?.operatorId === op.operatorId
                        ? "border-atgblue-500 bg-atgblue-50 text-atgblue-700"
                        : "border-navy-100 text-navy-600 hover:border-atgblue-300"
                    }`}
                  >
                    {op.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="btn-primary w-full" disabled={!operator} onClick={() => setStep(2)}>
            Continue
          </button>
        </>
      )}

      {step === 2 && operator && (
        <>
          <p className="text-sm text-navy-500">
            {operator.name} · {country.name}
          </p>

          {fixedAmounts && fixedAmounts.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {fixedAmounts.map((v) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => {
                    setSelectedAmount(v);
                    setCustomAmount("");
                  }}
                  className={`rounded-lg border px-3 py-2.5 text-center text-sm font-semibold ${
                    selectedAmount === v
                      ? "border-atgblue-500 bg-atgblue-50 text-atgblue-700"
                      : "border-navy-100 text-navy-600 hover:border-atgblue-300"
                  }`}
                >
                  {displayAmount(v)}
                </button>
              ))}
            </div>
          ) : (
            <div>
              <p className="label mb-2">
                Amount ({chargeCurrency}
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
            <p className="label mb-2">Recipient phone number</p>
            <input
              className="input"
              placeholder="0803 000 0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-navy-400">We&apos;ll deliver instantly to this number via Reloadly.</p>
          </div>
          {errorMsg && <p className="text-sm font-medium text-red-600">{errorMsg}</p>}
          <div className="flex gap-2">
            <button className="btn-outline" onClick={() => setStep(2)}>
              Back
            </button>
            <button
              className="btn-primary flex-1"
              disabled={phone.trim().length < 5 || previewLoading}
              onClick={goToConfirm}
            >
              {previewLoading ? "Checking wallet…" : "Review order"}
            </button>
          </div>
        </>
      )}

      {step === "confirm" && operator && selectedAmount && preview && (
        <>
          <div className="space-y-1 rounded-xl2 bg-sand-100 p-4 text-sm">
            <div className="flex justify-between py-1.5">
              <span className="text-navy-500">Network</span>
              <span className="font-semibold">
                {operator.name} ({country.name})
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-navy-500">Recipient</span>
              <span className="font-semibold">{phone}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-navy-500">Amount</span>
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
            <button className="btn-primary flex-1" disabled={submitting} onClick={confirmAndPay}>
              {submitting ? "Processing…" : "Confirm & Pay"}
            </button>
          </div>
        </>
      )}

      {step === "success" && operator && selectedAmount && (
        <div className="py-2 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-atggreen-50 text-2xl text-atggreen-600">
            ✓
          </div>
          <h3 className="text-lg font-bold text-navy-900">Top-up delivered</h3>
          <p className="mt-1 text-sm text-navy-500">
            {displayAmount(selectedAmount)} {operator.name} airtime sent to {phone}.
          </p>
          {orderId && <p className="mt-1 text-xs text-navy-400">Order {orderId}</p>}
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
