import { api } from "./api";

export interface CustomerBalanceSummary {
  outstanding_balance_minor: number;
  overdue_balance_minor: number;
  total_credit_minor: number;
  total_paid_minor: number;
  available_credit_minor?: number | null;
}

export interface CustomerItem {
  customer_id: string;
  shop_id: string;
  name: string;
  nickname?: string | null;
  phone_number?: string | null;
  notes?: string | null;
  credit_limit_minor?: number | null;
  status: string;
  entity_version: number;
  balance_summary: CustomerBalanceSummary;
  created_at: string;
  updated_at: string;
}

export interface RecentTransactionItem {
  entry_id: string;
  customer_id: string;
  customer_name: string;
  customer_code: string;
  type: "CREDIT_SALE" | "PAYMENT" | "REVERSAL";
  amount_minor: number;
  occurred_at: string;
  note?: string | null;
}

export function formatLKR(amountMinor: number): string {
  const rupees = (amountMinor || 0) / 100;
  return `Rs. ${rupees.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function getInitials(name: string): string {
  if (!name) return "NP";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function formatCustomerCode(customerId: string, index?: number): string {
  if (typeof index === "number") {
    return `NP-${String(index + 1).padStart(3, "0")}`;
  }
  return `NP-${customerId.substring(0, 4).toUpperCase()}`;
}

export const shopAndCustomerApi = {
  // GET /api/v1/shops/me
  getMyShop: async () => {
    const res = await api.get("/shops/me");
    return res.data;
  },

  // PATCH /api/v1/shops/me
  updateMyShop: async (payload: { shop_name?: string; address?: string; language?: "si" | "en" }) => {
    const res = await api.patch("/shops/me", payload);
    return res.data;
  },

  // PATCH /api/v1/owners/me
  updateOwnerProfile: async (payload: { name?: string; email?: string }) => {
    const res = await api.patch("/owners/me", payload);
    return res.data;
  },

  // GET /api/v1/customers
  listCustomers: async (params?: { q?: string; status?: "ACTIVE" | "ARCHIVED" | "ALL"; limit?: number }) => {
    const res = await api.get("/customers", { params: { limit: 100, ...params } });
    return res.data as { items: CustomerItem[]; next_cursor?: string; has_more: boolean };
  },

  // Fetch recent statements across top customers using GET /api/v1/customers/{customer_id}/statement
// services/customerService.ts ඇතුළේ shopAndCustomerApi object එකේ getDashboardData වෙනුවට:
  getDashboardData: async (): Promise<{
    totalCustomers: number;
    overdueCustomersCount: number;
    todaySalesMinor: number;
    todayPaymentsMinor: number;
    totalOutstandingMinor: number;
    recentTransactions: RecentTransactionItem[];
  }> => {
    // 1. Server-side aggregated endpoint එකෙන් කෙලින්ම නිවැරදි දත්ත ලබාගැනීම
    const res = await api.get("/reports/dashboard");
    return {
      totalCustomers: res.data?.totalCustomers || 0,
      overdueCustomersCount: res.data?.overdueCustomersCount || 0,
      todaySalesMinor: res.data?.todaySalesMinor || 0,
      todayPaymentsMinor: res.data?.todayPaymentsMinor || 0,
      totalOutstandingMinor: res.data?.totalOutstandingMinor || 0,
      recentTransactions: res.data?.recentTransactions || [],
    };
  },
createCustomer: async (payload: {
    client_id?: string;
    name: string;
    nickname?: string | null;
    phone_number?: string | null;
    notes?: string | null;
    credit_limit_minor?: number | null;
  }) => {
    const res = await api.post("/customers", payload);
    return res.data as CustomerItem;
  },

  // GET /api/v1/customers/{customer_id}
  getCustomer: async (customerId: string) => {
    const res = await api.get(`/customers/${customerId}`);
    return res.data as CustomerItem;
  },

  // PATCH /api/v1/customers/{customer_id}
  updateCustomer: async (
    customerId: string,
    payload: {
      name?: string;
      nickname?: string | null;
      phone_number?: string | null;
      notes?: string | null;
      credit_limit_minor?: number | null;
      expected_version?: number;
    }
  ) => {
    const res = await api.patch(`/customers/${customerId}`, payload);
    return res.data as CustomerItem;
  },

  // POST /api/v1/customers/{customer_id}/archive
  archiveCustomer: async (customerId: string) => {
    const res = await api.post(`/customers/${customerId}/archive`);
    return res.data as CustomerItem;
  },

  // POST /api/v1/customers/{customer_id}/restore
  restoreCustomer: async (customerId: string) => {
    const res = await api.post(`/customers/${customerId}/restore`);
    return res.data as CustomerItem;
  },
};

