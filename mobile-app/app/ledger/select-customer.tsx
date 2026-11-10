import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { ArrowLeft, ChevronRight, CheckCircle2 } from "lucide-react-native";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import {
  shopAndCustomerApi,
  CustomerItem,
  formatLKR,
  getInitials,
  formatCustomerCode,
} from "../../services/customerService";

export default function SelectCustomerScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type?: "CREDIT_SALE" | "PAYMENT" }>();
  const { t } = useLanguage();
  const { shop } = useAuth();
  const insets = useSafeAreaInsets();

  const [txType, setTxType] = useState<"CREDIT_SALE" | "PAYMENT">(
    type === "PAYMENT" ? "PAYMENT" : "CREDIT_SALE"
  );
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<{
    customer: CustomerItem;
    code: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCustomers = useCallback(async (qText?: string) => {
    try {
      setLoading(true);
      const res = await shopAndCustomerApi.listCustomers({
        status: "ACTIVE",
        q: qText?.trim() || undefined,
        limit: 100,
      });
      setCustomers(res.items || []);
    } catch (e) {
      console.log("Error loading customers:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCustomers(searchQuery);
    }, [loadCustomers, searchQuery])
  );

  // Detect duplicate names
  const nameCounts = customers.reduce<Record<string, number>>((acc, c) => {
    const key = c.name.trim().toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const handleContinue = () => {
    if (!selectedCustomer) return;
    const { customer, code } = selectedCustomer;
    const targetPath =
      txType === "PAYMENT" ? "/ledger/record-payment" : "/ledger/add-credit";

    router.push({
      pathname: targetPath,
      params: {
        customer_id: customer.customer_id,
        code,
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
            {t.selectCustomerTitle}
          </Text>
          <Text className="text-brand-textSecondary text-xs font-inter mt-0.5">
            {t.step1Of3} •{" "}
            {txType === "PAYMENT" ? t.recordPayment : t.addCredit}
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
        {/* Mode Switcher Chips */}
        <View className="flex-row items-center gap-2 mb-4">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setTxType("CREDIT_SALE")}
            className={`min-h-[40px] px-3.5 py-2 rounded-xl items-center justify-center ${
              txType === "CREDIT_SALE" ? "bg-brand-navy" : "bg-brand-surface"
            }`}
          >
            <Text
              className={`text-xs font-inter-semibold ${
                txType === "CREDIT_SALE" ? "text-white" : "text-brand-navy"
              }`}
            >
              {t.addCredit}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setTxType("PAYMENT")}
            className={`min-h-[40px] px-3.5 py-2 rounded-xl items-center justify-center ${
              txType === "PAYMENT" ? "bg-brand-navy" : "bg-brand-surface"
            }`}
          >
            <Text
              className={`text-xs font-inter-semibold ${
                txType === "PAYMENT" ? "text-white" : "text-brand-navy"
              }`}
            >
              {t.recordPayment}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Find Customer Search */}
        <View className="mb-4">
          <Text className="text-brand-navy text-xs font-inter-semibold mb-1.5">
            {t.findCustomerLabel}
          </Text>
          <TextInput
            value={searchQuery}
            onChangeText={(txt) => {
              setSearchQuery(txt);
              setSelectedCustomer(null);
            }}
            placeholder={t.searchPlaceholder}
            placeholderTextColor="#64748B"
            className="min-h-[48px] px-3.5 py-2.5 bg-white rounded-xl border border-brand-border text-brand-navy text-base font-inter"
          />
        </View>

        {/* Customer List */}
        {loading ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#102F50" />
          </View>
        ) : customers.length === 0 ? (
          <View className="py-10 items-center">
            <Text className="text-brand-textSecondary text-base font-inter">
              {t.noCustomersFound}
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {customers.map((cust, index) => {
              const code = formatCustomerCode(cust.customer_id, index);
              const isSelected =
                selectedCustomer?.customer.customer_id === cust.customer_id;
              const isDuplicate =
                (nameCounts[cust.name.trim().toLowerCase()] || 0) > 1;
              const outMinor =
                cust.balance_summary?.outstanding_balance_minor || 0;
              const displayTitle = cust.nickname
                ? `${cust.name} (${cust.nickname})`
                : cust.name;

              return (
                <TouchableOpacity
                  key={cust.customer_id}
                  activeOpacity={0.85}
                  onPress={() => setSelectedCustomer({ customer: cust, code })}
                  className={`p-3 rounded-2xl flex-row items-center gap-3 ${
                    isSelected
                      ? "bg-brand-surface border-2 border-brand-navy"
                      : "bg-white border border-brand-border"
                  }`}
                >
                  <View className="w-10 h-10 bg-brand-surface rounded-xl items-center justify-center">
                    <Text className="text-brand-navy text-base font-inter-bold">
                      {getInitials(cust.name)}
                    </Text>
                  </View>

                  <View className="flex-1 gap-0.5">
                    <Text className="text-brand-navy text-sm font-inter-semibold">
                      {displayTitle}
                    </Text>
                    <Text className="text-brand-textSecondary text-xs font-inter">
                      {code}
                      {isDuplicate
                        ? " • Different customer • Check ID"
                        : cust.phone_number
                        ? ` • ${cust.phone_number}`
                        : ` • ${t.phoneNotSupplied}`}
                    </Text>
                    <Text className="text-brand-navy text-sm font-inter-bold">
                      {formatLKR(outMinor)}
                    </Text>
                  </View>

                  {isSelected ? (
                    <CheckCircle2 size={22} color="#102F50" strokeWidth={2.4} />
                  ) : (
                    <ChevronRight size={18} color="#64748B" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text className="text-brand-textSecondary text-xs font-inter leading-4 mt-4">
          {t.explicitSelectNote}
        </Text>
      </ScrollView>

      {/* Bottom Sticky Continue Button */}
      <View
        className="px-5 pt-3 bg-white border-t border-slate-100"
        style={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={!selectedCustomer}
          onPress={handleContinue}
          className={`h-12 px-4 rounded-xl items-center justify-center ${
            selectedCustomer ? "bg-brand-navy" : "bg-slate-200"
          }`}
        >
          <Text
            className={`text-base font-inter-semibold ${
              selectedCustomer ? "text-white" : "text-slate-500"
            }`}
          >
            {selectedCustomer
              ? t.continueWithCustomerBtn
              : t.selectCustomerBtnDisabled}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}