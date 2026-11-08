import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import {
  Bell,
  PlusCircle,
  CheckCircle2,
  Users,
  FileText,
  Mic,
} from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import BottomNav from "../components/ui/BottomNav";
import {
  shopAndCustomerApi,
  formatLKR,
  getInitials,
  RecentTransactionItem,
} from "../services/customerService";

export default function HomeScreen() {
  const router = useRouter();
  const { owner, shop } = useAuth();
  const { t, lang } = useLanguage();

  const [isSyncing, setIsSyncing] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Real database states (Initialized to 0 / empty)
  const [totalCustomers, setTotalCustomers] = useState<number>(0);
  const [overdueCount, setOverdueCount] = useState<number>(0);
  const [todaySalesMinor, setTodaySalesMinor] = useState<number>(0);
  const [todayPaymentsMinor, setTodayPaymentsMinor] = useState<number>(0);
  const [totalOutstandingMinor, setTotalOutstandingMinor] = useState<number>(0);
  const [recentTransactions, setRecentTransactions] = useState<
    RecentTransactionItem[]
  >([]);

  // Time-based greeting
 const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return t.goodMorning;
  if (hour < 17) return t.goodAfternoon;
  return t.goodEvening;
};
  // Load real dashboard metrics from FastAPI
  const loadDashboard = useCallback(async () => {
    try {
      setIsSyncing(true);
      const data = await shopAndCustomerApi.getDashboardData();

      setTotalCustomers(data.totalCustomers);
      setOverdueCount(data.overdueCustomersCount);
      setTodaySalesMinor(data.todaySalesMinor);
      setTodayPaymentsMinor(data.todayPaymentsMinor);
      setTotalOutstandingMinor(data.totalOutstandingMinor);
      setRecentTransactions(data.recentTransactions);
    } catch (error) {
      console.log("Failed to load dashboard data:", error);
    } finally {
      setIsSyncing(false);
      setRefreshing(false);
    }
  }, []);

  // Automatically refresh dashboard numbers whenever returning to Home screen
  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const formatShortDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Top App Bar */}
      <View className="h-20 px-5 flex-row items-center justify-between border-b border-slate-100">
        <View className="flex-row items-center gap-2.5">
          {/* IMAGE PLACEHOLDER: Replace with your app logo */}
          <Image
            source={require("../assets/images/logo.png")}
            className="w-12 h-12 rounded-xl"
          />
          <Text className="text-2xl font-inter-bold text-brand-navy tracking-tight">
            NayaPotha<Text className="text-brand-orange">.ai</Text>
          </Text>
        </View>

        <View className="flex-row items-center gap-3">
          {/* Live Sync Status Pill */}
          <View className="px-3 py-1.5 bg-brand-surface rounded-xl border border-brand-border flex-row items-center gap-2">
            <View
              className={`w-2.5 h-2.5 rounded-full ${
                isSyncing ? "bg-brand-orange" : "bg-brand-success"
              }`}
            />
            <Text className="text-brand-navy text-xs font-inter-semibold">
              {isSyncing ? t.syncing : t.synced}
            </Text>
          </View>

          {/* Notification Bell Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/notifications" as any)}
            className="w-11 h-11 bg-brand-surface rounded-2xl items-center justify-center relative"
          >
            <Bell size={22} color="#102F50" strokeWidth={2.2} />
            {overdueCount > 0 && (
              <View className="w-2.5 h-2.5 bg-brand-orange rounded-full absolute top-2.5 right-2.5 border border-white" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Scrollable Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Dynamic Greeting Header */}
        <View className="px-5 pt-4 pb-4">
          <Text
            className={`text-brand-navy text-base ${
              lang === "si" ? "font-sinhala-medium" : "font-inter-medium"
            }`}
          >
            {getGreeting()}
            <Text className="text-xl font-inter-bold">
              {owner?.name || "Dhanushka"} !
            </Text>
          </Text>
          <Text className="text-brand-textSecondary text-sm font-inter mt-0.5">
            {shop?.shop_name ? `${shop.shop_name} • ` : ""}
            {t.shopStatusSub}
          </Text>
        </View>

        {/* Summary KPI Cards Grid */}
        <View className="px-5 gap-3">
          {/* Row 1: Total Customers & Overdue Customers */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push("/customers" as any)}
              className="flex-1 p-4 bg-brand-surface rounded-2xl justify-between min-h-[104px]"
            >
              <Text className="text-brand-textSecondary text-xs font-inter-semibold">
                {t.totalCustomers}
              </Text>
              <Text className="text-brand-navy text-3xl font-inter-bold my-1">
                {totalCustomers}
              </Text>
              <Text className="text-brand-textSecondary text-xs font-inter">
                {t.activeAccounts}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push("/customers" as any)}
              className="flex-1 p-4 bg-brand-surface rounded-2xl justify-between min-h-[104px]"
            >
              <Text className="text-brand-textSecondary text-xs font-inter-semibold">
                {t.overdueCustomers}
              </Text>
              <Text
                className={`text-3xl font-inter-bold my-1 ${
                  overdueCount > 0 ? "text-brand-error" : "text-brand-navy"
                }`}
              >
                {overdueCount}
              </Text>
              <Text className="text-brand-textSecondary text-xs font-inter">
                {t.needsAttention}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Row 2: Today's Sales & Today's Payments */}
          <View className="flex-row gap-3">
            <View className="flex-1 p-4 bg-brand-surface rounded-2xl justify-between min-h-[104px]">
              <Text className="text-brand-textSecondary text-xs font-inter-semibold">
                {t.todaysSales}
              </Text>
              <Text className="text-brand-navy text-2xl font-inter-bold my-1">
                {formatLKR(todaySalesMinor)}
              </Text>
              <Text className="text-brand-textSecondary text-xs font-inter">
                {t.creditSalesRecorded}
              </Text>
            </View>

            <View className="flex-1 p-4 bg-brand-surface rounded-2xl justify-between min-h-[104px]">
              <Text className="text-brand-textSecondary text-xs font-inter-semibold">
                {t.todaysPayments}
              </Text>
              <Text className="text-brand-navy text-2xl font-inter-bold my-1">
                {formatLKR(todayPaymentsMinor)}
              </Text>
              <Text className="text-brand-textSecondary text-xs font-inter">
                {t.receivedToday}
              </Text>
            </View>
          </View>

          {/* Row 3: Full-Width Navy Total Outstanding Card */}
          <View className="w-full p-4 bg-brand-navy rounded-2xl justify-between min-h-[104px]">
            <Text className="text-slate-200 text-xs font-inter-semibold">
              {t.totalOutstanding}
            </Text>
            <Text className="text-white text-3xl font-inter-bold my-1">
              {formatLKR(totalOutstandingMinor)}
            </Text>
            <Text className="text-slate-300 text-xs font-inter">
              {t.acrossCustomers} ({totalCustomers})
            </Text>
          </View>
        </View>

        {/* Quick Actions Section */}
        <View className="px-5 pt-5">
          <Text className="text-brand-navy text-xs font-inter-semibold mb-2.5">
            {t.quickActions}
          </Text>

          {/* Row 1: Add Credit & Record Payment (Opens 3-Step Ledger Wizard) */}
          <View className="flex-row gap-3.5 mb-3">
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: "/ledger/select-customer",
                  params: { type: "CREDIT_SALE" },
                } as any)
              }
              className="flex-1 h-12 bg-brand-navy rounded-xl flex-row items-center justify-center gap-2 shadow-sm"
            >
              <PlusCircle size={20} color="#FFFFFF" strokeWidth={2.2} />
              <Text className="text-white text-base font-inter-semibold">
                {t.addCredit}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: "/ledger/select-customer",
                  params: { type: "PAYMENT" },
                } as any)
              }
              className="flex-1 h-12 bg-white rounded-xl border border-brand-navy flex-row items-center justify-center gap-2"
            >
              <CheckCircle2 size={20} color="#102F50" strokeWidth={2.2} />
              <Text className="text-brand-navy text-base font-inter-semibold">
                {t.recordPayment}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Row 2: View Customers & Reports */}
          <View className="flex-row gap-3.5 mb-3">
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push("/customers" as any)}
              className="flex-1 h-12 bg-white rounded-xl border border-brand-navy flex-row items-center justify-center gap-2"
            >
              <Users size={19} color="#102F50" strokeWidth={2.2} />
              <Text className="text-brand-navy text-sm font-inter-semibold">
                {t.viewCustomers}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push("/reports" as any)}
              className="flex-1 h-12 bg-white rounded-xl border border-brand-navy flex-row items-center justify-center gap-2"
            >
              <FileText size={19} color="#102F50" strokeWidth={2.2} />
              <Text className="text-brand-navy text-sm font-inter-semibold">
                {t.reports}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Row 3: Voice Entry */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push("/ledger/new" as any)}
            className="w-full h-12 bg-white rounded-xl border border-brand-navy flex-row items-center justify-center gap-2"
          >
            <Mic size={20} color="#102F50" strokeWidth={2.2} />
            <Text className="text-brand-navy text-base font-inter-semibold">
              {t.voiceEntry}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recent Transactions Section */}
        <View className="px-5 pt-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-brand-navy text-base font-inter-bold">
              {t.recentTransactions}
            </Text>
          </View>

          <View className="gap-2.5">
            {recentTransactions.length === 0 ? (
              <View className="py-6 px-4 bg-brand-surface rounded-xl items-center">
                <Text className="text-brand-textSecondary font-inter text-sm text-center">
                  {t.noTransactions}
                </Text>
              </View>
            ) : (
              recentTransactions.map((tx) => {
                const isPayment = tx.type === "PAYMENT";
                const isReversal = tx.type === "REVERSAL";
                return (
                  <TouchableOpacity
                    key={tx.entry_id}
                    activeOpacity={0.85}
                    onPress={() =>
                      router.push({
                        pathname: "/ledger/entry/[id]",
                        params: {
                          id: tx.entry_id,
                          customer_id: tx.customer_id,
                          customer_name: tx.customer_name,
                          code: tx.customer_code,
                        },
                      } as any)
                    }
                    className="p-3.5 bg-brand-surface rounded-xl flex-row items-center gap-3"
                  >
                    <View className="w-10 h-10 bg-white rounded-2xl border border-brand-border items-center justify-center">
                      <Text className="text-brand-navy text-xs font-inter-bold">
                        {getInitials(tx.customer_name)}
                      </Text>
                    </View>

                    <View className="flex-1">
                      <Text className="text-brand-navy text-sm font-inter-semibold">
                        {tx.customer_name}
                      </Text>
                      <Text className="text-brand-textSecondary text-xs font-inter mt-0.5">
                        {tx.customer_code} • {formatShortDate(tx.occurred_at)}
                      </Text>
                    </View>

                    <View className="items-end">
                      <Text
                        className={`text-sm font-inter-bold ${
                          isPayment
                            ? "text-brand-success"
                            : isReversal
                            ? "text-brand-error"
                            : "text-brand-navy"
                        }`}
                      >
                        {formatLKR(tx.amount_minor)}
                      </Text>
                      <Text className="text-brand-textSecondary text-xs font-inter mt-0.5">
                        {isPayment
                          ? t.paymentLabel
                          : isReversal
                          ? "Reversal"
                          : t.creditLabel}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      {/* Floating Glass Bottom Navigation Bar */}
      <BottomNav active="Home" />
    </SafeAreaView>
  );
}