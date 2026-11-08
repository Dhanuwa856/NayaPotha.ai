import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import {
  ArrowLeft,
  Clock,
  ChevronRight,
  PlusCircle,
} from "lucide-react-native";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import BottomNav from "../../components/ui/BottomNav";
import {
  shopAndCustomerApi,
  CustomerItem,
  formatLKR,
  formatCustomerCode,
} from "../../services/customerService";
import { api } from "../../services/api";

export default function CustomerDetailScreen() {
  const router = useRouter();
  const { id, code } = useLocalSearchParams<{ id: string; code?: string }>();
  const { t, lang } = useLanguage();
  const { shop } = useAuth();
  const insets = useSafeAreaInsets();

  const [customer, setCustomer] = useState<CustomerItem | null>(null);
  const [riskData, setRiskData] = useState<{
    category: string;
    reasons: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCustomerDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const cust = await shopAndCustomerApi.getCustomer(id);
      setCustomer(cust);

      // Fetch live AI / Rule-based Risk Assessment from GET /api/v1/risk/customers/{id}/latest
      try {
        const riskRes = await api.get(`/risk/customers/${id}/latest`);
        setRiskData(riskRes.data);
      } catch {
        setRiskData(null);
      }
    } catch (err) {
      console.log("Failed to load customer detail:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadCustomerDetails();
    }, [loadCustomerDetails])
  );

  if (loading && !customer) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#102F50" />
      </SafeAreaView>
    );
  }

  if (!customer) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center p-6">
        <Text className="text-brand-navy text-lg font-inter-bold">
          {t.noCustomersFound}
        </Text>
      </SafeAreaView>
    );
  }

  const displayCode = code || formatCustomerCode(customer.customer_id);
  const displayTitle = customer.nickname
    ? `${customer.name} (${customer.nickname})`
    : customer.name;
  const outMinor = customer.balance_summary?.outstanding_balance_minor || 0;
  const overdueMinor = customer.balance_summary?.overdue_balance_minor || 0;
  const availMinor = customer.balance_summary?.available_credit_minor;
  const limitMinor = customer.credit_limit_minor;

  const getRiskLabel = () => {
    const cat = riskData?.category || "LOW";
    if (cat === "HIGH") return t.riskHigh;
    if (cat === "MEDIUM") return t.riskMedium;
    return t.riskLow;
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
          <Text
            className={`text-brand-navy text-2xl ${
              lang === "si" ? "font-sinhala-bold" : "font-inter-bold"
            }`}
          >
            {displayTitle}
          </Text>
          <Text className="text-brand-textSecondary text-xs font-inter mt-0.5">
            {displayCode} • {customer.phone_number || t.phoneNotSupplied}
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadCustomerDetails();
            }}
          />
        }
      >
        {/* Navy Outstanding Balance Card */}
        <View className="p-4 bg-brand-navy rounded-2xl gap-2 mb-3">
          <Text className="text-slate-200 text-xs font-inter">
            {t.outstandingBalanceLabel}
          </Text>
          <Text className="text-white text-3xl font-inter-bold">
            {formatLKR(outMinor)}
          </Text>
          <Text className="text-slate-200 text-xs font-inter">
            {limitMinor != null
              ? `${t.creditLimitDisplay} ${formatLKR(limitMinor)}`
              : t.noCreditLimitDisplay}
          </Text>
        </View>

        {/* Overdue Alert Banner (Shown only when customer has overdue balance) */}
        {overdueMinor > 0 && (
          <View className="p-3.5 bg-amber-50 rounded-xl flex-row items-start gap-2.5 mb-3">
            <Clock size={20} color="#102F50" strokeWidth={2.2} />
            <View className="flex-1 gap-0.5">
              <Text className="text-brand-navy text-xs font-inter-semibold">
                {t.chipOverdue}
              </Text>
              <Text className="text-brand-textSecondary text-xs font-inter">
                {formatLKR(overdueMinor)} is past the due date.
              </Text>
            </View>
          </View>
        )}

        {/* Credit Available & Risk Estimate Card */}
        <View className="p-4 bg-brand-surface rounded-2xl gap-3 mb-4">
          {availMinor != null && (
            <View className="flex-row items-center justify-between">
              <Text className="text-brand-textSecondary text-xs font-inter">
                {t.creditAvailableLabel}
              </Text>
              <Text className="text-brand-navy text-sm font-inter-semibold">
                {formatLKR(availMinor)}
              </Text>
            </View>
          )}

          <View className="flex-row items-center justify-between">
            <Text className="text-brand-textSecondary text-xs font-inter">
              {t.riskEstimateLabel}
            </Text>
            <Text className="text-brand-navy text-sm font-inter-semibold">
              {getRiskLabel()}
            </Text>
          </View>

          <Text className="text-brand-textSecondary text-xs font-inter leading-4">
            {riskData?.reasons?.[0] || t.riskAdvisoryNote}
          </Text>
        </View>

        {/* Metadata Summary */}
        <View className="gap-1 mb-4">
          <Text className="text-brand-textSecondary text-xs font-inter">
            Customer name: {customer.name}
          </Text>
          <Text className="text-brand-textSecondary text-xs font-inter">
            Nickname / Identifier: {customer.nickname || "—"}
          </Text>
          <Text className="text-brand-textSecondary text-xs font-inter">
            {t.permanentCustomerId}: {displayCode}
          </Text>
          {customer.notes ? (
            <Text className="text-brand-textSecondary text-xs font-inter">
              Notes: {customer.notes}
            </Text>
          ) : null}
        </View>

        {/* View History Row */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() =>
            router.push({
              pathname: "/ledger/history",
              params: { customer_id: customer.customer_id, name: displayTitle },
            } as any)
          }
          className="px-4 py-3.5 bg-white rounded-xl border border-brand-border flex-row items-center justify-between mb-4"
        >
          <View className="flex-1 pr-3">
            <Text className="text-brand-navy text-base font-inter-semibold">
              {t.viewHistoryTitle}
            </Text>
            <Text className="text-brand-textSecondary text-xs font-inter mt-0.5">
              {t.viewHistorySub}
            </Text>
          </View>
          <ChevronRight size={20} color="#102F50" />
        </TouchableOpacity>

        {/* Edit Details & Due Date/Limit Buttons */}
        <View className="flex-row gap-3">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: "/customers/edit/[id]",
                params: { id: customer.customer_id, code: displayCode },
              } as any)
            }
            className="flex-1 h-12 px-4 bg-white rounded-xl border border-brand-navy items-center justify-center"
          >
            <Text className="text-brand-navy text-base font-inter-semibold">
              {t.editDetailsBtn}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: "/customers/edit/[id]",
                params: { id: customer.customer_id, code: displayCode },
              } as any)
            }
            className="flex-1 h-12 px-4 bg-white rounded-xl border border-brand-navy items-center justify-center"
          >
            <Text className="text-brand-navy text-base font-inter-semibold">
              {t.dueDateLimitBtn}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Sticky Add Credit / Record Payment Actions */}
      <View
        className="px-5 pt-3 bg-white border-t border-slate-100 flex-row gap-3"
        style={{ paddingBottom: Math.max(insets.bottom, 20) + 75 }}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() =>
            router.push({
              pathname: "/ledger/add-credit",
              params: { customer_id: customer.customer_id, name: displayTitle },
            } as any)
          }
          className="flex-1 h-12 px-4 bg-brand-navy rounded-xl flex-row items-center justify-center gap-2 shadow-sm"
        >
          <PlusCircle size={18} color="#FFFFFF" strokeWidth={2.2} />
          <Text className="text-white text-base font-inter-semibold">
            {t.addCredit}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() =>
            router.push({
              pathname: "/ledger/record-payment",
              params: { customer_id: customer.customer_id, name: displayTitle },
            } as any)
          }
          className="flex-1 h-12 px-4 bg-white rounded-xl border border-brand-navy items-center justify-center"
        >
          <Text className="text-brand-navy text-base font-inter-semibold">
            {t.recordPayment}
          </Text>
        </TouchableOpacity>
      </View>

      <BottomNav active="Customers" />
    </SafeAreaView>
  );
}