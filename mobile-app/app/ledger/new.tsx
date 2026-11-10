import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  PlusCircle,
  CheckCircle2,
  ChevronRight,
  Info,
} from "lucide-react-native";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";

export default function NewTransactionScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { shop } = useAuth();

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
            {t.newTxTitle}
          </Text>
          <Text className="text-brand-textSecondary text-xs font-inter mt-0.5">
            {t.newTxSub}
          </Text>
        </View>
      </View>

      {/* Shop Strip */}
      <View className="h-7 px-5 bg-brand-surface justify-center">
        <Text className="text-brand-textSecondary text-xs font-inter">
          {shop?.shop_name || "NayaPotha.ai"}
        </Text>
      </View>

      <ScrollView className="flex-1 px-5 py-4">
        <Text className="text-brand-navy text-lg font-inter-semibold mb-4">
          {t.whatHappenedTitle}
        </Text>

        {/* Option 1: Add Credit */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() =>
            router.push({
              pathname: "/ledger/select-customer",
              params: { type: "CREDIT_SALE" },
            } as any)
          }
          className="p-4 bg-brand-surface rounded-2xl gap-3 mb-4 border border-brand-border"
        >
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-xl bg-white items-center justify-center">
              <PlusCircle size={22} color="#102F50" strokeWidth={2.2} />
            </View>
            <View className="flex-1">
              <Text className="text-brand-navy text-xl font-inter-semibold">
                {t.addCredit}
              </Text>
              <Text className="text-brand-textSecondary text-xs font-inter">
                {t.addCreditSub}
              </Text>
            </View>
            <ChevronRight size={20} color="#102F50" />
          </View>
          <Text className="text-brand-textSecondary text-sm font-inter leading-5">
            {t.addCreditDesc}
          </Text>
        </TouchableOpacity>

        {/* Option 2: Record Payment */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() =>
            router.push({
              pathname: "/ledger/select-customer",
              params: { type: "PAYMENT" },
            } as any)
          }
          className="p-4 bg-brand-surface rounded-2xl gap-3 mb-4 border border-brand-border"
        >
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-xl bg-white items-center justify-center">
              <CheckCircle2 size={22} color="#16A36A" strokeWidth={2.2} />
            </View>
            <View className="flex-1">
              <Text className="text-brand-navy text-xl font-inter-semibold">
                {t.recordPayment}
              </Text>
              <Text className="text-brand-textSecondary text-xs font-inter">
                {t.recordPaymentSub}
              </Text>
            </View>
            <ChevronRight size={20} color="#102F50" />
          </View>
          <Text className="text-brand-textSecondary text-sm font-inter leading-5">
            {t.recordPaymentDesc}
          </Text>
        </TouchableOpacity>

        {/* Info Box */}
        <View className="p-3.5 bg-blue-50 rounded-xl flex-row items-start gap-2.5 mb-3">
          <Info size={20} color="#102F50" strokeWidth={2.2} />
          <View className="flex-1 gap-0.5">
            <Text className="text-brand-navy text-xs font-inter-semibold">
              {t.chooseCustomerNextTitle}
            </Text>
            <Text className="text-brand-textSecondary text-xs font-inter leading-4">
              {t.chooseCustomerNextSub}
            </Text>
          </View>
        </View>

        <Text className="text-brand-textSecondary text-xs font-inter leading-4">
          {t.actionsNotTabsFooter}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}