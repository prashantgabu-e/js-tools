import { FINANCE_API_URL, FINANCE_SUBMISSION_TIMEOUT_MS } from "../constants";
import type { FinancePayload, FinanceResponse } from "../types";

export function submitFinancePayload(
  payload: Record<string, string | number> | FinancePayload,
  iframeName: string
): Promise<FinanceResponse> {
  if (!FINANCE_API_URL || FINANCE_API_URL.includes("PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE")) {
    return Promise.reject(new Error("Finance API URL is not configured."));
  }

  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      reject(new Error("The save confirmation took too long. Please check the sheet before retrying."));
    }, FINANCE_SUBMISSION_TIMEOUT_MS);

    function onMessage(event: MessageEvent<FinanceResponse | string>) {
      let data = event.data;

      if (typeof data === "string") {
        try {
          data = JSON.parse(data) as FinanceResponse;
        } catch {
          return;
        }
      }

      if (!data || data.source !== "finance-apps-script") {
        return;
      }

      window.clearTimeout(timeoutId);
      window.removeEventListener("message", onMessage);
      resolve(data);
    }

    window.addEventListener("message", onMessage);

    const form = document.createElement("form");
    form.method = "POST";
    form.action = FINANCE_API_URL;
    form.target = iframeName;
    form.hidden = true;

    Object.entries(payload).forEach(([key, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = String(value ?? "");
      form.append(input);
    });

    document.body.append(form);
    form.submit();
    form.remove();
  });
}

export function buildSingleFinancePayload(payload: FinancePayload): FinancePayload {
  if (!payload.date) {
    throw new Error("Date is required.");
  }

  if (!payload.transactionType) {
    throw new Error("Transaction type is required.");
  }

  if (!payload.category) {
    throw new Error("Category is required.");
  }

  if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
    throw new Error("Amount must be greater than 0.");
  }

  return payload;
}
