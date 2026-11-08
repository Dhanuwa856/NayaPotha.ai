import { api } from "./api";
import { shopAndCustomerApi, CustomerItem } from "./customerService";

export interface ParsedVoiceDraft {
  transcript: string;
  language: "si" | "en";
  intent: "CREDIT_SALE" | "PAYMENT";
  extractedCustomerQuery: string;
  amountMinor: number;
  matchingCustomers: CustomerItem[];
}

export interface RiskEstimateDetail {
  customer_id: string;
  category: "LOW" | "MEDIUM" | "HIGH" | "INSUFFICIENT_HISTORY";
  overdue_days: number;
  overdue_balance_minor: number;
  recent_payment_minor: number;
  recent_payment_date?: string | null;
  limit_usage_percent: number;
  credit_limit_minor?: number | null;
  reasons: string[];
}

export const voiceAndRiskApi = {
  // Parse spoken or typed Sinhala/English command and match against real shop customers
  parseVoiceCommand: async (
    transcript: string,
    language: "si" | "en"
  ): Promise<ParsedVoiceDraft> => {
    const cleanText = transcript.trim();

    // 1. Extract amount (supports "2,000", "2000", "රු. 2000", "Rs. 1500")
    const numMatch = cleanText.replace(/,/g, "").match(/(\d+(?:\.\d{1,2})?)/);
    const amountLkr = numMatch ? parseFloat(numMatch[1]) : 2000;
    const amountMinor = Math.round(amountLkr * 100);

    // 2. Detect intent (Credit vs Payment)
    const lower = cleanText.toLowerCase();
    const isPayment =
      lower.includes("ගෙව්වා") ||
      lower.includes("ගෙවීම") ||
      lower.includes("ලැබුණා") ||
      lower.includes("paid") ||
      lower.includes("payment") ||
      lower.includes("received");
    const intent: "CREDIT_SALE" | "PAYMENT" = isPayment
      ? "PAYMENT"
      : "CREDIT_SALE";

    // 3. Fetch active customers from DB and find matches by name or nickname
    const custRes = await shopAndCustomerApi.listCustomers({
      status: "ACTIVE",
      limit: 100,
    });
    const allCustomers = custRes.items || [];

    // Check if any customer's name or nickname appears in the transcript
    let matched = allCustomers.filter((c) => {
      const baseName = c.name.trim().toLowerCase();
      const firstWord = baseName.split(/\s+/)[0];
      const nick = (c.nickname || "").trim().toLowerCase();
      return (
        (firstWord && lower.includes(firstWord)) ||
        (baseName && lower.includes(baseName)) ||
        (nick && lower.includes(nick))
      );
    });

    // If no direct substring match, return all active customers so the owner can choose explicitly
    if (matched.length === 0) {
      matched = allCustomers;
    }

    return {
      transcript: cleanText,
      language,
      intent,
      extractedCustomerQuery: matched[0]?.name || "",
      amountMinor,
      matchingCustomers: matched,
    };
  },

  // Fetch AI Risk Estimate for a customer
  getCustomerRiskDetail: async (
    customerId: string
  ): Promise<RiskEstimateDetail> => {
    const cust = await shopAndCustomerApi.getCustomer(customerId);
    const outMinor = cust.balance_summary?.outstanding_balance_minor || 0;
    const overdueMinor = cust.balance_summary?.overdue_balance_minor || 0;
    const limitMinor = cust.credit_limit_minor || null;

    const usagePercent =
      limitMinor && limitMinor > 0
        ? Math.min(100, (outMinor / limitMinor) * 100)
        : 0;

    // Fetch recent statement to find latest payment & overdue days
    let recentPaymentMinor = 0;
    let recentPaymentDate: string | null = null;
    let overdueDays = 0;

    try {
      const stRes = await api.get(`/customers/${customerId}/statement`, {
        params: { limit: 20 },
      });
      const items = stRes.data?.items || [];
      const latestPay = items.find(
        (i: any) => i.type === "PAYMENT" && i.status === "POSTED"
      );
      if (latestPay) {
        recentPaymentMinor = latestPay.amount_minor || 0;
        recentPaymentDate = latestPay.occurred_at;
      }

      const oldestOverdue = items.find(
        (i: any) =>
          i.type === "CREDIT_SALE" &&
          i.status === "POSTED" &&
          (i.remaining_unpaid_minor || 0) > 0 &&
          i.due_date &&
          new Date(i.due_date) < new Date()
      );
      if (oldestOverdue?.due_date) {
        const diffMs =
          new Date().getTime() - new Date(oldestOverdue.due_date).getTime();
        overdueDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      } else if (overdueMinor > 0) {
        overdueDays = 7;
      }
    } catch {
      // Ignore statement fetch error
    }

    // Try backend AI risk endpoint first
    let category: RiskEstimateDetail["category"] = "LOW";
    let reasons: string[] = [];
    try {
      const riskRes = await api.get(`/risk/customers/${customerId}/latest`);
      if (riskRes.data?.category) {
        category = riskRes.data.category;
        reasons = riskRes.data.reasons || [];
      }
    } catch {
      // Compute rule-based fallback
      if (overdueMinor > 0 && usagePercent >= 85) {
        category = "HIGH";
      } else if (overdueMinor > 0 || usagePercent >= 60) {
        category = "MEDIUM";
      } else if (
        (cust.balance_summary?.total_credit_minor || 0) === 0 &&
        (cust.balance_summary?.total_paid_minor || 0) === 0
      ) {
        category = "INSUFFICIENT_HISTORY";
      } else {
        category = "LOW";
      }
    }

    return {
      customer_id: customerId,
      category,
      overdue_days: overdueDays,
      overdue_balance_minor: overdueMinor,
      recent_payment_minor: recentPaymentMinor,
      recent_payment_date: recentPaymentDate,
      limit_usage_percent: usagePercent,
      credit_limit_minor: limitMinor,
      reasons,
    };
  },
};