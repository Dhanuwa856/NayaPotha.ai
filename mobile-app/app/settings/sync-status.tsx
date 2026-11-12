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
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
} from "lucide-react-native";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import BottomNav from "../../components/ui/BottomNav";
import {
  syncAndSettingsApi,
  SyncStatusOverview,
} from "../../services/syncAndSettingsService";

export default function SyncStatusScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { shop } = useAuth();
  const insets = useSafeAreaInsets();

  const [syncData, setSyncData] = useState<SyncStatusOverview | null>(null);
  const [retrying, setRetrying] = useState(false);

  const loadSyncState = useCallback(async () => {
    const data = await syncAndSettingsApi.getSyncOverview();
    setSyncData(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSyncState();
    }, [loadSyncState])
  );

  const handleRetrySync = async () => {
    try {
      setRetrying(true);
      const updated = await syncAndSettingsApi.retrySyncNow();
      setSyncData(updated);
      Alert.alert(
        "Sync Complete",
        "All waiting local records have been safely synced with the server."
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
            {t.syncStatusTitle}
          </Text>
          <Text className="text-brand-textSecondary text-xs font-inter mt-0.5">
            {t.syncStatusSub}
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
        {/* Top Connection Status Banner */}
        <View className="p-3.5 bg-brand-surface rounded-xl flex-row items-start gap-2.5 mb-4">
          {pendingCount > 0 || !syncData?.isOnline ? (
            <WifiOff size={20} color="#102F50" strokeWidth={2.2} />
          ) : (
            <CheckCircle2 size={20} color="#16A36A" strokeWidth={2.2} />
          )}
          <View className="flex-1 gap-0.5">
            <Text className="text-brand-navy text-xs font-inter-semibold">
              {pendingCount > 0 || !syncData?.isOnline
                ? t.offlineSafeTitle
                : t.onlineSafeTitle}
            </Text>
            <Text className="text-brand-textSecondary text-xs font-inter leading-4">
              {t.offlineSafeSub}
            </Text>
          </View>
        </View>

        {/* Sync Counts Breakdown Card */}
        <View className="p-4 bg-brand-surface rounded-2xl gap-3 mb-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-brand-textSecondary text-xs font-inter">
              {t.synced}
            </Text>
            <Text className="text-brand-navy text-sm font-inter-medium">
              {syncData?.syncedCount ?? 18} records
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-brand-textSecondary text-xs font-inter">
              {t.pendingWaitingLabel}
            </Text>
            <Text className="text-brand-navy text-sm font-inter-medium">
              {pendingCount} {pendingCount === 1 ? "record" : "records"}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-brand-textSecondary text-xs font-inter">
              {t.needsAttentionLabel}
            </Text>
            <Text className="text-brand-navy text-sm font-inter-medium">
              {attentionCount} {attentionCount === 1 ? "record" : "records"}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-brand-textSecondary text-xs font-inter">
              {t.lastSuccessfulSyncLabel}
            </Text>
            <Text className="text-brand-navy text-sm font-inter-medium">
              {syncData?.lastSyncFormatted || "27 Oct · 08:30"}
            </Text>
          </View>
        </View>

        {/* Amber Warning Box */}
        <View className="p-3.5 bg-amber-50 rounded-xl flex-row items-start gap-2.5 mb-3">
          <AlertTriangle size={20} color="#102F50" strokeWidth={2.2} />
          <View className="flex-1 gap-0.5">
            <Text className="text-brand-navy text-xs font-inter-semibold">
              {t.pendingNotFailedTitle}
            </Text>
            <Text className="text-brand-textSecondary text-xs font-inter leading-4">
              {t.pendingNotFailedSub}
            </Text>
          </View>
        </View>

        {/* View Pending Sync Details Row */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push("/settings/sync-details" as any)}
          className="min-h-[72px] px-3 py-3 bg-white rounded-xl border border-brand-border flex-row items-center justify-between mb-4"
        >
          <View className="flex-1 pr-3 gap-1">
            <Text className="text-brand-navy text-base font-inter-medium">
              {t.viewPendingDetailsTitle}
            </Text>
            <Text className="text-brand-textSecondary text-xs font-inter">
              {t.viewPendingDetailsSub}
            </Text>
          </View>
          <ChevronRight size={20} color="#102F50" />
        </TouchableOpacity>

        <Text className="text-brand-textSecondary text-xs font-inter leading-4">
          {t.retryNoDuplicateFooter}
        </Text>
      </ScrollView>

      {/* Bottom Sticky Retry Sync Button (Floats above BottomNav) */}
      <View
        className="px-5 pt-3 bg-white border-t border-slate-100"
        style={{ paddingBottom: Math.max(insets.bottom, 20) + 75 }}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={retrying}
          onPress={handleRetrySync}
          className="h-12 px-4 bg-brand-navy rounded-xl flex-row items-center justify-center gap-2 shadow-sm"
        >
          {retrying ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <RefreshCw size={18} color="#FFFFFF" strokeWidth={2.2} />
          )}
          <Text className="text-white text-base font-inter-semibold">
            {t.retrySyncBtn}
          </Text>
        </TouchableOpacity>
      </View>

      <BottomNav active="Settings" />
    </SafeAreaView>
  );
}