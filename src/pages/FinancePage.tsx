import type { FormEvent } from "react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  CATEGORY_OPTIONS,
  DESCRIPTION_SHORTCUTS_BY_CATEGORY,
  FINANCE_SHORTCUTS,
  PAYMENT_OPTIONS,
  TRANSACTION_TYPE_OPTIONS
} from "../constants";
import { formatLocalDateParts, formatLocalTimeParts } from "../utils/date";
import { buildSingleFinancePayload, submitFinancePayload } from "../utils/finance";
import type { FinancePayload } from "../types";

interface FinancePageProps {
  iframeName: string;
}

const CATEGORY_USAGE_KEY = "moneyManage.categoryUsage";
const PAYMENT_USAGE_KEY = "moneyManage.paymentUsage";
const PRIMARY_PAYMENT_COUNT = 4;

function createInitialState(): FinancePayload {
  return {
    date: formatLocalDateParts(),
    time: formatLocalTimeParts(),
    transactionType: "Expense",
    category: "",
    amount: 0,
    description: "",
    paymentMode: "UPI",
    entrySource: "Website"
  };
}

function readUsage(key: string): Record<string, number> {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function formatCompactDateTime(dateValue: string, timeValue: string): string {
  const date = new Date(`${dateValue}T00:00:00`);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  let dateLabel = date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  if (date.toDateString() === today.toDateString()) dateLabel = "Today";
  if (date.toDateString() === tomorrow.toDateString()) dateLabel = "Tomorrow";
  if (date.toDateString() === yesterday.toDateString()) dateLabel = "Yesterday";

  const timeLabel = timeValue
    ? new Date(`${dateValue}T${timeValue}`).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : "No time";

  return `${dateLabel} · ${timeLabel}`;
}

export function FinancePage({ iframeName }: FinancePageProps) {
  const [form, setForm] = useState<FinancePayload>(createInitialState);
  const [amountInput, setAmountInput] = useState("");
  const [categoryUsage, setCategoryUsage] = useState<Record<string, number>>({});
  const [paymentUsage, setPaymentUsage] = useState<Record<string, number>>({});
  const [isDateTimeOpen, setIsDateTimeOpen] = useState(false);
  const [isMorePaymentsOpen, setIsMorePaymentsOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: "" | "success" | "error" }>({
    message: "",
    type: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(createInitialState());
    setAmountInput("");
    setCategoryUsage(readUsage(CATEGORY_USAGE_KEY));
    setPaymentUsage(readUsage(PAYMENT_USAGE_KEY));
    setFeedback({ message: "", type: "" });
  }, []);

  function updateField<K extends keyof FinancePayload>(key: K, value: FinancePayload[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function applyShortcut(label: string) {
    const preset = FINANCE_SHORTCUTS.find((item) => item.label === label);
    if (!preset) {
      return;
    }

    setForm((current) => ({
      ...createInitialState(),
      amount: 0,
      transactionType: preset.transactionType,
      category: preset.category,
      paymentMode: preset.paymentMode,
      description: preset.description,
      entrySource: current.entrySource
    }));
    setAmountInput("");
    setFeedback({
      message: `Shortcut applied: ${preset.label}. Enter the amount to save.`,
      type: "success"
    });
    // Keep focus inside the tap/click event so mobile browsers can open the numeric keyboard.
    amountInputRef.current?.focus();
  }

  function applyDescriptionShortcut(description: string) {
    updateField("description", description);
  }

  function recordUsage(category: string, paymentMode: string) {
    setCategoryUsage((current) => {
      const next = { ...current, [category]: (current[category] ?? 0) + 1 };
      window.localStorage.setItem(CATEGORY_USAGE_KEY, JSON.stringify(next));
      return next;
    });
    setPaymentUsage((current) => {
      const next = { ...current, [paymentMode]: (current[paymentMode] ?? 0) + 1 };
      window.localStorage.setItem(PAYMENT_USAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  const sortedCategories = useMemo(
    () =>
      [...CATEGORY_OPTIONS].sort((a, b) => {
        return (categoryUsage[b.value] ?? 0) - (categoryUsage[a.value] ?? 0);
      }),
    [categoryUsage]
  );

  const sortedPayments = useMemo(
    () =>
      [...PAYMENT_OPTIONS].sort((a, b) => {
        return (paymentUsage[b.value] ?? 0) - (paymentUsage[a.value] ?? 0);
      }),
    [paymentUsage]
  );

  const primaryPayments = sortedPayments.slice(0, PRIMARY_PAYMENT_COUNT);
  const secondaryPayments = sortedPayments.slice(PRIMARY_PAYMENT_COUNT);
  const descriptionShortcuts = form.category ? DESCRIPTION_SHORTCUTS_BY_CATEGORY[form.category] ?? [] : [];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback({ message: "", type: "" });

    try {
      const payload = buildSingleFinancePayload({
        ...form,
        amount: Number(amountInput)
      });

      setIsSubmitting(true);
      const response = await submitFinancePayload(payload, iframeName);
      if (!response?.success) {
        throw new Error(response?.message || "Unable to add transaction. Please try again.");
      }

      recordUsage(payload.category, payload.paymentMode);
      setFeedback({ message: "Transaction added successfully", type: "success" });
      setForm(createInitialState());
      setAmountInput("");
    } catch (error) {
      setFeedback({
        message: error instanceof Error ? error.message : "Unable to add transaction. Please try again.",
        type: "error"
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="page-view finance-page page-view--active">
      <section className="panel finance-panel">
        <form className="finance-form" onSubmit={onSubmit} noValidate>
          <label className="finance-field finance-field--amount">
            <span>Amount</span>
            <div className="finance-amount-wrap">
              <span className="finance-currency" aria-hidden="true">
                Rs
              </span>
              <input
                ref={amountInputRef}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                required
                value={amountInput}
                onChange={(event) => setAmountInput(event.target.value)}
              />
            </div>
          </label>

          <section className="finance-shortcuts" aria-labelledby="financeShortcutTitle">
            <div className="finance-shortcuts__header">
              <p className="eyebrow" id="financeShortcutTitle">
                Quick Fill
              </p>
            </div>
            <div className="finance-shortcut-grid">
              {FINANCE_SHORTCUTS.map((shortcut) => (
                <button
                  key={shortcut.label}
                  type="button"
                  className="finance-shortcut-btn"
                  onClick={() => applyShortcut(shortcut.label)}
                >
                  <span className="finance-shortcut-btn__title">{shortcut.label}</span>
                  <span className="finance-shortcut-btn__meta">
                    {shortcut.category} · {shortcut.paymentMode}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="finance-datetime">
            <span>{formatCompactDateTime(form.date, form.time)}</span>
            <button type="button" onClick={() => setIsDateTimeOpen((current) => !current)}>
              Change
            </button>
          </section>

          {isDateTimeOpen ? (
            <div className="finance-row finance-row--two">
              <label className="finance-field">
                <span>Date</span>
                <input type="date" required value={form.date} onChange={(event) => updateField("date", event.target.value)} />
              </label>

              <label className="finance-field">
                <span>Time</span>
                <input type="time" value={form.time} onChange={(event) => updateField("time", event.target.value)} />
              </label>
            </div>
          ) : null}

          <fieldset className="finance-group">
            <legend>Category</legend>
            <div className="finance-category-grid">
              {sortedCategories.map((option) => (
                <Fragment key={option.value}>
                  <label>
                    <input
                      className="finance-chip-input"
                      type="radio"
                      name="category"
                      value={option.value}
                      checked={form.category === option.value}
                      onChange={(event) => updateField("category", event.target.value)}
                    />
                    <span className={`finance-chip finance-chip--category ${getFinanceCategoryClass(option.value)}`}>{option.label}</span>
                  </label>
                  {form.category === option.value && descriptionShortcuts.length > 0 ? (
                    <div className="finance-description-shortcuts" aria-label={`${form.category} description shortcuts`}>
                      {descriptionShortcuts.map((description) => (
                        <button
                          key={description}
                          type="button"
                          className={`finance-description-pill${form.description === description ? " is-active" : ""}`}
                          onClick={() => applyDescriptionShortcut(description)}
                        >
                          {description}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </Fragment>
              ))}
            </div>
          </fieldset>

          <label className="finance-field">
            <span>Description</span>
            <input
              type="text"
              maxLength={160}
              placeholder="Description (optional)"
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
            />
          </label>

          <fieldset className="finance-group">
            <legend>Payment</legend>
            <div className="finance-chip-row finance-chip-row--payment">
              {primaryPayments.map((option) => (
                <label key={option.value}>
                  <input
                    className="finance-chip-input"
                    type="radio"
                    name="paymentMode"
                    value={option.value}
                    checked={form.paymentMode === option.value}
                    onChange={(event) => updateField("paymentMode", event.target.value)}
                  />
                  <span className="finance-chip">{option.label}</span>
                </label>
              ))}
            </div>
            {secondaryPayments.length > 0 ? (
              <div className="finance-payment-more">
                <button type="button" onClick={() => setIsMorePaymentsOpen((current) => !current)}>
                  {isMorePaymentsOpen ? "Hide" : "More"} payment methods
                </button>
                {isMorePaymentsOpen ? (
                  <div className="finance-chip-row finance-chip-row--payment">
                    {secondaryPayments.map((option) => (
                      <label key={option.value}>
                        <input
                          className="finance-chip-input"
                          type="radio"
                          name="paymentMode"
                          value={option.value}
                          checked={form.paymentMode === option.value}
                          onChange={(event) => updateField("paymentMode", event.target.value)}
                        />
                        <span className="finance-chip">{option.label}</span>
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </fieldset>

          <fieldset className="finance-group">
            <legend>Transaction</legend>
            <div className="finance-chip-row">
              {TRANSACTION_TYPE_OPTIONS.map((option) => (
                <label key={option.value}>
                  <input
                    className="finance-chip-input"
                    type="radio"
                    name="transactionType"
                    value={option.value}
                    checked={form.transactionType === option.value}
                    onChange={(event) => updateField("transactionType", event.target.value)}
                  />
                  <span className="finance-chip finance-chip--choice">{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="finance-submit-bar">
            {feedback.message ? (
              <div className={`finance-feedback${feedback.type ? ` is-${feedback.type}` : ""}`} role="status" aria-live="polite">
                <p>{feedback.message}</p>
                <button type="button" className="finance-feedback__clear" onClick={() => setFeedback({ message: "", type: "" })} aria-label="Clear message">
                  <X className="icon" aria-hidden="true" />
                </button>
              </div>
            ) : null}
            <button className="finance-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Transaction"}
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}

function getFinanceCategoryClass(value: string): string {
  if (["Food"].includes(value)) return "finance-chip--category-food";
  if (["Altroz CNG/Petrol", "Altroz", "Activa", "Aviator"].includes(value)) return "finance-chip--category-fuel";
  if (["Flora Iris Household", "Surendranagar Household"].includes(value)) return "finance-chip--category-home";
  if (["Flora Iris Bills", "EMIs"].includes(value)) return "finance-chip--category-bills";
  if (["Guests/Friends", "Family", "Gift"].includes(value)) return "finance-chip--category-social";
  if (["Beauty"].includes(value)) return "finance-chip--category-personal";
  if (["Health"].includes(value)) return "finance-chip--category-health";
  if (["Transport"].includes(value)) return "finance-chip--category-travel";
  if (["Shopping"].includes(value)) return "finance-chip--category-shopping";
  if (["Entertainment Fun"].includes(value)) return "finance-chip--category-fun";
  if (["Stationary Documents", "Moira Nexus", "Career"].includes(value)) return "finance-chip--category-work";
  if (["Losses"].includes(value)) return "finance-chip--category-alert";
  return "finance-chip--category-neutral";
}
