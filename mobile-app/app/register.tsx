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
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { User, Store, Phone, MapPin, Lock, Eye, EyeOff, AlertCircle } from "lucide-react-native";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";

export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRegister = async () => {
    setErrorMsg(null);
    if (!name.trim() || !shopName.trim() || !phone.trim() || password.length < 8) {
      setErrorMsg("Please fill all required fields (Password must be at least 8 characters).");
      return;
    }
    try {
      setLoading(true);
      await register({
        name: name.trim(),
        shop_name: shopName.trim(),
        phone: phone.trim(),
        address: address.trim() || undefined,
        password,
      });
      router.replace("/home");
    } catch (err: any) {
      const apiErr = err.response?.data?.error?.message || err.response?.data?.detail?.[0]?.msg;
      setErrorMsg(apiErr || "Registration failed. Please check your phone number.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView contentContainerStyle={{ paddingHorizontal: 32, paddingVertical: 32, flexGrow: 1, justifyContent: "center" }}>
          <View className="items-center mb-6">
            <Image
              source={require("../assets/images/logo.png")}
              className="w-24 h-24 rounded-2xl mb-3"
            />
            <Text className="text-4xl font-inter-bold text-brand-navy">
              NayaPotha<Text className="text-brand-orange">.ai</Text>
            </Text>
            <Text className="text-lg font-inter-semibold text-brand-navy mt-2">{t.registerTitle}</Text>
          </View>

          {errorMsg && (
            <View className="p-3.5 mb-4 bg-rose-50 rounded-xl border border-brand-error flex-row items-center gap-2.5">
              <AlertCircle size={20} color="#DC4545" />
              <Text className="flex-1 text-brand-error text-sm font-inter-medium">{errorMsg}</Text>
            </View>
          )}

          <View className="gap-y-4">
            <View className="h-14 px-4 bg-white rounded-2xl border-2 border-brand-navy flex-row items-center">
              <User size={20} color="#102F50" />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t.ownerNamePlaceholder}
                placeholderTextColor="#64748B"
                className="flex-1 ml-3 text-brand-navy text-base font-inter-medium"
              />
            </View>

            <View className="h-14 px-4 bg-white rounded-2xl border-2 border-brand-navy flex-row items-center">
              <Store size={20} color="#102F50" />
              <TextInput
                value={shopName}
                onChangeText={setShopName}
                placeholder={t.shopNamePlaceholder}
                placeholderTextColor="#64748B"
                className="flex-1 ml-3 text-brand-navy text-base font-inter-medium"
              />
            </View>

            <View className="h-14 px-4 bg-white rounded-2xl border-2 border-brand-navy flex-row items-center">
              <Phone size={20} color="#102F50" />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder={t.phonePlaceholder}
                placeholderTextColor="#64748B"
                keyboardType="phone-pad"
                className="flex-1 ml-3 text-brand-navy text-base font-inter-medium"
              />
            </View>

            <View className="h-14 px-4 bg-white rounded-2xl border-2 border-brand-border flex-row items-center">
              <MapPin size={20} color="#64748B" />
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder={t.addressPlaceholder}
                placeholderTextColor="#64748B"
                className="flex-1 ml-3 text-brand-navy text-base font-inter-medium"
              />
            </View>

            <View className="h-14 px-4 bg-white rounded-2xl border-2 border-brand-navy flex-row items-center">
              <Lock size={20} color="#102F50" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder={t.passwordPlaceholder}
                placeholderTextColor="#64748B"
                className="flex-1 ml-3 text-brand-navy text-base font-inter-medium"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={20} color="#102F50" /> : <Eye size={20} color="#102F50" />}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={loading}
            onPress={handleRegister}
            className="bg-brand-navy h-14 rounded-2xl items-center justify-center mt-7 flex-row gap-2"
          >
            {loading && <ActivityIndicator color="#FFFFFF" />}
            <Text className="text-white text-lg font-inter-bold">
              {loading ? t.registering : t.registerBtn}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            className="h-14 bg-white rounded-2xl border-2 border-brand-navy items-center justify-center mt-4"
          >
            <Text className="text-brand-navy text-base font-inter-bold">{t.alreadyHaveAccount} {t.loginBtn}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}