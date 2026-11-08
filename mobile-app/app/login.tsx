import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { User, Lock, Eye, EyeOff, AlertCircle } from "lucide-react-native";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { login } = useAuth();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async () => {
    setErrorMsg(null);
    if (!phone.trim() || !password) {
      setErrorMsg("Please enter both phone number and password.");
      return;
    }
    try {
      setLoading(true);
      await login(phone.trim(), password);
      router.replace("/home");
    } catch (err: any) {
      const apiErr = err.response?.data?.error?.message || err.response?.data?.detail?.[0]?.msg;
      setErrorMsg(apiErr || "Unable to login. Check your credentials or network connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 px-8 justify-center"
      >
        <View className="items-center mb-8">
          <Image
            source={require("../assets/images/logo.png")}
            className="w-28 h-28 rounded-2xl mb-4"
          />
          <Text className="text-4xl font-inter-bold text-brand-navy">
            NayaPotha<Text className="text-brand-orange">.ai</Text>
          </Text>
          <Text className="text-lg font-inter-semibold text-brand-navy mt-3">
            {t.loginTitle}
          </Text>
        </View>

        {errorMsg && (
          <View className="p-3.5 mb-5 bg-rose-50 rounded-xl border border-brand-error flex-row items-center gap-2.5">
            <AlertCircle size={20} color="#DC4545" />
            <Text className="flex-1 text-brand-error text-sm font-inter-medium">{errorMsg}</Text>
          </View>
        )}

        <View className="gap-y-4">
          <View className="h-14 px-4 bg-white rounded-2xl border-2 border-brand-navy flex-row items-center">
            <User size={22} color="#102F50" />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder={t.phonePlaceholder}
              placeholderTextColor="#64748B"
              keyboardType="phone-pad"
              className="flex-1 ml-3 text-brand-navy text-base font-inter-medium"
            />
          </View>

          <View className="h-14 px-4 bg-white rounded-2xl border-2 border-brand-navy flex-row items-center">
            <Lock size={22} color="#102F50" />
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder={t.passwordPlaceholder}
              placeholderTextColor="#64748B"
              className="flex-1 ml-3 text-brand-navy text-base font-inter-medium"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-1">
              {showPassword ? <EyeOff size={22} color="#102F50" /> : <Eye size={22} color="#102F50" />}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={loading}
          onPress={handleLogin}
          className="bg-brand-navy h-14 rounded-2xl items-center justify-center mt-7 flex-row gap-2"
        >
          {loading && <ActivityIndicator color="#FFFFFF" />}
          <Text className="text-white text-lg font-inter-bold">
            {loading ? t.loggingIn : t.loginBtn}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/forgot-password" as any)} className="items-center mt-5">
          <Text className="text-base font-inter-bold text-brand-navy">{t.forgotPassword}</Text>
        </TouchableOpacity>

        <View className="flex-row items-center my-6">
          <View className="flex-1 h-[1.5px] bg-brand-navy opacity-30" />
          <Text className="mx-4 text-sm text-brand-navy font-inter-bold">{t.or}</Text>
          <View className="flex-1 h-[1.5px] bg-brand-navy opacity-30" />
        </View>

        <TouchableOpacity
          onPress={() => router.push("/register")}
          activeOpacity={0.85}
          className="h-14 bg-white rounded-2xl border-2 border-brand-navy items-center justify-center"
        >
          <Text className="text-brand-navy text-lg font-inter-bold">{t.createAccountBtn}</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}