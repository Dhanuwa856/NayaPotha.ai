import React, { useState, useEffect } from "react";
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
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Info,
  Lock,
  AlertCircle,
} from "lucide-react-native";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import BottomNav from "../../components/ui/BottomNav";
import { getDeviceIdentity } from "../../services/api";
import { syncAndSettingsApi } from "../../services/syncAndSettingsService";

export default function SecurityScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { owner, shop } = useAuth();
  const insets = useSafeAreaInsets();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [deviceName, setDeviceName] = useState("Android · This device");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    getDeviceIdentity()
      .then((info) => {
        setDeviceName(`${info.device_name} · This device`);
      })
      .catch(() => {});
  }, []);

  const todayFormatted = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const handleReviewPasswordChange = () => {
    setErrorMsg(null);
    if (!currentPassword.trim()) {
      setErrorMsg("Please enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("New password and confirmation do not match.");
      return;
    }

    Alert.alert(
      "Confirm Password Change",
      "Are you sure you want to update your shop account password?",
      [
        { text: t.cancelBtn, style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              setSaving(true);
              await syncAndSettingsApi.changePassword(
                currentPassword,
                newPassword
              );
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
              Alert.alert(
                "Password Updated",
                "Your password has been updated safely."
              );
            } catch (err: any) {
              const apiErr =
                err.response?.data?.error?.message ||
                err.response?.data?.detail?.[0]?.msg;
              setErrorMsg(apiErr || "Could not update password.");
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
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
              {t.securityTitle}
            </Text>
            <Text className="text-brand-textSecondary text-xs font-inter mt-0.5">
              {t.securityPageSub}
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
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {errorMsg && (
            <View className="p-3.5 mb-4 bg-rose-50 rounded-xl border border-brand-error flex-row items-center gap-2.5">
              <AlertCircle size={20} color="#DC4545" />
              <Text className="flex-1 text-brand-error text-sm font-inter-medium">
                {errorMsg}
              </Text>
            </View>
          )}

          {/* Current Password */}
          <View className="mb-4">
            <Text className="text-brand-navy text-xs font-inter-semibold mb-1.5">
              {t.currentPasswordLabel}
            </Text>
            <View className="min-h-[48px] px-3.5 bg-white rounded-xl border border-brand-border flex-row items-center">
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrent}
                placeholder="••••••••"
                placeholderTextColor="#64748B"
                className="flex-1 text-brand-navy text-base font-inter py-2"
              />
              <TouchableOpacity
                onPress={() => setShowCurrent(!showCurrent)}
                className="p-1"
              >
                {showCurrent ? (
                  <EyeOff size={20} color="#102F50" />
                ) : (
                  <Eye size={20} color="#102F50" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* New Password */}
          <View className="mb-4">
            <Text className="text-brand-navy text-xs font-inter-semibold mb-1.5">
              {t.newPasswordLabel}
            </Text>
            <View className="min-h-[48px] px-3.5 bg-white rounded-xl border border-brand-border flex-row items-center">
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNew}
                placeholder="••••••••••"
                placeholderTextColor="#64748B"
                className="flex-1 text-brand-navy text-base font-inter py-2"
              />
              <TouchableOpacity
                onPress={() => setShowNew(!showNew)}
                className="p-1"
              >
                {showNew ? (
                  <EyeOff size={20} color="#102F50" />
                ) : (
                  <Eye size={20} color="#102F50" />
                )}
              </TouchableOpacity>
            </View>
            <Text className="text-brand-textSecondary text-xs font-inter mt-1">
              {t.passwordHint}
            </Text>
          </View>

          {/* Confirm New Password */}
          <View className="mb-4">
            <Text className="text-brand-navy text-xs font-inter-semibold mb-1.5">
              {t.confirmNewPasswordLabel}
            </Text>
            <View className="min-h-[48px] px-3.5 bg-white rounded-xl border border-brand-border flex-row items-center">
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirm}
                placeholder="••••••••••"
                placeholderTextColor="#64748B"
                className="flex-1 text-brand-navy text-base font-inter py-2"
              />
              <TouchableOpacity
                onPress={() => setShowConfirm(!showConfirm)}
                className="p-1"
              >
                {showConfirm ? (
                  <EyeOff size={20} color="#102F50" />
                ) : (
                  <Eye size={20} color="#102F50" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Account & Device Card */}
          <View className="p-4 bg-brand-surface rounded-2xl gap-3 mb-4">
            <Text className="text-brand-navy text-lg font-inter-semibold">
              {t.accountAndDeviceHeading}
            </Text>

            <View className="flex-row items-center justify-between">
              <Text className="text-brand-textSecondary text-xs font-inter">
                {t.accountLabel}
              </Text>
              <Text className="text-brand-navy text-sm font-inter-medium">
                {owner?.name || "Shop owner"}
              </Text>
            </View>

            <View className="flex-row items-center justify-between">
              <Text className="text-brand-textSecondary text-xs font-inter">
                {t.currentDeviceLabel}
              </Text>
              <Text className="text-brand-navy text-sm font-inter-medium">
                {deviceName}
              </Text>
            </View>

            <View className="flex-row items-center justify-between">
              <Text className="text-brand-textSecondary text-xs font-inter">
                {t.lastSignInLabel}
              </Text>
              <Text className="text-brand-navy text-sm font-inter-medium">
                {todayFormatted}
              </Text>
            </View>
          </View>

          {/* Confirmation Required Info Box */}
          <View className="p-3.5 bg-blue-50 rounded-xl flex-row items-start gap-2.5">
            <Info size={20} color="#102F50" strokeWidth={2.2} />
            <View className="flex-1 gap-0.5">
              <Text className="text-brand-navy text-xs font-inter-semibold">
                {t.confirmationRequiredTitle}
              </Text>
              <Text className="text-brand-textSecondary text-xs font-inter leading-4">
                {t.confirmationRequiredSub}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Sticky Review Password Change Button */}
        <View
          className="px-5 pt-3 bg-white border-t border-slate-100"
          style={{ paddingBottom: Math.max(insets.bottom, 20) + 75 }}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={saving}
            onPress={handleReviewPasswordChange}
            className="h-12 px-4 bg-brand-navy rounded-xl flex-row items-center justify-center gap-2 shadow-sm"
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Lock size={18} color="#FFFFFF" strokeWidth={2.2} />
            )}
            <Text className="text-white text-base font-inter-semibold">
              {t.reviewPasswordChangeBtn}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <BottomNav active="Settings" />
    </SafeAreaView>
  );
}