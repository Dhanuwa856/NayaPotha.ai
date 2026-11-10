import React, { useState } from "react";
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
import { useRouter } from "expo-router";
import { ArrowLeft, Info, Calendar, AlertCircle } from "lucide-react-native";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import BottomNav from "../../components/ui/BottomNav";
import { shopAndCustomerApi } from "../../services/customerService";

export default function AddCustomerScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { shop } = useAuth();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [dueDateNote, setDueDateNote] = useState("");
  const [creditLimitLkr, setCreditLimitLkr] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = async () => {
    setErrorMsg(null);
    if (!name.trim()) {
      setErrorMsg("Customer name is required.");
      return;
    }

    let creditLimitMinor: number | null = null;
    if (creditLimitLkr.trim()) {
      const parsed = parseFloat(creditLimitLkr.replace(/,/g, ""));
      if (isNaN(parsed) || parsed < 0) {
        setErrorMsg("Please enter a valid credit limit amount.");
        return;
      }
      creditLimitMinor = Math.round(parsed * 100);
    }

    try {
      setSaving(true);
      const created = await (shopAndCustomerApi as any).createCustomer({
        name: name.trim(),
        nickname: nickname.trim() || null,
        phone_number: phone.trim() || null,
        notes: dueDateNote.trim() ? `Due date: ${dueDateNote.trim()}` : null,
        credit_limit_minor: creditLimitMinor,
      });

      // Navigate straight to the newly created customer's profile
      router.replace({
        pathname: "/customers/[id]",
        params: { id: created.customer_id },
      } as any);
    } catch (err: any) {
      const apiErr =
        err.response?.data?.error?.message ||
        err.response?.data?.detail?.[0]?.msg;
      setErrorMsg(apiErr || "Could not save customer. Please check inputs.");
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
              {t.addCustomerBtn}
            </Text>
            <Text className="text-brand-textSecondary text-sm font-inter mt-0.5">
              {t.addCustomerSub}
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
          {/* Auto Customer ID Info Banner */}
          <View className="p-3.5 bg-blue-50 rounded-xl flex-row items-start gap-2.5 mb-4">
            <Info size={20} color="#102F50" strokeWidth={2.2} />
            <View className="flex-1 gap-1">
              <Text className="text-brand-navy text-xs font-inter-semibold">
                {t.autoIdBannerTitle}
              </Text>
              <Text className="text-brand-textSecondary text-xs font-inter leading-4">
                {t.autoIdBannerSub}
              </Text>
            </View>
          </View>

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
              placeholder={t.customerNamePlaceholder}
              placeholderTextColor="#64748B"
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
              className="min-h-[48px] px-3.5 py-2.5 bg-white rounded-xl border border-brand-border text-brand-navy text-base font-sinhala-medium"
            />
            <Text className="text-brand-textSecondary text-xs font-sinhala mt-1">
              {t.nicknameExamples}
            </Text>
          </View>

          {/* Phone Number (optional) */}
          <View className="mb-4">
            <Text className="text-brand-navy text-xs font-inter-semibold mb-1.5">
              {t.phoneOptionalLabel}
            </Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder={t.phoneOptionalPlaceholder}
              placeholderTextColor="#64748B"
              keyboardType="phone-pad"
              className="min-h-[48px] px-3.5 py-2.5 bg-white rounded-xl border border-brand-border text-brand-navy text-base font-inter"
            />
            <Text className="text-brand-textSecondary text-xs font-inter mt-1">
              {t.phoneOptionalHint}
            </Text>
          </View>

          {/* Payment Due Date / Note (optional) */}
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

          {/* Credit Limit (optional, LKR) */}
          <View className="mb-4">
            <Text className="text-brand-navy text-xs font-inter-semibold mb-1.5">
              {t.creditLimitOptionalLabel}
            </Text>
            <TextInput
              value={creditLimitLkr}
              onChangeText={setCreditLimitLkr}
              placeholder={t.creditLimitPlaceholder}
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              className="min-h-[48px] px-3.5 py-2.5 bg-white rounded-xl border border-brand-border text-brand-navy text-base font-inter"
            />
          </View>

          <Text className="text-brand-textSecondary text-xs font-inter leading-4 mt-1">
            {t.noOpeningDebtNote}
          </Text>
        </ScrollView>

        {/* Bottom Cancel / Save Actions */}
        <View 
          className="px-5 pt-3 bg-white border-t border-slate-100 flex-row gap-3"
          style={{ paddingBottom: Math.max(insets.bottom, 20) + 75 }}
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
            onPress={handleSave}
            className="flex-1 h-12 bg-brand-navy rounded-xl flex-row items-center justify-center gap-2 shadow-sm"
          >
            {saving && <ActivityIndicator size="small" color="#FFFFFF" />}
            <Text className="text-white text-base font-inter-semibold">
              {t.saveCustomerBtn}
            </Text>
          </TouchableOpacity>
        </View>
 </KeyboardAvoidingView>
        <BottomNav active="Customers" />
     
    </SafeAreaView>
  );
}