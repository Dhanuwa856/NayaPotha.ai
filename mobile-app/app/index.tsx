import React, { useEffect } from "react";
import { View, Text, Image, SafeAreaView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";

export default function LoadingScreen() {
  const router = useRouter();
  const { t, hasSelectedLanguage, isLoadingLang } = useLanguage();
  const { owner, isLoadingAuth } = useAuth();

  useEffect(() => {
    if (isLoadingLang || isLoadingAuth) return;

    const timer = setTimeout(() => {
      if (!hasSelectedLanguage) {
        router.replace("/language");
      } else if (owner) {
        router.replace("/home");
      } else {
        router.replace("/login");
      }
    }, 1800);

    return () => clearTimeout(timer);
  }, [isLoadingLang, isLoadingAuth, hasSelectedLanguage, owner]);

  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-between px-8 pt-12 pb-10">
      <Text className="text-brand-textSecondary text-sm font-inter">{t.demoTag}</Text>

      <View className="items-center w-full">
        {/* IMAGE PLACEHOLDER: Replace with your logo */}
        <Image
          source={require("../assets/images/logo.png")}
          className="w-28 h-28 rounded-2xl mb-4"
        />
        <Text className="text-4xl font-inter-bold text-brand-navy mb-4">
          NayaPotha<Text className="text-brand-orange">.ai</Text>
        </Text>
        <Text className="text-3xl text-center font-inter-bold text-brand-navy mb-4 leading-10">
          {t.heroTitle}
        </Text>
        <Text className="text-base text-center font-inter text-brand-textSecondary leading-6 px-2">
          {t.heroSubtitle}
        </Text>
      </View>

      <View className="items-center w-full">
        <View className="w-32 h-1.5 bg-brand-surface rounded-full mb-4 overflow-hidden">
          <View className="w-20 h-1.5 bg-brand-orange rounded-full" />
        </View>
        <Text className="text-brand-textSecondary text-sm font-inter mb-3">{t.preparing}</Text>
        <View className="flex-row items-center gap-2">
          <ActivityIndicator size="small" color="#102F50" />
          <Text className="text-brand-navy text-sm font-inter-medium">{t.offlineBadge}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}