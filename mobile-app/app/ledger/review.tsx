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
import {
  ArrowLeft,
  AlertTriangle,
  ChevronRight,
  AlertCircle,
} from "lucide-react-native";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { formatLKR, getInitials } from "../../services/customerService";
import { ledgerApi, generateOpId } from "../../services/ledgerService";

export default function ReviewTransactionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    customer_id: string;
    customer_name: string;
    code: string;
    phone?: string;
    type: "CREDIT_SALE" | "PAYMENT";
    amount_minor: string;
    current_balance_minor: string;
    credit_limit_minor?: string;
    overdue_minor?: string;
    note?: string;
    due_date?: string;
  }>();

  const { t } = useLanguage();
  const { shop } = useAuth();
  const insets = useSafeAreaInsets();

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Keep deterministic operation_id across retries on this screen
  const [operationId] = useState(() =>
    generateOpId(params.type === "PAYMENT" ? "pay" : "cred")
  );

  const isPayment = params.type === "PAYMENT";
  const amountMinor = parseInt(params.amount_minor || "0", 10);
  const currentBalanceMinor = parseInt(params.current_balance_minor || "0", 10);
  const overdueMinor = parseInt(params.overdue_minor || "0", 10);
  const limitMinor = params.credit_limit_minor
    ? parseInt(params.credit_limit_minor, 10)
    : null;

  const newBalanceMinor = isPayment
    ? Math.max(0, currentBalanceMinor - amountMinor)
    : currentBalanceMinor + amountMinor;

  const todayFormatted = new Date().toLocaleDateString("en-GB", {
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
            note: params.note || null,
            operation_id: operationId,
          })
        : await ledgerApi.recordCreditSale({
            customer_id: params.customer_id,
            amount_minor: amountMinor,
            note: params.note || null,
            due_date: params.due_date || null,
            operation_id: operationId,
          });

      router.replace({
        pathname: "/ledger/entry/[id]",
        params: {
          id: res.entry.entry_id,
          customer_id: params.customer_id,
          customer_name: params.customer_name,
          code: params.code,
          previous_balance_minor: String(currentBalanceMinor),
          resulting_balance_minor: String(
            res.balance_summary.outstanding_balance_minor
          ),
        },
      } as any);
    } catch (err: any) {
      const apiErr =
        err.response?.data?.error?.message ||
        err.response?.data?.detail?.[0]?.msg;
      setErrorMsg(apiErr || "Failed to record transaction. Please try again.");
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
            {t.reviewTxTitle}
          </Text>
          <Text className="text-brand-textSecondary text-xs font-inter mt-0.5">
            {t.step3Of3NotRecorded}
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

        {/* Customer Summary Card */}
        <View className="p-3 bg-white rounded-2xl border border-brand-border flex-row items-center gap-3 mb-4">
          <View className="w-10 h-10 bg-brand-surface rounded-xl items-center justify-center">
            <Text className="text-brand-navy text-base font-inter-bold">
              {getInitials(params.customer_name || "NP")}
            </Text>
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="text-brand-navy text-sm font-inter-semibold">
              {params.customer_name}
            </Text>
            <Text className="text-brand-textSecondary text-xs font-inter">
              {params.code} • {params.phone || t.phoneNotSupplied}
            </Text>
            <Text className="text-brand-navy text-sm font-inter-bold">
              {formatLKR(currentBalanceMinor)}
            </Text>
          </View>
          <ChevronRight size={18} color="#64748B" />
        </View>

        {/* Transaction Details Breakdown */}
        <View className="p-4 bg-brand-surface rounded-2xl gap-3 mb-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-brand-textSecondary text-xs font-inter">
              {t.txTypeLabel}
            </Text>
            <Text className="text-brand-navy text-sm font-inter-medium">
              {isPayment ? t.recordPayment : t.addCredit}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-brand-textSecondary text-xs font-inter">
              Amount
            </Text>
            <Text className="text-brand-navy text-base font-inter-bold">
              {formatLKR(amountMinor)}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-brand-textSecondary text-xs font-inter">
              {t.dateLabel}
            </Text>
            <Text className="text-brand-navy text-sm font-inter-medium">
              {todayFormatted}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-brand-textSecondary text-xs font-inter">
              Note
            </Text>
            <Text className="text-brand-navy text-sm font-inter-medium">
              {params.note || "—"}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-brand-textSecondary text-xs font-inter">
              {t.currentBalanceLabel}
            </Text>
            <Text className="text-brand-navy text-sm font-inter-medium">
              {formatLKR(currentBalanceMinor)}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-brand-textSecondary text-xs font-inter">
              {t.newBalanceLabel}
            </Text>
            <Text className="text-brand-navy text-base font-inter-bold">
              {formatLKR(newBalanceMinor)}
            </Text>
          </View>
        </View>

        {/* Advisory Risk Warning Banner (When Overdue or Exceeding Limit) */}
        {!isPayment &&
          (overdueMinor > 0 ||
            (limitMinor != null && newBalanceMinor > limitMinor)) && (
            <View className="p-3.5 bg-amber-50 rounded-xl flex-row items-start gap-2.5 mb-4">
              <AlertTriangle size={20} color="#102F50" strokeWidth={2.2} />
              <View className="flex-1 gap-0.5">
                <Text className="text-brand-navy text-xs font-inter-semibold">
                  {limitMinor != null && newBalanceMinor > limitMinor
                    ? "High risk • Exceeds credit limit"
                    : "Medium risk • Payment overdue"}
                </Text>
                <Text className="text-brand-textSecondary text-xs font-inter leading-4">
                  {limitMinor != null && newBalanceMinor > limitMinor
                    ? `New balance exceeds the ${formatLKR(
                        limitMinor
                      )} limit. You may still proceed.`
                    : `Customer has ${formatLKR(
                        overdueMinor
                      )} overdue. You may still proceed.`}
                </Text>
              </View>
            </View>
          )}

        <Text className="text-brand-textSecondary text-xs font-inter leading-4">
          {t.reviewAdvisoryFooter}
        </Text>
      </ScrollView>

      {/* Bottom Confirm & Cancel Actions */}
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
            {t.cancelTxBtn}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}