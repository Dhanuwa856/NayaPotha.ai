import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Info } from "lucide-react-native";
import { useLanguage } from "../../../context/LanguageContext";
import { useAuth } from "../../../context/AuthContext";
import BottomNav from "../../../components/ui/BottomNav";
import {
  shopAndCustomerApi,
  CustomerItem,
  formatLKR,
  formatCustomerCode,
} from "../../../services/customerService";
import {
  voiceAndRiskApi,
  RiskEstimateDetail,
} from "../../../services/voiceAndRiskService";

export default function CreditRiskEstimateScreen() {
  const router = useRouter();
  const { id, code } = useLocalSearchParams<{ id: string; code?: string }>();
  const { t } = useLanguage();
  const { shop } = useAuth();
  const insets = useSafeAreaInsets();

  const [customer, setCustomer] = useState<CustomerItem | null>(null);
  const [risk, setRisk] = useState<RiskEstimateDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const [custData, riskData] = await Promise.all([
          shopAndCustomerApi.getCustomer(id),
          voiceAndRiskApi.getCustomerRiskDetail(id),
        ]);
        setCustomer(custData);
        setRisk(riskData);
      } catch (e) {
        console.log("Failed to load risk estimate:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading || !customer || !risk) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#102F50" />
      </SafeAreaView>
    );
  }

  const displayCode = code || formatCustomerCode(customer.customer_id);
  const cat = risk.category;
  const displayCategory =
    cat === "HIGH"
      ? "High"
      : cat === "MEDIUM"
      ? "Medium"
      : cat === "INSUFFICIENT_HISTORY"
      ? "Insufficient History"
      : "Low";

  const recentPayDateFormatted = risk.recent_payment_date
    ? new Date(risk.recent_payment_date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      })
    : null;

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
            {t.creditRiskTitle}
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
        {/* Current Estimate Gauge Card */}
        <View className="p-4 bg-brand-surface rounded-2xl gap-3 mb-4">
          <Text className="text-brand-navy text-xs font-inter-semibold">
            {t.currentEstimateLabel}
          </Text>
          <Text className="text-brand-navy text-3xl font-inter-bold">
            {displayCategory}
          </Text>

          {/* 3-Bar Risk Meter */}
          <View className="flex-row items-start gap-2 my-1">
            {/* Low */}
            <View className="flex-1 items-center gap-1.5">
              <View
                className={`w-full h-1.5 rounded-full ${
                  cat === "LOW" ? "bg-brand-success" : "bg-slate-200"
                }`}
              />
              <Text
                className={`text-xs text-brand-navy ${
                  cat === "LOW" ? "font-inter-bold" : "font-inter"
                }`}
              >
                Low
              </Text>
            </View>

            {/* Medium */}
            <View className="flex-1 items-center gap-1.5">
              <View
                className={`w-full h-1.5 rounded-full ${
                  cat === "MEDIUM" ? "bg-brand-orange" : "bg-slate-200"
                }`}
              />
              <Text
                className={`text-xs text-brand-navy ${
                  cat === "MEDIUM" ? "font-inter-bold" : "font-inter"
                }`}
              >
                Medium
              </Text>
            </View>

            {/* High */}
            <View className="flex-1 items-center gap-1.5">
              <View
                className={`w-full h-1.5 rounded-full ${
                  cat === "HIGH" ? "bg-brand-error" : "bg-slate-200"
                }`}
              />
              <Text
                className={`text-xs text-brand-navy ${
                  cat === "HIGH" ? "font-inter-bold" : "font-inter"
                }`}
              >
                High
              </Text>
            </View>
          </View>

          <Text className="text-brand-textSecondary text-xs font-inter leading-4">
            {t.insufficientHistoryNote}
          </Text>
        </View>

        {/* Experimental AI Disclaimer Banner */}
        <View className="p-3.5 bg-blue-50 rounded-xl flex-row items-start gap-2.5 mb-4">
          <Info size={20} color="#102F50" strokeWidth={2.2} />
          <View className="flex-1 gap-0.5">
            <Text className="text-brand-navy text-xs font-inter-semibold">
              {t.experimentalAiTitle}
            </Text>
            <Text className="text-brand-textSecondary text-xs font-inter leading-4">
              {t.experimentalAiSub}
            </Text>
          </View>
        </View>

        {/* Why This Estimate? Card */}
        <View className="p-4 bg-brand-surface rounded-2xl gap-3">
          <Text className="text-brand-navy text-lg font-inter-semibold">
            {t.whyThisEstimateTitle}
          </Text>

          <View className="flex-row items-center justify-between">
            <Text className="text-brand-textSecondary text-xs font-inter">
              {t.dueDateLabel}
            </Text>
            <Text className="text-brand-navy text-sm font-inter-medium">
              {risk.overdue_days > 0
                ? `${risk.overdue_days} days overdue`
                : "On time"}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-brand-textSecondary text-xs font-inter">
              {t.recentRepaymentLabel}
            </Text>
            <Text className="text-brand-navy text-sm font-inter-medium">
              {risk.recent_payment_minor > 0
                ? `${formatLKR(risk.recent_payment_minor)}${
                    recentPayDateFormatted ? ` on ${recentPayDateFormatted}` : ""
                  }`
                : "None recorded"}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-brand-textSecondary text-xs font-inter">
              {t.creditLimitUsageLabel}
            </Text>
            <Text className="text-brand-navy text-sm font-inter-medium">
              {risk.credit_limit_minor
                ? `${risk.limit_usage_percent.toFixed(1)}% of ${formatLKR(
                    risk.credit_limit_minor
                  )}`
                : t.noCreditLimitDisplay}
            </Text>
          </View>

          <Text className="text-brand-textSecondary text-xs font-inter leading-4 mt-1">
            {risk.reasons?.[0] || t.riskAdvisoryNote}
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Sticky Button (Floats above BottomNav) */}
      <View
        className="px-5 pt-3 bg-white border-t border-slate-100"
        style={{ paddingBottom: Math.max(insets.bottom, 20) + 75 }}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() =>
            router.push({
              pathname: "/ledger/add-credit",
              params: { customer_id: customer.customer_id, code: displayCode },
            } as any)
          }
          className="h-12 px-4 bg-brand-navy rounded-xl items-center justify-center shadow-sm"
        >
          <Text className="text-white text-base font-inter-semibold">
            {t.continueToAddCreditBtn}
          </Text>
        </TouchableOpacity>
      </View>

      <BottomNav active="Customers" />
    </SafeAreaView>
  );
}