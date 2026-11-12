import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import {
  ArrowLeft,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
} from "lucide-react-native";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import BottomNav from "../../components/ui/BottomNav";
import {
  syncAndSettingsApi,
  SyncStatusOverview,
} from "../../services/syncAndSettingsService";

export default function PendingSyncDetailsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { shop } = useAuth();
  const insets = useSafeAreaInsets();

  const [syncData, setSyncData] = useState<SyncStatusOverview | null>(null);
  const [retrying, setRetrying] = useState(false);

  const loadDetails = useCallback(async () => {
    const data = await syncAndSettingsApi.getSyncOverview();
    setSyncData(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDetails();
    }, [loadDetails])
  );

  const handleRetryWaiting = async () => {
    try {
      setRetrying(true);
      const updated = await syncAndSettingsApi.retrySyncNow();
      setSyncData(updated);
      Alert.alert(
        "Records Synced",
        "Waiting records have been sent using their original operation IDs."
      );
    } finally {
      setRetrying(false);
    }
  };

  const pendingCount = syncData?.pendingCount ?? 2;
  const attentionCount = syncData?.needsAttentionCount ?? 1;

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="min-h-[76px] pl-3 pr-5 py-2 flex-row items-center gap-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-11 h-11 items-center justify-center rounded-xl"
        >
          <ArrowLeft size={24} color="#102F50" strokeWidth={2.4} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-brand-navy text-2xl font-inter-bold">
            {t.pendingSyncDetailsTitle}
          </Text>
          <Text className="text-brand-textSecondary text-xs font-inter mt-0.5">
            {pendingCount} waiting • {attentionCount} needs attention
          </Text>
        </View>
      </View>

      {/* Shop Strip */}
      <View className="h-7 px-5 bg-brand-surface justify-center">
        <Text className="text-brand-textSecondary text-xs font-inter">
          {shop?.shop_name || "NayaPotha.ai"}
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-5 py-4"
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Amber Temporary Connection Banner */}
        <View className="p-3.5 bg-amber-50 rounded-xl flex-row items-start gap-2.5 mb-4">
          <AlertTriangle size={20} color="#102F50" strokeWidth={2.2} />
          <View className="flex-1 gap-0.5">
            <Text className="text-brand-navy text-xs font-inter-semibold">
              {t.tempConnectionProblemTitle}
            </Text>
            <Text className="text-brand-textSecondary text-xs font-inter leading-4">
              {t.tempConnectionProblemSub}
            </Text>
          </View>
        </View>

        {/* Waiting Records Box */}
        <View className="p-4 bg-brand-surface rounded-2xl gap-3 mb-4">
          {syncData?.pendingRecords && syncData.pendingRecords.length > 0 ? (
            syncData.pendingRecords.map((rec) => (
              <View
                key={rec.id}
                className="flex-row items-center justify-between"
              >
                <Text className="text-brand-textSecondary text-xs font-inter">
                  {rec.title}
                </Text>
                <Text className="text-brand-navy text-sm font-inter-medium">
                  {rec.rightLabel}
                </Text>
              </View>
            ))
          ) : (
            <Text className="text-brand-success text-xs font-inter-semibold">
              All waiting records have been synced.
            </Text>
          )}
          <Text className="text-brand-textSecondary text-xs font-inter">
            Waiting to send • Locally saved
          </Text>
        </View>

        {/* Red Conflict Alert Card */}
        <View className="p-3.5 bg-rose-50 rounded-xl flex-row items-start gap-2.5 mb-4">
          <AlertCircle size={20} color="#DC4545" strokeWidth={2.2} />
          <View className="flex-1 gap-0.5">
            <Text className="text-brand-error text-xs font-inter-semibold">
              {t.shopUpdateConflictTitle}
            </Text>
            <Text className="text-brand-textSecondary text-xs font-inter leading-4">
              {t.shopUpdateConflictSub}
            </Text>
          </View>
        </View>

        {/* Review Shop Update Secondary Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push("/settings/shop-profile" as any)}
          className="h-12 px-4 bg-white rounded-xl border border-brand-navy items-center justify-center mb-4"
        >
          <Text className="text-brand-navy text-base font-inter-semibold">
            {t.reviewShopUpdateBtn}
          </Text>
        </TouchableOpacity>

        <Text className="text-brand-textSecondary text-xs font-inter leading-4 mb-3">
          Ledger entries are safe. The shop profile conflict does not alter
          balances. Retry won’t duplicate transactions.
        </Text>

        <Text className="text-brand-navy text-xs font-inter">
          Last attempt:{" "}
          {syncData?.lastAttemptFormatted || "27 Oct 2026 · 09:40"}
        </Text>
      </ScrollView>

      {/* Bottom Sticky Retry Waiting Records Button */}
      <View
        className="px-5 pt-3 bg-white border-t border-slate-100"
        style={{ paddingBottom: Math.max(insets.bottom, 20) + 75 }}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={retrying}
          onPress={handleRetryWaiting}
          className="h-12 px-4 bg-brand-navy rounded-xl flex-row items-center justify-center gap-2 shadow-sm"
        >
          {retrying ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <RefreshCw size={18} color="#FFFFFF" strokeWidth={2.2} />
          )}
          <Text className="text-white text-base font-inter-semibold">
            {t.retryWaitingRecordsBtn}
          </Text>
        </TouchableOpacity>
      </View>

      <BottomNav active="Settings" />
    </SafeAreaView>
  );
}