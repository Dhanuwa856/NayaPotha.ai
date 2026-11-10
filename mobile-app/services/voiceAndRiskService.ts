import { api } from "./api";
import { shopAndCustomerApi, CustomerItem } from "./customerService";

export interface ParsedVoiceDraft {
  transcript: string;
  language: "si" | "en";
  intent: "CREDIT_SALE" | "PAYMENT";
  extractedCustomerQuery: string;
  amountMinor: number;
  matchingCustomers: CustomerItem[];
  isExactMatch: boolean;
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

// සිංහල වචන වලින් කියන මුදල් අගයන් ඉලක්කම් බවට හැරවීමේ උපකාරකය
const SINHALA_NUMBER_WORDS: Record<string, number> = {
  සීය: 100,
  සියය: 100,
  දෙසීය: 200,
  තුන්සීය: 300,
  හතරසීය: 400,
  පන්සීය: 500,
  පන්සිය: 500,
  දාහ: 1000,
  දහස: 1000,
  එක්දහස්: 1000,
  දෙදාහ: 2000,
  දෙදහස: 2000,
  තුන්දාහ: 3000,
  හතරදාහ: 4000,
  පන්දාහ: 5000,
  දසදහස: 10000,
};

function extractAmountFromText(text: string): number {
  // 1. ඉලක්කම් තිබේදැයි බැලීම (උදා: "2,000", "2000", "1500.50")
  const cleaned = text.replace(/,/g, "");
  const regex = /(?:රු\.?|රුපියල්|rs\.?|lkr)?\s*(\d+(?:\.\d{1,2})?)/i;
  const match = cleaned.match(regex);
  if (match && match[1]) {
    const val = parseFloat(match[1]);
    if (val > 0) return Math.round(val * 100);
  }

  // 2. සිංහල වචන වලින් ගණන කියා ඇත්නම් (උදා: "දෙදාහක")
  for (const [word, amount] of Object.entries(SINHALA_NUMBER_WORDS)) {
    if (text.includes(word)) {
      return amount * 100;
    }
  }

  return 0;
}

function extractIntentFromText(text: string): "CREDIT_SALE" | "PAYMENT" {
  const lower = text.toLowerCase();
  const paymentKeywords = [
    "ගෙව්වා",
    "ගෙවීම",
    "ගෙවනවා",
    "ලැබුණා",
    "දුන්නා",
    "ආවා",
    "paid",
    "payment",
    "received",
    "pay",
  ];
  for (const kw of paymentKeywords) {
    if (lower.includes(kw)) return "PAYMENT";
  }
  return "CREDIT_SALE";
}

// සිංහල විභක්ති ප්‍රත්‍ය (-ට, -ගෙන්, -ගේ) ඉවත් කර පාරිභෝගික නම සෙවීම
function normalizeSinhalaNameToken(token: string): string {
  return token
    .replace(/(ගෙන්|ගේ|ට|ගෙ|ව|ත්)$/u, "")
    .replace(/['".,!?]/g, "")
    .trim()
    .toLowerCase();
}

export const voiceAndRiskApi = {
  // 1. Audio File එක Backend එකට යවා Text කරගැනීම
  uploadAudioForTranscription: async (
    audioUri: string,
    language: "si" | "en"
  ): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("file", {
        uri: audioUri,
        type: "audio/m4a",
        name: `voice_${Date.now()}.m4a`,
      } as any);
      formData.append("language", language);

      const res = await api.post("/voice/transcribe", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 12000,
      });

      if (res.data?.transcript && res.data.transcript.trim().length > 0) {
        return res.data.transcript.trim();
      }
      return null;
    } catch {
      // Backend voice endpoint එක නොමැති නම් හෝ Offline නම් null එවයි
      return null;
    }
  },

  // 2. Voice වාක්‍යය විශ්ලේෂණය කර දත්ත සහ ගැළපෙන පාරිභෝගිකයින් සෙවීම
  parseVoiceCommand: async (
    transcript: string,
    language: "si" | "en"
  ): Promise<ParsedVoiceDraft> => {
    const cleanText = transcript.trim();
    const amountMinor = extractAmountFromText(cleanText);
    const intent = extractIntentFromText(cleanText);

    // සියලුම සක්‍රීය පාරිභෝගිකයින් Database එකෙන් ලබාගැනීම
    const custRes = await shopAndCustomerApi.listCustomers({
      status: "ACTIVE",
      limit: 100,
    });
    const allCustomers = custRes.items || [];

    // වාක්‍යයේ වචන වෙන් කරගෙන පාරිභෝගික නම් සමඟ සැසඳීම
    const rawWords = cleanText.split(/\s+/);
    const normalizedTokens = rawWords
      .map(normalizeSinhalaNameToken)
      .filter((w) => w.length >= 2);

    const matchedCustomers = allCustomers.filter((c) => {
      const custNameLower = c.name.trim().toLowerCase();
      const custParts = custNameLower.split(/\s+/);
      const nickLower = (c.nickname || "").trim().toLowerCase();

      // සම්පූර්ණ නම හෝ මුල් නම වාක්‍යයේ තිබේදැයි බැලීම
      if (cleanText.toLowerCase().includes(custParts[0])) return true;
      if (nickLower && cleanText.toLowerCase().includes(nickLower)) return true;

      // විභක්ති ඉවත් කළ වචන ("පාලිතට" -> "පාලිත") සමඟ සැසඳීම
      return normalizedTokens.some(
        (tok) =>
          custParts.some((part) => part.includes(tok) || tok.includes(part)) ||
          (nickLower && (nickLower.includes(tok) || tok.includes(nickLower)))
      );
    });

    const hasDirectMatch = matchedCustomers.length > 0;
    const finalMatches = hasDirectMatch ? matchedCustomers : allCustomers;

    return {
      transcript: cleanText,
      language,
      intent,
      extractedCustomerQuery: hasDirectMatch ? matchedCustomers[0].name : "",
      amountMinor: amountMinor > 0 ? amountMinor : 200000,
      matchingCustomers: finalMatches,
      isExactMatch: hasDirectMatch,
    };
  },

  // 3. AI Risk Estimate විස්තර ලබාගැනීම
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
      // Ignore statement error
    }

    let category: RiskEstimateDetail["category"] = "LOW";
    let reasons: string[] = [];
    try {
      const riskRes = await api.get(`/risk/customers/${customerId}/latest`);
      if (riskRes.data?.category) {
        category = riskRes.data.category;
        reasons = riskRes.data.reasons || [];
      }
    } catch {
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