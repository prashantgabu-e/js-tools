import type { AppView, FinanceShortcut, SelectOption } from "./types";

export const FINANCE_API_URL =
  "https://script.google.com/macros/s/AKfycbzUqzpxY73otsIi8SJzeo4d5Yusvgm2rTmHAn-bjDkguVl84ThBXRL8lBW661TNtunk/exec";

export const FINANCE_SUBMISSION_TIMEOUT_MS = 45_000;
export const USD_TO_INR_RATE = 95.2282;

export const PAGE_COPY: Record<
  AppView,
  { eyebrow: string; title: string; navLabel: string }
> = {
  "sms-analyzer": {
    eyebrow: "Your workspace",
    title: "SMS insights",
    navLabel: "Insights"
  },
  finance: {
    eyebrow: "Money workspace",
    title: "Add an expense",
    navLabel: "Add"
  },
  "bulk-finance": {
    eyebrow: "Money workspace",
    title: "Plan your entries",
    navLabel: "Plan"
  }
};

export const ROUTE_PATHS: Record<AppView, string> = {
  "sms-analyzer": "/sms-analyzer",
  finance: "/finance",
  "bulk-finance": "/bulk-finance"
};

export const ROUTE_HASHES: Record<AppView, string> = {
  "sms-analyzer": "#/sms-analyzer",
  finance: "#/finance",
  "bulk-finance": "#/bulk-finance"
};

export const FINANCE_SHORTCUTS: FinanceShortcut[] = [
  {
    label: "Food",
    transactionType: "Expense",
    category: "Food",
    paymentMode: "UPI",
    description: ""
  },
  {
    label: "Altroz CNG/Petrol",
    transactionType: "Expense",
    category: "Altroz CNG/Petrol",
    paymentMode: "Credit Card",
    description: ""
  },
  {
    label: "Guests/Friends",
    transactionType: "Expense",
    category: "Guests/Friends",
    paymentMode: "UPI",
    description: ""
  }
];

export const CATEGORY_OPTIONS: SelectOption[] = [
  { value: "Food", label: "Food" },
  { value: "Altroz CNG/Petrol", label: "Altroz CNG/Petrol" },
  { value: "Altroz", label: "Altroz" },
  { value: "Activa", label: "Activa" },
  { value: "Aviator", label: "Aviator" },
  { value: "Flora Iris Household", label: "Flora Iris Household" },
  { value: "Surendranagar Household", label: "Surendranagar Household" },
  { value: "Flora Iris Bills", label: "Flora Iris Bills" },
  { value: "EMIs", label: "EMIs" },
  { value: "Guests/Friends", label: "Guests/Friends" },
  { value: "Family", label: "Family" },
  { value: "Gift", label: "Gift" },
  { value: "Beauty", label: "Beauty" },
  { value: "Health", label: "Health" },
  { value: "Transport", label: "Transport" },
  { value: "Shopping", label: "Shopping" },
  { value: "Entertainment Fun", label: "Entertainment Fun" },
  { value: "Stationary Documents", label: "Stationary Documents" },
  { value: "Moira Nexus", label: "Moira Nexus" },
  { value: "Career", label: "Career" },
  { value: "Surendranagar Others", label: "Surendranagar Others" },
  { value: "Miscellaneous", label: "Miscellaneous" },
  { value: "Losses", label: "Losses" }
];

export const PAYMENT_OPTIONS: SelectOption[] = [
  { value: "UPI", label: "UPI" },
  { value: "Cash", label: "Cash" },
  { value: "Debit Card", label: "Debit Card" },
  { value: "Credit Card", label: "Credit Card" },
  { value: "Bank Transfer", label: "Bank Transfer" },
  { value: "Wallet", label: "Wallet" },
  { value: "Auto Debit", label: "Auto Debit" },
  { value: "Cheque", label: "Cheque" },
  { value: "Other", label: "Other" }
];

export const TRANSACTION_TYPE_OPTIONS: SelectOption[] = [
  { value: "Expense", label: "Expense" },
  { value: "Income", label: "Income" },
  { value: "Refund", label: "Refund" }
];
