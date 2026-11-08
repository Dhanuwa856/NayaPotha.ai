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
import {
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Mic,
  AlertCircle,
} from "lucide-react-native";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import {
  shopAndCustomerApi,
  CustomerItem,
  formatLKR,
  getInitials,
  formatCustomerCode,
} from "../../services/customerService";

export default function AddCreditScreen() {
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
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!customer_id) {
      router.replace({
        pathname: "/ledger/select-customer",
        params: { type: "CREDIT_SALE" },
      } as any);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const data = await shopAndCustomerApi.getCustomer(customer_id);
        setCustomer(data);
        // Default due date 7 days from today (YYYY-MM-DD)
        const d = new Date();
        d.setDate(d.getDate() + 7);
        setDueDate(d.toISOString().slice(0, 10));
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
  const newBalanceMinor = currentBalanceMinor + amountMinor;

  const handleContinueToReview = () => {
    setErrorMsg(null);
    if (amountMinor <= 0) {
      setErrorMsg("Please enter a valid credit amount greater than 0.");
      return;
    }
    if (dueDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate.trim())) {
      setErrorMsg("Due date must be in YYYY-MM-DD format (e.g. 2026-11-20).");
      return;
    }

    router.push({
      pathname: "/ledger/review",
      params: {
        customer_id: customer.customer_id,
        customer_name: customer.name,
        code: displayCode,
        phone: customer.phone_number || "",
        type: "CREDIT_SALE",
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
        due_date: dueDate.trim(),
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
              {t.addCredit}
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

          {/* Large Amount Input Box */}
          <View className="p-5 rounded-[20px] border-2 border-brand-navy bg-white mb-3">
            <Text className="text-brand-textSecondary text-xs font-inter mb-1">
              {t.amountLkrLabel}
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

          {/* Current -> New Balance Preview */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-brand-textSecondary text-xs font-inter">
              {t.currentToNewBalance}
            </Text>
            <Text className="text-brand-navy text-sm font-inter-semibold">
              {formatLKR(currentBalanceMinor)} → {formatLKR(newBalanceMinor)}
            </Text>
          </View>

          {/* Note Input */}
          <View className="mb-4">
            <Text className="text-brand-navy text-xs font-inter-semibold mb-1.5">
              {t.noteOptionalLabel}
            </Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t.notePlaceholderCredit}
              placeholderTextColor="#64748B"
              className="min-h-[48px] px-3.5 py-2.5 bg-white rounded-xl border border-brand-border text-brand-navy text-base font-inter"
            />
          </View>

          {/* Due Date Input */}
          <View className="mb-4">
            <Text className="text-brand-navy text-xs font-inter-semibold mb-1.5">
              {t.dueDateLabel}
            </Text>
            <View className="min-h-[48px] px-3.5 bg-white rounded-xl border border-brand-border flex-row items-center">
              <TextInput
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#64748B"
                className="flex-1 text-brand-navy text-base font-inter py-2"
              />
              <Calendar size={20} color="#102F50" strokeWidth={2} />
            </View>
          </View>

          {/* Credit Limit Row */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-brand-textSecondary text-xs font-inter">
              {t.creditLimitDisplay}
            </Text>
            <Text className="text-brand-navy text-sm font-inter-medium">
              {customer.credit_limit_minor != null
                ? formatLKR(customer.credit_limit_minor)
                : t.noCreditLimitDisplay}
            </Text>
          </View>

          {/* Use Voice Instead Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            className="h-12 px-4 bg-white rounded-xl border border-brand-navy flex-row items-center justify-center gap-2 mb-3"
          >
            <Mic size={18} color="#102F50" strokeWidth={2.2} />
            <Text className="text-brand-navy text-base font-inter-semibold">
              {t.useVoiceInsteadBtn}
            </Text>
          </TouchableOpacity>

          <Text className="text-brand-textSecondary text-xs font-inter leading-4">
            {t.draftCreditFooter}
          </Text>
        </ScrollView>

        {/* Bottom Continue to Review */}
        <View
          className="px-5 pt-3 bg-white border-t border-slate-100"
          style={{ paddingBottom: Math.max(insets.bottom, 20) }}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleContinueToReview}
            className="h-12 px-4 bg-brand-navy rounded-xl items-center justify-center"
          >
            <Text className="text-white text-base font-inter-semibold">
              {t.continueToReviewBtn}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}