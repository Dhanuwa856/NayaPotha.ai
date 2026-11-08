import React, { useState } from "react";
import { View, Text, TouchableOpacity, SafeAreaView } from "react-native";
import { useRouter, type RelativePathString } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BookOpen, ArrowRight } from "lucide-react-native";

export default function LanguageSelectionScreen() {
  const [selectedLang, setSelectedLang] = useState<"si" | "en">("si");
  const router = useRouter();

  const handleNext = async () => {
    await AsyncStorage.setItem("app_language", selectedLang);
    router.push("/login" as RelativePathString);
  };

  return (
    <SafeAreaView className="flex-1 bg-white px-6 justify-between py-10">
      {/* Top Brand & Illustration Area */}
      <View className="items-center mt-6">
        <View className="w-16 h-16 bg-brand-light rounded-2xl items-center justify-center border border-brand-border mb-2">
          <BookOpen size={36} color="#0F2942" />
        </View>
        <Text className="text-3xl font-poppins-bold text-brand-navy">
          NayaPotha<Text className="text-brand-orange">.ai</Text>
        </Text>

        {/* Title & Subtitle based on selected language */}
        <Text className="text-lg font-sinhala-bold text-brand-navy mt-8 text-center">
          {selectedLang === "si" ? "භාෂාව තෝරන්න" : "Choose your language"}
        </Text>
        <Text className="text-xs text-slate-500 text-center mt-2 px-4 leading-5">
          {selectedLang === "si"
            ? "කරුණාකර ඔබේ කැමති භාෂාව තෝරාගන්න. පසුව සැකසුම් වෙනස් කළ හැක."
            : "Please select your preferred language. You can change the settings later."}
        </Text>
      </View>

      {/* Language Selection Cards */}
      <View className="gap-y-4 my-auto">
        {/* Sinhala Option Card */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setSelectedLang("si")}
          className={`flex-row items-center justify-between p-4 rounded-2xl border ${
            selectedLang === "si"
              ? "border-brand-navy bg-slate-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <View className="flex-row items-center gap-x-4">
            <View
              className={`w-12 h-12 rounded-xl items-center justify-center ${
                selectedLang === "si" ? "bg-brand-navy" : "bg-slate-100"
              }`}
            >
              <Text
                className={`text-xl font-sinhala-bold ${
                  selectedLang === "si" ? "text-white" : "text-brand-navy"
                }`}
              >
                අ
              </Text>
            </View>
            <View>
              <Text className="text-lg font-sinhala-bold text-brand-navy">
                සිංහල
              </Text>
              <Text className="text-xs text-slate-400">
                (ප්‍රධාන භාෂාව)
              </Text>
            </View>
          </View>

          {/* Radio Circle */}
          <View
            className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
              selectedLang === "si" ? "border-brand-navy" : "border-slate-300"
            }`}
          >
            {selectedLang === "si" && (
              <View className="w-3 h-3 rounded-full bg-brand-navy" />
            )}
          </View>
        </TouchableOpacity>

        {/* English Option Card */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setSelectedLang("en")}
          className={`flex-row items-center justify-between p-4 rounded-2xl border ${
            selectedLang === "en"
              ? "border-brand-navy bg-slate-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <View className="flex-row items-center gap-x-4">
            <View
              className={`w-12 h-12 rounded-xl items-center justify-center ${
                selectedLang === "en" ? "bg-brand-navy" : "bg-slate-100"
              }`}
            >
              <Text
                className={`text-lg font-poppins-bold ${
                  selectedLang === "en" ? "text-white" : "text-brand-navy"
                }`}
              >
                En
              </Text>
            </View>
            <View>
              <Text className="text-lg font-poppins-semibold text-brand-navy">
                English
              </Text>
              <Text className="text-xs text-slate-400">
                {selectedLang === "si" ? "(දෙවන භාෂාව)" : "(Second Language)"}
              </Text>
            </View>
          </View>

          {/* Radio Circle */}
          <View
            className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
              selectedLang === "en" ? "border-brand-navy" : "border-slate-300"
            }`}
          >
            {selectedLang === "en" && (
              <View className="w-3 h-3 rounded-full bg-brand-navy" />
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Bottom Next Button */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleNext}
        className="bg-brand-navy py-4 rounded-xl flex-row items-center justify-center gap-x-2"
      >
        <Text className="text-white text-base font-poppins-semibold">
          {selectedLang === "si" ? "ඊළඟට" : "Next"}
        </Text>
        <ArrowRight size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}