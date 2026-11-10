import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { ArrowLeft, Calendar, ChevronRight } from "lucide-react-native";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import BottomNav from "../../components/ui/BottomNav";
import { formatLKR } from "../../services/customerService";
import { reportApi, DailyChartBar } from "../../services/reportService";

export default function ReportsScreen() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const { shop } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalOutstandingMinor, setTotalOutstandingMinor] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [creditGivenMinor, setCreditGivenMinor] = useState(0);
  const [paymentsMinor, setPaymentsMinor] = useState(0);
  const [chartBars, setChartBars] = useState<DailyChartBar[]>([]);

  const loadOverview = useCallback(async () => {
    try {
      setLoading(true);
      const data = await reportApi.getShopReportsOverview();
      setTotalCustomers(data.totalCustomers);
      setTotalOutstandingMinor(data.totalOutstandingMinor);
      setOverdueCount(data.overdueCustomersCount);
      setCreditGivenMinor(data.periodCreditMinor);
      setPaymentsMinor(data.periodPaymentsMinor);
      setChartBars(data.chartBars);
    } catch (e) {
      console.log("Failed to load reports overview:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOverview();
    }, [loadOverview])
  );

  const maxBarValue = Math.max(
    1,
    ...chartBars.map((b) => Math.max(b.creditMinor, b.paymentMinor))
  );

  const todayDisplay = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

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
            {t.reportsTitle}
          </Text>
          <Text className="text-brand-textSecondary text-xs font-inter mt-0.5">
            {totalCustomers} {t.customersTitle.toLowerCase()} •{" "}
            {t.currentOutstandingSub} {formatLKR(totalOutstandingMinor)}
          </Text>
        </View>
      </View>

      {/* Shop Info Strip */}
      <View className="h-7 px-5 bg-brand-surface justify-center">
        <Text className="text-brand-textSecondary text-xs font-inter">
          {shop?.shop_name || "NayaPotha.ai"}
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-5 py-4"
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadOverview();
            }}
          />
        }
      >
        {/* Reporting Period Selector */}
        <View className="mb-3">
          <Text className="text-brand-navy text-xs font-inter-semibold mb-1.5">
            {t.reportingPeriodLabel}
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push("/reports/daily-summary" as any)}
            className="min-h-[48px] px-3.5 py-2.5 bg-white rounded-xl border border-brand-border flex-row items-center justify-between"
          >
            <Text className="text-brand-navy text-base font-inter">
              All active records ({todayDisplay})
            </Text>
            <Calendar size={20} color="#102F50" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {loading && totalCustomers === 0 ? (
          <View className="py-10 items-center">
            <ActivityIndicator size="large" color="#102F50" />
          </View>
        ) : (
          <>
            {/* 2x2 Summary KPI Grid */}
            <View className="gap-2 mb-4">
              <View className="flex-row gap-2">
                <View className="flex-1 p-3.5 bg-brand-surface rounded-xl gap-1">
                  <Text className="text-brand-textSecondary text-xs font-inter">
                    {t.creditGivenLabel}
                  </Text>
                  <Text className="text-brand-navy text-xl font-inter-bold">
                    {formatLKR(creditGivenMinor)}
                  </Text>
                </View>

                <View className="flex-1 p-3.5 bg-brand-surface rounded-xl gap-1">
                  <Text className="text-brand-textSecondary text-xs font-inter">
                    {t.paymentsReceivedLabel}
                  </Text>
                  <Text className="text-brand-navy text-xl font-inter-bold">
                    {formatLKR(paymentsMinor)}
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-2">
                <View className="flex-1 p-3.5 bg-brand-surface rounded-xl gap-1">
                  <Text className="text-brand-textSecondary text-xs font-inter">
                    {t.outstandingNowLabel}
                  </Text>
                  <Text className="text-brand-navy text-xl font-inter-bold">
                    {formatLKR(totalOutstandingMinor)}
                  </Text>
                </View>

                <View className="flex-1 p-3.5 bg-brand-surface rounded-xl gap-1">
                  <Text className="text-brand-textSecondary text-xs font-inter">
                    {t.overdueNowLabel}
                  </Text>
                  <Text className="text-brand-navy text-xl font-inter-bold">
                    {overdueCount} {t.peopleUnit}
                  </Text>
                </View>
              </View>
            </View>

            {/* Credit & Payments Bar Chart Card */}
            <View className="p-4 bg-brand-surface rounded-2xl gap-3 mb-4">
              <Text className="text-brand-navy text-base font-inter-semibold">
                {t.creditAndPaymentsChartTitle}
              </Text>

              {chartBars.length === 0 ? (
                <Text className="text-brand-textSecondary text-xs font-inter">
                  {t.noTransactions}
                </Text>
              ) : (
                <View className="gap-3">
                  {chartBars.map((bar, idx) => {
                    const creditWidthPct = Math.max(
                      8,
                      Math.round((bar.creditMinor / maxBarValue) * 100)
                    );
                    const payWidthPct = Math.max(
                      8,
                      Math.round((bar.paymentMinor / maxBarValue) * 100)
                    );

                    return (
                      <View key={idx} className="gap-2">
                        {bar.creditMinor > 0 && (
                          <View className="flex-row items-center gap-3">
                            <View className="w-20">
                              <Text className="text-brand-navy text-xs font-inter">
                                {bar.dateLabel}
                              </Text>
                              <Text className="text-brand-navy text-xs font-inter-semibold">
                                {(bar.creditMinor / 100).toLocaleString()} credit
                              </Text>
                            </View>
                            <View className="flex-1">
                              <View
                                style={{ width: `${creditWidthPct}%` }}
                                className="h-4 bg-brand-navy rounded-sm"
                              />
                            </View>
                          </View>
                        )}

                        {bar.paymentMinor > 0 && (
                          <View className="flex-row items-center gap-3">
                            <View className="w-20">
                              <Text className="text-brand-navy text-xs font-inter">
                                {bar.dateLabel}
                              </Text>
                              <Text className="text-brand-navy text-xs font-inter-semibold">
                                {(bar.paymentMinor / 100).toLocaleString()} paid
                              </Text>
                            </View>
                            <View className="flex-1">
                              <View
                                style={{ width: `${payWidthPct}%` }}
                                className="h-4 bg-brand-success rounded-sm"
                              />
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}

        {/* Navigation Links List */}
        <View className="divide-y divide-slate-100">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push("/reports/daily-summary" as any)}
            className="h-12 px-2 flex-row items-center justify-between"
          >
            <Text className="text-brand-navy text-base font-inter">
              {t.dailySummaryTitle}
            </Text>
            <ChevronRight size={20} color="#102F50" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push("/reports/overdue" as any)}
            className="h-12 px-2 flex-row items-center justify-between"
          >
            <Text className="text-brand-navy text-base font-inter">
              {t.overdueCustomers}
            </Text>
            <ChevronRight size={20} color="#102F50" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push("/reports/statement" as any)}
            className="h-12 px-2 flex-row items-center justify-between"
          >
            <Text className="text-brand-navy text-base font-inter">
              {t.customerStatementTitle}
            </Text>
            <ChevronRight size={20} color="#102F50" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BottomNav active="Reports" />
    </SafeAreaView>
  );
}