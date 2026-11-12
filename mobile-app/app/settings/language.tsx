import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Check } from "lucide-react-native";
import { useLanguage } from "../../context/LanguageContext";
import BottomNav from "../../components/ui/BottomNav";

export default function SettingsLanguageScreen() {
  const router = useRouter();
  const { lang, setLanguage, t } = useLanguage();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="min-h-[76px] pl-3 pr-5 py-2 flex-row items-center gap-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-11 h-11 items-center justify-center rounded-xl"
        >
          <ArrowLeft size={24} color="#102F50" strokeWidth={2.4} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-brand-navy text-2xl font-inter-bold">
            Language / <Text className="font-sinhala-bold">භාෂාව</Text>
          </Text>
          <Text className="text-brand-textSecondary text-xs font-inter mt-0.5">
            {t.languageMenuSub}
          </Text>
        </View>
      </View>

      <View className="px-5 py-4 gap-3">
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setLanguage("si")}
          className={`p-4 rounded-2xl border-2 flex-row items-center justify-between ${
            lang === "si"
              ? "border-brand-navy bg-brand-surface"
              : "border-brand-border bg-white"
          }`}
        >
          <View>
            <Text className="text-brand-navy text-xl font-sinhala-bold">
              සිංහල
            </Text>
            <Text className="text-brand-textSecondary text-sm font-inter">
              {t.primaryLang}
            </Text>
          </View>
          {lang === "si" && (
            <Check size={22} color="#102F50" strokeWidth={2.5} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setLanguage("en")}
          className={`p-4 rounded-2xl border-2 flex-row items-center justify-between ${
            lang === "en"
              ? "border-brand-navy bg-brand-surface"
              : "border-brand-border bg-white"
          }`}
        >
          <View>
            <Text className="text-brand-navy text-xl font-inter-bold">
              English
            </Text>
            <Text className="text-brand-textSecondary text-sm font-inter">
              {t.secondLang}
            </Text>
          </View>
          {lang === "en" && (
            <Check size={22} color="#102F50" strokeWidth={2.5} />
          )}
        </TouchableOpacity>
      </View>

      <BottomNav active="Settings" />
    </SafeAreaView>
  );
}