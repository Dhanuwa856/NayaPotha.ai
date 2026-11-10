import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  PlusCircle,
} from "lucide-react-native";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import BottomNav from "../../components/ui/BottomNav";
import { formatLKR } from "../../services/customerService";
import { reportApi, StatementLedgerItem } from "../../services/reportService";

export default function DailySummaryScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { shop } = useAuth();

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [entries, setEntries] = useState<StatementLedgerItem[]>([]);
  const [creditMinor, setCreditMinor] = useState(0);
  const [creditCount, setCreditCount] = useState(0);
  const [paymentMinor, setPaymentMinor] = useState(0);
  const [paymentCount, setPaymentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDailyData = useCallback(async (dateOverride?: string) => {
    try {
      setLoading(true);
      const data = await reportApi.getShopReportsOverview(dateOverride);
      setSelectedDate(data.targetDay);
      setAvailableDates(data.availableDates);
      setEntries(data.dayEntries);
      setCreditMinor(data.dayCreditMinor);
      setCreditCount(data.dayCreditCount);
      setPaymentMinor(data.dayPaymentMinor);
      setPaymentCount(data.dayPaymentCount);
    } catch (e) {
      console.log("Failed to load daily summary:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDailyData();
  }, [loadDailyData]);

  // තෝරාගත් දිනය මාරු කිරීම (Cycle through active transaction dates)
  const cycleDate = () => {
    if (availableDates.length <= 1) return;
    const currentIdx = availableDates.indexOf(selectedDate);
    const nextIdx = (currentIdx + 1) % availableDates.length;
    loadDailyData(availableDates[nextIdx]);
  };

  const netChangeMinor = creditMinor - paymentMinor;
  const formattedDay = selectedDate
    ? new Date(selectedDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Today";

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
            {t.dailySummaryTitle}
          </Text>
          <Text className="text-brand-textSecondary text-xs font-inter mt-0.5">
            {t.dailySummarySub}
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
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadDailyData(selectedDate);
            }}
          />
        }
      >
        {/* Selected Day Picker */}
        <View className="mb-4">
          <Text className="text-brand-navy text-xs font-inter-semibold mb-1.5">
            {t.selectedDayLabel}
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={cycleDate}
            className="min-h-[48px] px-3.5 py-2.5 bg-white rounded-xl border border-brand-border flex-row items-center justify-between"
          >
            <Text className="text-brand-navy text-base font-inter">
              {formattedDay}
            </Text>
            <Calendar size={20} color="#102F50" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="py-10 items-center">
            <ActivityIndicator size="large" color="#102F50" />
          </View>
        ) : (
          <>
            {/* Daily Totals Card */}
            <View className="p-4 bg-brand-surface rounded-2xl gap-3 mb-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-brand-textSecondary text-xs font-inter">
                  {t.creditLabel} · {creditCount}{" "}
                  {creditCount === 1 ? "entry" : "entries"}
                </Text>
                <Text className="text-brand-navy text-sm font-inter-medium">
                  {formatLKR(creditMinor)}
                </Text>
              </View>

              <View className="flex-row items-center justify-between">
                <Text className="text-brand-textSecondary text-xs font-inter">
                  {t.paymentsReceivedLabel} · {paymentCount}{" "}
                  {paymentCount === 1 ? "entry" : "entries"}
                </Text>
                <Text className="text-brand-navy text-base font-inter-bold">
                  {formatLKR(paymentMinor)}
                </Text>
              </View>

              <View className="flex-row items-center justify-between">
                <Text className="text-brand-textSecondary text-xs font-inter">
                  {t.netChangeInDebtLabel}
                </Text>
                <Text className="text-brand-navy text-sm font-inter-medium">
                  {netChangeMinor < 0
                    ? `−${formatLKR(Math.abs(netChangeMinor))}`
                    : netChangeMinor > 0
                    ? `+${formatLKR(netChangeMinor)}`
                    : formatLKR(0)}
                </Text>
              </View>
            </View>

            {/* Transactions List */}
            <Text className="text-brand-navy text-lg font-inter-semibold mb-3">
              {t.transactionsHeading}
            </Text>

            {entries.length === 0 ? (
              <Text className="text-brand-textSecondary text-sm font-inter mb-4">
                {t.noTransactions}
              </Text>
            ) : (
              <View className="mb-4">
                {entries.map((item) => {
                  const isPayment = item.type === "PAYMENT";
                  return (
                    <TouchableOpacity
                      key={item.entry_id}
                      activeOpacity={0.85}
                      onPress={() =>
                        router.push({
                          pathname: "/ledger/entry/[id]",
                          params: {
                            id: item.entry_id,
                            customer_id: item.customer_id,
                            customer_name: item.customer_name,
                            code: item.customer_code,
                          },
                        } as any)
                      }
                      className="py-3 border-b border-brand-border"
                    >
                      <Text className="text-brand-navy text-sm font-inter-semibold mb-2">
                        {item.customer_name} · {item.customer_code}
                      </Text>

                      <View className="flex-row items-start gap-3">
                        <View
                          className={`w-9 h-9 rounded-xl items-center justify-center ${
                            isPayment ? "bg-green-50" : "bg-brand-surface"
                          }`}
                        >
                          {isPayment ? (
                            <CheckCircle2 size={18} color="#16A36A" />
                          ) : (
                            <PlusCircle size={18} color="#102F50" />
                          )}
                        </View>

                        <View className="flex-1 gap-0.5">
                          <View className="flex-row items-center justify-between">
                            <Text className="text-brand-navy text-sm font-inter-semibold">
                              {isPayment ? t.paymentLabel : t.creditLabel}
                            </Text>
                            <Text className="text-brand-navy text-base font-inter-semibold">
                              {isPayment ? "−" : "+"}
                              {formatLKR(item.amount_minor)}
                            </Text>
                          </View>

                          <Text className="text-brand-textSecondary text-xs font-inter">
                            {formattedDay} • {item.note || "Recorded entry"}
                          </Text>
                          <Text className="text-brand-navy text-xs font-inter">
                            Balance {formatLKR(item.running_balance_minor)}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Payment Highlight Banner */}
            {paymentCount > 0 && (
              <View className="p-3.5 bg-green-50 rounded-xl flex-row items-start gap-2.5 mb-3">
                <CheckCircle2 size={20} color="#16A36A" strokeWidth={2.2} />
                <View className="flex-1 gap-0.5">
                  <Text className="text-brand-success text-xs font-inter-semibold">
                    {paymentCount} payment(s) recorded
                  </Text>
                  <Text className="text-brand-textSecondary text-xs font-inter leading-4">
                    Total payments of {formatLKR(paymentMinor)} received on{" "}
                    {formattedDay}.
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        <Text className="text-brand-textSecondary text-xs font-inter leading-4">
          {t.draftExcludedFooter}
        </Text>
      </ScrollView>

      <BottomNav active="Reports" />
    </SafeAreaView>
  );
}