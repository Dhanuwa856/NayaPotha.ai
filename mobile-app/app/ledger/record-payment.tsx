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
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react-native";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import {
  shopAndCustomerApi,
  CustomerItem,
  formatLKR,
  getInitials,
  formatCustomerCode,
} from "../../services/customerService";

export default function RecordPaymentScreen() {
  const router = useRouter();
  const { customer_id, code } = useLocalSearchParams<{
    customer_id: string;
    code?: string;
  }>();
  const { t } = useLanguage();
  const { shop } = useAuth();
  const insets = useSafeAreaInsets();

  const [customer, setCustomer] = useState<CustomerItem | null>(null);
  const [amountLkr, setAmountLkr] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!customer_id) {
      router.replace({
        pathname: "/ledger/select-customer",
        params: { type: "PAYMENT" },
      } as any);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const data = await shopAndCustomerApi.getCustomer(customer_id);
        setCustomer(data);
      } catch {
        setErrorMsg("Could not load customer details.");
      } finally {
        setLoading(false);
      }
    })();
  }, [customer_id]);

  if (loading || !customer) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#102F50" />
      </SafeAreaView>
    );
  }

  const displayCode = code || formatCustomerCode(customer.customer_id);
  const currentBalanceMinor =
    customer.balance_summary?.outstanding_balance_minor || 0;
  const parsedAmount = parseFloat(amountLkr.replace(/,/g, "")) || 0;
  const amountMinor = Math.max(0, Math.round(parsedAmount * 100));
  const newBalanceMinor = Math.max(0, currentBalanceMinor - amountMinor);

  const todayFormatted = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const handleReviewPayment = () => {
    setErrorMsg(null);
    if (amountMinor <= 0) {
      setErrorMsg("Please enter a valid payment amount greater than 0.");
      return;
    }

    router.push({
      pathname: "/ledger/review",
      params: {
        customer_id: customer.customer_id,
        customer_name: customer.name,
        code: displayCode,
        phone: customer.phone_number || "",
        type: "PAYMENT",
        amount_minor: String(amountMinor),
        current_balance_minor: String(currentBalanceMinor),
        credit_limit_minor:
          customer.credit_limit_minor != null
            ? String(customer.credit_limit_minor)
            : "",
        overdue_minor: String(
          customer.balance_summary?.overdue_balance_minor || 0
        ),
        note: note.trim(),
        due_date: "",
      },
    } as any);
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
              {t.recordPayment}
            </Text>
            <Text className="text-brand-textSecondary text-xs font-inter mt-0.5">
              {t.step2Of3Draft}
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

          {/* Selected Customer Card */}
          <View className="p-3 bg-brand-surface rounded-2xl border-2 border-brand-navy flex-row items-center gap-3 mb-4">
            <View className="w-10 h-10 bg-white rounded-xl items-center justify-center">
              <Text className="text-brand-navy text-base font-inter-bold">
                {getInitials(customer.name)}
              </Text>
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-brand-navy text-sm font-inter-semibold">
                {customer.name}
              </Text>
              <Text className="text-brand-textSecondary text-xs font-inter">
                {displayCode} • {t.selectedLabel}
              </Text>
              <Text className="text-brand-navy text-sm font-inter-bold">
                {formatLKR(currentBalanceMinor)}
              </Text>
            </View>
            <CheckCircle2 size={22} color="#102F50" strokeWidth={2.4} />
          </View>

          {/* Payment Received Input Box */}
          <View className="p-5 rounded-[20px] border-2 border-brand-navy bg-white mb-4">
            <Text className="text-brand-textSecondary text-xs font-inter mb-1">
              {t.paymentReceivedLkrLabel}
            </Text>
            <TextInput
              value={amountLkr}
              onChangeText={setAmountLkr}
              placeholder="0.00"
              placeholderTextColor="#94A3B8"
              keyboardType="decimal-pad"
              className="text-brand-navy text-3xl font-inter-bold p-0"
            />
            <View className="w-8 h-1 bg-brand-orange rounded-full mt-2" />
          </View>

          {/* Balance Summary Box */}
          <View className="p-4 bg-brand-surface rounded-2xl gap-3 mb-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-brand-textSecondary text-xs font-inter">
                {t.outstandingNowLabel}
              </Text>
              <Text className="text-brand-navy text-sm font-inter-medium">
                {formatLKR(currentBalanceMinor)}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-brand-textSecondary text-xs font-inter">
                {t.balanceAfterPaymentLabel}
              </Text>
              <Text className="text-brand-navy text-base font-inter-bold">
                {formatLKR(newBalanceMinor)}
              </Text>
            </View>
          </View>

          {/* Partial Payments Green Banner */}
          <View className="p-3.5 bg-green-50 rounded-xl flex-row items-start gap-2.5 mb-4">
            <CheckCircle2 size={20} color="#16A36A" strokeWidth={2.2} />
            <View className="flex-1 gap-0.5">
              <Text className="text-brand-success text-xs font-inter-semibold">
                {t.partialPaymentsTitle}
              </Text>
              <Text className="text-brand-textSecondary text-xs font-inter leading-4">
                {amountMinor > 0
                  ? `${formatLKR(amountMinor)} reduces the debt. ${formatLKR(
                      newBalanceMinor
                    )} will remain outstanding.`
                  : t.partialPaymentsSub}
              </Text>
            </View>
          </View>

          {/* Note Input */}
          <View className="mb-4">
            <Text className="text-brand-navy text-xs font-inter-semibold mb-1.5">
              {t.noteOptionalLabel}
            </Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t.notePlaceholderPayment}
              placeholderTextColor="#64748B"
              className="min-h-[48px] px-3.5 py-2.5 bg-white rounded-xl border border-brand-border text-brand-navy text-base font-inter"
            />
          </View>

          {/* Date Row */}
          <View className="flex-row items-center justify-between">
            <Text className="text-brand-textSecondary text-xs font-inter">
              {t.dateLabel}
            </Text>
            <Text className="text-brand-navy text-sm font-inter-medium">
              {todayFormatted}
            </Text>
          </View>
        </ScrollView>

        {/* Bottom Review Payment Button */}
        <View
          className="px-5 pt-3 bg-white border-t border-slate-100"
          style={{ paddingBottom: Math.max(insets.bottom, 20) }}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleReviewPayment}
            className="h-12 px-4 bg-brand-navy rounded-xl items-center justify-center"
          >
            <Text className="text-white text-base font-inter-semibold">
              {t.reviewPaymentBtn}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}