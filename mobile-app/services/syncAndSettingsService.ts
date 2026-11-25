import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, getDeviceIdentity } from "./api";
import { shopAndCustomerApi } from "./customerService";

export interface OutboxMutation {
  operation_id: string;
  endpoint: string;
  method: "POST" | "PATCH";
  payload: any;
  title: string;
  rightLabel: string;
  created_at: string;
  status: "WAITING" | "CONFLICT" | "FAILED";
  error_message?: string;
}

export interface SyncStatusOverview {
  isOnline: boolean;
  syncedCount: number;
  pendingCount: number;
  needsAttentionCount: number;
  lastSyncFormatted: string;
  lastAttemptFormatted: string;
  pendingRecords: OutboxMutation[];
}

const OUTBOX_KEY = "nayapotha_real_outbox_v1";
const LAST_SYNC_KEY = "nayapotha_last_sync_ts_v1";

export const syncAndSettingsApi = {
  // Enqueue a mutation when offline
  enqueueOutboxMutation: async (mutation: Omit<OutboxMutation, "created_at" | "status">) => {
    const raw = await AsyncStorage.getItem(OUTBOX_KEY);
    const list: OutboxMutation[] = raw ? JSON.parse(raw) : [];
    // Prevent duplicate operation_id
    if (!list.some((item) => item.operation_id === mutation.operation_id)) {
      list.push({
        ...mutation,
        created_at: new Date().toISOString(),
        status: "WAITING",
      });
      await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(list));
    }
  },

  getOutboxQueue: async (): Promise<OutboxMutation[]> => {
    const raw = await AsyncStorage.getItem(OUTBOX_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  getSyncOverview: async (): Promise<SyncStatusOverview> => {
    let isOnline = true;
    let syncedCount = 0;

    try {
      const dash = await api.get("/reports/dashboard", { timeout: 5000 });
      syncedCount =
        (dash.data?.totalCustomers || 0) +
        (dash.data?.recentTransactions?.length || 0);
    } catch {
      try {
        const custRes = await shopAndCustomerApi.listCustomers({ limit: 100 });
        syncedCount = custRes.items?.length || 0;
      } catch {
        isOnline = false;
      }
    }

    const queue = await syncAndSettingsApi.getOutboxQueue();
    const pendingCount = queue.filter((q) => q.status === "WAITING").length;
    const needsAttentionCount = queue.filter(
      (q) => q.status === "CONFLICT" || q.status === "FAILED"
    ).length;

    const lastSyncIso = await AsyncStorage.getItem(LAST_SYNC_KEY);
    const formatTs = (iso?: string | null) => {
      const d = iso ? new Date(iso) : new Date();
      return `${d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      })} · ${d.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    };

    return {
      isOnline,
      syncedCount,
      pendingCount,
      needsAttentionCount,
      lastSyncFormatted: formatTs(lastSyncIso),
      lastAttemptFormatted: formatTs(new Date().toISOString()),
      pendingRecords: queue,
    };
  },

  // Replay every queued outbox operation against FastAPI using its original operation_id
  retrySyncNow: async (): Promise<SyncStatusOverview> => {
    const queue = await syncAndSettingsApi.getOutboxQueue();
    const remaining: OutboxMutation[] = [];

    for (const item of queue) {
      try {
        if (item.method === "POST") {
          await api.post(item.endpoint, item.payload);
        } else if (item.method === "PATCH") {
          await api.patch(item.endpoint, item.payload);
        }
        // Succeeded -> omit from remaining
      } catch (err: any) {
        const status = err.response?.status;
        if (status === 409) {
          remaining.push({
            ...item,
            status: "CONFLICT",
            error_message:
              err.response?.data?.detail?.message || "Version conflict detected.",
          });
        } else {
          remaining.push(item);
        }
      }
    }

    await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(remaining));
    if (remaining.length === 0) {
      await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    }
    return syncAndSettingsApi.getSyncOverview();
  },

  updateShopProfile: async (payload: {
    shop_name?: string;
    phone_number?: string;
    address?: string;
    expected_version?: number;
  }) => {
    const { device_id } = await getDeviceIdentity();
    const body = { ...payload, device_id };
    try {
      const res = await api.patch("/shops/me", body);
      return res.data;
    } catch (err: any) {
      if (!err.response) {
        // Network offline -> queue in real outbox
        await syncAndSettingsApi.enqueueOutboxMutation({
          operation_id: `shop_upd_${Date.now()}`,
          endpoint: "/shops/me",
          method: "PATCH",
          payload: body,
          title: "Shop profile update",
          rightLabel: "1 update",
        });
        return { queued_offline: true };
      }
      throw err;
    }
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    // Strictly requires 200 OK from POST /api/v1/auth/change-password (no 404 bypass)
    const res = await api.post("/auth/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return res.data;
  },
};