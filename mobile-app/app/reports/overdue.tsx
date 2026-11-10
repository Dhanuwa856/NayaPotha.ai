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
  ChevronDown,
  ChevronRight,
  Info,
} from "lucide-react-native";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import BottomNav from "../../components/ui/BottomNav";
import { formatLKR, getInitials } from "../../services/customerService";
import {
  reportApi,
  OverdueCustomerReportItem,
} from "../../services/reportService";

export default function OverdueCustomersReportScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { shop } = useAuth();

  const [items, setItems] = useState<OverdueCustomerReportItem[]>([]);
  const [filterMode, setFilterMode] = useState<"ALL" | "7PLUS">("ALL");
  const [sortMode, setSortMode] = useState<"OLDEST" | "HIGHEST">("OLDEST");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOverdue = useCallback(async () => {
    try {
      setLoading(true);
      const data = await reportApi.getOverdueCustomersReport();
      setItems(data);
    } catch (e) {
      console.log("Failed to load overdue report:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOverdue();
  }, [loadOverdue]);

  const filtered = items
    .filter((i) => (filterMode === "7PLUS" ? i.days_late >= 7 : true))
    .sort((a, b) => {
      if (sortMode === "OLDEST") return b.days_late - a.days_late;
      return b.overdue_minor - a.overdue_minor;
    });

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
          <Text className="text-brand-navy text-2xl font-inter-bold">
            {t.overdueCustomers}
          </Text>
          <Text className="text-brand-textSecondary text-xs font-inter mt-0.5">
            {items.length} {t.customersTitle.toLowerCase()} • As of{" "}
            {todayDisplay}
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
              loadOverdue();
            }}
          />
        }
      >
        {/* Filter Chips */}
        <View className="flex-row items-center gap-2 mb-4">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setFilterMode("ALL")}
            className={`min-h-[40px] px-3.5 py-2 rounded-xl items-center justify-center ${
              filterMode === "ALL" ? "bg-brand-navy" : "bg-brand-surface"
            }`}
          >
            <Text
              className={`text-xs font-inter-semibold ${
                filterMode === "ALL" ? "text-white" : "text-brand-navy"
              }`}
            >
              {t.allOverdueChip}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setFilterMode("7PLUS")}
            className={`min-h-[40px] px-3.5 py-2 rounded-xl items-center justify-center ${
              filterMode === "7PLUS" ? "bg-brand-navy" : "bg-brand-surface"
            }`}
          >
            <Text
              className={`text-xs font-inter-semibold ${
                filterMode === "7PLUS" ? "text-white" : "text-brand-navy"
              }`}
            >
              {t.sevenPlusDaysChip}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sort By Selector */}
        <View className="mb-4">
          <Text className="text-brand-navy text-xs font-inter-semibold mb-1.5">
            {t.sortByLabel}
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              setSortMode(sortMode === "OLDEST" ? "HIGHEST" : "OLDEST")
            }
            className="min-h-[48px] px-3.5 py-2.5 bg-white rounded-xl border border-brand-border flex-row items-center justify-between"
          >
            <Text className="text-brand-navy text-base font-inter">
              {sortMode === "OLDEST"
                ? t.oldestDueFirst
                : t.highestBalanceFirst}
            </Text>
            <ChevronDown size={20} color="#102F50" />
          </TouchableOpacity>
        </View>

        {/* Overdue Customer Cards */}
        {loading ? (
          <View className="py-10 items-center">
            <ActivityIndicator size="large" color="#102F50" />
          </View>
        ) : filtered.length === 0 ? (
          <View className="py-8 items-center">
            <Text className="text-brand-textSecondary text-sm font-inter">
              {t.noCustomersFound}
            </Text>
          </View>
        ) : (
          <View className="gap-3 mb-4">
            {filtered.map((item) => {
              const dueFormatted = item.oldest_due_date
                ? new Date(item.oldest_due_date).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "Past due";

              return (
                <TouchableOpacity
                  key={item.customer.customer_id}
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push({
                      pathname: "/customers/[id]",
                      params: {
                        id: item.customer.customer_id,
                        code: item.code,
                      },
                    } as any)
                  }
                  className="p-3 bg-white rounded-2xl border border-brand-border flex-row items-center gap-3"
                >
                  <View className="w-10 h-10 bg-brand-surface rounded-xl items-center justify-center">
                    <Text className="text-brand-navy text-base font-inter-semibold">
                      {getInitials(item.customer.name)}
                    </Text>
                  </View>

                  <View className="flex-1 gap-0.5">
                    <Text className="text-brand-navy text-sm font-inter-semibold">
                      {item.customer.name}
                    </Text>
                    <Text className="text-brand-textSecondary text-xs font-inter">
                      {item.code} • Due {dueFormatted} • {item.days_late} days
                      late
                    </Text>
                    <Text className="text-brand-navy text-sm font-inter-semibold">
                      {formatLKR(item.overdue_minor)} • {t.chipOverdue}
                    </Text>
                  </View>

                  <ChevronRight size={18} color="#102F50" />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Follow-Up Info Box */}
        <View className="p-3.5 bg-blue-50 rounded-xl flex-row items-start gap-2.5 mb-3">
          <Info size={20} color="#102F50" strokeWidth={2.2} />
          <View className="flex-1 gap-0.5">
            <Text className="text-brand-navy text-xs font-inter-semibold">
              {t.openCustomerFollowUpTitle}
            </Text>
            <Text className="text-brand-textSecondary text-xs font-inter leading-4">
              {t.openCustomerFollowUpSub}
            </Text>
          </View>
        </View>

        <Text className="text-brand-textSecondary text-xs font-inter leading-4">
          {t.noAutoRemindersFooter}
        </Text>
      </ScrollView>

      <BottomNav active="Reports" />
    </SafeAreaView>
  );
}