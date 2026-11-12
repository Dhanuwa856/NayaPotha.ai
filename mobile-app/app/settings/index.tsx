import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { ArrowLeft, ChevronRight, LogOut } from "lucide-react-native";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import BottomNav from "../../components/ui/BottomNav";
import {
  syncAndSettingsApi,
  SyncStatusOverview,
} from "../../services/syncAndSettingsService";

export default function SettingsScreen() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const { owner, shop, logout } = useAuth();

  const [syncInfo, setSyncInfo] = useState<SyncStatusOverview | null>(null);

  useFocusEffect(
    useCallback(() => {
      syncAndSettingsApi
        .getSyncOverview()
        .then(setSyncInfo)
        .catch(() => {});
    }, [])
  );

  const handleSignOut = () => {
    Alert.alert(
      t.signOutBtn,
      "Are you sure you want to sign out of this device?",
      [
        { text: t.cancelBtn, style: "cancel" },
        {
          text: t.signOutBtn,
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/login" as any);
          },
        },
      ]
    );
  };

  const syncSubtitle =
    syncInfo &&
    (syncInfo.pendingCount > 0 || syncInfo.needsAttentionCount > 0)
      ? `${syncInfo.pendingCount} pending • ${syncInfo.needsAttentionCount} needs attention`
      : `${syncInfo?.syncedCount || 18} records synced`;

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
          <Text
            className={`text-brand-navy text-2xl ${
              lang === "si" ? "font-sinhala-bold" : "font-inter-bold"
            }`}
          >
            {t.settingsTitle}
          </Text>
          <Text className="text-brand-textSecondary text-xs font-inter mt-0.5">
            {t.settingsSub}
          </Text>
        </View>
      </View>

      {/* Shop Info Strip */}
      <View className="h-7 px-5 bg-brand-surface justify-center">
        <Text className="text-brand-textSecondary text-xs font-inter">
          {shop?.shop_name || "NayaPotha.ai"}
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-5 py-4"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Shop & Owner Summary Card */}
        <View className="p-4 bg-brand-surface rounded-2xl gap-1.5 mb-3">
          <Text className="text-brand-navy text-lg font-inter-semibold">
            {shop?.shop_name || "Naya Demo Stores"}
          </Text>
          <Text className="text-brand-textSecondary text-xs font-inter">
            {owner?.name || "Dhanushka"} • {t.ownerAccountLabel}
          </Text>
        </View>

        {/* Settings Menu Items */}
        <View className="divide-y divide-slate-100 mb-4">
          {/* 1. Shop Profile */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push("/settings/shop-profile" as any)}
            className="min-h-[72px] px-2 py-3 flex-row items-center justify-between"
          >
            <View className="flex-1 pr-3 gap-1">
              <Text className="text-brand-navy text-base font-inter">
                {t.shopProfileTitle}
              </Text>
              <Text className="text-brand-textSecondary text-xs font-inter">
                {t.shopProfileSub}
              </Text>
            </View>
            <ChevronRight size={20} color="#102F50" />
          </TouchableOpacity>

          {/* 2. Language / භාෂාව */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push("/settings/language" as any)}
            className="min-h-[72px] px-2 py-3 flex-row items-center justify-between"
          >
            <View className="flex-1 pr-3 gap-1">
              <Text className="text-brand-navy text-base font-inter">
                Language / <Text className="font-sinhala">භාෂාව</Text>
              </Text>
              <Text className="text-brand-textSecondary text-xs font-inter">
                {lang === "si"
                  ? "සිංහල • English available"
                  : t.languageMenuSub}
              </Text>
            </View>
            <ChevronRight size={20} color="#102F50" />
          </TouchableOpacity>

          {/* 3. Security */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push("/settings/security" as any)}
            className="min-h-[72px] px-2 py-3 flex-row items-center justify-between"
          >
            <View className="flex-1 pr-3 gap-1">
              <Text className="text-brand-navy text-base font-inter">
                {t.securityTitle}
              </Text>
              <Text className="text-brand-textSecondary text-xs font-inter">
                {t.securitySub}
              </Text>
            </View>
            <ChevronRight size={20} color="#102F50" />
          </TouchableOpacity>

          {/* 4. Sync Status */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push("/settings/sync-status" as any)}
            className="min-h-[72px] px-2 py-3 flex-row items-center justify-between"
          >
            <View className="flex-1 pr-3 gap-1">
              <Text className="text-brand-navy text-base font-inter">
                {t.syncStatusTitle}
              </Text>
              <Text className="text-brand-textSecondary text-xs font-inter">
                {syncSubtitle}
              </Text>
            </View>
            <ChevronRight size={20} color="#102F50" />
          </TouchableOpacity>

          {/* 5. Help / About */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push("/settings/help" as any)}
            className="min-h-[72px] px-2 py-3 flex-row items-center justify-between"
          >
            <View className="flex-1 pr-3 gap-1">
              <Text className="text-brand-navy text-base font-inter">
                {t.helpAboutTitle}
              </Text>
              <Text className="text-brand-textSecondary text-xs font-inter">
                {t.helpAboutSub}
              </Text>
            </View>
            <ChevronRight size={20} color="#102F50" />
          </TouchableOpacity>
        </View>

        <Text className="text-brand-textSecondary text-xs font-inter leading-4 mb-6">
          {t.offlineFirstFooter}
        </Text>

        {/* Sign Out Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleSignOut}
          className="h-12 px-4 bg-rose-50 rounded-xl border border-brand-error flex-row items-center justify-center gap-2"
        >
          <LogOut size={18} color="#DC4545" strokeWidth={2.2} />
          <Text className="text-brand-error text-sm font-inter-semibold">
            {t.signOutBtn}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomNav active="Settings" />
    </SafeAreaView>
  );
}