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
import { ArrowLeft, Calendar, Info, AlertCircle } from "lucide-react-native";
import { useLanguage } from "../../../context/LanguageContext";
import { useAuth } from "../../../context/AuthContext";
import BottomNav from "../../../components/ui/BottomNav";
import {
  shopAndCustomerApi,
  CustomerItem,
  formatLKR,
  formatCustomerCode,
} from "../../../services/customerService";

export default function EditCustomerScreen() {
  const router = useRouter();
  const { id, code } = useLocalSearchParams<{ id: string; code?: string }>();
  const { t } = useLanguage();
  const { shop } = useAuth();
  const insets = useSafeAreaInsets();
  

  const [customer, setCustomer] = useState<CustomerItem | null>(null);
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [creditLimitLkr, setCreditLimitLkr] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await shopAndCustomerApi.getCustomer(id);
        setCustomer(data);
        setName(data.name || "");
        setNickname(data.nickname || "");
        setPhone(data.phone_number || "");
        setNotes(data.notes || "");
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

  const handleUpdate = async () => {
    if (!id || !customer) return;
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg("Customer name cannot be empty.");
      return;
    }

    let creditLimitMinor: number | undefined = undefined;
    if (creditLimitLkr.trim()) {
      const parsed = parseFloat(creditLimitLkr.replace(/,/g, ""));
      if (isNaN(parsed) || parsed < 0) {
        setErrorMsg("Please enter a valid credit limit.");
        return;
      }
      creditLimitMinor = Math.round(parsed * 100);
    }

    try {
      setSaving(true);
      await shopAndCustomerApi.updateCustomer(id, {
        name: name.trim(),
        nickname: nickname.trim() || "",
        phone_number: phone.trim() || undefined,
        notes: notes.trim() || "",
        credit_limit_minor: creditLimitMinor,
        expected_version: customer.entity_version,
      });
      router.back();
    } catch (err: any) {
      const apiErr =
        err.response?.data?.error?.message ||
        err.response?.data?.detail?.[0]?.msg;
      setErrorMsg(apiErr || "Could not update customer details.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#102F50" />
      </SafeAreaView>
    );
  }

  const displayCode = code || formatCustomerCode(id || "");
  const outMinor = customer?.balance_summary?.outstanding_balance_minor || 0;

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
              {t.editCustomerTitle}
            </Text>
            <Text className="text-brand-textSecondary text-xs font-inter mt-0.5">
              {customer?.name}
              {customer?.nickname ? ` (${customer.nickname})` : ""} •{" "}
              {displayCode}
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

          {/* Customer Name * */}
          <View className="mb-4">
            <Text className="text-brand-navy text-xs font-inter-semibold mb-1.5">
              {t.customerNameLabel}
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              className="min-h-[48px] px-3.5 py-2.5 bg-white rounded-xl border border-brand-border text-brand-navy text-base font-inter"
            />
          </View>

          {/* Nickname / Identifier */}
          <View className="mb-4">
            <Text className="text-brand-navy text-xs font-inter-semibold mb-1.5">
              {t.nicknameLabel}
            </Text>
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              placeholder={t.nicknamePlaceholder}
              placeholderTextColor="#64748B"
              className="min-h-[48px] px-3.5 py-2.5 bg-white rounded-xl border border-brand-border text-brand-navy text-base font-inter"
            />
            <Text className="text-brand-textSecondary text-xs font-sinhala mt-1">
              හඳුනාගැනීමේ නම
            </Text>
          </View>

          {/* Phone Number */}
          <View className="mb-4">
            <Text className="text-brand-navy text-xs font-inter-semibold mb-1.5">
              {t.phoneOptionalLabel}
            </Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder={t.phoneNotSupplied}
              placeholderTextColor="#64748B"
              keyboardType="phone-pad"
              className="min-h-[48px] px-3.5 py-2.5 bg-white rounded-xl border border-brand-border text-brand-navy text-base font-inter"
            />
            <Text className="text-brand-textSecondary text-xs font-inter mt-1">
              {t.phoneOptionalHint}
            </Text>
          </View>

          {/* Payment Due Date / Notes */}
          <View className="mb-4">
            <Text className="text-brand-navy text-xs font-inter-semibold mb-1.5">
              {t.dueDateOptionalLabel}
            </Text>
            <View className="min-h-[48px] px-3.5 bg-white rounded-xl border border-brand-border flex-row items-center">
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder={t.dueDatePlaceholder}
                placeholderTextColor="#64748B"
                className="flex-1 text-brand-navy text-base font-inter py-2"
              />
              <Calendar size={20} color="#102F50" strokeWidth={2} />
            </View>
          </View>

          {/* Credit Limit (LKR) */}
          <View className="mb-4">
            <Text className="text-brand-navy text-xs font-inter-semibold mb-1.5">
              {t.creditLimitOptionalLabel}
            </Text>
            <TextInput
              value={creditLimitLkr}
              onChangeText={setCreditLimitLkr}
              placeholder="0.00"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              className="min-h-[48px] px-3.5 py-2.5 bg-white rounded-xl border border-brand-border text-brand-navy text-base font-inter"
            />
          </View>

          {/* Ledger Safety Info Box */}
          <View className="p-3.5 bg-blue-50 rounded-xl flex-row items-start gap-2.5 mb-3">
            <Info size={20} color="#102F50" strokeWidth={2.2} />
            <View className="flex-1 gap-0.5">
              <Text className="text-brand-navy text-xs font-inter-semibold">
                {t.ledgerWillNotChangeTitle}
              </Text>
              <Text className="text-brand-textSecondary text-xs font-inter leading-4">
                {t.ledgerWillNotChangeSub} ({formatLKR(outMinor)})
              </Text>
            </View>
          </View>

          <Text className="text-brand-navy text-xs font-inter leading-4">
            {displayCode}: {t.permanentIdFooter}
          </Text>
        </ScrollView>

        {/* Bottom Cancel / Save Changes */}
        <View className="px-5 py-3 bg-white border-t border-slate-100 flex-row gap-3"
         style={{ paddingBottom: Math.max(insets.bottom, 10) + 75 }}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.back()}
            className="flex-1 h-12 bg-white rounded-xl border border-brand-navy items-center justify-center"
          >
            <Text className="text-brand-navy text-base font-inter-semibold">
              {t.cancelBtn}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={saving}
            onPress={handleUpdate}
            className="flex-1 h-12 bg-brand-navy rounded-xl flex-row items-center justify-center gap-2"
          >
            {saving && <ActivityIndicator size="small" color="#FFFFFF" />}
            <Text className="text-white text-base font-inter-semibold">
              {t.saveChangesBtn}
            </Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
              <BottomNav active="Customers" />

    </SafeAreaView>
  );
}