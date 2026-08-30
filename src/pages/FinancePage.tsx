import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { CATEGORY_OPTIONS, FINANCE_SHORTCUTS, PAYMENT_OPTIONS, TRANSACTION_TYPE_OPTIONS } from "../constants";
import { formatLocalDateParts, formatLocalTimeParts } from "../utils/date";
import { buildSingleFinancePayload, submitFinancePayload } from "../utils/finance";
import type { FinancePayload } from "../types";

interface FinancePageProps {
  iframeName: string;
}

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

export function FinancePage({ iframeName }: FinancePageProps) {
  const [form, setForm] = useState<FinancePayload>(createInitialState);
  const [amountInput, setAmountInput] = useState("");
  const [feedback, setFeedback] = useState<{ message: string; type: "" | "success" | "error" }>({
    message: "",
    type: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setForm(createInitialState());
    setAmountInput("");
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
  }

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
        <div className="finance-heading">
          <h3>Add Transaction</h3>
          <p>Quick finance entry with one-tap presets</p>
        </div>

        <form className="finance-form" onSubmit={onSubmit} noValidate>
          <section className="finance-shortcuts" aria-labelledby="financeShortcutTitle">
            <div className="finance-shortcuts__header">
              <div>
                <p className="eyebrow" id="financeShortcutTitle">
                  Quick Fill
                </p>
                <h4>Preset shortcuts</h4>
              </div>
              <p>Fills everything except amount.</p>
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

          <label className="finance-field finance-field--amount">
            <span>Amount</span>
            <div className="finance-amount-wrap">
              <span className="finance-currency" aria-hidden="true">
                Rs
              </span>
              <input
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

          <fieldset className="finance-group">
            <legend>Category</legend>
            <div className="finance-category-grid">
              {CATEGORY_OPTIONS.map((option) => (
                <label key={option.value}>
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
              {PAYMENT_OPTIONS.map((option) => (
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
            <p className={`finance-feedback${feedback.type ? ` is-${feedback.type}` : ""}`} role="status" aria-live="polite">
              {feedback.message}
            </p>
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
