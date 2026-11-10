import { api, getDeviceIdentity } from "./api";
import { CustomerBalanceSummary } from "./customerService";

export interface LedgerEntryResponse {
  entry_id: string;
  shop_id: string;
  customer_id: string;
  type: "CREDIT_SALE" | "PAYMENT" | "REVERSAL";
  amount_minor: number;
  remaining_unpaid_minor?: number | null;
  note?: string | null;
  due_date?: string | null;
  occurred_at: string;
  recorded_at: string;
  created_by: string;
  operation_id: string;
  reversal_of?: string | null;
  correction_of?: string | null;
  status: "POSTED" | "REVERSED";
}

export interface LedgerOperationResult {
  entry: LedgerEntryResponse;
  allocations: any[];
  balance_summary: CustomerBalanceSummary;
  idempotent_replay: boolean;
}

export function generateOpId(prefix = "op"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function formatEntryCode(entryId: string, type: string): string {
  const prefix = type === "PAYMENT" ? "PM" : type === "REVERSAL" ? "RV" : "CR";
  return `${prefix}-${entryId.substring(0, 4).toUpperCase()}`;
}

export const ledgerApi = {
  // POST /api/v1/ledger/credit-sales
  recordCreditSale: async (payload: {
    customer_id: string;
    amount_minor: number;
    note?: string | null;
    due_date?: string | null;
    occurred_at?: string;
    operation_id?: string;
  }): Promise<LedgerOperationResult> => {
    const { device_id } = await getDeviceIdentity();
    const res = await api.post("/ledger/credit-sales", {
      operation_id: payload.operation_id || generateOpId("cred"),
      customer_id: payload.customer_id,
      amount_minor: payload.amount_minor,
      note: payload.note || null,
      due_date: payload.due_date || null,
      occurred_at: payload.occurred_at || new Date().toISOString(),
      device_id,
    });
    return res.data;
  },

  // POST /api/v1/ledger/payments
  recordPayment: async (payload: {
    customer_id: string;
    amount_minor: number;
    note?: string | null;
    occurred_at?: string;
    operation_id?: string;
  }): Promise<LedgerOperationResult> => {
    const { device_id } = await getDeviceIdentity();
    const res = await api.post("/ledger/payments", {
      operation_id: payload.operation_id || generateOpId("pay"),
      customer_id: payload.customer_id,
      amount_minor: payload.amount_minor,
      note: payload.note || null,
      occurred_at: payload.occurred_at || new Date().toISOString(),
      device_id,
    });
    return res.data;
  },

  // GET /api/v1/ledger/entries/{entry_id}
  getEntry: async (entryId: string): Promise<LedgerEntryResponse> => {
    const res = await api.get(`/ledger/entries/${entryId}`);
    return res.data;
  },

  // POST /api/v1/ledger/entries/{entry_id}/reverse
  reverseEntry: async (
    entryId: string,
    reason: string
  ): Promise<LedgerOperationResult> => {
    const { device_id } = await getDeviceIdentity();
    const res = await api.post(`/ledger/entries/${entryId}/reverse`, {
      operation_id: generateOpId("rev"),
      reason,
      occurred_at: new Date().toISOString(),
      device_id,
    });
    return res.data;
  },
};