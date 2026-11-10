import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  ChevronDown,
  Users,
  CheckCircle2,
  Circle,
} from "lucide-react-native";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import {
  CustomerItem,
  formatLKR,
  getInitials,
  formatCustomerCode,
} from "../../services/customerService";
import { voiceAndRiskApi } from "../../services/voiceAndRiskService";

export default function CheckVoiceResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    transcript?: string;
    voice_lang?: "si" | "en";
    type?: "CREDIT_SALE" | "PAYMENT";
    amount_minor?: string;
  }>();

  const { t } = useLanguage();
  const { shop } = useAuth();
  const insets = useSafeAreaInsets();

  const [txType, setTxType] = useState<"CREDIT_SALE" | "PAYMENT">(
    params.type === "PAYMENT" ? "PAYMENT" : "CREDIT_SALE"
  );
  const [amountLkr, setAmountLkr] = useState(() => {
    const minor = parseInt(params.amount_minor || "200000", 10);
    return (minor / 100).toFixed(2);
  });

  const [matchingCustomers, setMatchingCustomers] = useState<CustomerItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<{
    customer: CustomerItem;
    code: string;
  } | null>(null);

  // Bottom sheet modal state
  const [sheetVisible, setSheetVisible] = useState(false);
  const [tempSelected, setTempSelected] = useState<{
    customer: CustomerItem;
    code: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await voiceAndRiskApi.parseVoiceCommand(
          params.transcript || "",
          params.voice_lang || "si"
        );
        setMatchingCustomers(res.matchingCustomers);
      } catch (e) {
        console.log("Failed to match voice customers:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [params.transcript]);

  const parsedAmount = parseFloat(amountLkr.replace(/,/g, "")) || 0;
  const amountMinor = Math.max(0, Math.round(parsedAmount * 100));

  const currentBalMinor =
    selectedCustomer?.customer.balance_summary?.outstanding_balance_minor || 0;
  const projectedBalMinor =
    txType === "PAYMENT"
      ? Math.max(0, currentBalMinor - amountMinor)
      : currentBalMinor + amountMinor;

  const openCustomerSheet = () => {
    setTempSelected(selectedCustomer);
    setSheetVisible(true);
  };

  const confirmSheetSelection = () => {
    if (!tempSelected) return;
    setSelectedCustomer(tempSelected);
    setSheetVisible(false);
  };

  const handleContinueToFinalReview = () => {
    if (!selectedCustomer || amountMinor <= 0) return;
    router.push({
      pathname: "/voice/confirm",
      params: {
        customer_id: selectedCustomer.customer.customer_id,
        customer_name: selectedCustomer.customer.name,
        nickname: selectedCustomer.customer.nickname || "",
        code: selectedCustomer.code,
        type: txType,
        amount_minor: String(amountMinor),
        current_balance_minor: String(currentBalMinor),
        transcript: params.transcript || "",
      },
    } as any);
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
            {t.checkVoiceResultTitle}
          </Text>
          <Text className="text-brand-textSecondary text-xs font-inter mt-0.5">
            {selectedCustomer ? t.customerSelectedSub : t.editableDraftSub}
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
        {/* Recognized Command Box */}
        <View className="p-4 bg-brand-surface rounded-2xl gap-1.5 mb-4">
          <Text className="text-brand-textSecondary text-xs font-inter">
            {t.recognizedCommandLabel} ·{" "}
            {params.voice_lang === "en" ? "ENGLISH" : "SINHALA"}
          </Text>
          <Text className="text-brand-navy text-base font-sinhala-medium leading-6">
            {params.transcript || "පාලිතට රු. 2,000ක ණයක් සටහන් කරන්න."}
          </Text>
        </View>

        {loading ? (
          <View className="py-8 items-center">
            <ActivityIndicator size="large" color="#102F50" />
          </View>
        ) : !selectedCustomer ? (
          <>
            {/* Unselected Customer Dropdown Trigger */}
            <View className="mb-3">
              <Text className="text-brand-navy text-xs font-inter-semibold mb-1.5">
                Customer · {matchingCustomers.length} {t.matchingCustomersLabel}
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={openCustomerSheet}
                className="min-h-[48px] px-3.5 py-2.5 bg-white rounded-xl border border-brand-border flex-row items-center justify-between"
              >
                <Text className="text-brand-textSecondary text-base font-inter">
                  {t.chooseCustomerPlaceholder}
                </Text>
                <ChevronDown size={20} color="#102F50" />
              </TouchableOpacity>
            </View>

            {/* Bilingual Duplicate Warning Banner */}
            <View className="p-3.5 bg-orange-50 rounded-xl gap-1.5 mb-4">
              <Text className="text-brand-navy text-xs font-inter-semibold leading-5">
                {t.duplicateWarningEn}
              </Text>
              <Text className="text-brand-navy text-sm font-sinhala-medium leading-6">
                {t.duplicateWarningSi}
              </Text>
            </View>
          </>
        ) : (
          <>
            {/* Selected Customer Projected Balance Card */}
            <View className="p-4 bg-brand-surface rounded-2xl gap-2 mb-3">
              <Text className="text-brand-navy text-base font-inter-semibold">
                {selectedCustomer.customer.name}
                {selectedCustomer.customer.nickname
                  ? ` (${selectedCustomer.customer.nickname})`
                  : ""}{" "}
                · {selectedCustomer.code}
              </Text>
              <Text className="text-brand-navy text-sm font-inter">
                Customer name: {selectedCustomer.customer.name} · Nickname:{" "}
                {selectedCustomer.customer.nickname || "—"}
              </Text>
              <Text className="text-brand-textSecondary text-xs font-inter mb-1">
                Immutable customer ID: {selectedCustomer.code} · Explicit choice
              </Text>

              <View className="flex-row items-center justify-between">
                <Text className="text-brand-textSecondary text-sm font-inter">
                  {t.currentBalanceLabel}
                </Text>
                <Text className="text-brand-navy text-sm font-inter-medium">
                  {formatLKR(currentBalMinor)}
                </Text>
              </View>

              <View className="flex-row items-center justify-between">
                <Text className="text-brand-textSecondary text-sm font-inter">
                  Draft · {txType === "PAYMENT" ? t.recordPayment : t.addCredit}
                </Text>
                <Text className="text-brand-navy text-sm font-inter-medium">
                  {txType === "PAYMENT" ? "− " : "+ "}
                  {formatLKR(amountMinor)}
                </Text>
              </View>

              <View className="h-[1px] bg-brand-border my-1" />

              <View className="flex-row items-center justify-between">
                <Text className="text-brand-textSecondary text-sm font-inter">
                  {t.projectedBalanceLabel}
                </Text>
                <Text className="text-brand-navy text-base font-inter-bold">
                  {formatLKR(projectedBalMinor)}
                </Text>
              </View>
            </View>

            {/* Change Customer Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={openCustomerSheet}
              className="h-12 px-4 bg-white rounded-xl border border-brand-navy items-center justify-center mb-4"
            >
              <Text className="text-brand-navy text-base font-inter-semibold">
                {t.changeCustomerBtn}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Editable Transaction Type */}
        <View className="mb-4">
          <Text className="text-brand-navy text-xs font-inter-semibold mb-1.5">
            {t.txTypeLabel} · Edit
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              setTxType(txType === "CREDIT_SALE" ? "PAYMENT" : "CREDIT_SALE")
            }
            className="min-h-[48px] px-3.5 py-2.5 bg-white rounded-xl border border-brand-border flex-row items-center justify-between"
          >
            <Text className="text-brand-navy text-base font-inter">
              {txType === "PAYMENT" ? t.recordPayment : t.addCredit}
            </Text>
            <ChevronDown size={20} color="#102F50" />
          </TouchableOpacity>
        </View>

        {/* Editable Amount (LKR) */}
        <View className="mb-4">
          <Text className="text-brand-navy text-xs font-inter-semibold mb-1.5">
            {t.amountLkrLabel} · Edit
          </Text>
          <TextInput
            value={amountLkr}
            onChangeText={setAmountLkr}
            keyboardType="decimal-pad"
            className="min-h-[48px] px-3.5 py-2.5 bg-white rounded-xl border border-brand-border text-brand-navy text-base font-inter-medium"
          />
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Area */}
      <View
        className="px-5 pt-3 bg-white border-t border-slate-100 gap-2.5"
        style={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={!selectedCustomer || amountMinor <= 0}
          onPress={handleContinueToFinalReview}
          className={`h-12 px-4 rounded-xl items-center justify-center ${
            selectedCustomer ? "bg-brand-navy" : "bg-slate-100"
          }`}
        >
          <Text
            className={`text-base font-inter-semibold ${
              selectedCustomer ? "text-white" : "text-slate-500"
            }`}
          >
            {selectedCustomer
              ? t.continueToFinalReviewBtn
              : t.selectCustomerBtnDisabled}
          </Text>
        </TouchableOpacity>

        {selectedCustomer && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.back()}
            className="h-12 px-4 bg-white rounded-xl border border-brand-navy items-center justify-center"
          >
            <Text className="text-brand-navy text-base font-inter-semibold">
              {t.cancelBtn}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Choose Customer Bottom Sheet Modal */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetVisible(false)}
      >
        <View className="flex-1 bg-sky-950/30 justify-end">
          <View
            className="bg-white rounded-tl-[20px] rounded-tr-[20px] px-5 pt-3 max-h-[82%]"
            style={{ paddingBottom: Math.max(insets.bottom, 24) }}
          >
            {/* Drag Handle */}
            <View className="items-center mb-3">
              <View className="w-10 h-1 bg-slate-200 rounded-full" />
            </View>

            {/* Sheet Header */}
            <View className="flex-row items-center gap-3 mb-2">
              <Users size={22} color="#102F50" strokeWidth={2.2} />
              <Text className="text-brand-navy text-xl font-inter-semibold">
                {t.chooseCustomerPlaceholder}
              </Text>
            </View>

            {/* Warning Banner */}
            <View className="p-3 bg-amber-50 rounded-xl mb-3">
              <Text className="text-brand-navy text-sm font-sinhala-semibold leading-5">
                {t.duplicateWarningSi}
              </Text>
            </View>

            <ScrollView className="mb-3" style={{ maxHeight: 300 }}>
              <View className="gap-3">
                {matchingCustomers.map((cust, index) => {
                  const code = formatCustomerCode(cust.customer_id, index);
                  const isChosen =
                    tempSelected?.customer.customer_id === cust.customer_id;
                  const outMinor =
                    cust.balance_summary?.outstanding_balance_minor || 0;
                  const title = cust.nickname
                    ? `${cust.name} (${cust.nickname})`
                    : cust.name;

                  return (
                    <TouchableOpacity
                      key={cust.customer_id}
                      activeOpacity={0.85}
                      onPress={() => setTempSelected({ customer: cust, code })}
                      className={`p-3 rounded-2xl flex-row items-center gap-3 ${
                        isChosen
                          ? "bg-brand-surface border-2 border-brand-navy"
                          : "bg-white border border-brand-border"
                      }`}
                    >
                      <View className="w-10 h-10 bg-brand-surface rounded-xl items-center justify-center">
                        <Text className="text-brand-navy text-base font-inter-semibold">
                          {getInitials(cust.name)}
                        </Text>
                      </View>
                      <View className="flex-1 gap-0.5">
                        <Text className="text-brand-navy text-base font-sinhala-semibold">
                          {title}
                        </Text>
                        <Text className="text-brand-textSecondary text-sm font-inter">
                          {code} · Select
                        </Text>
                        <Text className="text-brand-navy text-sm font-inter-medium">
                          {t.chipOutstanding} · {formatLKR(outMinor)}
                        </Text>
                      </View>
                      {isChosen ? (
                        <CheckCircle2
                          size={22}
                          color="#102F50"
                          strokeWidth={2.4}
                        />
                      ) : (
                        <Circle size={20} color="#64748B" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <Text className="text-brand-textSecondary text-sm font-inter leading-5 mb-3">
              {t.sheetSubtitle}
            </Text>

            {/* Sheet Continue & Cancel Buttons */}
            <View className="gap-2">
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={!tempSelected}
                onPress={confirmSheetSelection}
                className={`h-12 px-4 rounded-xl items-center justify-center ${
                  tempSelected ? "bg-brand-navy" : "bg-slate-100"
                }`}
              >
                <Text
                  className={`text-base font-inter-semibold ${
                    tempSelected ? "text-white" : "text-slate-500"
                  }`}
                >
                  {t.continueBtn}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setSheetVisible(false)}
                className="h-12 px-4 bg-white rounded-xl border border-brand-navy items-center justify-center"
              >
                <Text className="text-brand-navy text-base font-inter-semibold">
                  {t.cancelBtn}
                </Text>
              </TouchableOpacity>

              <Text className="text-brand-textSecondary text-xs font-inter mt-1">
                {t.sheetCancelNote}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}