import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, ChevronRight } from "lucide-react-native";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import BottomNav from "../../components/ui/BottomNav";

export default function HelpAboutScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { shop } = useAuth();

  const helpItems = [
    {
      title: "Add credit or receive a payment",
      sub: "Select customer → Enter amount → Confirm",
      action: () => router.push("/ledger/new" as any),
    },
    {
      title: "Correct a mistake",
      sub: "Reverse the entry; keep the original audit trail",
      action: () =>
        Alert.alert(
          "Correcting a Mistake",
          "Open any recorded transaction from a customer's statement or recent list, then tap 'Correct / reverse transaction'. The original entry stays in the audit trail and a linked reversal adjusts the balance."
        ),
    },
    {
      title: "Working without internet",
      sub: "Local records are safe; pending is not failed",
      action: () => router.push("/settings/sync-status" as any),
    },
    {
      title: "Use voice in Sinhala or English",
      sub: "Check the draft and confirm every transaction",
      action: () => router.push("/voice/record" as any),
    },
    {
      title: "Create a customer statement",
      sub: "Choose dates, preview, then export PDF",
      action: () => router.push("/reports/statement" as any),
    },
  ];

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
            {t.helpAboutTitle}
          </Text>
          <Text className="text-brand-textSecondary text-xs font-inter mt-0.5">
            {t.helpPageSub}
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
      >
        {/* Interactive Help Topics */}
        <View className="divide-y divide-slate-100 mb-5">
          {helpItems.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.85}
              onPress={item.action}
              className="min-h-[72px] px-2 py-3 flex-row items-center justify-between"
            >
              <View className="flex-1 pr-3 gap-1">
                <Text className="text-brand-navy text-base font-inter">
                  {item.title}
                </Text>
                <Text className="text-brand-textSecondary text-xs font-inter">
                  {item.sub}
                </Text>
              </View>
              <ChevronRight size={20} color="#102F50" />
            </TouchableOpacity>
          ))}
        </View>

        {/* About NayaPotha.ai Card */}
        <View className="p-4 bg-brand-surface rounded-2xl gap-2.5">
          <Text className="text-brand-navy text-lg font-inter-semibold">
            NayaPotha.ai
          </Text>
          <Text className="text-brand-textSecondary text-xs font-inter">
            Version 0.1 • Demo build
          </Text>
          <Text className="text-brand-navy text-xs font-inter">
            Support details to be added
          </Text>
          <Text className="text-brand-textSecondary text-xs font-inter leading-4">
            This demo uses fictional records. AI estimates are experimental, not
            financial scores.
          </Text>
        </View>
      </ScrollView>

      <BottomNav active="Settings" />
    </SafeAreaView>
  );
}