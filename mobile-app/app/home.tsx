import React from "react";
import { View, Text, TouchableOpacity, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

export default function HomeScreen() {
  const router = useRouter();
  const { owner, shop, logout } = useAuth();
  const { lang, setLanguage } = useLanguage();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-surface p-6 justify-between">
      <View className="bg-white p-6 rounded-2xl border border-brand-border mt-8">
        <Text className="text-2xl font-inter-bold text-brand-navy">{shop?.shop_name}</Text>
        <Text className="text-base font-inter text-brand-textSecondary mt-1">
          Owner: {owner?.name} ({owner?.phone})
        </Text>
        <View className="mt-4 p-3 bg-green-50 rounded-xl">
          <Text className="text-brand-success text-sm font-inter-semibold">
            ✓ Connected to FastAPI (/api/v1/auth/me)
          </Text>
        </View>
      </View>

      {/* Quick Language Switcher (Simulating Settings) */}
      <View className="bg-white p-5 rounded-2xl border border-brand-border gap-3">
        <Text className="text-base font-inter-bold text-brand-navy">
          Language Setting (Current: {lang.toUpperCase()})
        </Text>
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => setLanguage("si")}
            className={`flex-1 py-3 rounded-xl items-center ${lang === "si" ? "bg-brand-navy" : "bg-brand-surface"}`}
          >
            <Text className={`text-base font-sinhala-bold ${lang === "si" ? "text-white" : "text-brand-navy"}`}>සිංහල</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setLanguage("en")}
            className={`flex-1 py-3 rounded-xl items-center ${lang === "en" ? "bg-brand-navy" : "bg-brand-surface"}`}
          >
            <Text className={`text-base font-inter-bold ${lang === "en" ? "text-white" : "text-brand-navy"}`}>English</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        onPress={handleLogout}
        className="bg-brand-error h-14 rounded-2xl items-center justify-center mb-4"
      >
        <Text className="text-white text-lg font-inter-bold">Logout (/auth/logout)</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}