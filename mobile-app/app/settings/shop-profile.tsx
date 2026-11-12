import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Store } from "lucide-react-native";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import BottomNav from "../../components/ui/BottomNav";
import { syncAndSettingsApi } from "../../services/syncAndSettingsService";

export default function ShopProfileScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { shop, refreshProfile } = useAuth() as any;
  const insets = useSafeAreaInsets();

  const [shopName, setShopName] = useState(shop?.shop_name || "");
  const [phone, setPhone] = useState(shop?.phone_number || "");
  const [address, setAddress] = useState(shop?.address || "");
  const [saving, setSaving] = useState(false);

  const handleSaveShop = async () => {
    if (!shopName.trim()) {
      Alert.alert("Required", "Shop name cannot be empty.");
      return;
    }
    try {
      setSaving(true);
      await syncAndSettingsApi.updateShopProfile({
        shop_name: shopName.trim(),
        phone_number: phone.trim() || undefined,
        address: address.trim() || undefined,
        expected_version: shop?.entity_version || 1,
      });
      if (typeof refreshProfile === "function") {
        await refreshProfile();
      }
      Alert.alert("Saved", "Shop profile updated successfully.");
      router.back();
    } catch (err: any) {
      Alert.alert(
        "Update Notice",
        err.response?.data?.error?.message || "Shop profile saved locally."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="min-h-[76px] pl-3 pr-5 py-2 flex-row items-center gap-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-11 h-11 items-center justify-center rounded-xl"
          >
            <ArrowLeft size={24} color="#102F50" strokeWidth={2.4} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-brand-navy text-2xl font-inter-bold">
              {t.shopProfileTitle}
            </Text>
            <Text className="text-brand-textSecondary text-xs font-inter mt-0.5">
              {t.shopProfileSub}
            </Text>
          </View>
        </View>

        <ScrollView
          className="flex-1 px-5 py-4"
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          <View className="mb-4">
            <Text className="text-brand-navy text-xs font-inter-semibold mb-1.5">
              Shop name *
            </Text>
            <TextInput
              value={shopName}
              onChangeText={setShopName}
              placeholder="Naya Demo Stores"
              placeholderTextColor="#64748B"
              className="min-h-[48px] px-3.5 py-2.5 bg-white rounded-xl border border-brand-border text-brand-navy text-base font-inter"
            />
          </View>

          <View className="mb-4">
            <Text className="text-brand-navy text-xs font-inter-semibold mb-1.5">
              Shop phone number (optional)
            </Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="077 123 4567"
              placeholderTextColor="#64748B"
              className="min-h-[48px] px-3.5 py-2.5 bg-white rounded-xl border border-brand-border text-brand-navy text-base font-inter"
            />
          </View>

          <View className="mb-4">
            <Text className="text-brand-navy text-xs font-inter-semibold mb-1.5">
              Address / Town (optional)
            </Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="Kandy, Sri Lanka"
              placeholderTextColor="#64748B"
              className="min-h-[48px] px-3.5 py-2.5 bg-white rounded-xl border border-brand-border text-brand-navy text-base font-inter"
            />
          </View>
        </ScrollView>

        <View
          className="px-5 pt-3 bg-white border-t border-slate-100"
          style={{ paddingBottom: Math.max(insets.bottom, 20) + 75 }}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={saving}
            onPress={handleSaveShop}
            className="h-12 px-4 bg-brand-navy rounded-xl flex-row items-center justify-center gap-2 shadow-sm"
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Store size={18} color="#FFFFFF" strokeWidth={2.2} />
            )}
            <Text className="text-white text-base font-inter-semibold">
              Save shop profile
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <BottomNav active="Settings" />
    </SafeAreaView>
  );
}