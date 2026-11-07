import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User, Lock, Eye, EyeOff, BookOpen } from "lucide-react-native";

export default function LoginScreen() {
  const [lang, setLang] = useState<"si" | "en">("si");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("app_language").then((savedLang) => {
      if (savedLang === "en" || savedLang === "si") {
        setLang(savedLang);
      }
    });
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white px-6 justify-center">
      {/* Logo & Title */}
      <View className="items-center mb-8">
        <View className="w-16 h-16 bg-brand-light rounded-2xl items-center justify-center border border-brand-border mb-3">
          <BookOpen size={36} color="#0F2942" />
        </View>
        <Text className="text-3xl font-poppins-bold text-brand-navy">
          NayaPotha<Text className="text-brand-orange">.ai</Text>
        </Text>
        <Text className="text-sm font-poppins-semibold text-brand-navy mt-4">
          {lang === "si"
            ? "ඔබගේ ගිණුමට පිවිසෙන්න"
            : "Login in your account"}
        </Text>
      </View>

      {/* Input Fields */}
      <View className="gap-y-4">
        {/* Phone Number / Username Input */}
        <View className="flex-row items-center border border-brand-border rounded-xl px-4 py-3.5 bg-white">
          <User size={20} color="#64748B" />
          <TextInput
            value={identifier}
            onChangeText={setIdentifier}
            placeholder={
              lang === "si"
                ? "දුරකථන අංකය / පරිශීලක නාමය"
                : "Phone Number / User Name"
            }
            placeholderTextColor="#94A3B8"
            className="flex-1 ml-3 text-brand-navy text-sm"
          />
        </View>

        {/* Password Input */}
        <View className="flex-row items-center border border-brand-border rounded-xl px-4 py-3.5 bg-white">
          <Lock size={20} color="#64748B" />
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder={lang === "si" ? "මුරපදය" : "Password"}
            placeholderTextColor="#94A3B8"
            className="flex-1 ml-3 text-brand-navy text-sm"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            {showPassword ? (
              <Eye size={20} color="#0F2942" />
            ) : (
              <EyeOff size={20} color="#0F2942" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Login Button */}
      <TouchableOpacity
        activeOpacity={0.85}
        className="bg-brand-navy py-4 rounded-xl items-center mt-6"
      >
        <Text className="text-white text-base font-poppins-semibold">
          {lang === "si" ? "පිවිසෙන්න" : "Login"}
        </Text>
      </TouchableOpacity>

      {/* Forgot Password */}
      <TouchableOpacity className="items-center mt-4">
        <Text className="text-xs font-poppins-semibold text-brand-navy">
          {lang === "si" ? "මුරපදය අමතකද?" : "Forgot Password?"}
        </Text>
      </TouchableOpacity>

      {/* OR Divider */}
      <View className="flex-row items-center my-6">
        <View className="flex-1 h-[1px] bg-slate-300" />
        <Text className="mx-4 text-xs text-slate-500 font-poppins">OR</Text>
        <View className="flex-1 h-[1px] bg-slate-300" />
      </View>

      {/* Create New Account Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        className="border border-brand-navy py-3.5 rounded-xl items-center"
      >
        <Text className="text-brand-navy text-xs font-poppins-semibold">
          {lang === "si" ? "නව ගිණුමක් සාදන්න" : "Create a New Account"}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}