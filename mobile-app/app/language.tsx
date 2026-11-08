import React from "react";
import { View, Text, Image, TouchableOpacity, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { useLanguage } from "../context/LanguageContext";

export default function LanguageScreen() {
  const router = useRouter();
  const { lang, setLanguage, t } = useLanguage();

  const handleContinue = async () => {
    await setLanguage(lang);
    router.replace("/login");
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-8 pt-8 pb-8 justify-between">
        <View className="items-center">
          {/* IMAGE PLACEHOLDER: Logo & Illustration */}
          <Image
            source={require("../assets/images/logo.png")}
            className="w-20 h-20 rounded-2xl mb-2"
          />
          <Text className="text-3xl font-inter-bold text-brand-navy mb-4">
            NayaPotha<Text className="text-brand-orange">.ai</Text>
          </Text>
          <Image
            source={require("../assets/images/language-illustration.png")}
            className="w-52 h-36 rounded-xl mb-6"
          />
          <Text className="text-2xl font-sinhala-bold text-brand-navy text-center mb-2">
            {t.chooseLang}
          </Text>
          <Text className="text-base font-sinhala text-brand-textSecondary text-center leading-6">
            {t.chooseLangSub}
          </Text>
        </View>

        <View className="gap-y-4 my-4">
          {/* Sinhala Card */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setLanguage("si")}
            className={`flex-row items-center justify-between p-4 rounded-2xl border-2 ${
              lang === "si" ? "border-brand-navy bg-brand-surface" : "border-brand-border bg-white"
            }`}
          >
            <View className="flex-row items-center gap-4">
              <View className={`w-14 h-14 rounded-xl items-center justify-center ${lang === "si" ? "bg-brand-navy" : "bg-brand-surface"}`}>
                <Text className={`text-3xl font-sinhala-bold ${lang === "si" ? "text-white" : "text-brand-navy"}`}>අ</Text>
              </View>
              <View>
                <Text className="text-xl font-sinhala-bold text-brand-navy">සිංහල</Text>
                <Text className="text-base font-sinhala text-brand-textSecondary">{t.primaryLang}</Text>
              </View>
            </View>
            <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${lang === "si" ? "border-brand-navy" : "border-slate-300"}`}>
              {lang === "si" && <View className="w-3.5 h-3.5 rounded-full bg-brand-navy" />}
            </View>
          </TouchableOpacity>

          {/* English Card */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setLanguage("en")}
            className={`flex-row items-center justify-between p-4 rounded-2xl border-2 ${
              lang === "en" ? "border-brand-navy bg-brand-surface" : "border-brand-border bg-white"
            }`}
          >
            <View className="flex-row items-center gap-4">
              <View className={`w-14 h-14 rounded-xl items-center justify-center ${lang === "en" ? "bg-brand-navy" : "bg-brand-surface"}`}>
                <Text className={`text-2xl font-inter-bold ${lang === "en" ? "text-white" : "text-brand-navy"}`}>En</Text>
              </View>
              <View>
                <Text className="text-xl font-inter-bold text-brand-navy">English</Text>
                <Text className="text-base font-inter text-brand-textSecondary">{t.secondLang}</Text>
              </View>
            </View>
            <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${lang === "en" ? "border-brand-navy" : "border-slate-300"}`}>
              {lang === "en" && <View className="w-3.5 h-3.5 rounded-full bg-brand-navy" />}
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleContinue}
          className="bg-brand-navy h-14 rounded-2xl flex-row items-center justify-center gap-2"
        >
          <Text className="text-white text-lg font-inter-bold">{t.next}</Text>
          <ArrowRight size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}