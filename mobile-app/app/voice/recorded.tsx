import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, CheckCircle2, RefreshCw } from "lucide-react-native";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { formatLKR } from "../../services/customerService";

export default function VoiceRecordedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    entry_id: string;
    operation_id: string;
    customer_id: string;
    customer_name: string;
    nickname?: string;
    code: string;
    type: "CREDIT_SALE" | "PAYMENT";
    amount_minor: string;
    previous_balance_minor: string;
    new_balance_minor: string;
  }>();

  const { t } = useLanguage();
  const { shop } = useAuth();
  const insets = useSafeAreaInsets();

  const amountMinor = parseInt(params.amount_minor || "0", 10);
  const prevBalMinor = parseInt(params.previous_balance_minor || "0", 10);
  const newBalMinor = parseInt(params.new_balance_minor || "0", 10);
  const isPayment = params.type === "PAYMENT";

  const todayStr = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="min-h-[76px] pl-3 pr-5 py-2 flex-row items-center gap-2">
        <TouchableOpacity
          onPress={() => router.replace("/home" as any)}
          className="w-11 h-11 items-center justify-center rounded-xl"
        >
          <ArrowLeft size={24} color="#102F50" strokeWidth={2.4} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-brand-navy text-2xl font-inter-bold">
            {t.creditRecordedTitle}
          </Text>
          <Text className="text-brand-textSecondary text-xs font-inter mt-0.5">
            {t.afterExplicitConfirmSub}
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
        {/* Saved Banner */}
        <View className="p-3.5 bg-green-50 rounded-xl flex-row items-center gap-2.5 mb-3">
          <CheckCircle2 size={20} color="#16A36A" strokeWidth={2.2} />
          <Text className="text-brand-success text-xs font-inter-semibold">
            {t.savedOnDeviceTitle}
          </Text>
        </View>

        <Text className="text-brand-navy text-3xl font-inter-bold mb-4">
          {formatLKR(amountMinor)}
        </Text>

        {/* Summary Card */}
        <View className="p-4 bg-brand-surface rounded-2xl gap-3 mb-4">
          <Text className="text-brand-navy text-lg font-sinhala-semibold">
            {params.customer_name}
            {params.nickname ? ` (${params.nickname})` : ""} · {params.code}
          </Text>
          <Text className="text-brand-navy text-sm font-inter">
            Customer name: {params.customer_name} · Nickname:{" "}
            {params.nickname || "—"}
          </Text>

          <View className="flex-row items-center justify-between">
            <Text className="text-brand-textSecondary text-sm font-inter">
              Type
            </Text>
            <Text className="text-brand-navy text-sm font-inter-medium">
              {isPayment ? t.recordPayment : t.addCredit}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-brand-textSecondary text-sm font-inter">
              {t.dateLabel}
            </Text>
            <Text className="text-brand-navy text-sm font-inter-medium">
              {todayStr}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-brand-textSecondary text-sm font-inter">
              {t.previousBalanceLabel}
            </Text>
            <Text className="text-brand-navy text-sm font-inter-medium">
              {formatLKR(prevBalMinor)}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-brand-textSecondary text-sm font-inter">
              {t.newBalanceLabel}
            </Text>
            <Text className="text-brand-navy text-base font-inter-bold">
              {formatLKR(newBalMinor)}
            </Text>
          </View>

          <Text className="text-brand-navy text-xs font-inter-medium mt-1">
            TX-ID: {params.operation_id || params.entry_id}
          </Text>
        </View>

        {/* Sync Info Banners */}
        <View className="p-3.5 bg-amber-50 rounded-xl flex-row items-start gap-2.5 mb-3">
          <RefreshCw size={18} color="#102F50" strokeWidth={2.2} />
          <View className="flex-1 gap-0.5">
            <Text className="text-brand-navy text-xs font-inter-semibold">
              {t.synced} / {t.pendingSyncTitle}
            </Text>
            <Text className="text-brand-textSecondary text-xs font-inter">
              {t.pendingSyncSub}
            </Text>
          </View>
        </View>

        <View className="p-3.5 bg-amber-50 rounded-xl gap-1">
          <Text className="text-brand-navy text-sm font-inter-semibold">
            {t.pendingSyncNotFailureTitle}
          </Text>
          <Text className="text-brand-textSecondary text-sm font-inter leading-5">
            {t.pendingSyncNotFailureSub}
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Done Button */}
      <View
        className="px-5 pt-3 bg-white border-t border-slate-100"
        style={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() =>
            router.replace({
              pathname: "/customers/[id]",
              params: { id: params.customer_id, code: params.code },
            } as any)
          }
          className="h-12 px-4 bg-brand-navy rounded-xl items-center justify-center"
        >
          <Text className="text-white text-base font-inter-semibold">
            {t.doneBtn}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}