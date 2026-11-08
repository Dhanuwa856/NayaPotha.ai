import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Mic, Square, Info } from "lucide-react-native";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { voiceAndRiskApi } from "../../services/voiceAndRiskService";

export default function RecordWithVoiceScreen() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const { shop } = useAuth();
  const insets = useSafeAreaInsets();

  const [voiceLang, setVoiceLang] = useState<"si" | "en">(lang);
  const [isRecording, setIsRecording] = useState(true);
  const [seconds, setSeconds] = useState(1);
  const [processing, setProcessing] = useState(false);

  // Spoken phrase (Editable for easy testing on device/emulator)
  const [spokenText, setSpokenText] = useState(
    voiceLang === "si"
      ? "පාලිතට රු. 2,000ක ණයක් සටහන් කරන්න."
      : "Record Rs. 2,000 credit for Palitha."
  );

  useEffect(() => {
    setSpokenText(
      voiceLang === "si"
        ? "පාලිතට රු. 2,000ක ණයක් සටහන් කරන්න."
        : "Record Rs. 2,000 credit for Palitha."
    );
  }, [voiceLang]);

  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleStopAndProcess = async () => {
    try {
      setIsRecording(false);
      setProcessing(true);
      const parsed = await voiceAndRiskApi.parseVoiceCommand(
        spokenText,
        voiceLang
      );

      router.push({
        pathname: "/voice/draft",
        params: {
          transcript: parsed.transcript,
          voice_lang: parsed.language,
          type: parsed.intent,
          amount_minor: String(parsed.amountMinor),
        },
      } as any);
    } finally {
      setProcessing(false);
    }
  };

  const waveHeights = [12, 24, 16, 32, 20, 28, 12, 24, 16];

  return (
    <SafeAreaView className="flex-1 bg-white">
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
            {t.recordWithVoiceTitle}
          </Text>
          <Text className="text-brand-textSecondary text-xs font-inter mt-0.5">
            {t.recordWithVoiceSub}
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
        {/* Language Toggle Chips */}
        <View className="flex-row items-center gap-2 mb-4">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setVoiceLang("si")}
            className={`min-h-[40px] px-4 py-2 rounded-xl items-center justify-center ${
              voiceLang === "si" ? "bg-brand-navy" : "bg-brand-surface"
            }`}
          >
            <Text
              className={`text-xs font-sinhala-semibold ${
                voiceLang === "si" ? "text-white" : "text-brand-navy"
              }`}
            >
              සිංහල
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setVoiceLang("en")}
            className={`min-h-[40px] px-4 py-2 rounded-xl items-center justify-center ${
              voiceLang === "en" ? "bg-brand-navy" : "bg-brand-surface"
            }`}
          >
            <Text
              className={`text-xs font-inter-semibold ${
                voiceLang === "en" ? "text-white" : "text-brand-navy"
              }`}
            >
              English
            </Text>
          </TouchableOpacity>
        </View>

        {/* Microphone Circle & Waveform */}
        <View className="py-4 items-center gap-4">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setIsRecording(!isRecording)}
            className="w-28 h-28 bg-brand-surface rounded-full border-[3px] border-brand-orange items-center justify-center"
          >
            <Mic size={42} color="#102F50" strokeWidth={2} />
          </TouchableOpacity>

          <Text className="text-brand-navy text-xl font-inter-semibold text-center">
            {isRecording ? `${t.recordingStatus} ${formatTimer(seconds)}` : t.pausedStatus}
          </Text>

          {/* Waveform Bars */}
          <View className="h-8 flex-row items-center gap-1.5">
            {waveHeights.map((h, idx) => (
              <View
                key={idx}
                style={{
                  height: isRecording
                    ? ((h + seconds * 4) % 24) + 8
                    : 8,
                }}
                className="w-1 bg-brand-navy rounded-full"
              />
            ))}
          </View>
        </View>

        {/* Try Saying Prompt & Live Transcript Input */}
        <View className="mt-2 mb-4">
          <Text className="text-brand-textSecondary text-xs font-inter mb-1">
            {t.trySayingLabel}
          </Text>
          <Text className="text-brand-navy text-xl font-sinhala-semibold leading-8 mb-1">
            “පාලිතට රු. 2,000ක ණයක් සටහන් කරන්න.”
          </Text>
          <Text className="text-brand-textSecondary text-xs font-inter mb-3">
            “Record Rs. 2,000 credit for Palitha.”
          </Text>

          {/* Editable Transcript Box so you can test any customer name & amount */}
          <TextInput
            value={spokenText}
            onChangeText={setSpokenText}
            multiline
            className="p-3.5 bg-brand-surface rounded-xl border border-brand-border text-brand-navy text-sm font-sinhala-medium"
          />
        </View>

        {/* Info Banner */}
        <View className="p-3.5 bg-blue-50 rounded-xl flex-row items-start gap-2.5">
          <Info size={20} color="#102F50" strokeWidth={2.2} />
          <View className="flex-1 gap-0.5">
            <Text className="text-brand-navy text-xs font-inter-semibold">
              {t.voiceDraftOnlyTitle}
            </Text>
            <Text className="text-brand-textSecondary text-xs font-inter leading-4">
              {t.voiceDraftOnlySub}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Stop / Cancel Actions */}
      <View
        className="px-5 pt-3 bg-white border-t border-slate-100 gap-2.5"
        style={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={processing}
          onPress={handleStopAndProcess}
          className="h-12 px-4 bg-brand-navy rounded-xl flex-row items-center justify-center gap-2"
        >
          {processing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Square size={16} color="#FFFFFF" fill="#FFFFFF" />
          )}
          <Text className="text-white text-base font-inter-semibold">
            {t.stopRecordingBtn}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.back()}
          className="h-12 px-4 bg-white rounded-xl border border-brand-navy items-center justify-center"
        >
          <Text className="text-brand-navy text-base font-inter-semibold">
            {t.cancelRecordingBtn}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}