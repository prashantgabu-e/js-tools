import { USD_TO_INR_RATE } from "../constants";
import type { SmsCategory, SmsRow } from "../types";

export function formatDate(value: string): string {
  if (!value) {
    return "-";
  }

  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function getMessageType(typeValue: string | null): string {
  const map: Record<string, string> = {
    "1": "Inbox",
    "2": "Sent",
    "3": "Draft",
    "4": "Outbox",
    "5": "Failed",
    "6": "Queued"
  };

  return map[String(typeValue ?? "")] || "Unknown";
}

function extractAmount(text: string): number | null {
  const match = text.match(
    /(?:rs\.?|inr|mrp|debited|credited|payment of|spent|sent|received)?\s*([0-9][0-9,]*\.?[0-9]{0,2})/i
  );
  if (!match) {
    return null;
  }

  const amount = Number.parseFloat(match[1].replaceAll(",", ""));
  return Number.isFinite(amount) ? amount : null;
}

function detectCurrency(text: string): "USD" | "INR" {
  return /(?:\busd\b|us\$|\$)/i.test(text) ? "USD" : "INR";
}

function isTransactionMessage(text: string): boolean {
  return /(debited|credited|txn|transaction|spent|received|payment|upi|a\/c|account|withdrawn|deposited|purchase|paid|bank|balance|transferred)/i.test(
    text
  );
}

function detectSmsCategory(text: string): SmsCategory {
  if (
    /(statement for|will be debited before|still spending|to be debited|your monthly salary now can be credited in this account)/i.test(
      text
    )
  ) {
    return "Other";
  }

  if (
    /(credited|credit of|cr\.?\s*rs\.?|received|deposited|deposit of|refund|reversed|cashback|salary credited|payment received)/i.test(
      text
    )
  ) {
    return "Credit";
  }

  if (/(txn\s*rs\.?|spent|debited|sent\s*rs\.?|successfully processed payment)/i.test(text)) {
    return "Debit";
  }

  return "Other";
}

function detectBank(address: string, body: string): string {
  const source = `${address} ${body}`.toLowerCase();
  const bankMatchers = [
    { name: "HDFC", pattern: /(hdfc|hdfcbk|hdfcbank)/i },
    { name: "ICICI", pattern: /(icici|icicib)/i },
    { name: "Kotak", pattern: /(kotak|ktkbank|kotakbk)/i },
    { name: "RBL", pattern: /(rbl|rblbank)/i },
    { name: "SBI", pattern: /(sbi|sbipsg|sbibnk|state bank)/i },
    { name: "Axis", pattern: /(axis|axisbk)/i },
    { name: "Punjab National Bank", pattern: /(pnb|punjab national)/i },
    { name: "Bank of Baroda", pattern: /(bob|bank of baroda)/i },
    { name: "Canara", pattern: /(canara)/i },
    { name: "IDFC First", pattern: /(idfc|firstbank)/i },
    { name: "Union Bank", pattern: /(union bank|unionbk)/i },
    { name: "IndusInd", pattern: /(indusind|indus)/i },
    { name: "Yes Bank", pattern: /(yes bank|yesbnk|yesbank)/i },
    { name: "AU Small Finance Bank", pattern: /(aubank|au bank|au small finance)/i },
    { name: "Federal Bank", pattern: /(federal bank|fedbank|federal)/i }
  ];

  return bankMatchers.find((bank) => bank.pattern.test(source))?.name ?? "Unknown";
}

function detectVendor(body: string): string {
  const patterns = [
    { vendor: "Amazon", pattern: /\bamazon\b/i },
    { vendor: "Zomato", pattern: /\bzomato\b/i },
    { vendor: "Swiggy", pattern: /\bswiggy\b/i },
    { vendor: "Blinkit", pattern: /\bblinkit\b/i },
    { vendor: "Zepto", pattern: /\bzepto\b/i },
    { vendor: "Uber", pattern: /\buber\b/i },
    { vendor: "Ola", pattern: /\bola\b/i },
    { vendor: "IRCTC", pattern: /\birctc\b/i },
    { vendor: "BookMyShow", pattern: /\bbookmyshow\b/i },
    { vendor: "Netflix", pattern: /\bnetflix\b/i },
    { vendor: "Spotify", pattern: /\bspotify\b/i },
    { vendor: "Jio", pattern: /\bjio\b/i },
    { vendor: "Airtel", pattern: /\bairtel\b/i },
    { vendor: "Vi", pattern: /\bvodafone\b|\bvi\b/i },
    { vendor: "Google Pay", pattern: /\bgpay\b|\bgoogle pay\b/i },
    { vendor: "PhonePe", pattern: /\bphonepe\b/i },
    { vendor: "Paytm", pattern: /\bpaytm\b/i },
    { vendor: "Myntra", pattern: /\bmyntra\b/i },
    { vendor: "Flipkart", pattern: /\bflipkart\b/i },
    { vendor: "Ajio", pattern: /\bajio\b/i },
    { vendor: "Nykaa", pattern: /\bnykaa\b/i },
    { vendor: "Apollo", pattern: /\bapollo\b/i },
    { vendor: "Flora Iris Hos And Comm C", pattern: /\bflora iris hos and comm c\b/i }
  ];

  const directMatch = patterns.find((item) => item.pattern.test(body));
  if (directMatch) {
    return directMatch.vendor;
  }

  const recurringMatch = body.match(/processed the payment of .*? for ([a-z0-9&.' -]+?),/i);
  if (recurringMatch) {
    return recurringMatch[1].trim();
  }

  const transferMatch = body.match(/transfer funds to ([a-z0-9&.' -]+?)\./i);
  if (transferMatch) {
    return transferMatch[1].trim();
  }

  return "Unknown";
}

function detectVendorCategory(body: string, vendor: string): string {
  const source = `${vendor} ${body}`.toLowerCase();
  const categoryMatchers = [
    { category: "Food", pattern: /\bzomato\b|\bswiggy\b/ },
    { category: "Groceries", pattern: /\bblinkit\b|\bzepto\b|\bbigbasket\b|\binstamart\b/ },
    { category: "Shopping", pattern: /\bamazon\b|\bflipkart\b|\bmyntra\b|\bajio\b|\bnykaa\b/ },
    { category: "Travel", pattern: /\buber\b|\bola\b|\birctc\b|\bmakemytrip\b|\byatra\b/ },
    { category: "Entertainment", pattern: /\bbookmyshow\b|\bnetflix\b|\bspotify\b|\bprime video\b/ },
    { category: "Recharge/Bills", pattern: /\bjio\b|\bairtel\b|\bvodafone\b|\belectricity\b|\bgas\b|\bbroadband\b/ },
    { category: "Healthcare", pattern: /\bhospital\b|\bhos\b|\bapollo\b|\bpharmacy\b|\bclinic\b/ },
    { category: "Finance", pattern: /\bemi\b|\bloan\b|\bcredit card\b|\bstatement\b|\bbill\b|\blimit\b|\bkyc\b|\baccount\b|\bupi\b|\bdebit card\b|\bnet banking\b/ },
    { category: "Transfer", pattern: /\btransfer funds to\b|\bpayee\b|\bimps\b|\bneft\b|\brtgs\b/ }
  ];

  return categoryMatchers.find((item) => item.pattern.test(source))?.category ?? "Other";
}

export function parseSmsNode(node: Element): SmsRow {
  const body = node.getAttribute("body") || "";
  const address = node.getAttribute("address") || "Unknown";
  const rawAmount = extractAmount(body);
  const currency = detectCurrency(body);
  const amount = rawAmount === null ? null : currency === "USD" ? rawAmount * USD_TO_INR_RATE : rawAmount;
  const vendor = detectVendor(body);

  return {
    date: node.getAttribute("date") || "",
    readableDate: formatDate(node.getAttribute("date") || ""),
    address,
    smsType: getMessageType(node.getAttribute("type")),
    body,
    amount,
    rawAmount,
    currency,
    transaction: isTransactionMessage(body),
    bank: detectBank(address, body),
    category: detectSmsCategory(body),
    vendor,
    vendorCategory: detectVendorCategory(body, vendor)
  };
}

export function parseXmlContent(xmlText: string): SmsRow[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");
  const parserError = xmlDoc.querySelector("parsererror");

  if (parserError) {
    throw new Error("Invalid XML file.");
  }

  const nodes = Array.from(xmlDoc.querySelectorAll("sms"));
  if (!nodes.length) {
    throw new Error("No <sms> entries were found in this XML file.");
  }

  return nodes.map(parseSmsNode);
}

export function getCounts(rows: SmsRow[], key: keyof SmsRow): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const value = String(row[key] || "Unknown");
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

export function getCategoryClassName(category: SmsCategory): string {
  if (category === "Debit") {
    return "category-text--debit";
  }

  if (category === "Credit") {
    return "category-text--credit";
  }

  return "category-text--other";
}
