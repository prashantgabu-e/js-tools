import type { FormEvent } from "react";
import { useState } from "react";
import { AmountCalculator } from "../components/AmountCalculator";
import { JobQueue } from "../components/JobQueue";
import { CATEGORY_OPTIONS, FINANCE_SHORTCUTS, PAYMENT_OPTIONS, TRANSACTION_TYPE_OPTIONS } from "../constants";
import { useJobQueue } from "../contexts/JobQueueContext";
import { formatLocalDateParts, formatLocalTimeParts } from "../utils/date";
import type { FinanceJob, FinancePayload } from "../types";

interface BulkRow {
  id: string;
  date: string;
  time: string;
  transactionType: string;
  category: string;
  amount: string;
  description: string;
  paymentMode: string;
}

const BULK_RUNNABLE_SHORTCUTS = FINANCE_SHORTCUTS.filter((shortcut) => typeof shortcut.amount === "number" && shortcut.amount > 0);

function createRow(): BulkRow {
  return {
    id: crypto.randomUUID(),
    date: formatLocalDateParts(),
    time: formatLocalTimeParts(),
    transactionType: "Expense",
    category: "",
    amount: "",
    description: "",
    paymentMode: "UPI"
  };
}

export function BulkFinancePage() {
  const { jobs, queueBulk } = useJobQueue();
  const [rows, setRows] = useState<BulkRow[]>([createRow()]);
  const [selectedShortcuts, setSelectedShortcuts] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ message: string; type: "" | "success" | "error" }>({
    message: "",
    type: ""
  });

  function updateRow(id: string, key: keyof BulkRow, value: string) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  }

  function addRow() {
    setRows((current) => [...current, createRow()]);
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
    setFeedback({ message: "", type: "" });
  }

  function toggleShortcut(label: string) {
    setSelectedShortcuts((current) => (current.includes(label) ? current.filter((selected) => selected !== label) : [...current, label]));
  }

  function runSelectedShortcuts() {
    const shortcuts = BULK_RUNNABLE_SHORTCUTS.filter((shortcut) => selectedShortcuts.includes(shortcut.label));
    if (!shortcuts.length) return;

    const shortcutRows = shortcuts.map((shortcut) => ({
      ...createRow(),
      transactionType: shortcut.transactionType,
      category: shortcut.category,
      amount: shortcut.amount ? String(shortcut.amount) : "",
      description: shortcut.description,
      paymentMode: shortcut.paymentMode
    }));

    setRows((current) => {
      const hasOnlyBlankRow = current.length === 1 && !current[0].category && !current[0].amount && !current[0].description;
      return hasOnlyBlankRow ? shortcutRows : [...current, ...shortcutRows];
    });
    setSelectedShortcuts([]);
    setFeedback({ message: `${shortcutRows.length} quick fill${shortcutRows.length === 1 ? "" : "s"} added to the table.`, type: "success" });
  }

  function getTransactions(): FinancePayload[] {
    if (!rows.length) {
      throw new Error("Add at least one transaction.");
    }

    return rows.map((row, index) => {
      const amount = Number(row.amount);
      const transaction = {
        date: row.date.trim(),
        time: row.time.trim(),
        transactionType: row.transactionType.trim(),
        category: row.category.trim(),
        amount,
        description: row.description.trim(),
        paymentMode: row.paymentMode.trim(),
        entrySource: "Website" as const
      };

      if (!transaction.date || !transaction.transactionType || !transaction.category || !row.amount.trim() || !Number.isFinite(amount) || amount <= 0) {
        throw new Error(`Row ${index + 1}: enter a date, type, category, and amount greater than 0.`);
      }

      return transaction;
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback({ message: "", type: "" });

    try {
      const transactions = getTransactions();
      queueBulk(transactions);
      setRows([createRow()]);
      setFeedback({
        message: `${transactions.length} transaction${transactions.length === 1 ? "" : "s"} queued for saving.`,
        type: "success"
      });
    } catch (error) {
      setFeedback({
        message: error instanceof Error ? error.message : "Unable to add transactions. Please try again.",
        type: "error"
      });
    }
  }

  function applyJob(job: FinanceJob) {
    if (!Array.isArray(job.data)) return;
    setRows(
      job.data.map(({ amount, entrySource: _entrySource, ...transaction }) => ({
        ...transaction,
        id: crypto.randomUUID(),
        amount: String(amount)
      }))
    );
    setFeedback({ message: "Job data applied to the table.", type: "success" });
  }

  return (
    <section className="page-view finance-page page-view--active">
      <section className="panel bulk-finance-panel">
        <JobQueue jobs={jobs} kind="bulk" onApply={applyJob} />
        <section className="bulk-quick-fills" aria-labelledby="bulkQuickFillTitle">
          <div className="bulk-quick-fills__header">
            <div>
              <p className="eyebrow" id="bulkQuickFillTitle">Quick fill runner</p>
              <p>Select one or more shortcuts, then add them to the table.</p>
            </div>
            <button className="bulk-run-shortcuts-btn" type="button" onClick={runSelectedShortcuts} disabled={!selectedShortcuts.length}>
              Run selected{selectedShortcuts.length ? ` (${selectedShortcuts.length})` : ""}
            </button>
          </div>
          <div className="bulk-quick-fills__options">
            {BULK_RUNNABLE_SHORTCUTS.map((shortcut) => (
              <label key={shortcut.label} className="bulk-quick-fills__option">
                <input type="checkbox" checked={selectedShortcuts.includes(shortcut.label)} onChange={() => toggleShortcut(shortcut.label)} />
                <span>{shortcut.label}</span>
              </label>
            ))}
          </div>
        </section>

        <div className="finance-heading bulk-finance-heading">
          <div>
            <h3>Bulk Add Transactions</h3>
            <p>Add several transactions, then save them together.</p>
          </div>
          <button className="bulk-add-row-btn" type="button" onClick={addRow}>
            Add row
          </button>
        </div>

        <form onSubmit={onSubmit} noValidate>
          <div className="bulk-table-wrap">
            <table className="bulk-finance-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Time</th>
                  <th scope="col">Type</th>
                  <th scope="col">Category</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Description</th>
                  <th scope="col">Payment</th>
                  <th scope="col">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Date">
                      <input className="bulk-field" type="date" value={row.date} onChange={(event) => updateRow(row.id, "date", event.target.value)} />
                    </td>
                    <td data-label="Time">
                      <input className="bulk-field" type="time" value={row.time} onChange={(event) => updateRow(row.id, "time", event.target.value)} />
                    </td>
                    <td data-label="Type">
                      <select className="bulk-field" value={row.transactionType} onChange={(event) => updateRow(row.id, "transactionType", event.target.value)}>
                        <option value="">Select type</option>
                        {TRANSACTION_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td data-label="Category">
                      <select className="bulk-field" value={row.category} onChange={(event) => updateRow(row.id, "category", event.target.value)}>
                        <option value="">Select category</option>
                        {CATEGORY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td data-label="Amount">
                      <div className="bulk-amount-wrap">
                        <input
                          className="bulk-field bulk-field--amount"
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          value={row.amount}
                          placeholder="0.00"
                          onChange={(event) => updateRow(row.id, "amount", event.target.value)}
                        />
                        <AmountCalculator
                          value={row.amount}
                          onApply={(amount) => updateRow(row.id, "amount", amount)}
                          buttonClassName="amount-calculator-trigger amount-calculator-trigger--bulk"
                        />
                      </div>
                    </td>
                    <td data-label="Description">
                      <input
                        className="bulk-field"
                        type="text"
                        maxLength={160}
                        value={row.description}
                        placeholder="Optional"
                        onChange={(event) => updateRow(row.id, "description", event.target.value)}
                      />
                    </td>
                    <td data-label="Payment">
                      <select className="bulk-field" value={row.paymentMode} onChange={(event) => updateRow(row.id, "paymentMode", event.target.value)}>
                        <option value="">Select payment</option>
                        {PAYMENT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td data-label="Remove">
                      <button className="bulk-remove-row-btn" type="button" onClick={() => removeRow(row.id)} aria-label="Remove transaction row" title="Remove row">
                        x
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="finance-submit-bar bulk-submit-bar">
            <p className={`finance-feedback${feedback.type ? ` is-${feedback.type}` : ""}`} role="status" aria-live="polite">
              {feedback.message}
            </p>
            <button className="finance-submit" type="submit">Save all transactions</button>
          </div>
        </form>
      </section>
    </section>
  );
}
