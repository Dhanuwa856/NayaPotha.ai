import { api } from "./api";
import { shopAndCustomerApi, CustomerItem } from "./customerService";

export interface ParsedVoiceDraft {
  draftId?: string;
  transcript: string;
  language: "si" | "en";
  intent: "CREDIT_SALE" | "PAYMENT";
  extractedCustomerQuery: string;
  amountMinor: number; // 0 if no amount was spoken (never defaults to Rs. 2,000)
  matchingCustomers: CustomerItem[];
  allCustomers: CustomerItem[];
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

// Comprehensive Sinhala compound number parser
function parseSinhalaNaturalAmount(text: string): number {
  const cleaned = text.replace(/,/g, "");
  const digitMatch = cleaned.match(/(?:රු\.?|රුපියල්|rs\.?|lkr)?\s*(\d+(?:\.\d{1,2})?)/i);
  if (digitMatch && digitMatch[1]) {
    const val = parseFloat(digitMatch[1]);
    if (val > 0) return Math.round(val * 100);
  }

  let total = 0;
  const lower = text.toLowerCase();

  // Thousands
  if (lower.includes("දසදහ") || lower.includes("දහදාහ")) total += 10000;
  else if (lower.includes("නවදහ") || lower.includes("නවදාහ")) total += 9000;
  else if (lower.includes("අටදහ") || lower.includes("අටදාහ")) total += 8000;
  else if (lower.includes("හත්දහ") || lower.includes("හත්දාහ")) total += 7000;
  else if (lower.includes("හයදහ") || lower.includes("හයදාහ")) total += 6000;
  else if (lower.includes("පන්දහ") || lower.includes("පන්දාහ")) total += 5000;
  else if (lower.includes("හතරදහ") || lower.includes("හතරදාහ")) total += 4000;
  else if (lower.includes("තුන්දහ") || lower.includes("තුන්දාහ")) total += 3000;
  else if (lower.includes("දෙදහ") || lower.includes("දෙදාහ")) total += 2000;
  else if (lower.includes("එක්දහස්") || lower.includes("දාහ") || lower.includes("දහස")) total += 1000;

  // Hundreds
  if (lower.includes("නවසීය") || lower.includes("නවසිය")) total += 900;
  else if (lower.includes("අටසීය") || lower.includes("අටසිය")) total += 800;
  else if (lower.includes("හත්සීය") || lower.includes("හත්සිය")) total += 700;
  else if (lower.includes("හයසීය") || lower.includes("හයසිය")) total += 600;
  else if (lower.includes("පන්සීය") || lower.includes("පන්සිය")) total += 500;
  else if (lower.includes("හතරසීය") || lower.includes("හතරසිය")) total += 400;
  else if (lower.includes("තුන්සීය") || lower.includes("තුන්සිය")) total += 300;
  else if (lower.includes("දෙසීය") || lower.includes("දෙසිය")) total += 200;
  else if (lower.includes("සීය") || lower.includes("සියය")) total += 100;

  // Tens
  if (lower.includes("අනූ")) total += 90;
  else if (lower.includes("අසූ")) total += 80;
  else if (lower.includes("හැත්තෑ")) total += 70;
  else if (lower.includes("හැට")) total += 60;
  else if (lower.includes("පනහ") || lower.includes("පනස්")) total += 50;
  else if (lower.includes("හතළිහ")) total += 40;
  else if (lower.includes("තිහ")) total += 30;
  else if (lower.includes("විස්ස")) total += 20;

  return total * 100; // Return 0 if nothing matched
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
  return paymentKeywords.some((kw) => lower.includes(kw))
    ? "PAYMENT"
    : "CREDIT_SALE";
}

function normalizeSinhalaNameToken(token: string): string {
  return token
    .replace(/(ගෙන්|ගේ|ට|ගෙ|ව|ත්)$/u, "")
    .replace(/['".,!?]/g, "")
    .trim()
    .toLowerCase();
}

export const voiceAndRiskApi = {
  uploadAudioForTranscription: async (
    audioUri: string,
    language: "si" | "en"
  ): Promise<{
    draft_id?: string;
    transcript: string;
    intent?: "CREDIT_SALE" | "PAYMENT";
    customer_query?: string;
    amount_minor?: number;
  } | null> => {
    const formData = new FormData();
    formData.append("file", {
      uri: audioUri,
      type: "audio/m4a",
      name: `voice_${Date.now()}.m4a`,
    } as any);
    formData.append("language", language);

    const res = await api.post("/voice/transcribe", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 15000,
    });
    return res.data;
  },

  parseVoiceCommand: async (
    transcript: string,
    language: "si" | "en",
    serverHint?: {
      draft_id?: string;
      intent?: "CREDIT_SALE" | "PAYMENT";
      customer_query?: string;
      amount_minor?: number;
    }
  ): Promise<ParsedVoiceDraft> => {
    const cleanText = transcript.trim();
    const amountMinor =
      serverHint?.amount_minor && serverHint.amount_minor > 0
        ? serverHint.amount_minor
        : parseSinhalaNaturalAmount(cleanText);
    const intent = serverHint?.intent || extractIntentFromText(cleanText);

    const custRes = await shopAndCustomerApi.listCustomers({
      status: "ACTIVE",
      limit: 100,
    });
    const allCustomers = custRes.items || [];

    const stopWords = new Set([
      "රු",
      "රුපියල්",
      "ණයක්",
      "ණය",
      "සටහන්",
      "කරන්න",
      "දාන්න",
      "ගෙව්වා",
      "ලැබුණා",
      "record",
      "credit",
      "payment",
      "for",
      "from",
      "rs",
      "lkr",
    ]);

    const rawWords = cleanText.split(/\s+/);
    const normalizedTokens = rawWords
      .map(normalizeSinhalaNameToken)
      .filter((w) => w.length >= 2 && !stopWords.has(w) && !/^\d+$/.test(w));

    if (serverHint?.customer_query) {
      normalizedTokens.unshift(
        normalizeSinhalaNameToken(serverHint.customer_query)
      );
    }

    const matchedCustomers = allCustomers.filter((c) => {
      const custNameLower = c.name.trim().toLowerCase();
      const custParts = custNameLower.split(/\s+/);
      const nickLower = (c.nickname || "").trim().toLowerCase();

      return normalizedTokens.some(
        (tok) =>
          custParts.some((part) => part === tok || part.startsWith(tok)) ||
          (nickLower && (nickLower === tok || nickLower.startsWith(tok)))
      );
    });

    return {
      draftId: serverHint?.draft_id,
      transcript: cleanText,
      language,
      intent,
      extractedCustomerQuery: matchedCustomers[0]?.name || serverHint?.customer_query || "",
      amountMinor, // Strictly 0 if no amount was found
      matchingCustomers: matchedCustomers, // Empty array if none matched!
      allCustomers,
      isExactMatch: matchedCustomers.length === 1,
    };
  },

  getCustomerRiskDetail: async (
    customerId: string
  ): Promise<RiskEstimateDetail> => {
    const res = await api.get(`/risk/customers/${customerId}/latest`);
    return res.data;
  },
};