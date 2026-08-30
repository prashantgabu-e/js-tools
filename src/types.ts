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
}

export interface SelectOption {
  value: string;
  label: string;
}
