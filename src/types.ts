export type AppView = "sms-analyzer" | "finance" | "bulk-finance";

export type SmsCategory = "Debit" | "Credit" | "Other";

export interface SmsRow {
  date: string;
  readableDate: string;
  address: string;
  smsType: string;
  body: string;
  amount: number | null;
  rawAmount: number | null;
  currency: "USD" | "INR";
  transaction: boolean;
  bank: string;
  category: SmsCategory;
  vendor: string;
  vendorCategory: string;
}

export interface FinancePayload {
  date: string;
  time: string;
  transactionType: string;
  category: string;
  amount: number;
  description: string;
  paymentMode: string;
  entrySource: "Website";
}

export type FinanceJobKind = "single" | "bulk";
export type FinanceJobStatus = "queued" | "running" | "completed" | "failed";

export interface FinanceJob {
  id: string;
  kind: FinanceJobKind;
  data: FinancePayload | FinancePayload[];
  status: FinanceJobStatus;
  createdAt: string;
  error?: string;
}

export interface FinanceResponse {
  success?: boolean;
  message?: string;
  source?: string;
}

export interface FinanceShortcut {
  label: string;
  transactionType: string;
  category: string;
  paymentMode: string;
  description: string;
  amount?: number;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface AuthUser {
  email: string;
  name: string;
  picture: string;
  exp: number;
}
