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
import { ArrowLeft, Calendar, Clock, AlertCircle } from "lucide-react-native";
import { useLanguage } from "../../../context/LanguageContext";
import { useAuth } from "../../../context/AuthContext";
import BottomNav from "../../../components/ui/BottomNav";
import {
  shopAndCustomerApi,
  CustomerItem,
  formatLKR,
  formatCustomerCode,
} from "../../../services/customerService";

export default function DueDateAndLimitScreen() {
  const router = useRouter();
  const { id, code } = useLocalSearchParams<{ id: string; code?: string }>();
  const { t } = useLanguage();
  const { shop } = useAuth();
  const insets = useSafeAreaInsets();

  const [customer, setCustomer] = useState<CustomerItem | null>(null);
  const [dueDateNote, setDueDateNote] = useState("");
  const [creditLimitLkr, setCreditLimitLkr] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const data = await shopAndCustomerApi.getCustomer(id);
        setCustomer(data);
        setDueDateNote(data.notes || "");
        if (data.credit_limit_minor != null) {
          setCreditLimitLkr((data.credit_limit_minor / 100).toFixed(2));
        }
      } catch {
        setErrorMsg("Failed to load customer details.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading || !customer) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#102F50" />
      </SafeAreaView>
    );
  }

  const displayCode = code || formatCustomerCode(customer.customer_id);
  const outMinor = customer.balance_summary?.outstanding_balance_minor || 0;
  const overdueMinor = customer.balance_summary?.overdue_balance_minor || 0;

  const parsedLimitLkr = parseFloat(creditLimitLkr.replace(/,/g, "")) || 0;
  const limitMinor =
    parsedLimitLkr > 0
      ? Math.round(parsedLimitLkr * 100)
      : customer.credit_limit_minor || 0;

  const usedPercent =
    limitMinor > 0 ? Math.min(100, (outMinor / limitMinor) * 100) : 0;
  const availableMinor = Math.max(0, limitMinor - outMinor);

  const handleSave = async () => {
    setErrorMsg(null);
    let newLimitMinor: number | undefined = undefined;
    if (creditLimitLkr.trim()) {
      const parsed = parseFloat(creditLimitLkr.replace(/,/g, ""));
      if (isNaN(parsed) || parsed < 0) {
        setErrorMsg("Please enter a valid credit limit.");
        return;
      }
      newLimitMinor = Math.round(parsed * 100);
    }

    try {
      setSaving(true);
      await shopAndCustomerApi.updateCustomer(customer.customer_id, {
        notes: dueDateNote.trim() || "",
        credit_limit_minor: newLimitMinor,
        expected_version: customer.entity_version,
      });
      router.back();
    } catch (err: any) {
      const apiErr =
        err.response?.data?.error?.message ||
        err.response?.data?.detail?.[0]?.msg;
      setErrorMsg(apiErr || "Could not update due date & limit.");
    } finally {
      setSaving(false);
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
              {t.dueDateLimitTitle}
            </Text>
            <Text className="text-brand-textSecondary text-xs font-inter mt-0.5">
              {customer.name} • {displayCode}
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

          {/* Navy Outstanding Balance Card */}
          <View className="p-4 bg-brand-navy rounded-2xl gap-2 mb-3">
            <Text className="text-slate-200 text-xs font-inter">
              {t.outstandingBalanceLabel}
            </Text>
            <Text className="text-white text-3xl font-inter-bold">
              {formatLKR(outMinor)}
            </Text>
            <Text className="text-slate-200 text-xs font-inter">
              {limitMinor > 0
                ? `${t.creditLimitDisplay} ${formatLKR(limitMinor)}`
                : t.noCreditLimitDisplay}
            </Text>
          </View>

          {/* Utilization Progress Bar */}
          {limitMinor > 0 && (
            <View className="mb-4">
              <View className="w-full h-2.5 bg-brand-surface rounded-full overflow-hidden mb-2">
                <View
                  style={{ width: `${usedPercent}%` }}
                  className={`h-full rounded-full ${
                    usedPercent >= 100
                      ? "bg-brand-error"
                      : usedPercent >= 80
                      ? "bg-brand-orange"
                      : "bg-brand-navy"
                  }`}
                />
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-brand-textSecondary text-xs font-inter">
                  {usedPercent.toFixed(1)}% {t.usedPercentLabel}
                </Text>
                <Text className="text-brand-navy text-sm font-inter-medium">
                  {formatLKR(availableMinor)} {t.availableShortLabel}
                </Text>
              </View>
            </View>
          )}

          {/* Payment Due Date Input */}
          <View className="mb-4">
            <Text className="text-brand-navy text-xs font-inter-semibold mb-1.5">
              {t.dueDateOptionalLabel}
            </Text>
            <View className="min-h-[48px] px-3.5 bg-white rounded-xl border border-brand-border flex-row items-center">
              <TextInput
                value={dueDateNote}
                onChangeText={setDueDateNote}
                placeholder={t.dueDatePlaceholder}
                placeholderTextColor="#64748B"
                className="flex-1 text-brand-navy text-base font-inter py-2"
              />
              <Calendar size={20} color="#102F50" strokeWidth={2} />
            </View>
          </View>

          {/* Credit Limit Input */}
          <View className="mb-4">
            <Text className="text-brand-navy text-xs font-inter-semibold mb-1.5">
              {t.creditLimitOptionalLabel}
            </Text>
            <TextInput
              value={creditLimitLkr}
              onChangeText={setCreditLimitLkr}
              placeholder="8000.00"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              className="min-h-[48px] px-3.5 py-2.5 bg-white rounded-xl border border-brand-border text-brand-navy text-base font-inter"
            />
          </View>

          {/* Overdue Warning Box */}
          {overdueMinor > 0 && (
            <View className="p-3.5 bg-amber-50 rounded-xl flex-row items-start gap-2.5 mb-3">
              <Clock size={20} color="#102F50" strokeWidth={2.2} />
              <View className="flex-1 gap-0.5">
                <Text className="text-brand-navy text-xs font-inter-semibold">
                  {t.chipOverdue} ({formatLKR(overdueMinor)})
                </Text>
                <Text className="text-brand-textSecondary text-xs font-inter leading-4">
                  Changing a date or limit does not change the customer’s ledger balance.
                </Text>
              </View>
            </View>
          )}

          <Text className="text-brand-textSecondary text-xs font-inter leading-4">
            Warnings appear near, at or above the limit. They inform your decision; they do not block it.
          </Text>
        </ScrollView>

        {/* Bottom Save Button (Floats above BottomNav) */}
        <View
          className="px-5 pt-3 bg-white border-t border-slate-100"
          style={{ paddingBottom: Math.max(insets.bottom, 20) + 75 }}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={saving}
            onPress={handleSave}
            className="h-12 px-4 bg-brand-navy rounded-xl flex-row items-center justify-center gap-2 shadow-sm"
          >
            {saving && <ActivityIndicator size="small" color="#FFFFFF" />}
            <Text className="text-white text-base font-inter-semibold">
              {t.saveDueDateLimitBtn}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Placed outside KeyboardAvoidingView so it stays fixed at the exact bottom */}
      <BottomNav active="Customers" />
    </SafeAreaView>
  );
}