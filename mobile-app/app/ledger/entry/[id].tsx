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
import { ArrowLeft, CheckCircle2 } from "lucide-react-native";
import { useLanguage } from "../../../context/LanguageContext";
import { useAuth } from "../../../context/AuthContext";
import {
  shopAndCustomerApi,
  formatLKR,
  formatCustomerCode,
} from "../../../services/customerService";
import {
  ledgerApi,
  LedgerEntryResponse,
  formatEntryCode,
} from "../../../services/ledgerService";

export default function TransactionDetailsScreen() {
  const router = useRouter();
  const {
    id,
    customer_id,
    customer_name,
    code,
    previous_balance_minor,
    resulting_balance_minor,
  } = useLocalSearchParams<{
    id: string;
    customer_id?: string;
    customer_name?: string;
    code?: string;
    previous_balance_minor?: string;
    resulting_balance_minor?: string;
  }>();

  const { t } = useLanguage();
  const { shop } = useAuth();
  const insets = useSafeAreaInsets();

  const [entry, setEntry] = useState<LedgerEntryResponse | null>(null);
  const [custName, setCustName] = useState(customer_name || "");
  const [custBalanceMinor, setCustBalanceMinor] = useState<number>(
    resulting_balance_minor ? parseInt(resulting_balance_minor, 10) : 0
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const entryData = await ledgerApi.getEntry(id);
        setEntry(entryData);

        const cId = customer_id || entryData.customer_id;
        const cust = await shopAndCustomerApi.getCustomer(cId);
        setCustName(cust.name);
        if (!resulting_balance_minor) {
          setCustBalanceMinor(
            cust.balance_summary?.outstanding_balance_minor || 0
          );
        }
      } catch (e) {
        console.log("Error loading transaction details:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading || !entry) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#102F50" />
      </SafeAreaView>
    );
  }

  const entryCode = formatEntryCode(entry.entry_id, entry.type);
  const displayCustCode = code || formatCustomerCode(entry.customer_id);
  const isPayment = entry.type === "PAYMENT";
  const isReversal = entry.type === "REVERSAL";

  const prevBalMinor =
    previous_balance_minor != null
      ? parseInt(previous_balance_minor, 10)
      : isPayment
      ? custBalanceMinor + entry.amount_minor
      : Math.max(0, custBalanceMinor - entry.amount_minor);

  const occurredDate = new Date(entry.occurred_at);
  const dateStr = occurredDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = occurredDate.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
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
            {t.txDetailsTitle}
          </Text>
          <Text className="text-brand-textSecondary text-xs font-inter mt-0.5">
            {isPayment ? t.paymentLabel : isReversal ? "Reversal" : t.creditLabel}{" "}
            • {entryCode} • {dateStr}
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
        {/* Saved Status Banner */}
        <View className="p-3.5 bg-green-50 rounded-xl flex-row items-start gap-2.5 mb-3">
          <CheckCircle2 size={20} color="#16A36A" strokeWidth={2.2} />
          <View className="flex-1 gap-0.5">
            <Text className="text-brand-success text-xs font-inter-semibold">
              {t.savedOnDeviceTitle}
            </Text>
            <Text className="text-brand-textSecondary text-xs font-inter">
              {t.savedOnDeviceSub}
            </Text>
          </View>
        </View>

        {/* Status Chip */}
        <View className="flex-row mb-3">
          <View className="min-h-[36px] px-3 py-1.5 bg-brand-surface rounded-xl items-center justify-center">
            <Text className="text-brand-navy text-xs font-inter-semibold">
              {entry.status === "REVERSED" ? "Reversed" : t.synced}
            </Text>
          </View>
        </View>

        {/* Big Amount */}
        <Text className="text-brand-navy text-3xl font-inter-bold mb-4">
          {formatLKR(entry.amount_minor)}
        </Text>

        {/* Details Card */}
        <View className="p-4 bg-brand-surface rounded-2xl gap-3 mb-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-brand-textSecondary text-xs font-inter">
              Customer
            </Text>
            <Text className="text-brand-navy text-sm font-inter-medium">
              {custName} · {displayCustCode}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-brand-textSecondary text-xs font-inter">
              Type
            </Text>
            <Text className="text-brand-navy text-sm font-inter-medium">
              {isPayment
                ? t.recordPayment
                : isReversal
                ? "Reversal"
                : t.addCredit}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-brand-textSecondary text-xs font-inter">
              Date & time
            </Text>
            <Text className="text-brand-navy text-sm font-inter-medium">
              {dateStr} · {timeStr}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-brand-textSecondary text-xs font-inter">
              Note
            </Text>
            <Text className="text-brand-navy text-sm font-inter-medium">
              {entry.note || "—"}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-brand-textSecondary text-xs font-inter">
              {t.previousBalanceLabel}
            </Text>
            <Text className="text-brand-navy text-sm font-inter-medium">
              {formatLKR(prevBalMinor)}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-brand-textSecondary text-xs font-inter">
              {t.resultingBalanceLabel}
            </Text>
            <Text className="text-brand-navy text-base font-inter-bold">
              {formatLKR(custBalanceMinor)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Done / Reverse Actions */}
      <View
        className="px-5 pt-3 bg-white border-t border-slate-100 gap-2.5"
        style={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() =>
            router.replace({
              pathname: "/customers/[id]",
              params: { id: entry.customer_id, code: displayCustCode },
            } as any)
          }
          className="h-12 px-4 bg-brand-navy rounded-xl items-center justify-center"
        >
          <Text className="text-white text-base font-inter-semibold">
            {t.doneBtn}
          </Text>
        </TouchableOpacity>

        {entry.status === "POSTED" && entry.type !== "REVERSAL" && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: "/ledger/reverse/[id]",
                params: {
                  id: entry.entry_id,
                  customer_id: entry.customer_id,
                  customer_name: custName,
                  code: displayCustCode,
                  current_balance_minor: String(custBalanceMinor),
                },
              } as any)
            }
            className="h-12 px-4 bg-white rounded-xl border border-brand-navy items-center justify-center"
          >
            <Text className="text-brand-navy text-base font-inter-semibold">
              {t.correctReverseBtn}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}