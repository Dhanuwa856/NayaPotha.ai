import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, AlertCircle } from "lucide-react-native";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { formatLKR } from "../../services/customerService";
import { ledgerApi, generateOpId } from "../../services/ledgerService";

export default function ConfirmVoiceTransactionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    customer_id: string;
    customer_name: string;
    nickname?: string;
    code: string;
    type: "CREDIT_SALE" | "PAYMENT";
    amount_minor: string;
    current_balance_minor: string;
    transcript?: string;
  }>();

  const { t } = useLanguage();
  const { shop } = useAuth();
  const insets = useSafeAreaInsets();

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [operationId] = useState(() => generateOpId("voice"));

  const isPayment = params.type === "PAYMENT";
  const amountMinor = parseInt(params.amount_minor || "0", 10);
  const prevBalMinor = parseInt(params.current_balance_minor || "0", 10);
  const newBalMinor = isPayment
    ? Math.max(0, prevBalMinor - amountMinor)
    : prevBalMinor + amountMinor;

  const todayStr = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const handleConfirm = async () => {
    setErrorMsg(null);
    try {
      setSubmitting(true);
      const res = isPayment
        ? await ledgerApi.recordPayment({
            customer_id: params.customer_id,
            amount_minor: amountMinor,
            note: params.transcript || "Voice entry",
            operation_id: operationId,
          })
        : await ledgerApi.recordCreditSale({
            customer_id: params.customer_id,
            amount_minor: amountMinor,
            note: params.transcript || "Voice entry",
            operation_id: operationId,
          });

      router.replace({
        pathname: "/voice/recorded",
        params: {
          entry_id: res.entry.entry_id,
          operation_id: res.entry.operation_id,
          customer_id: params.customer_id,
          customer_name: params.customer_name,
          nickname: params.nickname || "",
          code: params.code,
          type: params.type,
          amount_minor: String(amountMinor),
          previous_balance_minor: String(prevBalMinor),
          new_balance_minor: String(
            res.balance_summary.outstanding_balance_minor
          ),
        },
      } as any);
    } catch (err: any) {
      const apiErr =
        err.response?.data?.error?.message ||
        err.response?.data?.detail?.[0]?.msg;
      setErrorMsg(apiErr || "Could not record voice transaction.");
    } finally {
      setSubmitting(false);
    }
  };

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
            {t.confirmVoiceCreditTitle}
          </Text>
          <Text className="text-brand-textSecondary text-xs font-inter mt-0.5">
            {t.finalReviewSub}
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
        {errorMsg && (
          <View className="p-3.5 mb-4 bg-rose-50 rounded-xl border border-brand-error flex-row items-center gap-2.5">
            <AlertCircle size={20} color="#DC4545" />
            <Text className="flex-1 text-brand-error text-sm font-inter-medium">
              {errorMsg}
            </Text>
          </View>
        )}

        {/* Selected Customer Identity Card */}
        <View className="p-4 bg-brand-surface rounded-2xl gap-1.5 mb-4">
          <Text className="text-brand-navy text-lg font-sinhala-semibold">
            {params.customer_name}
            {params.nickname ? ` (${params.nickname})` : ""} · {params.code}
          </Text>
          <Text className="text-brand-navy text-sm font-inter">
            Customer name: {params.customer_name} · Nickname:{" "}
            {params.nickname || "—"}
          </Text>
          <Text className="text-brand-textSecondary text-xs font-inter">
            Immutable ID: {params.code} · Explicitly selected
          </Text>
        </View>

        {/* Transaction Breakdown Card */}
        <View className="p-4 bg-brand-surface rounded-2xl gap-3.5 mb-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-brand-textSecondary text-sm font-inter">
              {t.txTypeLabel}
            </Text>
            <Text className="text-brand-navy text-sm font-inter-medium">
              {isPayment ? t.recordPayment : t.addCredit}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-brand-textSecondary text-sm font-inter">
              Amount
            </Text>
            <Text className="text-brand-navy text-base font-inter-bold">
              {formatLKR(amountMinor)}
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
        </View>

        {/* Explicit Choice Blue Banner */}
        <View className="p-3.5 bg-blue-50 rounded-xl gap-1 mb-3">
          <Text className="text-brand-navy text-sm font-inter-semibold">
            {t.explicitChoiceTitle}
          </Text>
          <Text className="text-brand-textSecondary text-sm font-inter leading-5">
            {t.explicitChoiceSub}
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Confirm & Cancel */}
      <View
        className="px-5 pt-3 bg-white border-t border-slate-100 gap-2.5"
        style={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={submitting}
          onPress={handleConfirm}
          className="h-12 px-4 bg-brand-navy rounded-xl flex-row items-center justify-center gap-2"
        >
          {submitting && <ActivityIndicator size="small" color="#FFFFFF" />}
          <Text className="text-white text-base font-inter-semibold">
            {isPayment ? t.confirmPaymentBtn : t.confirmCreditBtn} ·{" "}
            {formatLKR(amountMinor)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={submitting}
          onPress={() => router.back()}
          className="h-12 px-4 bg-white rounded-xl border border-brand-navy items-center justify-center"
        >
          <Text className="text-brand-navy text-base font-inter-semibold">
            {t.cancelBtn}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}