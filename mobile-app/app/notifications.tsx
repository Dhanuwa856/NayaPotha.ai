import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  RefreshCw,
  CheckCheck,
  BellOff,
} from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import BottomNav from "../components/ui/BottomNav";
import { formatLKR } from "../services/customerService";
import { reportApi } from "../services/reportService";
import { syncAndSettingsApi } from "../services/syncAndSettingsService";

interface DynamicAlert {
  id: string;
  type: "OVERDUE" | "LIMIT" | "SYNC";
  title: string;
  body: string;
  route: string;
  params?: Record<string, string>;
}

const READ_ALERTS_KEY = "nayapotha_read_alerts_v1";

export default function NotificationsScreen() {
  const router = useRouter();
  const { shop } = useAuth();

  const [alerts, setAlerts] = useState<DynamicAlert[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const [overdueList, syncState, readRaw] = await Promise.all([
        reportApi.getOverdueCustomersReport(),
        syncAndSettingsApi.getSyncOverview(),
        AsyncStorage.getItem(READ_ALERTS_KEY),
      ]);

      setReadIds(readRaw ? JSON.parse(readRaw) : []);
      const generated: DynamicAlert[] = [];

      // 1. Overdue Customer Alerts
      overdueList.forEach((item) => {
        generated.push({
          id: `overdue_${item.customer.customer_id}_${item.overdue_minor}`,
          type: "OVERDUE",
          title: `${item.customer.name} (${item.code}) is ${item.days_late}d overdue`,
          body: `${formatLKR(item.overdue_minor)} is past the payment due date.`,
          route: "/customers/[id]",
          params: { id: item.customer.customer_id, code: item.code },
        });
      });

      // 2. Pending Outbox Sync Alerts
      if (syncState.pendingCount > 0 || syncState.needsAttentionCount > 0) {
        generated.push({
          id: `sync_${syncState.pendingCount}_${syncState.needsAttentionCount}`,
          type: "SYNC",
          title: `${syncState.pendingCount} record(s) waiting to sync`,
          body: "Saved locally on this device. Tap to review and retry sync.",
          route: "/settings/sync-status",
        });
      }

      setAlerts(generated);
    } catch (e) {
      console.log("Failed to load dynamic alerts:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAlerts();
    }, [loadAlerts])
  );

  const markAsReadAndNavigate = async (alert: DynamicAlert) => {
    const nextRead = Array.from(new Set([...readIds, alert.id]));
    setReadIds(nextRead);
    await AsyncStorage.setItem(READ_ALERTS_KEY, JSON.stringify(nextRead));
    router.push({ pathname: alert.route, params: alert.params } as any);
  };

  const markAllRead = async () => {
    const allIds = alerts.map((a) => a.id);
    setReadIds(allIds);
    await AsyncStorage.setItem(READ_ALERTS_KEY, JSON.stringify(allIds));
  };

  const unreadCount = alerts.filter((a) => !readIds.includes(a.id)).length;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="min-h-[76px] pl-3 pr-5 py-2 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2 flex-1">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-11 h-11 items-center justify-center rounded-xl"
          >
            <ArrowLeft size={24} color="#102F50" strokeWidth={2.4} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-brand-navy text-2xl font-inter-bold">
              Notifications
            </Text>
            <Text className="text-brand-textSecondary text-xs font-inter mt-0.5">
              {unreadCount} unread • Live ledger alerts
            </Text>
          </View>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={markAllRead}
            className="px-3 py-2 bg-brand-surface rounded-xl flex-row items-center gap-1.5"
          >
            <CheckCheck size={16} color="#102F50" />
            <Text className="text-brand-navy text-xs font-inter-semibold">
              Mark read
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View className="h-7 px-5 bg-brand-surface justify-center">
        <Text className="text-brand-textSecondary text-xs font-inter">
          {shop?.shop_name || "NayaPotha.ai"}
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-5 py-4"
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadAlerts();
            }}
          />
        }
      >
        {loading ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#102F50" />
          </View>
        ) : alerts.length === 0 ? (
          <View className="py-16 items-center gap-2">
            <BellOff size={36} color="#64748B" />
            <Text className="text-brand-navy text-base font-inter-semibold mt-2">
              All caught up!
            </Text>
            <Text className="text-brand-textSecondary text-xs font-inter text-center">
              No overdue balances or pending sync alerts right now.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {alerts.map((item) => {
              const isRead = readIds.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.85}
                  onPress={() => markAsReadAndNavigate(item)}
                  className={`p-4 rounded-2xl flex-row items-start gap-3 border ${
                    isRead
                      ? "bg-white border-brand-border opacity-75"
                      : "bg-amber-50/70 border-brand-orange"
                  }`}
                >
                  <View className="w-10 h-10 rounded-xl bg-white items-center justify-center border border-brand-border">
                    {item.type === "OVERDUE" ? (
                      <Clock size={20} color="#DC4545" />
                    ) : item.type === "SYNC" ? (
                      <RefreshCw size={20} color="#102F50" />
                    ) : (
                      <AlertTriangle size={20} color="#F59E0B" />
                    )}
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="text-brand-navy text-sm font-inter-semibold">
                      {item.title}
                    </Text>
                    <Text className="text-brand-textSecondary text-xs font-inter leading-4">
                      {item.body}
                    </Text>
                  </View>
                  {!isRead && (
                    <View className="w-2.5 h-2.5 rounded-full bg-brand-orange mt-1.5" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <BottomNav active="Home" />
    </SafeAreaView>
  );
}