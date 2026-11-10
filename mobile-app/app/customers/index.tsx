import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import {
  ArrowLeft,
  Search,
  ChevronRight,
  UserPlus,
} from "lucide-react-native";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";



import {
  shopAndCustomerApi,
  CustomerItem,
  formatLKR,
  getInitials,
  formatCustomerCode,
} from "../../services/customerService";
import BottomNav from "../../components/ui/BottomNav";

type FilterType = "ALL" | "OUTSTANDING" | "OVERDUE";

export default function CustomersListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, lang } = useLanguage();
  const { shop } = useAuth();

  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCustomers = useCallback(async (queryText?: string) => {
    try {
      setLoading(true);
      const res = await shopAndCustomerApi.listCustomers({
        status: "ACTIVE",
        q: queryText?.trim() || undefined,
        limit: 100,
      });
      setCustomers(res.items || []);
    } catch (err) {
      console.log("Failed to fetch customers:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload whenever screen comes into focus (e.g. after adding/editing a customer)
  useFocusEffect(
    useCallback(() => {
      fetchCustomers(searchQuery);
    }, [fetchCustomers, searchQuery])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCustomers(searchQuery);
  };

  // Detect duplicate base names so we can show "Different customer • Check ID"
  const nameCounts = customers.reduce<Record<string, number>>((acc, c) => {
    const key = c.name.trim().toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const overdueTotalCount = customers.filter(
    (c) => (c.balance_summary?.overdue_balance_minor || 0) > 0
  ).length;

  const filteredCustomers = customers.filter((c) => {
    const out = c.balance_summary?.outstanding_balance_minor || 0;
    const overdue = c.balance_summary?.overdue_balance_minor || 0;
    if (activeFilter === "OUTSTANDING") return out > 0;
    if (activeFilter === "OVERDUE") return overdue > 0;
    return true;
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
            {t.customersTitle}
          </Text>
          <Text className="text-brand-textSecondary text-sm font-inter mt-0.5">
            {t.showingCustomers} {filteredCustomers.length} / {customers.length} •{" "}
            {overdueTotalCount} {t.overdueLabel}
          </Text>
        </View>
      </View>

      {/* Shop Info Strip */}
      <View className="h-7 px-5 bg-brand-surface justify-center">
        <Text className="text-brand-textSecondary text-xs font-inter">
          {shop?.shop_name || "NayaPotha.ai"}
        </Text>
      </View>

      {/* Main Content */}
     <ScrollView
        className="flex-1 px-5 py-4"
        contentContainerStyle={{ paddingBottom: 24 }} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Search Input */}
        <View className="mb-4">
          <Text className="text-brand-navy text-sm font-inter-semibold mb-1.5">
            {t.searchCustomersLabel}
          </Text>
          <View className="min-h-[48px] px-3.5 bg-white rounded-xl border border-brand-border flex-row items-center gap-2">
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t.searchPlaceholder}
              placeholderTextColor="#64748B"
              className="flex-1 text-brand-navy text-base font-inter py-2"
            />
            <Search size={20} color="#102F50" strokeWidth={2.2} />
          </View>
        </View>

        {/* Filter Chips */}
        <View className="flex-row items-center gap-2 flex-wrap mb-4">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setActiveFilter("ALL")}
            className={`min-h-[40px] px-3.5 py-2 rounded-xl items-center justify-center ${
              activeFilter === "ALL" ? "bg-brand-navy" : "bg-brand-surface"
            }`}
          >
            <Text
              className={`text-xs font-inter-semibold ${
                activeFilter === "ALL" ? "text-white" : "text-brand-navy"
              }`}
            >
              {t.chipAll} ({customers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setActiveFilter("OUTSTANDING")}
            className={`min-h-[40px] px-3.5 py-2 rounded-xl items-center justify-center ${
              activeFilter === "OUTSTANDING" ? "bg-brand-navy" : "bg-brand-surface"
            }`}
          >
            <Text
              className={`text-xs font-inter-semibold ${
                activeFilter === "OUTSTANDING" ? "text-white" : "text-brand-navy"
              }`}
            >
              {t.chipOutstanding}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setActiveFilter("OVERDUE")}
            className={`min-h-[40px] px-3.5 py-2 rounded-xl items-center justify-center ${
              activeFilter === "OVERDUE" ? "bg-brand-navy" : "bg-brand-surface"
            }`}
          >
            <Text
              className={`text-xs font-inter-semibold ${
                activeFilter === "OVERDUE" ? "text-white" : "text-brand-navy"
              }`}
            >
              {t.chipOverdue} ({overdueTotalCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Customer Cards List */}
        {loading && customers.length === 0 ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#102F50" />
          </View>
        ) : filteredCustomers.length === 0 ? (
          <View className="py-12 items-center">
            <Text className="text-brand-textSecondary text-base font-inter">
              {t.noCustomersFound}
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {filteredCustomers.map((cust, index) => {
              const code = formatCustomerCode(cust.customer_id, index);
              const outMinor = cust.balance_summary?.outstanding_balance_minor || 0;
              const overdueMinor = cust.balance_summary?.overdue_balance_minor || 0;
              const isDuplicateName =
                (nameCounts[cust.name.trim().toLowerCase()] || 0) > 1;
              const displayTitle = cust.nickname
                ? `${cust.name} (${cust.nickname})`
                : cust.name;

              return (
                <TouchableOpacity
                  key={cust.customer_id}
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push({
                      pathname: "/customers/[id]",
                      params: { id: cust.customer_id, code },
                    } as any)
                  }
                  className="p-3 bg-white rounded-2xl border border-brand-border flex-row items-center gap-3"
                >
                  {/* Avatar Initials */}
                  <View className="w-11 h-11 bg-brand-surface rounded-xl items-center justify-center">
                    <Text className="text-brand-navy text-base font-inter-bold">
                      {getInitials(cust.name)}
                    </Text>
                  </View>

                  {/* Customer Info */}
                  <View className="flex-1 gap-0.5">
                    <Text className="text-brand-navy text-base font-inter-semibold leading-5">
                      {displayTitle}
                    </Text>
                    <Text className="text-brand-textSecondary text-xs font-inter leading-4">
                      {code} •{" "}
                      {isDuplicateName
                        ? "Different customer • Check ID"
                        : cust.phone_number || t.phoneNotSupplied}
                    </Text>
                    <Text
                      className={`text-sm font-inter-bold leading-5 ${
                        overdueMinor > 0 ? "text-brand-error" : "text-brand-navy"
                      }`}
                    >
                      {formatLKR(outMinor)}
                      {overdueMinor > 0 ? ` • ${t.chipOverdue}` : ""}
                    </Text>
                  </View>

                  <ChevronRight size={20} color="#102F50" />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Bottom Sticky Add Customer Action */}
     <View 
        className="px-5 pt-3 bg-white border-t border-slate-50"
        style={{ paddingBottom: Math.max(insets.bottom, 20) + 75 }} 
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push("/customers/add" as any)}
          className="h-12 px-4 bg-brand-navy rounded-xl flex-row items-center justify-center gap-2 shadow-sm"
        >
          <UserPlus size={20} color="#FFFFFF" strokeWidth={2.2} />
          <Text className="text-white text-base font-inter-semibold">
            {t.addCustomerBtn}
          </Text>
        </TouchableOpacity>
      </View>

      <BottomNav active="Customers" />
    </SafeAreaView>
  );
}