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
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, KeyRound, CheckCircle2, AlertCircle } from "lucide-react-native";
import { api } from "../services/api";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<"REQUEST" | "RESET">("REQUEST");
  const [identifier, setIdentifier] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [devCodeHint, setDevCodeHint] = useState<string | null>(null);

  const handleRequestCode = async () => {
    setErrorMsg(null);
    if (!identifier.trim()) {
      setErrorMsg("Please enter your registered phone number or email.");
      return;
    }
    try {
      setLoading(true);
      const res = await api.post("/auth/forgot-password", {
        identifier: identifier.trim(),
      });
      if (res.data?.dev_reset_code) {
        setDevCodeHint(res.data.dev_reset_code);
      }
      setStep("RESET");
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.detail || "Account not found. Please check your phone/email."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setErrorMsg(null);
    if (resetCode.trim().length !== 6) {
      setErrorMsg("Please enter the 6-digit recovery code.");
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg("New password must be at least 8 characters.");
      return;
    }
    try {
      setLoading(true);
      await api.post("/auth/reset-password", {
        identifier: identifier.trim(),
        reset_code: resetCode.trim(),
        new_password: newPassword,
      });
      Alert.alert("Password Reset", "Your password has been updated. Please sign in.", [
        { text: "Sign In", onPress: () => router.replace("/login" as any) },
      ]);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Invalid or expired recovery code.");
    } finally {
      setLoading(false);
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
              Reset password
            </Text>
            <Text className="text-brand-textSecondary text-xs font-inter mt-0.5">
              Recover access to your shop ledger
            </Text>
          </View>
        </View>

        <ScrollView className="flex-1 px-5 py-4">
          {errorMsg && (
            <View className="p-3.5 mb-4 bg-rose-50 rounded-xl border border-brand-error flex-row items-center gap-2.5">
              <AlertCircle size={20} color="#DC4545" />
              <Text className="flex-1 text-brand-error text-sm font-inter-medium">
                {errorMsg}
              </Text>
            </View>
          )}

          {step === "REQUEST" ? (
            <>
              <View className="mb-4">
                <Text className="text-brand-navy text-xs font-inter-semibold mb-1.5">
                  Registered phone number or email *
                </Text>
                <TextInput
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder="0771234567 or owner@shop.lk"
                  placeholderTextColor="#64748B"
                  autoCapitalize="none"
                  className="min-h-[48px] px-3.5 py-2.5 bg-white rounded-xl border border-brand-border text-brand-navy text-base font-inter"
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={loading}
                onPress={handleRequestCode}
                className="h-12 px-4 bg-brand-navy rounded-xl flex-row items-center justify-center gap-2"
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <KeyRound size={18} color="#FFFFFF" />
                )}
                <Text className="text-white text-base font-inter-semibold">
                  Send recovery code
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {devCodeHint && (
                <View className="p-3.5 mb-4 bg-amber-50 rounded-xl border border-brand-orange">
                  <Text className="text-brand-navy text-xs font-inter-bold">
                    Verification Code: {devCodeHint}
                  </Text>
                </View>
              )}

              <View className="mb-4">
                <Text className="text-brand-navy text-xs font-inter-semibold mb-1.5">
                  6-Digit Recovery Code *
                </Text>
                <TextInput
                  value={resetCode}
                  onChangeText={setResetCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="123456"
                  placeholderTextColor="#64748B"
                  className="min-h-[48px] px-3.5 py-2.5 bg-white rounded-xl border border-brand-border text-brand-navy text-lg font-inter-bold tracking-widest"
                />
              </View>

              <View className="mb-5">
                <Text className="text-brand-navy text-xs font-inter-semibold mb-1.5">
                  New Password (min 8 characters) *
                </Text>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  placeholder="••••••••••"
                  placeholderTextColor="#64748B"
                  className="min-h-[48px] px-3.5 py-2.5 bg-white rounded-xl border border-brand-border text-brand-navy text-base font-inter"
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={loading}
                onPress={handleResetPassword}
                className="h-12 px-4 bg-brand-navy rounded-xl flex-row items-center justify-center gap-2"
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <CheckCircle2 size={18} color="#FFFFFF" />
                )}
                <Text className="text-white text-base font-inter-semibold">
                  Confirm new password
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}