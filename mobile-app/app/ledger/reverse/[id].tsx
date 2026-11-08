import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Info, AlertCircle } from "lucide-react-native";
import { useLanguage } from "../../../context/LanguageContext";
import { useAuth } from "../../../context/AuthContext";
import { formatLKR, formatCustomerCode } from "../../../services/customerService";
import {
  ledgerApi,
  LedgerEntryResponse,
  formatEntryCode,
} from "../../../services/ledgerService";

export default function ReverseTransactionScreen() {
  const router = useRouter();
  const { id, customer_id, customer_name, code, current_balance_minor } =
    useLocalSearchParams<{
      id: string;
      customer_id?: string;
      customer_name?: string;
      code?: string;
      current_balance_minor?: string;
    }>();

  const { t } = useLanguage();
  const { shop } = useAuth();
  const insets = useSafeAreaInsets();

  const [entry, setEntry] = useState<LedgerEntryResponse | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const data = await ledgerApi.getEntry(id);
        setEntry(data);
      } catch {
        setErrorMsg("Could not load original transaction.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading || !entry) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#102F50" />
      </SafeAreaView>
    );
  }

  const entryCode = formatEntryCode(entry.entry_id, entry.type);
  const displayCustCode = code || formatCustomerCode(entry.customer_id);
  const curBalMinor = parseInt(current_balance_minor || "0", 10);
  const isPayment = entry.type === "PAYMENT";

  // Reversing a credit reduces balance; reversing a payment restores balance
  const newBalMinor = isPayment
    ? curBalMinor + entry.amount_minor
    : Math.max(0, curBalMinor - entry.amount_minor);

  const dateStr = new Date(entry.occurred_at).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const handleConfirmReversal = async () => {
    setErrorMsg(null);
    if (reason.trim().length < 3) {
      setErrorMsg("Please enter a valid reason for the reversal (at least 3 characters).");
      return;
    }

    try {
      setSubmitting(true);
      await ledgerApi.reverseEntry(entry.entry_id, reason.trim());
      router.replace({
        pathname: "/customers/[id]",
        params: {
          id: customer_id || entry.customer_id,
          code: displayCustCode,
        },
      } as any);
    } catch (err: any) {
      const apiErr =
        err.response?.data?.error?.message ||
        err.response?.data?.detail?.[0]?.msg;
      setErrorMsg(apiErr || "Could not reverse transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
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
              {t.reverseTxTitle}
            </Text>
            <Text className="text-brand-textSecondary text-xs font-inter mt-0.5">
              {customer_name || "Customer"} • {displayCustCode}
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

          {/* Original Entry Card */}
          <View className="p-4 bg-brand-surface rounded-2xl gap-2.5 mb-4">
            <Text className="text-brand-textSecondary text-xs font-inter">
              {t.originalEntryLabel} · {entryCode}
            </Text>
            <View className="flex-row items-center justify-between">
              <Text className="text-brand-textSecondary text-xs font-inter">
                {isPayment ? t.paymentLabel : t.creditLabel} · {dateStr}
              </Text>
              <Text className="text-brand-navy text-base font-inter-bold">
                {formatLKR(entry.amount_minor)}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-brand-textSecondary text-xs font-inter">
                Note
              </Text>
              <Text className="text-brand-navy text-sm font-inter-medium">
                {entry.note || "—"}
              </Text>
            </View>
          </View>

          {/* Mandatory Reason Input */}
          <View className="mb-4">
            <Text className="text-brand-navy text-xs font-inter-semibold mb-1.5">
              {t.reasonForReversalLabel}
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder={t.reasonPlaceholder}
              placeholderTextColor="#64748B"
              className="min-h-[48px] px-3.5 py-2.5 bg-white rounded-xl border border-brand-border text-brand-navy text-base font-inter"
            />
          </View>

          {/* Reversal Preview Card */}
          <View className="p-4 bg-brand-surface rounded-2xl gap-3 mb-4">
            <Text className="text-brand-navy text-lg font-inter-semibold">
              {t.reversalPreviewTitle}
            </Text>
            <View className="flex-row items-center justify-between">
              <Text className="text-brand-textSecondary text-xs font-inter">
                {t.currentBalanceLabel}
              </Text>
              <Text className="text-brand-navy text-sm font-inter-medium">
                {formatLKR(curBalMinor)}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-brand-textSecondary text-xs font-inter">
                {t.entryReversedLabel}
              </Text>
              <Text className="text-brand-navy text-sm font-inter-medium">
                {isPayment ? "+" : "−"}
                {formatLKR(entry.amount_minor)}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-brand-textSecondary text-xs font-inter">
                {t.newBalanceLabel}
              </Text>
              <Text className="text-brand-navy text-base font-inter-bold">
                {formatLKR(newBalMinor)}
              </Text>
            </View>
          </View>

          {/* Audit Trail Info Box */}
          <View className="p-3.5 bg-blue-50 rounded-xl flex-row items-start gap-2.5">
            <Info size={20} color="#102F50" strokeWidth={2.2} />
            <View className="flex-1 gap-0.5">
              <Text className="text-brand-navy text-xs font-inter-semibold">
                {t.originalRetainedTitle}
              </Text>
              <Text className="text-brand-textSecondary text-xs font-inter leading-4">
                {t.originalRetainedSub}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Destructive Confirm / Keep Original */}
        <View
          className="px-5 pt-3 bg-white border-t border-slate-100 gap-2.5"
          style={{ paddingBottom: Math.max(insets.bottom, 20) }}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={submitting}
            onPress={handleConfirmReversal}
            className="h-12 px-4 bg-brand-error rounded-xl flex-row items-center justify-center gap-2"
          >
            {submitting && <ActivityIndicator size="small" color="#FFFFFF" />}
            <Text className="text-white text-base font-inter-semibold">
              {t.confirmReversalBtn} · {formatLKR(entry.amount_minor)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={submitting}
            onPress={() => router.back()}
            className="h-12 px-4 bg-white rounded-xl border border-brand-navy items-center justify-center"
          >
            <Text className="text-brand-navy text-base font-inter-semibold">
              {t.keepOriginalBtn}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}